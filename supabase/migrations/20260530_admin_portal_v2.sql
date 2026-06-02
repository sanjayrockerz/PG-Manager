-- Admin Portal V2: suspend/verify, coupons, referrals, lead sources

-- Owner lifecycle columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Coupon management
CREATE TABLE IF NOT EXISTS public.admin_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'flat')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  max_uses int,
  used_count int NOT NULL DEFAULT 0,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  plan_restriction text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Referral tracking
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES public.profiles(id),
  referee_email text NOT NULL,
  referee_id uuid REFERENCES public.profiles(id),
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'converted', 'rewarded')),
  reward_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  converted_at timestamptz
);

-- Lead source / UTM tracking
CREATE TABLE IF NOT EXISTS public.lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.profiles(id),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  referrer_url text,
  landing_page text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.admin_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_coupons_platform_admin ON public.admin_coupons;
CREATE POLICY admin_coupons_platform_admin ON public.admin_coupons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('platform_admin', 'admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS referrals_access ON public.referrals;
CREATE POLICY referrals_access ON public.referrals
  FOR ALL
  USING (
    referrer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('platform_admin', 'admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS lead_sources_access ON public.lead_sources;
CREATE POLICY lead_sources_access ON public.lead_sources
  FOR ALL
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('platform_admin', 'admin', 'super_admin')
    )
  );

-- Index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals (referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_lead_sources_owner ON public.lead_sources (owner_id);
CREATE INDEX IF NOT EXISTS idx_admin_coupons_code ON public.admin_coupons (code);

-- Activity log event for admin actions
COMMENT ON COLUMN public.profiles.is_suspended IS 'Platform admin can suspend owner accounts';
COMMENT ON COLUMN public.profiles.verified_at IS 'Timestamp when admin manually verified this owner';
