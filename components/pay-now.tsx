'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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

interface PayNowProps {
  onBack: () => void;
  onComplete: () => void;
}

export function PayNow({ onBack, onComplete }: PayNowProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStudent, setIsCheckingStudent] = useState(false);
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

  // For Remita payment
  const [readyForPayment, setReadyForPayment] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      matricNumber: '',
      phoneNumber: '',
      paymentOption: 'full',
    },
  });

  const watchPaymentOption = form.watch('paymentOption');
  const watchMatricNumber = form.watch('matricNumber');

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      checkStudentPaymentStatus(watchMatricNumber);
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [watchMatricNumber]);

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

        // If fully paid, show a message
        if (data.isFullyPaid) {
          toast.info(
            'You have already fully paid for your hostel accommodation'
          );
        }
      }
    } catch (error) {
      console.error('Error checking student payment status:', error);
    } finally {
      setIsCheckingStudent(false);
    }
  };

  const getPaymentAmount = (option: string, customAmount?: number) => {
    const remainingBalance =
      paymentStatus?.remainingBalance || FULL_PAYMENT_AMOUNT;

    switch (option) {
      case 'full':
        return remainingBalance;
      case 'half':
        return Math.min(remainingBalance, Math.ceil(FULL_PAYMENT_AMOUNT / 2));
      case 'custom':
        return customAmount && customAmount <= remainingBalance
          ? customAmount
          : remainingBalance;
      default:
        return remainingBalance;
    }
  };

  const initializeTransaction = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      // Calculate payment amount
      const amount = getPaymentAmount(
        values.paymentOption,
        values.customAmount
      );

      // Validate amount doesn't exceed remaining balance
      const remainingBalance =
        paymentStatus?.remainingBalance || FULL_PAYMENT_AMOUNT;

      if (amount > remainingBalance) {
        toast.error(
          `Payment amount (${formatCurrency(
            amount
          )}) exceeds remaining balance (${formatCurrency(remainingBalance)})`
        );
        setIsLoading(false);
        return;
      }

      // Initialize transaction via RRR generation API
      const response = await fetch('/api/rrr-generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricNumber: values.matricNumber,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phoneNumber: values.phoneNumber,
          amount: amount,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store the transaction details
        setPaymentDetails({
          amount: amount,
          reference: data.transactionId,
          rrr: data.rrr, // This might be present for RRR generation
          totalPaid: data.totalPaid || 0,
          remainingBalance: data.remainingBalance || FULL_PAYMENT_AMOUNT,
        });

        // Ready to show Remita button
        setReadyForPayment(true);
      } else {
        toast.error(data.error || 'Failed to initialize transaction');
      }
    } catch (error) {
      console.error('Transaction error:', error);
      toast.error('Failed to initialize transaction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (response: any) => {
    try {
      console.log('Payment success response:', response);

      // Record the successful payment in our database
      const updateResponse = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matricNumber: form.getValues('matricNumber'),
          rrr: response.RRR || response.paymentReference,
          transactionId: response.transactionId || paymentDetails?.reference,
          amount: paymentDetails?.amount || 0,
          status: 'completed',
        }),
      });

      const updateData = await updateResponse.json();

      if (updateData.success) {
        setPaymentDetails((prevDetails) => ({
          ...prevDetails!,
          rrr: response.RRR || response.paymentReference,
          totalPaid: updateData.totalPaid || 0,
          remainingBalance: updateData.remainingBalance || 0,
          paymentPercentage: updateData.paymentPercentage || 0,
        }));

        setPaymentSuccess(true);
        toast.success('Payment successful');
      } else {
        toast.error(updateData.error || 'Payment processing failed');
      }
    } catch (error) {
      console.error('Payment recording error:', error);
      toast.error('Error recording payment. Please contact support.');
    }
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment failed:', error);
    toast.error('Payment failed. Please try again or contact support.');
  };

  const handlePaymentClose = () => {
    toast.info('Payment window closed');
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await initializeTransaction(values);
  };

  if (paymentSuccess && paymentDetails) {
    return (
      <PaymentSuccess
        rrr={paymentDetails.rrr || ''}
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
    <div className='py-4 px-4'>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className='space-y-4 overflow-y-auto'
        >
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name='firstName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input placeholder='John' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='lastName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input placeholder='Doe' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type='email'
                    placeholder='john.doe@example.com'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='matricNumber'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Matric Number</FormLabel>
                <FormControl>
                  <Input placeholder='e.g., 2020/1234' {...field} />
                </FormControl>
                {isCheckingStudent && (
                  <p className='text-xs text-gray-500'>
                    Checking payment status...
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='phoneNumber'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <Input placeholder='e.g., 08012345678' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
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

          <FormField
            control={form.control}
            name='paymentOption'
            render={({ field }) => (
              <FormItem className='space-y-3'>
                <FormLabel>Payment Option</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className='flex flex-col space-y-1'
                  >
                    <div className='flex items-center space-x-2'>
                      <RadioGroupItem value='full' id='full' />
                      <Label htmlFor='full'>
                        Full Payment (
                        {formatCurrency(
                          paymentStatus?.remainingBalance || FULL_PAYMENT_AMOUNT
                        )}
                        )
                      </Label>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <RadioGroupItem value='half' id='half' />
                      <Label htmlFor='half'>
                        Half Payment (
                        {formatCurrency(
                          Math.min(
                            paymentStatus?.remainingBalance ||
                              FULL_PAYMENT_AMOUNT,
                            Math.ceil(FULL_PAYMENT_AMOUNT / 2)
                          )
                        )}
                        )
                      </Label>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <RadioGroupItem value='custom' id='custom' />
                      <Label htmlFor='custom'>Custom Amount</Label>
                    </div>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchPaymentOption === 'custom' && (
            <FormField
              control={form.control}
              name='customAmount'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Amount (₦)</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      placeholder='Enter amount'
                      {...field}
                      onChange={(e) =>
                        field.onChange(Number.parseFloat(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className='flex justify-between pt-4'>
            <Button type='button' variant='outline' onClick={onBack}>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back
            </Button>

            {!readyForPayment ? (
              <Button type='submit' disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className='mr-2 h-4 w-4' />
                    Continue to Payment
                  </>
                )}
              </Button>
            ) : (
              <RemitaButton
                amount={paymentDetails?.amount || 0}
                firstName={form.getValues('firstName')}
                lastName={form.getValues('lastName')}
                email={form.getValues('email')}
                matricNumber={form.getValues('matricNumber')}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onClose={handlePaymentClose}
              />
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
