import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Info,
  Mail,
  Pencil,
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
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import {
  type CreateInviteInput,
  type DisplayRole,
  type InviteCapabilities,
  type InviteRecord,
  type TeamMemberRecord,
  inviteService,
  teamService,
} from '../services/inviteService';
import { workspaceService, type WorkspaceMemberSummary } from '../services/workspaceService';
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

const DEFAULT_CAPS_FOR_ROLE: Record<DisplayRole, InviteCapabilities> = {
  viewer: { canManageTenants: false, canManagePayments: false, canManageMaintenance: false, canManageAnnouncements: false },
  editor: { canManageTenants: true, canManagePayments: false, canManageMaintenance: true, canManageAnnouncements: false },
  manager: { canManageTenants: true, canManagePayments: true, canManageMaintenance: true, canManageAnnouncements: true },
};

function roleColor(role: DisplayRole) {
  switch (role) {
    case 'viewer': return 'ds-badge ds-badge-neutral';
    case 'editor': return 'ds-badge ds-badge-accent';
    case 'manager': return 'ds-badge ds-badge-accent';
  }
}

function statusColor(status: InviteRecord['status']) {
  switch (status) {
    case 'pending': return 'ds-badge ds-badge-warning';
    case 'accepted': return 'ds-badge ds-badge-success';
    case 'revoked': return 'ds-badge ds-badge-danger';
    case 'expired': return 'ds-badge ds-badge-neutral';
  }
}

const buildInviteLink = (token: string): string => {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/accept-invite?token=${token}`;
};

// â"€â"€â"€ Capability Toggle Row â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function CapabilityRow({
  label,
  enabled,
  onChange,
  disabled,
}: {
  label: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center justify-between py-1 cursor-pointer group">
      <span className={`text-sm ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
          enabled ? 'bg-indigo-600' : 'bg-gray-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            enabled ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}

// â"€â"€â"€ Edit Scope Dialog â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

interface EditScopeDialogProps {
  memberId: string;
  memberEmail: string;
  propertyId: string;
  propertyName: string;
  currentRole: DisplayRole;
  currentCaps: {
    canManageTenants: boolean;
    canManagePayments: boolean;
    canManageMaintenance: boolean;
    canManageAnnouncements: boolean;
  };
  onClose: () => void;
  onSuccess: () => void;
}

function EditScopeDialog({
  memberId,
  memberEmail,
  propertyId,
  propertyName,
  currentRole,
  currentCaps,
  onClose,
  onSuccess,
}: EditScopeDialogProps) {
  const [displayRole, setDisplayRole] = useState<DisplayRole>(currentRole);
  const [caps, setCaps] = useState(currentCaps);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleChange = (role: DisplayRole) => {
    setDisplayRole(role);
    setCaps(DEFAULT_CAPS_FOR_ROLE[role]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await teamService.updateMemberScopeWithAudit(memberId, propertyId, displayRole, {
        canView: true,
        canManageTenants: caps.canManageTenants,
        canManagePayments: caps.canManagePayments,
        canManageMaintenance: caps.canManageMaintenance,
        canManageAnnouncements: caps.canManageAnnouncements,
      });
      toast.success('Access updated.');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update access.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="ds-card max-w-sm w-full" style={{ padding: 0 }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Edit Property Access</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[220px]">{propertyName} Â· {memberEmail}</p>
          </div>
          <button onClick={onClose} className="ds-btn ds-btn-secondary" style={{ padding: '4px 8px' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4">
          {/* Role */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">Access Role</p>
            <div className="flex gap-2">
              {DISPLAY_ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleRoleChange(opt.value)}
                  className={`flex-1 py-2 px-2 text-xs rounded-lg border transition-colors ${
                    displayRole === opt.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Capabilities */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">Capabilities</p>
            <div className="bg-gray-50 rounded-lg px-3 py-1 divide-y divide-gray-100">
              <CapabilityRow
                label="Manage Tenants"
                enabled={caps.canManageTenants}
                onChange={(v) => setCaps((c) => ({ ...c, canManageTenants: v }))}
                disabled={displayRole === 'viewer'}
              />
              <CapabilityRow
                label="Manage Payments"
                enabled={caps.canManagePayments}
                onChange={(v) => setCaps((c) => ({ ...c, canManagePayments: v }))}
                disabled={displayRole === 'viewer'}
              />
              <CapabilityRow
                label="Manage Maintenance"
                enabled={caps.canManageMaintenance}
                onChange={(v) => setCaps((c) => ({ ...c, canManageMaintenance: v }))}
                disabled={displayRole === 'viewer'}
              />
              <CapabilityRow
                label="Post Announcements"
                enabled={caps.canManageAnnouncements}
                onChange={(v) => setCaps((c) => ({ ...c, canManageAnnouncements: v }))}
                disabled={displayRole === 'viewer'}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="ds-btn ds-btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ds-btn ds-btn-primary flex-1"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// â"€â"€â"€ Add Property Scope Dialog â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

interface AddPropertyScopeDialogProps {
  memberId: string;
  memberEmail: string;
  alreadyAssignedIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

function AddPropertyScopeDialog({
  memberId,
  memberEmail,
  alreadyAssignedIds,
  onClose,
  onSuccess,
}: AddPropertyScopeDialogProps) {
  const { properties } = useProperty();
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [displayRole, setDisplayRole] = useState<DisplayRole>('viewer');
  const [caps, setCaps] = useState<InviteCapabilities>(DEFAULT_CAPS_FOR_ROLE.viewer);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableProperties = properties.filter((p) => !alreadyAssignedIds.includes(p.id));

  const handleRoleChange = (role: DisplayRole) => {
    setDisplayRole(role);
    setCaps(DEFAULT_CAPS_FOR_ROLE[role]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyId) return;
    setIsSubmitting(true);
    try {
      await teamService.addPropertyScope(memberId, selectedPropertyId, displayRole, caps);
      toast.success('Property access granted.');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to grant access.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="ds-card max-w-sm w-full" style={{ padding: 0 }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Add Property Access</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[220px]">{memberEmail}</p>
          </div>
          <button onClick={onClose} className="ds-btn ds-btn-secondary" style={{ padding: '4px 8px' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-5 space-y-4">
          {availableProperties.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              This member already has access to all your properties.
            </p>
          ) : (
            <>
              {/* Property picker */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">Property</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {availableProperties.map((prop) => (
                    <label
                      key={prop.id}
                      className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedPropertyId === prop.id
                          ? 'bg-indigo-50 border border-indigo-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <input
                        type="radio"
                        name="property"
                        value={prop.id}
                        checked={selectedPropertyId === prop.id}
                        onChange={() => setSelectedPropertyId(prop.id)}
                        className="text-indigo-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{prop.name}</p>
                        <p className="text-xs text-gray-500">{prop.city}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Role */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">Access Role</p>
                <div className="flex gap-2">
                  {DISPLAY_ROLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleRoleChange(opt.value)}
                      className={`flex-1 py-2 px-2 text-xs rounded-lg border transition-colors ${
                        displayRole === opt.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-semibold'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Capabilities */}
              {displayRole !== 'viewer' && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">Capabilities</p>
                  <div className="bg-gray-50 rounded-lg px-3 py-1 divide-y divide-gray-100">
                    <CapabilityRow
                      label="Manage Tenants"
                      enabled={caps.canManageTenants}
                      onChange={(v) => setCaps((c) => ({ ...c, canManageTenants: v }))}
                    />
                    <CapabilityRow
                      label="Manage Payments"
                      enabled={caps.canManagePayments}
                      onChange={(v) => setCaps((c) => ({ ...c, canManagePayments: v }))}
                    />
                    <CapabilityRow
                      label="Manage Maintenance"
                      enabled={caps.canManageMaintenance}
                      onChange={(v) => setCaps((c) => ({ ...c, canManageMaintenance: v }))}
                    />
                    <CapabilityRow
                      label="Post Announcements"
                      enabled={caps.canManageAnnouncements}
                      onChange={(v) => setCaps((c) => ({ ...c, canManageAnnouncements: v }))}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="ds-btn ds-btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedPropertyId}
                  className="ds-btn ds-btn-primary flex-1"
                >
                  {isSubmitting ? 'Granting...' : 'Grant Access'}
                </button>
              </div>
            </>
          )}

          {availableProperties.length === 0 && (
            <button
              type="button"
              onClick={onClose}
              className="ds-btn ds-btn-secondary w-full"
            >
              Close
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

// â"€â"€â"€ Invite Dialog â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

interface InviteDialogProps {
  onClose: () => void;
  onSuccess: () => void;
  // When a manager opens the dialog: restrict roles + scope properties + set workspace owner
  allowedRoles?: DisplayRole[];
  workspaceOwnerId?: string;
  scopedPropertyIds?: string[];
}

function InviteDialog({ onClose, onSuccess, allowedRoles, workspaceOwnerId, scopedPropertyIds }: InviteDialogProps) {
  const { properties } = useProperty();
  const [formData, setFormData] = useState<CreateInviteInput>({
    invitedEmail: '',
    displayRole: 'viewer',
    propertyIds: [],
    capabilities: {},
    workspaceOwnerId,
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<InviteRecord | null>(null);

  const handleCopyLink = async (token: string) => {
    const link = buildInviteLink(token);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Invite link copied.');
    } catch {
      toast.error('Unable to copy invite link.');
    }
  };

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
      const invite = await inviteService.createInvite(formData);
      setCreatedInvite(invite);
      toast.success(`Invite created for ${formData.invitedEmail}`);
      onSuccess();
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

  const visibleRoleOptions = allowedRoles
    ? DISPLAY_ROLE_OPTIONS.filter((r) => allowedRoles.includes(r.value))
    : DISPLAY_ROLE_OPTIONS;

  // Scope property list: if manager, only show their assigned properties
  const availableProperties = scopedPropertyIds
    ? properties.filter((p) => scopedPropertyIds.includes(p.id))
    : properties;

  const selectedRole = visibleRoleOptions.find((r) => r.value === formData.displayRole);
  const inviteLink = createdInvite ? buildInviteLink(createdInvite.token) : '';

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
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
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
            {allowedRoles && (
              <div className="flex items-center gap-1.5 mb-2 px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200">
                <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700">As a manager, you can invite editors and viewers only.</p>
              </div>
            )}
            <div className="space-y-2">
              {visibleRoleOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.displayRole === opt.value
                      ? 'border-blue-500 bg-indigo-50'
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
            {availableProperties.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No properties found. Add a property first.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {availableProperties.map((prop) => (
                  <label
                    key={prop.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                      formData.propertyIds.includes(prop.id)
                        ? 'bg-indigo-50 border border-indigo-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.propertyIds.includes(prop.id)}
                      onChange={() => toggleProperty(prop.id)}
                      className="w-4 h-4 text-indigo-600"
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

          {createdInvite && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-green-800">Invite created!</p>
              </div>
              <p className="text-xs text-green-700">
                A sign-in email has been sent if your project has SMTP configured.
                Either way, share this link directly to guarantee delivery:
              </p>
              <div className="flex items-center gap-2">
                <input
                  value={inviteLink}
                  readOnly
                  className="flex-1 px-2 py-1 border border-green-300 rounded bg-white text-[11px] font-mono"
                />
                <button
                  type="button"
                  onClick={() => void handleCopyLink(createdInvite.token)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
                >
                  Copy Link
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              {createdInvite ? 'Done' : 'Cancel'}
            </button>
            {!createdInvite && (
              <button
                type="submit"
                disabled={isSubmitting || !formData.propertyIds.length}
                className="ds-btn ds-btn-primary"
              >
                {isSubmitting ? 'Creating...' : 'Create Invite'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// â"€â"€â"€ Main TeamMembers Component â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

interface EditScopeState {
  memberId: string;
  memberEmail: string;
  propertyId: string;
  propertyName: string;
  currentRole: DisplayRole;
  currentCaps: {
    canManageTenants: boolean;
    canManagePayments: boolean;
    canManageMaintenance: boolean;
    canManageAnnouncements: boolean;
  };
}

export function TeamMembers() {
  const { properties } = useProperty();
  const { navWorkspaceRole, managedProperties, workspaceMemberships } = useWorkspace();
  const { user } = useAuth();

  // Determine if the caller is a manager (not workspace owner)
  const isManager = navWorkspaceRole === 'manager';

  // For managers: find the workspace owner ID from their membership records
  const managerWorkspaceOwnerId = isManager
    ? (workspaceMemberships.find((m) => m.workspaceRole === 'manager')?.workspaceOwnerId ?? null)
    : null;

  // Property IDs the manager has access to (scoped invite + team view)
  const managerPropertyIds = isManager
    ? managedProperties.map((p) => p.propertyId)
    : [];

  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [members, setMembers] = useState<TeamMemberRecord[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [editScopeState, setEditScopeState] = useState<EditScopeState | null>(null);
  const [addPropertyState, setAddPropertyState] = useState<{ memberId: string; memberEmail: string; assignedIds: string[] } | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isManager && managerWorkspaceOwnerId) {
        // Manager: load invites attributed to the workspace owner, scoped to their properties
        // and members relevant to their assigned properties
        const [inviteList, memberSummaries] = await Promise.all([
          inviteService.listInvites(), // RLS limits to records where owner_id=me or invited by me
          workspaceService.listMembersForProperties(managerWorkspaceOwnerId, managerPropertyIds),
        ]);
        setInvites(inviteList.filter((inv) => inv.ownerId === managerWorkspaceOwnerId));
        setWorkspaceMembers(memberSummaries);
        setMembers([]);
      } else {
        // Workspace owner: load full team
        const [inviteList, memberList] = await Promise.all([
          inviteService.listInvites(),
          teamService.listMembers(),
        ]);
        setInvites(inviteList);
        setMembers(memberList);
        setWorkspaceMembers([]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load team data.');
    } finally {
      setIsLoading(false);
    }
  }, [isManager, managerWorkspaceOwnerId, managerPropertyIds.join(',')]);

  useEffect(() => {
    void load();
  }, [load]);

  // Live team roster: when an invited user accepts (from their own session) the
  // invite flips to accepted and a property scope row is created. Subscribe to
  // both tables for this workspace owner so the Team page reflects the new member
  // and the cleared pending invite without a manual refresh.
  const workspaceOwnerId = isManager ? managerWorkspaceOwnerId : (user?.id ?? null);
  useEffect(() => {
    if (!workspaceOwnerId) return;
    let channel: { unsubscribe: () => void } | undefined;
    let cancelled = false;
    void (async () => {
      const { supabase } = await import('../lib/supabase');
      if (cancelled) return;
      channel = supabase
        .channel(`team-rt-${workspaceOwnerId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'owner_invites', filter: `owner_id=eq.${workspaceOwnerId}` }, () => {
          void load();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'owner_user_property_scopes', filter: `owner_id=eq.${workspaceOwnerId}` }, () => {
          void load();
        })
        .subscribe();
    })();
    return () => { cancelled = true; channel?.unsubscribe(); };
  }, [workspaceOwnerId, load]);

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

  const handleCopyInvite = async (token: string) => {
    const link = buildInviteLink(token);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Invite link copied.');
    } catch {
      toast.error('Unable to copy invite link.');
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

  const handleRemovePropertyScope = async (memberId: string, propertyId: string, memberEmail: string, propertyName: string) => {
    if (!confirm(`Remove ${memberEmail}'s access to ${propertyName}?`)) return;
    try {
      await teamService.removePropertyScope(memberId, propertyId);
      toast.success('Property access removed.');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove property access.');
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
          <h1 className="ds-page-title">Team</h1>
          <p style={{ fontSize: 13, color: '#A1A1AA', marginTop: 2 }}>
            {isManager
              ? 'Manage members and invitations for your assigned properties.'
              : 'Invite people and grant them access to specific properties.'}
          </p>
        </div>
        <button
          onClick={() => setShowInviteDialog(true)}
          className="ds-btn ds-btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {isManager ? 'Invite Editor / Viewer' : 'Invite Member'}
        </button>
      </div>

      {/* Manager context banner */}
      {isManager && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200">
          <Shield className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-indigo-800">Manager view</p>
            <p className="text-xs text-indigo-700 mt-0.5">
              You can invite editors and viewers to the properties you manage.
              Only the workspace owner can invite or promote managers.
            </p>
          </div>
        </div>
      )}

      {/* Active Members — Workspace Owner sees full list; Manager sees scoped list */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-green-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            Active Members ({isManager ? workspaceMembers.length : members.length})
          </h3>
        </div>

        {/* Manager scoped view */}
        {isManager && workspaceMembers.length === 0 && (
          <div className="px-5 py-8 text-center">
            <Shield className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No members on your assigned properties yet.</p>
          </div>
        )}
        {isManager && workspaceMembers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4 bg-gray-50/50">
            {workspaceMembers.map((member) => (
              <div key={member.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 truncate">{member.name || member.email}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${roleColor(member.workspaceRole as DisplayRole)}`}>
                        {member.workspaceRole}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{member.email}</p>
                    <p className="text-xs text-gray-400 mt-2">{member.propertyIds.length} propert{member.propertyIds.length === 1 ? 'y' : 'ies'} shared</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Workspace owner full view */}
        {!isManager && members.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <Shield className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No active members yet. Invite someone to get started.</p>
          </div>
        ) : !isManager && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50/50">
            {members.map((member) => (
              <div key={member.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.name || member.email}
                      </p>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${roleColor(member.displayRole)}`}>
                        {member.displayRole}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{member.email}</p>
                    <p className="text-xs text-gray-400 mt-2 font-medium">
                      {member.propertyAssignments.length} propert{member.propertyAssignments.length === 1 ? 'y' : 'ies'} assigned
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
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
                      title="Remove member from team"
                    >
                      <UserX className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Expanded: property assignments with edit controls */}
                {expandedMemberId === member.id && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Property Access</p>
                      <button
                        onClick={() => setAddPropertyState({
                          memberId: member.id,
                          memberEmail: member.email,
                          assignedIds: member.propertyAssignments.map((s) => s.propertyId),
                        })}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add Property
                      </button>
                    </div>
                    {member.propertyAssignments.length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-2">No properties assigned yet.</p>
                    ) : (
                      member.propertyAssignments.map((scope) => (
                        <div key={scope.propertyId} className="bg-gray-50 rounded-lg px-3 py-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-800 font-medium">
                              {getPropertyName(scope.propertyId)}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-xs ${roleColor(scope.displayRole)}`}>
                                {scope.displayRole}
                              </span>
                              <button
                                onClick={() => setEditScopeState({
                                  memberId: member.id,
                                  memberEmail: member.email,
                                  propertyId: scope.propertyId,
                                  propertyName: getPropertyName(scope.propertyId),
                                  currentRole: scope.displayRole,
                                  currentCaps: {
                                    canManageTenants: scope.canManageTenants,
                                    canManagePayments: scope.canManagePayments,
                                    canManageMaintenance: scope.canManageMaintenance,
                                    canManageAnnouncements: scope.canManageAnnouncements,
                                  },
                                })}
                                className="p-1 hover:bg-blue-100 rounded transition-colors"
                                title="Edit access"
                              >
                                <Pencil className="w-3 h-3 text-blue-500" />
                              </button>
                              <button
                                onClick={() => void handleRemovePropertyScope(
                                  member.id,
                                  scope.propertyId,
                                  member.email,
                                  getPropertyName(scope.propertyId),
                                )}
                                className="p-1 hover:bg-red-100 rounded transition-colors"
                                title="Remove property access"
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </button>
                            </div>
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
                      ))
                    )}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50/50">
            {pendingInvites.map((invite) => {
              const expiresDate = new Date(invite.expiresAt);
              const isAlmostExpired = (expiresDate.getTime() - Date.now()) < 24 * 60 * 60 * 1000;

              return (
                <div key={invite.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{invite.invitedEmail}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${roleColor(invite.displayRole)}`}>
                          {invite.displayRole}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(invite.status)}`}>
                          {invite.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Properties: {invite.propertyIds.map(getPropertyName).join(', ')}
                      </p>
                      <p className={`text-xs mt-1 font-medium ${isAlmostExpired ? 'text-red-500' : 'text-gray-400'}`}>
                        Expires: {expiresDate.toLocaleDateString('en-IN')}
                        {isAlmostExpired ? ' (expires soon)' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => void handleCopyInvite(invite.token)}
                        className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                        title="Copy invite link"
                      >
                        <Mail className="w-4 h-4 text-slate-500" />
                      </button>
                      <button
                        onClick={() => void handleRefreshInvite(invite.id)}
                        className="p-1.5 hover:bg-indigo-50 rounded-lg transition-colors"
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
      <div className="rounded-xl px-5 py-4" style={{ background: '#F8FAFC', border: '1px solid #E4E4E7' }}>
        <p className="text-sm font-semibold text-gray-700 mb-2">How invites work</p>
        <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
          <li>Enter the email and access role — you can invite any PG owner, property manager, or staff member.</li>
          <li>Select which of your properties they can access.</li>
          <li><strong className="text-gray-600">Copy and share the invite link</strong> — this is the most reliable delivery method. A sign-in email is also attempted if your project has SMTP configured.</li>
          <li>When they open the link and sign in, access is granted automatically.</li>
          <li>Invites expire after 7 days. Refresh them from the pending list at any time.</li>
          <li>Invited PG owners keep their own properties and workspace — they will see your properties listed separately under "Managing for Others."</li>
          <li>You can edit or remove individual property access at any time from the member row.</li>
        </ul>
      </div>

      {/* Dialogs */}
      {showInviteDialog && (
        <InviteDialog
          onClose={() => setShowInviteDialog(false)}
          onSuccess={() => void load()}
          allowedRoles={isManager ? ['editor', 'viewer'] : undefined}
          workspaceOwnerId={isManager && managerWorkspaceOwnerId ? managerWorkspaceOwnerId : undefined}
          scopedPropertyIds={isManager ? managerPropertyIds : undefined}
        />
      )}
      {editScopeState && (
        <EditScopeDialog
          {...editScopeState}
          onClose={() => setEditScopeState(null)}
          onSuccess={() => void load()}
        />
      )}
      {addPropertyState && (
        <AddPropertyScopeDialog
          memberId={addPropertyState.memberId}
          memberEmail={addPropertyState.memberEmail}
          alreadyAssignedIds={addPropertyState.assignedIds}
          onClose={() => setAddPropertyState(null)}
          onSuccess={() => void load()}
        />
      )}
    </div>
  );
}

