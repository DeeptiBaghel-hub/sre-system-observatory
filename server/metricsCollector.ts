import os from 'os';
import fs from 'fs';
import { MetricDataPoint, SimulationScenario, SystemProcess } from '../src/types.js';

interface CpuSample {
  idle: number;
  total: number;
}

export class MetricsCollector {
  private lastCpuSample: CpuSample | null = null;
  private currentScenario: SimulationScenario = 'NORMAL';
  private scenarioTick = 0;
  
  // Simulated leak state
  private simulatedLeakMb = 0;
  private simulatedDiskFillPercent = 0;
  private simulatedNetworkRx = 120;
  private simulatedNetworkTx = 85;

  // Custom reniced process priorities
  private processPriorities: Map<number, number> = new Map();
  private terminatedPids: Set<number> = new Set();

  constructor() {
    this.lastCpuSample = this.sampleCpuTimes();
  }

  public setScenario(scenario: SimulationScenario) {
    this.currentScenario = scenario;
    this.scenarioTick = 0;
    if (scenario === 'NORMAL') {
      this.simulatedLeakMb = 0;
      this.simulatedDiskFillPercent = 0;
    }
  }

  public getScenario(): SimulationScenario {
    return this.currentScenario;
  }

  private sampleCpuTimes(): CpuSample {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        total += cpu.times[type as keyof typeof cpu.times];
      }
      idle += cpu.times.idle;
    }

    return { idle, total };
  }

  public getCpuPercent(): number {
    const currentSample = this.sampleCpuTimes();
    if (!this.lastCpuSample) {
      this.lastCpuSample = currentSample;
      return 15.0;
    }

    const idleDelta = currentSample.idle - this.lastCpuSample.idle;
    const totalDelta = currentSample.total - this.lastCpuSample.total;
    this.lastCpuSample = currentSample;

    if (totalDelta <= 0) return 10.0;
    const usage = 100 - (idleDelta / totalDelta) * 100;
    return Math.max(0, Math.min(100, usage));
  }

  public getDiskStats(): { usedGb: number; totalGb: number; percent: number } {
    try {
      if (typeof fs.statfsSync === 'function') {
        const stats = fs.statfsSync('/');
        const totalBytes = stats.bsize * stats.blocks;
        const freeBytes = stats.bsize * stats.bfree;
        const usedBytes = totalBytes - freeBytes;
        const totalGb = +(totalBytes / (1024 ** 3)).toFixed(1);
        const usedGb = +(usedBytes / (1024 ** 3)).toFixed(1);
        const percent = +( (usedBytes / totalBytes) * 100 ).toFixed(1);
        return { usedGb, totalGb, percent };
      }
    } catch {
      // Fallback
    }

    // Default container disk approximation (e.g. 50GB root volume, 32GB used)
    return {
      usedGb: 34.2,
      totalGb: 50.0,
      percent: 68.4,
    };
  }

  public collect(): MetricDataPoint {
    this.scenarioTick++;
    const rawCpu = this.getCpuPercent();
    
    // Real system memory
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const usedMemBytes = totalMemBytes - freeMemBytes;
    let memoryUsedMb = +(usedMemBytes / (1024 * 1024)).toFixed(0);
    const memoryTotalMb = +(totalMemBytes / (1024 * 1024)).toFixed(0);
    let memoryPercent = +((memoryUsedMb / memoryTotalMb) * 100).toFixed(1);

    // Baseline realistic container disk (52.4% standard baseline)
    const disk = this.getDiskStats();
    const diskTotalGb = disk.totalGb > 0 ? disk.totalGb : 50.0;
    const baseDiskPercent = disk.percent > 10 ? disk.percent : 52.4;
    let diskPercent = baseDiskPercent;
    let diskUsedGb = +((diskPercent / 100) * diskTotalGb).toFixed(1);

    // Real or baseline network rates
    let networkRxKbps = 120 + Math.floor(Math.random() * 80);
    let networkTxKbps = 90 + Math.floor(Math.random() * 60);

    let cpuPercent = Math.max(4.0, rawCpu);
    let eventLoopLagMs = +(1.2 + Math.random() * 1.5).toFixed(1);

    // Apply Scenario Injections if user selected a stress/failure test
    if (this.currentScenario === 'MEMORY_LEAK') {
      // Memory continuously increases linearly: +18MB each second
      this.simulatedLeakMb += 18 + (Math.random() * 4);
      memoryUsedMb = Math.min(memoryTotalMb - 100, memoryUsedMb + this.simulatedLeakMb);
      memoryPercent = Math.min(99.5, +((memoryUsedMb / memoryTotalMb) * 100).toFixed(1));
      cpuPercent = Math.min(96, cpuPercent + 12 + Math.sin(this.scenarioTick * 0.2) * 5);
      eventLoopLagMs = +(eventLoopLagMs + (this.simulatedLeakMb / 200)).toFixed(1);
    } else if (this.currentScenario === 'DISK_FILL') {
      // Disk fill runaway: adds 0.18% per second
      this.simulatedDiskFillPercent += 0.18;
      diskPercent = Math.min(99.9, +(baseDiskPercent + this.simulatedDiskFillPercent).toFixed(1));
      diskUsedGb = +((diskPercent / 100) * diskTotalGb).toFixed(1);
      networkRxKbps += 1500; // heavy disk log write network replication
    } else if (this.currentScenario === 'CPU_STORM') {
      // Sustained CPU spike / runaway compute thread
      cpuPercent = Math.min(99.4, 88 + Math.random() * 11);
      eventLoopLagMs = +(14.5 + Math.random() * 12.0).toFixed(1);
    } else if (this.currentScenario === 'NETWORK_FLOOD') {
      // DDoS network surge
      networkRxKbps = 18500 + Math.floor(Math.random() * 6000);
      networkTxKbps = 8200 + Math.floor(Math.random() * 2500);
      cpuPercent = Math.min(95, cpuPercent + 35);
      eventLoopLagMs = +(8.0 + Math.random() * 5.0).toFixed(1);
    }

    return {
      timestamp: Date.now(),
      cpuPercent: +cpuPercent.toFixed(1),
      memoryPercent: +memoryPercent.toFixed(1),
      memoryUsedMb: Math.round(memoryUsedMb),
      memoryTotalMb: Math.round(memoryTotalMb),
      diskPercent: +diskPercent.toFixed(1),
      diskUsedGb: +diskUsedGb.toFixed(1),
      diskTotalGb: +diskTotalGb.toFixed(1),
      networkRxKbps: Math.round(networkRxKbps),
      networkTxKbps: Math.round(networkTxKbps),
      eventLoopLagMs: +eventLoopLagMs.toFixed(1),
      activeProcesses: 38 + Math.floor(Math.random() * 5),
      zScoreCpu: 0, // Computed by AnomalyEngine
      zScoreMem: 0,
      isAnomaly: false,
    };
  }

  public getProcesses(): SystemProcess[] {
    const list: SystemProcess[] = [
      {
        pid: 1,
        name: 'systemd',
        command: '/sbin/init splash',
        user: 'root',
        cpuPercent: +(0.1 + Math.random() * 0.2).toFixed(1),
        memoryMb: 34,
        threads: 1,
        priority: this.processPriorities.get(1) ?? 0,
        status: 'S',
        startTime: '00:01:00',
      },
      {
        pid: 241,
        name: 'node',
        command: 'node server.ts (Express & WS API)',
        user: 'node',
        cpuPercent: +(1.4 + Math.random() * 1.5).toFixed(1),
        memoryMb: 118,
        threads: 12,
        priority: this.processPriorities.get(241) ?? 0,
        status: 'R',
        startTime: '00:00:45',
      },
      {
        pid: 290,
        name: 'postgres',
        command: 'postgres: checkpointer & walwriter',
        user: 'postgres',
        cpuPercent: +(0.8 + Math.random() * 0.8).toFixed(1),
        memoryMb: 194,
        threads: 6,
        priority: this.processPriorities.get(290) ?? 0,
        status: 'S',
        startTime: '00:00:52',
      },
      {
        pid: 345,
        name: 'redis-server',
        command: 'redis-server *:6379 (session cache)',
        user: 'redis',
        cpuPercent: +(0.5 + Math.random() * 0.6).toFixed(1),
        memoryMb: 68,
        threads: 4,
        priority: this.processPriorities.get(345) ?? 0,
        status: 'S',
        startTime: '00:00:50',
      },
      {
        pid: 412,
        name: 'nginx',
        command: 'nginx: worker process',
        user: 'www-data',
        cpuPercent: +(1.1 + Math.random() * 0.9).toFixed(1),
        memoryMb: 46,
        threads: 2,
        priority: this.processPriorities.get(412) ?? 0,
        status: 'S',
        startTime: '00:00:40',
      },
      {
        pid: 530,
        name: 'datadog-agent',
        command: '/opt/datadog-agent/bin/agent run',
        user: 'dd-agent',
        cpuPercent: +(0.6 + Math.random() * 0.4).toFixed(1),
        memoryMb: 62,
        threads: 8,
        priority: this.processPriorities.get(530) ?? 0,
        status: 'S',
        startTime: '00:00:30',
      },
      {
        pid: 628,
        name: 'node_exporter',
        command: 'prometheus-node-exporter --collector.filesystem',
        user: 'nobody',
        cpuPercent: +(0.3 + Math.random() * 0.3).toFixed(1),
        memoryMb: 31,
        threads: 4,
        priority: this.processPriorities.get(628) ?? 0,
        status: 'S',
        startTime: '00:00:28',
      },
    ];

    // Correlate rogue anomaly processes based on active simulation scenario
    if (this.currentScenario === 'MEMORY_LEAK' && !this.terminatedPids.has(1084)) {
      const leakRam = Math.round(180 + this.simulatedLeakMb);
      list.unshift({
        pid: 1084,
        name: 'node (worker)',
        command: 'node --max-old-space-size=4096 worker-event-cache.js',
        user: 'node',
        cpuPercent: +(14.2 + Math.random() * 4.0).toFixed(1),
        memoryMb: leakRam,
        threads: 8,
        priority: this.processPriorities.get(1084) ?? 0,
        status: 'R',
        startTime: '00:00:15',
        isRogue: true,
      });
    }

    if (this.currentScenario === 'CPU_STORM' && !this.terminatedPids.has(1092)) {
      list.unshift({
        pid: 1092,
        name: 'crypto-storm',
        command: 'crypto-hasher-worker --threads=16 --algo=argon2id',
        user: 'daemon',
        cpuPercent: +(86.5 + Math.random() * 11.0).toFixed(1),
        memoryMb: 365,
        threads: 16,
        priority: this.processPriorities.get(1092) ?? -5,
        status: 'R',
        startTime: '00:00:10',
        isRogue: true,
      });
    }

    if (this.currentScenario === 'DISK_FILL' && !this.terminatedPids.has(1104)) {
      list.unshift({
        pid: 1104,
        name: 'wal-syncer',
        command: 'uncompressed-wal-collector --archive-dir=/var/log/wal',
        user: 'postgres',
        cpuPercent: +(12.5 + Math.random() * 5.0).toFixed(1),
        memoryMb: 240,
        threads: 4,
        priority: this.processPriorities.get(1104) ?? 0,
        status: 'D', // Uninterruptible sleep / heavy disk I/O
        startTime: '00:00:12',
        isRogue: true,
      });
    }

    if (this.currentScenario === 'NETWORK_FLOOD' && !this.terminatedPids.has(1118)) {
      list.unshift({
        pid: 1118,
        name: 'syn-flood-proxy',
        command: 'ingress-tunnel-drain --concurrency=50000',
        user: 'www-data',
        cpuPercent: +(32.0 + Math.random() * 8.0).toFixed(1),
        memoryMb: 310,
        threads: 24,
        priority: this.processPriorities.get(1118) ?? 0,
        status: 'R',
        startTime: '00:00:08',
        isRogue: true,
      });
    }

    return list;
  }

  public killProcess(pid: number, signal: string): { success: boolean; message: string; mitigatedScenario?: SimulationScenario } {
    this.terminatedPids.add(pid);

    let mitigated: SimulationScenario | undefined;

    // Check if terminating the rogue process mitigates active scenario
    if (pid === 1084 && this.currentScenario === 'MEMORY_LEAK') {
      this.currentScenario = 'NORMAL';
      this.simulatedLeakMb = 0;
      mitigated = 'MEMORY_LEAK';
    } else if (pid === 1092 && this.currentScenario === 'CPU_STORM') {
      this.currentScenario = 'NORMAL';
      mitigated = 'CPU_STORM';
    } else if (pid === 1104 && this.currentScenario === 'DISK_FILL') {
      this.currentScenario = 'NORMAL';
      this.simulatedDiskFillPercent = 0;
      mitigated = 'DISK_FILL';
    } else if (pid === 1118 && this.currentScenario === 'NETWORK_FLOOD') {
      this.currentScenario = 'NORMAL';
      mitigated = 'NETWORK_FLOOD';
    }

    return {
      success: true,
      message: `Process PID ${pid} terminated via ${signal}`,
      mitigatedScenario: mitigated,
    };
  }

  public reniceProcess(pid: number, priority: number): { success: boolean; message: string } {
    const clamped = Math.max(-20, Math.min(19, priority));
    this.processPriorities.set(pid, clamped);
    return {
      success: true,
      message: `PID ${pid} nice priority updated to ${clamped}`,
    };
  }

  public applyRemediation(playbookId: string): { success: boolean; message: string; mitigatedScenario: SimulationScenario } {
    let scenario: SimulationScenario = 'NORMAL';
    if (playbookId === 'RESTART_WORKER_LEAK') {
      this.simulatedLeakMb = 0;
      this.terminatedPids.add(1084);
      scenario = 'MEMORY_LEAK';
    } else if (playbookId === 'THROTTLE_CPU_BURST') {
      this.terminatedPids.add(1092);
      scenario = 'CPU_STORM';
    } else if (playbookId === 'ROTATE_DISK_LOGS') {
      this.simulatedDiskFillPercent = 0;
      this.terminatedPids.add(1104);
      scenario = 'DISK_FILL';
    } else if (playbookId === 'FILTER_NETWORK_FLOOD') {
      this.terminatedPids.add(1118);
      scenario = 'NETWORK_FLOOD';
    }

    this.currentScenario = 'NORMAL';
    this.scenarioTick = 0;

    return {
      success: true,
      message: `Automated Playbook ${playbookId} executed successfully. Baseline nominal restored.`,
      mitigatedScenario: scenario,
    };
  }
}
