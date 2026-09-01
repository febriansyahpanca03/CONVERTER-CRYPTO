import { formatAmount, formatClock } from "../lib/format.js";

/* Riwayat 5 konversi terakhir, tersimpan di localStorage browser saja  */
/* (tidak ada server/database) — sesuai arsitektur backend yang         */
/* stateless.                                                            */
export default function HistoryPanel({ history, onReuse, onClear }) {
  return (
    <div className="psa-card psa-history">
      <div className="psa-history-head">
        <span className="psa-history-title">Riwayat terakhir</span>
        {history.length > 0 && (
          <button className="psa-history-clear" onClick={onClear}>
            Hapus riwayat
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="psa-history-empty">Belum ada apa-apa di sini. Coba hitung sesuatu dulu.</p>
      ) : (
        <div className="psa-history-list">
          {history.map((h, i) => (
            <button
              key={`${h.from}-${h.to}-${h.amount}-${h.at}-${i}`}
              className="psa-history-item"
              onClick={() => onReuse(h)}
            >
              <span className="psa-history-pair">
                {formatAmount(h.amount, h.from)} {h.from.toUpperCase()} → {h.to.toUpperCase()}
                <span className="psa-history-time">{formatClock(h.at)}</span>
              </span>
              <span className="psa-history-value">{formatAmount(h.value, h.to)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
