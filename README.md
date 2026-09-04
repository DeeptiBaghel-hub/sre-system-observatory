# Real-Time System Observatory & AI Predictive SRE Platform

A production-grade, full-stack observability platform and automated reliability engineering system. Designed for high-velocity infrastructure environments, this platform unifies real-time kernel telemetry, statistical anomaly detection ($Z$-score outlier models), predictive capacity forecasting (OLS regression), SRE Service Level Objectives (SLOs & error budget burn rates), interactive Linux process management with POSIX signal dispatch, automated self-healing runbooks, and Gemini AI-assisted incident root cause forensics.

---

## 🏗️ System Architecture

```text
 ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
 │                                   CLIENT / REACT OBSERVATORY (SPA)                              │
 │                                                                                                 │
 │  ┌─────────────────────────┐  ┌────────────────────────┐  ┌──────────────────────────────────┐  │
 │  │    Sparkline Cards      │  │  Custom SVG Telemetry  │  │        SLO & Error Budget        │  │
 │  │  CPU, RAM, Disk, Net,   │  │  Historical Telemetry  │  │  99.9% Target, Burn Rates (1x-   │  │
 │  │  Event Loop Lag + Z-Scr │  │  + Forecast Horizon    │  │  14x), MTTR & Breach Countdown   │  │
 │  └───────────▲─────────────┘  └───────────▲────────────┘  └────────────────▲─────────────────┘  │
 │              │                            │                                │                    │
 │  ┌───────────┴────────────────────────────┴────────────────────────────────┴──────────────────┐  │
 │  │          WebSocket Telemetry Streamer & Keyboard Command Listener (C, M, K, R, O, P, T)     │  │
 │  └──────────────────────────┬───────────────────────────────────────────────▲────────────────┘  │
 └─────────────────────────────┼───────────────────────────────────────────────┼───────────────────┘
                               │ HTTP / WebSocket (Port 3000)                  │
 ┌─────────────────────────────▼───────────────────────────────────────────────┴───────────────────┐
 │                                 EXPRESS NODE.JS TELEMETRY ENGINE                                │
 │                                                                                                 │
 │  ┌───────────────────────────────────────────────────────────────────────────────────────────┐  │
 │  │                             WebSocket Broadcasting Hub (1 Hz)                             │  │
 │  │  - JSON broadcast streaming to all connected browser sessions                             │  │
 │  │  - In-memory 300-point circular telemetry buffer for instant hydration & CSV export       │  │
 │  └───────────────────────────────▲───────────────────────────────────────────────────────────┘  │
 │                                  │                                                              │
 │  ┌───────────────────────────────┴───────────────────────────────────────────────────────────┐  │
 │  │                         Kernel Metrics Collector (OS & Node Runtime)                       │  │
 │  │  - CPU: os.cpus() differential tick calculation across user/sys/idle time                │  │
 │  │  - Memory: process.memoryUsage() + os.totalmem() / os.freemem()                           │  │
 │  │  - Event Loop Lag: High-resolution monotonic timers tracking libuv loop latency           │  │
 │  │  - Linux Processes: Dynamic PID process table with renice priority & signal state          │  │
 │  └───────────────────────────────▲───────────────────────────────────────────────────────────┘  │
 │                                  │                                                              │
 │  ┌───────────────────────────────┴───────────────────────────────────────────────────────────┐  │
 │  │                         Statistical Anomaly & Predictive Horizon                          │  │
 │  │  - Rolling Z-Score (|Z| > 2.5 flagged as statistical anomaly against dynamic window)      │  │
 │  │  - Ordinary Least Squares (OLS) Linear Regression for slope (m) & intercept (c)           │  │
 │  │  - Predictive Time-to-Exhaustion (TTX) calculation for early warning notifications        │  │
 │  └───────────────────────────────▲───────────────────────────────────────────────────────────┘  │
 │                                  │                                                              │
 │  ┌───────────────────────────────┴───────────────────────────────┐  ┌────────────────────────┐  │
 │  │              Chaos & Failure Injection Engine                 │  │ Google Gemini AI Agent │  │
 │  │  - Memory Leak, CPU Storm, Disk Pressure, Network Spike       │  │ Root cause forensics & │  │
 │  │  - Automated Self-Healing Runbooks & POSIX Signal Dispatch     │  │ blameless post-mortem  │  │
 │  └───────────────────────────────────────────────────────────────┘  └────────────────────────┘  │
 └─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Key Technical Highlights (Resume / Portfolio Impact)

1. **Sub-Second Kernel Telemetry & Ingress Streaming**:
   - Computes delta CPU metrics between system clock ticks rather than reading static averages.
   - Measures event loop latency via high-resolution monotonic timestamps (`performance.now()`), detecting thread pool starvation and garbage collection pauses.
   - In-memory circular buffer retains 300 data points for zero-latency client hydration and exportable diagnostic datasets.

2. **Mathematical Outlier & Anomaly Detection**:
   - **Dynamic Z-Score ($Z = \frac{x - \mu}{\sigma}$)**: Tracks mean and rolling standard deviation over sliding windows. Spikes exceeding $|Z| \ge 2.5$ automatically trigger predictive anomaly alerts before hardware saturation occurs.
   - **OLS Linear Regression Forecasting**: Projects metric trajectories 30 seconds into the future ($y = mx + b$), computing estimated Time-to-Exhaustion (TTX) for system memory and disk storage.

3. **SRE Service Level Objectives (SLOs) & Error Budget Burn Rates**:
   - Real-time 99.9% uptime target evaluation based on multi-dimensional SLIs (CPU < 85%, Latency < 10ms, Memory < 85%).
   - Multi-window burn rate monitoring (1x nominal vs. 14.4x critical budget consumption) with estimated hours to budget exhaustion and MTTR tracking.

4. **Automated Self-Healing & Runbook Orchestration**:
   - Interactive runbook engine with pre-flight parameter verification and step-by-step mitigation execution.
   - Restores service health automatically by pruning runaway memory leaks, throttling worker threads, and clearing transient buffer caches.

5. **Kernel Process & Thread Inspector**:
   - Real-time process explorer inspecting PID, process command, state (Running, Sleeping, Zombie), user, nice value, CPU%, and Memory%.
   - Live signal dispatch: `SIGTERM` (Graceful shutdown), `SIGKILL` (Force kill), and POSIX `renice` priority tuning (-20 to 19).

6. **Gemini AI Root Cause Forensics & Blameless Post-Mortem**:
   - Server-side Gemini integration analyzes historical anomaly streams, failure signatures, and kernel stats to generate structured diagnostic reports and exportable Markdown post-mortems.

---

## 🛠️ Tech Stack & Architecture Design

| Layer | Technology | Key Responsibility |
|---|---|---|
| **Frontend Framework** | React 18, TypeScript, Vite | Zero-dependency reactive UI with strict typed interfaces |
| **Styling & Theme** | Tailwind CSS, Lucide Icons | Dark/Light theme switching, high-contrast SRE typography |
| **Data Visualization** | Custom SVG Canvas | Dual-axis telemetry charts, forecast horizons, and responsive sparklines |
| **Backend Server** | Node.js, Express, TypeScript | REST endpoints, process simulation, and telemetry aggregation |
| **Real-Time Streaming** | WebSocket (`ws` protocol) | Low-overhead 1 Hz binary/JSON broadcast channel |
| **AI Analysis** | `@google/genai` (Gemini API) | Root-cause analysis, impact assessment, and post-mortems |
| **Statistical Engine** | Custom Numerical Algorithms | Sliding window Z-score calculation, OLS linear regression |

---

## 📂 Project Structure

```text
├── server/
│   ├── metricsCollector.ts       # Telemetry aggregation, process table, and anomaly simulation
│   └── geminiDiagnosis.ts        # Server-side Gemini AI root-cause forensic engine
├── server.ts                     # Express HTTP & WebSocket server, REST API routing
├── src/
│   ├── components/
│   │   ├── Header.tsx            # Navigation, status indicators, and modal triggers
│   │   ├── MetricCard.tsx        # Sparklines, min/max/avg, and current telemetry cards
│   │   ├── TelemetryChart.tsx    # Dual-axis SVG visualization with forecast horizon
│   │   ├── SloTracker.tsx        # SRE SLO 99.9% tracker, error budget burn rates, MTTR
│   │   ├── ProcessTaskManager.tsx# Process table, renice priority, SIGTERM/SIGKILL dispatch
│   │   ├── SelfHealingModal.tsx  # Automated self-healing runbook execution modal
│   │   ├── PostMortemModal.tsx   # Blameless SRE post-mortem report generator & exporter
│   │   ├── StressLabModal.tsx    # Chaos injection lab (Memory leak, CPU storm, etc.)
│   │   ├── AiDiagnosisModal.tsx  # Gemini AI forensic diagnostics report modal
│   │   ├── AlertHistoryFeed.tsx  # Real-time anomaly feed and threshold settings
│   │   ├── SystemSpecBar.tsx     # OS kernel metadata, CPU model, host architecture
│   │   └── KeyboardShortcutsModal.tsx # Keyboard navigation guide
│   ├── context/
│   │   └── ThemeContext.tsx      # Dark/light theme persistence and DOM class synchronization
│   ├── utils/
│   │   └── csvExport.ts          # Telemetry export with configurable column selection
│   ├── types.ts                  # Shared TypeScript interfaces (processes, runbooks, SLOs)
│   ├── App.tsx                   # Main dashboard workspace, WebSocket lifecycle, shortcuts
│   └── main.tsx                  # React DOM root entry point
├── metadata.json                 # AI Studio configuration and capability declarations
└── package.json                  # Dependencies and build scripts
```

---

## ⚡ Keyboard Shortcuts (SRE Hotkeys)

The observatory provides instant, single-key shortcuts for rapid incident response:

| Key | Action | Description |
|---|---|---|
| `C` or `1` | Select CPU Metric | Focus chart and statistics on CPU Usage |
| `M` or `2` | Select Memory Metric | Focus chart and statistics on System RAM |
| `D` or `3` | Select Disk Metric | Focus chart and statistics on Disk Capacity |
| `N` or `4` | Select Network Metric | Focus chart and statistics on Network Ingress/Egress |
| `L` or `5` | Select Latency Metric | Focus chart and statistics on Node.js Event Loop Lag |
| `←` / `→` | Cycle Metrics | Step sequentially through monitored subsystems |
| `P` | Pause / Resume | Freeze live stream to inspect a point in time without losing data |
| `T` | Toggle Theme | Switch between Dark Observatory and High-Contrast Light mode |
| `K` | Process Manager | Inspect processes, dispatch SIGTERM/SIGKILL, renice priority |
| `R` | SRE Runbooks | Launch automated self-healing remediation workflows |
| `O` | Post-Mortem | Generate and download blameless SRE incident post-mortem |
| `?` | Keyboard Guide | Open comprehensive keyboard shortcut reference modal |
| `Esc` | Close Modal | Dismiss any active dialog or inspection overlay |

---

## 📡 REST API Reference

### 1. Live Telemetry
- **`GET /api/telemetry/live`**
  - Returns current telemetry snapshot, 30-point forecast, failure predictions, host info, and composite health score.

### 2. Historical Telemetry Buffer
- **`GET /api/telemetry/history`**
  - Returns array of up to 300 historical data points collected at 1 Hz intervals.

### 3. Scenario / Chaos Injection
- **`POST /api/telemetry/scenario`**
  - Body: `{ "scenario": "NORMAL" | "MEMORY_LEAK" | "DISK_FILL" | "CPU_STORM" | "NETWORK_SPIKE" }`
  - Injects synthetic hardware saturation patterns to test anomaly models and self-healing systems.

### 4. Kernel Process Management
- **`GET /api/processes`**
  - Returns current active process table with PIDs, CPU%, Memory%, state, and priority.
- **`POST /api/processes/:pid/signal`**
  - Body: `{ "signal": "SIGTERM" | "SIGKILL" | "RENICE", "priority": -20..19 }`
  - Dispatches POSIX signals to terminate processes or adjust execution priority.

### 5. Automated Runbook Remediation
- **`POST /api/runbooks/execute`**
  - Body: `{ "runbookId": "runbook-oom-drain" | "runbook-cpu-throttle" | "runbook-disk-cleanup" }`
  - Executes automated runbook steps, clears anomalous workloads, and restores nominal state.

### 6. AI Root Cause Forensics
- **`POST /api/diagnose`**
  - Body: `{ "recentMetrics": [...], "predictions": [...], "scenario": "..." }`
  - Leverages Google Gemini to deliver root cause analysis, risk severity, and remediation steps.

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (optional: set GEMINI_API_KEY for live AI forensics)
cp .env.example .env

# 3. Start development server (serves Vite frontend + Express backend on port 3000)
npm run dev

# 4. Production build
npm run build
npm start
```

---

## 🛡️ License

MIT License. Designed for site reliability engineers, infrastructure developers, and systems architects.
