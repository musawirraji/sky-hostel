import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FULL_PAYMENT_AMOUNT } from '@/utils/payment-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { generateRRR } from '@/utils/supabase-utils';

interface RRRGenerationResponse {
  success: boolean;
  message?: string;
  error?: string;
  errorCode?: string;
  rrr?: string;
  transactionId?: string;
  totalPaid?: number;
  remainingBalance?: number;
  paymentPercentage?: number;
}

export async function POST(request: NextRequest) {
  console.log('RRR generation API route called');

  try {
    const body = await request.json();
    console.log('Request body received:', JSON.stringify(body, null, 2));

    const { matricNumber, firstName, lastName, email, amount, phoneNumber } =
      body as {
        matricNumber: string;
        firstName: string;
        lastName: string;
        email: string;
        amount: number;
        phoneNumber?: string;
      };

    // Validate required fields
    if (!matricNumber || !firstName || !lastName || !email || !amount) {
      console.log('Missing required fields for RRR generation:', {
        matricNumber,
        firstName,
        lastName,
        email,
        amount,
      });

      return NextResponse.json(
        {
          success: false,
          error:
            'Please provide all required information to generate your payment reference.',
          errorCode: 'MISSING_FIELDS',
        } as RRRGenerationResponse,
        { status: 400 }
      );
    }

    // Check if student exists to get payment information
    let totalPaid = 0;
    let remainingBalance = FULL_PAYMENT_AMOUNT;
    let paymentPercentage = 0;

    console.log(`Looking up student with matric number: ${matricNumber}`);
    const { data: existingStudent, error: findError } = await supabase
      .from('students')
      .select('id, total_paid, remaining_balance')
      .eq('matric_number', matricNumber)
      .single();

    // Also check for any payments made with this matric number (even without a student record)
    const { data: existingPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount')
      .eq('matriculation_number', matricNumber)
      .eq('status', 'completed');

    if (existingStudent) {
      console.log(`Student found: ${existingStudent.id}`);
      totalPaid = existingStudent.total_paid || 0;
      remainingBalance =
        existingStudent.remaining_balance || FULL_PAYMENT_AMOUNT;
    } else if (existingPayments && existingPayments.length > 0) {
      // Calculate totals from unlinked payments
      totalPaid = existingPayments.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0
      );
      remainingBalance = Math.max(0, FULL_PAYMENT_AMOUNT - totalPaid);
      console.log(
        `Student not found, but ${existingPayments.length} payments found. Total paid: ${totalPaid}`
      );
    } else {
      console.log(`No existing student or payments found for ${matricNumber}`);
    }

    // Calculate payment percentage
    paymentPercentage = Math.min(
      100,
      Math.round((totalPaid / FULL_PAYMENT_AMOUNT) * 100)
    );

    // Validate payment amount doesn't exceed remaining balance
    if (amount > remainingBalance) {
      return NextResponse.json(
        {
          success: false,
          error: `Payment amount (₦${amount.toLocaleString()}) exceeds remaining balance (₦${remainingBalance.toLocaleString()})`,
          errorCode: 'INVALID_AMOUNT',
          totalPaid,
          remainingBalance,
          paymentPercentage,
        } as RRRGenerationResponse,
        { status: 400 }
      );
    }

    console.log('Calling generateRRR with params:', {
      matricNumber,
      firstName,
      lastName,
      email,
      amount,
      phoneNumber,
    });

    // Generate RRR using your existing function
    const result = await generateRRR({
      matricNumber,
      firstName,
      lastName,
      email,
      amount,
      phoneNumber,
    });

    console.log('generateRRR result:', result);

    if (!result.success) {
      // Parse the error to provide a more user-friendly message
      let userFriendlyError = 'Unable to generate your payment reference.';
      let errorCode = 'GENERATION_FAILED';

      // If there's an error message from Remita API
      if (result.error && result.error.includes('Unauthorized')) {
        userFriendlyError =
          'The payment system is currently unavailable. Please try again later or contact support.';
        errorCode = 'AUTH_ERROR';
      } else if (result.error && result.error.includes('timeout')) {
        userFriendlyError =
          'The payment service is taking too long to respond. Please try again later.';
        errorCode = 'TIMEOUT';
      } else if (result.error && result.error.includes('Student not found')) {
        // For direct payments, create a transaction ID instead
        const transactionId = `FEE-${matricNumber}-${Date.now()}`;

        // Create a payment record with the matric number but without a student record
        try {
          const { data: paymentData, error: paymentError } = await supabase
            .from('payments')
            .insert([
              {
                student_id: null, // No student ID yet
                rrr: null, // No RRR yet (will be updated after Remita callback)
                transaction_id: transactionId,
                amount: amount,
                status: 'pending',
                matriculation_number: matricNumber, // Store matric number for later linking
              },
            ])
            .select();

          if (paymentError) {
            throw paymentError;
          }

          // Return the transaction ID for Remita inline payment
          return NextResponse.json({
            success: true,
            message: 'Transaction initialized for direct payment',
            transactionId: transactionId,
            totalPaid,
            remainingBalance,
            paymentPercentage,
          } as RRRGenerationResponse);
        } catch (dbError) {
          console.error('Error creating payment record:', dbError);
          throw dbError;
        }
      }

      // Log the detailed error for debugging
      console.error('Detailed error from Remita:', result.error);

      return NextResponse.json(
        {
          success: false,
          error: userFriendlyError,
          errorCode: errorCode,
          debug:
            process.env.NODE_ENV === 'development' ? result.error : undefined,
        } as RRRGenerationResponse,
        { status: 500 }
      );
    }

    console.log('RRR generation successful, returning response');

    return NextResponse.json({
      success: true,
      message: 'Payment reference generated successfully',
      rrr: result.rrr,
      transactionId: result.transactionId,
      totalPaid,
      remainingBalance,
      paymentPercentage,
    } as RRRGenerationResponse);
  } catch (error) {
    console.error('Error in RRR generation API route:', error);

    // Create a user-friendly error message
    let userFriendlyError =
      'We encountered an issue while processing your request. Please try again later.';
    let errorCode = 'SERVER_ERROR';

    // Extract more specific info if available
    if (error instanceof Error) {
      if (
        error.message.includes('Unauthorized') ||
        error.message.includes('401')
      ) {
        userFriendlyError =
          'The payment system is currently unavailable. Please try again later or contact support.';
        errorCode = 'AUTH_ERROR';
      } else if (
        error.message.includes('timeout') ||
        error.message.includes('ECONNABORTED')
      ) {
        userFriendlyError =
          'The payment service is taking too long to respond. Please try again later.';
        errorCode = 'TIMEOUT';
      } else if (
        error.message.includes('network') ||
        error.message.includes('ENOTFOUND')
      ) {
        userFriendlyError =
          'There seems to be a network issue. Please check your connection and try again.';
        errorCode = 'NETWORK_ERROR';
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: userFriendlyError,
        errorCode: errorCode,
        debug:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
      } as RRRGenerationResponse,
      { status: 500 }
    );
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  console.log('OPTIONS request received for RRR generation API route');

  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
