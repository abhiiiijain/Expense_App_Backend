require("dotenv").config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
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

module.exports = {
  port: requiredNumber("PORT"),
  mongoUrl: required("MONGO_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: required("JWT_EXPIRES_IN"),
  corsOrigin: required("CORS_ORIGIN"),
  apiPrefix: required("API_PREFIX"),
  authRateLimitWindowMs: requiredNumber("AUTH_RATE_LIMIT_WINDOW_MS"),
  authRateLimitMax: requiredNumber("AUTH_RATE_LIMIT_MAX"),
};
