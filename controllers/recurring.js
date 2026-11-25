const mongoose = require("mongoose");
const RecurringExpense = require("../models/RecurringExpense");
const Account = require("../models/Account");
const { HttpError } = require("../utils/HttpError");
const asyncHandler = require("../middleware/asyncHandler");
const { roundMoney } = require("../utils/validation");
const { bumpDataVersion } = require("../utils/dataVersion");

const ALLOWED = {
  "Mutual Funds": "Savings & Investments",
  Subscriptions: "Entertainment",
  "Cloud & Hosting": "Education & Work",
};

function serialize(row) {
  return {
    id: String(row._id),
    title: row.title,
    amount: row.amount,
    category: row.category,
    subcategory: row.subcategory,
    icon: row.icon,
    accountId: String(row.accountId),
    dueDay: row.dueDay,
    lastFulfilledMonthKey: row.lastFulfilledMonthKey || null,
    active: Boolean(row.active),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseDueDay(value) {
  const day = Number(value);
  if (!Number.isInteger(day) || day < 1 || day > 28) {
    return { error: "Due day must be a day from 1 to 28" };
  }
  return { day };
}

exports.listRecurring = asyncHandler(async (req, res) => {
  const activeOnly = String(req.query.active || "true") !== "false";
  const filter = { userId: req.userId };
  if (activeOnly) filter.active = true;
  const rows = await RecurringExpense.find(filter).sort({ dueDay: 1, title: 1 }).lean();
  return res.status(200).json({ recurring: rows.map(serialize) });
});

exports.createRecurring = asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim();
  const subcategory = String(req.body.subcategory || "").trim();
  const category = String(req.body.category || "").trim();
  const icon = String(req.body.icon || "").trim() || "📈";
  const accountId = String(req.body.accountId || "").trim();
  const amount = roundMoney(req.body.amount);
  const due = parseDueDay(req.body.dueDay);

  if (!title) throw new HttpError(400, "Title is required");
  if (!ALLOWED[subcategory]) {
    throw new HttpError(400, "This subcategory can't be set as monthly");
  }
  if (category !== ALLOWED[subcategory]) {
    throw new HttpError(400, "Category does not match subcategory");
  }
  if (amount === null || amount < 0.01) throw new HttpError(400, "Amount must be greater than 0");
  if (due.error) throw new HttpError(400, due.error);
  if (!mongoose.Types.ObjectId.isValid(accountId)) {
    throw new HttpError(400, "Valid account is required");
  }

  const account = await Account.findOne({ _id: accountId, userId: req.userId }).select("_id").lean();
  if (!account) throw new HttpError(400, "Account not found");

  const existing = await RecurringExpense.findOne({
    userId: req.userId,
    active: true,
    subcategory,
    accountId,
    title: new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  })
    .select("_id")
    .lean();
  if (existing) {
    throw new HttpError(400, "A monthly reminder for this already exists");
  }

  // Prefer client monthKey (expense month); else leave null so due logic can fire.
  const fulfilled = String(req.body.lastFulfilledMonthKey || "").trim();
  const lastFulfilledMonthKey = /^\d{4}-\d{2}$/.test(fulfilled) ? fulfilled : null;

  const row = await RecurringExpense.create({
    userId: req.userId,
    title,
    amount,
    category,
    subcategory,
    icon,
    accountId,
    dueDay: due.day,
    active: true,
    lastFulfilledMonthKey,
  });
  await bumpDataVersion(req.userId);
  return res.status(201).json(serialize(row));
});

exports.updateRecurring = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) throw new HttpError(400, "Invalid id");

  const row = await RecurringExpense.findOne({ _id: id, userId: req.userId });
  if (!row) throw new HttpError(404, "Reminder not found");

  if (req.body.active !== undefined) {
    row.active = Boolean(req.body.active);
  }
  if (req.body.dueDay !== undefined) {
    const due = parseDueDay(req.body.dueDay);
    if (due.error) throw new HttpError(400, due.error);
    row.dueDay = due.day;
  }
  if (req.body.amount !== undefined) {
    const amount = roundMoney(req.body.amount);
    if (amount === null || amount < 0.01) throw new HttpError(400, "Amount must be greater than 0");
    row.amount = amount;
  }
  if (req.body.title !== undefined) {
    const title = String(req.body.title || "").trim();
    if (!title) throw new HttpError(400, "Title is required");
    row.title = title;
  }

  await row.save();
  await bumpDataVersion(req.userId);
  return res.status(200).json(serialize(row));
});

exports.fulfillRecurring = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const monthKey = String(req.body.monthKey || "").trim();
  if (!mongoose.Types.ObjectId.isValid(id)) throw new HttpError(400, "Invalid id");
  if (!/^\d{4}-\d{2}$/.test(monthKey)) throw new HttpError(400, "monthKey must be YYYY-MM");

  const row = await RecurringExpense.findOneAndUpdate(
    { _id: id, userId: req.userId },
    { $set: { lastFulfilledMonthKey: monthKey } },
    { new: true }
  );
  if (!row) throw new HttpError(404, "Reminder not found");
  await bumpDataVersion(req.userId);
  return res.status(200).json(serialize(row));
});
