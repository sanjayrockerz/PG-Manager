import { useEffect, useState } from 'react';
import { User, FileText, Plus, X, MessageCircle, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { OwnerSettingsRecord, supabaseOwnerDataApi } from '../services/supabaseData';

export function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<OwnerSettingsRecord | null>(null);
  const [activeSection, setActiveSection] = useState<'profile' | 'pg-rules' | 'whatsapp'>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newRule, setNewRule] = useState('');
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<{ type: 'welcomeMessage' | 'rentReminder' | 'paymentConfirmation'; value: string } | null>(null);

  const loadSettings = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await supabaseOwnerDataApi.getOwnerSettings();
      setSettings(data);
    } catch {
      setError('Unable to load settings from Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const persistSettings = async (nextSettings: OwnerSettingsRecord) => {
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = await supabaseOwnerDataApi.updateOwnerSettings(nextSettings);
      setSettings(saved);
      setSuccess('Settings saved successfully.');
    } catch {
      setError('Unable to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRule = async () => {
    if (!settings || !newRule.trim()) {
      return;
    }

    const nextRules = [...settings.pgRules];
    if (editingRuleIndex !== null) {
      nextRules[editingRuleIndex] = newRule.trim();
    } else {
      nextRules.push(newRule.trim());
    }

    await persistSettings({
      ...settings,
      pgRules: nextRules,
    });

    setNewRule('');
    setEditingRuleIndex(null);
    setShowAddRuleModal(false);
  };

  const handleEditRule = (index: number) => {
    if (!settings) {
      return;
    }
    setNewRule(settings.pgRules[index]);
    setEditingRuleIndex(index);
    setShowAddRuleModal(true);
  };

  const handleDeleteRule = async (index: number) => {
    if (!settings) {
      return;
    }
    if (!confirm('Are you sure you want to delete this rule?')) {
      return;
    }

    const nextRules = settings.pgRules.filter((_, itemIndex) => itemIndex !== index);
    await persistSettings({
      ...settings,
      pgRules: nextRules,
    });
  };

  const handleToggleTemplate = async (type: 'welcomeMessage' | 'rentReminder' | 'paymentConfirmation') => {
    if (!settings) {
      return;
    }

    await persistSettings({
      ...settings,
      whatsappSettings: {
        ...settings.whatsappSettings,
        [type]: {
          ...settings.whatsappSettings[type],
          enabled: !settings.whatsappSettings[type].enabled,
        },
      },
    });
  };

  const handleTemplateEdit = (type: 'welcomeMessage' | 'rentReminder' | 'paymentConfirmation') => {
    if (!settings) {
      return;
    }

    setEditingTemplate({
      type,
      value: settings.whatsappSettings[type].template,
    });
    setShowTemplateModal(true);
  };

  const handleTemplateSave = async () => {
    if (!settings || !editingTemplate) {
      return;
    }

    const { type, value } = editingTemplate;
    await persistSettings({
      ...settings,
      whatsappSettings: {
        ...settings.whatsappSettings,
        [type]: {
          ...settings.whatsappSettings[type],
          template: value,
        },
      },
    });

    setEditingTemplate(null);
    setShowTemplateModal(false);
  };

  const handleComplaintToggle = async (field: 'enabled' | 'notifyOnCreate' | 'notifyOnProgress' | 'notifyOnResolve') => {
    if (!settings) {
      return;
    }

    await persistSettings({
      ...settings,
      whatsappSettings: {
        ...settings.whatsappSettings,
        complaintUpdate: {
          ...settings.whatsappSettings.complaintUpdate,
          [field]: !settings.whatsappSettings.complaintUpdate[field],
        },
      },
    });
  };

  const handleRentReminderDaysChange = async (days: number) => {
    if (!settings) {
      return;
    }

    await persistSettings({
      ...settings,
      whatsappSettings: {
        ...settings.whatsappSettings,
        rentReminder: {
          ...settings.whatsappSettings.rentReminder,
          daysBeforeDue: days,
        },
      },
    });
  };

  if (isLoading || !settings) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Loading your settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account settings</p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'profile', label: 'Profile' },
            { key: 'pg-rules', label: 'PG Rules' },
            { key: 'whatsapp', label: 'WhatsApp Integration' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key as 'profile' | 'pg-rules' | 'whatsapp')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                activeSection === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeSection === 'profile' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-purple-50 rounded-lg">
            <User className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-gray-900">Profile</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Name</p>
            <p className="text-gray-900 mt-1">{user?.name || 'Owner'}</p>
          </div>
          <div>
            <p className="text-gray-500">Email</p>
            <p className="text-gray-900 mt-1">{user?.email || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">Phone</p>
            <p className="text-gray-900 mt-1">{user?.phone || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">Role</p>
            <p className="text-gray-900 mt-1">{user?.role || 'owner'}</p>
          </div>
          <div>
            <p className="text-gray-500">PG Name</p>
            <p className="text-gray-900 mt-1">{user?.pgName || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500">City</p>
            <p className="text-gray-900 mt-1">{user?.city || '-'}</p>
          </div>
        </div>
        </div>
      )}

      {activeSection === 'pg-rules' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-gray-900">PG Rules</h2>
              <p className="text-sm text-gray-600">Rules used for WhatsApp replies</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingRuleIndex(null);
              setNewRule('');
              setShowAddRuleModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Rule</span>
          </button>
        </div>

        <div className="space-y-2">
          {settings.pgRules.length === 0 ? (
            <p className="text-sm text-gray-500">No rules added yet.</p>
          ) : (
            settings.pgRules.map((rule, index) => (
              <div key={`rule-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 font-mono">{index + 1}.</span>
                  <p className="text-sm text-gray-900">{rule}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleEditRule(index)} className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">Edit</button>
                  <button onClick={() => void handleDeleteRule(index)} className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">Delete</button>
                </div>
              </div>
            ))
          )}
        </div>
        </div>
      )}

      {activeSection === 'whatsapp' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-gray-900">WhatsApp Automation</h2>
              <p className="text-sm text-gray-600">Manage templates and complaint notifications</p>
            </div>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Save className="w-3 h-3" />
            Auto-saved
          </div>
        </div>

        <div className="space-y-3">
          {([
            ['welcomeMessage', 'Welcome Message'],
            ['rentReminder', 'Rent Reminder'],
            ['paymentConfirmation', 'Payment Confirmation'],
          ] as const).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-1">{settings.whatsappSettings[key].template}</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="relative inline-block w-12 h-6">
                  <input type="checkbox" className="sr-only peer" checked={settings.whatsappSettings[key].enabled} onChange={() => void handleToggleTemplate(key)} />
                  <div className="w-12 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-colors cursor-pointer"></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform"></div>
                </label>
                <button onClick={() => handleTemplateEdit(key)} className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">Edit</button>
              </div>
            </div>
          ))}

          <div className="p-3 bg-gray-50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-900">Rent Reminder Lead Time</p>
              <input
                type="number"
                min={1}
                max={15}
                value={settings.whatsappSettings.rentReminder.daysBeforeDue}
                onChange={(e) => void handleRentReminderDaysChange(Number(e.target.value) || 1)}
                className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <p className="text-xs text-gray-500">Days before due date to send reminders</p>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg space-y-2">
            <p className="text-sm text-gray-900">Complaint Notifications</p>
            {([
              ['enabled', 'Automation Enabled'],
              ['notifyOnCreate', 'Notify on Ticket Create'],
              ['notifyOnProgress', 'Notify on In Progress'],
              ['notifyOnResolve', 'Notify on Resolve'],
            ] as const).map(([field, label]) => (
              <label key={field} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.whatsappSettings.complaintUpdate[field]}
                  onChange={() => void handleComplaintToggle(field)}
                  className="w-4 h-4"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
        </div>
      )}

      {showAddRuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowAddRuleModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-gray-900">{editingRuleIndex !== null ? 'Edit Rule' : 'Add New Rule'}</h2>
              <button onClick={() => setShowAddRuleModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Rule Text *</label>
                <textarea value={newRule} onChange={(e) => setNewRule(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" rows={3} placeholder="e.g., Check-in time: After 6:00 PM" />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button onClick={() => setShowAddRuleModal(false)} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={() => void handleAddRule()} disabled={!newRule.trim() || isSaving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {editingRuleIndex !== null ? 'Update Rule' : 'Add Rule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTemplateModal && editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowTemplateModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-gray-900">Edit WhatsApp Template</h2>
              <button onClick={() => setShowTemplateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Template Text *</label>
                <textarea value={editingTemplate.value} onChange={(e) => setEditingTemplate({ ...editingTemplate, value: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" rows={5} />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button onClick={() => setShowTemplateModal(false)} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={() => void handleTemplateSave()} disabled={!editingTemplate.value.trim() || isSaving} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}