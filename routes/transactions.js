const { getTransactions } = require("../controllers/transactions");
const auth = require("../middlewares/auth");

const router = require("express").Router();

router.use(auth);
router.get("/transactions", getTransactions);

module.exports = router;
