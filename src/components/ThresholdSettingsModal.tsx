import React, { useState } from 'react';
import { AlertThresholds } from '../types.js';
import { X, Sliders, ShieldAlert, Cpu, MemoryStick as Memory, RotateCcw, Check, BellRing } from 'lucide-react';

interface ThresholdSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  thresholds: AlertThresholds;
  onSaveThresholds: (thresholds: AlertThresholds) => void;
  currentCpu?: number;
  currentMemory?: number;
}

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  cpuCriticalPercent: 85,
  memoryCriticalPercent: 80,
  enabled: true,
};

export const ThresholdSettingsModal: React.FC<ThresholdSettingsModalProps> = ({
  isOpen,
  onClose,
  thresholds,
  onSaveThresholds,
  currentCpu = 0,
  currentMemory = 0,
}) => {
  const [cpuVal, setCpuVal] = useState<number>(thresholds.cpuCriticalPercent);
  const [memVal, setMemVal] = useState<number>(thresholds.memoryCriticalPercent);
  const [isEnabled, setIsEnabled] = useState<boolean>(thresholds.enabled);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Sync when modal opens or thresholds change
  React.useEffect(() => {
    if (isOpen) {
      setCpuVal(thresholds.cpuCriticalPercent);
      setMemVal(thresholds.memoryCriticalPercent);
      setIsEnabled(thresholds.enabled);
      setSavedSuccess(false);
    }
  }, [isOpen, thresholds]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveThresholds({
      cpuCriticalPercent: Number(cpuVal),
      memoryCriticalPercent: Number(memVal),
      enabled: isEnabled,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 450);
  };

  const handleResetDefaults = () => {
    setCpuVal(DEFAULT_THRESHOLDS.cpuCriticalPercent);
    setMemVal(DEFAULT_THRESHOLDS.memoryCriticalPercent);
    setIsEnabled(DEFAULT_THRESHOLDS.enabled);
  };

  const isCpuExceededNow = currentCpu >= cpuVal && isEnabled;
  const isMemExceededNow = currentMemory >= memVal && isEnabled;

  return (
    <div
      id="threshold-settings-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="threshold-settings-modal"
        className="relative w-full max-w-lg rounded-2xl border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-2xl p-6 overflow-hidden flex flex-col gap-5 text-slate-800 dark:text-slate-200 transition-colors"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 text-rose-600 dark:text-rose-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Alert Trigger Thresholds</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 font-bold">
                  CRITICAL
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure custom utilization percentage limits for automatic incident logging
              </p>
            </div>
          </div>

          <button
            id="btn-close-threshold-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Enable Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <BellRing className={`w-4 h-4 ${isEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white">Threshold Incident Watchdog</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {isEnabled
                  ? 'Active: Generates CRITICAL alerts whenever utilization exceeds targets'
                  : 'Disabled: Custom threshold evaluation is currently paused'}
              </div>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              id="input-toggle-threshold-watchdog"
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSave} className="space-y-5">
          {/* CPU Threshold Field */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="input-threshold-cpu-slider" className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>CPU Critical Limit</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Live: <strong className={isCpuExceededNow ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}>{currentCpu}%</strong>
                </span>
                <span
                  id="cpu-threshold-value-display"
                  className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-cyan-100 dark:bg-cyan-950 border border-cyan-300 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-300"
                >
                  &ge; {cpuVal}%
                </span>
              </div>
            </div>

            <input
              id="input-threshold-cpu-slider"
              type="range"
              min="30"
              max="99"
              step="1"
              value={cpuVal}
              onChange={(e) => setCpuVal(Number(e.target.value))}
              disabled={!isEnabled}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-40"
            />

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
              <span>30% (Sensitive)</span>
              <span>85% (Recommended)</span>
              <span>99% (Near-hang)</span>
            </div>

            {isCpuExceededNow && (
              <div className="flex items-center gap-1.5 text-[11px] text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/30 px-2.5 py-1.5 rounded-lg">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Current CPU utilization ({currentCpu}%) currently breaches this threshold!</span>
              </div>
            )}
          </div>

          {/* Memory Threshold Field */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="input-threshold-memory-slider" className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <Memory className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Memory Critical Limit</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Live: <strong className={isMemExceededNow ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300'}>{currentMemory}%</strong>
                </span>
                <span
                  id="memory-threshold-value-display"
                  className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-purple-100 dark:bg-purple-950 border border-purple-300 dark:border-purple-500/40 text-purple-800 dark:text-purple-300"
                >
                  &ge; {memVal}%
                </span>
              </div>
            </div>

            <input
              id="input-threshold-memory-slider"
              type="range"
              min="30"
              max="98"
              step="1"
              value={memVal}
              onChange={(e) => setMemVal(Number(e.target.value))}
              disabled={!isEnabled}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500 disabled:opacity-40"
            />

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
              <span>30% (Sensitive)</span>
              <span>80% (Recommended)</span>
              <span>98% (Near-OOM)</span>
            </div>

            {isMemExceededNow && (
              <div className="flex items-center gap-1.5 text-[11px] text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-500/30 px-2.5 py-1.5 rounded-lg">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Current Memory ({currentMemory}%) currently breaches this threshold!</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              id="btn-reset-threshold-defaults"
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors font-mono"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                id="btn-cancel-threshold-settings"
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-save-threshold-settings"
                type="submit"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 transition-all"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Apply Thresholds</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
