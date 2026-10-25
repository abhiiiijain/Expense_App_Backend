const CARD_PAYMENT_SUBCATEGORY = "Credit Card Payment";

function accountIdOf(account) {
  return String(account?.id || account?._id || "");
}

function creditAccountMatchingTitle(expense, creditAccounts) {
  const title = String(expense?.title || "");
  if (/flipkart/i.test(title)) {
    return creditAccounts.find((account) => /flipkart/i.test(account?.name || ""));
  }
  if (/sbi\s*cc/i.test(title)) {
    return creditAccounts.find(
      (account) => account?.type === "credit" && /sbi/i.test(account?.name || "")
    );
  }
  return null;
}

function paymentSettlesCreditAccount(expense, creditAccount, creditAccounts) {
  if (expense?.subcategory !== CARD_PAYMENT_SUBCATEGORY) return false;
  const creditAccountId = accountIdOf(creditAccount);

  if (expense.settlesAccountId) {
    return String(expense.settlesAccountId) === creditAccountId;
  }

  if (String(expense.accountId) === creditAccountId) return true;

  const fromTitle = creditAccountMatchingTitle(expense, creditAccounts);
  if (fromTitle) return accountIdOf(fromTitle) === creditAccountId;

  return (
    creditAccounts.length === 1 &&
    accountIdOf(creditAccounts[0]) === creditAccountId &&
    String(expense.accountId) !== creditAccountId
  );
}

function cardPaymentsToward(expenses, creditAccount, creditAccounts) {
  return (expenses || []).reduce((sum, expense) => {
    if (!paymentSettlesCreditAccount(expense, creditAccount, creditAccounts)) return sum;
    return sum + (Number(expense.amount) || 0);
  }, 0);
}

function postedOnCreditAccount(expense, creditAccounts) {
  const id = String(expense.accountId);
  return creditAccounts.some((account) => accountIdOf(account) === id);
}

module.exports = {
  CARD_PAYMENT_SUBCATEGORY,
  cardPaymentsToward,
  postedOnCreditAccount,
};
