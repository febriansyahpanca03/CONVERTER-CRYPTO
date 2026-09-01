import { isFiat } from "../data/assets.js";

/* Angka mentah, presisi dinamis: fiat 0-2 desimal, kripto 2-8 tergantung */
/* besarannya supaya tidak menampilkan nol berlebihan.                    */
export function formatAmount(n, sym) {
  if (!Number.isFinite(n)) return "–";
  if (isFiat(sym)) {
    const digits = n >= 100 ? 0 : 2;
    return n.toLocaleString("id-ID", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }
  let digits = 8;
  if (n >= 1000) digits = 2;
  else if (n >= 1) digits = 4;
  else if (n >= 0.01) digits = 6;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  });
}

/* Sama seperti formatAmount, tapi menambahkan awalan mata uang (Rp/$)   */
/* khusus untuk fiat yang punya konvensi penulisan lokal.                */
const PREFIX = { idr: "Rp", usd: "$" };
export function displayAmount(n, sym) {
  const prefix = PREFIX[sym] || "";
  return `${prefix}${formatAmount(n, sym)}`;
}

/* "8 detik lalu" / "3 menit lalu" / "2 jam lalu" — dihitung dari epoch ms */
export function relativeTime(ts, now = Date.now()) {
  if (!ts) return "–";
  const diffSec = Math.max(0, Math.round((now - ts) / 1000));
  if (diffSec < 5) return "baru saja";
  if (diffSec < 60) return `${diffSec} detik lalu`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.round(diffHour / 24);
  return `${diffDay} hari lalu`;
}

/* Jam lokal Indonesia (WIB/WITA/WIT mengikuti timezone browser). */
export function formatClock(ts) {
  return new Date(ts).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* Status kesegaran data harga, murni dari timestamp asli CoinGecko —   */
/* tidak pernah dikarang.                                               */
export function priceStatus(updatedAt, now = Date.now()) {
  if (!updatedAt) return "unknown";
  const ageSec = (now - updatedAt) / 1000;
  if (ageSec < 60) return "live";
  if (ageSec < 5 * 60) return "delayed";
  return "stale";
}
