/**
 * WhatsApp Provider Abstraction Layer
 *
 * Mirrors the SMS provider design (see smsProvider.ts). Business logic calls
 * `sendWhatsApp(to, message, providerConfig)` and never needs to know which
 * provider is wired. Adding a new provider only means adding an adapter here —
 * no caller changes required.
 *
 * Until a real provider is configured (via Settings > Integrations), the default
 * adapter is a safe no-op, so invitation flows degrade gracefully: the email
 * magic-link is still sent and the WhatsApp step is simply skipped.
 */

export type WhatsAppProviderName =
  | 'none'
  | 'meta_cloud'
  | 'twilio_whatsapp'
  | 'gupshup';

export interface WhatsAppProviderConfig {
  provider: WhatsAppProviderName;
  enabled: boolean;
  /** Provider-specific key/value credentials. Never logged or exposed in UI. */
  config: Record<string, string>;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** True when no provider is configured — caller may treat as a soft skip. */
  skipped?: boolean;
}

export interface WhatsAppProviderAdapter {
  name: WhatsAppProviderName;
  label: string;
  requiredFields: Array<{ key: string; label: string; secret?: boolean }>;
  send(to: string, message: string, config: Record<string, string>): Promise<WhatsAppSendResult>;
}

/** Normalise a phone number to a bare E.164-style digit string (no +, spaces). */
function toDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

// ─── Adapters ─────────────────────────────────────────────────────────────────

const noneAdapter: WhatsAppProviderAdapter = {
  name: 'none',
  label: 'Not configured',
  requiredFields: [],
  async send() {
    return { success: true, skipped: true };
  },
};

/** Meta WhatsApp Cloud API (graph.facebook.com). */
const metaCloudAdapter: WhatsAppProviderAdapter = {
  name: 'meta_cloud',
  label: 'WhatsApp Cloud API (Meta)',
  requiredFields: [
    { key: 'phoneNumberId', label: 'Phone Number ID' },
    { key: 'accessToken', label: 'Access Token', secret: true },
  ],
  async send(to, message, config) {
    const { phoneNumberId, accessToken } = config;
    if (!phoneNumberId || !accessToken) {
      return { success: false, error: 'WhatsApp Cloud API credentials not configured' };
    }
    try {
      const resp = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toDigits(to),
          type: 'text',
          text: { preview_url: true, body: message },
        }),
      });
      const json = await resp.json() as { messages?: Array<{ id: string }>; error?: { message: string } };
      if (!resp.ok) return { success: false, error: json.error?.message ?? 'WhatsApp Cloud API error' };
      return { success: true, messageId: json.messages?.[0]?.id };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Network error' };
    }
  },
};

/** Twilio WhatsApp (uses the Messages API with whatsapp: prefixes). */
const twilioWhatsAppAdapter: WhatsAppProviderAdapter = {
  name: 'twilio_whatsapp',
  label: 'Twilio WhatsApp',
  requiredFields: [
    { key: 'accountSid', label: 'Account SID' },
    { key: 'authToken', label: 'Auth Token', secret: true },
    { key: 'fromNumber', label: 'From WhatsApp Number (E.164)' },
  ],
  async send(to, message, config) {
    const { accountSid, authToken, fromNumber } = config;
    if (!accountSid || !authToken || !fromNumber) {
      return { success: false, error: 'Twilio WhatsApp credentials not configured' };
    }
    try {
      const resp = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: `whatsapp:+${toDigits(to)}`,
            From: `whatsapp:${fromNumber.startsWith('+') ? fromNumber : `+${toDigits(fromNumber)}`}`,
            Body: message,
          }),
        },
      );
      const json = await resp.json() as { sid?: string; message?: string };
      if (!resp.ok) return { success: false, error: json.message ?? 'Twilio WhatsApp error' };
      return { success: true, messageId: json.sid };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Network error' };
    }
  },
};

/** Gupshup WhatsApp (popular in India). */
const gupshupAdapter: WhatsAppProviderAdapter = {
  name: 'gupshup',
  label: 'Gupshup WhatsApp',
  requiredFields: [
    { key: 'apiKey', label: 'API Key', secret: true },
    { key: 'source', label: 'Source Number (E.164)' },
    { key: 'appName', label: 'App Name' },
  ],
  async send(to, message, config) {
    const { apiKey, source, appName } = config;
    if (!apiKey || !source) {
      return { success: false, error: 'Gupshup credentials not configured' };
    }
    try {
      const resp = await fetch('https://api.gupshup.io/wa/api/v1/msg', {
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          channel: 'whatsapp',
          source: toDigits(source),
          destination: toDigits(to),
          'src.name': appName ?? 'RentCare',
          message: JSON.stringify({ type: 'text', text: message }),
        }),
      });
      const json = await resp.json() as { status?: string; messageId?: string; message?: string };
      if (!resp.ok || json.status === 'error') {
        return { success: false, error: json.message ?? 'Gupshup error' };
      }
      return { success: true, messageId: json.messageId };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Network error' };
    }
  },
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const WHATSAPP_PROVIDER_ADAPTERS: Record<WhatsAppProviderName, WhatsAppProviderAdapter> = {
  none: noneAdapter,
  meta_cloud: metaCloudAdapter,
  twilio_whatsapp: twilioWhatsAppAdapter,
  gupshup: gupshupAdapter,
};

export const WHATSAPP_PROVIDER_OPTIONS: Array<{ value: WhatsAppProviderName; label: string }> = [
  { value: 'none', label: 'Not configured' },
  { value: 'meta_cloud', label: 'WhatsApp Cloud API (Meta)' },
  { value: 'twilio_whatsapp', label: 'Twilio WhatsApp' },
  { value: 'gupshup', label: 'Gupshup (India)' },
];

/** True when a usable WhatsApp provider is wired and enabled. */
export function isWhatsAppConfigured(cfg: WhatsAppProviderConfig | null | undefined): boolean {
  return Boolean(cfg?.enabled && cfg.provider && cfg.provider !== 'none');
}

/**
 * Send a WhatsApp message using the configured provider. Returns a soft skip
 * (success:true, skipped:true) when no provider is configured, so callers can
 * remain provider-agnostic.
 */
export async function sendWhatsApp(
  to: string,
  message: string,
  providerConfig: WhatsAppProviderConfig | null | undefined,
): Promise<WhatsAppSendResult> {
  if (!isWhatsAppConfigured(providerConfig)) {
    return { success: true, skipped: true };
  }
  const adapter = WHATSAPP_PROVIDER_ADAPTERS[providerConfig!.provider] ?? noneAdapter;
  return adapter.send(to, message, providerConfig!.config ?? {});
}
