import { Wrench, Plus } from 'lucide-react';

interface TenantMaintenanceProps {
  setActiveScreen: (screen: string) => void;
}

export function TenantMaintenance({ setActiveScreen }: TenantMaintenanceProps) {
  const stats = [
    { label: 'Total Requests', value: '3', color: 'bg-blue-500' },
    { label: 'Active', value: '1', color: 'bg-orange-500' },
    { label: 'Resolved', value: '2', color: 'bg-green-500' },
  ];

  const tickets = [
    { id: 'MNT-1003', issue: 'AC not cooling properly', description: 'Room AC making noise and not cooling', priority: 'High', status: 'In Progress', date: 'May 10, 2026' },
    { id: 'MNT-1002', issue: 'WiFi connectivity issue', description: 'Frequent disconnections in room', priority: 'Medium', status: 'Resolved', date: 'May 5, 2026' },
    { id: 'MNT-1001', issue: 'Bathroom tap leaking', description: 'Water dripping continuously', priority: 'Low', status: 'Resolved', date: 'Apr 28, 2026' },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Requests</h1>
          <p className="text-sm text-gray-600 mt-1">Track and manage your maintenance requests</p>
        </div>
        <button
          onClick={() => setActiveScreen('new-maintenance')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            </div>
            <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
              <Wrench className="w-6 h-6 text-white" />
            </div>
          </div>
        ))}
      </div>

      {/* Tickets table - Desktop */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ticket ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Issue</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono font-medium text-indigo-600">{ticket.id}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{ticket.issue}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{ticket.description}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      ticket.priority === 'High' ? 'bg-red-100 text-red-800' :
                      ticket.priority === 'Medium' ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      ticket.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                      ticket.status === 'In Progress' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{ticket.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tickets cards - Mobile */}
      <div className="md:hidden space-y-3">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-mono font-medium text-indigo-600">{ticket.id}</span>
              <div className="flex flex-col gap-1.5 items-end">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  ticket.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                  ticket.status === 'In Progress' ? 'bg-orange-100 text-orange-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {ticket.status}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  ticket.priority === 'High' ? 'bg-red-100 text-red-800' :
                  ticket.priority === 'Medium' ? 'bg-amber-100 text-amber-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {ticket.priority}
                </span>
              </div>
            </div>

            <p className="font-semibold text-gray-900 mb-2">{ticket.issue}</p>
            <p className="text-sm text-gray-600 mb-3">{ticket.description}</p>
            <p className="text-xs text-gray-500">{ticket.date}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
