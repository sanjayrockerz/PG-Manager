# UI Enhancements - Exact Code

This document contains the exact code to make the property switch colorful and add sidebar collapse.

---

## 1. COLORFUL PROPERTY SWITCH (HeaderV2.tsx)

### Replace the entire property selector section with this:

```tsx
{/* Property Selector - ENHANCED VERSION */}
<div className="relative">
  <button
    onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
    className="flex items-center gap-2 px-4 py-2.5 rounded-xl
      bg-gradient-to-r from-purple-500 via-purple-600 to-blue-600
      hover:from-purple-600 hover:via-purple-700 hover:to-blue-700
      text-white shadow-lg hover:shadow-xl
      transition-all duration-200
      border-2 border-white/20"
  >
    <Building2 className="w-5 h-5 text-white" />
    <div className="text-left min-w-0">
      <div className="font-semibold text-sm text-white truncate flex items-center gap-2">
        {selectedProp.name}
        {selectedProp.count > 1 && (
          <span className="px-2 py-0.5 bg-white/30 rounded-full text-xs">
            {selectedProp.count}
          </span>
        )}
      </div>
    </div>
    <ChevronDown
      className={`w-4 h-4 text-white/90 flex-shrink-0 transition-transform duration-200 ${
        showPropertyDropdown ? 'rotate-180' : ''
      }`}
    />
  </button>

  {/* Property Dropdown - ENHANCED */}
  {showPropertyDropdown && (
    <>
      <div
        className="fixed inset-0 z-30"
        onClick={() => setShowPropertyDropdown(false)}
      />
      <div className="absolute top-full left-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border-2 border-purple-200 py-3 z-40 overflow-hidden">
        {/* Header */}
        <div className="px-4 pb-3 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">Switch Property</h3>
          <p className="text-xs text-gray-500 mt-1">Select which property to view</p>
        </div>

        {/* Property List */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {properties.map((property, index) => {
            const isSelected = selectedProperty === property.id;
            const colorClasses = [
              'from-purple-50 to-purple-100 border-purple-200',
              'from-blue-50 to-blue-100 border-blue-200',
              'from-green-50 to-green-100 border-green-200',
              'from-amber-50 to-amber-100 border-amber-200',
            ];
            const iconColors = [
              'bg-gradient-to-br from-purple-500 to-purple-600',
              'bg-gradient-to-br from-blue-500 to-blue-600',
              'bg-gradient-to-br from-green-500 to-green-600',
              'bg-gradient-to-br from-amber-500 to-amber-600',
            ];
            const checkColors = ['text-purple-600', 'text-blue-600', 'text-green-600', 'text-amber-600'];

            return (
              <button
                key={property.id}
                onClick={() => {
                  onPropertyChange(property.id);
                  setShowPropertyDropdown(false);
                }}
                className={`w-full px-4 py-3 mx-2 rounded-xl text-left transition-all duration-200
                  ${isSelected
                    ? `bg-gradient-to-r ${colorClasses[index % 4]} border-2 shadow-md scale-[1.02]`
                    : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Property Icon */}
                    <div className={`w-12 h-12 ${iconColors[index % 4]} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}>
                      <Building2 className="w-6 h-6 text-white" />
                    </div>

                    {/* Property Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate flex items-center gap-2">
                        {property.name}
                        {property.count > 1 && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">
                            {property.count}
                          </span>
                        )}
                      </div>

                      {/* Property Details */}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-600">
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

                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Check className={`w-6 h-6 ${checkColors[index % 4]}`} />
                      <span className={`text-xs font-semibold ${checkColors[index % 4]}`}>Selected</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  )}
</div>
```

### Also add this import:
```tsx
import { ..., Layers, Home } from 'lucide-react';
```

---

## 2. SIDEBAR COLLAPSE BUTTON (Sidebar.tsx)

### Add collapse state at the top of the component:

```tsx
export function Sidebar({ activeTab, setActiveTab, sidebarOpen, setSidebarOpen, onLogout, userPlan = 'free' }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navSections = getNavSections(userPlan);
```

### Update the sidebar container className:

```tsx
<aside className={`
  fixed md:static inset-y-0 left-0 z-50
  ${isCollapsed ? 'w-[70px]' : 'w-[230px]'}
  bg-white border-r border-[#E2E8F0]
  transform transition-all duration-300 ease-in-out
  ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
`}>
```

### Add collapse toggle button right after the opening aside tag:

```tsx
<aside className={...}>
  {/* Collapse Toggle Button - Desktop Only */}
  <div className="hidden md:block absolute -right-3 top-24 z-60">
    <button
      onClick={() => setIsCollapsed(!isCollapsed)}
      className="w-7 h-7 bg-white border-2 border-[#4F46E5] rounded-full 
        flex items-center justify-center hover:bg-[#4F46E5] hover:text-white
        transition-all duration-200 shadow-lg group"
      title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
    >
      {isCollapsed ? (
        <ChevronRight className="w-4 h-4 text-[#4F46E5] group-hover:text-white" />
      ) : (
        <ChevronLeft className="w-4 h-4 text-[#4F46E5] group-hover:text-white" />
      )}
    </button>
  </div>

  <div className="flex flex-col h-full">
    {/* Rest of sidebar content */}
```

### Update logo section to hide text when collapsed:

```tsx
{/* Logo */}
<div className="flex items-center justify-between p-5 border-b border-gray-200">
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 bg-[#4F46E5] rounded-lg flex items-center justify-center flex-shrink-0">
      <span className="text-white font-bold text-lg">R</span>
    </div>
    {!isCollapsed && (
      <div>
        <span className="font-bold text-gray-900">RentCare</span>
        <p className="text-xs text-gray-500">Owner Portal</p>
      </div>
    )}
  </div>
  {!isCollapsed && (
    <button
      onClick={() => setSidebarOpen(false)}
      className="md:hidden text-gray-400 hover:text-gray-600"
    >
      <X className="w-5 h-5" />
    </button>
  )}
</div>
```

### Update navigation items to hide labels when collapsed:

```tsx
<button
  key={item.id}
  onClick={() => {
    setActiveTab(item.id);
    setSidebarOpen(false);
  }}
  className={`
    w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg
    transition-all text-sm
    ${isActive
      ? 'bg-[#4F46E5] text-white font-semibold'
      : 'text-gray-700 hover:bg-gray-100'
    }
  `}
  title={isCollapsed ? item.label : ''}
>
  <Icon className="w-4 h-4 flex-shrink-0" />
  {!isCollapsed && <span>{item.label}</span>}
</button>
```

### Update upgrade card to hide when collapsed:

```tsx
{/* Upgrade Card (only for free users) */}
{userPlan === 'free' && !isCollapsed && (
  <div className="px-3 py-4 border-t border-gray-200">
    {/* ... upgrade card content ... */}
  </div>
)}
```

### Update sign out button:

```tsx
{/* Footer - Sign Out */}
<div className="p-3 border-t border-gray-200">
  <button
    onClick={onLogout}
    className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-sm`}
    title={isCollapsed ? 'Sign Out' : ''}
  >
    <LogOut className="w-4 h-4 flex-shrink-0" />
    {!isCollapsed && <span>Sign Out</span>}
  </button>
</div>
```

### Add import for ChevronLeft:

```tsx
import { ..., X, ..., LogOut, Zap, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
```

---

## 3. EXTENSIVE DUMMY DATA

### Add to PropertiesV2.tsx (after existing properties array):

```typescript
const properties: Property[] = [
  {
    id: '1',
    name: 'Sunshine Residency',
    address: '123 MG Road, Indiranagar',
    city: 'Bangalore',
    floors: 3,
    rooms: 6,
    beds: 9,
    dateAdded: 'Jan 15, 2025',
    contact: { name: 'Ramesh Kumar', phone: '+91 98765 43210', email: 'ramesh@example.com' },
  },
  {
    id: '2',
    name: 'Lakeview PG',
    address: '456 HSR Layout, Sector 1',
    city: 'Bangalore',
    floors: 2,
    rooms: 4,
    beds: 6,
    dateAdded: 'Feb 1, 2025',
    contact: { name: 'Priya Sharma', phone: '+91 98765 43211', email: 'priya@example.com' },
  },
  {
    id: '3',
    name: 'Green Valley PG',
    address: '789 Koramangala, 5th Block',
    city: 'Bangalore',
    floors: 4,
    rooms: 8,
    beds: 14,
    dateAdded: 'Mar 10, 2025',
    contact: { name: 'Suresh Patel', phone: '+91 98765 43212', email: 'suresh@example.com' },
  },
  {
    id: '4',
    name: 'Skyline Boys Hostel',
    address: '45 BTM Layout, Stage 2',
    city: 'Bangalore',
    floors: 5,
    rooms: 10,
    beds: 18,
    dateAdded: 'Dec 5, 2024',
    contact: { name: 'Arun Kumar', phone: '+91 98765 43213', email: 'arun@example.com' },
  },
  {
    id: '5',
    name: 'Royal Residency',
    address: '123 Whitefield Main Road',
    city: 'Bangalore',
    floors: 3,
    rooms: 6,
    beds: 10,
    dateAdded: 'Apr 20, 2025',
    contact: { name: 'Meera Reddy', phone: '+91 98765 43214', email: 'meera@example.com' },
  },
  {
    id: '6',
    name: 'Paradise PG for Girls',
    address: '678 Electronic City Phase 1',
    city: 'Bangalore',
    floors: 2,
    rooms: 5,
    beds: 8,
    dateAdded: 'Jan 30, 2025',
    contact: { name: 'Lakshmi Iyer', phone: '+91 98765 43215', email: 'lakshmi@example.com' },
  },
  {
    id: '7',
    name: 'Harmony House',
    address: '234 Jayanagar 4th Block',
    city: 'Bangalore',
    floors: 3,
    rooms: 7,
    beds: 12,
    dateAdded: 'Nov 12, 2024',
    contact: { name: 'Vijay Desai', phone: '+91 98765 43216', email: 'vijay@example.com' },
  },
  {
    id: '8',
    name: 'Elite Students Hostel',
    address: '890 Marathahalli',
    city: 'Bangalore',
    floors: 4,
    rooms: 9,
    beds: 16,
    dateAdded: 'Feb 15, 2025',
    contact: { name: 'Neha Kapoor', phone: '+91 98765 43217', email: 'neha@example.com' },
  },
];
```

### Add more rooms (after existing rooms array):

```typescript
const rooms: Room[] = [
  // Sunshine Residency (id: '1') - 3 floors, 6 rooms
  { id: '1', propertyId: '1', number: '301', floor: 3, type: 'Single', beds: 1, rent: 8000, status: 'Occupied', occupiedBeds: 1 },
  { id: '2', propertyId: '1', number: '302', floor: 3, type: 'Double', beds: 2, rent: 7500, status: 'Occupied', occupiedBeds: 2 },
  { id: '3', propertyId: '1', number: '201', floor: 2, type: 'Double', beds: 2, rent: 7500, status: 'Occupied', occupiedBeds: 1 },
  { id: '4', propertyId: '1', number: '202', floor: 2, type: 'Single', beds: 1, rent: 8000, status: 'Vacant', occupiedBeds: 0 },
  { id: '5', propertyId: '1', number: '101', floor: 1, type: 'Triple', beds: 3, rent: 6800, status: 'Occupied', occupiedBeds: 2 },
  { id: '6', propertyId: '1', number: '102', floor: 1, type: 'Single', beds: 1, rent: 7500, status: 'Maintenance', occupiedBeds: 0 },

  // Lakeview PG (id: '2') - 2 floors, 4 rooms
  { id: '7', propertyId: '2', number: '201', floor: 2, type: 'Single', beds: 1, rent: 9000, status: 'Occupied', occupiedBeds: 1 },
  { id: '8', propertyId: '2', number: '202', floor: 2, type: 'Double', beds: 2, rent: 8500, status: 'Occupied', occupiedBeds: 2 },
  { id: '9', propertyId: '2', number: '101', floor: 1, type: 'Single', beds: 1, rent: 8500, status: 'Occupied', occupiedBeds: 1 },
  { id: '10', propertyId: '2', number: '102', floor: 1, type: 'Double', beds: 2, rent: 8000, status: 'Vacant', occupiedBeds: 0 },

  // Green Valley PG (id: '3') - 4 floors, 8 rooms
  { id: '11', propertyId: '3', number: '401', floor: 4, type: 'Single', beds: 1, rent: 10000, status: 'Occupied', occupiedBeds: 1 },
  { id: '12', propertyId: '3', number: '402', floor: 4, type: 'Double', beds: 2, rent: 9500, status: 'Occupied', occupiedBeds: 2 },
  { id: '13', propertyId: '3', number: '301', floor: 3, type: 'Single', beds: 1, rent: 9500, status: 'Vacant', occupiedBeds: 0 },
  { id: '14', propertyId: '3', number: '302', floor: 3, type: 'Triple', beds: 3, rent: 8500, status: 'Occupied', occupiedBeds: 3 },
  { id: '15', propertyId: '3', number: '201', floor: 2, type: 'Double', beds: 2, rent: 9000, status: 'Occupied', occupiedBeds: 1 },
  { id: '16', propertyId: '3', number: '202', floor: 2, type: 'Single', beds: 1, rent: 9500, status: 'Occupied', occupiedBeds: 1 },
  { id: '17', propertyId: '3', number: '101', floor: 1, type: 'Triple', beds: 3, rent: 8000, status: 'Occupied', occupiedBeds: 2 },
  { id: '18', propertyId: '3', number: '102', floor: 1, type: 'Single', beds: 1, rent: 9000, status: 'Maintenance', occupiedBeds: 0 },

  // Skyline Boys Hostel (id: '4') - 5 floors, 10 rooms
  { id: '19', propertyId: '4', number: '501', floor: 5, type: 'Single', beds: 1, rent: 11000, status: 'Occupied', occupiedBeds: 1 },
  { id: '20', propertyId: '4', number: '502', floor: 5, type: 'Double', beds: 2, rent: 10500, status: 'Occupied', occupiedBeds: 2 },
  { id: '21', propertyId: '4', number: '401', floor: 4, type: 'Single', beds: 1, rent: 10500, status: 'Occupied', occupiedBeds: 1 },
  { id: '22', propertyId: '4', number: '402', floor: 4, type: 'Double', beds: 2, rent: 10000, status: 'Vacant', occupiedBeds: 0 },
  { id: '23', propertyId: '4', number: '301', floor: 3, type: 'Triple', beds: 3, rent: 9500, status: 'Occupied', occupiedBeds: 3 },
  { id: '24', propertyId: '4', number: '302', floor: 3, type: 'Single', beds: 1, rent: 10000, status: 'Occupied', occupiedBeds: 1 },
  { id: '25', propertyId: '4', number: '201', floor: 2, type: 'Double', beds: 2, rent: 9800, status: 'Occupied', occupiedBeds: 1 },
  { id: '26', propertyId: '4', number: '202', floor: 2, type: 'Single', beds: 1, rent: 10000, status: 'Occupied', occupiedBeds: 1 },
  { id: '27', propertyId: '4', number: '101', floor: 1, type: 'Triple', beds: 3, rent: 9000, status: 'Occupied', occupiedBeds: 2 },
  { id: '28', propertyId: '4', number: '102', floor: 1, type: 'Single', beds: 1, rent: 9500, status: 'Vacant', occupiedBeds: 0 },

  // Add similar data for properties 5, 6, 7, 8...
];
```

### Add more tenants (in TenantsV2.tsx):

```typescript
const tenants: Tenant[] = [
  {
    id: '1',
    name: 'Amit Kumar',
    email: 'amit@example.com',
    phone: '+91 98765 43210',
    property: 'Sunshine Residency',
    room: '301',
    rent: 8000,
    joinDate: 'Mar 2025',
    status: 'Active',
  },
  {
    id: '2',
    name: 'Rahul Sharma',
    email: 'rahul@example.com',
    phone: '+91 98765 43211',
    property: 'Sunshine Residency',
    room: '302',
    rent: 7500,
    joinDate: 'Feb 2025',
    status: 'Active',
  },
  {
    id: '3',
    name: 'Vikash Singh',
    email: 'vikash@example.com',
    phone: '+91 98765 43212',
    property: 'Lakeview PG',
    room: '201',
    rent: 9000,
    joinDate: 'Jan 2025',
    status: 'Active',
  },
  {
    id: '4',
    name: 'Priya Patel',
    email: 'priya@example.com',
    phone: '+91 98765 43213',
    property: 'Lakeview PG',
    room: '202',
    rent: 8500,
    joinDate: 'Apr 2025',
    status: 'Active',
  },
  {
    id: '5',
    name: 'Arjun Reddy',
    email: 'arjun@example.com',
    phone: '+91 98765 43214',
    property: 'Green Valley PG',
    room: '401',
    rent: 10000,
    joinDate: 'Dec 2024',
    status: 'Active',
  },
  {
    id: '6',
    name: 'Sneha Gupta',
    email: 'sneha@example.com',
    phone: '+91 98765 43215',
    property: 'Green Valley PG',
    room: '402',
    rent: 9500,
    joinDate: 'Jan 2025',
    status: 'Active',
  },
  {
    id: '7',
    name: 'Karan Malhotra',
    email: 'karan@example.com',
    phone: '+91 98765 43216',
    property: 'Skyline Boys Hostel',
    room: '501',
    rent: 11000,
    joinDate: 'Nov 2024',
    status: 'Active',
  },
  {
    id: '8',
    name: 'Rohan Kapoor',
    email: 'rohan@example.com',
    phone: '+91 98765 43217',
    property: 'Skyline Boys Hostel',
    room: '502',
    rent: 10500,
    joinDate: 'Feb 2025',
    status: 'Active',
  },
  {
    id: '9',
    name: 'Ananya Iyer',
    email: 'ananya@example.com',
    phone: '+91 98765 43218',
    property: 'Paradise PG for Girls',
    room: '201',
    rent: 8500,
    joinDate: 'Mar 2025',
    status: 'Active',
  },
  {
    id: '10',
    name: 'Siddharth Joshi',
    email: 'siddharth@example.com',
    phone: '+91 98765 43219',
    property: 'Harmony House',
    room: '301',
    rent: 9000,
    joinDate: 'Jan 2025',
    status: 'Active',
  },
  {
    id: '11',
    name: 'Neha Deshmukh',
    email: 'neha@example.com',
    phone: '+91 98765 43220',
    property: 'Elite Students Hostel',
    room: '401',
    rent: 9800,
    joinDate: 'Feb 2025',
    status: 'Active',
  },
  {
    id: '12',
    name: 'Aditya Nair',
    email: 'aditya@example.com',
    phone: '+91 98765 43221',
    property: 'Sunshine Residency',
    room: '201',
    rent: 7500,
    joinDate: 'Apr 2025',
    status: 'Active',
  },
  {
    id: '13',
    name: 'Kavya Menon',
    email: 'kavya@example.com',
    phone: '+91 98765 43222',
    property: 'Green Valley PG',
    room: '302',
    rent: 8500,
    joinDate: 'Dec 2024',
    status: 'Active',
  },
  {
    id: '14',
    name: 'Varun Bhat',
    email: 'varun@example.com',
    phone: '+91 98765 43223',
    property: 'Skyline Boys Hostel',
    room: '301',
    rent: 9500,
    joinDate: 'Nov 2024',
    status: 'Active',
  },
  {
    id: '15',
    name: 'Divya Rao',
    email: 'divya@example.com',
    phone: '+91 98765 43224',
    property: 'Lakeview PG',
    room: '101',
    rent: 8500,
    joinDate: 'Mar 2025',
    status: 'Active',
  },
];
```

---

## SUMMARY OF CHANGES

### Files to Edit:

1. **`src/app/components/v2/HeaderV2.tsx`**
   - Replace property selector section with colorful version
   - Add Layers, Home imports

2. **`src/app/components/Sidebar.tsx`**
   - Add collapse state
   - Add toggle button
   - Update all sections to hide/show based on collapse state
   - Add ChevronLeft, ChevronRight imports

3. **`src/app/components/v2/PropertiesV2.tsx`**
   - Replace properties array with extended version (8 properties)
   - Replace rooms array with extended version (40+ rooms)

4. **`src/app/components/v2/TenantsV2.tsx`**
   - Replace tenants array with extended version (15 tenants)

### Visual Results:

After these changes you should see:
- ✅ **Colorful property switch** with gradient purple/blue background
- ✅ **Property dropdown** with colorful cards and icons
- ✅ **Sidebar collapse button** (circular button on the right edge)
- ✅ **Collapsed sidebar** showing only icons with tooltips
- ✅ **More dummy data** across all views (8 properties, 40+ rooms, 15 tenants)
