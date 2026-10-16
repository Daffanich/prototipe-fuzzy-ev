/**
 * ============================================================================
 * SMART LOAD MANAGER SPKLU - FUZZY LOGIC MAMDANI SIMULATION
 * Multi-Kiosk (Kios 1-4) & Combined Dashboard/Sensor Platform
 * ============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { LandingView } from './components/LandingView.tsx';
import { CombinedDashboardSensorView } from './components/CombinedDashboardSensorView.tsx';
import { KioskView } from './components/KioskView.tsx';
import { FuzzyView } from './components/FuzzyView.tsx';
import { 
  AppState, 
  ViewType,
  loadSavedState, 
  saveStateToStorage, 
  defaultState,
  evaluatePortFuzzy 
} from './store.ts';

export default function App() {
  const [state, setState] = useState<AppState>(() => loadSavedState());

  // Simpan ke localStorage setiap ada perubahan state
  useEffect(() => {
    saveStateToStorage(state);
  }, [state]);

  // Handler navigasi view
  const handleNavigate = useCallback((view: ViewType) => {
    setState((prev) => ({
      ...prev,
      activeView: view,
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handler update state parsial dari komponen
  const handleUpdateState = useCallback((partial: Partial<AppState>) => {
    setState((prev) => {
      const next = { ...prev, ...partial, lastUpdated: Date.now() };
      return next;
    });
  }, []);

  // Toggle mode simulasi otomatis
  const handleToggleAutoSim = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isAutoSimulation: !prev.isAutoSimulation,
    }));
  }, []);

  // Reset semua kondisi ke default
  const handleResetAll = useCallback(() => {
    localStorage.removeItem('voltmind_spklu_multikiosk_v2');
    setState({
      ...defaultState,
      lastUpdated: Date.now(),
    });
  }, []);

  // ==========================================================================
  // SIMULATION CLOCK ENGINE (Tiap 1.5 detik jika Auto Simulation aktif)
  // ==========================================================================
  useEffect(() => {
    if (!state.isAutoSimulation) return;

    const interval = setInterval(() => {
      setState((prev) => {
        // Fluktuasi dinamis beban gedung (+- 1 kW)
        const deltaBuilding = Math.random() > 0.5 ? 1 : -1;
        const newBuildingPower = Math.min(95, Math.max(15, prev.buildingPower + deltaBuilding));

        const updatedPorts = prev.ports.map((port) => {
          if (port.status !== 'CHARGING') return port;

          // Naikkan energi tersalurkan
          const kwhAdded = (port.powerKw / 3600) * 1.5;
          const newEnergy = port.energyDeliveredKwh + kwhAdded;
          const socIncrease = (kwhAdded / (port.batteryCapacityKwh || 60)) * 100 * 2.5;
          const newSoc = Math.min(100, Math.round((port.soc + Math.max(0.2, socIncrease)) * 10) / 10);

          // Cek jika kuota energi kWh terpenuhi ATAU baterai sudah 100%
          const isTargetKwhReached = port.targetKwh > 0 && newEnergy >= port.targetKwh;
          const isBatteryFull = newSoc >= 100;

          if (isTargetKwhReached || isBatteryFull) {
            return {
              ...port,
              soc: newSoc,
              energyDeliveredKwh: isTargetKwhReached ? port.targetKwh : newEnergy,
              status: 'COMPLETED' as const,
              powerKw: 0,
              chargingMode: isTargetKwhReached ? 'Kuota Terpenuhi' : 'Baterai Penuh',
            };
          }

          // Re-evaluasi alokasi fuzzy port
          const otherPortsPower = prev.ports
            .filter((p) => p.id !== port.id && p.status === 'CHARGING')
            .reduce((sum, p) => sum + p.powerKw, 0);

          const availableForThisPort = Math.max(5, newBuildingPower - otherPortsPower);

          const fuzzy = evaluatePortFuzzy(
            { ...prev, buildingPower: availableForThisPort },
            port.id
          );

          return {
            ...port,
            soc: newSoc,
            powerKw: fuzzy.allocatedPower,
            chargingMode: fuzzy.chargingMode,
            rawFuzzyKw: fuzzy.rawFuzzyPower,
            energyDeliveredKwh: port.energyDeliveredKwh + kwhAdded,
          };
        });

        return {
          ...prev,
          buildingPower: newBuildingPower,
          ports: updatedPorts,
          lastUpdated: Date.now(),
        };
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [state.isAutoSimulation]);

  return (
    <div className="min-h-screen flex flex-col bg-[#060911] text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Bar Navigation */}
      <Navbar
        state={state}
        onNavigate={handleNavigate}
        onToggleAutoSim={handleToggleAutoSim}
        onResetAll={handleResetAll}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {state.activeView === 'landing' && (
          <LandingView state={state} onNavigate={handleNavigate} />
        )}

        {state.activeView === 'kiosk1' && (
          <KioskView
            portId={1}
            state={state}
            onUpdateState={handleUpdateState}
            onNavigate={handleNavigate}
          />
        )}

        {state.activeView === 'kiosk2' && (
          <KioskView
            portId={2}
            state={state}
            onUpdateState={handleUpdateState}
            onNavigate={handleNavigate}
          />
        )}

        {state.activeView === 'kiosk3' && (
          <KioskView
            portId={3}
            state={state}
            onUpdateState={handleUpdateState}
            onNavigate={handleNavigate}
          />
        )}

        {state.activeView === 'kiosk4' && (
          <KioskView
            portId={4}
            state={state}
            onUpdateState={handleUpdateState}
            onNavigate={handleNavigate}
          />
        )}

        {state.activeView === 'dashboard' && (
          <CombinedDashboardSensorView
            state={state}
            onUpdateState={handleUpdateState}
            onNavigate={handleNavigate}
          />
        )}

        {state.activeView === 'fuzzy' && (
          <FuzzyView
            state={state}
            onUpdateState={handleUpdateState}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      {/* Clean Professional Portfolio Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070b14] py-8 px-4 sm:px-8 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <span className="font-bold text-white tracking-wide">
              VOLTMIND SPKLU LOAD MANAGER
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span>Simulasi Fuzzy Inference System (Mamdani) untuk Fast Charging EV</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px]">
            <span>Portfolio Project</span>
            <span>·</span>
            <span>AI & Intelligent Systems</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
