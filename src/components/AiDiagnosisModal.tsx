import React, { useState } from 'react';
import { AiDiagnosisReport } from '../types.js';
import { X, Sparkles, Terminal, Copy, Check, AlertCircle, ShieldAlert, Cpu, HardDrive } from 'lucide-react';

interface AiDiagnosisModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: AiDiagnosisReport | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const AiDiagnosisModal: React.FC<AiDiagnosisModalProps> = ({
  isOpen,
  onClose,
  report,
  isLoading,
  onRefresh,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopyCommand = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const isCritical = report?.severity === 'CRITICAL';
  const isWarning = report?.severity === 'WARNING';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="ai-diagnosis-modal"
        className="relative w-full max-w-3xl rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/95 shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh] transition-colors"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Gemini AI Predictive Root Cause & Forensic Report
                </h3>
                <span
                  id="ai-diagnosis-engine-badge"
                  className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                    report?.engine?.includes('Deterministic')
                      ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/30'
                      : 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-500/30'
                  }`}
                >
                  {report?.engine || 'Gemini 3.1 Flash'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Multi-metric window regression & system kernel failure diagnosis
              </p>
            </div>
          </div>
          <button
            id="btn-close-ai-diagnosis"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="py-4 overflow-y-auto space-y-5 pr-1 text-slate-700 dark:text-slate-200 text-sm">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Generating forensic root cause analysis via Gemini...
              </p>
              <p className="text-xs text-slate-500 font-mono">
                Correlating CPU, memory heap trajectories, disk velocities, and Z-scores
              </p>
            </div>
          ) : report ? (
            <>
              {/* Title & Severity Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  isCritical
                    ? 'border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300'
                    : isWarning
                    ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300'
                    : 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/70 dark:bg-black/40 border border-current">
                      {report.severity}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {report.title}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {report.executiveSummary}
                  </p>
                </div>
              </div>

              {/* Metrics Snapshot when diagnosed */}
              {report.metricsContext && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">CPU:</span>
                    <span className="text-cyan-700 dark:text-cyan-300 font-bold">{report.metricsContext.cpu}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Memory:</span>
                    <span className="text-blue-700 dark:text-blue-300 font-bold">{report.metricsContext.memory}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Disk:</span>
                    <span className="text-pink-700 dark:text-pink-300 font-bold">{report.metricsContext.disk}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Network:</span>
                    <span className="text-emerald-700 dark:text-emerald-300 font-bold">{report.metricsContext.network}</span>
                  </div>
                </div>
              )}

              {/* Two Column details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Root Cause */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                    Root Cause Diagnosis
                  </h5>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {report.rootCauseAnalysis}
                  </p>
                </div>

                {/* Blast Radius & Time */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    Blast Radius & Failure Timeline
                  </h5>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {report.predictedImpact}
                  </p>
                  <div className="mt-2 text-xs font-mono text-rose-600 dark:text-rose-300 font-semibold">
                    Estimated Time to Failure: {report.timeToIncident}
                  </div>
                </div>
              </div>

              {/* Remediation Commands */}
              {report.remediationCommands && report.remediationCommands.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 mb-2.5 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5" />
                    Recommended Remediation Shell Commands
                  </h5>
                  <div className="space-y-2">
                    {report.remediationCommands.map((cmd, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-emerald-700 dark:text-emerald-300 shadow-sm"
                      >
                        <code className="overflow-x-auto whitespace-nowrap scrollbar-none">
                          $ {cmd}
                        </code>
                        <button
                          id={`btn-copy-cmd-${idx}`}
                          onClick={() => handleCopyCommand(cmd, idx)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors shrink-0"
                          title="Copy command"
                        >
                          {copiedIndex === idx ? (
                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preventative Measures */}
              {report.preventativeMeasures && report.preventativeMeasures.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                    Preventative Architectural Measures
                  </h5>
                  <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc list-inside">
                    {report.preventativeMeasures.map((measure, idx) => (
                      <li key={idx}>{measure}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
              No report available yet. Click &quot;Run Diagnosis&quot; to inspect current telemetry.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-500">
            Powered by Gemini 3.8 Flash • Server-side Diagnostics
          </span>
          <div className="flex items-center gap-2">
            <button
              id="btn-refresh-diagnosis"
              onClick={onRefresh}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors"
            >
              Re-analyze
            </button>
            <button
              id="btn-close-diagnosis-modal"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
