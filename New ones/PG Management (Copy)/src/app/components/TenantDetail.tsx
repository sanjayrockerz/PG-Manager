import { useState } from 'react';
import { ArrowLeft, Phone, Mail, MapPin, Calendar, CreditCard, FileText, AlertCircle, User, Home } from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';
import { mockPayments, mockMaintenanceRequests, filterByProperty } from '../utils/mockData';

interface TenantDetailProps {
  tenantId: string;
  onBack: () => void;
}

export function TenantDetail({ tenantId, onBack }: TenantDetailProps) {
  const { properties } = useProperty();
  const [activeTab, setActiveTab] = useState('payments');

  // Mock tenant data - in a real app, this would come from props or API
  const tenant = {
    id: tenantId,
    name: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    email: 'rajesh@example.com',
    propertyId: 'prop-1',
    floor: 1,
    room: '101',
    bed: 'A',
    monthlyRent: 5500,
    securityDeposit: 10000,
    rentDueDate: 5,
    parentName: 'Mr. Kumar Singh',
    parentPhone: '+91 98765 00000',
    idType: 'Aadhaar Card',
    idNumber: 'XXXX-XXXX-1234',
    joinDate: '2024-01-15',
    status: 'active',
  };

  const property = properties.find(p => p.id === tenant.propertyId);
  const tenantPayments = mockPayments.filter(p => p.tenant === tenant.name);
  const tenantMaintenance = mockMaintenanceRequests.filter(m => m.tenant === tenant.name);

  const tabs = [
    { id: 'payments', label: 'Payment History', icon: CreditCard },
    { id: 'charges', label: 'Extra Charges', icon: FileText },
    { id: 'maintenance', label: 'Maintenance', icon: AlertCircle },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  const extraCharges = [
    { id: 1, description: 'Electricity Bill - November', amount: 450, date: '2025-11-30', status: 'paid' },
    { id: 2, description: 'Late Payment Fee', amount: 200, date: '2025-10-15', status: 'paid' },
    { id: 3, description: 'Electricity Bill - December', amount: 520, date: '2025-12-05', status: 'pending' },
  ];

  const documents = [
    { id: 1, name: 'Aadhaar Card.pdf', type: 'ID Proof', uploadDate: '2024-01-15', size: '2.3 MB' },
    { id: 2, name: 'Agreement.pdf', type: 'Rental Agreement', uploadDate: '2024-01-15', size: '1.8 MB' },
    { id: 3, name: 'Photo.jpg', type: 'Profile Photo', uploadDate: '2024-01-15', size: '456 KB' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-gray-900">Tenant Details</h1>
          <p className="text-gray-600 mt-1">{tenant.name}</p>
        </div>
      </div>

      {/* Tenant Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-3xl flex-shrink-0">
            {tenant.name.charAt(0)}
          </div>

          {/* Basic Info */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-1">Name</p>
              <p className="text-gray-900">{tenant.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Phone</p>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <p className="text-gray-900">{tenant.phone}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Email</p>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <p className="text-gray-900">{tenant.email}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Property</p>
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-gray-400" />
                <p className="text-gray-900">{property?.name}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Room Details</p>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <p className="text-gray-900">Floor {tenant.floor}, Room {tenant.room}, Bed {tenant.bed}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Join Date</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <p className="text-gray-900">{tenant.joinDate}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Monthly Rent</p>
              <p className="text-gray-900">₹{tenant.monthlyRent.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Security Deposit</p>
              <p className="text-gray-900">₹{tenant.securityDeposit.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <span className={`
                inline-flex px-3 py-1 rounded-full text-xs
                ${tenant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}
              `}>
                {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm text-gray-900 mb-3">Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Parent Name</p>
              <p className="text-gray-900">{tenant.parentName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Parent Phone</p>
              <p className="text-gray-900">{tenant.parentPhone}</p>
            </div>
          </div>
        </div>

        {/* Verification */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm text-gray-900 mb-3">Verification Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">ID Type</p>
              <p className="text-gray-900">{tenant.idType}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">ID Number</p>
              <p className="text-gray-900">{tenant.idNumber}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-4 border-b-2 transition-colors whitespace-nowrap
                    ${activeTab === tab.id 
                      ? 'border-blue-600 text-blue-600' 
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Payment History Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <h3 className="text-gray-900">Payment History</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs text-gray-600">Date</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-600">Room</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-600">Amount</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tenantPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{payment.date}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{payment.room}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">₹{payment.amount.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`
                            inline-flex px-3 py-1 rounded-full text-xs
                            ${payment.status === 'paid' ? 'bg-green-100 text-green-700' : ''}
                            ${payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : ''}
                            ${payment.status === 'overdue' ? 'bg-red-100 text-red-700' : ''}
                          `}>
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Extra Charges Tab */}
          {activeTab === 'charges' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-gray-900">Extra Charges</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  Add Charge
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs text-gray-600">Description</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-600">Date</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-600">Amount</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {extraCharges.map((charge) => (
                      <tr key={charge.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{charge.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{charge.date}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">₹{charge.amount.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`
                            inline-flex px-3 py-1 rounded-full text-xs
                            ${charge.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}
                          `}>
                            {charge.status.charAt(0).toUpperCase() + charge.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && (
            <div className="space-y-4">
              <h3 className="text-gray-900">Maintenance Requests</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs text-gray-600">Date</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-600">Issue</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-600">Priority</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tenantMaintenance.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{request.date}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{request.issue}</td>
                        <td className="px-4 py-3">
                          <span className={`
                            inline-flex px-3 py-1 rounded-full text-xs
                            ${request.priority === 'high' ? 'bg-red-100 text-red-700' : ''}
                            ${request.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : ''}
                            ${request.priority === 'low' ? 'bg-green-100 text-green-700' : ''}
                          `}>
                            {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`
                            inline-flex px-3 py-1 rounded-full text-xs
                            ${request.status === 'resolved' ? 'bg-green-100 text-green-700' : ''}
                            ${request.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : ''}
                            ${request.status === 'open' ? 'bg-yellow-100 text-yellow-700' : ''}
                          `}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-gray-900">Documents</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  Upload Document
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-start gap-3">
                      <FileText className="w-10 h-10 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">{doc.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{doc.type}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-xs text-gray-500">{doc.uploadDate}</p>
                          <span className="text-xs text-gray-400">•</span>
                          <p className="text-xs text-gray-500">{doc.size}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}