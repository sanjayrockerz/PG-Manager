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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B1120] px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
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
              className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
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
                className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#4F46E5] text-white text-sm font-semibold hover:bg-[#4338CA] transition-colors disabled:opacity-60"
          >
            {isLoading ? 'Signing in…' : 'Sign In'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">Forgot password? Contact your system administrator.</p>

        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" /> Back to RentCare.in
          </button>
        )}
      </div>

      <p className="flex items-center gap-2 text-xs text-gray-400 mt-6">
        <Shield className="w-3.5 h-3.5" /> Secure admin area. All actions are logged and monitored.
      </p>
    </div>
  );
}
