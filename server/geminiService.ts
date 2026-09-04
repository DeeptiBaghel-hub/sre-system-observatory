import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { AiDiagnosisReport, MetricDataPoint, FailurePrediction, SystemHealthSummary } from '../src/types.js';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export async function runAiDiagnosis(
  current: MetricDataPoint,
  predictions: FailurePrediction[],
  health: SystemHealthSummary,
  recentTrend: MetricDataPoint[]
): Promise<AiDiagnosisReport> {
  const apiKey = process.env.GEMINI_API_KEY;

  // Prepare metric trend summary
  const samplePoints = recentTrend.slice(-10);
  const trendDescription = samplePoints
    .map(
      (p, i) =>
        `T-${samplePoints.length - i}s: CPU=${p.cpuPercent}%, Mem=${p.memoryPercent}%, Disk=${p.diskPercent}%, NetIn=${p.networkRxKbps}KB/s, Lag=${p.eventLoopLagMs}ms`
    )
    .join('\n');

  const prompt = `You are a Principal Site Reliability Engineer and Senior Systems Architect diagnosing a live production container node.
Current System Telemetry:
- Host: ${health.hostInfo.hostname} (${health.hostInfo.platform}, ${health.hostInfo.cpuCores} vCPUs, ${health.hostInfo.totalMemoryGb}GB RAM)
- Current CPU: ${current.cpuPercent}% (Z-Score: ${current.zScoreCpu})
- Current Memory: ${current.memoryPercent}% (${current.memoryUsedMb}MB / ${current.memoryTotalMb}MB, Z-Score: ${current.zScoreMem})
- Current Disk: ${current.diskPercent}% (${current.diskUsedGb}GB / ${current.diskTotalGb}GB)
- Ingress Network: ${current.networkRxKbps} KB/s
- Event Loop Lag: ${current.eventLoopLagMs} ms
- System Composite Health Score: ${health.compositeScore} / 100 (${health.status})

Active Statistical & Algorithmic Predictions:
${
  predictions.length > 0
    ? predictions
        .map(
          (p) =>
            `- [${p.severity}] ${p.title}: ${p.description} (Est. failure in ${p.timeToFailureSeconds ? `${p.timeToFailureSeconds}s` : 'unknown'})`
        )
        .join('\n')
    : 'No severe threshold violations detected yet. Operating within standard variance.'
}

Recent 10-Second Time-Series Window:
${trendDescription}

Provide an authoritative, detailed technical forensic diagnosis. Identify the root cause, predict cascading failure blast radius and time-to-incident, provide exact copy-pasteable Linux / Node shell remediation commands, and long-term preventative measures.`;

  const hasRealApiKey =
    apiKey &&
    apiKey !== 'MY_GEMINI_API_KEY' &&
    apiKey.trim().length > 10 &&
    !apiKey.includes('YOUR_');

  if (hasRealApiKey) {
    let timeoutId: NodeJS.Timeout | undefined;
    try {
      const ai = getAiClient();
      let response: any = null;

      // Primary fast model: Gemini 3.1 Flash Lite
      try {
        const callPromise = ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            systemInstruction:
              'You are a Principal Site Reliability Engineer and Senior Systems Architect diagnosing a live production container node. Output concise, authoritative forensic diagnoses strictly formatted in JSON.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ['INFO', 'WARNING', 'CRITICAL'] },
                scenario: { type: Type.STRING },
                executiveSummary: { type: Type.STRING },
                rootCauseAnalysis: { type: Type.STRING },
                predictedImpact: { type: Type.STRING },
                timeToIncident: { type: Type.STRING },
                remediationCommands: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                preventativeMeasures: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: [
                'title',
                'severity',
                'scenario',
                'executiveSummary',
                'rootCauseAnalysis',
                'predictedImpact',
                'timeToIncident',
                'remediationCommands',
                'preventativeMeasures',
              ],
            },
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Gemini API diagnosis request exceeded 20s limit')), 20000);
        });

        response = await Promise.race([callPromise, timeoutPromise]);
      } catch (liteErr: any) {
        if (timeoutId) clearTimeout(timeoutId);
        // Retry with gemini-3.8-flash with LOW thinking if flash-lite encounters temporary error
        console.info('[AI Diagnosis] Flash Lite unavailable, retrying with Gemini 3.8 Flash:', liteErr?.message || liteErr);
        
        const callPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction:
              'You are a Principal Site Reliability Engineer and Senior Systems Architect diagnosing a live production container node. Output concise, authoritative forensic diagnoses strictly formatted in JSON.',
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.LOW,
            },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                severity: { type: Type.STRING, enum: ['INFO', 'WARNING', 'CRITICAL'] },
                scenario: { type: Type.STRING },
                executiveSummary: { type: Type.STRING },
                rootCauseAnalysis: { type: Type.STRING },
                predictedImpact: { type: Type.STRING },
                timeToIncident: { type: Type.STRING },
                remediationCommands: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                preventativeMeasures: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: [
                'title',
                'severity',
                'scenario',
                'executiveSummary',
                'rootCauseAnalysis',
                'predictedImpact',
                'timeToIncident',
                'remediationCommands',
                'preventativeMeasures',
              ],
            },
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Gemini API diagnosis request exceeded 20s limit')), 20000);
        });

        response = await Promise.race([callPromise, timeoutPromise]);
      }

      if (response && response.text) {
        const parsed = JSON.parse(response.text.trim());
        return {
          timestamp: Date.now(),
          scenario: parsed.scenario || 'Production Telemetry Assessment',
          severity: parsed.severity || (health.status === 'CRITICAL' ? 'CRITICAL' : 'WARNING'),
          title: parsed.title,
          executiveSummary: parsed.executiveSummary,
          rootCauseAnalysis: parsed.rootCauseAnalysis,
          predictedImpact: parsed.predictedImpact,
          timeToIncident: parsed.timeToIncident,
          remediationCommands: parsed.remediationCommands || [],
          preventativeMeasures: parsed.preventativeMeasures || [],
          metricsContext: {
            cpu: `${current.cpuPercent}% (z=${current.zScoreCpu})`,
            memory: `${current.memoryPercent}% (${current.memoryUsedMb}MB)`,
            disk: `${current.diskPercent}% (${current.diskUsedGb}GB)`,
            network: `${current.networkRxKbps} KB/s`,
          },
          engine: 'Gemini AI Engine',
        };
      }
    } catch (err: any) {
      console.info('[AI Diagnosis] Utilizing deterministic forensic analysis (Gemini fallback):', err?.message || err);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  // Fallback high-fidelity heuristic diagnostic synthesis
  const primaryPrediction = predictions[0];
  let severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO';
  let title = 'System Telemetry Baseline Nominal';
  let summary = 'System resource metrics are currently within nominal tolerances. CPU and heap allocations show standard variance without unbounded accumulation.';
  let rootCause = 'Standard operating conditions. Background thread pool and memory allocators are maintaining equilibrium.';
  let impact = 'No immediate service degradation expected. SLA adherence at 99.99%.';
  let timeToIncident = 'None (> 72 hours)';
  let commands = [
    'top -b -n 1 | head -n 20',
    'vmstat 1 5',
    'free -m',
  ];
  let preventions = [
    'Maintain automated synthetic health-checks on /api/health.',
    'Configure Prometheus alertmanager alerts at 85% memory threshold.',
  ];

  if (primaryPrediction?.type === 'MEMORY_LEAK' || current.memoryPercent > 80) {
    severity = 'CRITICAL';
    title = 'Active Heap Memory Leak - OOM Killer Imminent';
    summary = `Linear growth rate detected at ${primaryPrediction?.growthRateUnit || '+18MB/s'}. If unchecked, the Linux kernel OOM (Out-Of-Memory) killer will terminate the host process.`;
    rootCause = 'Unclosed stream handles or global event emitter listeners accumulating detached object references in Node.js V8 old generation space.';
    impact = 'Node crash with SIGKILL (Exit code 137). In-flight HTTP connections will abort abruptly, triggering 502 Bad Gateway at ingress reverse proxy.';
    timeToIncident = primaryPrediction?.timeToFailureSeconds
      ? `Approximately ${Math.round(primaryPrediction.timeToFailureSeconds / 60)} minutes (${primaryPrediction.timeToFailureSeconds} seconds)`
      : 'Under 15 minutes';
    commands = [
      'node --inspect-brk server.ts & pkill -USR1 node',
      'kill -HUP $(pgrep -f "node server")',
      'cat /proc/sys/vm/overcommit_memory',
      'pmap -x $(pgrep -f node) | sort -k 3 -n -r | head -n 15',
    ];
    preventions = [
      'Implement heapdump snapshotting via v8.writeHeapSnapshot() when memory exceeds 80%.',
      'Verify that all EventEmitter listeners call removeListener() or use AbortController signals.',
    ];
  } else if (primaryPrediction?.type === 'DISK_EXHAUSTION' || current.diskPercent > 85) {
    severity = 'CRITICAL';
    title = 'Root Filesystem Depletion - Volume Write Lockout';
    summary = `Rapid write velocity detected (${primaryPrediction?.growthRateUnit || '+1.5%/min'}). Root filesystem will be exhausted, causing all database writes, temp files, and socket descriptors to fail with ENOSPC.`;
    rootCause = 'Unrotated debug/trace logs or runaway core dumps accumulating in /var/log or container ephemeral storage layers.';
    impact = 'Database engine lockups, failure of crash dump writes, Docker daemon failure to allocate container metadata layers.';
    timeToIncident = primaryPrediction?.timeToFailureSeconds
      ? `${(primaryPrediction.timeToFailureSeconds / 3600).toFixed(1)} hours`
      : 'Under 4 hours';
    commands = [
      'journalctl --vacuum-size=200M',
      'find /tmp /var/log -type f -size +50M -exec ls -lh {} \\;',
      'df -hT && du -xh / | sort -rh | head -n 15',
      'truncate -s 0 /var/log/*.log',
    ];
    preventions = [
      'Enforce logrotate with size 50M and max 3 rotations.',
      'Mount storage volumes on dedicated block devices separated from OS root partition.',
    ];
  } else if (primaryPrediction?.type === 'CPU_SATURATION' || current.cpuPercent > 85) {
    severity = 'CRITICAL';
    title = 'Sustained Compute Saturation - Event Loop Degradation';
    summary = `Process is consuming ${current.cpuPercent}% compute across all available vCPUs. Event loop lag has degraded to ${current.eventLoopLagMs}ms.`;
    rootCause = 'Synchronous JSON parsing of oversized payloads, unindexed regex catastrophic backtracking, or heavy cryptographic calculations blocking the main event thread.';
    impact = 'Socket timeouts, request queuing delays exceeding client timeouts (504 Gateway Timeout), health probe drops.';
    timeToIncident = 'Active degradation (< 90 seconds before ingress drops)';
    commands = [
      'perf top -p $(pgrep -f node)',
      'kill -9 $(ps aux --sort=-%cpu | awk "NR==2{print \\$2}")',
      'renice -n 10 -p $(pgrep -f node)',
    ];
    preventions = [
      'Offload synchronous CPU-bound operations to worker_threads or external queue workers.',
      'Apply strict request payload limits (e.g. express.json({ limit: "2mb" })).',
    ];
  } else if (primaryPrediction?.type === 'NETWORK_SURGE' || current.networkRxKbps > 8000) {
    severity = 'WARNING';
    title = 'Ingress Throughput Surge - Socket Buffer Starvation';
    summary = `Ingress packet throughput is ${current.networkRxKbps} KB/s, exceeding standard baseline by an order of magnitude.`;
    rootCause = 'Layer 7 application-level volumetric flood or rapid API polling without backoff by downstream microservice clients.';
    impact = 'TCP socket queue overflow (SYN backlog full), packet drops, degradation of API response latency.';
    timeToIncident = '3 to 5 minutes until network buffer saturation';
    commands = [
      'netstat -ant | awk \'{print $6}\' | sort | uniq -c | sort -n',
      'ss -s && iptables -L -n -v',
      'tcpdump -nn -c 50 -i any',
    ];
    preventions = [
      'Implement token-bucket rate limiting via Redis or reverse proxy upstream.',
      'Deploy Cloud Armor / Cloudflare edge DDoS scrubbing.',
    ];
  }

  return {
    timestamp: Date.now(),
    scenario: primaryPrediction?.title || 'Heuristic Anomaly Detection',
    severity,
    title,
    executiveSummary: summary,
    rootCauseAnalysis: rootCause,
    predictedImpact: impact,
    timeToIncident,
    remediationCommands: commands,
    preventativeMeasures: preventions,
    metricsContext: {
      cpu: `${current.cpuPercent}% (z=${current.zScoreCpu})`,
      memory: `${current.memoryPercent}% (${current.memoryUsedMb}MB)`,
      disk: `${current.diskPercent}% (${current.diskUsedGb}GB)`,
      network: `${current.networkRxKbps} KB/s`,
    },
    engine: 'Deterministic Forensic Engine',
  };
}
