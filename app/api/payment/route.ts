import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FULL_PAYMENT_AMOUNT } from '@/utils/payment-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface PaymentResponse {
  success: boolean;
  message?: string;
  error?: string;
  totalPaid?: number;
  remainingBalance?: number;
  isFullyPaid?: boolean;
  paymentPercentage?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log(
      'Payment recording request body:',
      JSON.stringify(body, null, 2)
    );

    const {
      matricNumber,
      rrr,
      transactionId,
      amount,
      status = 'completed',
    } = body;

    if (!matricNumber || !amount || !transactionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required payment information',
        } as PaymentResponse,
        { status: 400 }
      );
    }

    // First, check if this transaction ID already exists to avoid duplicates
    const { data: existingTransaction, error: transactionError } =
      await supabase
        .from('payments')
        .select('id, status')
        .eq('transaction_id', transactionId)
        .single();

    if (existingTransaction) {
      console.log(
        `Transaction ${transactionId} already exists with status: ${existingTransaction.status}`
      );

      // If already completed, just return the current status
      if (existingTransaction.status === 'completed') {
        // Get current payment totals
        const paymentTotals = await getPaymentTotals(matricNumber);

        return NextResponse.json({
          success: true,
          message: 'Payment was already recorded',
          ...paymentTotals,
        } as PaymentResponse);
      }

      // Otherwise update the status of the existing transaction
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: status,
          rrr: rrr || null, // Update RRR if provided
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingTransaction.id);

      if (updateError) throw updateError;

      // Get updated payment totals
      const paymentTotals = await getPaymentTotals(matricNumber);

      return NextResponse.json({
        success: true,
        message: 'Payment status updated successfully',
        ...paymentTotals,
      } as PaymentResponse);
    }

    // Check if student exists
    const { data: existingStudent, error: findError } = await supabase
      .from('students')
      .select('id, total_paid, remaining_balance')
      .eq('matric_number', matricNumber)
      .single();

    // Create a new payment record
    const paymentData = {
      student_id: existingStudent?.id || null,
      rrr: rrr || null,
      transaction_id: transactionId,
      amount: amount,
      status: status,
      matriculation_number: matricNumber, // Store matric number for later linking
    };

    const { error: paymentError } = await supabase
      .from('payments')
      .insert([paymentData]);

    if (paymentError) throw paymentError;

    // If student exists, update their payment totals
    if (existingStudent && status === 'completed') {
      // Calculate new totals
      const totalPaid = (existingStudent.total_paid || 0) + amount;
      const remainingBalance = Math.max(0, FULL_PAYMENT_AMOUNT - totalPaid);
      const isFullyPaid = totalPaid >= FULL_PAYMENT_AMOUNT;

      // Update student record
      const { error: updateError } = await supabase
        .from('students')
        .update({
          total_paid: totalPaid,
          remaining_balance: remainingBalance,
          payment_status: isFullyPaid ? 'paid' : 'partial',
        })
        .eq('id', existingStudent.id);

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        message: 'Payment recorded successfully',
        totalPaid,
        remainingBalance,
        isFullyPaid,
        paymentPercentage: Math.min(
          100,
          Math.round((totalPaid / FULL_PAYMENT_AMOUNT) * 100)
        ),
      } as PaymentResponse);
    }

    // If no student record exists yet, just calculate the payment totals
    // This covers the case for payments made before registration
    const paymentTotals = await getPaymentTotals(matricNumber);

    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully',
      ...paymentTotals,
    } as PaymentResponse);
  } catch (error) {
    console.error('Payment recording error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to record payment',
      } as PaymentResponse,
      { status: 500 }
    );
  }
}

// Helper function to get payment totals for a matric number
async function getPaymentTotals(matricNumber: string) {
  // Get all completed payments for this matric number
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('amount')
    .eq('matriculation_number', matricNumber)
    .eq('status', 'completed');

  if (paymentsError) {
    console.error('Error getting payments:', paymentsError);
    return {
      totalPaid: 0,
      remainingBalance: FULL_PAYMENT_AMOUNT,
      isFullyPaid: false,
      paymentPercentage: 0,
    };
  }

  const totalPaid = payments.reduce(
    (sum, payment) => sum + (payment.amount || 0),
    0
  );
  const remainingBalance = Math.max(0, FULL_PAYMENT_AMOUNT - totalPaid);
  const isFullyPaid = totalPaid >= FULL_PAYMENT_AMOUNT;
  const paymentPercentage = Math.min(
    100,
    Math.round((totalPaid / FULL_PAYMENT_AMOUNT) * 100)
  );

  return {
    totalPaid,
    remainingBalance,
    isFullyPaid,
    paymentPercentage,
  };
}
