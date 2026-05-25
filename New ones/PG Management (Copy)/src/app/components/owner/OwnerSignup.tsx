import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface OwnerSignupProps {
  onSwitchToLogin: () => void;
  onSignup: (name: string, email: string, password: string) => void;
}

export function OwnerSignup({ onSwitchToLogin, onSignup }: OwnerSignupProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const getPasswordStrength = () => {
    if (!password) return { strength: 0, label: '' };

    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;

    if (strength <= 25) return { strength, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 50) return { strength, label: 'Fair', color: 'bg-amber-500' };
    if (strength <= 75) return { strength, label: 'Good', color: 'bg-blue-500' };
    return { strength, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onSignup(name, email, password);
    } catch (error) {
      console.error('Signup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    // Handle Google OAuth
    alert('Google OAuth integration would happen here');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Purple Gradient */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] p-12 flex-col justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <span className="text-[#4F46E5] font-bold text-xl">R</span>
          </div>
          <span className="text-white font-bold text-xl">RentCare</span>
        </div>

        {/* Content */}
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Run your PG business from one place.
            </h1>
            <p className="text-xl text-white/90">
              Properties, tenants, payments, maintenance — all managed digitally.
            </p>
          </div>

          {/* Feature bullets */}
          <div className="space-y-3">
            {[
              'Multi-property management',
              'Automated rent reminders via WhatsApp',
              'Real-time occupancy and revenue tracking',
              'Tenant self-service portal included',
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <span className="text-white/80 mt-1">·</span>
                <span className="text-white/90">{feature}</span>
              </div>
            ))}
          </div>

          {/* Social Proof */}
          <p className="text-white/80">Trusted by 200+ PG owners across India</p>
        </div>

        {/* Footer */}
        <p className="text-white/60 text-sm">Powered by RentCare</p>
      </div>

      {/* Right Panel - White */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 bg-white">
        {/* Help Link */}
        <div className="absolute top-6 right-6">
          <a href="mailto:support@rentcare.in" className="text-sm text-gray-600 hover:text-gray-900">
            Need help? support@rentcare.in
          </a>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-[440px]">
          <div className="mb-8">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#4F46E5] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">R</span>
              </div>
              <span className="font-bold text-xl">RentCare</span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
            <p className="text-gray-600 mt-2">Start managing your PG for free</p>
          </div>

          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full mb-4"
            onClick={handleGoogleSignup}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or sign up with email</span>
            </div>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Khush Goyal"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
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
                  placeholder="Create a strong password"
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

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500">Password strength</span>
                    <span className={`font-medium ${
                      passwordStrength.strength <= 25 ? 'text-red-600' :
                      passwordStrength.strength <= 50 ? 'text-amber-600' :
                      passwordStrength.strength <= 75 ? 'text-blue-600' :
                      'text-green-600'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.strength}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-[#4F46E5] hover:bg-[#4338CA]"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create Account →'}
            </Button>
          </form>

          {/* Terms */}
          <p className="text-xs text-gray-500 text-center mt-4">
            By creating an account you agree to our Terms and Privacy Policy
          </p>

          {/* Sign In Link */}
          <div className="text-center mt-6">
            <button
              onClick={onSwitchToLogin}
              className="text-[#4F46E5] hover:text-[#4338CA] font-medium"
            >
              Already have an account? Sign in →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
