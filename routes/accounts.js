const {
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} = require("../controllers/accounts");
const protect = require("../middleware/protect");

const router = require("express").Router();

router.use(protect);
router.get("/accounts", listAccounts);
router.post("/accounts", createAccount);
router.put("/accounts/:id", updateAccount);
router.delete("/accounts/:id", deleteAccount);

module.exports = router;
