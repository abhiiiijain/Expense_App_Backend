const mongoose = require("mongoose");
const { mongoUrl } = require("../config/env");

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
        console.log("DB connected");
        return connection;
      })
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }

  return connectionPromise;
}

module.exports = { connectDB };
