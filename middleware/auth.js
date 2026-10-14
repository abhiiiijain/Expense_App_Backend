const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");
const { HttpError } = require("../utils/HttpError");

module.exports = function authMiddleware(req, _res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");
    if (!token || scheme !== "Bearer") {
      throw new HttpError(401, "Unauthorized");
    }

    const payload = jwt.verify(token, jwtSecret);
    if (!payload.userId || payload.typ === "app") {
      throw new HttpError(401, "Invalid token");
    }

    req.userId = payload.userId;

    return next();
  } catch (err) {
    if (err instanceof HttpError) {
      return next(err);
    }
    return next(new HttpError(401, "Invalid token"));
  }
};
