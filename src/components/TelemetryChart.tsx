import React, { useState, useMemo, useRef, useCallback } from 'react';
import { MetricDataPoint, MetricForecastPoint } from '../types.js';
import { useTheme } from '../context/ThemeContext.js';
import {
  Activity,
  TrendingUp,
  Download,
  Clock,
  Cpu,
  MemoryStick as MemoryIcon,
  HardDrive,
  Wifi,
  Zap,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Keyboard,
  Pause,
  Play,
} from 'lucide-react';

interface TelemetryChartProps {
  history: MetricDataPoint[];
  forecast: MetricForecastPoint[];
  selectedMetric: 'cpu' | 'memory' | 'disk' | 'network' | 'latency';
  onSelectMetric: (metric: 'cpu' | 'memory' | 'disk' | 'network' | 'latency') => void;
  onExportCsv?: () => void;
  onOpenShortcuts?: () => void;
  isAutoRefresh?: boolean;
  onToggleAutoRefresh?: () => void;
  pausedTicksCount?: number;
}

interface HoverState {
  type: 'history' | 'forecast';
  x: number; // svg viewBox coordinate (0-800)
  y: number; // svg viewBox coordinate (0-240)
  pctX: number; // 0-100% of container width
  pctY: number; // 0-100% of container height
  point?: MetricDataPoint;
  forecastPoint?: MetricForecastPoint;
  val: number;
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  history,
  forecast,
  selectedMetric,
  onSelectMetric,
  onExportCsv,
  onOpenShortcuts,
  isAutoRefresh = true,
  onToggleAutoRefresh,
  pausedTicksCount = 0,
}) => {
  const [timeWindowSec, setTimeWindowSec] = useState<number>(120); // 120s = 2 min default
  const [hoverState, setHoverState] = useState<HoverState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter history to current window
  const windowedHistory = useMemo(() => {
    if (history.length === 0) return [];
    const latestTs = history[history.length - 1].timestamp;
    const cutoff = latestTs - timeWindowSec * 1000;
    return history.filter((p) => p.timestamp >= cutoff);
  }, [history, timeWindowSec]);

  // Extract metric specific values
  const { currentVal, unit, metricLabel, strokeColor, maxThreshold, isPercentage } = useMemo(() => {
    switch (selectedMetric) {
      case 'cpu':
        return {
          currentVal: (p: MetricDataPoint) => p.cpuPercent,
          forecastVal: (f: MetricForecastPoint) => f.predictedCpu,
          unit: '%',
          metricLabel: 'CPU Utilization',
          strokeColor: '#06b6d4', // cyan-500
          maxThreshold: 100,
          isPercentage: true,
        };
      case 'memory':
        return {
          currentVal: (p: MetricDataPoint) => p.memoryPercent,
          forecastVal: (f: MetricForecastPoint) => f.predictedMem,
          unit: '%',
          metricLabel: 'System Memory (RAM)',
          strokeColor: '#3b82f6', // blue-500
          maxThreshold: 100,
          isPercentage: true,
        };
      case 'disk':
        return {
          currentVal: (p: MetricDataPoint) => p.diskPercent,
          forecastVal: (f: MetricForecastPoint) => f.predictedDisk,
          unit: '%',
          metricLabel: 'Disk Filesystem Capacity',
          strokeColor: '#ec4899', // pink-500
          maxThreshold: 100,
          isPercentage: true,
        };
      case 'network':
        return {
          currentVal: (p: MetricDataPoint) => p.networkRxKbps,
          forecastVal: (f: MetricForecastPoint) => 0, // network forecast nominal
          unit: ' KB/s',
          metricLabel: 'Network Ingress Throughput',
          strokeColor: '#10b981', // emerald-500
          maxThreshold: 20000,
          isPercentage: false,
        };
      case 'latency':
        return {
          currentVal: (p: MetricDataPoint) => p.eventLoopLagMs,
          forecastVal: (f: MetricForecastPoint) => 0,
          unit: ' ms',
          metricLabel: 'Event Loop Latency Lag',
          strokeColor: '#f59e0b', // amber-500
          maxThreshold: 40,
          isPercentage: false,
        };
    }
  }, [selectedMetric]);

  // Calculate SVG bounds
  const chartHeight = 240;
  const chartWidth = 800; // viewBox coordinate space
  const padLeft = 45;
  const padRight = 65; // space for forecast
  const padTop = 20;
  const padBottom = 30;

  const innerWidth = chartWidth - padLeft - padRight;
  const innerHeight = chartHeight - padTop - padBottom;

  // Max value calculation
  const values = windowedHistory.map(currentVal);
  const dataMax = isPercentage ? 100 : Math.max(maxThreshold, ...(values.length ? values : [10]));
  const dataMin = 0;
  const valueRange = dataMax - dataMin || 1;

  // Build History Line & Area
  const { pathD, areaD, points, anomalyPoints } = useMemo(() => {
    if (windowedHistory.length === 0) {
      return { pathD: '', areaD: '', points: [], anomalyPoints: [] };
    }

    const totalPoints = windowedHistory.length;
    const historyWidth = innerWidth * 0.8; // 80% for history, 20% for future forecast projection

    const pts = windowedHistory.map((p, idx) => {
      const x = padLeft + (idx / Math.max(1, totalPoints - 1)) * historyWidth;
      const val = currentVal(p);
      const normalized = (val - dataMin) / valueRange;
      const y = padTop + innerHeight - normalized * innerHeight;
      return { x, y, point: p, val };
    });

    const d = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
    const firstX = pts[0].x;
    const lastX = pts[pts.length - 1].x;
    const baseY = padTop + innerHeight;
    const area = `${d} L ${lastX.toFixed(1)},${baseY} L ${firstX.toFixed(1)},${baseY} Z`;

    const anomalies = pts.filter((pt) => pt.point.isAnomaly || (selectedMetric === 'cpu' && pt.val > 90));

    return { pathD: d, areaD: area, points: pts, anomalyPoints: anomalies };
  }, [windowedHistory, currentVal, dataMin, valueRange, innerWidth, innerHeight, padLeft, padTop, selectedMetric]);

  // Build Forecast Projection Line & Confidence Envelope
  const { forecastPathD, forecastAreaD, forecastPoints } = useMemo(() => {
    if (points.length === 0 || forecast.length === 0) {
      return { forecastPathD: '', forecastAreaD: '', forecastPoints: [] };
    }

    const lastHist = points[points.length - 1];
    const forecastWidth = innerWidth * 0.2; // 20% future projection width
    const startX = lastHist.x;

    let getForecastVal = (f: MetricForecastPoint) => {
      if (selectedMetric === 'cpu') return f.predictedCpu;
      if (selectedMetric === 'disk') return f.predictedDisk;
      return f.predictedMem;
    };

    const fPts = forecast.map((f, i) => {
      const x = startX + ((i + 1) / forecast.length) * forecastWidth;
      const val = getForecastVal(f);
      const normalized = (val - dataMin) / valueRange;
      const y = padTop + innerHeight - normalized * innerHeight;

      // Bounds
      const upper = Math.min(dataMax, val + (i + 1) * 1.5);
      const lower = Math.max(0, val - (i + 1) * 1.5);
      const upperY = padTop + innerHeight - ((upper - dataMin) / valueRange) * innerHeight;
      const lowerY = padTop + innerHeight - ((lower - dataMin) / valueRange) * innerHeight;

      return { x, y, upperY, lowerY, val, timestamp: f.timestamp };
    });

    const allPts = [{ x: lastHist.x, y: lastHist.y, upperY: lastHist.y, lowerY: lastHist.y, val: lastHist.val }, ...fPts];
    const d = allPts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');

    // Area envelope
    const topPath = allPts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)},${pt.upperY.toFixed(1)}`).join(' ');
    const bottomPath = [...allPts].reverse().map((pt) => `L ${pt.x.toFixed(1)},${pt.lowerY.toFixed(1)}`).join(' ');
    const area = `${topPath} ${bottomPath} Z`;

    return { forecastPathD: d, forecastAreaD: area, forecastPoints: fPts };
  }, [points, forecast, selectedMetric, innerWidth, dataMin, valueRange, padTop, innerHeight, dataMax]);

  // Hover detection logic for exact point inspection
  const updateHover = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current || points.length === 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;

      if (relX < 0 || relX > rect.width || relY < 0 || relY > rect.height) {
        setHoverState(null);
        return;
      }

      // Convert mouse X to SVG viewBox space (0-800)
      const svgX = (relX / rect.width) * chartWidth;
      const lastHist = points[points.length - 1];

      // Check if mouse is hovering over historical telemetry points or forecast projection
      if (svgX <= lastHist.x + 6 || forecastPoints.length === 0) {
        let closest = points[0];
        let minDistance = Math.abs(points[0].x - svgX);
        for (let i = 1; i < points.length; i++) {
          const dist = Math.abs(points[i].x - svgX);
          if (dist < minDistance) {
            minDistance = dist;
            closest = points[i];
          }
        }

        const pctX = (closest.x / chartWidth) * 100;
        const pctY = (closest.y / chartHeight) * 100;

        setHoverState({
          type: 'history',
          x: closest.x,
          y: closest.y,
          pctX,
          pctY,
          point: closest.point,
          val: closest.val,
        });
      } else {
        let closest = forecastPoints[0];
        let minDistance = Math.abs(forecastPoints[0].x - svgX);
        for (let i = 1; i < forecastPoints.length; i++) {
          const dist = Math.abs(forecastPoints[i].x - svgX);
          if (dist < minDistance) {
            minDistance = dist;
            closest = forecastPoints[i];
          }
        }

        const pctX = (closest.x / chartWidth) * 100;
        const pctY = (closest.y / chartHeight) * 100;
        const fObj = forecast.find((f) => f.timestamp === closest.timestamp) || forecast[0];

        setHoverState({
          type: 'forecast',
          x: closest.x,
          y: closest.y,
          pctX,
          pctY,
          forecastPoint: fObj,
          val: closest.val,
        });
      }
    },
    [points, forecastPoints, forecast, chartWidth, chartHeight]
  );

  const formatExactTime = (ts: number) => {
    const d = new Date(ts);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    const timeString = `${hours}:${minutes}:${seconds}.${ms}`;
    const dateString = d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const diffSec = Math.round((Date.now() - ts) / 1000);
    const relativeStr = diffSec <= 0 ? 'Just now' : `${diffSec}s ago`;
    return { timeString, dateString, relativeStr };
  };

  const { theme } = useTheme();
  const gridStroke = theme === 'light' ? '#e2e8f0' : '#1e293b';

  return (
    <div id="telemetry-chart-container" className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md p-5 shadow-lg dark:shadow-xl transition-colors">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>{metricLabel}</span>
              <span className="text-xs font-mono font-normal text-slate-500 dark:text-slate-400">
                (Real-time + AI Forecast)
              </span>
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: strokeColor }} />
                Historical Stream
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-cyan-400" />
                AI Model Forecast (+40s)
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Anomaly Trigger
              </span>
              <span className="hidden lg:inline-flex items-center gap-1 text-[11px] font-mono text-cyan-400/80 bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded-md ml-2">
                Hover chart for exact point inspection
              </span>
              {onOpenShortcuts && (
                <button
                  id="btn-chart-shortcuts-legend"
                  onClick={onOpenShortcuts}
                  title="View keyboard shortcut controls (Press '?')"
                  className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/60 px-2 py-0.5 rounded-md transition-colors ml-1"
                >
                  <Keyboard className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
                  <span>Keys: [C] [M] [D] [N] [L]</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Metric Selector Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'cpu', label: 'CPU', keyHint: 'C' },
            { key: 'memory', label: 'Memory', keyHint: 'M' },
            { key: 'disk', label: 'Disk', keyHint: 'D' },
            { key: 'network', label: 'Network', keyHint: 'N' },
            { key: 'latency', label: 'Lag', keyHint: 'L' },
          ].map((m) => (
            <button
              key={m.key}
              id={`tab-metric-${m.key}`}
              onClick={() => onSelectMetric(m.key as any)}
              title={`Switch to ${m.label} (Shortcut: '${m.keyHint}')`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-all ${
                selectedMetric === m.key
                  ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 shadow-sm ring-1 ring-cyan-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <span>{m.label}</span>
              <kbd
                className={`px-1 py-0.2 rounded text-[9px] font-bold border transition-colors ${
                  selectedMetric === m.key
                    ? 'bg-cyan-100 dark:bg-cyan-900/80 border-cyan-300 dark:border-cyan-500/50 text-cyan-800 dark:text-cyan-200 shadow-inner'
                    : 'bg-slate-100 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {m.keyHint}
              </kbd>
            </button>
          ))}

          {/* Time Window Buttons */}
          <div className="hidden md:flex items-center pl-2 ml-2 border-l border-slate-200 dark:border-slate-800 gap-1 text-[11px] font-mono">
            {[60, 120, 300].map((sec) => (
              <button
                key={sec}
                id={`btn-time-window-${sec}`}
                onClick={() => setTimeWindowSec(sec)}
                className={`px-2 py-1 rounded transition-colors ${
                  timeWindowSec === sec
                    ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-white font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                {sec < 60 ? `${sec}s` : `${sec / 60}m`}
              </button>
            ))}
          </div>

          {/* Auto-Refresh Toggle Button in Chart Toolbar */}
          {onToggleAutoRefresh && (
            <button
              id="btn-chart-auto-refresh"
              onClick={onToggleAutoRefresh}
              title={
                isAutoRefresh
                  ? "Pause auto-refresh to freeze snapshot (Shortcut: 'P')"
                  : "Resume live telemetry updates (Shortcut: 'P')"
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all ${
                isAutoRefresh
                  ? 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  : 'border-amber-500/60 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold ring-1 ring-amber-500/40 shadow-sm shadow-amber-950/50'
              }`}
            >
              {isAutoRefresh ? (
                <>
                  <Pause className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
                  <span className="hidden sm:inline">Auto-Refresh:</span>
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">LIVE</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-amber-500 dark:text-amber-400 fill-amber-400/20" />
                  <span className="hidden sm:inline">Auto-Refresh:</span>
                  <span className="text-amber-600 dark:text-amber-300 font-bold">PAUSED</span>
                </>
              )}
              <kbd className="px-1 py-0.2 text-[9px] rounded bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                P
              </kbd>
            </button>
          )}

          {/* Optional Direct Export CSV from Chart Toolbar */}
          {onExportCsv && (
            <button
              id="btn-chart-export-csv"
              onClick={onExportCsv}
              disabled={history.length === 0}
              className="hidden sm:flex items-center gap-1.5 ml-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono transition-colors disabled:opacity-50"
              title="Download telemetry time-series dataset as CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span>CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Paused Snapshot Notice Banner */}
      {!isAutoRefresh && (
        <div
          id="chart-paused-snapshot-banner"
          className="mt-3 flex items-center justify-between px-3.5 py-2 rounded-lg bg-amber-950/40 border border-amber-500/40 text-xs font-mono text-amber-300 shadow-inner animate-fade-in"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="font-semibold text-amber-200">
              Auto-Refresh Paused:
            </span>
            <span className="text-amber-300/90 hidden sm:inline">
              Streaming is frozen for historical snapshot inspection. Chart timeline will not jump.
            </span>
            {pausedTicksCount !== undefined && pausedTicksCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-amber-900/80 text-amber-100 text-[10px] border border-amber-600/40">
                +{pausedTicksCount} live ticks buffered
              </span>
            )}
          </div>
          {onToggleAutoRefresh && (
            <button
              id="btn-banner-resume-live"
              onClick={onToggleAutoRefresh}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 hover:text-white border border-amber-500/40 text-xs font-semibold transition-colors"
            >
              <Play className="w-3 h-3 fill-amber-300" />
              <span>Resume Live</span>
              <kbd className="px-1 text-[9px] rounded bg-amber-950/80 border border-amber-600/60 text-amber-300">
                P
              </kbd>
            </button>
          )}
        </div>
      )}

      {/* SVG Canvas Area */}
      <div
        ref={containerRef}
        onMouseMove={(e) => updateHover(e.clientX, e.clientY)}
        onMouseLeave={() => setHoverState(null)}
        onTouchMove={(e) => {
          if (e.touches.length > 0) {
            updateHover(e.touches[0].clientX, e.touches[0].clientY);
          }
        }}
        onTouchEnd={() => setHoverState(null)}
        className="relative mt-4 w-full h-64 sm:h-72 select-none cursor-crosshair group"
      >
        <svg
          className="w-full h-full overflow-visible"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`grad-${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="forecast-envelope" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = padTop + innerHeight - pct * innerHeight;
            const labelVal = isPercentage ? Math.round(pct * 100) : Math.round(pct * dataMax);
            return (
              <g key={pct}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={chartWidth - 10}
                  y2={y}
                  stroke={gridStroke}
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-slate-400 dark:fill-slate-500"
                >
                  {labelVal}
                  {unit}
                </text>
              </g>
            );
          })}

          {/* 85% Warning threshold line if percentage */}
          {isPercentage && (
            <line
              x1={padLeft}
              y1={padTop + innerHeight - 0.85 * innerHeight}
              x2={chartWidth - 10}
              y2={padTop + innerHeight - 0.85 * innerHeight}
              stroke="#f43f5e"
              strokeDasharray="6 4"
              strokeWidth="1.2"
              strokeOpacity="0.4"
            />
          )}

          {/* Forecast separation vertical line */}
          {points.length > 0 && (
            <line
              x1={points[points.length - 1].x}
              y1={padTop}
              x2={points[points.length - 1].x}
              y2={padTop + innerHeight}
              stroke="#38bdf8"
              strokeDasharray="2 2"
              strokeWidth="1"
              strokeOpacity="0.5"
            />
          )}

          {/* Forecast Area Envelope */}
          {forecastAreaD && (
            <path d={forecastAreaD} fill="url(#forecast-envelope)" />
          )}

          {/* Historical Area Fill */}
          {areaD && (
            <path d={areaD} fill={`url(#grad-${selectedMetric})`} />
          )}

          {/* Historical Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Forecast Trajectory Line (Dotted) */}
          {forecastPathD && (
            <path
              d={forecastPathD}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.2"
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
          )}

          {/* Anomaly Highlight Circles */}
          {anomalyPoints.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="7"
                fill="#f43f5e"
                fillOpacity="0.3"
                className="animate-ping"
              />
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4.5"
                fill="#f43f5e"
                stroke="#0f172a"
                strokeWidth="1.5"
              />
            </g>
          ))}

          {/* Current Latest Point Pulse Marker */}
          {points.length > 0 && (
            <g>
              <circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r="5"
                fill={strokeColor}
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Interactive Hover Crosshairs & Focal Tracker */}
          {hoverState && (
            <g className="pointer-events-none transition-all duration-75">
              {/* Vertical Crosshair Guideline */}
              <line
                x1={hoverState.x}
                y1={padTop}
                x2={hoverState.x}
                y2={padTop + innerHeight}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                strokeWidth="1.2"
                strokeOpacity="0.8"
              />
              {/* Horizontal Reference Line */}
              <line
                x1={padLeft}
                y1={hoverState.y}
                x2={hoverState.x}
                y2={hoverState.y}
                stroke="#64748b"
                strokeDasharray="2 2"
                strokeWidth="0.8"
                strokeOpacity="0.5"
              />
              {/* Outer Radar Halo */}
              <circle
                cx={hoverState.x}
                cy={hoverState.y}
                r="9"
                fill={hoverState.point?.isAnomaly ? '#f43f5e' : strokeColor}
                fillOpacity="0.25"
              />
              {/* Core Point Dot */}
              <circle
                cx={hoverState.x}
                cy={hoverState.y}
                r="5"
                fill={hoverState.point?.isAnomaly ? '#f43f5e' : strokeColor}
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Floating Detailed Point Tooltip */}
        {hoverState && (
          <div
            id="telemetry-chart-tooltip"
            className="pointer-events-none absolute z-40 transition-transform duration-75 ease-out"
            style={{
              left: `${Math.max(3, Math.min(97, hoverState.pctX))}%`,
              top: '8px',
              transform: hoverState.pctX > 50 ? 'translateX(calc(-100% - 14px))' : 'translateX(14px)',
            }}
          >
            <div className="w-80 max-w-[88vw] rounded-xl border border-slate-200 dark:border-slate-700/90 bg-white/95 dark:bg-slate-950/95 p-3.5 shadow-2xl backdrop-blur-md text-xs font-mono text-slate-800 dark:text-slate-200 ring-1 ring-slate-900/10 dark:ring-white/10">
              {/* Header: Exact Timestamp + Relative Offset + State Badge */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span className="font-bold text-slate-900 dark:text-white tracking-tight">
                    {hoverState.type === 'history' && hoverState.point
                      ? formatExactTime(hoverState.point.timestamp).timeString
                      : formatExactTime(hoverState.forecastPoint?.timestamp || Date.now()).timeString.slice(0, 8)}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {hoverState.type === 'history' && hoverState.point
                      ? formatExactTime(hoverState.point.timestamp).relativeStr
                      : `+${Math.max(0, Math.round(((hoverState.forecastPoint?.timestamp || 0) - Date.now()) / 1000))}s horizon`}
                  </span>
                </div>

                {hoverState.type === 'history' && hoverState.point ? (
                  hoverState.point.isAnomaly ? (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-500/50 text-rose-700 dark:text-rose-300 animate-pulse">
                      <ShieldAlert className="w-3 h-3" />
                      Anomaly
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium uppercase bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      Nominal
                    </span>
                  )
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-300">
                    Forecast
                  </span>
                )}
              </div>

              {/* Exact Date */}
              {hoverState.type === 'history' && hoverState.point && (
                <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mb-2">
                  <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                  <span>{formatExactTime(hoverState.point.timestamp).dateString}</span>
                </div>
              )}

              {/* Active Selected Metric Callout Banner */}
              <div
                className="p-2 rounded-lg mb-2.5 flex items-center justify-between border"
                style={{
                  backgroundColor: `${strokeColor}18`,
                  borderColor: `${strokeColor}40`,
                }}
              >
                <span className="text-[11px] font-semibold text-slate-900 dark:text-white">{metricLabel}</span>
                <span className="text-sm font-bold tracking-tight font-mono" style={{ color: strokeColor }}>
                  {hoverState.val.toFixed(1)}{unit}
                </span>
              </div>

              {/* Complete Metric Values Breakdown */}
              {hoverState.type === 'history' && hoverState.point && (
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider flex items-center justify-between">
                    <span>Point Telemetry Metrics</span>
                    {hoverState.point.isAnomaly && (
                      <span className="text-rose-600 dark:text-rose-400 font-bold">Z-Score Alert</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 bg-slate-50 dark:bg-slate-900/80 p-2 rounded-lg border border-slate-200 dark:border-slate-800/80 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-cyan-600 dark:text-cyan-400" /> CPU
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {hoverState.point.cpuPercent}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <MemoryIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Memory
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {hoverState.point.memoryPercent}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <HardDrive className="w-3 h-3 text-pink-600 dark:text-pink-400" /> Disk
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {hoverState.point.diskPercent}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Loop Lag
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {hoverState.point.eventLoopLagMs.toFixed(1)} ms
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60">
                    <div>
                      RAM: <strong className="text-slate-700 dark:text-slate-300">{hoverState.point.memoryUsedMb}MB</strong> / {hoverState.point.memoryTotalMb}MB
                    </div>
                    <div>
                      Disk: <strong className="text-slate-700 dark:text-slate-300">{hoverState.point.diskUsedGb}GB</strong> / {hoverState.point.diskTotalGb}GB
                    </div>
                    <div>
                      Net In: <strong className="text-emerald-600 dark:text-emerald-400">{hoverState.point.networkRxKbps.toLocaleString()} KB/s</strong>
                    </div>
                    <div>
                      Net Out: <strong className="text-emerald-600 dark:text-emerald-400">{hoverState.point.networkTxKbps.toLocaleString()} KB/s</strong>
                    </div>
                    <div>
                      Processes: <strong className="text-slate-700 dark:text-slate-300">{hoverState.point.activeProcesses}</strong>
                    </div>
                    <div>
                      Z-Scores: <strong className="text-slate-700 dark:text-slate-300">CPU {hoverState.point.zScoreCpu.toFixed(1)} | RAM {hoverState.point.zScoreMem.toFixed(1)}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Forecast Point Breakdown */}
              {hoverState.type === 'forecast' && hoverState.forecastPoint && (
                <div className="space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    AI Forecast Point Values
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-50 dark:bg-slate-900/80 p-2 rounded-lg border border-slate-200 dark:border-slate-800/80 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Pred. CPU</span>
                      <div className="font-bold text-cyan-600 dark:text-cyan-400">{hoverState.forecastPoint.predictedCpu}%</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Pred. RAM</span>
                      <div className="font-bold text-blue-600 dark:text-blue-400">{hoverState.forecastPoint.predictedMem}%</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Pred. Disk</span>
                      <div className="font-bold text-pink-600 dark:text-pink-400">{hoverState.forecastPoint.predictedDisk}%</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                    95% Confidence Bounds: <strong className="text-slate-700 dark:text-slate-300">[{hoverState.forecastPoint.lowerBoundMem}% - {hoverState.forecastPoint.upperBoundMem}%]</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Future forecast banner on bottom right of chart */}
        <div className="absolute right-3 bottom-3 bg-white/90 dark:bg-slate-950/80 border border-cyan-500/40 px-2.5 py-1 rounded text-[11px] font-mono text-cyan-700 dark:text-cyan-300 shadow-sm backdrop-blur-sm flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>AI Forecast Horizon: +40s</span>
        </div>
      </div>
    </div>
  );
};
