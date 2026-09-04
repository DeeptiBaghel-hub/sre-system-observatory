import React, { useState, useMemo } from 'react';
import { MetricDataPoint } from '../types.js';
import { CsvExportOptions } from '../utils/csvExport.js';
import {
  X,
  Download,
  Calendar,
  Clock,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface CsvExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: MetricDataPoint[];
  onExport: (options: CsvExportOptions) => void;
}

type RangePreset = 'all' | '30s' | '1m' | '2m' | '5m' | 'custom';

export const CsvExportModal: React.FC<CsvExportModalProps> = ({
  isOpen,
  onClose,
  history,
  onExport,
}) => {
  const [rangePreset, setRangePreset] = useState<RangePreset>('all');
  const [customStartIndex, setCustomStartIndex] = useState<number>(0);
  const [customEndIndex, setCustomEndIndex] = useState<number>(Math.max(0, history.length - 1));
  const [onlyAnomalies, setOnlyAnomalies] = useState<boolean>(false);
  const [filenamePrefix, setFilenamePrefix] = useState<string>('system-telemetry-history');

  // Reset custom bounds when opening or history changes
  React.useEffect(() => {
    if (isOpen && history.length > 0) {
      setCustomEndIndex(history.length - 1);
      setCustomStartIndex(Math.max(0, history.length - 60));
    }
  }, [isOpen, history.length]);

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => a.timestamp - b.timestamp);
  }, [history]);

  const newestTime = sortedHistory.length > 0 ? sortedHistory[sortedHistory.length - 1].timestamp : Date.now();
  const oldestTime = sortedHistory.length > 0 ? sortedHistory[0].timestamp : Date.now();

  // Determine active time bounds based on chosen preset
  const { startTime, endTime } = useMemo(() => {
    if (sortedHistory.length === 0) {
      return { startTime: Date.now(), endTime: Date.now() };
    }

    if (rangePreset === 'all') {
      return { startTime: oldestTime, endTime: newestTime };
    }

    if (rangePreset === '30s') {
      return { startTime: Math.max(oldestTime, newestTime - 30 * 1000), endTime: newestTime };
    }

    if (rangePreset === '1m') {
      return { startTime: Math.max(oldestTime, newestTime - 60 * 1000), endTime: newestTime };
    }

    if (rangePreset === '2m') {
      return { startTime: Math.max(oldestTime, newestTime - 120 * 1000), endTime: newestTime };
    }

    if (rangePreset === '5m') {
      return { startTime: Math.max(oldestTime, newestTime - 300 * 1000), endTime: newestTime };
    }

    // Custom
    const clampedStart = Math.min(Math.max(0, customStartIndex), sortedHistory.length - 1);
    const clampedEnd = Math.max(clampedStart, Math.min(customEndIndex, sortedHistory.length - 1));
    return {
      startTime: sortedHistory[clampedStart]?.timestamp || oldestTime,
      endTime: sortedHistory[clampedEnd]?.timestamp || newestTime,
    };
  }, [rangePreset, customStartIndex, customEndIndex, sortedHistory, oldestTime, newestTime]);

  // Compute matching data points
  const filteredData = useMemo(() => {
    return sortedHistory.filter((pt) => {
      const withinTime = pt.timestamp >= startTime && pt.timestamp <= endTime;
      if (!withinTime) return false;
      if (onlyAnomalies && !pt.isAnomaly) return false;
      return true;
    });
  }, [sortedHistory, startTime, endTime, onlyAnomalies]);

  // Compute summary stats for the selected slice
  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        count: 0,
        anomalyCount: 0,
        avgCpu: 0,
        avgMem: 0,
        durationSec: 0,
      };
    }

    const anomalyCount = filteredData.filter((p) => p.isAnomaly).length;
    const avgCpu = Math.round((filteredData.reduce((acc, p) => acc + p.cpuPercent, 0) / filteredData.length) * 10) / 10;
    const avgMem = Math.round((filteredData.reduce((acc, p) => acc + p.memoryPercent, 0) / filteredData.length) * 10) / 10;
    const durationSec = Math.max(0, Math.round((endTime - startTime) / 1000));

    return {
      count: filteredData.length,
      anomalyCount,
      avgCpu,
      avgMem,
      durationSec,
    };
  }, [filteredData, startTime, endTime]);

  if (!isOpen) return null;

  const handleDownload = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredData.length === 0) return;

    onExport({
      startTime,
      endTime,
      onlyAnomalies,
      filenamePrefix: filenamePrefix.trim() || 'system-telemetry-history',
    });
    onClose();
  };

  const formatClock = (ms: number) => {
    return new Date(ms).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const presets: { id: RangePreset; label: string; desc: string }[] = [
    { id: 'all', label: 'All History', desc: `Full buffer (${history.length} pts)` },
    { id: '30s', label: 'Last 30s', desc: 'Recent 30 sec' },
    { id: '1m', label: 'Last 1 min', desc: 'Recent 60 sec' },
    { id: '2m', label: 'Last 2 min', desc: 'Recent 120 sec' },
    { id: '5m', label: 'Last 5 min', desc: 'Recent 300 sec' },
    { id: 'custom', label: 'Custom Range', desc: 'Slice by points' },
  ];

  return (
    <div
      id="csv-export-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="csv-export-modal"
        className="relative w-full max-w-xl rounded-2xl border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-2xl p-6 overflow-hidden flex flex-col gap-5 text-slate-800 dark:text-slate-200 transition-colors"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Export Telemetry Dataset</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold">
                  CSV / RFC-4180
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select a time window or slice specific historical intervals for offline forensic analysis
              </p>
            </div>
          </div>

          <button
            id="btn-close-csv-export-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleDownload} className="space-y-4">
          {/* Time Range Preset Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
              <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Time Range Window</span>
            </label>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {presets.map((p) => {
                const isSelected = rangePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    id={`btn-csv-range-${p.id}`}
                    onClick={() => setRangePreset(p.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all border ${
                      isSelected
                        ? 'bg-cyan-50 dark:bg-cyan-950/80 border-cyan-400 dark:border-cyan-500/60 text-cyan-800 dark:text-cyan-300 font-bold shadow-md shadow-cyan-950/20 ring-1 ring-cyan-500/40'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-xs">{p.label}</span>
                    <span className="text-[9px] font-mono opacity-70 truncate max-w-full">
                      {p.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Range Sliders (Shown when 'custom' is selected) */}
          {rangePreset === 'custom' && sortedHistory.length > 1 && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-mono">Custom History Slice:</span>
                <span className="font-mono text-cyan-700 dark:text-cyan-300 font-bold">
                  Points #{customStartIndex + 1} to #{customEndIndex + 1} ({customEndIndex - customStartIndex + 1} pts)
                </span>
              </div>

              {/* Start Point Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <span>Start: {formatClock(sortedHistory[customStartIndex]?.timestamp || oldestTime)}</span>
                  <span>Point {customStartIndex + 1}</span>
                </div>
                <input
                  id="input-csv-custom-start"
                  type="range"
                  min="0"
                  max={Math.max(0, sortedHistory.length - 1)}
                  value={customStartIndex}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setCustomStartIndex(Math.min(val, customEndIndex));
                  }}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              {/* End Point Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <span>End: {formatClock(sortedHistory[customEndIndex]?.timestamp || newestTime)}</span>
                  <span>Point {customEndIndex + 1}</span>
                </div>
                <input
                  id="input-csv-custom-end"
                  type="range"
                  min="0"
                  max={Math.max(0, sortedHistory.length - 1)}
                  value={customEndIndex}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setCustomEndIndex(Math.max(val, customStartIndex));
                  }}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Active Selection Summary Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Selected Time Range Summary</span>
              </span>
              <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 rounded text-[11px]">
                {stats.count} / {history.length} records
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200 dark:border-slate-700/40 text-[11px] font-mono">
              <div className="p-2 rounded bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
                <div className="text-slate-500 text-[10px]">Start Time</div>
                <div className="text-slate-800 dark:text-slate-200 truncate">{formatClock(startTime)}</div>
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
                <div className="text-slate-500 text-[10px]">End Time</div>
                <div className="text-slate-800 dark:text-slate-200 truncate">{formatClock(endTime)}</div>
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
                <div className="text-slate-500 text-[10px]">Time Span</div>
                <div className="text-cyan-700 dark:text-cyan-300">~{stats.durationSec}s</div>
              </div>
              <div className="p-2 rounded bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
                <div className="text-slate-500 text-[10px]">Anomalies</div>
                <div className={stats.anomalyCount > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-500 dark:text-slate-400'}>
                  {stats.anomalyCount} flagged
                </div>
              </div>
            </div>
          </div>

          {/* Additional Filter & Filename Options */}
          <div className="space-y-3 pt-1">
            {/* Filter Anomalies Only */}
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <Filter className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Export only anomaly data points</span>
              </div>
              <input
                id="checkbox-csv-anomalies-only"
                type="checkbox"
                checked={onlyAnomalies}
                onChange={(e) => setOnlyAnomalies(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-cyan-500/20 bg-white dark:bg-slate-900 cursor-pointer"
              />
            </label>

            {/* Custom Filename Prefix */}
            <div className="flex items-center gap-2">
              <label htmlFor="input-csv-filename" className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Filename:
              </label>
              <div className="relative flex-1">
                <input
                  id="input-csv-filename"
                  type="text"
                  value={filenamePrefix}
                  onChange={(e) => setFilenamePrefix(e.target.value)}
                  placeholder="system-telemetry-history"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <span className="text-xs font-mono text-slate-500">-[date].csv</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              id="btn-cancel-csv-modal"
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              id="btn-submit-csv-export"
              type="submit"
              disabled={filteredData.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Export {filteredData.length} Records</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
