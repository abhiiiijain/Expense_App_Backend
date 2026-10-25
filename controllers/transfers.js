const mongoose = require("mongoose");
const Transfer = require("../models/Transfer");
const { HttpError } = require("../utils/HttpError");
const asyncHandler = require("../middleware/asyncHandler");
const { roundMoney, parseTransactionDate } = require("../utils/validation");
const { editWindowCutoff, editWindowErrorMessage } = require("../utils/editWindow");
const { assertAccountsOwned } = require("../utils/accountAccess");
const { bumpDataVersion } = require("../utils/dataVersion");

exports.createTransfer = asyncHandler(async (req, res) => {
  const amount = roundMoney(req.body.amount);
  if (amount === null || amount <= 0) {
    throw new HttpError(400, "Enter a valid transfer amount");
  }

  const [from, to] = await assertAccountsOwned(
    req.userId,
    [req.body.fromAccountId, req.body.toAccountId],
    { requireDistinct: true, select: "_id name" }
  );

  const note = String(req.body.note || "").trim();
  const dateResult = parseTransactionDate(req.body.date);
  if (dateResult.error) {
    throw new HttpError(400, dateResult.error);
  }

  const transfer = await Transfer.create({
    userId: req.userId,
    fromAccountId: from._id,
    toAccountId: to._id,
    amount,
    note,
    date: dateResult.date,
  });

  await bumpDataVersion(req.userId);
  return res.status(201).json(transfer);
});

exports.deleteTransfer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new HttpError(400, "Invalid transfer id");
  }

  const cutoff = editWindowCutoff();
  const result = await Transfer.deleteOne({
    _id: id,
    userId: req.userId,
    createdAt: { $gte: cutoff },
  });

  if (result.deletedCount === 0) {
    const exists = await Transfer.exists({ _id: id, userId: req.userId });
    if (!exists) throw new HttpError(404, "Transfer not found");
    throw new HttpError(403, editWindowErrorMessage("deleted"));
  }

  await bumpDataVersion(req.userId);
  return res.status(200).json({ message: "Transfer deleted" });
});
