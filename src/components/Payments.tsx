import { useEffect, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import {
  CheckCircle, Clock, AlertCircle, Plus, MessageCircle,
  Download, ChevronDown, IndianRupee, Home, Calendar,
  Save, Receipt, Sparkles, Loader2, User,
} from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { isDemoModeEnabled, getPayments, updatePaymentStatusRecord, addPaymentChargeRecord } from '../services/dataService';
import type { PaymentRecord, PaymentStatus } from '../services/supabaseData';
import { openReceiptWindow } from '../services/receiptGenerator';

const statusLabel: Record<PaymentStatus, string> = { paid: 'Paid', pending: 'Pending', overdue: 'Overdue' };

const statusColor: Record<PaymentStatus, string> = {
  paid: 'bg-gradient-to-r from-green-400 to-emerald-400 text-white',
  pending: 'bg-gradient-to-r from-amber-400 to-orange-400 text-white',
  overdue: 'bg-gradient-to-r from-red-400 to-rose-400 text-white',
};

export function Payments() {
  const { properties, selectedProperty } = useProperty();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | PaymentStatus>('all');

  // Extra charge modal
  const [addChargeOpen, setAddChargeOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [chargeForm, setChargeForm] = useState({ amount: 0, description: '', type: 'other' });
  const [chargeSaving, setChargeSaving] = useState(false);

  const getPropertyName = (propertyId: string) =>
    properties.find((p) => p.id === propertyId)?.name ?? propertyId;

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPayments(selectedProperty);
      setPayments(data);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [selectedProperty]); // eslint-disable-line react-hooks/exhaustive-deps

  useRealtimeRefresh({
    key: 'payments',
    tables: ['payments', 'payment_charges'],
    onChange: () => void load(),
    enabled: !isDemoModeEnabled(),
  });

  const filteredPayments = payments.filter(
    (p) => filterStatus === 'all' || p.status === filterStatus,
  );

  // Detect pending payments that have passed their due date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const unstampedOverdue = payments.filter(
    (p) => p.status === 'pending' && new Date(p.dueDate) < today,
  );

  const markAllOverdue = async () => {
    try {
      await Promise.all(unstampedOverdue.map((p) => updatePaymentStatusRecord(p.id, 'overdue')));
      await load();
      toast.success(`${unstampedOverdue.length} payment${unstampedOverdue.length > 1 ? 's' : ''} marked as overdue`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update payments');
    }
  };

  const stats = {
    total: payments.reduce((s, p) => s + p.totalAmount, 0),
    paid: payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.totalAmount, 0),
    pending: payments.filter((p) => p.status === 'pending').reduce((s, p) => s + p.totalAmount, 0),
    overdue: payments.filter((p) => p.status === 'overdue').reduce((s, p) => s + p.totalAmount, 0),
  };

  const handleStatusChange = async (paymentId: string, newStatus: PaymentStatus) => {
    const prev = payments;
    setPayments((ps) => ps.map((p) => p.id === paymentId ? { ...p, status: newStatus } : p));
    try {
      const updated = await updatePaymentStatusRecord(paymentId, newStatus);
      setPayments((ps) => ps.map((p) => p.id === paymentId ? updated : p));
      toast.success(`Payment marked as ${statusLabel[newStatus]}`);
    } catch (err) {
      setPayments(prev);
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Tenant', 'Property', 'Room', 'Monthly Rent', 'Extra Charges', 'Total', 'Due Date', 'Paid On', 'Status'];
    const rows = filteredPayments.map((p) => [
      p.tenant,
      getPropertyName(p.propertyId),
      p.room,
      p.monthlyRent,
      p.extraCharges,
      p.totalAmount,
      p.dueDate,
      p.paidDate || '',
      p.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Payments exported to CSV');
  };

  const handleOpenReceipt = (payment: PaymentRecord) => {
    openReceiptWindow({
      payment,
      propertyName: getPropertyName(payment.propertyId),
    });
  };

  const handleAddCharge = async () => {
    if (!selectedPayment || chargeForm.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setChargeSaving(true);
    try {
      const updated = await addPaymentChargeRecord(selectedPayment.id, {
        type: chargeForm.type,
        description: chargeForm.description || undefined,
        amount: chargeForm.amount,
      });
      setPayments((ps) => ps.map((p) => p.id === updated.id ? updated : p));
      setAddChargeOpen(false);
      setSelectedPayment(null);
      setChargeForm({ amount: 0, description: '', type: 'other' });
      toast.success(`Extra charge of ₹${chargeForm.amount} added`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add charge');
    } finally {
      setChargeSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen pb-20 md:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-4 bg-gradient-to-r from-purple-50 via-white to-blue-50 backdrop-blur-sm border-b border-gray-200 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Payments
            </h1>
            <p className="text-sm text-gray-600 mt-1">Track and manage all rent payments</p>
          </div>
          <Button onClick={handleExportCSV} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/30 w-full md:w-auto h-12 md:h-10">
            <Download className="w-5 h-5 mr-2" />
            <span className="font-semibold">Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[
          { label: 'Total Amount', value: stats.total, color: 'from-blue-500 to-cyan-500', icon: IndianRupee, textColor: '' },
          { label: 'Paid', value: stats.paid, color: 'from-green-500 to-emerald-500', icon: CheckCircle, textColor: 'text-green-600' },
          { label: 'Pending', value: stats.pending, color: 'from-amber-500 to-orange-500', icon: Clock, textColor: 'text-amber-600' },
          { label: 'Overdue', value: stats.overdue, color: 'from-red-500 to-rose-500', icon: AlertCircle, textColor: 'text-red-600' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-10`} />
              <CardContent className="relative p-4 md:p-6">
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 md:p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                    <Icon className="w-4 h-4 md:w-6 md:h-6 text-white" />
                  </div>
                </div>
                <p className="text-xs md:text-sm text-gray-600 mb-1 font-medium">{stat.label}</p>
                <p className={`text-xl md:text-2xl font-bold ${stat.textColor || 'bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text text-transparent'}`}>
                  ₹{stat.value.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Overdue detection banner */}
      {unstampedOverdue.length > 0 && (
        <div className="mb-4 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-800">
              {unstampedOverdue.length} pending payment{unstampedOverdue.length > 1 ? 's are' : ' is'} past due date
            </p>
            <p className="text-xs text-red-600">These payments have not been collected and their due date has passed.</p>
          </div>
          <Button size="sm" onClick={() => void markAllOverdue()} className="bg-red-600 hover:bg-red-700 text-white h-8 text-xs flex-shrink-0">
            Mark {unstampedOverdue.length > 1 ? 'All' : ''} Overdue
          </Button>
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['all', 'paid', 'pending', 'overdue'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
              filterStatus === s
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-300 hover:shadow-md'
            }`}
          >
            {s === 'all' ? 'All' : statusLabel[s]}
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block border-0 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
                  {['Tenant', 'Property', 'Room', 'Monthly Rent', 'Extra', 'Total', 'Due Date', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left py-4 px-4 text-xs font-bold text-purple-700 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPayments.length === 0 ? (
                  <tr><td colSpan={9} className="py-12 text-center text-gray-400 text-sm">No payments found</td></tr>
                ) : filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all duration-200">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold text-sm">
                            {payment.tenant.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{payment.tenant}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm font-medium text-gray-700">{getPropertyName(payment.propertyId)}</td>
                    <td className="py-4 px-4">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center shadow-md">
                        <span className="text-white text-xs font-bold">{payment.room}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm font-bold text-gray-900">₹{payment.monthlyRent.toLocaleString()}</td>
                    <td className="py-4 px-4 text-sm font-bold text-purple-700">₹{payment.extraCharges.toLocaleString()}</td>
                    <td className="py-4 px-4 text-base font-bold text-green-700">₹{payment.totalAmount.toLocaleString()}</td>
                    <td className="py-4 px-4 text-sm text-gray-700">
                      {new Date(payment.dueDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-4 px-4">
                      <div className="relative inline-block">
                        <select
                          value={payment.status}
                          onChange={(e) => void handleStatusChange(payment.id, e.target.value as PaymentStatus)}
                          className={`appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-bold border-0 cursor-pointer shadow-sm ${statusColor[payment.status]}`}
                        >
                          <option value="paid">Paid</option>
                          <option value="pending">Pending</option>
                          <option value="overdue">Overdue</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-white" />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedPayment(payment); setAddChargeOpen(true); }} className="h-9 w-9 p-0 rounded-full hover:bg-purple-100" title="Add extra charge">
                          <Plus className="w-4 h-4 text-purple-600" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full hover:bg-green-100" title="Send WhatsApp reminder" onClick={() => toast.info('WhatsApp integration coming soon')}>
                          <MessageCircle className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full hover:bg-blue-100" title="View receipt" onClick={() => handleOpenReceipt(payment)}>
                          <Receipt className="w-4 h-4 text-blue-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No payments found</div>
        ) : filteredPayments.map((payment) => (
          <Card key={payment.id} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-lg">
                    {payment.tenant.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-lg truncate">{payment.tenant}</h3>
                  <p className="text-sm text-gray-600 truncate">{getPropertyName(payment.propertyId)}</p>
                  <div className="mt-2">
                    <select
                      value={payment.status}
                      onChange={(e) => void handleStatusChange(payment.id, e.target.value as PaymentStatus)}
                      className={`appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-bold border-0 cursor-pointer shadow-md ${statusColor[payment.status]}`}
                    >
                      <option value="paid">Paid</option>
                      <option value="pending">Pending</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Home className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600">Room</span>
                  </div>
                  <span className="font-bold text-gray-900">{payment.room}</span>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Monthly Rent</span>
                    <span className="font-bold text-gray-900">₹{payment.monthlyRent.toLocaleString()}</span>
                  </div>
                  {payment.extraCharges > 0 && (
                    <div className="flex items-center justify-between mb-2 pt-2 border-t border-green-200">
                      <span className="text-sm font-medium text-purple-700">Extra Charges</span>
                      <span className="font-bold text-purple-700">₹{payment.extraCharges.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t-2 border-green-300">
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-bold text-green-800">Total</span>
                    </div>
                    <span className="text-xl font-bold text-green-700">₹{payment.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-xs text-gray-600">Due Date</p>
                    <p className="font-semibold text-gray-900">{new Date(payment.dueDate).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button onClick={() => { setSelectedPayment(payment); setAddChargeOpen(true); }} className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-md h-11">
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
                <Button variant="outline" className="border-2 border-green-300 hover:bg-green-50 h-11" onClick={() => toast.info('WhatsApp integration coming soon')}>
                  <MessageCircle className="w-4 h-4 mr-1 text-green-600" /> Send
                </Button>
                <Button variant="outline" className="border-2 border-blue-300 hover:bg-blue-50 h-11" onClick={() => handleOpenReceipt(payment)}>
                  <Receipt className="w-4 h-4 mr-1 text-blue-600" /> Receipt
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Extra Charge Modal */}
      <Dialog open={addChargeOpen} onOpenChange={setAddChargeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" /> Add Extra Charge
            </DialogTitle>
            <DialogDescription>Add additional charges for {selectedPayment?.tenant}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedPayment && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200">
                <div className="flex items-center gap-3 mb-2">
                  <User className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-gray-900">{selectedPayment.tenant}</span>
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Current Extra Charges:</span> ₹{selectedPayment.extraCharges.toLocaleString()}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Charge Type</Label>
              <select
                value={chargeForm.type}
                onChange={(e) => setChargeForm({ ...chargeForm, type: e.target.value })}
                className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="electricity">Electricity</option>
                <option value="water">Water</option>
                <option value="maintenance">Maintenance</option>
                <option value="late_fee">Late Fee</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Amount (₹) *</Label>
              <Input type="number" min="0" placeholder="500" value={chargeForm.amount || ''} onChange={(e) => setChargeForm({ ...chargeForm, amount: parseInt(e.target.value) || 0 })} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Description</Label>
              <textarea
                placeholder="e.g., Electricity bill for April"
                value={chargeForm.description}
                onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            {chargeForm.amount > 0 && selectedPayment && (
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">New Total:</span>
                  <span className="text-2xl font-bold text-green-700">
                    ₹{(selectedPayment.totalAmount + chargeForm.amount).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddChargeOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleAddCharge()} disabled={chargeSaving} className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
              {chargeSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Add Charge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
