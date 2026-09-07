const mongoose = require("mongoose");
const { serviceName } = require("../constants/app");
const { getUptime } = require("../utils/uptime");
const { okStatus } = require("../utils/serviceStatus");

const DB_STATUS = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

/** Readiness probe — used by Render health checks. */
function getHealth(_req, res) {
  const dbState = mongoose.connection.readyState;
  const healthy = dbState === 1;

  return res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    service: serviceName,
    checks: {
      database: DB_STATUS[dbState] || "unknown",
    },
    ...getUptime(),
  });
}

/** Lightweight liveness (also used for GET /). */
function getPing(_req, res) {
  return res.status(200).json(okStatus());
}

/** Keep-alive target for the internal job. */
function getKeepAlive(_req, res) {
  return res.status(200).json(okStatus({ keepalive: true }));
}

module.exports = { getHealth, getPing, getKeepAlive };
