'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Define window type extension for Remita SDK
declare global {
  interface Window {
    RmPaymentEngine: {
      init: (cfg: {
        key: string;
        transactionId: string;
        customerId: string;
        firstName: string;
        lastName: string;
        email: string;
        amount: number;
        narration: string;
        onSuccess: (resp: any) => void;
        onError: (err: any) => void;
        onClose: () => void;
      }) => { showPaymentWidget: () => void };
    };
  }
}

interface RemitaButtonProps {
  amount: number;
  firstName: string;
  lastName: string;
  email: string;
  matricNumber: string;
  onSuccess: (resp: any) => void;
  onError: (err: any) => void;
  onClose: () => void;
}

export function RemitaButton({
  amount,
  firstName,
  lastName,
  email,
  matricNumber,
  onSuccess,
  onError,
  onClose,
}: RemitaButtonProps) {
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  // Load the Remita SDK
  useEffect(() => {
    // Don't reload if it's already loaded
    if (typeof window !== 'undefined' && window.RmPaymentEngine) {
      console.log('Remita SDK already loaded');
      setSdkReady(true);
      return;
    }

    console.log('Loading Remita SDK...');
    const script = document.createElement('script');
    script.src =
      'https://demo.remita.net/payment/v1/remita-pay-inline.bundle.js';
    script.async = true;

    script.onload = () => {
      console.log('Remita SDK loaded successfully');
      setSdkReady(true);
    };

    script.onerror = (error) => {
      console.error('Failed to load Remita SDK:', error);
      toast.error('Failed to load payment system');
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleClick = useCallback(() => {
    if (typeof window === 'undefined' || !window.RmPaymentEngine) {
      toast.error('Payment SDK not ready');
      return;
    }

    setLoading(true);
    console.log('Initializing payment...');

    try {
      const engine = window.RmPaymentEngine.init({
        key: process.env.NEXT_PUBLIC_REMITA_KEY as string,
        transactionId: `${Date.now()}`,
        customerId: email,
        firstName,
        lastName,
        email,
        amount,
        narration: `School Fee for ${matricNumber}`,
        onSuccess: (rawResponse) => {
          console.log('Payment success:', rawResponse);

          const formattedResponse = {
            RRR: rawResponse.paymentReference,
            transactionId: rawResponse.transactionId,
            message: rawResponse.message || '',
            status: 'successful',
            processorId: rawResponse.processorId || '',
            amount:
              typeof rawResponse.amount === 'number'
                ? rawResponse.amount.toString()
                : String(rawResponse.amount),
          };

          setLoading(false);
          toast.success('Payment successful');
          onSuccess(formattedResponse);
        },
        onError: (error) => {
          console.error('Payment error:', error);
          setLoading(false);
          toast.error('Payment failed');
          onError(error);
        },
        onClose: () => {
          console.log('Payment window closed');
          setLoading(false);
          toast('Payment window closed');
          onClose();
        },
      });

      console.log('Showing payment widget');
      engine.showPaymentWidget();
    } catch (error) {
      console.error('Error initializing payment:', error);
      setLoading(false);
      toast.error('Failed to initialize payment');
      onError(
        error instanceof Error
          ? error
          : new Error('Payment initialization failed')
      );
    }
  }, [
    amount,
    firstName,
    lastName,
    email,
    matricNumber,
    onSuccess,
    onError,
    onClose,
  ]);

  return (
    <Button
      onClick={handleClick}
      disabled={!sdkReady || loading}
      className='px-8 bg-blue-600 hover:bg-blue-700 w-[70%]  md:w-auto text-white'
    >
      {loading ? (
        <>
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          Processing…
        </>
      ) : !sdkReady ? (
        <>
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          Loading payment system...
        </>
      ) : (
        `Proceed to Payment (₦${amount.toLocaleString()})`
      )}
    </Button>
  );
}
