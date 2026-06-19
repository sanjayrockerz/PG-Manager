import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from './ui/alert-dialog';
import { InternationalPhoneField } from './ui/InternationalPhoneField';
import {
  User, CreditCard, MessageCircle, Crown, Bell,
  Shield, Globe, AlertTriangle, Check, Plus, Trash2,
  Loader2, Save, Camera, Download, QrCode, Building2,
  X, Info, Tag, Upload, RefreshCw, CheckCircle2,
  FileSignature, PenLine, Type, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { supabase } from '../lib/supabase';
import {
  supabaseAuthDataApi, supabaseOwnerDataApi, supabaseLifecycleApi,
  type OwnerSettingsRecord, type ProfileUpdateInput, type OwnerSubscriptionRecord,
  type OwnerSignatureProfile, type AgreementTemplate, type AgreementTemplateUpsertInput,
  defaultSettings,
} from '../services/supabaseData';
import { logSettingsChange } from '../utils/settingsAudit';
import { SMS_PROVIDER_OPTIONS, type SMSProviderName } from '../services/smsProvider';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { hasWorkspacePermission } from '../utils/permissions';
import { PAYMENT_GATEWAY_OPTIONS, type PaymentGatewayName } from '../services/paymentGateway';
import type { SMSProviderAdapter } from '../services/smsProvider';
import { SMS_PROVIDER_ADAPTERS } from '../services/smsProvider';
import { PAYMENT_GATEWAY_ADAPTERS } from '../services/paymentGateway';
import { WHATSAPP_PROVIDER_OPTIONS, WHATSAPP_PROVIDER_ADAPTERS, type WhatsAppProviderName } from '../services/whatsappProvider';
import { PLANS, type PlanCode } from '../constants/plans';

// Plan catalog is shared with Sidebar's plan/usage card — see src/constants/plans.ts.

// ─── Coupon types ────────────────────────────────────────────────────────────
interface CouponResult {
  code: string;
  discountType: 'percent' | 'flat';
  discountValue: number;
  description: string;
  planRestriction?: string | null;
  // Legacy fields for UI compatibility
  discountPercent: number;
  extraMonths: number;
}

// ─── Shared Toggle ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-indigo-600' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-gray-900 mb-3">{children}</h3>;
}

const TEMPLATE_VARS = ['{{tenantName}}', '{{pgName}}', '{{amount}}', '{{month}}', '{{dueDate}}', '{{roomNumber}}'];

function VarChips({ onInsert }: { onInsert: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      <span className="text-xs text-gray-500 mr-1">Insert:</span>
      {TEMPLATE_VARS.map((v) => (
        <button key={v} type="button" onClick={() => onInsert(v)}
          className="text-xs px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded hover:bg-indigo-100 transition-colors font-mono"
        >{v}</button>
      ))}
    </div>
  );
}

// ─── Signature Draw Pad ────────────────────────────────────────────────────────
function SignatureDrawPad({ onCapture }: { onCapture: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  const getCtx = () => canvasRef.current?.getContext('2d') ?? null;

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const sx = e.currentTarget.width / r.width;
    const sy = e.currentTarget.height / r.height;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  };

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const sx = e.currentTarget.width / r.width;
    const sy = e.currentTarget.height / r.height;
    const t = e.touches[0];
    return { x: (t.clientX - r.left) * sx, y: (t.clientY - r.top) * sy };
  };

  const beginStroke = (x: number, y: number) => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
    setHasStrokes(true);
  };

  const continueStroke = (x: number, y: number) => {
    if (!drawing.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const endStroke = () => { drawing.current = false; };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  };

  const capture = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes) return;
    onCapture(canvas.toDataURL('image/png'));
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={140}
        className="border border-gray-300 rounded-lg bg-white cursor-crosshair w-full touch-none"
        style={{ height: '140px' }}
        onMouseDown={(e) => { const p = getPos(e); beginStroke(p.x, p.y); }}
        onMouseMove={(e) => { const p = getPos(e); continueStroke(p.x, p.y); }}
        onMouseUp={endStroke}
        onMouseLeave={endStroke}
        onTouchStart={(e) => { e.preventDefault(); const p = getTouchPos(e); beginStroke(p.x, p.y); }}
        onTouchMove={(e) => { e.preventDefault(); const p = getTouchPos(e); continueStroke(p.x, p.y); }}
        onTouchEnd={endStroke}
      />
      <p className="text-xs text-gray-400">Draw your signature using mouse or touch. Keep it within the box.</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clear} type="button" disabled={!hasStrokes}>Clear</Button>
        <Button size="sm" onClick={capture} disabled={!hasStrokes} type="button" className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Check className="w-3.5 h-3.5 mr-1" /> Use This Signature
        </Button>
      </div>
    </div>
  );
}

// ─── Integrations Tab ─────────────────────────────────────────────────────────
function IntegrationsTab({
  settings,
  onSave,
}: {
  settings: OwnerSettingsRecord;
  onSave: (updated: OwnerSettingsRecord) => Promise<void>;
}) {
  const [smsProvider, setSmsProvider] = useState<string>(settings.integrations?.smsProvider?.provider ?? 'supabase');
  const [smsEnabled, setSmsEnabled] = useState(settings.integrations?.smsProvider?.enabled ?? false);
  const [smsConfig, setSmsConfig] = useState<Record<string, string>>(settings.integrations?.smsProvider?.config ?? {});
  const [gateway, setGateway] = useState<string>(settings.integrations?.paymentGateway?.gateway ?? 'manual');
  const [gatewayEnabled, setGatewayEnabled] = useState(settings.integrations?.paymentGateway?.enabled ?? false);
  const [gatewayConfig, setGatewayConfig] = useState<Record<string, string>>(settings.integrations?.paymentGateway?.config ?? {});
  const [waProvider, setWaProvider] = useState<string>(settings.integrations?.whatsappProvider?.provider ?? 'none');
  const [waEnabled, setWaEnabled] = useState(settings.integrations?.whatsappProvider?.enabled ?? false);
  const [waConfig, setWaConfig] = useState<Record<string, string>>(settings.integrations?.whatsappProvider?.config ?? {});
  const [saving, setSaving] = useState(false);

  const smsAdapter = SMS_PROVIDER_ADAPTERS[smsProvider as SMSProviderName];
  const gwAdapter = PAYMENT_GATEWAY_ADAPTERS[gateway as PaymentGatewayName];
  const waAdapter = WHATSAPP_PROVIDER_ADAPTERS[waProvider as WhatsAppProviderName];

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated: OwnerSettingsRecord = {
        ...settings,
        integrations: {
          smsProvider: { provider: smsProvider, enabled: smsEnabled, config: smsConfig },
          paymentGateway: { gateway, enabled: gatewayEnabled, config: gatewayConfig },
          whatsappProvider: { provider: waProvider, enabled: waEnabled && waProvider !== 'none', config: waConfig },
        },
      };
      await onSave(updated);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SMS Provider */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="w-4 h-4" /> SMS Provider
          </CardTitle>
          <p className="text-sm text-gray-500">
            Used for automated rent reminders and notifications. Supabase (built-in) handles OTP authentication.
            External providers send custom messages.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Enable external SMS</Label>
            <Toggle checked={smsEnabled} onChange={setSmsEnabled} />
          </div>
          {smsEnabled && (
            <>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Provider</Label>
                <select
                  value={smsProvider}
                  onChange={(e) => { setSmsProvider(e.target.value); setSmsConfig({}); }}
                  className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg"
                >
                  {SMS_PROVIDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {smsAdapter?.requiredFields.map((field) => (
                <div key={field.key}>
                  <Label className="text-xs font-semibold mb-1.5 block">{field.label}</Label>
                  <Input
                    type={field.secret ? 'password' : 'text'}
                    value={smsConfig[field.key] ?? ''}
                    onChange={(e) => setSmsConfig({ ...smsConfig, [field.key]: e.target.value })}
                    className="h-10 text-sm font-mono"
                    placeholder={field.secret ? '••••••••' : field.label}
                  />
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp Provider */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="w-4 h-4" /> WhatsApp Provider
          </CardTitle>
          <p className="text-sm text-gray-500">
            Optional. When configured, new tenants automatically receive a WhatsApp invitation with their
            secure portal magic-link alongside the email invite. Leave unconfigured to send email only.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Enable WhatsApp invitations</Label>
            <Toggle checked={waEnabled} onChange={setWaEnabled} />
          </div>
          {waEnabled && (
            <>
              <div>
                <Label className="text-xs font-semibold mb-1.5 block">Provider</Label>
                <select
                  value={waProvider}
                  onChange={(e) => { setWaProvider(e.target.value); setWaConfig({}); }}
                  className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg"
                >
                  {WHATSAPP_PROVIDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {waAdapter?.requiredFields.map((field) => (
                <div key={field.key}>
                  <Label className="text-xs font-semibold mb-1.5 block">{field.label}</Label>
                  <Input
                    type={field.secret ? 'password' : 'text'}
                    value={waConfig[field.key] ?? ''}
                    onChange={(e) => setWaConfig({ ...waConfig, [field.key]: e.target.value })}
                    className="h-10 text-sm font-mono"
                    placeholder={field.secret ? '••••••••' : field.label}
                  />
                </div>
              ))}
              {waProvider === 'none' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">Select a provider above to send WhatsApp invitations.</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Gateway */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="w-4 h-4" /> Payment Gateway
          </CardTitle>
          <p className="text-sm text-gray-500">
            Optional. Manual / UPI collection requires no credentials and is always available.
            Activate a gateway to enable direct in-portal payment collection.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Gateway</Label>
            <select
              value={gateway}
              onChange={(e) => { setGateway(e.target.value); setGatewayConfig({}); setGatewayEnabled(e.target.value !== 'manual'); }}
              className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg"
            >
              {PAYMENT_GATEWAY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {gateway !== 'manual' && (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Enable {gwAdapter?.label}</Label>
                <Toggle checked={gatewayEnabled} onChange={setGatewayEnabled} />
              </div>
              {gatewayEnabled && gwAdapter?.requiredFields.map((field) => (
                <div key={field.key}>
                  <Label className="text-xs font-semibold mb-1.5 block">{field.label}</Label>
                  <Input
                    type={field.secret ? 'password' : 'text'}
                    value={gatewayConfig[field.key] ?? ''}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, [field.key]: e.target.value })}
                    className="h-10 text-sm font-mono"
                    placeholder={field.secret ? '••••••••' : field.label}
                  />
                </div>
              ))}
            </>
          )}
          {gateway === 'manual' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">UPI ID is configured in the <strong>Payment</strong> tab. No gateway credentials needed for manual collection.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={() => void handleSave()} loading={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
        {!saving && <Save className="w-4 h-4 mr-2" />}
        Save Integrations
      </Button>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function Settings() {
  const { user, refreshProfile, logout } = useAuth();
  const { navWorkspaceRole } = useWorkspace();

  const isBillingVisible = hasWorkspacePermission(navWorkspaceRole, 'settings:billing');

  const [activeTab, setActiveTab] = useState('profile');

  // ── Profile ─────────────────────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState<ProfileUpdateInput>({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    pgName: user?.pgName ?? '',
    city: user?.city ?? '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const [qrUploading, setQrUploading] = useState(false);

  // password reset
  const [passwordResetSent, setPasswordResetSent] = useState(false);
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);

  useEffect(() => {
    setProfileForm({
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      pgName: user?.pgName ?? '',
      city: user?.city ?? '',
    });
  }, [user]);

  const saveProfile = async () => {
    setProfileSaving(true);
    try {
      await supabaseAuthDataApi.updateCurrentProfile(profileForm);
      await refreshProfile();
      void logSettingsChange({
        event: 'PROFILE_UPDATED',
        detail: 'Profile information updated',
        metadata: { fields: Object.keys(profileForm).filter((k) => profileForm[k as keyof typeof profileForm]) },
      });
      toast.success('Profile saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be under 5 MB.'); return; }
    if (!file.type.startsWith('image/')) { toast.error('File must be an image.'); return; }
    setPhotoUploading(true);
    try {
      await supabaseAuthDataApi.uploadProfilePhoto(file);
      await refreshProfile();
      void logSettingsChange({ event: 'PROFILE_PHOTO_UPDATED', detail: 'Profile photo updated' });
      toast.success('Profile photo updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Photo upload failed.');
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    setPasswordResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/update-password` : undefined,
      });
      if (error) throw error;
      void logSettingsChange({ event: 'PASSWORD_RESET_REQUESTED', detail: `Password reset email sent to ${user.email}` });
      setPasswordResetSent(true);
      toast.success('Password reset link sent to your email.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset email.');
    } finally {
      setPasswordResetLoading(false);
    }
  };

  // ── Owner Settings ────────────────────────────────────────────────────────────
  const [ownerSettings, setOwnerSettings] = useState<OwnerSettingsRecord | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const loadOwnerSettings = async () => {
    try {
      const s = await supabaseOwnerDataApi.getOwnerSettings();
      setOwnerSettings(s);
    } catch {
      setOwnerSettings(defaultSettings);
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveOwnerSettings = async (
    updated: OwnerSettingsRecord,
    auditEvent?: Parameters<typeof logSettingsChange>[0]['event'],
    auditDetail?: string,
  ) => {
    setSettingsSaving(true);
    try {
      const saved = await supabaseOwnerDataApi.updateOwnerSettings(updated);
      setOwnerSettings(saved);
      if (auditEvent) {
        void logSettingsChange({ event: auditEvent, detail: auditDetail ?? auditEvent.replace(/_/g, ' ').toLowerCase() });
      }
      toast.success('Settings saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const patchSettings = (patch: Partial<OwnerSettingsRecord>, auditEvent?: Parameters<typeof logSettingsChange>[0]['event']) => {
    if (!ownerSettings) return;
    const updated = { ...ownerSettings, ...patch };
    setOwnerSettings(updated);
    void saveOwnerSettings(updated, auditEvent);
  };

  // ── QR code file upload ───────────────────────────────────────────────────────
  const handleQrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ownerSettings) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('QR image must be under 2 MB.'); return; }
    if (!file.type.startsWith('image/')) { toast.error('File must be an image.'); return; }
    setQrUploading(true);
    try {
      const url = await supabaseAuthDataApi.uploadQrCode(file);
      const updated = { ...ownerSettings, paymentSettings: { ...ownerSettings.paymentSettings, qrCodeUrl: url } };
      setOwnerSettings(updated);
      await saveOwnerSettings(updated, 'PAYMENT_SETTINGS_UPDATED', 'QR code uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'QR upload failed.');
    } finally {
      setQrUploading(false);
      if (qrInputRef.current) qrInputRef.current.value = '';
    }
  };

  // ── Subscription ──────────────────────────────────────────────────────────────
  const [subscription, setSubscription] = useState<OwnerSubscriptionRecord | null>(null);
  const [propertyCount, setPropertyCount] = useState(0);
  const [tenantCount, setTenantCount] = useState(0);
  const [subLoading, setSubLoading] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [couponState, setCouponState] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [couponApplied, setCouponApplied] = useState(false);

  const [upgradePlan, setUpgradePlan] = useState<PlanCode | null>(null);
  const [upgradeConfirmOpen, setUpgradeConfirmOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [showBillingCycle, setShowBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const loadSubscription = async () => {
    try {
      const sub = await supabaseOwnerDataApi.getOwnerSubscription();
      setSubscription(sub);
    } catch {
      // silent
    }
  };

  const loadUsage = async () => {
    try {
      const [props, tenants] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        supabase.from('tenants').select('id', { count: 'exact', head: true }).neq('status', 'archived'),
      ]);
      setPropertyCount(props.count ?? 0);
      setTenantCount(tenants.count ?? 0);
    } catch {
      // ignore
    }
  };

  const handleValidateCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponState('loading');
    setCouponResult(null);
    try {
      const { data, error } = await supabase.rpc('validate_coupon', { p_code: code });
      if (error) throw error;
      const result = data as { valid: boolean; reason?: string; code?: string; description?: string; discountType?: string; discountValue?: number; planRestriction?: string };
      if (result?.valid) {
        const discountType = (result.discountType ?? 'percent') as 'percent' | 'flat';
        const discountValue = Number(result.discountValue ?? 0);
        setCouponState('valid');
        setCouponResult({
          code: result.code ?? code,
          description: result.description ?? '',
          discountType,
          discountValue,
          planRestriction: result.planRestriction ?? null,
          discountPercent: discountType === 'percent' ? discountValue : 0,
          extraMonths: 0,
        });
      } else {
        setCouponState('invalid');
        toast.error(result?.reason ?? 'Invalid coupon code');
      }
    } catch {
      // Fallback: RPC might not be deployed yet — try hardcoded test coupons
      const TEST: Record<string, CouponResult> = {
        WELCOME20: { code: 'WELCOME20', discountType: 'percent', discountValue: 20, discountPercent: 20, extraMonths: 0, description: '20% off your first month' },
        RENTCARE:  { code: 'RENTCARE',  discountType: 'percent', discountValue: 30, discountPercent: 30, extraMonths: 0, description: '30% off for RentCare launch' },
      };
      const fallback = TEST[code];
      if (fallback) {
        setCouponState('valid');
        setCouponResult(fallback);
      } else {
        setCouponState('invalid');
      }
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponResult) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        // Attempt real redemption via RPC (increments used_count, records redemption)
        await (supabase.rpc('redeem_coupon', { p_code: couponResult.code, p_owner_id: user.id }) as unknown as Promise<unknown>).catch(() => {});
      }
      void logSettingsChange({
        event: 'COUPON_APPLIED',
        detail: `Coupon ${couponResult.code} applied — ${couponResult.description}`,
        metadata: { coupon: couponResult.code, discountType: couponResult.discountType, discountValue: couponResult.discountValue },
      });
      setCouponApplied(true);
      toast.success(`Coupon applied: ${couponResult.description}`);
    } catch {
      toast.error('Failed to apply coupon.');
    }
  };

  const handleUpgradePlan = async () => {
    if (!upgradePlan) return;
    setUpgrading(true);
    try {
      const plan = PLANS.find((p) => p.code === upgradePlan);
      const price = showBillingCycle === 'yearly' ? Math.round((plan?.price ?? 0) * 0.8 * 12) : (plan?.price ?? 0);
      const renewsAt = new Date(Date.now() + (showBillingCycle === 'yearly' ? 365 : 30) * 86400000).toISOString();
      const updated = await supabaseOwnerDataApi.updateOwnerSubscription({
        planCode: upgradePlan,
        status: upgradePlan === 'starter' ? 'trialing' : 'active',
        billingCycle: showBillingCycle,
        amount: price,
        renewsAt,
      });
      setSubscription(updated);
      void logSettingsChange({
        event: 'SUBSCRIPTION_CHANGE_REQUESTED',
        detail: `Plan changed to ${plan?.label} (${showBillingCycle})`,
        metadata: { plan: upgradePlan, billingCycle: showBillingCycle, amount: price },
      });
      toast.success(`Plan updated to ${plan?.label}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update plan.');
    } finally {
      setUpgrading(false);
      setUpgradeConfirmOpen(false);
    }
  };

  // ── Export + Delete ───────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await supabaseOwnerDataApi.exportOwnerData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rentcare-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      void logSettingsChange({ event: 'ACCOUNT_DATA_EXPORTED', detail: 'Full account data export downloaded' });
      toast.success('Data exported successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') return;
    setDeleteInProgress(true);
    try {
      // Log before clearing (logs table will be wiped by clearOwnerData)
      await supabase.from('activity_logs').insert({
        owner_id: user?.id,
        property_id: null,
        event: 'ACCOUNT_DATA_CLEARED',
        detail: 'Owner requested account deletion — all data cleared',
        metadata: { requestedAt: new Date().toISOString() },
      }).maybeSingle();

      await supabaseOwnerDataApi.clearOwnerData();
      toast.success('All account data cleared. Signing out…');
      await new Promise((r) => setTimeout(r, 1500));
      await logout();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear account data.');
    } finally {
      setDeleteInProgress(false);
      setDeleteConfirmOpen(false);
    }
  };

  // ── Signature Vault ────────────────────────────────────────────────────────────
  const [activeSignatureProfile, setActiveSignatureProfile] = useState<OwnerSignatureProfile | null>(null);
  const [sigVaultTab, setSigVaultTab] = useState<'draw' | 'upload' | 'typed'>('typed');
  const [sigTypedText, setSigTypedText] = useState('');
  const [sigSaving, setSigSaving] = useState(false);
  const sigUploadRef = useRef<HTMLInputElement>(null);

  const loadSignatureProfile = async () => {
    try {
      const p = await supabaseLifecycleApi.getActiveSignatureProfile();
      setActiveSignatureProfile(p);
      if (p?.signatureType === 'typed' && p.signatureText) setSigTypedText(p.signatureText);
    } catch { /* graceful */ }
  };

  useEffect(() => {
    if (sigVaultTab === 'typed' && sigTypedText.trim() !== '') {
      setActiveSignatureProfile(prev => ({
        ...(prev || {}),
        id: prev?.id || 'temp',
        ownerId: prev?.ownerId || '',
        createdAt: prev?.createdAt || new Date().toISOString(),
        signatureType: 'typed',
        signatureText: sigTypedText.trim(),
        signatureImage: null,
        updatedAt: new Date().toISOString(),
      } as OwnerSignatureProfile));

      const timer = setTimeout(async () => {
        setSigSaving(true);
        try {
          await supabaseLifecycleApi.upsertSignatureProfile({
            signatureType: 'typed',
            signatureImage: null,
            signatureText: sigTypedText.trim(),
          });
        } catch (err) {
          // ignore
        } finally {
          setSigSaving(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [sigTypedText, sigVaultTab]);

  const handleSigUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB.'); return; }
    if (!file.type.startsWith('image/')) { toast.error('File must be an image.'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      if (sigUploadRef.current) sigUploadRef.current.value = '';
      
      setSigSaving(true);
      setActiveSignatureProfile(prev => ({
        ...(prev || {}),
        id: prev?.id || 'temp',
        ownerId: prev?.ownerId || '',
        createdAt: prev?.createdAt || new Date().toISOString(),
        signatureType: 'upload',
        signatureText: null,
        signatureImage: dataUrl,
        updatedAt: new Date().toISOString(),
      } as OwnerSignatureProfile));

      try {
        await supabaseLifecycleApi.upsertSignatureProfile({
          signatureType: 'upload',
          signatureImage: dataUrl,
          signatureText: null,
        });
        toast.success('Signature updated.');
      } catch (err) {
        toast.error('Failed to save signature.');
      } finally {
        setSigSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrawCapture = async (dataUrl: string) => {
    setSigSaving(true);
    setActiveSignatureProfile(prev => ({
      ...(prev || {}),
      id: prev?.id || 'temp',
      ownerId: prev?.ownerId || '',
      createdAt: prev?.createdAt || new Date().toISOString(),
      signatureType: 'draw',
      signatureText: null,
      signatureImage: dataUrl,
      updatedAt: new Date().toISOString(),
    } as OwnerSignatureProfile));

    try {
      await supabaseLifecycleApi.upsertSignatureProfile({
        signatureType: 'draw',
        signatureImage: dataUrl,
        signatureText: null,
      });
      toast.success('Signature updated.');
    } catch (err) {
      toast.error('Failed to save signature.');
    } finally {
      setSigSaving(false);
    }
  };

  // ── Agreement Template ─────────────────────────────────────────────────────────
  const [activeTemplate, setActiveTemplate] = useState<AgreementTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<AgreementTemplateUpsertInput>({
    houseRules: '', visitorRules: '', lateFeeClause: '', noticePeriodClause: '',
    refundPolicy: '', securityDepositTerms: '', propertyRules: '', miscellaneousTerms: '',
  });
  const [templateSaving, setTemplateSaving] = useState(false);

  const loadAgreementTemplate = async () => {
    try {
      const t = await supabaseLifecycleApi.getActiveAgreementTemplate();
      setActiveTemplate(t);
      if (t) {
        setTemplateForm({
          houseRules: t.houseRules ?? '',
          visitorRules: t.visitorRules ?? '',
          lateFeeClause: t.lateFeeClause ?? '',
          noticePeriodClause: t.noticePeriodClause ?? '',
          refundPolicy: t.refundPolicy ?? '',
          securityDepositTerms: t.securityDepositTerms ?? '',
          propertyRules: t.propertyRules ?? '',
          miscellaneousTerms: t.miscellaneousTerms ?? '',
        });
      }
    } catch { /* graceful */ }
  };

  const handleSaveTemplate = async () => {
    setTemplateSaving(true);
    try {
      const saved = await supabaseLifecycleApi.upsertAgreementTemplate(templateForm);
      setActiveTemplate(saved);
      toast.success(`Agreement template saved as v${saved.version}. New agreements will use these terms.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save template.');
    } finally {
      setTemplateSaving(false);
    }
  };

  // ── PG Rules ─────────────────────────────────────────────────────────────────
  const [newRule, setNewRule] = useState('');

  const addRule = () => {
    if (!ownerSettings || !newRule.trim()) return;
    const updated = { ...ownerSettings, pgRules: [...ownerSettings.pgRules, newRule.trim()] };
    setOwnerSettings(updated);
    void saveOwnerSettings(updated, 'WHATSAPP_SETTINGS_UPDATED', 'PG rule added');
    setNewRule('');
  };

  const removeRule = (idx: number) => {
    if (!ownerSettings) return;
    const updated = { ...ownerSettings, pgRules: ownerSettings.pgRules.filter((_, i) => i !== idx) };
    setOwnerSettings(updated);
    void saveOwnerSettings(updated, 'WHATSAPP_SETTINGS_UPDATED', 'PG rule removed');
  };

  // ── Template helpers ──────────────────────────────────────────────────────────
  const insertIntoTemplate = (key: keyof OwnerSettingsRecord['whatsappSettings'], variable: string) => {
    if (!ownerSettings) return;
    const current = ownerSettings.whatsappSettings[key];
    if (typeof current === 'object' && 'template' in current) {
      const updated = {
        ...ownerSettings,
        whatsappSettings: { ...ownerSettings.whatsappSettings, [key]: { ...current, template: current.template + variable } },
      };
      setOwnerSettings(updated);
    }
  };

  useEffect(() => {
    void loadOwnerSettings();
    void loadSubscription();
    void loadUsage();
    void loadSignatureProfile();
    void loadAgreementTemplate();
  }, []);

  // Live plan/limit updates when admin changes the owner's subscription
  useRealtimeRefresh({
    key: 'settings-subscription',
    tables: ['owner_subscriptions'],
    onChange: () => void loadSubscription(),
  });

  const userInitials = (user?.name ?? user?.email ?? 'U').split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const currentPlan = PLANS.find((p) => p.code === (subscription?.planCode ?? 'starter')) ?? PLANS[0];

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen pb-24 md:pb-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account, payment details, and messaging preferences.</p>
      </div>

      {/* Role badge for non-owners */}
      {navWorkspaceRole !== 'workspace_owner' && navWorkspaceRole !== 'editor' && navWorkspaceRole !== 'viewer' && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-200">
          <Shield className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          <p className="text-sm text-indigo-700">
            <strong>Manager view</strong> — You can update your profile and legal signature.
            Billing and payment settings are managed by the workspace owner.
          </p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 w-full max-w-full bg-white border border-gray-200 h-auto gap-1 p-1 overflow-x-auto flex-nowrap justify-start">
          {[
            { value: 'profile',      icon: User,          label: 'Profile',     group: 'workspace' },
            { value: 'payment',      icon: CreditCard,    label: 'Payment',     group: 'billing' },
            { value: 'whatsapp',     icon: MessageCircle, label: 'WhatsApp',    group: 'billing' },
            { value: 'subscription', icon: Crown,         label: 'Plan',        group: 'billing' },
            { value: 'legal',        icon: FileSignature, label: 'Legal',       group: 'workspace' },
            { value: 'integrations', icon: Globe,         label: 'Integrations',group: 'billing' },
          ].filter(({ group }) => group === 'workspace' || isBillingVisible).map(({ value, icon: Icon, label }) => (
            <TabsTrigger key={value} value={value} className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white whitespace-nowrap">
              <Icon className="w-4 h-4 mr-1.5" /> {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── PROFILE TAB ────────────────────────────────────────────────────── */}
        <TabsContent value="profile">
          <div className="space-y-6 max-w-2xl">

            <Card className="border-gray-200">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User className="w-4 h-4" /> Profile</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    {user?.photoUrl ? (
                      <img src={user.photoUrl} alt={user.name} className="w-16 h-16 rounded-2xl object-cover shadow" />
                    ) : (
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center shadow">
                        <span className="text-white font-bold text-xl">{userInitials}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoUploading}
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow hover:bg-gray-50 transition-colors disabled:opacity-60"
                      title="Change photo"
                    >
                      {photoUploading ? <Loader2 className="w-3 h-3 text-gray-500 animate-spin" /> : <Camera className="w-3 h-3 text-gray-600" />}
                    </button>
                    <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void handlePhotoChange(e)} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{user?.name || user?.email}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">JPG, PNG or WebP — max 5 MB</p>
                  </div>
                </div>

                {/* Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Full Name</Label>
                    <Input value={profileForm.name ?? ''} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="h-10" placeholder="Your full name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Email</Label>
                    <Input value={user?.email ?? ''} disabled className="h-10 bg-gray-50 text-gray-500 cursor-not-allowed" />
                    <p className="text-xs text-gray-400">Email managed by Supabase Auth — contact support to change</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Phone</Label>
                    <InternationalPhoneField value={profileForm.phone ?? ''} onChange={(v) => setProfileForm({ ...profileForm, phone: v })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">PG / Business Name</Label>
                    <Input value={profileForm.pgName ?? ''} onChange={(e) => setProfileForm({ ...profileForm, pgName: e.target.value })} className="h-10" placeholder="e.g., Sunrise Living" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">City</Label>
                    <Input value={profileForm.city ?? ''} onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })} className="h-10" placeholder="e.g., Jaipur" />
                  </div>
                </div>

                <Button onClick={() => void saveProfile()} loading={profileSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {!profileSaving && <Save className="w-4 h-4 mr-2" />}
                  Save Profile
                </Button>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="border-gray-200">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bell className="w-4 h-4" /> Notification Preferences</CardTitle></CardHeader>
              <CardContent>
                {settingsLoading ? (
                  <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
                ) : ownerSettings ? (
                  <div className="divide-y divide-gray-100">
                    {[
                      { key: 'paymentNotifications' as const, label: 'Payment notifications', desc: 'Rent received and overdue alerts' },
                      { key: 'maintenanceAlerts' as const, label: 'Maintenance alerts', desc: 'New and updated maintenance tickets' },
                      { key: 'tenantUpdates' as const, label: 'Tenant activity', desc: 'Onboarding, status changes, vacates' },
                      { key: 'emailNotifications' as const, label: 'Email summaries', desc: 'Receive daily digests via email' },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between py-3">
                        <div><p className="text-sm font-medium text-gray-900">{label}</p><p className="text-xs text-gray-500">{desc}</p></div>
                        <Toggle
                          checked={ownerSettings.notifications[key]}
                          onChange={(v) => patchSettings({ notifications: { ...ownerSettings.notifications, [key]: v } }, 'NOTIFICATION_SETTINGS_UPDATED')}
                        />
                      </div>
                    ))}
                    {settingsSaving && <p className="text-xs text-gray-400 flex items-center gap-1 pt-2"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</p>}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-400 mb-2">Could not load notification settings.</p>
                    <Button variant="outline" size="sm" onClick={() => void loadOwnerSettings()}><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Retry</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preferences */}
            {ownerSettings && (
              <Card className="border-gray-200">
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Globe className="w-4 h-4" /> Preferences</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { label: 'Language', key: 'language' as const, options: [['en', 'English'], ['hi', 'Hindi'], ['kn', 'Kannada'], ['ta', 'Tamil'], ['te', 'Telugu']] },
                      { label: 'Timezone', key: 'timezone' as const, options: [['Asia/Kolkata', 'IST (UTC+5:30)'], ['America/New_York', 'EST'], ['America/Los_Angeles', 'PST'], ['Asia/Dubai', 'GST']] },
                      { label: 'Currency', key: 'currency' as const, options: [['INR', 'INR (₹)'], ['USD', 'USD ($)'], ['AED', 'AED (د.إ)']] },
                    ].map(({ label, key, options }) => (
                      <div key={key} className="space-y-1.5">
                        <Label className="text-sm font-medium">{label}</Label>
                        <select
                          value={ownerSettings.additionalSettings[key]}
                          onChange={(e) => patchSettings({ additionalSettings: { ...ownerSettings.additionalSettings, [key]: e.target.value } })}
                          className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          {options.map(([val, display]) => <option key={val} value={val}>{display}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security */}
            <Card className="border-gray-200">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Shield className="w-4 h-4" /> Security</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-700">
                    Authentication uses magic links and Google OAuth via Supabase. Use the button below to send a password reset link to your email.
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Password / Account Reset</p>
                    <p className="text-xs text-gray-500">Send a secure reset link to {user?.email}</p>
                  </div>
                  {passwordResetSent ? (
                    <div className="flex items-center gap-1.5 text-sm text-green-700">
                      <CheckCircle2 className="w-4 h-4" /> Link sent
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => void handleSendPasswordReset()} loading={passwordResetLoading}>
                      Send Reset Link
                    </Button>
                  )}
                </div>

                {ownerSettings && (
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                      <p className="text-xs text-gray-500">Available on Pro and Business plans</p>
                    </div>
                    <Toggle
                      checked={ownerSettings.security.twoFactorAuthentication}
                      onChange={(v) => patchSettings({ security: { twoFactorAuthentication: v } })}
                      disabled={subscription?.planCode === 'starter'}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base text-red-700"><AlertTriangle className="w-4 h-4" /> Danger Zone</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-gray-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Export All Data</p>
                    <p className="text-xs text-gray-500">Download a complete JSON export of all your account data.</p>
                  </div>
                  <Button variant="outline" onClick={() => void handleExportData()} disabled={exporting} className="text-gray-700 border-gray-300 flex-shrink-0">
                    {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    Export
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-red-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-red-900">Delete Account</p>
                    <p className="text-xs text-red-600">Permanently wipes all properties, tenants, payments, and settings.</p>
                  </div>
                  <Button variant="destructive" onClick={() => { setDeleteInput(''); setDeleteConfirmOpen(true); }} className="flex-shrink-0">
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── PAYMENT TAB ─────────────────────────────────────────────────────── */}
        <TabsContent value="payment">
          <div className="space-y-6 max-w-2xl">
            {settingsLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : ownerSettings ? (
              <>
                <Card className="border-gray-200">
                  <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="w-4 h-4" /> Payment Details</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <SectionTitle>UPI</SectionTitle>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">UPI ID</Label>
                      <Input
                        placeholder="yourname@upi"
                        value={ownerSettings.paymentSettings.upiId}
                        onChange={(e) => setOwnerSettings({ ...ownerSettings, paymentSettings: { ...ownerSettings.paymentSettings, upiId: e.target.value } })}
                        className="h-10"
                      />
                      <p className="text-xs text-gray-400">Shown to tenants on payment receipts and reminders</p>
                    </div>

                    <SectionTitle>Bank Account</SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Account Holder Name</Label>
                        <Input
                          placeholder="Full name on account"
                          value={ownerSettings.paymentSettings.bankAccountName}
                          onChange={(e) => setOwnerSettings({ ...ownerSettings, paymentSettings: { ...ownerSettings.paymentSettings, bankAccountName: e.target.value } })}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Account Number</Label>
                        <Input
                          placeholder="XXXX XXXX XXXX 1234"
                          value={ownerSettings.paymentSettings.bankAccount}
                          onChange={(e) => setOwnerSettings({ ...ownerSettings, paymentSettings: { ...ownerSettings.paymentSettings, bankAccount: e.target.value } })}
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">IFSC Code</Label>
                        <Input
                          placeholder="SBIN0001234"
                          value={ownerSettings.paymentSettings.ifscCode}
                          onChange={(e) => setOwnerSettings({ ...ownerSettings, paymentSettings: { ...ownerSettings.paymentSettings, ifscCode: e.target.value.toUpperCase() } })}
                          className="h-10 font-mono"
                          maxLength={11}
                        />
                      </div>
                    </div>

                    <SectionTitle>Payment QR Code</SectionTitle>
                    <div className="space-y-3">
                      {ownerSettings.paymentSettings.qrCodeUrl ? (
                        <div className="flex items-center gap-4">
                          <img src={ownerSettings.paymentSettings.qrCodeUrl} alt="Payment QR" className="w-24 h-24 border border-gray-200 rounded-lg object-contain p-1" />
                          <div className="space-y-2">
                            <p className="text-sm text-gray-700 font-medium">QR code saved</p>
                            <Button
                              variant="outline" size="sm"
                              onClick={() => {
                                const updated = { ...ownerSettings, paymentSettings: { ...ownerSettings.paymentSettings, qrCodeUrl: '' } };
                                setOwnerSettings(updated);
                                void saveOwnerSettings(updated, 'PAYMENT_SETTINGS_UPDATED', 'QR code removed');
                              }}
                              className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                            >
                              <Trash2 className="w-3 h-3 mr-1" /> Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <QrCode className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                              <Input
                                placeholder="Paste QR image URL…"
                                value={ownerSettings.paymentSettings.qrCodeUrl}
                                onChange={(e) => setOwnerSettings({ ...ownerSettings, paymentSettings: { ...ownerSettings.paymentSettings, qrCodeUrl: e.target.value } })}
                                className="h-10 pl-9"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => qrInputRef.current?.click()}
                              disabled={qrUploading}
                              className="flex-shrink-0 h-10"
                              title="Upload QR image file"
                            >
                              {qrUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            </Button>
                          </div>
                          <p className="text-xs text-gray-400">Paste a URL or upload a QR image (JPG/PNG, max 2 MB)</p>
                          <input ref={qrInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void handleQrFileChange(e)} />
                        </div>
                      )}
                    </div>

                    <Button onClick={() => void saveOwnerSettings(ownerSettings, 'PAYMENT_SETTINGS_UPDATED', 'Payment details saved')} loading={settingsSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      {!settingsSaving && <Save className="w-4 h-4 mr-2" />}
                      Save Payment Details
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-gray-200">
                  <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bell className="w-4 h-4" /> Rent Reminder Settings</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Enable Rent Reminders</p>
                        <p className="text-xs text-gray-500">Remind tenants before rent is due</p>
                      </div>
                      <Toggle
                        checked={ownerSettings.paymentSettings.rentReminderEnabled}
                        onChange={(v) => setOwnerSettings({ ...ownerSettings, paymentSettings: { ...ownerSettings.paymentSettings, rentReminderEnabled: v } })}
                      />
                    </div>

                    {ownerSettings.paymentSettings.rentReminderEnabled && (
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Days Before Due Date</Label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range" min={1} max={10}
                            value={ownerSettings.paymentSettings.rentReminderDaysBefore}
                            onChange={(e) => setOwnerSettings({ ...ownerSettings, paymentSettings: { ...ownerSettings.paymentSettings, rentReminderDaysBefore: Number(e.target.value) } })}
                            className="flex-1 accent-indigo-600"
                          />
                          <span className="text-sm font-semibold text-indigo-700 w-16 text-center">
                            {ownerSettings.paymentSettings.rentReminderDaysBefore} day{ownerSettings.paymentSettings.rentReminderDaysBefore !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Late Payment Fee (₹)</Label>
                      <Input
                        type="number" min={0} placeholder="0"
                        value={ownerSettings.paymentSettings.latePaymentFee || ''}
                        onChange={(e) => setOwnerSettings({ ...ownerSettings, paymentSettings: { ...ownerSettings.paymentSettings, latePaymentFee: parseInt(e.target.value) || 0 } })}
                        className="h-10 w-40"
                      />
                      <p className="text-xs text-gray-400">Shown on overdue payment records. Enforcement is manual.</p>
                    </div>

                    <Button onClick={() => void saveOwnerSettings(ownerSettings, 'PAYMENT_SETTINGS_UPDATED', 'Reminder settings saved')} loading={settingsSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      {!settingsSaving && <Save className="w-4 h-4 mr-2" />}
                      Save Reminder Settings
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400 mb-2">Could not load payment settings.</p>
                <Button variant="outline" size="sm" onClick={() => void loadOwnerSettings()}><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Retry</Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── WHATSAPP TAB ──────────────────────────────────────────────────────── */}
        <TabsContent value="whatsapp">
          <div className="space-y-6 max-w-2xl">
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900">WhatsApp Business API not connected</p>
                <p className="text-xs text-amber-700">Templates are saved and ready. Messages will send once a WhatsApp Business number is linked.</p>
              </div>
            </div>

            {settingsLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : ownerSettings ? (
              <>
                <Card className="border-gray-200">
                  <CardHeader><CardTitle className="text-base">Message Templates</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    {([
                      { key: 'welcomeMessage' as const, label: 'Welcome Message', desc: 'Sent when a new tenant is onboarded' },
                      { key: 'rentReminder' as const, label: 'Rent Reminder', desc: `Sent ${ownerSettings.whatsappSettings.rentReminder.daysBeforeDue} day(s) before due`, hasReminder: true },
                      { key: 'paymentConfirmation' as const, label: 'Payment Confirmation', desc: 'Sent when payment is marked received' },
                      { key: 'complaintUpdate' as const, label: 'Maintenance Update', desc: 'Sent when a ticket status changes', hasComplaint: true },
                    ] as const).map(({ key, label, desc, hasReminder, hasComplaint }: { key: keyof Pick<typeof ownerSettings.whatsappSettings, 'welcomeMessage' | 'rentReminder' | 'paymentConfirmation' | 'complaintUpdate'>; label: string; desc: string; hasReminder?: boolean; hasComplaint?: boolean }) => {
                      const setting = ownerSettings.whatsappSettings[key];
                      return (
                        <div key={key} className="border border-gray-200 rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div><p className="text-sm font-semibold text-gray-900">{label}</p><p className="text-xs text-gray-500">{desc}</p></div>
                            <Toggle
                              checked={setting.enabled}
                              onChange={(v) => patchSettings({ whatsappSettings: { ...ownerSettings.whatsappSettings, [key]: { ...setting, enabled: v } } }, 'WHATSAPP_SETTINGS_UPDATED')}
                            />
                          </div>

                          {setting.enabled && (
                            <>
                              {hasReminder && (
                                <div className="flex items-center gap-3">
                                  <Label className="text-xs text-gray-600 whitespace-nowrap">Days before due:</Label>
                                  <input
                                    type="number" min={1} max={14}
                                    value={(ownerSettings.whatsappSettings.rentReminder as typeof ownerSettings.whatsappSettings.rentReminder).daysBeforeDue}
                                    onChange={(e) => setOwnerSettings({
                                      ...ownerSettings,
                                      whatsappSettings: { ...ownerSettings.whatsappSettings, rentReminder: { ...ownerSettings.whatsappSettings.rentReminder, daysBeforeDue: Math.max(1, Math.min(14, parseInt(e.target.value) || 3)) } },
                                    })}
                                    className="w-16 h-8 border border-gray-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>
                              )}
                              {hasComplaint && (
                                <div className="flex flex-wrap gap-3">
                                  {[
                                    { field: 'notifyOnCreate' as const, label: 'On create' },
                                    { field: 'notifyOnProgress' as const, label: 'On progress' },
                                    { field: 'notifyOnResolve' as const, label: 'On resolve' },
                                  ].map(({ field, label: fLabel }) => (
                                    <label key={field} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={(ownerSettings.whatsappSettings.complaintUpdate as typeof ownerSettings.whatsappSettings.complaintUpdate)[field]}
                                        onChange={(e) => patchSettings({
                                          whatsappSettings: { ...ownerSettings.whatsappSettings, complaintUpdate: { ...ownerSettings.whatsappSettings.complaintUpdate, [field]: e.target.checked } },
                                        }, 'WHATSAPP_SETTINGS_UPDATED')}
                                        className="w-3.5 h-3.5 accent-indigo-600"
                                      />
                                      {fLabel}
                                    </label>
                                  ))}
                                </div>
                              )}
                              <div className="space-y-1">
                                <Label className="text-xs text-gray-600">Template text</Label>
                                <textarea
                                  rows={3}
                                  value={setting.template}
                                  onChange={(e) => setOwnerSettings({ ...ownerSettings, whatsappSettings: { ...ownerSettings.whatsappSettings, [key]: { ...setting, template: e.target.value } } })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                />
                                <VarChips onInsert={(v) => insertIntoTemplate(key, v)} />
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                    <Button onClick={() => void saveOwnerSettings(ownerSettings, 'WHATSAPP_SETTINGS_UPDATED', 'WhatsApp templates saved')} loading={settingsSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      {!settingsSaving && <Save className="w-4 h-4 mr-2" />}
                      Save Templates
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-gray-200">
                  <CardHeader><CardTitle className="text-base">Custom Footer</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-500">Appended to every WhatsApp message — PG address, contact number, sign-off.</p>
                    <textarea
                      rows={2}
                      placeholder="e.g., RentCare Residency, Vaishali Nagar · +91 98765 00000"
                      value={ownerSettings.whatsappSettings.customFooter}
                      onChange={(e) => setOwnerSettings({ ...ownerSettings, whatsappSettings: { ...ownerSettings.whatsappSettings, customFooter: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <Button onClick={() => void saveOwnerSettings(ownerSettings, 'WHATSAPP_SETTINGS_UPDATED', 'Custom footer saved')} loading={settingsSaving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      {!settingsSaving && <Save className="w-4 h-4 mr-2" />}
                      Save Footer
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-gray-200">
                  <CardHeader><CardTitle className="text-base">PG House Rules</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-500">Rules appear in tenant welcome messages and the tenant portal.</p>
                    <div className="space-y-2">
                      {ownerSettings.pgRules.map((rule, i) => (
                        <div key={i} className="flex items-center gap-2 group">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center font-semibold">{i + 1}</span>
                          <p className="flex-1 text-sm text-gray-800">{rule}</p>
                          <button type="button" onClick={() => removeRule(i)} className="p-1 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      ))}
                      {ownerSettings.pgRules.length === 0 && <p className="text-sm text-gray-400 italic">No rules yet.</p>}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        placeholder="Add a new rule…" value={newRule}
                        onChange={(e) => setNewRule(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRule(); } }}
                        className="h-9 text-sm"
                      />
                      <Button type="button" onClick={addRule} disabled={!newRule.trim()} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white flex-shrink-0">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400 mb-2">Could not load WhatsApp settings.</p>
                <Button variant="outline" size="sm" onClick={() => void loadOwnerSettings()}><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Retry</Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── SUBSCRIPTION TAB ──────────────────────────────────────────────────── */}
        <TabsContent value="subscription">
          <div className="space-y-6 max-w-3xl">

            {/* Current plan + usage */}
            <Card className="border-gray-200">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Crown className="w-4 h-4 text-indigo-600" /> Current Plan</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-gray-900">{currentPlan.label}</h3>
                      {subscription && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          subscription.status === 'active' ? 'bg-green-100 text-green-700'
                          : subscription.status === 'trialing' ? 'bg-blue-100 text-blue-700'
                          : subscription.status === 'past_due' ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}>
                          {subscription.status.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1.5 mb-4">
                      {currentPlan.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-gray-600"><Check className="w-4 h-4 text-green-600 flex-shrink-0" /> {f}</li>
                      ))}
                    </ul>
                    {subscription?.trialEndsAt && subscription.status === 'trialing' && (
                      <p className="text-sm text-amber-600">Renews on: {new Date(subscription.trialEndsAt).toLocaleDateString('en-IN')}</p>
                    )}
                    {subscription?.renewsAt && subscription.status === 'active' && (
                      <p className="text-sm text-gray-500">Renews: {new Date(subscription.renewsAt).toLocaleDateString('en-IN')}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-3xl font-bold text-gray-900">{currentPlan.price === 0 ? 'Free' : `₹${currentPlan.price.toLocaleString('en-IN')}`}</p>
                    {currentPlan.price > 0 && <p className="text-sm text-gray-500">/{subscription?.billingCycle ?? 'month'}</p>}
                  </div>
                </div>

                {/* Usage indicators */}
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Properties', used: propertyCount, limit: currentPlan.propertyLimit },
                    { label: 'Active Tenants', used: tenantCount, limit: currentPlan.tenantLimit },
                  ].map(({ label, used, limit }) => {
                    const pct = limit === Infinity ? 0 : Math.min(100, Math.round((used / limit) * 100));
                    const isNearLimit = limit !== Infinity && used / limit >= 0.8;
                    const isAtLimit = limit !== Infinity && used >= limit;
                    return (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-gray-700">{label}</p>
                          <p className={`text-xs font-semibold ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-gray-600'}`}>
                            {used} / {limit === Infinity ? '∞' : limit}
                          </p>
                        </div>
                        {limit !== Infinity && (
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-indigo-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                        {isAtLimit && (
                          <p className="text-xs text-red-600 mt-0.5">Limit reached — upgrade to add more</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Billing history */}
            <Card className="border-gray-200">
              <CardHeader><CardTitle className="text-base">Billing History</CardTitle></CardHeader>
              <CardContent>
                {subscription?.lastPaymentAt ? (
                  <div className="divide-y divide-gray-100">
                    <div className="flex items-center justify-between py-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{currentPlan.label} Plan</p>
                        <p className="text-xs text-gray-500">{new Date(subscription.lastPaymentAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">₹{subscription.amount.toLocaleString('en-IN')}</p>
                        <span className="text-xs text-green-700 bg-green-50 px-1.5 py-0.5 rounded">Paid</span>
                      </div>
                    </div>
                    <p className="pt-3 text-xs text-gray-400">Full invoice history available once payment gateway is connected.</p>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No billing history yet.</p>
                    <p className="text-xs mt-1">Invoices appear here once a paid plan is active.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Coupon code */}
            <Card className="border-gray-200">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Tag className="w-4 h-4" /> Coupon Code</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponState('idle'); setCouponResult(null); }}
                    className={`h-10 font-mono max-w-xs ${couponState === 'valid' ? 'border-green-400 focus:ring-green-400' : couponState === 'invalid' ? 'border-red-400 focus:ring-red-400' : ''}`}
                    disabled={couponApplied}
                  />
                  {!couponApplied && (
                    <Button onClick={() => void handleValidateCoupon()} disabled={couponState === 'loading' || !couponCode.trim()} variant="outline">
                      {couponState === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Validate'}
                    </Button>
                  )}
                </div>

                {couponState === 'invalid' && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <X className="w-4 h-4 flex-shrink-0" /> Invalid or expired coupon code.
                  </div>
                )}

                {couponState === 'valid' && couponResult && !couponApplied && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-green-800">
                      <Check className="w-4 h-4 flex-shrink-0" />
                      <p className="text-sm font-semibold">{couponResult.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm">
                      {couponResult.discountPercent > 0 && (
                        <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-lg font-semibold">{couponResult.discountPercent}% off</span>
                      )}
                      {couponResult.extraMonths > 0 && (
                        <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg font-semibold">+{couponResult.extraMonths} month{couponResult.extraMonths > 1 ? 's' : ''} free</span>
                      )}
                    </div>
                    <Button size="sm" onClick={() => void handleApplyCoupon()} className="bg-green-600 hover:bg-green-700 text-white">
                      Apply Coupon
                    </Button>
                  </div>
                )}

                {couponApplied && couponResult && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    Coupon <strong>{couponResult.code}</strong> applied — {couponResult.description}
                  </div>
                )}

                {!couponApplied && <p className="text-xs text-gray-400">Coupon applied to your next billing cycle.</p>}
              </CardContent>
            </Card>

            {/* Plans grid */}
            <Card className="border-gray-200">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base">Available Plans</CardTitle>
                  <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg text-xs">
                    {(['monthly', 'yearly'] as const).map((cycle) => (
                      <button key={cycle} onClick={() => setShowBillingCycle(cycle)}
                        className={`px-3 py-1 rounded-md transition-colors capitalize ${showBillingCycle === cycle ? 'bg-white shadow text-gray-900 font-semibold' : 'text-gray-500'}`}
                      >
                        {cycle}{cycle === 'yearly' && <span className="ml-1 text-green-600 font-semibold">−20%</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {PLANS.map((plan) => {
                    const price = showBillingCycle === 'yearly' ? Math.round(plan.price * 0.8) : plan.price;
                    const isCurrent = plan.code === (subscription?.planCode ?? 'starter');
                    return (
                      <div key={plan.code} className={`border rounded-xl p-4 space-y-3 relative ${(plan as { highlighted?: boolean }).highlighted ? 'border-indigo-400 shadow-md shadow-indigo-100' : 'border-gray-200'}`}>
                        {(plan as { highlighted?: boolean }).highlighted && (
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs px-3 py-0.5 rounded-full font-semibold">Most Popular</span>
                        )}
                        <div>
                          <p className="font-bold text-gray-900">{plan.label}</p>
                          <p className="text-2xl font-bold text-gray-900 mt-1">
                            {price === 0 ? 'Free' : `₹${price.toLocaleString('en-IN')}`}
                            {price > 0 && <span className="text-sm font-normal text-gray-500">/{showBillingCycle === 'yearly' ? 'yr' : 'mo'}</span>}
                          </p>
                        </div>
                        <ul className="space-y-1.5">
                          {plan.features.map((f) => (
                            <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600"><Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" /> {f}</li>
                          ))}
                        </ul>
                        <Button
                          size="sm"
                          disabled={isCurrent || subLoading}
                          onClick={() => { setUpgradePlan(plan.code); setUpgradeConfirmOpen(true); }}
                          className={`w-full text-sm ${isCurrent ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : (plan as { highlighted?: boolean }).highlighted ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                        >
                          {isCurrent ? 'Current plan' : plan.price < currentPlan.price ? 'Downgrade' : 'Upgrade'}
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Need more properties?</p>
                    <p className="text-xs text-gray-500 mt-0.5">Pro includes unlimited properties. Starter users can add extra property slots at ₹299/property/month — contact support.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── LEGAL TAB ─────────────────────────────────────────────────────── */}
        <TabsContent value="legal">
          <div className="space-y-6 max-w-2xl">

            {/* Signature Vault */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileSignature className="w-4 h-4" /> Signature Vault
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Save your signature once — it will be auto-applied when you generate new agreements, eliminating the manual signing step.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Active signature preview */}
                {activeSignatureProfile && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-green-800">Active Signature ({activeSignatureProfile.signatureType})</p>
                      {activeSignatureProfile.signatureType === 'typed' && activeSignatureProfile.signatureText ? (
                        <p className="text-xl font-serif italic text-gray-800 mt-1">{activeSignatureProfile.signatureText}</p>
                      ) : activeSignatureProfile.signatureImage ? (
                        <img src={activeSignatureProfile.signatureImage} alt="Active signature" className="h-10 mt-1 max-w-[180px]" />
                      ) : null}
                      <p className="text-xs text-green-700 mt-1">Last updated: {new Date(activeSignatureProfile.updatedAt).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                )}

                {/* Method tabs */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
                  {(['typed', 'draw', 'upload'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => { setSigVaultTab(method); }}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                        sigVaultTab === method ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {method === 'typed' && <Type className="w-3.5 h-3.5 inline mr-1.5" />}
                      {method === 'draw' && <PenLine className="w-3.5 h-3.5 inline mr-1.5" />}
                      {method === 'upload' && <Upload className="w-3.5 h-3.5 inline mr-1.5" />}
                      {method}
                    </button>
                  ))}
                </div>

                {/* Typed */}
                {sigVaultTab === 'typed' && (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Your Name (as signature) {sigSaving && <span className="text-xs text-indigo-500 ml-2 animate-pulse">Saving...</span>}</Label>
                      <Input
                        value={sigTypedText}
                        onChange={(e) => setSigTypedText(e.target.value)}
                        placeholder="e.g., Moti Sanjay"
                        className="h-10"
                      />
                    </div>
                  </div>
                )}

                {/* Draw */}
                {sigVaultTab === 'draw' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <Label>Draw Signature</Label>
                      {sigSaving && <span className="text-xs text-indigo-500 animate-pulse">Saving...</span>}
                    </div>
                    <SignatureDrawPad onCapture={handleDrawCapture} />
                  </div>
                )}

                {/* Upload */}
                {sigVaultTab === 'upload' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <Label>Upload Image</Label>
                      {sigSaving && <span className="text-xs text-indigo-500 animate-pulse">Saving...</span>}
                    </div>
                    <input
                      ref={sigUploadRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      className="hidden"
                      onChange={handleSigUpload}
                    />
                    <button
                      type="button"
                      onClick={() => sigUploadRef.current?.click()}
                      className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-600">Upload signature image</p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG or SVG · Max 2 MB · Transparent background preferred</p>
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Agreement Template */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-4 h-4" /> Agreement Template
                  {activeTemplate && (
                    <span className="ml-auto text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      v{activeTemplate.version}
                    </span>
                  )}
                </CardTitle>
                <p className="text-sm text-gray-500">
                  Customize agreement clauses. Dynamic fields are injected automatically and cannot be edited here.
                  Saving creates a new version — existing signed agreements are never modified.
                </p>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Protected dynamic fields */}
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-xs font-semibold text-blue-700 mb-2">Auto-injected fields (read-only)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['{{tenant_name}}', '{{tenant_phone}}', '{{tenant_email}}', '{{property_name}}',
                      '{{property_address}}', '{{room}}', '{{bed}}', '{{rent}}', '{{deposit}}',
                      '{{join_date}}', '{{owner_name}}', '{{owner_phone}}'].map((v) => (
                      <span key={v} className="text-xs px-2 py-0.5 bg-white border border-blue-200 text-blue-700 rounded font-mono">{v}</span>
                    ))}
                  </div>
                </div>

                {/* Editable clauses */}
                {([
                  { key: 'houseRules' as const, label: 'House Rules', placeholder: 'e.g. No smoking, no alcohol on premises, lights-out by 11 PM…' },
                  { key: 'visitorRules' as const, label: 'Visitor Rules', placeholder: 'e.g. Overnight guests require prior approval…' },
                  { key: 'lateFeeClause' as const, label: 'Late Fee Clause', placeholder: 'e.g. Late fee of ₹100/day applies after the due date…' },
                  { key: 'noticePeriodClause' as const, label: 'Notice Period', placeholder: 'e.g. 30 days written notice required from either party…' },
                  { key: 'refundPolicy' as const, label: 'Refund Policy', placeholder: 'e.g. Deposit refunded within 15 days of vacating after deductions…' },
                  { key: 'securityDepositTerms' as const, label: 'Security Deposit Terms', placeholder: 'e.g. Deposit held against damages, dues, or unpaid rent…' },
                  { key: 'propertyRules' as const, label: 'Property Rules', placeholder: 'e.g. Shared spaces must be kept clean at all times…' },
                  { key: 'miscellaneousTerms' as const, label: 'Miscellaneous Terms', placeholder: 'Any additional terms specific to your property…' },
                ] as const).map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-sm font-medium">{label}</Label>
                    <textarea
                      value={templateForm[key] ?? ''}
                      onChange={(e) => setTemplateForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-400"
                    />
                  </div>
                ))}

                <Button
                  onClick={() => void handleSaveTemplate()}
                  loading={templateSaving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {!templateSaving && <Save className="w-4 h-4 mr-2" />}
                  Save Template {activeTemplate ? `(creates v${activeTemplate.version + 1})` : '(creates v1)'}
                </Button>
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        {/* ── INTEGRATIONS TAB ─────────────────────────────────────────────────── */}
        {ownerSettings && (
          <TabsContent value="integrations">
            <div className="space-y-6 max-w-2xl">
              <IntegrationsTab settings={ownerSettings} onSave={async (updated) => {
                await saveOwnerSettings(updated, undefined, 'Integration settings updated');
              }} />
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* ── Delete Account Confirm ───────────────────────────────────────────── */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-700"><AlertTriangle className="w-5 h-5" /> Delete Account?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This permanently deletes:</p>
              <ul className="list-disc list-inside text-sm space-y-0.5 text-gray-700">
                <li>All properties and rooms</li>
                <li>All tenants, agreements, and history</li>
                <li>All payments and charges</li>
                <li>All maintenance tickets</li>
                <li>All announcements</li>
                <li>Your settings and subscription data</li>
              </ul>
              <p className="text-sm font-semibold text-red-700 pt-2">
                Cannot be undone. Your login credentials remain — contact support to fully remove your auth account.
              </p>
              <div className="pt-2 space-y-1.5">
                <p className="text-sm text-gray-700">Type <strong>DELETE</strong> to confirm:</p>
                <Input value={deleteInput} onChange={(e) => setDeleteInput(e.target.value)} placeholder="DELETE" className="h-10 font-mono border-red-300 focus:ring-red-500" />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteInProgress}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={deleteInput !== 'DELETE' || deleteInProgress} onClick={() => void handleDeleteAccount()} className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50">
              {deleteInProgress ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting…</> : 'Delete All Data'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Plan change confirm ──────────────────────────────────────────────── */}
      <AlertDialog open={upgradeConfirmOpen} onOpenChange={setUpgradeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{PLANS.find((p) => p.code === upgradePlan)?.price ?? 0 < currentPlan.price ? 'Confirm Downgrade' : 'Confirm Plan Change'}</AlertDialogTitle>
            <AlertDialogDescription>
              {upgradePlan && (() => {
                const plan = PLANS.find((p) => p.code === upgradePlan);
                const price = showBillingCycle === 'yearly' ? Math.round((plan?.price ?? 0) * 0.8) : (plan?.price ?? 0);
                return (
                  <>
                    Switching to <strong>{plan?.label}</strong> ({showBillingCycle}) at{' '}
                    <strong>{price === 0 ? 'Free' : `₹${price.toLocaleString('en-IN')}/${showBillingCycle === 'yearly' ? 'yr' : 'mo'}`}</strong>.
                    {couponApplied && couponResult && (
                      <><br /><span className="text-green-700">Coupon {couponResult.code} will be applied.</span></>
                    )}
                    <br />Changes take effect immediately.
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={upgrading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleUpgradePlan()} disabled={upgrading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {upgrading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating…</> : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
