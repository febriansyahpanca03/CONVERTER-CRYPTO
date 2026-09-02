import "dotenv/config";
import express from "express";

const app = express();
app.use(express.json({ limit: "4kb" }));

const GROQ_KEY = process.env.GROQ_API_KEY;
const CG_KEY = process.env.COINGECKO_API_KEY || "";

/* ---------- Pembatas laju sederhana, per alamat IP ------------------ */
/* Endpoint /api/parse memakai kredit API, jadi harus dijaga.          */
/* Catatan: di lingkungan serverless (mis. Vercel), Map ini per-instance */
/* saja — bukan batas global lintas semua instance yang sedang aktif.   */

const WINDOW_MS = 60_000;

/* Pabrik limiter — /api/parse & /api/assistant makan kredit Groq jadi   */
/* jatahnya ketat, sedangkan /api/price & /api/icons cuma proxy ke cache */
/* CoinGecko (di-poll ticker tiap 45 detik) jadi jatahnya lebih longgar, */
/* dengan penyimpanan hit terpisah supaya keduanya tidak saling makan    */
/* jatah punya endpoint lain.                                            */
function createRateLimiter(maxPerWindow) {
  const hits = new Map();

  if (typeof setInterval !== "undefined") {
    setInterval(() => {
      const now = Date.now();
      for (const [ip, log] of hits) {
        const fresh = log.filter((t) => now - t < WINDOW_MS);
        if (fresh.length) hits.set(ip, fresh);
        else hits.delete(ip);
      }
    }, WINDOW_MS).unref?.();
  }

  return function rateLimit(req, res, next) {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.ip;
    const now = Date.now();
    const log = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
    if (log.length >= maxPerWindow) {
      return res.status(429).json({ error: "Terlalu banyak permintaan." });
    }
    log.push(now);
    hits.set(ip, log);
    next();
  };
}

const rateLimit = createRateLimiter(20);
const rateLimitPublicData = createRateLimiter(120);

/* ---------- Membaca kalimat jadi JSON ------------------------------- */

const SYMBOLS =
  "btc, eth, sol, bnb, xrp, ada, doge, matic, dot, avax, link, ltc, trx, " +
  "atom, near, apt, arb, op, ton, sui, inj, fil, hbar, algo, vet, xlm, etc, " +
  "shib, pepe, uni, aave, usdt, usdc, dai, wbtc, steth, cake, rndr, imx, " +
  "grt, idr, usd, eur, sgd, jpy, aud, gbp, myr";

const SYSTEM =
  "Kamu mengubah permintaan konversi mata uang menjadi JSON. " +
  `Simbol yang tersedia: ${SYMBOLS}. ` +
  'Balas HANYA objek JSON: {"amount": number, "from": "simbol", "to": "simbol"}. ' +
  'Kalau permintaan tidak jelas atau simbolnya tidak ada di daftar, balas ' +
  '{"error":"alasan singkat dalam bahasa Indonesia"}. ' +
  "Jumlah default 1 kalau tidak disebut. Tanpa markdown, tanpa penjelasan.";

app.post("/api/parse", rateLimit, async (req, res) => {
  if (!GROQ_KEY) {
    console.error("GROQ_API_KEY belum diisi.");
    return res.status(500).json({ error: "Parser belum dikonfigurasi." });
  }

  const text = String(req.body?.text || "").slice(0, 200).trim();
  if (!text) return res.status(400).json({ error: "Teks kosong." });

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        max_tokens: 300,
        temperature: 0,
        reasoning_effort: "low",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: text },
        ],
      }),
    });

    if (!r.ok) {
      console.error("groq", r.status, await r.text());
      return res.status(502).json({ error: "Parser tidak merespons." });
    }

    const data = await r.json();
    const raw = (data.choices?.[0]?.message?.content || "")
      .replace(/```json|```/g, "")
      .trim();

    res.json(JSON.parse(raw));
  } catch (err) {
    console.error("parse", err);
    res.status(502).json({ error: "Parser tidak merespons." });
  }
});

/* ---------- Asisten bantuan: jawab pertanyaan cara pakai situs ------ */

const ASSISTANT_SYSTEM =
  'Kamu adalah asisten bantuan untuk website "Panca Swap Agent", sebuah kalkulator ' +
  "konversi harga crypto & mata uang. Jawab pertanyaan pengguna tentang CARA PAKAI " +
  "situs ini secara singkat dan dalam Bahasa Indonesia (maksimal 3-4 kalimat, tanpa " +
  "markdown). Gunakan gaya santai kayak ngobrol sama teman -- bukan gaya asisten AI " +
  "formal. Boleh pakai 'kamu', kata sambung kayak 'terus'/'nah', dan langsung ke " +
  "poinnya, jangan muter-muter atau kedengaran kayak baca manual.\n\n" +
  "Fakta tentang situs ini yang boleh kamu sampaikan:\n" +
  "- Ada dua cara pakai: (1) Converter — pilih aset asal & tujuan lewat dropdown yang " +
  'bisa dicari, masukkan jumlah, klik "Konversi". (2) Quick Command — ketik kalimat ' +
  'bebas seperti "250 USDT ke ETH", AI yang membaca kalimatnya.\n' +
  "- Ada tombol swap (⇅) untuk membalik arah tukar.\n" +
  "- Hasil bisa disalin, dibagikan lewat tautan, dan dijadikan favorit.\n" +
  "- Ada riwayat 5 konversi terakhir tersimpan di browser (localStorage), bisa " +
  "diklik ulang.\n" +
  "- Harga diambil real-time dari CoinGecko, ada label status Live/Delayed/Data lama.\n" +
  "- Market ticker di atas menampilkan harga berjalan, bisa diklik untuk mengisi " +
  "converter.\n" +
  "- Situs ini HANYA kalkulator estimasi. TIDAK ada wallet, TIDAK menyimpan dana, " +
  "TIDAK melakukan transaksi sungguhan apa pun.\n\n" +
  "Kalau pertanyaan di luar topik cara pakai situs ini (nasihat investasi, prediksi " +
  "harga, topik umum lain), tolak dengan sopan dan arahkan kembali ke topik cara " +
  "pakai situs.";

app.post("/api/assistant", rateLimit, async (req, res) => {
  if (!GROQ_KEY) {
    return res.status(500).json({ error: "Asisten belum dikonfigurasi." });
  }

  const text = String(req.body?.text || "").slice(0, 300).trim();
  if (!text) return res.status(400).json({ error: "Pertanyaan kosong." });

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        max_tokens: 300,
        temperature: 0.4,
        reasoning_effort: "low",
        messages: [
          { role: "system", content: ASSISTANT_SYSTEM },
          { role: "user", content: text },
        ],
      }),
    });

    if (!r.ok) {
      console.error("assistant", r.status, await r.text());
      return res.status(502).json({ error: "Asisten tidak merespons." });
    }

    const data = await r.json();
    const reply = (data.choices?.[0]?.message?.content || "").trim();
    res.json({ reply: reply || "Maaf, saya belum bisa menjawab itu." });
  } catch (err) {
    console.error("assistant", err);
    res.status(502).json({ error: "Asisten tidak merespons." });
  }
});

/* ---------- Harga, dengan cache 20 detik ---------------------------- */
/* Cache memangkas panggilan ke CoinGecko drastis: sepuluh orang yang   */
/* menghitung BTC dalam menit yang sama hanya jadi tiga permintaan.     */

const priceCache = new Map();
// Dinaikkan dari 20 -> 30 detik. Sekarang jauh lebih berarti daripada dulu:
// frontend juga sudah diubah supaya semua permintaan harga (fetchRates,
// ticker, Popular Pairs) berbagi cache key yang sama sebisa mungkin, jadi
// TTL yang lebih panjang di sini langsung memangkas jumlah panggilan nyata
// ke CoinGecko — penting karena situs ini jalan tanpa API key terdaftar
// (lihat komentar COINGECKO_API_KEY di .env), jadi jatahnya ketat sekali.
const PRICE_TTL_MS = 30_000;

app.get("/api/price", rateLimitPublicData, async (req, res) => {
  const ids = String(req.query.ids || "")
    .split(",")
    .filter((s) => /^[a-z0-9-]{1,40}$/.test(s))
    .sort();
  const vs = String(req.query.vs || "")
    .split(",")
    .filter((s) => /^[a-z]{3}$/.test(s))
    .sort();

  if (!ids.length || !vs.length)
    return res.status(400).json({ error: "Parameter tidak valid." });

  const key = `${ids.join(",")}|${vs.join(",")}`;
  const hit = priceCache.get(key);
  if (hit && Date.now() - hit.at < PRICE_TTL_MS) {
    res.set("x-cache", "hit");
    return res.json(hit.body);
  }

  const url =
    "https://api.coingecko.com/api/v3/simple/price" +
    `?ids=${ids.join(",")}&vs_currencies=${vs.join(",")}` +
    "&include_last_updated_at=true&include_24hr_change=true";

  try {
    const r = await fetch(url, {
      headers: CG_KEY ? { "x-cg-demo-api-key": CG_KEY } : {},
    });
    if (!r.ok) {
      if (hit) return res.json(hit.body); // sajikan data basi daripada gagal
      return res.status(r.status).json({ error: `CoinGecko ${r.status}` });
    }
    const body = await r.json();
    priceCache.set(key, { at: Date.now(), body });
    res.set("x-cache", "miss");
    res.json(body);
  } catch (err) {
    console.error("price", err);
    if (hit) return res.json(hit.body);
    res.status(502).json({ error: "Harga tidak bisa diambil." });
  }
});

/* ---------- Ikon token asli, dicache 24 jam (logo jarang berubah) --- */

const iconCache = new Map();
const ICON_TTL_MS = 24 * 60 * 60 * 1000;

app.get("/api/icons", rateLimitPublicData, async (req, res) => {
  const ids = String(req.query.ids || "")
    .split(",")
    .filter((s) => /^[a-z0-9-]{1,40}$/.test(s))
    .sort();

  if (!ids.length) return res.status(400).json({ error: "Parameter tidak valid." });

  const key = ids.join(",");
  const hit = iconCache.get(key);
  if (hit && Date.now() - hit.at < ICON_TTL_MS) {
    res.set("x-cache", "hit");
    return res.json(hit.body);
  }

  const url =
    "https://api.coingecko.com/api/v3/coins/markets" +
    `?vs_currency=usd&ids=${ids.join(",")}&sparkline=false`;

  try {
    const r = await fetch(url, {
      headers: CG_KEY ? { "x-cg-demo-api-key": CG_KEY } : {},
    });
    if (!r.ok) {
      if (hit) return res.json(hit.body);
      return res.status(r.status).json({ error: `CoinGecko ${r.status}` });
    }
    const list = await r.json();
    const body = {};
    for (const c of list) body[c.id] = c.image;
    iconCache.set(key, { at: Date.now(), body });
    res.set("x-cache", "miss");
    res.json(body);
  } catch (err) {
    console.error("icons", err);
    if (hit) return res.json(hit.body);
    res.status(502).json({ error: "Ikon tidak bisa diambil." });
  }
});

/* ---------- Grafik harga (line = market_chart, candle = OHLC) ------- */
/* Cache-nya bertingkat sesuai rentang: periode pendek (1 hari) sering   */
/* berubah jadi TTL pendek, periode panjang (1 tahun) nyaris statis jadi */
/* TTL lebih lama — supaya nggak boros panggilan ke CoinGecko.           */

const chartCache = new Map();
const ALLOWED_DAYS = new Set([1, 7, 30, 365]);
const ALLOWED_TYPES = new Set(["line", "candle"]);

// Dinaikkan cukup jauh dari versi awal (60s/5m/30m) — situs ini jalan
// tanpa API key CoinGecko terdaftar (jatahnya jauh lebih ketat daripada
// yang dikira), dan grafik harga wajar kalau nggak sefresh harga live di
// kalkulator. 1J/24J tetap paling pendek karena candle/titiknya sendiri
// cuma granularitas 5-30 menit, jadi cache 3 menit masih relevan.
function chartTtlFor(days) {
  if (days <= 1) return 3 * 60_000;
  if (days <= 30) return 20 * 60_000;
  return 60 * 60_000;
}

app.get("/api/chart", rateLimitPublicData, async (req, res) => {
  const id = String(req.query.id || "");
  const vs = String(req.query.vs || "");
  const days = Number(req.query.days);
  const type = String(req.query.type || "");

  if (!/^[a-z0-9-]{1,40}$/.test(id) || !/^[a-z]{2,5}$/.test(vs) || !ALLOWED_DAYS.has(days) || !ALLOWED_TYPES.has(type)) {
    return res.status(400).json({ error: "Parameter grafik tidak valid." });
  }

  const key = `${type}|${id}|${vs}|${days}`;
  const hit = chartCache.get(key);
  const ttl = chartTtlFor(days);
  if (hit && Date.now() - hit.at < ttl) {
    res.set("x-cache", "hit");
    return res.json(hit.body);
  }

  const path = type === "candle" ? "ohlc" : "market_chart";
  const url = `https://api.coingecko.com/api/v3/coins/${id}/${path}?vs_currency=${vs}&days=${days}`;

  try {
    const r = await fetch(url, {
      headers: CG_KEY ? { "x-cg-demo-api-key": CG_KEY } : {},
    });
    if (!r.ok) {
      if (hit) return res.json(hit.body); // sajikan data basi daripada gagal total
      if (r.status === 429) return res.status(429).json({ error: "Batas API CoinGecko tercapai." });
      return res.status(r.status).json({ error: `CoinGecko ${r.status}` });
    }
    const raw = await r.json();
    // Dipangkas ke yang benar-benar dipakai chart — market_chart aslinya
    // juga membawa market_caps yang tidak kita perlukan sama sekali.
    const body = type === "candle" ? raw : { prices: raw.prices || [] };
    chartCache.set(key, { at: Date.now(), body });
    res.set("x-cache", "miss");
    res.json(body);
  } catch (err) {
    console.error("chart", err);
    if (hit) return res.json(hit.body);
    res.status(502).json({ error: "Data grafik tidak bisa diambil." });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

export default app;
