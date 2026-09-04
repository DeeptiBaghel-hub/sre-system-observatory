import { MetricDataPoint } from '../types.js';

export interface CsvExportOptions {
  filenamePrefix?: string;
  startTime?: number; // epoch ms
  endTime?: number; // epoch ms
  onlyAnomalies?: boolean;
}

export interface CsvExportResult {
  success: boolean;
  exportedCount: number;
}

/**
 * Converts metric history data points to RFC-4180 compliant CSV and triggers browser download.
 * Supports optional time-range and anomaly filtering.
 */
export function exportMetricsToCsv(
  history: MetricDataPoint[],
  options?: CsvExportOptions | string
): CsvExportResult {
  if (!history || history.length === 0) {
    return { success: false, exportedCount: 0 };
  }

  // Handle backward compatibility when second argument was filenamePrefix string
  const opts: CsvExportOptions =
    typeof options === 'string'
      ? { filenamePrefix: options }
      : options || {};

  const filenamePrefix = opts.filenamePrefix || 'system-telemetry-history';

  // Apply time range and anomaly filters
  let filtered = history;
  if (opts.startTime !== undefined) {
    filtered = filtered.filter((pt) => pt.timestamp >= opts.startTime!);
  }
  if (opts.endTime !== undefined) {
    filtered = filtered.filter((pt) => pt.timestamp <= opts.endTime!);
  }
  if (opts.onlyAnomalies) {
    filtered = filtered.filter((pt) => pt.isAnomaly);
  }

  if (filtered.length === 0) {
    return { success: false, exportedCount: 0 };
  }

  const headers = [
    'Timestamp (Epoch ms)',
    'Timestamp (ISO)',
    'CPU Utilization (%)',
    'Memory Utilization (%)',
    'Memory Used (MB)',
    'Memory Total (MB)',
    'Disk Utilization (%)',
    'Disk Used (GB)',
    'Disk Total (GB)',
    'Network Rx (KB/s)',
    'Network Tx (KB/s)',
    'Event Loop Lag (ms)',
    'Active Processes',
    'Z-Score CPU',
    'Z-Score Memory',
    'Anomaly Flagged',
  ];

  const rows = filtered.map((pt) => [
    pt.timestamp,
    `"${new Date(pt.timestamp).toISOString()}"`,
    pt.cpuPercent,
    pt.memoryPercent,
    pt.memoryUsedMb,
    pt.memoryTotalMb,
    pt.diskPercent,
    pt.diskUsedGb,
    pt.diskTotalGb,
    pt.networkRxKbps,
    pt.networkTxKbps,
    pt.eventLoopLagMs,
    pt.activeProcesses ?? '',
    pt.zScoreCpu,
    pt.zScoreMem,
    pt.isAnomaly ? 'TRUE' : 'FALSE',
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}-${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, exportedCount: filtered.length };
}

