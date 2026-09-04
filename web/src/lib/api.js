import { COINS, FIATS, TICKER_SYMS, isCoin, known } from "../data/assets.js";

/* Dipakai bareng oleh fetchRates & PopularPairs supaya SEMUA permintaan */
/* harga (dari pasangan apa pun, oleh siapa pun) jatuh ke SATU cache key */
/* yang sama di server — bukan satu cache entry per kombinasi pasangan.  */
/* Ini penting banget karena CoinGecko tanpa API key punya jatah yang    */
/* ketat, dan situs ini sekarang dipakai publik.                         */
const ALL_COIN_IDS = Object.values(COINS)
  .map((c) => c.id)
  .join(",");
const ALL_VS = Object.keys(FIATS).concat("usd").join(",");

/* Semua fungsi di sini memanggil endpoint backend yang sama seperti     */
/* sebelumnya (/api/parse, /api/price, /api/icons) — tidak ada endpoint  */
/* baru maupun yang diubah, cuma /api/assistant yang ditambahkan.        */

const FETCH_TIMEOUT_MS = 12_000;

/* Gabungkan timeout otomatis dengan signal luar (kalau ada) — dipakai   */
/* App.jsx untuk membatalkan request lama saat pengguna ganti aset      */
/* cepat, biar respons yang telat tidak menimpa hasil yang lebih baru.  */
function withTimeout(outerSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("timeout")), FETCH_TIMEOUT_MS);
  if (outerSignal) {
    if (outerSignal.aborted) controller.abort(outerSignal.reason);
    else outerSignal.addEventListener("abort", () => controller.abort(outerSignal.reason), { once: true });
  }
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

/* Parser cadangan – dipakai kalau pemanggilan model gagal. */
export function parseFallback(text) {
  const cleaned = text
    .toLowerCase()
    .replace(/,(\d{3})/g, "$1")
    .replace(/,/g, ".")
    .trim();
  const m = cleaned.match(
    /(?:([\d.]+)\s*)?([a-z]{2,6})\s*(?:ke|to|jadi|in|->|→|\/)\s*([a-z]{2,6})/
  );
  if (!m) return null;
  const amount = m[1] ? parseFloat(m[1]) : 1;
  return { amount, from: m[2], to: m[3] };
}

/* Backend kita yang memegang API key. Di dev, Vite mem-proxy ke :8787. */
export async function parseWithModel(text) {
  const res = await fetch("/api/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (res.status === 429)
    throw new Error("Terlalu banyak permintaan. Tunggu sebentar.");
  if (!res.ok) throw new Error("parser tidak merespons");
  return res.json();
}

/* Rumus konversi murni, dipisah dari fetchRates supaya bisa dites tanpa */
/* jaringan. Semua aset dinilai dalam satuan BTC supaya satu rumus      */
/* berlaku untuk kripto→kripto, kripto→fiat, maupun fiat→kripto.        */
/* Perubahan 24 jam sebuah aset diukur dalam USD.

   Untuk kripto, CoinGecko memberi `usd_24h_change` langsung. Untuk fiat,
   yang tersedia adalah perubahan BTC terhadap fiat itu — dan perubahan
   fiat terhadap USD adalah kebalikan dari selisih keduanya. Semua angka
   di sini TURUNAN dari data yang memang dikirim CoinGecko; tidak ada yang
   dikarang, dan kalau datanya tidak ada, hasilnya null (bukan nol). */
function change24hVsUsd(data, sym) {
  const btc = data.bitcoin;
  if (isCoin(sym)) {
    const v = data[COINS[sym].id]?.usd_24h_change;
    return typeof v === "number" ? v : null;
  }
  if (sym === "usd") return 0;
  const btcVsFiat = btc?.[`${sym}_24h_change`];
  const btcVsUsd = btc?.usd_24h_change;
  if (typeof btcVsFiat !== "number" || typeof btcVsUsd !== "number") return null;
  // (1+btcUsd)/(1+btcFiat) - 1 = perubahan fiat terhadap USD
  return ((1 + btcVsUsd / 100) / (1 + btcVsFiat / 100) - 1) * 100;
}

/* Perubahan 24 jam PASANGAN from/to: selisih majemuk dari perubahan
   masing-masing terhadap USD. Kalau salah satunya tidak diketahui,
   hasilnya null — lebih baik tidak menampilkan apa pun daripada angka
   yang tidak bisa dipertanggungjawabkan. */
export function computePairChange24h(data, fromSym, toSym) {
  const a = change24hVsUsd(data, fromSym);
  const b = change24hVsUsd(data, toSym);
  if (a === null || b === null) return null;
  return ((1 + a / 100) / (1 + b / 100) - 1) * 100;
}

export function computeRate(data, fromSym, toSym) {
  const btc = data.bitcoin;
  if (!btc) throw new Error("Data harga tidak lengkap.");

  const inBTC = (sym) => {
    if (isCoin(sym)) {
      const p = data[COINS[sym].id]?.usd;
      if (!p) throw new Error(`Harga ${sym.toUpperCase()} tidak tersedia.`);
      return p / btc.usd;
    }
    const p = btc[sym];
    if (!p) throw new Error(`Kurs ${sym.toUpperCase()} tidak tersedia.`);
    return 1 / p;
  };

  return {
    rate: inBTC(fromSym) / inBTC(toSym),
    change24h: computePairChange24h(data, fromSym, toSym),
    updatedAt: btc.last_updated_at ? btc.last_updated_at * 1000 : Date.now(),
  };
}

export async function fetchRates(fromSym, toSym, outerSignal) {
  // Dulu cuma minta id/vs yang persis dipakai pasangan ini — kelihatannya
  // hemat, tapi malah bikin server nyimpen satu cache entry TERPISAH buat
  // tiap kombinasi pasangan, jadi cache-nya nyaris nggak pernah ke-hit.
  // Sekarang selalu minta set yang sama persis dengan ticker/popular pairs
  // (lihat ALL_COIN_IDS/ALL_VS), jadi hampir semua permintaan — dari
  // pasangan apa pun, pengguna mana pun — berbagi satu cache 20 detik yang
  // sama di server, jauh lebih hemat panggilan ke CoinGecko.
  const url = `/api/price?ids=${ALL_COIN_IDS}&vs=${ALL_VS}`;

  const { signal, clear } = withTimeout(outerSignal);
  let res;
  try {
    res = await fetch(url, { signal });
  } catch (err) {
    if (err.name === "AbortError" && !outerSignal?.aborted) {
      throw new Error("Server tidak merespons, coba lagi.");
    }
    throw err;
  } finally {
    clear();
  }

  if (res.status === 429)
    throw new Error("Terlalu banyak permintaan ke CoinGecko. Tunggu sebentar.");
  if (!res.ok) throw new Error(`Harga tidak bisa diambil (${res.status}).`);
  const data = await res.json();
  return computeRate(data, fromSym, toSym);
}

export async function fetchTickerPrices() {
  return fetchPricesFor(TICKER_SYMS);
}

/* Harga mentah (USD dan/atau fiat lain) buat simbol kripto tertentu —   */
/* dipakai ticker & kartu "Pasangan populer". Beda dari fetchRates yang  */
/* menghitung KURS antar dua aset, ini cuma harga satu sisi apa adanya.  */
export async function fetchPricesFor(symbols, vs = "usd") {
  const ids = symbols
    .filter(isCoin)
    .map((s) => COINS[s].id)
    .join(",");
  const res = await fetch(`/api/price?ids=${ids}&vs=${vs}`);
  if (!res.ok) throw new Error("price fetch failed");
  return res.json();
}

export async function askAssistant(text) {
  const res = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (res.status === 429)
    throw new Error("Terlalu banyak pertanyaan. Tunggu sebentar ya.");
  if (!res.ok) throw new Error("Asisten sedang tidak bisa dihubungi.");
  const data = await res.json();
  return data.reply;
}

/* Sparkline 24 jam (24 titik per token) untuk kartu Pasangan Populer.
   Token yang datanya tidak dikirim CoinGecko tidak muncul di hasil — dan
   kartunya menampilkan skeleton, BUKAN garis yang dibuat-buat. */
export async function fetchSparklines(ids) {
  const res = await fetch(`/api/sparklines?ids=${ids}`);
  if (!res.ok) throw new Error("sparklines fetch failed");
  return res.json();
}

export async function fetchIcons(ids) {
  const res = await fetch(`/api/icons?ids=${ids}`);
  if (!res.ok) throw new Error("icons fetch failed");
  return res.json();
}

/* Data historis buat grafik (garis = market_chart, candle = OHLC).      */
/* `type` "line" balik { prices: [[ts,harga], ...] }, "candle" balik     */
/* array [[ts,open,high,low,close], ...] langsung dari CoinGecko.        */
export async function fetchChartData({ coinId, vsCurrency, days, type, signal: outerSignal }) {
  const url = `/api/chart?id=${coinId}&vs=${vsCurrency}&days=${days}&type=${type}`;
  const { signal, clear } = withTimeout(outerSignal);
  let res;
  try {
    res = await fetch(url, { signal });
  } catch (err) {
    if (err.name === "AbortError" && !outerSignal?.aborted) {
      throw new Error("Server tidak merespons, coba lagi.");
    }
    throw err;
  } finally {
    clear();
  }

  if (res.status === 429) {
    const err = new Error("Batas permintaan data grafik ke CoinGecko tercapai. Coba lagi sebentar.");
    err.isRateLimit = true;
    throw err;
  }
  if (!res.ok) throw new Error(`Data grafik tidak bisa diambil (${res.status}).`);
  return res.json();
}

export { known };
