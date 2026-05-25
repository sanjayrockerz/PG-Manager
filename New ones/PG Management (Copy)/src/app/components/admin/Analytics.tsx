import { Card } from '../ui/card';
import { Button } from '../ui/button';

const features = [
  { name: 'Payments', count: 1247, percentage: 89 },
  { name: 'Tenants', count: 634, percentage: 78 },
  { name: 'Maintenance', count: 432, percentage: 65 },
  { name: 'Announcements', count: 287, percentage: 54 },
  { name: 'WhatsApp', count: 156, percentage: 42 },
  { name: 'Documents', count: 89, percentage: 31 },
];

const cities = [
  { name: 'Jaipur', count: 28 },
  { name: 'Bangalore', count: 19 },
  { name: 'Mumbai', count: 14 },
  { name: 'Delhi', count: 11 },
  { name: 'Pune', count: 8 },
  { name: 'Others', count: 22 },
];

const activeOwners = [
  { rank: 1, owner: 'Raj Mehta', logins: 247, lastActive: '2 hours ago', properties: 2, tenants: 8 },
  { rank: 2, owner: 'Anita Sharma', logins: 198, lastActive: '1 day ago', properties: 5, tenants: 24 },
  { rank: 3, owner: 'Priya Singh', logins: 156, lastActive: '5 hours ago', properties: 3, tenants: 12 },
];

const churnRisk = [
  { owner: 'Vikram Patel', plan: 'Pro', lastLogin: 'Apr 15, 2026', days: 27 },
  { owner: 'Suresh Kumar', plan: 'Free', lastLogin: 'Apr 28, 2026', days: 14 },
];

export function Analytics() {
  const maxCount = Math.max(...cities.map((c) => c.count));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
      </div>

      {/* Charts Placeholder */}
      <Card className="p-6">
        <h2 className="font-bold text-gray-900 mb-4">User Growth (12 Months)</h2>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
          Line chart placeholder
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-bold text-gray-900 mb-4">Revenue Trend (12 Months)</h2>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
          Bar chart placeholder
        </div>
      </Card>

      {/* Feature Usage & Cities */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-bold text-gray-900 mb-4">Feature Usage</h2>
          <div className="space-y-4">
            {features.map((feature) => (
              <div key={feature.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">{feature.name}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {feature.count} <span className="text-gray-500">({feature.percentage}%)</span>
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${feature.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-bold text-gray-900 mb-4">Top Cities</h2>
          <div className="space-y-4">
            {cities.map((city) => (
              <div key={city.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">{city.name}</span>
                  <span className="text-sm font-medium text-gray-900">{city.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(city.count / maxCount) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Active Owners & Churn Risk */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-bold text-gray-900 mb-4">Most Active Owners</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 text-left text-xs font-semibold text-gray-600 uppercase">Rank</th>
                  <th className="py-2 text-left text-xs font-semibold text-gray-600 uppercase">Owner</th>
                  <th className="py-2 text-left text-xs font-semibold text-gray-600 uppercase">Logins</th>
                  <th className="py-2 text-left text-xs font-semibold text-gray-600 uppercase">Properties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activeOwners.map((owner) => (
                  <tr key={owner.rank}>
                    <td className="py-3 text-sm text-gray-900">{owner.rank}</td>
                    <td className="py-3 text-sm font-medium text-gray-900">{owner.owner}</td>
                    <td className="py-3 text-sm text-gray-600">{owner.logins}</td>
                    <td className="py-3 text-sm text-gray-600">{owner.properties}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-bold text-gray-900 mb-4">Churn Risk</h2>
          <div className="space-y-3">
            {churnRisk.map((owner, index) => (
              <div key={index} className="p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{owner.owner}</p>
                    <p className="text-sm text-gray-600">{owner.plan}</p>
                    <p className="text-xs text-gray-500">
                      Last login: {owner.lastLogin} ({owner.days} days ago)
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="text-xs text-red-600 border-red-300">
                  Send Re-engagement
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
