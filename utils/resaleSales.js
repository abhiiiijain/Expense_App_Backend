const RESALE_INCOME_SUBCATEGORY = "Resale";

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function idOf(tx) {
  return String(tx?._id || tx?.id || "");
}

function linkedResaleExpenseId(tx) {
  return tx?.resaleOfExpenseId ? String(tx.resaleOfExpenseId) : "";
}

function txTime(tx) {
  const date = new Date(tx?.date || tx?.createdAt || 0).getTime();
  return Number.isFinite(date) ? date : 0;
}

/** FIFO: recover inventory cost first; leftover sale amount is profit. */
function resaleProfitByIncomeId(lots, sales) {
  const remaining = {};
  for (const lot of lots || []) {
    remaining[idOf(lot)] = Number(lot.amount) || 0;
  }

  const ordered = [...(sales || [])]
    .filter((sale) => {
      const lotId = linkedResaleExpenseId(sale);
      return lotId && remaining[lotId] != null;
    })
    .sort((a, b) => txTime(a) - txTime(b) || idOf(a).localeCompare(idOf(b)));

  const profitById = {};
  for (const sale of ordered) {
    const lotId = linkedResaleExpenseId(sale);
    const saleAmt = Number(sale.amount) || 0;
    const cost = Math.min(saleAmt, Math.max(0, remaining[lotId] || 0));
    remaining[lotId] = roundMoney((remaining[lotId] || 0) - cost);
    profitById[idOf(sale)] = roundMoney(saleAmt - cost);
  }
  return profitById;
}

module.exports = {
  RESALE_INCOME_SUBCATEGORY,
  resaleProfitByIncomeId,
};
