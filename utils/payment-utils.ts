export const FULL_PAYMENT_AMOUNT = 219000;

export interface PaymentSummary {
  totalPaid: number;
  remainingBalance: number;
  isFullyPaid: boolean;
  paymentPercentage: number;
}

export function calculatePaymentStatus(totalPaid: number): PaymentSummary {
  const remainingBalance = Math.max(0, FULL_PAYMENT_AMOUNT - totalPaid);
  const isFullyPaid = totalPaid >= FULL_PAYMENT_AMOUNT;
  const paymentPercentage = Math.min(
    100,
    Math.round((totalPaid / FULL_PAYMENT_AMOUNT) * 100)
  );

  return {
    totalPaid,
    remainingBalance,
    isFullyPaid,
    paymentPercentage,
  };
}

export function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}
