/**
 * frontend/lib/delivery-prefs.ts
 *
 * There's no auth or per-account storage yet (see project notes on
 * Phase 2: Postgres + auth, for when this becomes a real paid
 * product with separate customer accounts). Until then, delivery
 * defaults are remembered per-browser so a person doesn't have to
 * retype their email/Telegram chat ID on every run.
 */

const STORAGE_KEY = "fibrion:deliveryPrefs";

export type DeliveryPrefs = {
  emailEnabled: boolean;
  email: string;
  telegramEnabled: boolean;
  telegramChatId: string;
};

const DEFAULTS: DeliveryPrefs = {
  emailEnabled: false,
  email: "",
  telegramEnabled: false,
  telegramChatId: "",
};

export function getDeliveryPrefs(): DeliveryPrefs {
  if (typeof window === "undefined") return DEFAULTS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;

    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveDeliveryPrefs(prefs: DeliveryPrefs) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}