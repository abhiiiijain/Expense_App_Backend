const { addIncome, getIncomes, deleteIncome } = require("../controllers/income");
const auth = require("../middlewares/auth");

const router = require("express").Router();

router.use(auth);
router
  .post("/add-income", addIncome)
  .get("/get-incomes", getIncomes)
  .delete("/delete-income/:id", deleteIncome);

module.exports = router;

