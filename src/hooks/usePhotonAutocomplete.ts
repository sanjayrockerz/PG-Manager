import { useCallback, useEffect, useMemo, useState } from 'react';

const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/';
const DEBOUNCE_MS = 300;
const RESULT_LIMIT = 5;

type PhotonFeatureCollection = {
  features?: PhotonFeature[];
};

type PhotonFeature = {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: {
    osm_id?: number | string;
    osm_type?: string;
    osm_value?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    suburb?: string;
    locality?: string;
    district?: string;
    county?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

export interface StructuredAddressData {
  placeId: string;
  formattedAddress: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
}

export interface PhotonPrediction {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  description: string;
  structured: StructuredAddressData;
  score: number;
}

interface UsePhotonAutocompleteOptions {
  query: string;
  enabled?: boolean;
}

interface UsePhotonAutocompleteResult {
  predictions: PhotonPrediction[];
  isLoadingPredictions: boolean;
  predictionError: string;
  selectPrediction: (placeId: string) => Promise<StructuredAddressData | null>;
}

const normalize = (value: string | undefined): string => String(value ?? '').trim();

const includesIndia = (country: string): boolean => country.toLowerCase().includes('india');

const uniqueOrdered = (values: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const normalizedValue = normalize(value);
    if (!normalizedValue) {
      return;
    }
    const key = normalizedValue.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push(normalizedValue);
  });
  return result;
};

const buildAddressLine1 = (properties: NonNullable<PhotonFeature['properties']>): string => {
  const houseAndStreet = [normalize(properties.housenumber), normalize(properties.street)].filter(Boolean).join(' ').trim();
  if (houseAndStreet) {
    return houseAndStreet;
  }

  return normalize(properties.name)
    || normalize(properties.locality)
    || normalize(properties.suburb)
    || normalize(properties.city)
    || '';
};

const toStructuredAddress = (feature: PhotonFeature, index: number): StructuredAddressData => {
  const properties = feature.properties ?? {};
  const country = normalize(properties.country);
  const city = normalize(properties.city)
    || normalize(properties.locality)
    || normalize(properties.suburb)
    || normalize(properties.county)
    || normalize(properties.state);

  const state = normalize(properties.state);
  const pincode = normalize(properties.postcode);
  const addressLine1 = buildAddressLine1(properties);

  const fullParts = uniqueOrdered([
    addressLine1,
    normalize(properties.locality),
    normalize(properties.suburb),
    normalize(properties.city),
    normalize(properties.county),
    state,
    pincode,
    country,
  ]);

  const formattedAddress = fullParts.join(', ');
  const [longitude, latitude] = feature.geometry?.coordinates ?? [null, null];

  return {
    placeId: `${normalize(properties.osm_type) || 'feature'}-${normalize(String(properties.osm_id ?? index))}-${index}`,
    formattedAddress,
    addressLine1,
    city,
    state,
    pincode,
    latitude: typeof latitude === 'number' ? latitude : null,
    longitude: typeof longitude === 'number' ? longitude : null,
  };
};

const computeScore = (feature: PhotonFeature): number => {
  const properties = feature.properties ?? {};
  const osmValue = normalize(properties.osm_value).toLowerCase();
  const country = normalize(properties.country);

  let score = 0;

  if (includesIndia(country)) {
    score += 100;
  }

  if (normalize(properties.street) || normalize(properties.housenumber)) {
    score += 40;
  }

  if (normalize(properties.city) || normalize(properties.locality) || normalize(properties.suburb)) {
    score += 30;
  }

  if (normalize(properties.county) || normalize(properties.district)) {
    score += 10;
  }

  if (['street', 'road', 'residential', 'suburb', 'city', 'town', 'village'].some((token) => osmValue.includes(token))) {
    score += 15;
  }

  return score;
};

export function usePhotonAutocomplete({ query, enabled = true }: UsePhotonAutocompleteOptions): UsePhotonAutocompleteResult {
  const [predictions, setPredictions] = useState<PhotonPrediction[]>([]);
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false);
  const [predictionError, setPredictionError] = useState('');

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!enabled) {
      setPredictions([]);
      setIsLoadingPredictions(false);
      setPredictionError('');
      return;
    }

    if (trimmedQuery.length < 3) {
      setPredictions([]);
      setIsLoadingPredictions(false);
      setPredictionError('');
      return;
    }

    let isDisposed = false;
    const controller = new AbortController();
    setIsLoadingPredictions(true);

    const timeout = window.setTimeout(() => {
      const url = new URL(PHOTON_ENDPOINT);
      // Bias query to India while keeping free/open endpoint.
      url.searchParams.set('q', `${trimmedQuery}, India`);
      url.searchParams.set('limit', String(RESULT_LIMIT));

      fetch(url.toString(), {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error('Photon request failed');
          }
          return response.json() as Promise<PhotonFeatureCollection>;
        })
        .then((payload) => {
          if (isDisposed) {
            return;
          }

          const rawFeatures = Array.isArray(payload.features) ? payload.features : [];
          const indianFeatures = rawFeatures.filter((feature) => includesIndia(normalize(feature.properties?.country)));
          const scoped = indianFeatures.length > 0 ? indianFeatures : rawFeatures;

          const mapped = scoped
            .map((feature, index) => {
              const structured = toStructuredAddress(feature, index);
              const primaryText = structured.addressLine1 || structured.formattedAddress;
              const secondaryText = uniqueOrdered([
                structured.city,
                structured.state,
                structured.pincode,
              ]).join(', ');

              return {
                placeId: structured.placeId,
                primaryText,
                secondaryText,
                description: structured.formattedAddress,
                structured,
                score: computeScore(feature),
              } satisfies PhotonPrediction;
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, RESULT_LIMIT);

          setPredictions(mapped);
          setPredictionError('');
          setIsLoadingPredictions(false);
        })
        .catch((error) => {
          if (isDisposed || (error as { name?: string }).name === 'AbortError') {
            return;
          }

          setPredictions([]);
          setPredictionError('Address suggestions are temporarily unavailable.');
          setIsLoadingPredictions(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      isDisposed = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [enabled, trimmedQuery]);

  const selectPrediction = useCallback(async (placeId: string): Promise<StructuredAddressData | null> => {
    const selected = predictions.find((entry) => entry.placeId === placeId);
    return selected?.structured ?? null;
  }, [predictions]);

  return {
    predictions,
    isLoadingPredictions,
    predictionError,
    selectPrediction,
  };
}
