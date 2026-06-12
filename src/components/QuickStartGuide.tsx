/**
 * QuickStartGuide — onboarding checklist shown to new owners.
 * Persists per-user in localStorage. Steps are derived from real app state.
 * The guide stays visible until ALL steps are complete (including legal signing).
 */
import { useEffect, useState } from 'react';
import {
  Building2, CheckCircle2, ChevronRight, CreditCard,
  FileSignature, Users, Wrench, X, Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { supabaseOwnerDataApi, supabaseLifecycleApi } from '../services/supabaseData';

interface Step {
  id: string;
  label: string;
  description: string;
  icon: typeof Building2;
  navTarget: string;
  navParam?: string;
  done: boolean;
  required?: boolean;
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
  const [hasSignature, setHasSignature] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (!user || typeof window === 'undefined') return true;
    return localStorage.getItem(guideKey(user.id)) === 'true';
  });

  useEffect(() => {
    if (!user) return;
    supabaseOwnerDataApi.getDashboardSnapshot('all')
      .then((snap) => {
        setTenantCount(snap.totalTenants);
        setPaymentCount(snap.recentPayments.length);
      })
      .catch(() => {});

    supabaseLifecycleApi.getActiveSignatureProfile()
      .then((sig: unknown) => setHasSignature(sig !== null))
      .catch(() => {});
  }, [user]);

  const steps: Step[] = [
    {
      id: 'legal-signature',
      label: 'Sign & set up your legal profile',
      description: 'Save your signature in Settings → Legal so agreements are auto-signed',
      icon: FileSignature,
      navTarget: 'settings',
      done: hasSignature,
      required: true,
    },
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
  const legalDone = steps.find((s) => s.id === 'legal-signature')?.done ?? false;

  // Keep the guide visible until all steps (especially legal) are complete.
  // Once all done, user can dismiss. They can also manually dismiss at any time
  // but the guide will reappear if legal is still incomplete on next load.
  const shouldShow = !dismissed || !legalDone;
  if (!shouldShow) return null;

  const handleDismiss = () => {
    if (user && typeof window !== 'undefined') {
      localStorage.setItem(guideKey(user.id), 'true');
    }
    setDismissed(true);
    onDismiss();
  };

  const handleStepClick = (step: Step) => {
    if (step.done) return;
    onNavigate(step.navTarget);
  };

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
        {/* Only show dismiss once legal is signed */}
        {legalDone && (
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            title="Dismiss checklist"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}
        {!legalDone && (
          <span className="text-xs text-indigo-200 bg-white/15 px-2.5 py-1 rounded-full">
            Sign required
          </span>
        )}
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
              onClick={() => handleStepClick(step)}
              disabled={step.done}
              className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${
                step.done
                  ? 'bg-gray-50 cursor-default'
                  : step.required && !step.done
                    ? 'hover:bg-amber-50 cursor-pointer border-l-2 border-amber-400'
                    : 'hover:bg-indigo-50 cursor-pointer'
              }`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                step.done
                  ? 'bg-green-100'
                  : step.required
                    ? 'bg-amber-100'
                    : 'bg-indigo-100'
              }`}>
                {step.done
                  ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                  : <Icon className={`w-4 h-4 ${step.required ? 'text-amber-600' : 'text-indigo-600'}`} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${step.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    {step.label}
                  </p>
                  {step.required && !step.done && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase tracking-wide">
                      Required
                    </span>
                  )}
                </div>
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
        ) : !legalDone ? (
          <p className="text-xs text-amber-600 font-medium">
            Complete the legal signature step to unlock dismiss — this protects your agreements.
          </p>
        ) : (
          <p className="text-xs text-gray-400">
            {steps.length - completedCount} step{steps.length - completedCount !== 1 ? 's' : ''} remaining — complete them to get the most out of RentCare.
          </p>
        )}
      </div>
    </div>
  );
}
