import { Building2, ShieldCheck, Home, Sparkles } from 'lucide-react';

interface PortalSelectorProps {
  onSelectPortal: (portal: 'main' | 'main-v1' | 'admin' | 'tenant') => void;
}

export function PortalSelector({ onSelectPortal }: PortalSelectorProps) {
  const portals = [
    {
      id: 'main' as const,
      title: 'Main Portal',
      subtitle: 'Owner & Manager Dashboard',
      description: 'Manage properties, tenants, payments, and operations',
      icon: Building2,
      gradient: 'from-indigo-500 to-purple-600',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
    },
    {
      id: 'admin' as const,
      title: 'Admin Portal',
      subtitle: 'Super Admin Dashboard',
      description: 'Platform management, subscriptions, and analytics',
      icon: ShieldCheck,
      gradient: 'from-purple-500 to-pink-600',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      id: 'tenant' as const,
      title: 'Tenant Portal',
      subtitle: 'For Residents',
      description: 'Track rent, make payments, request maintenance, and more',
      icon: Home,
      gradient: 'from-blue-500 to-cyan-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-block mb-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-lg" />
            </div>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-transparent bg-clip-text">
              RentCare
            </span>
          </h1>
          <p className="text-base md:text-lg text-gray-600">Select your portal to continue</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {portals.map((portal) => {
            const Icon = portal.icon;
            return (
              <div key={portal.id} className="space-y-3">
                <button
                  onClick={() => onSelectPortal(portal.id)}
                  className="w-full group bg-white rounded-2xl p-6 md:p-8 text-left transition-all hover:shadow-2xl hover:-translate-y-2 border border-gray-200 hover:border-transparent"
                >
                  <div className={`w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br ${portal.gradient} rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 transform group-hover:scale-110 transition-transform shadow-lg`}>
                    <Icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-1 md:mb-2">{portal.title}</h2>
                  <p className="text-xs md:text-sm font-semibold text-gray-500 mb-2 md:mb-3">{portal.subtitle}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{portal.description}</p>
                </button>

                {/* Version 1 button for Main Portal */}
                {portal.id === 'main' && (
                  <button
                    onClick={() => onSelectPortal('main-v1')}
                    className="w-full bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-xl p-3 md:p-4 text-left transition-all hover:shadow-lg border border-gray-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <Sparkles className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Version 1 (Classic)</p>
                        <p className="text-xs text-gray-600">Previous version</p>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 md:mt-12 text-center">
          <p className="text-xs md:text-sm text-gray-600">
            Need help? Contact support at{' '}
            <a href="mailto:support@rentcare.in" className="text-indigo-600 hover:underline font-medium">
              support@rentcare.in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
