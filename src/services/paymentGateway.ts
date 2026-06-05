/**
 * Payment Gateway Abstraction Layer
 *
 * Configure via Settings > Integrations > Payment Gateway.
 * No code changes required to activate a gateway after credentials are saved.
 *
 * Manual (UPI deep-link) is always available without credentials.
 * Other gateways become active once the owner saves credentials.
 *
 * PhonePe: checksum is computed in a Supabase Edge Function (supabase/functions/phonepe-order)
 * because SHA-256 signing requires server-side execution. Deploy the function before activating.
 */

import { supabase } from '../lib/supabase';

export type PaymentGatewayName =
  | 'manual'
  | 'razorpay'
  | 'phonepe'
  | 'cashfree'
  | 'payu';

export interface PaymentGatewayConfig {
  gateway: PaymentGatewayName;
  enabled: boolean;
  /** Gateway-specific key/value credentials. Never logged or exposed in UI. */
  config: Record<string, string>;
}

export interface PaymentOrderInput {
  amount: number;         // amount in paise (INR × 100)
  currency: string;       // 'INR'
  tenantName: string;
  description: string;
  orderId?: string;       // optional: caller-supplied idempotency key
  customerPhone?: string; // tenant phone for gateways that require it (Cashfree)
  customerId?: string;    // tenant ID for gateways that require a customer identifier
}

export interface PaymentOrderResult {
  success: boolean;
  /** Deep-link or checkout URL for the tenant to open */
  redirectUrl?: string;
  /** Gateway-assigned order ID */
  orderId?: string;
  /** Raw gateway token / transaction reference */
  token?: string;
  error?: string;
}

export interface PaymentGatewayAdapter {
  name: PaymentGatewayName;
  label: string;
  requiredFields: Array<{ key: string; label: string; secret?: boolean }>;
  /** Create a payment order and return a redirect/deeplink URL */
  createOrder(input: PaymentOrderInput, config: Record<string, string>): Promise<PaymentOrderResult>;
}

// ─── Adapters ─────────────────────────────────────────────────────────────────

const manualAdapter: PaymentGatewayAdapter = {
  name: 'manual',
  label: 'Manual / UPI',
  requiredFields: [],
  async createOrder(input) {
    // Manual: generate UPI deep-link from the owner's configured UPI ID.
    // The UPI ID is stored separately in paymentSettings.upiId (not gateway config).
    // This adapter is a no-op here — the Pay Now button uses buildUpiLink() directly.
    return { success: true, redirectUrl: '', orderId: `manual-${Date.now()}` };
  },
};

const razorpayAdapter: PaymentGatewayAdapter = {
  name: 'razorpay',
  label: 'Razorpay',
  requiredFields: [
    { key: 'keyId', label: 'Key ID' },
    { key: 'keySecret', label: 'Key Secret', secret: true },
    { key: 'webhookSecret', label: 'Webhook Secret', secret: true },
  ],
  async createOrder(input, config) {
    const { keyId, keySecret } = config;
    if (!keyId || !keySecret) return { success: false, error: 'Razorpay credentials not configured' };
    try {
      const resp = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: input.amount,
          currency: input.currency,
          receipt: input.orderId ?? `rcpt-${Date.now()}`,
          notes: { description: input.description },
        }),
      });
      const json = await resp.json() as { id?: string; error?: { description?: string } };
      if (!resp.ok) return { success: false, error: json.error?.description ?? 'Razorpay error' };
      return { success: true, orderId: json.id };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Network error' };
    }
  },
};

const phonepeAdapter: PaymentGatewayAdapter = {
  name: 'phonepe',
  label: 'PhonePe',
  requiredFields: [
    { key: 'merchantId', label: 'Merchant ID' },
    { key: 'saltKey', label: 'Salt Key', secret: true },
    { key: 'saltIndex', label: 'Salt Index (default: 1)' },
  ],
  async createOrder(input, config) {
    const { merchantId, saltKey, saltIndex = '1' } = config;
    if (!merchantId || !saltKey) return { success: false, error: 'PhonePe credentials not configured' };
    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/payment-callback`
        : '/payment-callback';
      // Checksum requires SHA-256 — delegated to Supabase Edge Function.
      const { data, error } = await supabase.functions.invoke<{ success: boolean; redirectUrl?: string; error?: string }>('phonepe-order', {
        body: {
          merchantId,
          saltKey,
          saltIndex,
          amount: input.amount,
          currency: input.currency,
          orderId: input.orderId ?? `TXN${Date.now()}`,
          redirectUrl,
        },
      });
      if (error) return { success: false, error: error.message ?? 'Edge function error' };
      if (!data?.success) return { success: false, error: data?.error ?? 'PhonePe order failed' };
      return { success: true, redirectUrl: data.redirectUrl };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'PhonePe order failed' };
    }
  },
};

const cashfreeAdapter: PaymentGatewayAdapter = {
  name: 'cashfree',
  label: 'Cashfree',
  requiredFields: [
    { key: 'appId', label: 'App ID' },
    { key: 'secretKey', label: 'Secret Key', secret: true },
    { key: 'environment', label: 'Environment (sandbox/production)' },
  ],
  async createOrder(input, config) {
    const { appId, secretKey, environment = 'production' } = config;
    if (!appId || !secretKey) return { success: false, error: 'Cashfree credentials not configured' };
    const base = environment === 'sandbox'
      ? 'https://sandbox.cashfree.com/pg'
      : 'https://api.cashfree.com/pg';
    try {
      const resp = await fetch(`${base}/orders`, {
        method: 'POST',
        headers: {
          'x-client-id': appId,
          'x-client-secret': secretKey,
          'x-api-version': '2023-08-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: input.orderId ?? `cf-${Date.now()}`,
          order_amount: input.amount / 100,
          order_currency: input.currency,
          customer_details: {
            customer_id: input.customerId ?? `tenant-${Date.now()}`,
            customer_name: input.tenantName,
            customer_phone: input.customerPhone?.replace(/\D/g, '').slice(-10) ?? '',
          },
        }),
      });
      const json = await resp.json() as { payment_session_id?: string; message?: string };
      if (!resp.ok) return { success: false, error: json.message ?? 'Cashfree error' };
      return { success: true, token: json.payment_session_id };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Network error' };
    }
  },
};

const payuAdapter: PaymentGatewayAdapter = {
  name: 'payu',
  label: 'PayU',
  requiredFields: [
    { key: 'merchantKey', label: 'Merchant Key' },
    { key: 'merchantSalt', label: 'Merchant Salt', secret: true },
    { key: 'environment', label: 'Environment (test/production)' },
  ],
  async createOrder(input, config) {
    const { merchantKey, environment = 'production' } = config;
    if (!merchantKey) return { success: false, error: 'PayU credentials not configured' };
    const base = environment === 'test'
      ? 'https://test.payu.in/_payment'
      : 'https://secure.payu.in/_payment';
    const txnId = input.orderId ?? `payu-${Date.now()}`;
    return {
      success: true,
      redirectUrl: `${base}?key=${merchantKey}&txnid=${txnId}&amount=${input.amount / 100}&productinfo=${encodeURIComponent(input.description)}&firstname=${encodeURIComponent(input.tenantName)}`,
      orderId: txnId,
    };
  },
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const PAYMENT_GATEWAY_ADAPTERS: Record<PaymentGatewayName, PaymentGatewayAdapter> = {
  manual: manualAdapter,
  razorpay: razorpayAdapter,
  phonepe: phonepeAdapter,
  cashfree: cashfreeAdapter,
  payu: payuAdapter,
};

export const PAYMENT_GATEWAY_OPTIONS: Array<{ value: PaymentGatewayName; label: string }> = [
  { value: 'manual', label: 'Manual / UPI (no gateway needed)' },
  { value: 'razorpay', label: 'Razorpay' },
  { value: 'phonepe', label: 'PhonePe Business' },
  { value: 'cashfree', label: 'Cashfree' },
  { value: 'payu', label: 'PayU' },
];

/**
 * Create a payment order using the owner's configured gateway.
 * Falls back to manual (UPI deep-link) if not configured.
 */
export async function createPaymentOrder(
  input: PaymentOrderInput,
  gatewayConfig: PaymentGatewayConfig | null | undefined,
): Promise<PaymentOrderResult> {
  const adapterName = gatewayConfig?.enabled ? (gatewayConfig.gateway ?? 'manual') : 'manual';
  const adapter = PAYMENT_GATEWAY_ADAPTERS[adapterName] ?? manualAdapter;
  return adapter.createOrder(input, gatewayConfig?.config ?? {});
}
