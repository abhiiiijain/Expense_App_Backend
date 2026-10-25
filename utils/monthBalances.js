const {
  accountIdOf,
  isCardPaymentExpense,
  paymentSettlesCreditAccount,
} = require("./creditCardPayments");
const { getPeriodMonthKey } = require("./period");
const { roundMoney } = require("./validation");

function emptyActivity() {
  return { income: 0, expense: 0, transferOut: 0, transferIn: 0, cardPayment: 0 };
}

function addActivity(a, b) {
  return {
    income: a.income + b.income,
    expense: a.expense + b.expense,
    transferOut: a.transferOut + b.transferOut,
    transferIn: a.transferIn + b.transferIn,
    cardPayment: a.cardPayment + b.cardPayment,
  };
}

function activityFromMonth(
  incomes,
  expenses,
  transfers,
  accountIds,
  monthKey,
  creditAccounts = [],
  cycle = "calendar"
) {
  const ids = new Set(accountIds.map(String));
  const creditsInView = creditAccounts.filter((account) => ids.has(accountIdOf(account)));
  const thisMonth = emptyActivity();
  const later = emptyActivity();
  const periodKey = (tx) => getPeriodMonthKey(tx?.date || tx?.createdAt, cycle);

  const bucketFor = (tx) => {
    const key = periodKey(tx);
    if (key < monthKey) return null;
    return key === monthKey ? thisMonth : later;
  };

  for (const tx of incomes) {
    const bucket = ids.has(String(tx.accountId)) ? bucketFor(tx) : null;
    if (bucket) bucket.income += tx.amount;
  }
  for (const tx of expenses) {
    const onAccount = ids.has(String(tx.accountId));
    const maybePayment = creditsInView.length > 0 && isCardPaymentExpense(tx);
    if (!onAccount && !maybePayment) continue;
    const bucket = bucketFor(tx);
    if (!bucket) continue;
    let settledSelf = false;
    if (maybePayment) {
      for (const credit of creditsInView) {
        if (paymentSettlesCreditAccount(tx, credit, creditAccounts)) {
          bucket.cardPayment += tx.amount;
          if (String(tx.accountId) === accountIdOf(credit)) settledSelf = true;
        }
      }
    }
    if (onAccount && !settledSelf) bucket.expense += tx.amount;
  }
  for (const tx of transfers) {
    const bucket = bucketFor(tx);
    if (!bucket) continue;
    if (ids.has(String(tx.fromAccountId))) bucket.transferOut += tx.amount;
    if (ids.has(String(tx.toAccountId))) bucket.transferIn += tx.amount;
  }

  return { fromThisMonth: addActivity(thisMonth, later), afterThisMonth: later };
}

function rewindBalance(current, activity) {
  const next = roundMoney(
    current -
      activity.income +
      activity.expense +
      activity.transferOut -
      activity.transferIn -
      activity.cardPayment
  );
  return Number.isFinite(next) ? next : 0;
}

module.exports = { activityFromMonth, rewindBalance };
