import { useState } from "react";
import { formatAmount, relativeTime } from "../lib/format.js";
import { COINS } from "../data/assets.js";
import CoinIcon from "./CoinIcon.jsx";
import { IconClock, IconCopy, IconCheck, IconSwapVertical, IconTrash, IconChevronDown } from "./Icons.jsx";

const VISIBLE_DEFAULT = 3;

/* Riwayat konversi (maksimal 5 tersimpan), tersimpan di localStorage    */
/* browser saja (tidak ada server/database) — sesuai arsitektur backend  */
/* yang stateless. Cuma 3 item ditampilkan dulu supaya halaman tidak     */
/* kepanjangan, sisanya bisa dibuka lewat "Lihat semua".                 */
export default function HistoryPanel({ history, onReuse, onClear, icons }) {
  const [expanded, setExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const visible = expanded ? history : history.slice(0, VISIBLE_DEFAULT);

  function copyEntry(h, id) {
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
        <h2 className="psa-history-title">Riwayat terakhir</h2>
        {history.length > 0 && (
          <button className="psa-history-clear" onClick={onClear}>
            <IconTrash size={14} />
            Hapus
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <p className="psa-history-empty">Belum ada apa-apa di sini. Coba hitung sesuatu dulu.</p>
      ) : (
        <>
          <div className="psa-history-list">
            {visible.map((h, i) => {
              const id = `${h.from}-${h.to}-${h.amount}-${h.at}-${i}`;
              const fromMeta = COINS[h.from];
              const toMeta = COINS[h.to];
              return (
                <div className="psa-history-item" key={id}>
                  <button className="psa-history-main" onClick={() => onReuse(h)} title="Pakai lagi pasangan ini">
                    <span className="psa-history-icons">
                      <CoinIcon sym={h.from} size={22} iconUrl={fromMeta ? icons?.[fromMeta.id] : undefined} />
                      <CoinIcon sym={h.to} size={22} iconUrl={toMeta ? icons?.[toMeta.id] : undefined} />
                    </span>
                    <span className="psa-history-info">
                      <span className="psa-history-pair">
                        {h.from.toUpperCase()} → {h.to.toUpperCase()}
                      </span>
                      <span className="psa-history-amounts">
                        {formatAmount(h.amount, h.from)} {h.from.toUpperCase()} = {formatAmount(h.value, h.to)}{" "}
                        {h.to.toUpperCase()}
                      </span>
                    </span>
                  </button>
                  <span className="psa-history-time">
                    <IconClock size={12} />
                    {relativeTime(h.at)}
                  </span>
                  <span className="psa-history-actions">
                    <button
                      className="psa-icon-btn"
                      onClick={() => copyEntry(h, id)}
                      title="Salin"
                      aria-label="Salin hasil ini"
                    >
                      {copiedId === id ? <IconCheck size={15} /> : <IconCopy size={15} />}
                    </button>
                    <button
                      className="psa-icon-btn"
                      onClick={() => onReuse(h)}
                      title="Pakai lagi"
                      aria-label="Pakai lagi pasangan ini"
                    >
                      <IconSwapVertical size={15} />
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
          {history.length > VISIBLE_DEFAULT && (
            <button className="psa-history-more" onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Sembunyikan" : `Lihat semua (${history.length})`}
              <IconChevronDown size={14} className={expanded ? "is-open" : ""} />
            </button>
          )}
        </>
      )}
    </div>
  );
}
