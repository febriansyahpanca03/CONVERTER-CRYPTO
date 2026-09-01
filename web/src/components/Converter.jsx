import { useEffect, useRef } from "react";
import CoinSelect from "./CoinSelect.jsx";
import { formatAmount } from "../lib/format.js";

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

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  return (
    <div className="psa-card psa-converter" id="converter">
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
          onClick={onSwap}
          disabled={loading}
          title="Tukar arah aset"
          aria-label="Tukar arah aset asal dan tujuan"
        >
          ⇅
        </button>
      </div>

      <div className="psa-field">
        <div className="psa-field-label">Kamu dapat ≈</div>
        <div className="psa-field-row">
          <span className={`psa-result-value ${showResult ? "is-primary" : ""}`} aria-live="polite">
            {loading ? "…" : showResult ? formatAmount(result.value, toSym) : "0"}
          </span>
          <CoinSelect value={toSym} onChange={onToChange} icons={icons} label="Aset tujuan" />
        </div>
      </div>

      <button className="psa-convert-btn" onClick={onConvert} disabled={loading}>
        {loading ? "Menghitung…" : "Konversi"}
      </button>
    </div>
  );
}
