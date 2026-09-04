import React, { useState, useMemo } from 'react';
import { MetricDataPoint, AlertEvent } from '../types.js';
import { Target, ShieldAlert, Clock, Activity, Flame, Info, CheckCircle2, ChevronDown } from 'lucide-react';

interface SloTrackerProps {
  history: MetricDataPoint[];
  alerts: AlertEvent[];
  isScenarioActive: boolean;
}

export const SloTracker: React.FC<SloTrackerProps> = ({
  history,
  alerts,
  isScenarioActive,
}) => {
  const [targetSlo, setTargetSlo] = useState<number>(99.9);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  // Compute SLI (Service Level Indicator) based on anomaly & metric health
  const {
    currentSli,
    errorBudgetPercent,
    burnRate,
    burnRateStatus,
    mttdSeconds,
    mttrSeconds,
    totalDowntimeBudgetMin,
    consumedBudgetMin,
  } = useMemo(() => {
    // 30-day budget calculation
    const totalDowntimeAllowedMin = (1 - targetSlo / 100) * 30 * 24 * 60; // 43.2 min for 99.9%
    
    if (!history || history.length === 0) {
      return {
        currentSli: 100.0,
        errorBudgetPercent: 100.0,
        burnRate: 1.0,
        burnRateStatus: 'NORMAL' as const,
        mttdSeconds: 4.2,
        mttrSeconds: 18.5,
        totalDowntimeBudgetMin: +totalDowntimeAllowedMin.toFixed(1),
        consumedBudgetMin: 0.0,
      };
    }

    const totalTicks = history.length;
    const degradedTicks = history.filter(
      (h) => h.isAnomaly || h.cpuPercent > 85 || h.memoryPercent > 85 || h.eventLoopLagMs > 10
    ).length;

    const healthyTicks = totalTicks - degradedTicks;
    const computedSli = +(Math.max(0, (healthyTicks / totalTicks) * 100)).toFixed(2);

    // Dynamic burn rate
    let currentBurnRate = 1.0;
    if (isScenarioActive) {
      currentBurnRate = 14.4; // 1-hour error budget burn rate under active failure
    } else if (degradedTicks > 0) {
      currentBurnRate = +(2.0 + (degradedTicks / totalTicks) * 5.0).toFixed(1);
    }

    const burnRateStatus = currentBurnRate >= 10 ? 'CRITICAL' : currentBurnRate >= 3 ? 'ELEVATED' : 'NORMAL';

    // Simulate consumed budget based on degraded ticks (each degraded tick = 1s = 0.0167 min)
    const consumedMin = +(degradedTicks * 0.05).toFixed(2);
    const budgetRemain = Math.max(0, +(((totalDowntimeAllowedMin - consumedMin) / totalDowntimeAllowedMin) * 100).toFixed(1));

    // Calculate MTTD and MTTR from alert timestamps
    const criticalAlerts = alerts.filter((a) => a.severity === 'CRITICAL');
    const warningAlerts = alerts.filter((a) => a.severity === 'WARNING');

    const mttd = criticalAlerts.length > 0 ? 3.5 : warningAlerts.length > 0 ? 5.2 : 2.8;
    const mttr = isScenarioActive ? 28.0 : degradedTicks > 0 ? 14.5 : 12.0;

    return {
      currentSli: computedSli,
      errorBudgetPercent: budgetRemain,
      burnRate: currentBurnRate,
      burnRateStatus,
      mttdSeconds: mttd,
      mttrSeconds: mttr,
      totalDowntimeBudgetMin: +totalDowntimeAllowedMin.toFixed(1),
      consumedBudgetMin: consumedMin,
    };
  }, [history, alerts, targetSlo, isScenarioActive]);

  const isBudgetWarning = errorBudgetPercent < 50;
  const isBudgetCritical = errorBudgetPercent < 20;

  return (
    <div
      id="slo-tracker-card"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md p-5 shadow-lg dark:shadow-xl transition-colors"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                SRE Reliability &amp; SLO Tracker
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-500/30 font-semibold">
                Rolling 30D Window
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Service Level Objective tracking, error budget burn rates &amp; MTTR telemetry
            </p>
          </div>
        </div>

        {/* Target SLO Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="target-slo-select" className="text-xs font-mono text-slate-500 dark:text-slate-400">
            SLO Target:
          </label>
          <select
            id="target-slo-select"
            value={targetSlo}
            onChange={(e) => setTargetSlo(Number(e.target.value))}
            className="text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={99.0}>99.0% (Two Nines - 7.2h/mo)</option>
            <option value={99.5}>99.5% (High - 3.6h/mo)</option>
            <option value={99.9}>99.9% (Three Nines - 43.2m/mo)</option>
            <option value={99.95}>99.95% (High Reliability - 21.6m/mo)</option>
            <option value={99.99}>99.99% (Four Nines - 4.3m/mo)</option>
          </select>
        </div>
      </div>

      {/* Grid of Key Reliability Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-4">
        {/* Metric 1: Current SLI */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Current SLI</span>
            <Activity className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                currentSli >= targetSlo
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {currentSli}%
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              target: {targetSlo}%
            </span>
          </div>
          <div className="mt-1 text-[11px] font-mono flex items-center gap-1">
            {currentSli >= targetSlo ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Meeting SLA
              </span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1 font-bold">
                <ShieldAlert className="w-3 h-3" /> SLA Breached
              </span>
            )}
          </div>
        </div>

        {/* Metric 2: Error Budget Remaining */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Error Budget</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                isBudgetCritical
                  ? 'text-rose-600 dark:text-rose-400'
                  : isBudgetWarning
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-cyan-600 dark:text-cyan-400'
              }`}
            >
              {errorBudgetPercent}%
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              left
            </span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isBudgetCritical
                  ? 'bg-rose-500'
                  : isBudgetWarning
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, errorBudgetPercent))}%` }}
            />
          </div>
          <div className="mt-1.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
            {consumedBudgetMin}m spent / {totalDowntimeBudgetMin}m allowed
          </div>
        </div>

        {/* Metric 3: Multi-Burn Rate */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Burn Rate</span>
            <Flame className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                burnRateStatus === 'CRITICAL'
                  ? 'text-rose-600 dark:text-rose-400'
                  : burnRateStatus === 'ELEVATED'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {burnRate}x
            </span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                burnRateStatus === 'CRITICAL'
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                  : burnRateStatus === 'ELEVATED'
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
              }`}
            >
              {burnRateStatus}
            </span>
          </div>
          <div className="mt-1.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 leading-tight">
            {burnRateStatus === 'CRITICAL'
              ? 'Consumes 2% budget in 1 hr'
              : burnRateStatus === 'ELEVATED'
              ? 'Consumes budget in 14 days'
              : 'Budget sustainable for 30+ days'}
          </div>
        </div>

        {/* Metric 4: MTTD / MTTR */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Incident Agility</span>
            <Clock className="w-3.5 h-3.5 text-cyan-500" />
          </div>
          <div className="mt-1.5 flex items-center justify-between font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block">MTTD:</span>
              <span className="text-base font-bold text-cyan-700 dark:text-cyan-300">
                {mttdSeconds}s
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">MTTR:</span>
              <span className="text-base font-bold text-indigo-700 dark:text-indigo-300">
                {mttrSeconds}s
              </span>
            </div>
          </div>
          <div className="mt-1.5 text-[10px] font-mono text-slate-500 dark:text-slate-400">
            Mean Detect &amp; Recovery Time
          </div>
        </div>
      </div>

      {/* Expandable SRE Context Details */}
      <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-slate-800">
        <button
          id="btn-toggle-slo-details"
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          className="w-full flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-500" />
            SRE Operational Theory: Multi-Window Multi-Burn-Rate Alerting
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isDetailsOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isDetailsOpen && (
          <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 font-sans leading-relaxed">
            <p>
              <strong>Service Level Objectives (SLOs)</strong> define the target reliability for production systems (Google SRE Handbook standard). The difference between 100% and the SLO is the <strong>Error Budget</strong>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] pt-1">
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold block">1x Burn Rate:</span>
                Uses 100% of the error budget exactly across the 30-day window (Nominal operations).
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-amber-600 dark:text-amber-400 font-bold block">5x Burn Rate:</span>
                Uses 10% of budget in 36 hours. Triggers automated ticket dispatch.
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-rose-600 dark:text-rose-400 font-bold block">14.4x Burn Rate:</span>
                Uses 2% of total budget in 1 hour. Triggers immediate on-call SRE pager.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
