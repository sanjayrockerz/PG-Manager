import { useState } from 'react';
import { Plus, Bell, Calendar, Pin, Eye, Send, X, MessageCircle } from 'lucide-react';

interface Announcement {
  id: number;
  title: string;
  content: string;
  date: string;
  category: 'maintenance' | 'payment' | 'rules' | 'general';
  isPinned: boolean;
  views: number;
  sentViaWhatsApp: boolean;
}

const mockAnnouncements: Announcement[] = [
  { 
    id: 1, 
    title: 'Electricity Maintenance', 
    content: 'Power will be off from 10 AM to 2 PM on December 5th for maintenance work.',
    date: '2025-12-01',
    category: 'maintenance',
    isPinned: true,
    views: 42,
    sentViaWhatsApp: true
  },
  { 
    id: 2, 
    title: 'Rent Due Reminder', 
    content: 'Monthly rent for December is due by 5th December. Please make timely payment.',
    date: '2025-12-01',
    category: 'payment',
    isPinned: true,
    views: 38,
    sentViaWhatsApp: true
  },
  { 
    id: 3, 
    title: 'New Common Area Rules', 
    content: 'Please maintain silence in common areas after 10 PM. Keep the areas clean.',
    date: '2025-11-28',
    category: 'rules',
    isPinned: false,
    views: 35,
    sentViaWhatsApp: false
  },
  { 
    id: 4, 
    title: 'Wi-Fi Password Update', 
    content: 'The Wi-Fi password has been updated. Please check with the admin for the new password.',
    date: '2025-11-25',
    category: 'general',
    isPinned: false,
    views: 48,
    sentViaWhatsApp: true
  },
  { 
    id: 5, 
    title: 'Water Supply Timing', 
    content: 'Water supply will be available from 6 AM to 9 AM and 6 PM to 9 PM daily.',
    date: '2025-11-20',
    category: 'general',
    isPinned: false,
    views: 40,
    sentViaWhatsApp: false
  },
];

export function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>(mockAnnouncements);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general' as 'maintenance' | 'payment' | 'rules' | 'general',
    isPinned: false,
    sendViaWhatsApp: true,
  });

  const filteredAnnouncements = announcements.filter(announcement => 
    filterCategory === 'all' ? true : announcement.category === filterCategory
  );

  const pinnedAnnouncements = filteredAnnouncements.filter(n => n.isPinned);
  const regularAnnouncements = filteredAnnouncements.filter(n => !n.isPinned);

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();

    const newAnnouncement: Announcement = {
      id: announcements.length + 1,
      title: formData.title,
      content: formData.content,
      category: formData.category,
      isPinned: formData.isPinned,
      date: new Date().toISOString().split('T')[0],
      views: 0,
      sentViaWhatsApp: formData.sendViaWhatsApp,
    };

    setAnnouncements([newAnnouncement, ...announcements]);

    if (formData.sendViaWhatsApp) {
      alert(`Announcement will be broadcast via WhatsApp to all tenants!\n\nTitle: ${formData.title}\nMessage: ${formData.content}\n\n(WhatsApp broadcast integration coming soon)`);
    }

    setShowAddModal(false);
    setFormData({
      title: '',
      content: '',
      category: 'general',
      isPinned: false,
      sendViaWhatsApp: true,
    });
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      category: announcement.category,
      isPinned: announcement.isPinned,
      sendViaWhatsApp: false,
    });
    setShowAddModal(true);
  };

  const handleUpdateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingAnnouncement) return;

    setAnnouncements(announcements.map(a => 
      a.id === editingAnnouncement.id 
        ? {
            ...a,
            title: formData.title,
            content: formData.content,
            category: formData.category,
            isPinned: formData.isPinned,
          }
        : a
    ));

    setShowAddModal(false);
    setEditingAnnouncement(null);
    setFormData({
      title: '',
      content: '',
      category: 'general',
      isPinned: false,
      sendViaWhatsApp: true,
    });
  };

  const handleTogglePin = (id: number) => {
    setAnnouncements(announcements.map(a =>
      a.id === id ? { ...a, isPinned: !a.isPinned } : a
    ));
  };

  const handleResendWhatsApp = (announcement: Announcement) => {
    alert(`Re-broadcasting announcement via WhatsApp!\n\nTitle: ${announcement.title}\nMessage: ${announcement.content}\n\n(WhatsApp broadcast integration coming soon)`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-gray-900">Announcements</h1>
          <p className="text-gray-600 mt-1">Broadcast messages to tenants via WhatsApp</p>
        </div>
        <button 
          onClick={() => {
            setEditingAnnouncement(null);
            setFormData({
              title: '',
              content: '',
              category: 'general',
              isPinned: false,
              sendViaWhatsApp: true,
            });
            setShowAddModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Announcement</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex gap-2 overflow-x-auto">
          {['all', 'maintenance', 'payment', 'rules', 'general'].map((category) => (
            <button
              key={category}
              onClick={() => setFilterCategory(category)}
              className={`
                px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors
                ${filterCategory === category 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Pinned Announcements */}
      {pinnedAnnouncements.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Pin className="w-5 h-5 text-blue-600" />
            <h2 className="text-gray-900">Pinned Announcements</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pinnedAnnouncements.map((announcement) => (
              <div 
                key={announcement.id} 
                className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Pin className="w-5 h-5 text-blue-600" />
                    <span className={`
                      px-2 py-1 rounded text-xs
                      ${announcement.category === 'maintenance' ? 'bg-orange-100 text-orange-700' : ''}
                      ${announcement.category === 'payment' ? 'bg-green-100 text-green-700' : ''}
                      ${announcement.category === 'rules' ? 'bg-red-100 text-red-700' : ''}
                      ${announcement.category === 'general' ? 'bg-blue-100 text-blue-700' : ''}
                    `}>
                      {announcement.category.charAt(0).toUpperCase() + announcement.category.slice(1)}
                    </span>
                    {announcement.sentViaWhatsApp && (
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700 flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        WhatsApp
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Eye className="w-4 h-4" />
                    <span>{announcement.views}</span>
                  </div>
                </div>
                
                <h3 className="text-gray-900 mb-2">{announcement.title}</h3>
                <p className="text-sm text-gray-700 mb-4">{announcement.content}</p>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{announcement.date}</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleResendWhatsApp(announcement)}
                      className="text-green-600 hover:text-green-700 flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Resend</span>
                    </button>
                    <button 
                      onClick={() => handleEditAnnouncement(announcement)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Announcements */}
      <div className="space-y-4">
        {pinnedAnnouncements.length > 0 && (
          <h2 className="text-gray-900">All Announcements</h2>
        )}
        
        <div className="space-y-4">
          {regularAnnouncements.map((announcement) => (
            <div 
              key={announcement.id} 
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Bell className="w-5 h-5 text-gray-400" />
                    <h3 className="text-gray-900">{announcement.title}</h3>
                    <span className={`
                      px-2 py-1 rounded text-xs
                      ${announcement.category === 'maintenance' ? 'bg-orange-100 text-orange-700' : ''}
                      ${announcement.category === 'payment' ? 'bg-green-100 text-green-700' : ''}
                      ${announcement.category === 'rules' ? 'bg-red-100 text-red-700' : ''}
                      ${announcement.category === 'general' ? 'bg-blue-100 text-blue-700' : ''}
                    `}>
                      {announcement.category.charAt(0).toUpperCase() + announcement.category.slice(1)}
                    </span>
                    {announcement.sentViaWhatsApp && (
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700 flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        WhatsApp
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-3">{announcement.content}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{announcement.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{announcement.views} views</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex md:flex-col gap-2">
                  <button 
                    onClick={() => handleTogglePin(announcement.id)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                  >
                    Pin
                  </button>
                  <button 
                    onClick={() => handleEditAnnouncement(announcement)}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleResendWhatsApp(announcement)}
                    className="px-4 py-2 bg-green-50 text-green-600 rounded-lg text-sm hover:bg-green-100 transition-colors flex items-center gap-1 justify-center"
                  >
                    <Send className="w-3 h-3" />
                    Send
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Announcement Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => {
          setShowAddModal(false);
          setEditingAnnouncement(null);
        }}>
          <div className="bg-white rounded-xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-gray-900">{editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}</h2>
              <button onClick={() => {
                setShowAddModal(false);
                setEditingAnnouncement(null);
              }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={editingAnnouncement ? handleUpdateAnnouncement : handleCreateAnnouncement} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Rent Due Reminder"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-700">Message *</label>
                <textarea
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Write your announcement message..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="payment">Payment</option>
                    <option value="rules">Rules</option>
                  </select>
                </div>

                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPinned}
                      onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Pin to top</span>
                  </label>
                </div>
              </div>

              {!editingAnnouncement && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sendViaWhatsApp}
                      onChange={(e) => setFormData({ ...formData, sendViaWhatsApp: e.target.checked })}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                    />
                    <div className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-900">Send to all tenants via WhatsApp</span>
                    </div>
                  </label>
                  <p className="text-xs text-gray-600 mt-2 ml-6">This announcement will be broadcast to all tenant WhatsApp numbers</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingAnnouncement(null);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  {formData.sendViaWhatsApp && !editingAnnouncement && <Send className="w-4 h-4" />}
                  <span>{editingAnnouncement ? 'Update' : 'Create & Send'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
