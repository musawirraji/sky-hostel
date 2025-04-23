// utils/supabase-utils.ts

import { createClient } from '@supabase/supabase-js';
import { generateRemitaRRR, generateMockRRR } from './remita-api';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface GenerateRRRResponse {
  success: boolean;
  rrr?: string;
  transactionId?: string;
  error?: string;
}

export const generateRRR = async (studentDetails: {
  matricNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  amount: number;
  phoneNumber?: string;
}): Promise<GenerateRRRResponse> => {
  try {
    console.log('Starting RRR generation for:', studentDetails.matricNumber);

    // Lookup student to get phone if not provided
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, phone_number')
      .eq('matric_number', studentDetails.matricNumber)
      .single();

    if (studentError) {
      console.warn('Error fetching student, continuing without:', studentError);
    }

    const orderId = `FEE-${studentDetails.matricNumber}-${Date.now()}`;

    // Build the RemitaParams
    const remitaParams = {
      amount: studentDetails.amount,
      payerName: `${studentDetails.firstName} ${studentDetails.lastName}`,
      payerEmail: studentDetails.email,
      payerPhone:
        studentDetails.phoneNumber || student?.phone_number || '08000000000',
      description: `School Fee Payment for ${studentDetails.matricNumber}`,
      orderId,
    };

    // Decide sandbox vs. live by your env flag
    const useSandboxMode =
      process.env.NODE_ENV === 'development' ||
      process.env.NEXT_PUBLIC_REMITA_ENV === 'demo';

    let result;
    if (useSandboxMode) {
      console.log('Using SANDBOX (demo) Remita API');
      result = await generateMockRRR(remitaParams);
    } else {
      console.log('Using LIVE Remita API');
      result = await generateRemitaRRR(remitaParams);
    }

    if (!result.success || !result.rrr) {
      throw new Error(result.error || 'Failed to generate RRR');
    }

    console.log('RRR generated successfully:', result.rrr);

    // Insert a pending payment record
    const paymentData = {
      student_id: student?.id || null,
      rrr: result.rrr,
      transaction_id: orderId,
      amount: studentDetails.amount,
      status: 'pending',
      matriculation_number: studentDetails.matricNumber,
    };

    const { error: paymentError } = await supabase
      .from('payments')
      .insert([paymentData]);

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      throw paymentError;
    }

    return {
      success: true,
      rrr: result.rrr,
      transactionId: orderId,
    };
  } catch (error) {
    console.error('RRR generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate RRR',
    };
  }
};
