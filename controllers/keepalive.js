const { serviceName } = require("../constants/app");
const { getUptime } = require("../utils/uptime");

/**
 * Lightweight liveness ping — keep the Render free instance awake.
 * Hit every ~30s from an external cron / uptime monitor.
 * Does not depend on DB readiness.
 */
function getKeepalive(_req, res) {
  return res.status(200).json({
    status: "ok",
    service: serviceName,
    ...getUptime(),
  });
}

module.exports = { getKeepalive };
