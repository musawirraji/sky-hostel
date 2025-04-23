import crypto from 'crypto';

const REMITA_API_BASE_URL =
  process.env.REMITA_API_BASE_URL || 'https://api-demo.systemspecsng.com';
const REMITA_API_KEY =
  process.env.REMITA_API_KEY ||
  'sk_test_S5AvzBbJZygTKGzeSYIHuWfUNaKGJk4uUuI+px8soitsHCXdMJ6XHKXT72WO9RcP';
const REMITA_MERCHANT_ID = process.env.REMITA_MERCHANT_ID || '2547916';
const REMITA_SERVICE_TYPE_ID = process.env.REMITA_SERVICE_TYPE_ID || '4430731';

interface RemitaInitResponse {
  statuscode?: string;
  status?: string;
  message?: string;
  RRR?: string;
  paymentReference?: string;
  transactionId?: string;
  merchantId?: string;
  hash?: string;
}

interface RemitaParams {
  amount: number;
  payerName: string;
  payerEmail: string;
  payerPhone: string;
  description: string;
  orderId: string;
}

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

    // Generate hash for Remita authentication
    // Format: SHA512(merchantId+serviceTypeId+orderId+amount+apiKey)
    const hashedApiKey = crypto
      .createHash('sha512')
      .update(
        `${REMITA_MERCHANT_ID}${REMITA_SERVICE_TYPE_ID}${params.orderId}${params.amount}${REMITA_API_KEY}`
      )
      .digest('hex');

    console.log('Generated authentication hash');

    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');
    // Use the correct authentication format for Remita
    myHeaders.append(
      'Authorization',
      `remitaConsumerKey=${REMITA_MERCHANT_ID},remitaConsumerToken=${hashedApiKey}`
    );

    const requestBody = JSON.stringify({
      serviceTypeId: REMITA_SERVICE_TYPE_ID,
      amount: params.amount.toString(),
      orderId: params.orderId,
      payerName: params.payerName,
      payerEmail: params.payerEmail,
      payerPhone: params.payerPhone,
      description: params.description,
    });

    console.log('Request payload:', requestBody);
    console.log(
      'Request URL:',
      `${REMITA_API_BASE_URL}/remita/exapp/api/v1/send/api/echannelsvc/merchant/api/paymentinit`
    );

    if (
      process.env.NEXT_PUBLIC_REMITA_ENV === 'demo' &&
      process.env.USE_MOCK_ON_VERCEL === 'true'
    ) {
      console.log('Using mock implementation for RRR generation');
      return generateMockRRR(params);
    }

    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: requestBody,
    };

    // Demo endpoint for invoice/RRR generation
    const response = await fetch(
      `${REMITA_API_BASE_URL}/remita/exapp/api/v1/send/api/echannelsvc/merchant/api/paymentinit`,
      requestOptions
    );

    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response text:', responseText);

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status}, response: ${responseText}`
      );
    }

    const result = JSON.parse(responseText) as RemitaInitResponse;

    // Check if the RRR generation was successful
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
  } catch (error) {
    console.error('Error generating Remita RRR:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Check the status of a payment with a given RRR
 */
export async function checkRemitaRRRStatus(rrr: string): Promise<{
  success: boolean;
  status?: 'pending' | 'completed' | 'failed';
  statusMessage?: string;
  error?: string;
}> {
  try {
    const myHeaders = new Headers();
    myHeaders.append('Content-Type', 'application/json');

    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
    };

    const apiUrl = `${REMITA_API_BASE_URL}/remita/exapp/api/v1/send/api/echannelsvc/merchant/api/payment/status/${REMITA_MERCHANT_ID}/${rrr}/${REMITA_API_KEY}`;
    console.log('Checking RRR status with URL:', apiUrl);

    const response = await fetch(apiUrl, requestOptions);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('RRR status check result:', result);

    let status: 'pending' | 'completed' | 'failed' = 'pending';

    if (result.status === '00' || result.status === '01') {
      status = 'completed';
    } else if (result.status === '021' || result.status === '020') {
      status = 'pending';
    } else {
      status = 'failed';
    }

    return {
      success: true,
      status,
      statusMessage: result.message || result.statusMessage,
    };
  } catch (error) {
    console.error('Error checking Remita RRR status:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Generate a mock RRR for development and testing
 * This is useful when you don't want to call the actual Remita API
 */
export async function generateMockRRR(params: RemitaParams): Promise<{
  success: boolean;
  rrr?: string;
  statusMessage?: string;
  error?: string;
}> {
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generate a mock RRR (9-digit number)
    const mockRRR = `${Math.floor(Math.random() * 900000000) + 100000000}`;

    console.log(
      'Mock Remita API - Generated RRR:',
      mockRRR,
      'for order:',
      params.orderId
    );

    return {
      success: true,
      rrr: mockRRR,
      statusMessage: 'Payment Reference generated',
    };
  } catch (error) {
    console.error('Error in mock RRR generation:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}
