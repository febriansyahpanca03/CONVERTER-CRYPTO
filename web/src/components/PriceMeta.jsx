import { useEffect, useState } from "react";
import { formatAmount, relativeTime, priceStatus } from "../lib/format.js";
import { IconRefresh } from "./Icons.jsx";

const STATUS_LABEL = {
  live: "Live",
  delayed: "Delayed",
  stale: "Data lama",
  offline: "Offline",
  error: "Error",
};

const SPREAD_NOTE =
  "Ini harga pasar rata-rata. Kalau beneran ditukar di exchange, biasanya sedikit meleset karena ada biaya jaringan dan slippage.";

/* Info kepercayaan harga: sumber data, waktu pembaruan, dan status      */
/* kesegarannya — semuanya dihitung dari data asli yang sudah dipakai   */
/* aplikasi (CoinGecko), tidak ada angka yang dikarang.                  */
/* variant="inline" = versi ringkas, rata tengah, menyatu di dalam       */
/* converter card (dipakai Converter.jsx). Tanpa itu = versi lama,       */
/* berbingkai penuh dengan paragraf disclaimer terpisah.                 */
export default function PriceMeta({ status, result, message, fromSym, toSym, onRefresh, offline, variant }) {
  const [, forceTick] = useState(0);
  const inline = variant === "inline";

  useEffect(() => {
    if (status !== "done") return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  if (status === "idle") return null;

  if (status === "loading") {
    if (inline) return null; // tombol Konversi sendiri sudah menunjukkan status loading
    return (
      <div className="psa-meta">
        <div className="psa-skeleton">
          <div className="psa-skeleton-bar" style={{ width: "60%" }} />
          <div className="psa-skeleton-bar" style={{ width: "40%" }} />
        </div>
      </div>
    );
  }

  if (status === "error") {
    const badgeClass = offline ? "psa-status-offline" : "psa-status-error";
    const badgeText = offline ? STATUS_LABEL.offline : STATUS_LABEL.error;
    if (inline) {
      return (
        <div className="psa-meta-inline psa-meta-inline-error" role="alert">
          <span className={`psa-status-badge ${badgeClass}`}>
            <span className="psa-status-dot" aria-hidden="true" />
            {badgeText}
          </span>
          <span>{message}</span>
          <button className="psa-icon-btn" onClick={onRefresh} title="Coba lagi" aria-label="Coba ambil harga lagi">
            <IconRefresh size={15} />
          </button>
        </div>
      );
    }
    return (
      <div className="psa-meta">
        <div className="psa-meta-row">
          <span className={`psa-status-badge ${badgeClass}`}>
            <span className="psa-status-dot" aria-hidden="true" />
            {badgeText}
          </span>
          <button className="psa-icon-btn" onClick={onRefresh} title="Coba lagi" aria-label="Coba ambil harga lagi">
            <IconRefresh size={16} />
          </button>
        </div>
        <p className="psa-meta-disclaimer" role="alert">
          {message}
        </p>
      </div>
    );
  }

  if (status === "done" && result) {
    const dataStatus = priceStatus(result.updatedAt);
    const badgeClass = `psa-status-${dataStatus}`;

    if (inline) {
      return (
        <div className="psa-meta-inline" title={SPREAD_NOTE}>
          <div className="psa-meta-inline-rate">
            1 {fromSym.toUpperCase()} = <strong>{formatAmount(result.rate, toSym)}</strong> {toSym.toUpperCase()}
            <button
              className="psa-icon-btn psa-meta-refresh"
              onClick={onRefresh}
              title="Segarkan harga terbaru"
              aria-label="Segarkan harga terbaru"
            >
              <IconRefresh size={13} />
            </button>
          </div>
          <div className="psa-meta-inline-status">
            <span className={`psa-status-badge ${badgeClass}`}>
              <span className="psa-status-dot" aria-hidden="true" />
              {STATUS_LABEL[dataStatus] || "Live"}
            </span>
            <span>Diperbarui {relativeTime(result.updatedAt)}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="psa-meta">
        <div className="psa-meta-row">
          <span>
            1 {fromSym.toUpperCase()} = <strong style={{ color: "var(--text)" }}>{formatAmount(result.rate, toSym)}</strong>{" "}
            {toSym.toUpperCase()}
          </span>
          <span className={`psa-status-badge ${badgeClass}`}>
            <span className="psa-status-dot" aria-hidden="true" />
            {STATUS_LABEL[dataStatus] || "Live"}
          </span>
        </div>
        <div className="psa-meta-row">
          <span>
            Harganya dari CoinGecko, di-update {relativeTime(result.updatedAt)}
          </span>
          <button
            className="psa-icon-btn"
            onClick={onRefresh}
            title="Segarkan harga terbaru"
            aria-label="Segarkan harga terbaru"
          >
            <IconRefresh size={16} />
          </button>
        </div>
        <p className="psa-meta-disclaimer">
          Ini harga pasar rata-rata. Kalau beneran ditukar di exchange, biasanya sedikit meleset
          karena ada{" "}
          <span title="Ongkos yang diambil jaringan blockchain buat memproses transaksi — besarnya beda-beda tergantung koinnya, di luar kendali situs ini.">
            biaya jaringan
          </span>{" "}
          dan{" "}
          <span title="Selisih antara harga yang kamu lihat dan harga yang benar-benar kepakai saat transaksi jalan — biasanya muncul kalau pasar lagi bergerak cepat atau likuiditasnya tipis.">
            slippage
          </span>
          .
        </p>
      </div>
    );
  }

  return null;
}
