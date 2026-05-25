import { useState } from 'react';
import { AuthLogin } from './AuthLogin';
import { AuthOTP } from './AuthOTP';
import { AuthWelcome } from './AuthWelcome';
import { RentCareSidebar } from './RentCareSidebar';
import { RentCareHeader } from './RentCareHeader';
import { RentCareDashboard } from './RentCareDashboard';
import { RentCarePayments } from './RentCarePayments';
import { RentCareMaintenance } from './RentCareMaintenance';
import { RentCareNewMaintenance } from './RentCareNewMaintenance';
import { RentCareAnnouncements } from './RentCareAnnouncements';
import { RentCareDocuments } from './RentCareDocuments';
import { RentCareProfile } from './RentCareProfile';
import { RentCareHelp } from './RentCareHelp';
import { RentCareMobileNav } from './RentCareMobileNav';

export function RentCareApp() {
  const [authStep, setAuthStep] = useState<'login' | 'otp' | 'welcome' | 'authenticated'>('login');
  const [phone, setPhone] = useState('');
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Authentication handlers
  const handleSendOTP = (phoneNumber: string) => {
    setPhone(phoneNumber);
    setAuthStep('otp');
  };

  const handleVerifyOTP = () => {
    setAuthStep('welcome');
  };

  const handleContinue = () => {
    setAuthStep('authenticated');
  };

  const handleBackToLogin = () => {
    setAuthStep('login');
    setPhone('');
  };

  // Render authentication screens
  if (authStep === 'login') {
    return <AuthLogin onSendOTP={handleSendOTP} />;
  }

  if (authStep === 'otp') {
    return <AuthOTP phone={phone} onVerify={handleVerifyOTP} onBack={handleBackToLogin} />;
  }

  if (authStep === 'welcome') {
    return <AuthWelcome onContinue={handleContinue} />;
  }

  // Render main app
  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <RentCareDashboard setActiveScreen={setActiveScreen} />;
      case 'payments':
        return <RentCarePayments />;
      case 'maintenance':
        return <RentCareMaintenance setActiveScreen={setActiveScreen} />;
      case 'new-maintenance':
        return <RentCareNewMaintenance setActiveScreen={setActiveScreen} />;
      case 'announcements':
        return <RentCareAnnouncements />;
      case 'documents':
        return <RentCareDocuments />;
      case 'profile':
        return <RentCareProfile />;
      case 'help':
        return <RentCareHelp />;
      default:
        return <RentCareDashboard setActiveScreen={setActiveScreen} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <RentCareSidebar
        activeScreen={activeScreen}
        setActiveScreen={setActiveScreen}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <RentCareHeader setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="p-4 md:p-6 lg:p-8">
            {renderScreen()}
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <RentCareMobileNav activeScreen={activeScreen} setActiveScreen={setActiveScreen} />
      </div>
    </div>
  );
}
