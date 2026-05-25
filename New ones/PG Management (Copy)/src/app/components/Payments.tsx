import { useState, useMemo } from 'react';
import { Search, Download, Plus, IndianRupee, Calendar, CheckCircle, Clock, XCircle, X, Send } from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';
import { mockPayments as allPayments, filterByProperty, mockTenants } from '../utils/mockData';

interface PaymentRecord {
  id: string;
  tenant: string;
  propertyId: string;
  room: string;
  monthlyRent: number;
  extraCharges: number;
  totalAmount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
}

export function Payments() {
  const { selectedProperty, properties } = useProperty();
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('current');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [showAddChargeModal, setShowAddChargeModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);

  // Charge form state
  const [chargeFormData, setChargeFormData] = useState({
    type: 'electricity',
    customType: '',
    description: '',
    amount: 0,
  });

  // Payment records state
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>(() => {
    return mockTenants.map(tenant => {
      const extraCharges = Math.floor(Math.random() * 1000); // Mock extra charges
      const totalAmount = tenant.rent + extraCharges;
      const dueDate = `2026-03-${(5).toString().padStart(2, '0')}`; // 5th of March 2026
      
      // Determine status based on current date and payment
      let status: 'paid' | 'pending' | 'overdue' = 'pending';
      const existingPayment = allPayments.find(p => p.tenant === tenant.name);
      if (existingPayment) {
        status = existingPayment.status;
      } else {
        const today = new Date('2026-03-10'); // Using current date from system
        const due = new Date(dueDate);
        if (today > due) {
          status = 'overdue';
        }
      }

      return {
        id: tenant.id,
        tenant: tenant.name,
        propertyId: tenant.propertyId,
        room: tenant.room,
        monthlyRent: tenant.rent,
        extraCharges,
        totalAmount,
        dueDate,
        status,
      };
    });
  });

  // Filter payments by property
  const propertyFilteredPayments = useMemo(() => filterByProperty(paymentRecords, selectedProperty), [paymentRecords, selectedProperty]);

  // Helper to get property name
  const getPropertyName = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    return property?.name || 'Unknown Property';
  };

  // Get current date (March 10, 2026)
  const currentDate = new Date('2026-03-10');
  const currentMonth = currentDate.getMonth(); // 2 (March is 0-indexed as 2)
  const currentYear = currentDate.getFullYear(); // 2026

  const filteredPayments = propertyFilteredPayments.filter(payment => {
    const matchesStatus = filterStatus === 'all' ? true : payment.status === filterStatus;
    
    // Search by tenant name or property name
    const propertyName = getPropertyName(payment.propertyId).toLowerCase();
    const matchesSearch = payment.tenant.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         propertyName.includes(searchQuery.toLowerCase());
    
    // Date filter logic
    let matchesDate = true;
    const paymentDate = new Date(payment.dueDate);
    const paymentMonth = paymentDate.getMonth();
    const paymentYear = paymentDate.getFullYear();
    
    if (dateFilter === 'current') {
      // Current month (March 2026)
      matchesDate = paymentMonth === currentMonth && paymentYear === currentYear;
    } else if (dateFilter === 'last') {
      // Last month (February 2026)
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      matchesDate = paymentMonth === lastMonth && paymentYear === lastMonthYear;
    } else if (dateFilter === 'custom' && customDateRange.start && customDateRange.end) {
      // Custom date range
      const startDate = new Date(customDateRange.start);
      const endDate = new Date(customDateRange.end);
      matchesDate = paymentDate >= startDate && paymentDate <= endDate;
    }
    // For 'all', matchesDate remains true
    
    return matchesStatus && matchesSearch && matchesDate;
  });

  const stats = {
    total: propertyFilteredPayments.reduce((sum, p) => sum + p.totalAmount, 0),
    paid: propertyFilteredPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.totalAmount, 0),
    pending: propertyFilteredPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.totalAmount, 0),
    overdue: propertyFilteredPayments.filter(p => p.status === 'overdue').reduce((sum, p) => sum + p.totalAmount, 0),
  };

  const handleStatusChange = (paymentId: string, newStatus: 'paid' | 'pending' | 'overdue') => {
    setPaymentRecords(prevRecords => 
      prevRecords.map(record => 
        record.id === paymentId 
          ? { ...record, status: newStatus }
          : record
      )
    );
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

  const handleSendReminder = (payment: PaymentRecord) => {
    // Placeholder for WhatsApp integration
    alert(`Reminder will be sent to ${payment.tenant} via WhatsApp\n\nAmount Due: ₹${payment.totalAmount.toLocaleString()}\nDue Date: ${payment.dueDate}\n\n(WhatsApp integration coming soon)`);
  };

  const submitCharge = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Adding charge:', chargeFormData, 'to payment:', selectedPayment?.id);
    setShowAddChargeModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-1">Track and manage rent payments and charges</p>
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Download className="w-5 h-5" />
          <span>Export</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 lg:p-6 border border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Amount</p>
              <p className="text-gray-900 mt-2">₹{stats.total.toLocaleString()}</p>
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
              <p className="text-gray-900 mt-2">₹{stats.paid.toLocaleString()}</p>
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
              <p className="text-gray-900 mt-2">₹{stats.pending.toLocaleString()}</p>
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
              <p className="text-gray-900 mt-2">₹{stats.overdue.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
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
              className={`
                px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors
                ${filterStatus === status 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Date Filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="current">Current Month</option>
            <option value="last">Last Month</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateFilter === 'custom' && (
            <>
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Start Date"
              />
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="End Date"
              />
            </>
          )}
        </div>
      </div>

      {/* Payments Table - Desktop */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-gray-600">Tenant Name</th>
                {selectedProperty === 'all' && <th className="px-4 py-3 text-left text-xs text-gray-600">Property</th>}
                <th className="px-4 py-3 text-left text-xs text-gray-600">Room</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600">Monthly Rent</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600">Extra Charges</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600">Total Amount</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600">Due Date</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-xs text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{payment.tenant}</td>
                  {selectedProperty === 'all' && (
                    <td className="px-4 py-3 text-sm text-gray-900">{getPropertyName(payment.propertyId)}</td>
                  )}
                  <td className="px-4 py-3 text-sm text-gray-600">{payment.room}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">₹{payment.monthlyRent.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">₹{payment.extraCharges.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">₹{payment.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{payment.dueDate}</td>
                  <td className="px-4 py-3">
                    <select
                      value={payment.status}
                      onChange={(e) => handleStatusChange(payment.id, e.target.value as 'paid' | 'pending' | 'overdue')}
                      style={{
                        backgroundColor: payment.status === 'paid' ? '#dcfce7' : payment.status === 'pending' ? '#fef9c3' : '#fee2e2',
                        color: payment.status === 'paid' ? '#15803d' : payment.status === 'pending' ? '#854d0e' : '#991b1b',
                      }}
                      className="px-3 py-1 rounded-full text-xs border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="paid" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>Paid</option>
                      <option value="pending" style={{ backgroundColor: '#fef9c3', color: '#854d0e' }}>Pending</option>
                      <option value="overdue" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>Overdue</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddCharge(payment)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors flex items-center gap-1"
                        title="Add Charge"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Charge</span>
                      </button>
                      <button
                        onClick={() => handleSendReminder(payment)}
                        className="p-1.5 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Send Reminder"
                      >
                        <Send className="w-4 h-4 text-purple-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payments Cards - Mobile/Tablet */}
      <div className="lg:hidden space-y-4">
        {filteredPayments.map((payment) => (
          <div key={payment.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-gray-900">{payment.tenant}</p>
                {selectedProperty === 'all' && (
                  <p className="text-xs text-gray-500">{getPropertyName(payment.propertyId)}</p>
                )}
                <p className="text-sm text-gray-600">Room {payment.room}</p>
              </div>
              <select
                value={payment.status}
                onChange={(e) => handleStatusChange(payment.id, e.target.value as 'paid' | 'pending' | 'overdue')}
                className={`
                  px-3 py-1 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${payment.status === 'paid' ? 'bg-green-100 text-green-700' : payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}
                `}
              >
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Monthly Rent:</span>
                <span className="text-gray-900">₹{payment.monthlyRent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Extra Charges:</span>
                <span className="text-gray-900">₹{payment.extraCharges.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                <span className="text-gray-900">Total Amount:</span>
                <span className="text-gray-900">₹{payment.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Due Date:</span>
                <span className="text-gray-900">{payment.dueDate}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAddCharge(payment)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Charge</span>
              </button>
              <button
                onClick={() => handleSendReminder(payment)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Reminder</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Charge Modal */}
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
            
            <form onSubmit={submitCharge} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Charge Type *</label>
                <select
                  required
                  value={chargeFormData.type}
                  onChange={(e) => setChargeFormData({ ...chargeFormData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
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
                  <input
                    type="text"
                    required
                    value={chargeFormData.customType}
                    onChange={(e) => setChargeFormData({ ...chargeFormData, customType: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Late Fee, Parking"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm text-gray-700">Description</label>
                <textarea
                  value={chargeFormData.description}
                  onChange={(e) => setChargeFormData({ ...chargeFormData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Optional details about the charge"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-700">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={chargeFormData.amount}
                  onChange={(e) => setChargeFormData({ ...chargeFormData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAddChargeModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Charge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}