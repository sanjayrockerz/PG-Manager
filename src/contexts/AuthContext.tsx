import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { AppUser, UserRole, supabaseAuthDataApi } from '../services/supabaseData';
import { isSupportedUserRole } from '../utils/roles';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  pgName: string;
  city: string;
}

interface SignupDraft {
  name: string;
  email: string;
  phone: string;
}

interface AuthContextType {
  user: User | null;
  authError: string;
  requestLoginOTP: (email: string) => Promise<boolean>;
  loginWithOTP: (email: string, otp: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  requestSignupOTP: (draft: SignupDraft) => Promise<boolean>;
  signupWithOTP: (email: string, otp: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_LOGIN_METADATA: Record<string, {
  name: string;
  phone: string;
  role: UserRole;
  pgName: string;
  city: string;
}> = {
  'owner.demo@pgmanager.app': {
    name: 'Demo Owner',
    phone: '+919876500001',
    role: 'owner',
    pgName: 'Khush Living',
    city: 'Bengaluru',
  },
  'admin.demo@pgmanager.app': {
    name: 'Demo Admin',
    phone: '+919876500301',
    role: 'platform_admin',
    pgName: 'Platform Admin Console',
    city: 'Bengaluru',
  },
  'tenant.demo@pgmanager.app': {
    name: 'Aarav Singh',
    phone: '+919876500101',
    role: 'tenant',
    pgName: 'Khush Living',
    city: 'Bengaluru',
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
  const pendingSignupRef = useRef<SignupDraft | null>(null);

  const resolveEmailRedirectTo = (): string | undefined => {
    const configuredSiteUrl = String((import.meta as any).env?.VITE_SITE_URL ?? '').trim();
    if (configuredSiteUrl) {
      return configuredSiteUrl;
    }

    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }

    return undefined;
  };

  const toAuthMessage = (error: unknown, fallback: string): string => {
    const candidate = error as { message?: string; status?: number; code?: string } | null;
    const status = candidate?.status;
    const message = candidate?.message?.trim();
    const code = candidate?.code?.trim();

    if (code === 'otp_disabled' || message?.toLowerCase().includes('otp')) {
      return 'Email OTP is disabled in Supabase Auth settings. Enable Email OTP in Authentication -> Sign In / Providers.';
    }

    if (message?.toLowerCase().includes('database error finding user')) {
      return 'Account not found for this email. Use Create Account with your real email address, or continue with Google.';
    }

    if (status === 429) {
      return 'Too many OTP requests. Please wait 60 seconds and try again.';
    }

    if (status === 422) {
      if (message?.toLowerCase().includes('user')) {
        return 'Account not found for this email. Use Create Account first.';
      }
      return message || 'OTP request could not be processed. Check Auth settings and try again.';
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
    pgName: appUser.pgName,
    city: appUser.city,
  });

  const resolveSessionUser = async (authUserId: string, email?: string | null): Promise<User | null> => {
    const profile = await supabaseAuthDataApi.getProfileById(authUserId);
    if (!profile) {
      return null;
    }

    // Auto-elevate creator to platform_admin securely 
    const cleanEmail = email?.trim().toLowerCase();
    const admins = ['myteamcreations09@gmail.com', 'motisanjay04@gmail.com'];
    
    if (cleanEmail && admins.includes(cleanEmail) && profile.role !== 'platform_admin') {
      console.log('[Auth] Elevating user to platform_admin:', cleanEmail);
      const { error } = await supabase.from('profiles').update({ role: 'platform_admin' }).eq('id', authUserId);
      if (error) {
         console.error('[Auth] Elevation failed:', error);
      } else {
         profile.role = 'platform_admin';
      }
    }

    return mapUser(profile);
  };

  const ensureProfileFromAuthUser = async (authUser: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  }): Promise<User | null> => {
    const existing = await resolveSessionUser(authUser.id, authUser.email);
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

    return resolveSessionUser(authUser.id, email);
  };

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }

        const authUser = data.session?.user;
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

  const requestLoginOTP = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    setAuthError('');
    try {
      const normalizedEmail = normalizeEmail(email);
      const emailRedirectTo = resolveEmailRedirectTo();

      const sendOtp = async (shouldCreateUser: boolean) => {
        const demoMetadata = DEMO_LOGIN_METADATA[normalizedEmail];

        return supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            shouldCreateUser,
            ...(emailRedirectTo ? { emailRedirectTo } : {}),
            ...(shouldCreateUser && demoMetadata ? { data: demoMetadata } : {}),
          },
        });
      };

      let { error } = await sendOtp(false);

      // Recover first-time accounts when auth.users entry is missing.
      if (error && isMissingAuthUserError(error)) {
        ({ error } = await sendOtp(true));
      }

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      setAuthError(toAuthMessage(error, 'Unable to send OTP.'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOTP = async (email: string, otp: string): Promise<boolean> => {
    setIsLoading(true);
    setAuthError('');

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (error) {
        throw error;
      }

      const authUserId = data.user?.id;
      if (!authUserId) {
        return false;
      }

      const loggedInUser = await ensureProfileFromAuthUser({
        id: authUserId,
        email: data.user?.email,
        user_metadata: data.user?.user_metadata as Record<string, unknown> | undefined,
      });
      if (!loggedInUser) {
        return false;
      }

      setUser(loggedInUser);
      return true;
    } catch (error) {
      setAuthError(toAuthMessage(error, 'Invalid OTP. Please try again.'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const requestSignupOTP = async (draft: SignupDraft): Promise<boolean> => {
    setIsLoading(true);
    setAuthError('');
    try {
      const emailRedirectTo = resolveEmailRedirectTo();
      pendingSignupRef.current = draft;
      const { error } = await supabase.auth.signInWithOtp({
        email: draft.email,
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
      setAuthError(toAuthMessage(error, 'Unable to send signup OTP.'));
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

  const signupWithOTP = async (email: string, otp: string): Promise<boolean> => {
    setIsLoading(true);
    setAuthError('');

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (error) {
        throw error;
      }

      const authUserId = data.user?.id;
      if (!authUserId) {
        return false;
      }

      const authUserPayload = {
        id: authUserId,
        email: data.user?.email,
        user_metadata: data.user?.user_metadata as Record<string, unknown> | undefined,
      };

      const pending = pendingSignupRef.current;
      if (pending) {
        await supabaseAuthDataApi.ensureOwnerProfile({
          userId: authUserId,
          email: pending.email,
          name: pending.name,
          phone: pending.phone,
          pgName: '',
          city: '',
          role: 'owner',
        });
      }

      // Refresh/link based OTP verification can lose in-memory draft state.
      // Always ensure a profile from auth payload so signup completion does not loop.
      const ensuredUser = await ensureProfileFromAuthUser(authUserPayload);
      if (ensuredUser) {
        setUser(ensuredUser);
        pendingSignupRef.current = null;
        return true;
      }

      const newUser = await resolveSessionUser(authUserId);
      if (!newUser) {
        return false;
      }

      setUser(newUser);
      pendingSignupRef.current = null;
      return true;
    } catch (error) {
      setAuthError(toAuthMessage(error, 'Invalid OTP. Please try again.'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
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
    <AuthContext.Provider value={{ user, authError, requestLoginOTP, loginWithOTP, signInWithGoogle, requestSignupOTP, signupWithOTP, refreshProfile, logout, isLoading }}>
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