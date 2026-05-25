import { LayoutDashboard, Users, CreditCard, BarChart3, Settings } from 'lucide-react';

interface AdminMobileNavProps {
  activeScreen: string;
  setActiveScreen: (screen: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'owners', label: 'Owners', icon: Users },
  { id: 'subscriptions', label: 'Revenue', icon: CreditCard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function AdminMobileNav({ activeScreen, setActiveScreen }: AdminMobileNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`
                flex-1 flex flex-col items-center gap-1 py-3
                transition-colors
                ${isActive ? 'text-purple-600' : 'text-gray-500'}
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
