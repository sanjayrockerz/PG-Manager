import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Info, ShieldAlert, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { inviteService, type InviteTokenInfo } from '../services/inviteService';

const readInviteToken = (): string => {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  return params.get('token')?.trim() ?? '';
};

const buildInviteReturnUrl = (invite: InviteTokenInfo | null): string => {
  const base = '/';
  if (!invite) return base;
  const params = new URLSearchParams({
    email: invite.invitedEmail,
    invite: invite.id,
    token: readInviteToken(),
  });
  return `${base}?${params.toString()}`;
};

type PageStatus = 'idle' | 'accepting' | 'accepted' | 'declining' | 'declined';

export function AcceptInvite() {
  const { user, refreshProfile, isLoading } = useAuth();
  const [invite, setInvite] = useState<InviteTokenInfo | null>(null);
  const [error, setError]   = useState('');
  const [status, setStatus] = useState<PageStatus>('idle');

  const token = useMemo(() => readInviteToken(), []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!token) { setError('Invite token is missing.'); return; }
      try {
        const info = await inviteService.getInviteByToken(token);
        if (!active) return;
        if (!info) { setError('Invite not found or expired.'); return; }
        setInvite(info);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load invite.');
      }
    };
    void load();
    return () => { active = false; };
  }, [token]);

  const handleAccept = async () => {
    if (!user || !invite || !token) return;
    if (user.email.toLowerCase() !== invite.invitedEmail.toLowerCase()) {
      setError('This invite is for a different email address.');
      return;
    }
    setError('');
    setStatus('accepting');
    try {
      const result = await inviteService.acceptInviteByToken(user.id, user.email, token);
      if (!result.success) {
        setError(result.reason ?? 'Invite could not be accepted.');
        setStatus('idle');
        return;
      }
      await refreshProfile();
      setStatus('accepted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to accept invite.');
      setStatus('idle');
    }
  };

  const handleDecline = async () => {
    if (!token) return;
    setError('');
    setStatus('declining');
    try {
      const result = await inviteService.declineInvite(token);
      if (!result.success) {
        setError(result.reason ?? 'Could not decline invite — it may have already been processed.');
        setStatus('idle');
        return;
      }
      setStatus('declined');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to decline invite.');
      setStatus('idle');
    }
  };

  const inviteTarget    = invite?.invitedEmail ?? '';
  const inviteReturnUrl = buildInviteReturnUrl(invite);
  const roleBadgeColor  = invite?.displayRole === 'manager' ? 'bg-indigo-100 text-indigo-800' : invite?.displayRole === 'editor' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            status === 'accepted' ? 'bg-green-50 text-green-600' :
            status === 'declined' ? 'bg-gray-100 text-gray-500' :
            'bg-indigo-50 text-indigo-600'
          }`}>
            {status === 'accepted' ? <CheckCircle2 className="w-5 h-5" /> :
             status === 'declined' ? <XCircle className="w-5 h-5" /> :
             <CheckCircle2 className="w-5 h-5" />}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {status === 'accepted' ? 'Invite Accepted' :
               status === 'declined' ? 'Invite Declined' :
               'Workspace Invite'}
            </h1>
            <p className="text-sm text-slate-500">
              {status === 'accepted' ? 'Your workspace access is ready.' :
               status === 'declined' ? 'You have declined this invite.' :
               'You have been invited to join a workspace.'}
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Invite details */}
        {invite && status !== 'declined' && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 space-y-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="font-medium">Invite details</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-slate-500">For</span>
              <span className="font-medium">{invite.invitedEmail}</span>
              <span className="text-slate-500">Role</span>
              <span>
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium capitalize ${roleBadgeColor}`}>
                  {invite.displayRole}
                </span>
              </span>
              <span className="text-slate-500">Properties</span>
              <span>{invite.propertyIds.length} propert{invite.propertyIds.length !== 1 ? 'ies' : 'y'}</span>
              <span className="text-slate-500">Expires</span>
              <span>{new Date(invite.expiresAt).toLocaleDateString('en-IN')}</span>
            </div>
          </div>
        )}

        {/* Post-accept success */}
        {status === 'accepted' && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 space-y-3">
            <p className="font-medium">You now have access to your assigned properties.</p>
            <a
              href="/"
              className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Open Workspace
            </a>
          </div>
        )}

        {/* Post-decline state */}
        {status === 'declined' && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <p>You have declined this invite. If this was a mistake, ask the workspace owner to send a new invitation.</p>
          </div>
        )}

        {/* Unauthenticated — prompt sign in */}
        {!user && !isLoading && invite && status === 'idle' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Sign in or create an account using{' '}
              <span className="font-medium">{inviteTarget || 'your invited email'}</span>{' '}
              to accept or decline this invite.
            </p>
            <a
              href={inviteReturnUrl}
              className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Continue to Sign In
            </a>
          </div>
        )}

        {/* Authenticated — accept / decline */}
        {user && invite && status === 'idle' && (
          <div className="space-y-3">
            {user.email.toLowerCase() !== invite.invitedEmail.toLowerCase() && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  You are signed in as <strong>{user.email}</strong> but this invite is for{' '}
                  <strong>{invite.invitedEmail}</strong>. Please sign in with the correct account.
                </span>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => void handleDecline()}
                disabled={status !== 'idle'}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                Decline
              </button>
              <button
                onClick={() => void handleAccept()}
                disabled={status !== 'idle' || user.email.toLowerCase() !== invite.invitedEmail.toLowerCase()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                Accept Invite
              </button>
            </div>
          </div>
        )}

        {/* Processing spinner */}
        {(status === 'accepting' || status === 'declining') && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-slate-500">
            <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
            {status === 'accepting' ? 'Accepting invite...' : 'Declining invite...'}
          </div>
        )}
      </div>
    </div>
  );
}

export default AcceptInvite;
