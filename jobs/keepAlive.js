const logger = require("../utils/logger");

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes (Render free sleeps ~15m)

function parseIntervalMs() {
  const raw = process.env.KEEP_ALIVE_INTERVAL_MS;
  if (raw === undefined || raw === "") return DEFAULT_INTERVAL_MS;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 30_000) {
    logger.warn("keepalive.invalid_interval", { raw, fallbackMs: DEFAULT_INTERVAL_MS });
    return DEFAULT_INTERVAL_MS;
  }
  return value;
}

function resolveKeepAliveUrl(apiPrefix) {
  if (process.env.KEEP_ALIVE_URL) {
    return process.env.KEEP_ALIVE_URL.replace(/\/$/, "");
  }

  // Render injects this; public URL is required so idle detection sees traffic.
  const origin = (process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
  if (!origin) return null;

  const prefix = (apiPrefix || "/api/v1").replace(/\/$/, "");
  return `${origin}${prefix}/keepalive`;
}

function isEnabled() {
  const flag = (process.env.KEEP_ALIVE_ENABLED || "").toLowerCase();
  if (flag === "false" || flag === "0") return false;
  if (flag === "true" || flag === "1") return true;
  // Default: on when running on Render
  return Boolean(process.env.RENDER_EXTERNAL_URL);
}

/**
 * Periodically GET the public /keepalive URL so Render free web services
 * do not spin down from idle. Does not wake an already-sleeping instance.
 */
function startKeepAliveJob({ apiPrefix } = {}) {
  if (!isEnabled()) {
    logger.info("keepalive.disabled");
    return null;
  }

  const url = resolveKeepAliveUrl(apiPrefix);
  if (!url) {
    logger.warn("keepalive.skipped", {
      reason: "Set RENDER_EXTERNAL_URL (auto on Render) or KEEP_ALIVE_URL",
    });
    return null;
  }

  const intervalMs = parseIntervalMs();

  const tick = async () => {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { "user-agent": "spendwise-keepalive" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        logger.warn("keepalive.non_ok", { url, status: response.status });
        return;
      }
      logger.debug("keepalive.ok", { url, status: response.status });
    } catch (err) {
      logger.warn("keepalive.failed", {
        url,
        err: err?.message || String(err),
      });
    }
  };

  // First hit shortly after boot, then on the interval
  const initialDelay = setTimeout(tick, 15_000);
  const timer = setInterval(tick, intervalMs);
  if (typeof timer.unref === "function") timer.unref();
  if (typeof initialDelay.unref === "function") initialDelay.unref();

  logger.info("keepalive.started", { url, intervalMs });
  return { timer, initialDelay, url, intervalMs };
}

module.exports = { startKeepAliveJob };
