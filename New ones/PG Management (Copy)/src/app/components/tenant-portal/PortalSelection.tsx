import { Building2, ShieldCheck, User } from 'lucide-react';

interface PortalSelectionProps {
  onSelectPortal: (portal: 'main' | 'admin' | 'tenant') => void;
}

export function PortalSelection({ onSelectPortal }: PortalSelectionProps) {
  const portals = [
    {
      id: 'main' as const,
      title: 'Main Portal',
      subtitle: 'Owner & Manager Dashboard',
      description: 'Manage properties, tenants, payments, and operations',
      icon: Building2,
      color: 'bg-indigo-500',
      hoverColor: 'hover:border-indigo-500',
    },
    {
      id: 'admin' as const,
      title: 'Admin Portal',
      subtitle: 'Super Admin Dashboard',
      description: 'Platform management, subscriptions, and analytics',
      icon: ShieldCheck,
      color: 'bg-purple-500',
      hoverColor: 'hover:border-purple-500',
    },
    {
      id: 'tenant' as const,
      title: 'Tenant Portal',
      subtitle: 'Resident Dashboard',
      description: 'View rent, make payments, request maintenance, and more',
      icon: User,
      color: 'bg-blue-500',
      hoverColor: 'hover:border-blue-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">RentCare</h1>
          <p className="text-lg text-gray-600">Select your portal to continue</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {portals.map((portal) => {
            const Icon = portal.icon;
            return (
              <button
                key={portal.id}
                onClick={() => onSelectPortal(portal.id)}
                className={`bg-white border border-gray-200 rounded-xl p-8 text-left transition-all hover:shadow-lg hover:-translate-y-1 ${portal.hoverColor}`}
              >
                <div className={`w-16 h-16 ${portal.color} rounded-lg flex items-center justify-center mb-6`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">{portal.title}</h2>
                <p className="text-sm font-medium text-gray-500 mb-3">{portal.subtitle}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{portal.description}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact support at{' '}
            <a href="mailto:support@rentcare.in" className="text-indigo-600 hover:underline">
              support@rentcare.in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
