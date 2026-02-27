const winston = require("winston");
const api = require("@opentelemetry/api");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
});

// Helper to inject trace context into logs
const log = (level, message, meta = {}) => {
  const span = api.trace.getSpan(api.context.active());
  if (span) {
    const { traceId, spanId } = span.spanContext();
    meta.trace_id = traceId;
    meta.span_id = spanId;
  }
  logger.log(level, message, meta);
};

module.exports = {
  info: (msg, meta) => log("info", msg, meta),
  error: (msg, meta) => log("error", msg, meta),
  warn: (msg, meta) => log("warn", msg, meta),
  debug: (msg, meta) => log("debug", msg, meta),
};
