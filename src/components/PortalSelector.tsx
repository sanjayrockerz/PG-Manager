import { useState } from 'react';
import { Home, LayoutGrid, Shield, Zap, Building2, User, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export type PortalType = 'owner' | 'admin' | 'tenant';

interface PortalSelectorProps {
  onSelect: (portal: PortalType) => void;
}

type DemoPersona = 'owner' | 'tenant' | 'admin';

const portals = [
  {
    type: 'owner' as PortalType,
    title: 'Main Portal',
    subtitle: 'Owner & Manager Dashboard',
    description: 'Manage properties, tenants, payments, and operations',
    icon: LayoutGrid,
    iconBg: 'bg-[#7C3AED]',
    border: 'hover:border-[#7C3AED]/50',
  },
  {
    type: 'admin' as PortalType,
    title: 'Admin Portal',
    subtitle: 'Platform Management',
    description: 'Platform analytics, subscriptions, and owner management',
    icon: Shield,
    iconBg: 'bg-[#DB2777]',
    border: 'hover:border-[#DB2777]/50',
  },
  {
    type: 'tenant' as PortalType,
    title: 'Tenant Portal',
    subtitle: 'For Residents',
    description: 'Track rent, raise maintenance, and access announcements',
    icon: Home,
    iconBg: 'bg-[#0284C7]',
    border: 'hover:border-[#0284C7]/50',
  },
];

const demoPersonas: Array<{
  persona: DemoPersona;
  label: string;
  role: string;
  desc: string;
  icon: typeof Building2;
  bg: string;
}> = [
  {
    persona: 'owner',
    label: 'Demo Owner',
    role: 'PG Owner — Jaipur',
    desc: 'Manage 3 properties, 14 tenants, track payments',
    icon: Building2,
    bg: 'bg-amber-50 border-amber-200 hover:border-amber-400',
  },
  {
    persona: 'tenant',
    label: 'Demo Tenant',
    role: 'Resident at Shree Niwas PG',
    desc: 'View rent, raise maintenance tickets, see notices',
    icon: User,
    bg: 'bg-sky-50 border-sky-200 hover:border-sky-400',
  },
  {
    persona: 'admin',
    label: 'Demo Admin',
    role: 'Platform Administrator',
    desc: 'View platform stats, manage owners and subscriptions',
    icon: Shield,
    bg: 'bg-pink-50 border-pink-200 hover:border-pink-400',
  },
];

export function PortalSelector({ onSelect }: PortalSelectorProps) {
  const { signInAsDemo } = useAuth();
  const [showDemoPicker, setShowDemoPicker] = useState(false);

  const handleDemoSelect = (persona: DemoPersona) => {
    signInAsDemo(persona);
  };

  return (
    <div className="min-h-screen bg-[#F0EFFF] flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl bg-[#7C3AED] flex items-center justify-center shadow-sm">
          <LayoutGrid className="w-5 h-5 text-white" />
        </div>
        <span className="text-2xl font-bold text-[#7C3AED] tracking-tight">RentCare</span>
      </div>

      <p className="text-sm text-gray-500 mb-10">Select your portal to continue</p>

      {/* Live portals */}
      <div className="flex flex-col md:flex-row gap-4 w-full max-w-3xl mb-6">
        {portals.map((portal) => {
          const Icon = portal.icon;
          return (
            <button
              key={portal.type}
              onClick={() => onSelect(portal.type)}
              className={`flex-1 bg-white rounded-2xl border border-gray-200 p-6 text-left hover:shadow-md ${portal.border} transition-all duration-150 group`}
            >
              <div className={`w-10 h-10 rounded-xl ${portal.iconBg} flex items-center justify-center mb-4`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-0.5">{portal.title}</p>
              <p className="text-xs font-medium text-[#7C3AED] mb-2">{portal.subtitle}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{portal.description}</p>
            </button>
          );
        })}
      </div>

      {/* Demo separator */}
      <div className="w-full max-w-3xl">
        <div className="relative flex items-center mb-4">
          <div className="flex-1 border-t border-gray-200" />
          <span className="px-3 text-xs text-gray-400 bg-[#F0EFFF]">or</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {!showDemoPicker ? (
          <button
            onClick={() => setShowDemoPicker(true)}
            className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-400 transition-all text-sm font-semibold"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Try Demo — explore without an account
            </div>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="bg-white rounded-2xl border border-amber-200 p-5">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-amber-600" />
              <p className="text-sm font-semibold text-gray-900">Demo Mode</p>
              <span className="ml-auto text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">No login required</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">Sample data from a Jaipur PG network. Nothing is saved to any database.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {demoPersonas.map(({ persona, label, role, desc, icon: Icon, bg }) => (
                <button
                  key={persona}
                  onClick={() => handleDemoSelect(persona)}
                  className={`text-left p-4 rounded-xl border-2 ${bg} transition-all`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-semibold text-gray-900">{label}</span>
                  </div>
                  <p className="text-xs font-medium text-gray-600 mb-1">{role}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowDemoPicker(false)}
              className="mt-3 text-xs text-gray-400 hover:text-gray-600 w-full text-center"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      <p className="mt-8 text-xs text-gray-400">
        Need help?{' '}
        <span className="text-[#7C3AED] font-medium">support@rentcare.in</span>
      </p>
    </div>
  );
}
