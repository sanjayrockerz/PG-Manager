-- Tenant portal invitation tracking
-- Records when the most recent magic-link invitation email was sent to a tenant,
-- powering the "Invitation Sent / Pending / Last sent" status and the Resend button
-- in Owner Portal → Tenant Details.
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN tenants.invitation_sent_at IS
  'ISO timestamp of the most recent tenant-portal magic-link invitation email. NULL = never invited.';
