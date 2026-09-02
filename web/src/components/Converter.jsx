import { useEffect, useRef, useState } from "react";
import CoinSelect from "./CoinSelect.jsx";
import { formatAmountSafe } from "../lib/format.js";
import { IconSwapVertical } from "./Icons.jsx";

/* Mode utama: input jumlah + pilih aset asal/tujuan secara eksplisit,   */
/* bukan cuma mengandalkan kalimat bebas. Ini yang jadi pusat perhatian */
/* halaman.                                                              */
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
}) {
  const loading = status === "loading";
  const showResult = status === "done" && result;
  const amountRef = useRef(null);
  const resultDisplay = showResult ? formatAmountSafe(result.value, toSym) : null;
  // Putaran 180 derajat tiap klik tombol swap — bukan cuma efek hover,
  // biar terasa sebagai respons nyata terhadap aksi pengguna.
  const [swapTurns, setSwapTurns] = useState(0);

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  function handleSwap() {
    setSwapTurns((n) => n + 1);
    onSwap();
  }

  return (
    <div className="psa-converter">
      <h2 className="visually-hidden">Converter</h2>
      <div className="psa-field">
        <div className="psa-field-label">Kamu bayar</div>
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
        <div className="psa-field-label">Kamu dapat ≈</div>
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

      <button className="psa-convert-btn" onClick={onConvert} disabled={loading}>
        {loading && <span className="psa-spinner" aria-hidden="true" />}
        {loading ? "Mengambil harga…" : "Konversi"}
      </button>
    </div>
  );
}
