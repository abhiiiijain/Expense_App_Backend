const Income = require("../models/Income");
const { createTransactionController } = require("../controllers/createTransactionController");
const { INCOME_CATEGORIES, INCOME_SUBCATEGORIES } = require("../utils/validation");
const auth = require("../middleware/auth");

const router = require("express").Router();
const controller = createTransactionController(
  Income,
  INCOME_CATEGORIES,
  INCOME_SUBCATEGORIES
);

router.use(auth);
router.post("/add-income", controller.add);
router.put("/update-income/:id", controller.update);
router.delete("/delete-income/:id", controller.delete);

module.exports = router;
