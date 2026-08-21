const config = require("../config/env");
const { serviceName } = require("../constants/app");

const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function sanitize(meta) {
  if (!meta || typeof meta !== "object") {
    return {};
  }

  const clone = { ...meta };

  if (clone.err instanceof Error) {
    clone.err = {
      name: clone.err.name,
      message: clone.err.message,
      stack: clone.err.stack,
    };
  }

  delete clone.password;
  delete clone.passwordHash;
  delete clone.token;
  delete clone.authorization;

  return clone;
}

function createLogger(levelName) {
  const minLevel = LEVELS[levelName] ?? LEVELS.info;

  function write(level, message, meta = {}) {
    if (LEVELS[level] < minLevel) {
      return;
    }

    const entry = {
      time: new Date().toISOString(),
      level,
      service: serviceName,
      msg: message,
      ...sanitize(meta),
    };

    const line = JSON.stringify(entry);
    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  return {
    debug: (message, meta) => write("debug", message, meta),
    info: (message, meta) => write("info", message, meta),
    warn: (message, meta) => write("warn", message, meta),
    error: (message, meta) => write("error", message, meta),
  };
}

module.exports = createLogger(config.logLevel);
