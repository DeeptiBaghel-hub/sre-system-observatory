import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SystemProcess, SimulationScenario } from '../types.js';
import { Cpu, HardDrive, Search, RefreshCw, Skull, PowerOff, ShieldAlert, ArrowUpDown, Sliders, CheckCircle, X } from 'lucide-react';

interface ProcessTaskManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onScenarioMitigated?: (scenario: SimulationScenario) => void;
}

export const ProcessTaskManager: React.FC<ProcessTaskManagerProps> = ({
  isOpen,
  onClose,
  onScenarioMitigated,
}) => {
  const [processes, setProcesses] = useState<SystemProcess[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'cpuPercent' | 'memoryMb' | 'pid' | 'threads'>('cpuPercent');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const fetchProcesses = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/processes');
      if (res.ok) {
        const data: SystemProcess[] = await res.json();
        setProcesses(data);
      }
    } catch (err) {
      console.error('Failed to load processes:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 2000);
    return () => clearInterval(interval);
  }, [isOpen, fetchProcesses]);

  const handleSendSignal = async (pid: number, signal: 'SIGTERM' | 'SIGKILL') => {
    try {
      const res = await fetch(`/api/processes/${pid}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal }),
      });
      const data = await res.json();
      if (data.success) {
        setActionFeedback(data.message);
        setTimeout(() => setActionFeedback(null), 4000);
        if (data.mitigatedScenario && onScenarioMitigated) {
          onScenarioMitigated(data.mitigatedScenario);
        }
        fetchProcesses();
      }
    } catch (err) {
      console.error('Signal execution failed:', err);
    }
  };

  const handleRenice = async (pid: number, currentPriority: number, delta: number) => {
    const newPriority = currentPriority + delta;
    try {
      const res = await fetch(`/api/processes/${pid}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal: 'RENICE', priority: newPriority }),
      });
      const data = await res.json();
      if (data.success) {
        setActionFeedback(data.message);
        setTimeout(() => setActionFeedback(null), 3000);
        fetchProcesses();
      }
    } catch (err) {
      console.error('Renice execution failed:', err);
    }
  };

  const filteredProcesses = useMemo(() => {
    let list = processes.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.pid.toString().includes(searchQuery)
    );

    list.sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [processes, searchQuery, sortBy, sortAsc]);

  const handleToggleSort = (field: 'cpuPercent' | 'memoryMb' | 'pid' | 'threads') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="process-manager-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="process-manager-dialog"
        className="w-full max-w-5xl rounded-2xl border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col max-h-[92vh] overflow-hidden transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-300 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Kernel Process &amp; Thread Inspector
                </h2>
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 border border-cyan-300 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-300">
                  {processes.length} Processes
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Inspect resource consumption, rogue anomalies, and dispatch kernel signals (SIGTERM / SIGKILL)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-refresh-processes"
              onClick={fetchProcesses}
              disabled={isLoading}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              title="Refresh process list"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              id="btn-close-process-manager"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-mono flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>{actionFeedback}</span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">System state updated</span>
          </div>
        )}

        {/* Search & Sort Bar */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="input-search-processes"
              placeholder="Filter by PID, process name, or command..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 shrink-0">
            <span>Sort By:</span>
            <button
              onClick={() => handleToggleSort('cpuPercent')}
              className={`px-2 py-1 rounded border text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                sortBy === 'cpuPercent'
                  ? 'bg-cyan-100 dark:bg-cyan-950 border-cyan-400 dark:border-cyan-600 text-cyan-800 dark:text-cyan-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              CPU % <ArrowUpDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleToggleSort('memoryMb')}
              className={`px-2 py-1 rounded border text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                sortBy === 'memoryMb'
                  ? 'bg-cyan-100 dark:bg-cyan-950 border-cyan-400 dark:border-cyan-600 text-cyan-800 dark:text-cyan-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              Memory <ArrowUpDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleToggleSort('pid')}
              className={`px-2 py-1 rounded border text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                sortBy === 'pid'
                  ? 'bg-cyan-100 dark:bg-cyan-950 border-cyan-400 dark:border-cyan-600 text-cyan-800 dark:text-cyan-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              PID <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Process Table */}
        <div className="mt-4 flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-950 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <tr>
                <th className="py-2.5 px-3 font-semibold">PID</th>
                <th className="py-2.5 px-3 font-semibold">Process Name &amp; Command</th>
                <th className="py-2.5 px-3 font-semibold">User</th>
                <th className="py-2.5 px-3 font-semibold">State</th>
                <th className="py-2.5 px-3 font-semibold text-right">CPU %</th>
                <th className="py-2.5 px-3 font-semibold text-right">Memory</th>
                <th className="py-2.5 px-3 font-semibold text-center">Priority</th>
                <th className="py-2.5 px-3 font-semibold text-center">Kernel Signals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {filteredProcesses.map((p) => {
                const isRogue = p.isRogue;
                return (
                  <tr
                    key={p.pid}
                    className={`transition-colors ${
                      isRogue
                        ? 'bg-rose-50/70 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">
                      {p.pid}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {p.name}
                        </span>
                        {isRogue && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-900/60 border border-rose-300 dark:border-rose-500/50 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> ROGUE ANOMALY
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-1 max-w-sm">
                        {p.command}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                      {p.user}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          p.status === 'R'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            : p.status === 'D'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                        title={
                          p.status === 'R'
                            ? 'Running (Active compute)'
                            : p.status === 'D'
                            ? 'Uninterruptible sleep (Disk I/O lock)'
                            : 'Sleeping (Waiting on kernel event)'
                        }
                      >
                        {p.status === 'R' ? 'RUN' : p.status === 'D' ? 'DISK_WAIT' : 'SLEEP'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`font-bold ${
                          p.cpuPercent > 50
                            ? 'text-rose-600 dark:text-rose-400'
                            : p.cpuPercent > 10
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {p.cpuPercent}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`font-bold ${
                          p.memoryMb > 500
                            ? 'text-rose-600 dark:text-rose-400'
                            : p.memoryMb > 200
                            ? 'text-cyan-600 dark:text-cyan-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {p.memoryMb} MB
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleRenice(p.pid, p.priority, -1)}
                          className="px-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          title="Increase process priority (-1 nice)"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-slate-700 dark:text-slate-300">
                          {p.priority}
                        </span>
                        <button
                          onClick={() => handleRenice(p.pid, p.priority, 1)}
                          className="px-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          title="Lower process priority (+1 nice)"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          id={`btn-sigterm-${p.pid}`}
                          onClick={() => handleSendSignal(p.pid, 'SIGTERM')}
                          className="px-2 py-1 rounded bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900 text-[11px] font-semibold transition-colors flex items-center gap-1"
                          title="Send SIGTERM (Graceful shutdown)"
                        >
                          <PowerOff className="w-3 h-3" /> SIGTERM
                        </button>
                        <button
                          id={`btn-sigkill-${p.pid}`}
                          onClick={() => handleSendSignal(p.pid, 'SIGKILL')}
                          className="px-2 py-1 rounded bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900 text-[11px] font-semibold transition-colors flex items-center gap-1"
                          title="Send SIGKILL (Force termination)"
                        >
                          <Skull className="w-3 h-3" /> SIGKILL
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer tip */}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono gap-2">
          <span>
            Killing rogue processes automatically remediates anomalous simulation scenarios.
          </span>
          <span className="flex items-center gap-1">
            <span>Kernel Scheduler: CFS (Completely Fair Scheduler)</span>
          </span>
        </div>
      </div>
    </div>
  );
};
