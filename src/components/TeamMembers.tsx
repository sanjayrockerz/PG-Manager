import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Mail,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useProperty } from '../contexts/PropertyContext';
import {
  type CreateInviteInput,
  type DisplayRole,
  type InviteRecord,
  type TeamMemberRecord,
  inviteService,
  teamService,
} from '../services/inviteService';
import { validateInviteForm } from '../utils/validation';

const DISPLAY_ROLE_OPTIONS: { value: DisplayRole; label: string; description: string }[] = [
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Read-only access to assigned properties.',
  },
  {
    value: 'editor',
    label: 'Editor',
    description: 'Can manage tenants and maintenance.',
  },
  {
    value: 'manager',
    label: 'Manager',
    description: 'Full management including payments.',
  },
];

function roleColor(role: DisplayRole) {
  switch (role) {
    case 'viewer': return 'bg-gray-100 text-gray-700';
    case 'editor': return 'bg-blue-100 text-blue-700';
    case 'manager': return 'bg-purple-100 text-purple-700';
  }
}

function statusColor(status: InviteRecord['status']) {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-700';
    case 'accepted': return 'bg-green-100 text-green-700';
    case 'revoked': return 'bg-red-100 text-red-700';
    case 'expired': return 'bg-gray-100 text-gray-500';
  }
}

// ─── Invite Dialog ────────────────────────────────────────────────────────────

interface InviteDialogProps {
  onClose: () => void;
  onSuccess: () => void;
}

function InviteDialog({ onClose, onSuccess }: InviteDialogProps) {
  const { properties } = useProperty();
  const [formData, setFormData] = useState<CreateInviteInput>({
    invitedEmail: '',
    displayRole: 'viewer',
    propertyIds: [],
    capabilities: {},
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleProperty = (propId: string) => {
    setFormData((prev) => ({
      ...prev,
      propertyIds: prev.propertyIds.includes(propId)
        ? prev.propertyIds.filter((id) => id !== propId)
        : [...prev.propertyIds, propId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateInviteForm({
      invitedEmail: formData.invitedEmail,
      displayRole: formData.displayRole,
      propertyIds: formData.propertyIds,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await inviteService.createInvite(formData);
      toast.success(`Invite sent to ${formData.invitedEmail}`);
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create invite.';
      if (msg.includes('unique') || msg.includes('duplicate')) {
        setError('A pending invite already exists for this email. Revoke the previous one first.');
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRole = DISPLAY_ROLE_OPTIONS.find((r) => r.value === formData.displayRole);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Invite Team Member</h2>
            <p className="text-sm text-gray-500 mt-0.5">They will receive access to selected properties.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={formData.invitedEmail}
              onChange={(e) => setFormData({ ...formData, invitedEmail: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="member@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              The user must sign up or log in with this exact email.
            </p>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Access Role *
            </label>
            <div className="space-y-2">
              {DISPLAY_ROLE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.displayRole === opt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="displayRole"
                    value={opt.value}
                    checked={formData.displayRole === opt.value}
                    onChange={() => setFormData({ ...formData, displayRole: opt.value })}
                    className="mt-0.5"
                  />
                  <div>
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${roleColor(opt.value)}`}>
                      {opt.label}
                    </span>
                    <p className="text-sm text-gray-600 mt-1">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Property selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Properties to Grant Access *
            </label>
            {properties.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No properties found. Add a property first.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {properties.map((prop) => (
                  <label
                    key={prop.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                      formData.propertyIds.includes(prop.id)
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.propertyIds.includes(prop.id)}
                      onChange={() => toggleProperty(prop.id)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{prop.name}</p>
                      <p className="text-xs text-gray-500">{prop.city}, {prop.state}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {formData.propertyIds.length === 0
                ? 'Select at least one property.'
                : `${formData.propertyIds.length} property(ies) selected.`}
            </p>
          </div>

          {/* Capability summary */}
          {selectedRole && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-xs text-gray-600 space-y-1">
              <p className="font-medium text-gray-700 mb-1">Default capabilities for {selectedRole.label}:</p>
              <p>{selectedRole.value === 'viewer' ? '✓ View only — no edits' : ''}</p>
              <p>{selectedRole.value === 'editor' ? '✓ Tenants, maintenance' : ''}</p>
              <p>{selectedRole.value === 'manager' ? '✓ Tenants, payments, maintenance, announcements' : ''}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.propertyIds.length}
              className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main TeamMembers Component ───────────────────────────────────────────────

export function TeamMembers() {
  const { properties } = useProperty();
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [members, setMembers] = useState<TeamMemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [inviteList, memberList] = await Promise.all([
        inviteService.listInvites(),
        teamService.listMembers(),
      ]);
      setInvites(inviteList);
      setMembers(memberList);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load team data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Revoke this invite? The user will no longer be able to accept it.')) return;
    try {
      await inviteService.revokeInvite(inviteId);
      toast.success('Invite revoked.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke invite.');
    }
  };

  const handleRefreshInvite = async (inviteId: string) => {
    try {
      await inviteService.refreshInvite(inviteId);
      toast.success('Invite renewed for 7 more days.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to refresh invite.');
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Remove ${memberEmail} from your team? They will lose all property access.`)) return;
    try {
      await teamService.removeMember(memberId);
      toast.success('Member removed from team.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove member.');
    }
  };

  const getPropertyName = (id: string) => properties.find((p) => p.id === id)?.name ?? id;

  const pendingInvites = invites.filter((i) => i.status === 'pending');
  const pastInvites = invites.filter((i) => i.status !== 'pending');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading team data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Team Members</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Invite people and grant them access to specific properties.
          </p>
        </div>
        <button
          onClick={() => setShowInviteDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      {/* Active Members */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-green-600" />
          <h3 className="text-sm font-semibold text-gray-900">Active Members ({members.length})</h3>
        </div>

        {members.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Shield className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No active members yet. Invite someone to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {members.map((member) => (
              <div key={member.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.name || member.email}
                      </p>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${roleColor(member.displayRole)}`}>
                        {member.displayRole}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{member.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {member.propertyAssignments.length} propert{member.propertyAssignments.length === 1 ? 'y' : 'ies'} assigned
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedMemberId(expandedMemberId === member.id ? null : member.id)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View property assignments"
                    >
                      {expandedMemberId === member.id
                        ? <ChevronUp className="w-4 h-4 text-gray-500" />
                        : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </button>
                    <button
                      onClick={() => void handleRemoveMember(member.id, member.email)}
                      className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove member"
                    >
                      <UserX className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Expanded: property assignments */}
                {expandedMemberId === member.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Property Access</p>
                    {member.propertyAssignments.map((scope) => (
                      <div key={scope.propertyId} className="bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-800 font-medium">
                            {getPropertyName(scope.propertyId)}
                          </p>
                          <span className={`px-2 py-0.5 rounded text-xs ${roleColor(scope.displayRole)}`}>
                            {scope.displayRole}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                          {[
                            ['Tenants', scope.canManageTenants],
                            ['Payments', scope.canManagePayments],
                            ['Maintenance', scope.canManageMaintenance],
                            ['Announcements', scope.canManageAnnouncements],
                          ].map(([label, enabled]) => (
                            <span key={String(label)} className={`text-xs ${enabled ? 'text-green-700' : 'text-gray-400'}`}>
                              {enabled ? '✓' : '✗'} {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Invites */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-yellow-500" />
          <h3 className="text-sm font-semibold text-gray-900">Pending Invites ({pendingInvites.length})</h3>
        </div>

        {pendingInvites.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <Mail className="w-7 h-7 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No pending invites.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {pendingInvites.map((invite) => {
              const expiresDate = new Date(invite.expiresAt);
              const isAlmostExpired = (expiresDate.getTime() - Date.now()) < 24 * 60 * 60 * 1000;

              return (
                <div key={invite.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 truncate">{invite.invitedEmail}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${roleColor(invite.displayRole)}`}>
                          {invite.displayRole}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(invite.status)}`}>
                          {invite.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Properties: {invite.propertyIds.map(getPropertyName).join(', ')}
                      </p>
                      <p className={`text-xs mt-0.5 ${isAlmostExpired ? 'text-red-500' : 'text-gray-400'}`}>
                        Expires: {expiresDate.toLocaleDateString('en-IN')}
                        {isAlmostExpired ? ' (expires soon)' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void handleRefreshInvite(invite.id)}
                        className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Renew invite for 7 more days"
                      >
                        <RefreshCw className="w-4 h-4 text-blue-500" />
                      </button>
                      <button
                        onClick={() => void handleRevokeInvite(invite.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        title="Revoke invite"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Invites */}
      {pastInvites.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Check className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-600">Invite History</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {pastInvites.slice(0, 10).map((invite) => (
              <div key={invite.id} className="px-5 py-3 flex items-center gap-3">
                <p className="text-sm text-gray-600 flex-1 truncate">{invite.invitedEmail}</p>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(invite.status)}`}>
                  {invite.status}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(invite.invitedAt).toLocaleDateString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="rounded-xl bg-blue-50 border border-blue-200 px-5 py-4">
        <p className="text-sm font-semibold text-blue-900 mb-2">How invites work</p>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li>Enter the email address and role for the person you want to invite.</li>
          <li>Select which properties they can access.</li>
          <li>When they sign up or log in with that exact email, they will automatically get access.</li>
          <li>Invites expire after 7 days. You can refresh them at any time.</li>
          <li>Members can only see data for their assigned properties — never other owners' data.</li>
        </ul>
      </div>

      {showInviteDialog && (
        <InviteDialog onClose={() => setShowInviteDialog(false)} onSuccess={() => void load()} />
      )}
    </div>
  );
}
