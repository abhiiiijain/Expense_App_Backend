/**
 * One-time data backfill: date + default accountId on transactions.
 * Safe to re-run.
 *
 *   NODE_ENV=development node scripts/backfill-accounts-dates.js
 */
const mongoose = require("mongoose");
const { connectDB } = require("../db");
const User = require("../models/User");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const { ensureDefaultAccount } = require("../controllers/accounts");

async function backfill(Model, label) {
  const docs = await Model.find({
    $or: [{ date: { $exists: false } }, { accountId: { $exists: false } }, { accountId: null }],
  }).lean();

  let updated = 0;
  for (const doc of docs) {
    const userId = doc.userId;
    if (!userId) continue;

    const user = await User.findById(userId).select("openingBalance").lean();
    const account = await ensureDefaultAccount(userId, user?.openingBalance ?? 0);

    await Model.collection.updateOne(
      { _id: doc._id },
      {
        $set: {
          date: doc.date || doc.createdAt || new Date(),
          accountId: doc.accountId || account._id,
        },
      }
    );
    updated += 1;
  }

  console.log(`${label}: backfilled ${updated}`);
}

async function main() {
  await connectDB();

  const users = await User.find({}).select("_id openingBalance").lean();
  for (const user of users) {
    await ensureDefaultAccount(user._id, user.openingBalance ?? 0);
  }
  console.log(`default accounts ensured for ${users.length} users`);

  await backfill(Expense, "expenses");
  await backfill(Income, "incomes");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch (_e) {
    // ignore
  }
  process.exit(1);
});
