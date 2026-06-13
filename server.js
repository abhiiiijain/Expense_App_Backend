const app = require("./app");
const config = require("./config/env");
const { connectDB } = require("./db/db");

async function startServer() {
  if (!config.port) {
    throw new Error("PORT is required for local development");
  }

  await connectDB();
  app.listen(config.port, () => {
    console.log("listening to port:", config.port);
  });
}

startServer().catch((error) => {
  console.error("Server failed to start:", error.message);
  process.exit(1);
});
