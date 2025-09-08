const {
  addExpense,
  getExpenses,
  deleteExpense,
} = require("../controllers/expense");
const auth = require("../middlewares/auth");

const router = require("express").Router();

router.use(auth);
router
  .post("/add-expense", addExpense)
  .get("/get-expenses", getExpenses)
  .delete("/delete-expense/:id", deleteExpense);

module.exports = router;

