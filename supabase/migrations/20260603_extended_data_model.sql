-- Extended tenant fields
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS alternate_phone TEXT,
  ADD COLUMN IF NOT EXISTS dob TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS guardian_relationship TEXT,
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'quarterly', 'half_yearly', 'yearly'));

-- Extended payment fields
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_mode TEXT
    CHECK (payment_mode IN ('upi', 'cash', 'bank_transfer', 'cheque', 'other')),
  ADD COLUMN IF NOT EXISTS reference_number TEXT,
  ADD COLUMN IF NOT EXISTS payment_notes TEXT;
