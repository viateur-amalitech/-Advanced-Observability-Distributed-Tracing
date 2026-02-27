const express = require("express");
const mongoose = require("mongoose");
const userRoutes = require("./routes/user");
const client = require("prom-client");
const logger = require("./logger");

const app = express();

// Prometheus metrics setup
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: "webapp_" });

// Custom RED metrics
const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

const httpErrorsTotal = new client.Counter({
  name: "http_errors_total",
  help: "Total number of HTTP errors (status >= 500)",
  labelNames: ["method", "route", "status_code"],
});

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationSeconds = Number(end - start) / 1e9;
    const route =
      req.route && req.route.path ? req.route.path : req.path || "unknown";
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };
    httpRequestDuration.observe(labels, durationSeconds);
    httpRequestsTotal.inc(labels);
    if (res.statusCode >= 500) {
      httpErrorsTotal.inc(labels);
      logger.error(`Request failed: ${req.method} ${route}`, {
        status_code: res.statusCode,
        route,
      });
    } else {
      logger.info(`Request processed: ${req.method} ${route}`, {
        status_code: res.statusCode,
        route,
      });
    }
  });
  next();
});

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    message: process.env.APP_MESSAGE || "Simple Web Service is running!",
    version: process.env.APP_VERSION || "1.0.0",
  });
});

// Simulation routes for validation
app.get("/simulate-latency", async (req, res) => {
  const delay = parseInt(req.query.ms) || 500;
  logger.info(`Simulating latency of ${delay}ms`);
  await new Promise((resolve) => setTimeout(resolve, delay));
  res.status(200).json({ message: `Simulated latency of ${delay}ms`, delay });
});

app.get("/simulate-error", (req, res) => {
  const code = parseInt(req.query.code) || 500;
  logger.warn(`Simulating error with code ${code}`);
  res.status(code).json({ error: `Simulated error with code ${code}`, code });
});

// Expose Prometheus metrics
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

app.use("/users", userRoutes);

const connectDB = async (dbUri) => {
  if (!dbUri) {
    console.log("No DB_URI provided, skipping DB connection for sample app.");
    return;
  }
  try {
    await mongoose.connect(dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Successfully connected to the database");
  } catch (error) {
    console.error("Error connecting to the database", error);
    // process.exit(1);
  }
};

module.exports = { app, connectDB };
