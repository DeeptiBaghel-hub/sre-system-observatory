import {
  MetricDataPoint,
  FailurePrediction,
  MetricForecastPoint,
  SystemHealthSummary,
  SimulationScenario,
} from '../src/types.js';
import os from 'os';

export class AnomalyEngine {
  private history: MetricDataPoint[] = [];
  private maxHistoryLength = 300; // 5 minutes at 1s intervals

  public addPoint(point: MetricDataPoint): {
    pointWithAnomaly: MetricDataPoint;
    predictions: FailurePrediction[];
    forecast: MetricForecastPoint[];
    health: SystemHealthSummary;
  } {
    // Append to history
    this.history.push(point);
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    }

    // Compute rolling stats & Z-scores
    const { zCpu, zMem, isAnomaly } = this.calculateZScores(point);
    point.zScoreCpu = +zCpu.toFixed(2);
    point.zScoreMem = +zMem.toFixed(2);
    point.isAnomaly = isAnomaly;

    // Run Predictive Failure Models
    const predictions = this.evaluatePredictiveModels();

    // Generate Future Forecast
    const forecast = this.generateForecast(point);

    // Compute System Health Summary
    const health = this.computeHealthSummary(point, predictions);

    return {
      pointWithAnomaly: point,
      predictions,
      forecast,
      health,
    };
  }

  public getHistory(): MetricDataPoint[] {
    return this.history;
  }

  private calculateZScores(current: MetricDataPoint): { zCpu: number; zMem: number; isAnomaly: boolean } {
    if (this.history.length < 10) {
      return { zCpu: 0, zMem: 0, isAnomaly: false };
    }

    const windowSlice = this.history.slice(-30); // 30-second rolling window
    
    // CPU Mean & StdDev
    const cpuVals = windowSlice.map((p) => p.cpuPercent);
    const cpuMean = cpuVals.reduce((a, b) => a + b, 0) / cpuVals.length;
    const cpuVariance = cpuVals.reduce((a, b) => a + Math.pow(b - cpuMean, 2), 0) / cpuVals.length;
    const cpuStdDev = Math.sqrt(cpuVariance) || 1.0;
    const zCpu = (current.cpuPercent - cpuMean) / cpuStdDev;

    // Mem Mean & StdDev
    const memVals = windowSlice.map((p) => p.memoryPercent);
    const memMean = memVals.reduce((a, b) => a + b, 0) / memVals.length;
    const memVariance = memVals.reduce((a, b) => a + Math.pow(b - memMean, 2), 0) / memVals.length;
    const memStdDev = Math.sqrt(memVariance) || 1.0;
    const zMem = (current.memoryPercent - memMean) / memStdDev;

    const isAnomaly = Math.abs(zCpu) > 2.5 || Math.abs(zMem) > 2.5 || current.cpuPercent > 92 || current.memoryPercent > 92;

    return { zCpu, zMem, isAnomaly };
  }

  private evaluatePredictiveModels(): FailurePrediction[] {
    const predictions: FailurePrediction[] = [];
    const len = this.history.length;
    if (len < 8) return predictions;

    const recent = this.history.slice(-20); // last 20 seconds
    const firstPoint = recent[0];
    const lastPoint = recent[recent.length - 1];
    const timeDeltaSec = Math.max(1, (lastPoint.timestamp - firstPoint.timestamp) / 1000);

    // 1. Memory Leak Detector (Linear Slope Regression)
    const memDelta = lastPoint.memoryPercent - firstPoint.memoryPercent;
    const memRatePerSec = memDelta / timeDeltaSec; // % per second
    const memMbDelta = lastPoint.memoryUsedMb - firstPoint.memoryUsedMb;
    const memMbRatePerSec = memMbDelta / timeDeltaSec;

    // If memory is growing consistently
    if (memRatePerSec > 0.05 && memMbRatePerSec > 5) {
      const remainingPercent = Math.max(0.1, 98 - lastPoint.memoryPercent);
      const timeToOomSec = Math.round(remainingPercent / memRatePerSec);
      const confidence = Math.min(98, Math.round(75 + (memRatePerSec * 100)));

      predictions.push({
        id: 'pred-mem-leak',
        type: 'MEMORY_LEAK',
        severity: timeToOomSec < 300 ? 'CRITICAL' : 'WARNING',
        title: 'Active Memory Leak Detected',
        description: `Unbounded memory accumulation observed. Heap growth velocity is +${memMbRatePerSec.toFixed(1)} MB/s (+${(memRatePerSec * 60).toFixed(1)}%/min).`,
        confidenceScore: confidence,
        timeToFailureSeconds: Math.max(15, timeToOomSec),
        growthRateUnit: `+${memMbRatePerSec.toFixed(1)} MB/s`,
        detectedAt: Date.now(),
        recommendedAction: 'Inspect event listeners and retainers in worker processes; prepare automatic heap dump and restart.',
      });
    }

    // 2. Disk Fill Runaway Detector
    const diskDelta = lastPoint.diskPercent - firstPoint.diskPercent;
    const diskRatePerSec = diskDelta / timeDeltaSec;
    if (diskRatePerSec > 0.02) {
      const remainingDiskPercent = Math.max(0.1, 100 - lastPoint.diskPercent);
      const timeToDiskFullSec = Math.round(remainingDiskPercent / diskRatePerSec);
      const hoursToFull = +(timeToDiskFullSec / 3600).toFixed(1);
      const confidence = Math.min(96, Math.round(70 + (diskRatePerSec * 200)));

      predictions.push({
        id: 'pred-disk-fill',
        type: 'DISK_EXHAUSTION',
        severity: timeToDiskFullSec < 1800 ? 'CRITICAL' : 'WARNING',
        title: 'Rapid Disk Depletion Runaway',
        description: `Persistent high-throughput write rate detected on root mount. Volume capacity projected to reach 100% in ~${hoursToFull > 1 ? `${hoursToFull} hours` : `${Math.round(timeToDiskFullSec / 60)} minutes`}.`,
        confidenceScore: confidence,
        timeToFailureSeconds: timeToDiskFullSec,
        growthRateUnit: `+${(diskRatePerSec * 60).toFixed(2)}% / min`,
        detectedAt: Date.now(),
        recommendedAction: 'Rotate ephemeral docker container logs and truncate unindexed diagnostic trace files.',
      });
    }

    // 3. CPU Saturation / Microburst Runaway
    if (lastPoint.cpuPercent > 85) {
      const avgRecentCpu = recent.reduce((sum, p) => sum + p.cpuPercent, 0) / recent.length;
      if (avgRecentCpu > 82) {
        predictions.push({
          id: 'pred-cpu-storm',
          type: 'CPU_SATURATION',
          severity: 'CRITICAL',
          title: 'Sustained Compute Saturation',
          description: `Core thread pool is throttled with average load at ${avgRecentCpu.toFixed(1)}%. Event loop latency is degrading (${lastPoint.eventLoopLagMs}ms).`,
          confidenceScore: 92,
          timeToFailureSeconds: 120, // 2 minutes before cascading queue timeouts
          growthRateUnit: `${avgRecentCpu.toFixed(0)}% steady load`,
          detectedAt: Date.now(),
          recommendedAction: 'Scale pod horizontal replica count or throttle non-critical background worker jobs.',
        });
      }
    }

    // 4. Network DDoS / Throughput Surge
    if (lastPoint.networkRxKbps > 10000) {
      predictions.push({
        id: 'pred-network-surge',
        type: 'NETWORK_SURGE',
        severity: 'WARNING',
        title: 'Abnormal Ingress Network Surge',
        description: `Ingress bandwidth exceeds baseline threshold by 12x (${(lastPoint.networkRxKbps / 1024).toFixed(1)} MB/s). Risk of socket buffer starvation.`,
        confidenceScore: 88,
        timeToFailureSeconds: 300,
        growthRateUnit: `${(lastPoint.networkRxKbps / 1024).toFixed(1)} MB/s`,
        detectedAt: Date.now(),
        recommendedAction: 'Apply rate limiting at reverse proxy layer and filter suspected anomaly IP CIDRs.',
      });
    }

    return predictions;
  }

  private generateForecast(current: MetricDataPoint): MetricForecastPoint[] {
    const forecast: MetricForecastPoint[] = [];
    const recent = this.history.slice(-15);
    const timeDelta = recent.length > 1 ? (current.timestamp - recent[0].timestamp) / 1000 : 1;
    
    // Slopes
    const memSlope = recent.length > 1 ? (current.memoryPercent - recent[0].memoryPercent) / timeDelta : 0;
    const cpuSlope = recent.length > 1 ? (current.cpuPercent - recent[0].cpuPercent) / timeDelta : 0;
    const diskSlope = recent.length > 1 ? (current.diskPercent - recent[0].diskPercent) / timeDelta : 0;

    const stepSeconds = 5;
    for (let i = 1; i <= 8; i++) {
      const futureOffsetSec = i * stepSeconds;
      const futureTs = current.timestamp + futureOffsetSec * 1000;
      
      // Project with damped slope
      const damping = Math.pow(0.95, i);
      const projMem = Math.max(10, Math.min(99.9, current.memoryPercent + memSlope * futureOffsetSec * damping));
      const projCpu = Math.max(5, Math.min(99.0, current.cpuPercent + (cpuSlope * futureOffsetSec * damping * 0.5)));
      const projDisk = Math.max(5, Math.min(99.9, current.diskPercent + diskSlope * futureOffsetSec));

      const confidenceSpread = 1.5 + i * 0.8;
      forecast.push({
        timestamp: futureTs,
        predictedCpu: +projCpu.toFixed(1),
        predictedMem: +projMem.toFixed(1),
        predictedDisk: +projDisk.toFixed(1),
        upperBoundMem: +Math.min(100, projMem + confidenceSpread).toFixed(1),
        lowerBoundMem: +Math.max(0, projMem - confidenceSpread).toFixed(1),
      });
    }

    return forecast;
  }

  private computeHealthSummary(current: MetricDataPoint, predictions: FailurePrediction[]): SystemHealthSummary {
    let healthScore = 100;

    // Deduct for CPU strain
    if (current.cpuPercent > 70) healthScore -= (current.cpuPercent - 70) * 0.8;
    // Deduct for Memory strain
    if (current.memoryPercent > 75) healthScore -= (current.memoryPercent - 75) * 1.0;
    // Deduct for Disk strain
    if (current.diskPercent > 85) healthScore -= (current.diskPercent - 85) * 1.2;
    // Deduct for Event Loop Lag
    if (current.eventLoopLagMs > 5) healthScore -= Math.min(25, (current.eventLoopLagMs - 5) * 2);

    // Deduct heavily for active critical predictions
    for (const pred of predictions) {
      if (pred.severity === 'CRITICAL') healthScore -= 30;
      else if (pred.severity === 'WARNING') healthScore -= 15;
    }

    healthScore = Math.max(5, Math.min(100, Math.round(healthScore)));

    const status = healthScore >= 80 ? 'OPTIMAL' : healthScore >= 50 ? 'DEGRADED' : 'CRITICAL';
    const anomalyCount = this.history.filter((p) => p.isAnomaly).length;

    return {
      status,
      compositeScore: healthScore,
      anomalyCountLast5m: anomalyCount,
      predictions,
      hostInfo: {
        hostname: os.hostname(),
        platform: `${os.type()} ${os.release()}`,
        arch: os.arch(),
        cpuCores: os.cpus().length,
        totalMemoryGb: +(os.totalmem() / (1024 ** 3)).toFixed(1),
        totalDiskGb: current.diskTotalGb,
        uptimeSeconds: Math.round(os.uptime()),
        nodeVersion: process.version,
      },
    };
  }
}
