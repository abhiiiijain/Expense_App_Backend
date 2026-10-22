const { corsOrigin, nodeEnv } = require("../config/env");
const { HttpError } = require("./HttpError");

const ALLOWED_ORIGINS = corsOrigin
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function hostnameOf(origin) {
  try {
    return new URL(origin).hostname;
  } catch (_error) {
    return null;
  }
}

function originFromRequest(req) {
  const origin = req.headers.origin;
  if (!origin || typeof origin !== "string") return null;
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (nodeEnv === "development" && origin.startsWith("http://localhost:")) return origin;
  return null;
}

function parseClientOrigin(req) {
  const origin = originFromRequest(req);
  return { origin, rpID: origin ? hostnameOf(origin) : null };
}

function rpIdFromRequest(req) {
  return parseClientOrigin(req).rpID;
}

function requireClientOrigin(req) {
  const parsed = parseClientOrigin(req);
  if (!parsed.origin || !parsed.rpID) {
    throw new HttpError(400, "This browser origin is not allowed");
  }
  return parsed;
}

module.exports = { rpIdFromRequest, requireClientOrigin };
