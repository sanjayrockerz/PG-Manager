import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Download, Plus, IndianRupee, CheckCircle, Clock, XCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { useProperty } from '../contexts/PropertyContext';
import type { PaymentRecord } from '../services/supabaseData';
import { addPaymentChargeRecord, getPayments, isDemoModeEnabled, updatePaymentStatusRecord } from '../services/dataService';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { LiveStatusBadge } from './LiveStatusBadge';

const getPaymentsCacheKey = (selectedProperty: string | 'all'): string => `pg-manager:payments-cache:${isDemoModeEnabled() ? 'demo' : 'live'}:${selectedProperty}`;

const readCachedPayments = (selectedProperty: string | 'all'): PaymentRecord[] | null => {
  try {
    const raw = localStorage.getItem(getPaymentsCacheKey(selectedProperty));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PaymentRecord[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeCachedPayments = (selectedProperty: string | 'all', payments: PaymentRecord[]): void => {
  try {
    localStorage.setItem(getPaymentsCacheKey(selectedProperty), JSON.stringify(payments));
  } catch {
    // Best-effort cache; ignore storage failures.
  }
};

const formatCurrencyINR = (value: number): string => `Rs\u00A0${value.toLocaleString('en-IN')}`;

export function Payments() {
  const { selectedProperty, properties } = useProperty();
  const isDemoMode = isDemoModeEnabled();
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

  const parseCurrencyInputValue = (value: string): number => {
    const digits = value.replace(/\D/g, '');
    if (!digits) {
      return 0;
    }
    return Number(digits.replace(/^0+(?=\d)/, ''));
  };

  const getStatusClasses = (status: 'paid' | 'pending' | 'overdue') => {
    if (status === 'paid') {
      return 'bg-green-100 text-green-700';
    }
    if (status === 'pending') {
      return 'bg-yellow-100 text-yellow-700';
    }
    return 'bg-red-100 text-red-700';
  };

  const getStatusOptionStyle = (status: 'paid' | 'pending' | 'overdue') => {
    if (status === 'paid') {
      return { backgroundColor: '#dcfce7', color: '#166534' };
    }
    if (status === 'pending') {
      return { backgroundColor: '#fef9c3', color: '#a16207' };
    }
    return { backgroundColor: '#fee2e2', color: '#b91c1c' };
  };

  const loadPayments = useCallback(async (showLoader: boolean) => {
    if (showLoader) {
      setIsLoading(true);
    }
    setError('');
    try {
      const list = await getPayments(selectedProperty);
      setPayments(list);
    } catch {
      setError('Unable to load payments.');
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  }, [selectedProperty]);

  useEffect(() => {
    const cached = readCachedPayments(selectedProperty);
    if (cached) {
      setPayments(cached);
      setIsLoading(false);
      void loadPayments(false);
      return;
    }

    void loadPayments(true);
  }, [loadPayments, selectedProperty]);

  useEffect(() => {
    writeCachedPayments(selectedProperty, payments);
  }, [selectedProperty, payments]);

  const { lastUpdatedAt, isSyncing } = useRealtimeRefresh({
    key: `payments-${selectedProperty}`,
    tables: ['payments', 'payment_charges', 'tenants', 'notifications'],
    onChange: () => loadPayments(false),
    enabled: !isDemoMode,
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
      const updated = await updatePaymentStatusRecord(paymentId, newStatus);
      setPayments((prev) => prev.map((entry) => (entry.id === paymentId ? updated : entry)));
      toast.success(`Payment marked ${newStatus}`);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to update payment status.';
      setError(message);
      toast.error(message);
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
      const updated = await addPaymentChargeRecord(selectedPayment.id, {
        type: chargeFormData.type,
        customType: chargeFormData.type === 'custom' ? chargeFormData.customType : undefined,
        description: chargeFormData.description,
        amount: Number(chargeFormData.amount),
      });
      setPayments((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      setShowAddChargeModal(false);
      setSelectedPayment(null);
      toast.success('Charge added successfully');
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to add charge.';
      setError(message);
      toast.error(message);
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
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
          <p className="mt-1 text-sm text-gray-500">Track and manage rent payments and charges</p>
          <div className="mt-3">
            <LiveStatusBadge lastUpdatedAt={lastUpdatedAt} isSyncing={isSyncing} label={isDemoMode ? 'Demo data' : 'Payment stream'} />
          </div>
        </div>
        <button onClick={exportCsv} className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-white transition-colors hover:bg-indigo-700">
          <Download className="w-5 h-5" />
          <span>Export</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-gray-600 text-sm">Total Amount</p>
              <p className="text-gray-900 mt-2 text-[clamp(1.5rem,2.2vw,2rem)] leading-none font-semibold whitespace-nowrap tabular-nums">{formatCurrencyINR(stats.total)}</p>
            </div>
            <div className="w-14 h-14 p-2 bg-blue-50 rounded-xl flex items-center justify-center">
              <IndianRupee className="w-7 h-7 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-gray-600 text-sm">Paid</p>
              <p className="text-gray-900 mt-2 text-[clamp(1.5rem,2.2vw,2rem)] leading-none font-semibold whitespace-nowrap tabular-nums">{formatCurrencyINR(stats.paid)}</p>
            </div>
            <div className="w-14 h-14 p-2 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-gray-600 text-sm">Pending</p>
              <p className="text-gray-900 mt-2 text-[clamp(1.5rem,2.2vw,2rem)] leading-none font-semibold whitespace-nowrap tabular-nums">{formatCurrencyINR(stats.pending)}</p>
            </div>
            <div className="w-14 h-14 p-2 bg-yellow-50 rounded-xl flex items-center justify-center">
              <Clock className="w-7 h-7 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-gray-600 text-sm">Overdue</p>
              <p className="text-gray-900 mt-2 text-[clamp(1.5rem,2.2vw,2rem)] leading-none font-semibold whitespace-nowrap tabular-nums">{formatCurrencyINR(stats.overdue)}</p>
            </div>
            <div className="w-14 h-14 p-2 bg-red-50 rounded-xl flex items-center justify-center">
              <XCircle className="w-7 h-7 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by tenant or property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {['all', 'paid', 'pending', 'overdue'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm transition-colors ${filterStatus === status ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2">
            <option value="current">Current Month</option>
            <option value="last">Last Month</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateFilter === 'custom' && (
            <>
              <input type="date" value={customDateRange.start} onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })} className="rounded-lg border border-gray-300 px-4 py-2" />
              <input type="date" value={customDateRange.end} onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })} className="rounded-lg border border-gray-300 px-4 py-2" />
            </>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-gray-500">Tenant Name</th>
                {selectedProperty === 'all' && <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-gray-500">Property</th>}
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-gray-500">Room Number</th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wide text-gray-500">Monthly Rent</th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wide text-gray-500">Extra Charges</th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wide text-gray-500">Total Amount</th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-wide text-gray-500">Due Date</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={selectedProperty === 'all' ? 9 : 8} className="px-4 py-8 text-center text-sm text-gray-500">Loading payments...</td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={selectedProperty === 'all' ? 9 : 8} className="px-4 py-8 text-center text-sm text-gray-500">No payment records found.</td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5 text-sm text-gray-900 align-top">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate font-medium text-gray-900">{payment.tenant}</span>
                        <span className="truncate text-xs text-gray-500">Room {payment.room}</span>
                      </div>
                    </td>
                    {selectedProperty === 'all' && <td className="px-4 py-3.5 text-sm text-gray-700 align-top">{getPropertyName(payment.propertyId)}</td>}
                    <td className="px-4 py-3.5 text-sm text-gray-700 align-top">{payment.room}</td>
                    <td className="px-4 py-3.5 text-right text-sm text-gray-900 align-top tabular-nums">₹{payment.monthlyRent.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right text-sm text-gray-600 align-top tabular-nums">₹{payment.extraCharges.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right text-sm text-gray-900 align-top tabular-nums">₹{payment.totalAmount.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right text-sm text-gray-600 align-top tabular-nums">{payment.dueDate}</td>
                    <td className="px-4 py-3.5 align-top">
                      <select
                        value={payment.status}
                        onChange={(e) => void handleStatusChange(payment.id, e.target.value as 'paid' | 'pending' | 'overdue')}
                        className={`px-3 py-1 rounded-full text-xs border border-gray-300 cursor-pointer font-medium ${getStatusClasses(payment.status)}`}
                      >
                        <option value="paid" style={getStatusOptionStyle('paid')}>Paid</option>
                        <option value="pending" style={getStatusOptionStyle('pending')}>Pending</option>
                        <option value="overdue" style={getStatusOptionStyle('overdue')}>Overdue</option>
                      </select>
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <button onClick={() => handleAddCharge(payment)} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-indigo-700">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddChargeModal(false)}>
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Add Extra Charge</h2>
                <p className="mt-1 text-sm text-gray-600">{selectedPayment.tenant} - Room {selectedPayment.room}</p>
              </div>
              <button onClick={() => setShowAddChargeModal(false)} className="rounded-md p-2 transition-colors hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => void submitCharge(e)} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Charge Type *</label>
                <select value={chargeFormData.type} onChange={(e) => setChargeFormData({ ...chargeFormData, type: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2">
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
                  <input type="text" required value={chargeFormData.customType} onChange={(e) => setChargeFormData({ ...chargeFormData, customType: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2" placeholder="e.g., Late Fee" />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm text-gray-700">Description</label>
                <textarea value={chargeFormData.description} onChange={(e) => setChargeFormData({ ...chargeFormData, description: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2" rows={2} placeholder="Optional details" />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-700">Amount *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={chargeFormData.amount === 0 ? '' : chargeFormData.amount}
                  onChange={(e) => setChargeFormData({ ...chargeFormData, amount: parseCurrencyInputValue(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowAddChargeModal(false)} className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 transition-colors hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isSaving} className="rounded-lg bg-indigo-600 px-6 py-2.5 text-white transition-colors hover:bg-indigo-700 disabled:opacity-60">
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