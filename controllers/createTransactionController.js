const { validateTransactionBody } = require("../utils/validation");
const { HttpError } = require("../utils/HttpError");
const asyncHandler = require("../middleware/asyncHandler");
const { editWindowCutoff, editWindowErrorMessage } = require("../utils/editWindow");
const { assertAccountOwned } = require("../utils/accountAccess");
const Account = require("../models/Account");
const { CARD_PAYMENT_SUBCATEGORY } = require("../utils/creditCardPayments");
const { RESALE_INVENTORY_SUBCATEGORY } = require("../utils/consumption");
const { RESALE_INCOME_SUBCATEGORY } = require("../utils/resaleSales");
const { REFUND_SUBCATEGORY } = require("../utils/spendRefunds");
const { findRefundableExpense, assertRefundFits } = require("../utils/refundLinkGuard");
const { bumpDataVersion } = require("../utils/dataVersion");
const mongoose = require("mongoose");

async function withSettlesAccount(userId, data) {
  if (data.subcategory !== CARD_PAYMENT_SUBCATEGORY) {
    const next = { ...data };
    delete next.settlesAccountId;
    return next;
  }
  if (data.settlesAccountId) {
    await assertAccountOwned(userId, data.settlesAccountId);
    return data;
  }
  const credits = await Account.find({ userId, type: "credit" }).select("_id").lean();
  if (credits.length === 1) {
    return { ...data, settlesAccountId: credits[0]._id };
  }
  return data;
}

function assertObjectId(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new HttpError(400, "Invalid record id");
  }
}

function ownerFilter(req, id) {
  return {
    _id: id,
    userId: req.userId,
  };
}

async function withResaleLink(userId, data) {
  if (data.subcategory !== RESALE_INCOME_SUBCATEGORY) {
    const next = { ...data };
    delete next.resaleOfExpenseId;
    return next;
  }
  if (!data.resaleOfExpenseId) {
    throw new HttpError(400, "Select which stock this resale is from");
  }
  const Expense = require("../models/Expense");
  const lot = await Expense.exists({
    _id: data.resaleOfExpenseId,
    userId,
    subcategory: RESALE_INVENTORY_SUBCATEGORY,
  });
  if (!lot) {
    throw new HttpError(400, "Resale stock not found");
  }
  return data;
}

async function withRefundLink(userId, data, { excludeIncomeId } = {}) {
  if (data.subcategory !== REFUND_SUBCATEGORY) {
    const next = { ...data };
    delete next.refundOfExpenseId;
    return next;
  }
  if (!data.refundOfExpenseId) {
    throw new HttpError(400, "Select which expense this refunds");
  }
  const original = await findRefundableExpense(userId, data.refundOfExpenseId);
  if (!original) {
    throw new HttpError(400, "Original expense not found");
  }
  await assertRefundFits(userId, original, data.amount, excludeIncomeId);
  return data;
}

async function withIncomeLinks(userId, data, options) {
  return withRefundLink(userId, await withResaleLink(userId, data), options);
}

function createTransactionController(Model, allowedCategories, subcategoryMap) {
  return {
    add: asyncHandler(async (req, res) => {
      const result = validateTransactionBody(
        req.body,
        req.userId,
        allowedCategories,
        subcategoryMap
      );

      if (result.error) {
        throw new HttpError(400, result.error);
      }

      await assertAccountOwned(req.userId, result.data.accountId);
      const payload = await withSettlesAccount(req.userId, result.data);
      const recordPayload =
        Model.modelName === "Income" ? await withIncomeLinks(req.userId, payload) : payload;

      const record = await Model.create(recordPayload);
      await bumpDataVersion(req.userId);
      return res.status(201).json(record);
    }),

    update: asyncHandler(async (req, res) => {
      const { id } = req.params;
      assertObjectId(id);

      const result = validateTransactionBody(
        req.body,
        req.userId,
        allowedCategories,
        subcategoryMap
      );

      if (result.error) {
        throw new HttpError(400, result.error);
      }

      await assertAccountOwned(req.userId, result.data.accountId);
      const payload = await withSettlesAccount(req.userId, result.data);
      const recordPayload =
        Model.modelName === "Income"
          ? await withIncomeLinks(req.userId, payload, { excludeIncomeId: id })
          : payload;
      const {
        title,
        amount,
        category,
        subcategory,
        icon,
        date,
        accountId,
        settlesAccountId,
        refundOfExpenseId,
        resaleOfExpenseId,
      } = recordPayload;
      const update = {
        $set: { title, amount, category, subcategory, icon, date, accountId },
      };
      if (settlesAccountId) update.$set.settlesAccountId = settlesAccountId;
      else update.$unset = { ...(update.$unset || {}), settlesAccountId: 1 };
      if (refundOfExpenseId) update.$set.refundOfExpenseId = refundOfExpenseId;
      else if (Model.modelName === "Income") {
        update.$unset = { ...(update.$unset || {}), refundOfExpenseId: 1 };
      }
      if (resaleOfExpenseId) update.$set.resaleOfExpenseId = resaleOfExpenseId;
      else if (Model.modelName === "Income") {
        update.$unset = { ...(update.$unset || {}), resaleOfExpenseId: 1 };
      }

      const record = await Model.findOneAndUpdate(
        {
          ...ownerFilter(req, id),
          createdAt: { $gte: editWindowCutoff() },
        },
        update,
        { new: true }
      );

      if (!record) {
        const exists = await Model.exists(ownerFilter(req, id));
        if (!exists) {
          throw new HttpError(404, "Record not found");
        }
        throw new HttpError(403, editWindowErrorMessage("edited"));
      }

      await bumpDataVersion(req.userId);
      return res.status(200).json(record);
    }),

    delete: asyncHandler(async (req, res) => {
      const { id } = req.params;
      assertObjectId(id);

      const record = await Model.findOneAndDelete({
        ...ownerFilter(req, id),
        createdAt: { $gte: editWindowCutoff() },
      });

      if (!record) {
        const exists = await Model.exists(ownerFilter(req, id));
        if (!exists) {
          throw new HttpError(404, "Record not found");
        }
        throw new HttpError(403, editWindowErrorMessage("deleted"));
      }

      await bumpDataVersion(req.userId);
      return res.status(200).json({ message: `${Model.modelName} deleted` });
    }),
  };
}

module.exports = { createTransactionController };
