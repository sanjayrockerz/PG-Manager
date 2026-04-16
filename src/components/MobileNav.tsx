import { CreditCard, Home, Settings, Shield, UserCircle, Users, LifeBuoy, Package } from 'lucide-react';
import { useLocalization } from '../contexts/LocalizationContext';
import { isPlatformAdminRole, isScopedOwnerRole } from '../utils/roles';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: 'owner' | 'owner_manager' | 'staff' | 'admin' | 'tenant' | 'super_admin' | 'platform_admin';
}

const ownerNavItems = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'tenants', label: 'Tenants', icon: Users },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'support', label: 'Support', icon: LifeBuoy },
  { id: 'subscriptions', label: 'Plans', icon: Package },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const staffNavItems = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'tenants', label: 'Tenants', icon: Users },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'support', label: 'Support', icon: LifeBuoy },
  { id: 'tenant-portal', label: 'Portal', icon: UserCircle },
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
  const { t } = useLocalization();
  const isPlatformAdmin = isPlatformAdminRole(userRole);
  const isScopedStaff = isScopedOwnerRole(userRole);
  const navItems = userRole === 'tenant'
    ? tenantNavItems
    : isPlatformAdmin
      ? adminNavItems
      : isScopedStaff
        ? staffNavItems
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
              <span className="text-xs">{
                item.id === 'dashboard' ? t('mobile.home', item.label)
                  : item.id === 'tenants' ? t('mobile.tenants', item.label)
                    : item.id === 'properties' ? t('mobile.properties', item.label)
                      : item.id === 'payments' ? t('mobile.payments', item.label)
                        : item.id === 'support' ? t('mobile.support', item.label)
                          : item.id === 'subscriptions' ? t('mobile.subscriptions', item.label)
                            : item.id === 'settings' ? t('mobile.settings', item.label)
                              : item.id === 'admin-section' ? t('mobile.admin', item.label)
                                : item.id === 'tenant-portal' ? t(userRole === 'tenant' ? 'mobile.portal' : 'mobile.tenant', item.label)
                                  : item.label
              }</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}