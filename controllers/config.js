const { EDIT_WINDOW_MS } = require("../constants/app");
const taxonomy = require("../../shared/taxonomy.json");
const asyncHandler = require("../middleware/asyncHandler");

exports.getConfig = asyncHandler(async (_req, res) => {
  return res.status(200).json({
    editWindowMs: EDIT_WINDOW_MS,
    expenseCategories: taxonomy.expenseCategories,
    incomeCategories: taxonomy.incomeCategories,
    expenseSubcategories: taxonomy.expenseSubcategories,
    incomeSubcategories: taxonomy.incomeSubcategories,
  });
});
