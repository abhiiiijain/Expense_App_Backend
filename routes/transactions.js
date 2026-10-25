const { getTransactions, getTransactionsSync } = require("../controllers/transactions");
const protect = require("../middleware/protect");

const router = require("express").Router();

router.use(protect);
router.get("/transactions/sync", getTransactionsSync);
router.get("/transactions", getTransactions);

module.exports = router;
