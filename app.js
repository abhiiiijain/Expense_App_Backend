const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const config = require("./config/env");
const { registerApiRoutes } = require("./routes");
const requestLogger = require("./middleware/requestLogger");
const { HttpError } = require("./utils/HttpError");
const logger = require("./utils/logger");
const { listEndpoints } = require("./controllers/root");

const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use(
  cors({
    origin: config.corsOrigin.split(",").map((origin) => origin.trim()),
  })
);
app.use(requestLogger);

app.get("/", listEndpoints);

// Health / liveness under API_PREFIX only (/api/v1)
app.use(config.apiPrefix, require("./routes/system"));

registerApiRoutes(app);

app.use((req, res, next) => {
  next(new HttpError(404, "Not found"));
});

app.use((err, req, res, _next) => {
  const isOperational = err instanceof HttpError;
  const status = isOperational ? err.status : 500;
  const message = isOperational ? err.message : "Server Error";

  if (status >= 500) {
    logger.error("request.unhandled_error", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      err,
    });
  } else if (status === 404) {
    logger.warn("request.not_found", {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
    });
  }

  res.status(status).json({ message });
});

module.exports = app;
