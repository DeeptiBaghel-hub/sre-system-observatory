import React, { useState, useMemo } from 'react';
import { PostMortemReport, SimulationScenario, MetricDataPoint, AlertEvent } from '../types.js';
import { FileText, Copy, Download, Check, AlertTriangle, ShieldCheck, Clock, Share2, Calendar, User, X } from 'lucide-react';

interface PostMortemModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeScenario: SimulationScenario;
  latestMetric: MetricDataPoint | null;
  recentAlerts: AlertEvent[];
}

export const PostMortemModal: React.FC<PostMortemModalProps> = ({
  isOpen,
  onClose,
  activeScenario,
  latestMetric,
  recentAlerts,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario>(
    activeScenario !== 'NORMAL' ? activeScenario : 'MEMORY_LEAK'
  );
  const [copied, setCopied] = useState<boolean>(false);

  const report: PostMortemReport = useMemo(() => {
    const nowStr = new Date().toISOString().slice(0, 10);
    const cpuStr = latestMetric ? `${latestMetric.cpuPercent}%` : '89.4%';
    const memStr = latestMetric ? `${latestMetric.memoryPercent}% (${latestMetric.memoryUsedMb} MB)` : '92.1% (3,780 MB)';
    const diskStr = latestMetric ? `${latestMetric.diskPercent}% (${latestMetric.diskUsedGb} GB)` : '84.2% (42.1 GB)';
    const netStr = latestMetric ? `Rx: ${latestMetric.networkRxKbps} KB/s | Tx: ${latestMetric.networkTxKbps} KB/s` : 'Rx: 19,420 KB/s';
    const lagStr = latestMetric ? `${latestMetric.eventLoopLagMs} ms` : '18.4 ms';

    if (selectedScenario === 'MEMORY_LEAK') {
      return {
        id: 'INC-2026-0881',
        title: 'Production API Gateway V8 Heap Exhaustion & OOM Risk',
        incidentDate: nowStr,
        severity: 'CRITICAL',
        durationMinutes: 6.2,
        scenario: 'MEMORY_LEAK',
        leadResponder: 'SRE On-Call Lead',
        executiveSummary:
          'A rapid linear memory expansion was flagged by the statistical z-score anomaly engine. An un-evicted global event buffer in the worker thread retained uncompressed payloads, causing memory usage to climb by ~18 MB/s and exhausting 92% of available heap before automated runbook remediation was triggered.',
        sloImpact: {
          budgetBurnedPercent: 14.8,
          downtimeMinutes: 0.8,
          sliBreached: false,
        },
        timeline: [
          {
            timestamp: 'T-06:00',
            description: 'Ordinary Least Squares regression flags positive slope in memory consumption exceeding +15 MB/s.',
            metricState: 'Memory: 64% → 72%',
          },
          {
            timestamp: 'T-04:30',
            description: 'Z-score memory anomaly exceeds critical +3.0 threshold. Gemini root-cause engine triggered.',
            metricState: 'Memory: 82% | Event Loop Lag: 8.2ms',
          },
          {
            timestamp: 'T-02:15',
            description: 'Automated high-priority SRE pager dispatched due to burn rate reaching 14.4x.',
            metricState: 'Memory: 91% | Z-Score: +3.8',
          },
          {
            timestamp: 'T-00:45',
            description: 'Automated self-healing runbook "V8 Heap Drain" invoked. Subprocesses gracefully drained.',
            metricState: 'Memory: 94% → 46%',
          },
          {
            timestamp: 'T-00:00',
            description: 'Health canary confirmed 200 OK. Telemetry returned to nominal optimal baseline.',
            metricState: 'Memory: 48% (Stable)',
          },
        ],
        rootCause5Whys: [
          'Why did the service experience degraded performance? The Node.js V8 heap approached max-old-space-size ceiling, triggering stop-the-world garbage collection loops.',
          'Why did heap consumption climb continuously? Event queue buffers retained uncompressed JSON response blobs without TTL expiration.',
          'Why were items not expiring? The eviction handler was attached to a timer callback that was starved by heavy event-loop serialization.',
          'Why was large payload serialization done on the main thread? A recent micro-service migration shifted decompression logic to the gateway layer.',
          'Why did tests not catch this? Synthetic load tests in staging utilized small payload fixtures (< 5KB) rather than production-scale multipart arrays.',
        ],
        triggerTelemetry: {
          cpu: cpuStr,
          memory: memStr,
          disk: diskStr,
          network: netStr,
          lag: lagStr,
        },
        preventativeActions: [
          {
            priority: 'P0',
            action: 'Configure strict max-old-space-size memory caps and enable container cgroup memory pressure alerts.',
            owner: 'Platform SRE',
            status: 'IN_PROGRESS',
          },
          {
            priority: 'P1',
            action: 'Implement Redis offload for response payload caching with mandatory 300s TTLs.',
            owner: 'Backend Team',
            status: 'TODO',
          },
          {
            priority: 'P2',
            action: 'Add 50MB multipart stress suites to pre-deployment CI/CD regression testing.',
            owner: 'QA / DevOps',
            status: 'DONE',
          },
        ],
      };
    }

    if (selectedScenario === 'CPU_STORM') {
      return {
        id: 'INC-2026-0882',
        title: 'Compute Pool Core Saturation & CFS Throttling Surge',
        incidentDate: nowStr,
        severity: 'CRITICAL',
        durationMinutes: 4.8,
        scenario: 'CPU_STORM',
        leadResponder: 'SRE Operations Engineer',
        executiveSummary:
          'A runaway compute thread saturated all allocated CPU cores to >96%, causing completely fair scheduler (CFS) container throttling and spiking event-loop lag above 18ms. Traffic was mitigated via kernel token bucket throttling and horizontal pod autoscaling.',
        sloImpact: {
          budgetBurnedPercent: 12.1,
          downtimeMinutes: 0.5,
          sliBreached: false,
        },
        timeline: [
          {
            timestamp: 'T-05:00',
            description: 'CPU core utilization spiked from nominal 14% to 92% across all 4 vCPUs within 3 seconds.',
            metricState: 'CPU: 92% | Load Avg: 8.4',
          },
          {
            timestamp: 'T-03:20',
            description: 'Event loop lag exceeded 15ms threshold; p99 latency on health probes jumped to 420ms.',
            metricState: 'Lag: 18.5ms',
          },
          {
            timestamp: 'T-01:10',
            description: 'Runbook "Adaptive Concurrency Throttling" engaged token bucket rate-limiting.',
            metricState: 'CPU: 88% → 45%',
          },
          {
            timestamp: 'T-00:00',
            description: 'Workload redistributed across autoscaled pods. Telemetry baseline fully restored.',
            metricState: 'CPU: 24% (Optimal)',
          },
        ],
        rootCause5Whys: [
          'Why did CPU usage spike to 99%? A cryptographic hashing task entered an unconstrained recursive hashing loop.',
          'Why was the loop unbounded? Missing input validation on iteration count parameter in authorization middleware.',
          'Why was compute executed on the request path? Synchronous crypto primitives were invoked without thread pool delegation.',
          'Why did autoscaling not absorb it immediately? Horizontal Pod Autoscaler had a 60-second stabilization cooldown window.',
          'Why was rate-limiting bypassed? The request originated from an internal subnet IP range exempted from default ingress throttles.',
        ],
        triggerTelemetry: {
          cpu: cpuStr,
          memory: memStr,
          disk: diskStr,
          network: netStr,
          lag: lagStr,
        },
        preventativeActions: [
          {
            priority: 'P0',
            action: 'Delegate expensive cryptographic functions to Web Worker thread pools.',
            owner: 'Security Arch',
            status: 'IN_PROGRESS',
          },
          {
            priority: 'P1',
            action: 'Tighten HPA scale-up reaction time from 60s to 15s during sustained CPU > 80%.',
            owner: 'DevOps / K8s',
            status: 'DONE',
          },
          {
            priority: 'P2',
            action: 'Audit internal subnet exemption rules in edge firewall rate-limiters.',
            owner: 'NetSec Team',
            status: 'TODO',
          },
        ],
      };
    }

    if (selectedScenario === 'DISK_FILL') {
      return {
        id: 'INC-2026-0883',
        title: 'Persistent Storage Inode Depletion via Uncompressed WAL Logs',
        incidentDate: nowStr,
        severity: 'WARNING',
        durationMinutes: 8.5,
        scenario: 'DISK_FILL',
        leadResponder: 'Database Administrator & SRE',
        executiveSummary:
          'Uncompressed database write-ahead log (WAL) segments accumulated without automated archival, consuming disk capacity at 0.18%/sec. Automated log rotation and temp buffer vacuuming purged expired segments and reclaimed 32% disk headroom.',
        sloImpact: {
          budgetBurnedPercent: 8.4,
          downtimeMinutes: 0.0,
          sliBreached: false,
        },
        timeline: [
          {
            timestamp: 'T-08:00',
            description: 'Disk consumption trajectory projected full volume exhaustion within 12 minutes.',
            metricState: 'Disk: 78% (Slope +0.18%/s)',
          },
          {
            timestamp: 'T-04:00',
            description: 'Disk warning alert breached 85% threshold; I/O wait times increased by 30%.',
            metricState: 'Disk: 86% | Disk I/O: 45MB/s',
          },
          {
            timestamp: 'T-01:30',
            description: 'Self-healing runbook "WAL Segment Rotation" executed logrotate vacuum on /var/log/wal.',
            metricState: 'Disk: 88% → 66%',
          },
          {
            timestamp: 'T-00:00',
            description: 'Zstandard compression applied to archived segments. Disk headroom stabilized.',
            metricState: 'Disk: 68% (Healthy)',
          },
        ],
        rootCause5Whys: [
          'Why did disk fill rapidly? The PostgreSQL wal_keep_size parameter was set to retain excessive historic segments.',
          'Why were logs not shipped to cold storage? An S3 bucket permissions policy revoked write tokens after a rotation key change.',
          'Why did the failure go unnoticed until 80%? CloudWatch metric filter only alarmed at 90% static threshold.',
          'Why was disk linear regression forecasting missing? Monitoring relied on point-in-time checks rather than slope projection.',
          'Why were scratch files stored on the root partition? Ephemeral buffer writes defaulted to /tmp instead of dedicated volume mount.',
        ],
        triggerTelemetry: {
          cpu: cpuStr,
          memory: memStr,
          disk: diskStr,
          network: netStr,
          lag: lagStr,
        },
        preventativeActions: [
          {
            priority: 'P0',
            action: 'Configure automated linear projection alerting at 4-hour time-to-exhaustion.',
            owner: 'SRE Observability',
            status: 'DONE',
          },
          {
            priority: 'P1',
            action: 'Mount dedicated ephemeral volume for /tmp with separate tmpfs limits.',
            owner: 'Infrastructure',
            status: 'IN_PROGRESS',
          },
          {
            priority: 'P2',
            action: 'Automate S3 log shipper IAM role credential renewal via Vault.',
            owner: 'Security',
            status: 'TODO',
          },
        ],
      };
    }

    // Default: Network Flood
    return {
      id: 'INC-2026-0884',
      title: 'Volumetric Ingress Traffic Spike & Socket Descriptor Exhaustion',
      incidentDate: nowStr,
      severity: 'CRITICAL',
      durationMinutes: 5.1,
      scenario: 'NETWORK_FLOOD',
      leadResponder: 'Network SRE Lead',
      executiveSummary:
        'A burst of ingress network traffic reaching ~24,000 KB/s saturated network socket queues, increasing event loop lag and risking socket descriptor starvation. Edge rate limiting and TCP SYN cookie hardening successfully mitigated the surge.',
      sloImpact: {
        budgetBurnedPercent: 11.5,
        downtimeMinutes: 0.3,
        sliBreached: false,
      },
      timeline: [
        {
          timestamp: 'T-05:00',
          description: 'Network Rx surged from nominal 120 KB/s to 22,000 KB/s within 2 collection ticks.',
          metricState: 'Network Rx: 22,400 KB/s',
        },
        {
          timestamp: 'T-03:00',
          description: 'SYN backlog filled to 85%; TCP half-open connections reached 2,400 sockets.',
          metricState: 'Sockets: 2,400 | Event Loop: 9.8ms',
        },
        {
          timestamp: 'T-01:00',
          description: 'Executed "Edge Ingress SYN Cookie Filter" runbook. Dropped anomalous ingress CIDRs.',
          metricState: 'Network Rx: 24,000 → 480 KB/s',
        },
        {
          timestamp: 'T-00:00',
          description: 'Ingress traffic normalized; zero socket drops reported by kernel netstat.',
          metricState: 'Network: 140 KB/s (Nominal)',
        },
      ],
      rootCause5Whys: [
        'Why did socket descriptors approach exhaustion? An anomalous surge of TCP handshake SYN packets flooded port 3000.',
        'Why were packets not dropped earlier? Edge CDN WAF rate-limiting rule was in "detect-only" observation mode.',
        'Why was WAF in detection mode? Rule had been switched during a promotional campaign to prevent false positive drops.',
        'Why was kernel SYN cookie protection disabled? Default sysctl configuration lacked net.ipv4.tcp_syncookies flag.',
        'Why did health checks slow down? Ingress queue contention delayed reverse-proxy socket handshakes.',
      ],
      triggerTelemetry: {
        cpu: cpuStr,
        memory: memStr,
        disk: diskStr,
        network: netStr,
        lag: lagStr,
      },
      preventativeActions: [
        {
          priority: 'P0',
          action: 'Permanently enforce net.ipv4.tcp_syncookies=1 in base container host sysctl.',
          owner: 'DevOps Platform',
          status: 'DONE',
        },
        {
          priority: 'P1',
          action: 'Transition Cloudflare WAF rate-limiting to automated blocking mode with IP challenge.',
          owner: 'NetSec Team',
          status: 'IN_PROGRESS',
        },
        {
          priority: 'P2',
          action: 'Configure synthetic external health probes on isolated administrative port.',
          owner: 'SRE Observability',
          status: 'TODO',
        },
      ],
    };
  }, [selectedScenario, latestMetric]);

  const generateMarkdown = (): string => {
    return `# SRE Blameless Incident Post-Mortem: ${report.id}

**Incident Title**: ${report.title}  
**Date**: ${report.incidentDate}  
**Severity**: ${report.severity}  
**Duration**: ${report.durationMinutes} minutes  
**Lead Responder**: ${report.leadResponder}  
**Correlated Scenario**: ${report.scenario}  

---

## 1. Executive Summary
${report.executiveSummary}

---

## 2. SLO & Error Budget Impact
- **Service Level Indicator (SLI) Breached**: ${report.sloImpact.sliBreached ? 'YES' : 'NO'}
- **Estimated Service Downtime**: ${report.sloImpact.downtimeMinutes} minutes
- **30-Day Error Budget Consumed**: ${report.sloImpact.budgetBurnedPercent}%

---

## 3. Forensic Telemetry Snapshot at Incident Peak
| Metric Dimension | Recorded Telemetry |
| :--- | :--- |
| **CPU Core Utilization** | ${report.triggerTelemetry.cpu} |
| **Memory Allocation** | ${report.triggerTelemetry.memory} |
| **Disk Storage Ingress** | ${report.triggerTelemetry.disk} |
| **Network Bandwidth** | ${report.triggerTelemetry.network} |
| **Event Loop Lag** | ${report.triggerTelemetry.lag} |

---

## 4. Incident Timeline
${report.timeline.map((t) => `- **${t.timestamp}**: ${t.description} *(Telemetry: \`${t.metricState}\`)*`).join('\n')}

---

## 5. Root Cause Analysis (5-Whys Methodology)
${report.rootCause5Whys.map((w, i) => `${i + 1}. ${w}`).join('\n')}

---

## 6. Corrective & Preventative Action Items
| Priority | Action Item | Owner | Status |
| :--- | :--- | :--- | :--- |
${report.preventativeActions.map((a) => `| **${a.priority}** | ${a.action} | ${a.owner} | \`${a.status}\` |`).join('\n')}

---
*Report automatically generated by SRE Telemetry & Automated Runbook Engine.*
`;
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(generateMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleDownloadMarkdown = () => {
    const md = generateMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `incident-postmortem-${report.id.toLowerCase()}-${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div
      id="post-mortem-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="post-mortem-dialog"
        className="w-full max-w-5xl rounded-2xl border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col max-h-[92vh] overflow-hidden transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-500/10 border border-purple-300 dark:border-purple-500/30 text-purple-700 dark:text-purple-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  SRE Blameless Post-Mortem Generator
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 border border-purple-300 dark:border-purple-500/30 text-purple-800 dark:text-purple-300">
                  {report.id}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate industry-standard Root Cause Analysis (RCA) reports with timelines, 5-Whys, and action items
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-copy-postmortem"
              onClick={handleCopyMarkdown}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-mono font-semibold transition-colors flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied Markdown!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy Markdown
                </>
              )}
            </button>
            <button
              id="btn-download-postmortem"
              onClick={handleDownloadMarkdown}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold transition-colors flex items-center gap-1.5 shadow-md"
            >
              <Download className="w-3.5 h-3.5" /> Download .md
            </button>
            <button
              id="btn-close-postmortem"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scenario Filter / Selector */}
        <div className="mt-3.5 flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs font-mono">
          <span className="text-slate-500 dark:text-slate-400">Generate Report For Incident Scenario:</span>
          <div className="flex items-center gap-1.5">
            {(['MEMORY_LEAK', 'CPU_STORM', 'DISK_FILL', 'NETWORK_FLOOD'] as SimulationScenario[]).map((sc) => (
              <button
                key={sc}
                onClick={() => setSelectedScenario(sc)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  selectedScenario === sc
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {sc.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Report Preview Body */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Metadata banner */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {report.title}
              </h3>
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800">
                  {report.severity}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Duration: {report.durationMinutes}m
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs font-mono text-slate-600 dark:text-slate-400">
              <div>
                <span className="text-[10px] text-slate-400 block">Incident Date</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{report.incidentDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Lead Responder</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{report.leadResponder}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Error Budget Burned</span>
                <span className="font-semibold text-rose-600 dark:text-rose-400">{report.sloImpact.budgetBurnedPercent}%</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Downtime</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{report.sloImpact.downtimeMinutes} min</span>
              </div>
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
            <h4 className="text-xs font-bold font-mono uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-2">
              1. Executive Summary
            </h4>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {report.executiveSummary}
            </p>
          </div>

          {/* Section 2: Forensic Telemetry Snapshot */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
            <h4 className="text-xs font-bold font-mono uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-2">
              2. Forensic Telemetry at Incident Peak
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">CPU Core</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{report.triggerTelemetry.cpu}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Memory</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{report.triggerTelemetry.memory}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Disk</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{report.triggerTelemetry.disk}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Network</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{report.triggerTelemetry.network}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block">Event Loop Lag</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{report.triggerTelemetry.lag}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Timeline */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
            <h4 className="text-xs font-bold font-mono uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-2">
              3. Chronological Incident Timeline
            </h4>
            <div className="space-y-2 font-mono text-xs">
              {report.timeline.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 w-16 shrink-0">
                    {item.timestamp}
                  </span>
                  <div className="flex-1">
                    <span className="text-slate-800 dark:text-slate-200">{item.description}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5 font-sans">
                      Recorded State: {item.metricState}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: 5-Whys Root Cause */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
            <h4 className="text-xs font-bold font-mono uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-2">
              4. Root Cause Analysis (5-Whys)
            </h4>
            <div className="space-y-2 text-xs">
              {report.rootCause5Whys.map((why, i) => (
                <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="font-mono font-bold text-purple-600 dark:text-purple-400 shrink-0">
                    Why #{i + 1}:
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 leading-relaxed">{why}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Preventative Action Items */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
            <h4 className="text-xs font-bold font-mono uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-2">
              5. Preventative Action Items (CAPA)
            </h4>
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="py-2 px-3">Priority</th>
                    <th className="py-2 px-3">Action Item</th>
                    <th className="py-2 px-3">Owner</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {report.preventativeActions.map((action, i) => (
                    <tr key={i} className="bg-white dark:bg-slate-900">
                      <td className="py-2 px-3 font-bold text-purple-600 dark:text-purple-400">
                        {action.priority}
                      </td>
                      <td className="py-2 px-3 text-slate-800 dark:text-slate-200 font-sans">
                        {action.action}
                      </td>
                      <td className="py-2 px-3 text-slate-500 dark:text-slate-400">
                        {action.owner}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            action.status === 'DONE'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : action.status === 'IN_PROGRESS'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {action.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
            Adheres to Google SRE Handbook blameless culture guidelines
          </span>
          <span>Markdown Export Ready</span>
        </div>
      </div>
    </div>
  );
};
