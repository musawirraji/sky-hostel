'use client';

import type React from 'react';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/form/form-elements';
import { RegistrationForm } from '@/components/registration-form';
import { PaymentProgress } from '@/components/payment-progress';
import { FULL_PAYMENT_AMOUNT, formatCurrency } from '@/utils/payment-utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PaymentModal } from '@/components/payment-modal';

const formSchema = z.object({
  referenceNumber: z.string().min(8, 'Please enter a valid reference number'),
});

interface VerifyReferenceModalProps {
  children: React.ReactNode;
}

export function VerifyReferenceModal({ children }: VerifyReferenceModalProps) {
  const [open, setOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{
    rrr: string;
    amount: number;
    matricNumber?: string;
    totalPaid?: number;
    remainingBalance?: number;
    isFullyPaid?: boolean;
    paymentPercentage?: number;
  } | null>(null);

  const methods = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      referenceNumber: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsVerifying(true);

    try {
      // First verify this specific RRR is valid
      const rrrResponse = await fetch(
        `/api/check-payment-status?rrr=${values.referenceNumber}`
      );
      const rrrData = await rrrResponse.json();

      if (!rrrData.success) {
        toast.error('Invalid reference number');
        setIsVerifying(false);
        return;
      }

      // Get the matric number from the payment details
      const matricNumber = rrrData.paymentDetails?.matricNumber;

      if (!matricNumber) {
        toast.error('Could not find student associated with this payment');
        setIsVerifying(false);
        return;
      }

      // Check total payments for this student
      const totalResponse = await fetch(
        `/api/check-payment-status?matricNumber=${matricNumber}`
      );
      const totalData = await totalResponse.json();

      if (totalData.success) {
        setPaymentDetails({
          rrr: values.referenceNumber,
          amount: rrrData.paymentDetails?.amount || 0,
          matricNumber: matricNumber,
          totalPaid: totalData.totalPaid || 0,
          remainingBalance: totalData.remainingBalance || FULL_PAYMENT_AMOUNT,
          isFullyPaid: totalData.isFullyPaid || false,
          paymentPercentage: totalData.paymentPercentage || 0,
        });

        if (totalData.isFullyPaid) {
          setIsVerified(true);
          toast.success('Payment verified successfully');
        } else {
          // Not fully paid, show error
          toast.error(
            `You need to complete your payment before registration. Remaining balance: ${formatCurrency(
              totalData.remainingBalance || FULL_PAYMENT_AMOUNT
            )}`
          );
        }
      } else {
        toast.error('Failed to verify payment status');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error(
        'Failed to verify payment. Please check your reference number and try again.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) {
      methods.reset();
      setIsVerified(false);
      setPaymentDetails(null);
    }
  };

  return (
    <>
      <div onClick={() => setOpen(true)}>{children}</div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className={`${
            isVerified ? 'sm:max-w-3xl' : 'sm:max-w-md'
          } bg-white max-h-[90vh] overflow-y-auto px-6 py-4`}
        >
          {!isVerified ? (
            <>
              <DialogHeader>
                <DialogTitle>Verify Your Payment</DialogTitle>
                <DialogDescription>
                  Enter your payment reference number (RRR) to verify your
                  payment and proceed with registration
                </DialogDescription>
              </DialogHeader>

              <FormProvider {...methods}>
                <form
                  onSubmit={methods.handleSubmit(onSubmit)}
                  className='space-y-4 py-4'
                >
                  <FormInput
                    name='referenceNumber'
                    label='Reference Number (RRR)'
                    placeholder='Enter your RRR'
                    required
                  />

                  {paymentDetails && !paymentDetails.isFullyPaid && (
                    <div className='space-y-4'>
                      <Alert className='bg-red-50 border-red-200'>
                        <AlertDescription className='text-red-800'>
                          Your payment is incomplete. You have paid{' '}
                          {formatCurrency(paymentDetails.totalPaid || 0)} out of{' '}
                          {formatCurrency(FULL_PAYMENT_AMOUNT)}. You must
                          complete your payment before registration.
                        </AlertDescription>
                      </Alert>

                      <PaymentProgress
                        totalPaid={paymentDetails.totalPaid || 0}
                        remainingBalance={
                          paymentDetails.remainingBalance || FULL_PAYMENT_AMOUNT
                        }
                        fullAmount={FULL_PAYMENT_AMOUNT}
                        paymentPercentage={
                          paymentDetails.paymentPercentage || 0
                        }
                      />

                      <div className='flex justify-between'>
                        <Button
                          type='button'
                          variant='outline'
                          onClick={() => setOpen(false)}
                        >
                          Cancel
                        </Button>

                        {/* Payment option to complete the remaining payment */}
                        <PaymentModal>
                          <Button
                            type='button'
                            className='bg-green-600 hover:bg-green-700 text-white'
                          >
                            Complete Payment
                          </Button>
                        </PaymentModal>
                      </div>
                    </div>
                  )}

                  {!paymentDetails && (
                    <DialogFooter className='pt-4'>
                      <Button
                        type='button'
                        variant='secondary'
                        onClick={() => setOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type='submit' disabled={isVerifying}>
                        {isVerifying ? (
                          <>
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            Verifying...
                          </>
                        ) : (
                          'Verify & Continue'
                        )}
                      </Button>
                    </DialogFooter>
                  )}
                </form>
              </FormProvider>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Complete Your Registration</DialogTitle>
                <DialogDescription>
                  Your payment has been verified. Please complete your
                  registration to secure your hostel accommodation.
                </DialogDescription>
              </DialogHeader>

              <RegistrationForm
                paymentDetails={paymentDetails}
                onComplete={() => setOpen(false)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
