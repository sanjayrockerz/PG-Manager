import { useState } from 'react';
import { Lock, Eye, EyeOff, ArrowLeft, Shield } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface AdminLoginProps {
  onLogin: (email: string, password: string) => void;
  onBackToHome: () => void;
}

export function AdminLogin({ onLogin, onBackToHome }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      if (email && password) {
        onLogin(email, password);
      } else {
        setError('Invalid credentials. Please try again.');
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <div className="w-full max-w-[440px]">
        <div className="bg-white rounded-2xl p-10 shadow-xl">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">R</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl">RentCare</span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                Admin Console
              </span>
            </div>
          </div>

          <div className="border-t border-gray-200 my-6"></div>

          {/* Header */}
          <h1 className="text-xl font-bold mb-2">Admin Sign In</h1>
          <div className="flex items-start gap-2 text-sm text-gray-600 mb-6">
            <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>Restricted access. Authorized personnel only.</p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@rentcare.com"
                className={error ? 'border-red-300' : ''}
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={error ? 'border-red-300' : ''}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#4F46E5] hover:bg-[#4338CA]"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In →'}
            </Button>
          </form>

          <p className="text-sm text-gray-500 text-center mt-4">
            Forgot password? Contact your system administrator.
          </p>

          <button
            onClick={onBackToHome}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 mt-4 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to RentCare.in
          </button>
        </div>

        {/* Security Notice */}
        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mt-6">
          <Shield className="w-4 h-4" />
          <p>Secure admin area. All actions are logged and monitored.</p>
        </div>
      </div>
    </div>
  );
}
