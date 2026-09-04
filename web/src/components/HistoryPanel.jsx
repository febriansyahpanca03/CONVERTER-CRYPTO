import { useState } from "react";
import { formatAmount, relativeTime } from "../lib/format.js";
import { COINS } from "../data/assets.js";
import CoinIcon from "./CoinIcon.jsx";
import { IconCopy, IconCheck } from "./Icons.jsx";

const VISIBLE_DEFAULT = 3;

/* Riwayat konversi (maksimal 5 tersimpan), tersimpan di localStorage    */
/* browser saja (tidak ada server/database) — sesuai arsitektur backend  */
/* yang stateless. Cuma 3 baris ditampilkan dulu supaya halaman tidak    */
/* kepanjangan, sisanya lewat "Lihat semua".                             */
export default function HistoryPanel({ history, onReuse, onClear, icons, onStart }) {
  const [expanded, setExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const visible = expanded ? history : history.slice(0, VISIBLE_DEFAULT);

  function copyEntry(e, h, id) {
    e.stopPropagation();
    const text = `${formatAmount(h.amount, h.from)} ${h.from.toUpperCase()} = ${formatAmount(h.value, h.to)} ${h.to.toUpperCase()}`;
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
      })
      .catch(() => {});
  }

  return (
    <div className="psa-card psa-history">
      <div className="psa-history-head">
        <h2 className="psa-history-title">Riwayat Konversi</h2>
        {history.length > 0 && (
          <div className="psa-history-head-actions">
            {history.length > VISIBLE_DEFAULT && (
              <button className="psa-history-viewall" onClick={() => setExpanded((v) => !v)}>
                {expanded ? "Sembunyikan" : "Lihat semua"}
              </button>
            )}
            <button className="psa-history-clear" onClick={onClear}>
              Hapus
            </button>
          </div>
        )}
      </div>

      {history.length === 0 ? (
        <div className="psa-history-blank">
          {/* Ikon garis sederhana, bukan ilustrasi besar — kartunya tetap
              berperan sebagai pelengkap, bukan penarik perhatian. */}
          <svg
            className="psa-history-blank-icon"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v4h4" />
            <path d="M12 8v4l3 2" />
          </svg>
          <span className="psa-history-blank-title">Belum ada riwayat</span>
          <p className="psa-history-blank-text">Hasil konversi terbarumu akan muncul di sini.</p>
          {onStart && (
            <button type="button" className="psa-history-blank-cta" onClick={onStart}>
              Mulai konversi
            </button>
          )}
        </div>
      ) : (
        <div className="psa-history-table-wrap">
          <table className="psa-history-table">
            <thead>
              <tr>
                <th>Dari</th>
                <th>Ke</th>
                <th>Jumlah</th>
                <th>Hasil</th>
                <th>Waktu</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((h, i) => {
                const id = `${h.from}-${h.to}-${h.amount}-${h.at}-${i}`;
                const fromMeta = COINS[h.from];
                const toMeta = COINS[h.to];
                return (
                  <tr key={id} onClick={() => onReuse(h)} title="Pakai lagi pasangan ini">
                    <td data-label="Dari">
                      <span className="psa-history-coin">
                        <CoinIcon sym={h.from} size={20} iconUrl={fromMeta ? icons?.[fromMeta.id] : undefined} />
                        {h.from.toUpperCase()}
                      </span>
                    </td>
                    <td data-label="Ke">
                      <span className="psa-history-coin">
                        <CoinIcon sym={h.to} size={20} iconUrl={toMeta ? icons?.[toMeta.id] : undefined} />
                        {h.to.toUpperCase()}
                      </span>
                    </td>
                    <td data-label="Jumlah">{formatAmount(h.amount, h.from)}</td>
                    <td data-label="Hasil">
                      {formatAmount(h.value, h.to)} {h.to.toUpperCase()}
                    </td>
                    <td className="psa-history-time" data-label="Waktu">
                      {relativeTime(h.at)}
                    </td>
                    <td data-label="Status">
                      <span className="psa-history-status-row">
                        <span className="psa-history-status">Selesai</span>
                        <button
                          className="psa-icon-btn"
                          onClick={(e) => copyEntry(e, h, id)}
                          title="Salin"
                          aria-label="Salin hasil ini"
                        >
                          {copiedId === id ? <IconCheck size={14} /> : <IconCopy size={14} />}
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Ringkasan tipis: mengisi sisa ruang kartu (yang tingginya disamakan
          dengan chart di desktop) dengan informasi yang berguna, bukan
          dibiarkan kosong. Semuanya dihitung dari riwayat yang sudah ada
          di localStorage — tidak ada data baru yang diambil. */}
      {history.length > 0 && (
        <div className="psa-history-summary">
          <span>
            <strong>{history.length}</strong> konversi tersimpan
          </span>
          <span>
            Terakhir:{" "}
            <strong>
              {history[0].from.toUpperCase()} → {history[0].to.toUpperCase()}
            </strong>
          </span>
          <span>
            Aktivitas: <strong>{relativeTime(history[0].at)}</strong>
          </span>
        </div>
      )}
    </div>
  );
}
