import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from './ui/alert-dialog';
import { InternationalPhoneField } from './ui/InternationalPhoneField';
import {
  User, CreditCard, MessageCircle, Users, Crown, FileText,
  Bell, Shield, Globe, AlertTriangle, Check, Plus, Trash,
  Loader2, Save, RefreshCw, Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import {
  supabaseAuthDataApi, supabaseOwnerDataApi, supabaseNotificationApi,
  type OwnerSettingsRecord, type ProfileUpdateInput, type NotificationRecord,
  type OwnerSubscriptionRecord,
} from '../services/supabaseData';
import { inviteService, teamService, type TeamMemberRecord, type DisplayRole } from '../services/inviteService';
import type { InviteRecord } from '../services/inviteService';

// ─── Toggle component ─────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-[#4F46E5]' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

const roleBadge: Record<string, string> = {
  manager: 'bg-blue-100 text-blue-700',
  editor: 'bg-green-100 text-green-700',
  viewer: 'bg-gray-100 text-gray-700',
  owner: 'bg-purple-100 text-purple-700',
};

const notifTypeBadge: Record<string, string> = {
  payment: 'bg-green-100 text-green-700',
  maintenance: 'bg-amber-100 text-amber-700',
  tenant: 'bg-blue-100 text-blue-700',
  announcement: 'bg-purple-100 text-purple-700',
};

export function Settings() {
  const { user, refreshProfile } = useAuth();
  const { properties } = useProperty();
  const [activeTab, setActiveTab] = useState('basic');

  // ── Profile ──────────────────────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState<ProfileUpdateInput>({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    pgName: user?.pgName ?? '',
    city: user?.city ?? '',
  });
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    setProfileForm({
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      pgName: user?.pgName ?? '',
      city: user?.city ?? '',
    });
  }, [user]);

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      await supabaseAuthDataApi.updateCurrentProfile(profileForm);
      await refreshProfile();
      toast.success('Profile saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Owner Settings ────────────────────────────────────────────────────────────
  const [ownerSettings, setOwnerSettings] = useState<OwnerSettingsRecord | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const loadOwnerSettings = async () => {
    try {
      const s = await supabaseOwnerDataApi.getOwnerSettings();
      setOwnerSettings(s);
    } catch {
      // use defaults silently
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveOwnerSettings = async (updated: OwnerSettingsRecord) => {
    setSettingsSaving(true);
    try {
      const saved = await supabaseOwnerDataApi.updateOwnerSettings(updated);
      setOwnerSettings(saved);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const patchSettings = (patch: Partial<OwnerSettingsRecord>) => {
    if (!ownerSettings) return;
    const updated = { ...ownerSettings, ...patch };
    setOwnerSettings(updated);
    void saveOwnerSettings(updated);
  };

  // ── Team ──────────────────────────────────────────────────────────────────────
  const [teamMembers, setTeamMembers] = useState<TeamMemberRecord[]>([]);
  const [pendingInvites, setPendingInvites] = useState<InviteRecord[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'viewer' as DisplayRole, propertyIds: [] as string[] });
  const [inviteSaving, setInviteSaving] = useState(false);

  // Remove confirm
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState<TeamMemberRecord | null>(null);

  const loadTeam = async () => {
    setTeamLoading(true);
    try {
      const [members, invites] = await Promise.all([
        teamService.listMembers(),
        inviteService.listInvites(),
      ]);
      setTeamMembers(members);
      setPendingInvites(invites.filter((i) => i.status === 'pending'));
    } catch {
      // team management not available (e.g., demo accounts without team setup)
    } finally {
      setTeamLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.email) {
      toast.error('Email is required');
      return;
    }
    setInviteSaving(true);
    try {
      await inviteService.createInvite({
        invitedEmail: inviteForm.email,
        displayRole: inviteForm.role,
        propertyIds: inviteForm.propertyIds.length > 0 ? inviteForm.propertyIds : properties.map((p) => p.id),
      });
      toast.success(`Invite sent to ${inviteForm.email}`);
      setInviteOpen(false);
      setInviteForm({ email: '', role: 'viewer', propertyIds: [] });
      void loadTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setInviteSaving(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removingMember) return;
    try {
      await teamService.removeMember(removingMember.id);
      toast.success(`${removingMember.name} removed from team`);
      setRemoveOpen(false);
      setRemovingMember(null);
      void loadTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleRevokeInvite = async (inviteId: string, email: string) => {
    try {
      await inviteService.revokeInvite(inviteId);
      toast.success(`Invite revoked for ${email}`);
      void loadTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke invite');
    }
  };

  // ── Audit Log ─────────────────────────────────────────────────────────────────
  const [auditLog, setAuditLog] = useState<NotificationRecord[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditFilter, setAuditFilter] = useState<'all' | 'payment' | 'maintenance' | 'tenant' | 'announcement'>('all');

  const loadAuditLog = async () => {
    try {
      const data = await supabaseNotificationApi.listForCurrentUser();
      setAuditLog(data);
    } catch {
      // silent
    } finally {
      setAuditLoading(false);
    }
  };

  // ── Subscription ──────────────────────────────────────────────────────────────
  const [subscription, setSubscription] = useState<OwnerSubscriptionRecord | null>(null);

  const loadSubscription = async () => {
    try {
      const sub = await supabaseOwnerDataApi.getOwnerSubscription();
      setSubscription(sub);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    void loadOwnerSettings();
    void loadTeam();
    void loadAuditLog();
    void loadSubscription();
  }, []);

  const filteredAudit = auditLog.filter(
    (n) => auditFilter === 'all' || n.type === auditFilter,
  );

  const planLabel = subscription ? (subscription.planCode === 'starter' ? 'Free' : subscription.planCode.charAt(0).toUpperCase() + subscription.planCode.slice(1)) : 'Free';
  const planStatusColor: Record<string, string> = { trialing: 'bg-blue-100 text-blue-700', active: 'bg-green-100 text-green-700', past_due: 'bg-red-100 text-red-700', cancelled: 'bg-gray-100 text-gray-700' };

  return (
    <div className="p-6 bg-gray-50 min-h-screen pb-20 md:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account, team, and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-white border border-gray-200 flex-wrap h-auto gap-1">
          {[
            { value: 'basic', icon: User, label: 'Profile' },
            { value: 'payment', icon: CreditCard, label: 'Payment' },
            { value: 'whatsapp', icon: MessageCircle, label: 'WhatsApp' },
            { value: 'team', icon: Users, label: 'Team' },
            { value: 'subscription', icon: Crown, label: 'Plan' },
            { value: 'audit', icon: FileText, label: 'Activity' },
          ].map(({ value, icon: Icon, label }) => (
            <TabsTrigger key={value} value={value} className="data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white">
              <Icon className="w-4 h-4 mr-1.5" /> {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── PROFILE TAB ──────────────────────────────────────────────────────── */}
        <TabsContent value="basic">
          <div className="space-y-6">
            {/* Profile */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">
                      {(user?.name ?? user?.email ?? 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{user?.name || user?.email}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Full Name</Label>
                    <Input value={profileForm.name ?? ''} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="h-11" placeholder="Your full name" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input value={user?.email ?? ''} disabled className="h-11 pl-9 bg-gray-50 text-gray-500 cursor-not-allowed" />
                    </div>
                    <p className="text-xs text-gray-400">Email cannot be changed here</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Phone</Label>
                    <InternationalPhoneField value={profileForm.phone ?? ''} onChange={(v) => setProfileForm({ ...profileForm, phone: v })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">PG / Business Name</Label>
                    <Input value={profileForm.pgName ?? ''} onChange={(e) => setProfileForm({ ...profileForm, pgName: e.target.value })} className="h-11" placeholder="e.g., Sunrise PG" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">City</Label>
                    <Input value={profileForm.city ?? ''} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} className="h-11" placeholder="e.g., Bengaluru" />
                  </div>
                </div>

                <Button onClick={() => void saveProfile()} disabled={profileSaving} className="bg-[#4F46E5] hover:bg-[#4338CA] text-white">
                  {profileSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Profile
                </Button>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" /> Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {settingsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : ownerSettings ? (
                  <>
                    {[
                      { key: 'paymentNotifications' as const, label: 'Payment notifications', desc: 'Get notified when rent is paid or overdue' },
                      { key: 'maintenanceAlerts' as const, label: 'Maintenance alerts', desc: 'Notifications for new and updated tickets' },
                      { key: 'tenantUpdates' as const, label: 'Tenant updates', desc: 'Activity from tenant onboarding and changes' },
                      { key: 'emailNotifications' as const, label: 'Email notifications', desc: 'Receive summaries via email' },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{label}</p>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                        <Toggle
                          checked={ownerSettings.notifications[key]}
                          onChange={(v) => patchSettings({ notifications: { ...ownerSettings.notifications, [key]: v } })}
                        />
                      </div>
                    ))}
                    {settingsSaving && <p className="text-xs text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</p>}
                  </>
                ) : (
                  <p className="text-sm text-gray-400">Could not load notification settings</p>
                )}
              </CardContent>
            </Card>

            {/* Preferences */}
            {ownerSettings && (
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5" /> Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Language</Label>
                      <select
                        value={ownerSettings.additionalSettings.language}
                        onChange={(e) => patchSettings({ additionalSettings: { ...ownerSettings.additionalSettings, language: e.target.value } })}
                        className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="en">English</option>
                        <option value="hi">Hindi</option>
                        <option value="kn">Kannada</option>
                        <option value="ta">Tamil</option>
                        <option value="te">Telugu</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Timezone</Label>
                      <select
                        value={ownerSettings.additionalSettings.timezone}
                        onChange={(e) => patchSettings({ additionalSettings: { ...ownerSettings.additionalSettings, timezone: e.target.value } })}
                        className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="Asia/Kolkata">IST (UTC+5:30)</option>
                        <option value="America/New_York">EST (UTC-5:00)</option>
                        <option value="America/Los_Angeles">PST (UTC-8:00)</option>
                        <option value="Asia/Dubai">GST (UTC+4:00)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Currency</Label>
                      <select
                        value={ownerSettings.additionalSettings.currency}
                        onChange={(e) => patchSettings({ additionalSettings: { ...ownerSettings.additionalSettings, currency: e.target.value } })}
                        className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="AED">AED (د.إ)</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">Authentication is handled via magic link and Google OAuth through Supabase. No password to change.</p>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                    <p className="text-xs text-gray-500">Available as a platform upgrade</p>
                  </div>
                  {ownerSettings && (
                    <Toggle
                      checked={ownerSettings.security.twoFactorAuthentication}
                      onChange={(v) => patchSettings({ security: { twoFactorAuthentication: v } })}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Danger zone */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700"><AlertTriangle className="w-5 h-5" /> Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-red-900">Delete Account</h4>
                    <p className="text-sm text-red-600">Permanently deletes all your data. Cannot be undone.</p>
                  </div>
                  <Button variant="destructive" disabled>Delete Account</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── PAYMENT SETTINGS TAB ─────────────────────────────────────────────── */}
        <TabsContent value="payment">
          <div className="space-y-6">
            {settingsLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : ownerSettings ? (
              <>
                <Card className="border-gray-200">
                  <CardHeader>
                    <CardTitle>Payment Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">UPI ID</Label>
                      <Input
                        placeholder="yourname@upi"
                        value={ownerSettings.paymentSettings.upiId}
                        onChange={(e) => setOwnerSettings({ ...ownerSettings, paymentSettings: { ...ownerSettings.paymentSettings, upiId: e.target.value } })}
                        className="h-11"
                      />
                      <p className="text-xs text-gray-400">Shown to tenants for rent payments</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Bank Account Number</Label>
                      <Input
                        placeholder="XXXX XXXX XXXX 1234"
                        value={ownerSettings.paymentSettings.bankAccount}
                        onChange={(e) => setOwnerSettings({ ...ownerSettings, paymentSettings: { ...ownerSettings.paymentSettings, bankAccount: e.target.value } })}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Late Payment Fee (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={ownerSettings.paymentSettings.latePaymentFee || ''}
                        onChange={(e) => setOwnerSettings({ ...ownerSettings, paymentSettings: { ...ownerSettings.paymentSettings, latePaymentFee: parseInt(e.target.value) || 0 } })}
                        className="h-11"
                      />
                      <p className="text-xs text-gray-400">Auto-applied when rent becomes overdue</p>
                    </div>
                    <Button onClick={() => void saveOwnerSettings(ownerSettings)} disabled={settingsSaving} className="bg-[#4F46E5] hover:bg-[#4338CA] text-white">
                      {settingsSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Payment Settings
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-1">Payment Gateway Integration</h4>
                        <p className="text-sm text-blue-700">Upgrade to Pro to accept payments directly through the platform with automated tracking and receipts.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">Could not load payment settings</p>
            )}
          </div>
        </TabsContent>

        {/* ── WHATSAPP TAB ─────────────────────────────────────────────────────── */}
        <TabsContent value="whatsapp">
          <div className="space-y-6">
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle>WhatsApp Connection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">WhatsApp Business API not connected</p>
                    <p className="text-xs text-amber-700">Connect your WhatsApp Business account to enable automated messaging</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle>Message Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {settingsLoading ? (
                  <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                ) : ownerSettings ? (
                  [
                    { key: 'welcomeMessage' as const, label: 'Welcome Message', desc: 'Sent when a new tenant is onboarded' },
                    { key: 'rentReminder' as const, label: 'Rent Reminder', desc: `Sent ${ownerSettings.whatsappSettings.rentReminder.daysBeforeDue} days before due date` },
                    { key: 'paymentConfirmation' as const, label: 'Payment Confirmation', desc: 'Sent when payment is marked as received' },
                    { key: 'complaintUpdate' as const, label: 'Maintenance Update', desc: 'Sent when a ticket status changes' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                      <div>
                        <h4 className="font-medium text-gray-900">{label}</h4>
                        <p className="text-sm text-gray-500">{desc}</p>
                      </div>
                      <Toggle
                        checked={ownerSettings.whatsappSettings[key].enabled}
                        onChange={(v) => patchSettings({
                          whatsappSettings: {
                            ...ownerSettings.whatsappSettings,
                            [key]: { ...ownerSettings.whatsappSettings[key], enabled: v },
                          },
                        })}
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">Could not load template settings</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TEAM TAB ─────────────────────────────────────────────────────────── */}
        <TabsContent value="team">
          <div className="space-y-6">
            <Card className="border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Team Members</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => void loadTeam()} className="h-8">
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
                  </Button>
                  <Button size="sm" onClick={() => setInviteOpen(true)} className="bg-[#4F46E5] hover:bg-[#4338CA] text-white h-8">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Invite
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {teamLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                ) : teamMembers.length === 0 && pendingInvites.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No team members yet. Invite a manager or staff member.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          {['Member', 'Email', 'Role', 'Status', 'Actions'].map((h) => (
                            <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {teamMembers.map((member) => (
                          <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">{(member.name || member.email || 'U').slice(0, 1).toUpperCase()}</span>
                                </div>
                                <span className="text-sm font-medium text-gray-900">{member.name || '—'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">{member.email}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleBadge[member.displayRole ?? member.role] ?? 'bg-gray-100 text-gray-700'}`}>
                                {member.displayRole ?? member.role}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>
                            </td>
                            <td className="py-3 px-4">
                              <Button variant="ghost" size="sm" onClick={() => { setRemovingMember(member); setRemoveOpen(true); }} className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                                <Trash className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                        {pendingInvites.map((invite) => (
                          <tr key={invite.id} className="border-b border-gray-100 hover:bg-gray-50 opacity-75">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                  <Mail className="w-4 h-4 text-gray-400" />
                                </div>
                                <span className="text-sm font-medium text-gray-500">Pending invite</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-500">{invite.invitedEmail}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${roleBadge[invite.displayRole] ?? 'bg-gray-100 text-gray-700'}`}>
                                {invite.displayRole}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Pending</span>
                            </td>
                            <td className="py-3 px-4">
                              <Button variant="ghost" size="sm" onClick={() => void handleRevokeInvite(invite.id, invite.invitedEmail)} className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 text-xs">
                                Revoke
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── SUBSCRIPTION TAB ──────────────────────────────────────────────────── */}
        <TabsContent value="subscription">
          <div className="space-y-6">
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-gray-900">{planLabel} Plan</h3>
                      {subscription && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${planStatusColor[subscription.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {subscription.status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                      )}
                    </div>
                    <ul className="space-y-2 mt-4">
                      {['Basic payment tracking', 'Up to 10 tenants', 'Maintenance tickets', 'Announcements'].map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                          <Check className="w-4 h-4 text-green-600" /> {f}
                        </li>
                      ))}
                    </ul>
                    {subscription?.trialEndsAt && (
                      <p className="text-sm text-amber-600 mt-3">
                        Trial ends: {new Date(subscription.trialEndsAt).toLocaleDateString('en-IN')}
                      </p>
                    )}
                    {subscription?.renewsAt && (
                      <p className="text-sm text-gray-500 mt-2">
                        Renews: {new Date(subscription.renewsAt).toLocaleDateString('en-IN')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900">
                      {subscription && subscription.amount > 0 ? `₹${subscription.amount}` : '₹0'}
                    </div>
                    <div className="text-sm text-gray-500">/{subscription?.billingCycle ?? 'month'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-300 bg-gradient-to-br from-purple-50 to-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-[#4F46E5]" /> Upgrade to Pro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
                  <ul className="space-y-2">
                    {['Unlimited tenants', 'Payment gateway integration', 'Unlimited WhatsApp messages', 'Team collaboration (5 seats)', 'Advanced analytics & reports'].map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <Check className="w-4 h-4 text-[#4F46E5]" /> {f}
                      </li>
                    ))}
                  </ul>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-[#4F46E5]">₹999</div>
                    <div className="text-sm text-gray-500">/month</div>
                  </div>
                </div>
                <Button className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white">Upgrade Now</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── AUDIT LOG TAB ────────────────────────────────────────────────────── */}
        <TabsContent value="audit">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                {(['all', 'payment', 'maintenance', 'tenant', 'announcement'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setAuditFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      auditFilter === f ? 'bg-[#4F46E5] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-300'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {auditLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
              ) : filteredAudit.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No activity recorded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAudit.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <span className={`flex-shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${notifTypeBadge[entry.type] ?? 'bg-gray-100 text-gray-700'}`}>
                        {entry.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{entry.title}</p>
                        <p className="text-xs text-gray-500 truncate">{entry.message}</p>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {new Date(entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Invite Member Modal ──────────────────────────────────────────────── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Email Address *</Label>
              <Input type="email" placeholder="colleague@example.com" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} className="h-11" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Role</Label>
              <select value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as DisplayRole })} className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="viewer">Viewer — read-only access</option>
                <option value="editor">Editor — manage tenants & maintenance</option>
                <option value="manager">Manager — full access</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Property Access</Label>
              <div className="space-y-2 max-h-36 overflow-y-auto border border-gray-200 rounded-md p-2">
                {properties.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2 text-center">No properties yet</p>
                ) : properties.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inviteForm.propertyIds.length === 0 || inviteForm.propertyIds.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setInviteForm({ ...inviteForm, propertyIds: [...inviteForm.propertyIds, p.id] });
                        } else {
                          setInviteForm({ ...inviteForm, propertyIds: inviteForm.propertyIds.filter((id) => id !== p.id) });
                        }
                      }}
                      className="w-4 h-4 accent-purple-600"
                    />
                    <span className="text-sm text-gray-700">{p.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400">Leave all unchecked to grant access to all properties</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleInvite()} disabled={inviteSaving} className="bg-[#4F46E5] hover:bg-[#4338CA] text-white">
              {inviteSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Remove Member Confirm ────────────────────────────────────────────── */}
      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash className="w-5 h-5" /> Remove Team Member?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>{removingMember?.name || removingMember?.email}</strong> from your team? Their access will be revoked immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleRemoveMember()} className="bg-red-600 hover:bg-red-700 text-white">
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
