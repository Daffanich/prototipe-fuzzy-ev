/**
 * ============================================================================
 * MODUL FUZZY INFERENCE SYSTEM (FIS) - METODE MAMDANI
 * Sistem Cerdas Manajemen Beban SPKLU (Fast Charging EV)
 * ============================================================================
 * 
 * Modul ini mengevaluasi 3 parameter input:
 * 1. Sisa Daya Gedung Induk (0 - 100 kW) -> Himpunan: [Kritis, Sedang, Aman]
 * 2. Sisa Baterai / SoC Mobil (0% - 100%) -> Himpunan: [Rendah, Medium, Tinggi]
 * 3. Urgensi Pengisian (Skala 0 - 100) -> Himpunan: [Santai, Sedang, Buru-buru]
 * 
 * Menghasilkan output:
 * - Alokasi Daya Charging (5 - 50 kW) -> Himpunan: [Trickle, Standard, Fast]
 * - Metode Defuzzifikasi: Centroid (Center of Gravity / COG)
 */

export type UrgencyLevel = 'SANTAI' | 'SEDANG' | 'BURU-BURU';

export interface FuzzyInput {
  buildingPower: number; // 0 - 100 kW
  soc: number;           // 0 - 100 %
  urgency: UrgencyLevel; // 'SANTAI' | 'SEDANG' | 'BURU-BURU'
}

export interface FuzzyMembership {
  // Daya Gedung
  buildingKritis: number;
  buildingSedang: number;
  buildingAman: number;
  // SoC
  socRendah: number;
  socMedium: number;
  socTinggi: number;
  // Urgensi
  urgencySantai: number;
  urgencySedang: number;
  urgencyBuruBuru: number;
}

export interface ActiveRule {
  id: number;
  ruleText: string;
  alpha: number; // Derajat aktivasi rule (MIN)
  consequent: 'TRICKLE' | 'STANDARD' | 'FAST';
}

export interface FuzzyResult {
  allocatedPower: number; // Nilai riil kW hasil defuzzifikasi (setelah safety check)
  rawFuzzyPower: number;  // Nilai murni rumus centroid sebelum dibatasi daya gedung
  chargingMode: 'Trickle Charging' | 'Standard Charging' | 'Fast Charging';
  membership: FuzzyMembership;
  activeRules: ActiveRule[];
  curvePoints: { x: number; y: number }[]; // Titik kurva agregasi untuk visualisasi SVG
  isBuildingConstrained: boolean;          // Apakah daya dipangkas karena kapasitas gedung tidak mencukupi
}

// ----------------------------------------------------------------------------
// 1. FUNGSI KEANGGOTAAN DASAR (Segitiga & Trapesium)
// ----------------------------------------------------------------------------

/**
 * Fungsi keanggotaan bahu kiri trapesium
 */
function trapLeft(x: number, a: number, b: number): number {
  if (x <= a) return 1;
  if (x >= b) return 0;
  return (b - x) / (b - a);
}

/**
 * Fungsi keanggotaan segitiga
 */
function triangular(x: number, a: number, b: number, c: number): number {
  if (x <= a || x >= c) return 0;
  if (x === b) return 1;
  if (x < b) return (x - a) / (b - a);
  return (c - x) / (c - b);
}

/**
 * Fungsi keanggotaan bahu kanan trapesium
 */
function trapRight(x: number, a: number, b: number): number {
  if (x <= a) return 0;
  if (x >= b) return 1;
  return (x - a) / (b - a);
}

// ----------------------------------------------------------------------------
// 2. FUZZIFIKASI INPUT
// ----------------------------------------------------------------------------

export function fuzzify(input: FuzzyInput): FuzzyMembership {
  const { buildingPower, soc, urgency } = input;

  // Konversi pilihan urgensi diskrit ke nilai skala kontinu (0 - 100)
  // Santai = 15, Sedang = 50, Buru-buru = 85
  const urgencyValue = urgency === 'SANTAI' ? 15 : urgency === 'SEDANG' ? 50 : 85;

  // Fuzzifikasi Daya Gedung Induk (0 - 100 kW)
  // - Kritis: 0 - 35 kW (optimal di <20 kW)
  // - Sedang: 25 - 75 kW (puncak di 50 kW)
  // - Aman: 65 - 100 kW (optimal di >80 kW)
  const buildingKritis = trapLeft(buildingPower, 20, 35);
  const buildingSedang = triangular(buildingPower, 25, 50, 75);
  const buildingAman = trapRight(buildingPower, 65, 80);

  // Fuzzifikasi Sisa Baterai (SoC) (0 - 100 %)
  // - Rendah: 0 - 35 % (optimal di <20 %)
  // - Medium: 25 - 75 % (puncak di 50 %)
  // - Tinggi: 65 - 100 % (optimal di >80 %)
  const socRendah = trapLeft(soc, 20, 35);
  const socMedium = triangular(soc, 25, 50, 75);
  const socTinggi = trapRight(soc, 65, 80);

  // Fuzzifikasi Urgensi
  const urgencySantai = trapLeft(urgencyValue, 25, 45);
  const urgencySedang = triangular(urgencyValue, 30, 50, 70);
  const urgencyBuruBuru = trapRight(urgencyValue, 55, 75);

  return {
    buildingKritis,
    buildingSedang,
    buildingAman,
    socRendah,
    socMedium,
    socTinggi,
    urgencySantai,
    urgencySedang,
    urgencyBuruBuru,
  };
}

// ----------------------------------------------------------------------------
// 3. FUNGSI KEANGGOTAAN OUTPUT (Alokasi Daya Charging dalam kW: 5 - 50 kW)
// ----------------------------------------------------------------------------

export function muTrickle(power: number): number {
  // Output TRICKLE: 5 kW - 12 kW (puncak 5-8 kW)
  if (power < 5 || power > 12) return 0;
  if (power <= 8) return 1;
  return (12 - power) / (12 - 8);
}

export function muStandard(power: number): number {
  // Output STANDARD: 10 kW - 24 kW (puncak 17 kW)
  return triangular(power, 10, 17, 24);
}

export function muFast(power: number): number {
  // Output FAST: 22 kW - 50 kW (optimal >36 kW)
  return trapRight(power, 22, 36);
}

// ----------------------------------------------------------------------------
// 4. RULE BASE MAMDANI (27 Aturan Kombinasi)
// ----------------------------------------------------------------------------

export function evaluateRules(mu: FuzzyMembership): {
  activeRules: ActiveRule[];
  alphaTrickle: number;
  alphaStandard: number;
  alphaFast: number;
} {
  const rulesDefinition: Array<{
    id: number;
    bKey: 'buildingKritis' | 'buildingSedang' | 'buildingAman';
    bLabel: string;
    sKey: 'socRendah' | 'socMedium' | 'socTinggi';
    sLabel: string;
    uKey: 'urgencySantai' | 'urgencySedang' | 'urgencyBuruBuru';
    uLabel: string;
    consequent: 'TRICKLE' | 'STANDARD' | 'FAST';
  }> = [
    // --- GRUP 1: DAYA GEDUNG KRITIS (< 30 kW) ---
    // Proteksi utama: Gedung kritis tidak boleh memberi daya tinggi agar tidak trip
    { id: 1, bKey: 'buildingKritis', bLabel: 'Kritis', sKey: 'socRendah', sLabel: 'Rendah', uKey: 'urgencySantai', uLabel: 'Santai', consequent: 'TRICKLE' },
    { id: 2, bKey: 'buildingKritis', bLabel: 'Kritis', sKey: 'socRendah', sLabel: 'Rendah', uKey: 'urgencySedang', uLabel: 'Sedang', consequent: 'TRICKLE' },
    // Rule spesifik prompt: Gedung Kritis & SoC Rendah & Buru-buru -> STANDARD (kompromi darurat 11-22 kW)
    { id: 3, bKey: 'buildingKritis', bLabel: 'Kritis', sKey: 'socRendah', sLabel: 'Rendah', uKey: 'urgencyBuruBuru', uLabel: 'Buru-buru', consequent: 'STANDARD' },
    { id: 4, bKey: 'buildingKritis', bLabel: 'Kritis', sKey: 'socMedium', sLabel: 'Medium', uKey: 'urgencySantai', uLabel: 'Santai', consequent: 'TRICKLE' },
    { id: 5, bKey: 'buildingKritis', bLabel: 'Kritis', sKey: 'socMedium', sLabel: 'Medium', uKey: 'urgencySedang', uLabel: 'Sedang', consequent: 'TRICKLE' },
    { id: 6, bKey: 'buildingKritis', bLabel: 'Kritis', sKey: 'socMedium', sLabel: 'Medium', uKey: 'urgencyBuruBuru', uLabel: 'Buru-buru', consequent: 'STANDARD' },
    // Rule spesifik prompt: Gedung Kritis & SoC Tinggi & Santai -> TRICKLE (5-10 kW)
    { id: 7, bKey: 'buildingKritis', bLabel: 'Kritis', sKey: 'socTinggi', sLabel: 'Tinggi', uKey: 'urgencySantai', uLabel: 'Santai', consequent: 'TRICKLE' },
    { id: 8, bKey: 'buildingKritis', bLabel: 'Kritis', sKey: 'socTinggi', sLabel: 'Tinggi', uKey: 'urgencySedang', uLabel: 'Sedang', consequent: 'TRICKLE' },
    { id: 9, bKey: 'buildingKritis', bLabel: 'Kritis', sKey: 'socTinggi', sLabel: 'Tinggi', uKey: 'urgencyBuruBuru', uLabel: 'Buru-buru', consequent: 'TRICKLE' },

    // --- GRUP 2: DAYA GEDUNG SEDANG (30 - 60 kW) ---
    { id: 10, bKey: 'buildingSedang', bLabel: 'Sedang', sKey: 'socRendah', sLabel: 'Rendah', uKey: 'urgencySantai', uLabel: 'Santai', consequent: 'STANDARD' },
    { id: 11, bKey: 'buildingSedang', bLabel: 'Sedang', sKey: 'socRendah', sLabel: 'Rendah', uKey: 'urgencySedang', uLabel: 'Sedang', consequent: 'STANDARD' },
    { id: 12, bKey: 'buildingSedang', bLabel: 'Sedang', sKey: 'socRendah', sLabel: 'Rendah', uKey: 'urgencyBuruBuru', uLabel: 'Buru-buru', consequent: 'FAST' },
    { id: 13, bKey: 'buildingSedang', bLabel: 'Sedang', sKey: 'socMedium', sLabel: 'Medium', uKey: 'urgencySantai', uLabel: 'Santai', consequent: 'TRICKLE' },
    // Rule spesifik prompt: Gedung Sedang & SoC Medium & Urgensi Sedang -> STANDARD (11-22 kW)
    { id: 14, bKey: 'buildingSedang', bLabel: 'Sedang', sKey: 'socMedium', sLabel: 'Medium', uKey: 'urgencySedang', uLabel: 'Sedang', consequent: 'STANDARD' },
    { id: 15, bKey: 'buildingSedang', bLabel: 'Sedang', sKey: 'socMedium', sLabel: 'Medium', uKey: 'urgencyBuruBuru', uLabel: 'Buru-buru', consequent: 'FAST' },
    { id: 16, bKey: 'buildingSedang', bLabel: 'Sedang', sKey: 'socTinggi', sLabel: 'Tinggi', uKey: 'urgencySantai', uLabel: 'Santai', consequent: 'TRICKLE' },
    { id: 17, bKey: 'buildingSedang', bLabel: 'Sedang', sKey: 'socTinggi', sLabel: 'Tinggi', uKey: 'urgencySedang', uLabel: 'Sedang', consequent: 'TRICKLE' },
    { id: 18, bKey: 'buildingSedang', bLabel: 'Sedang', sKey: 'socTinggi', sLabel: 'Tinggi', uKey: 'urgencyBuruBuru', uLabel: 'Buru-buru', consequent: 'STANDARD' },

    // --- GRUP 3: DAYA GEDUNG AMAN (> 60 kW) ---
    // Rule spesifik prompt: Gedung Aman & SoC Rendah & Buru-buru -> FAST CHARGING (23-50 kW)
    { id: 19, bKey: 'buildingAman', bLabel: 'Aman', sKey: 'socRendah', sLabel: 'Rendah', uKey: 'urgencySantai', uLabel: 'Santai', consequent: 'STANDARD' },
    { id: 20, bKey: 'buildingAman', bLabel: 'Aman', sKey: 'socRendah', sLabel: 'Rendah', uKey: 'urgencySedang', uLabel: 'Sedang', consequent: 'FAST' },
    { id: 21, bKey: 'buildingAman', bLabel: 'Aman', sKey: 'socRendah', sLabel: 'Rendah', uKey: 'urgencyBuruBuru', uLabel: 'Buru-buru', consequent: 'FAST' },
    { id: 22, bKey: 'buildingAman', bLabel: 'Aman', sKey: 'socMedium', sLabel: 'Medium', uKey: 'urgencySantai', uLabel: 'Santai', consequent: 'STANDARD' },
    { id: 23, bKey: 'buildingAman', bLabel: 'Aman', sKey: 'socMedium', sLabel: 'Medium', uKey: 'urgencySedang', uLabel: 'Sedang', consequent: 'FAST' },
    { id: 24, bKey: 'buildingAman', bLabel: 'Aman', sKey: 'socMedium', sLabel: 'Medium', uKey: 'urgencyBuruBuru', uLabel: 'Buru-buru', consequent: 'FAST' },
    { id: 25, bKey: 'buildingAman', bLabel: 'Aman', sKey: 'socTinggi', sLabel: 'Tinggi', uKey: 'urgencySantai', uLabel: 'Santai', consequent: 'TRICKLE' },
    { id: 26, bKey: 'buildingAman', bLabel: 'Aman', sKey: 'socTinggi', sLabel: 'Tinggi', uKey: 'urgencySedang', uLabel: 'Sedang', consequent: 'STANDARD' },
    { id: 27, bKey: 'buildingAman', bLabel: 'Aman', sKey: 'socTinggi', sLabel: 'Tinggi', uKey: 'urgencyBuruBuru', uLabel: 'Buru-buru', consequent: 'FAST' },
  ];

  let alphaTrickle = 0;
  let alphaStandard = 0;
  let alphaFast = 0;
  const activeRules: ActiveRule[] = [];

  for (const r of rulesDefinition) {
    const valB = mu[r.bKey];
    const valS = mu[r.sKey];
    const valU = mu[r.uKey];

    // Operasi AND fuzzy menggunakan fungsi MIN
    const alpha = Math.min(valB, valS, valU);

    if (alpha > 0.001) {
      activeRules.push({
        id: r.id,
        ruleText: `JIKA Gedung ${r.bLabel} AND SoC ${r.sLabel} AND Urgensi ${r.uLabel} MAKA ${r.consequent}`,
        alpha,
        consequent: r.consequent,
      });

      // Agregasi konkluen menggunakan fungsi MAX
      if (r.consequent === 'TRICKLE') {
        alphaTrickle = Math.max(alphaTrickle, alpha);
      } else if (r.consequent === 'STANDARD') {
        alphaStandard = Math.max(alphaStandard, alpha);
      } else if (r.consequent === 'FAST') {
        alphaFast = Math.max(alphaFast, alpha);
      }
    }
  }

  return { activeRules, alphaTrickle, alphaStandard, alphaFast };
}

// ----------------------------------------------------------------------------
// 5. AGREGASI & DEFUZZIFIKASI CENTROID (MAMDANI COG)
// ----------------------------------------------------------------------------

export function calculateFuzzyPower(input: FuzzyInput): FuzzyResult {
  const membership = fuzzify(input);
  const { activeRules, alphaTrickle, alphaStandard, alphaFast } = evaluateRules(membership);

  // Sampling diskrit untuk integrasi numerik kurva output dari 5 kW hingga 50 kW
  const startKw = 5;
  const endKw = 50;
  const step = 0.5;

  let sumNumerator = 0;
  let sumDenominator = 0;
  const curvePoints: { x: number; y: number }[] = [];

  for (let z = startKw; z <= endKw; z += step) {
    // Potong (clip) fungsi keanggotaan output dengan nilai alpha masing-masing
    const muT = Math.min(alphaTrickle, muTrickle(z));
    const muS = Math.min(alphaStandard, muStandard(z));
    const muF = Math.min(alphaFast, muFast(z));

    // Agregasi MAX
    const muCombined = Math.max(muT, muS, muF);

    curvePoints.push({ x: z, y: Number(muCombined.toFixed(3)) });

    // Perhitungan Centroid: ∫ z * μ(z) dz / ∫ μ(z) dz
    sumNumerator += z * muCombined;
    sumDenominator += muCombined;
  }

  // Jika tidak ada aturan aktif (edge case ekstrem), fallback ke 11 kW
  let rawCentroid = sumDenominator > 0 ? sumNumerator / sumDenominator : 11;
  rawCentroid = Math.round(rawCentroid * 10) / 10;

  // --------------------------------------------------------------------------
  // 6. SAFETY INTERLOCK & GRID CONSTRAINTS (Kapasitas Gedung Nyata)
  // --------------------------------------------------------------------------
  // Sistem cerdas SPKLU menjamin alokasi daya tidak melebihi sisa daya riil gedung
  // dan cadangan daya minimal proteksi gedung (safety margin 3 kW)
  const maxSafeBuildingPower = Math.max(0, input.buildingPower - 3);
  let finalPower = rawCentroid;
  let isBuildingConstrained = false;

  if (finalPower > maxSafeBuildingPower) {
    finalPower = Math.max(5, Math.floor(maxSafeBuildingPower));
    isBuildingConstrained = true;
  }

  // Jika daya gedung sangat minim (< 7 kW), paksa trickle 5 kW atau sesuaikan
  if (input.buildingPower < 8) {
    finalPower = Math.min(finalPower, Math.max(3, input.buildingPower));
    isBuildingConstrained = true;
  }

  // Tentukan label status pengisian berdasarkan alokasi daya akhir
  let chargingMode: 'Trickle Charging' | 'Standard Charging' | 'Fast Charging';
  if (finalPower < 11) {
    chargingMode = 'Trickle Charging';
  } else if (finalPower <= 22) {
    chargingMode = 'Standard Charging';
  } else {
    chargingMode = 'Fast Charging';
  }

  return {
    allocatedPower: finalPower,
    rawFuzzyPower: rawCentroid,
    chargingMode,
    membership,
    activeRules,
    curvePoints,
    isBuildingConstrained,
  };
}
