import { Home, CreditCard, Wrench, Bell, User } from 'lucide-react';

interface RentCareMobileNavProps {
  activeScreen: string;
  setActiveScreen: (screen: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'announcements', label: 'News', icon: Bell },
  { id: 'profile', label: 'Profile', icon: User },
];

export function RentCareMobileNav({ activeScreen, setActiveScreen }: RentCareMobileNavProps) {
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
