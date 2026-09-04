import { PERIODS, PERIOD_LABEL } from "../../lib/chart.js";
import Tooltip from "../Tooltip.jsx";

/* Pilihan periode (1J/24J/7H/30H/1T) — kontrol terpisah dari Garis/     */
/* Candle di atasnya, biar nggak numpuk jadi satu area yang padat.       */
/* Discroll horizontal di layar sempit lewat CSS (lihat .psa-chart-tf).  */
export default function TimeframeSelector({ value, onChange }) {
  return (
    <div className="psa-chart-tf" role="group" aria-label="Periode grafik">
      {PERIODS.map((p) => (
        <Tooltip key={p} label={PERIOD_LABEL[p]}>
          {(ttId) => (
            <button
              type="button"
              className={`psa-chart-tf-btn ${value === p ? "is-active" : ""}`}
              aria-pressed={value === p}
              aria-label={PERIOD_LABEL[p]}
              aria-describedby={ttId}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          )}
        </Tooltip>
      ))}
    </div>
  );
}
