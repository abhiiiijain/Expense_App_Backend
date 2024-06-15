const {
  addExpense,
  getExpenses,
  deleteExpense,
} = require("../controllers/expense");

const router = require("express").Router();

router
  .post("/add-expense", addExpense)
  .get("/get-expenses", getExpenses)
  .delete("/delete-expense/:id", deleteExpense);

module.exports = router;
