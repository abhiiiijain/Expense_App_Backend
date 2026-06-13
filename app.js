const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const config = require("./config/env");
const { db } = require("./db/db");
const app = express();

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

app.use(config.apiPrefix, authLimiter, require("./routes/auth"));
app.use(config.apiPrefix, require("./routes/expenses"));
app.use(config.apiPrefix, require("./routes/incomes"));
app.use(config.apiPrefix, require("./routes/transactions"));

const startServer = async () => {
  await db();
  app.listen(config.port, () => {
    console.log("listening to port:", config.port);
  });
};

startServer();
