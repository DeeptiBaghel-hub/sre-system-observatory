import React from 'react';
import { Activity, ShieldCheck, Zap, Sparkles, Wifi, WifiOff, RefreshCcw, Download, Keyboard, Pause, Play, Sun, Moon, Cpu, Wrench, FileText } from 'lucide-react';
import { SimulationScenario, Theme } from '../types.js';

interface HeaderProps {
  isConnected: boolean;
  activeScenario: SimulationScenario;
  onOpenStressLab: () => void;
  onOpenDiagnosis: () => void;
  isLoadingDiagnosis: boolean;
  onResetNominal: () => void;
  compositeScore: number;
  onExportCsv: () => void;
  historyCount: number;
  onOpenShortcuts?: () => void;
  isAutoRefresh?: boolean;
  onToggleAutoRefresh?: () => void;
  pausedTicksCount?: number;
  theme?: Theme;
  onToggleTheme?: () => void;
  onOpenProcesses?: () => void;
  onOpenRunbooks?: () => void;
  onOpenPostMortem?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isConnected,
  activeScenario,
  onOpenStressLab,
  onOpenDiagnosis,
  isLoadingDiagnosis,
  onResetNominal,
  compositeScore,
  onExportCsv,
  historyCount,
  onOpenShortcuts,
  isAutoRefresh = true,
  onToggleAutoRefresh,
  pausedTicksCount = 0,
  theme = 'dark',
  onToggleTheme,
  onOpenProcesses,
  onOpenRunbooks,
  onOpenPostMortem,
}) => {
  const isScenarioActive = activeScenario !== 'NORMAL';

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3.5 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Logo and title */}
        <div className="flex items-center gap-3">
          <div className="relative p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 text-cyan-500 dark:text-cyan-400">
            <Activity className="w-5 h-5" />
            {isConnected && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 ring-4 ring-white dark:ring-slate-950 animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Real-Time System Monitor &amp; AI Prediction
              </h1>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                v2.4 Live
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live kernel telemetry with statistical anomaly forecasting &amp; Gemini AI root cause analysis
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center flex-wrap gap-2.5 self-start md:self-auto">
          {/* Connection Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-colors ${
              isConnected
                ? 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
                : 'border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400'
            }`}
          >
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>WebSocket Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 animate-pulse" />
                <span>Reconnecting...</span>
              </>
            )}
          </div>

          {/* Auto-Refresh Pause/Play Toggle Button */}
          {onToggleAutoRefresh && (
            <button
              id="btn-header-auto-refresh"
              onClick={onToggleAutoRefresh}
              title={
                isAutoRefresh
                  ? "Click or press 'P' to pause live updates & freeze historical view"
                  : "Click or press 'P' to resume live streaming telemetry"
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-medium transition-all ${
                isAutoRefresh
                  ? 'border-cyan-500/40 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/40'
                  : 'border-amber-500/60 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 ring-1 ring-amber-500/40 shadow-sm'
              }`}
            >
              {isAutoRefresh ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Auto-Refresh: <strong className="text-cyan-700 dark:text-cyan-200">LIVE</strong></span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-400/20" />
                  <span>Auto-Refresh: <strong className="text-amber-700 dark:text-amber-200">PAUSED</strong></span>
                  {pausedTicksCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200 border border-amber-400 dark:border-amber-500/40">
                      +{pausedTicksCount}
                    </span>
                  )}
                </>
              )}
              <kbd className="hidden sm:inline px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-700/80 text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                P
              </kbd>
            </button>
          )}

          {/* Health index pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-mono transition-colors">
            <span className="text-slate-500 dark:text-slate-400">Health:</span>
            <span
              className={`font-bold ${
                compositeScore >= 80
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : compositeScore >= 50
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {compositeScore}/100
            </span>
          </div>

          {/* Active Scenario indicator or reset */}
          {isScenarioActive && (
            <button
              id="btn-header-reset-scenario"
              onClick={onResetNominal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-mono font-semibold hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
              title="Reset simulation to baseline"
            >
              <RefreshCcw className="w-3 h-3 animate-spin-slow" />
              <span>{activeScenario.replace('_', ' ')} (Reset)</span>
            </button>
          )}

          {/* Theme Toggle Button */}
          {onToggleTheme && (
            <button
              id="btn-header-theme-toggle"
              onClick={onToggleTheme}
              title={
                theme === 'dark'
                  ? "Switch to Light Theme (Shortcut: 'T')"
                  : "Switch to Dark Theme (Shortcut: 'T')"
              }
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono font-medium transition-colors shadow-sm"
              aria-label={`Toggle theme (currently ${theme})`}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
              <kbd className="hidden sm:inline px-1 py-0.2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                T
              </kbd>
            </button>
          )}

          {/* Stress Lab trigger button */}
          <button
            id="btn-header-stress-lab"
            onClick={onOpenStressLab}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Failure Lab
          </button>

          {/* Processes Inspector button */}
          {onOpenProcesses && (
            <button
              id="btn-header-processes"
              onClick={onOpenProcesses}
              title="Inspect Kernel Processes & Dispatch Signals (Shortcut: 'K')"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors shadow-sm"
            >
              <Cpu className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Processes</span>
              <kbd className="hidden sm:inline px-1 py-0.2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold">K</kbd>
            </button>
          )}

          {/* SRE Runbooks button */}
          {onOpenRunbooks && (
            <button
              id="btn-header-runbooks"
              onClick={onOpenRunbooks}
              title="Execute Automated Self-Healing Runbooks (Shortcut: 'R')"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors shadow-sm"
            >
              <Wrench className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Runbooks</span>
              <kbd className="hidden sm:inline px-1 py-0.2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold">R</kbd>
            </button>
          )}

          {/* Incident Post-Mortem button */}
          {onOpenPostMortem && (
            <button
              id="btn-header-postmortem"
              onClick={onOpenPostMortem}
              title="Generate & Export Blameless SRE Post-Mortem (Shortcut: 'O')"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Post-Mortem</span>
              <kbd className="hidden sm:inline px-1 py-0.2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold">O</kbd>
            </button>
          )}

          {/* Keyboard Shortcuts button */}
          {onOpenShortcuts && (
            <button
              id="btn-header-shortcuts"
              onClick={onOpenShortcuts}
              title="Keyboard Shortcuts Guide (Press '?')"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors shadow-sm"
            >
              <Keyboard className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span className="hidden sm:inline">Shortcuts</span>
              <kbd className="px-1 py-0.2 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold">?</kbd>
            </button>
          )}

          {/* Export CSV button */}
          <button
            id="btn-header-export-csv"
            onClick={onExportCsv}
            disabled={historyCount === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors shadow-sm"
            title={`Export ${historyCount} telemetry data points to CSV`}
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export CSV</span>
            {historyCount > 0 && (
              <span className="text-[10px] font-mono px-1 rounded bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                {historyCount}
              </span>
            )}
          </button>

          {/* Gemini AI diagnosis trigger */}
          <button
            id="btn-header-diagnosis"
            onClick={onOpenDiagnosis}
            disabled={isLoadingDiagnosis}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-950/20 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isLoadingDiagnosis ? 'Diagnosing...' : 'AI Forensics'}
          </button>
        </div>
      </div>
    </header>
  );
};

