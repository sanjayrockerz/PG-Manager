import { useState } from 'react';
import { ArrowLeft, Mail, ChevronDown, Eye } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface UserDetailProps {
  ownerId: string;
  onBack: () => void;
}

const ownerData = {
  name: 'Raj Mehta',
  email: 'raj@example.com',
  phone: '+91 98765 43210',
  city: 'Jaipur',
  joined: 'Jan 15, 2025',
  plan: 'Pro',
  status: 'Active',
  properties: 2,
  tenants: 8,
  mrr: '₹3,000',
};

const properties = [
  { name: 'Sunshine PG', address: 'Malviya Nagar, Jaipur', floors: 3, rooms: 12, occupancy: '75%', tracking: 'Floor-wise' },
  { name: 'Royal Boys Hostel', address: 'Vaishali Nagar, Jaipur', floors: 2, rooms: 8, occupancy: '100%', tracking: 'Room-wise' },
];

const tenants = [
  { name: 'Amit Kumar', property: 'Sunshine PG', room: 'Floor 2', rent: '₹8,000', joinDate: 'Mar 2025', status: 'Active' },
  { name: 'Rahul Sharma', property: 'Sunshine PG', room: 'Floor 2', rent: '₹8,000', joinDate: 'Feb 2025', status: 'Active' },
  { name: 'Vikash Singh', property: 'Royal Boys Hostel', room: 'Room 101', rent: '₹7,500', joinDate: 'Jan 2025', status: 'Active' },
];

const payments = [
  { tenant: 'Amit Kumar', month: 'May 2025', amount: '₹8,000', extra: '₹0', status: 'Paid', date: 'May 1, 2025' },
  { tenant: 'Rahul Sharma', month: 'May 2025', amount: '₹8,000', extra: '₹200', status: 'Paid', date: 'May 3, 2025' },
  { tenant: 'Vikash Singh', month: 'May 2025', amount: '₹7,500', extra: '₹0', status: 'Pending', date: '-' },
];

export function UserDetail({ ownerId, onBack }: UserDetailProps) {
  const [activeTab, setActiveTab] = useState('properties');
  const [showNoteForm, setShowNoteForm] = useState(false);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back to All Owners</span>
      </button>

      {/* Owner Header */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Avatar and Info */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-2xl">RM</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{ownerData.name}</h1>
              <p className="text-sm text-gray-600">{ownerData.email}</p>
              <p className="text-sm text-gray-600">{ownerData.phone}</p>
              <p className="text-sm text-gray-500 mt-1">
                {ownerData.city} • Joined {ownerData.joined}
              </p>
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  {ownerData.plan}
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  {ownerData.status}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Properties</p>
              <p className="text-2xl font-bold text-gray-900">{ownerData.properties}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tenants</p>
              <p className="text-2xl font-bold text-gray-900">{ownerData.tenants}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{ownerData.mrr}</p>
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-200">
          <Button variant="outline" size="sm">
            <Mail className="w-4 h-4 mr-2" />
            Send Email
          </Button>
          <div className="relative">
            <Button variant="outline" size="sm">
              Change Plan
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <Button variant="outline" size="sm">
            Extend Trial
          </Button>
          <Button variant="outline" size="sm">
            Give Free Month
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50">
            Suspend Account
          </Button>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
            <Eye className="w-4 h-4 mr-2" />
            View As Owner
          </Button>
        </div>

        {/* Internal Note */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          {!showNoteForm ? (
            <button
              onClick={() => setShowNoteForm(true)}
              className="text-sm text-purple-600 hover:text-purple-700"
            >
              + Add internal note
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                rows={3}
                placeholder="Add a note (only visible to admins)..."
              />
              <div className="flex gap-2">
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                  Save Note
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowNoteForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Data Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="properties">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Address</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Floors</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rooms</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Occupancy</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tracking</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {properties.map((property, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{property.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{property.address}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{property.floors}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{property.rooms}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{property.occupancy}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{property.tracking}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="tenants">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Property</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Room</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rent</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Join Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tenants.map((tenant, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{tenant.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{tenant.property}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{tenant.room}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{tenant.rent}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{tenant.joinDate}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          {tenant.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tenant</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Month</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Extra Charges</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Paid Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map((payment, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{payment.tenant}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{payment.month}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{payment.amount}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{payment.extra}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          payment.status === 'Paid'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{payment.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance">
          <Card className="p-8 text-center text-gray-500">
            No maintenance requests yet
          </Card>
        </TabsContent>

        <TabsContent value="announcements">
          <Card className="p-8 text-center text-gray-500">
            No announcements yet
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card className="p-8 text-center text-gray-500">
            No team members yet
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card className="p-8 text-center text-gray-500">
            Activity log coming soon
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
