import { useState, useMemo } from 'react';
import { Search, Plus, Phone, Mail, MoreVertical, Edit, Trash2, Eye, Upload, X } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useProperty } from '../contexts/PropertyContext';
import { mockTenants as allTenants, filterByProperty } from '../utils/mockData';

interface TenantsProps {
  onViewTenant?: (tenantId: string) => void;
}

export function Tenants({ onViewTenant }: TenantsProps) {
  const { selectedProperty, properties } = useProperty();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    phone: '',
    email: '',
    photo: null as File | null,
    // Room Assignment
    propertyId: '',
    floor: 1,
    room: '',
    bed: '',
    // Rent Details
    monthlyRent: 0,
    securityDeposit: 0,
    rentDueDate: 5,
    // Emergency Contact
    parentName: '',
    parentPhone: '',
    // Verification
    idType: 'Aadhaar Card',
    idNumber: '',
    idDocument: null as File | null,
    // Stay Details
    joinDate: '',
    status: 'active' as 'active' | 'inactive',
  });

  // Filter tenants by property first, then by search query
  const propertyFilteredTenants = useMemo(() => filterByProperty(allTenants, selectedProperty), [selectedProperty]);
  
  const filteredTenants = propertyFilteredTenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tenant.room.includes(searchQuery) ||
    tenant.phone.includes(searchQuery)
  );

  // Available floors based on selected property
  const availableFloors = useMemo(() => {
    if (!formData.propertyId) return [1, 2, 3];
    
    const property = properties.find(p => p.id === formData.propertyId);
    if (!property) return [1, 2, 3];
    
    // If floors is a number, generate an array [1, 2, 3, ..., n]
    const numFloors = typeof property.floors === 'number' ? property.floors : 3;
    return Array.from({ length: numFloors }, (_, i) => i + 1);
  }, [formData.propertyId, properties]);

  // Helper to get property name
  const getPropertyName = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    return property?.name || 'Unknown Property';
  };

  const handleEditTenant = (tenantId: string) => {
    // Find the tenant
    const tenant = allTenants.find(t => t.id === tenantId);
    if (tenant) {
      // Populate the form with tenant data
      setFormData({
        name: tenant.name,
        phone: tenant.phone,
        email: tenant.email,
        photo: null,
        propertyId: tenant.propertyId,
        floor: 1, // Default, you can enhance this
        room: tenant.room,
        bed: '', // Default, you can enhance this
        monthlyRent: tenant.rent,
        securityDeposit: 0, // Default, you can enhance this
        rentDueDate: 5, // Default, you can enhance this
        parentName: '', // Default, you can enhance this
        parentPhone: '', // Default, you can enhance this
        idType: 'Aadhaar Card',
        idNumber: '',
        idDocument: null,
        joinDate: tenant.joinDate,
        status: tenant.status,
      });
      setEditingTenant(tenantId);
      setShowAddModal(true);
    }
  };

  const handleDeleteTenant = (tenantId: string) => {
    // In a real app, this would show a confirmation dialog
    if (confirm('Are you sure you want to delete this tenant?')) {
      console.log('Deleting tenant:', tenantId);
      alert('Delete tenant functionality will be implemented');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would save to backend
    console.log('Form submitted:', formData);
    setShowAddModal(false);
    // Reset form
    setFormData({
      name: '',
      phone: '',
      email: '',
      photo: null,
      propertyId: '',
      floor: 1,
      room: '',
      bed: '',
      monthlyRent: 0,
      securityDeposit: 0,
      rentDueDate: 5,
      parentName: '',
      parentPhone: '',
      idType: 'Aadhaar Card',
      idNumber: '',
      idDocument: null,
      joinDate: '',
      status: 'active',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, idDocument: e.target.files[0] });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-gray-900">Tenants</h1>
          <p className="text-gray-600 mt-1">Manage all your tenants</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Add Tenant</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, room, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tenants Grid - Desktop */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs text-gray-600">Tenant</th>
                {selectedProperty === 'all' && <th className="px-6 py-3 text-left text-xs text-gray-600">Property</th>}
                <th className="px-6 py-3 text-left text-xs text-gray-600">Room</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600">Contact</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600">Rent</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600">Join Date</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600">Status</th>
                <th className="px-6 py-3 text-left text-xs text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onViewTenant && onViewTenant(tenant.id)}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white flex-shrink-0">
                        {tenant.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm text-gray-900 hover:text-blue-600 transition-colors">
                          {tenant.name}
                        </p>
                        <p className="text-xs text-gray-500">{tenant.email}</p>
                      </div>
                    </div>
                  </td>
                  {selectedProperty === 'all' && (
                    <td className="px-6 py-4 text-sm text-gray-900">{getPropertyName(tenant.propertyId)}</td>
                  )}
                  <td className="px-6 py-4 text-sm text-gray-900">{tenant.room}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{tenant.phone}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">₹{tenant.rent.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{tenant.joinDate}</td>
                  <td className="px-6 py-4">
                    <span className={`
                      inline-flex px-3 py-1 rounded-full text-xs
                      ${tenant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}
                    `}>
                      {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => onViewTenant && onViewTenant(tenant.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button 
                        onClick={() => handleEditTenant(tenant.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors" 
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      <button 
                        onClick={() => handleDeleteTenant(tenant.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors" 
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tenants Cards - Mobile/Tablet */}
      <div className="md:hidden space-y-4">
        {filteredTenants.map((tenant) => (
          <div key={tenant.id} className="bg-white rounded-xl border border-gray-200 p-4 relative">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white">
                  {tenant.name.charAt(0)}
                </div>
                <div>
                  <button 
                    onClick={() => onViewTenant && onViewTenant(tenant.id)}
                    className="text-gray-900 hover:text-blue-600 hover:underline text-left transition-colors font-medium"
                  >
                    {tenant.name}
                  </button>
                  {selectedProperty === 'all' && (
                    <p className="text-xs text-gray-500">{getPropertyName(tenant.propertyId)}</p>
                  )}
                  <p className="text-sm text-gray-600">Room {tenant.room}</p>
                </div>
              </div>
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(openMenuId === tenant.id ? null : tenant.id);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
                
                {/* Dropdown Menu */}
                {openMenuId === tenant.id && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setOpenMenuId(null)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewTenant && onViewTenant(tenant.id);
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Details</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTenant(tenant.id);
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit Tenant</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTenant(tenant.id);
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{tenant.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{tenant.email}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-xs text-gray-500">Monthly Rent</p>
                <p className="text-gray-900 font-semibold">₹{tenant.rent.toLocaleString()}</p>
              </div>
              <span className={`
                inline-flex px-3 py-1 rounded-full text-xs font-medium
                ${tenant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}
              `}>
                {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Tenant Modal Placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-gray-900">{editingTenant ? 'Edit Tenant' : 'Add New Tenant'}</h2>
              <button onClick={() => {
                setShowAddModal(false);
                setEditingTenant(null);
              }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Basic Info Section */}
                <div>
                  <h3 className="text-sm text-gray-900 mb-3">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm text-gray-500">Profile Photo</label>
                      <div className="flex items-center gap-4">
                        {formData.photo && (
                          <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                            <img 
                              src={URL.createObjectURL(formData.photo)} 
                              alt="Preview" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setFormData({ ...formData, photo: e.target.files[0] });
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        {formData.photo && (
                          <button
                            type="button"
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            onClick={() => setFormData({ ...formData, photo: null })}
                          >
                            <X className="w-4 h-4 text-gray-600" />
                          </button>
                        )}
                      </div>
                      {formData.photo && (
                        <p className="text-xs text-green-600">✓ {formData.photo.name}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500">Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500">Phone *</label>
                      <input
                        type="text"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm text-gray-500">Email *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Room Assignment Section */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-sm text-gray-900 mb-3">Room Assignment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm text-gray-500">Property *</label>
                      <select
                        required
                        value={formData.propertyId}
                        onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Property</option>
                        {properties.map(property => (
                          <option key={property.id} value={property.id}>{property.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500">Floor *</label>
                      <select
                        required
                        value={formData.floor}
                        onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!formData.propertyId}
                      >
                        <option value="">Select Floor</option>
                        {availableFloors.map(floor => (
                          <option key={floor} value={floor}>Floor {floor}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500">Room Number *</label>
                      <input
                        type="text"
                        required
                        value={formData.room}
                        onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 101"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500">Bed *</label>
                      <input
                        type="text"
                        required
                        value={formData.bed}
                        onChange={(e) => setFormData({ ...formData, bed: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., A, B, C"
                      />
                    </div>
                  </div>
                </div>

                {/* Rent Details Section */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-sm text-gray-900 mb-3">Rent Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500">Monthly Rent (₹) *</label>
                      <input
                        type="number"
                        required
                        value={formData.monthlyRent}
                        onChange={(e) => setFormData({ ...formData, monthlyRent: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="5000"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500">Security Deposit (₹) *</label>
                      <input
                        type="number"
                        required
                        value={formData.securityDeposit}
                        onChange={(e) => setFormData({ ...formData, securityDeposit: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="10000"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500">Rent Due Date (Day of Month) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="31"
                        value={formData.rentDueDate}
                        onChange={(e) => setFormData({ ...formData, rentDueDate: parseInt(e.target.value) || 5 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="5"
                      />
                    </div>
                  </div>
                </div>

                {/* Emergency Contact Section */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-sm text-gray-900 mb-3">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500">Parent/Guardian Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.parentName}
                        onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500">Parent/Guardian Phone *</label>
                      <input
                        type="text"
                        required
                        value={formData.parentPhone}
                        onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Verification Section */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-sm text-gray-900 mb-3">Verification</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500">ID Type *</label>
                      <select
                        required
                        value={formData.idType}
                        onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Aadhaar Card">Aadhaar Card</option>
                        <option value="Passport">Passport</option>
                        <option value="Driving License">Driving License</option>
                        <option value="Voter ID">Voter ID</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500">ID Number *</label>
                      <input
                        type="text"
                        required
                        value={formData.idNumber}
                        onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm text-gray-500">Upload ID Document</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        {formData.idDocument && (
                          <button
                            type="button"
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            onClick={() => setFormData({ ...formData, idDocument: null })}
                          >
                            <X className="w-4 h-4 text-gray-600" />
                          </button>
                        )}
                      </div>
                      {formData.idDocument && (
                        <p className="text-xs text-green-600 mt-1">✓ {formData.idDocument.name}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stay Details Section */}
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-sm text-gray-900 mb-3">Stay Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500">Join Date *</label>
                      <input
                        type="date"
                        required
                        value={formData.joinDate}
                        onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-500">Status *</label>
                      <select
                        required
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingTenant ? 'Update Tenant' : 'Add Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}