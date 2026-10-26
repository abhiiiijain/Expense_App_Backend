const REFUND_SUBCATEGORY = "Refund";

function isSpendRefund(tx) {
  return tx?.subcategory === REFUND_SUBCATEGORY;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function titleKey(title) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/\s+refunds?$/i, "")
    .replace(/\s+/g, " ");
}

function matchesRefund(expense, refund) {
  const refundAccount = String(refund?.accountId || "");
  return (
    titleKey(expense?.title) === titleKey(refund?.title) &&
    (!refundAccount || String(expense?.accountId) === refundAccount)
  );
}

function refundsAsSpendAdjustments(refunds, expenses) {
  return (refunds || []).map((refund) => {
    const match = (expenses || []).find((expense) => matchesRefund(expense, refund));
    return {
      ...refund,
      amount: -(Number(refund.amount) || 0),
      category: match?.category || "Other",
      subcategory: match?.subcategory || "Uncategorized",
    };
  });
}

function expensesNetOfRefunds(expenses, refunds, matchAgainst = expenses) {
  const next = (expenses || []).map((expense) => ({
    ...expense,
    amount: Number(expense.amount) || 0,
  }));
  const leftovers = [];

  for (const refund of (refunds || []).filter(isSpendRefund)) {
    let remaining = Number(refund.amount) || 0;
    const matches = next
      .map((expense, index) => ({ expense, index }))
      .filter(({ expense }) => expense.amount > 0.005 && matchesRefund(expense, refund))
      .sort((a, b) => b.expense.amount - a.expense.amount);

    for (const { index } of matches) {
      if (remaining <= 0.005) break;
      const take = Math.min(next[index].amount, remaining);
      next[index] = { ...next[index], amount: roundMoney(next[index].amount - take) };
      remaining = roundMoney(remaining - take);
    }
    if (remaining > 0.005) leftovers.push({ ...refund, amount: remaining });
  }

  return [
    ...next.filter((expense) => expense.amount > 0.005),
    ...refundsAsSpendAdjustments(leftovers, matchAgainst),
  ];
}

module.exports = {
  REFUND_SUBCATEGORY,
  expensesNetOfRefunds,
};
