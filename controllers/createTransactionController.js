const { validateTransactionBody } = require("../utils/validation");
const { HttpError } = require("../utils/HttpError");
const asyncHandler = require("../middleware/asyncHandler");
const { editWindowCutoff, editWindowErrorMessage } = require("../utils/editWindow");
const { assertAccountOwned } = require("../utils/accountAccess");
const mongoose = require("mongoose");

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

      const record = await Model.create(result.data);
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

      const { title, amount, category, subcategory, icon, date, accountId } = result.data;
      const record = await Model.findOneAndUpdate(
        {
          ...ownerFilter(req, id),
          createdAt: { $gte: editWindowCutoff() },
        },
        { $set: { title, amount, category, subcategory, icon, date, accountId } },
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
