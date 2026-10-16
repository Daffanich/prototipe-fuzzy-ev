/**
 * ============================================================================
 * STATE MANAGEMENT & SIMULATION STORE
 * Sistem Cerdas SPKLU (Multi-Kios 1-4 & Central Dashboard Sensor Terpadu)
 * Tarif Resmi: Rp 2.500 / kWh
 * ============================================================================
 */

import { calculateFuzzyPower, FuzzyResult, UrgencyLevel } from './fuzzyLogic.ts';

export const TARIFF_PER_KWH = 2500; // Rp 2.500 per kWh

export interface PortState {
  id: number;
  label: string;
  socketType: string;
  vehicleName: string;
  batteryCapacityKwh: number;
  soc: number;                     // 0 - 100% (diatur dari panel sensor sebelum charging)
  urgency: UrgencyLevel;
  targetKwh: number;               // Kuota energi yang ingin diisi (kWh)
  status: 'IDLE' | 'CONNECTED' | 'CHARGING' | 'COMPLETED';
  kioskStep: 1 | 2 | 3 | 4;         // State wizard mandiri tiap kios
  powerKw: number;                 // Daya aktual hasil kalkulasi fuzzy (kW)
  rawFuzzyKw: number;
  chargingMode: string;
  energyDeliveredKwh: number;
  isOccupied: boolean;
}

export type ViewType = 
  | 'landing' 
  | 'kiosk1' 
  | 'kiosk2' 
  | 'kiosk3' 
  | 'kiosk4' 
  | 'dashboard' 
  | 'fuzzy';

export interface AppState {
  buildingPower: number;           // 0 - 100 kW
  totalBuildingCapacityKw: number; // 100 kW kapasitas total gardu gedung
  ports: PortState[];
  activeView: ViewType;
  isAutoSimulation: boolean;       // Toggle simulasi otomatis
  lastUpdated: number;
}

const STORAGE_KEY = 'voltmind_spklu_multikiosk_v3';

export const defaultState: AppState = {
  buildingPower: 68,
  totalBuildingCapacityKw: 100,
  ports: [
    {
      id: 1,
      label: 'Kios 1 (DC Fast CCS2)',
      socketType: 'CCS2 Combo 150kW',
      vehicleName: 'Hyundai Ioniq 5 Long Range',
      batteryCapacityKwh: 72.6,
      soc: 18,
      urgency: 'BURU-BURU',
      targetKwh: 20, // Default 20 kWh (Rp 50.000)
      status: 'CONNECTED',
      kioskStep: 1,
      powerKw: 0,
      rawFuzzyKw: 0,
      chargingMode: 'Siap Mengisi',
      energyDeliveredKwh: 0,
      isOccupied: true,
    },
    {
      id: 2,
      label: 'Kios 2 (DC Fast CCS2)',
      socketType: 'CCS2 Combo 150kW',
      vehicleName: 'BYD Seal Performance',
      batteryCapacityKwh: 82.5,
      soc: 45,
      urgency: 'SEDANG',
      targetKwh: 25, // Default 25 kWh (Rp 62.500)
      status: 'CONNECTED',
      kioskStep: 1,
      powerKw: 0,
      rawFuzzyKw: 0,
      chargingMode: 'Siap Mengisi',
      energyDeliveredKwh: 0,
      isOccupied: true,
    },
    {
      id: 3,
      label: 'Kios 3 (DC Fast CHAdeMO)',
      socketType: 'CHAdeMO DC 60kW',
      vehicleName: 'Nissan Leaf e+ 2024',
      batteryCapacityKwh: 62.0,
      soc: 72,
      urgency: 'SANTAI',
      targetKwh: 15, // Default 15 kWh (Rp 37.500)
      status: 'CONNECTED',
      kioskStep: 1,
      powerKw: 0,
      rawFuzzyKw: 0,
      chargingMode: 'Siap Mengisi',
      energyDeliveredKwh: 0,
      isOccupied: true,
    },
    {
      id: 4,
      label: 'Kios 4 (AC Type-2 22kW)',
      socketType: 'Type 2 Mennekes 3-Phase',
      vehicleName: 'Wuling Air EV Long Range',
      batteryCapacityKwh: 26.7,
      soc: 35,
      urgency: 'SANTAI',
      targetKwh: 10, // Default 10 kWh (Rp 25.000)
      status: 'CONNECTED',
      kioskStep: 1,
      powerKw: 0,
      rawFuzzyKw: 0,
      chargingMode: 'Siap Mengisi',
      energyDeliveredKwh: 0,
      isOccupied: true,
    },
  ],
  activeView: 'landing',
  isAutoSimulation: false,
  lastUpdated: Date.now(),
};

export function loadSavedState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed };
  } catch {
    return defaultState;
  }
}

export function saveStateToStorage(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save SPKLU state', err);
  }
}

/**
 * Format angka ke format mata uang Rupiah Indonesia (Rp XX.XXX)
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Evaluasi Fuzzy Logic untuk port manapun berdasarkan sisa daya gedung saat ini
 */
export function evaluatePortFuzzy(state: AppState, portId: number): FuzzyResult {
  const port = state.ports.find((p) => p.id === portId) || state.ports[0];
  
  const otherPortsPower = state.ports
    .filter((p) => p.id !== portId && p.status === 'CHARGING')
    .reduce((sum, p) => sum + p.powerKw, 0);

  const availableBuildingPower = Math.max(5, state.buildingPower - otherPortsPower);

  return calculateFuzzyPower({
    buildingPower: availableBuildingPower,
    soc: port.soc,
    urgency: port.urgency,
  });
}
