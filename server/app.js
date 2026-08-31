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

const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;

function rateLimit(req, res, next) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.ip;
  const now = Date.now();
  const log = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (log.length >= MAX_PER_WINDOW) {
    return res.status(429).json({ error: "Terlalu banyak permintaan." });
  }
  log.push(now);
  hits.set(ip, log);
  next();
}

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

/* ---------- Harga, dengan cache 20 detik ---------------------------- */
/* Cache memangkas panggilan ke CoinGecko drastis: sepuluh orang yang   */
/* menghitung BTC dalam menit yang sama hanya jadi tiga permintaan.     */

const priceCache = new Map();
const PRICE_TTL_MS = 20_000;

app.get("/api/price", async (req, res) => {
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

app.get("/api/icons", async (req, res) => {
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

app.get("/api/health", (_req, res) => res.json({ ok: true }));

export default app;
