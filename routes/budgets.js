const { listBudgets, upsertBudget } = require("../controllers/budgets");
const protect = require("../middleware/protect");

const router = require("express").Router();

router.use(protect);
router.get("/budgets", listBudgets);
router.put("/budgets", upsertBudget);

module.exports = router;
