'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  FormInput,
  FormGrid,
  FormSection,
} from '@/components/form/form-elements';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PaymentProgress } from '@/components/payment-progress';
import { FULL_PAYMENT_AMOUNT } from '@/utils/payment-utils';

const formSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  matricNumber: z.string().min(5, 'Valid matric number is required'),
  phoneNumber: z.string().min(10, 'Valid phone number is required'),
  amount: z.number().min(1000, 'Amount must be at least ₦1,000'),
});

interface PayWithRRRProps {
  onBack: () => void;
  onComplete: () => void;
}

export function PayWithRRR({ onBack, onComplete }: PayWithRRRProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStudent, setIsCheckingStudent] = useState(false);
  const [rrrGenerated, setRrrGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<{
    totalPaid: number;
    remainingBalance: number;
    paymentPercentage: number;
  } | null>(null);

  const methods = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      matricNumber: '',
      phoneNumber: '',
      amount: FULL_PAYMENT_AMOUNT,
    },
  });

  const checkStudentPaymentStatus = async (matricNumber: string) => {
    if (!matricNumber || matricNumber.length < 5) return;

    setIsCheckingStudent(true);
    try {
      const response = await fetch(
        `/api/check-payment-status?matricNumber=${matricNumber}`
      );
      const data = await response.json();

      if (data.success) {
        setPaymentStatus({
          totalPaid: data.totalPaid || 0,
          remainingBalance: data.remainingBalance || FULL_PAYMENT_AMOUNT,
          paymentPercentage: data.paymentPercentage || 0,
        });

        // Update the amount field to the remaining balance
        if (data.remainingBalance && data.remainingBalance > 0) {
          methods.setValue('amount', data.remainingBalance);
        }
      }
    } catch (error) {
      console.error('Error checking student payment status:', error);
    } finally {
      setIsCheckingStudent(false);
    }
  };

  // Check payment status when matric number changes
  const watchMatricNumber = methods.watch('matricNumber');

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      checkStudentPaymentStatus(watchMatricNumber);
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [watchMatricNumber]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      // Call API to generate RRR
      const response = await fetch('/api/rrr-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
        }),
      });

      const data = await response.json();

      if (data.success && data.rrr) {
        setRrrGenerated(data.rrr);
        setPaymentStatus({
          totalPaid: data.totalPaid || 0,
          remainingBalance: data.remainingBalance || FULL_PAYMENT_AMOUNT,
          paymentPercentage: data.paymentPercentage || 0,
        });
        toast.success('RRR generated successfully');
      } else {
        toast.error(data.error || 'Failed to generate RRR');
      }
    } catch (error) {
      console.error('Error generating RRR:', error);
      toast.error('Failed to generate RRR. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (rrrGenerated) {
      navigator.clipboard.writeText(rrrGenerated);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('RRR copied to clipboard');
    }
  };

  return (
    <div className='py-4'>
      {!rrrGenerated ? (
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className='space-y-4'>
            <FormSection>
              <FormGrid>
                <FormInput
                  name='firstName'
                  label='First Name'
                  placeholder='John'
                  required
                />
                <FormInput
                  name='lastName'
                  label='Last Name'
                  placeholder='Doe'
                  required
                />
              </FormGrid>
            </FormSection>

            <FormInput
              name='email'
              label='Email'
              placeholder='john.doe@example.com'
              type='email'
              required
            />

            <FormInput
              name='matricNumber'
              label='Matric Number'
              placeholder='e.g., 2020/1234'
              required
            />
            {isCheckingStudent && (
              <p className='text-xs text-gray-500 -mt-2'>
                Checking payment status...
              </p>
            )}

            <FormInput
              name='phoneNumber'
              label='Phone Number'
              placeholder='e.g., 08012345678'
              required
            />

            {paymentStatus && (
              <div className='space-y-2'>
                <PaymentProgress
                  totalPaid={paymentStatus.totalPaid}
                  remainingBalance={paymentStatus.remainingBalance}
                  fullAmount={FULL_PAYMENT_AMOUNT}
                  paymentPercentage={paymentStatus.paymentPercentage}
                />
              </div>
            )}

            <FormInput
              name='amount'
              label='Payment Amount (₦)'
              placeholder='Enter amount'
              type='number'
              required
            />

            <div className='flex justify-between pt-4'>
              <Button type='button' variant='outline' onClick={onBack}>
                <ArrowLeft className='mr-2 h-4 w-4' />
                Back
              </Button>

              <Button
                type='submit'
                disabled={isLoading}
                className='bg-green-600 hover:bg-green-700 text-white'
              >
                {isLoading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Generating...
                  </>
                ) : (
                  'Generate RRR'
                )}
              </Button>
            </div>
          </form>
        </FormProvider>
      ) : (
        <div className='space-y-4'>
          <Alert className='bg-green-50 border-green-200'>
            <AlertDescription className='text-green-800'>
              Your RRR has been generated successfully. Use this reference to
              complete your payment on Remita.
            </AlertDescription>
          </Alert>

          <div className='p-4 border rounded-md bg-gray-50'>
            <div className='flex justify-between items-center'>
              <div>
                <p className='text-sm text-gray-500'>Your RRR</p>
                <p className='text-xl font-mono font-bold'>{rrrGenerated}</p>
              </div>
              <Button
                variant='outline'
                size='icon'
                onClick={copyToClipboard}
                aria-label='Copy RRR to clipboard'
              >
                {copied ? (
                  <Check className='h-4 w-4' />
                ) : (
                  <Copy className='h-4 w-4' />
                )}
              </Button>
            </div>
          </div>

          {paymentStatus && (
            <div className='space-y-2'>
              <PaymentProgress
                totalPaid={paymentStatus.totalPaid}
                remainingBalance={paymentStatus.remainingBalance}
                fullAmount={FULL_PAYMENT_AMOUNT}
                paymentPercentage={paymentStatus.paymentPercentage}
              />
            </div>
          )}

          <div className='bg-blue-50 p-4 rounded-md'>
            <h4 className='font-medium text-blue-800 mb-2'>
              Payment Instructions
            </h4>
            <ol className='list-decimal pl-5 space-y-1 text-blue-700 text-sm'>
              <li>Visit the Remita website at www.remita.net</li>
              <li>Click on "Pay RRR" or "Pay a Federal Government Agency"</li>
              <li>Enter the RRR number shown above</li>
              <li>Complete the payment process</li>
              <li>
                After payment, return to this site to complete your registration
              </li>
            </ol>
          </div>

          <div className='flex justify-between pt-4'>
            <Button type='button' variant='outline' onClick={onBack}>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back
            </Button>

            <Button type='button' onClick={onComplete}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
