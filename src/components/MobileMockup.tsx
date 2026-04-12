import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Home,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';
import { useAuth } from '../contexts/AuthContext';
import {
  MaintenanceTicketRecord,
  PaymentRecord,
  TenantPortalSnapshot,
  TenantRecord,
  supabaseOwnerDataApi,
  supabaseTenantDataApi,
} from '../services/supabaseData';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';

function formatAmount(value: number): string {
  return `Rs ${value.toLocaleString('en-IN')}`;
}

function formatDate(value: string): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export function MobileMockup() {
  const { user } = useAuth();
  const { properties, selectedProperty } = useProperty();

  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceTicketRecord[]>([]);
  const [tenantSnapshot, setTenantSnapshot] = useState<TenantPortalSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    if (user.role === 'tenant') {
      const snapshot = await supabaseTenantDataApi.getPortalSnapshot();
      setTenantSnapshot(snapshot);
      setTenants([]);
      setPayments([]);
      setMaintenance([]);
      setIsLoading(false);
      return;
    }

    const [tenantRows, paymentRows, maintenanceRows] = await Promise.all([
      supabaseOwnerDataApi.listTenants(selectedProperty),
      supabaseOwnerDataApi.listPayments(selectedProperty),
      supabaseOwnerDataApi.listMaintenanceTickets(selectedProperty),
    ]);

    setTenantSnapshot(null);
    setTenants(tenantRows);
    setPayments(paymentRows);
    setMaintenance(maintenanceRows);
    setIsLoading(false);
  }, [selectedProperty, user]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user) {
        return;
      }

      try {
        await loadData();
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load mobile preview data.');
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [loadData, user]);

  const { isSyncing } = useRealtimeRefresh({
    key: `mobile-preview-${selectedProperty}`,
    tables: ['properties', 'rooms', 'tenants', 'payments', 'payment_charges', 'maintenance_tickets', 'maintenance_notes', 'announcements', 'notifications'],
    onChange: loadData,
    enabled: !!user,
  });

  const ownerStats = useMemo(() => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const monthlyRevenue = payments
      .filter((payment) => payment.status === 'paid' && payment.paidDate)
      .filter((payment) => {
        const paidDate = new Date(payment.paidDate);
        return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
      })
      .reduce((sum, payment) => sum + payment.totalAmount, 0);

    const pendingAmount = payments
      .filter((payment) => payment.status !== 'paid')
      .reduce((sum, payment) => sum + payment.totalAmount, 0);

    const activeTenants = tenants.filter((tenant) => tenant.status === 'active').length;

    return {
      monthlyRevenue,
      pendingAmount,
      activeTenants,
      openMaintenance: maintenance.filter((ticket) => ticket.status !== 'resolved').length,
    };
  }, [maintenance, payments, tenants]);

  const propertyName = selectedProperty === 'all'
    ? 'All Properties'
    : properties.find((property) => property.id === selectedProperty)?.name ?? 'Selected Property';

  const renderPhoneFrame = (content: React.ReactNode) => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 py-8 px-4">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Mobile Demo Preview</h2>
        <p className="text-indigo-200">Live Supabase-backed mobile summary</p>
      </div>

      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-[3.5rem] blur-2xl opacity-25" />
        <div className="relative w-[375px] h-[812px] bg-gradient-to-b from-gray-900 to-black rounded-[3rem] p-3 shadow-2xl border border-gray-700">
          <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden flex flex-col">
            <div className="bg-white px-6 pt-3 pb-2 flex items-center justify-between text-xs border-b border-gray-100">
              <span className="font-semibold text-gray-900">9:41</span>
              <span className={`text-xs ${isSyncing ? 'text-amber-600' : 'text-emerald-600'}`}>{isSyncing ? 'Syncing' : 'Live'}</span>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-50">{content}</div>

            <div className="bg-white border-t border-gray-200 px-5 py-3 flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1"><Home className="w-4 h-4" /> Home</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> Tenants</span>
              <span className="flex items-center gap-1"><CreditCard className="w-4 h-4" /> Payments</span>
              <span className="flex items-center gap-1"><Wrench className="w-4 h-4" /> Service</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return renderPhoneFrame(
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading mobile data...</p>
        </div>
      </div>,
    );
  }

  if (errorMessage) {
    return renderPhoneFrame(
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      </div>,
    );
  }

  if (user?.role === 'tenant' && tenantSnapshot) {
    const pendingPayments = tenantSnapshot.payments.filter((payment) => payment.status !== 'paid');
    const activeMaintenance = tenantSnapshot.maintenance.filter((ticket) => ticket.status !== 'resolved');

    return renderPhoneFrame(
      <div className="min-h-full bg-gradient-to-br from-blue-600 to-cyan-500 text-white p-6 pb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-white/70 text-xs">Tenant App</p>
            <h1 className="text-2xl font-bold mt-1">Hi, {tenantSnapshot.profile.name.split(' ')[0]}</h1>
          </div>
          <Bell className="w-5 h-5" />
        </div>

        <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/30 mb-4">
          <p className="text-xs text-white/80">Room</p>
          <p className="text-xl font-semibold mt-1">{tenantSnapshot.tenant.room} • Bed {tenantSnapshot.tenant.bed}</p>
          <p className="text-xs text-white/80 mt-2">Monthly rent {formatAmount(tenantSnapshot.tenant.rent)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-2xl p-4 text-gray-900">
            <p className="text-xs text-gray-600">Pending Payments</p>
            <p className="text-2xl mt-1">{pendingPayments.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-gray-900">
            <p className="text-xs text-gray-600">Active Complaints</p>
            <p className="text-2xl mt-1">{activeMaintenance.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 text-gray-900">
          <p className="text-sm font-semibold">Latest Announcement</p>
          <p className="text-xs text-gray-600 mt-2">
            {tenantSnapshot.announcements[0]?.title ?? 'No announcements posted yet.'}
          </p>
        </div>
      </div>,
    );
  }

  return renderPhoneFrame(
    <div className="min-h-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white p-6 pb-10">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-white/70 text-xs">Owner App</p>
          <h1 className="text-2xl font-bold mt-1">Property Snapshot</h1>
          <p className="text-xs text-white/75 mt-1">{propertyName}</p>
        </div>
        <Activity className="w-5 h-5" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/30">
          <TrendingUp className="w-4 h-4 mb-2" />
          <p className="text-xs text-white/80">Revenue</p>
          <p className="text-lg font-semibold mt-1">{formatAmount(ownerStats.monthlyRevenue)}</p>
        </div>
        <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/30">
          <Users className="w-4 h-4 mb-2" />
          <p className="text-xs text-white/80">Active Tenants</p>
          <p className="text-lg font-semibold mt-1">{ownerStats.activeTenants}</p>
        </div>
        <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/30">
          <Clock className="w-4 h-4 mb-2" />
          <p className="text-xs text-white/80">Pending</p>
          <p className="text-lg font-semibold mt-1">{formatAmount(ownerStats.pendingAmount)}</p>
        </div>
        <div className="bg-white/20 rounded-2xl p-4 backdrop-blur-sm border border-white/30">
          <Wrench className="w-4 h-4 mb-2" />
          <p className="text-xs text-white/80">Open Tickets</p>
          <p className="text-lg font-semibold mt-1">{ownerStats.openMaintenance}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 text-gray-900 mb-4">
        <p className="text-sm font-semibold mb-3">Recent Payments</p>
        <div className="space-y-2">
          {payments.slice(0, 3).map((payment) => (
            <div key={payment.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{payment.tenant}</p>
                <p className="text-xs text-gray-500">Due {formatDate(payment.dueDate)}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${
                payment.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                {payment.status}
              </span>
            </div>
          ))}
          {payments.length === 0 && <p className="text-xs text-gray-500">No payment activity yet.</p>}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 text-gray-900">
        <p className="text-sm font-semibold mb-3">Service Queue</p>
        <div className="space-y-2">
          {maintenance.slice(0, 3).map((ticket) => (
            <div key={ticket.id} className="flex items-start justify-between gap-2 text-sm">
              <div>
                <p className="font-medium">{ticket.issue}</p>
                <p className="text-xs text-gray-500">{ticket.tenant}</p>
              </div>
              {ticket.status === 'resolved' ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 mt-1" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-1" />
              )}
            </div>
          ))}
          {maintenance.length === 0 && <p className="text-xs text-gray-500">No active maintenance issues.</p>}
        </div>
      </div>

      <div className="mt-5 bg-white/20 border border-white/30 rounded-xl p-3 text-xs">
        <p className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Data refreshes from live tables for demo walk-throughs.</p>
      </div>
    </div>,
  );
}
