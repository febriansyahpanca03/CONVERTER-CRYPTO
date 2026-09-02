import { formatAmount, formatChartTime } from "../../lib/format.js";

/* Baris info OHLC/harga — SELALU tampil (bukan cuma muncul pas hover),  */
/* isinya berganti mengikuti crosshair. Ini yang bikin info OHLC bisa    */
/* diakses tanpa bergantung ke hover: pengguna keyboard/pembaca layar    */
/* tetap dapat titik data terakhir sebagai default-nya.                  */
export default function ChartTooltip({ type, point, quoteSym }) {
  if (!point) return null;

  if (type === "candle") {
    const up = point.close >= point.open;
    return (
      <div className="psa-chart-ohlc" aria-live="polite">
        <span className="psa-chart-ohlc-time">{formatChartTime(point.time)}</span>
        <span>
          O <strong>{formatAmount(point.open, quoteSym)}</strong>
        </span>
        <span>
          H <strong>{formatAmount(point.high, quoteSym)}</strong>
        </span>
        <span>
          L <strong>{formatAmount(point.low, quoteSym)}</strong>
        </span>
        <span>
          C{" "}
          <strong className={up ? "psa-ticker-up" : "psa-ticker-down"}>
            {formatAmount(point.close, quoteSym)}
          </strong>
        </span>
      </div>
    );
  }

  return (
    <div className="psa-chart-ohlc" aria-live="polite">
      <span className="psa-chart-ohlc-time">{formatChartTime(point.time)}</span>
      <span>
        Harga <strong>{formatAmount(point.price, quoteSym)}</strong>
      </span>
    </div>
  );
}
