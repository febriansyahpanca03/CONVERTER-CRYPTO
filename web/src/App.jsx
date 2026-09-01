import { useEffect, useRef, useState } from "react";
import Starfield from "./components/Starfield.jsx";
import Header from "./components/Header.jsx";
import MarketTicker from "./components/MarketTicker.jsx";
import Converter from "./components/Converter.jsx";
import QuickCommand from "./components/QuickCommand.jsx";
import PriceMeta from "./components/PriceMeta.jsx";
import HistoryPanel from "./components/HistoryPanel.jsx";
import Toast from "./components/Toast.jsx";
import HelpBot from "./components/HelpBot.jsx";
import { COINS, known } from "./data/assets.js";
import { parseWithModel, parseFallback, fetchRates, fetchIcons } from "./lib/api.js";
import { formatAmount } from "./lib/format.js";
import { loadHistory, saveHistory, loadFavorites, saveFavorites } from "./lib/storage.js";

const NOT_UNDERSTOOD =
  'Kami belum memahami perintah tersebut. Coba tulis "250 USDT ke ETH" atau pilih aset secara manual.';

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
  const [toast, setToast] = useState("");

  const toastTimer = useRef(null);

  /* Ikon token asli, diambil sekali untuk seluruh daftar aset. */
  useEffect(() => {
    const ids = Object.values(COINS)
      .map((c) => c.id)
      .join(",");
    fetchIcons(ids)
      .then(setIcons)
      .catch(() => {});
  }, []);

  /* Sinkron dari URL (?from=&to=&amount=) supaya hasil bisa dibagikan. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const f = params.get("from")?.toLowerCase();
    const t = params.get("to")?.toLowerCase();
    const a = params.get("amount");
    if (f && known(f)) setFromSym(f);
    if (t && known(t)) setToSym(t);
    if (a) setAmount(a);
    if (f && t && known(f) && known(t)) {
      convert({ from: f, to: t, amount: a || "1" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(text) {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
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
      setAmountError("Masukkan jumlah terlebih dahulu.");
      return;
    }
    if (!Number.isFinite(amt)) {
      setAmountError("Masukkan angka yang valid.");
      return;
    }
    if (amt <= 0) {
      setAmountError("Jumlah harus lebih dari nol.");
      return;
    }
    setAmountError("");
    setStatus("loading");
    setMessage("");
    setOffline(false);
    setFromSym(from);
    setToSym(to);
    setAmount(String(rawAmount));

    try {
      const { rate, updatedAt } = await fetchRates(from, to);
      const value = amt * rate;
      const res = { amount: amt, from, to, rate, value, updatedAt };
      setResult(res);
      setStatus("done");
      pushHistory({ amount: amt, from, to, rate, value, at: Date.now() });
      updateUrl(from, to, amt);
    } catch (err) {
      setStatus("error");
      const isOffline = err.message?.includes("Failed to fetch");
      setOffline(isOffline);
      setMessage(
        isOffline ? "Server tidak merespons. Periksa koneksi internet kamu." : err.message
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
        setMessage(`${s.toUpperCase()} belum ada di daftar aset yang didukung.`);
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
    const text = `${formatAmount(result.value, result.to)} ${result.to.toUpperCase()}`;
    navigator.clipboard
      ?.writeText(text)
      .then(() => showToast("Hasil disalin ke clipboard"))
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
    showToast(isFav ? "Dihapus dari favorit" : "Ditambahkan ke favorit");
  }

  function shareResult() {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("from", fromSym);
      u.searchParams.set("to", toSym);
      if (amount) u.searchParams.set("amount", amount);
      navigator.clipboard
        ?.writeText(u.toString())
        .then(() => showToast("Tautan hasil disalin, siap dibagikan"))
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
          <div className="psa-hero">
            <h1 className="psa-h1">Panca Swap Agent</h1>
            <p className="psa-subtitle">
              Crypto converter — hitung konversi harga crypto secara real-time dengan input bahasa
              natural atau pilih aset secara manual.
            </p>
          </div>

          <div className="psa-stack">
            <div>
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
              />
              <PriceMeta
                status={status}
                result={result}
                message={message}
                offline={offline}
                fromSym={fromSym}
                toSym={toSym}
                onRefresh={() => convert()}
              />
              {status === "done" && result && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    justifyContent: "center",
                    padding: "0 var(--space-5) var(--space-5)",
                  }}
                >
                  <button className="psa-icon-btn" onClick={copyResult} title="Salin hasil" aria-label="Salin hasil">
                    ⧉ <span style={{ fontSize: 12, marginLeft: 4 }}>Salin</span>
                  </button>
                  <button
                    className="psa-icon-btn"
                    onClick={shareResult}
                    title="Bagikan hasil"
                    aria-label="Bagikan hasil"
                  >
                    ↗ <span style={{ fontSize: 12, marginLeft: 4 }}>Bagikan</span>
                  </button>
                  <button
                    className="psa-icon-btn"
                    onClick={toggleFavorite}
                    title={isFav ? "Hapus dari favorit" : "Tambah ke favorit"}
                    aria-label={isFav ? "Hapus dari favorit" : "Tambah ke favorit"}
                    style={isFav ? { color: "var(--warning)" } : undefined}
                  >
                    {isFav ? "★" : "☆"} <span style={{ fontSize: 12, marginLeft: 4 }}>Favorit</span>
                  </button>
                </div>
              )}
            </div>

            <QuickCommand query={query} onQueryChange={setQuery} onRun={runQuickCommand} status={status} />

            {favorites.length > 0 && (
              <div className="psa-card psa-quick">
                <div className="psa-quick-head">
                  <span className="psa-quick-title">Pasangan favorit</span>
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

            <HistoryPanel history={history} onReuse={reuseHistory} onClear={clearHistory} />

            <section id="about" className="psa-card" style={{ padding: "var(--space-5)" }}>
              <h2 style={{ fontSize: 16, margin: "0 0 8px" }}>Tentang Panca Swap Agent</h2>
              <p style={{ margin: 0, fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.7 }}>
                Panca Swap Agent adalah alat bantu hitung konversi harga crypto dan mata uang, memakai
                harga real-time dari CoinGecko dan parsing bahasa natural dari model AI (Groq). Aplikasi
                ini murni kalkulator estimasi — tidak menyimpan dana, tidak terhubung ke dompet
                (wallet), dan tidak melakukan transaksi sungguhan apa pun.
              </p>
            </section>
          </div>
        </main>

        <footer className="psa-footer">
          <p>
            Panca Swap Agent · Harga oleh{" "}
            <a href="https://www.coingecko.com" target="_blank" rel="noopener">
              CoinGecko
            </a>{" "}
            · Parsing bahasa oleh{" "}
            <a href="https://groq.com" target="_blank" rel="noopener">
              Groq
            </a>
          </p>
        </footer>
      </div>

      <HelpBot />
      <Toast message={toast} />
    </div>
  );
}
