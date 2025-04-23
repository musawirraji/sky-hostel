import { createClient } from '@supabase/supabase-js';
import { generateRemitaRRR, generateMockRRR } from './remita-api';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const generateRRR = async (studentDetails: {
  matricNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  amount: number;
  phoneNumber?: string;
}): Promise<{
  success: boolean;
  rrr?: string;
  transactionId?: string;
  error?: string;
}> => {
  try {
    console.log('Starting RRR generation for:', studentDetails.matricNumber);

    // Check if student exists
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, phone_number')
      .eq('matric_number', studentDetails.matricNumber)
      .single();

    // Generate a unique order ID regardless of student existence
    const orderId = `FEE-${studentDetails.matricNumber}-${Date.now()}`;
    const useMockImplementation = process.env.NODE_ENV === 'development';

    // Get Remita parameters
    const remitaParams = {
      amount: studentDetails.amount,
      payerName: `${studentDetails.firstName} ${studentDetails.lastName}`,
      payerEmail: studentDetails.email,
      payerPhone:
        studentDetails.phoneNumber || student?.phone_number || '08000000000',
      description: `School Fee Payment for ${studentDetails.matricNumber}`,
      orderId: orderId,
    };

    // Use mock or real Remita API
    let result;
    if (useMockImplementation) {
      console.log('Using mock RRR generation...');
      result = await generateMockRRR(remitaParams);
    } else {
      console.log('Using real Remita API for RRR generation...');
      result = await generateRemitaRRR(remitaParams);
    }

    if (!result.success || !result.rrr) {
      throw new Error(result.error || 'Failed to generate RRR');
    }

    console.log('RRR generated successfully:', result.rrr);

    // Create payment record with or without student_id
    const paymentData = {
      student_id: student?.id || null,
      rrr: result.rrr,
      transaction_id: orderId,
      amount: studentDetails.amount,
      status: 'pending',
      matriculation_number: studentDetails.matricNumber, // Always store matric number
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
