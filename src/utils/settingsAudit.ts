/**
 * Writes settings-related audit entries directly to activity_logs.
 * All calls are fire-and-forget — failures must never block UI operations.
 */
import { supabase } from '../lib/supabase';

export type SettingsAuditEvent =
  | 'PROFILE_UPDATED'
  | 'PROFILE_PHOTO_UPDATED'
  | 'PAYMENT_SETTINGS_UPDATED'
  | 'NOTIFICATION_SETTINGS_UPDATED'
  | 'WHATSAPP_SETTINGS_UPDATED'
  | 'SUBSCRIPTION_CHANGE_REQUESTED'
  | 'COUPON_APPLIED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'ACCOUNT_DATA_EXPORTED'
  | 'ACCOUNT_DATA_CLEARED';

export async function logSettingsChange(input: {
  event: SettingsAuditEvent;
  detail: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('activity_logs').insert({
      owner_id: user.id,
      property_id: null,
      event: input.event,
      detail: input.detail,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Audit failures must not block UI operations.
  }
}
