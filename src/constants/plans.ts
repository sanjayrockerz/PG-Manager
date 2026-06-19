// Shared subscription plan catalog — single source of truth for plan limits and
// feature lists, used by Settings (full plan picker) and Sidebar (compact usage card).
export const PLANS = [
  {
    code: 'starter',
    label: 'Starter',
    price: 0,
    propertyLimit: 1,
    tenantLimit: 15,
    features: ['1 property', 'Up to 15 tenants', 'Maintenance tickets', 'Basic announcements'],
  },
  {
    code: 'pro',
    label: 'Pro',
    price: 999,
    propertyLimit: Infinity,
    tenantLimit: Infinity,
    features: ['Unlimited properties', 'Unlimited tenants', 'WhatsApp messaging', 'Team collaboration (5 seats)', 'Advanced analytics'],
    highlighted: true,
  },
  {
    code: 'business',
    label: 'Business',
    price: 2499,
    propertyLimit: Infinity,
    tenantLimit: Infinity,
    features: ['Everything in Pro', 'Priority support', 'Custom branding', '20 team seats', 'API access'],
  },
] as const;

export type PlanCode = typeof PLANS[number]['code'];

export function getPlanByCode(code: string | undefined | null) {
  return PLANS.find((p) => p.code === code) ?? PLANS[0];
}
