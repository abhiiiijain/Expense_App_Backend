const mongoose = require("mongoose");
const Account = require("../models/Account");
const { HttpError } = require("./HttpError");

async function assertAccountOwned(userId, accountId, options = {}) {
  if (!mongoose.Types.ObjectId.isValid(accountId)) {
    throw new HttpError(400, options.invalidMessage || "Invalid account");
  }

  let query = Account.findOne({ _id: accountId, userId });
  if (options.select) {
    query = query.select(options.select);
  }

  const account = options.lean === false ? await query : await query.lean();
  if (!account) {
    throw new HttpError(400, options.notFoundMessage || "Account not found");
  }
  return account;
}

/**
 * Validate and load multiple owned accounts (order matches accountIds).
 * @param {string[]} accountIds
 */
async function assertAccountsOwned(userId, accountIds, options = {}) {
  const ids = accountIds.map(String);

  for (const id of ids) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new HttpError(400, options.invalidMessage || "Invalid account");
    }
  }

  if (options.requireDistinct && new Set(ids).size !== ids.length) {
    throw new HttpError(400, options.sameMessage || "Choose two different accounts");
  }

  const accounts = await Account.find({
    userId,
    _id: { $in: ids },
  })
    .select(options.select || "_id name")
    .lean();

  if (accounts.length !== new Set(ids).size) {
    throw new HttpError(
      400,
      options.notFoundMessage || "Both accounts must belong to you"
    );
  }

  const byId = Object.fromEntries(accounts.map((account) => [String(account._id), account]));
  return ids.map((id) => byId[id]);
}

module.exports = {
  assertAccountOwned,
  assertAccountsOwned,
};
