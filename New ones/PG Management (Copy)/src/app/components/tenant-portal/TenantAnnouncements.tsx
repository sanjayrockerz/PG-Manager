import { useState } from 'react';
import { Pin, Calendar } from 'lucide-react';

export function TenantAnnouncements() {
  const [activeFilter, setActiveFilter] = useState('All');

  const filters = ['All', 'Maintenance', 'Payment', 'Rules', 'General'];

  const announcements = [
    { id: 1, category: 'Maintenance', title: 'Water Supply Timing Change', body: 'Water supply will now be available from 6 AM to 8 AM and 6 PM to 8 PM daily starting May 15, 2026. Please plan accordingly.', date: 'May 10, 2026', pinned: true },
    { id: 2, category: 'Payment', title: 'Monthly Rent Due - May 2026', body: 'This is a reminder that your monthly rent for May 2026 is due on May 10, 2026. Please make the payment at the earliest to avoid late fees.', date: 'May 7, 2026', pinned: true },
    { id: 3, category: 'Rules', title: 'Updated Visitor Policy', body: 'Please note that visitors are now allowed only between 10 AM to 7 PM. All visitors must register at the reception with valid ID proof.', date: 'May 5, 2026', pinned: false },
    { id: 4, category: 'General', title: 'Weekly Deep Cleaning Schedule', body: 'Common areas and corridors will be deep cleaned every Sunday from 9 AM to 11 AM. Please cooperate with the cleaning staff.', date: 'May 3, 2026', pinned: false },
  ];

  const filteredAnnouncements = activeFilter === 'All'
    ? announcements
    : announcements.filter(a => a.category === activeFilter);

  const pinnedAnnouncements = filteredAnnouncements.filter(a => a.pinned);
  const regularAnnouncements = filteredAnnouncements.filter(a => !a.pinned);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Maintenance': return 'bg-orange-100 text-orange-700';
      case 'Payment': return 'bg-green-100 text-green-700';
      case 'Rules': return 'bg-purple-100 text-purple-700';
      case 'General': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <p className="text-sm text-gray-600 mt-1">Stay updated with important notices and announcements</p>
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === filter
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-500'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Pinned announcements */}
      {pinnedAnnouncements.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Pinned / Important</h2>
          <div className="space-y-3">
            {pinnedAnnouncements.map((announcement) => (
              <div key={announcement.id} className="bg-white border-2 border-amber-200 rounded-xl p-5">
                <div className="flex items-start gap-3 mb-3">
                  <Pin className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(announcement.category)}`}>
                        {announcement.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{announcement.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">{announcement.body}</p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {announcement.date}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All notices */}
      {regularAnnouncements.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">All Notices</h2>
          <div className="space-y-3">
            {regularAnnouncements.map((announcement) => (
              <div key={announcement.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(announcement.category)}`}>
                    {announcement.category}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{announcement.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">{announcement.body}</p>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {announcement.date}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredAnnouncements.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No announcements found in this category</p>
        </div>
      )}
    </div>
  );
}
