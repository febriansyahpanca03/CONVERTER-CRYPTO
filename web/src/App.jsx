import { useState, useRef, useEffect } from "react";

/* ------------------------------------------------------------------ */
/*  Daftar aset yang didukung                                          */
/* ------------------------------------------------------------------ */

const COINS = {
  btc: { id: "bitcoin", name: "Bitcoin" },
  eth: { id: "ethereum", name: "Ethereum" },
  sol: { id: "solana", name: "Solana" },
  bnb: { id: "binancecoin", name: "BNB" },
  xrp: { id: "ripple", name: "XRP" },
  ada: { id: "cardano", name: "Cardano" },
  doge: { id: "dogecoin", name: "Dogecoin" },
  matic: { id: "matic-network", name: "Polygon" },
  dot: { id: "polkadot", name: "Polkadot" },
  avax: { id: "avalanche-2", name: "Avalanche" },
  link: { id: "chainlink", name: "Chainlink" },
  ltc: { id: "litecoin", name: "Litecoin" },
  trx: { id: "tron", name: "TRON" },
  atom: { id: "cosmos", name: "Cosmos" },
  near: { id: "near", name: "NEAR" },
  apt: { id: "aptos", name: "Aptos" },
  arb: { id: "arbitrum", name: "Arbitrum" },
  op: { id: "optimism", name: "Optimism" },
  ton: { id: "the-open-network", name: "Toncoin" },
  sui: { id: "sui", name: "Sui" },
  inj: { id: "injective-protocol", name: "Injective" },
  fil: { id: "filecoin", name: "Filecoin" },
  hbar: { id: "hedera-hashgraph", name: "Hedera" },
  algo: { id: "algorand", name: "Algorand" },
  vet: { id: "vechain", name: "VeChain" },
  xlm: { id: "stellar", name: "Stellar" },
  etc: { id: "ethereum-classic", name: "Ethereum Classic" },
  shib: { id: "shiba-inu", name: "Shiba Inu" },
  pepe: { id: "pepe", name: "Pepe" },
  uni: { id: "uniswap", name: "Uniswap" },
  aave: { id: "aave", name: "Aave" },
  usdt: { id: "tether", name: "Tether" },
  usdc: { id: "usd-coin", name: "USD Coin" },
  dai: { id: "dai", name: "Dai" },
  wbtc: { id: "wrapped-bitcoin", name: "Wrapped Bitcoin" },
  steth: { id: "staked-ether", name: "Lido Staked Ether" },
  cake: { id: "pancakeswap-token", name: "PancakeSwap" },
  rndr: { id: "render-token", name: "Render" },
  imx: { id: "immutable-x", name: "Immutable" },
  grt: { id: "the-graph", name: "The Graph" },
};

const FIATS = {
  idr: "Rupiah",
  usd: "Dolar AS",
  eur: "Euro",
  sgd: "Dolar Singapura",
  jpy: "Yen",
  aud: "Dolar Australia",
  gbp: "Pound",
  myr: "Ringgit",
};

/* Aset yang ditampilkan di ticker berjalan. */
const TICKER_SYMS = [
  "btc", "eth", "sol", "bnb", "xrp", "ada", "doge",
  "dot", "avax", "link", "ltc", "trx", "ton", "sui",
];

const PALETTE = {
  ground: "#080B14",
  panel: "#101426",
  edge: "#164E63",
  starlight: "#F1F5F9",
  haze: "#94A3B8",
  nova: "#22D3EE",
  aqua: "#67E8F9",
  btn: "#0891B2",
  flare: "#FB7185",
};

/* ------------------------------------------------------------------ */
/*  Utilitas                                                           */
/* ------------------------------------------------------------------ */

const isFiat = (sym) => Object.hasOwn(FIATS, sym);
const isCoin = (sym) => Object.hasOwn(COINS, sym);
const known = (sym) => isFiat(sym) || isCoin(sym);

function labelOf(sym) {
  if (isCoin(sym)) return COINS[sym].name;
  if (isFiat(sym)) return FIATS[sym];
  return sym.toUpperCase();
}

function formatAmount(n, sym) {
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

/* Parser cadangan – dipakai kalau pemanggilan model gagal. */
function parseFallback(text) {
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
async function parseWithModel(text) {
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

async function fetchRates(fromSym, toSym) {
  const ids = new Set(["bitcoin"]);
  const vs = new Set(["usd"]);
  for (const s of [fromSym, toSym]) {
    if (isCoin(s)) ids.add(COINS[s].id);
    else vs.add(s);
  }
  const url =
    `/api/price?ids=${[...ids].join(",")}` +
    `&vs=${[...vs].join(",")}`;

  const res = await fetch(url);
  if (res.status === 429)
    throw new Error("Terlalu banyak permintaan ke CoinGecko. Tunggu sebentar.");
  if (!res.ok) throw new Error(`Harga tidak bisa diambil (${res.status}).`);
  const data = await res.json();

  const btc = data.bitcoin;
  if (!btc) throw new Error("Data harga tidak lengkap.");

  // Semua aset dinilai dalam satuan BTC supaya satu rumus berlaku untuk
  // kripto→kripto, kripto→fiat, maupun fiat→kripto.
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
    updatedAt: btc.last_updated_at ? btc.last_updated_at * 1000 : Date.now(),
  };
}

async function fetchTickerPrices() {
  const ids = TICKER_SYMS.map((s) => COINS[s].id).join(",");
  const res = await fetch(`/api/price?ids=${ids}&vs=usd`);
  if (!res.ok) throw new Error("ticker fetch failed");
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Latar bintang bergerak (live wallpaper, CSS murni)                 */
/* ------------------------------------------------------------------ */

function Starfield() {
  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden" }}>
      <div className="kk-galaxy-photo" />
      <div className="kk-galaxy-scrim" />
      <div className="kk-stars kk-stars-near" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Ikon token — logo asli dari CoinGecko kalau ada, kalau tidak       */
/*  (mis. mata uang fiat, atau gambar gagal dimuat) jatuh ke monogram. */
/* ------------------------------------------------------------------ */

function CoinIcon({ sym, size = 28, t, iconUrl }) {
  const [broken, setBroken] = useState(false);

  if (iconUrl && !broken) {
    return (
      <img
        src={iconUrl}
        alt={sym.toUpperCase()}
        width={size}
        height={size}
        style={{ borderRadius: "50%", flexShrink: 0, objectFit: "cover" }}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: `linear-gradient(135deg, ${t.nova}, ${t.aqua})`,
        color: t.ground,
        fontWeight: 700,
        fontSize: size * 0.42,
      }}
    >
      {sym.slice(0, 1).toUpperCase()}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Ticker harga tak berhenti                                          */
/* ------------------------------------------------------------------ */

function PriceTicker({ t }) {
  const [prices, setPrices] = useState(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const data = await fetchTickerPrices();
        if (alive) setPrices(data);
      } catch {
        /* diamkan; ticker cuma hiasan, jangan ganggu alur utama */
      }
    }
    load();
    const id = setInterval(load, 45_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const items = TICKER_SYMS.map((sym) => {
    const entry = prices?.[COINS[sym].id];
    return { sym, price: entry?.usd, change: entry?.usd_24h_change };
  });

  const renderItems = (keyPrefix) =>
    items.map(({ sym, price, change }) => {
      const up = typeof change === "number" && change >= 0;
      const down = typeof change === "number" && change < 0;
      return (
        <span
          key={`${keyPrefix}-${sym}`}
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 8,
            padding: "0 22px",
            fontSize: 13,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: t.starlight, fontWeight: 600 }}>
            {sym.toUpperCase()}
          </span>
          <span style={{ color: t.haze }}>
            {price != null ? `$${formatAmount(price, "usd")}` : "…"}
          </span>
          {typeof change === "number" && (
            <span style={{ color: up ? "#4ADE80" : down ? t.flare : t.haze }}>
              {up ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </span>
      );
    });

  return (
    <div
      className="kk-ticker-outer"
      style={{
        position: "relative",
        zIndex: 1,
        borderBottom: `1px solid ${t.edge}`,
        background: "rgba(8,11,20,.55)",
        backdropFilter: "blur(6px)",
        overflow: "hidden",
      }}
    >
      <div className="kk-ticker-track">
        {renderItems("a")}
        {renderItems("b")}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tampilan                                                           */
/* ------------------------------------------------------------------ */

const SAMPLES = ["0.5 eth ke sol", "1 btc ke idr", "250 usdt ke eth", "10 sol ke doge"];

export default function App() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [icons, setIcons] = useState({});
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const ids = Object.values(COINS)
      .map((c) => c.id)
      .join(",");
    fetch(`/api/icons?ids=${ids}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then(setIcons)
      .catch(() => {});
  }, []);

  async function run(text) {
    const q = text.trim();
    if (!q) return;
    setStatus("loading");
    setMessage("");

    let parsed = null;
    try {
      parsed = await parseWithModel(q);
    } catch {
      parsed = parseFallback(q);
    }
    if (!parsed || parsed.error || !parsed.from || !parsed.to) {
      setStatus("error");
      setMessage(
        parsed?.error ||
          'Belum terbaca. Coba format seperti "0.5 eth ke sol".'
      );
      return;
    }

    const from = String(parsed.from).toLowerCase();
    const to = String(parsed.to).toLowerCase();
    const amount = Number(parsed.amount) || 1;

    for (const s of [from, to]) {
      if (!known(s)) {
        setStatus("error");
        setMessage(`${s.toUpperCase()} belum ada di daftar aset.`);
        return;
      }
    }

    try {
      const { rate, updatedAt } = await fetchRates(from, to);
      setResult({ amount, from, to, rate, value: amount * rate, updatedAt });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setMessage(
        err.message?.includes("Failed to fetch")
          ? "Server tidak merespons. Cek apakah layanan backend berjalan."
          : err.message
      );
    }
  }

  async function swapDirection() {
    if (!result) return;
    const newFrom = result.to;
    const newTo = result.from;
    const newAmount = result.value;

    setStatus("loading");
    setQuery(`${formatAmount(newAmount, newFrom)} ${newFrom} ke ${newTo}`);

    try {
      const { rate, updatedAt } = await fetchRates(newFrom, newTo);
      setResult({ amount: newAmount, from: newFrom, to: newTo, rate, value: newAmount * rate, updatedAt });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setMessage(
        err.message?.includes("Failed to fetch")
          ? "Server tidak merespons. Cek apakah layanan backend berjalan."
          : err.message
      );
    }
  }

  const t = PALETTE;

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100%",
        background: t.ground,
        color: t.starlight,
        fontFamily: "'Space Grotesk', 'Segoe UI', system-ui, -apple-system, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
        .kk-input::placeholder { color: ${t.haze}; opacity: .7; }
        .kk-input:focus { outline: 2px solid ${t.nova}; outline-offset: 2px; }
        .kk-chip:focus-visible { outline: 2px solid ${t.nova}; outline-offset: 2px; }
        .kk-chip:hover { border-color: ${t.aqua}; color: ${t.starlight}; }
        .kk-btn:hover:not(:disabled) { background: ${t.nova}; }
        .kk-refresh:hover { color: ${t.aqua}; }
        .kk-swap-btn:hover:not(:disabled) { color: ${t.nova}; border-color: ${t.nova}; transform: rotate(180deg); }
        @keyframes kk-pulse { 0%,100% { opacity: .35 } 50% { opacity: 1 } }

        /* --- live wallpaper: foto galaksi asli (NASA/Hubble, domain publik), statis --- */
        .kk-galaxy-photo {
          position: absolute; inset: -5%;
          background: url('/space-bg.jpg') center / cover no-repeat;
        }
        .kk-galaxy-scrim {
          position: absolute; inset: 0;
          background:
            linear-gradient(180deg, rgba(8,11,20,.55) 0%, rgba(8,11,20,.75) 45%, rgba(8,11,20,.92) 100%);
        }

        .kk-stars {
          position: absolute; inset: -50%;
          background-repeat: repeat;
          background-image:
            radial-gradient(2.5px 2.5px at 40px 60px, #fff 0%, rgba(255,255,255,.5) 45%, transparent 75%),
            radial-gradient(2px 2px at 120px 20px, #fff 0%, rgba(255,255,255,.5) 45%, transparent 75%),
            radial-gradient(3.5px 3.5px at 200px 140px, #fff 0%, rgba(255,255,255,.6) 40%, transparent 75%),
            radial-gradient(2px 2px at 260px 80px, #fff 0%, rgba(255,255,255,.5) 45%, transparent 75%),
            radial-gradient(3.5px 3.5px at 320px 200px, #fff 0%, rgba(255,255,255,.6) 40%, transparent 75%),
            radial-gradient(2.5px 2.5px at 20px 190px, #fff 0%, rgba(255,255,255,.5) 45%, transparent 75%),
            radial-gradient(2px 2px at 160px 240px, #fff 0%, rgba(255,255,255,.5) 45%, transparent 75%);
          animation: kk-twinkle 4s ease-in-out infinite alternate;
        }
        .kk-stars-near {
          background-size: 180px 140px;
          opacity: .85;
          transform-origin: center center;
          animation: kk-twinkle 3s ease-in-out infinite alternate, kk-star-spin 220s linear infinite;
        }
        @keyframes kk-twinkle { from { opacity: .25; } to { opacity: .9; } }
        @keyframes kk-star-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (prefers-reduced-motion: reduce) {
          .kk-galaxy-photo, .kk-stars { animation: none !important; }
        }

        /* --- ticker tak berhenti --- */
        .kk-ticker-track {
          display: inline-flex;
          width: max-content;
          padding: 10px 0;
          animation: kk-ticker-scroll 45s linear infinite;
        }
        .kk-ticker-outer:hover .kk-ticker-track { animation-play-state: paused; }
        @keyframes kk-ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .kk-ticker-track { animation: none; }
        }
      `}</style>

      <Starfield />
      <PriceTicker t={t} />

      <div style={{ position: "relative", zIndex: 1, padding: "40px 20px 56px" }}>
        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          <header style={{ marginBottom: 32 }}>
            <h1
              style={{
                fontSize: "clamp(22px, 5vw, 30px)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                margin: 0,
                backgroundImage: `linear-gradient(90deg, ${t.nova}, ${t.aqua})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                WebkitTextStroke: `1.25px ${t.ground}`,
                textShadow: `0 0 26px ${t.nova}77`,
              }}
            >
              PANCA SWAP AGENT
            </h1>
          </header>

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input
              ref={inputRef}
              className="kk-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run(query)}
              placeholder="0.5 eth ke sol"
              style={{
                flex: 1,
                background: t.panel,
                border: `1px solid ${t.edge}`,
                borderRadius: 6,
                color: t.starlight,
                fontSize: 16,
                fontFamily: "inherit",
                padding: "13px 14px",
              }}
            />
            <button
              className="kk-btn"
              onClick={() => run(query)}
              disabled={status === "loading"}
              style={{
                background: t.btn,
                border: "none",
                borderRadius: 6,
                color: t.starlight,
                cursor: status === "loading" ? "wait" : "pointer",
                fontFamily: "inherit",
                fontSize: 15,
                fontWeight: 600,
                padding: "0 20px",
                transition: "background .15s",
              }}
            >
              Hitung
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 30 }}>
            {SAMPLES.map((s) => (
              <button
                key={s}
                className="kk-chip"
                onClick={() => {
                  setQuery(s);
                  run(s);
                }}
                style={{
                  background: "transparent",
                  border: `1px solid ${t.edge}`,
                  borderRadius: 20,
                  color: t.haze,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 13,
                  padding: "5px 12px",
                  transition: "border-color .15s, color .15s",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* idle / loading / error: papan pesan sederhana */}
          {status !== "done" && (
            <div
              style={{
                background: t.panel,
                border: `1px solid ${t.edge}`,
                borderRadius: 12,
                minHeight: 190,
                padding: "26px 24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              {status === "idle" && (
                <p style={{ color: t.haze, fontSize: 15, margin: 0 }}>
                  Hasil konversi muncul di sini.
                </p>
              )}

              {status === "loading" && (
                <p
                  style={{
                    color: t.haze,
                    fontSize: 15,
                    margin: 0,
                    animation: "kk-pulse 1.2s ease-in-out infinite",
                  }}
                >
                  Mengambil harga…
                </p>
              )}

              {status === "error" && (
                <div>
                  <p style={{ color: t.flare, fontSize: 15, margin: 0, fontWeight: 500 }}>
                    {message}
                  </p>
                  <p style={{ color: t.haze, fontSize: 14, margin: "8px 0 0" }}>
                    Aset yang tersedia: {Object.keys(COINS).length} kripto dan{" "}
                    {Object.keys(FIATS).length} mata uang.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* done: kartu swap ala Dari / Ke */}
          {status === "done" && result && (
            <div>
              <div
                style={{
                  background: t.panel,
                  border: `1px solid ${t.nova}`,
                  borderRadius: 12,
                  padding: "16px 18px",
                  boxShadow: `0 0 0 1px ${t.nova}22`,
                }}
              >
                <div style={{ fontSize: 13, color: t.haze, marginBottom: 10 }}>Dari</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <span
                    style={{
                      fontSize: "clamp(22px, 6vw, 28px)",
                      fontWeight: 600,
                      color: t.starlight,
                      wordBreak: "break-word",
                    }}
                  >
                    {formatAmount(result.amount, result.from)}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <CoinIcon sym={result.from} t={t} iconUrl={icons[COINS[result.from]?.id]} />
                    <span style={{ fontWeight: 600 }}>{result.from.toUpperCase()}</span>
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  className="kk-swap-btn"
                  onClick={swapDirection}
                  disabled={status === "loading"}
                  title="Balik arah tukar"
                  aria-label="Balik arah tukar"
                  style={{
                    marginTop: -16,
                    marginBottom: -16,
                    zIndex: 2,
                    position: "relative",
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: t.ground,
                    border: `1px solid ${t.edge}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: t.haze,
                    fontSize: 16,
                    cursor: status === "loading" ? "wait" : "pointer",
                    padding: 0,
                    transition: "color .15s, border-color .15s, transform .15s",
                  }}
                >
                  ⇅
                </button>
              </div>

              <div
                style={{
                  background: t.panel,
                  border: `1px solid ${t.edge}`,
                  borderRadius: 12,
                  padding: "16px 18px",
                }}
              >
                <div style={{ fontSize: 13, color: t.haze, marginBottom: 10 }}>Ke ≈</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <span
                    style={{
                      fontSize: "clamp(22px, 6vw, 28px)",
                      fontWeight: 600,
                      color: t.starlight,
                      wordBreak: "break-word",
                    }}
                  >
                    {formatAmount(result.value, result.to)}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <CoinIcon sym={result.to} t={t} iconUrl={icons[COINS[result.to]?.id]} />
                    <span style={{ fontWeight: 600 }}>{result.to.toUpperCase()}</span>
                  </span>
                </div>
              </div>

              <div
                style={{
                  textAlign: "center",
                  marginTop: 18,
                  fontSize: 13,
                  color: t.haze,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <span>
                  1 {result.from.toUpperCase()} ={" "}
                  <span style={{ color: t.starlight, fontWeight: 500 }}>
                    {formatAmount(result.rate, result.to)}
                  </span>{" "}
                  {result.to.toUpperCase()}
                </span>
                <button
                  className="kk-refresh"
                  onClick={() => run(query)}
                  title="Segarkan harga"
                  aria-label="Segarkan harga"
                  style={{
                    background: "none",
                    border: "none",
                    color: t.nova,
                    cursor: "pointer",
                    fontSize: 15,
                    padding: 2,
                    transition: "color .15s",
                  }}
                >
                  ⟳
                </button>
              </div>
              <p style={{ textAlign: "center", margin: "4px 0 0", fontSize: 12, color: t.haze }}>
                {labelOf(result.from)} ke {labelOf(result.to)}, tercatat{" "}
                {new Date(result.updatedAt).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}

          <p
            style={{
              color: t.haze,
              fontSize: 13,
              lineHeight: 1.6,
              margin: "18px 0 0",
              maxWidth: "62ch",
            }}
          >
            Angka di atas adalah harga tengah pasar. Kalau kamu benar-benar
            menukar aset di exchange atau DEX, hasilnya akan lebih kecil karena
            ada spread, biaya jaringan, dan slippage.
          </p>
        </div>
      </div>
    </div>
  );
}
