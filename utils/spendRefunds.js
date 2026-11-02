const REFUND_SUBCATEGORY = "Refund";
const REFUND_WINDOW_DAYS = 15;

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function idOf(tx) {
  return String(tx?._id || tx?.id || "");
}

function linkedExpenseId(refund) {
  return refund?.refundOfExpenseId ? String(refund.refundOfExpenseId) : "";
}

function refundRemaining(expense, refunds, excludeIncomeId = "") {
  const skip = excludeIncomeId ? String(excludeIncomeId) : "";
  const recovered = (refunds || [])
    .filter(
      (refund) =>
        linkedExpenseId(refund) === idOf(expense) && (!skip || idOf(refund) !== skip)
    )
    .reduce((sum, refund) => sum + (Number(refund.amount) || 0), 0);
  return roundMoney(Math.max(0, (Number(expense.amount) || 0) - recovered));
}

function refundCapMessage(remaining) {
  if (remaining <= 0.005) return "This purchase is already fully refunded";
  return `Refund can't be more than ₹${roundMoney(remaining).toFixed(2)} left on this purchase`;
}

function attachRemaining(records, links, getLinkedId) {
  const recovered = {};
  for (const link of links || []) {
    const id = getLinkedId(link);
    if (!id) continue;
    recovered[id] = (recovered[id] || 0) + (Number(link.amount) || 0);
  }
  return (records || []).map((record) => ({
    ...record,
    remaining: roundMoney(
      Math.max(0, (Number(record.amount) || 0) - (recovered[idOf(record)] || 0))
    ),
  }));
}

module.exports = {
  REFUND_SUBCATEGORY,
  REFUND_WINDOW_DAYS,
  refundRemaining,
  refundCapMessage,
  attachRemaining,
};
