'use client';

import { Button } from '@/components/ui/button';
import { Check, Download, Copy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PaymentProgress } from '@/components/payment-progress';
import { FULL_PAYMENT_AMOUNT, formatCurrency } from '@/utils/payment-utils';

interface PaymentSuccessProps {
  rrr: string;
  amount: number;
  reference: string;
  totalPaid?: number;
  remainingBalance?: number;
  paymentPercentage?: number;
  onComplete: () => void;
}

export function PaymentSuccess({
  rrr,
  amount,
  reference,
  totalPaid,
  remainingBalance,
  paymentPercentage,
  onComplete,
}: PaymentSuccessProps) {
  const [copied, setCopied] = useState(false);
  const isFullyPaid =
    remainingBalance === 0 || (totalPaid && totalPaid >= FULL_PAYMENT_AMOUNT);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(rrr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Reference number copied to clipboard');
  };

  return (
    <div className='py-4 space-y-6'>
      <div className='flex flex-col items-center justify-center text-center'>
        <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4'>
          <Check className='h-8 w-8 text-green-600' />
        </div>
        <h3 className='text-xl font-bold text-green-600'>
          Payment Successful!
        </h3>
        <p className='text-gray-600 mt-2'>
          Your payment of {formatCurrency(amount)} has been processed
          successfully.
        </p>
      </div>

      {totalPaid !== undefined &&
        remainingBalance !== undefined &&
        paymentPercentage !== undefined && (
          <PaymentProgress
            totalPaid={totalPaid}
            remainingBalance={remainingBalance}
            fullAmount={FULL_PAYMENT_AMOUNT}
            paymentPercentage={paymentPercentage}
          />
        )}

      <div className='bg-gray-50 p-4 rounded-md border'>
        <div className='space-y-3'>
          <div className='flex justify-between items-center'>
            <div>
              <p className='text-sm text-gray-500'>Reference Number (RRR)</p>
              <p className='font-mono font-medium'>{rrr}</p>
            </div>
            <Button
              variant='outline'
              size='icon'
              onClick={copyToClipboard}
              aria-label='Copy reference number'
            >
              {copied ? (
                <Check className='h-4 w-4' />
              ) : (
                <Copy className='h-4 w-4' />
              )}
            </Button>
          </div>

          <div>
            <p className='text-sm text-gray-500'>Transaction Reference</p>
            <p className='font-medium'>{reference}</p>
          </div>

          <div>
            <p className='text-sm text-gray-500'>Amount Paid</p>
            <p className='font-medium'>{formatCurrency(amount)}</p>
          </div>

          <div>
            <p className='text-sm text-gray-500'>Date</p>
            <p className='font-medium'>{new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className='bg-blue-50 p-4 rounded-md'>
        <p className='text-blue-800 text-sm'>
          {isFullyPaid
            ? 'Your payment is complete. Please keep your reference number safe for your records.'
            : 'You have made a partial payment. You will need to complete the remaining payment to fully secure your accommodation.'}
        </p>
      </div>

      <div className='flex justify-between'>
        <Button variant='outline' className='flex items-center gap-2'>
          <Download className='h-4 w-4' />
          Download Receipt
        </Button>

        <Button onClick={onComplete}>Done</Button>
      </div>
    </div>
  );
}
