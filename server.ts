import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { MetricsCollector } from './server/metricsCollector.js';
import { AnomalyEngine } from './server/anomalyEngine.js';
import { runAiDiagnosis } from './server/geminiService.js';
import { LiveTelemetryPayload, SimulationScenario } from './src/types.js';

dotenv.config();

const PORT = 3000;
const HOST = '0.0.0.0';

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  const metricsCollector = new MetricsCollector();
  const anomalyEngine = new AnomalyEngine();

  // Pre-seed some nominal history for immediate visualization on startup
  for (let i = 60; i >= 1; i--) {
    const rawPoint = metricsCollector.collect();
    rawPoint.timestamp = Date.now() - i * 1000;
    anomalyEngine.addPoint(rawPoint);
  }

  // --- API Endpoints ---
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.get('/api/metrics/current', (req, res) => {
    const history = anomalyEngine.getHistory();
    const latest = history[history.length - 1];
    res.json(latest || null);
  });

  app.get('/api/metrics/history', (req, res) => {
    res.json(anomalyEngine.getHistory());
  });

  app.get('/api/metrics/export/csv', (req, res) => {
    let history = anomalyEngine.getHistory();

    const windowSec = req.query.windowSec ? Number(req.query.windowSec) : undefined;
    const fromMs = req.query.from ? Number(req.query.from) : undefined;
    const toMs = req.query.to ? Number(req.query.to) : undefined;
    const anomaliesOnly = req.query.anomaliesOnly === 'true';

    if (windowSec && !isNaN(windowSec) && windowSec > 0) {
      const cutoff = Date.now() - windowSec * 1000;
      history = history.filter((pt) => pt.timestamp >= cutoff);
    }
    if (fromMs && !isNaN(fromMs)) {
      history = history.filter((pt) => pt.timestamp >= fromMs);
    }
    if (toMs && !isNaN(toMs)) {
      history = history.filter((pt) => pt.timestamp <= toMs);
    }
    if (anomaliesOnly) {
      history = history.filter((pt) => pt.isAnomaly);
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

    const rows = history.map((pt) => [
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
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `system-telemetry-history-${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  });

  app.post('/api/simulation/scenario', (req, res) => {
    const { scenario } = req.body as { scenario?: SimulationScenario };
    if (!scenario) {
      return res.status(400).json({ error: 'Scenario required' });
    }
    metricsCollector.setScenario(scenario);
    res.json({ success: true, activeScenario: metricsCollector.getScenario() });
  });

  app.get('/api/processes', (req, res) => {
    res.json(metricsCollector.getProcesses());
  });

  app.post('/api/processes/:pid/signal', (req, res) => {
    const pid = Number(req.params.pid);
    const { signal, priority } = req.body as { signal: string; priority?: number };
    if (signal === 'RENICE' && typeof priority === 'number') {
      const result = metricsCollector.reniceProcess(pid, priority);
      return res.json(result);
    }
    const result = metricsCollector.killProcess(pid, signal || 'SIGTERM');
    if (result.mitigatedScenario) {
      broadcastTelemetry();
    }
    res.json(result);
  });

  app.post('/api/runbooks/execute', (req, res) => {
    const { playbookId } = req.body as { playbookId: string };
    if (!playbookId) {
      return res.status(400).json({ error: 'playbookId required' });
    }
    const result = metricsCollector.applyRemediation(playbookId);
    broadcastTelemetry();
    res.json(result);
  });

  app.post('/api/ai/diagnose', async (req, res) => {
    try {
      const history = anomalyEngine.getHistory();
      const current = history[history.length - 1] || metricsCollector.collect();
      const result = anomalyEngine.addPoint(current);
      const report = await runAiDiagnosis(
        current,
        result.predictions,
        result.health,
        history
      );
      res.json(report);
    } catch (err: any) {
      console.error('AI diagnosis endpoint error:', err);
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  });

  // --- WebSocket Connection & Real-Time Broadcast ---
  function broadcastTelemetry() {
    if (wss.clients.size === 0) return;

    const raw = metricsCollector.collect();
    const { pointWithAnomaly, predictions, forecast, health } = anomalyEngine.addPoint(raw);

    const payload: LiveTelemetryPayload = {
      type: 'TELEMETRY_TICK',
      timestamp: pointWithAnomaly.timestamp,
      current: pointWithAnomaly,
      forecast,
      predictions,
      health,
      simulationMode: metricsCollector.getScenario(),
    };

    const message = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  // Sample and broadcast telemetry every 1 second
  setInterval(broadcastTelemetry, 1000);

  wss.on('connection', (clientWs: WebSocket) => {
    // Send initial snapshot with full recent history
    const history = anomalyEngine.getHistory();
    const latest = history[history.length - 1] || metricsCollector.collect();
    const { predictions, forecast, health } = anomalyEngine.addPoint(latest);

    const initialPayload: LiveTelemetryPayload = {
      type: 'INITIAL_SYNC',
      timestamp: latest.timestamp,
      current: latest,
      history,
      forecast,
      predictions,
      health,
      simulationMode: metricsCollector.getScenario(),
    };

    clientWs.send(JSON.stringify(initialPayload));

    clientWs.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.action === 'SET_SCENARIO' && msg.scenario) {
          metricsCollector.setScenario(msg.scenario);
          // Immediately broadcast tick with new scenario
          broadcastTelemetry();
        }
      } catch (e) {
        console.error('Failed to parse client message:', e);
      }
    });
  });

  // --- Vite / Static Assets ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`PulseGuard System Monitor running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
