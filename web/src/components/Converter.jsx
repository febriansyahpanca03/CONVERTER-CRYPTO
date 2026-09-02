import { useEffect, useRef, useState } from "react";
import CoinSelect from "./CoinSelect.jsx";
import PriceMeta from "./PriceMeta.jsx";
import { formatAmountSafe } from "../lib/format.js";
import {
  IconSwapVertical,
  IconBolt,
  IconInfo,
  IconCopy,
  IconCheck,
  IconShare,
  IconStar,
} from "./Icons.jsx";

const SAMPLES = ["250 USDT ke ETH", "1 BTC ke IDR", "0.5 ETH ke SOL", "10 SOL ke DOGE"];

/* Satu kartu utama: Quick Command di atas (buat yang mau ketik bebas),  */
/* form terstruktur di bawahnya (buat yang mau pilih manual) — dua-duanya */
/* berbagi hasil yang sama, bukan dua fitur terpisah.                    */
export default function Converter({
  amount,
  onAmountChange,
  fromSym,
  onFromChange,
  toSym,
  onToChange,
  onSwap,
  onConvert,
  status,
  result,
  amountError,
  icons,
  query,
  onQueryChange,
  onRunQuickCommand,
  message,
  offline,
  onRefresh,
  onCopyResult,
  justCopied,
  onShare,
  onToggleFavorite,
  isFavorite,
}) {
  const loading = status === "loading";
  const showResult = status === "done" && result;
  const amountRef = useRef(null);
  const resultDisplay = showResult ? formatAmountSafe(result.value, toSym) : null;
  // Putaran 180 derajat tiap klik tombol swap — bukan cuma efek hover,
  // biar terasa sebagai respons nyata terhadap aksi pengguna.
  const [swapTurns, setSwapTurns] = useState(0);
  const [copiedPay, setCopiedPay] = useState(false);

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  function handleSwap() {
    setSwapTurns((n) => n + 1);
    onSwap();
  }

  function copyPay() {
    if (!amount) return;
    navigator.clipboard
      ?.writeText(`${amount} ${fromSym.toUpperCase()}`)
      .then(() => {
        setCopiedPay(true);
        setTimeout(() => setCopiedPay(false), 1500);
      })
      .catch(() => {});
  }

  return (
    <div className="psa-converter">
      <h2 className="psa-converter-title">Crypto Converter</h2>

      <div className="psa-qc">
        <div className="psa-qc-head">
          <span className="psa-qc-label">Quick Command</span>
          <span
            className="psa-info-dot"
            tabIndex={0}
            title="Ketik kalimat bebas, misalnya “250 USDT ke ETH”, terus tekan Hitung."
            aria-label="Info Quick Command"
          >
            <IconInfo size={13} />
          </span>
        </div>
        <div className="psa-qc-row">
          <IconBolt size={16} className="psa-qc-icon" aria-hidden="true" />
          <label htmlFor="psa-quick-input" className="visually-hidden">
            Perintah bahasa natural, contoh 250 USDT ke ETH
          </label>
          <input
            id="psa-quick-input"
            className="psa-qc-input"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onRunQuickCommand(query)}
            placeholder="Contoh: 250 USDT ke ETH"
            disabled={loading}
          />
          <button
            className="psa-qc-go"
            onClick={() => onRunQuickCommand(query)}
            disabled={loading}
          >
            {loading ? "…" : "Hitung"}
          </button>
        </div>
        <div className="psa-chip-scroll">
          <div className="psa-chip-row">
            {SAMPLES.map((s) => (
              <button
                key={s}
                className={`psa-chip ${query === s ? "is-active" : ""}`}
                onClick={() => {
                  onQueryChange(s);
                  onRunQuickCommand(s);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="psa-divider" />

      <div className="psa-field">
        <div className="psa-field-top">
          <span className="psa-field-label">Anda membayar</span>
          <button
            className="psa-field-copy"
            onClick={copyPay}
            title="Salin jumlah"
            aria-label="Salin jumlah yang dibayar"
            type="button"
          >
            {copiedPay ? <IconCheck size={13} /> : <IconCopy size={13} />}
          </button>
        </div>
        <div className="psa-field-row">
          <label htmlFor="psa-amount" className="visually-hidden">
            Jumlah yang dibayar
          </label>
          <input
            id="psa-amount"
            ref={amountRef}
            className="psa-amount-input"
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onConvert()}
            aria-invalid={Boolean(amountError)}
            aria-describedby={amountError ? "psa-amount-error" : undefined}
          />
          <CoinSelect value={fromSym} onChange={onFromChange} icons={icons} label="Aset asal" />
        </div>
        {amountError && (
          <div className="psa-field-hint" id="psa-amount-error" role="alert">
            {amountError}
          </div>
        )}
      </div>

      <div className="psa-swap-row">
        <button
          className="psa-swap-btn"
          onClick={handleSwap}
          disabled={loading}
          title="Tukar arah aset"
          aria-label="Tukar arah aset asal dan tujuan"
          style={{ transform: `rotate(${swapTurns * 180}deg)` }}
        >
          <IconSwapVertical size={18} />
        </button>
      </div>

      <div className="psa-field">
        <div className="psa-field-top">
          <span className="psa-field-label">Anda menerima</span>
          <button
            className="psa-field-copy"
            onClick={onCopyResult}
            title="Salin hasil"
            aria-label="Salin hasil"
            disabled={!showResult}
            type="button"
          >
            {justCopied ? <IconCheck size={13} /> : <IconCopy size={13} />}
          </button>
        </div>
        <div className="psa-field-row">
          <span
            key={showResult ? `${result.from}-${result.to}-${result.value}-${result.updatedAt}` : "empty"}
            className={`psa-result-value ${showResult ? "psa-result-pop" : ""}`}
            aria-live="polite"
            title={resultDisplay?.isApprox ? `Nilai lengkap: ${resultDisplay.full} ${toSym.toUpperCase()}` : undefined}
          >
            {loading ? "…" : resultDisplay ? resultDisplay.text : "0"}
          </span>
          <CoinSelect value={toSym} onChange={onToChange} icons={icons} label="Aset tujuan" />
        </div>
      </div>

      <PriceMeta
        variant="inline"
        status={status}
        result={result}
        message={message}
        offline={offline}
        fromSym={fromSym}
        toSym={toSym}
        onRefresh={onRefresh}
      />

      {showResult && (
        <div className="psa-result-actions">
          <button className="psa-icon-btn" onClick={onShare} title="Bagikan hasil" aria-label="Bagikan hasil">
            <IconShare size={15} />
          </button>
          <button
            className={`psa-icon-btn ${isFavorite ? "is-fav" : ""}`}
            onClick={onToggleFavorite}
            title={isFavorite ? "Hapus dari favorit" : "Tambah ke favorit"}
            aria-label={isFavorite ? "Hapus dari favorit" : "Tambah ke favorit"}
          >
            <IconStar size={15} filled={isFavorite} />
          </button>
        </div>
      )}

      <button className="psa-convert-btn" onClick={onConvert} disabled={loading}>
        {loading && <span className="psa-spinner" aria-hidden="true" />}
        {loading ? "Mengambil harga…" : "Konversi"}
      </button>
    </div>
  );
}
