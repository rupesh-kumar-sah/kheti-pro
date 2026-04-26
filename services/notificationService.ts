import { NotificationPreferences } from '../types';

const SHOWN_PREFIX = 'khetismart_notif_shown_';
const PERMISSION_REQUESTED_KEY = 'khetismart_notif_permission_asked';

const FARMING_TIPS = [
  'Water crops in early morning or late evening to reduce evaporation losses.',
  'Rotate crops each season to keep soil nutrients balanced.',
  'Mulch with straw or dry leaves to retain soil moisture in dry weather.',
  'Inspect leaves regularly for early signs of pest damage or fungal infection.',
  'Apply compost before planting to improve soil structure and fertility.',
  'Use neem-based sprays as an organic pest deterrent during humid days.',
  'Stake tall vegetables like tomatoes early so roots stay undisturbed.',
  'Keep field drainage channels clear before the monsoon hits.',
  'Test soil pH every season — most vegetables prefer 6.0–7.0.',
  'Plant marigolds around vegetable beds to repel common pests.',
  'Harvest leafy greens in the morning for the best flavour and shelf life.',
  'Store seeds in airtight containers away from sunlight and moisture.',
];

export type Permission = 'granted' | 'denied' | 'default' | 'unsupported';

export function getPermission(): Permission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return window.Notification.permission as Permission;
}

export async function requestPermission(): Promise<Permission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  try {
    localStorage.setItem(PERMISSION_REQUESTED_KEY, '1');
  } catch {
    // ignore
  }
  if (window.Notification.permission === 'granted') return 'granted';
  if (window.Notification.permission === 'denied') return 'denied';
  try {
    const result = await window.Notification.requestPermission();
    return result as Permission;
  } catch {
    return 'denied';
  }
}

export function hasAskedPermission(): boolean {
  try {
    return !!localStorage.getItem(PERMISSION_REQUESTED_KEY);
  } catch {
    return false;
  }
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function alreadyShownToday(tag: string): boolean {
  try {
    return localStorage.getItem(SHOWN_PREFIX + tag) === todayKey();
  } catch {
    return false;
  }
}

function markShownToday(tag: string): void {
  try {
    localStorage.setItem(SHOWN_PREFIX + tag, todayKey());
  } catch {
    // ignore
  }
}

export interface NotifyOptions {
  title: string;
  body: string;
  tag: string;
  oncePerDay?: boolean;
  icon?: string;
}

export function notify(opts: NotifyOptions): boolean {
  if (getPermission() !== 'granted') return false;
  if (opts.oncePerDay && alreadyShownToday(opts.tag)) return false;
  try {
    new window.Notification(opts.title, {
      body: opts.body,
      tag: opts.tag,
      icon: opts.icon,
    });
    if (opts.oncePerDay) markShownToday(opts.tag);
    return true;
  } catch (err) {
    console.error('notification failed', err);
    return false;
  }
}

export function pickDailyTip(): string {
  const idx = new Date().getDate() % FARMING_TIPS.length;
  return FARMING_TIPS[idx];
}

export function maybeShowDailyTip(prefs: NotificationPreferences): void {
  if (!prefs.dailyTips) return;
  notify({
    title: 'KhetiSmart — Daily Tip',
    body: pickDailyTip(),
    tag: 'daily-tip',
    oncePerDay: true,
  });
}

export function maybeShowWeatherAlert(
  prefs: NotificationPreferences,
  alert: { title: string; message: string } | null
): void {
  if (!prefs.weatherAlerts || !alert) return;
  notify({
    title: `Weather Alert: ${alert.title}`,
    body: alert.message,
    tag: 'weather-alert',
    oncePerDay: true,
  });
}

export function maybeShowMarketUpdate(prefs: NotificationPreferences, summary: string): void {
  if (!prefs.marketPrices) return;
  notify({
    title: 'Market prices updated',
    body: summary,
    tag: 'market-update',
    oncePerDay: true,
  });
}

export function maybeShowSchemeUpdate(prefs: NotificationPreferences): void {
  if (!prefs.schemeUpdates) return;
  notify({
    title: 'Govt. Schemes',
    body: 'Check the Profile tab for active subsidies and schemes for this season.',
    tag: 'scheme-update',
    oncePerDay: true,
  });
}

export async function syncPermissionWithPreferences(prefs: NotificationPreferences): Promise<Permission> {
  const wantsAny =
    prefs.weatherAlerts || prefs.marketPrices || prefs.schemeUpdates || prefs.dailyTips;
  const perm = getPermission();
  if (!wantsAny) return perm;
  if (perm === 'granted' || perm === 'denied' || perm === 'unsupported') return perm;
  return requestPermission();
}
