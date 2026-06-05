import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { AppUser, UserRole, supabaseAuthDataApi } from '../services/supabaseData';
import { isSupportedUserRole } from '../utils/roles';
import { setAppMode } from '../config/appMode';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  ownerScopeId: string | null;
  pgName: string;
  city: string;
  photoUrl: string | null;
}

interface SignupDraft {
  name: string;
  email: string;
  phone: string;
}

export type DemoPersona = 'owner' | 'tenant' | 'admin';

interface AuthContextType {
  user: User | null;
  authError: string;
  isSuspended: boolean;
  sendLoginMagicLink: (email: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  sendSignupMagicLink: (draft: SignupDraft) => Promise<boolean>;
  sendPhoneOtp: (phone: string) => Promise<boolean>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<boolean>;
  signInAsDemo: (persona?: DemoPersona) => void;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER_KEY = 'pg-manager:demo-session';
const DEMO_PERSONA_KEY = 'pg-manager:demo-persona';

const DEMO_USERS: Record<string, User> = {
  owner: {
    id: 'demo-owner-1',
    name: 'Vikram Singhania',
    email: 'owner.demo@rentcare.demo',
    phone: '+919887654321',
    role: 'owner',
    ownerScopeId: null,
    pgName: 'Singhania PG Network',
    city: 'Jaipur',
    photoUrl: null,
  },
  tenant: {
    id: 'demo-tenant-1',
    name: 'Arjun Sharma',
    email: 'tenant.demo@rentcare.demo',
    phone: '+919812345678',
    role: 'tenant',
    ownerScopeId: null,
    pgName: 'Shree Niwas PG',
    city: 'Jaipur',
    photoUrl: null,
  },
  admin: {
    id: 'demo-admin-1',
    name: 'Platform Admin',
    email: 'admin.demo@rentcare.demo',
    phone: '+919800000001',
    role: 'platform_admin',
    ownerScopeId: null,
    pgName: 'RentCare Platform',
    city: 'Jaipur',
    photoUrl: null,
  },
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const isMissingAuthUserError = (error: unknown): boolean => {
  const candidate = error as { message?: string; code?: string; status?: number } | null;
  const code = String(candidate?.code ?? '').toLowerCase();
  const message = String(candidate?.message ?? '').toLowerCase();

  if (code.includes('user_not_found')) {
    return true;
  }

  if (message.includes('user not found') || message.includes('database error finding user')) {
    return true;
  }

  return candidate?.status === 422 && message.includes('user');
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isSuspended, setIsSuspended] = useState(false);

  const resolveEmailRedirectTo = (): string | undefined => {
    const configuredSiteUrl = String((import.meta as any).env?.VITE_SITE_URL ?? '').trim();
    if (typeof window !== 'undefined' && window.location?.origin) {
      const { origin, hostname } = window.location;
      // Always prefer current origin for localhost development callbacks.
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return origin;
      }

      if (configuredSiteUrl) {
        return configuredSiteUrl;
      }

      return origin;
    }

    return configuredSiteUrl || undefined;
  };

  const toAuthMessage = (error: unknown, fallback: string): string => {
    const candidate = error as { message?: string; status?: number; code?: string } | null;
    const status = candidate?.status;
    const message = candidate?.message?.trim();
    const code = candidate?.code?.trim();

    if (code === 'otp_disabled' || message?.toLowerCase().includes('otp') || message?.toLowerCase().includes('email provider')) {
      return 'Email sign-in is disabled in Supabase Auth settings. Enable Email provider for magic links and try again.';
    }

    if (message?.toLowerCase().includes('database error finding user')) {
      return 'Account not found for this email. Use Create Account with your real email address, or continue with Google.';
    }

    if (status === 429) {
      return 'Too many OTP requests. Please wait 60 seconds and try again.';
    }

    if (status === 422) {
      if (message?.toLowerCase().includes('user')) {
        return 'Account not found for this email. Use Create Account first, then try sign in again.';
      }
      return message || 'Email sign-in request could not be processed. Check Auth settings and try again.';
    }

    if (message?.toLowerCase().includes('provider') && message?.toLowerCase().includes('google')) {
      return 'Google Sign-In is not enabled in Supabase Auth providers. Enable Google provider and try again.';
    }

    if (message) {
      return message;
    }

    return fallback;
  };

  const mapUser = (appUser: AppUser): User => ({
    id: appUser.id,
    name: appUser.name,
    email: appUser.email,
    phone: appUser.phone,
    role: appUser.role,
    ownerScopeId: appUser.ownerScopeId,
    pgName: appUser.pgName,
    city: appUser.city,
    photoUrl: appUser.photoUrl,
  });

  const resolveSessionUser = async (authUserId: string): Promise<User | null> => {
    // Check suspension before mapping — suspended owners get signed out on session load
    const { data: rawProfile } = await supabase
      .from('profiles')
      .select('id,is_suspended,role')
      .eq('id', authUserId)
      .maybeSingle<{ id: string; is_suspended?: boolean; role: string }>();

    if (rawProfile?.is_suspended && (rawProfile.role === 'owner' || rawProfile.role === 'owner_manager')) {
      setIsSuspended(true);
      await supabase.auth.signOut();
      return null;
    }

    setIsSuspended(false);
    const profile = await supabaseAuthDataApi.getProfileById(authUserId);
    if (!profile) {
      return null;
    }
    return mapUser(profile);
  };

  const ensureProfileFromAuthUser = async (authUser: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  }): Promise<User | null> => {
    const existing = await resolveSessionUser(authUser.id);
    if (existing) {
      return existing;
    }

    const metadata = authUser.user_metadata ?? {};
    const email = authUser.email ?? '';
    const metadataRole = isSupportedUserRole(metadata.role)
      ? metadata.role
      : 'owner';
    const fallbackName = typeof metadata.name === 'string' && metadata.name.trim()
      ? metadata.name
      : (email ? email.split('@')[0] : 'Owner');

    await supabaseAuthDataApi.ensureOwnerProfile({
      userId: authUser.id,
      email,
      name: fallbackName,
      phone: typeof metadata.phone === 'string' ? metadata.phone : '',
      pgName: typeof metadata.pgName === 'string' ? metadata.pgName : '',
      city: typeof metadata.city === 'string' ? metadata.city : '',
      role: metadataRole,
    });

    // Best-effort: write lead source / UTM data captured during signup
    void (async () => {
      try {
        const raw = localStorage.getItem('rentcare:signup_utm');
        if (!raw) return;
        const utm = JSON.parse(raw) as Record<string, string>;
        await supabase.from('lead_sources').insert({
          owner_id: authUser.id,
          utm_source: utm.utm_source || null,
          utm_medium: utm.utm_medium || null,
          utm_campaign: utm.utm_campaign || null,
          utm_term: utm.utm_term || null,
          utm_content: utm.utm_content || null,
          referrer_url: utm.referrer_url || null,
          landing_page: utm.landing_page || null,
        });
        localStorage.removeItem('rentcare:signup_utm');
      } catch { /* non-blocking */ }
    })();

    return resolveSessionUser(authUser.id);
  };

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        // Check for demo session first — only honor it if NO real Supabase session exists
        const demoFlag = localStorage.getItem(DEMO_USER_KEY);
        const { data: sessionData } = await supabase.auth.getSession();
        const hasRealSession = Boolean(sessionData.session?.user?.id);

        if (demoFlag === 'true' && !hasRealSession) {
          const persona = (localStorage.getItem(DEMO_PERSONA_KEY) ?? 'owner') as DemoPersona;
          const demoUser = DEMO_USERS[persona] ?? DEMO_USERS.owner;
          if (!cancelled) {
            setUser(demoUser);
            setIsLoading(false);
          }
          return;
        }

        // Real session found — always force live mode regardless of any stale localStorage flag
        if (hasRealSession) {
          setAppMode('live', { reload: false });
          localStorage.removeItem(DEMO_USER_KEY);
        }

        const authUser = sessionData.session?.user;
        if (!authUser?.id) {
          if (!cancelled) {
            setUser(null);
          }
          return;
        }

        const sessionUser = await ensureProfileFromAuthUser({
          id: authUser.id,
          email: authUser.email,
          user_metadata: authUser.user_metadata as Record<string, unknown> | undefined,
        });
        if (!cancelled) {
          setUser(sessionUser);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        const authUser = session?.user;
        if (!authUser?.id) {
          if (!cancelled) {
            setUser(null);
          }
          return;
        }

        // Real Supabase session — always enforce live mode and clear any demo flag
        setAppMode('live', { reload: false });
        localStorage.removeItem(DEMO_USER_KEY);

        try {
          const sessionUser = await ensureProfileFromAuthUser({
            id: authUser.id,
            email: authUser.email,
            user_metadata: authUser.user_metadata as Record<string, unknown> | undefined,
          });
          if (!cancelled) {
            setUser(sessionUser);
          }
        } catch {
          if (!cancelled) {
            setUser(null);
          }
        }
      })();
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const sendLoginMagicLink = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    setAuthError('');
    try {
      const normalizedEmail = normalizeEmail(email);
      const emailRedirectTo = resolveEmailRedirectTo();

      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: false,
          ...(emailRedirectTo ? { emailRedirectTo } : {}),
        },
      });

      if (error) {
        if (isMissingAuthUserError(error)) {
          setAuthError('Account not found for this email. Use Create Account or continue with Google.');
          return false;
        }
        throw error;
      }

      return true;
    } catch (error) {
      setAuthError(toAuthMessage(error, 'Unable to send sign-in link.'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const sendSignupMagicLink = async (draft: SignupDraft): Promise<boolean> => {
    setIsLoading(true);
    setAuthError('');
    try {
      const emailRedirectTo = resolveEmailRedirectTo();
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizeEmail(draft.email),
        options: {
          shouldCreateUser: true,
          ...(emailRedirectTo ? { emailRedirectTo } : {}),
          data: {
            name: draft.name,
            phone: draft.phone,
            role: 'owner',
          },
        },
      });

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      setAuthError(toAuthMessage(error, 'Unable to send account activation link.'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const sendPhoneOtp = async (phone: string): Promise<boolean> => {
    setIsLoading(true);
    setAuthError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: phone.trim() });
      if (error) throw error;
      return true;
    } catch (error) {
      setAuthError(toAuthMessage(error, 'Unable to send phone OTP.'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPhoneOtp = async (phone: string, token: string): Promise<boolean> => {
    setIsLoading(true);
    setAuthError('');
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: phone.trim(),
        token: token.trim(),
        type: 'sms',
      });
      if (error) throw error;
      const authUser = data.user;
      if (!authUser?.id) throw new Error('Verification succeeded but user is missing.');

      let sessionUser = await ensureProfileFromAuthUser({
        id: authUser.id,
        email: authUser.email,
        user_metadata: authUser.user_metadata as Record<string, unknown> | undefined,
      });

      // Phone OTP users default to role='owner' from the DB trigger.
      // If a matching tenant record exists for this phone, correct the role to 'tenant'.
      // Only correct roles that are default/non-privileged (owner, owner_manager, staff).
      // Never correct platform_admin or admin — those are intentionally privileged accounts.
      const correctable: string[] = ['owner', 'owner_manager', 'staff'];
      if (sessionUser && correctable.includes(sessionUser.role)) {
        const normalizedPhone = phone.trim();
        const last10 = normalizedPhone.replace(/\D/g, '').slice(-10);
        const { data: tenantRow } = await supabase
          .from('tenants')
          .select('id, status')
          .or(`phone.eq.${normalizedPhone},phone.ilike.%${last10}`)
          .not('status', 'eq', 'archived')
          .limit(1)
          .maybeSingle<{ id: string; status: string }>();

        if (tenantRow?.id) {
          await supabase
            .from('profiles')
            .update({ role: 'tenant' })
            .eq('id', sessionUser.id);

          sessionUser = { ...sessionUser, role: 'tenant' };

          // Auto-activate tenant if still in pending_onboarding state
          if (tenantRow.status === 'pending_onboarding') {
            void (async () => {
              await supabase
                .from('tenants')
                .update({ status: 'active' })
                .eq('id', tenantRow.id);
            })().catch(() => {});
          }
        }
      }

      setUser(sessionUser);
      return true;
    } catch (error) {
      setAuthError(toAuthMessage(error, 'Invalid or expired verification code.'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<boolean> => {
    setIsLoading(true);
    setAuthError('');

    try {
      const redirectTo = resolveEmailRedirectTo();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: true,
          ...(redirectTo ? { redirectTo } : {}),
          queryParams: {
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data?.url) {
        throw new Error('Google sign-in URL could not be generated. Check provider setup and redirect URLs.');
      }

      if (typeof window !== 'undefined') {
        window.location.assign(data.url);
      }

      return true;
    } catch (error) {
      setAuthError(toAuthMessage(error, 'Unable to sign in with Google.'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signInAsDemo = (persona: DemoPersona = 'owner') => {
    const demoUser = DEMO_USERS[persona] ?? DEMO_USERS.owner;
    localStorage.setItem('app_mode', 'demo');
    localStorage.setItem(DEMO_USER_KEY, 'true');
    localStorage.setItem(DEMO_PERSONA_KEY, persona);
    setUser(demoUser);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const isDemo = localStorage.getItem(DEMO_USER_KEY) === 'true';
      // Always clear demo flags regardless of session type
      localStorage.removeItem(DEMO_USER_KEY);
      localStorage.removeItem(DEMO_PERSONA_KEY);
      localStorage.removeItem('app_mode');
      if (isDemo) {
        setUser(null);
        return;
      }
      await supabase.auth.signOut();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      throw error;
    }

    const authUserId = data.user?.id;
    if (!authUserId) {
      setUser(null);
      return;
    }

    const refreshed = await resolveSessionUser(authUserId);
    if (refreshed) {
      setUser(refreshed);
    }
  };

  return (
    <AuthContext.Provider value={{ user, authError, isSuspended, sendLoginMagicLink, signInWithGoogle, sendSignupMagicLink, sendPhoneOtp, verifyPhoneOtp, signInAsDemo, refreshProfile, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}