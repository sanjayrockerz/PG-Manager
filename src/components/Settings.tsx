import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, FileText, MessageCircle, Plus, Save, Shield, User, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AppLanguage, useLocalization } from '../contexts/LocalizationContext';
import { OwnerSettingsRecord, supabaseAuthDataApi, supabaseOwnerDataApi } from '../services/supabaseData';
import {
  DEFAULT_COUNTRY_CODE,
  SUPPORTED_PHONE_COUNTRIES,
  formatStoredPhone,
  getPhoneCountry,
  getPhoneDropdownLabel,
  parseStoredPhone,
  sanitizePhoneLocal,
  validatePhoneForCountry,
} from '../utils/phone';

interface ProfileFormState {
  name: string;
  email: string;
  phoneCountryCode: string;
  phoneLocalNumber: string;
}

export function Settings() {
  const { user, refreshProfile, logout } = useAuth();
  const { setLanguage, t } = useLocalization();
  const [settings, setSettings] = useState<OwnerSettingsRecord | null>(null);
  const [activeSection, setActiveSection] = useState<'profile' | 'pg-rules' | 'whatsapp'>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: '',
    email: '',
    phoneCountryCode: DEFAULT_COUNTRY_CODE,
    phoneLocalNumber: '',
  });

  const [newRule, setNewRule] = useState('');
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<{
    type: 'welcomeMessage' | 'rentReminder' | 'paymentConfirmation' | 'complaintUpdate';
    value: string;
  } | null>(null);

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

  useEffect(() => {
    if (!settings) {
      return;
    }

    const selectedLanguage = settings.additionalSettings.language;
    if (selectedLanguage === 'English' || selectedLanguage === 'Hindi' || selectedLanguage === 'Kannada') {
      setLanguage(selectedLanguage as AppLanguage);
    }
  }, [settings, setLanguage]);

  useEffect(() => {
    const parsedPhone = parseStoredPhone(user?.phone ?? '');
    setProfileForm({
      name: user?.name ?? '',
      email: user?.email ?? '',
      phoneCountryCode: parsedPhone.countryCode,
      phoneLocalNumber: sanitizePhoneLocal(parsedPhone.localNumber, parsedPhone.countryCode),
    });
  }, [user]);

  const persistSettings = async (nextSettings: OwnerSettingsRecord, successMessage = 'Settings saved successfully.') => {
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const saved = await supabaseOwnerDataApi.updateOwnerSettings(nextSettings);
      setSettings(saved);
      setSuccess(successMessage);
    } catch {
      setError('Unable to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSettingsDraft = (updater: (current: OwnerSettingsRecord) => OwnerSettingsRecord) => {
    setSettings((current) => {
      if (!current) {
        return current;
      }
      return updater(current);
    });
  };

  const handleSaveProfile = async () => {
    const cleanedName = profileForm.name.trim();
    const cleanedPhone = profileForm.phoneLocalNumber.replace(/\D/g, '');

    if (cleanedName.length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }

    const phoneValidation = validatePhoneForCountry(profileForm.phoneCountryCode, cleanedPhone);
    if (!phoneValidation.valid) {
      setError(phoneValidation.error ?? 'Phone number is invalid.');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await supabaseAuthDataApi.updateCurrentProfile({
        name: cleanedName,
        phone: formatStoredPhone(profileForm.phoneCountryCode, cleanedPhone),
      });
      await refreshProfile();
      setSuccess('Profile updated successfully.');
    } catch {
      setError('Unable to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!profileForm.email) {
      setError('No email found for this account.');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(profileForm.email, {
        redirectTo: window.location.origin,
      });

      if (resetError) {
        throw resetError;
      }

      setSuccess('Password reset link sent to your email.');
    } catch {
      setError('Unable to send password reset email.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = await supabaseOwnerDataApi.exportOwnerData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `pg-manager-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      setSuccess('Data export generated successfully.');
    } catch {
      setError('Unable to export data right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAllData = async () => {
    const typed = window.prompt('Type DELETE to remove all property, tenant, payment and ticket data.');
    if (typed !== 'DELETE') {
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await supabaseOwnerDataApi.clearOwnerData();
      await loadSettings();
      setSuccess('All owner data cleared successfully.');
    } catch {
      setError('Unable to clear owner data.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseAccount = async () => {
    const typed = window.prompt('Type CLOSE to clear your account data and sign out.');
    if (typed !== 'CLOSE') {
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      await supabaseOwnerDataApi.clearOwnerData();
      await logout();
    } catch {
      setError('Unable to close account right now.');
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
    }, 'PG rules saved successfully.');

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
    }, 'PG rule deleted successfully.');
  };

  const handleTemplateEdit = (type: 'welcomeMessage' | 'rentReminder' | 'paymentConfirmation' | 'complaintUpdate') => {
    if (!settings) {
      return;
    }

    const templateValue = type === 'complaintUpdate'
      ? settings.whatsappSettings.complaintUpdate.template
      : settings.whatsappSettings[type].template;

    setEditingTemplate({
      type,
      value: templateValue,
    });
    setShowTemplateModal(true);
  };

  const handleTemplateSave = async () => {
    if (!settings || !editingTemplate || !editingTemplate.value.trim()) {
      return;
    }

    if (editingTemplate.type === 'complaintUpdate') {
      await persistSettings({
        ...settings,
        whatsappSettings: {
          ...settings.whatsappSettings,
          complaintUpdate: {
            ...settings.whatsappSettings.complaintUpdate,
            template: editingTemplate.value.trim(),
          },
        },
      }, 'WhatsApp complaint template updated successfully.');
    } else {
      await persistSettings({
        ...settings,
        whatsappSettings: {
          ...settings.whatsappSettings,
          [editingTemplate.type]: {
            ...settings.whatsappSettings[editingTemplate.type],
            template: editingTemplate.value.trim(),
          },
        },
      }, 'WhatsApp template updated successfully.');
    }

    setEditingTemplate(null);
    setShowTemplateModal(false);
  };

  const whatsappTemplateItems = useMemo(() => {
    if (!settings) {
      return [];
    }

    return [
      {
        key: 'welcomeMessage' as const,
        label: 'Welcome Message',
        enabled: settings.whatsappSettings.welcomeMessage.enabled,
        template: settings.whatsappSettings.welcomeMessage.template,
      },
      {
        key: 'rentReminder' as const,
        label: 'Rent Reminder',
        enabled: settings.whatsappSettings.rentReminder.enabled,
        template: settings.whatsappSettings.rentReminder.template,
      },
      {
        key: 'paymentConfirmation' as const,
        label: 'Payment Confirmation',
        enabled: settings.whatsappSettings.paymentConfirmation.enabled,
        template: settings.whatsappSettings.paymentConfirmation.template,
      },
      {
        key: 'complaintUpdate' as const,
        label: 'Complaint Notifications',
        enabled: settings.whatsappSettings.complaintUpdate.enabled,
        template: settings.whatsappSettings.complaintUpdate.template,
      },
    ];
  }, [settings]);

  if (isLoading || !settings) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Loading your settings...</p>
        </div>
      </div>
    );
  }

  const settingsPhoneCountry = getPhoneCountry(profileForm.phoneCountryCode);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">{t('settings.title', 'Settings')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('settings.subtitle', 'Manage your account settings')}</p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

      <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'profile', label: 'Profile' },
            { key: 'pg-rules', label: 'PG Rules' },
            { key: 'whatsapp', label: 'WhatsApp Integration' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key as 'profile' | 'pg-rules' | 'whatsapp')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors $
                activeSection === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeSection === 'profile' && (
        <div className="space-y-6">
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-50 p-3">
                <User className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-gray-900">Profile Settings</h2>
                <p className="text-sm text-gray-500">Keep your account profile up to date.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Full Name</label>
                <input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Email</label>
                <input value={profileForm.email} disabled className="w-full rounded-lg border border-gray-300 bg-gray-100 px-4 py-2 text-gray-500" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Phone</label>
                <div className="group flex items-center rounded-xl border border-gray-300 bg-white transition-shadow focus-within:ring-2 focus-within:ring-indigo-200">
                  <select
                    value={profileForm.phoneCountryCode}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      phoneCountryCode: e.target.value,
                      phoneLocalNumber: sanitizePhoneLocal(profileForm.phoneLocalNumber, e.target.value),
                    })}
                    className="w-44 rounded-l-xl border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none"
                  >
                    {SUPPORTED_PHONE_COUNTRIES.map((entry) => (
                      <option key={entry.code} value={entry.code}>{getPhoneDropdownLabel(entry)}</option>
                    ))}
                  </select>
                  <span className="border-r border-gray-200 bg-gray-50 px-2 py-2 text-sm font-medium text-gray-700">
                    {settingsPhoneCountry.flag} {settingsPhoneCountry.code}
                  </span>
                  <input
                    value={profileForm.phoneLocalNumber}
                    inputMode="numeric"
                    maxLength={settingsPhoneCountry.localDigits}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      phoneLocalNumber: sanitizePhoneLocal(e.target.value, profileForm.phoneCountryCode),
                    })}
                    className="w-full rounded-r-xl border-0 px-4 py-2 focus:outline-none"
                    placeholder={settingsPhoneCountry.placeholder}
                  />
                </div>
                <p className="text-xs text-gray-500">{settingsPhoneCountry.country} numbers require exactly {settingsPhoneCountry.localDigits} digits.</p>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button onClick={() => void handleSaveProfile()} disabled={isSaving} className="rounded-lg bg-indigo-600 px-6 py-2.5 text-white transition-colors hover:bg-indigo-700 disabled:opacity-60">
                {isSaving ? 'Saving...' : 'Update Profile'}
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-gray-900">Notifications</h2>
            <div className="space-y-3">
              {[
                ['paymentNotifications', 'Payment Notifications', 'Get notified about payments'],
                ['maintenanceAlerts', 'Maintenance Alerts', 'New maintenance requests'],
                ['tenantUpdates', 'Tenant Updates', 'Check-in and check-out alerts'],
                ['emailNotifications', 'Email Notifications', 'Receive email updates'],
              ].map(([field, label, note]) => (
                <label key={field} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 shadow-sm">
                  <div>
                    <p className="text-sm text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500 mt-1">{note}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications[field as keyof OwnerSettingsRecord['notifications']]}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      updateSettingsDraft((current) => ({
                        ...current,
                        notifications: {
                          ...current.notifications,
                          [field]: checked,
                        },
                      }));
                    }}
                    className="h-4 w-4"
                  />
                </label>
              ))}
            </div>
            <div className="flex items-center justify-end">
              <button onClick={() => void persistSettings(settings, 'Notification settings saved successfully.')} disabled={isSaving} className="rounded-lg bg-indigo-600 px-6 py-2.5 text-white transition-colors hover:bg-indigo-700 disabled:opacity-60">Save Notifications</button>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-gray-900">Security</h2>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 shadow-sm">
              <div>
                <p className="text-sm text-gray-900">Two-Factor Authentication</p>
                <p className="text-xs text-gray-500 mt-1">Add an extra layer of security</p>
              </div>
              <input
                type="checkbox"
                checked={settings.security.twoFactorAuthentication}
                onChange={(e) => {
                  const checked = e.target.checked;
                  updateSettingsDraft((current) => ({
                    ...current,
                    security: {
                      ...current.security,
                      twoFactorAuthentication: checked,
                    },
                  }));
                }}
                className="w-4 h-4"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => void handleSendPasswordReset()} disabled={isSaving} className="rounded-lg border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50">Change Password</button>
              <button disabled className="cursor-not-allowed rounded-lg border border-gray-200 px-4 py-2 text-gray-400">Active Sessions: Current Device</button>
            </div>

            <div className="flex items-center justify-end">
              <button onClick={() => void persistSettings(settings, 'Security settings saved successfully.')} disabled={isSaving} className="rounded-lg bg-indigo-600 px-6 py-2.5 text-white transition-colors hover:bg-indigo-700 disabled:opacity-60">Save Security</button>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-gray-900">Payment Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-600">UPI ID</label>
                <input value={settings.paymentSettings.upiId} onChange={(e) => updateSettingsDraft((current) => ({ ...current, paymentSettings: { ...current.paymentSettings, upiId: e.target.value } }))} className="w-full rounded-lg border border-gray-300 px-4 py-2" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Bank Account</label>
                <input value={settings.paymentSettings.bankAccount} onChange={(e) => updateSettingsDraft((current) => ({ ...current, paymentSettings: { ...current.paymentSettings, bankAccount: e.target.value } }))} className="w-full rounded-lg border border-gray-300 px-4 py-2" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Late Payment Fee</label>
                <input type="number" min={0} value={settings.paymentSettings.latePaymentFee} onChange={(e) => updateSettingsDraft((current) => ({ ...current, paymentSettings: { ...current.paymentSettings, latePaymentFee: Number(e.target.value) || 0 } }))} className="w-full rounded-lg border border-gray-300 px-4 py-2" />
              </div>
            </div>
            <div className="flex items-center justify-end">
              <button onClick={() => void persistSettings(settings, 'Payment settings saved successfully.')} disabled={isSaving} className="rounded-lg bg-indigo-600 px-6 py-2.5 text-white transition-colors hover:bg-indigo-700 disabled:opacity-60">Save Payment Settings</button>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-gray-900">Additional Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Language</label>
                <select value={settings.additionalSettings.language} onChange={(e) => updateSettingsDraft((current) => ({ ...current, additionalSettings: { ...current.additionalSettings, language: e.target.value } }))} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2">
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Kannada">Kannada</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Timezone</label>
                <select value={settings.additionalSettings.timezone} onChange={(e) => updateSettingsDraft((current) => ({ ...current, additionalSettings: { ...current.additionalSettings, timezone: e.target.value } }))} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2">
                  <option value="IST (UTC+5:30)">IST (UTC+5:30)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Currency</label>
                <select value={settings.additionalSettings.currency} onChange={(e) => updateSettingsDraft((current) => ({ ...current, additionalSettings: { ...current.additionalSettings, currency: e.target.value } }))} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2">
                  <option value="INR (Rs)">INR (Rs)</option>
                  <option value="USD ($)">USD ($)</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <button
                onClick={() => {
                  const selectedLanguage = settings.additionalSettings.language;
                  if (selectedLanguage === 'English' || selectedLanguage === 'Hindi' || selectedLanguage === 'Kannada') {
                    setLanguage(selectedLanguage as AppLanguage);
                  }
                  void persistSettings(settings, 'Additional settings saved successfully.');
                }}
                disabled={isSaving}
                className="rounded-lg bg-indigo-600 px-6 py-2.5 text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
              >
                Save Additional Settings
              </button>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <h2 className="text-gray-900">Danger Zone</h2>
                <p className="text-xs text-gray-500 mt-1">These actions can clear your account data.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button onClick={() => void handleExportData()} disabled={isSaving} className="rounded-lg border border-gray-300 bg-white px-4 py-2 transition-colors hover:bg-gray-50">Export All Data</button>
              <button onClick={() => void handleDeleteAllData()} disabled={isSaving} className="rounded-lg border border-red-300 px-4 py-2 text-red-700 transition-colors hover:bg-red-50">Delete All Data</button>
              <button onClick={() => void handleCloseAccount()} disabled={isSaving} className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700">Close Account</button>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'pg-rules' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-50 p-3">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-gray-900">PG Rules</h2>
                <p className="text-sm text-gray-500">Rules for WhatsApp chatbot auto-replies</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingRuleIndex(null);
                setNewRule('');
                setShowAddRuleModal(true);
              }}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700"
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
                <div key={`rule-${index}`} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 font-mono">{index + 1}.</span>
                    <p className="text-sm text-gray-900">{rule}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEditRule(index)} className="rounded-lg px-3 py-1 text-sm text-indigo-600 transition-colors hover:bg-indigo-50">Edit</button>
                    <button onClick={() => void handleDeleteRule(index)} className="rounded-lg px-3 py-1 text-sm text-red-600 transition-colors hover:bg-red-50">Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeSection === 'whatsapp' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-3">
                <MessageCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-gray-900">WhatsApp Automation</h2>
                <p className="text-sm text-gray-500">Configure WhatsApp chatbot templates</p>
              </div>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Save className="w-3 h-3" />
              Live Sync
            </div>
          </div>

          <div className="space-y-3">
            {whatsappTemplateItems.map((item, index) => (
              <div key={item.key} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div>
                  <p className="text-sm text-gray-900">{index + 1}. {item.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.template}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="relative inline-block w-12 h-6">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={item.enabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        updateSettingsDraft((current) => ({
                          ...current,
                          whatsappSettings: {
                            ...current.whatsappSettings,
                            [item.key]: {
                              ...current.whatsappSettings[item.key],
                              enabled: checked,
                            },
                          },
                        }));
                      }}
                    />
                    <div className="w-12 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-colors cursor-pointer"></div>
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform"></div>
                  </label>
                  <button onClick={() => handleTemplateEdit(item.key)} className="rounded-lg px-3 py-1 text-sm text-indigo-600 transition-colors hover:bg-indigo-50">Edit</button>
                </div>
              </div>
            ))}

            <div className="space-y-2 rounded-lg bg-gray-50 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-900">Rent Reminder Timing</p>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={settings.whatsappSettings.rentReminder.daysBeforeDue}
                  onChange={(e) => {
                    const days = Math.min(15, Math.max(1, Number(e.target.value) || 1));
                    updateSettingsDraft((current) => ({
                      ...current,
                      whatsappSettings: {
                        ...current.whatsappSettings,
                        rentReminder: {
                          ...current.whatsappSettings.rentReminder,
                          daysBeforeDue: days,
                        },
                      },
                    }));
                  }}
                  className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
              <p className="text-xs text-gray-500">Automatic reminders are sent this many days before due date.</p>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg space-y-2">
              <p className="text-sm text-gray-900">Complaint Notification Flags</p>
              {([
                ['notifyOnCreate', 'Notify on Ticket Create'],
                ['notifyOnProgress', 'Notify on In Progress'],
                ['notifyOnResolve', 'Notify on Resolve'],
              ] as const).map(([field, label]) => (
                <label key={field} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={settings.whatsappSettings.complaintUpdate[field]}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      updateSettingsDraft((current) => ({
                        ...current,
                        whatsappSettings: {
                          ...current.whatsappSettings,
                          complaintUpdate: {
                            ...current.whatsappSettings.complaintUpdate,
                            [field]: checked,
                          },
                        },
                      }));
                    }}
                    className="h-4 w-4"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end">
              <button onClick={() => void persistSettings(settings, 'WhatsApp automation settings saved successfully.')} disabled={isSaving} className="rounded-lg bg-indigo-600 px-6 py-2.5 text-white transition-colors hover:bg-indigo-700 disabled:opacity-60">Save WhatsApp Settings</button>
            </div>
          </div>
        </div>
      )}

      {showAddRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddRuleModal(false)}>
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900">{editingRuleIndex !== null ? 'Edit Rule' : 'Add New Rule'}</h2>
              <button onClick={() => setShowAddRuleModal(false)} className="rounded-md p-2 transition-colors hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Rule Text *</label>
                <textarea value={newRule} onChange={(e) => setNewRule(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2" rows={3} placeholder="e.g., Check-in time: After 6:00 PM" />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
                <button onClick={() => setShowAddRuleModal(false)} className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 transition-colors hover:bg-gray-50">Cancel</button>
                <button onClick={() => void handleAddRule()} disabled={!newRule.trim() || isSaving} className="rounded-lg bg-indigo-600 px-6 py-2.5 text-white transition-colors hover:bg-indigo-700 disabled:opacity-50">
                  {editingRuleIndex !== null ? 'Update Rule' : 'Add Rule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTemplateModal && editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowTemplateModal(false)}>
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900">Edit WhatsApp Template</h2>
              <button onClick={() => setShowTemplateModal(false)} className="rounded-md p-2 transition-colors hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Template Text *</label>
                <textarea value={editingTemplate.value} onChange={(e) => setEditingTemplate({ ...editingTemplate, value: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2" rows={5} />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
                <button onClick={() => setShowTemplateModal(false)} className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 transition-colors hover:bg-gray-50">Cancel</button>
                <button onClick={() => void handleTemplateSave()} disabled={!editingTemplate.value.trim() || isSaving} className="rounded-lg bg-indigo-600 px-6 py-2.5 text-white transition-colors hover:bg-indigo-700 disabled:opacity-50">
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
