# Observability and Distributed Tracing Report

## 1. Introduction

This project extends a containerized Node.js/Express application with end-to-end observability using OpenTelemetry, Prometheus, and Jaeger. The goal is to provide deep visibility into request lifecycles, performance metrics, and error patterns through unified dashboards and alerts.

## 2. Implementation Details

### 2.1. Distributed Tracing (OpenTelemetry + Jaeger)

- **SDK Integration**: OpenTelemetry Node SDK is initialized in `otel.js` and loaded at the very start of the application.
- **Auto-Instrumentation**: HTTP and database calls are automatically instrumented using `@opentelemetry/auto-instrumentations-node`.
- **Exporting**: Traces are exported via OTLP (HTTP) to a Jaeger collector running as a sidecar/service in the docker-compose stack.
- **Context Propagation**: Trace and Span IDs are captured and injected into structured JSON logs, enabling seamless navigation from logs to traces in Jaeger.

### 2.2. Custom Metrics (Prometheus)

- **RED Metrics**:
  - **Rate**: `http_requests_total` counter tracks incoming request volume.
  - **Errors**: `http_errors_total` counter tracks 5xx status codes.
  - **Duration**: `http_request_duration_seconds` histogram tracks latency percentiles.
- **Scraping**: The `/metrics` endpoint exposes these metrics in a format Prometheus can scrape.
- **Alerting**: Prometheus Alertmanager rules are defined to trigger on error rates >5% or p95 latency >300ms for 10 minutes.

### 2.3. Structured Logging & Correlation

- **Winston Logger**: A custom logger in `logger.js` uses `@opentelemetry/api` to retrieve the current span context.
- **Correlation**: Each log entry includes `trace_id` and `span_id`, allowing developers to find all logs associated with a specific trace in Jaeger or CloudWatch/Loki.

## 3. Symptom → Trace → Root Cause Mapping

### Scenario: Intermittent High Latency

- **Symptom**: Grafana dashboard shows a spike in the 95th percentile latency (p95) for the `/simulate-latency` route.
- **Trace Analysis**: In Jaeger, searching for traces with high duration reveals spans where the "HTTP GET" processing took over 500ms.
- **Root Cause Identification**: The trace shows a specific middleware or route handler where the time was spent. Correlated logs show:
  `{"level":"info","message":"Simulating latency of 500ms","trace_id":"...","span_id":"..."}`
- **Conclusion**: The latency was intentionally induced by the `/simulate-latency` route for testing purposes.

### Scenario: Error Rate Spike

- **Symptom**: Prometheus triggers a `HighErrorRate` alert.
- **Trace Analysis**: Jaeger displays traces with a "status: error" tag.
- **Root Cause Identification**: Clicking the trace link in Grafana navigates to the Jaeger UI, showing a failed span for `/simulate-error`. The correlated logs show the specific error code and warning message.
  `{"level":"warn","message":"Simulating error with code 500","trace_id":"...","span_id":"..."}`

## 4. Conclusion

The implementation of end-to-end observability transforms "blind" monitoring into actionable insights. By correlating metrics (the "what"), traces (the "where"), and logs (the "why"), the Mean Time to Recovery (MTTR) is significantly reduced.
