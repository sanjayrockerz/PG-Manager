import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { OwnerSubscriptionRecord, supabaseOwnerDataApi } from '../services/supabaseData';

const planOptions = [
  {
    code: 'starter',
    name: 'Starter',
    monthlyPrice: 0,
    yearlyPrice: 0,
    highlights: ['Up to 1 property', 'Core tenant and payment workflow', 'Email support'],
  },
  {
    code: 'growth',
    name: 'Growth',
    monthlyPrice: 1499,
    yearlyPrice: 14990,
    highlights: ['Up to 10 properties', 'Team access controls', 'Priority support'],
  },
  {
    code: 'scale',
    name: 'Scale',
    monthlyPrice: 3499,
    yearlyPrice: 34990,
    highlights: ['Unlimited properties', 'Advanced analytics', 'Dedicated onboarding support'],
  },
] as const;

function formatDate(value: string): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(value: number): string {
  return `Rs ${value.toLocaleString('en-IN')}`;
}

export function Subscriptions() {
  const [subscription, setSubscription] = useState<OwnerSubscriptionRecord | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'growth' | 'scale'>('starter');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [seatCount, setSeatCount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadSubscription = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await supabaseOwnerDataApi.getOwnerSubscription();
      setSubscription(data);
      if (data.planCode === 'starter' || data.planCode === 'growth' || data.planCode === 'scale') {
        setSelectedPlan(data.planCode);
      }
      setBillingCycle(data.billingCycle);
      setSeatCount(Math.max(1, data.seats));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load subscription.');
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  const selectedPlanConfig = useMemo(
    () => planOptions.find((plan) => plan.code === selectedPlan) ?? planOptions[0],
    [selectedPlan],
  );

  const computedAmount = useMemo(() => {
    const base = billingCycle === 'monthly' ? selectedPlanConfig.monthlyPrice : selectedPlanConfig.yearlyPrice;
    return selectedPlan === 'starter' ? base : base * Math.max(1, seatCount);
  }, [billingCycle, seatCount, selectedPlan, selectedPlanConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage('');

    const renewsAt = billingCycle === 'monthly'
      ? new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString()
      : new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)).toISOString();

    try {
      const updated = await supabaseOwnerDataApi.updateOwnerSubscription({
        planCode: selectedPlan,
        billingCycle,
        amount: computedAmount,
        seats: Math.max(1, seatCount),
        status: selectedPlan === 'starter' ? 'trialing' : 'active',
        renewsAt,
      });
      setSubscription(updated);
      toast.success('Subscription updated successfully');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update subscription.');
      toast.error('Failed to update subscription');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900">Subscriptions</h1>
          <p className="text-gray-600 mt-1">Loading your current plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Subscriptions</h1>
        <p className="text-gray-600 mt-1">Manage your plan, billing cycle, and seat allocation.</p>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {subscription && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Current Plan</p>
            <p className="text-xl text-gray-900 mt-1">{subscription.planCode} ({subscription.status})</p>
            <p className="text-sm text-gray-500 mt-1">Renews on {formatDate(subscription.renewsAt)}</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <CreditCard className="w-4 h-4 text-gray-500" />
            <span>{formatAmount(subscription.amount)} / {subscription.billingCycle}</span>
            <span className="text-gray-300">|</span>
            <ShieldCheck className="w-4 h-4 text-gray-500" />
            <span>{subscription.seats} seats</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {planOptions.map((plan) => {
          const isSelected = selectedPlan === plan.code;
          const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;

          return (
            <button
              key={plan.code}
              onClick={() => setSelectedPlan(plan.code)}
              className={`text-left bg-white rounded-xl border p-5 transition-colors ${isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <p className="text-gray-900 font-semibold">{plan.name}</p>
              <p className="text-sm text-gray-500 mt-1">{price === 0 ? 'Free' : `${formatAmount(price)} / ${billingCycle}`}</p>
              <div className="mt-4 space-y-2">
                {plan.highlights.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Billing Cycle</label>
            <select
              value={billingCycle}
              onChange={(event) => setBillingCycle(event.target.value as 'monthly' | 'yearly')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Seats</label>
            <input
              type="number"
              min={1}
              value={seatCount}
              onChange={(event) => setSeatCount(Math.max(1, Number(event.target.value) || 1))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              disabled={selectedPlan === 'starter'}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Estimated Amount</label>
            <div className="px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">
              {formatAmount(computedAmount)}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Save Subscription'}
          </button>
        </div>
      </div>
    </div>
  );
}
