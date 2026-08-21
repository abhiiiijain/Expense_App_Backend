const mongoose = require("mongoose");
const { serviceName } = require("../constants/app");
const { getUptime } = require("../utils/uptime");

const DB_STATUS = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

/**
 * Readiness probe for monitors / Render health checks.
 * Returns 503 when MongoDB is not connected.
 */
function getHealth(_req, res) {
  const dbState = mongoose.connection.readyState;
  const healthy = dbState === 1;

  const body = {
    status: healthy ? "ok" : "degraded",
    service: serviceName,
    checks: {
      database: DB_STATUS[dbState] || "unknown",
    },
    ...getUptime(),
  };

  return res.status(healthy ? 200 : 503).json(body);
}

module.exports = { getHealth };
