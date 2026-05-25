"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  User,
  CreditCard,
  MessageCircle,
  Users,
  Crown,
  FileText,
  Bell,
  Shield,
  Globe,
  AlertTriangle,
  Check,
  Plus,
  Trash,
  Edit,
  Calendar,
  DollarSign,
  Settings as SettingsIcon,
  Wrench,
  Home
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Manager' | 'Viewer';
  properties: string;
  status: 'Active' | 'Pending';
  avatar: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  actionType: 'Payment' | 'Tenant' | 'Settings' | 'Maintenance';
  affectedRecord: string;
}

export function SettingsV2() {
  const [activeTab, setActiveTab] = useState('basic');
  const [notifications, setNotifications] = useState({
    paymentReminders: true,
    maintenanceUpdates: true,
    newTenants: false,
    announcements: true
  });

  const [whatsappTemplates, setWhatsappTemplates] = useState({
    paymentReminder: true,
    maintenanceUpdate: true,
    welcomeMessage: false,
    rentReceipt: true
  });

  const teamMembers: TeamMember[] = [
    {
      id: '1',
      name: 'Arjun Kapoor',
      email: 'arjun@rentcare.com',
      role: 'Owner',
      properties: 'All Properties',
      status: 'Active',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun'
    },
    {
      id: '2',
      name: 'Meera Singh',
      email: 'meera@rentcare.com',
      role: 'Manager',
      properties: 'Green Valley, Sunrise',
      status: 'Active',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Meera'
    },
    {
      id: '3',
      name: 'Karan Patel',
      email: 'karan@rentcare.com',
      role: 'Viewer',
      properties: 'Ocean View',
      status: 'Active',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Karan'
    },
    {
      id: '4',
      name: 'Priya Reddy',
      email: 'priya@rentcare.com',
      role: 'Manager',
      properties: 'Green Valley',
      status: 'Pending',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PriyaR'
    }
  ];

  const auditLogs: AuditLogEntry[] = [
    {
      id: '1',
      timestamp: '2026-05-12 14:30:22',
      user: 'Arjun Kapoor',
      action: 'Updated payment status',
      actionType: 'Payment',
      affectedRecord: 'Payment #1234 - Rajesh Kumar'
    },
    {
      id: '2',
      timestamp: '2026-05-12 13:15:10',
      user: 'Meera Singh',
      action: 'Added new tenant',
      actionType: 'Tenant',
      affectedRecord: 'Sneha Desai - Room A-204'
    },
    {
      id: '3',
      timestamp: '2026-05-12 12:45:33',
      user: 'Arjun Kapoor',
      action: 'Changed WhatsApp settings',
      actionType: 'Settings',
      affectedRecord: 'Payment reminder template enabled'
    },
    {
      id: '4',
      timestamp: '2026-05-12 11:20:15',
      user: 'Karan Patel',
      action: 'Updated maintenance ticket',
      actionType: 'Maintenance',
      affectedRecord: 'Ticket MNT-2026-178 status changed to In Progress'
    },
    {
      id: '5',
      timestamp: '2026-05-12 10:05:44',
      user: 'Meera Singh',
      action: 'Updated payment status',
      actionType: 'Payment',
      affectedRecord: 'Payment #1235 - Amit Patel'
    },
    {
      id: '6',
      timestamp: '2026-05-11 18:22:11',
      user: 'Arjun Kapoor',
      action: 'Removed tenant',
      actionType: 'Tenant',
      affectedRecord: 'Vikram Joshi - Room B-103'
    },
    {
      id: '7',
      timestamp: '2026-05-11 16:45:28',
      user: 'Meera Singh',
      action: 'Resolved maintenance ticket',
      actionType: 'Maintenance',
      affectedRecord: 'Ticket MNT-2026-175 marked as Resolved'
    }
  ];

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Owner':
        return 'bg-purple-100 text-purple-700';
      case 'Manager':
        return 'bg-blue-100 text-blue-700';
      case 'Viewer':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-700';
      case 'Pending':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getActionTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'Payment':
        return 'bg-green-100 text-green-700';
      case 'Tenant':
        return 'bg-blue-100 text-blue-700';
      case 'Settings':
        return 'bg-purple-100 text-purple-700';
      case 'Maintenance':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-white border border-[#E2E8F0] flex-wrap">
          <TabsTrigger value="basic" className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white">
            <User className="w-4 h-4 mr-2" />
            Basic
          </TabsTrigger>
          <TabsTrigger value="payment" className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white">
            <CreditCard className="w-4 h-4 mr-2" />
            Payment Settings
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white">
            <MessageCircle className="w-4 h-4 mr-2" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="team" className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-2" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="subscription" className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white">
            <Crown className="w-4 h-4 mr-2" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white">
            <FileText className="w-4 h-4 mr-2" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        {/* Basic Tab */}
        <TabsContent value="basic">
          <div className="space-y-6">
            {/* Profile Section */}
            <Card className="border-[#E2E8F0]">
              <CardHeader>
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-6">
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=ArjunOwner"
                    alt="Profile"
                    className="w-20 h-20 rounded-full"
                  />
                  <Button variant="outline">Change Avatar</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue="Arjun Kapoor" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue="arjun@rentcare.com" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notifications Section */}
            <Card className="border-[#E2E8F0]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={key} className="cursor-pointer">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </Label>
                    <button
                      onClick={() => setNotifications({ ...notifications, [key]: !value })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        value ? 'bg-[#4F46E5]' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Security Section */}
            <Card className="border-[#E2E8F0]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline">Change Password</Button>
                <Button variant="outline">Enable Two-Factor Authentication</Button>
              </CardContent>
            </Card>

            {/* Preferences Section */}
            <Card className="border-[#E2E8F0]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="language">Language</Label>
                  <select id="language" className="w-full mt-1 px-3 py-2 border border-[#E2E8F0] rounded-lg">
                    <option>English</option>
                    <option>Hindi</option>
                    <option>Tamil</option>
                    <option>Telugu</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <select id="timezone" className="w-full mt-1 px-3 py-2 border border-[#E2E8F0] rounded-lg">
                    <option>IST (UTC+5:30)</option>
                    <option>EST (UTC-5:00)</option>
                    <option>PST (UTC-8:00)</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <select id="currency" className="w-full mt-1 px-3 py-2 border border-[#E2E8F0] rounded-lg">
                    <option>INR (₹)</option>
                    <option>USD ($)</option>
                    <option>EUR (€)</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-red-900">Delete Account</h4>
                    <p className="text-sm text-red-600">Permanently delete your account and all data</p>
                  </div>
                  <Button variant="destructive">Delete Account</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payment Settings Tab */}
        <TabsContent value="payment">
          <div className="space-y-6">
            <Card className="border-[#E2E8F0]">
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="upi">UPI ID</Label>
                  <Input id="upi" placeholder="yourname@upi" defaultValue="arjun@paytm" />
                  <p className="text-xs text-gray-500 mt-1">This will be shown to tenants for payments</p>
                </div>
                <div>
                  <Label htmlFor="bank">Bank Account Number</Label>
                  <Input id="bank" placeholder="XXXX XXXX XXXX 1234" defaultValue="**** **** **** 5678" />
                  <p className="text-xs text-gray-500 mt-1">For rent deposits and refunds</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#E2E8F0] bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Payment Gateway Integration</h4>
                    <p className="text-sm text-blue-700">
                      Upgrade to Pro to accept payments directly through the platform with automated tracking and receipts.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp">
          <div className="space-y-6">
            <Card className="border-[#E2E8F0]">
              <CardHeader>
                <CardTitle>WhatsApp Connection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-green-900">Connected</span>
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input value="+91 98765 43210" disabled />
                </div>
                <div>
                  <Label>Monthly Usage</Label>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>125 / 500 messages</span>
                      <span>25%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-[#4F46E5] h-2 rounded-full" style={{ width: '25%' }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#E2E8F0]">
              <CardHeader>
                <CardTitle>Message Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(whatsappTemplates).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 border border-[#E2E8F0] rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </h4>
                      <p className="text-sm text-gray-500">Automated message template</p>
                    </div>
                    <button
                      onClick={() => setWhatsappTemplates({ ...whatsappTemplates, [key]: !value })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        value ? 'bg-[#4F46E5]' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Team Members Tab */}
        <TabsContent value="team">
          <Card className="border-[#E2E8F0]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Team Members</CardTitle>
              <Button className="bg-[#4F46E5] hover:bg-[#4338CA] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E2E8F0]">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Member</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Role</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Properties</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="border-b border-[#E2E8F0] hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-8 h-8 rounded-full"
                            />
                            <span className="text-sm font-medium text-gray-900">{member.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{member.email}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                            {member.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{member.properties}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(member.status)}`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash className="w-4 h-4" />
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
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription">
          <div className="space-y-6">
            {/* Current Plan */}
            <Card className="border-[#E2E8F0]">
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Plan</h3>
                    <p className="text-gray-600 mb-4">Basic features for small landlords</p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-600" />
                        Up to 10 tenants
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-600" />
                        Basic payment tracking
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-600" />
                        500 WhatsApp messages/month
                      </li>
                    </ul>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900">₹0</div>
                    <div className="text-sm text-gray-500">/month</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upgrade Card */}
            <Card className="border-[#4F46E5] bg-gradient-to-br from-purple-50 to-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-[#4F46E5]" />
                  Upgrade to Pro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro Plan</h3>
                    <p className="text-gray-600 mb-4">Advanced features for professional property managers</p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                        <Check className="w-4 h-4 text-[#4F46E5]" />
                        Unlimited tenants
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                        <Check className="w-4 h-4 text-[#4F46E5]" />
                        Integrated payment gateway
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                        <Check className="w-4 h-4 text-[#4F46E5]" />
                        Unlimited WhatsApp messages
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                        <Check className="w-4 h-4 text-[#4F46E5]" />
                        Team collaboration
                      </li>
                      <li className="flex items-center gap-2 text-sm text-gray-900 font-medium">
                        <Check className="w-4 h-4 text-[#4F46E5]" />
                        Advanced analytics
                      </li>
                    </ul>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-[#4F46E5]">₹999</div>
                    <div className="text-sm text-gray-500">/month</div>
                  </div>
                </div>
                <Button className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white">
                  Upgrade Now
                </Button>
              </CardContent>
            </Card>

            {/* Billing History */}
            <Card className="border-[#E2E8F0]">
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <p>No billing history available</p>
                  <p className="text-sm">You are currently on the Free plan</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <Card className="border-[#E2E8F0]">
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-2">
                <Button variant="outline" size="sm">All</Button>
                <Button variant="outline" size="sm">Payments</Button>
                <Button variant="outline" size="sm">Tenants</Button>
                <Button variant="outline" size="sm">Settings</Button>
                <Button variant="outline" size="sm">Maintenance</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E2E8F0]">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Timestamp</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">User</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Action</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Affected Record</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-[#E2E8F0] hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-600">{log.timestamp}</td>
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{log.user}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getActionTypeBadgeColor(log.actionType)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{log.affectedRecord}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
