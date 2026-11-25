const {
  listRecurring,
  createRecurring,
  updateRecurring,
  fulfillRecurring,
} = require("../controllers/recurring");
const protect = require("../middleware/protect");

const router = require("express").Router();

router.use(protect);
router.get("/recurring", listRecurring);
router.post("/recurring", createRecurring);
router.patch("/recurring/:id", updateRecurring);
router.post("/recurring/:id/fulfill", fulfillRecurring);

module.exports = router;
