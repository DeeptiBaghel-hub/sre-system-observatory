import React from 'react';
import { SystemHealthSummary } from '../types.js';
import { Server, Cpu, HardDrive, MemoryStick as Memory, Clock } from 'lucide-react';

interface SystemSpecBarProps {
  hostInfo?: SystemHealthSummary['hostInfo'];
  activeProcesses?: number;
}

export const SystemSpecBar: React.FC<SystemSpecBarProps> = ({ hostInfo, activeProcesses }) => {
  if (!hostInfo) return null;

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m ${seconds % 60}s`;
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/60 shadow-sm p-3 flex flex-wrap items-center justify-between gap-y-2 gap-x-6 text-xs font-mono text-slate-600 dark:text-slate-400 transition-colors">
      <div className="flex items-center gap-2">
        <Server className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
        <span className="text-slate-800 dark:text-slate-300 font-bold">{hostInfo.hostname}</span>
        <span className="text-slate-500 dark:text-slate-400">({hostInfo.platform} / {hostInfo.arch})</span>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>{hostInfo.cpuCores} vCPUs</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Memory className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>{hostInfo.totalMemoryGb} GB RAM</span>
        </div>

        <div className="flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>{hostInfo.totalDiskGb} GB Storage</span>
        </div>

        {activeProcesses !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400" />
            <span>{activeProcesses} Active Procs</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          <span>Uptime: {formatUptime(hostInfo.uptimeSeconds)}</span>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          Node {hostInfo.nodeVersion}
        </div>
      </div>
    </div>
  );
};
