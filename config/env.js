const path = require("path");
const dotenv = require("dotenv");

const nodeEnv = process.env.NODE_ENV || "development";
const modeEnvPath = path.resolve(process.cwd(), `.env.${nodeEnv}`);

// Loads .env.development or .env.production (platform env vars still win if already set)
dotenv.config({ path: modeEnvPath });

function required(name) {
  const value = process.env[name];
  if (value === undefined || value === null || value === "") {
    throw new Error(
      `Missing required environment variable: ${name} (expected in .env.${nodeEnv} or process env)`
    );
  }
  return value;
}

function requiredNumber(name) {
  const num = Number(required(name));
  if (Number.isNaN(num)) {
    throw new Error(`${name} must be a valid number`);
  }
  return num;
}

const LOG_LEVELS = new Set(["debug", "info", "warn", "error"]);

function requiredLogLevel() {
  const level = required("LOG_LEVEL").toLowerCase();
  if (!LOG_LEVELS.has(level)) {
    throw new Error("LOG_LEVEL must be one of: debug, info, warn, error");
  }
  return level;
}

module.exports = {
  nodeEnv,
  mongoUrl: required("MONGO_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: required("JWT_EXPIRES_IN"),
  corsOrigin: required("CORS_ORIGIN"),
  apiPrefix: required("API_PREFIX"),
  authRateLimitWindowMs: requiredNumber("AUTH_RATE_LIMIT_WINDOW_MS"),
  authRateLimitMax: requiredNumber("AUTH_RATE_LIMIT_MAX"),
  logLevel: requiredLogLevel(),
  requiredNumber,
};
