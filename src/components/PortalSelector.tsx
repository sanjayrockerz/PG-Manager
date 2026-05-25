import { Home, LayoutGrid, Settings, Shield } from 'lucide-react';

export type PortalType = 'owner' | 'admin' | 'tenant';

interface PortalSelectorProps {
  onSelect: (portal: PortalType) => void;
}

const portals = [
  {
    type: 'owner' as PortalType,
    title: 'Main Portal',
    subtitle: 'Owner & Manager Dashboard',
    description: 'Manage properties, tenants, payments, and operations',
    icon: LayoutGrid,
    iconBg: 'bg-gradient-to-br from-[#7C3AED] to-[#4F46E5]',
  },
  {
    type: 'admin' as PortalType,
    title: 'Admin Portal',
    subtitle: 'Super Admin Dashboard',
    description: 'Platform management, subscriptions, and analytics',
    icon: Shield,
    iconBg: 'bg-gradient-to-br from-[#EC4899] to-[#BE185D]',
  },
  {
    type: 'tenant' as PortalType,
    title: 'Tenant Portal',
    subtitle: 'For Residents',
    description: 'Track rent, make payments, request maintenance, and more',
    icon: Home,
    iconBg: 'bg-gradient-to-br from-[#0EA5E9] to-[#0D9488]',
  },
];

export function PortalSelector({ onSelect }: PortalSelectorProps) {
  return (
    <div className="min-h-screen bg-[#F0EFFF] flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] flex items-center justify-center shadow-sm">
          <LayoutGrid className="w-5 h-5 text-white" />
        </div>
        <span className="text-2xl font-bold text-[#7C3AED] tracking-tight">RentCare</span>
      </div>

      <p className="text-sm text-gray-500 mb-10">Select your portal to continue</p>

      {/* Portal cards */}
      <div className="flex flex-col md:flex-row gap-4 w-full max-w-3xl">
        {portals.map((portal) => {
          const Icon = portal.icon;
          return (
            <button
              key={portal.type}
              onClick={() => onSelect(portal.type)}
              className="flex-1 bg-white rounded-2xl border border-gray-200 p-6 text-left hover:shadow-lg hover:border-[#7C3AED]/40 hover:-translate-y-0.5 transition-all duration-200 group"
            >
              <div className={`w-12 h-12 rounded-xl ${portal.iconBg} flex items-center justify-center mb-4 shadow-sm`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-base font-semibold text-gray-900 mb-0.5">{portal.title}</p>
              <p className="text-xs font-medium text-[#7C3AED] mb-2">{portal.subtitle}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{portal.description}</p>
            </button>
          );
        })}
      </div>

      {/* Classic version */}
      <button className="mt-4 w-full max-w-3xl bg-white/60 border border-gray-200 rounded-2xl px-6 py-4 flex items-center gap-3 hover:bg-white transition-colors">
        <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Settings className="w-4 h-4 text-gray-500" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-gray-700">Version 1 (Classic)</p>
          <p className="text-xs text-gray-400">Legacy interface — same data, older layout</p>
        </div>
      </button>

      {/* Footer */}
      <p className="mt-8 text-xs text-gray-400">
        Need help? Contact support at{' '}
        <span className="text-[#7C3AED] font-medium">support@rentcare.in</span>
      </p>
    </div>
  );
}
