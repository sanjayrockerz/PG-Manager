import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Download } from 'lucide-react';

const stats = [
  { label: 'Total Revenue', value: '₹68,000' },
  { label: 'Successful', value: '156' },
  { label: 'Failed', value: '7' },
  { label: 'Refunded', value: '2' },
];

const transactions = [
  { id: 'TXN-1234', owner: 'Raj Mehta', plan: 'Pro', amount: '₹3,000', date: 'May 11, 2026', method: 'UPI', status: 'Success' },
  { id: 'TXN-1233', owner: 'Anita Sharma', plan: 'Scale', amount: '₹11,000', date: 'May 10, 2026', method: 'Card', status: 'Success' },
  { id: 'TXN-1232', owner: 'Suresh Kumar', plan: 'Pro', amount: '₹3,000', date: 'May 10, 2026', method: 'UPI', status: 'Failed' },
  { id: 'TXN-1231', owner: 'Priya Singh', plan: 'Pro', amount: '₹3,000', date: 'May 9, 2026', method: 'Card', status: 'Success' },
  { id: 'TXN-1230', owner: 'Vikram Patel', plan: 'Free', amount: '₹0', date: 'May 8, 2026', method: '-', status: 'Refunded' },
];

export function Transactions() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Success':
        return 'bg-green-100 text-green-700';
      case 'Failed':
        return 'bg-red-100 text-red-700';
      case 'Refunded':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">All Transactions</h1>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4">
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option>All Plans</option>
            <option>Free</option>
            <option>Pro</option>
            <option>Scale</option>
          </select>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option>All Status</option>
            <option>Success</option>
            <option>Failed</option>
            <option>Refunded</option>
          </select>
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </Card>

      {/* Table - Desktop */}
      <Card className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Transaction ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((txn) => (
                <tr key={txn.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">{txn.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{txn.owner}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{txn.plan}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{txn.amount}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{txn.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{txn.method}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(txn.status)}`}>
                      {txn.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {transactions.map((txn) => (
          <Card key={txn.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-mono text-sm text-gray-900">{txn.id}</p>
                <p className="text-sm text-gray-600">{txn.owner}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(txn.status)}`}>
                {txn.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Plan:</span> {txn.plan}
              </div>
              <div>
                <span className="text-gray-500">Amount:</span> {txn.amount}
              </div>
              <div>
                <span className="text-gray-500">Date:</span> {txn.date}
              </div>
              <div>
                <span className="text-gray-500">Method:</span> {txn.method}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
