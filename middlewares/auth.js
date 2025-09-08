const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

module.exports = async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");
    if (!token || scheme !== "Bearer") {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;

    // Attach minimal user info for controllers
    const user = await User.findById(req.userId).select("email firstName lastName photo");
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

