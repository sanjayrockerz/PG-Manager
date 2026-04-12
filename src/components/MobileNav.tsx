import { CreditCard, Home, Settings, Shield, UserCircle, Users, Building2 } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: 'owner' | 'admin' | 'tenant' | 'super_admin';
}

const ownerNavItems = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'tenants', label: 'Tenants', icon: Users },
  { id: 'properties', label: 'Properties', icon: Building2 },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const adminNavItems = [
  { id: 'admin-section', label: 'Admin', icon: Shield },
  { id: 'tenant-portal', label: 'Tenant', icon: UserCircle },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const tenantNavItems = [
  { id: 'tenant-portal', label: 'Portal', icon: Home },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function MobileNav({ activeTab, setActiveTab, userRole = 'owner' }: MobileNavProps) {
  const navItems = userRole === 'tenant'
    ? tenantNavItems
    : userRole === 'admin' || userRole === 'super_admin'
      ? adminNavItems
      : ownerNavItems;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`
                flex-1 flex flex-col items-center gap-1 py-3
                transition-colors
                ${isActive ? 'text-blue-600' : 'text-gray-500'}
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}