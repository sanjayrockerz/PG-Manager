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
      className={`h-11 flex rounded-md border overflow-hidden transition-all
        focus-within:ring-[3px] focus-within:ring-purple-500/20 focus-within:border-purple-500
        ${invalid ? 'border-red-400 focus-within:ring-red-200 focus-within:border-red-400' : 'border-gray-300'}`}
      inputClassName="!flex-1 !h-full !border-0 !bg-transparent !px-3 !py-1 !text-sm !text-gray-900 focus:!outline-none placeholder:!text-gray-400"
      countrySelectorStyleProps={{
        buttonClassName: `!h-full !px-2.5 !border-0 !border-r !border-gray-200 !bg-gray-50 !rounded-none ${invalid ? '!bg-red-50' : ''}`,
        buttonContentWrapperClassName: '!gap-1.5',
        flagClassName: '!w-4 !h-4',
        dropdownStyleProps: {
          className: '!z-[80] !mt-1 !rounded-xl !border !border-gray-200 !shadow-xl',
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
