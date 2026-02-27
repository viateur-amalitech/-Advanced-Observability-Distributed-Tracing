# Professional Jenkins CI/CD Pipeline + Full Observability (Prometheus + Grafana + Jaeger + OpenTelemetry)

An industry-standard, end-to-end CI/CD pipeline demonstrating the "Holy Trinity" of DevOps: **Infrastructure as Code** (Terraform), **Configuration as Code** (Ansible), and **Continuous Integration/Deployment** (Jenkins) — extended with a production‑grade observability stack (RED metrics, tracing, and log correlation).

## Project Overview

This project automates the entire lifecycle of a Node.js web application—from the first line of code to a live, production-ready server on AWS. It implements a robust, idempotent, and secure workflow that eliminates manual intervention.

---

## Technology Stack

| Category | Tools Used |
| :--- | :--- |
| **Application** | Node.js, Express, Jest |
| **Infrastructure** | Terraform, AWS (EC2, Elastic IP, Security Groups) |
| **Configuration** | Ansible (Modular Roles) |
| **CI/CD** | Jenkins LTS (Declarative Pipeline) |
| **Observability** | Prometheus, Grafana, Jaeger, OpenTelemetry |
| **Connectivity** | ngrok (for local Jenkins exposure) |
| **Registry** | Docker Hub |

---

## End-to-End Observability Stack

This project implements a full observability stack (Prometheus, Grafana, Jaeger) with OpenTelemetry instrumentation:

- **Distributed Tracing**: Jaeger collects spans from the application to visualize request lifecycles.
- **Metrics**: Prometheus scrapes RED metrics (Rate, Errors, Duration) from the `/metrics` endpoint.
- **Structured Logging**: Winston-based JSON logs are correlated with Trace/Span IDs.
- **Dashboards**: Grafana provides real-time visualization of performance and error rates.
- **Alerting**: Automated alerts for high error rates (>5%) and latency (>300ms).

### Simulation & Verification

You can use the following routes to test the observability stack:

- `GET /simulate-latency?ms=500`: Induces a delay to test latency dashboards and alerts.
- `GET /simulate-error?code=500`: Simulates an application error to test error rate tracking and correlation.
- `GET /metrics`: View raw Prometheus metrics.

Access the monitoring tools locally:

- **Prometheus**: `http://localhost:9090`
- **Jaeger**: `http://localhost:16686`
- **Grafana**: `http://localhost:3001` (Admin/Admin)

---

## Quick Start (Local, via Docker Compose)

Prerequisites
- Docker Engine 20.10+ and Docker Compose V2

Start the full monitoring stack and the instrumented web app:

```bash
cd monitoring
docker compose up -d --build
```

Endpoints
- Web App: http://localhost:3000
- Prometheus: http://localhost:9090
- Jaeger UI: http://localhost:16686
- Grafana: http://localhost:3001 (admin/admin)

Generate test traffic and symptoms
- Latency: `curl "http://localhost:3000/simulate-latency?ms=500"`
- Errors: `curl -i "http://localhost:3000/simulate-error?code=500"`
- General load (optional): `ab -n 500 -c 20 http://localhost:3000/`

What to observe
- Prometheus metrics at `/metrics` or via queries:
  - Error rate: `rate(http_errors_total[5m]) / rate(http_requests_total[5m]) * 100`
  - Latency p95: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))`
- Grafana dashboard (provisioned): latency, error rate, CPU/memory, and trace links
- Jaeger traces: spans for HTTP server requests from the app
- Logs: JSON logs expose `trace_id` and `span_id` for correlation

Alert rules (Prometheus `alerts.yml`)
- HighErrorRate: >5% for 10m
- HighLatency p95: >300ms for 10m

Troubleshooting: Docker networking “network <id> not found”
1) Cleanly bring the stack down and remove orphans
   - `docker compose -f monitoring/docker-compose.yml down --remove-orphans`
2) Bring it back up
   - `docker compose -f monitoring/docker-compose.yml up -d --build`
3) If it persists, prune unused networks (safe for stopped networks)
   - `docker network prune -f`
   - Retry `docker compose -f monitoring/docker-compose.yml up -d`
4) Optionally fix the Compose project name to stabilize the default network name
   - `docker compose -f monitoring/docker-compose.yml -p monitoring up -d`
5) Still stuck? Restart Docker: `sudo systemctl restart docker`

Note: Compose v2 ignores the top‑level `version:` key; the warning is benign. You can remove it later to silence the message.

## Architecture & Workflow

1. **Infrastructure (Terraform)**: Provisions an AWS EC2 instance and assigns a **Static Elastic IP**.
2. **Configuration (Ansible)**: Installs Docker, configures permissions, and manages the application lifecycle using modular roles (`docker`, `webapp`).
3. **Pipeline (Jenkins)**:
   - **Checkout**: Pulls code from GitHub.
   - **Build & Install**: Handles Node.js dependencies.
   - **Unit Tests**: Executes a Jest testing suite (Unit, Integration, E2E).
   - **Docker Build**: Creates a versioned image with optimized layers.
   - **Push**: Tags and pushes images to Docker Hub.
   - **Deploy**: Orchestrates the Ansible playbook via SSH to update the live server.

---

## Application Configuration (env)

The app supports the following environment variables:
- `PORT`: HTTP port (default `3000`)
- `SERVICE_NAME`: Service name reported to OpenTelemetry (default `web-app`)
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`: Full OTLP traces endpoint (e.g., `http://jaeger:4318/v1/traces`)
- `OTEL_EXPORTER_OTLP_ENDPOINT`: Base OTLP endpoint (e.g., `http://jaeger:4318`). When provided, the app auto‑appends `/v1/traces`.
- `APP_MESSAGE`: Optional message returned by `/`
- `APP_VERSION`: Optional version returned by `/`
- `DB_URI`: Optional MongoDB URI (sample app can run without a DB)

OpenTelemetry notes
- Auto‑instrumentation is loaded first in `app/index.js` via `require("./otel")`.
- Traces are exported to Jaeger’s OTLP HTTP collector at `http://jaeger:4318` by default.
- Structured JSON logs (Winston) automatically include `trace_id` and `span_id` from the active span context.

Prometheus metrics
- Default metrics via `prom-client` with prefix `webapp_`
- Custom RED metrics: `http_request_duration_seconds`, `http_requests_total`, `http_errors_total`
- Exposed at `/metrics`

Grafana dashboard
- Provisioned via `monitoring/grafana/provisioning` with dashboard JSON in `monitoring/grafana/dashboards/dashboard.json`.

Alerting
- Rules defined in `monitoring/prometheus/alerts.yml` as described above.

---

## Deploy to AWS (Terraform + Ansible + Jenkins)

High‑level flow
1. Terraform provisions an EC2 instance with a static Elastic IP and security groups.
2. Ansible installs Docker and deploys the application container from Docker Hub.
3. Jenkins pipeline builds, tests, tags, pushes, and deploys the app.

Quick pointers
- Terraform: `infra/terraform/` (copy `terraform.tfvars.example` to `terraform.tfvars` and fill values)
- Ansible: `infra/ansible/` (roles: `docker`, `webapp`; entry play: `deploy.yml`)
- Jenkinsfile: parameterized pipeline (image name, version, SSH target, etc.)

Detailed step‑by‑step setup
- See the full guide: `docs/runbook.md`

Post‑deployment verification
- Access the app via the Elastic IP noted in `terraform output` or the Jenkins logs.
- Example (from previous deployment): `http://13.60.151.71/` (your IP will differ).

---

## Key Industry Best Practices

- **Zero Hardcoding**: 100% parameterized pipeline. Change IP, version, or repo without touching code.
- **Modular Ansible**: Roles-based configuration for high maintainability.
- **Secure Secrets**: Uses Jenkins `credentials()` and `sshagent` for masked, encrypted credential handling.
- **Idempotency**: Ansible ensures the deployment won't break if run multiple times.
- **Static Endpoint**: Elastic IP prevents endpoint changes upon server restarts.
- **Local-to-Cloud Integration**: Uses **ngrok** to receive real-time GitHub webhooks on a local Jenkins server.

---

## Implementation Evidence (Screenshots)

Screenshots demonstrating successful CI/CD and deployment are stored in `docs/screenshots/`.

All available screenshots in this repository:

1. Jenkins pipeline confirmation
   - ![Jenkins Confirmation](./docs/screenshots/jenkins_confirmation.png)
2. AWS EC2 instance status
   - ![AWS EC2](./docs/screenshots/aws_ec2.png)
3. Docker Hub repository image
   - ![Docker Hub](./docs/screenshots/docker_hub_image.png)
4. Grafana dashboard
   - ![Grafana](./docs/screenshots/grafana.png)
5. Jaeger traces
   - ![Jaeger](./docs/screenshots/jaeger.png)
6. Prometheus metrics page
   - ![Prometheus](./docs/screenshots/prometheus.png)
7. Application /metrics endpoint sample
   - ![Metrics](./docs/screenshots/metrics.png)

---

## Getting Started

Most users can begin with the local Quick Start above. For a full cloud deployment walkthrough (Jenkins + Terraform + Ansible), follow the:
**[Full Runbook / Setup Guide](./docs/runbook.md)**

### Quick Verification (Cloud)

Once deployed, the application is accessible via the Elastic IP output by Terraform. Example from a previous run:
`http://13.60.151.71/` (your IP will differ and may be rotated).

---

## Repository Structure

```text
├── app/                # Application code (Node.js/Express)
│   ├── tests/          # Jest Testing Suite
│   ├── Dockerfile      # Optimized Container Specification
│   └── ...             # app.js, index.js, logger.js, otel.js
├── infra/              # Infrastructure code
│   ├── terraform/      # Infrastructure as Code (AWS)
│   └── ansible/        # Configuration as Code (Modular Roles)
├── monitoring/         # Full Observability Stack
│   ├── prometheus/     # Prometheus configs & alerts
│   ├── grafana/        # Dashboards & Datasources
│   └── docker-compose.yml
├── docs/               # Documentation
│   ├── screenshots/    # Implementation Evidence
│   ├── runbook.md      # Step-by-Step Setup Guide
│   └── REPORT.md       # Root Cause Analysis & Observability Report
├── Jenkinsfile         # Parameterized CI/CD Definition
└── README.md
```

---

## Reports & License

- Observability/Tracing Report (2 pages): `./docs/REPORT.md`
- This project is for demonstration and production‑readiness training in DevOps engineering.
