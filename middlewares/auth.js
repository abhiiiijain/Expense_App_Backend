const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");

module.exports = function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");
    if (!token || scheme !== "Bearer") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const payload = jwt.verify(token, jwtSecret);
    if (!payload.userId || !payload.email) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.userId = payload.userId;
    req.user = {
      userId: payload.userId,
      email: payload.email,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
