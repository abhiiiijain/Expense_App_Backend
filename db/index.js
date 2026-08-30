const mongoose = require("mongoose");
const { mongoUrl } = require("../config/env");
const logger = require("../utils/logger");

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
        // Durability: acknowledge writes only after majority of replica set members
        writeConcern: { w: "majority", j: true },
        // Prefer reading from primary so deletes/updates are immediately visible
        readPreference: "primary",
      })
      .then(async (connection) => {
        logger.info("db.connected", {
          readyState: connection.connection.readyState,
        });

        // Ensure indexes exist (safe to run on every start)
        try {
          const Expense = require("../models/Expense");
          const Income = require("../models/Income");
          const User = require("../models/User");
          const Account = require("../models/Account");
          const Transfer = require("../models/Transfer");
          const Budget = require("../models/Budget");
          await Promise.all([
            Expense.syncIndexes(),
            Income.syncIndexes(),
            User.syncIndexes(),
            Account.syncIndexes(),
            Budget.syncIndexes(),
            Transfer.syncIndexes(),
          ]);
          logger.info("db.indexes_synced");
        } catch (error) {
          logger.warn("db.index_sync_failed", { err: error });
        }

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
