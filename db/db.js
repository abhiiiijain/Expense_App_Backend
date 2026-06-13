const mongoose = require("mongoose");
const { mongoUrl } = require("../config/env");

const db = async () => {
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(mongoUrl);
    console.log("DB connected");
  } catch (error) {
    console.error("DB connection error:", error.message);
    process.exit(1);
  }
};

module.exports = { db };
