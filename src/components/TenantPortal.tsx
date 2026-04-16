import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  Home,
  Mail,
  MapPin,
  Phone,
  Plus,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  MaintenancePriority,
  TenantPortalSnapshot,
  supabaseTenantDataApi,
} from '../services/supabaseData';
import { useRealtimeRefresh } from '../hooks/useRealtimeRefresh';
import { LiveStatusBadge } from './LiveStatusBadge';
import { useLocalization } from '../contexts/LocalizationContext';

type TenantView =
  | 'dashboard'
  | 'profile'
  | 'payments'
  | 'maintenance'
  | 'maintenance-new'
  | 'announcements';

const priorityOptions: MaintenancePriority[] = ['low', 'medium', 'high'];

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
    year: 'numeric',
  });
}

function formatAmount(value: number): string {
  return `Rs ${value.toLocaleString('en-IN')}`;
}

export function TenantPortal() {
  const { t } = useLocalization();
  const [currentView, setCurrentView] = useState<TenantView>('dashboard');
  const [snapshot, setSnapshot] = useState<TenantPortalSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState<{
    issue: string;
    description: string;
    priority: MaintenancePriority;
  }>({
    issue: '',
    description: '',
    priority: 'medium',
  });

  const loadSnapshot = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await supabaseTenantDataApi.getPortalSnapshot();
      setSnapshot(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load tenant portal data.');
      setSnapshot(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const { lastUpdatedAt, isSyncing } = useRealtimeRefresh({
    key: 'tenant-portal',
    tables: ['tenants', 'payments', 'maintenance_tickets', 'maintenance_notes', 'announcements', 'notifications', 'rooms', 'properties'],
    onChange: loadSnapshot,
  });

  const pendingPayments = useMemo(
    () => (snapshot?.payments ?? []).filter((payment) => payment.status !== 'paid'),
    [snapshot],
  );
  const activeMaintenance = useMemo(
    () => (snapshot?.maintenance ?? []).filter((ticket) => ticket.status !== 'resolved'),
    [snapshot],
  );
  const pinnedAnnouncements = useMemo(
    () => (snapshot?.announcements ?? []).filter((announcement) => announcement.isPinned),
    [snapshot],
  );

  const submitMaintenanceTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ticketForm.issue.trim() || !ticketForm.description.trim()) {
      return;
    }

    setIsSubmittingTicket(true);
    try {
      await supabaseTenantDataApi.createMaintenanceTicket({
        issue: ticketForm.issue.trim(),
        description: ticketForm.description.trim(),
        priority: ticketForm.priority,
      });

      setTicketForm({
        issue: '',
        description: '',
        priority: 'medium',
      });
      setCurrentView('maintenance');
      await loadSnapshot();
      toast.success('Maintenance request submitted');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create maintenance request.');
      toast.error('Failed to create request');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading tenant portal...</p>
        </div>
      </div>
    );
  }

  if (errorMessage && !snapshot) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-6">
        <p className="text-red-700 text-sm">{errorMessage}</p>
        <button
          onClick={() => void loadSnapshot()}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!snapshot) {
    return null;
  }

  const nextPendingPayment = pendingPayments[0] ?? null;

  const renderDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">{t('tenant.title', `Welcome, ${snapshot.profile.name.split(' ')[0]}`)}</h1>
        <p className="text-gray-600 mt-1">{t('tenant.subtitle', 'Live tenant portal for your stay details and updates.')}</p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-600 text-sm">Your Room</p>
              <p className="text-gray-900 text-xl font-semibold">{snapshot.tenant.room}</p>
              <p className="text-gray-600 text-sm mt-1">Bed {snapshot.tenant.bed} • Floor {snapshot.tenant.floor}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-gray-600 text-sm">Monthly Rent</p>
            <p className="text-gray-900 text-xl font-semibold">{formatAmount(snapshot.tenant.rent)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setCurrentView('payments')}
          className="bg-white rounded-xl p-5 border border-gray-200 hover:border-green-300 text-left"
        >
          <CreditCard className="w-6 h-6 text-green-600 mb-3" />
          <p className="text-gray-900 font-semibold">Payments</p>
          <p className="text-sm text-gray-600 mt-1">{pendingPayments.length} pending</p>
        </button>

        <button
          onClick={() => setCurrentView('maintenance')}
          className="bg-white rounded-xl p-5 border border-gray-200 hover:border-orange-300 text-left"
        >
          <Wrench className="w-6 h-6 text-orange-600 mb-3" />
          <p className="text-gray-900 font-semibold">Maintenance</p>
          <p className="text-sm text-gray-600 mt-1">{activeMaintenance.length} active requests</p>
        </button>

        <button
          onClick={() => setCurrentView('announcements')}
          className="bg-white rounded-xl p-5 border border-gray-200 hover:border-blue-300 text-left"
        >
          <Bell className="w-6 h-6 text-blue-600 mb-3" />
          <p className="text-gray-900 font-semibold">Announcements</p>
          <p className="text-sm text-gray-600 mt-1">{pinnedAnnouncements.length} pinned updates</p>
        </button>
      </div>

      {nextPendingPayment && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-yellow-700 mt-0.5" />
            <div className="flex-1">
              <p className="text-gray-900 font-semibold">Upcoming rent payment</p>
              <p className="text-sm text-gray-600 mt-1">
                Due on {formatDate(nextPendingPayment.dueDate)} • Amount {formatAmount(nextPendingPayment.totalAmount)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-gray-900">Recent Announcements</h2>
          <button
            onClick={() => setCurrentView('announcements')}
            className="text-blue-600 text-sm font-medium hover:text-blue-700"
          >
            View All
          </button>
        </div>
        <div className="p-6 space-y-4">
          {(snapshot.announcements.length === 0 ? [] : snapshot.announcements.slice(0, 3)).map((announcement) => (
            <div key={announcement.id} className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-2 ${announcement.isPinned ? 'bg-red-500' : 'bg-blue-500'}`} />
              <div>
                <p className="text-gray-900 font-semibold text-sm">{announcement.title}</p>
                <p className="text-gray-600 text-sm mt-1">{announcement.content}</p>
                <p className="text-gray-400 text-xs mt-2">{formatDate(announcement.date)}</p>
              </div>
            </div>
          ))}
          {snapshot.announcements.length === 0 && (
            <p className="text-sm text-gray-500">No announcements published yet.</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">Your tenancy and contact information.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Phone className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-xs text-gray-600">Phone</p>
            <p className="text-gray-900">{snapshot.profile.phone || '-'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-xs text-gray-600">Email</p>
            <p className="text-gray-900">{snapshot.profile.email || '-'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-purple-600" />
          <div>
            <p className="text-xs text-gray-600">Property</p>
            <p className="text-gray-900">{snapshot.property?.name || '-'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-orange-600" />
          <div>
            <p className="text-xs text-gray-600">Address</p>
            <p className="text-gray-900">{snapshot.property?.address || '-'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-gray-900 mb-4">Tenancy Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Monthly Rent</p>
            <p className="text-gray-900 font-semibold">{formatAmount(snapshot.tenant.rent)}</p>
          </div>
          <div>
            <p className="text-gray-500">Security Deposit</p>
            <p className="text-gray-900 font-semibold">{formatAmount(snapshot.tenant.securityDeposit)}</p>
          </div>
          <div>
            <p className="text-gray-500">Joined On</p>
            <p className="text-gray-900 font-semibold">{formatDate(snapshot.tenant.joinDate)}</p>
          </div>
          <div>
            <p className="text-gray-500">Owner Contact</p>
            <p className="text-gray-900 font-semibold">{snapshot.owner?.phone || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPayments = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Payments</h1>
        <p className="text-gray-600 mt-1">Track rent status and payment history.</p>
      </div>

      <div className="space-y-3">
        {snapshot.payments.map((payment) => (
          <div key={payment.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-gray-900 font-semibold">Due {formatDate(payment.dueDate)}</p>
                <p className="text-sm text-gray-600 mt-1">Room {payment.room}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  payment.status === 'paid'
                    ? 'bg-green-100 text-green-700'
                    : payment.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                }`}
              >
                {payment.status}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-gray-900 text-lg font-semibold">{formatAmount(payment.totalAmount)}</p>
              <p className="text-xs text-gray-500">
                {payment.paidDate ? `Paid ${formatDate(payment.paidDate)}` : 'Not paid yet'}
              </p>
            </div>
          </div>
        ))}
        {snapshot.payments.length === 0 && (
          <p className="text-sm text-gray-500">No payment records available yet.</p>
        )}
      </div>
    </div>
  );

  const renderMaintenance = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Maintenance</h1>
          <p className="text-gray-600 mt-1">Raise requests and track progress.</p>
        </div>
        <button
          onClick={() => setCurrentView('maintenance-new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      <div className="space-y-3">
        {snapshot.maintenance.map((ticket) => (
          <div key={ticket.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-gray-900 font-semibold">{ticket.issue}</p>
                <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
              </div>
              <div className="text-right">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    ticket.status === 'resolved'
                      ? 'bg-green-100 text-green-700'
                      : ticket.status === 'in-progress'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {ticket.status}
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>Priority: {ticket.priority}</span>
              <span>{formatDate(ticket.date)}</span>
            </div>
          </div>
        ))}
        {snapshot.maintenance.length === 0 && (
          <p className="text-sm text-gray-500">No maintenance requests raised yet.</p>
        )}
      </div>
    </div>
  );

  const renderNewMaintenanceForm = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">New Maintenance Request</h1>
        <p className="text-gray-600 mt-1">Describe your issue clearly for faster support.</p>
      </div>

      <form onSubmit={submitMaintenanceTicket} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-2">Issue title</label>
          <input
            value={ticketForm.issue}
            onChange={(event) => setTicketForm((current) => ({ ...current, issue: event.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Example: AC not cooling"
            maxLength={120}
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Description</label>
          <textarea
            value={ticketForm.description}
            onChange={(event) => setTicketForm((current) => ({ ...current, description: event.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 h-28 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add details about the issue"
            maxLength={800}
            required
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700 mb-2">Priority</label>
          <select
            value={ticketForm.priority}
            onChange={(event) =>
              setTicketForm((current) => ({
                ...current,
                priority: event.target.value as MaintenancePriority,
              }))
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {priorityOptions.map((priority) => (
              <option key={priority} value={priority}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => setCurrentView('maintenance')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmittingTicket}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmittingTicket ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderAnnouncements = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Announcements</h1>
        <p className="text-gray-600 mt-1">Latest property notices from management.</p>
      </div>

      <div className="space-y-3">
        {snapshot.announcements.map((announcement) => (
          <div key={announcement.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-gray-900 font-semibold">{announcement.title}</p>
                <p className="text-sm text-gray-600 mt-1">{announcement.content}</p>
              </div>
              {announcement.isPinned && (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Pinned</span>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(announcement.date)}</span>
            </div>
          </div>
        ))}
        {snapshot.announcements.length === 0 && (
          <p className="text-sm text-gray-500">No announcements posted yet.</p>
        )}
      </div>
    </div>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return renderDashboard();
      case 'profile':
        return renderProfile();
      case 'payments':
        return renderPayments();
      case 'maintenance':
        return renderMaintenance();
      case 'maintenance-new':
        return renderNewMaintenanceForm();
      case 'announcements':
        return renderAnnouncements();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{errorMessage}</div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCurrentView('dashboard')}
          className={`px-3 py-2 rounded-lg text-sm ${
            currentView === 'dashboard' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setCurrentView('profile')}
          className={`px-3 py-2 rounded-lg text-sm ${
            currentView === 'profile' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700'
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setCurrentView('payments')}
          className={`px-3 py-2 rounded-lg text-sm ${
            currentView === 'payments' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700'
          }`}
        >
          Payments
        </button>
        <button
          onClick={() => setCurrentView('maintenance')}
          className={`px-3 py-2 rounded-lg text-sm ${
            currentView === 'maintenance' || currentView === 'maintenance-new'
              ? 'bg-gray-900 text-white'
              : 'bg-white border border-gray-200 text-gray-700'
          }`}
        >
          Maintenance
        </button>
        <button
          onClick={() => setCurrentView('announcements')}
          className={`px-3 py-2 rounded-lg text-sm ${
            currentView === 'announcements' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700'
          }`}
        >
          Announcements
        </button>
      </div>

      <LiveStatusBadge lastUpdatedAt={lastUpdatedAt} isSyncing={isSyncing} label="Tenant portal live" />

      {renderCurrentView()}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
        <div>
          <p className="text-sm text-blue-900 font-semibold">Live tenant experience</p>
          <p className="text-xs text-blue-700 mt-1">
            All data in this portal comes from your authenticated Supabase tenant account.
          </p>
        </div>
      </div>
    </div>
  );
}
