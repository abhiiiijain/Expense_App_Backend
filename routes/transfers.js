const { createTransfer, deleteTransfer } = require("../controllers/transfers");
const protect = require("../middleware/protect");

const router = require("express").Router();

router.use(protect);
// Listing is served via GET /transactions (includes transfers).
router.post("/transfers", createTransfer);
router.delete("/transfers/:id", deleteTransfer);

module.exports = router;
