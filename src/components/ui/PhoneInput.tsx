import { useEffect, useRef, useState } from 'react';

interface Country {
  code: string;
  flag: string;
  dialCode: string;
  name: string;
}

const COUNTRIES: Country[] = [
  { code: 'IN', flag: '🇮🇳', dialCode: '+91', name: 'India' },
  { code: 'AE', flag: '🇦🇪', dialCode: '+971', name: 'UAE' },
  { code: 'US', flag: '🇺🇸', dialCode: '+1', name: 'USA' },
  { code: 'GB', flag: '🇬🇧', dialCode: '+44', name: 'UK' },
  { code: 'SG', flag: '🇸🇬', dialCode: '+65', name: 'Singapore' },
  { code: 'AU', flag: '🇦🇺', dialCode: '+61', name: 'Australia' },
  { code: 'CA', flag: '🇨🇦', dialCode: '+1', name: 'Canada' },
  { code: 'NZ', flag: '🇳🇿', dialCode: '+64', name: 'New Zealand' },
  { code: 'NP', flag: '🇳🇵', dialCode: '+977', name: 'Nepal' },
  { code: 'BD', flag: '🇧🇩', dialCode: '+880', name: 'Bangladesh' },
  { code: 'PK', flag: '🇵🇰', dialCode: '+92', name: 'Pakistan' },
  { code: 'LK', flag: '🇱🇰', dialCode: '+94', name: 'Sri Lanka' },
  { code: 'MY', flag: '🇲🇾', dialCode: '+60', name: 'Malaysia' },
  { code: 'DE', flag: '🇩🇪', dialCode: '+49', name: 'Germany' },
  { code: 'FR', flag: '🇫🇷', dialCode: '+33', name: 'France' },
];

const DEFAULT_COUNTRY = COUNTRIES[0]; // India

function parseValue(value: string): { country: Country; localNumber: string } {
  if (!value || !value.startsWith('+')) {
    return { country: DEFAULT_COUNTRY, localNumber: value ?? '' };
  }
  // Try to find matching country by dial code (longest match first)
  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const country of sorted) {
    if (value.startsWith(country.dialCode)) {
      return { country, localNumber: value.slice(country.dialCode.length) };
    }
  }
  return { country: DEFAULT_COUNTRY, localNumber: value.replace(/^\+\d+/, '') };
}

export interface PhoneInputProps {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  errorText?: string;
  helpText?: string;
  id?: string;
  onBlur?: () => void;
}

export function PhoneInput({
  value,
  onChange,
  label,
  required = false,
  placeholder = 'Enter phone number',
  disabled = false,
  invalid = false,
  errorText,
  helpText,
  id,
  onBlur,
}: PhoneInputProps) {
  const parsed = parseValue(value);
  const [selectedCountry, setSelectedCountry] = useState<Country>(parsed.country);
  const [localNumber, setLocalNumber] = useState(parsed.localNumber);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Sync external value changes
  useEffect(() => {
    const p = parseValue(value);
    if (p.country.code !== selectedCountry.code) {
      setSelectedCountry(p.country);
    }
    setLocalNumber(p.localNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (dropdownOpen && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [dropdownOpen]);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setDropdownOpen(false);
    setSearch('');
    onChange(country.dialCode + localNumber);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = e.target.value.replace(/[^\d\s\-()]/g, '');
    setLocalNumber(num);
    onChange(selectedCountry.dialCode + num);
  };

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dialCode.includes(search),
  );

  const hasError = invalid || Boolean(errorText);

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div
        className={`flex h-10 rounded-md border bg-white overflow-visible transition-all
          focus-within:ring-[3px] focus-within:ring-purple-500/20 focus-within:border-purple-500
          ${hasError ? 'border-red-400 focus-within:ring-red-200 focus-within:border-red-400' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        style={{ position: 'relative' }}
      >
        {/* Country selector button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => { if (!disabled) { setDropdownOpen((o) => !o); } }}
          className={`flex items-center gap-1 px-2.5 border-r bg-white flex-shrink-0 rounded-l-md
            ${hasError ? 'border-red-200' : 'border-gray-200'}
            ${disabled ? 'cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'}
          `}
          style={{ width: 88, minWidth: 88 }}
          aria-haspopup="listbox"
          aria-expanded={dropdownOpen}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>{selectedCountry.flag}</span>
          <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">{selectedCountry.dialCode}</span>
          <svg
            className={`w-3 h-3 text-gray-400 flex-shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Number input */}
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          value={localNumber}
          onChange={handleNumberChange}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="tel-national"
          className="flex-1 min-w-0 px-3 py-1 text-sm text-gray-900 bg-white rounded-r-md focus:outline-none placeholder:text-gray-400 disabled:cursor-not-allowed"
        />

        {/* Dropdown */}
        {dropdownOpen && (
          <div
            className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
            style={{ width: 280, maxHeight: 240, zIndex: 100, display: 'flex', flexDirection: 'column' }}
          >
            {/* Search */}
            <div className="px-3 py-2 border-b border-gray-100">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country or code…"
                className="w-full text-sm px-2 py-1 border border-gray-200 rounded-md focus:outline-none focus:border-indigo-400"
              />
            </div>

            {/* List */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredCountries.length === 0 ? (
                <p className="text-xs text-gray-400 px-3 py-2">No results</p>
              ) : (
                filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors
                      ${selectedCountry.code === country.code ? 'bg-indigo-50' : ''}
                    `}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{country.flag}</span>
                    <span className="text-sm text-gray-800 flex-1 truncate">{country.name}</span>
                    <span className="text-xs font-semibold text-gray-500 flex-shrink-0">{country.dialCode}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {errorText && (
        <p className="text-xs text-red-600 font-medium">{errorText}</p>
      )}
      {helpText && !errorText && (
        <p className="text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  );
}
