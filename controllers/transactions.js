const Expense = require("../models/expenseModel");
const Income = require("../models/incomeModel");
const { getPagination } = require("../utils/validation");

exports.getTransactions = async (req, res) => {
  try {
    const { limit, skip } = getPagination(req.query);
    const filter = { email: req.user.email };

    const [expenses, incomes] = await Promise.all([
      Expense.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Income.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    return res.status(200).json({ expenses, incomes });
  } catch (err) {
    console.error("Get transactions error:", err.message);
    return res.status(500).json({ message: "Server Error" });
  }
};
