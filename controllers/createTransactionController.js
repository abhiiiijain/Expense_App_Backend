const { validateTransactionBody } = require("../utils/validation");
const { HttpError } = require("../utils/HttpError");
const asyncHandler = require("../middleware/asyncHandler");

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

    delete: asyncHandler(async (req, res) => {
      const { id } = req.params;
      const record = await Model.findOneAndDelete({
        _id: id,
        email: req.user.email,
      });

      if (!record) {
        throw new HttpError(404, "Record not found");
      }

      return res.status(200).json({ message: `${Model.modelName} deleted` });
    }),
  };
}

module.exports = { createTransactionController };
