const mongoose = require("mongoose");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const Transfer = require("../models/Transfer");
const Account = require("../models/Account");
const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");
const { loadAccountsWithBalances } = require("./accounts");
const {
  periodBounds,
  parseDateKey,
  parseMonthKey,
  getPeriodMonthKey,
  formatMonthKeyUtc,
} = require("../utils/period");
const {
  activityFromMonth,
  rewindBalance,
  priorGracePaid,
  carriedForwardOpening,
} = require("../utils/monthBalances");
const { getCreditBillPaymentStatus } = require("../utils/creditStatement");
const { CARD_PAYMENT_SUBCATEGORY, paymentSettlesCreditAccount } = require("../utils/creditCardPayments");
const { RESALE_INVENTORY_SUBCATEGORY } = require("../utils/consumption");
const { resaleProfitByIncomeId } = require("../utils/resaleSales");
const {
  REFUND_SUBCATEGORY,
  REFUND_WINDOW_DAYS,
  attachRemaining,
} = require("../utils/spendRefunds");
const { REFUNDABLE_EXPENSE_FILTER } = require("../utils/refundLinkGuard");

function refundExpenseId(row) {
  return row.refundOfExpenseId ? String(row.refundOfExpenseId) : "";
}

const SEARCH_LIMIT = 150;

function periodSummary(
  account,
  allIncomes,
  allExpenses,
  allTransfers,
  monthKey,
  creditAccounts,
  cycle
) {
  const { fromThisMonth, afterThisMonth } = activityFromMonth(
    allIncomes,
    allExpenses,
    allTransfers,
    [String(account.id)],
    monthKey,
    creditAccounts,
    cycle
  );
  const statementOpening = rewindBalance(account.balance || 0, fromThisMonth);
  const monthEnd = rewindBalance(account.balance || 0, afterThisMonth);
  const creditCycle = account.type === "credit" && cycle !== "calendar";
  const gracePaid = creditCycle
    ? priorGracePaid(allExpenses, allTransfers, monthKey, cycle, account, creditAccounts)
    : 0;
  const monthStartOpening = creditCycle
    ? carriedForwardOpening(statementOpening, gracePaid)
    : statementOpening;
  const creditBill = creditCycle
    ? getCreditBillPaymentStatus({
        monthKey,
        closingBalance: monthEnd,
        expenses: allExpenses,
        transfers: allTransfers,
        creditAccount: account,
        creditAccounts,
        cycle,
      })
    : null;
  return {
    monthStartOpening,
    statementOpening,
    monthEndBalance: monthEnd,
    creditBill,
  };
}

function asObjectId(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

function spendStatsFromEntries(entries) {
  const categorySums = {};
  const subcategorySums = {};
  const monthlyMap = {};
  const monthlyCategoryMap = {};

  for (const entry of entries) {
    const cat = entry.category || "Other";
    const sub = entry.subcategory || "Uncategorized";
    const monthKey = entry.monthKey || "";
    const total = Number(entry.total) || 0;
    categorySums[cat] = (categorySums[cat] || 0) + total;
    if (!subcategorySums[cat]) subcategorySums[cat] = {};
    subcategorySums[cat][sub] = (subcategorySums[cat][sub] || 0) + total;
    if (monthKey) {
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + total;
      const grain = `${monthKey}\0${cat}\0${sub}`;
      monthlyCategoryMap[grain] = (monthlyCategoryMap[grain] || 0) + total;
    }
  }

  for (const cat of Object.keys(categorySums)) {
    categorySums[cat] = Math.max(0, categorySums[cat]);
    for (const sub of Object.keys(subcategorySums[cat] || {})) {
      subcategorySums[cat][sub] = Math.max(0, subcategorySums[cat][sub]);
    }
  }
  for (const monthKey of Object.keys(monthlyMap)) {
    monthlyMap[monthKey] = Math.max(0, monthlyMap[monthKey]);
  }

  const monthlyTotals = Object.keys(monthlyMap)
    .sort((a, b) => b.localeCompare(a))
    .map((monthKey) => ({ monthKey, total: monthlyMap[monthKey] }));

  const monthlyCategoryTotals = Object.entries(monthlyCategoryMap)
    .map(([grain, total]) => {
      const [monthKey, category, subcategory] = grain.split("\0");
      return {
        monthKey,
        category,
        subcategory,
        total: Math.max(0, Number(total) || 0),
      };
    })
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey) || a.category.localeCompare(b.category));

  return {
    categorySums,
    subcategorySums,
    monthlyTotals,
    monthlyCategoryTotals,
    total: Object.values(categorySums).reduce((sum, value) => sum + value, 0),
  };
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
  const expenseMatch = {
    userId: userObjectId,
    subcategory: { $nin: [CARD_PAYMENT_SUBCATEGORY, RESALE_INVENTORY_SUBCATEGORY] },
  };
  const refundMatch = {
    userId: userObjectId,
    subcategory: REFUND_SUBCATEGORY,
    refundOfExpenseId: { $exists: true, $ne: null },
  };
  if (accountId) {
    expenseMatch.accountId = accountId;
    refundMatch.accountId = accountId;
  }

  const refundRows = await Income.find(refundMatch)
    .select("amount refundOfExpenseId")
    .lean();

  const grouped = await Expense.aggregate([
    { $match: expenseMatch },
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
  const entries = grouped.map((row) => ({
    category: row._id.category,
    subcategory: row._id.subcategory,
    monthKey: row._id.monthKey,
    total: row.total,
  }));

  const linkedIds = refundRows
    .map((row) => row.refundOfExpenseId)
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!linkedIds.length) {
    return res.status(200).json(spendStatsFromEntries(entries));
  }

  const linkedExpenses = await Expense.find({
    userId: userObjectId,
    _id: { $in: linkedIds },
  })
    .select("category subcategory date")
    .lean();
  const byId = Object.fromEntries(linkedExpenses.map((row) => [String(row._id), row]));
  const next = entries.map((entry) => ({ ...entry }));
  for (const refund of refundRows) {
    const expense = byId[refundExpenseId(refund)];
    if (!expense) continue;
    const cat = expense.category || "Other";
    const sub = expense.subcategory || "Uncategorized";
    const rawDate = expense.date;
    const date = rawDate instanceof Date ? rawDate : rawDate ? new Date(rawDate) : null;
    const month = date && !Number.isNaN(date.getTime()) ? formatMonthKeyUtc(date) : "";
    const amount = Number(refund.amount) || 0;
    const index = next.findIndex(
      (row) => row.category === cat && row.subcategory === sub && row.monthKey === month
    );
    if (index >= 0) {
      next[index] = { ...next[index], total: (Number(next[index].total) || 0) - amount };
    } else {
      next.push({ category: cat, subcategory: sub, monthKey: month, total: -amount });
    }
  }
  return res.status(200).json(spendStatsFromEntries(next));
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
    const accounts = await Account.find({ userId }).select("name type statementDay dueDay").lean();
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

    const selectedAccount = accountObjectId
      ? accounts.find((account) => String(account._id) === String(accountObjectId))
      : null;
    const accountCycle =
      selectedAccount?.type === "credit" && selectedAccount.statementDay && selectedAccount.dueDay
        ? { statementDay: selectedAccount.statementDay, dueDay: selectedAccount.dueDay }
        : "calendar";
    if (monthKey && parseMonthKey(monthKey)) {
      const bounds = periodBounds(monthKey, accountCycle);
      const dateRange = { $gte: bounds.start, $lt: bounds.endExclusive };
      expenseFilter.date = dateRange;
      incomeFilter.date = dateRange;
      transferFilter.date = dateRange;
    }
    if (accountObjectId) {
      expenseFilter.$and = [
        ...(expenseFilter.$and || []),
        {
          $or: [{ accountId: accountObjectId }, { settlesAccountId: accountObjectId }],
        },
      ];
      incomeFilter.accountId = accountObjectId;
      transferFilter.$and = [
        ...(transferFilter.$and || []),
        {
          $or: [{ fromAccountId: accountObjectId }, { toAccountId: accountObjectId }],
        },
      ];
    }

    const [expenses, incomes, transfers] = await Promise.all([
      Expense.find(expenseFilter).sort({ date: -1, _id: -1 }).limit(SEARCH_LIMIT).lean(),
      Income.find(incomeFilter).sort({ date: -1, _id: -1 }).limit(SEARCH_LIMIT).lean(),
      Transfer.find(transferFilter).sort({ date: -1, _id: -1 }).limit(SEARCH_LIMIT).lean(),
    ]);
    return res.status(200).json({
      expenses,
      incomes,
      transfers,
      truncated:
        expenses.length === SEARCH_LIMIT ||
        incomes.length === SEARCH_LIMIT ||
        transfers.length === SEARCH_LIMIT,
    });
  }

  if (monthKey) {
    if (!parseMonthKey(monthKey)) {
      return res.status(400).json({ message: "Invalid monthKey" });
    }

    const { accounts, hasTransactions } = await loadAccountsWithBalances(userId);
    const creditAccounts = accounts.filter((account) => account.type === "credit");
    const creditAccountIds = creditAccounts.map((account) => asObjectId(account.id)).filter(Boolean);
    const selected = accountObjectId
      ? accounts.filter((account) => String(account.id) === String(accountObjectId))
      : accounts;
    const creditAccount = selected.length === 1 && selected[0].type === "credit" ? selected[0] : null;
    const accountCycle =
      creditAccount && creditAccount.statementDay && creditAccount.dueDay
        ? { statementDay: creditAccount.statementDay, dueDay: creditAccount.dueDay }
        : "calendar";

    const bounds = periodBounds(monthKey, accountCycle);
    const since = bounds.start;
    const refundSince = new Date();
    refundSince.setUTCDate(refundSince.getUTCDate() - REFUND_WINDOW_DAYS);
    refundSince.setUTCHours(0, 0, 0, 0);
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const [allExpenses, allIncomes, allTransfers, resaleLots, resaleSales, refundableExpenses, refundLinks] =
    await Promise.all([
      Expense.find({ userId: userObjectId, date: { $gte: since } }).sort({ date: -1, _id: -1 }).lean(),
      Income.find({ userId: userObjectId, date: { $gte: since } }).sort({ date: -1, _id: -1 }).lean(),
      Transfer.find({ userId: userObjectId, date: { $gte: since } }).sort({ date: -1, _id: -1 }).lean(),
      Expense.find({ userId: userObjectId, subcategory: RESALE_INVENTORY_SUBCATEGORY })
        .select("title amount date accountId category subcategory icon")
        .sort({ date: -1, _id: -1 })
        .lean(),
      Income.find({
        userId: userObjectId,
        resaleOfExpenseId: { $exists: true, $ne: null },
      })
        .select("amount date resaleOfExpenseId")
        .sort({ date: 1, _id: 1 })
        .lean(),
      Expense.find({
        userId: userObjectId,
        accountId: { $in: creditAccountIds },
        ...REFUNDABLE_EXPENSE_FILTER,
        date: { $gte: refundSince },
      })
        .select("title amount date accountId category subcategory icon")
        .sort({ date: -1, _id: -1 })
        .lean(),
      Income.find({
        userId: userObjectId,
        subcategory: REFUND_SUBCATEGORY,
        refundOfExpenseId: { $exists: true, $ne: null },
      })
        .select("amount refundOfExpenseId")
        .lean(),
    ]);
    const resaleProfitById = resaleProfitByIncomeId(resaleLots, resaleSales);
    const lotsWithRemaining = attachRemaining(resaleLots, resaleSales, (sale) =>
      sale.resaleOfExpenseId ? String(sale.resaleOfExpenseId) : ""
    );
    const refundableWithRemaining = attachRemaining(refundableExpenses, refundLinks, refundExpenseId);

    const accountOpts = { creditAccount, creditAccounts };
    const expenses = allExpenses.filter(
      (tx) =>
        inPeriod(tx, monthKey, accountCycle) &&
        matchesAccount(tx, accountObjectId, { kind: "expense", ...accountOpts })
    );
    const incomes = allIncomes
      .filter(
        (tx) =>
          inPeriod(tx, monthKey, accountCycle) && matchesAccount(tx, accountObjectId, { kind: "income" })
      )
      .map((tx) => {
        const profitAmount = resaleProfitById[String(tx._id)];
        return profitAmount == null ? tx : { ...tx, profitAmount };
      });
    const transfers = allTransfers.filter(
      (tx) =>
        inPeriod(tx, monthKey, accountCycle) &&
        matchesAccount(tx, accountObjectId, { kind: "transfer" })
    );
    const expensesWithRemaining = attachRemaining(expenses, refundLinks, refundExpenseId);

    const accountsWithPeriod = accounts.map((account) => ({
      ...account,
      ...periodSummary(
        account,
        allIncomes,
        allExpenses,
        allTransfers,
        monthKey,
        creditAccounts,
        accountCycle
      ),
    }));
    const selectedWithPeriod = accountObjectId
      ? accountsWithPeriod.filter((account) => String(account.id) === String(accountObjectId))
      : accountsWithPeriod;
    const monthStartOpening = selectedWithPeriod.reduce(
      (sum, account) => sum + (account.monthStartOpening || 0),
      0
    );
    const statementOpening = selectedWithPeriod.reduce(
      (sum, account) => sum + (account.statementOpening || 0),
      0
    );
    const monthEndBalance = selectedWithPeriod.reduce(
      (sum, account) => sum + (account.monthEndBalance || 0),
      0
    );
    const creditBill = creditAccount
      ? selectedWithPeriod.find((account) => String(account.id) === String(creditAccount.id))
          ?.creditBill || null
      : null;

  return res.status(200).json({
      accounts: accountsWithPeriod,
      hasTransactions,
    expenses: expensesWithRemaining,
    incomes,
    transfers,
      resaleLots: lotsWithRemaining,
      refundableExpenses: refundableWithRemaining,
      monthStartOpening,
      statementOpening,
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
    const expenses = await Expense.find({
      userId: userObjectId,
      date: dateFilter,
      ...accountMatch,
    })
      .sort({ date: -1, _id: -1 })
      .lean();
    const expenseIds = expenses.map((row) => row._id);
    const refundLinks = expenseIds.length
      ? await Income.find({
          userId: userObjectId,
          subcategory: REFUND_SUBCATEGORY,
          refundOfExpenseId: { $in: expenseIds },
        })
          .select("amount refundOfExpenseId")
          .lean()
      : [];
    return res.status(200).json({
      expenses: attachRemaining(expenses, refundLinks, refundExpenseId),
    });
  }

  return res.status(400).json({ message: "monthKey, q, or from and to are required" });
});
