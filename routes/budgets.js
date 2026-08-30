const { listBudgets, upsertBudget } = require("../controllers/budgets");
const auth = require("../middleware/auth");

const router = require("express").Router();

router.use(auth);
router.get("/budgets", listBudgets);
router.put("/budgets", upsertBudget);

module.exports = router;
