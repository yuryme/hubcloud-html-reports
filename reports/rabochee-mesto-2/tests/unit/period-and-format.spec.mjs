function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error((message || 'Values are not equal') + `: expected=${expected}, actual=${actual}`);
  }
}

function normalizeDateValue(value) {
  if (!value) return '';
  const s = String(value).trim();
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const ru = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (ru) return `${ru[3]}-${ru[2]}-${ru[1]}`;
  return '';
}

function parseAmount(value) {
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function run() {
  console.log('period-and-format: start');

  assertEqual(normalizeDateValue('2026-04-12 10:00:00'), '2026-04-12', 'ISO datetime normalization');
  assertEqual(normalizeDateValue('12.04.2026'), '2026-04-12', 'RU date normalization');
  assertEqual(normalizeDateValue(''), '', 'Empty date normalization');

  assertEqual(parseAmount('8700.50'), 8700.5, 'Dot decimal parsing');
  assertEqual(parseAmount('8700,50'), 8700.5, 'Comma decimal parsing');
  assertEqual(parseAmount('not-number'), 0, 'Invalid number fallback');

  assert(true, 'Final assertion');
  console.log('period-and-format: PASS');
}

run();
