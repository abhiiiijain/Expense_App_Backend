const {
  accountIdOf,
  isCardPaymentExpense,
  paymentSettlesCreditAccount,
} = require("./creditCardPayments");
const { getPeriodMonthKey, shiftMonthKey, inGraceWindow } = require("./period");
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

function isPriorGraceSettlement(tx, monthKey, cycle, creditAccount, creditAccounts, kind) {
  if (!creditAccount || !cycle || cycle === "calendar") return false;
  const previousKey = shiftMonthKey(monthKey, -1);
  if (!previousKey || !inGraceWindow(tx?.date || tx?.createdAt, previousKey, cycle)) {
    return false;
  }
  if (kind === "transfer") {
    return String(tx.toAccountId) === accountIdOf(creditAccount);
  }
  return isCardPaymentExpense(tx) && paymentSettlesCreditAccount(tx, creditAccount, creditAccounts);
}

function priorGracePaid(expenses, transfers, monthKey, cycle, creditAccount, creditAccounts) {
  let paid = 0;
  for (const tx of expenses || []) {
    if (isPriorGraceSettlement(tx, monthKey, cycle, creditAccount, creditAccounts, "expense")) {
      paid += Number(tx.amount) || 0;
    }
  }
  for (const tx of transfers || []) {
    if (isPriorGraceSettlement(tx, monthKey, cycle, creditAccount, creditAccounts, "transfer")) {
      paid += Number(tx.amount) || 0;
    }
  }
  return paid;
}

function carriedForwardOpening(ledgerOpening, gracePaid) {
  const opening = Number(ledgerOpening) || 0;
  if (opening >= -0.005) return roundMoney(opening) ?? 0;
  const paid = Math.max(0, Number(gracePaid) || 0);
  return roundMoney(Math.min(0, opening + paid)) ?? 0;
}

module.exports = {
  activityFromMonth,
  rewindBalance,
  isPriorGraceSettlement,
  priorGracePaid,
  carriedForwardOpening,
};
