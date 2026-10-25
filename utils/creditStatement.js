const { inGraceWindow } = require("./period");
const {
  accountIdOf,
  isCardPaymentExpense,
  paymentSettlesCreditAccount,
} = require("./creditCardPayments");

function formatChartDateLabel(date) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function getCreditBillPaymentStatus({
  monthKey,
  closingBalance,
  expenses = [],
  transfers = [],
  creditAccount,
  creditAccounts = [],
  cycle,
}) {
  const due = closingBalance < 0 ? Math.abs(Number(closingBalance) || 0) : 0;
  if (due < 0.005) {
    return { due: 0, paid: 0, isPaid: false, paidOn: null, paidOnLabel: null, instalments: [] };
  }

  const creditId = accountIdOf(creditAccount);
  const payments = [];

  for (const tx of expenses) {
    if (!isCardPaymentExpense(tx)) continue;
    if (!paymentSettlesCreditAccount(tx, creditAccount, creditAccounts)) continue;
    if (!inGraceWindow(tx.date || tx.createdAt, monthKey, cycle)) continue;
    payments.push({ date: new Date(tx.date), amount: Number(tx.amount) || 0 });
  }

  for (const tx of transfers) {
    if (String(tx.toAccountId) !== creditId) continue;
    if (!inGraceWindow(tx.date || tx.createdAt, monthKey, cycle)) continue;
    payments.push({ date: new Date(tx.date), amount: Number(tx.amount) || 0 });
  }

  payments.sort((a, b) => a.date.getTime() - b.date.getTime());

  const instalments = [];
  let paid = 0;
  let paidOn = null;
  for (const payment of payments) {
    if (paid + 0.005 >= due) break;
    instalments.push({
      amount: payment.amount,
      date: payment.date,
      label: formatChartDateLabel(payment.date),
    });
    paid += payment.amount;
    if (paid + 0.005 >= due) paidOn = payment.date;
  }

  return {
    due,
    paid,
    isPaid: Boolean(paidOn),
    paidOn,
    paidOnLabel: paidOn ? formatChartDateLabel(paidOn) : null,
    instalments,
  };
}

module.exports = { getCreditBillPaymentStatus };
