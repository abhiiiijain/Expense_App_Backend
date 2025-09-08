const IncomeSchema = require("../models/incomeModel");

exports.addIncome = async (req, res) => {
  const { title, amount, category, subcategory, icon } = req.body;

  const income = IncomeSchema({
    email: req.user.email,
    title,
    amount,
    category,
    subcategory,
    icon,
  });

  try {
    if (!req.user?.email || !title || !category || !subcategory || !icon) {
      return res.status(400).json({ message: "All fields are required!" });
    }
    if (amount <= 0 || !amount === "number") {
      return res
        .status(400)
        .json({ message: "Amount must be a positive number!" });
    }
    await income.save();
    res.status(200).json({ message: "Income Added" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getIncomes = async (req, res) => {
  try {
    const incomes = await IncomeSchema.find({ email: req.user.email }).sort({ createdAt: -1 });
    res.status(200).json(incomes);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.deleteIncome = async (req, res) => {
  const { id } = req.params;
  IncomeSchema.findByIdAndDelete(id)
    .then(() => {
      res.status(200).json({ message: "Income Deleted" });
    })
    .catch(() => {
      res.status(500).json({ message: "Server Error" });
    });
};

