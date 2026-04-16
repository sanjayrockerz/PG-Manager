// Improved Nominatim-based address lookup service for India
// Follows OSM Usage Policy: https://operations.osmfoundation.org/policies/nominatim/

export interface AddressSuggestion {
  id: string;
  label: string;
  addressLine1: string;
  addressLine2: string;
  locality: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    quarter?: string;
    city_block?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    district?: string;
    state_district?: string;
    state?: string;
    postcode?: string;
    country?: string;
    // India-specific
    locality?: string;
    hamlet?: string;
    isolated_dwelling?: string;
    // Landmark / amenity
    amenity?: string;
    building?: string;
    tourism?: string;
    historic?: string;
    leisure?: string;
    natural?: string;
  };
  namedetails?: {
    name?: string;
    'name:en'?: string;
  };
}

// OSM Nominatim usage policy requires a User-Agent
const USER_AGENT = 'PGManager/1.0 (pg-manager-app; contact@pgmanager.app)';

// India bounding box:  lat 6.5–35.7, lon 68.1–97.4
const INDIA_VIEWBOX = '68.1,6.5,97.4,35.7';

function toTitleCase(input: string): string {
  if (!input) return '';
  return input
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function pickCity(addr: NonNullable<NominatimResult['address']>): string {
  return (
    addr.city ||
    addr.town ||
    addr.village ||
    addr.district ||
    addr.county ||
    addr.state_district ||
    ''
  );
}

function pickLocality(addr: NonNullable<NominatimResult['address']>, city: string): string {
  return (
    addr.suburb ||
    addr.neighbourhood ||
    addr.quarter ||
    addr.locality ||
    addr.hamlet ||
    city ||
    ''
  );
}

function pickLandmark(addr: NonNullable<NominatimResult['address']>, namedetails?: NominatimResult['namedetails']): string {
  return (
    addr.amenity ||
    addr.building ||
    addr.tourism ||
    addr.historic ||
    namedetails?.name ||
    ''
  );
}

function buildAddressLine1(addr: NonNullable<NominatimResult['address']>): string {
  const parts: string[] = [];
  if (addr.house_number) parts.push(addr.house_number);
  if (addr.road) parts.push(addr.road);
  if (!parts.length) {
    // Fallback: try amenity / building name
    const fallback = addr.amenity || addr.building || addr.tourism || addr.historic || '';
    if (fallback) parts.push(fallback);
  }
  return parts.join(', ');
}

function mapResult(entry: NominatimResult): AddressSuggestion {
  const addr = entry.address ?? {};
  const city = toTitleCase(pickCity(addr));
  const locality = toTitleCase(pickLocality(addr, city));
  const addressLine1 = toTitleCase(buildAddressLine1(addr)) || city || toTitleCase(entry.display_name.split(',')[0]);
  const addressLine2 = toTitleCase(addr.suburb || addr.neighbourhood || addr.quarter || '');
  const landmark = toTitleCase(pickLandmark(addr, entry.namedetails));

  return {
    id: String(entry.place_id),
    label: entry.display_name,
    addressLine1,
    addressLine2,
    locality,
    landmark,
    city,
    state: toTitleCase(addr.state || addr.state_district || ''),
    pincode: addr.postcode || '',
    country: addr.country || 'India',
    latitude: Number(entry.lat),
    longitude: Number(entry.lon),
    formattedAddress: entry.display_name,
  };
}

/**
 * Search for address suggestions using Nominatim.
 * India-biased, handles: pincodes, city names, landmarks, full addresses.
 */
export async function searchAddressSuggestions(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  // If the query looks like a pincode, use a targeted postalcode search
  const isPincode = /^\d{5,6}$/.test(trimmed);

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('namedetails', '1');
  url.searchParams.set('limit', '8');
  url.searchParams.set('countrycodes', 'in');
  url.searchParams.set('viewbox', INDIA_VIEWBOX);
  url.searchParams.set('bounded', '0'); // allow results outside viewbox if nothing found inside

  if (isPincode) {
    url.searchParams.set('postalcode', trimmed);
    url.searchParams.set('country', 'India');
  } else {
    url.searchParams.set('q', trimmed);
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
        // Nominatim also accepts Referer as an alternative to User-Agent in browser context
        'Referer': typeof window !== 'undefined' ? window.location.origin : 'https://pgmanager.app',
      },
    });
  } catch (err) {
    // Network / abort errors — return empty, don't crash
    if ((err as { name?: string }).name === 'AbortError') throw err;
    console.warn('[addressLookup] Fetch error:', err);
    return [];
  }

  if (!response.ok) {
    console.warn('[addressLookup] Nominatim returned', response.status);
    return [];
  }

  const data = (await response.json()) as NominatimResult[];

  const results = data.map(mapResult);

  // De-duplicate by city+state+pincode (Nominatim can return near-duplicates)
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = `${r.city}|${r.state}|${r.pincode}|${r.addressLine1}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Reverse geocode coordinates → AddressSuggestion.
 * Useful after the user drops a pin on a map.
 */
export async function reverseGeocode(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<AddressSuggestion | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('namedetails', '1');
  url.searchParams.set('zoom', '18');

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
        'Referer': typeof window !== 'undefined' ? window.location.origin : 'https://pgmanager.app',
      },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as NominatimResult;
    if (!data?.place_id) return null;

    return mapResult(data);
  } catch {
    return null;
  }
}
