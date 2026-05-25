import { Menu, Bell, Building2 } from 'lucide-react';

interface RentCareHeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

export function RentCareHeader({ setSidebarOpen }: RentCareHeaderProps) {
  return (
    <header className="sticky top-0 z-40 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
          <Building2 className="w-4 h-4 text-[#4F46E5]" />
          <span className="text-sm font-medium text-gray-700 hidden sm:inline">Green Valley PG</span>
          <span className="text-gray-400 hidden sm:inline">·</span>
          <span className="text-sm text-gray-600">Room 205</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <button className="relative p-2 hover:bg-gray-100 rounded-lg">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
            PS
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">Priya Sharma</p>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              tenant
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
