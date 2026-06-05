import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

// PhonePe order creation — runs server-side so Node crypto is available.
// Called by the frontend paymentGateway.ts phonepeAdapter.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderRequest {
  merchantId: string;
  saltKey: string;
  saltIndex: string;
  amount: number;
  currency: string;
  orderId: string;
  redirectUrl: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json() as OrderRequest;
    const { merchantId, saltKey, saltIndex = '1', amount, currency, orderId, redirectUrl } = body;

    if (!merchantId || !saltKey) {
      return new Response(JSON.stringify({ success: false, error: 'Missing PhonePe credentials' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const payloadObj = {
      merchantId,
      merchantTransactionId: orderId,
      amount,
      currency,
      redirectUrl,
      redirectMode: 'REDIRECT',
      paymentInstrument: { type: 'PAY_PAGE' },
    };

    const payloadBase64 = btoa(JSON.stringify(payloadObj));
    const checksumInput = `${payloadBase64}/pg/v1/pay${saltKey}`;

    // Use Web Crypto (available in Deno) for SHA-256
    const encoder = new TextEncoder();
    const keyData = encoder.encode(checksumInput);
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    const checksum = `${hashHex}###${saltIndex}`;

    const resp = await fetch('https://api.phonepe.com/apis/hermes/pg/v1/pay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
      },
      body: JSON.stringify({ request: payloadBase64 }),
    });

    const json = await resp.json() as {
      data?: { instrumentResponse?: { redirectInfo?: { url?: string } } };
      message?: string;
      success?: boolean;
    };

    if (!resp.ok || json.success === false) {
      return new Response(JSON.stringify({ success: false, error: json.message ?? 'PhonePe error' }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const redirectPayUrl = json.data?.instrumentResponse?.redirectInfo?.url;
    return new Response(JSON.stringify({ success: true, redirectUrl: redirectPayUrl }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
