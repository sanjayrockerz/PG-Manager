import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

export function PlatformSettings() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="email">Email Templates</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="font-bold text-gray-900 mb-4">Platform Details</h2>
              <div className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="platform-name">Platform Name</Label>
                  <Input id="platform-name" defaultValue="RentCare" />
                </div>
                <div>
                  <Label htmlFor="support-email">Support Email</Label>
                  <Input id="support-email" type="email" defaultValue="support@rentcare.com" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="font-bold text-gray-900 mb-4">Maintenance Mode</h2>
              <div className="flex items-center justify-between max-w-md mb-3">
                <div>
                  <p className="font-medium text-gray-900">Enable Maintenance Mode</p>
                  <p className="text-sm text-gray-500">Shows maintenance page to all users</p>
                </div>
                <Switch />
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                ⚠️ Enabling this shows maintenance page to all users
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="font-bold text-gray-900 mb-4">Feature Flags</h2>
              <div className="space-y-4 max-w-md">
                {[
                  { name: 'WhatsApp Integration', enabled: true },
                  { name: 'AI Assistant', enabled: false },
                  { name: 'Tenant Portal', enabled: true },
                  { name: 'Multi-User', enabled: true },
                  { name: 'Receipt Generation', enabled: true },
                  { name: 'Building View', enabled: false },
                ].map((feature) => (
                  <div key={feature.name} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{feature.name}</span>
                    <Switch defaultChecked={feature.enabled} />
                  </div>
                ))}
              </div>
            </Card>

            <Button className="bg-purple-600 hover:bg-purple-700">Save Changes</Button>
          </div>
        </TabsContent>

        <TabsContent value="email">
          <Card className="p-6">
            <h2 className="font-bold text-gray-900 mb-4">Email Templates</h2>
            <div className="space-y-3">
              {[
                { name: 'Welcome Email', desc: 'Sent when new owner signs up', edited: 'May 1, 2026' },
                { name: 'Rent Reminder', desc: 'Sent to tenants before rent due', edited: 'Apr 28, 2026' },
                { name: 'Payment Receipt', desc: 'Sent after payment received', edited: 'Apr 20, 2026' },
                { name: 'Subscription Confirmation', desc: 'Sent when owner upgrades plan', edited: 'Apr 15, 2026' },
                { name: 'Password Reset', desc: 'Sent when user requests password reset', edited: 'Apr 10, 2026' },
              ].map((template) => (
                <div key={template.name} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{template.name}</p>
                    <p className="text-sm text-gray-500">{template.desc}</p>
                    <p className="text-xs text-gray-400 mt-1">Last edited: {template.edited}</p>
                  </div>
                  <Button variant="outline" size="sm">Edit</Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <Card className="p-6">
            <h2 className="font-bold text-gray-900 mb-4">WhatsApp Configuration</h2>
            <div className="space-y-6 max-w-md">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium text-gray-900">Connected</span>
              </div>

              <div>
                <Label>Registered Phone Number</Label>
                <Input defaultValue="+91 98765 43210" disabled />
              </div>

              <div>
                <Label>Monthly Usage</Label>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">1,247 / 10,000 messages</span>
                    <span className="text-gray-900">12%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '12%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card className="p-6">
            <h2 className="font-bold text-gray-900 mb-4">Razorpay Integration</h2>
            <div className="space-y-6 max-w-md">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium text-gray-900">Connected</span>
              </div>

              <div>
                <Label>API Key</Label>
                <Input defaultValue="rzp_live_••••••••••••••••" disabled />
              </div>

              <div>
                <Label>Webhook URL</Label>
                <Input defaultValue="https://api.rentcare.com/webhooks/razorpay" disabled />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Test Mode</p>
                  <p className="text-sm text-gray-500">Use test API keys</p>
                </div>
                <Switch />
              </div>

              <Button variant="outline">Verify Connection</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="p-6">
            <h2 className="font-bold text-gray-900 mb-4">Admin Accounts</h2>
            <div className="overflow-x-auto mb-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                    <th className="py-2 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                    <th className="py-2 text-left text-xs font-semibold text-gray-600 uppercase">Last Login</th>
                    <th className="py-2 text-left text-xs font-semibold text-gray-600 uppercase">2FA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="py-3 text-sm text-gray-900">Khush Goyal</td>
                    <td className="py-3 text-sm text-gray-600">Super Admin</td>
                    <td className="py-3 text-sm text-gray-600">2 hours ago</td>
                    <td className="py-3">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        Enabled
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-4 max-w-md">
              <div>
                <Label>Session Timeout</Label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg mt-1">
                  <option>30 minutes</option>
                  <option>1 hour</option>
                  <option>2 hours</option>
                  <option>4 hours</option>
                </select>
              </div>

              <Button className="bg-purple-600 hover:bg-purple-700">
                Download Full Audit Log
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
