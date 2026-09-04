import React, { useEffect } from 'react';
import { Keyboard, X, Cpu, HardDrive, Radio, Gauge, MemoryStick as MemoryIcon, ArrowLeftRight, Check, Pause, Sun, Wrench, FileText } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMetric: 'cpu' | 'memory' | 'disk' | 'network' | 'latency';
  onSelectMetric: (metric: 'cpu' | 'memory' | 'disk' | 'network' | 'latency') => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  selectedMetric,
  onSelectMetric,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const metricShortcuts: {
    key: 'cpu' | 'memory' | 'disk' | 'network' | 'latency';
    letter: string;
    digit: string;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
  }[] = [
    {
      key: 'cpu',
      letter: 'C',
      digit: '1',
      label: 'CPU Usage',
      description: 'Core utilization, clock distribution & CPU anomaly Z-scores',
      icon: Cpu,
      accentColor: '#06b6d4',
    },
    {
      key: 'memory',
      letter: 'M',
      digit: '2',
      label: 'System Memory',
      description: 'Active RAM consumption, heap allocations & memory leakage trend',
      icon: MemoryIcon,
      accentColor: '#3b82f6',
    },
    {
      key: 'disk',
      letter: 'D',
      digit: '3',
      label: 'Disk Capacity',
      description: 'Storage partition usage, volume fullness & write volume',
      icon: HardDrive,
      accentColor: '#ec4899',
    },
    {
      key: 'network',
      letter: 'N',
      digit: '4',
      label: 'Network Traffic',
      description: 'Rx ingress bandwidth, Tx egress bandwidth & burst rates',
      icon: Radio,
      accentColor: '#10b981',
    },
    {
      key: 'latency',
      letter: 'L',
      digit: '5',
      label: 'Event Loop Lag',
      description: 'Node.js libuv event loop latency, execution stall & GC delays',
      icon: Gauge,
      accentColor: '#f59e0b',
    },
  ];

  return (
    <div
      id="keyboard-shortcuts-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="keyboard-shortcuts-modal-dialog"
        className="w-full max-w-xl rounded-2xl border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-6 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-300 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Keyboard Shortcuts
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 border border-cyan-300 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-300">
                  Quick Switcher
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instantly switch the active telemetry chart without clicking cards
              </p>
            </div>
          </div>
          <button
            id="btn-close-shortcuts-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="mt-5 space-y-2.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold px-1">
            Metric Telemetry Channels
          </div>

          <div className="grid grid-cols-1 gap-2">
            {metricShortcuts.map((item) => {
              const Icon = item.icon;
              const isActive = selectedMetric === item.key;
              return (
                <div
                  key={item.key}
                  id={`shortcut-item-${item.key}`}
                  onClick={() => {
                    onSelectMetric(item.key);
                    onClose();
                  }}
                  className={`group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    isActive
                      ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-400 dark:border-cyan-500/50 shadow-md ring-1 ring-cyan-500/30'
                      : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg border"
                      style={{
                        backgroundColor: `${item.accentColor}15`,
                        borderColor: `${item.accentColor}40`,
                        color: item.accentColor,
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-cyan-700 dark:group-hover:text-cyan-200 transition-colors">
                          {item.label}
                        </span>
                        {isActive && (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-300 dark:border-cyan-500/30">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono">
                    <kbd className="px-2 py-1 text-xs font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-sm group-hover:border-cyan-500/50 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors">
                      {item.letter}
                    </kbd>
                    <span className="text-xs text-slate-400 dark:text-slate-500">or</span>
                    <kbd className="px-2 py-1 text-xs font-bold rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-sm group-hover:border-cyan-500/50 group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors">
                      {item.digit}
                    </kbd>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold px-1 mb-2">
              General Navigation &amp; Streaming
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Cycle Metrics
                </span>
                <div className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold">←</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold">→</kbd>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Pause className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Auto-Refresh
                </span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold">P</kbd>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-500" /> Toggle Theme
                </span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold">T</kbd>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Process Manager
                </span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold">K</kbd>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Runbooks
                </span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold">R</kbd>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Post-Mortem
                </span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold">O</kbd>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Help Dialog
                </span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold">?</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Footer tip */}
        <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
          <span>Shortcuts are active anywhere on the dashboard</span>
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
            Press <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
};
