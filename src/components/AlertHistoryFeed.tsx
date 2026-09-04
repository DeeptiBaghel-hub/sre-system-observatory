import React, { useState, useMemo } from 'react';
import { AlertEvent, AlertThresholds } from '../types.js';
import { Bell, ShieldAlert, AlertTriangle, Info, Trash2, Filter, SlidersHorizontal } from 'lucide-react';

interface AlertHistoryFeedProps {
  alerts: AlertEvent[];
  onClearAlerts: () => void;
  onOpenThresholdSettings?: () => void;
  thresholds?: AlertThresholds;
}

type SeverityLevel = 'CRITICAL' | 'WARNING' | 'INFO';

export const AlertHistoryFeed: React.FC<AlertHistoryFeedProps> = ({
  alerts,
  onClearAlerts,
  onOpenThresholdSettings,
  thresholds,
}) => {
  // Toggle visibility state for each severity level independently
  const [activeSeverities, setActiveSeverities] = useState<Record<SeverityLevel, boolean>>({
    CRITICAL: true,
    WARNING: true,
    INFO: true,
  });

  // Calculate live count per severity level
  const severityCounts = useMemo(() => {
    const counts: Record<SeverityLevel, number> = {
      CRITICAL: 0,
      WARNING: 0,
      INFO: 0,
    };
    for (const alert of alerts) {
      if (counts[alert.severity] !== undefined) {
        counts[alert.severity]++;
      }
    }
    return counts;
  }, [alerts]);

  // Toggle a single severity on/off
  const toggleSeverity = (severity: SeverityLevel) => {
    setActiveSeverities((prev) => ({
      ...prev,
      [severity]: !prev[severity],
    }));
  };

  // Toggle all on/off
  const allActive = activeSeverities.CRITICAL && activeSeverities.WARNING && activeSeverities.INFO;
  const toggleAll = () => {
    const nextState = !allActive;
    setActiveSeverities({
      CRITICAL: nextState,
      WARNING: nextState,
      INFO: nextState,
    });
  };

  // Filter alerts based on active toggle states
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => activeSeverities[a.severity]);
  }, [alerts, activeSeverities]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const severityConfigs: {
    key: SeverityLevel;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    activeClasses: string;
    inactiveClasses: string;
    countBadgeActive: string;
  }[] = [
    {
      key: 'CRITICAL',
      label: 'Critical',
      icon: ShieldAlert,
      activeClasses: 'border-rose-400 dark:border-rose-500/50 bg-rose-100/80 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 ring-1 ring-rose-500/30',
      inactiveClasses: 'border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 line-through opacity-60',
      countBadgeActive: 'bg-rose-200/80 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/40',
    },
    {
      key: 'WARNING',
      label: 'Warning',
      icon: AlertTriangle,
      activeClasses: 'border-amber-400 dark:border-amber-500/50 bg-amber-100/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 ring-1 ring-amber-500/30',
      inactiveClasses: 'border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 line-through opacity-60',
      countBadgeActive: 'bg-amber-200/80 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40',
    },
    {
      key: 'INFO',
      label: 'Info',
      icon: Info,
      activeClasses: 'border-cyan-400 dark:border-cyan-500/50 bg-cyan-100/80 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 ring-1 ring-cyan-500/30',
      inactiveClasses: 'border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 line-through opacity-60',
      countBadgeActive: 'bg-cyan-200/80 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/40',
    },
  ];

  return (
    <div id="alert-history-feed" className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md p-5 shadow-lg dark:shadow-xl flex flex-col h-full transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <Bell className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Predictive &amp; Anomaly Event Log</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                {filteredAlerts.length}/{alerts.length}
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Live chronological stream of statistical threshold triggers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenThresholdSettings && (
            <button
              id="btn-open-threshold-settings"
              onClick={onOpenThresholdSettings}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-medium transition-colors"
              title="Configure custom CPU and Memory critical alert percentage thresholds"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span className="text-[11px]">Thresholds</span>
              {thresholds && thresholds.enabled && (
                <span className="hidden sm:inline-block text-[10px] font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950/60 px-1 rounded border border-cyan-300 dark:border-cyan-500/30">
                  {thresholds.cpuCriticalPercent}% / {thresholds.memoryCriticalPercent}%
                </span>
              )}
            </button>
          )}

          {alerts.length > 0 && (
            <button
              id="btn-clear-alerts"
              onClick={onClearAlerts}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              title="Clear all event logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Severity Filter Toggles Bar */}
      <div className="py-2.5 border-b border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
          <Filter className="w-3 h-3 text-slate-400 dark:text-slate-500" />
          <span className="text-[11px]">Filter Severity:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Quick All Toggle */}
          <button
            id="btn-filter-toggle-all"
            onClick={toggleAll}
            className={`px-2 py-1 rounded text-[10px] font-mono font-medium transition-colors border ${
              allActive
                ? 'bg-slate-900 text-white dark:bg-slate-800 dark:border-slate-700'
                : 'border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
            title={allActive ? 'Hide all severities' : 'Show all severities'}
          >
            {allActive ? 'Hide All' : 'Show All'}
          </button>

          {/* Individual Severity Toggles */}
          {severityConfigs.map(({ key, label, icon: Icon, activeClasses, inactiveClasses, countBadgeActive }) => {
            const isEnabled = activeSeverities[key];
            const count = severityCounts[key];

            return (
              <button
                key={key}
                id={`btn-filter-toggle-${key.toLowerCase()}`}
                onClick={() => toggleSeverity(key)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono font-medium transition-all border ${
                  isEnabled ? activeClasses : inactiveClasses
                }`}
                title={`Click to ${isEnabled ? 'hide' : 'show'} ${label} alerts (${count})`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span>{label}</span>
                <span
                  className={`px-1 py-0.2 rounded text-[9px] border ${
                    isEnabled
                      ? countBadgeActive
                      : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700/60'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="py-3 flex-1 overflow-y-auto space-y-2 max-h-72 pr-1">
        {filteredAlerts.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 font-mono space-y-1">
            <p>
              {alerts.length === 0
                ? 'No events logged yet.'
                : 'No alerts match the active severity filters.'}
            </p>
            {alerts.length > 0 && !allActive && (
              <button
                id="btn-reset-filters-empty-state"
                onClick={toggleAll}
                className="text-cyan-600 dark:text-cyan-400 underline hover:text-cyan-700 dark:hover:text-cyan-300 text-[11px]"
              >
                Toggle all severities visible
              </button>
            )}
          </div>
        ) : (
          filteredAlerts.map((al) => {
            const isCrit = al.severity === 'CRITICAL';
            const isWarn = al.severity === 'WARNING';

            return (
              <div
                key={al.id}
                className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 transition-all ${
                  isCrit
                    ? 'border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200'
                    : isWarn
                    ? 'border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {isCrit ? (
                    <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  ) : isWarn ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white tracking-tight truncate">
                      {al.message}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                      {formatTime(al.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <span>
                      Metric: <strong className="text-slate-800 dark:text-slate-300">{al.metric}</strong>
                    </span>
                    <span>
                      Trigger: <strong className="text-slate-800 dark:text-slate-300">{al.value}</strong>
                    </span>
                    <span className="ml-auto text-[9px] uppercase px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                      {al.severity}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
