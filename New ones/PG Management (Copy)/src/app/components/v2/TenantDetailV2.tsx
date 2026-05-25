"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  ArrowLeft,
  Download,
  Plus,
  FileText,
  Calendar,
  DollarSign,
  Wrench,
  User,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';

interface Payment {
  id: string;
  date: string;
  monthlyRent: number;
  extraCharges: number;
  total: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  receiptUrl?: string;
}

interface ExtraCharge {
  id: string;
  type: string;
  description: string;
  amount: number;
  date: string;
  status: 'Pending' | 'Paid';
}

interface MaintenanceTicket {
  id: string;
  ticketId: string;
  issue: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'Open' | 'In Progress' | 'Resolved';
  date: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedDate: string;
  url: string;
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  property: string;
  room: string;
  monthlyRent: number;
  moveInDate: string;
  status: 'Active' | 'Inactive';
}

interface TenantDetailV2Props {
  tenantId?: string;
  onBack?: () => void;
}

export function TenantDetailV2({ tenantId, onBack }: TenantDetailV2Props) {
  const [activeTab, setActiveTab] = useState('payments');

  // Demo data
  const tenant: Tenant = {
    id: tenantId || '1',
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@email.com',
    phone: '+91 98765 43210',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rajesh',
    property: 'Green Valley Apartments',
    room: 'A-201',
    monthlyRent: 15000,
    moveInDate: '2024-01-15',
    status: 'Active'
  };

  const payments: Payment[] = [
    {
      id: '1',
      date: '2024-05-01',
      monthlyRent: 15000,
      extraCharges: 500,
      total: 15500,
      status: 'Paid',
      receiptUrl: '#'
    },
    {
      id: '2',
      date: '2024-04-01',
      monthlyRent: 15000,
      extraCharges: 0,
      total: 15000,
      status: 'Paid',
      receiptUrl: '#'
    },
    {
      id: '3',
      date: '2024-03-01',
      monthlyRent: 15000,
      extraCharges: 1000,
      total: 16000,
      status: 'Paid',
      receiptUrl: '#'
    },
    {
      id: '4',
      date: '2024-02-01',
      monthlyRent: 15000,
      extraCharges: 0,
      total: 15000,
      status: 'Paid',
      receiptUrl: '#'
    }
  ];

  const extraCharges: ExtraCharge[] = [
    {
      id: '1',
      type: 'Maintenance',
      description: 'AC Repair',
      amount: 500,
      date: '2024-05-10',
      status: 'Paid'
    },
    {
      id: '2',
      type: 'Utilities',
      description: 'Electricity Overage',
      amount: 1000,
      date: '2024-03-15',
      status: 'Paid'
    },
    {
      id: '3',
      type: 'Late Fee',
      description: 'Late Payment Penalty',
      amount: 200,
      date: '2024-02-05',
      status: 'Paid'
    }
  ];

  const maintenanceTickets: MaintenanceTicket[] = [
    {
      id: '1',
      ticketId: 'MNT-2024-156',
      issue: 'AC not cooling properly',
      priority: 'HIGH',
      status: 'Resolved',
      date: '2024-05-08'
    },
    {
      id: '2',
      ticketId: 'MNT-2024-089',
      issue: 'Leaking faucet in bathroom',
      priority: 'MEDIUM',
      status: 'Resolved',
      date: '2024-04-12'
    },
    {
      id: '3',
      ticketId: 'MNT-2024-034',
      issue: 'Door lock replacement needed',
      priority: 'LOW',
      status: 'Resolved',
      date: '2024-03-20'
    }
  ];

  const documents: Document[] = [
    {
      id: '1',
      name: 'Rental Agreement.pdf',
      type: 'PDF',
      size: '2.4 MB',
      uploadedDate: '2024-01-15',
      url: '#'
    },
    {
      id: '2',
      name: 'ID Proof - Aadhaar.pdf',
      type: 'PDF',
      size: '1.1 MB',
      uploadedDate: '2024-01-15',
      url: '#'
    },
    {
      id: '3',
      name: 'Police Verification.pdf',
      type: 'PDF',
      size: '856 KB',
      uploadedDate: '2024-01-20',
      url: '#'
    },
    {
      id: '4',
      name: 'Security Deposit Receipt.pdf',
      type: 'PDF',
      size: '324 KB',
      uploadedDate: '2024-01-15',
      url: '#'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
      case 'Active':
        return 'bg-green-100 text-green-700';
      case 'Pending':
        return 'bg-amber-100 text-amber-700';
      case 'Overdue':
      case 'Inactive':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-700';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-700';
      case 'LOW':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTicketStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-red-100 text-red-700';
      case 'In Progress':
        return 'bg-amber-100 text-amber-700';
      case 'Resolved':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={onBack || (() => window.history.back())}
          className="mb-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tenants
        </Button>

        {/* Tenant Profile Card */}
        <Card className="border-[#E2E8F0]">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <img
                src={tenant.avatar}
                alt={tenant.name}
                className="w-24 h-24 rounded-full"
              />
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{tenant.name}</h1>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(tenant.status)}`}>
                      {tenant.status}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Monthly Rent</div>
                    <div className="text-2xl font-bold text-gray-900">₹{tenant.monthlyRent.toLocaleString()}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">{tenant.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{tenant.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{tenant.property}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="w-4 h-4" />
                    <span className="text-sm">Room: {tenant.room}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-gray-500 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>Move-in Date: {new Date(tenant.moveInDate).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-white border border-[#E2E8F0]">
          <TabsTrigger value="payments" className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white">
            <DollarSign className="w-4 h-4 mr-2" />
            Payment History
          </TabsTrigger>
          <TabsTrigger value="charges" className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white">
            <Plus className="w-4 h-4 mr-2" />
            Extra Charges
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white">
            <Wrench className="w-4 h-4 mr-2" />
            Maintenance
          </TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white">
            <FileText className="w-4 h-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* Payment History Tab */}
        <TabsContent value="payments">
          <Card className="border-[#E2E8F0]">
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E2E8F0]">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Monthly Rent</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Extra Charges</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Total</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-[#E2E8F0] hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {new Date(payment.date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          ₹{payment.monthlyRent.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          ₹{payment.extraCharges.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">
                          ₹{payment.total.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {payment.receiptUrl && (
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Extra Charges Tab */}
        <TabsContent value="charges">
          <Card className="border-[#E2E8F0]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Extra Charges</CardTitle>
              <Button className="bg-[#4F46E5] hover:bg-[#4338CA] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Charge
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E2E8F0]">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Description</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extraCharges.map((charge) => (
                      <tr key={charge.id} className="border-b border-[#E2E8F0] hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{charge.type}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{charge.description}</td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">
                          ₹{charge.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {new Date(charge.date).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(charge.status)}`}>
                            {charge.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          <Card className="border-[#E2E8F0]">
            <CardHeader>
              <CardTitle>Maintenance Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E2E8F0]">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Ticket ID</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Issue</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Priority</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenanceTickets.map((ticket) => (
                      <tr key={ticket.id} className="border-b border-[#E2E8F0] hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{ticket.ticketId}</td>
                        <td className="py-3 px-4 text-sm text-gray-900">{ticket.issue}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTicketStatusColor(ticket.status)}`}>
                            {ticket.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900">
                          {new Date(ticket.date).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="border-[#E2E8F0] hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-[#4F46E5] bg-opacity-10 rounded-lg">
                      <FileText className="w-6 h-6 text-[#4F46E5]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 mb-1 truncate">{doc.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">{doc.type} - {doc.size}</p>
                      <p className="text-xs text-gray-400">
                        Uploaded: {new Date(doc.uploadedDate).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4 bg-[#4F46E5] hover:bg-[#4338CA] text-white"
                    onClick={() => window.open(doc.url, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
