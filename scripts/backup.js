/**
 * Export all SpendWise collections to JSON under ./backups/
 *
 * Usage:
 *   NODE_ENV=development npm run backup
 *   NODE_ENV=production npm run backup
 */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { connectDB } = require("../db");
const Expense = require("../models/Expense");
const Income = require("../models/Income");
const User = require("../models/User");
const Account = require("../models/Account");
const Budget = require("../models/Budget");
const logger = require("../utils/logger");

async function backup() {
  await connectDB();

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(process.cwd(), "backups", stamp);
  fs.mkdirSync(dir, { recursive: true });

  const Transfer = require("../models/Transfer");
  const [expenses, incomes, users, accounts, budgets, transfers] = await Promise.all([
    Expense.find({}).lean(),
    Income.find({}).lean(),
    User.find({}).select("-passwordHash").lean(),
    Account.find({}).lean(),
    Budget.find({}).lean(),
    Transfer.find({}).lean(),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    counts: {
      expenses: expenses.length,
      incomes: incomes.length,
      users: users.length,
      accounts: accounts.length,
      budgets: budgets.length,
      transfers: transfers.length,
    },
    expenses,
    incomes,
    users,
    accounts,
    budgets,
    transfers,
  };

  const file = path.join(dir, "spendwise-backup.json");
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), "utf8");

  logger.info("backup.complete", { file, ...payload.counts });
  console.log(`Backup written to ${file}`);
  console.log(payload.counts);

  await mongoose.disconnect();
}

backup().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch (_e) {
    // ignore
  }
  process.exit(1);
});
