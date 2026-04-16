// Centralized validation utilities for PG SaaS
// All validation functions return an error string (empty = valid)

// ─── Constants ────────────────────────────────────────────────────────────────

export const INDIA_PINCODE_REGEX = /^\d{6}$/;
export const INDIA_PHONE_REGEX = /^\d{10}$/; // 10 digits, no country code (stored form)
export const PHONE_WITH_PREFIX_REGEX = /^\+?\d{10,15}$/; // allows +91 prefix (tenants)
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MAX_LENGTH = 254;

// ─── Field validators ─────────────────────────────────────────────────────────

export function validateRequired(value: string, label: string): string {
  if (!value.trim()) {
    return `${label} is required.`;
  }
  return '';
}

export function validateMaxLength(value: string, maxLen: number, label: string): string {
  if (value.trim().length > maxLen) {
    return `${label} must be at most ${maxLen} characters.`;
  }
  return '';
}

export function validateMinLength(value: string, minLen: number, label: string): string {
  if (value.trim().length < minLen) {
    return `${label} must be at least ${minLen} characters.`;
  }
  return '';
}

/**
 * Validate Indian pincode: exactly 6 digits.
 */
export function validatePincode(value: string): string {
  const clean = value.trim();
  if (!clean) return 'Pincode is required.';
  if (!INDIA_PINCODE_REGEX.test(clean)) {
    return 'Pincode must be exactly 6 digits (e.g. 560001).';
  }
  return '';
}

/**
 * Validate Indian mobile number stored without country code.
 * Accepts input like "9876543210" or "+919876543210" and normalises to 10 digits.
 * Returns { error, cleaned } — use cleaned value in your form state.
 */
export function normaliseAndValidatePhone(value: string): { error: string; cleaned: string } {
  let digits = value.replace(/\D/g, '');
  // Strip leading 91 if input is +91XXXXXXXXXX
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (!digits) return { error: 'Phone number is required.', cleaned: '' };
  if (digits.length !== 10) {
    return { error: 'Phone number must be 10 digits (e.g. 9876543210).', cleaned: digits };
  }
  return { error: '', cleaned: digits };
}

/**
 * Validate phone allowing +91 prefix or plain 10-digit (for tenant forms).
 */
export function validatePhoneWithPrefix(value: string): string {
  const clean = value.trim();
  if (!clean) return 'Phone number is required.';
  if (!PHONE_WITH_PREFIX_REGEX.test(clean)) {
    return 'Enter a valid phone number (10–15 digits, optional + prefix).';
  }
  return '';
}

/**
 * Validate email. Optional = empty is allowed.
 */
export function validateEmail(value: string, optional = false): string {
  const clean = value.trim();
  if (!clean) {
    return optional ? '' : 'Email address is required.';
  }
  if (clean.length > EMAIL_MAX_LENGTH) {
    return 'Email address is too long.';
  }
  if (!EMAIL_REGEX.test(clean)) {
    return 'Enter a valid email address.';
  }
  return '';
}

/**
 * Validate a positive integer field.
 */
export function validatePositiveInt(value: number | string, label: string, min = 1, max = 9999): string {
  const n = typeof value === 'string' ? parseInt(value, 10) : value;
  if (!Number.isInteger(n) || Number.isNaN(n)) {
    return `${label} must be a whole number.`;
  }
  if (n < min) return `${label} must be at least ${min}.`;
  if (n > max) return `${label} must be at most ${max}.`;
  return '';
}

/**
 * Validate a non-negative numeric field (e.g. rent).
 */
export function validateNonNegativeNumber(value: number | string, label: string): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(n) || !Number.isFinite(n)) {
    return `${label} must be a valid number.`;
  }
  if (n < 0) return `${label} must be 0 or more.`;
  return '';
}

// ─── Property form validation ─────────────────────────────────────────────────

export interface PropertyFormData {
  name: string;
  address: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  floors: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  [key: string]: unknown;
}

export function validatePropertyForm(data: PropertyFormData): string {
  let err = '';

  err = validateRequired(data.name, 'Property name');
  if (err) return err;
  err = validateMaxLength(data.name, 200, 'Property name');
  if (err) return err;

  const addressVal = (data.addressLine1 || data.address || '').trim();
  if (!addressVal) return 'Address line 1 is required.';
  err = validateMaxLength(addressVal, 500, 'Address');
  if (err) return err;

  err = validateRequired(data.city, 'City');
  if (err) return err;
  err = validateMaxLength(data.city, 100, 'City');
  if (err) return err;

  err = validateRequired(data.state, 'State');
  if (err) return err;
  err = validateMaxLength(data.state, 100, 'State');
  if (err) return err;

  err = validatePincode(data.pincode);
  if (err) return err;

  err = validateRequired(data.contactName, 'Contact person name');
  if (err) return err;
  err = validateMinLength(data.contactName, 2, 'Contact name');
  if (err) return err;

  const { error: phoneErr } = normaliseAndValidatePhone(data.contactPhone);
  if (phoneErr) return phoneErr;

  err = validateEmail(data.contactEmail, true);
  if (err) return err;

  err = validatePositiveInt(data.floors, 'Number of floors', 1, 99);
  if (err) return err;

  return '';
}

// ─── Invite form validation ────────────────────────────────────────────────────

export interface InviteFormData {
  invitedEmail: string;
  displayRole: string;
  propertyIds: string[];
}

export function validateInviteForm(data: InviteFormData): string {
  const err = validateEmail(data.invitedEmail);
  if (err) return err;

  if (!['viewer', 'editor', 'manager'].includes(data.displayRole)) {
    return 'Please select a valid role for the invited member.';
  }

  if (!data.propertyIds.length) {
    return 'Please select at least one property to grant access to.';
  }

  return '';
}
