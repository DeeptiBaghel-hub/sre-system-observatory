/**
 * Real-Time System Monitoring & AI Prediction Types
 */

export interface MetricDataPoint {
  timestamp: number; // epoch ms
  cpuPercent: number; // 0 - 100%
  memoryPercent: number; // 0 - 100%
  memoryUsedMb: number;
  memoryTotalMb: number;
  diskPercent: number; // 0 - 100%
  diskUsedGb: number;
  diskTotalGb: number;
  networkRxKbps: number;
  networkTxKbps: number;
  eventLoopLagMs: number;
  activeProcesses: number;
  zScoreCpu: number;
  zScoreMem: number;
  isAnomaly: boolean;
}

export interface FailurePrediction {
  id: string;
  type: 'MEMORY_LEAK' | 'DISK_EXHAUSTION' | 'CPU_SATURATION' | 'NETWORK_SURGE' | 'NORMAL';
  severity: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  title: string;
  description: string;
  confidenceScore: number; // 0 - 100%
  timeToFailureSeconds: number | null; // null if stable, or seconds until 100% / failure
  growthRateUnit?: string; // e.g. "+3.4 MB/s" or "+1.2% / min"
  detectedAt: number;
  recommendedAction: string;
}

export interface MetricForecastPoint {
  timestamp: number;
  predictedCpu: number;
  predictedMem: number;
  predictedDisk: number;
  upperBoundMem: number;
  lowerBoundMem: number;
}

export interface SystemHealthSummary {
  status: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL';
  compositeScore: number; // 0 - 100 (100 is best)
  anomalyCountLast5m: number;
  predictions: FailurePrediction[];
  hostInfo: {
    hostname: string;
    platform: string;
    arch: string;
    cpuCores: number;
    totalMemoryGb: number;
    totalDiskGb: number;
    uptimeSeconds: number;
    nodeVersion: string;
  };
}

export interface LiveTelemetryPayload {
  type: 'TELEMETRY_TICK' | 'INITIAL_SYNC';
  timestamp: number;
  current: MetricDataPoint;
  history?: MetricDataPoint[];
  forecast: MetricForecastPoint[];
  predictions: FailurePrediction[];
  health: SystemHealthSummary;
  simulationMode: SimulationScenario;
}

export type SimulationScenario = 
  | 'NORMAL' 
  | 'MEMORY_LEAK' 
  | 'DISK_FILL' 
  | 'CPU_STORM' 
  | 'NETWORK_FLOOD';

export interface AiDiagnosisReport {
  timestamp: number;
  scenario: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  executiveSummary: string;
  rootCauseAnalysis: string;
  predictedImpact: string;
  timeToIncident: string;
  remediationCommands: string[];
  preventativeMeasures: string[];
  metricsContext: {
    cpu: string;
    memory: string;
    disk: string;
    network: string;
  };
  engine?: string;
}

export interface AlertThresholds {
  cpuCriticalPercent: number; // e.g. 85%
  memoryCriticalPercent: number; // e.g. 80%
  enabled: boolean;
}

export interface AlertEvent {
  id: string;
  timestamp: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  metric: string;
  value: string;
  resolved?: boolean;
}

export type Theme = 'dark' | 'light';

export interface SystemProcess {
  pid: number;
  name: string;
  command: string;
  user: string;
  cpuPercent: number;
  memoryMb: number;
  threads: number;
  priority: number; // nice level -20 to 19
  status: 'R' | 'S' | 'D' | 'Z'; // Running, Sleeping, Disk Sleep, Zombie
  startTime: string;
  isRogue?: boolean; // Identified by anomaly heuristics
}

export interface RunbookExecutionStep {
  stepNumber: number;
  title: string;
  command: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  durationMs?: number;
  outputLog?: string;
}

export interface RunbookPlaybook {
  id: string;
  title: string;
  description: string;
  targetScenario: SimulationScenario | 'ALL';
  category: 'RESTART' | 'DRAIN' | 'CLEANUP' | 'THROTTLE' | 'AUTOSCALE';
  estimatedRecoveryTimeSec: number;
  steps: RunbookExecutionStep[];
  successMessage: string;
}

export interface RunbookExecutionLog {
  id: string;
  timestamp: number;
  playbookId: string;
  playbookTitle: string;
  triggeredBy: string;
  status: 'IN_PROGRESS' | 'SUCCESS' | 'FAILED';
  durationMs: number;
  mitigatedScenario: SimulationScenario;
  stepsExecuted: RunbookExecutionStep[];
}

export interface SloMetrics {
  targetAvailabilityPercent: number; // e.g. 99.9%
  currentAvailabilityPercent: number; // e.g. 99.82%
  totalWindowMinutes: number; // e.g. 43200 (30 days)
  totalAllowedDowntimeMinutes: number; // 43.2 min for 99.9%
  consumedDowntimeMinutes: number; // consumed so far
  errorBudgetRemainingPercent: number; // e.g. 72.4%
  burnRate: number; // 1x = nominal, >5x = high, >14.4x = critical
  burnRateStatus: 'NORMAL' | 'ELEVATED' | 'CRITICAL';
  mttdSeconds: number; // Mean Time to Detect
  mttrSeconds: number; // Mean Time to Resolve
  healthyTicks: number;
  degradedTicks: number;
}

export interface PostMortemReport {
  id: string;
  title: string;
  incidentDate: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  durationMinutes: number;
  scenario: SimulationScenario;
  leadResponder: string;
  executiveSummary: string;
  sloImpact: {
    budgetBurnedPercent: number;
    downtimeMinutes: number;
    sliBreached: boolean;
  };
  timeline: {
    timestamp: string;
    description: string;
    metricState: string;
  }[];
  rootCause5Whys: string[];
  triggerTelemetry: {
    cpu: string;
    memory: string;
    disk: string;
    network: string;
    lag: string;
  };
  preventativeActions: {
    priority: 'P0' | 'P1' | 'P2';
    action: string;
    owner: string;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  }[];
}


