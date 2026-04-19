import { useEffect, useState } from 'react';
import { ArrowRight, Building2, Check, Mail, Smartphone, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  DEFAULT_COUNTRY_CODE,
  SUPPORTED_PHONE_COUNTRIES,
  getPhoneCountry,
  getPhoneDropdownLabel,
  sanitizePhoneLocal,
  validatePhoneForCountry,
} from '../utils/phone';

interface OTPSignupProps {
  onSwitchToLogin: () => void;
}

const NAME_MAX_LENGTH = 80;
const EMAIL_MAX_LENGTH = 254;

export function OTPSignup({ onSwitchToLogin }: OTPSignupProps) {
  const { sendSignupMagicLink, signInWithGoogle, authError, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    countryCode: DEFAULT_COUNTRY_CODE,
    phoneNumber: '',
  });
  const [error, setError] = useState('');
  const [isSent, setIsSent] = useState(false);

  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const validateDetails = (): string => {
    const phoneCountry = getPhoneCountry(formData.countryCode);
    const cleanName = formData.name.trim();
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanPhone = formData.phoneNumber.replace(/\D/g, '');

    if (!cleanName) {
      return 'Full name is required.';
    }
    if (cleanName.length < 2) {
      return 'Full name must be at least 2 characters.';
    }
    if (cleanName.length > NAME_MAX_LENGTH) {
      return 'Full name is too long.';
    }
    if (!cleanEmail) {
      return 'Email address is required.';
    }
    if (cleanEmail.length > EMAIL_MAX_LENGTH) {
      return 'Email address is too long.';
    }
    if (!isValidEmail(cleanEmail)) {
      return 'Please enter a valid email address.';
    }
    const phoneValidation = validatePhoneForCountry(formData.countryCode, cleanPhone);
    if (!phoneValidation.valid) {
      return phoneValidation.error ?? 'Please enter a valid phone number.';
    }

    return '';
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateDetails();
    if (validationError) {
      setError(validationError);
      return;
    }

    const sent = await sendSignupMagicLink({
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: `${formData.countryCode}${formData.phoneNumber.replace(/\D/g, '')}`,
    });

    if (!sent) {
      setError(authError || 'Unable to send account activation link.');
      return;
    }

    setIsSent(true);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    const success = await signInWithGoogle();
    if (!success) {
      setError(authError || 'Unable to continue with Google.');
    }
  };

  const phoneCountry = getPhoneCountry(formData.countryCode);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden border border-[#E5E7EB] bg-white shadow-sm">
        <div className="p-6 sm:p-8 md:p-10 bg-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#6366F1] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">PG Manager</p>
              <p className="text-xs text-slate-500">Property Operations Cloud</p>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-slate-900 text-3xl font-semibold mb-2">Create Account</h1>
            <p className="text-sm text-slate-600">Create an owner workspace with email magic-link verification.</p>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Full name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/\d/g, '') })}
                    maxLength={NAME_MAX_LENGTH}
                    className="w-full pl-9 pr-3 py-2.5 border border-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all"
                    placeholder="e.g. Khush Sharma"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    maxLength={EMAIL_MAX_LENGTH}
                    className="w-full pl-9 pr-3 py-2.5 border border-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all"
                    placeholder="owner@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Phone number</label>
                <div className="group flex items-center rounded-2xl border border-[#E5E7EB] bg-white transition-shadow focus-within:ring-2 focus-within:ring-[#6366F1]/20">
                  <select
                    value={formData.countryCode}
                    onChange={(e) => setFormData({
                      ...formData,
                      countryCode: e.target.value,
                      phoneNumber: sanitizePhoneLocal(formData.phoneNumber, e.target.value),
                    })}
                    className="w-44 px-3 py-2.5 text-sm border-r border-[#E5E7EB] rounded-l-2xl bg-gray-50 focus:outline-none"
                  >
                    {SUPPORTED_PHONE_COUNTRIES.map((code) => (
                      <option key={code.code} value={code.code}>{getPhoneDropdownLabel(code)}</option>
                    ))}
                  </select>
                  <span className="px-2 py-2 text-sm font-medium text-gray-700 border-r border-[#E5E7EB] bg-gray-50">
                    {phoneCountry.flag} {phoneCountry.code}
                  </span>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: sanitizePhoneLocal(e.target.value, formData.countryCode) })}
                    className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none"
                    placeholder={phoneCountry.placeholder}
                    maxLength={phoneCountry.localDigits}
                  />
                  <div className="pr-3 text-gray-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xs text-gray-500">{phoneCountry.country} numbers require exactly {phoneCountry.localDigits} digits.</p>
              </div>

              {error && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <span>!</span> {error}
                </p>
              )}

              {isSent && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  Activation link sent to {formData.email.trim().toLowerCase()}. Open your email to finish account setup.
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-[#6366F1] text-white rounded-xl text-sm font-semibold hover:bg-[#4F46E5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? 'Sending link...' : 'Create Account'}
                {!isLoading && <ArrowRight className="w-5 h-5" />}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E5E7EB]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-slate-500">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleGoogleSignIn()}
                disabled={isLoading}
                className="w-full py-2.5 border border-[#E5E7EB] text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue with Google
              </button>
            </form>

            <div className="flex items-center justify-between mt-4 text-sm">
              <p className="text-slate-500">Already have an account?</p>
              <button
                onClick={onSwitchToLogin}
                className="text-[#6366F1] hover:text-[#4F46E5] font-medium"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-[#6366F1] via-[#4F46E5] to-[#312E81] p-10 text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-200 mb-4">PG Manager Platform</p>
            <h2 className="text-3xl font-semibold leading-tight mb-4">Launch your PG SaaS operations fast.</h2>
            <p className="text-indigo-100 text-sm leading-relaxed mb-7">
              Create your workspace and verify securely through your email inbox.
            </p>

            <div className="space-y-3">
              {[
                'Owner profile auto-setup on first login',
                'Role-aware routing after authentication',
                'Scalable auth flow for local and production domains',
              ].map((benefit) => (
                <div key={benefit} className="flex items-start gap-2 text-sm text-indigo-50">
                  <Check className="w-4 h-4 mt-0.5 text-indigo-200" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <button
              onClick={onSwitchToLogin}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#4F46E5] text-sm font-semibold hover:bg-indigo-50 transition-colors"
            >
              <span>Back to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
