const mongoose = require("mongoose");
const { mongoUrl } = require("../config/env");
const logger = require("../utils/logger");

mongoose.set("strictQuery", false);

let connectionPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(mongoUrl, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10,
      })
      .then((connection) => {
        logger.info("db.connected", {
          readyState: connection.connection.readyState,
        });
        return connection;
      })
      .catch((error) => {
        connectionPromise = null;
        logger.error("db.connect_failed", { err: error });
        throw error;
      });
  }

  return connectionPromise;
}

module.exports = { connectDB };
