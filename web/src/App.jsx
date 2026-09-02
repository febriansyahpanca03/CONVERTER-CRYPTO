import { useEffect, useRef, useState } from "react";
import Starfield from "./components/Starfield.jsx";
import Header from "./components/Header.jsx";
import MarketTicker from "./components/MarketTicker.jsx";
import Converter from "./components/Converter.jsx";
import HistoryPanel from "./components/HistoryPanel.jsx";
import PriceInsightCard from "./components/PriceInsightCard.jsx";
import Toast from "./components/Toast.jsx";
import HelpBot from "./components/HelpBot.jsx";
import { COINS, known } from "./data/assets.js";
import CoinIcon from "./components/CoinIcon.jsx";
import { IconTrendingUp, IconMessageCircle, IconZap, IconGithub } from "./components/Icons.jsx";
import { parseWithModel, parseFallback, fetchRates, fetchIcons, fetchPricesFor } from "./lib/api.js";
import { formatAmountSafe, formatAmount } from "./lib/format.js";
import {
  loadHistory,
  saveHistory,
  loadFavorites,
  saveFavorites,
  loadLastPair,
  saveLastPair,
} from "./lib/storage.js";

const NOT_UNDERSTOOD =
  'Belum kebaca nih maksudnya. Coba tulis kayak "250 USDT ke ETH", atau pilih asetnya manual aja.';

export default function App() {
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");
  const [fromSym, setFromSym] = useState("usdt");
  const [toSym, setToSym] = useState("btc");
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState("");
  const [offline, setOffline] = useState(false);

  const [query, setQuery] = useState("");
  const [icons, setIcons] = useState({});
  const [history, setHistory] = useState(() => loadHistory());
  const [favorites, setFavorites] = useState(() => loadFavorites());
  const [toasts, setToasts] = useState([]);
  const [justCopied, setJustCopied] = useState(false);

  const toastTimers = useRef(new Map());
  const toastSeq = useRef(0);
  const copiedTimer = useRef(null);
  /* Request harga yang sedang berjalan — dibatalkan setiap kali convert() */
  /* dipanggil lagi, biar respons lama yang telat nggak menimpa hasil     */
  /* yang lebih baru saat pengguna ganti aset dengan cepat.               */
  const activeRequest = useRef(null);

  /* Ikon token asli, diambil sekali untuk seluruh daftar aset. */
  useEffect(() => {
    const ids = Object.values(COINS)
      .map((c) => c.id)
      .join(",");
    fetchIcons(ids)
      .then(setIcons)
      .catch(() => {});
  }, []);

  /* Urutan prioritas pasangan awal: parameter URL (buat hasil yang       */
  /* dibagikan) > pasangan terakhir yang dipakai pengguna > default.      */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const f = params.get("from")?.toLowerCase();
    const t = params.get("to")?.toLowerCase();
    const a = params.get("amount");

    if (f && t && known(f) && known(t)) {
      setFromSym(f);
      setToSym(t);
      if (a) setAmount(a);
      convert({ from: f, to: t, amount: a || "1" });
      return;
    }

    const last = loadLastPair();
    if (last && known(last.from) && known(last.to)) {
      setFromSym(last.from);
      setToSym(last.to);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Maksimal 3 toast sekaligus, tiap satu hilang sendiri lewat timer-nya */
  /* masing-masing (bukan satu timer global) — jadi toast baru tidak      */
  /* memotong umur toast lain yang masih tampil.                          */
  function showToast(text, tone = "success") {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev, { id, text, tone }].slice(-3));
    const timer = setTimeout(() => dismissToast(id), 4000);
    toastTimers.current.set(id, timer);
  }

  function dismissToast(id) {
    clearTimeout(toastTimers.current.get(id));
    toastTimers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function pushHistory(entry) {
    setHistory((prev) => {
      const deduped = prev.filter(
        (h) => !(h.from === entry.from && h.to === entry.to && h.amount === entry.amount)
      );
      const next = [entry, ...deduped].slice(0, 5);
      saveHistory(next);
      return next;
    });
  }

  function updateUrl(from, to, amt) {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("from", from);
      u.searchParams.set("to", to);
      u.searchParams.set("amount", String(amt));
      window.history.replaceState(null, "", u.toString());
    } catch {
      /* URL API tidak tersedia di lingkungan tertentu — abaikan, tidak fatal */
    }
  }

  /* Jalur konversi tunggal, dipakai oleh Converter, Quick Command,       */
  /* riwayat, ticker, dan sinkronisasi URL — supaya hanya ada satu sumber */
  /* kebenaran untuk hasil yang ditampilkan.                              */
  async function convert(overrides = {}) {
    const from = (overrides.from ?? fromSym).toLowerCase();
    const to = (overrides.to ?? toSym).toLowerCase();
    const rawAmount = overrides.amount ?? amount;
    const amt = Number(String(rawAmount).trim().replace(",", "."));

    if (!String(rawAmount).trim()) {
      setAmountError("Isi dulu jumlahnya.");
      return;
    }
    if (!Number.isFinite(amt)) {
      setAmountError("Itu bukan angka ya, coba cek lagi.");
      return;
    }
    if (amt <= 0) {
      setAmountError("Jumlahnya harus lebih dari nol.");
      return;
    }
    setAmountError("");
    setStatus("loading");
    setMessage("");
    setOffline(false);
    setFromSym(from);
    setToSym(to);
    setAmount(String(rawAmount));

    /* Batalkan request sebelumnya (kalau masih jalan) sebelum mulai yang baru. */
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    try {
      const { rate, updatedAt } = await fetchRates(from, to, controller.signal);
      if (controller.signal.aborted) return; // sudah ditimpa request yang lebih baru
      const value = amt * rate;
      const res = { amount: amt, from, to, rate, value, updatedAt };
      setResult(res);
      setStatus("done");
      pushHistory({ amount: amt, from, to, rate, value, at: Date.now() });
      updateUrl(from, to, amt);
      saveLastPair(from, to);
    } catch (err) {
      if (controller.signal.aborted) return; // dibatalkan karena ada request baru, bukan error asli
      setStatus("error");
      const isOffline = err.message?.includes("Failed to fetch");
      setOffline(isOffline);
      setMessage(
        isOffline ? "Server-nya nggak merespons. Coba cek koneksi internet kamu." : err.message
      );
    }
  }

  async function runQuickCommand(text) {
    const q = text.trim();
    if (!q) return;
    setStatus("loading");
    setMessage("");
    setOffline(false);

    let parsed = null;
    try {
      parsed = await parseWithModel(q);
    } catch {
      parsed = parseFallback(q);
    }
    if (!parsed || parsed.error || !parsed.from || !parsed.to) {
      setStatus("error");
      setMessage(parsed?.error || NOT_UNDERSTOOD);
      return;
    }

    const from = String(parsed.from).toLowerCase();
    const to = String(parsed.to).toLowerCase();
    const amt = Number(parsed.amount) || 1;

    for (const s of [from, to]) {
      if (!known(s)) {
        setStatus("error");
        setMessage(`${s.toUpperCase()} belum ada di daftar aset yang aku kenal.`);
        return;
      }
    }

    await convert({ amount: amt, from, to });
  }

  function swapDirection() {
    if (result) {
      convert({ amount: result.value, from: result.to, to: result.from });
    } else {
      setFromSym(toSym);
      setToSym(fromSym);
    }
  }

  function reuseHistory(h) {
    convert({ amount: h.amount, from: h.from, to: h.to });
  }

  function clearHistory() {
    setHistory([]);
    saveHistory([]);
  }

  function onTickerSelect(sym) {
    setToSym(sym);
    document.getElementById("converter")?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (amount && Number(amount) > 0) {
      convert({ to: sym });
    }
  }

  function copyResult() {
    if (!result) return;
    // pakai nilai presisi penuh, bukan versi ringkas "< 0.000001" yang tampil di layar
    const text = `${formatAmountSafe(result.value, result.to).full} ${result.to.toUpperCase()}`;
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        showToast("Hasilnya udah disalin");
        setJustCopied(true);
        clearTimeout(copiedTimer.current);
        copiedTimer.current = setTimeout(() => setJustCopied(false), 1800);
      })
      .catch(() => {});
  }

  const isFav = favorites.some((f) => f.from === fromSym && f.to === toSym);
  function toggleFavorite() {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.from === fromSym && f.to === toSym);
      const next = exists
        ? prev.filter((f) => !(f.from === fromSym && f.to === toSym))
        : [{ from: fromSym, to: toSym }, ...prev].slice(0, 8);
      saveFavorites(next);
      return next;
    });
    showToast(isFav ? "Oke, dihapus dari favorit" : "Masuk favorit!");
  }

  function shareResult() {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("from", fromSym);
      u.searchParams.set("to", toSym);
      if (amount) u.searchParams.set("amount", amount);
      navigator.clipboard
        ?.writeText(u.toString())
        .then(() => showToast("Link-nya udah disalin, tinggal share"))
        .catch(() => {});
    } catch {
      /* tidak fatal kalau URL API tidak tersedia */
    }
  }

  return (
    <div className="psa-app">
      <Starfield />
      <div className="psa-content">
        <Header />
        <MarketTicker onSelect={onTickerSelect} />

        <main className="psa-main">
          <div className="psa-shell">
            <div className="psa-hero">
              <h1 className="psa-h1">Panca Swap Agent</h1>
              <p className="psa-subtitle">Konversi cepat antar aset kripto dengan harga pasar terbaik.</p>
            </div>

            <div className="psa-stack">
              <div className="psa-converter-shell" id="converter">
                <Converter
                  amount={amount}
                  onAmountChange={(v) => {
                    setAmount(v);
                    if (amountError) setAmountError("");
                  }}
                  fromSym={fromSym}
                  onFromChange={setFromSym}
                  toSym={toSym}
                  onToChange={setToSym}
                  onSwap={swapDirection}
                  onConvert={() => convert()}
                  status={status}
                  result={result}
                  amountError={amountError}
                  icons={icons}
                  query={query}
                  onQueryChange={setQuery}
                  onRunQuickCommand={runQuickCommand}
                  message={message}
                  offline={offline}
                  onRefresh={() => convert()}
                  onCopyResult={copyResult}
                  justCopied={justCopied}
                  onShare={shareResult}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={isFav}
                />
              </div>

              {favorites.length > 0 && (
                <div className="psa-card psa-quick">
                  <div className="psa-quick-head">
                    <h2 className="psa-quick-title">Pasangan favorit</h2>
                  </div>
                  <div className="psa-chip-row">
                    {favorites.map((f) => (
                      <button
                        key={`${f.from}-${f.to}`}
                        className="psa-chip"
                        onClick={() => convert({ from: f.from, to: f.to, amount: amount || "1" })}
                      >
                        {f.from.toUpperCase()} → {f.to.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <PopularPairs icons={icons} onSelect={(f, t) => convert({ from: f, to: t, amount: amount || "1" })} />

              <div className="psa-insight-row">
                <HistoryPanel
                  history={history}
                  onReuse={reuseHistory}
                  onClear={clearHistory}
                  icons={icons}
                />
                <PriceInsightCard fromSym={fromSym} toSym={toSym} icons={icons} />
              </div>

              <WhyPancaSwap />

              <section id="about" className="psa-card psa-about">
                <h2 className="psa-about-title">Tentang Panca Swap</h2>
                <p className="psa-about-text">
                  Ini sebenarnya cuma kalkulator, bukan exchange beneran. Ketik kalimat biasa kayak
                  "250 USDT ke ETH" atau pilih sendiri asetnya, nanti dihitungin pakai harga dari
                  CoinGecko. Nggak ada dompet yang tersambung, nggak ada dana yang disimpan, dan
                  nggak ada transaksi asli yang jalan — murni buat lihat-lihat kurs aja.
                </p>
                <p className="psa-about-privacy">
                  Soal data: riwayat, favorit, dan pasangan aset terakhir kamu cuma disimpan di
                  browser kamu sendiri (localStorage), bukan di server. Nggak ada analytics atau
                  pelacakan apa pun di situs ini.
                </p>
              </section>
            </div>
          </div>
        </main>

        <SiteFooter />
      </div>

      <HelpBot />
      <div className="psa-toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <Toast key={t.id} text={t.text} tone={t.tone} onClose={() => dismissToast(t.id)} />
        ))}
      </div>
    </div>
  );
}

/* S: pasangan populer — jalan pintas ke pasangan yang paling sering dicari. */
const POPULAR_PAIRS = [
  { from: "btc", to: "idr" },
  { from: "eth", to: "usdt" },
  { from: "usdt", to: "idr" },
  { from: "sol", to: "usdt" },
];

function PopularPairs({ icons, onSelect }) {
  // Harga dasar (bukan kurs — cuma buat konteks di kartu), di-cache 20s
  // di server jadi murah untuk dipanggil terpisah dari ticker utama.
  const [prices, setPrices] = useState(null);
  useEffect(() => {
    let alive = true;
    const symbols = [...new Set(POPULAR_PAIRS.map((p) => p.from))];
    fetchPricesFor(symbols)
      .then((d) => alive && setPrices(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="psa-section" aria-labelledby="psa-popular-title">
      <h2 id="psa-popular-title" className="psa-section-title">
        Pasangan populer
      </h2>
      <div className="psa-popular-scroll">
        <div className="psa-popular-row">
          {POPULAR_PAIRS.map((p) => {
            const fromMeta = COINS[p.from];
            const entry = fromMeta ? prices?.[fromMeta.id] : null;
            const change = entry?.usd_24h_change;
            const up = typeof change === "number" && change >= 0;
            return (
              <button
                key={`${p.from}-${p.to}`}
                className="psa-popular-card"
                onClick={() => onSelect(p.from, p.to)}
              >
                <CoinIcon sym={p.from} size={26} iconUrl={fromMeta ? icons[fromMeta.id] : undefined} />
                <span className="psa-popular-info">
                  <span className="psa-popular-pair">
                    {p.from.toUpperCase()}/{p.to.toUpperCase()}
                  </span>
                  <span className="psa-popular-price">
                    {entry?.usd != null ? `$${formatAmount(entry.usd, "usd")}` : "—"}
                    {typeof change === "number" && (
                      <span className={up ? "psa-ticker-up" : "psa-ticker-down"}>
                        {" "}
                        {up ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* S: kenapa pakai Panca Swap — tiga keunggulan singkat, bukan section besar. */
const WHY_ITEMS = [
  {
    Icon: IconTrendingUp,
    title: "Harga real time",
    text: "Langsung dari CoinGecko, bukan angka basi.",
  },
  {
    Icon: IconMessageCircle,
    title: "Bahasa natural",
    text: "Ketik “250 USDT ke ETH”, nggak perlu isi form.",
  },
  {
    Icon: IconZap,
    title: "Cepat & simpel",
    text: "Nggak ada akun, nggak ada dompet, langsung pakai.",
  },
];

function WhyPancaSwap() {
  return (
    <section className="psa-section" aria-labelledby="psa-why-title">
      <h2 id="psa-why-title" className="psa-section-title">
        Kenapa Panca Swap
      </h2>
      <div className="psa-why-grid">
        {WHY_ITEMS.map(({ Icon, title, text }) => (
          <div className="psa-why-card" key={title}>
            <span className="psa-why-icon">
              <Icon size={20} />
            </span>
            <h3 className="psa-why-card-title">{title}</h3>
            <p className="psa-why-card-text">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="psa-footer">
      <div className="psa-footer-inner">
        <p className="psa-footer-copyright">© {year} Panca Swap. All rights reserved.</p>

        <nav className="psa-footer-links" aria-label="Tautan footer">
          {/* Belum ada halaman dokumentasi/syarat terpisah — diarahkan ke  */}
          {/* bagian yang paling relevan di halaman ini, bukan link mati.  */}
          <a href="https://github.com/febriansyahpanca03/CONVERTER-CRYPTO" target="_blank" rel="noopener">
            Dokumentasi
          </a>
          <a href="#about">Kebijakan Privasi</a>
          <a href="#about">Syarat &amp; Ketentuan</a>
          <a
            href="https://github.com/febriansyahpanca03/CONVERTER-CRYPTO/issues"
            target="_blank"
            rel="noopener"
            aria-label="Laporkan masalah di GitHub"
            title="Laporkan masalah"
          >
            <IconGithub size={16} />
          </a>
        </nav>
      </div>
      <p className="psa-footer-disclaimer">Data hanya untuk tujuan informasi, bukan nasihat finansial.</p>
    </footer>
  );
}
