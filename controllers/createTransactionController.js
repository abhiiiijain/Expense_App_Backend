const { validateTransactionBody } = require("../utils/validation");
const { HttpError } = require("../utils/HttpError");
const asyncHandler = require("../middleware/asyncHandler");
const { editWindowCutoff } = require("../utils/editWindow");

function createTransactionController(Model, allowedCategories, subcategoryMap) {
  return {
    add: asyncHandler(async (req, res) => {
      const result = validateTransactionBody(
        req.body,
        req.user.email,
        allowedCategories,
        subcategoryMap
      );

      if (result.error) {
        throw new HttpError(400, result.error);
      }

      const record = await Model.create(result.data);
      return res.status(201).json(record);
    }),

    update: asyncHandler(async (req, res) => {
      const { id } = req.params;
      const result = validateTransactionBody(
        req.body,
        req.user.email,
        allowedCategories,
        subcategoryMap
      );

      if (result.error) {
        throw new HttpError(400, result.error);
      }

      const { title, amount, category, subcategory, icon } = result.data;
      const record = await Model.findOneAndUpdate(
        {
          _id: id,
          email: req.user.email,
          createdAt: { $gte: editWindowCutoff() },
        },
        { $set: { title, amount, category, subcategory, icon } },
        { new: true }
      );

      if (!record) {
        const exists = await Model.exists({ _id: id, email: req.user.email });
        if (!exists) {
          throw new HttpError(404, "Record not found");
        }
        throw new HttpError(
          403,
          "Transactions can only be edited within 24 hours of creation"
        );
      }

      return res.status(200).json(record);
    }),

    delete: asyncHandler(async (req, res) => {
      const { id } = req.params;
      const record = await Model.findOneAndDelete({
        _id: id,
        email: req.user.email,
        createdAt: { $gte: editWindowCutoff() },
      });

      if (!record) {
        const exists = await Model.exists({ _id: id, email: req.user.email });
        if (!exists) {
          throw new HttpError(404, "Record not found");
        }
        throw new HttpError(
          403,
          "Transactions can only be deleted within 24 hours of creation"
        );
      }

      return res.status(200).json({ message: `${Model.modelName} deleted` });
    }),
  };
}

module.exports = { createTransactionController };
