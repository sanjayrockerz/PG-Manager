import { parsePhoneNumberFromString } from 'libphonenumber-js';

export type PhoneCountry = {
  country: string;
  flag: string;
  code: string;
  localDigits: number;
  placeholder: string;
  localPattern: RegExp;
};

export const SUPPORTED_PHONE_COUNTRIES: readonly PhoneCountry[] = [
  {
    country: 'India',
    flag: '🇮🇳',
    code: '+91',
    localDigits: 10,
    placeholder: '9876543210',
    localPattern: /^[6-9]\d{9}$/,
  },
  {
    country: 'UAE',
    flag: '🇦🇪',
    code: '+971',
    localDigits: 9,
    placeholder: '501234567',
    localPattern: /^5[024568]\d{7}$/,
  },
  {
    country: 'USA',
    flag: '🇺🇸',
    code: '+1',
    localDigits: 10,
    placeholder: '2015550123',
    localPattern: /^[2-9]\d{2}[2-9]\d{6}$/,
  },
  {
    country: 'UK',
    flag: '🇬🇧',
    code: '+44',
    localDigits: 10,
    placeholder: '7400123456',
    localPattern: /^7\d{9}$/,
  },
] as const;

export const DEFAULT_COUNTRY_CODE = '+91';

const LEGACY_PHONE_PATTERN = /^\d{10}$/;

const ASCENDING_SEQUENCE = '01234567890';
const DESCENDING_SEQUENCE = '09876543210';

export const getPhoneCountry = (countryCode: string): PhoneCountry => (
  SUPPORTED_PHONE_COUNTRIES.find((entry) => entry.code === countryCode) ?? SUPPORTED_PHONE_COUNTRIES[0]
);

export const getPhoneDropdownLabel = (entry: PhoneCountry): string => `${entry.flag} ${entry.country} (${entry.code})`;

export const sanitizePhoneLocal = (value: string, countryCode: string): string => {
  const country = getPhoneCountry(countryCode);
  return value.replace(/\D/g, '').slice(0, country.localDigits);
};

export const formatStoredPhone = (countryCode: string, localNumber: string): string => {
  const cleaned = localNumber.replace(/\D/g, '');
  if (!cleaned) {
    return '';
  }
  return `${countryCode}${cleaned}`;
};

export const parseStoredPhone = (value: string): { countryCode: string; localNumber: string } => {
  const trimmed = String(value ?? '').trim();

  if (!trimmed) {
    return {
      countryCode: DEFAULT_COUNTRY_CODE,
      localNumber: '',
    };
  }

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) {
    return {
      countryCode: DEFAULT_COUNTRY_CODE,
      localNumber: '',
    };
  }

  // Backward compatibility for legacy local-only 10-digit values.
  if (LEGACY_PHONE_PATTERN.test(trimmed)) {
    return {
      countryCode: DEFAULT_COUNTRY_CODE,
      localNumber: digits,
    };
  }

  const normalized = `+${digits}`;

  // First prefer known app-supported country codes for deterministic extraction.
  const supportedByLength = [...SUPPORTED_PHONE_COUNTRIES].sort((a, b) => b.code.length - a.code.length);
  const supportedMatch = supportedByLength.find((entry) => normalized.startsWith(entry.code));
  if (supportedMatch) {
    return {
      countryCode: supportedMatch.code,
      localNumber: normalized.slice(supportedMatch.code.length),
    };
  }

  // Fallback to libphonenumber parsing for unknown international codes.
  const parsed = parsePhoneNumberFromString(normalized);
  if (parsed) {
    const parsedCountryCode = `+${parsed.countryCallingCode}`;
    return {
      countryCode: parsedCountryCode,
      localNumber: parsed.nationalNumber,
    };
  }

  const fallbackCountry = getPhoneCountry(DEFAULT_COUNTRY_CODE);
  const localNumber = digits.length > fallbackCountry.localDigits
    ? digits.slice(-fallbackCountry.localDigits)
    : digits;

  return {
    countryCode: DEFAULT_COUNTRY_CODE,
    localNumber,
  };
};

export const isClearlyFakePhone = (localNumber: string): boolean => {
  const digits = localNumber.replace(/\D/g, '');
  if (!digits) {
    return true;
  }

  if (/^(\d)\1+$/.test(digits)) {
    return true;
  }

  if (ASCENDING_SEQUENCE.includes(digits) || DESCENDING_SEQUENCE.includes(digits)) {
    return true;
  }

  return false;
};

const normalizeStoredPhoneValue = (value: string): string => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return '';
  }

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  if (trimmed.startsWith('+')) {
    return `+${digits}`;
  }

  if (LEGACY_PHONE_PATTERN.test(trimmed)) {
    return `${DEFAULT_COUNTRY_CODE}${digits}`;
  }

  return `+${digits}`;
};

export const validatePhoneForCountry = (countryCode: string, localNumber: string): { valid: boolean; error?: string } => {
  const country = getPhoneCountry(countryCode);
  const digits = localNumber.replace(/\D/g, '');

  if (!digits) {
    return { valid: false, error: 'Phone number is required.' };
  }

  if (digits.length !== country.localDigits) {
    return { valid: false, error: `${country.country} phone number must be exactly ${country.localDigits} digits.` };
  }

  if (isClearlyFakePhone(digits)) {
    return { valid: false, error: `${country.country} phone number looks invalid. Please enter a real mobile number.` };
  }

  const parsed = parsePhoneNumberFromString(`${countryCode}${digits}`);
  if (!parsed || !parsed.isValid()) {
    return { valid: false, error: `${country.country} mobile format is invalid.` };
  }

  const type = parsed.getType();
  if (type && type !== 'MOBILE' && type !== 'FIXED_LINE_OR_MOBILE') {
    return { valid: false, error: `${country.country} number must be a mobile number.` };
  }

  return { valid: true };
};

export const isValidStoredPhoneNumber = (value: string): boolean => {
  const normalized = normalizeStoredPhoneValue(value);
  if (!normalized) {
    return false;
  }

  const parsed = parsePhoneNumberFromString(normalized);
  if (!parsed || !parsed.isValid()) {
    return false;
  }

  const nationalNumber = parsed.nationalNumber;
  if (isClearlyFakePhone(nationalNumber)) {
    return false;
  }

  const type = parsed.getType();
  if (type && type !== 'MOBILE' && type !== 'FIXED_LINE_OR_MOBILE') {
    return false;
  }

  return true;
};
