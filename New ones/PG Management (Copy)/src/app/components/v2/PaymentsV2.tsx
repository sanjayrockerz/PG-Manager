"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';
import {
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  MessageCircle,
  Download,
  ChevronDown,
  IndianRupee,
  User,
  Home,
  Calendar,
  Save,
  Receipt,
  Sparkles
} from 'lucide-react';

interface PaymentRow {
  id: string;
  tenant: string;
  property: string;
  room: string;
  monthlyRent: number;
  extraCharges: number;
  total: number;
  dueDate: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  avatar: string;
}

export function PaymentsV2() {
  const [filterStatus, setFilterStatus] = useState<'All' | 'Paid' | 'Pending' | 'Overdue'>('All');

  // Add Extra Charge Modal
  const [addChargeOpen, setAddChargeOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [extraCharge, setExtraCharge] = useState({
    amount: 0,
    description: '',
  });

  const [payments, setPayments] = useState<PaymentRow[]>([
    {
      id: '1',
      tenant: 'Rajesh Kumar',
      property: 'Green Valley Apartments',
      room: 'A-201',
      monthlyRent: 15000,
      extraCharges: 500,
      total: 15500,
      dueDate: '2026-05-01',
      status: 'Paid',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rajesh'
    },
    {
      id: '2',
      tenant: 'Priya Sharma',
      property: 'Green Valley Apartments',
      room: 'A-202',
      monthlyRent: 15000,
      extraCharges: 0,
      total: 15000,
      dueDate: '2026-05-01',
      status: 'Pending',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya'
    },
    {
      id: '3',
      tenant: 'Amit Patel',
      property: 'Sunrise Residency',
      room: 'B-101',
      monthlyRent: 12000,
      extraCharges: 0,
      total: 12000,
      dueDate: '2026-04-25',
      status: 'Overdue',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amit'
    },
    {
      id: '4',
      tenant: 'Sneha Reddy',
      property: 'Sunrise Residency',
      room: 'B-102',
      monthlyRent: 12000,
      extraCharges: 1000,
      total: 13000,
      dueDate: '2026-05-01',
      status: 'Paid',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha'
    },
    {
      id: '5',
      tenant: 'Vikram Singh',
      property: 'Ocean View Plaza',
      room: 'C-301',
      monthlyRent: 18000,
      extraCharges: 0,
      total: 18000,
      dueDate: '2026-05-01',
      status: 'Pending',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram'
    },
    {
      id: '6',
      tenant: 'Anita Desai',
      property: 'Ocean View Plaza',
      room: 'C-302',
      monthlyRent: 18000,
      extraCharges: 500,
      total: 18500,
      dueDate: '2026-04-28',
      status: 'Overdue',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anita'
    },
    {
      id: '7',
      tenant: 'Rahul Mehta',
      property: 'Green Valley Apartments',
      room: 'A-203',
      monthlyRent: 15000,
      extraCharges: 0,
      total: 15000,
      dueDate: '2026-05-01',
      status: 'Paid',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul'
    }
  ]);

  const filteredPayments = payments.filter(
    payment => filterStatus === 'All' || payment.status === filterStatus
  );

  const stats = {
    total: payments.reduce((sum, p) => sum + p.total, 0),
    paid: payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.total, 0),
    pending: payments.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.total, 0),
    overdue: payments.filter(p => p.status === 'Overdue').reduce((sum, p) => sum + p.total, 0)
  };

  const handleStatusChange = (paymentId: string, newStatus: 'Paid' | 'Pending' | 'Overdue') => {
    setPayments(payments.map(p =>
      p.id === paymentId ? { ...p, status: newStatus } : p
    ));
    toast.success(`Payment status updated to ${newStatus}`);
  };

  const handleAddExtraCharge = () => {
    if (!selectedPayment || !extraCharge.amount) {
      toast.error('Please enter a valid amount');
      return;
    }

    setPayments(payments.map(p =>
      p.id === selectedPayment.id
        ? {
            ...p,
            extraCharges: p.extraCharges + extraCharge.amount,
            total: p.total + extraCharge.amount,
          }
        : p
    ));

    setAddChargeOpen(false);
    setSelectedPayment(null);
    setExtraCharge({ amount: 0, description: '' });
    toast.success(`Extra charge of ₹${extraCharge.amount} added successfully!`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-gradient-to-r from-green-400 to-emerald-400 text-white';
      case 'Pending':
        return 'bg-gradient-to-r from-amber-400 to-orange-400 text-white';
      case 'Overdue':
        return 'bg-gradient-to-r from-red-400 to-rose-400 text-white';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen pb-20 md:pb-6">
      {/* Sticky Header with Gradient */}
      <div className="sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-4 bg-gradient-to-r from-purple-50 via-white to-blue-50 backdrop-blur-sm border-b border-gray-200 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Payments
            </h1>
            <p className="text-sm text-gray-600 mt-1">Track and manage all rent payments</p>
          </div>
          <Button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg shadow-green-500/30 w-full md:w-auto h-12 md:h-10">
            <Download className="w-5 h-5 mr-2" />
            <span className="font-semibold">Export</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards - Enhanced */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 opacity-10" />
          <CardContent className="relative p-4 md:p-6">
            <div className="flex items-start justify-between mb-2">
              <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                <IndianRupee className="w-4 h-4 md:w-6 md:h-6 text-white" />
              </div>
            </div>
            <p className="text-xs md:text-sm text-gray-600 mb-1 font-medium">Total Amount</p>
            <p className="text-xl md:text-2xl font-bold bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text text-transparent">
              ₹{stats.total.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 opacity-10" />
          <CardContent className="relative p-4 md:p-6">
            <div className="flex items-start justify-between mb-2">
              <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg">
                <CheckCircle className="w-4 h-4 md:w-6 md:h-6 text-white" />
              </div>
            </div>
            <p className="text-xs md:text-sm text-gray-600 mb-1 font-medium">Paid</p>
            <p className="text-xl md:text-2xl font-bold text-green-600">₹{stats.paid.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500 opacity-10" />
          <CardContent className="relative p-4 md:p-6">
            <div className="flex items-start justify-between mb-2">
              <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
                <Clock className="w-4 h-4 md:w-6 md:h-6 text-white" />
              </div>
            </div>
            <p className="text-xs md:text-sm text-gray-600 mb-1 font-medium">Pending</p>
            <p className="text-xl md:text-2xl font-bold text-amber-600">₹{stats.pending.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-rose-500 opacity-10" />
          <CardContent className="relative p-4 md:p-6">
            <div className="flex items-start justify-between mb-2">
              <div className="p-2 md:p-3 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 shadow-lg">
                <AlertCircle className="w-4 h-4 md:w-6 md:h-6 text-white" />
              </div>
            </div>
            <p className="text-xs md:text-sm text-gray-600 mb-1 font-medium">Overdue</p>
            <p className="text-xl md:text-2xl font-bold text-red-600">₹{stats.overdue.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Chips - Enhanced */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['All', 'Paid', 'Pending', 'Overdue'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
              filterStatus === status
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-300 hover:shadow-md'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Payments Table - Desktop */}
      <Card className="hidden md:block border-0 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
                  <th className="text-left py-4 px-4 text-xs font-bold text-purple-700 uppercase tracking-wider">Tenant</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-purple-700 uppercase tracking-wider">Property</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-purple-700 uppercase tracking-wider">Room</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-purple-700 uppercase tracking-wider">Monthly Rent</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-purple-700 uppercase tracking-wider">Extra Charges</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-purple-700 uppercase tracking-wider">Total</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-purple-700 uppercase tracking-wider">Due Date</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-purple-700 uppercase tracking-wider">Status</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-purple-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all duration-200">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold text-sm">
                            {payment.tenant.split(' ').map((n) => n[0]).join('')}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{payment.tenant}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm font-medium text-gray-700">{payment.property}</td>
                    <td className="py-4 px-4">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center shadow-md">
                        <span className="text-white text-xs font-bold">{payment.room}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm font-bold text-gray-900">₹{payment.monthlyRent.toLocaleString()}</td>
                    <td className="py-4 px-4 text-sm font-bold text-purple-700">₹{payment.extraCharges.toLocaleString()}</td>
                    <td className="py-4 px-4 text-base font-bold text-green-700">₹{payment.total.toLocaleString()}</td>
                    <td className="py-4 px-4 text-sm text-gray-700">
                      {new Date(payment.dueDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-4 px-4">
                      <div className="relative inline-block">
                        <select
                          value={payment.status}
                          onChange={(e) => handleStatusChange(payment.id, e.target.value as any)}
                          className={`appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-bold border-0 cursor-pointer shadow-sm ${getStatusColor(payment.status)}`}
                        >
                          <option value="Paid">Paid</option>
                          <option value="Pending">Pending</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-white" />
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setAddChargeOpen(true);
                          }}
                          className="h-9 w-9 p-0 rounded-full hover:bg-purple-100"
                        >
                          <Plus className="w-4 h-4 text-purple-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 rounded-full hover:bg-green-100"
                        >
                          <MessageCircle className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 rounded-full hover:bg-blue-100"
                        >
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

      {/* Payment Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {filteredPayments.map((payment) => (
          <Card key={payment.id} className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                  <span className="text-white font-bold text-lg">
                    {payment.tenant.split(' ').map((n) => n[0]).join('')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-lg truncate">{payment.tenant}</h3>
                  <p className="text-sm text-gray-600 truncate">{payment.property}</p>
                  <div className="mt-2">
                    <select
                      value={payment.status}
                      onChange={(e) => handleStatusChange(payment.id, e.target.value as any)}
                      className={`appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-bold border-0 cursor-pointer shadow-md ${getStatusColor(payment.status)}`}
                    >
                      <option value="Paid">Paid</option>
                      <option value="Pending">Pending</option>
                      <option value="Overdue">Overdue</option>
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
                    <span className="text-xl font-bold text-green-700">₹{payment.total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-xs text-gray-600">Due Date</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(payment.dueDate).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => {
                    setSelectedPayment(payment);
                    setAddChargeOpen(true);
                  }}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-md h-11"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
                <Button
                  variant="outline"
                  className="border-2 border-green-300 hover:bg-green-50 h-11"
                >
                  <MessageCircle className="w-4 h-4 mr-1 text-green-600" />
                  Send
                </Button>
                <Button
                  variant="outline"
                  className="border-2 border-blue-300 hover:bg-blue-50 h-11"
                >
                  <Receipt className="w-4 h-4 mr-1 text-blue-600" />
                  Receipt
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
              <Sparkles className="w-6 h-6 text-purple-600" />
              Add Extra Charge
            </DialogTitle>
            <DialogDescription>
              Add additional charges for {selectedPayment?.tenant}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedPayment && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200">
                <div className="flex items-center gap-3 mb-2">
                  <User className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-gray-900">{selectedPayment.tenant}</span>
                </div>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Current Extra Charges:</span> ₹
                  {selectedPayment.extraCharges.toLocaleString()}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="charge-amount" className="text-sm font-semibold">
                Amount (₹) *
              </Label>
              <Input
                id="charge-amount"
                type="number"
                min="0"
                placeholder="500"
                value={extraCharge.amount || ''}
                onChange={(e) => setExtraCharge({ ...extraCharge, amount: parseInt(e.target.value) || 0 })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="charge-description" className="text-sm font-semibold">
                Description
              </Label>
              <textarea
                id="charge-description"
                placeholder="e.g., Electricity bill, Maintenance fee"
                value={extraCharge.description}
                onChange={(e) => setExtraCharge({ ...extraCharge, description: e.target.value })}
                className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            {extraCharge.amount > 0 && selectedPayment && (
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">New Total:</span>
                  <span className="text-2xl font-bold text-green-700">
                    ₹{(selectedPayment.total + extraCharge.amount).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddChargeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddExtraCharge}
              className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
            >
              <Save className="w-4 h-4 mr-2" />
              Add Charge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
