import { Wrench, Plus } from 'lucide-react';

interface RentCareMaintenanceProps {
  setActiveScreen: (screen: string) => void;
}

export function RentCareMaintenance({ setActiveScreen }: RentCareMaintenanceProps) {
  const stats = [
    { label: 'Total', value: '3', color: 'bg-purple-100 text-purple-600' },
    { label: 'Active', value: '1', color: 'bg-amber-100 text-amber-600' },
    { label: 'Resolved', value: '2', color: 'bg-green-100 text-green-600' },
  ];

  const tickets = [
    { id: 'TKT0012', issue: 'AC not cooling', description: 'Room AC making noise and not cooling properly', priority: 'High', status: 'In Progress', date: 'May 10, 2026' },
    { id: 'TKT0008', issue: 'Bathroom tap leaking', description: 'Tap in bathroom sink is dripping continuously', priority: 'Medium', status: 'Resolved', date: 'May 3, 2026' },
    { id: 'TKT0004', issue: 'WiFi slow', description: 'Internet speed is very slow in the evening', priority: 'Low', status: 'Resolved', date: 'Apr 28, 2026' },
  ];

  return (
    <div className="space-y-6 pb-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-gray-600 mt-1">Track and manage your maintenance requests</p>
        </div>
        <button
          onClick={() => setActiveScreen('new-maintenance')}
          className="bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-md"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">New Request</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
              <Wrench className="w-5 h-5" />
            </div>
            <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tickets - Desktop */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ticket ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Issue</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-mono text-sm font-semibold text-[#4F46E5]">{ticket.id}</span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{ticket.issue}</td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{ticket.description}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    ticket.priority === 'High' ? 'bg-red-100 text-red-700' :
                    ticket.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {ticket.priority}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    ticket.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                    ticket.status === 'In Progress' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
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

      {/* Tickets - Mobile */}
      <div className="md:hidden space-y-3">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <span className="font-mono text-sm font-semibold text-[#4F46E5]">{ticket.id}</span>
              <div className="flex flex-col gap-1.5 items-end">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  ticket.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                  ticket.status === 'In Progress' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {ticket.status}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  ticket.priority === 'High' ? 'bg-red-100 text-red-700' :
                  ticket.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-green-100 text-green-700'
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
