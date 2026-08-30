const Account = require("../models/Account");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const Transfer = require("../models/Transfer");
const User = require("../models/User");
const { HttpError } = require("../utils/HttpError");
const asyncHandler = require("../middleware/asyncHandler");
const { parseOpeningBalance, roundMoney } = require("../utils/validation");
const mongoose = require("mongoose");

async function ensureDefaultAccount(userId, openingBalance = 0) {
  let account = await Account.findOne({ userId, isDefault: true });
  if (account) return account;

  account = await Account.findOne({ userId }).sort({ createdAt: 1 });
  if (account) {
    account.isDefault = true;
    await account.save();
    return account;
  }

  return Account.create({
    userId,
    name: "Main",
    type: "bank",
    openingBalance,
    isDefault: true,
  });
}

exports.ensureDefaultAccount = ensureDefaultAccount;

exports.listAccounts = asyncHandler(async (req, res) => {
  await ensureDefaultAccount(req.userId);

  const accounts = await Account.find({ userId: req.userId })
    .sort({ isDefault: -1, name: 1 })
    .lean();

  const userObjectId = new mongoose.Types.ObjectId(req.userId);
  const [incomeTotals, expenseTotals, transferOutTotals, transferInTotals] = await Promise.all([
    Income.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: "$accountId", total: { $sum: "$amount" } } },
    ]),
    Expense.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: "$accountId", total: { $sum: "$amount" } } },
    ]),
    Transfer.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: "$fromAccountId", total: { $sum: "$amount" } } },
    ]),
    Transfer.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: "$toAccountId", total: { $sum: "$amount" } } },
    ]),
  ]);

  const incomeByAccount = Object.fromEntries(
    incomeTotals.map((row) => [String(row._id), row.total || 0])
  );
  const expenseByAccount = Object.fromEntries(
    expenseTotals.map((row) => [String(row._id), row.total || 0])
  );
  const transferOutByAccount = Object.fromEntries(
    transferOutTotals.map((row) => [String(row._id), row.total || 0])
  );
  const transferInByAccount = Object.fromEntries(
    transferInTotals.map((row) => [String(row._id), row.total || 0])
  );

  const hasTransactions =
    incomeTotals.some((row) => (row.total || 0) > 0) ||
    expenseTotals.some((row) => (row.total || 0) > 0) ||
    transferOutTotals.some((row) => (row.total || 0) > 0);

  const withBalances = accounts.map((account) => {
    const id = String(account._id);
    const incomeTotal = incomeByAccount[id] || 0;
    const expenseTotal = expenseByAccount[id] || 0;
    const transferOut = transferOutByAccount[id] || 0;
    const transferIn = transferInByAccount[id] || 0;
    const balance =
      roundMoney(account.openingBalance + incomeTotal - expenseTotal - transferOut + transferIn) ??
      0;

    return {
      id: account._id,
      name: account.name,
      type: account.type,
      openingBalance: account.openingBalance,
      isDefault: account.isDefault,
      balance,
    };
  });

  return res.status(200).json({ accounts: withBalances, hasTransactions });
});

exports.createAccount = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const type = ["bank", "cash", "other"].includes(req.body.type) ? req.body.type : "bank";
  const openingResult = parseOpeningBalance(req.body.openingBalance ?? 0);

  if (!name) {
    throw new HttpError(400, "Account name is required");
  }
  if (openingResult.error) {
    throw new HttpError(400, openingResult.error);
  }

  try {
    const account = await Account.create({
      userId: req.userId,
      name,
      type,
      openingBalance: openingResult.amount ?? 0,
      isDefault: false,
    });
    return res.status(201).json(account);
  } catch (error) {
    if (error?.code === 11000) {
      throw new HttpError(409, "An account with that name already exists");
    }
    throw error;
  }
});

exports.updateAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new HttpError(400, "Invalid account id");
  }

  const account = await Account.findOne({ _id: id, userId: req.userId });
  if (!account) {
    throw new HttpError(404, "Account not found");
  }

  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (!name) throw new HttpError(400, "Account name is required");
    account.name = name;
  }
  if (req.body.type !== undefined) {
    if (!["bank", "cash", "other"].includes(req.body.type)) {
      throw new HttpError(400, "Invalid account type");
    }
    account.type = req.body.type;
  }
  if (req.body.openingBalance !== undefined) {
    const openingResult = parseOpeningBalance(req.body.openingBalance);
    if (openingResult.error || openingResult.amount === null) {
      throw new HttpError(400, openingResult.error || "Invalid opening balance");
    }
    account.openingBalance = openingResult.amount;
    if (account.isDefault) {
      await User.updateOne(
        { _id: req.userId },
        { $set: { openingBalanceSet: true }, $unset: { openingBalance: 1 } }
      );
    }
  }
  if (req.body.isDefault === true) {
    await Account.updateMany({ userId: req.userId }, { $set: { isDefault: false } });
    account.isDefault = true;
  }

  try {
    await account.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw new HttpError(409, "An account with that name already exists");
    }
    throw error;
  }

  return res.status(200).json(account);
});

exports.deleteAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new HttpError(400, "Invalid account id");
  }

  const account = await Account.findOne({ _id: id, userId: req.userId });
  if (!account) {
    throw new HttpError(404, "Account not found");
  }
  if (account.isDefault) {
    throw new HttpError(400, "Cannot delete the default account");
  }

  const [expenseCount, incomeCount, transferCount] = await Promise.all([
    Expense.countDocuments({ accountId: id, userId: req.userId }),
    Income.countDocuments({ accountId: id, userId: req.userId }),
    Transfer.countDocuments({
      userId: req.userId,
      $or: [{ fromAccountId: id }, { toAccountId: id }],
    }),
  ]);
  if (expenseCount + incomeCount + transferCount > 0) {
    throw new HttpError(400, "Move or delete transactions before removing this account");
  }

  await account.deleteOne();
  return res.status(200).json({ message: "Account deleted" });
});
