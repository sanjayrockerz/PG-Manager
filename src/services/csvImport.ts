/**
 * CSV Bulk Tenant Import Engine.
 *
 * Supports: template generation, parsing, row-level validation,
 * duplicate detection, room availability checks, and bulk onboarding.
 *
 * Each import triggers: Tenant Creation → Room Assignment →
 * Occupancy Update → Activity Log → Event Propagation.
 */

import type { Property } from '../contexts/PropertyContext';
import type { CSVImportResult, CSVTenantRow, TenantRecord } from './supabaseData';
import type { TenantCreateInput } from './supabaseData';

export const CSV_TEMPLATE_HEADERS = [
  'name',
  'phone',
  'email',
  'propertyName',
  'floor',
  'room',
  'bed',
  'monthlyRent',
  'securityDeposit',
  'rentDueDate',
  'parentName',
  'parentPhone',
  'idType',
  'idNumber',
  'joinDate',
] as const;

export const CSV_TEMPLATE_EXAMPLE: CSVTenantRow = {
  name: 'Priya Sharma',
  phone: '+919876543210',
  email: 'priya.sharma@example.com',
  propertyName: 'Sunrise Residency',
  floor: '2',
  room: '201',
  bed: '1',
  monthlyRent: '10500',
  securityDeposit: '21000',
  rentDueDate: '5',
  parentName: 'Ramesh Sharma',
  parentPhone: '+919876543200',
  idType: 'Aadhaar',
  idNumber: '123456789012',
  joinDate: new Date().toISOString().split('T')[0],
};

/** Generate a downloadable CSV template string with header + example row */
export function generateCSVTemplate(): string {
  const headers = CSV_TEMPLATE_HEADERS.join(',');
  const example = CSV_TEMPLATE_HEADERS.map((header) => {
    const value = CSV_TEMPLATE_EXAMPLE[header];
    // Wrap in quotes if value contains comma
    return String(value).includes(',') ? `"${value}"` : value;
  }).join(',');
  return `${headers}\n${example}\n`;
}

/** Download the CSV template as a file in the browser */
export function downloadCSVTemplate(): void {
  const csv = generateCSVTemplate();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tenant_import_template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

/** Parse raw CSV text into structured rows */
export function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  if (lines.length < 2) return [];

  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));

  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] ?? '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export interface RowValidationError {
  row: number;
  field: string;
  message: string;
}

/** Normalize raw parsed row into a typed CSVTenantRow */
function normalizeRow(raw: Record<string, string>): CSVTenantRow {
  return {
    name: raw['name'] ?? '',
    phone: raw['phone'] ?? '',
    email: raw['email'] ?? '',
    propertyName: raw['propertyname'] ?? raw['property_name'] ?? raw['property'] ?? '',
    floor: raw['floor'] ?? '',
    room: raw['room'] ?? '',
    bed: raw['bed'] ?? '',
    monthlyRent: raw['monthlyrent'] ?? raw['monthly_rent'] ?? raw['rent'] ?? '',
    securityDeposit: raw['securitydeposit'] ?? raw['security_deposit'] ?? raw['deposit'] ?? '',
    rentDueDate: raw['rentduedate'] ?? raw['rent_due_date'] ?? raw['due_date'] ?? '5',
    parentName: raw['parentname'] ?? raw['parent_name'] ?? raw['guardian'] ?? '',
    parentPhone: raw['parentphone'] ?? raw['parent_phone'] ?? raw['guardian_phone'] ?? '',
    idType: raw['idtype'] ?? raw['id_type'] ?? '',
    idNumber: raw['idnumber'] ?? raw['id_number'] ?? '',
    joinDate: raw['joindate'] ?? raw['join_date'] ?? new Date().toISOString().split('T')[0],
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

export function validateCSVRow(
  row: CSVTenantRow,
  rowIndex: number,
  properties: Property[],
  existingTenants: TenantRecord[],
): RowValidationError[] {
  const errors: RowValidationError[] = [];
  const rowNum = rowIndex + 2; // 1-indexed, +1 for header

  if (!row.name || row.name.length < 2 || /\d/.test(row.name)) {
    errors.push({ row: rowNum, field: 'name', message: 'Name must be at least 2 characters and cannot contain digits.' });
  }

  if (!EMAIL_REGEX.test(row.email)) {
    errors.push({ row: rowNum, field: 'email', message: 'Invalid email address.' });
  }

  const cleanPhone = row.phone.replace(/[\s\-()]/g, '');
  if (!PHONE_REGEX.test(cleanPhone)) {
    errors.push({ row: rowNum, field: 'phone', message: 'Phone must be a valid international number (e.g. +919876543210).' });
  }

  const property = properties.find((p) => p.name.toLowerCase() === row.propertyName.toLowerCase());
  if (!property) {
    errors.push({ row: rowNum, field: 'propertyName', message: `Property "${row.propertyName}" not found. Use the exact property name.` });
  } else {
    const floorNum = Number(row.floor);
    if (!Number.isFinite(floorNum) || floorNum < 0) {
      errors.push({ row: rowNum, field: 'floor', message: 'Floor must be a non-negative number.' });
    }

    if (!row.room) {
      errors.push({ row: rowNum, field: 'room', message: 'Room number is required.' });
    }

    if (!row.bed) {
      errors.push({ row: rowNum, field: 'bed', message: 'Bed number is required.' });
    }
  }

  const rent = Number(row.monthlyRent);
  if (!Number.isFinite(rent) || rent <= 0) {
    errors.push({ row: rowNum, field: 'monthlyRent', message: 'Monthly rent must be a positive number.' });
  }

  const deposit = Number(row.securityDeposit);
  if (!Number.isFinite(deposit) || deposit < 0) {
    errors.push({ row: rowNum, field: 'securityDeposit', message: 'Security deposit cannot be negative.' });
  }

  const dueDate = Number(row.rentDueDate);
  if (!Number.isFinite(dueDate) || dueDate < 1 || dueDate > 31) {
    errors.push({ row: rowNum, field: 'rentDueDate', message: 'Rent due date must be between 1 and 31.' });
  }

  if (!row.parentName || /\d/.test(row.parentName)) {
    errors.push({ row: rowNum, field: 'parentName', message: 'Parent/guardian name is required and cannot contain digits.' });
  }

  const cleanParentPhone = row.parentPhone.replace(/[\s\-()]/g, '');
  if (!PHONE_REGEX.test(cleanParentPhone)) {
    errors.push({ row: rowNum, field: 'parentPhone', message: 'Parent phone must be a valid international number.' });
  }

  if (!row.idType) {
    errors.push({ row: rowNum, field: 'idType', message: 'ID type is required.' });
  }

  if (!row.idNumber || row.idNumber.length > 64) {
    errors.push({ row: rowNum, field: 'idNumber', message: 'ID number is required (max 64 chars).' });
  }

  if (!row.joinDate || !/^\d{4}-\d{2}-\d{2}$/.test(row.joinDate)) {
    errors.push({ row: rowNum, field: 'joinDate', message: 'Join date must be in YYYY-MM-DD format.' });
  }

  // Duplicate email check
  if (EMAIL_REGEX.test(row.email)) {
    const duplicate = existingTenants.find(
      (t) => t.email.toLowerCase() === row.email.toLowerCase() && t.status !== 'archived',
    );
    if (duplicate) {
      errors.push({ row: rowNum, field: 'email', message: `Email already exists for tenant "${duplicate.name}".` });
    }
  }

  return errors;
}

export interface ParsedImportRow {
  rowIndex: number;
  raw: CSVTenantRow;
  property: Property | null;
  input: TenantCreateInput | null;
  errors: RowValidationError[];
  isValid: boolean;
}

export function prepareImportRows(
  csvText: string,
  properties: Property[],
  existingTenants: TenantRecord[],
): ParsedImportRow[] {
  const rawRows = parseCSV(csvText);

  return rawRows.map((rawRow, index) => {
    const normalized = normalizeRow(rawRow);
    const errors = validateCSVRow(normalized, index, properties, existingTenants);

    const property = properties.find(
      (p) => p.name.toLowerCase() === normalized.propertyName.toLowerCase(),
    ) ?? null;

    const input: TenantCreateInput | null = errors.length === 0 && property
      ? {
        name: normalized.name,
        phone: normalized.phone.replace(/[\s\-()]/g, ''),
        email: normalized.email.toLowerCase(),
        propertyId: property.id,
        floor: Number(normalized.floor),
        room: normalized.room,
        bed: normalized.bed,
        monthlyRent: Number(normalized.monthlyRent),
        securityDeposit: Number(normalized.securityDeposit),
        rentDueDate: Number(normalized.rentDueDate),
        parentName: normalized.parentName,
        parentPhone: normalized.parentPhone.replace(/[\s\-()]/g, ''),
        idType: normalized.idType,
        idNumber: normalized.idNumber,
        joinDate: normalized.joinDate,
        status: 'active',
        photo: null,
        idDocument: null,
      }
      : null;

    return {
      rowIndex: index,
      raw: normalized,
      property,
      input,
      errors,
      isValid: errors.length === 0 && property !== null,
    };
  });
}

/** Merge per-row import results into a CSVImportResult summary */
export function buildImportResult(
  rows: ParsedImportRow[],
  createdTenants: TenantRecord[],
  rowErrors: RowValidationError[],
): CSVImportResult {
  const allErrors = [
    ...rows.flatMap((row) => row.errors),
    ...rowErrors,
  ];

  return {
    total: rows.length,
    succeeded: createdTenants.length,
    failed: rows.length - createdTenants.length,
    errors: allErrors,
    createdTenants,
  };
}
