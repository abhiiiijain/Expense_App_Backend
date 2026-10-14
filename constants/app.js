const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const PIN_LENGTH = 4;
/** Unlock token lifetime. The client drops it as soon as the app is hidden. */
const APP_SESSION_TTL_SEC = 90;
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 5 * 60 * 1000;

module.exports = {
  serviceName: "spendwise-api",
  EDIT_WINDOW_MS,
  PIN_LENGTH,
  APP_SESSION_TTL_SEC,
  PIN_MAX_ATTEMPTS,
  PIN_LOCKOUT_MS,
};
