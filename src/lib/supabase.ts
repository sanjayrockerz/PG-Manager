import { createClient } from '@supabase/supabase-js';

export const supabaseUrl: string = (import.meta as any).env?.VITE_SUPABASE_URL;
export const supabaseAnonKey: string = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

const originalSupabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

// RPCs are blocked outright during impersonation rather than allowlisted —
// every RPC in this app that an admin could reach while inspecting an owner's
// account (coupon redemption, invite accept/decline, token refresh) is a write;
// none of the read-only RPCs are used by any admin oversight screen.
const mutationMethods = new Set(['insert', 'update', 'delete', 'upsert', 'upload', 'remove', 'rpc']);

function isImpersonating() {
  return typeof window !== 'undefined' && !!localStorage.getItem('admin_impersonate_id');
}

function wrapWithMutationBlocker<T extends object>(target: T): T {
  return new Proxy(target, {
    get(t, prop, receiver) {
      if (typeof prop === 'string' && mutationMethods.has(prop) && isImpersonating()) {
        return () => {
          return Promise.resolve({
            data: null,
            error: {
              message: 'Data mutation is not allowed during impersonation (read-only mode).',
              code: 'IMPERSONATION_READ_ONLY',
              details: '',
              hint: '',
            },
          });
        };
      }
      const val = Reflect.get(t, prop, receiver);
      if (typeof val === 'function') {
        return (...args: any[]) => {
          const res = val.apply(t, args);
          if (res && typeof res === 'object') {
            return wrapWithMutationBlocker(res);
          }
          return res;
        };
      }
      if (val && typeof val === 'object') {
        return wrapWithMutationBlocker(val);
      }
      return val;
    },
  });
}

export const supabase = wrapWithMutationBlocker(originalSupabase);

