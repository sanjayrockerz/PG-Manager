import { PhoneInput } from 'react-international-phone';

interface InternationalPhoneFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  placeholder?: string;
  invalid?: boolean;
}

const normalizeInternationalPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  return digits ? `+${digits}` : '';
};

export function InternationalPhoneField({
  value,
  onChange,
  onBlur,
  required = false,
  placeholder = 'Enter phone number',
  invalid = false,
}: InternationalPhoneFieldProps) {
  return (
    <PhoneInput
      defaultCountry="in"
      preferredCountries={['in', 'us', 'gb', 'ae']}
      value={value}
      onChange={(phone) => onChange(normalizeInternationalPhone(phone))}
      onBlur={onBlur}
      className={`w-full rounded-2xl border transition-shadow ${invalid ? 'border-red-300 focus-within:ring-2 focus-within:ring-red-200' : 'border-gray-300 focus-within:ring-2 focus-within:ring-blue-200'}`}
      inputClassName="!w-full !h-14 !border-0 !rounded-r-2xl !bg-white !px-3 !text-sm focus:!outline-none"
      countrySelectorStyleProps={{
        buttonClassName: `!h-14 !px-3 !rounded-l-2xl !border-0 !bg-gray-50 ${invalid ? '!bg-red-50' : ''}`,
        buttonContentWrapperClassName: '!gap-2',
        flagClassName: '!w-5 !h-5 !rounded-full',
        dropdownStyleProps: {
          className: '!z-[80] !mt-2 !rounded-2xl !border !border-gray-200 !shadow-xl',
          listItemClassName: '!py-2',
          listItemDialCodeClassName: '!font-semibold !text-gray-700',
        },
      }}
      inputProps={{
        required,
        autoComplete: 'tel-national',
        placeholder,
      }}
    />
  );
}
