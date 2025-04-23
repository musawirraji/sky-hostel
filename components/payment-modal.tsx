'use client';

import type React from 'react';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PayWithRRR } from '@/components/pay-with-rrr';
import { PayNow } from '@/components/pay-now';

interface PaymentModalProps {
  children: React.ReactNode;
}

export function PaymentModal({ children }: PaymentModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<'rrr' | 'direct' | null>(
    null
  );

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) {
      setSelectedOption(null);
    }
  };

  return (
    <>
      <div onClick={() => setOpen(true)}>{children}</div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className='sm:max-w-md max-h-[90vh] bg-white overflow-y-auto px-4'>
          <DialogHeader>
            <DialogTitle>Choose Payment Method</DialogTitle>
            <DialogDescription>
              Select how you would like to make your hostel payment of ₦219,000
            </DialogDescription>
          </DialogHeader>

          {!selectedOption ? (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 py-4'>
              <Button
                variant='outline'
                className='h-32 flex flex-col items-center justify-center gap-2 border-2 hover:border-blue-600 hover:bg-blue-50'
                onClick={() => setSelectedOption('rrr')}
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-8 w-8 text-blue-600'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                  />
                </svg>
                <span className='font-medium'>Generate RRR</span>
                <span className='text-xs text-gray-500'>
                  Pay later with Remita
                </span>
              </Button>

              <Button
                variant='outline'
                className='h-32 flex flex-col items-center justify-center gap-2 border-2 hover:border-green-600 hover:bg-green-50'
                onClick={() => setSelectedOption('direct')}
              >
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  className='h-8 w-8 text-green-600'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
                  />
                </svg>
                <span className='font-medium'>Pay Now</span>
                <span className='text-xs text-gray-500'>
                  Pay immediately online
                </span>
              </Button>
            </div>
          ) : selectedOption === 'rrr' ? (
            <PayWithRRR
              onBack={() => setSelectedOption(null)}
              onComplete={() => setOpen(false)}
            />
          ) : (
            <PayNow
              onBack={() => setSelectedOption(null)}
              onComplete={() => setOpen(false)}
            />
          )}

          {!selectedOption && (
            <DialogFooter className='sm:justify-start'>
              <Button
                type='button'
                variant='secondary'
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
