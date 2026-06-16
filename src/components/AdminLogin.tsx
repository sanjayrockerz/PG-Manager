import { useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AdminLoginProps {
  onBack?: () => void;
}

export function AdminLogin({ onBack }: AdminLoginProps) {
  const { signInWithPassword, authError, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Enter your admin email and password.');
      return;
    }

    const success = await signInWithPassword(email.trim(), password);
    if (!success) {
      setError(authError || 'Invalid email or password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden border border-gray-800 bg-white shadow-sm">
        <div className="p-6 sm:p-8 md:p-10 bg-white">
          <div className="flex items-center gap-3 pb-5 mb-5 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-[#7C3AED] flex items-center justify-center text-white font-semibold">
              R
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">RentCare</p>
            </div>
            <span className="ml-auto px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-600">Admin Console</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">Admin Sign In</h1>
          <p className="flex items-center gap-2 text-sm text-gray-500 mt-2 mb-6">
            <Lock className="w-4 h-4" /> Restricted access. Authorized personnel only.
          </p>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@rentcare.com"
                className="mt-1 w-full h-12 px-4 text-sm rounded-xl border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-12 px-4 pr-11 text-sm rounded-xl border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {(error || authError) && (
              <p className="text-sm text-red-600">{error || authError}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-[#4F46E5] text-white text-sm font-semibold hover:bg-[#4338CA] transition-colors disabled:opacity-60"
            >
              {isLoading ? 'Signing in…' : 'Sign In'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">Forgot password? Contact your system administrator.</p>

          {onBack && (
            <button
              onClick={onBack}
              className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 h-10"
            >
              <ArrowLeft className="w-4 h-4" /> Back to RentCare.in
            </button>
          )}
        </div>
        
        <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#312E81] p-10 text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/60 mb-4">Admin Security</p>
            <h2 className="text-3xl font-semibold leading-tight mb-4">
              Super Admin Console
            </h2>
            <p className="text-white/80 text-sm leading-relaxed mb-7">
              Manage the entire RentCare infrastructure. Actions are permanently recorded in the audit log.
            </p>
            <div className="space-y-3">
              {['Global property oversight', 'System health and metrics', 'Super user access rights'].map((benefit) => (
                <div key={benefit} className="flex items-start gap-2 text-sm text-white/80">
                  <Shield className="w-4 h-4 mt-0.5 text-white/60" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/80 flex items-center gap-2">
            <Lock className="w-4 h-4 flex-shrink-0" />
            Authorized personnel only. All access attempts are monitored and recorded.
          </div>
        </div>
      </div>
    </div>
  );
}
