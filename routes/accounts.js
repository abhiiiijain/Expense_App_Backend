const {
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} = require("../controllers/accounts");
const auth = require("../middleware/auth");

const router = require("express").Router();

router.use(auth);
router.get("/accounts", listAccounts);
router.post("/accounts", createAccount);
router.put("/accounts/:id", updateAccount);
router.delete("/accounts/:id", deleteAccount);

module.exports = router;
