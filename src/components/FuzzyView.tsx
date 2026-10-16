import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Sparkles, 
  Sliders, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Activity,
  Layers,
  Info
} from 'lucide-react';
import { AppState } from '../store.ts';
import { 
  fuzzify, 
  evaluateRules, 
  calculateFuzzyPower, 
  UrgencyLevel,
  muTrickle,
  muStandard,
  muFast
} from '../fuzzyLogic.ts';

interface FuzzyViewProps {
  state: AppState;
  onUpdateState: (partial: Partial<AppState>) => void;
  onNavigate: (view: AppState['activeView']) => void;
}

export const FuzzyView: React.FC<FuzzyViewProps> = ({
  state,
  onUpdateState,
  onNavigate,
}) => {
  // Kontrol interaktif langsung di tab Fuzzy agar reviewer portofolio bisa utak-atik real-time
  const [testBuildingPower, setTestBuildingPower] = useState<number>(state.buildingPower);
  const [testSoc, setTestSoc] = useState<number>(state.ports[0].soc);
  const [testUrgency, setTestUrgency] = useState<UrgencyLevel>(state.ports[0].urgency);

  const fuzzyCalculation = calculateFuzzyPower({
    buildingPower: testBuildingPower,
    soc: testSoc,
    urgency: testUrgency,
  });

  const { membership, activeRules, curvePoints, allocatedPower, rawFuzzyPower, chargingMode, isBuildingConstrained } = fuzzyCalculation;

  // Sync perubahan kembali ke state jika diinginkan
  const applyToPort1 = () => {
    const updatedPorts = [...state.ports];
    updatedPorts[0] = {
      ...updatedPorts[0],
      soc: testSoc,
      urgency: testUrgency,
      powerKw: updatedPorts[0].status === 'CHARGING' ? allocatedPower : 0,
      rawFuzzyKw: rawFuzzyPower,
      chargingMode,
    };
    onUpdateState({
      buildingPower: testBuildingPower,
      ports: updatedPorts,
    });
  };

  // Helper untuk menggambar kurva SVG input Daya Gedung (0 - 100 kW)
  // Kritis [0, 0, 20, 35], Sedang [25, 50, 75], Aman [65, 80, 100, 100]
  const renderBuildingCurves = () => {
    const width = 360;
    const height = 120;
    const padding = 20;
    const graphW = width - padding * 2;
    const graphH = height - padding * 2;

    const scaleX = (x: number) => padding + (x / 100) * graphW;
    const scaleY = (y: number) => height - padding - y * graphH;

    // Kritis path
    const pathKritis = `M ${scaleX(0)} ${scaleY(1)} L ${scaleX(20)} ${scaleY(1)} L ${scaleX(35)} ${scaleY(0)} L ${scaleX(100)} ${scaleY(0)}`;
    // Sedang path
    const pathSedang = `M ${scaleX(0)} ${scaleY(0)} L ${scaleX(25)} ${scaleY(0)} L ${scaleX(50)} ${scaleY(1)} L ${scaleX(75)} ${scaleY(0)} L ${scaleX(100)} ${scaleY(0)}`;
    // Aman path
    const pathAman = `M ${scaleX(0)} ${scaleY(0)} L ${scaleX(65)} ${scaleY(0)} L ${scaleX(80)} ${scaleY(1)} L ${scaleX(100)} ${scaleY(1)}`;

    const currentX = scaleX(testBuildingPower);

    return (
      <svg className="w-full h-36" viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" strokeWidth="1" />
        <line x1={padding} y1={scaleY(1)} x2={width - padding} y2={scaleY(1)} stroke="#1e293b" strokeDasharray="3,3" />

        {/* Curves */}
        <path d={pathKritis} fill="none" stroke="#ef4444" strokeWidth="2" />
        <path d={pathSedang} fill="none" stroke="#f59e0b" strokeWidth="2" />
        <path d={pathAman} fill="none" stroke="#10b981" strokeWidth="2" />

        {/* Vertical Probe Indicator */}
        <line x1={currentX} y1={padding} x2={currentX} y2={height - padding} stroke="#38bdf8" strokeWidth="2" strokeDasharray="4,2" />
        <circle cx={currentX} cy={scaleY(membership.buildingKritis || membership.buildingSedang || membership.buildingAman)} r="4" fill="#38bdf8" />

        {/* Axis labels */}
        <text x={scaleX(0)} y={height - 5} fill="#64748b" fontSize="9" fontFamily="JetBrains Mono">0kW</text>
        <text x={scaleX(30)} y={height - 5} fill="#ef4444" fontSize="9" fontFamily="JetBrains Mono">30</text>
        <text x={scaleX(60)} y={height - 5} fill="#f59e0b" fontSize="9" fontFamily="JetBrains Mono">60</text>
        <text x={scaleX(100)} y={height - 5} fill="#10b981" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono">100kW</text>

        {/* Curve Name Labels */}
        <text x={scaleX(10)} y={scaleY(0.9)} fill="#ef4444" fontSize="9" fontWeight="bold">Kritis</text>
        <text x={scaleX(50)} y={scaleY(0.9)} fill="#f59e0b" fontSize="9" textAnchor="middle" fontWeight="bold">Sedang</text>
        <text x={scaleX(88)} y={scaleY(0.9)} fill="#10b981" fontSize="9" fontWeight="bold">Aman</text>
      </svg>
    );
  };

  // Helper untuk kurva input SoC (0 - 100%)
  const renderSocCurves = () => {
    const width = 360;
    const height = 120;
    const padding = 20;
    const graphW = width - padding * 2;
    const graphH = height - padding * 2;

    const scaleX = (x: number) => padding + (x / 100) * graphW;
    const scaleY = (y: number) => height - padding - y * graphH;

    const pathRendah = `M ${scaleX(0)} ${scaleY(1)} L ${scaleX(20)} ${scaleY(1)} L ${scaleX(35)} ${scaleY(0)} L ${scaleX(100)} ${scaleY(0)}`;
    const pathMedium = `M ${scaleX(0)} ${scaleY(0)} L ${scaleX(25)} ${scaleY(0)} L ${scaleX(50)} ${scaleY(1)} L ${scaleX(75)} ${scaleY(0)} L ${scaleX(100)} ${scaleY(0)}`;
    const pathTinggi = `M ${scaleX(0)} ${scaleY(0)} L ${scaleX(65)} ${scaleY(0)} L ${scaleX(80)} ${scaleY(1)} L ${scaleX(100)} ${scaleY(1)}`;

    const currentX = scaleX(testSoc);

    return (
      <svg className="w-full h-36" viewBox={`0 0 ${width} ${height}`}>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" strokeWidth="1" />
        <line x1={padding} y1={scaleY(1)} x2={width - padding} y2={scaleY(1)} stroke="#1e293b" strokeDasharray="3,3" />

        <path d={pathRendah} fill="none" stroke="#ef4444" strokeWidth="2" />
        <path d={pathMedium} fill="none" stroke="#06b6d4" strokeWidth="2" />
        <path d={pathTinggi} fill="none" stroke="#10b981" strokeWidth="2" />

        <line x1={currentX} y1={padding} x2={currentX} y2={height - padding} stroke="#a855f7" strokeWidth="2" strokeDasharray="4,2" />
        <circle cx={currentX} cy={scaleY(membership.socRendah || membership.socMedium || membership.socTinggi)} r="4" fill="#a855f7" />

        <text x={scaleX(0)} y={height - 5} fill="#64748b" fontSize="9" fontFamily="JetBrains Mono">0%</text>
        <text x={scaleX(30)} y={height - 5} fill="#ef4444" fontSize="9" fontFamily="JetBrains Mono">30%</text>
        <text x={scaleX(70)} y={height - 5} fill="#06b6d4" fontSize="9" fontFamily="JetBrains Mono">70%</text>
        <text x={scaleX(100)} y={height - 5} fill="#10b981" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono">100%</text>

        <text x={scaleX(10)} y={scaleY(0.9)} fill="#ef4444" fontSize="9" fontWeight="bold">Rendah</text>
        <text x={scaleX(50)} y={scaleY(0.9)} fill="#06b6d4" fontSize="9" textAnchor="middle" fontWeight="bold">Medium</text>
        <text x={scaleX(88)} y={scaleY(0.9)} fill="#10b981" fontSize="9" fontWeight="bold">Tinggi</text>
      </svg>
    );
  };

  // Helper untuk kurva output Agregasi Mamdani & Titik Centroid
  const renderOutputAgregasiCurve = () => {
    const width = 600;
    const height = 180;
    const padding = 30;
    const graphW = width - padding * 2;
    const graphH = height - padding * 2;

    const minKw = 5;
    const maxKw = 50;

    const scaleX = (x: number) => padding + ((x - minKw) / (maxKw - minKw)) * graphW;
    const scaleY = (y: number) => height - padding - y * graphH;

    // Buat SVG Path tertutup untuk area arsir agregasi
    let areaPath = `M ${scaleX(minKw)} ${scaleY(0)}`;
    curvePoints.forEach(pt => {
      areaPath += ` L ${scaleX(pt.x)} ${scaleY(pt.y)}`;
    });
    areaPath += ` L ${scaleX(maxKw)} ${scaleY(0)} Z`;

    // Garis Centroid COG z*
    const centroidX = scaleX(rawFuzzyPower);

    return (
      <svg className="w-full h-52" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="aggGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" strokeWidth="1.5" />
        <line x1={padding} y1={scaleY(1)} x2={width - padding} y2={scaleY(1)} stroke="#1e293b" strokeDasharray="3,3" />
        <line x1={padding} y1={scaleY(0.5)} x2={width - padding} y2={scaleY(0.5)} stroke="#1e293b" strokeDasharray="3,3" />

        {/* Batas Kategori Trickle / Standard / Fast */}
        <line x1={scaleX(11)} y1={padding} x2={scaleX(11)} y2={height - padding} stroke="#334155" strokeDasharray="2,2" />
        <line x1={scaleX(22)} y1={padding} x2={scaleX(22)} y2={height - padding} stroke="#334155" strokeDasharray="2,2" />

        <text x={scaleX(8)} y={padding + 10} fill="#10b981" fontSize="10" textAnchor="middle" fontWeight="bold">Trickle (5-10kW)</text>
        <text x={scaleX(16.5)} y={padding + 10} fill="#06b6d4" fontSize="10" textAnchor="middle" fontWeight="bold">Standard (11-22kW)</text>
        <text x={scaleX(36)} y={padding + 10} fill="#a855f7" fontSize="10" textAnchor="middle" fontWeight="bold">Fast Charging (23-50kW)</text>

        {/* Aggregated Membership Area */}
        <path d={areaPath} fill="url(#aggGradient)" stroke="#38bdf8" strokeWidth="2.5" />

        {/* Centroid Defuzzification Line */}
        <line x1={centroidX} y1={padding - 5} x2={centroidX} y2={height - padding} stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="5,3" />
        <circle cx={centroidX} cy={scaleY(0.6)} r="5" fill="#f59e0b" />

        {/* Centroid Label Pin */}
        <rect x={centroidX - 35} y={padding - 18} width="70" height="18" rx="4" fill="#f59e0b" />
        <text x={centroidX} y={padding - 5} fill="#090d16" fontSize="10" textAnchor="middle" fontWeight="bold" fontFamily="JetBrains Mono">
          z* = {rawFuzzyPower}kW
        </text>

        {/* X Axis ticks */}
        <text x={scaleX(5)} y={height - 8} fill="#64748b" fontSize="10" fontFamily="JetBrains Mono">5 kW</text>
        <text x={scaleX(11)} y={height - 8} fill="#10b981" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono">11 kW</text>
        <text x={scaleX(22)} y={height - 8} fill="#06b6d4" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono">22 kW</text>
        <text x={scaleX(35)} y={height - 8} fill="#64748b" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono">35 kW</text>
        <text x={scaleX(50)} y={height - 8} fill="#a855f7" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono">50 kW</text>
      </svg>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div className="flex flex-col gap-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-400">
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>METODE MAMDANI // FUZZY INFERENCE ENGINE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Visualisasi & Evaluasi Kurva Keanggotaan
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Representasi grafis kurva fungsi keanggotaan input, evaluasi 27 rule base, pemotongan α-cut, agregasi area, dan defuzzifikasi Centroid.
          </p>
        </div>

        <button
          onClick={applyToPort1}
          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] shrink-0 self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Terapkan Nilai ke Port 1</span>
        </button>
      </div>

      {/* Interactive Parameter Sliders on this page */}
      <div className="p-5 rounded-2xl bg-[#0c1424] border border-slate-800 flex flex-col gap-4 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase text-slate-300 font-bold flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Interactive Realtime Parameter Sandbox</span>
          </span>
          <span className="text-xs text-slate-500">Geser untuk melihat kurva beradaptasi seketika</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Slider 1: Daya Gedung */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400">1. Sisa Daya Gedung Induk</span>
              <span className="text-base font-bold font-mono text-emerald-400">{testBuildingPower} kW</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={testBuildingPower}
              onChange={(e) => setTestBuildingPower(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Slider 2: SoC */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400">2. Sisa Baterai (SoC) Mobil</span>
              <span className="text-base font-bold font-mono text-cyan-400">{testSoc}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={testSoc}
              onChange={(e) => setTestSoc(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Urgensi Buttons */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400">3. Urgensi Pengemudi</span>
              <span className="text-xs font-bold font-mono text-amber-400">{testUrgency}</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {(['SANTAI', 'SEDANG', 'BURU-BURU'] as UrgencyLevel[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setTestUrgency(u)}
                  className={`py-1.5 px-2 rounded text-xs font-bold font-mono transition-all ${
                    testUrgency === u
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid Kurva Input 1 & 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kurva Input 1: Daya Gedung */}
        <div className="p-5 rounded-2xl bg-[#090f1d] border border-slate-800 flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
            <span className="text-xs font-mono font-bold text-white uppercase">
              Fungsi Keanggotaan: Daya Gedung (kW)
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Input = <strong className="text-emerald-400">{testBuildingPower} kW</strong>
            </span>
          </div>
          {renderBuildingCurves()}
          <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono pt-1">
            <div className="p-1 rounded bg-slate-950 text-red-400">
              μKritis: {membership.buildingKritis.toFixed(2)}
            </div>
            <div className="p-1 rounded bg-slate-950 text-amber-400">
              μSedang: {membership.buildingSedang.toFixed(2)}
            </div>
            <div className="p-1 rounded bg-slate-950 text-emerald-400">
              μAman: {membership.buildingAman.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Kurva Input 2: SoC */}
        <div className="p-5 rounded-2xl bg-[#090f1d] border border-slate-800 flex flex-col gap-3">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
            <span className="text-xs font-mono font-bold text-white uppercase">
              Fungsi Keanggotaan: Sisa Baterai (SoC %)
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              Input = <strong className="text-cyan-400">{testSoc}%</strong>
            </span>
          </div>
          {renderSocCurves()}
          <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono pt-1">
            <div className="p-1 rounded bg-slate-950 text-red-400">
              μRendah: {membership.socRendah.toFixed(2)}
            </div>
            <div className="p-1 rounded bg-slate-950 text-cyan-400">
              μMedium: {membership.socMedium.toFixed(2)}
            </div>
            <div className="p-1 rounded bg-slate-950 text-emerald-400">
              μTinggi: {membership.socTinggi.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Kurva Output: Agregasi Mamdani & Defuzzifikasi Centroid */}
      <div className="p-6 rounded-2xl bg-gradient-to-b from-[#0b1324] to-[#070b14] border border-cyan-800/50 flex flex-col gap-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs font-mono">
              z*
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Kurva Agregasi Output & Titik Defuzzifikasi Centroid
              </h3>
              <span className="text-xs text-slate-400">
                Metode Center of Gravity: z* = ∫ z·μ(z) dz / ∫ μ(z) dz
              </span>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-xs text-slate-400 font-mono">Hasil Defuzzifikasi:</span>
            <span className="text-2xl font-black font-mono text-amber-400 tabular-nums">
              {rawFuzzyPower} kW
            </span>
            <span className="text-xs font-bold text-cyan-400 uppercase">
              ({chargingMode})
            </span>
          </div>
        </div>

        {/* Visualisasi Kurva Output */}
        {renderOutputAgregasiCurve()}

        {isBuildingConstrained && (
          <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/50 text-xs text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Safety Clamp Aktif:</strong> Nilai centroid murni adalah {rawFuzzyPower} kW, namun dibatasi menjadi <strong>{allocatedPower} kW</strong> demi menyesuaikan sisa batas aman kapasitas trafo gedung saat ini ({testBuildingPower} kW).
            </span>
          </div>
        )}
      </div>

      {/* Tabel Evaluasi Rules yang Aktif */}
      <div className="p-6 rounded-2xl bg-[#090f1d] border border-slate-800 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white font-mono uppercase flex items-center gap-2">
            <span>Daftar Rule Base yang Terpicu ({activeRules.length} Aturan Aktif)</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">Operator: MIN (AND)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 px-3">Rule #</th>
                <th className="py-2 px-3">Premis & Logika (IF - THEN)</th>
                <th className="py-2 px-3 text-center">Derajat α-cut (MIN)</th>
                <th className="py-2 px-3 text-right">Konklusi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {activeRules.map((r) => (
                <tr key={r.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-2 px-3 font-bold text-slate-400">Rule {r.id}</td>
                  <td className="py-2 px-3 text-slate-200">{r.ruleText}</td>
                  <td className="py-2 px-3 text-center font-bold text-cyan-400 tabular-nums">
                    α = {r.alpha.toFixed(3)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.consequent === 'FAST' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                      r.consequent === 'STANDARD' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                      'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {r.consequent}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
