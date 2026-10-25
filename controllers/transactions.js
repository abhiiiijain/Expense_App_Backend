const mongoose = require("mongoose");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const Transfer = require("../models/Transfer");
const Account = require("../models/Account");
const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");
const { loadAccountsWithBalances } = require("./accounts");
const { periodBounds, parseDateKey, parseMonthKey, getPeriodMonthKey } = require("../utils/period");
const { activityFromMonth, rewindBalance } = require("../utils/monthBalances");
const { getCreditBillPaymentStatus } = require("../utils/creditStatement");
const { CARD_PAYMENT_SUBCATEGORY, paymentSettlesCreditAccount } = require("../utils/creditCardPayments");

const SEARCH_LIMIT = 150;

function asObjectId(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function amountQuery(raw) {
  const q = String(raw || "")
    .trim()
    .replace(/[₹,\s]/g, "")
    .replace(/^rs/i, "")
    .replace(/^[-+]/, "");
  if (!/^\d+(\.\d+)?$/.test(q)) return null;
  const n = Number(q);
  if (!Number.isFinite(n)) return null;
  if (q.includes(".")) return { amount: Math.round((n + Number.EPSILON) * 100) / 100 };
  return { amount: { $gte: n, $lt: n + 1 } };
}

function searchFilter(userId, query, extraFields = []) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const q = String(query || "").trim();
  if (!q) return { userId: userObjectId };
  const regex = new RegExp(escapeRegex(q), "i");
  const textClause = {
    $or: [{ title: regex }, { category: regex }, { subcategory: regex }, ...extraFields.map((field) => ({ [field]: regex }))],
  };
  const amount = amountQuery(q);
  return {
    userId: userObjectId,
    ...(amount ? { $or: [textClause, amount] } : textClause),
  };
}

function inPeriod(tx, monthKey, cycle) {
  return getPeriodMonthKey(tx.date || tx.createdAt, cycle) === monthKey;
}

function matchesAccount(tx, accountId, { kind, creditAccount, creditAccounts }) {
  if (!accountId) return true;
  const id = String(accountId);
  if (kind === "transfer") {
    return String(tx.fromAccountId) === id || String(tx.toAccountId) === id;
  }
  if (String(tx.accountId) === id) return true;
  if (kind === "expense" && creditAccount) {
    return paymentSettlesCreditAccount(tx, creditAccount, creditAccounts);
  }
  return false;
}

exports.getTransactionsSync = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).select("dataVersion").lean();
  res.set("Cache-Control", "no-store");
  return res.status(200).json({
    stamp: String(user?.dataVersion || 0),
  });
});

exports.getSpendingStats = asyncHandler(async (req, res) => {
  const userObjectId = new mongoose.Types.ObjectId(req.userId);
  const accountId = asObjectId(req.query.accountId);
  const category = String(req.query.category || "").trim();
  const subcategory = String(req.query.subcategory || "").trim();

  const match = {
    userId: userObjectId,
    subcategory: { $ne: CARD_PAYMENT_SUBCATEGORY },
  };
  if (accountId) match.accountId = accountId;
  if (category && category !== "All") match.category = category;
  if (subcategory && subcategory !== "All") match.subcategory = subcategory;

  const rows = await Expense.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          category: "$category",
          subcategory: "$subcategory",
          monthKey: { $dateToString: { format: "%Y-%m", date: "$date", timezone: "UTC" } },
        },
        total: { $sum: "$amount" },
      },
    },
  ]);

  const categorySums = {};
  const subcategorySums = {};
  const monthlyMap = {};

  for (const row of rows) {
    const cat = row._id.category || "Other";
    const sub = row._id.subcategory || "Uncategorized";
    const monthKey = row._id.monthKey;
    const total = row.total || 0;
    categorySums[cat] = (categorySums[cat] || 0) + total;
    if (!subcategorySums[cat]) subcategorySums[cat] = {};
    subcategorySums[cat][sub] = (subcategorySums[cat][sub] || 0) + total;
    monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + total;
  }

  const monthlyTotals = Object.keys(monthlyMap)
    .sort((a, b) => b.localeCompare(a))
    .map((monthKey) => ({ monthKey, total: monthlyMap[monthKey] }));

  return res.status(200).json({
    categorySums,
    subcategorySums,
    monthlyTotals,
    total: Object.values(categorySums).reduce((sum, value) => sum + value, 0),
  });
});

exports.getTransactions = asyncHandler(async (req, res) => {
  const userId = req.userId;
  const q = String(req.query.q || "").trim();
  const monthKey = String(req.query.monthKey || "").trim();
  const from = parseDateKey(req.query.from);
  const to = parseDateKey(req.query.to);
  const accountId = String(req.query.accountId || "").trim();
  const accountObjectId = asObjectId(accountId);

  if (q) {
    const accounts = await Account.find({ userId }).select("name").lean();
    const matchingAccountIds = accounts
      .filter((account) => String(account.name || "").toLowerCase().includes(q.toLowerCase()))
      .map((account) => account._id);
    const expenseFilter = searchFilter(userId, q);
    const incomeFilter = searchFilter(userId, q);
    const transferFilter = searchFilter(userId, q, ["note"]);
    if (matchingAccountIds.length) {
      expenseFilter.$or = [...(expenseFilter.$or || []), { accountId: { $in: matchingAccountIds } }];
      incomeFilter.$or = [...(incomeFilter.$or || []), { accountId: { $in: matchingAccountIds } }];
      transferFilter.$or = [
        ...(transferFilter.$or || []),
        { fromAccountId: { $in: matchingAccountIds } },
        { toAccountId: { $in: matchingAccountIds } },
      ];
    }
    const [expenses, incomes, transfers] = await Promise.all([
      Expense.find(expenseFilter).sort({ date: -1, _id: -1 }).limit(SEARCH_LIMIT).lean(),
      Income.find(incomeFilter).sort({ date: -1, _id: -1 }).limit(SEARCH_LIMIT).lean(),
      Transfer.find(transferFilter).sort({ date: -1, _id: -1 }).limit(SEARCH_LIMIT).lean(),
    ]);
    return res.status(200).json({ expenses, incomes, transfers });
  }

  if (monthKey) {
    if (!parseMonthKey(monthKey)) {
      return res.status(400).json({ message: "Invalid monthKey" });
    }

    const { accounts, hasTransactions } = await loadAccountsWithBalances(userId);
    const creditAccounts = accounts.filter((account) => account.type === "credit");
    const selected = accountObjectId
      ? accounts.filter((account) => String(account.id) === String(accountObjectId))
      : accounts;
    const selectedIds = selected.map((account) => String(account.id));
    const creditAccount = selected.length === 1 && selected[0].type === "credit" ? selected[0] : null;
    const accountCycle =
      creditAccount && creditAccount.statementDay && creditAccount.dueDay
        ? { statementDay: creditAccount.statementDay, dueDay: creditAccount.dueDay }
        : "calendar";

    const bounds = periodBounds(monthKey, accountCycle);
    const since = bounds.start;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const [allExpenses, allIncomes, allTransfers] = await Promise.all([
      Expense.find({ userId: userObjectId, date: { $gte: since } }).sort({ date: -1, _id: -1 }).lean(),
      Income.find({ userId: userObjectId, date: { $gte: since } }).sort({ date: -1, _id: -1 }).lean(),
      Transfer.find({ userId: userObjectId, date: { $gte: since } }).sort({ date: -1, _id: -1 }).lean(),
    ]);

    const accountOpts = { creditAccount, creditAccounts };
    const expenses = allExpenses.filter(
      (tx) =>
        inPeriod(tx, monthKey, accountCycle) &&
        matchesAccount(tx, accountObjectId, { kind: "expense", ...accountOpts })
    );
    const incomes = allIncomes.filter(
      (tx) =>
        inPeriod(tx, monthKey, accountCycle) && matchesAccount(tx, accountObjectId, { kind: "income" })
    );
    const transfers = allTransfers.filter(
      (tx) =>
        inPeriod(tx, monthKey, accountCycle) &&
        matchesAccount(tx, accountObjectId, { kind: "transfer" })
    );

    const current = selected.reduce((sum, account) => sum + (account.balance || 0), 0);
    const { fromThisMonth, afterThisMonth } = activityFromMonth(
      allIncomes,
      allExpenses,
      allTransfers,
      selectedIds,
      monthKey,
      creditAccounts,
      accountCycle
    );
    const monthStartOpening = rewindBalance(current, fromThisMonth);
    const monthEndBalance = rewindBalance(current, afterThisMonth);
    const creditBill =
      creditAccount && accountCycle !== "calendar"
        ? getCreditBillPaymentStatus({
            monthKey,
            closingBalance: monthEndBalance,
            expenses: allExpenses,
            transfers: allTransfers,
            creditAccount,
            creditAccounts,
            cycle: accountCycle,
          })
        : null;

    return res.status(200).json({
      accounts,
      hasTransactions,
      expenses,
      incomes,
      transfers,
      monthStartOpening,
      monthEndBalance,
      creditBill,
    });
  }

  if (from && to) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const endExclusive = new Date(to);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    const dateFilter = { $gte: from, $lt: endExclusive };
    const accountMatch = accountObjectId ? { accountId: accountObjectId } : {};
    const transferAccount = accountObjectId
      ? { $or: [{ fromAccountId: accountObjectId }, { toAccountId: accountObjectId }] }
      : {};
    const [expenses, incomes, transfers] = await Promise.all([
      Expense.find({ userId: userObjectId, date: dateFilter, ...accountMatch })
        .sort({ date: -1, _id: -1 })
        .lean(),
      Income.find({ userId: userObjectId, date: dateFilter, ...accountMatch })
        .sort({ date: -1, _id: -1 })
        .lean(),
      Transfer.find({ userId: userObjectId, date: dateFilter, ...transferAccount })
        .sort({ date: -1, _id: -1 })
        .lean(),
    ]);
    return res.status(200).json({ expenses, incomes, transfers });
  }

  return res.status(400).json({ message: "monthKey, q, or from and to are required" });
});
