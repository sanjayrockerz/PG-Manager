import { Menu, Bell } from 'lucide-react';

interface AdminHeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export function AdminHeader({ setSidebarOpen }: AdminHeaderProps) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-gray-600 hover:text-gray-900"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <span className="font-bold text-gray-900">RentCare Admin</span>
            <div className="hidden sm:flex items-center gap-2 px-2 py-1 bg-green-50 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-700">All systems operational</span>
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <button className="relative p-2 text-gray-600 hover:text-gray-900">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <div className="hidden md:flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">K</span>
            </div>
            <div className="hidden lg:block">
              <div className="text-sm font-medium text-gray-900">Khush Goyal</div>
              <div className="text-xs text-gray-500">Super Admin</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
