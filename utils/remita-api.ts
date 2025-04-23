// utils/remita-api.ts

import crypto from 'crypto';

export interface RemitaInitResponse {
  statuscode?: string;
  status?: string;
  message?: string;
  RRR?: string;
  paymentReference?: string;
  transactionId?: string;
  merchantId?: string;
  hash?: string;
}

export interface RemitaParams {
  amount: number;
  payerName: string;
  payerEmail: string;
  payerPhone: string;
  description: string;
  orderId: string;
}

// Pull in your base URL, secret key, merchant & service IDs from env
const API_BASE =
  process.env.REMITA_API_BASE_URL?.replace(/\/$/, '') ||
  'https://api-demo.systemspecsng.com';
const REMITA_API_KEY =
  process.env.REMITA_API_KEY ||
  'sk_test_S5AvzBbJZygTKGzeSYIHuWfUNaKGJk4uUuI+px8soitsHCXdMJ6XHKXT72WO9RcP';
const REMITA_MERCHANT_ID = process.env.REMITA_MERCHANT_ID || '2547916';
const REMITA_SERVICE_TYPE_ID = process.env.REMITA_SERVICE_TYPE_ID || '4430731';

/**
 * Call Remita’s real paymentinit endpoint to get an RRR.
 */
export async function generateRemitaRRR(params: RemitaParams): Promise<{
  success: boolean;
  rrr?: string;
  statusMessage?: string;
  error?: string;
}> {
  try {
    console.log('Generating RRR with params:', {
      serviceTypeId: REMITA_SERVICE_TYPE_ID,
      merchantId: REMITA_MERCHANT_ID,
      orderId: params.orderId,
      amount: params.amount,
    });

    // Build the authentication hash
    const raw = `${REMITA_MERCHANT_ID}${REMITA_SERVICE_TYPE_ID}${params.orderId}${params.amount}${REMITA_API_KEY}`;
    const hashedApiKey = crypto.createHash('sha512').update(raw).digest('hex');

    console.log('Generated authentication hash');

    const headers = new Headers({
      'Content-Type': 'application/json',
      Authorization: `remitaConsumerKey=${REMITA_MERCHANT_ID},remitaConsumerToken=${hashedApiKey}`,
    });

    const body = JSON.stringify({
      serviceTypeId: REMITA_SERVICE_TYPE_ID,
      amount: params.amount.toString(),
      orderId: params.orderId,
      payerName: params.payerName,
      payerEmail: params.payerEmail,
      payerPhone: params.payerPhone,
      description: params.description,
    });

    const url = `${API_BASE}/remita/exapp/api/v1/send/api/echannelsvc/merchant/api/paymentinit`;
    console.log('Request URL:', url);
    console.log('Request payload:', body);

    // Fetch the Remita endpoint
    const res = await fetch(url, { method: 'POST', headers, body });
    console.log('Response status:', res.status);
    const text = await res.text();
    console.log('Response text:', text);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const result = JSON.parse(text) as RemitaInitResponse;

    // Remita uses statuscode "025" to indicate success
    if (result.statuscode === '025' && result.RRR) {
      return {
        success: true,
        rrr: result.RRR,
        statusMessage: result.status,
      };
    } else {
      return {
        success: false,
        statusMessage: result.status,
        error: result.message || 'Failed to generate RRR',
      };
    }
  } catch (err) {
    console.error('Error generating Remita RRR:', err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'An unknown error occurred during RRR generation',
    };
  }
}

/**
 * Check Remita retrieval reference (RRR) payment status.
 */
export async function checkRemitaRRRStatus(rrr: string): Promise<{
  success: boolean;
  status?: 'pending' | 'completed' | 'failed';
  statusMessage?: string;
  error?: string;
}> {
  try {
    const url = `${API_BASE}/remita/exapp/api/v1/send/api/echannelsvc/merchant/api/payment/status/${REMITA_MERCHANT_ID}/${rrr}/${REMITA_API_KEY}`;
    console.log('Checking RRR status with URL:', url);

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();
    console.log('RRR status result:', json);

    let status: 'pending' | 'completed' | 'failed' = 'pending';
    if (json.status === '00' || json.status === '01') {
      status = 'completed';
    } else if (json.status === '021' || json.status === '020') {
      status = 'pending';
    } else {
      status = 'failed';
    }

    return {
      success: true,
      status,
      statusMessage: json.message || json.statusMessage,
    };
  } catch (err) {
    console.error('Error checking Remita RRR status:', err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'An unknown error occurred during status check',
    };
  }
}

/**
 * Generate a mock RRR for dev/testing.
 */
export async function generateMockRRR(params: RemitaParams): Promise<{
  success: boolean;
  rrr?: string;
  statusMessage?: string;
  error?: string;
}> {
  try {
    await new Promise((r) => setTimeout(r, 500));
    const mockRRR = `${Math.floor(Math.random() * 900000000) + 100000000}`;
    console.log('Mock RRR generated:', mockRRR, 'orderId:', params.orderId);
    return { success: true, rrr: mockRRR, statusMessage: 'Mock RRR generated' };
  } catch (err) {
    console.error('Error in mock RRR generation:', err);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'An unknown error occurred in mock RRR generation',
    };
  }
}
