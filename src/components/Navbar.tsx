import React from 'react';
import { 
  Zap, 
  LayoutDashboard, 
  BrainCircuit, 
  Play, 
  Pause, 
  RotateCcw,
  Monitor
} from 'lucide-react';
import { AppState, ViewType } from '../store.ts';

interface NavbarProps {
  state: AppState;
  onNavigate: (view: ViewType) => void;
  onToggleAutoSim: () => void;
  onResetAll: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  state,
  onNavigate,
  onToggleAutoSim,
  onResetAll,
}) => {
  const isCritical = state.buildingPower < 30;
  const isMedium = state.buildingPower >= 30 && state.buildingPower <= 60;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#070b14]/95 backdrop-blur-md px-3 sm:px-6 py-3 flex items-center justify-between gap-3 transition-all">
      {/* Zone 1: Brand Wordmark */}
      <div 
        onClick={() => onNavigate('landing')}
        className="flex items-center gap-2 cursor-pointer select-none group shrink-0"
      >
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-400 transition-all shadow-[0_0_10px_rgba(16,185,129,0.2)]">
          <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400/20" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5 whitespace-nowrap">
            VOLTMIND <span className="text-emerald-400 font-mono text-[10px] px-1 py-0.2 rounded bg-emerald-950/60 border border-emerald-700/40">SPKLU</span>
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Links: Beranda, Kios 1, Kios 2, Kios 3, Kios 4, Dashboard & Sensor, Kurva Fuzzy */}
      <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none text-xs font-semibold">
        {/* Beranda */}
        <button
          onClick={() => onNavigate('landing')}
          className={`px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0 ${
            state.activeView === 'landing'
              ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          Beranda
        </button>

        {/* 4 Kios Terpisah */}
        {[1, 2, 3, 4].map((id) => {
          const viewKey = `kiosk${id}` as ViewType;
          const port = state.ports[id - 1];
          const isCharging = port?.status === 'CHARGING';
          const isActive = state.activeView === viewKey;

          return (
            <button
              key={id}
              onClick={() => onNavigate(viewKey)}
              className={`px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800/50'
              }`}
            >
              <span>Kios {id}</span>
              {isCharging && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" title="Sedang Charging" />
              )}
            </button>
          );
        })}

        {/* Central Dashboard & Panel Sensor (Gabungan) */}
        <button
          onClick={() => onNavigate('dashboard')}
          className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            state.activeView === 'dashboard'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-sm'
              : 'text-slate-400 hover:text-purple-300 hover:bg-slate-800/50'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Dashboard & Sensor</span>
        </button>

        {/* Kurva Fuzzy */}
        <button
          onClick={() => onNavigate('fuzzy')}
          className={`px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            state.activeView === 'fuzzy'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
              : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/50'
          }`}
        >
          <BrainCircuit className="w-3.5 h-3.5" />
          <span>Kurva Fuzzy</span>
        </button>
      </nav>

      {/* Zone 3: Sisa Daya Gedung Telemetry & Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <div 
          onClick={() => onNavigate('dashboard')}
          className="hidden md:flex flex-col items-end cursor-pointer px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
          title="Buka Central Dashboard & Sensor"
        >
          <span className="text-[9px] uppercase font-mono text-slate-400 tracking-wider">
            Sisa Daya Trafo
          </span>
          <span className={`font-mono text-xs font-bold ${
            isCritical ? 'text-red-400' : isMedium ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {state.buildingPower} kW
          </span>
        </div>

        {/* Auto Simulation Toggle */}
        <button
          onClick={onToggleAutoSim}
          className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
            state.isAutoSimulation
              ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
              : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
          }`}
          title="Aktifkan simulasi beban dinamis realtime otomatis"
        >
          {state.isAutoSimulation ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-slate-950" />
              <span>Simulasi: On</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-slate-300" />
              <span>Auto Sim</span>
            </>
          )}
        </button>

        {/* Standalone 1-File HTML Direct Link */}
        <a
          href="/spklu_standalone.html"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden xl:flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white transition-colors"
          title="Versi 1-file standalone HTML+CSS+JS tanpa framework"
        >
          <span>1-File HTML ↗</span>
        </a>

        {/* Quick Reset */}
        <button
          onClick={onResetAll}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          title="Reset Sesi Simulasi"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
