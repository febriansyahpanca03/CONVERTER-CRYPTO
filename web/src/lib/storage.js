/* localStorage saja — tidak ada server-side storage, sesuai arsitektur */
/* yang sudah ada (backend ini stateless, tanpa database).               */

const HISTORY_KEY = "panca-swap-history";
const HISTORY_MAX = 5;
const FAVORITES_KEY = "panca-swap-favorites";
const FAVORITES_MAX = 8;
const LAST_PAIR_KEY = "panca-swap-last-pair";
const RECENT_COINS_KEY = "panca-swap-recent-coins";
const RECENT_COINS_MAX = 6;

function safeGet(key) {
  try {
    const raw = localStorage.getItem(key);
    const val = raw ? JSON.parse(raw) : [];
    return Array.isArray(val) ? val : [];
  } catch {
    return [];
  }
}

function safeSet(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* mode privat / storage penuh — cukup hidup di state memori saja */
  }
}

export function loadHistory() {
  return safeGet(HISTORY_KEY);
}

export function saveHistory(list) {
  safeSet(HISTORY_KEY, list.slice(0, HISTORY_MAX));
}

export function loadFavorites() {
  return safeGet(FAVORITES_KEY);
}

export function saveFavorites(list) {
  safeSet(FAVORITES_KEY, list.slice(0, FAVORITES_MAX));
}

export function loadLastPair() {
  try {
    const raw = localStorage.getItem(LAST_PAIR_KEY);
    const val = raw ? JSON.parse(raw) : null;
    return val && val.from && val.to ? val : null;
  } catch {
    return null;
  }
}

export function saveLastPair(from, to) {
  try {
    localStorage.setItem(LAST_PAIR_KEY, JSON.stringify({ from, to }));
  } catch {
    /* tidak fatal — cuma kenyamanan, bukan fitur inti */
  }
}

/* Aset yang belakangan ini dipilih di coin selector (lintas kedua field) — */
/* dipakai buat munculin bagian "Baru dipakai" di atas daftar pencarian.   */
export function loadRecentCoins() {
  return safeGet(RECENT_COINS_KEY);
}

export function pushRecentCoin(sym) {
  const next = [sym, ...loadRecentCoins().filter((s) => s !== sym)].slice(0, RECENT_COINS_MAX);
  safeSet(RECENT_COINS_KEY, next);
  return next;
}

const CHART_PREFS_KEY = "panca-swap-chart-prefs";

export function loadChartPrefs() {
  try {
    const raw = localStorage.getItem(CHART_PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveChartPrefs(prefs) {
  try {
    localStorage.setItem(CHART_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* tidak fatal — cuma kenyamanan, bukan fitur inti */
  }
}

export { HISTORY_MAX, FAVORITES_MAX };
