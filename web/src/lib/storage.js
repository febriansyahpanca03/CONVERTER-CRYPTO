/* localStorage saja — tidak ada server-side storage, sesuai arsitektur */
/* yang sudah ada (backend ini stateless, tanpa database).               */

const HISTORY_KEY = "panca-swap-history";
const HISTORY_MAX = 5;
const FAVORITES_KEY = "panca-swap-favorites";
const FAVORITES_MAX = 8;
const LAST_PAIR_KEY = "panca-swap-last-pair";

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

export { HISTORY_MAX, FAVORITES_MAX };
