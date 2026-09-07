const { serviceName } = require("../constants/app");
const { getUptime } = require("./uptime");

/** Shared OK body for /, /ping, /keepalive. */
function okStatus(extra = {}) {
  return {
    status: "ok",
    service: serviceName,
    ...getUptime(),
    ...extra,
  };
}

module.exports = { okStatus };
