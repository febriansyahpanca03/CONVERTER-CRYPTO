/* Segmented control Garis|Candle — pakai aria-pressed di tiap tombol    */
/* (bukan radiogroup) supaya tetap sederhana dan tetap bisa dipakai      */
/* dengan Tab biasa, konsisten dengan tombol lain di situs ini.          */
export default function ChartTypeToggle({ value, onChange, candleDisabled, candleDisabledReason }) {
  return (
    <div className="psa-chart-toggle" role="group" aria-label="Jenis grafik">
      <button
        type="button"
        className={`psa-chart-toggle-btn ${value === "line" ? "is-active" : ""}`}
        aria-pressed={value === "line"}
        onClick={() => onChange("line")}
      >
        Garis
      </button>
      <button
        type="button"
        className={`psa-chart-toggle-btn ${value === "candle" ? "is-active" : ""} ${candleDisabled ? "is-disabled" : ""}`}
        aria-pressed={value === "candle"}
        aria-disabled={candleDisabled || undefined}
        aria-label={candleDisabled ? `Candle (nonaktif — ${candleDisabledReason})` : "Candle"}
        onClick={() => !candleDisabled && onChange("candle")}
        title={candleDisabled ? candleDisabledReason : undefined}
      >
        Candle
      </button>
    </div>
  );
}
