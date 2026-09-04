import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  id: string;
  title: string;
  icon: LucideIcon;
  value: string | number;
  unit: string;
  secondaryValue?: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  sparklineData: number[];
  min: number;
  max: number;
  avg: number;
  zScore?: number;
  isSelected?: boolean;
  shortcutKey?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  title,
  icon: Icon,
  value,
  unit,
  secondaryValue,
  status,
  sparklineData,
  min,
  max,
  avg,
  zScore,
  isSelected,
  shortcutKey,
  onClick,
}) => {
  const isWarning = status === 'WARNING';
  const isCritical = status === 'CRITICAL';

  // Status-dependent colors
  const borderColor = isCritical
    ? 'border-rose-500/50 hover:border-rose-500 shadow-rose-500/10'
    : isWarning
    ? 'border-amber-500/50 hover:border-amber-500 shadow-amber-500/10'
    : isSelected
    ? 'border-cyan-500 dark:border-cyan-400 shadow-cyan-500/20'
    : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700';

  const glowColor = isCritical
    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
    : isWarning
    ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
    : 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400';

  const strokeColor = isCritical ? '#f43f5e' : isWarning ? '#f59e0b' : '#06b6d4';

  // Generate SVG path for sparkline
  const sparklineSvg = React.useMemo(() => {
    if (sparklineData.length < 2) return '';
    const width = 160;
    const height = 44;
    const padding = 3;

    const dataMin = Math.min(...sparklineData);
    const dataMax = Math.max(...sparklineData);
    const range = dataMax - dataMin || 1;

    const points = sparklineData.map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * (width - padding * 2) + padding;
      const normalized = (val - dataMin) / range;
      const y = height - padding - normalized * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${points.join(' L ')}`;
  }, [sparklineData]);

  return (
    <div
      id={id}
      onClick={onClick}
      className={`relative cursor-pointer rounded-xl border p-4 bg-white/95 dark:bg-slate-900/80 backdrop-blur-md transition-all duration-200 shadow-md dark:shadow-lg ${borderColor} ${
        isSelected ? 'ring-2 ring-cyan-500/30 dark:ring-cyan-500/40' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg transition-colors ${glowColor}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {zScore !== undefined && Math.abs(zScore) > 1.8 && (
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                Math.abs(zScore) > 2.5
                  ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/40 animate-pulse'
                  : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40'
              }`}
            >
              Z: {zScore > 0 ? `+${zScore}` : zScore}
            </span>
          )}

          {shortcutKey && (
            <kbd
              title={`Press '${shortcutKey}' to switch to ${title}`}
              className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border shadow-sm transition-all ${
                isSelected
                  ? 'bg-cyan-100 dark:bg-cyan-950/90 border-cyan-400 dark:border-cyan-500/80 text-cyan-800 dark:text-cyan-300 ring-1 ring-cyan-500/30'
                  : 'bg-slate-100 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {shortcutKey}
            </kbd>
          )}
        </div>
      </div>

      <div className="flex items-baseline justify-between mt-2">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
              {value}
            </span>
            <span className="text-xs font-semibold font-mono text-slate-500 dark:text-slate-400">
              {unit}
            </span>
          </div>
          {secondaryValue && (
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
              {secondaryValue}
            </div>
          )}
        </div>

        {/* Sparkline */}
        <div className="w-28 h-10 flex items-center justify-end">
          {sparklineSvg && (
            <svg className="w-full h-full overflow-visible" viewBox="0 0 160 44">
              <path
                d={sparklineSvg}
                fill="none"
                stroke={strokeColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Min / Avg / Max stats bar */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
        <div>
          <span className="text-slate-400 dark:text-slate-500">Min:</span> <span className="text-slate-700 dark:text-slate-300 font-semibold">{min}{unit}</span>
        </div>
        <div>
          <span className="text-slate-400 dark:text-slate-500">Avg:</span> <span className="text-slate-700 dark:text-slate-300 font-semibold">{avg}{unit}</span>
        </div>
        <div>
          <span className="text-slate-400 dark:text-slate-500">Max:</span> <span className="text-slate-700 dark:text-slate-300 font-semibold">{max}{unit}</span>
        </div>
      </div>
    </div>
  );
};
