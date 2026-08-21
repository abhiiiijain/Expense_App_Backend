const crypto = require("crypto");
const logger = require("../utils/logger");

const QUIET_PATHS = new Set(["/", "/favicon.ico"]);

function isQuietPath(path) {
  return (
    QUIET_PATHS.has(path) ||
    path.endsWith("/keepalive") ||
    path.endsWith("/health") ||
    path.endsWith("/ping")
  );
}

function requestLogger(req, res, next) {
  const startedAt = Date.now();
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);

  res.on("finish", () => {
    const path = req.originalUrl?.split("?")[0] || req.url;
    const payload = {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
      ip: req.ip,
    };

    if (req.userId) {
      payload.userId = req.userId;
    }

    if (res.statusCode >= 500) {
      logger.error("request.completed", payload);
    } else if (res.statusCode >= 400) {
      logger.warn("request.completed", payload);
    } else if (isQuietPath(path)) {
      logger.debug("request.completed", payload);
    } else {
      logger.info("request.completed", payload);
    }
  });

  next();
}

module.exports = requestLogger;
