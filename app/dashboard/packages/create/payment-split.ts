export function calculatePaymentSplit(price: number, initialPercent: number) {
  const initialPayment = Math.round((price * initialPercent) / 100);
  return { initialPayment, finalBalance: Math.round(price * 100 - initialPayment * 100) / 100 };
}

export function findPaymentSplit(price: number, initial: number, final: number) {
  if (price <= 0 || initial <= 0 || final <= 0) return null;
  return [50, 30, 60, 70].find((percent) => {
    const split = calculatePaymentSplit(price, percent);
    return split.initialPayment === initial && split.finalBalance === final;
  }) ?? null;
}
