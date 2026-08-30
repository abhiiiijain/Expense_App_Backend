const { createTransfer, deleteTransfer } = require("../controllers/transfers");
const auth = require("../middleware/auth");

const router = require("express").Router();

router.use(auth);
// Listing is served via GET /transactions (includes transfers).
router.post("/transfers", createTransfer);
router.delete("/transfers/:id", deleteTransfer);

module.exports = router;
