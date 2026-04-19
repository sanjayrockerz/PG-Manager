import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Phone, Mail, MapPin, Calendar, CreditCard, FileText, AlertCircle, Home } from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';
import { MaintenanceTicketRecord, PaymentRecord, TenantRecord, supabaseOwnerDataApi } from '../services/supabaseData';
import { getPayments, getTenants, isDemoModeEnabled } from '../services/dataService';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { LiveStatusBadge } from './LiveStatusBadge';

interface TenantDetailProps {
  tenantId: string;
  onBack: () => void;
}

export function TenantDetail({ tenantId, onBack }: TenantDetailProps) {
  const { properties } = useProperty();
  const isDemoMode = isDemoModeEnabled();
  const [activeTab, setActiveTab] = useState('payments');
  const [tenant, setTenant] = useState<TenantRecord | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceTicketRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTenantData = useCallback(async () => {
      setIsLoading(true);
      setError('');
      try {
        const tenantList = await getTenants('all');
        const tenantData = tenantList.find((entry) => entry.id === tenantId) ?? null;
        if (!tenantData) {
          setTenant(null);
          return;
        }

        const allPayments = await getPayments('all');
        const paymentData = allPayments.filter((payment) => payment.tenantId === tenantData.id);

        const maintenanceData = isDemoMode
          ? []
          : await supabaseOwnerDataApi.listMaintenanceForTenant(tenantData.id, tenantData.name);

        setTenant(tenantData);
        setPayments(paymentData);
        setMaintenance(maintenanceData);
      } catch {
        setError('Unable to load tenant details.');
      } finally {
        setIsLoading(false);
      }
    }, [isDemoMode, tenantId]);

  useEffect(() => {
    void loadTenantData();
  }, [loadTenantData]);

  const { lastUpdatedAt, isSyncing } = useRealtimeRefresh({
    key: `tenant-detail-${tenantId}`,
    tables: ['tenants', 'payments', 'payment_charges', 'maintenance_tickets', 'maintenance_notes', 'rooms'],
    onChange: loadTenantData,
    enabled: !isDemoMode,
  });

  const property = useMemo(() => {
    if (!tenant) {
      return null;
    }
    return properties.find((entry) => entry.id === tenant.propertyId) ?? null;
  }, [tenant, properties]);

  const totalExtraCharges = payments.reduce((sum, payment) => sum + payment.extraCharges, 0);

  const tabs = [
    { id: 'payments', label: 'Payment History', icon: CreditCard },
    { id: 'charges', label: 'Extra Charges', icon: FileText },
    { id: 'maintenance', label: 'Maintenance', icon: AlertCircle },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-gray-900">Tenant Details</h1>
            <p className="text-gray-600 mt-1">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-gray-900">Tenant Details</h1>
            <p className="text-red-600 mt-1">{error || 'Tenant not found.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-gray-900">Tenant Details</h1>
          <p className="text-gray-600 mt-1">{tenant.name}</p>
          <div className="mt-3">
            <LiveStatusBadge lastUpdatedAt={lastUpdatedAt} isSyncing={isSyncing} label={isDemoMode ? 'Demo tenant snapshot' : 'Tenant snapshot live'} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-700 text-3xl flex-shrink-0 border border-gray-200">
            {tenant.name.charAt(0)}
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-1">Name</p>
              <p className="text-gray-900">{tenant.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Phone</p>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><p className="text-gray-900">{tenant.phone}</p></div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Email</p>
              <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /><p className="text-gray-900">{tenant.email}</p></div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Property</p>
              <div className="flex items-center gap-2"><Home className="w-4 h-4 text-gray-400" /><p className="text-gray-900">{property?.name || '-'}</p></div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Room Details</p>
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /><p className="text-gray-900">Floor {tenant.floor}, Room {tenant.room}, Bed {tenant.bed}</p></div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Join Date</p>
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" /><p className="text-gray-900">{tenant.joinDate}</p></div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Monthly Rent</p>
              <p className="text-gray-900">Rs {tenant.rent.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Security Deposit</p>
              <p className="text-gray-900">Rs {tenant.securityDeposit.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <span className={`inline-flex px-3 py-1 rounded-full text-xs ${tenant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
              </span>
            </div>
          </div>
        </div>

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

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <h3 className="text-gray-900">Payment History</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs text-gray-600">Due Date</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-600">Room Number</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-600">Amount</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">No payment history available.</td>
                      </tr>
                    ) : (
                      payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{payment.dueDate}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{payment.room}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">Rs {payment.totalAmount.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs ${payment.status === 'paid' ? 'bg-green-100 text-green-700' : payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'charges' && (
            <div className="space-y-4">
              <h3 className="text-gray-900">Extra Charges</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700">Total extra charges billed: Rs {totalExtraCharges.toLocaleString()}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs text-gray-600">Due Date</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-600">Monthly Rent</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-600">Extra Charges</th>
                      <th className="px-4 py-3 text-left text-xs text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">No charges available.</td>
                      </tr>
                    ) : (
                      payments.map((payment) => (
                        <tr key={`${payment.id}-charges`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{payment.dueDate}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">Rs {payment.monthlyRent.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">Rs {payment.extraCharges.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">Rs {payment.totalAmount.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
                    {maintenance.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">No maintenance requests found.</td>
                      </tr>
                    ) : (
                      maintenance.map((request) => (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{request.date}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{request.issue}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs ${request.priority === 'high' ? 'bg-red-100 text-red-700' : request.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                              {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs ${request.status === 'resolved' ? 'bg-green-100 text-green-700' : request.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <h3 className="text-gray-900">Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Profile Photo</p>
                  {tenant.photoUrl ? (
                    <a href={tenant.photoUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm">Open uploaded photo</a>
                  ) : (
                    <p className="text-sm text-gray-700">No profile photo uploaded.</p>
                  )}
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">ID Document</p>
                  {tenant.idDocumentUrl ? (
                    <a href={tenant.idDocumentUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm">Open uploaded ID document</a>
                  ) : (
                    <p className="text-sm text-gray-700">No ID document uploaded.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}