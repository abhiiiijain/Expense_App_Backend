const Account = require("../models/Account");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const Transfer = require("../models/Transfer");
const User = require("../models/User");
const { HttpError } = require("../utils/HttpError");
const { bumpDataVersion } = require("../utils/dataVersion");
const asyncHandler = require("../middleware/asyncHandler");
const { parseOpeningBalance, parseCreditCycle, roundMoney } = require("../utils/validation");
const {
  CARD_PAYMENT_SUBCATEGORY,
  cardPaymentsToward,
  postedOnCreditAccount,
} = require("../utils/creditCardPayments");
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

async function loadAccountsWithBalances(userId) {
  const accounts = await Account.find({ userId })
    .sort({ isDefault: -1, name: 1 })
    .lean();

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const [incomeTotals, expenseTotals, transferOutTotals, transferInTotals, cardPayments] =
    await Promise.all([
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
      Expense.find({ userId: userObjectId, subcategory: CARD_PAYMENT_SUBCATEGORY })
        .select("accountId settlesAccountId title amount subcategory")
        .lean(),
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

  const creditAccounts = accounts.filter((account) => account.type === "credit");

  for (const payment of cardPayments) {
    if (!postedOnCreditAccount(payment, creditAccounts)) continue;
    const fromId = String(payment.accountId);
    expenseByAccount[fromId] = (expenseByAccount[fromId] || 0) - (Number(payment.amount) || 0);
  }

  const withBalances = accounts.map((account) => {
    const id = String(account._id);
    const incomeTotal = incomeByAccount[id] || 0;
    const expenseTotal = expenseByAccount[id] || 0;
    const transferOut = transferOutByAccount[id] || 0;
    const transferIn = transferInByAccount[id] || 0;
    const settled =
      account.type === "credit"
        ? cardPaymentsToward(cardPayments, account, creditAccounts)
        : 0;
    const balance =
      roundMoney(
        account.openingBalance + incomeTotal - expenseTotal - transferOut + transferIn + settled
      ) ?? 0;

    return {
      id: account._id,
      name: account.name,
      type: account.type,
      openingBalance: account.openingBalance,
      statementDay: account.statementDay ?? null,
      dueDay: account.dueDay ?? null,
      isDefault: account.isDefault,
      balance,
    };
  });

  return { accounts: withBalances, hasTransactions };
}

exports.loadAccountsWithBalances = loadAccountsWithBalances;

exports.listAccounts = asyncHandler(async (req, res) => {
  await ensureDefaultAccount(req.userId);
  const payload = await loadAccountsWithBalances(req.userId);
  return res.status(200).json(payload);
});

exports.createAccount = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const type = Account.ACCOUNT_TYPES.includes(req.body.type) ? req.body.type : "bank";
  const openingResult = parseOpeningBalance(req.body.openingBalance ?? 0);

  if (!name) {
    throw new HttpError(400, "Account name is required");
  }
  if (openingResult.error) {
    throw new HttpError(400, openingResult.error);
  }

  const cycle = parseCreditCycle(req.body, { required: type === "credit" });
  if (cycle.error) {
    throw new HttpError(400, cycle.error);
  }

  try {
    const account = await Account.create({
      userId: req.userId,
      name,
      type,
      openingBalance: openingResult.amount ?? 0,
      isDefault: false,
      ...(type === "credit"
        ? { statementDay: cycle.statementDay, dueDay: cycle.dueDay }
        : {}),
    });
    await bumpDataVersion(req.userId);
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
    if (!Account.ACCOUNT_TYPES.includes(req.body.type)) {
      throw new HttpError(400, "Invalid account type");
    }
    account.type = req.body.type;
  }
  const leaveCredit = account.type !== "credit";
  const hadCycle = account.statementDay != null || account.dueDay != null;
  if (leaveCredit) {
    account.statementDay = undefined;
    account.dueDay = undefined;
  } else if (req.body.statementDay !== undefined || req.body.dueDay !== undefined) {
    const cycle = parseCreditCycle(
      {
        statementDay: req.body.statementDay ?? account.statementDay,
        dueDay: req.body.dueDay ?? account.dueDay,
      },
      { required: true }
    );
    if (cycle.error) {
      throw new HttpError(400, cycle.error);
    }
    account.statementDay = cycle.statementDay;
    account.dueDay = cycle.dueDay;
  }
  if (req.body.openingBalance !== undefined) {
    const openingResult = parseOpeningBalance(req.body.openingBalance);
    if (openingResult.error || openingResult.amount === null) {
      throw new HttpError(400, openingResult.error || "Invalid opening balance");
    }
    account.openingBalance = openingResult.amount;
    if (account.isDefault) {
      await User.updateOne({ _id: req.userId }, { $set: { openingBalanceSet: true } });
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

  if (leaveCredit && hadCycle) {
    await Account.updateOne(
      { _id: account._id },
      { $unset: { statementDay: 1, dueDay: 1 } }
    );
  }

  await bumpDataVersion(req.userId);
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
  await bumpDataVersion(req.userId);
  return res.status(200).json({ message: "Account deleted" });
});
