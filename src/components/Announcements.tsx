import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Bell, Calendar, Pin, Eye, Send, X, MessageCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AnnouncementRecord, supabaseOwnerDataApi } from '../services/supabaseData';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { LiveStatusBadge } from './LiveStatusBadge';

export function Announcements() {
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general' as 'maintenance' | 'payment' | 'rules' | 'general',
    isPinned: false,
    sendViaWhatsApp: true,
  });

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const list = await supabaseOwnerDataApi.listAnnouncements('all');
      setAnnouncements(list);
    } catch {
      setError('Unable to load announcements.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  const { lastUpdatedAt, isSyncing } = useRealtimeRefresh({
    key: 'announcements',
    tables: ['announcements', 'notifications'],
    onChange: loadAnnouncements,
  });

  const filteredAnnouncements = useMemo(
    () => announcements.filter((announcement) => (filterCategory === 'all' ? true : announcement.category === filterCategory)),
    [announcements, filterCategory],
  );

  const pinnedAnnouncements = filteredAnnouncements.filter((entry) => entry.isPinned);
  const regularAnnouncements = filteredAnnouncements.filter((entry) => !entry.isPinned);

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'general',
      isPinned: false,
      sendViaWhatsApp: true,
    });
    setEditingAnnouncement(null);
  };

  const handleCreateOrUpdateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      if (editingAnnouncement) {
        await supabaseOwnerDataApi.updateAnnouncement(editingAnnouncement.id, {
          title: formData.title,
          content: formData.content,
          category: formData.category,
          isPinned: formData.isPinned,
        });
      } else {
        await supabaseOwnerDataApi.createAnnouncement({
          title: formData.title,
          content: formData.content,
          category: formData.category,
          isPinned: formData.isPinned,
          sendViaWhatsApp: formData.sendViaWhatsApp,
        });
      }

      setShowAddModal(false);
      resetForm();
      await loadAnnouncements();
      toast.success(editingAnnouncement ? 'Announcement updated' : 'Announcement created');
    } catch {
      setError('Unable to save announcement.');
      toast.error('Failed to save announcement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditAnnouncement = (announcement: AnnouncementRecord) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      category: announcement.category,
      isPinned: announcement.isPinned,
      sendViaWhatsApp: announcement.sentViaWhatsApp,
    });
    setShowAddModal(true);
  };

  const handleTogglePin = async (announcement: AnnouncementRecord) => {
    setError('');
    try {
      await supabaseOwnerDataApi.toggleAnnouncementPin(announcement.id, !announcement.isPinned);
      setAnnouncements((prev) => prev.map((entry) => (entry.id === announcement.id ? { ...entry, isPinned: !entry.isPinned } : entry)));
      toast.success(announcement.isPinned ? 'Announcement unpinned' : 'Announcement pinned');
    } catch {
      setError('Unable to update pin state.');
      toast.error('Failed to update pin state');
    }
  };

  const handleDelete = async (announcementId: string) => {
    if (!confirm('Delete this announcement?')) {
      return;
    }

    setError('');
    try {
      await supabaseOwnerDataApi.deleteAnnouncement(announcementId);
      setAnnouncements((prev) => prev.filter((entry) => entry.id !== announcementId));
      toast.success('Announcement deleted');
    } catch {
      setError('Unable to delete announcement.');
      toast.error('Failed to delete announcement');
    }
  };

  const handleMarkSent = async (announcementId: string) => {
    setError('');
    try {
      await supabaseOwnerDataApi.markAnnouncementSent(announcementId);
      setAnnouncements((prev) => prev.map((entry) => (entry.id === announcementId ? { ...entry, sentViaWhatsApp: true } : entry)));
      toast.success('Marked as sent');
    } catch {
      setError('Unable to update WhatsApp status.');
      toast.error('Failed to update WhatsApp status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-gray-900">Announcements</h1>
          <p className="text-gray-600 mt-1">Broadcast and manage tenant announcements</p>
          <div className="mt-3">
            <LiveStatusBadge lastUpdatedAt={lastUpdatedAt} isSyncing={isSyncing} label="Announcement stream" />
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Announcement</span>
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex gap-2 overflow-x-auto">
          {['all', 'maintenance', 'payment', 'rules', 'general'].map((category) => (
            <button
              key={category}
              onClick={() => setFilterCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${filterCategory === category ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">Loading announcements...</div>
      ) : (
        <>
          {pinnedAnnouncements.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Pin className="w-5 h-5 text-blue-600" />
                <h2 className="text-gray-900">Pinned Announcements</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pinnedAnnouncements.map((announcement) => (
                  <div key={announcement.id} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Pin className="w-5 h-5 text-blue-600" />
                        <span className={`px-2 py-1 rounded text-xs ${announcement.category === 'maintenance' ? 'bg-orange-100 text-orange-700' : announcement.category === 'payment' ? 'bg-green-100 text-green-700' : announcement.category === 'rules' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
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
                        <button onClick={() => void handleMarkSent(announcement.id)} className="text-green-600 hover:text-green-700 flex items-center gap-1">
                          <Send className="w-3 h-3" />
                          <span>Mark Sent</span>
                        </button>
                        <button onClick={() => handleEditAnnouncement(announcement)} className="text-blue-600 hover:text-blue-700">Edit</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {pinnedAnnouncements.length > 0 && <h2 className="text-gray-900">All Announcements</h2>}

            {regularAnnouncements.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">No announcements found for this filter.</div>
            ) : (
              <div className="space-y-4">
                {regularAnnouncements.map((announcement) => (
                  <div key={announcement.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Bell className="w-5 h-5 text-gray-400" />
                          <h3 className="text-gray-900">{announcement.title}</h3>
                          <span className={`px-2 py-1 rounded text-xs ${announcement.category === 'maintenance' ? 'bg-orange-100 text-orange-700' : announcement.category === 'payment' ? 'bg-green-100 text-green-700' : announcement.category === 'rules' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
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
                          <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /><span>{announcement.date}</span></div>
                          <div className="flex items-center gap-1"><Eye className="w-4 h-4" /><span>{announcement.views} views</span></div>
                        </div>
                      </div>

                      <div className="flex md:flex-col gap-2">
                        <button onClick={() => void handleTogglePin(announcement)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                          {announcement.isPinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button onClick={() => handleEditAnnouncement(announcement)} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors">
                          Edit
                        </button>
                        <button onClick={() => void handleMarkSent(announcement.id)} className="px-4 py-2 bg-green-50 text-green-600 rounded-lg text-sm hover:bg-green-100 transition-colors flex items-center gap-1 justify-center">
                          <Send className="w-3 h-3" />
                          Sent
                        </button>
                        <button onClick={() => void handleDelete(announcement.id)} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-colors flex items-center gap-1 justify-center">
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => {
          setShowAddModal(false);
          resetForm();
        }}>
          <div className="bg-white rounded-xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-gray-900">{editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}</h2>
              <button onClick={() => {
                setShowAddModal(false);
                resetForm();
              }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => void handleCreateOrUpdateAnnouncement(e)} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Title *</label>
                <input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="e.g., Rent Due Reminder" />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-700">Message *</label>
                <textarea required value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" rows={4} placeholder="Write your announcement message" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-700">Category *</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as 'maintenance' | 'payment' | 'rules' | 'general' })} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                    <option value="general">General</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="payment">Payment</option>
                    <option value="rules">Rules</option>
                  </select>
                </div>

                <div className="flex items-center gap-4 pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.isPinned} onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
                    <span className="text-sm text-gray-700">Pin Announcement</span>
                  </label>
                </div>
              </div>

              {!editingAnnouncement && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <input type="checkbox" checked={formData.sendViaWhatsApp} onChange={(e) => setFormData({ ...formData, sendViaWhatsApp: e.target.checked })} className="w-4 h-4 text-green-600 rounded" />
                  <MessageCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">Mark as sent via WhatsApp</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
                  {isSaving ? 'Saving...' : editingAnnouncement ? 'Update Announcement' : 'Create Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}