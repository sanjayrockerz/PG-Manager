import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { AppUser, supabaseAuthDataApi } from '../services/supabaseData';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'owner' | 'admin' | 'tenant' | 'super_admin';
  pgName: string;
  city: string;
}

interface SignupDraft {
  name: string;
  email: string;
  phone: string;
  pgName: string;
  city: string;
}

interface AuthContextType {
  user: User | null;
  authError: string;
  requestLoginOTP: (email: string) => Promise<boolean>;
  loginWithOTP: (email: string, otp: string) => Promise<boolean>;
  requestSignupOTP: (draft: SignupDraft) => Promise<boolean>;
  signupWithOTP: (email: string, otp: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

    if (status === 429) {
      return 'Too many OTP requests. Please wait 60 seconds and try again.';
    }

    if (status === 422) {
      if (message?.toLowerCase().includes('user')) {
        return 'Account not found for this email. Use Create Account first.';
      }
      return message || 'OTP request could not be processed. Check Auth settings and try again.';
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

  const resolveSessionUser = async (authUserId: string): Promise<User | null> => {
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
    const metadataRole = typeof metadata.role === 'string'
      && ['owner', 'admin', 'tenant', 'super_admin'].includes(metadata.role)
      ? (metadata.role as User['role'])
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

    return resolveSessionUser(authUser.id);
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
      const emailRedirectTo = resolveEmailRedirectTo();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          ...(emailRedirectTo ? { emailRedirectTo } : {}),
        },
      });

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
            pgName: draft.pgName,
            city: draft.city,
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
          pgName: pending.pgName,
          city: pending.city,
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

  return (
    <AuthContext.Provider value={{ user, authError, requestLoginOTP, loginWithOTP, requestSignupOTP, signupWithOTP, logout, isLoading }}>
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