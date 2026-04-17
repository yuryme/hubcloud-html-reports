function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertDeepEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error((message || 'Deep equal mismatch') + `: expected=${e}, actual=${a}`);
  }
}

function filterByOrder(rows, orderId) {
  if (!orderId) return rows;
  return rows.filter((r) => String(r['номер_заказа'] || '') === String(orderId));
}

function totals(rows) {
  return rows.reduce((acc, row) => {
    const amount = Number(row.amount || 0);
    if (amount > 0) acc.income += amount;
    if (amount < 0) acc.expense += Math.abs(amount);
    acc.total += amount;
    return acc;
  }, { income: 0, expense: 0, total: 0 });
}

function run() {
  console.log('filters-and-aggregates: start');

  const rows = [{ номер_заказа: 'ORD-1' }, { номер_заказа: 'ORD-2' }];
  const out = filterByOrder(rows, 'ORD-2');
  assert(out.length === 1, 'Order filter result length');
  assert(out[0].номер_заказа === 'ORD-2', 'Order filter selected row');

  const totalsOut = totals([{ amount: 100 }, { amount: -40 }, { amount: 60 }]);
  assertDeepEqual(totalsOut, { income: 160, expense: 40, total: 120 }, 'Totals split/aggregate');

  console.log('filters-and-aggregates: PASS');
}

run();
