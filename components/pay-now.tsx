'use client';

import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  FormInput,
  FormGrid,
  FormSection,
  FormSelect,
} from '@/components/form/form-elements';
import { PaymentSuccess } from '@/components/payment-success';
import { PaymentProgress } from '@/components/payment-progress';
import { FULL_PAYMENT_AMOUNT, formatCurrency } from '@/utils/payment-utils';
import { RemitaButton } from '@/components/remita-button';

const formSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  matricNumber: z.string().min(5, 'Valid matric number is required'),
  phoneNumber: z.string().min(10, 'Valid phone number is required'),
  paymentOption: z.enum(['full', 'half', 'custom']),
  customAmount: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PayNowProps {
  onBack: () => void;
  onComplete: () => void;
}

export function PayNow({ onBack, onComplete }: PayNowProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStudent, setIsCheckingStudent] = useState(false);
  const [readyForPayment, setReadyForPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    rrr?: string;
    amount: number;
    reference: string;
    totalPaid?: number;
    remainingBalance?: number;
    paymentPercentage?: number;
  } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<{
    totalPaid: number;
    remainingBalance: number;
    paymentPercentage: number;
  } | null>(null);

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      matricNumber: '',
      phoneNumber: '',
      paymentOption: 'full',
      customAmount: undefined,
    },
  });

  const { watch, handleSubmit, setValue, getValues } = methods;
  const watchPaymentOption = watch('paymentOption');
  const watchMatricNumber = watch('matricNumber');

  // Debounced student status check
  useEffect(() => {
    if (watchMatricNumber.length < 5) return;
    setIsCheckingStudent(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/check-payment-status?matricNumber=${watchMatricNumber}`
        );
        const data = await res.json();
        if (data.success) {
          setPaymentStatus({
            totalPaid: data.totalPaid || 0,
            remainingBalance: data.remainingBalance || FULL_PAYMENT_AMOUNT,
            paymentPercentage: data.paymentPercentage || 0,
          });
          if (data.remainingBalance) {
            setValue('customAmount', data.remainingBalance);
          }
          if (data.isFullyPaid) {
            toast.info(
              'You have already fully paid for your hostel accommodation'
            );
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsCheckingStudent(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [watchMatricNumber, setValue]);

  const getPaymentAmount = () => {
    const rem = paymentStatus?.remainingBalance ?? FULL_PAYMENT_AMOUNT;
    switch (watchPaymentOption) {
      case 'full':
        return rem;
      case 'half':
        return Math.min(rem, Math.ceil(FULL_PAYMENT_AMOUNT / 2));
      case 'custom':
        const custom = watch('customAmount') ?? rem;
        return custom > rem ? rem : custom;
      default:
        return rem;
    }
  };

  const onFormSubmit = async (values: FormValues) => {
    setIsLoading(true);
    const amount = getPaymentAmount();
    if (amount > (paymentStatus?.remainingBalance ?? FULL_PAYMENT_AMOUNT)) {
      toast.error(`Amount exceeds remaining balance`);
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/rrr-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, amount }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentDetails({
          amount,
          reference: data.transactionId,
          rrr: data.rrr,
          totalPaid: data.totalPaid,
          remainingBalance: data.remainingBalance,
          paymentPercentage: data.paymentPercentage,
        });
        setReadyForPayment(true);
      } else {
        toast.error(data.error || 'Failed to initialize transaction');
      }
    } catch (e) {
      console.error(e);
      toast.error('Initialization error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemitaSuccess = () => {
    setPaymentSuccess(true);
    toast.success('Payment successful');
  };

  const handleRemitaError = () => toast.error('Payment failed');
  const handleRemitaClose = () => toast.info('Payment window closed');

  if (paymentSuccess && paymentDetails) {
    return (
      <PaymentSuccess
        rrr={paymentDetails.rrr!}
        amount={paymentDetails.amount}
        reference={paymentDetails.reference}
        totalPaid={paymentDetails.totalPaid}
        remainingBalance={paymentDetails.remainingBalance}
        paymentPercentage={paymentDetails.paymentPercentage}
        onComplete={onComplete}
      />
    );
  }

  return (
    <div className='py-4'>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onFormSubmit)} className='space-y-6'>
          <FormSection title='Student Information'>
            <FormGrid>
              <FormInput name='firstName' label='First Name' required />
              <FormInput name='lastName' label='Last Name' required />
            </FormGrid>
            <FormInput name='email' label='Email' type='email' required />
            <FormGrid>
              <FormInput name='matricNumber' label='Matric Number' required />
              {isCheckingStudent && (
                <p className='text-xs text-gray-500'>
                  Checking payment status...
                </p>
              )}
            </FormGrid>
            <FormInput name='phoneNumber' label='Phone Number' required />
          </FormSection>

          {paymentStatus && (
            <PaymentProgress
              totalPaid={paymentStatus.totalPaid}
              remainingBalance={paymentStatus.remainingBalance}
              fullAmount={FULL_PAYMENT_AMOUNT}
              paymentPercentage={paymentStatus.paymentPercentage}
            />
          )}

          <FormSection title='Payment Option'>
            <FormSelect
              name='paymentOption'
              label='Payment Option'
              required
              options={[
                {
                  value: 'full',
                  label: `Full (${formatCurrency(
                    paymentStatus?.remainingBalance ?? FULL_PAYMENT_AMOUNT
                  )})`,
                },
                {
                  value: 'half',
                  label: `Half (${formatCurrency(
                    Math.min(
                      paymentStatus?.remainingBalance ?? FULL_PAYMENT_AMOUNT,
                      Math.ceil(FULL_PAYMENT_AMOUNT / 2)
                    )
                  )})`,
                },
                { value: 'custom', label: 'Custom Amount' },
              ]}
            />
            {watchPaymentOption === 'custom' && (
              <FormInput
                name='customAmount'
                label='Custom Amount (₦)'
                type='number'
                required
              />
            )}
          </FormSection>

          <div className='flex justify-between pt-4'>
            <Button variant='outline' onClick={onBack}>
              <ArrowLeft className='mr-2 h-4 w-4' /> Back
            </Button>

            {!readyForPayment ? (
              <Button
                type='submit'
                disabled={isLoading}
                className='bg-green-600 hover:bg-green-700 text-white'
              >
                {isLoading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />{' '}
                    Processing…
                  </>
                ) : (
                  <>
                    <CreditCard className='mr-2 h-4 w-4' /> Continue to Payment
                  </>
                )}
              </Button>
            ) : (
              <RemitaButton
                amount={paymentDetails?.amount!}
                firstName={getValues('firstName')}
                lastName={getValues('lastName')}
                email={getValues('email')}
                matricNumber={getValues('matricNumber')}
                onSuccess={handleRemitaSuccess}
                onError={handleRemitaError}
                onClose={handleRemitaClose}
              />
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
