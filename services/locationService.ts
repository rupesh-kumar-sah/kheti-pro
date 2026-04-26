export interface LocationInfo {
  lat: number;
  lon: number;
  name: string;
  source: 'gps' | 'profile' | 'fallback';
  updatedAt: number;
}

const STORAGE_KEY = 'khetismart_location';
const FALLBACK: LocationInfo = {
  lat: 27.7172,
  lon: 85.3240,
  name: 'Kathmandu Valley',
  source: 'fallback',
  updatedAt: 0,
};

type Listener = (loc: LocationInfo) => void;
const listeners = new Set<Listener>();
let current: LocationInfo = loadStored() || FALLBACK;

function loadStored(): LocationInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.lat === 'number' &&
      typeof parsed.lon === 'number' &&
      typeof parsed.name === 'string'
    ) {
      return parsed as LocationInfo;
    }
  } catch {
    // ignore
  }
  return null;
}

function persist(loc: LocationInfo): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  } catch {
    // ignore
  }
}

function emit(): void {
  for (const l of listeners) {
    try {
      l(current);
    } catch (err) {
      console.error('location listener error', err);
    }
  }
}

export function getLocation(): LocationInfo {
  return current;
}

export function setLocation(loc: LocationInfo): void {
  current = loc;
  persist(loc);
  emit();
}

export function subscribeLocation(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) throw new Error('reverse geocode failed');
    const data = await res.json();
    const a = data.address || {};
    return (
      a.city ||
      a.town ||
      a.village ||
      a.municipality ||
      a.county ||
      a.district ||
      a.state ||
      `${lat.toFixed(3)}, ${lon.toFixed(3)}`
    );
  } catch {
    return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  }
}

export async function geocodePlace(query: string): Promise<{ lat: number; lon: number; name: string } | null> {
  if (!query.trim()) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const entry = data[0];
      return {
        lat: parseFloat(entry.lat),
        lon: parseFloat(entry.lon),
        name: entry.display_name?.split(',')[0]?.trim() || query,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export function detectLocation(options?: { highAccuracy?: boolean }): Promise<LocationInfo> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const name = await reverseGeocode(latitude, longitude);
        const loc: LocationInfo = {
          lat: latitude,
          lon: longitude,
          name,
          source: 'gps',
          updatedAt: Date.now(),
        };
        setLocation(loc);
        resolve(loc);
      },
      (err) => {
        let msg = 'Unable to retrieve location.';
        if (err.code === 1) msg = 'Location permission denied.';
        else if (err.code === 2) msg = 'Location unavailable.';
        else if (err.code === 3) msg = 'Location request timed out.';
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: options?.highAccuracy ?? true,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      }
    );
  });
}

export async function ensureLocation(profileLocation?: string): Promise<LocationInfo> {
  if (current.source !== 'fallback' && Date.now() - current.updatedAt < 60 * 60 * 1000) {
    return current;
  }
  if (profileLocation && current.source === 'fallback') {
    const geo = await geocodePlace(profileLocation);
    if (geo) {
      const loc: LocationInfo = {
        lat: geo.lat,
        lon: geo.lon,
        name: geo.name,
        source: 'profile',
        updatedAt: Date.now(),
      };
      setLocation(loc);
      return loc;
    }
  }
  return current;
}
