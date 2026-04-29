import { UserProfile } from '../types';

const TOKEN_KEY = 'khetismart_token';
const PHONE_KEY = 'khetismart_phone';

export interface AuthResponse {
  token: string;
  phone: string;
  profile: UserProfile;
}

function getApiBase(): string {
  return '';
}

async function handle<T>(res: Response): Promise<T> {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // ignore
  }
  if (!res.ok) {
    const msg = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredPhone(): string | null {
  try {
    return localStorage.getItem(PHONE_KEY);
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(PHONE_KEY);
  } catch {
    // ignore
  }
}

function storeSession(token: string, phone: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(PHONE_KEY, phone);
  } catch {
    // ignore
  }
}

export async function signup(input: {
  phone: string;
  password: string;
  name: string;
  location?: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${getApiBase()}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await handle<AuthResponse>(res);
  storeSession(data.token, data.phone);
  return data;
}

export async function login(input: { phone: string; password: string }): Promise<AuthResponse> {
  const res = await fetch(`${getApiBase()}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await handle<AuthResponse>(res);
  storeSession(data.token, data.phone);
  return data;
}

export async function fetchMe(): Promise<{ phone: string; profile: UserProfile } | null> {
  const token = getStoredToken();
  if (!token) return null;
  const res = await fetch(`${getApiBase()}/api/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    clearSession();
    return null;
  }
  return handle<{ phone: string; profile: UserProfile }>(res);
}

export async function saveProfile(profile: UserProfile): Promise<UserProfile> {
  const token = getStoredToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${getApiBase()}/api/me/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ profile }),
  });
  const data = await handle<{ profile: UserProfile }>(res);
  return data.profile;
}
