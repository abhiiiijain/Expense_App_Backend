const { validateTransactionBody } = require("./validation");

function createTransactionController(Model, allowedCategories) {
  return {
    add: async (req, res) => {
      try {
        const result = validateTransactionBody(
          req.body,
          req.user.email,
          allowedCategories
        );

        if (result.error) {
          return res.status(400).json({ message: result.error });
        }

        const record = await Model.create(result.data);
        return res.status(201).json(record);
      } catch (err) {
        console.error(`Add ${Model.modelName} error:`, err.message);
        return res.status(500).json({ message: "Server Error" });
      }
    },

    delete: async (req, res) => {
      try {
        const { id } = req.params;
        const record = await Model.findOneAndDelete({
          _id: id,
          email: req.user.email,
        });

        if (!record) {
          return res.status(404).json({ message: "Record not found" });
        }

        return res.status(200).json({ message: `${Model.modelName} deleted` });
      } catch (err) {
        console.error(`Delete ${Model.modelName} error:`, err.message);
        return res.status(500).json({ message: "Server Error" });
      }
    },
  };
}

module.exports = { createTransactionController };
