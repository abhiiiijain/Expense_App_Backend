require("dotenv").config({ path: ".env.development" });
const mongoose = require("mongoose");
const Expense = require("../models/Expense");
const User = require("../models/User");
const RecurringExpense = require("../models/RecurringExpense");
const { bumpDataVersion } = require("../utils/dataVersion");

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function monthKeyUtc(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

(async () => {
  await mongoose.connect(process.env.MONGO_URL);
  const user = await User.findOne({ email: "abhi@spendwise.com" }).select("_id").lean();
  const userId = user._id;

  const rows = await Expense.find({
    userId,
    subcategory: { $in: ["Mutual Funds", "Subscriptions", "Cloud & Hosting"] },
  })
    .select("title amount category subcategory icon accountId date")
    .sort({ date: 1 })
    .lean();

  const groups = new Map();
  for (const row of rows) {
    const key = [
      String(row.subcategory),
      String(row.accountId),
      String(row.title || "")
        .trim()
        .toLowerCase(),
    ].join("::");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const created = [];
  for (const [, list] of groups) {
    if (list.length < 2) continue;
    const last = list[list.length - 1];
    const days = list.map((row) => new Date(row.date).getUTCDate());
    const freq = {};
    for (const day of days) freq[day] = (freq[day] || 0) + 1;
    const dueDay = Math.min(
      28,
      Math.max(
        1,
        Number(
          Object.entries(freq).sort((a, b) => b[1] - a[1] || Number(a[0]) - Number(b[0]))[0][0]
        )
      )
    );

    const existing = await RecurringExpense.findOne({
      userId,
      active: true,
      subcategory: last.subcategory,
      accountId: last.accountId,
      title: new RegExp(`^${escapeRegex(last.title)}$`, "i"),
    }).lean();
    if (existing) {
      created.push({ skipped: true, title: last.title, id: String(existing._id) });
      continue;
    }

    const row = await RecurringExpense.create({
      userId,
      title: last.title,
      amount: Number(last.amount),
      category: last.category,
      subcategory: last.subcategory,
      icon: last.icon || "📈",
      accountId: last.accountId,
      dueDay,
      lastFulfilledMonthKey: monthKeyUtc(last.date),
      active: true,
    });
    created.push({
      title: row.title,
      amount: row.amount,
      dueDay: row.dueDay,
      lastFulfilledMonthKey: row.lastFulfilledMonthKey,
      id: String(row._id),
    });
  }

  await bumpDataVersion(userId);
  const active = await RecurringExpense.find({ userId, active: true })
    .select("title amount dueDay lastFulfilledMonthKey subcategory")
    .lean();
  console.log(JSON.stringify({ created, active }, null, 2));
  await mongoose.disconnect();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
