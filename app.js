const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const config = require("./config/env");
const { serviceName } = require("./constants/app");
const { connectDB } = require("./db/db");

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(express.json());
app.use(cors({
  origin: config.corsOrigin.split(",").map((origin) => origin.trim()),
}));

app.get("/", (_req, res) => {
  res.json({ status: "ok", service: serviceName });
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

app.use(config.apiPrefix, require("./routes/auth"));
app.use(config.apiPrefix, require("./routes/expenses"));
app.use(config.apiPrefix, require("./routes/incomes"));
app.use(config.apiPrefix, require("./routes/transactions"));

app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

module.exports = app;
