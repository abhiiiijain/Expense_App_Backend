const app = require("./app");
const { connectDB } = require("./db");
const { apiPrefix, requiredNumber, nodeEnv } = require("./config/env");
const { startKeepAliveJob } = require("./jobs/keepAlive");
const logger = require("./utils/logger");

async function startServer() {
  const port = requiredNumber("PORT");

  await connectDB();

  // Bind all interfaces for Render / container hosts
  app.listen(port, "0.0.0.0", () => {
    logger.info("server.started", { port, env: nodeEnv });
    startKeepAliveJob({ apiPrefix });
  });
}

startServer().catch((error) => {
  logger.error("server.start_failed", { err: error });
  process.exit(1);
});
