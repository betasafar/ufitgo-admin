const assert = require("node:assert/strict");
const { test } = require("node:test");
const { calculatePaymentSplit, findPaymentSplit } = require("./payment-split.ts");

test("suggested splits allocate the entire package price", () => {
  for (const [percent, initial, final] of [[50, 500, 500], [60, 600, 400], [70, 700, 300]]) {
    assert.deepEqual(calculatePaymentSplit(1000, percent), { initialPayment: initial, finalBalance: final });
  }
  assert.deepEqual(calculatePaymentSplit(1001, 50), { initialPayment: 501, finalBalance: 500 });
  assert.deepEqual(calculatePaymentSplit(1001.25, 60), { initialPayment: 601, finalBalance: 400.25 });
  assert.deepEqual(calculatePaymentSplit(1000, 30), { initialPayment: 300, finalBalance: 700 });
});

test("recognizes preset and legacy splits", () => {
  assert.equal(findPaymentSplit(1001.25, 601, 400.25), 60);
  assert.equal(findPaymentSplit(1000, 400, 600), null);
});
