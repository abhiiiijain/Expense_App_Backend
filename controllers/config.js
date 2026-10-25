const { EDIT_WINDOW_MS } = require("../constants/app");
const asyncHandler = require("../middleware/asyncHandler");
const {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  EXPENSE_SUBCATEGORIES,
  INCOME_SUBCATEGORIES,
} = require("../utils/validation");

exports.getConfig = asyncHandler(async (_req, res) => {
  return res.status(200).json({
    editWindowMs: EDIT_WINDOW_MS,
    expenseCategories: EXPENSE_CATEGORIES,
    incomeCategories: INCOME_CATEGORIES,
    expenseSubcategories: EXPENSE_SUBCATEGORIES,
    incomeSubcategories: INCOME_SUBCATEGORIES,
  });
});
