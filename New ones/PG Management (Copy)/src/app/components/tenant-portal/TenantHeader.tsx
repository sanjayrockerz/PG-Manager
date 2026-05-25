import { Menu, Bell } from 'lucide-react';

interface TenantHeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export function TenantHeader({ setSidebarOpen }: TenantHeaderProps) {
  return (
    <header className="sticky top-0 z-40 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        <div className="bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
          <span className="text-sm font-medium text-gray-700">Green Valley PG</span>
          <span className="text-gray-400">·</span>
          <span className="text-sm text-gray-600">Room 205</span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <button className="p-2 hover:bg-gray-100 rounded-lg relative">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
            PS
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">Priya Sharma</p>
            <p className="text-xs text-gray-500">Tenant</p>
          </div>
        </div>
      </div>
    </header>
  );
}
