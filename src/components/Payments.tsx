import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Download, Plus, IndianRupee, CheckCircle, Clock, XCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useProperty } from '../contexts/PropertyContext';
import { PaymentRecord, supabaseOwnerDataApi } from '../services/supabaseData';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { LiveStatusBadge } from './LiveStatusBadge';

export function Payments() {
  const { selectedProperty, properties } = useProperty();
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('current');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [showAddChargeModal, setShowAddChargeModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [chargeFormData, setChargeFormData] = useState({
    type: 'electricity',
    customType: '',
    description: '',
    amount: 0,
  });

  const getStatusClasses = (status: 'paid' | 'pending' | 'overdue') => {
    if (status === 'paid') {
      return 'bg-green-100 text-green-700';
    }
    if (status === 'pending') {
      return 'bg-yellow-100 text-yellow-700';
    }
    return 'bg-red-100 text-red-700';
  };

  const loadPayments = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const list = await supabaseOwnerDataApi.listPayments(selectedProperty);
      setPayments(list);
    } catch {
      setError('Unable to load payments. Please check Supabase setup.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedProperty]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const { lastUpdatedAt, isSyncing } = useRealtimeRefresh({
    key: `payments-${selectedProperty}`,
    tables: ['payments', 'payment_charges', 'tenants', 'notifications'],
    onChange: loadPayments,
  });

  const getPropertyName = (propertyId: string) => {
    const property = properties.find((entry) => entry.id === propertyId);
    return property?.name || 'Unknown Property';
  };

  const filteredPayments = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return payments.filter((payment) => {
      const matchesStatus = filterStatus === 'all' ? true : payment.status === filterStatus;

      const propertyName = getPropertyName(payment.propertyId).toLowerCase();
      const matchesSearch = payment.tenant.toLowerCase().includes(searchQuery.toLowerCase())
        || propertyName.includes(searchQuery.toLowerCase());

      const paymentDate = new Date(payment.dueDate);
      const paymentMonth = paymentDate.getMonth();
      const paymentYear = paymentDate.getFullYear();

      let matchesDate = true;
      if (dateFilter === 'current') {
        matchesDate = paymentMonth === currentMonth && paymentYear === currentYear;
      } else if (dateFilter === 'last') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        matchesDate = paymentMonth === lastMonth && paymentYear === lastMonthYear;
      } else if (dateFilter === 'custom' && customDateRange.start && customDateRange.end) {
        const startDate = new Date(customDateRange.start);
        const endDate = new Date(customDateRange.end);
        matchesDate = paymentDate >= startDate && paymentDate <= endDate;
      }

      return matchesStatus && matchesSearch && matchesDate;
    });
  }, [payments, filterStatus, searchQuery, dateFilter, customDateRange]);

  const stats = useMemo(() => ({
    total: payments.reduce((sum, payment) => sum + payment.totalAmount, 0),
    paid: payments.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + payment.totalAmount, 0),
    pending: payments.filter((payment) => payment.status === 'pending').reduce((sum, payment) => sum + payment.totalAmount, 0),
    overdue: payments.filter((payment) => payment.status === 'overdue').reduce((sum, payment) => sum + payment.totalAmount, 0),
  }), [payments]);

  const handleStatusChange = async (paymentId: string, newStatus: 'paid' | 'pending' | 'overdue') => {
    setError('');
    try {
      const updated = await supabaseOwnerDataApi.updatePaymentStatus(paymentId, newStatus);
      setPayments((prev) => prev.map((entry) => (entry.id === paymentId ? updated : entry)));
      toast.success(`Payment marked ${newStatus}`);
    } catch {
      setError('Unable to update payment status.');
      toast.error('Failed to update payment status');
    }
  };

  const handleAddCharge = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setChargeFormData({
      type: 'electricity',
      customType: '',
      description: '',
      amount: 0,
    });
    setShowAddChargeModal(true);
  };

  const submitCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) {
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const updated = await supabaseOwnerDataApi.addPaymentCharge(selectedPayment.id, {
        type: chargeFormData.type,
        customType: chargeFormData.type === 'custom' ? chargeFormData.customType : undefined,
        description: chargeFormData.description,
        amount: Number(chargeFormData.amount),
      });
      setPayments((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      setShowAddChargeModal(false);
      setSelectedPayment(null);
      toast.success('Charge added successfully');
    } catch {
      setError('Unable to add charge.');
      toast.error('Failed to add charge');
    } finally {
      setIsSaving(false);
    }
  };

  const exportCsv = () => {
    const headers = ['Tenant', 'Property', 'Room', 'Monthly Rent', 'Extra Charges', 'Total Amount', 'Due Date', 'Status'];
    const rows = filteredPayments.map((payment) => [
      payment.tenant,
      getPropertyName(payment.propertyId),
      payment.room,
      payment.monthlyRent,
      payment.extraCharges,
      payment.totalAmount,
      payment.dueDate,
      payment.status,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-1">Track and manage rent payments and charges</p>
          <div className="mt-3">
            <LiveStatusBadge lastUpdatedAt={lastUpdatedAt} isSyncing={isSyncing} label="Payment stream" />
          </div>
        </div>
        <button onClick={exportCsv} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Download className="w-5 h-5" />
          <span>Export</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Amount</p>
              <p className="text-gray-900 mt-2">Rs {stats.total.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <IndianRupee className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm">Paid</p>
              <p className="text-gray-900 mt-2">Rs {stats.paid.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm">Pending</p>
              <p className="text-gray-900 mt-2">Rs {stats.pending.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm">Overdue</p>
              <p className="text-gray-900 mt-2">Rs {stats.overdue.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by tenant or property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {['all', 'paid', 'pending', 'overdue'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${filterStatus === status ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white">
            <option value="current">Current Month</option>
            <option value="last">Last Month</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateFilter === 'custom' && (
            <>
              <input type="date" value={customDateRange.start} onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg" />
              <input type="date" value={customDateRange.end} onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg" />
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-gray-600">Tenant Name</th>
                {selectedProperty === 'all' && <th className="px-4 py-3 text-left text-xs text-gray-600">Property</th>}
                <th className="px-4 py-3 text-left text-xs text-gray-600">Room Number</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600">Monthly Rent</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600">Extra Charges</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600">Total Amount</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600">Due Date</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={selectedProperty === 'all' ? 9 : 8} className="px-4 py-10 text-center text-sm text-gray-500">Loading payments...</td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={selectedProperty === 'all' ? 9 : 8} className="px-4 py-10 text-center text-sm text-gray-500">No payment records found.</td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{payment.tenant}</td>
                    {selectedProperty === 'all' && <td className="px-4 py-3 text-sm text-gray-900">{getPropertyName(payment.propertyId)}</td>}
                    <td className="px-4 py-3 text-sm text-gray-600">{payment.room}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">Rs {payment.monthlyRent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">Rs {payment.extraCharges.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">Rs {payment.totalAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{payment.dueDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={payment.status}
                          onChange={(e) => void handleStatusChange(payment.id, e.target.value as 'paid' | 'pending' | 'overdue')}
                          className="px-3 py-1 rounded-lg text-xs border border-gray-300 bg-white text-gray-700 cursor-pointer"
                        >
                          <option value="paid">Paid</option>
                          <option value="pending">Pending</option>
                          <option value="overdue">Overdue</option>
                        </select>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusClasses(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleAddCharge(payment)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors flex items-center gap-1">
                        <Plus className="w-3 h-3" />
                        <span>Add Charge</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddChargeModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowAddChargeModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-gray-900">Add Extra Charge</h2>
                <p className="text-sm text-gray-600 mt-1">{selectedPayment.tenant} - Room {selectedPayment.room}</p>
              </div>
              <button onClick={() => setShowAddChargeModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => void submitCharge(e)} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Charge Type *</label>
                <select value={chargeFormData.type} onChange={(e) => setChargeFormData({ ...chargeFormData, type: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                  <option value="electricity">Electricity Bill</option>
                  <option value="water">Water Bill</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="laundry">Laundry</option>
                  <option value="internet">Internet</option>
                  <option value="custom">Custom Charge</option>
                </select>
              </div>

              {chargeFormData.type === 'custom' && (
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Custom Charge Name *</label>
                  <input type="text" required value={chargeFormData.customType} onChange={(e) => setChargeFormData({ ...chargeFormData, customType: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="e.g., Late Fee" />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm text-gray-700">Description</label>
                <textarea value={chargeFormData.description} onChange={(e) => setChargeFormData({ ...chargeFormData, description: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" rows={2} placeholder="Optional details" />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-700">Amount *</label>
                <input type="number" min="0" required value={chargeFormData.amount} onChange={(e) => setChargeFormData({ ...chargeFormData, amount: Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowAddChargeModal(false)} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
                  {isSaving ? 'Adding...' : 'Add Charge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}