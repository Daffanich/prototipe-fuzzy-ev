import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Sliders, 
  Zap, 
  Building2, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  ShieldCheck, 
  ExternalLink, 
  Save, 
  CheckCircle2, 
  Power,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { AppState, ViewType, evaluatePortFuzzy, TARIFF_PER_KWH, formatRupiah } from '../store.ts';

interface CombinedDashboardSensorViewProps {
  state: AppState;
  onUpdateState: (partial: Partial<AppState>) => void;
  onNavigate: (view: ViewType) => void;
}

export const CombinedDashboardSensorView: React.FC<CombinedDashboardSensorViewProps> = ({
  state,
  onUpdateState,
  onNavigate,
}) => {
  // Local state untuk slider sebelum user klik simpan jika diinginkan, atau update langsung
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Total daya SPKLU yang sedang ditarik saat ini
  const totalSpkluLoadKw = state.ports.reduce(
    (sum, p) => sum + (p.status === 'CHARGING' ? p.powerKw : 0),
    0
  );

  const netRemainingBuildingKw = Math.max(0, state.buildingPower - totalSpkluLoadKw);
  const isCriticalGrid = state.buildingPower < 30;
  const isMediumGrid = state.buildingPower >= 30 && state.buildingPower <= 60;

  // Handler update daya gedung
  const handleBuildingPowerChange = (value: number) => {
    onUpdateState({ buildingPower: value });
  };

  // Handler update SoC port sebelum charging
  const handlePortSocChange = (portId: number, newSoc: number) => {
    const updatedPorts = [...state.ports];
    const port = updatedPorts.find((p) => p.id === portId);
    if (!port) return;

    // RULE: Input hanya bisa diubah sebelum charging!
    if (port.status === 'CHARGING') {
      return; // Terkunci
    }

    port.soc = newSoc;
    port.isOccupied = true;
    if (port.status === 'IDLE') {
      port.status = 'CONNECTED';
    }

    onUpdateState({ ports: updatedPorts });
  };

  // Handler toggle sambungan mobil (tercolok / idle)
  const handleToggleConnection = (portId: number) => {
    const updatedPorts = [...state.ports];
    const port = updatedPorts.find((p) => p.id === portId);
    if (!port) return;

    // Jika sedang charging, hentikan dulu
    if (port.status === 'CHARGING') {
      port.status = 'COMPLETED';
      port.powerKw = 0;
    } else if (port.status === 'IDLE') {
      port.status = 'CONNECTED';
      port.isOccupied = true;
      port.soc = port.soc || 25;
    } else {
      port.status = 'IDLE';
      port.isOccupied = false;
      port.powerKw = 0;
    }

    onUpdateState({ ports: updatedPorts });
  };

  // Preset Pengujian Cepat
  const applyPreset = (preset: { bldg: number; p1: number; p2: number; p3: number; p4: number }) => {
    const updatedPorts = [...state.ports];
    // Hanya ubah port yang TIDAK sedang charging
    if (updatedPorts[0].status !== 'CHARGING') updatedPorts[0].soc = preset.p1;
    if (updatedPorts[1].status !== 'CHARGING') updatedPorts[1].soc = preset.p2;
    if (updatedPorts[2].status !== 'CHARGING') updatedPorts[2].soc = preset.p3;
    if (updatedPorts[3].status !== 'CHARGING') updatedPorts[3].soc = preset.p4;

    onUpdateState({
      buildingPower: preset.bldg,
      ports: updatedPorts,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-8">
      {/* Header Halaman Gabungan */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>KONSOL TERPADU // PANEL SENSOR & CENTRAL DASHBOARD</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Central Dashboard & Panel Sensor
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Atur parameter sensor lingkungan sebelum pengisian, pantau telemetri gardu, dan amati pembagian daya Fuzzy Logic di 4 port.
          </p>
        </div>

        {/* Status Toast Notification */}
        {saveSuccess && (
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Preset Sensor Diterapkan!</span>
          </div>
        )}
      </div>

      {/* =========================================================================
          BAGIAN ATAS: TOTAL SISA DAYA GEDUNG SAAT INI & SLIDER GEDUNG INDUK
         ========================================================================= */}
      <div className="p-6 rounded-2xl bg-gradient-to-b from-[#0c1424] to-[#080d18] border border-slate-800 flex flex-col gap-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
              isCriticalGrid
                ? 'bg-red-500/10 border-red-500/40 text-red-400'
                : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
            }`}>
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">
                TELEMETRI TRAFO GARDU INDUK
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Total Sisa Daya Gedung Saat Ini
              </h2>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className={`text-4xl sm:text-5xl font-black font-mono tabular-nums ${
              isCriticalGrid ? 'text-red-400' : isMediumGrid ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {state.buildingPower}
            </span>
            <span className="text-base font-mono text-slate-400 font-bold">kW Tersedia</span>
          </div>
        </div>

        {/* Slider Pengaturan Sisa Daya Gedung */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Input Sensor: Sisa Daya Gedung Induk (0 - 100 kW)</span>
            </span>
            <span className={`font-bold ${
              isCriticalGrid ? 'text-red-400' : isMediumGrid ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              Zona: {isCriticalGrid ? 'KRITIS (<30 kW)' : isMediumGrid ? 'SEDANG (30-60 kW)' : 'AMAN (>60 kW)'}
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={state.buildingPower}
            onChange={(e) => handleBuildingPowerChange(Number(e.target.value))}
            className="w-full cursor-pointer"
          />

          <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
            <span className="text-red-400">0 kW (Kritis)</span>
            <span className="text-amber-400">30 kW (Batas Kritis)</span>
            <span className="text-cyan-400">60 kW (Ambang Sedang)</span>
            <span className="text-emerald-400">100 kW (Maksimal)</span>
          </div>
        </div>

        {/* Barometer Visual Pembagian Daya Trafo */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-300 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" />
              <span>Total Beban SPKLU Terpakai: <strong className="text-white">{totalSpkluLoadKw} kW</strong></span>
            </span>
            <span className="text-slate-300 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              <span>Sisa Cadangan Bersih: <strong className="text-white">{netRemainingBuildingKw} kW</strong></span>
            </span>
          </div>

          <div className="w-full h-4 rounded-lg bg-slate-950 border border-slate-700/80 overflow-hidden flex p-0.5">
            <div
              style={{ width: `${Math.min(100, (totalSpkluLoadKw / 100) * 100)}%` }}
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded transition-all duration-300"
              title={`Beban SPKLU: ${totalSpkluLoadKw} kW`}
            />
            <div
              style={{ width: `${Math.min(100, (netRemainingBuildingKw / 100) * 100)}%` }}
              className={`h-full rounded transition-all duration-300 ml-0.5 ${
                isCriticalGrid ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              title={`Sisa Gedung: ${netRemainingBuildingKw} kW`}
            />
          </div>
        </div>

        {/* Preset Cepat Telemetri */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
          <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Preset Skenario Beban Cepat:</span>
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => applyPreset({ bldg: 18, p1: 15, p2: 30, p3: 75, p4: 20 })}
              className="px-2.5 py-1 rounded bg-slate-900 border border-red-900/50 hover:border-red-500 text-[11px] font-mono text-red-300"
            >
              1. Beban Gedung Kritis (18 kW)
            </button>
            <button
              onClick={() => applyPreset({ bldg: 48, p1: 45, p2: 50, p3: 65, p4: 40 })}
              className="px-2.5 py-1 rounded bg-slate-900 border border-amber-900/50 hover:border-amber-500 text-[11px] font-mono text-amber-300"
            >
              2. Beban Normal (48 kW)
            </button>
            <button
              onClick={() => applyPreset({ bldg: 88, p1: 12, p2: 20, p3: 35, p4: 25 })}
              className="px-2.5 py-1 rounded bg-slate-900 border border-emerald-900/50 hover:border-emerald-500 text-[11px] font-mono text-emerald-300"
            >
              3. Daya Melimpah (88 kW)
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BAGIAN BAWAH: GRID 2X2 DENGAN INPUT SENSOR (TERKUNCI SAAT CHARGING)
          & MONITORING TELEMETRI
         ========================================================================= */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Sensor & Monitoring 4 Port SPKLU</span>
            </h2>
            <p className="text-xs text-slate-400">
              Input SoC hanya dapat disetel sebelum pengisian dimulai. Saat proses charging berjalan, input sensor otomatis terkunci.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1 text-emerald-400">
              <Unlock className="w-3.5 h-3.5" />
              <span>Input Siap / Terbuka</span>
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <Lock className="w-3.5 h-3.5" />
              <span>Terkunci (Charging)</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {state.ports.map((port) => {
            const isCharging = port.status === 'CHARGING';
            const isConnected = port.status === 'CONNECTED' || isCharging;
            const portViewKey = `kiosk${port.id}` as ViewType;
            const fuzzy = evaluatePortFuzzy(state, port.id);

            return (
              <div 
                key={port.id}
                className={`p-6 rounded-2xl border flex flex-col justify-between gap-5 shadow-lg transition-all ${
                  isCharging
                    ? 'bg-gradient-to-b from-[#0d172c] to-[#080f1e] border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                    : isConnected
                    ? 'bg-[#0b1220] border-slate-800'
                    : 'bg-[#080d17] border-slate-900 opacity-80'
                }`}
              >
                {/* Port Card Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-xs border ${
                      isCharging 
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      0{port.id}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>{port.label}</span>
                        {isCharging && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        )}
                      </h3>
                      <span className="text-xs text-slate-400">{port.vehicleName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider ${
                      isCharging 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : port.status === 'CONNECTED'
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                        : 'bg-slate-900 text-slate-500 border border-slate-800'
                    }`}>
                      {port.status}
                    </span>
                  </div>
                </div>

                {/* =============================================================
                    KONTROL INPUT SENSOR SOC (TERKUNCI SAAT CHARGING)
                   ============================================================= */}
                <div className={`p-4 rounded-xl border flex flex-col gap-2 relative ${
                  isCharging
                    ? 'bg-slate-950/80 border-amber-900/50'
                    : 'bg-slate-900/70 border-slate-800'
                }`}>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-slate-300 font-bold flex items-center gap-1.5">
                      {isCharging ? (
                        <>
                          <Lock className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-300">Input Sensor Baterai Terkunci</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4 text-emerald-400" />
                          <span>Input Sensor SoC Baterai</span>
                        </>
                      )}
                    </span>

                    <span className="font-mono font-bold text-base text-cyan-300 tabular-nums">
                      {port.soc}%
                    </span>
                  </div>

                  {/* Slider Input */}
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={port.soc}
                    disabled={isCharging}
                    onChange={(e) => handlePortSocChange(port.id, Number(e.target.value))}
                    className={`w-full ${isCharging ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  />

                  {/* Keterangan Status Kunci */}
                  {isCharging ? (
                    <div className="text-[11px] font-mono text-amber-400/90 flex items-center justify-between pt-1">
                      <span>⚡ Pengisian Aktif ({port.powerKw} kW) — Parameter dikunci</span>
                      <span className="text-slate-400">Stop di Kios untuk buka</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
                      <span>Set Cepat:</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handlePortSocChange(port.id, 15)}
                          className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 hover:border-red-500 text-slate-300"
                        >
                          15%
                        </button>
                        <button
                          onClick={() => handlePortSocChange(port.id, 50)}
                          className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 hover:border-cyan-500 text-slate-300"
                        >
                          50%
                        </button>
                        <button
                          onClick={() => handlePortSocChange(port.id, 80)}
                          className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 hover:border-emerald-500 text-slate-300"
                        >
                          80%
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Telemetri Monitoring Grid (4 metrics) */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Daya Aktif</span>
                    <span className="text-lg font-bold font-mono text-cyan-300 tabular-nums">
                      {isCharging ? port.powerKw : 0} <span className="text-xs text-slate-400 font-normal">kW</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Kuota Terisi</span>
                    <span className="text-xs font-bold text-white pt-1 truncate font-mono">
                      {port.energyDeliveredKwh.toFixed(1)} / {port.targetKwh || 20} kWh
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Nilai Tagihan</span>
                    <span className="text-xs font-bold font-mono text-emerald-400 pt-1">
                      {formatRupiah((port.targetKwh || 20) * TARIFF_PER_KWH)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar Baterai */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono text-slate-400">
                    <span>Level Baterai Mobil</span>
                    <span className="text-white font-bold">{port.soc}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden p-0.5">
                    <div 
                      style={{ width: `${port.soc}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCharging
                          ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                          : 'bg-slate-700'
                      }`}
                    />
                  </div>
                </div>

                {/* Action Footer: Buka Kios */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">
                    Urgensi: <strong className="text-amber-400">{port.urgency}</strong>
                  </span>

                  <button
                    onClick={() => onNavigate(portViewKey)}
                    className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <span>Buka Layar Kios {port.id}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
