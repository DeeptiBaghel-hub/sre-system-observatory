import React from 'react';
import { SimulationScenario } from '../types.js';
import { X, Play, RefreshCcw, AlertTriangle, Zap, HardDrive, Cpu, Radio, ShieldCheck } from 'lucide-react';

interface StressLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeScenario: SimulationScenario;
  onSelectScenario: (scenario: SimulationScenario) => void;
}

export const StressLabModal: React.FC<StressLabModalProps> = ({
  isOpen,
  onClose,
  activeScenario,
  onSelectScenario,
}) => {
  if (!isOpen) return null;

  const scenarios: {
    id: SimulationScenario;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    modelTarget: string;
    expectedPrediction: string;
    badgeColor: string;
  }[] = [
    {
      id: 'NORMAL',
      title: 'Nominal Baseline Operating State',
      icon: ShieldCheck,
      description: 'Standard container operations. Normal variance in CPU, memory allocators, and filesystem I/O with zero unbounded accumulation.',
      modelTarget: 'Linear regression slope ≈ 0, Z-Scores within ±1.5σ.',
      expectedPrediction: 'System Healthy (> 72 hours to incident).',
      badgeColor: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
    },
    {
      id: 'MEMORY_LEAK',
      title: 'Active Heap Memory Leak (Leak Simulator)',
      icon: Zap,
      description: 'Simulates unbounded memory retention (+18 MB/s accumulation velocity). Watch the model detect the upward slope and calculate the exact time-to-OOM countdown clock!',
      modelTarget: 'First derivative d(RAM)/dt > 0.08%/s over 20-second rolling regression window.',
      expectedPrediction: '"Active Memory Leak Detected — Heap exhaustion in ~12 mins"',
      badgeColor: 'border-rose-500/40 text-rose-300 bg-rose-500/10',
    },
    {
      id: 'DISK_FILL',
      title: 'Rapid Disk Runaway / Log Bombardment',
      icon: HardDrive,
      description: 'Simulates unrotated diagnostic logs rapidly consuming storage volume at +0.18% per second.',
      modelTarget: 'Slope d(Disk)/dt > 0.03%/s with extrapolation to 100% volume ceiling.',
      expectedPrediction: '"Rapid Disk Depletion Runaway — 100% full in 4.5 hours"',
      badgeColor: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
    },
    {
      id: 'CPU_STORM',
      title: 'Sustained Compute Saturation & Thread Starvation',
      icon: Cpu,
      description: 'Simulates catastrophic regex backtracking or heavy cryptographic operations driving CPU utilization past 90% and inflating event loop lag.',
      modelTarget: 'Multi-core load > 85% sustained + Z-score > 2.5 on compute variance.',
      expectedPrediction: '"Sustained Compute Saturation — Event loop degraded"',
      badgeColor: 'border-purple-500/40 text-purple-300 bg-purple-500/10',
    },
    {
      id: 'NETWORK_FLOOD',
      title: 'Ingress DDoS / Volumetric Packet Surge',
      icon: Radio,
      description: 'Simulates high-velocity ingress traffic flood (18+ MB/s) stressing socket descriptors and buffer rings.',
      modelTarget: 'Ingress throughput exceeding rolling 5-minute average by 10x.',
      expectedPrediction: '"Abnormal Ingress Network Surge — Buffer starvation risk"',
      badgeColor: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="stress-lab-modal"
        className="relative w-full max-w-2xl rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/95 shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh] transition-colors"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Failure & Anomaly Injection Laboratory
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Trigger real-time stress scenarios to test statistical prediction models and Gemini root cause analysis.
              </p>
            </div>
          </div>
          <button
            id="btn-close-stress-lab"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scenarios List */}
        <div className="py-4 overflow-y-auto space-y-3 pr-1">
          {scenarios.map((sc) => {
            const Icon = sc.icon;
            const isActive = activeScenario === sc.id;

            return (
              <div
                key={sc.id}
                id={`scenario-card-${sc.id}`}
                onClick={() => onSelectScenario(sc.id)}
                className={`relative cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                  isActive
                    ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30 shadow-lg shadow-cyan-950/20 ring-1 ring-cyan-500/40'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-lg border mt-0.5 ${
                        isActive
                          ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-300 dark:border-cyan-500/40'
                          : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                          {sc.title}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950">
                            LIVE ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        {sc.description}
                      </p>
                      
                      <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono">
                        <span className="text-slate-500 dark:text-slate-400">
                          Detection Mechanism:{' '}
                          <span className="text-slate-700 dark:text-slate-300">{sc.modelTarget}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    id={`btn-inject-${sc.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectScenario(sc.id);
                    }}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950'
                        : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {isActive ? (
                      'Simulating...'
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        Inject
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            id="btn-reset-nominal"
            onClick={() => onSelectScenario('NORMAL')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Reset to Nominal State
          </button>
          <button
            id="btn-done-stress-lab"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
          >
            Close & Inspect Live Charts
          </button>
        </div>
      </div>
    </div>
  );
};
