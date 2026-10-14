const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");
const { HttpError } = require("../utils/HttpError");

function requireAppSession(req, _res, next) {
  try {
    const token = req.headers["x-app-session"];
    if (!token || typeof token !== "string") {
      throw new HttpError(403, "Enter your PIN to continue", "APP_LOCKED");
    }

    const payload = jwt.verify(token, jwtSecret);
    if (payload.typ !== "app" || !payload.userId || payload.userId !== req.userId) {
      throw new HttpError(403, "Enter your PIN to continue", "APP_LOCKED");
    }

    return next();
  } catch (err) {
    if (err instanceof HttpError) {
      return next(err);
    }
    return next(new HttpError(403, "Enter your PIN to continue", "APP_LOCKED"));
  }
}

module.exports = requireAppSession;
