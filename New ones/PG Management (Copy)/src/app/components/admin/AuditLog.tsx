import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Download } from 'lucide-react';

const logs = [
  {
    timestamp: 'May 12, 2026 2:35 PM',
    admin: 'Khush Goyal',
    action: 'Changed plan',
    actionType: 'update',
    target: 'Raj Mehta',
    details: 'Pro to Scale',
    ip: '106.51.x.x',
  },
  {
    timestamp: 'May 12, 2026 11:20 AM',
    admin: 'Khush Goyal',
    action: 'Suspended account',
    actionType: 'delete',
    target: 'Anita Sharma',
    details: 'Non-payment',
    ip: '106.51.x.x',
  },
  {
    timestamp: 'May 11, 2026 4:15 PM',
    admin: 'Khush Goyal',
    action: 'Replied to ticket',
    actionType: 'create',
    target: '#47',
    details: 'Payment issue',
    ip: '106.51.x.x',
  },
  {
    timestamp: 'May 11, 2026 10:30 AM',
    admin: 'Khush Goyal',
    action: 'Updated email template',
    actionType: 'update',
    target: 'Welcome Email',
    details: 'Changed subject line',
    ip: '106.51.x.x',
  },
  {
    timestamp: 'May 10, 2026 9:00 AM',
    admin: 'Khush Goyal',
    action: 'Admin login',
    actionType: 'login',
    target: 'System',
    details: 'Successful login',
    ip: '106.51.x.x',
  },
  {
    timestamp: 'May 9, 2026 3:45 PM',
    admin: 'Khush Goyal',
    action: 'Feature flag enabled',
    actionType: 'update',
    target: 'AI Assistant',
    details: 'Enabled for all users',
    ip: '106.51.x.x',
  },
  {
    timestamp: 'May 9, 2026 11:15 AM',
    admin: 'Khush Goyal',
    action: 'Extended trial',
    actionType: 'update',
    target: 'Vikram Patel',
    details: '+14 days',
    ip: '106.51.x.x',
  },
];

export function AuditLog() {
  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'create':
        return 'text-green-700';
      case 'update':
        return 'text-amber-700';
      case 'delete':
        return 'text-red-700';
      case 'login':
        return 'text-blue-700';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">Complete record of all platform admin actions</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option>All Actions</option>
            <option>User Management</option>
            <option>Subscription</option>
            <option>Support</option>
            <option>Settings</option>
            <option>Login</option>
          </select>
          <Button variant="outline" size="sm" className="ml-auto">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </Card>

      {/* Table - Desktop */}
      <Card className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Admin</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Target</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Details</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-600">{log.timestamp}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{log.admin}</td>
                  <td className={`px-6 py-4 text-sm font-medium ${getActionColor(log.actionType)}`}>
                    {log.action}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{log.target}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{log.details}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {logs.map((log, index) => (
          <Card key={index} className="p-4">
            <div className="mb-2">
              <p className="text-xs text-gray-500">{log.timestamp}</p>
              <p className={`font-medium ${getActionColor(log.actionType)}`}>{log.action}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Admin:</span> {log.admin}
              </div>
              <div>
                <span className="text-gray-500">Target:</span> {log.target}
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Details:</span> {log.details}
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">IP:</span> <span className="font-mono">{log.ip}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
