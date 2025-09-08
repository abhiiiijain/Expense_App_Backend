const express = require("express");
const cors = require("cors");
const { db } = require("./db/db");
const app = express();
require("dotenv").config();

const PORT = process.env.PORT || 5000;

// middlewares
app.use(express.json());
app.use(cors());

// routes (explicit mounts to ensure availability across environments)
app.use("/api/v1", require("./routes/auth"));
app.use("/api/v1", require("./routes/expenses"));
app.use("/api/v1", require("./routes/incomes"));

const server = () => {
  db();
  app.listen(PORT, () => {
    console.log("listening to port:", PORT);
  });
};

server();
