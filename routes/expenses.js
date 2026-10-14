const Expense = require("../models/Expense");
const { createTransactionController } = require("../controllers/createTransactionController");
const { EXPENSE_CATEGORIES, EXPENSE_SUBCATEGORIES } = require("../utils/validation");
const protect = require("../middleware/protect");

const router = require("express").Router();
const controller = createTransactionController(
  Expense,
  EXPENSE_CATEGORIES,
  EXPENSE_SUBCATEGORIES
);

router.use(protect);
router.post("/add-expense", controller.add);
router.put("/update-expense/:id", controller.update);
router.delete("/delete-expense/:id", controller.delete);

module.exports = router;
