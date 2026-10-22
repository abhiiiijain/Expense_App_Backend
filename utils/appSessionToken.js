const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");
const { APP_SESSION_TTL_SEC } = require("../constants/app");

function issueAppSession(userId) {
  return jwt.sign({ userId: String(userId), typ: "app" }, jwtSecret, {
    expiresIn: APP_SESSION_TTL_SEC,
  });
}

module.exports = { issueAppSession };
