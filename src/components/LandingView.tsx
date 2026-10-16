import React from 'react';
import { 
  Monitor, 
  LayoutDashboard, 
  BrainCircuit, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  Activity, 
  Cpu, 
  BatteryCharging,
  Sliders,
  ExternalLink
} from 'lucide-react';
import { AppState, ViewType } from '../store.ts';

interface LandingViewProps {
  state: AppState;
  onNavigate: (view: ViewType) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ state, onNavigate }) => {
  const activeChargersCount = state.ports.filter(p => p.status === 'CHARGING').length;
  const totalPowerUsed = state.ports.reduce((sum, p) => sum + (p.status === 'CHARGING' ? p.powerKw : 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-10">
      {/* Hero Section */}
      <div className="relative rounded-2xl bg-gradient-to-b from-[#0e172a] via-[#090f1d] to-[#060911] border border-slate-800 p-6 sm:p-10 overflow-hidden shadow-2xl">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl flex flex-col gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono w-fit">
            <Cpu className="w-3.5 h-3.5" />
            <span>PORTFOLIO SHOWCASE: AI & INTELLIGENT SYSTEM</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Smart Load Manager SPKLU <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400">
              Fuzzy Logic Simulation
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Simulasi sistem cerdas Stasiun Pengisian Kendaraan Listrik Umum (SPKLU) Fast Charging berbasis{' '}
            <strong className="text-emerald-300">Fuzzy Inference System (Metode Mamdani)</strong>. 
            Dilengkapi 4 Kios Mandiri (Kios 1–4) dan Central Dashboard & Sensor Terpadu dengan proteksi penguncian parameter saat pengisian daya berlangsung.
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800/80 mt-2">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-mono uppercase">Daya Gedung</span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                {state.buildingPower} <span className="text-xs text-slate-400 font-normal">kW</span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-mono uppercase">Port Sedang Charging</span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-cyan-400 tabular-nums">
                {activeChargersCount} / 4 <span className="text-xs text-slate-400 font-normal">Kios</span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-mono uppercase">Total Beban SPKLU</span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-purple-400 tabular-nums">
                {totalPowerUsed} <span className="text-xs text-slate-400 font-normal">kW</span>
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 font-mono uppercase">Sisa Aman Trafo</span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tabular-nums">
                {Math.max(0, state.buildingPower - totalPowerUsed)} <span className="text-xs text-slate-400 font-normal">kW</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Central SCADA Control Banner */}
      <div 
        onClick={() => onNavigate('dashboard')}
        className="group relative rounded-2xl bg-gradient-to-r from-[#0d162b] via-[#0a1224] to-[#0d162b] border-2 border-purple-500/40 hover:border-purple-500 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer transition-all duration-200 hover:shadow-[0_12px_28px_rgba(168,85,247,0.2)]"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0 group-hover:scale-105 transition-transform">
            <LayoutDashboard className="w-7 h-7" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono text-purple-400 uppercase font-bold tracking-wider">
              RUANG KENDALI TERPADU
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white group-hover:text-purple-300 transition-colors">
              Central Dashboard & Panel Sensor
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Atur parameter sisa daya gedung induk dan SoC kendaraan di 4 port sebelum pengisian. Setelah pengisian aktif di Kios, input sensor otomatis terkunci dan halaman ini memantau beban secara real-time.
            </p>
          </div>
        </div>

        <div className="px-5 py-2.5 rounded-xl bg-purple-500 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shrink-0">
          <span>Buka Dashboard & Sensor</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* 4 Kios Touchscreen Cards (Kios 1, Kios 2, Kios 3, Kios 4) */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Pilih Layar Kios Pengguna (Port 1 – 4)</span>
          </h2>
          <span className="text-xs text-slate-400">Setiap Kios melayani kendaraan secara independen</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {state.ports.map((port) => {
            const isCharging = port.status === 'CHARGING';
            const viewKey = `kiosk${port.id}` as ViewType;

            return (
              <div
                key={port.id}
                onClick={() => onNavigate(viewKey)}
                className={`group rounded-xl border p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-1 ${
                  isCharging
                    ? 'bg-gradient-to-b from-[#0c182c] to-[#07101f] border-cyan-500/60 shadow-[0_8px_20px_rgba(6,182,212,0.15)]'
                    : 'bg-[#0c1424] border-slate-800 hover:border-cyan-500/40'
                }`}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
                      0{port.id}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      isCharging
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}>
                      {port.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                      Kios {port.id}
                    </h3>
                    <p className="text-xs text-slate-400 truncate">{port.vehicleName}</p>
                    <span className="text-[11px] font-mono text-slate-500">{port.socketType}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex justify-between items-baseline font-mono">
                    <span className="text-xs text-slate-400">SoC Baterai:</span>
                    <span className="text-sm font-bold text-cyan-300">{port.soc}%</span>
                  </div>

                  {isCharging && (
                    <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>Sedang Mengisi: {port.powerKw} kW</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-cyan-400">
                  <span>Buka Kios {port.id}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fuzzy Deep Dive Banner */}
      <div className="rounded-xl bg-[#0a101d] border border-slate-800 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-1">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <span>Visualisasi Kurva Keanggotaan Fuzzy Mamdani</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono">
                MATEMATIKA & INFERENCE
              </span>
            </h4>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Lihat visualisasi kurva fungsi keanggotaan input, aktivasi matriks 27 rule base, pemotongan α-cut, agregasi area, dan defuzzifikasi titik Centroid.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('fuzzy')}
          className="px-4 py-2.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span>Eksplorasi Kurva Fuzzy</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
