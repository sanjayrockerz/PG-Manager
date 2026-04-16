import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

export type AppLanguage = 'English' | 'Hindi' | 'Kannada';

type TranslationKey =
  | 'nav.dashboard'
  | 'nav.properties'
  | 'nav.tenants'
  | 'nav.payments'
  | 'nav.maintenance'
  | 'nav.announcements'
  | 'nav.support'
  | 'nav.subscriptions'
  | 'nav.pricing'
  | 'nav.settings'
  | 'nav.portalSections'
  | 'nav.adminPanel'
  | 'nav.tenantPortal'
  | 'mobile.home'
  | 'mobile.tenants'
  | 'mobile.properties'
  | 'mobile.payments'
  | 'mobile.support'
  | 'mobile.subscriptions'
  | 'mobile.settings'
  | 'mobile.admin'
  | 'mobile.tenant'
  | 'mobile.portal'
  | 'admin.title'
  | 'admin.subtitle'
  | 'tenant.title'
  | 'tenant.subtitle'
  | 'settings.title'
  | 'settings.subtitle';

interface LocalizationContextType {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: TranslationKey, fallback: string) => string;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

const STORAGE_KEY = 'pg-manager-language';

const translations: Record<AppLanguage, Partial<Record<TranslationKey, string>>> = {
  English: {},
  Hindi: {
    'nav.dashboard': 'डैशबोर्ड',
    'nav.properties': 'प्रॉपर्टीज',
    'nav.tenants': 'किरायेदार',
    'nav.payments': 'पेमेंट्स',
    'nav.maintenance': 'मेंटेनेंस',
    'nav.announcements': 'घोषणाएं',
    'nav.support': 'सपोर्ट',
    'nav.subscriptions': 'सब्सक्रिप्शन',
    'nav.pricing': 'प्राइसिंग',
    'nav.settings': 'सेटिंग्स',
    'nav.portalSections': 'पोर्टल सेक्शन',
    'nav.adminPanel': 'एडमिन पैनल',
    'nav.tenantPortal': 'टेनेंट पोर्टल',
    'mobile.home': 'होम',
    'mobile.tenants': 'किरायेदार',
    'mobile.properties': 'प्रॉपर्टी',
    'mobile.payments': 'पेमेंट',
    'mobile.support': 'सपोर्ट',
    'mobile.subscriptions': 'प्लान',
    'mobile.settings': 'सेटिंग्स',
    'mobile.admin': 'एडमिन',
    'mobile.tenant': 'टेनेंट',
    'mobile.portal': 'पोर्टल',
    'admin.title': 'एडमिन पैनल',
    'admin.subtitle': 'सुपाबेस से लाइव प्लेटफॉर्म मेट्रिक्स।',
    'tenant.title': 'टेनेंट पोर्टल',
    'tenant.subtitle': 'आपके रहने की जानकारी और अपडेट के लिए लाइव पोर्टल।',
    'settings.title': 'सेटिंग्स',
    'settings.subtitle': 'अपने अकाउंट की सेटिंग्स मैनेज करें',
  },
  Kannada: {
    'nav.dashboard': 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    'nav.properties': 'ಪ್ರಾಪರ್ಟಿಗಳು',
    'nav.tenants': 'ಬಾಡಿಗೆದಾರರು',
    'nav.payments': 'ಪಾವತಿಗಳು',
    'nav.maintenance': 'ನಿರ್ವಹಣೆ',
    'nav.announcements': 'ಘೋಷಣೆಗಳು',
    'nav.support': 'ಬೆಂಬಲ',
    'nav.subscriptions': 'ಚಂದಾದಾರಿಕೆ',
    'nav.pricing': 'ದರಗಳು',
    'nav.settings': 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    'nav.portalSections': 'ಪೋರ್ಟಲ್ ವಿಭಾಗಗಳು',
    'nav.adminPanel': 'ಆಡ್ಮಿನ್ ಪ್ಯಾನೆಲ್',
    'nav.tenantPortal': 'ಟೆನಂಟ್ ಪೋರ್ಟಲ್',
    'mobile.home': 'ಹೋಮ್',
    'mobile.tenants': 'ಟೆನಂಟ್‌ಗಳು',
    'mobile.properties': 'ಪ್ರಾಪರ್ಟಿ',
    'mobile.payments': 'ಪಾವತಿ',
    'mobile.support': 'ಬೆಂಬಲ',
    'mobile.subscriptions': 'ಪ್ಲಾನ್',
    'mobile.settings': 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    'mobile.admin': 'ಆಡ್ಮಿನ್',
    'mobile.tenant': 'ಟೆನಂಟ್',
    'mobile.portal': 'ಪೋರ್ಟಲ್',
    'admin.title': 'ಆಡ್ಮಿನ್ ಪ್ಯಾನೆಲ್',
    'admin.subtitle': 'ಸೂಪಾಬೇಸ್‌ನಿಂದ ಲೈವ್ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ ಮೆಟ್ರಿಕ್ಸ್.',
    'tenant.title': 'ಟೆನಂಟ್ ಪೋರ್ಟಲ್',
    'tenant.subtitle': 'ನಿಮ್ಮ ವಾಸ್ತವ್ಯದ ವಿವರಗಳಿಗೆ ಲೈವ್ ಪೋರ್ಟಲ್.',
    'settings.title': 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    'settings.subtitle': 'ನಿಮ್ಮ ಖಾತೆ ಸೆಟ್ಟಿಂಗ್‌ಗಳನ್ನು ನಿರ್ವಹಿಸಿ',
  },
};

function getInitialLanguage(): AppLanguage {
  if (typeof window === 'undefined') {
    return 'English';
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'English' || stored === 'Hindi' || stored === 'Kannada') {
    return stored;
  }

  return 'English';
}

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(getInitialLanguage);

  const setLanguage = (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
      window.dispatchEvent(new CustomEvent('owner-data-updated'));
    }
  };

  const t = (key: TranslationKey, fallback: string): string => {
    const value = translations[language]?.[key];
    return value ?? fallback;
  };

  const value = useMemo(() => ({ language, setLanguage, t }), [language]);

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within LocalizationProvider');
  }
  return context;
}
