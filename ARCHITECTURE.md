# System Architecture & Technical Specifications

This document details the engineering specifications, statistical algorithms, concurrency model, telemetry collection pipeline, and SRE resilience paradigms implemented in the **Real-Time System Observatory & AI Predictive SRE Platform**.

---

## 1. System Overview & Core Philosophy

Modern cloud-native and platform engineering architectures require microsecond visibility into resource degradation before incidents cause customer-facing downtime. Standard dashboard solutions (e.g., polling every 30–60 seconds) fail to detect transient micro-bursts, thread-pool stalls, and rapid memory leaks.

This platform operates on three foundational principles:
1. **High-Frequency Kernel Ingress (1 Hz)**: Telemetry sampled at single-second resolution directly from the runtime and operating system.
2. **Deterministic Mathematical Forecasting**: Anomaly detection and trajectory projection using lightweight, low-overhead statistical algorithms ($Z$-Score outlier evaluation and Ordinary Least Squares regression) operating on sliding temporal windows.
3. **Closed-Loop SRE Remediation**: Direct feedback from anomaly detection to automated self-healing runbooks and Linux process control (POSIX signals & renice priority adjustment).

---

## 2. Telemetry Ingestion & Concurrency Pipeline

```text
 ┌──────────────────────┐    ┌────────────────────────┐    ┌───────────────────────────┐
 │ Kernel OS / Node.js  │    │  MetricsCollector Hub  │    │     WebSocket Hub         │
 │ os.cpus() / perf_now │───▶│  300-point Ring Buffer │───▶│  1 Hz Broadcast to Active │
 │ process.memory()     │    │  In-Memory Mutex-Safe  │    │  Client Browser Sessions  │
 └──────────────────────┘    └───────────┬────────────┘    └───────────────────────────┘
                                         │
                                         ▼
                             ┌────────────────────────┐
                             │  Statistical Analyzers │
                             │  - Rolling Mean & Std  │
                             │  - Dynamic Z-Score     │
                             │  - OLS Linear Regress  │
                             │  - TTX Countdown       │
                             └────────────────────────┘
```

### 2.1 CPU Utilization Calculation
To avoid reporting instantaneous or deceptive cumulative CPU averages, the collector computes differential delta ticks across sampling windows:
$$\Delta \text{Total} = \sum_{c \in \text{cores}} (\text{user}_t + \text{nice}_t + \text{sys}_t + \text{irq}_t + \text{idle}_t) - \sum_{c \in \text{cores}} (\text{user}_{t-1} + \dots + \text{idle}_{t-1})$$
$$\Delta \text{Idle} = \sum_{c \in \text{cores}} \text{idle}_t - \sum_{c \in \text{cores}} \text{idle}_{t-1}$$
$$\text{CPU \%} = \min\left(100, \max\left(0, \frac{\Delta \text{Total} - \Delta \text{Idle}}{\Delta \text{Total}} \times 100\right)\right)$$

### 2.2 Event Loop Lag Measurement
Node.js processes JavaScript on a single-threaded libuv event loop. CPU utilization alone cannot detect when CPU-bound computation or synchronous I/O blocks the thread. Event loop latency is measured by queuing an immediate timer and comparing monotonic clock deltas:
$$\text{Lag (ms)} = (\text{Clock}_{\text{actual}} - \text{Clock}_{\text{expected}})$$
A sustained event loop lag exceeding 10ms triggers high-priority SRE alerts.

---

## 3. Mathematical Anomaly & Forecasting Engine

### 3.1 Dynamic Z-Score Outlier Flagging
Standard static threshold alerts (e.g., "alert if CPU > 80%") create alert fatigue or fail during off-peak anomalies. The system maintains a sliding window of the last $W = 30$ historical points and calculates the population mean $\mu$ and standard deviation $\sigma$:
$$\mu = \frac{1}{W} \sum_{i=1}^{W} x_i$$
$$\sigma = \sqrt{\frac{1}{W} \sum_{i=1}^{W} (x_i - \mu)^2}$$
$$Z = \frac{x_t - \mu}{\sigma + \epsilon}$$
- If $|Z| \ge 2.5$, the data point is marked as an **anomaly outlier**.
- If $Z \ge 3.0$ with an upward trajectory, a **Predictive Warning Alert** is generated.

### 3.2 Ordinary Least Squares (OLS) Linear Regression
For continuous capacity metrics (RAM and Disk), the system computes the best-fit line over the recent active sample window ($n = 20$):
$$m = \frac{n \sum (t \cdot y) - \sum t \sum y}{n \sum t^2 - (\sum t)^2}$$
$$b = \frac{\sum y - m \sum t}{n}$$
- **Forecast Generation**: Projects 30 seconds forward: $\hat{y}(t + \Delta t) = m \cdot (t + \Delta t) + b$.
- **Time-to-Exhaustion (TTX)**: If slope $m > 0$, the time remaining before reaching 100% capacity is calculated:
$$\text{TTX (seconds)} = \frac{100 - y_{\text{current}}}{m}$$

---

## 4. SRE Service Level Objectives (SLO) Architecture

The platform embeds Google SRE error budget practices directly into the telemetry loop:

### 4.1 Service Level Indicators (SLIs)
A sampling window (1-second tick) is deemed **"Good"** if and only if:
1. $\text{CPU Usage} < 85\%$
2. $\text{System Memory} < 85\%$
3. $\text{Event Loop Lag} < 10\,\text{ms}$

### 4.2 Target SLO & Error Budget
- **SLO Target**: $99.9\%$ uptime over rolling evaluation window ($E_{\text{allowed}} = 0.1\%$).
- **Budget Depletion**:
$$\text{Error Budget Consumed (\%)} = \frac{\text{Bad Events}}{\text{Total Events} \times (1 - \text{SLO Target})} \times 100$$

### 4.3 Multi-Window Burn Rate Tracking
- **Nominal Burn (1.0x)**: Error budget is consumed at an expected, sustainable rate (exhaustion in 30 days).
- **Elevated Burn (2x - 5x)**: Warning threshold; requires scheduled engineering investigation.
- **Critical Burn ($\ge 14.4x$)**: Paging alert; error budget will be completely exhausted in under 24–48 hours.

---

## 5. Linux Process Management & POSIX Signal Dispatch

The backend provides process discovery and active mitigation controls:

| Signal / Action | POSIX Value | Behavior |
|---|---|---|
| **SIGTERM** | Signal 15 | Requests graceful termination; allows processes to flush write buffers and close connections. |
| **SIGKILL** | Signal 9 | Uncatchable immediate termination dispatched by the kernel; terminates runaway memory leak processes. |
| **RENICE** | Priority -20 to 19 | Adjusts scheduler niceness; deprioritizes runaway batch workers from starving latency-critical threads. |

---

## 6. Automated Self-Healing Runbook Engine

Runbooks bridge monitoring and automated incident recovery. Each runbook implements an atomic operational workflow:

1. **`runbook-oom-drain` (OOM Killer & Memory Pruning)**:
   - Identifies runaway PID by highest memory growth rate ($dm/dt$).
   - Dispatches `SIGTERM` followed by graceful buffer drain.
   - Cleans temporary worker heap buffers.
   - Verifies system memory drops below 70% threshold.

2. **`runbook-cpu-throttle` (CPU Storm Throttling)**:
   - Discovers compute-intensive worker threads.
   - Dynamically renices target PIDs to priority `+15` (lowest CPU priority).
   - Re-allocates CPU shares to latency-sensitive ingress services.

3. **`runbook-disk-cleanup` (Emergency Disk Reclamation)**:
   - Flushes rotating access logs and temporary upload caches.
   - Reclaims disk allocation and halts cascading storage failures.

---

## 7. AI Forensics & Blameless Post-Mortem Architecture

When incidents occur, the system invokes the Google Gemini API with structured diagnostic payloads:
- Context window contains the last 20 telemetry snapshots, rolling $Z$-score anomalies, active scenario metadata, and host specs.
- Generates a **Blameless SRE Post-Mortem Report** formatted with:
  - Incident Summary & Timeline (T0 detection, T1 alert, T2 mitigation).
  - Root Cause Analysis (5 Whys methodology).
  - Impact Metrics (SLO degradation, error budget impact).
  - Corrective & Preventative Actions (Immediate, Medium-term, Architectural).

---

## 8. Security & Operational Boundaries

- **No Secrets Stored in Client**: All Gemini API interactions and system-level operations are proxied through server-side handlers (`/server.ts`).
- **Container Port Isolation**: Ingress is restricted to port 3000 via reverse proxy.
- **Sanitized Signal Execution**: Signal dispatches validate numeric PIDs and restrict allowed POSIX signals (`SIGTERM`, `SIGKILL`, `RENICE`) to prevent arbitrary code execution.
