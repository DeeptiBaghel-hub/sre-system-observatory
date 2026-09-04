import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MetricDataPoint,
  FailurePrediction,
  MetricForecastPoint,
  SystemHealthSummary,
  SimulationScenario,
  LiveTelemetryPayload,
  AiDiagnosisReport,
  AlertEvent,
} from './types.js';
import { Header } from './components/Header.js';
import { MetricCard } from './components/MetricCard.js';
import { AiPredictionBanner } from './components/AiPredictionBanner.js';
import { TelemetryChart } from './components/TelemetryChart.js';
import { StressLabModal } from './components/StressLabModal.js';
import { AiDiagnosisModal } from './components/AiDiagnosisModal.js';
import { AlertHistoryFeed } from './components/AlertHistoryFeed.js';
import { SystemSpecBar } from './components/SystemSpecBar.js';
import { ThresholdSettingsModal, DEFAULT_THRESHOLDS } from './components/ThresholdSettingsModal.js';
import { CsvExportModal } from './components/CsvExportModal.js';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal.js';
import { SloTracker } from './components/SloTracker.js';
import { ProcessTaskManager } from './components/ProcessTaskManager.js';
import { SelfHealingModal } from './components/SelfHealingModal.js';
import { PostMortemModal } from './components/PostMortemModal.js';
import { exportMetricsToCsv, CsvExportOptions } from './utils/csvExport.js';
import { AlertThresholds } from './types.js';
import { useTheme } from './context/ThemeContext.js';
import {
  Cpu,
  MemoryStick as Memory,
  HardDrive,
  Radio,
  Gauge,
  Sparkles,
  Zap,
  Keyboard,
} from 'lucide-react';

const METRIC_KEY_MAP: Record<string, { key: 'cpu' | 'memory' | 'disk' | 'network' | 'latency'; label: string; shortcut: string }> = {
  c: { key: 'cpu', label: 'CPU Usage', shortcut: 'C' },
  '1': { key: 'cpu', label: 'CPU Usage', shortcut: '1' },
  m: { key: 'memory', label: 'System Memory', shortcut: 'M' },
  '2': { key: 'memory', label: 'System Memory', shortcut: '2' },
  d: { key: 'disk', label: 'Disk Capacity', shortcut: 'D' },
  '3': { key: 'disk', label: 'Disk Capacity', shortcut: '3' },
  n: { key: 'network', label: 'Network Traffic', shortcut: 'N' },
  '4': { key: 'network', label: 'Network Traffic', shortcut: '4' },
  l: { key: 'latency', label: 'Event Loop Lag', shortcut: 'L' },
  '5': { key: 'latency', label: 'Event Loop Lag', shortcut: '5' },
};

const METRIC_SEQUENCE: ('cpu' | 'memory' | 'disk' | 'network' | 'latency')[] = [
  'cpu',
  'memory',
  'disk',
  'network',
  'latency',
];

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [history, setHistory] = useState<MetricDataPoint[]>([]);
  const [current, setCurrent] = useState<MetricDataPoint | null>(null);
  const [forecast, setForecast] = useState<MetricForecastPoint[]>([]);
  const [predictions, setPredictions] = useState<FailurePrediction[]>([]);
  const [health, setHealth] = useState<SystemHealthSummary | null>(null);
  const [simulationMode, setSimulationMode] = useState<SimulationScenario>('NORMAL');

  const [selectedMetric, setSelectedMetric] = useState<
    'cpu' | 'memory' | 'disk' | 'network' | 'latency'
  >('cpu');

  const [isStressLabOpen, setIsStressLabOpen] = useState<boolean>(false);
  const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState<boolean>(false);
  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState<boolean>(false);
  const [isProcessManagerOpen, setIsProcessManagerOpen] = useState<boolean>(false);
  const [isSelfHealingOpen, setIsSelfHealingOpen] = useState<boolean>(false);
  const [isPostMortemOpen, setIsPostMortemOpen] = useState<boolean>(false);
  const [aiReport, setAiReport] = useState<AiDiagnosisReport | null>(null);
  const [isLoadingDiagnosis, setIsLoadingDiagnosis] = useState<boolean>(false);

  // Auto-Refresh Live Stream Control
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(true);
  const isAutoRefreshRef = useRef<boolean>(true);
  const [pausedTicksCount, setPausedTicksCount] = useState<number>(0);
  const latestBufferedPayloadRef = useRef<LiveTelemetryPayload | null>(null);

  useEffect(() => {
    isAutoRefreshRef.current = isAutoRefresh;
  }, [isAutoRefresh]);

  // Keyboard shortcut HUD feedback toast
  const [activeShortcutHud, setActiveShortcutHud] = useState<{
    metric: 'cpu' | 'memory' | 'disk' | 'network' | 'latency';
    label: string;
    shortcut: string;
  } | null>(null);
  const shortcutHudTimeoutRef = useRef<any>(null);

  const toggleAutoRefresh = useCallback(() => {
    setIsAutoRefresh((prev) => {
      const next = !prev;
      isAutoRefreshRef.current = next;

      if (shortcutHudTimeoutRef.current) {
        clearTimeout(shortcutHudTimeoutRef.current);
      }
      setActiveShortcutHud({
        metric: 'cpu',
        label: next ? 'Auto-Refresh: RESUMED (Live Streaming)' : 'Auto-Refresh: PAUSED (Snapshot Frozen)',
        shortcut: 'P',
      });
      shortcutHudTimeoutRef.current = setTimeout(() => {
        setActiveShortcutHud(null);
      }, 1800);

      if (next) {
        // Unpaused: apply latest buffered payload immediately to catch up to real-time latest
        setPausedTicksCount(0);
        if (latestBufferedPayloadRef.current) {
          const payload = latestBufferedPayloadRef.current;
          setCurrent(payload.current);
          setForecast(payload.forecast || []);
          setPredictions(payload.predictions || []);
          setHealth(payload.health || null);
          setSimulationMode(payload.simulationMode || 'NORMAL');
          setHistory((prevHist) => {
            const updated = [...prevHist, payload.current];
            if (updated.length > 300) return updated.slice(-300);
            return updated;
          });
          latestBufferedPayloadRef.current = null;
        }
      }
      return next;
    });
  }, []);

  const triggerMetricSwitch = useCallback(
    (metric: 'cpu' | 'memory' | 'disk' | 'network' | 'latency', shortcutHint?: string) => {
      setSelectedMetric(metric);
      const metricLabels: Record<'cpu' | 'memory' | 'disk' | 'network' | 'latency', { label: string; key: string }> = {
        cpu: { label: 'CPU Usage', key: 'C' },
        memory: { label: 'System Memory', key: 'M' },
        disk: { label: 'Disk Capacity', key: 'D' },
        network: { label: 'Network Traffic', key: 'N' },
        latency: { label: 'Event Loop Lag', key: 'L' },
      };
      const info = metricLabels[metric];
      if (shortcutHint) {
        if (shortcutHudTimeoutRef.current) {
          clearTimeout(shortcutHudTimeoutRef.current);
        }
        setActiveShortcutHud({
          metric,
          label: info.label,
          shortcut: shortcutHint,
        });
        shortcutHudTimeoutRef.current = setTimeout(() => {
          setActiveShortcutHud(null);
        }, 1500);
      }
    },
    []
  );

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ignore if typing in text fields, inputs, textareas, selects
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      // 2. Ignore modifier combos (Cmd+C copy, Ctrl+D bookmark, Alt+Tab, etc.)
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      // Auto-Refresh Pause toggle with 'P' or 'p'
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        toggleAutoRefresh();
        return;
      }

      // Theme toggle with 'T' or 't'
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // Process Manager toggle with 'K' or 'k'
      if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        setIsProcessManagerOpen((prev) => !prev);
        return;
      }

      // SRE Runbooks toggle with 'R' or 'r'
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setIsSelfHealingOpen((prev) => !prev);
        return;
      }

      // SRE Post-Mortem toggle with 'O' or 'o'
      if (e.key === 'o' || e.key === 'O') {
        e.preventDefault();
        setIsPostMortemOpen((prev) => !prev);
        return;
      }

      // 3. Direct letter or digit shortcuts
      const keyLower = e.key.toLowerCase();
      const mapped = METRIC_KEY_MAP[keyLower] || METRIC_KEY_MAP[e.key];

      if (mapped) {
        e.preventDefault();
        triggerMetricSwitch(mapped.key, mapped.shortcut);
        return;
      }

      // 4. Arrow navigation cycling
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMetric((prev) => {
          const idx = METRIC_SEQUENCE.indexOf(prev);
          const next = METRIC_SEQUENCE[(idx + 1) % METRIC_SEQUENCE.length];
          triggerMetricSwitch(next, '→');
          return next;
        });
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMetric((prev) => {
          const idx = METRIC_SEQUENCE.indexOf(prev);
          const next = METRIC_SEQUENCE[(idx - 1 + METRIC_SEQUENCE.length) % METRIC_SEQUENCE.length];
          triggerMetricSwitch(next, '←');
          return next;
        });
        return;
      }

      // 5. Help modal toggle with '?'
      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutModalOpen((prev) => !prev);
        return;
      }

      // 6. Dismiss HUD on Escape
      if (e.key === 'Escape' && activeShortcutHud) {
        setActiveShortcutHud(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerMetricSwitch, toggleAutoRefresh, toggleTheme, activeShortcutHud]);

  const [alerts, setAlerts] = useState<AlertEvent[]>([]);

  // Helper to log alerts
  const logAlert = useCallback((severity: 'INFO' | 'WARNING' | 'CRITICAL', msg: string, metric: string, val: string) => {
    setAlerts((prev) => {
      // Avoid duplicate spam within last 5 seconds
      const recent = prev[0];
      if (recent && recent.message === msg && Date.now() - recent.timestamp < 5000) {
        return prev;
      }
      return [
        {
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          timestamp: Date.now(),
          severity,
          message: msg,
          metric,
          value: val,
        },
        ...prev.slice(0, 49), // retain up to 50 alerts
      ];
    });
  }, []);

  // Custom User Alert Thresholds (CPU & Memory Critical triggers)
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState<boolean>(false);
  const [isCsvExportModalOpen, setIsCsvExportModalOpen] = useState<boolean>(false);
  const [thresholds, setThresholds] = useState<AlertThresholds>(() => {
    try {
      const saved = localStorage.getItem('system_alert_thresholds');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return DEFAULT_THRESHOLDS;
  });

  const thresholdsRef = useRef<AlertThresholds>(thresholds);
  useEffect(() => {
    thresholdsRef.current = thresholds;
  }, [thresholds]);

  // Track timestamps of last triggered threshold alert to throttle repeated alerts
  const lastThresholdTriggerRef = useRef<{ cpu: number; memory: number }>({ cpu: 0, memory: 0 });

  const handleSaveThresholds = useCallback((newThresholds: AlertThresholds) => {
    setThresholds(newThresholds);
    try {
      localStorage.setItem('system_alert_thresholds', JSON.stringify(newThresholds));
    } catch {
      // ignore
    }
    logAlert(
      'INFO',
      `Custom thresholds updated: CPU ≥ ${newThresholds.cpuCriticalPercent}%, Memory ≥ ${newThresholds.memoryCriticalPercent}% (Watchdog ${newThresholds.enabled ? 'Enabled' : 'Disabled'})`,
      'Threshold Config',
      `${newThresholds.cpuCriticalPercent}% CPU / ${newThresholds.memoryCriticalPercent}% RAM`
    );
  }, [logAlert]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  // WebSocket Connection Lifecycle
  useEffect(() => {
    let isSubscribed = true;

    function connectWs() {
      if (!isSubscribed) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isSubscribed) return;
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const payload: LiveTelemetryPayload = JSON.parse(event.data);

            if (payload.type === 'INITIAL_SYNC') {
              if (payload.history) {
                setHistory(payload.history);
              }
              setCurrent(payload.current);
              setForecast(payload.forecast || []);
              setPredictions(payload.predictions || []);
              setHealth(payload.health || null);
              setSimulationMode(payload.simulationMode || 'NORMAL');
            } else if (payload.type === 'TELEMETRY_TICK') {
              // If Auto-Refresh is paused, buffer payload & record count, but do NOT mutate state so snapshot stays frozen
              if (!isAutoRefreshRef.current) {
                latestBufferedPayloadRef.current = payload;
                setPausedTicksCount((prev) => prev + 1);
                return;
              }

              setCurrent(payload.current);
              setForecast(payload.forecast || []);
              setPredictions(payload.predictions || []);
              setHealth(payload.health || null);
              setSimulationMode(payload.simulationMode || 'NORMAL');

              setHistory((prev) => {
                const next = [...prev, payload.current];
                if (next.length > 300) return next.slice(-300);
                return next;
              });

              // Check for new anomalies to log
              if (payload.current.isAnomaly) {
                const reason =
                  Math.abs(payload.current.zScoreCpu) > 2.5
                    ? `CPU Z-Score (${payload.current.zScoreCpu})`
                    : Math.abs(payload.current.zScoreMem) > 2.5
                    ? `Memory Z-Score (${payload.current.zScoreMem})`
                    : `Threshold exceeded`;
                logAlert('WARNING', 'Statistical Anomaly Flagged', reason, `${payload.current.cpuPercent}% CPU`);
              }

              // Check for predictions
              if (payload.predictions && payload.predictions.length > 0) {
                const p = payload.predictions[0];
                logAlert(p.severity, p.title, p.type, p.growthRateUnit || `${p.confidenceScore}% confidence`);
              }

              // Check for Custom User-Defined Threshold Exceeded (CRITICAL Alert)
              const activeThresh = thresholdsRef.current;
              if (activeThresh && activeThresh.enabled) {
                const now = Date.now();

                // CPU Critical Threshold Check
                if (payload.current.cpuPercent >= activeThresh.cpuCriticalPercent) {
                  if (now - lastThresholdTriggerRef.current.cpu > 15000) {
                    lastThresholdTriggerRef.current.cpu = now;
                    logAlert(
                      'CRITICAL',
                      `CPU Threshold Exceeded: ${payload.current.cpuPercent}% utilization exceeds custom threshold (${activeThresh.cpuCriticalPercent}%)`,
                      'CPU Watchdog',
                      `${payload.current.cpuPercent}% >= ${activeThresh.cpuCriticalPercent}%`
                    );
                  }
                }

                // Memory Critical Threshold Check
                if (payload.current.memoryPercent >= activeThresh.memoryCriticalPercent) {
                  if (now - lastThresholdTriggerRef.current.memory > 15000) {
                    lastThresholdTriggerRef.current.memory = now;
                    logAlert(
                      'CRITICAL',
                      `Memory Threshold Exceeded: ${payload.current.memoryPercent}% utilization exceeds custom threshold (${activeThresh.memoryCriticalPercent}%)`,
                      'Memory Watchdog',
                      `${payload.current.memoryPercent}% >= ${activeThresh.memoryCriticalPercent}%`
                    );
                  }
                }
              }
            }
          } catch (err) {
            console.error('Error handling WebSocket message:', err);
          }
        };

        ws.onclose = () => {
          if (!isSubscribed) return;
          setIsConnected(false);
          // Reconnect with backoff
          reconnectTimeoutRef.current = setTimeout(connectWs, 2000);
        };

        ws.onerror = (err) => {
          console.warn('WebSocket encountered error:', err);
          ws.close();
        };
      } catch (e) {
        console.error('Failed to create WebSocket:', e);
        reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
      }
    }

    connectWs();

    return () => {
      isSubscribed = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [logAlert]);

  // Trigger Scenario change
  const handleSelectScenario = useCallback((scenario: SimulationScenario) => {
    setSimulationMode(scenario);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'SET_SCENARIO', scenario }));
    } else {
      // Fallback HTTP
      fetch('/api/simulation/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      }).catch(console.error);
    }
  }, []);

  // Run AI Forensic Diagnosis via Server-side Gemini API
  const handleRunDiagnosis = useCallback(async () => {
    setIsLoadingDiagnosis(true);
    setIsDiagnosisModalOpen(true);
    try {
      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Diagnosis failed');
      const data: AiDiagnosisReport = await res.json();
      setAiReport(data);
      logAlert(data.severity, `Gemini AI Diagnostic Completed: ${data.title}`, 'Gemini 3.8 Flash', data.timeToIncident);
    } catch (err: any) {
      console.error('Failed to run AI diagnosis:', err);
    } finally {
      setIsLoadingDiagnosis(false);
    }
  }, [logAlert]);

  // Open CSV export configuration modal
  const handleExportCsv = useCallback(() => {
    setIsCsvExportModalOpen(true);
  }, []);

  // Execute configured CSV export
  const handlePerformCsvExport = useCallback((options: CsvExportOptions) => {
    if (history.length === 0) return;
    const res = exportMetricsToCsv(history, options);
    if (res.success) {
      const rangeLabel =
        options.startTime && options.endTime
          ? ` (${Math.round((options.endTime - options.startTime) / 1000)}s window)`
          : '';
      const filterLabel = options.onlyAnomalies ? ' [anomalies only]' : '';
      logAlert(
        'INFO',
        `Exported ${res.exportedCount} telemetry points to CSV${rangeLabel}${filterLabel}`,
        'CSV Export',
        `${res.exportedCount} records`
      );
    }
  }, [history, logAlert]);

  // Compute Sparklines for Metric Cards (last 25 points)
  const sparklines = React.useMemo(() => {
    const recent = history.slice(-25);
    return {
      cpu: recent.map((p) => p.cpuPercent),
      memory: recent.map((p) => p.memoryPercent),
      disk: recent.map((p) => p.diskPercent),
      network: recent.map((p) => p.networkRxKbps),
      latency: recent.map((p) => p.eventLoopLagMs),
    };
  }, [history]);

  // Compute summary stats for current metric card
  const getStats = (vals: number[]) => {
    if (vals.length === 0) return { min: 0, max: 0, avg: 0 };
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
    return { min: +min.toFixed(1), max: +max.toFixed(1), avg };
  };

  const cpuStats = getStats(sparklines.cpu);
  const memStats = getStats(sparklines.memory);
  const diskStats = getStats(sparklines.disk);
  const netStats = getStats(sparklines.network);
  const lagStats = getStats(sparklines.latency);

  // Status mapping
  const cpuStatus = current ? (current.cpuPercent > 85 ? 'CRITICAL' : current.cpuPercent > 70 ? 'WARNING' : 'HEALTHY') : 'HEALTHY';
  const memStatus = current ? (current.memoryPercent > 85 ? 'CRITICAL' : current.memoryPercent > 70 ? 'WARNING' : 'HEALTHY') : 'HEALTHY';
  const diskStatus = current ? (current.diskPercent > 85 ? 'CRITICAL' : current.diskPercent > 75 ? 'WARNING' : 'HEALTHY') : 'HEALTHY';
  const netStatus = current ? (current.networkRxKbps > 8000 ? 'WARNING' : 'HEALTHY') : 'HEALTHY';
  const lagStatus = current ? (current.eventLoopLagMs > 10 ? 'CRITICAL' : current.eventLoopLagMs > 4 ? 'WARNING' : 'HEALTHY') : 'HEALTHY';

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 flex flex-col telemetry-grid-bg selection:bg-cyan-500/30 selection:text-cyan-200 transition-colors duration-200">
      {/* Top Navigation & Status */}
      <Header
        isConnected={isConnected}
        activeScenario={simulationMode}
        onOpenStressLab={() => setIsStressLabOpen(true)}
        onOpenDiagnosis={handleRunDiagnosis}
        isLoadingDiagnosis={isLoadingDiagnosis}
        onResetNominal={() => handleSelectScenario('NORMAL')}
        compositeScore={health?.compositeScore || 100}
        onExportCsv={handleExportCsv}
        historyCount={history.length}
        onOpenShortcuts={() => setIsShortcutModalOpen(true)}
        isAutoRefresh={isAutoRefresh}
        onToggleAutoRefresh={toggleAutoRefresh}
        pausedTicksCount={pausedTicksCount}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenProcesses={() => setIsProcessManagerOpen(true)}
        onOpenRunbooks={() => setIsSelfHealingOpen(true)}
        onOpenPostMortem={() => setIsPostMortemOpen(true)}
      />

      {/* Main Observatory Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Spotlight: AI Failure Prediction & Early Warning Banner */}
        <AiPredictionBanner
          predictions={predictions}
          onOpenDiagnosis={handleRunDiagnosis}
          onOpenStressLab={() => setIsStressLabOpen(true)}
          isLoadingDiagnosis={isLoadingDiagnosis}
        />

        {/* SRE Reliability, SLO & Error Budget Tracker */}
        <SloTracker
          history={history}
          alerts={alerts}
          isScenarioActive={simulationMode !== 'NORMAL'}
        />

        {/* Real-Time Telemetry Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard
            id="metric-card-cpu"
            title="CPU Usage"
            icon={Cpu}
            value={current?.cpuPercent ?? '--'}
            unit="%"
            secondaryValue={`${health?.hostInfo?.cpuCores || 4} Cores active`}
            status={cpuStatus}
            sparklineData={sparklines.cpu}
            min={cpuStats.min}
            max={cpuStats.max}
            avg={cpuStats.avg}
            zScore={current?.zScoreCpu}
            isSelected={selectedMetric === 'cpu'}
            shortcutKey="C"
            onClick={() => triggerMetricSwitch('cpu', 'C')}
          />

          <MetricCard
            id="metric-card-memory"
            title="System Memory"
            icon={Memory}
            value={current?.memoryPercent ?? '--'}
            unit="%"
            secondaryValue={
              current
                ? `${(current.memoryUsedMb / 1024).toFixed(1)}GB / ${(current.memoryTotalMb / 1024).toFixed(1)}GB`
                : '--'
            }
            status={memStatus}
            sparklineData={sparklines.memory}
            min={memStats.min}
            max={memStats.max}
            avg={memStats.avg}
            zScore={current?.zScoreMem}
            isSelected={selectedMetric === 'memory'}
            shortcutKey="M"
            onClick={() => triggerMetricSwitch('memory', 'M')}
          />

          <MetricCard
            id="metric-card-disk"
            title="Disk Capacity"
            icon={HardDrive}
            value={current?.diskPercent ?? '--'}
            unit="%"
            secondaryValue={
              current ? `${current.diskUsedGb}GB / ${current.diskTotalGb}GB` : '--'
            }
            status={diskStatus}
            sparklineData={sparklines.disk}
            min={diskStats.min}
            max={diskStats.max}
            avg={diskStats.avg}
            isSelected={selectedMetric === 'disk'}
            shortcutKey="D"
            onClick={() => triggerMetricSwitch('disk', 'D')}
          />

          <MetricCard
            id="metric-card-network"
            title="Net Ingress"
            icon={Radio}
            value={
              current
                ? current.networkRxKbps > 1024
                  ? +(current.networkRxKbps / 1024).toFixed(1)
                  : current.networkRxKbps
                : '--'
            }
            unit={current && current.networkRxKbps > 1024 ? ' MB/s' : ' KB/s'}
            secondaryValue={`Tx: ${current?.networkTxKbps || 0} KB/s`}
            status={netStatus}
            sparklineData={sparklines.network}
            min={netStats.min}
            max={netStats.max}
            avg={netStats.avg}
            isSelected={selectedMetric === 'network'}
            shortcutKey="N"
            onClick={() => triggerMetricSwitch('network', 'N')}
          />

          <MetricCard
            id="metric-card-latency"
            title="Event Loop Lag"
            icon={Gauge}
            value={current?.eventLoopLagMs ?? '--'}
            unit=" ms"
            secondaryValue="Node.js libuv loop"
            status={lagStatus}
            sparklineData={sparklines.latency}
            min={lagStats.min}
            max={lagStats.max}
            avg={lagStats.avg}
            isSelected={selectedMetric === 'latency'}
            shortcutKey="L"
            onClick={() => triggerMetricSwitch('latency', 'L')}
          />
        </div>

        {/* Charts & Alert Stream Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main SVG Telemetry Chart with Forecast Horizon (2 cols on large screens) */}
          <div className="lg:col-span-2">
            <TelemetryChart
              history={history}
              forecast={forecast}
              selectedMetric={selectedMetric}
              onSelectMetric={(m) => triggerMetricSwitch(m)}
              onExportCsv={handleExportCsv}
              onOpenShortcuts={() => setIsShortcutModalOpen(true)}
              isAutoRefresh={isAutoRefresh}
              onToggleAutoRefresh={toggleAutoRefresh}
              pausedTicksCount={pausedTicksCount}
            />
          </div>

          {/* Real-time Predictive Event Log & Anomaly Stream (1 col) */}
          <div className="lg:col-span-1">
            <AlertHistoryFeed
              alerts={alerts}
              onClearAlerts={() => setAlerts([])}
              onOpenThresholdSettings={() => setIsThresholdModalOpen(true)}
              thresholds={thresholds}
            />
          </div>
        </div>

        {/* Interactive Stress Lab Quick Actions Banner */}
        <div className="rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90 backdrop-blur-md p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white tracking-tight">
                Interactive Failure Scenario Injector
              </div>
              <p className="text-[11px] text-slate-400">
                Current Mode:{' '}
                <span className="font-mono text-cyan-300 font-bold">
                  {simulationMode}
                </span>{' '}
                — Test how linear regression slope and Z-score models predict failure before outages occur.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
            {(['NORMAL', 'MEMORY_LEAK', 'DISK_FILL', 'CPU_STORM'] as const).map(
              (mode) => (
                <button
                  key={mode}
                  id={`btn-quick-inject-${mode.toLowerCase()}`}
                  onClick={() => handleSelectScenario(mode)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                    simulationMode === mode
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  {mode.replace('_', ' ')}
                </button>
              )
            )}
            <button
              id="btn-open-full-stress-lab"
              onClick={() => setIsStressLabOpen(true)}
              className="px-3 py-1 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 transition-colors"
            >
              All Scenarios...
            </button>
          </div>
        </div>

        {/* System Specification & Kernel Metadata Bar */}
        <SystemSpecBar
          hostInfo={health?.hostInfo}
          activeProcesses={current?.activeProcesses}
        />
      </main>

      {/* Failure Scenario Injection Modal */}
      <StressLabModal
        isOpen={isStressLabOpen}
        onClose={() => setIsStressLabOpen(false)}
        activeScenario={simulationMode}
        onSelectScenario={(sc) => {
          handleSelectScenario(sc);
          setIsStressLabOpen(false);
        }}
      />

      {/* AI Forensic Diagnosis Report Modal */}
      <AiDiagnosisModal
        isOpen={isDiagnosisModalOpen}
        onClose={() => setIsDiagnosisModalOpen(false)}
        report={aiReport}
        isLoading={isLoadingDiagnosis}
        onRefresh={handleRunDiagnosis}
      />

      {/* Custom Threshold Settings Modal */}
      <ThresholdSettingsModal
        isOpen={isThresholdModalOpen}
        onClose={() => setIsThresholdModalOpen(false)}
        thresholds={thresholds}
        onSaveThresholds={handleSaveThresholds}
        currentCpu={current?.cpuPercent}
        currentMemory={current?.memoryPercent}
      />

      {/* CSV Export Configuration Modal */}
      <CsvExportModal
        isOpen={isCsvExportModalOpen}
        onClose={() => setIsCsvExportModalOpen(false)}
        history={history}
        onExport={handlePerformCsvExport}
      />

      {/* Keyboard Shortcuts Interactive Guide Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutModalOpen}
        onClose={() => setIsShortcutModalOpen(false)}
        selectedMetric={selectedMetric}
        onSelectMetric={(metric) => triggerMetricSwitch(metric)}
      />

      {/* Kernel Process & Thread Inspector */}
      <ProcessTaskManager
        isOpen={isProcessManagerOpen}
        onClose={() => setIsProcessManagerOpen(false)}
        onScenarioMitigated={(sc) => handleSelectScenario('NORMAL')}
      />

      {/* Automated Self-Healing & Runbook Engine */}
      <SelfHealingModal
        isOpen={isSelfHealingOpen}
        onClose={() => setIsSelfHealingOpen(false)}
        activeScenario={simulationMode}
        onScenarioMitigated={(sc) => handleSelectScenario('NORMAL')}
      />

      {/* SRE Blameless Post-Mortem Generator */}
      <PostMortemModal
        isOpen={isPostMortemOpen}
        onClose={() => setIsPostMortemOpen(false)}
        activeScenario={simulationMode}
        latestMetric={current}
        recentAlerts={alerts}
      />

      {/* Real-time Keyboard Switcher HUD Toast */}
      {activeShortcutHud && (
        <div
          id="keyboard-shortcut-hud"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-cyan-500/50 bg-slate-900/95 backdrop-blur-md shadow-2xl shadow-cyan-950/80 text-white animate-fade-in pointer-events-none ring-1 ring-cyan-400/30"
        >
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-xs">
            {activeShortcutHud.shortcut}
          </div>
          <div>
            <div className="text-[10px] font-mono text-cyan-400 font-medium uppercase tracking-wider">
              Shortcut Active
            </div>
            <div className="text-xs font-semibold text-slate-100">
              {activeShortcutHud.label.startsWith('Auto-Refresh')
                ? activeShortcutHud.label
                : `Switched to ${activeShortcutHud.label}`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
