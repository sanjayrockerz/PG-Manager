-- Add assigned_to column to maintenance_tickets for workflow E fix
ALTER TABLE public.maintenance_tickets
  ADD COLUMN IF NOT EXISTS assigned_to TEXT DEFAULT NULL;
