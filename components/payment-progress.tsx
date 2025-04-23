import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/utils/payment-utils';

interface PaymentProgressProps {
  totalPaid: number;
  remainingBalance: number;
  fullAmount: number;
  paymentPercentage: number;
}

export function PaymentProgress({
  totalPaid,
  remainingBalance,
  fullAmount,
  paymentPercentage,
}: PaymentProgressProps) {
  return (
    <div className='space-y-2'>
      <div className='flex justify-between text-sm'>
        <span>Payment Progress</span>
        <span>{paymentPercentage}%</span>
      </div>
      <Progress value={paymentPercentage} className='h-2' />
      <div className='flex justify-between text-sm'>
        <span>Paid: {formatCurrency(totalPaid)}</span>
        <span>Remaining: {formatCurrency(remainingBalance)}</span>
      </div>
      <div className='text-xs text-gray-500 text-center'>
        Total Amount: {formatCurrency(fullAmount)}
      </div>
    </div>
  );
}
