const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const config = require("./config/env");
const { connectDB } = require("./db/db");

const app = express();

app.set("trust proxy", 1);

const authLimiter = rateLimit({
  windowMs: config.authRateLimitWindowMs,
  max: config.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later" },
});

app.use(helmet());
app.use(express.json());
app.use(cors({
  origin: config.corsOrigin.split(",").map((origin) => origin.trim()),
}));

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "expense-api" });
});

app.use(config.apiPrefix, require("./routes/keepalive"));

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("DB connection error:", error.message);
    res.status(500).json({ message: "Database connection failed" });
  }
});

app.use(config.apiPrefix, authLimiter, require("./routes/auth"));
app.use(config.apiPrefix, require("./routes/expenses"));
app.use(config.apiPrefix, require("./routes/incomes"));
app.use(config.apiPrefix, require("./routes/transactions"));

module.exports = app;
