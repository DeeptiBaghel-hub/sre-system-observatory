import React from 'react';
import { FailurePrediction } from '../types.js';
import { AlertTriangle, Clock, ShieldAlert, Sparkles, TrendingUp, CheckCircle2, ChevronRight } from 'lucide-react';

interface AiPredictionBannerProps {
  predictions: FailurePrediction[];
  onOpenDiagnosis: () => void;
  onOpenStressLab: () => void;
  isLoadingDiagnosis?: boolean;
}

export const AiPredictionBanner: React.FC<AiPredictionBannerProps> = ({
  predictions,
  onOpenDiagnosis,
  onOpenStressLab,
  isLoadingDiagnosis,
}) => {
  const hasCritical = predictions.some((p) => p.severity === 'CRITICAL');
  const hasWarning = predictions.some((p) => p.severity === 'WARNING');

  if (predictions.length === 0) {
    return (
      <div
        id="prediction-banner-nominal"
        className="rounded-xl border border-emerald-300 dark:border-emerald-500/20 bg-emerald-50/80 dark:bg-emerald-950/10 backdrop-blur-md p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                AI Failure Prediction: Subsystems Nominal
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                Confidence 99%
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Linear regression, EWMA trend slopes, and Z-score anomaly models project no resource exhaustion (&gt; 72 hours).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            id="btn-trigger-stress-lab-nominal"
            onClick={onOpenStressLab}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Inject Failure Scenario
          </button>
          <button
            id="btn-run-diagnosis-nominal"
            onClick={onOpenDiagnosis}
            disabled={isLoadingDiagnosis}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-900/20 dark:shadow-cyan-900/30 transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isLoadingDiagnosis ? 'Diagnosing...' : 'Gemini AI Telemetry Audit'}
          </button>
        </div>
      </div>
    );
  }

  // Active predictions exist
  const primary = predictions[0];
  const isCritical = primary.severity === 'CRITICAL';

  // Format time to failure
  const formatTimeToFailure = (secs: number | null) => {
    if (!secs) return 'Imminent';
    if (secs < 60) return `${secs} seconds`;
    if (secs < 3600) {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}m ${s}s`;
    }
    const h = (secs / 3600).toFixed(1);
    return `${h} hours`;
  };

  return (
    <div
      id="prediction-banner-alert"
      className={`rounded-xl border p-4.5 backdrop-blur-md transition-all shadow-xl ${
        isCritical
          ? 'border-rose-400 dark:border-rose-500/60 bg-gradient-to-r from-rose-100/90 via-rose-50/70 to-white/90 dark:from-rose-950/40 dark:via-slate-900/90 dark:to-rose-950/20 shadow-rose-950/10 dark:shadow-rose-950/40'
          : 'border-amber-400 dark:border-amber-500/60 bg-gradient-to-r from-amber-100/90 via-amber-50/70 to-white/90 dark:from-amber-950/40 dark:via-slate-900/90 dark:to-amber-950/20 shadow-amber-950/10 dark:shadow-amber-950/40'
      }`}
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left side: Alert description */}
        <div className="flex items-start gap-3.5">
          <div
            className={`p-3 rounded-xl border mt-0.5 ${
              isCritical
                ? 'bg-rose-100 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 animate-pulse'
                : 'bg-amber-100 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-400'
            }`}
          >
            {isCritical ? (
              <ShieldAlert className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[11px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  isCritical
                    ? 'bg-rose-200/80 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-500/50'
                    : 'bg-amber-200/80 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/50'
                }`}
              >
                {primary.severity} FORECAST
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {primary.title}
              </h3>
              <span className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                Confidence: {primary.confidenceScore}%
              </span>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {primary.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-slate-900 dark:text-white bg-white/80 dark:bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800">
                <Clock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span className="text-slate-500 dark:text-slate-400">Predicted Failure In:</span>
                <span className="font-bold text-rose-700 dark:text-rose-300">
                  {formatTimeToFailure(primary.timeToFailureSeconds)}
                </span>
              </div>

              {primary.growthRateUnit && (
                <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-300 bg-white/80 dark:bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="text-slate-500 dark:text-slate-400">Velocity:</span>
                  <span className="font-bold text-amber-700 dark:text-amber-300">
                    {primary.growthRateUnit}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
          <button
            id="btn-open-stress-lab-alert"
            onClick={onOpenStressLab}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-white dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1.5"
          >
            Manage Scenarios
          </button>
          <button
            id="btn-run-diagnosis-alert"
            onClick={onOpenDiagnosis}
            disabled={isLoadingDiagnosis}
            className={`px-4 py-2 rounded-lg text-xs font-bold text-white shadow-lg transition-all flex items-center gap-2 ${
              isCritical
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/50'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/50'
            }`}
          >
            <Sparkles className="w-4 h-4 animate-spin-slow" />
            {isLoadingDiagnosis ? 'Analyzing Telemetry...' : 'Gemini AI Incident Forensics'}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
