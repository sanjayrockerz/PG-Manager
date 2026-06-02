import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Info, ShieldAlert } from 'lucide-react';
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

export function AcceptInvite() {
  const { user, refreshProfile, isLoading } = useAuth();
  const [invite, setInvite] = useState<InviteTokenInfo | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'accepting' | 'accepted'>('idle');

  const token = useMemo(() => readInviteToken(), []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!token) {
        setError('Invite token is missing.');
        return;
      }
      try {
        const info = await inviteService.getInviteByToken(token);
        if (!active) return;
        if (!info) {
          setError('Invite not found or expired.');
          return;
        }
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

  const inviteTarget = invite?.invitedEmail ?? '';
  const inviteReturnUrl = buildInviteReturnUrl(invite);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Accept Team Invite</h1>
            <p className="text-sm text-slate-500">Join a workspace with scoped access.</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <ShieldAlert className="w-4 h-4 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {invite && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 space-y-1">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />
              <span className="font-medium">Invite details</span>
            </div>
            <div>Email: {invite.invitedEmail}</div>
            <div>Role: {invite.displayRole}</div>
            <div>Properties: {invite.propertyIds.length}</div>
            <div>Expires: {new Date(invite.expiresAt).toLocaleDateString('en-IN')}</div>
          </div>
        )}

        {!user && !isLoading && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Sign in or create an account using <span className="font-medium">{inviteTarget || 'your invited email'}</span> to accept this invite.
            </p>
            <a
              href={inviteReturnUrl}
              className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Continue to Sign In
            </a>
          </div>
        )}

        {user && invite && (
          <div className="space-y-3">
            {status === 'accepted' ? (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                Invite accepted. Your access is ready.
              </div>
            ) : (
              <button
                onClick={() => void handleAccept()}
                disabled={status === 'accepting'}
                className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {status === 'accepting' ? 'Accepting...' : 'Accept Invite'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AcceptInvite;
