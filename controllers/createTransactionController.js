const { validateTransactionBody } = require("../utils/validation");
const { HttpError } = require("../utils/HttpError");
const asyncHandler = require("../middleware/asyncHandler");
const { editWindowCutoff, editWindowErrorMessage } = require("../utils/editWindow");
const { assertAccountOwned } = require("../utils/accountAccess");
const Account = require("../models/Account");
const { CARD_PAYMENT_SUBCATEGORY } = require("../utils/creditCardPayments");
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

      const record = await Model.create(payload);
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
      const { title, amount, category, subcategory, icon, date, accountId, settlesAccountId } =
        payload;
      const update = {
        $set: { title, amount, category, subcategory, icon, date, accountId },
      };
      if (settlesAccountId) update.$set.settlesAccountId = settlesAccountId;
      else update.$unset = { settlesAccountId: 1 };

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

      return res.status(200).json({ message: `${Model.modelName} deleted` });
    }),
  };
}

module.exports = { createTransactionController };
