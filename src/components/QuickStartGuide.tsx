/**
 * QuickStartGuide — onboarding checklist shown to new owners with no data.
 * Uses a localStorage flag keyed to the user ID so it's per-account.
 * Steps are derived from real app state; no fake data.
 */
import { useEffect, useState } from 'react';
import {
  Building2, CheckCircle2, ChevronRight, CreditCard,
  Users, Wrench, X, Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { supabaseOwnerDataApi } from '../services/supabaseData';

interface Step {
  id: string;
  label: string;
  description: string;
  icon: typeof Building2;
  navTarget: string;
  done: boolean;
}

interface QuickStartGuideProps {
  onNavigate: (tab: string) => void;
  onDismiss: () => void;
}

const guideKey = (userId: string) => `rc:quickstart-dismissed:${userId}`;

export function QuickStartGuide({ onNavigate, onDismiss }: QuickStartGuideProps) {
  const { user } = useAuth();
  const { properties } = useProperty();
  const [tenantCount, setTenantCount] = useState(0);
  const [paymentCount, setPaymentCount] = useState(0);
  const [dismissed, setDismissed] = useState(() => {
    if (!user || typeof window === 'undefined') return true;
    return localStorage.getItem(guideKey(user.id)) === 'true';
  });

  useEffect(() => {
    if (!user) return;
    // Fetch lightweight counts to determine checklist status
    supabaseOwnerDataApi.getDashboardSnapshot('all')
      .then((snap) => {
        setTenantCount(snap.totalTenants);
        setPaymentCount(snap.recentPayments.length);
      })
      .catch(() => {});
  }, [user]);

  const handleDismiss = () => {
    if (user && typeof window !== 'undefined') {
      localStorage.setItem(guideKey(user.id), 'true');
    }
    setDismissed(true);
    onDismiss();
  };

  if (dismissed) return null;

  const steps: Step[] = [
    {
      id: 'add-property',
      label: 'Add your first property',
      description: 'Set up floors, rooms, and occupancy mode',
      icon: Building2,
      navTarget: 'properties',
      done: properties.length > 0,
    },
    {
      id: 'add-tenant',
      label: 'Onboard a tenant',
      description: 'Create a tenant record and assign a room',
      icon: Users,
      navTarget: 'tenants',
      done: tenantCount > 0,
    },
    {
      id: 'payment-settings',
      label: 'Set up payment details',
      description: 'Add your UPI ID so tenants can pay you',
      icon: CreditCard,
      navTarget: 'settings',
      done: paymentCount > 0,
    },
    {
      id: 'building-view',
      label: 'Review Building View',
      description: 'See live occupancy and room status',
      icon: Building2,
      navTarget: 'building-view',
      done: properties.some((p) => p.rooms.length > 0),
    },
    {
      id: 'maintenance',
      label: 'Explore maintenance workflow',
      description: 'See how tickets are tracked and resolved',
      icon: Wrench,
      navTarget: 'maintenance',
      done: false,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const pct = Math.round((completedCount / steps.length) * 100);
  const allDone = completedCount === steps.length;

  return (
    <div className="bg-white border border-indigo-200 rounded-2xl shadow-lg shadow-indigo-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Getting Started</p>
            <p className="text-xs text-indigo-200">{completedCount}/{steps.length} steps complete</p>
          </div>
        </div>
        <button onClick={handleDismiss} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Dismiss checklist">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-indigo-100 h-1">
        <div className="bg-indigo-600 h-1 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      {/* Steps */}
      <div className="divide-y divide-gray-100">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <button
              key={step.id}
              onClick={() => step.done ? undefined : onNavigate(step.navTarget)}
              disabled={step.done}
              className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${
                step.done
                  ? 'bg-gray-50 cursor-default'
                  : 'hover:bg-indigo-50 cursor-pointer'
              }`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                step.done ? 'bg-green-100' : 'bg-indigo-100'
              }`}>
                {step.done
                  ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                  : <Icon className="w-4 h-4 text-indigo-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${step.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {step.label}
                </p>
                {!step.done && <p className="text-xs text-gray-500 truncate">{step.description}</p>}
              </div>
              {!step.done && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
        {allDone ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              <p className="text-sm font-semibold">All set! Your workspace is ready.</p>
            </div>
            <button onClick={handleDismiss} className="text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
          </div>
        ) : (
          <p className="text-xs text-gray-400">{steps.length - completedCount} step{steps.length - completedCount !== 1 ? 's' : ''} remaining — complete them to get the most out of RentCare.</p>
        )}
      </div>
    </div>
  );
}
