import { Card } from '../ui/card';
import { Button } from '../ui/button';

const stats = [
  { label: 'MRR', value: '₹68,000' },
  { label: 'New MRR', value: '₹12,400' },
  { label: 'Churned MRR', value: '₹3,200' },
  { label: 'Net Growth', value: '+₹9,200', positive: true },
];

const planDistribution = [
  { plan: 'Free', users: 156, mrr: '₹0', percentage: 79 },
  { plan: 'Pro', users: 38, mrr: '₹57,000', percentage: 19 },
  { plan: 'Scale', users: 4, mrr: '₹11,000', percentage: 2 },
];

const renewals = [
  { owner: 'Raj Mehta', plan: 'Pro', date: 'May 15, 2026', amount: '₹3,000', days: 3, urgent: true },
  { owner: 'Priya Singh', plan: 'Pro', date: 'May 18, 2026', amount: '₹3,000', days: 6, urgent: false },
  { owner: 'Anita Sharma', plan: 'Scale', date: 'May 25, 2026', amount: '₹11,000', days: 13, urgent: false },
];

const failedPayments = [
  { owner: 'Suresh Kumar', plan: 'Pro', amount: '₹3,000', date: 'May 10, 2026', retries: 2 },
  { owner: 'Vikram Patel', plan: 'Scale', amount: '₹11,000', date: 'May 8, 2026', retries: 3 },
];

export function Subscriptions() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscriptions & Revenue</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.positive ? 'text-green-600' : 'text-gray-900'}`}>
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Plan Distribution */}
      <Card className="p-6">
        <h2 className="font-bold text-gray-900 mb-4">Plan Distribution</h2>
        <div className="space-y-4">
          {planDistribution.map((plan) => (
            <div key={plan.plan}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium text-gray-900">{plan.plan}</span>
                  <span className="text-sm text-gray-500 ml-2">{plan.users} users</span>
                </div>
                <span className="font-medium text-gray-900">{plan.mrr}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${plan.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Renewals */}
        <Card className="p-6">
          <h2 className="font-bold text-gray-900 mb-4">Upcoming Renewals</h2>
          <div className="space-y-3">
            {renewals.map((renewal, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  renewal.days < 3 ? 'bg-red-50 border border-red-200' :
                  renewal.days < 7 ? 'bg-amber-50 border border-amber-200' :
                  'bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{renewal.owner}</p>
                    <p className="text-sm text-gray-600">{renewal.plan} • {renewal.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{renewal.amount}</p>
                    <p className="text-xs text-gray-500">{renewal.days} days</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Failed Payments */}
        <Card className="p-6">
          <h2 className="font-bold text-gray-900 mb-4">Failed Payments</h2>
          <div className="space-y-3">
            {failedPayments.map((payment, index) => (
              <div key={index} className="p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{payment.owner}</p>
                    <p className="text-sm text-gray-600">{payment.plan} • {payment.amount}</p>
                    <p className="text-xs text-gray-500">{payment.date} • {payment.retries} retries</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs">
                    Retry
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs">
                    Contact
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
