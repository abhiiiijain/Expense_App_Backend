function parseMonthKey(monthKey) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ""));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

function parseDateKey(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ""));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function utcDay(year, monthIndex, day) {
  return new Date(Date.UTC(year, monthIndex, day));
}

function formatMonthKeyUtc(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatDateKeyUtc(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveCreditCycle(cycle) {
  if (!cycle || cycle === "calendar") return null;
  const statementDay = Number(cycle.statementDay);
  const dueDay = Number(cycle.dueDay);
  if (statementDay >= 1 && statementDay <= 28 && dueDay >= 1 && dueDay <= 28) {
    return { statementDay, dueDay };
  }
  return null;
}

function getMonthKeyUtc(dateInput = new Date()) {
  return formatMonthKeyUtc(new Date(dateInput));
}

function getPeriodMonthKey(dateInput, cycle = "calendar") {
  const spec = resolveCreditCycle(cycle);
  const date = new Date(dateInput);
  if (!spec) return getMonthKeyUtc(date);
  if (date.getUTCDate() <= spec.statementDay) return getMonthKeyUtc(date);
  return getMonthKeyUtc(utcDay(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

function shiftMonthKey(monthKey, delta) {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return null;
  return formatMonthKeyUtc(utcDay(parsed.year, parsed.month - 1 + Number(delta || 0), 1));
}

function inGraceWindow(dateInput, monthKey, cycle) {
  const bounds = periodBounds(monthKey, cycle);
  if (!bounds?.statement || !bounds?.due) return false;
  const key = formatDateKeyUtc(dateInput);
  return key >= formatDateKeyUtc(bounds.statement) && key <= formatDateKeyUtc(bounds.due);
}

function periodBounds(monthKey, cycle = "calendar") {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return null;
  const { year, month } = parsed;
  const spec = resolveCreditCycle(cycle);
  if (!spec) {
    const start = utcDay(year, month - 1, 1);
    const endExclusive = utcDay(year, month, 1);
    return { start, endExclusive, statement: null, due: null };
  }
  const start = utcDay(year, month - 2, spec.statementDay + 1);
  const statement = utcDay(year, month - 1, spec.statementDay);
  const endExclusive = utcDay(year, month - 1, spec.statementDay + 1);
  const due = utcDay(year, month, spec.dueDay);
  return { start, endExclusive, statement, due };
}

module.exports = {
  parseMonthKey,
  parseDateKey,
  formatDateKeyUtc,
  formatMonthKeyUtc,
  resolveCreditCycle,
  getPeriodMonthKey,
  shiftMonthKey,
  inGraceWindow,
  periodBounds,
};
