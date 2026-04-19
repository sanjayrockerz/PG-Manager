import { useEffect, useId, useRef, useState } from 'react';
import {
  StructuredAddressData,
  usePhotonAutocomplete,
} from '../../hooks/usePhotonAutocomplete';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (selected: StructuredAddressData) => void;
  onBlur?: () => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  onBlur,
  required = false,
  placeholder = 'Street address',
  className = 'relative',
  inputClassName = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
}: AddressAutocompleteProps) {
  const {
    predictions,
    isLoadingPredictions,
    predictionError,
    selectPrediction,
  } = usePhotonAutocomplete({
    query: value,
    enabled: true,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!wrapperRef.current) {
        return;
      }
      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, []);

  useEffect(() => {
    if (predictions.length === 0) {
      setActiveIndex(-1);
      return;
    }

    setActiveIndex((current) => {
      if (current < 0 || current >= predictions.length) {
        return 0;
      }
      return current;
    });
  }, [predictions]);

  const showDropdown = isOpen && (isLoadingPredictions || predictions.length > 0 || Boolean(predictionError));

  const handleSelect = async (placeId: string) => {
    const selected = await selectPrediction(placeId);
    if (!selected) {
      return;
    }

    onChange(selected.formattedAddress || selected.addressLine1);
    onSelect(selected);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || predictions.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % predictions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? predictions.length - 1 : current - 1));
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      const selected = predictions[activeIndex];
      await handleSelect(selected.placeId);
    }
  };

  return (
    <div ref={wrapperRef} className={className}>
      <input
        type="text"
        required={required}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={onBlur}
        onKeyDown={(event) => {
          void handleKeyDown(event);
        }}
        className={inputClassName}
        placeholder={placeholder}
        autoComplete="street-address"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listId}
        aria-autocomplete="list"
      />

      {showDropdown && (
        <div className="absolute z-20 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          {isLoadingPredictions && (
            <p className="px-4 py-3 text-sm text-gray-500">Searching addresses...</p>
          )}

          {!isLoadingPredictions && predictionError && (
            <p className="px-4 py-3 text-sm text-red-600">{predictionError}</p>
          )}

          {!isLoadingPredictions && !predictionError && predictions.length > 0 && (
            <ul id={listId} role="listbox" className="max-h-56 overflow-y-auto py-1">
              {predictions.map((prediction, index) => (
                <li key={prediction.placeId} role="option" aria-selected={activeIndex === index}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      void handleSelect(prediction.placeId);
                    }}
                    className={`w-full px-4 py-2 text-left transition-colors ${activeIndex === index ? 'bg-blue-50' : 'hover:bg-blue-50'}`}
                  >
                    <p className="text-sm text-gray-900 truncate">{prediction.primaryText}</p>
                    <p className="text-xs text-gray-500 truncate">{prediction.secondaryText || prediction.description}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
