import React, { useState } from 'react';
import { RunbookPlaybook, RunbookExecutionLog, SimulationScenario } from '../types.js';
import { Wrench, Play, CheckCircle2, AlertCircle, Clock, ShieldCheck, Terminal, ArrowRight, History, X } from 'lucide-react';

interface SelfHealingModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeScenario: SimulationScenario;
  onScenarioMitigated?: (scenario: SimulationScenario) => void;
}

const PLAYBOOKS: RunbookPlaybook[] = [
  {
    id: 'RESTART_WORKER_LEAK',
    title: 'V8 Heap Drain & Subprocess Restart',
    description: 'Forces garbage collection cycle, drains rogue event queue workers, and initializes clean subprocess replicas.',
    targetScenario: 'MEMORY_LEAK',
    category: 'RESTART',
    estimatedRecoveryTimeSec: 4,
    steps: [
      {
        stepNumber: 1,
        title: 'Force V8 Garbage Collection',
        command: 'node --expose-gc -e "if (global.gc) global.gc()"',
        status: 'PENDING',
        outputLog: 'Heap snapshot requested. Reclaiming 240 MB fragmented Buffer allocations.',
      },
      {
        stepNumber: 2,
        title: 'Gracefully Drain Leaking Worker Subprocesses',
        command: 'pkill -SIGTERM -f "worker-event-cache.js"',
        status: 'PENDING',
        outputLog: 'Drained 1 rogue worker thread. Active connections cleanly completed.',
      },
      {
        stepNumber: 3,
        title: 'Re-spawn Clean Worker Pool Replicas',
        command: 'pm2 reload app-worker --update-env',
        status: 'PENDING',
        outputLog: 'Spawned 2 worker instances with fresh 48MB baseline memory envelopes.',
      },
      {
        stepNumber: 4,
        title: 'Validate Telemetry Canary Verification',
        command: 'curl -sf http://localhost:3000/api/health',
        status: 'PENDING',
        outputLog: 'HTTP 200 OK. Memory growth rate normalized to 0.0 MB/s.',
      },
    ],
    successMessage: 'Memory leak mitigated. Rogue workers terminated and memory baseline restored.',
  },
  {
    id: 'THROTTLE_CPU_BURST',
    title: 'Adaptive Concurrency Throttling & CFS Renice',
    description: 'Activates token-bucket rate-limiting, scales compute replicas, and deprioritizes runaway crypto threads.',
    targetScenario: 'CPU_STORM',
    category: 'THROTTLE',
    estimatedRecoveryTimeSec: 3,
    steps: [
      {
        stepNumber: 1,
        title: 'Engage Kernel Token Bucket Rate-Limiter',
        command: 'iptables -A INPUT -p tcp --dport 3000 -m limit --limit 100/s -j ACCEPT',
        status: 'PENDING',
        outputLog: 'Burst rate limit active (100 req/sec cap with 200 token burst).',
      },
      {
        stepNumber: 2,
        title: 'Renice Runaway Compute Threads',
        command: 'renice +15 -p $(pgrep crypto-hasher-worker)',
        status: 'PENDING',
        outputLog: 'Lowered priority from nice -5 to nice +15 on CPU thread pool.',
      },
      {
        stepNumber: 3,
        title: 'Autoscale Compute Replicas via Cluster Autoscaler',
        command: 'kubectl scale deployment/backend-api --replicas=3',
        status: 'PENDING',
        outputLog: 'Scaled deployment to 3 pods. Request distribution balanced.',
      },
      {
        stepNumber: 4,
        title: 'Telemetry CPU Saturation Check',
        command: 'sar -u 1 1',
        status: 'PENDING',
        outputLog: 'CPU core utilization decreased to 22.4%. Event loop lag < 2ms.',
      },
    ],
    successMessage: 'CPU storm contained. Workload redistributed across autoscaled workers.',
  },
  {
    id: 'ROTATE_DISK_LOGS',
    title: 'WAL Segment Rotation & Ephemeral Inode Vacuum',
    description: 'Rotates uncompressed database write-ahead logs, purges temporary scratch buffers, and reclaims disk capacity.',
    targetScenario: 'DISK_FILL',
    category: 'CLEANUP',
    estimatedRecoveryTimeSec: 3,
    steps: [
      {
        stepNumber: 1,
        title: 'Trigger PostgreSQL WAL Checkpoint & Archive',
        command: 'psql -U postgres -c "CHECKPOINT; SELECT pg_switch_wal();"',
        status: 'PENDING',
        outputLog: 'WAL sequence completed. 14 expired log segments flagged for archival.',
      },
      {
        stepNumber: 2,
        title: 'Execute Logrotate Vacuum on /var/log',
        command: 'logrotate -f /etc/logrotate.d/wal-collector',
        status: 'PENDING',
        outputLog: 'Compressed 8.4 GB of uncompressed logs to zstd archives.',
      },
      {
        stepNumber: 3,
        title: 'Flush Ephemeral Temporary Directory Buffers',
        command: 'find /tmp -name "*.tmp" -mmin +5 -delete',
        status: 'PENDING',
        outputLog: 'Purged 1,420 scratch cache buffers. Reclaimed 6.2 GB volume space.',
      },
      {
        stepNumber: 4,
        title: 'Validate Inode & Storage Ingress Capacity',
        command: 'df -h /',
        status: 'PENDING',
        outputLog: 'Root volume capacity nominal: 68.4% used (31.6% headroom available).',
      },
    ],
    successMessage: 'Disk capacity restored. Write-ahead logs rotated and scratch buffers purged.',
  },
  {
    id: 'FILTER_NETWORK_FLOOD',
    title: 'Edge Ingress SYN Cookie Filter & Rate Limiting',
    description: 'Enables kernel TCP SYN cookies, dynamically drops unauthenticated burst CIDRs, and relieves ingress proxies.',
    targetScenario: 'NETWORK_FLOOD',
    category: 'DRAIN',
    estimatedRecoveryTimeSec: 4,
    steps: [
      {
        stepNumber: 1,
        title: 'Enable Kernel TCP SYN Cookies',
        command: 'sysctl -w net.ipv4.tcp_syncookies=1 net.ipv4.tcp_max_syn_backlog=4096',
        status: 'PENDING',
        outputLog: 'TCP SYN flood protection active. SYN backlog ceiling expanded to 4096.',
      },
      {
        stepNumber: 2,
        title: 'Deploy Ingress Shield Rate-Limiting Rules',
        command: 'nft add rule ip filter input ip saddr 198.51.100.0/24 drop',
        status: 'PENDING',
        outputLog: 'Dropped 48,000 malformed connection attempts from anomalous source ASN.',
      },
      {
        stepNumber: 3,
        title: 'Drain Stale Socket Descriptors',
        command: 'ss -K dst :3000 state CLOSE-WAIT',
        status: 'PENDING',
        outputLog: 'Flushed 3,100 half-open sockets. Memory queue reclaimed.',
      },
      {
        stepNumber: 4,
        title: 'Canary Ingress Latency Verification',
        command: 'ping -c 3 127.0.0.1 && netstat -s | grep "listen drops"',
        status: 'PENDING',
        outputLog: 'Ingress Rx nominal (140 KB/s). Zero packet loss reported.',
      },
    ],
    successMessage: 'Network flood filtered. Ingress traffic stabilized within nominal SLA.',
  },
];

export const SelfHealingModal: React.FC<SelfHealingModalProps> = ({
  isOpen,
  onClose,
  activeScenario,
  onScenarioMitigated,
}) => {
  const [selectedPlaybook, setSelectedPlaybook] = useState<RunbookPlaybook>(PLAYBOOKS[0]);
  const [executingStepIndex, setExecutingStepIndex] = useState<number>(-1);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [executionLogs, setExecutionLogs] = useState<RunbookExecutionLog[]>([
    {
      id: 'exec-prev-1',
      timestamp: Date.now() - 360000,
      playbookId: 'RESTART_WORKER_LEAK',
      playbookTitle: 'V8 Heap Drain & Subprocess Restart',
      triggeredBy: 'SRE_Auto_Agent (Gemini Hook)',
      status: 'SUCCESS',
      durationMs: 2420,
      mitigatedScenario: 'MEMORY_LEAK',
      stepsExecuted: [],
    },
  ]);
  const [activeTab, setActiveTab] = useState<'playbooks' | 'history'>('playbooks');

  if (!isOpen) return null;

  const handleExecutePlaybook = async (playbook: RunbookPlaybook) => {
    setIsExecuting(true);
    setTerminalLogs([
      `[SRE-ENGINE] Initializing automated self-healing runbook: ${playbook.title}`,
      `[AUTH] Authenticated as role: Production_SRE_Automator (Privilege Level: Tier-1)`,
      `[TARGET] Correlated active scenario: ${activeScenario}`,
      '----------------------------------------------------------------------------',
    ]);

    for (let i = 0; i < playbook.steps.length; i++) {
      setExecutingStepIndex(i);
      const step = playbook.steps[i];
      setTerminalLogs((prev) => [
        ...prev,
        `[STEP ${step.stepNumber}/4] Executing: ${step.command}`,
      ]);

      // Simulate step duration
      await new Promise((resolve) => setTimeout(resolve, 800));

      setTerminalLogs((prev) => [
        ...prev,
        `   ↳ ${step.outputLog}`,
        `[STEP ${step.stepNumber}/4] ✓ Completed successfully`,
      ]);
    }

    try {
      // Execute backend mitigation
      const res = await fetch('/api/runbooks/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playbookId: playbook.id }),
      });
      const data = await res.json();

      setTerminalLogs((prev) => [
        ...prev,
        '----------------------------------------------------------------------------',
        `[SRE-ENGINE] ${data.message}`,
        `[VERIFICATION] Telemetry stream verified: System returning to OPTIMAL state.`,
      ]);

      const newLog: RunbookExecutionLog = {
        id: `exec-${Date.now()}`,
        timestamp: Date.now(),
        playbookId: playbook.id,
        playbookTitle: playbook.title,
        triggeredBy: 'Manual SRE Operator (Console)',
        status: 'SUCCESS',
        durationMs: playbook.estimatedRecoveryTimeSec * 1000,
        mitigatedScenario: playbook.targetScenario as SimulationScenario,
        stepsExecuted: playbook.steps,
      };

      setExecutionLogs((prev) => [newLog, ...prev]);

      if (onScenarioMitigated) {
        onScenarioMitigated(playbook.targetScenario as SimulationScenario);
      }
    } catch (err) {
      console.error('Runbook execution error:', err);
      setTerminalLogs((prev) => [
        ...prev,
        `[ERROR] Failed to dispatch runbook command to host daemon.`,
      ]);
    } finally {
      setIsExecuting(false);
      setExecutingStepIndex(-1);
    }
  };

  return (
    <div
      id="self-healing-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="self-healing-dialog"
        className="w-full max-w-5xl rounded-2xl border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col max-h-[92vh] overflow-hidden transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Automated Self-Healing &amp; SRE Runbooks
                </h2>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300">
                  Zero-Downtime Playbooks
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Execute automated mitigation procedures to remediate anomalies and restore healthy SLO baselines
              </p>
            </div>
          </div>

          <button
            id="btn-close-self-healing"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="mt-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('playbooks')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors flex items-center gap-1.5 ${
                activeTab === 'playbooks'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" /> Available Playbooks
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <History className="w-3.5 h-3.5" /> Execution Audit Trail ({executionLogs.length})
            </button>
          </div>

          {activeScenario !== 'NORMAL' && (
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 px-2.5 py-1 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5" />
              Active Anomaly: {activeScenario}
            </div>
          )}
        </div>

        {/* Tab Body */}
        {activeTab === 'playbooks' ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-y-auto">
            {/* Playbook List */}
            <div className="md:col-span-1 space-y-2 overflow-y-auto max-h-[500px] pr-1">
              {PLAYBOOKS.map((pb) => {
                const isTargetMatch = activeScenario === pb.targetScenario;
                const isSelected = selectedPlaybook.id === pb.id;
                return (
                  <button
                    key={pb.id}
                    onClick={() => setSelectedPlaybook(pb)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {pb.category}
                      </span>
                      {isTargetMatch && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300">
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-xs font-bold text-slate-900 dark:text-white">
                      {pb.title}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                      {pb.description}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-slate-400">
                      <Clock className="w-3 h-3" /> ~{pb.estimatedRecoveryTimeSec}s MTTR
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Playbook Details & Runner */}
            <div className="md:col-span-2 flex flex-col space-y-4 max-h-[500px] overflow-y-auto">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {selectedPlaybook.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Target Condition: <span className="font-mono font-semibold">{selectedPlaybook.targetScenario}</span>
                    </p>
                  </div>

                  <button
                    id="btn-execute-playbook"
                    onClick={() => handleExecutePlaybook(selectedPlaybook)}
                    disabled={isExecuting}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all shadow-md hover:shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isExecuting ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" /> Executing Playbook...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" /> Run Playbook Now
                      </>
                    )}
                  </button>
                </div>

                {/* Steps Overview */}
                <div className="mt-3 space-y-2">
                  <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 block">
                    Execution Steps ({selectedPlaybook.steps.length}):
                  </span>
                  {selectedPlaybook.steps.map((step, idx) => {
                    const isRunning = isExecuting && executingStepIndex === idx;
                    const isDone = isExecuting && executingStepIndex > idx;
                    return (
                      <div
                        key={step.stepNumber}
                        className={`p-2.5 rounded-lg border text-xs font-mono transition-colors flex items-start gap-2.5 ${
                          isRunning
                            ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                            : isDone
                            ? 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300'
                            : 'border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <div className="mt-0.5">
                          {isRunning ? (
                            <Clock className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                          ) : isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[9px]">
                              {step.stepNumber}
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {step.title}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                            $ {step.command}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Terminal Execution Output */}
              <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-950 text-slate-200 p-3.5 font-mono text-xs flex-1 min-h-[160px] overflow-y-auto">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-[11px] text-slate-400">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Runbook Telemetry &amp; Kernel Execution Log</span>
                </div>
                <div className="mt-2 space-y-1 text-[11px] leading-relaxed">
                  {terminalLogs.length === 0 ? (
                    <span className="text-slate-600">
                      Runbook awaiting execution trigger. Click &quot;Run Playbook Now&quot; to begin remediation sequence.
                    </span>
                  ) : (
                    terminalLogs.map((log, i) => (
                      <div
                        key={i}
                        className={
                          log.includes('[ERROR]')
                            ? 'text-rose-400'
                            : log.includes('✓') || log.includes('SUCCESS')
                            ? 'text-emerald-400 font-semibold'
                            : 'text-slate-300'
                        }
                      >
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Execution History / Audit Trail */
          <div className="mt-4 flex-1 overflow-y-auto">
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Playbook Name</th>
                    <th className="py-2.5 px-3">Triggered By</th>
                    <th className="py-2.5 px-3">Mitigated Scenario</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {executionLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                        {log.playbookTitle}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                        {log.triggeredBy}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-amber-600 dark:text-amber-400">
                        {log.mitigatedScenario}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                        {(log.durationMs / 1000).toFixed(1)}s
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            Signed SRE Automation Pipeline • Playbooks verified against SLO policy
          </span>
          <span>Target MTTR: &lt; 5 seconds</span>
        </div>
      </div>
    </div>
  );
};
