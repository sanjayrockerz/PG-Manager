/**
 * SMS Provider Abstraction Layer
 *
 * Add credentials via Settings > Integrations > SMS Provider.
 * No code changes required to switch providers after credentials are saved.
 *
 * Supabase built-in phone auth handles OTP natively.
 * External providers are used for custom notifications (reminders, alerts).
 */

export type SMSProviderName =
  | 'supabase'
  | 'twilio'
  | 'twilio_verify'
  | 'textlocal'
  | 'vonage'
  | 'messagebird';

export interface SMSProviderConfig {
  provider: SMSProviderName;
  enabled: boolean;
  /** Provider-specific key/value credentials. Never logged or exposed in UI. */
  config: Record<string, string>;
}

export interface SMSSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SMSProviderAdapter {
  name: SMSProviderName;
  label: string;
  /** Configuration fields required by this provider */
  requiredFields: Array<{ key: string; label: string; secret?: boolean }>;
  /** Send a plain text SMS message */
  send(to: string, message: string, config: Record<string, string>): Promise<SMSSendResult>;
}

// ─── Adapters ─────────────────────────────────────────────────────────────────

const supabaseAdapter: SMSProviderAdapter = {
  name: 'supabase',
  label: 'Supabase (built-in)',
  requiredFields: [],
  async send() {
    // OTP is handled entirely by Supabase Auth — no direct SMS needed here.
    return { success: true };
  },
};

const twilioAdapter: SMSProviderAdapter = {
  name: 'twilio',
  label: 'Twilio SMS',
  requiredFields: [
    { key: 'accountSid', label: 'Account SID' },
    { key: 'authToken', label: 'Auth Token', secret: true },
    { key: 'fromNumber', label: 'From Number (E.164)' },
  ],
  async send(to, message, config) {
    const { accountSid, authToken, fromNumber } = config;
    if (!accountSid || !authToken || !fromNumber) {
      return { success: false, error: 'Twilio credentials not configured' };
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
          body: new URLSearchParams({ To: to, From: fromNumber, Body: message }),
        },
      );
      const json = await resp.json() as { sid?: string; message?: string };
      if (!resp.ok) return { success: false, error: json.message ?? 'Twilio error' };
      return { success: true, messageId: json.sid };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Network error' };
    }
  },
};

const twilioVerifyAdapter: SMSProviderAdapter = {
  name: 'twilio_verify',
  label: 'Twilio Verify',
  requiredFields: [
    { key: 'accountSid', label: 'Account SID' },
    { key: 'authToken', label: 'Auth Token', secret: true },
    { key: 'serviceSid', label: 'Verify Service SID' },
  ],
  async send(to, _message, config) {
    const { accountSid, authToken, serviceSid } = config;
    if (!accountSid || !authToken || !serviceSid) {
      return { success: false, error: 'Twilio Verify credentials not configured' };
    }
    try {
      const resp = await fetch(
        `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: to, Channel: 'sms' }),
        },
      );
      const json = await resp.json() as { sid?: string; message?: string };
      if (!resp.ok) return { success: false, error: json.message ?? 'Twilio Verify error' };
      return { success: true, messageId: json.sid };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Network error' };
    }
  },
};

const textlocalAdapter: SMSProviderAdapter = {
  name: 'textlocal',
  label: 'Textlocal',
  requiredFields: [
    { key: 'apiKey', label: 'API Key', secret: true },
    { key: 'sender', label: 'Sender Name (6 chars)' },
  ],
  async send(to, message, config) {
    const { apiKey, sender } = config;
    if (!apiKey) return { success: false, error: 'Textlocal API key not configured' };
    try {
      const resp = await fetch('https://api.textlocal.in/send/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          apikey: apiKey,
          sender: sender ?? 'RENTCR',
          numbers: to.replace(/\D/g, ''),
          message,
        }),
      });
      const json = await resp.json() as { status?: string; errors?: Array<{ message: string }> };
      if (json.status !== 'success') {
        return { success: false, error: json.errors?.[0]?.message ?? 'Textlocal error' };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Network error' };
    }
  },
};

const vonageAdapter: SMSProviderAdapter = {
  name: 'vonage',
  label: 'Vonage (Nexmo)',
  requiredFields: [
    { key: 'apiKey', label: 'API Key' },
    { key: 'apiSecret', label: 'API Secret', secret: true },
    { key: 'from', label: 'From (number or name)' },
  ],
  async send(to, message, config) {
    const { apiKey, apiSecret, from } = config;
    if (!apiKey || !apiSecret) return { success: false, error: 'Vonage credentials not configured' };
    try {
      const resp = await fetch('https://rest.nexmo.com/sms/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, api_secret: apiSecret, from: from ?? 'RentCare', to, text: message }),
      });
      const json = await resp.json() as { messages?: Array<{ status: string; 'error-text'?: string; 'message-id'?: string }> };
      const msg = json.messages?.[0];
      if (!msg || msg.status !== '0') {
        return { success: false, error: msg?.['error-text'] ?? 'Vonage error' };
      }
      return { success: true, messageId: msg['message-id'] };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Network error' };
    }
  },
};

const messagebirdAdapter: SMSProviderAdapter = {
  name: 'messagebird',
  label: 'MessageBird',
  requiredFields: [
    { key: 'accessKey', label: 'Access Key', secret: true },
    { key: 'originator', label: 'Originator (number or name)' },
  ],
  async send(to, message, config) {
    const { accessKey, originator } = config;
    if (!accessKey) return { success: false, error: 'MessageBird access key not configured' };
    try {
      const resp = await fetch('https://rest.messagebird.com/messages', {
        method: 'POST',
        headers: {
          Authorization: `AccessKey ${accessKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipients: [to.replace(/\D/g, '')], originator: originator ?? 'RentCare', body: message }),
      });
      const json = await resp.json() as { id?: string; errors?: Array<{ description: string }> };
      if (!resp.ok) return { success: false, error: json.errors?.[0]?.description ?? 'MessageBird error' };
      return { success: true, messageId: json.id };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Network error' };
    }
  },
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const SMS_PROVIDER_ADAPTERS: Record<SMSProviderName, SMSProviderAdapter> = {
  supabase: supabaseAdapter,
  twilio: twilioAdapter,
  twilio_verify: twilioVerifyAdapter,
  textlocal: textlocalAdapter,
  vonage: vonageAdapter,
  messagebird: messagebirdAdapter,
};

export const SMS_PROVIDER_OPTIONS: Array<{ value: SMSProviderName; label: string }> = [
  { value: 'supabase', label: 'Supabase (built-in, no config needed)' },
  { value: 'twilio', label: 'Twilio SMS' },
  { value: 'twilio_verify', label: 'Twilio Verify' },
  { value: 'textlocal', label: 'Textlocal (India)' },
  { value: 'vonage', label: 'Vonage / Nexmo' },
  { value: 'messagebird', label: 'MessageBird' },
];

/**
 * Send an SMS using the configured provider from settings.
 * Falls back to supabase adapter (no-op) if not configured.
 */
export async function sendSMS(
  to: string,
  message: string,
  providerConfig: SMSProviderConfig | null | undefined,
): Promise<SMSSendResult> {
  if (!providerConfig?.enabled || !providerConfig.provider) {
    return { success: true }; // no-op when not configured
  }
  const adapter = SMS_PROVIDER_ADAPTERS[providerConfig.provider] ?? supabaseAdapter;
  return adapter.send(to, message, providerConfig.config ?? {});
}
