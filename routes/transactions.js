const { getTransactions } = require("../controllers/transactions");
const protect = require("../middleware/protect");

const router = require("express").Router();

router.use(protect);
router.get("/transactions", getTransactions);

module.exports = router;
