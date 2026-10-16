import React, { useState } from 'react';
import { 
  Zap, 
  BatteryCharging, 
  Coffee, 
  Hourglass, 
  Flame, 
  CheckCircle, 
  ArrowRight, 
  RotateCcw, 
  LayoutDashboard,
  Lock,
  Plus,
  Minus,
  Receipt,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  AppState, 
  ViewType, 
  evaluatePortFuzzy, 
  TARIFF_PER_KWH, 
  formatRupiah 
} from '../store.ts';
import { UrgencyLevel } from '../fuzzyLogic.ts';

interface KioskViewProps {
  portId: number; // 1, 2, 3, or 4
  state: AppState;
  onUpdateState: (partial: Partial<AppState>) => void;
  onNavigate: (view: ViewType) => void;
}

export const KioskView: React.FC<KioskViewProps> = ({
  portId,
  state,
  onUpdateState,
  onNavigate,
}) => {
  const port = state.ports.find((p) => p.id === portId) || state.ports[0];
  const currentStep = port.kioskStep || 1;

  // Selected urgency in step 2
  const [selectedUrgency, setSelectedUrgency] = useState<UrgencyLevel>(port.urgency);

  // Kuota kWh yang ingin diisi (default dari state port atau 20)
  const maxRoomKwh = Math.max(1, Math.round((((100 - port.soc) / 100) * port.batteryCapacityKwh) * 10) / 10);
  const [targetKwh, setTargetKwh] = useState<number>(() => Math.min(port.targetKwh || 20, maxRoomKwh));

  // Evaluasi Fuzzy Logic untuk port ini
  const fuzzyResult = evaluatePortFuzzy(state, port.id);

  // Kalkulasi total biaya berdasarkan tarif Rp 2.500 / kWh
  const totalCostRp = Math.round(targetKwh * TARIFF_PER_KWH);
  const currentDeliveredCostRp = Math.round(port.energyDeliveredKwh * TARIFF_PER_KWH);

  // Estimasi pertambahan persentase SoC dari kuota kWh yang dipilih
  const estimatedSocGain = Math.round((targetKwh / port.batteryCapacityKwh) * 100);
  const estimatedFinalSoc = Math.min(100, port.soc + estimatedSocGain);

  // Update kuota kWh
  const handleUpdateTargetKwh = (kwh: number) => {
    const clamped = Math.max(1, Math.min(maxRoomKwh, Math.round(kwh * 10) / 10));
    setTargetKwh(clamped);

    const updatedPorts = [...state.ports];
    const target = updatedPorts.find((p) => p.id === portId);
    if (target) {
      target.targetKwh = clamped;
      onUpdateState({ ports: updatedPorts });
    }
  };

  // Navigasi wizard langkah untuk port ini
  const setPortStep = (step: 1 | 2 | 3 | 4) => {
    const updatedPorts = [...state.ports];
    const target = updatedPorts.find((p) => p.id === portId);
    if (!target) return;
    target.kioskStep = step;
    onUpdateState({ ports: updatedPorts });
  };

  // Pilih Urgensi
  const handleSelectUrgency = (urgency: UrgencyLevel) => {
    setSelectedUrgency(urgency);
    const updatedPorts = [...state.ports];
    const target = updatedPorts.find((p) => p.id === portId);
    if (!target) return;
    target.urgency = urgency;
    onUpdateState({ ports: updatedPorts });
  };

  // Handler simulasi pembayaran sukses di Step 3
  const handleSimulatePaymentSuccess = () => {
    const updatedPorts = [...state.ports];
    const target = updatedPorts.find((p) => p.id === portId);
    if (!target) return;

    // Hitung alokasi fuzzy saat charging dimulai
    const currentFuzzy = evaluatePortFuzzy(state, portId);

    target.urgency = selectedUrgency;
    target.targetKwh = targetKwh;
    target.status = 'CHARGING'; // Otomatis mengunci input di Dashboard
    target.powerKw = currentFuzzy.allocatedPower;
    target.rawFuzzyKw = currentFuzzy.rawFuzzyPower;
    target.chargingMode = currentFuzzy.chargingMode;
    target.kioskStep = 4;

    onUpdateState({ ports: updatedPorts });
  };

  // Hentikan pengisian di Step 4 (Otomatis membuka kembali kunci di Dashboard)
  const handleStopCharging = () => {
    const updatedPorts = [...state.ports];
    const target = updatedPorts.find((p) => p.id === portId);
    if (!target) return;

    target.status = 'COMPLETED';
    target.powerKw = 0;

    onUpdateState({ ports: updatedPorts });
  };

  // Reset sesi kios ke awal (Step 1)
  const handleResetKiosk = () => {
    const updatedPorts = [...state.ports];
    const target = updatedPorts.find((p) => p.id === portId);
    if (!target) return;

    target.status = 'CONNECTED';
    target.powerKw = 0;
    target.energyDeliveredKwh = 0;
    target.kioskStep = 1;

    onUpdateState({ ports: updatedPorts });
  };

  // Estimasi waktu tersisa (menit) berdasarkan sisa kuota yang belum terisi
  const remainingKwhToFill = Math.max(0, targetKwh - port.energyDeliveredKwh);
  const currentChargingPower = port.status === 'CHARGING' ? port.powerKw : fuzzyResult.allocatedPower;
  const estimatedMinutes = currentChargingPower > 0 ? Math.round((remainingKwhToFill / currentChargingPower) * 60) : 0;

  // Persentase kuota energi terpenuhi
  const kwhProgressPercent = Math.min(100, Math.round((port.energyDeliveredKwh / (targetKwh || 1)) * 100));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
      {/* Kiosk Bezel & Frame Header */}
      <div className="rounded-2xl bg-[#090e18] border border-cyan-900/50 p-4 sm:p-6 shadow-2xl flex flex-col gap-6">
        {/* Terminal Top Info Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold font-mono text-base shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              0{port.id}
            </div>
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block font-bold">
                SPKLU TOUCHSCREEN TERMINAL
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>{port.label}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono font-normal">
                  {port.socketType}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400" />
              <span>Buka Dashboard & Sensor</span>
            </button>
          </div>
        </div>

        {/* Wizard Step Progress Tracker */}
        <div className="grid grid-cols-4 gap-2 text-xs font-mono">
          <button
            onClick={() => setPortStep(1)}
            className={`p-2.5 rounded-lg border text-left transition-all flex flex-col gap-1 ${
              currentStep === 1
                ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : currentStep > 1
                ? 'bg-slate-900 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            <span className="text-[10px] uppercase opacity-75">Langkah 1</span>
            <span className="truncate">Identifikasi</span>
          </button>

          <button
            onClick={() => setPortStep(2)}
            className={`p-2.5 rounded-lg border text-left transition-all flex flex-col gap-1 ${
              currentStep === 2
                ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : currentStep > 2
                ? 'bg-slate-900 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            <span className="text-[10px] uppercase opacity-75">Langkah 2</span>
            <span className="truncate">Urgensi & Kuota</span>
          </button>

          <button
            onClick={() => setPortStep(3)}
            className={`p-2.5 rounded-lg border text-left transition-all flex flex-col gap-1 ${
              currentStep === 3
                ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : currentStep > 3
                ? 'bg-slate-900 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            <span className="text-[10px] uppercase opacity-75">Langkah 3</span>
            <span className="truncate">Pembayaran</span>
          </button>

          <button
            onClick={() => setPortStep(4)}
            className={`p-2.5 rounded-lg border text-left transition-all flex flex-col gap-1 ${
              currentStep === 4
                ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 font-bold shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'bg-slate-950/60 border-slate-800 text-slate-500'
            }`}
          >
            <span className="text-[10px] uppercase opacity-75">Langkah 4</span>
            <span className="truncate">Proses Charging</span>
          </button>
        </div>

        {/* =========================================================================
            STEP 1: IDENTIFIKASI MOBIL & SISA BATERAI
           ========================================================================= */}
        {currentStep === 1 && (
          <div className="flex flex-col gap-6 py-4 animate-in fade-in duration-200">
            <div className="p-6 rounded-xl bg-gradient-to-r from-[#0c1629] via-[#091222] to-[#0c1629] border border-cyan-500/30 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <BatteryCharging className="w-8 h-8" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-mono text-cyan-400 uppercase font-bold tracking-wider">
                    Status Sambungan EV - {port.label}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    Mobil Terhubung & Teridentifikasi!
                  </h3>
                  <span className="text-xs text-slate-400">
                    {port.vehicleName} · Gun Lock: Aktif
                  </span>
                </div>
              </div>

              <div className="px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>Koneksi Aman</span>
              </div>
            </div>

            {/* Otomatis Membaca & Menampilkan Sisa Baterai (SoC) dari Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 rounded-xl bg-[#0b1220] border border-slate-800 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-mono uppercase text-slate-400">
                    Telemetri Terbaca dari Sensor Dashboard
                  </span>
                  <h4 className="text-sm font-semibold text-white">
                    {port.vehicleName}
                  </h4>
                </div>

                <div className="flex items-baseline gap-3 my-2">
                  <span className="text-5xl font-extrabold font-mono text-cyan-300 tabular-nums">
                    {port.soc}%
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-300">
                      Terdeteksi Baterai: {port.soc}%
                    </span>
                    <span className={`text-[11px] font-mono ${
                      port.soc < 30 ? 'text-red-400' : port.soc <= 70 ? 'text-cyan-400' : 'text-emerald-400'
                    }`}>
                      {port.soc < 30 ? 'Status: Kritis / Rendah' : port.soc <= 70 ? 'Status: Cukup / Medium' : 'Status: Optimal / Tinggi'}
                    </span>
                  </div>
                </div>

                <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden p-0.5">
                  <div 
                    style={{ width: `${port.soc}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      port.soc < 30 ? 'bg-gradient-to-r from-red-500 to-amber-500' :
                      port.soc <= 70 ? 'bg-gradient-to-r from-cyan-500 to-blue-500' :
                      'bg-gradient-to-r from-emerald-500 to-teal-400'
                    }`}
                  />
                </div>
              </div>

              <div className="p-6 rounded-xl bg-[#0b1220] border border-slate-800 flex flex-col justify-between gap-3 text-xs">
                <span className="text-xs font-mono uppercase text-slate-400 font-bold">
                  Kapasitas Baterai & Batas Kuota
                </span>

                <div className="space-y-2 font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Kapasitas Baterai Total:</span>
                    <span className="text-white font-bold">{port.batteryCapacityKwh} kWh</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Sisa Ruang Baterai (ke 100%):</span>
                    <span className="text-cyan-400 font-bold">{maxRoomKwh} kWh</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Tarif Pengisian Resmi:</span>
                    <span className="text-emerald-400 font-bold">Rp 2.500 / kWh</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Sisa Daya Gedung Siap:</span>
                    <span className="text-emerald-400 font-bold">{state.buildingPower} kW</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 italic">
                  Data baterai di atas diambil dari sensor awal di Central Dashboard.
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPortStep(2)}
                className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              >
                <span>Lanjut: Pilih Urgensi & Kuota kWh</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 2: PILIH URGENSI & INPUT KUOTA KWH (TARIF RP 2.500/KWH)
           ========================================================================= */}
        {currentStep === 2 && (
          <div className="flex flex-col gap-6 py-4 animate-in fade-in duration-200">
            <div className="text-center max-w-xl mx-auto flex flex-col gap-1">
              <span className="text-xs font-mono uppercase text-cyan-400 tracking-wider font-bold">
                Langkah 2 dari 4 (Kios {port.id})
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Tentukan Urgensi & Kuota Pengisian
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Pilih profil waktu Anda dan tentukan berapa kWh energi yang ingin diisi (Tarif: <strong>Rp 2.500 / kWh</strong>).
              </p>
            </div>

            {/* BAGIAN A: TIGA TOMBOL BESAR URGENSI */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-mono text-slate-300 font-bold uppercase tracking-wider">
                1. Pilih Prioritas Waktu:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* SANTAI */}
                <button
                  onClick={() => handleSelectUrgency('SANTAI')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center justify-between gap-2 text-center cursor-pointer transition-all ${
                    selectedUrgency === 'SANTAI'
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                      : 'bg-[#0b1220] border-slate-800 hover:border-emerald-500/60 text-slate-300'
                  }`}
                >
                  <Coffee className="w-7 h-7 text-emerald-400" />
                  <span className="text-lg font-black text-white">SANTAI</span>
                  <span className="text-[11px] text-emerald-400 font-mono">Trickle / Eco (5-10 kW)</span>
                </button>

                {/* SEDANG */}
                <button
                  onClick={() => handleSelectUrgency('SEDANG')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center justify-between gap-2 text-center cursor-pointer transition-all ${
                    selectedUrgency === 'SEDANG'
                      ? 'bg-blue-950/40 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                      : 'bg-[#0b1220] border-slate-800 hover:border-cyan-500/60 text-slate-300'
                  }`}
                >
                  <Hourglass className="w-7 h-7 text-cyan-400" />
                  <span className="text-lg font-black text-white">SEDANG</span>
                  <span className="text-[11px] text-cyan-400 font-mono">Standard (11-22 kW)</span>
                </button>

                {/* BURU-BURU */}
                <button
                  onClick={() => handleSelectUrgency('BURU-BURU')}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center justify-between gap-2 text-center cursor-pointer transition-all ${
                    selectedUrgency === 'BURU-BURU'
                      ? 'bg-purple-950/40 border-purple-500 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                      : 'bg-[#0b1220] border-slate-800 hover:border-purple-500/60 text-slate-300'
                  }`}
                >
                  <Flame className="w-7 h-7 text-purple-400" />
                  <span className="text-lg font-black text-white">BURU-BURU</span>
                  <span className="text-[11px] text-purple-400 font-mono">Fast Priority (23-50 kW)</span>
                </button>
              </div>
            </div>

            {/* BAGIAN B: INPUT KUOTA KWH & KALKULASI BIAYA (RP 2.500/KWH) */}
            <div className="p-6 rounded-2xl bg-[#0c1424] border border-cyan-500/40 flex flex-col gap-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">
                    2. Masukkan Kuota Energi yang Ingin Diisi
                  </h3>
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Tarif SPKLU: <strong className="text-emerald-400 font-bold">Rp 2.500</strong> / kWh
                </div>
              </div>

              {/* Tombol Preset Cepat Kuota kWh (10, 20, 30, Full) */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-mono text-slate-400 uppercase">
                  Pilihan Cepat Nominal Kuota:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleUpdateTargetKwh(10)}
                    className={`py-2 px-3 rounded-lg border text-center transition-all ${
                      targetKwh === 10
                        ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                        : 'bg-slate-900 border-slate-700 hover:border-slate-500 text-slate-200'
                    }`}
                  >
                    <div className="text-sm font-bold font-mono">10 kWh</div>
                    <div className="text-[10px] opacity-80">{formatRupiah(10 * TARIFF_PER_KWH)}</div>
                  </button>

                  <button
                    onClick={() => handleUpdateTargetKwh(20)}
                    className={`py-2 px-3 rounded-lg border text-center transition-all ${
                      targetKwh === 20
                        ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                        : 'bg-slate-900 border-slate-700 hover:border-slate-500 text-slate-200'
                    }`}
                  >
                    <div className="text-sm font-bold font-mono">20 kWh</div>
                    <div className="text-[10px] opacity-80">{formatRupiah(20 * TARIFF_PER_KWH)}</div>
                  </button>

                  <button
                    onClick={() => handleUpdateTargetKwh(30)}
                    className={`py-2 px-3 rounded-lg border text-center transition-all ${
                      targetKwh === 30
                        ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                        : 'bg-slate-900 border-slate-700 hover:border-slate-500 text-slate-200'
                    }`}
                  >
                    <div className="text-sm font-bold font-mono">30 kWh</div>
                    <div className="text-[10px] opacity-80">{formatRupiah(30 * TARIFF_PER_KWH)}</div>
                  </button>

                  <button
                    onClick={() => handleUpdateTargetKwh(maxRoomKwh)}
                    className={`py-2 px-3 rounded-lg border text-center transition-all ${
                      targetKwh === maxRoomKwh
                        ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                        : 'bg-slate-900 border-slate-700 hover:border-cyan-500 text-cyan-300'
                    }`}
                  >
                    <div className="text-sm font-bold font-mono">Isi Penuh ({maxRoomKwh} kWh)</div>
                    <div className="text-[10px] opacity-80">{formatRupiah(maxRoomKwh * TARIFF_PER_KWH)}</div>
                  </button>
                </div>
              </div>

              {/* Stepper & Slider Input Manual */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-400 font-mono">Atur Manual Bebas Kuota (kWh):</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateTargetKwh(targetKwh - 1)}
                      className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-white"
                      disabled={targetKwh <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="flex items-baseline gap-1">
                      <input
                        type="number"
                        min="1"
                        max={maxRoomKwh}
                        step="1"
                        value={targetKwh}
                        onChange={(e) => handleUpdateTargetKwh(Number(e.target.value))}
                        className="w-20 bg-slate-900 border border-slate-700 text-white font-mono font-bold text-center py-1 rounded text-lg"
                      />
                      <span className="font-mono text-sm text-cyan-400 font-bold">kWh</span>
                    </div>

                    <button
                      onClick={() => handleUpdateTargetKwh(targetKwh + 1)}
                      className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-white"
                      disabled={targetKwh >= maxRoomKwh}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Display Total Harga Dinamis */}
                <div className="flex flex-col sm:items-end text-left sm:text-right">
                  <span className="text-[11px] font-mono text-slate-400 uppercase">
                    Total Biaya Pengisian ({targetKwh} kWh × Rp 2.500)
                  </span>
                  <span className="text-3xl font-black font-mono text-emerald-400 tabular-nums">
                    {formatRupiah(totalCostRp)}
                  </span>
                  <span className="text-[11px] font-mono text-cyan-300">
                    Baterai terisi ke estimasi ~{estimatedFinalSoc}% SoC
                  </span>
                </div>
              </div>
            </div>

            {/* Navigasi Maju ke Pembayaran */}
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setPortStep(1)}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                ← Kembali ke Identifikasi
              </button>

              <button
                onClick={() => setPortStep(3)}
                className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              >
                <span>Lanjut ke Pembayaran QRIS ({formatRupiah(totalCostRp)})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 3: PEMBAYARAN QRIS DINAMIS SESUAI KUOTA KWH
           ========================================================================= */}
        {currentStep === 3 && (
          <div className="flex flex-col gap-6 py-4 animate-in fade-in duration-200">
            <div className="text-center max-w-md mx-auto flex flex-col gap-1">
              <span className="text-xs font-mono uppercase text-cyan-400 tracking-wider font-bold">
                Langkah 3 dari 4 (Kios {port.id})
              </span>
              <h2 className="text-2xl font-bold text-white">
                Pembayaran Kuota Energi
              </h2>
              <p className="text-xs text-slate-400">
                Silakan scan untuk membayar kuota energi sebesar <strong>{targetKwh} kWh</strong>
              </p>
            </div>

            {/* QRIS Card Mockup Dinamis */}
            <div className="max-w-sm mx-auto w-full rounded-2xl bg-white text-slate-900 p-6 flex flex-col items-center gap-4 shadow-2xl relative">
              <div className="w-full flex items-center justify-between border-b pb-3 border-slate-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black tracking-tight text-red-600">QRIS</span>
                  <span className="text-[10px] text-slate-500 font-medium leading-none">
                    Pembayaran Digital<br />Nasional
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 font-semibold">
                  NMID: ID10293847{port.id}
                </span>
              </div>

              <div className="text-center">
                <h4 className="text-sm font-bold text-slate-900">
                  VOLTMIND SPKLU - KIOS 0{port.id}
                </h4>
                <span className="text-xs text-slate-500">
                  {port.vehicleName} · Urgensi: {selectedUrgency}
                </span>
              </div>

              {/* QR Code SVG */}
              <div className="p-3 bg-white border-2 border-slate-900 rounded-xl shadow-inner">
                <svg className="w-48 h-48" viewBox="0 0 100 100" fill="none">
                  <rect width="100" height="100" fill="white" />
                  <rect x="5" y="5" width="26" height="26" fill="black" />
                  <rect x="8" y="8" width="20" height="20" fill="white" />
                  <rect x="12" y="12" width="12" height="12" fill="black" />
                  <rect x="69" y="5" width="26" height="26" fill="black" />
                  <rect x="72" y="8" width="20" height="20" fill="white" />
                  <rect x="76" y="12" width="12" height="12" fill="black" />
                  <rect x="5" y="69" width="26" height="26" fill="black" />
                  <rect x="8" y="72" width="20" height="20" fill="white" />
                  <rect x="12" y="76" width="12" height="12" fill="black" />
                  <rect x="36" y="8" width="6" height="6" fill="black" />
                  <rect x="50" y="8" width="12" height="6" fill="black" />
                  <rect x="36" y="24" width="8" height="8" fill="black" />
                  <rect x="52" y="24" width="6" height="12" fill="black" />
                  <rect x="40" y="42" width="20" height="16" rx="3" fill="#10b981" />
                  <path d="M51 44L47 50H51L49 56L55 49H51L53 44H51Z" fill="white" />
                  <rect x="8" y="42" width="12" height="8" fill="black" />
                  <rect x="80" y="42" width="12" height="8" fill="black" />
                  <rect x="38" y="72" width="14" height="6" fill="black" />
                  <rect x="60" y="72" width="12" height="14" fill="black" />
                  <rect x="80" y="72" width="12" height="12" fill="black" />
                </svg>
              </div>

              {/* Rincian Tagihan Dinamis */}
              <div className="w-full bg-slate-50 p-3 rounded-lg flex flex-col gap-1 text-left font-mono text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Kuota Energi:</span>
                  <span className="font-bold text-slate-800">{targetKwh} kWh</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tarif Dasar:</span>
                  <span className="font-bold text-slate-800">Rp 2.500 / kWh</span>
                </div>
                <div className="border-t border-slate-200 pt-1 mt-1 flex justify-between items-baseline">
                  <span className="font-bold text-slate-700">Total Tagihan:</span>
                  <span className="text-xl font-black text-slate-900">{formatRupiah(totalCostRp)}</span>
                </div>
                <div className="text-[10px] text-emerald-600 font-sans pt-1">
                  Sisa saldo akan otomatis dikembalikan jika pengisian dihentikan sebelum kuota habis.
                </div>
              </div>
            </div>

            {/* Tombol Simulasikan Pembayaran Berhasil */}
            <div className="max-w-md mx-auto w-full flex flex-col gap-2">
              <button
                onClick={handleSimulatePaymentSuccess}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)]"
              >
                <CheckCircle className="w-5 h-5 text-slate-950" />
                <span>Simulasikan Pembayaran Berhasil ({formatRupiah(totalCostRp)})</span>
              </button>

              <button
                onClick={() => setPortStep(2)}
                className="text-xs text-slate-400 hover:text-white py-1 text-center"
              >
                ← Ubah Kuota kWh atau Urgensi
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 4: PROSES CHARGING & OUTPUT FUZZY LOGIC BERBASIS KUOTA
           ========================================================================= */}
        {currentStep === 4 && (
          <div className="flex flex-col gap-6 py-4 animate-in fade-in duration-200">
            {/* Display Hasil Fuzzy Logic */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0b1629] via-[#09152b] to-[#0b1629] border-2 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                  <Zap className="w-8 h-8 animate-pulse text-cyan-300" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">
                    HASIL EVALUASI FUZZY LOGIC (KIOS {port.id})
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-slate-300">Alokasi Daya:</span>
                    <span className="text-3xl sm:text-4xl font-black font-mono text-white tabular-nums">
                      {port.powerKw > 0 ? port.powerKw : fuzzyResult.allocatedPower} <span className="text-lg text-cyan-400 font-bold">kW</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-400">Status:</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      port.chargingMode.includes('Fast')
                        ? 'bg-purple-950 text-purple-300 border border-purple-700/60'
                        : port.chargingMode.includes('Standard')
                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                    }`}>
                      {port.chargingMode || fuzzyResult.chargingMode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Interlock notification & Transaction info */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono space-y-1 self-stretch md:self-auto min-w-[240px]">
                <div className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1 border-b border-slate-800 pb-1">
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Sensor Dashboard Terkunci</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Target Kuota:</span>
                  <span className="text-cyan-400 font-bold">{port.targetKwh} kWh</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Total Transaksi:</span>
                  <span className="text-emerald-400 font-bold">{formatRupiah(port.targetKwh * TARIFF_PER_KWH)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Urgensi:</span>
                  <span className="text-amber-400 font-bold">{port.urgency}</span>
                </div>
              </div>
            </div>

            {/* Animasi Baterai Mengisi & Meteran Kuota Energi */}
            <div className="p-6 rounded-2xl bg-[#0a1120] border border-slate-800 flex flex-col gap-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    port.status === 'CHARGING' ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400'
                  }`} />
                  <span className="text-xs font-mono text-emerald-400 uppercase font-bold">
                    {port.status === 'CHARGING' ? 'SEDANG MENGISI DAYA' : 'PENGISIAN SELESAI / KUOTA PENUH'}
                  </span>
                </div>

                <span className="text-xs font-mono text-slate-400">
                  Estimasi Selesai: <strong className="text-white">{estimatedMinutes} Menit</strong>
                </span>
              </div>

              {/* Progress 1: Kuota Energi kWh Terbeli */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                <div className="flex justify-between items-baseline font-mono text-xs">
                  <span className="text-slate-300 font-bold uppercase flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Progress Kuota Energi (kWh)</span>
                  </span>
                  <span className="text-cyan-300 font-bold">
                    {port.energyDeliveredKwh.toFixed(2)} / {port.targetKwh} kWh ({kwhProgressPercent}%)
                  </span>
                </div>

                {/* Progress bar kuota */}
                <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden p-0.5">
                  <div
                    style={{ width: `${kwhProgressPercent}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                  />
                </div>

                <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-1">
                  <span>Biaya Berjalan: <strong className="text-emerald-400">{formatRupiah(currentDeliveredCostRp)}</strong></span>
                  <span>Total Deposit: <strong>{formatRupiah(port.targetKwh * TARIFF_PER_KWH)}</strong></span>
                </div>
              </div>

              {/* Progress 2: SoC Persentase Baterai */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-baseline font-mono">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-cyan-300 tabular-nums">
                      {port.soc}%
                    </span>
                    <span className="text-xs text-slate-400">SoC Baterai</span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    Target Akhir: ~{estimatedFinalSoc}% SoC
                  </span>
                </div>

                <div className="relative w-full h-6 rounded-lg bg-slate-950 border border-slate-700 overflow-hidden p-0.5">
                  <div
                    style={{ width: `${port.soc}%` }}
                    className="h-full rounded bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
                  />
                </div>
              </div>

              {/* Telemetry Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Daya Pengisian</span>
                  <span className="text-lg font-bold font-mono text-cyan-300 tabular-nums">
                    {port.powerKw} kW
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Energi Tersalurkan</span>
                  <span className="text-lg font-bold font-mono text-emerald-400 tabular-nums">
                    {port.energyDeliveredKwh.toFixed(2)} kWh
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Arus Saluran</span>
                  <span className="text-lg font-bold font-mono text-white tabular-nums">
                    {port.powerKw > 0 ? ((port.powerKw * 1000) / 480).toFixed(1) : '0.0'} A
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Sisa Kuota</span>
                  <span className="text-lg font-bold font-mono text-amber-300 tabular-nums">
                    {remainingKwhToFill.toFixed(1)} kWh
                  </span>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {port.status === 'CHARGING' ? (
                  <button
                    onClick={handleStopCharging}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <span>Hentikan Pengisian / Selesai</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSimulatePaymentSuccess}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <span>Lanjutkan Pengisian</span>
                  </button>
                )}

                <button
                  onClick={handleResetKiosk}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Sesi Baru</span>
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>Buka Central Dashboard & Sensor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
