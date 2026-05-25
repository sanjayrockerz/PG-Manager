import { useState } from 'react';
import { Pin, Calendar } from 'lucide-react';

export function RentCareAnnouncements() {
  const [activeFilter, setActiveFilter] = useState('All');

  const filters = ['All', 'Maintenance', 'Payment', 'Rules', 'General'];

  const announcements = [
    { id: 1, category: 'Maintenance', title: 'Water Supply Maintenance', body: 'Water supply will be turned off tomorrow (May 13) from 10 AM to 2 PM for maintenance work. Please plan accordingly and store water in advance.', date: '2 days ago', pinned: true, unread: true },
    { id: 2, category: 'Payment', title: 'May Rent Reminder', body: 'This is a friendly reminder that May 2026 rent is due on May 5, 2026. Please make the payment at the earliest to avoid late fees. Thank you!', date: '3 days ago', pinned: true, unread: true },
    { id: 3, category: 'Rules', title: 'Common Area Rules', body: 'Please maintain cleanliness in common areas. Do not leave personal belongings in corridors or common spaces. Violators will be charged a cleaning fee.', date: '1 week ago', pinned: false, unread: false },
    { id: 4, category: 'General', title: 'WiFi Password Updated', body: 'The WiFi password has been changed for security reasons. New password: GreenValley2026@Secure. Please update on your devices.', date: '2 weeks ago', pinned: false, unread: false },
  ];

  const filteredAnnouncements = activeFilter === 'All'
    ? announcements
    : announcements.filter(a => a.category === activeFilter);

  const pinnedAnnouncements = filteredAnnouncements.filter(a => a.pinned);
  const regularAnnouncements = filteredAnnouncements.filter(a => !a.pinned);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Maintenance': return 'bg-amber-100 text-amber-700';
      case 'Payment': return 'bg-blue-100 text-blue-700';
      case 'Rules': return 'bg-purple-100 text-purple-700';
      case 'General': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Announcements</h1>
        <p className="text-gray-600 mt-1">Stay updated with important notices</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2.5 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
              activeFilter === filter
                ? 'bg-[#4F46E5] text-white shadow-md'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-[#4F46E5]'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Pinned */}
      {pinnedAnnouncements.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wide">Important / Pinned</h2>
          <div className="space-y-3">
            {pinnedAnnouncements.map((announcement) => (
              <div key={announcement.id} className="bg-white border-2 border-amber-300 rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-3 mb-3">
                  <Pin className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getCategoryColor(announcement.category)}`}>
                        {announcement.category}
                      </span>
                      {announcement.unread && <span className="w-2 h-2 bg-red-500 rounded-full" />}
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {announcement.date}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{announcement.title}</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{announcement.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Notices */}
      {regularAnnouncements.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wide">All Notices</h2>
          <div className="space-y-3">
            {regularAnnouncements.map((announcement) => (
              <div key={announcement.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getCategoryColor(announcement.category)}`}>
                    {announcement.category}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {announcement.date}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{announcement.title}</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{announcement.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredAnnouncements.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No announcements in this category</p>
        </div>
      )}
    </div>
  );
}
