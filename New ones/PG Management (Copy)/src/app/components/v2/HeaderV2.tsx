import { useState } from 'react';
import { Menu, Search, Bell, ChevronDown, Building2, MapPin, Layers, Home, Check } from 'lucide-react';

interface HeaderV2Props {
  setSidebarOpen: (open: boolean) => void;
  currentPage: string;
  onNotificationClick: () => void;
  selectedProperty: string;
  onPropertyChange: (property: string) => void;
}

const properties = [
  {
    id: 'all',
    name: 'All Properties',
    count: 2,
    city: 'Multiple',
    floors: '-',
    rooms: 7,
  },
  {
    id: '1',
    name: 'Sunshine Residency',
    count: 1,
    city: 'Indiranagar',
    floors: 3,
    rooms: 4,
  },
  {
    id: '2',
    name: 'Lakeview PG',
    count: 1,
    city: 'HSR Layout',
    floors: 2,
    rooms: 3,
  },
];

export function HeaderV2({
  setSidebarOpen,
  currentPage,
  onNotificationClick,
  selectedProperty,
  onPropertyChange,
}: HeaderV2Props) {
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const selectedProp = properties.find((p) => p.id === selectedProperty) || properties[0];
  const hasUnread = true; // Demo: show unread notification badge

  return (
    <header className="h-14 bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        {/* Left side */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden text-gray-600 hover:text-gray-900"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Property Selector */}
          <div className="relative">
            <button
              onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                bg-gradient-to-r from-purple-500 via-purple-600 to-blue-600
                hover:from-purple-600 hover:via-purple-700 hover:to-blue-700
                text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Building2 className="w-5 h-5 text-white flex-shrink-0" />
              <div className="text-left min-w-0">
                <div className="font-semibold text-sm text-white truncate">
                  {selectedProp.name}
                  {selectedProp.count > 1 && (
                    <span className="ml-1 text-xs opacity-90">({selectedProp.count})</span>
                  )}
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-white flex-shrink-0 transition-transform ${showPropertyDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Property Dropdown */}
            {showPropertyDropdown && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowPropertyDropdown(false)}
                />
                <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-40">
                  {properties.map((property, index) => {
                    const gradientColors = [
                      'from-purple-500 to-purple-600',
                      'from-blue-500 to-blue-600',
                      'from-green-500 to-green-600',
                    ];
                    const gradient = gradientColors[index % gradientColors.length];

                    return (
                      <button
                        key={property.id}
                        onClick={() => {
                          onPropertyChange(property.id);
                          setShowPropertyDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left transition-all duration-200 ${
                          selectedProperty === property.id
                            ? 'bg-gradient-to-r ' + gradient + ' text-white'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`p-2 rounded-lg ${
                              selectedProperty === property.id
                                ? 'bg-white/20'
                                : 'bg-gradient-to-r ' + gradient
                            }`}>
                              <Building2 className={`w-4 h-4 ${
                                selectedProperty === property.id ? 'text-white' : 'text-white'
                              } flex-shrink-0`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`font-semibold text-sm truncate ${
                                selectedProperty === property.id ? 'text-white' : 'text-gray-900'
                              }`}>
                                {property.name}
                                {property.count > 1 && (
                                  <span className={`ml-1 text-xs ${
                                    selectedProperty === property.id ? 'opacity-90' : 'text-gray-500'
                                  }`}>({property.count})</span>
                                )}
                              </div>
                              <div className={`flex items-center gap-3 mt-1 text-xs ${
                                selectedProperty === property.id ? 'text-white/90' : 'text-gray-500'
                              }`}>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {property.city}
                                </span>
                                {property.floors !== '-' && (
                                  <>
                                    <span className="flex items-center gap-1">
                                      <Layers className="w-3 h-3" />
                                      {property.floors} floors
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Home className="w-3 h-3" />
                                      {property.rooms} rooms
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {selectedProperty === property.id && (
                            <Check className="w-5 h-5 text-white flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Property info chips - Desktop only */}
            {selectedProperty !== 'all' && (
              <div className="hidden lg:flex items-center gap-2 mt-1 ml-8">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="w-3 h-3" />
                  <span>{selectedProp.city}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Layers className="w-3 h-3" />
                  <span>{selectedProp.floors} floors</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Home className="w-3 h-3" />
                  <span>{selectedProp.rooms} rooms</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center - Search (Desktop) */}
        <div className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tenants, rooms, payments..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <button
            onClick={onNotificationClick}
            className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>

          <div className="hidden md:flex items-center gap-3 pl-3 border-l border-gray-200">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">Khush Goyal</div>
              <div className="text-xs text-gray-500">
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">owner</span>
              </div>
            </div>
            <div className="w-8 h-8 bg-[#4F46E5] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-semibold">KG</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
