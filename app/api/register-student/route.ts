import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { FULL_PAYMENT_AMOUNT } from '@/utils/payment-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface RegistrationResponse {
  success: boolean;
  message?: string;
  error?: string;
  studentId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract payment details
    const {
      paymentRRR,
      paymentAmount: initialPaymentAmount,
      ...studentData
    } = body;

    // Validate required fields
    if (
      !studentData.matricNumber ||
      !studentData.firstName ||
      !studentData.lastName ||
      !studentData.email
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required student information',
        } as RegistrationResponse,
        { status: 400 }
      );
    }

    // Check if payment exists and is valid
    let paymentId = null;
    let paymentAmount = 0;

    if (paymentRRR) {
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('id, amount, status')
        .eq('rrr', paymentRRR)
        .single();

      if (paymentError) {
        console.log('Payment not found:', paymentError);
      } else if (payment) {
        paymentId = payment.id;
        paymentAmount = payment.amount || 0;

        if (payment.status !== 'completed') {
          console.log('Payment not completed, status:', payment.status);
        }
      }
    }

    // Check if student already exists
    const { data: existingStudent, error: findError } = await supabase
      .from('students')
      .select('id, total_paid, remaining_balance')
      .eq('matric_number', studentData.matricNumber)
      .single();

    let studentId;
    let totalPaid = 0;
    let remainingBalance = FULL_PAYMENT_AMOUNT;

    if (existingStudent) {
      // Update existing student
      totalPaid = existingStudent.total_paid || 0;
      remainingBalance =
        existingStudent.remaining_balance || FULL_PAYMENT_AMOUNT;

      const { error: updateError } = await supabase
        .from('students')
        .update({
          first_name: studentData.firstName,
          last_name: studentData.lastName,
          email: studentData.email,
          phone_number: studentData.phoneNumber,
          faculty: studentData.faculty,
          department: studentData.department,
          level: studentData.level,
          date_of_birth: studentData.dateOfBirth,
          gender: studentData.gender,
          state_of_origin: studentData.stateOfOrigin,
          address: studentData.address,
          emergency_contact: studentData.emergencyContact,
          emergency_contact_name: studentData.emergencyContactName,
          emergency_contact_relationship:
            studentData.emergencyContactRelationship,
          registration_completed: true,
        })
        .eq('id', existingStudent.id);

      if (updateError) {
        throw updateError;
      }

      studentId = existingStudent.id;
    } else {
      // Create new student with default values for required fields
      const { data: newStudent, error: createError } = await supabase
        .from('students')
        .insert([
          {
            first_name: studentData.firstName,
            last_name: studentData.lastName,
            email: studentData.email,
            matric_number: studentData.matricNumber,
            phone_number: studentData.phoneNumber || '',
            faculty: studentData.faculty || '',
            department: studentData.department || '',
            level: studentData.level || '100', // Default level
            date_of_birth: studentData.dateOfBirth || null,
            gender: studentData.gender || '',
            state_of_origin: studentData.stateOfOrigin || '',
            address: studentData.address || '',
            emergency_contact: studentData.emergencyContact || '',
            emergency_contact_name: studentData.emergencyContactName || '',
            emergency_contact_relationship:
              studentData.emergencyContactRelationship || '',
            payment_status: paymentAmount > 0 ? 'partial' : 'pending',
            registration_completed: true,
            total_paid: paymentAmount,
            remaining_balance: FULL_PAYMENT_AMOUNT - paymentAmount,
          },
        ])
        .select();

      if (createError) {
        throw createError;
      }

      studentId = newStudent?.[0]?.id;
      totalPaid = paymentAmount;
      remainingBalance = FULL_PAYMENT_AMOUNT - paymentAmount;
    }

    // If we have a payment and a student, link them
    if (paymentId && studentId) {
      // Update payment to link to student
      const { error: linkError } = await supabase
        .from('payments')
        .update({ student_id: studentId })
        .eq('id', paymentId);

      if (linkError) {
        console.error('Error linking payment to student:', linkError);
      }

      // Also check for any other payments with the same RRR but no student_id
      const { data: otherPayments, error: findPaymentsError } = await supabase
        .from('payments')
        .select('id')
        .eq('rrr', paymentRRR)
        .is('student_id', null);

      if (!findPaymentsError && otherPayments && otherPayments.length > 0) {
        // Update these payments too
        const paymentIds = otherPayments.map((p) => p.id);
        const { error: updatePaymentsError } = await supabase
          .from('payments')
          .update({ student_id: studentId })
          .in('id', paymentIds);

        if (updatePaymentsError) {
          console.error('Error updating other payments:', updatePaymentsError);
        }
      }

      // Update student payment totals if needed
      if (paymentAmount > 0) {
        const newTotalPaid = totalPaid + paymentAmount;
        const newRemainingBalance = Math.max(
          0,
          FULL_PAYMENT_AMOUNT - newTotalPaid
        );
        const isFullyPaid = newTotalPaid >= FULL_PAYMENT_AMOUNT;

        const { error: updatePaymentError } = await supabase
          .from('students')
          .update({
            total_paid: newTotalPaid,
            remaining_balance: newRemainingBalance,
            payment_status: isFullyPaid ? 'paid' : 'partial',
          })
          .eq('id', studentId);

        if (updatePaymentError) {
          console.error(
            'Error updating student payment totals:',
            updatePaymentError
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Student registered successfully',
      studentId,
    } as RegistrationResponse);
  } catch (error) {
    console.error('Student registration error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to register student',
      } as RegistrationResponse,
      { status: 500 }
    );
  }
}
