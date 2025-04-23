import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FULL_PAYMENT_AMOUNT } from '@/utils/payment-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface PaymentStatusCheckResponse {
  success: boolean;
  message?: string;
  error?: string;
  status?: 'pending' | 'completed' | 'failed';
  totalPaid?: number;
  remainingBalance?: number;
  isFullyPaid?: boolean;
  paymentPercentage?: number;
  paymentDetails?: {
    rrr: string;
    amount: number;
    status: string;
    paymentDate?: string;
    transactionId?: string;
    matricNumber?: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const rrr = url.searchParams.get('rrr');
    const matricNumber = url.searchParams.get('matricNumber');

    // Check if we have at least one identifier
    if (!rrr && !matricNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing RRR or matricNumber parameter',
        } as PaymentStatusCheckResponse,
        { status: 400 }
      );
    }

    // If we have RRR, check payment status
    if (rrr) {
      // Check our database for the payment
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('rrr', rrr)
        .single();

      if (paymentError) {
        // For demo purposes, assume payment is pending or not found
        return NextResponse.json(
          {
            success: false,
            error: 'Payment not found',
          } as PaymentStatusCheckResponse,
          { status: 404 }
        );
      }

      // If payment has a student_id, get student details
      if (payment.student_id) {
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('matric_number, total_paid, remaining_balance')
          .eq('id', payment.student_id)
          .single();

        if (!studentError && student) {
          const totalPaid = student.total_paid || 0;
          const remainingBalance =
            student.remaining_balance || FULL_PAYMENT_AMOUNT;
          const isFullyPaid = totalPaid >= FULL_PAYMENT_AMOUNT;
          const paymentPercentage = Math.min(
            100,
            Math.round((totalPaid / FULL_PAYMENT_AMOUNT) * 100)
          );

          return NextResponse.json({
            success: true,
            status: payment.status || 'pending',
            totalPaid,
            remainingBalance,
            isFullyPaid,
            paymentPercentage,
            message: `Payment status for RRR ${rrr} is ${
              payment.status || 'pending'
            }`,
            paymentDetails: {
              rrr: payment.rrr,
              amount: payment.amount,
              status: payment.status,
              paymentDate: payment.created_at,
              transactionId: payment.transaction_id,
              matricNumber: student.matric_number,
            },
          } as PaymentStatusCheckResponse);
        }
      }

      // Get payments made with the same matric number to calculate totals
      const matNumber = payment.matriculation_number;

      if (matNumber) {
        // Get all payments for this matric number
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('amount, status')
          .eq('matriculation_number', matNumber)
          .eq('status', 'completed');

        if (!paymentsError && payments) {
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

          return NextResponse.json({
            success: true,
            status: payment.status || 'pending',
            totalPaid,
            remainingBalance,
            isFullyPaid,
            paymentPercentage,
            message: `Payment status for RRR ${rrr} is ${
              payment.status || 'pending'
            }`,
            paymentDetails: {
              rrr: payment.rrr,
              amount: payment.amount,
              status: payment.status,
              paymentDate: payment.created_at,
              transactionId: payment.transaction_id,
              matricNumber: matNumber,
            },
          } as PaymentStatusCheckResponse);
        }
      }

      // If no student or error getting student, just return payment details
      return NextResponse.json({
        success: true,
        status: payment.status || 'pending',
        totalPaid: payment.amount || 0,
        remainingBalance: FULL_PAYMENT_AMOUNT - (payment.amount || 0),
        isFullyPaid: false,
        paymentPercentage: Math.min(
          100,
          Math.round(((payment.amount || 0) / FULL_PAYMENT_AMOUNT) * 100)
        ),
        message: `Payment status for RRR ${rrr} is ${
          payment.status || 'pending'
        }`,
        paymentDetails: {
          rrr: payment.rrr,
          amount: payment.amount,
          status: payment.status,
          paymentDate: payment.created_at,
          transactionId: payment.transaction_id,
          matricNumber: payment.matriculation_number,
        },
      } as PaymentStatusCheckResponse);
    }

    // If we have matricNumber, use that to get payment details
    if (matricNumber) {
      // First check if student exists
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('id, payment_status, total_paid, remaining_balance')
        .eq('matric_number', matricNumber)
        .single();

      if (!studentError && student) {
        // Get all payments for this student
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('student_id', student.id)
          .order('created_at', { ascending: false });

        // Calculate payment status
        const totalPaid = student.total_paid || 0;
        const remainingBalance =
          student.remaining_balance || FULL_PAYMENT_AMOUNT;
        const isFullyPaid = totalPaid >= FULL_PAYMENT_AMOUNT;
        const paymentPercentage = Math.min(
          100,
          Math.round((totalPaid / FULL_PAYMENT_AMOUNT) * 100)
        );

        // Get the latest payment
        const latestPayment =
          payments && payments.length > 0 ? payments[0] : null;

        return NextResponse.json({
          success: true,
          status: isFullyPaid ? 'completed' : 'pending',
          totalPaid,
          remainingBalance,
          isFullyPaid,
          paymentPercentage,
          message: `Payment status for student ${matricNumber} is ${
            isFullyPaid ? 'completed' : 'pending'
          }`,
          paymentDetails: latestPayment
            ? {
                rrr: latestPayment.rrr,
                amount: latestPayment.amount,
                status: latestPayment.status,
                paymentDate: latestPayment.created_at,
                transactionId: latestPayment.transaction_id,
                matricNumber: matricNumber,
              }
            : undefined,
        } as PaymentStatusCheckResponse);
      } else {
        // No student record, check for payments with this matric number
        const { data: payments, error: paymentsError } = await supabase
          .from('payments')
          .select('*')
          .eq('matriculation_number', matricNumber)
          .order('created_at', { ascending: false });

        if (!paymentsError && payments && payments.length > 0) {
          // Calculate payment status from all completed payments
          const completedPayments = payments.filter(
            (p) => p.status === 'completed'
          );
          const totalPaid = completedPayments.reduce(
            (sum, payment) => sum + (payment.amount || 0),
            0
          );
          const remainingBalance = Math.max(0, FULL_PAYMENT_AMOUNT - totalPaid);
          const isFullyPaid = totalPaid >= FULL_PAYMENT_AMOUNT;
          const paymentPercentage = Math.min(
            100,
            Math.round((totalPaid / FULL_PAYMENT_AMOUNT) * 100)
          );

          // Get the latest payment
          const latestPayment = payments[0];

          return NextResponse.json({
            success: true,
            status: isFullyPaid ? 'completed' : 'pending',
            totalPaid,
            remainingBalance,
            isFullyPaid,
            paymentPercentage,
            message: `Payment status for matric number ${matricNumber} is ${
              isFullyPaid ? 'completed' : 'pending'
            }`,
            paymentDetails: {
              rrr: latestPayment.rrr,
              amount: latestPayment.amount,
              status: latestPayment.status,
              paymentDate: latestPayment.created_at,
              transactionId: latestPayment.transaction_id,
              matricNumber: matricNumber,
            },
          } as PaymentStatusCheckResponse);
        } else {
          // No payments found
          return NextResponse.json({
            success: true,
            status: 'pending',
            totalPaid: 0,
            remainingBalance: FULL_PAYMENT_AMOUNT,
            isFullyPaid: false,
            paymentPercentage: 0,
            message: `No payments found for matric number ${matricNumber}`,
          } as PaymentStatusCheckResponse);
        }
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request',
      } as PaymentStatusCheckResponse,
      { status: 400 }
    );
  } catch (error) {
    console.error('Payment status check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      } as PaymentStatusCheckResponse,
      { status: 500 }
    );
  }
}
