const mongoose = require("mongoose");
const config = require("../config/env");
const { getUptime } = require("../utils/uptime");

const DB_STATUS = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

function getKeepalive(_req, res) {
  const uptime = getUptime();
  const dbState = mongoose.connection.readyState;

  res.json({
    status: "ok",
    service: "expense-api",
    runtime: config.isVercel ? "vercel" : "node",
    db: DB_STATUS[dbState] || "unknown",
    ...uptime,
  });
}

module.exports = { getKeepalive };
