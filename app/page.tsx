import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { PaymentModal } from '@/components/payment-modal';
import { VerifyReferenceModal } from '@/components/verify-reference-modal';
import { NavBar } from '@/components/nav-bar';
import { Footer } from '@/components/footer';

export default function Home() {
  return (
    <main className='min-h-screen flex flex-col'>
      <NavBar />

      <div className='flex-1 relative min-h-screen'>
        {/* Hero Background */}
        <div className='absolute inset-0 z-0'>
          <Image
            src='/placeholder.webp?height=1080&width=1920'
            alt='Hostel building'
            fill
            className='object-cover brightness-[0.65]'
            priority
          />
        </div>

        {/* Hero Content */}
        <div className='relative z-10 container mx-auto px-4 py-20 md:py-32 flex flex-col items-center'>
          <div className='max-w-4xl mx-auto text-center mb-16'>
            <h1 className='text-4xl md:text-6xl font-bold text-white mb-6'>
              Secure Your Hostel Accommodation
            </h1>
            <p className='text-xl md:text-2xl text-white/90'>
              Stay, explore, and make memories—The Ultimate Hostel Experience
              Awaits!
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl'>
            {/* Payment Card */}
            <div className='bg-white rounded-xl shadow-xl p-8 flex flex-col items-center text-center'>
              <div className='w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4'>
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
                    d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
              </div>
              <h2 className='text-2xl font-bold mb-2'>
                New here? Proceed to pay
              </h2>
              <p className='text-gray-600 mb-6'>
                With limited spaces available, get started by making payment of
                ₦219,000.
              </p>
              <PaymentModal>
                <Button
                  size='lg'
                  className='w-full bg-blue-600 hover:bg-blue-700 text-white'
                >
                  Pay Now
                </Button>
              </PaymentModal>
            </div>

            {/* Registration Card */}
            <div className='bg-white rounded-xl shadow-xl p-8 flex flex-col items-center text-center'>
              <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4'>
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
                    d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
                  />
                </svg>
              </div>
              <h2 className='text-2xl font-bold mb-2'>
                Already paid? Register now
              </h2>
              <p className='text-gray-600 mb-6'>
                Complete your registration to reserve your preferred room.
              </p>
              <VerifyReferenceModal>
                <Button
                  size='lg'
                  className='w-full bg-green-600 hover:bg-green-700 text-white'
                >
                  Register
                </Button>
              </VerifyReferenceModal>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
