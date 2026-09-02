import { COINS, isCoin, isFiat } from "../data/assets.js";

/* Semua logika murni seputar grafik harga — dipisah dari fetching/      */
/* rendering supaya bisa dites tanpa network maupun DOM (lihat           */
/* chart.test.js).                                                       */

export const PERIODS = ["1J", "24J", "7H", "30H", "1T"];
export const PERIOD_LABEL = {
  "1J": "1 Jam",
  "24J": "24 Jam",
  "7H": "7 Hari",
  "30H": "30 Hari",
  "1T": "1 Tahun",
};

/* CoinGecko menentukan granularitas candle/titik data secara OTOMATIS   */
/* dari parameter `days` — tidak bisa diminta custom di API gratis. Ini  */
/* memetakan tiap periode ke `days` yang paling pas, dan mendokumentasikan */
/* interval asli yang benar-benar dikembalikan (bukan yang diinginkan).  */
export const PERIOD_DAYS = { "1J": 1, "24J": 1, "7H": 7, "30H": 30, "1T": 365 };

/* days=1 di endpoint OHLC memberi candle 30 menit yang mencakup 24 jam  */
/* penuh — tidak ada granularitas candle di bawah itu di tier gratis,    */
/* jadi menampilkan "candle 1 jam" cuma akan berisi 1-2 balok raksasa    */
/* yang menyesatkan. Mode Garis tetap jalan untuk 1J karena data         */
/* market_chart-nya (~5 menitan) beneran bisa dipotong ke jendela 1 jam. */
export const CANDLE_UNSUPPORTED_PERIODS = new Set(["1J"]);

const LINE_INTERVAL_LABEL = {
  "1J": "~5 menit",
  "24J": "~5 menit",
  "7H": "~1 jam",
  "30H": "~1 jam",
  "1T": "~1 hari",
};
const CANDLE_INTERVAL_LABEL = {
  "24J": "30 menit",
  "7H": "4 jam",
  "30H": "4 jam",
  "1T": "4 hari",
};

export function intervalLabel(type, period) {
  return type === "candle" ? CANDLE_INTERVAL_LABEL[period] : LINE_INTERVAL_LABEL[period];
}

/* Status kesegaran KHUSUS data grafik — beda dari priceStatus() yang    */
/* dikalibrasi buat harga per-detik. Titik terakhir candle 4-jam yang    */
/* berumur 2 jam itu wajar/segar untuk granularitasnya, bukan "basi",    */
/* jadi ambang toleransinya ikut menyesuaikan `days` yang diminta.       */
export function chartDataStatus(updatedAt, days, now = Date.now()) {
  if (!updatedAt) return "unknown";
  const ageMs = now - updatedAt;
  let freshMs;
  let delayedMs;
  if (days <= 1) {
    freshMs = 15 * 60_000;
    delayedMs = 60 * 60_000;
  } else if (days <= 30) {
    freshMs = 6 * 60 * 60_000;
    delayedMs = 24 * 60 * 60_000;
  } else {
    freshMs = 2 * 24 * 60 * 60_000;
    delayedMs = 7 * 24 * 60 * 60_000;
  }
  if (ageMs < freshMs) return "live";
  if (ageMs < delayedMs) return "delayed";
  return "stale";
}

const STABLECOINS = new Set(["usdt", "usdc", "dai"]);

/* Menentukan token mana yang di-chart dan mata uang acuannya, dari      */
/* pasangan aset asal/tujuan converter. Aturan:                          */
/*  1. Aset tujuan jadi subjek chart kalau dia kripto (sesuai brief).     */
/*  2. Kalau tujuan fiat (mis. BTC->IDR), aset ASAL yang jadi subjek —    */
/*     tetap masuk akal buat di-chart, arah mana pun yang dipilih.       */
/*  3. USDT/USDC/DAI kalah prioritas sebagai SUBJEK chart dibanding      */
/*     kripto volatil di sisi lainnya — mengonversi BTC->USDT harus       */
/*     tetap menampilkan chart BTC, bukan USDT (yang harganya nyaris     */
/*     selalu datar dan bukan itu yang ingin dilihat pengguna).          */
/*  4. Kalau lawannya fiat yang didukung CoinGecko -> dipakai langsung,   */
/*     pasangan akurat 100% (mis. BTC/IDR).                              */
/*  5. Kalau lawannya stablecoin (USDT/USDC/DAI) -> dipakai acuan USD     */
/*     (CoinGecko tidak punya vs_currency=usdt), diberi label transparan. */
/*  6. Selain itu (kripto lain, atau tidak ada lawan yang jelas) -> acuan */
/*     USD juga, sebagai pasangan referensi paling umum tersedia.         */
/*  7. Kalau dua-duanya fiat (tidak ada kripto sama sekali) -> null,      */
/*     pemanggil menampilkan empty state.                                */
export function resolveChartPair(fromSym, toSym) {
  const toIsVolatile = isCoin(toSym) && !STABLECOINS.has(toSym);
  const fromIsVolatile = isCoin(fromSym) && !STABLECOINS.has(fromSym);

  let sym;
  let otherSym;
  if (toIsVolatile) {
    sym = toSym;
    otherSym = fromSym;
  } else if (fromIsVolatile) {
    sym = fromSym;
    otherSym = toSym;
  } else if (isCoin(toSym)) {
    // Dua-duanya bukan kripto volatil (mis. USDT<->USDC), tapi tujuan
    // kebetulan tetap kripto (stablecoin) -> tetap chart itu.
    sym = toSym;
    otherSym = fromSym;
  } else if (isCoin(fromSym)) {
    sym = fromSym;
    otherSym = toSym;
  } else {
    return null;
  }

  const coinId = COINS[sym]?.id;
  if (!coinId) return null;

  if (isFiat(otherSym)) {
    return {
      sym,
      coinId,
      vsCurrency: otherSym,
      pairLabel: `${sym.toUpperCase()}/${otherSym.toUpperCase()}`,
      isProxy: false,
      proxyNote: null,
    };
  }

  if (STABLECOINS.has(otherSym)) {
    return {
      sym,
      coinId,
      vsCurrency: "usd",
      pairLabel: `${sym.toUpperCase()}/${otherSym.toUpperCase()}`,
      isProxy: true,
      proxyNote: `Harga dalam USD dipakai sebagai acuan ${otherSym.toUpperCase()} (1 ${otherSym.toUpperCase()} ≈ 1 USD) — CoinGecko tidak menyediakan kurs langsung dalam ${otherSym.toUpperCase()}.`,
    };
  }

  const suffix = otherSym && otherSym !== sym ? ` selain ${otherSym.toUpperCase()}` : "";
  return {
    sym,
    coinId,
    vsCurrency: "usd",
    pairLabel: `${sym.toUpperCase()}/USD`,
    isProxy: true,
    proxyNote: `CoinGecko tidak menyediakan data historis ${sym.toUpperCase()} langsung dalam mata uang${suffix} ini, jadi grafik memakai acuan USD.`,
  };
}

/* Data market_chart CoinGecko datang dalam milidetik dan urutan naik —  */
/* dipotong ke jendela waktu tertentu (dipakai buat mode Garis di        */
/* periode 1J, karena API-nya cuma bisa diminta per-hari penuh).         */
export function filterToWindow(points, windowMs, nowMs = Date.now()) {
  if (!Array.isArray(points) || points.length === 0) return [];
  const cutoff = nowMs - windowMs;
  const filtered = points.filter(([ts]) => ts >= cutoff);
  // Kalau titik dalam jendela kurang dari 2 (mis. data API belum sempat
  // sampai ke menit-menit terakhir), tetap tampilkan 2 titik terakhir yang
  // ada daripada membiarkan chart kosong.
  return filtered.length >= 2 ? filtered : points.slice(-2);
}

/* Statistik ringkas dari deret harga (mode Garis): titik pertama/       */
/* terakhir yang benar-benar ada di data, bukan dikarang.                 */
export function computeLineStats(points) {
  if (!Array.isArray(points) || points.length === 0) return null;
  const prices = points.map((p) => p[1]);
  const first = points[0];
  const last = points[points.length - 1];
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  const changeAbs = last[1] - first[1];
  const changePct = first[1] !== 0 ? (changeAbs / first[1]) * 100 : 0;
  return {
    last: last[1],
    high,
    low,
    changeAbs,
    changePct,
    updatedAt: last[0],
  };
}

/* lightweight-charts butuh waktu dalam DETIK, urut naik, dan tidak      */
/* boleh ada dua titik dengan waktu yang sama persis — CoinGecko kadang   */
/* mengembalikan dua titik yang jatuh di detik yang sama setelah         */
/* dibulatkan dari milidetik, jadi titik duplikat itu digabung (yang     */
/* belakangan menang, karena itu titik yang lebih baru).                 */
export function toLineSeriesData(points) {
  if (!Array.isArray(points)) return [];
  const out = [];
  for (const [ts, price] of points) {
    const time = Math.floor(ts / 1000);
    if (out.length > 0 && out[out.length - 1].time === time) {
      out[out.length - 1] = { time, value: price };
    } else {
      out.push({ time, value: price });
    }
  }
  return out;
}

export function toCandleSeriesData(candles) {
  if (!Array.isArray(candles)) return [];
  const out = [];
  for (const [ts, open, high, low, close] of candles) {
    const time = Math.floor(ts / 1000);
    const point = { time, open, high, low, close };
    if (out.length > 0 && out[out.length - 1].time === time) {
      out[out.length - 1] = point;
    } else {
      out.push(point);
    }
  }
  return out;
}

/* Sama, tapi dari candle OHLC: open candle pertama jadi titik awal,     */
/* close candle terakhir jadi harga terkini, high/low diambil dari       */
/* high/low TIAP candle (bukan cuma close), sesuai makna candlestick.    */
export function computeCandleStats(candles) {
  if (!Array.isArray(candles) || candles.length === 0) return null;
  const first = candles[0];
  const last = candles[candles.length - 1];
  const highs = candles.map((c) => c[2]);
  const lows = candles.map((c) => c[3]);
  const high = Math.max(...highs);
  const low = Math.min(...lows);
  const changeAbs = last[4] - first[1];
  const changePct = first[1] !== 0 ? (changeAbs / first[1]) * 100 : 0;
  return {
    last: last[4],
    high,
    low,
    changeAbs,
    changePct,
    updatedAt: last[0],
    lastCandle: { time: last[0], open: last[1], high: last[2], low: last[3], close: last[4] },
  };
}
