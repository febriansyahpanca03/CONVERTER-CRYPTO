import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import CoinIcon from "./CoinIcon.jsx";
import { IconInfo, IconMaximize } from "./Icons.jsx";
import Tooltip from "./Tooltip.jsx";
import ChartTypeToggle from "./chart/ChartTypeToggle.jsx";
import TimeframeSelector from "./chart/TimeframeSelector.jsx";
import ChartLoadingState from "./chart/ChartLoadingState.jsx";
import ChartErrorState from "./chart/ChartErrorState.jsx";
import ChartEmptyState from "./chart/ChartEmptyState.jsx";

/* Cuma tiga komponen ini yang menarik `lightweight-charts` (~180 KB dari  */
/* bundle). Dulu ikut di-load di bundle awal padahal kartunya ada di bawah */
/* fold dan banyak pengunjung tidak pernah scroll ke sana — sekarang       */
/* chunk-nya baru diambil saat datanya benar-benar siap digambar.          */
/*                                                                         */
/* Kerangka kartunya (judul, harga, toggle, statistik) TIDAK ikut di-lazy: */
/* itu tetap render seketika, jadi tidak ada perubahan tampilan maupun     */
/* pergeseran layout. Fallback-nya pun skeleton yang sama persis dengan    */
/* yang sudah dipakai saat menunggu data.                                  */
const LinePriceChart = lazy(() => import("./chart/LinePriceChart.jsx"));
const CandlestickPriceChart = lazy(() => import("./chart/CandlestickPriceChart.jsx"));
const ChartDetailModal = lazy(() => import("./chart/ChartDetailModal.jsx"));
import { useChartData } from "../hooks/useChartData.js";
import {
  resolveChartPair,
  PERIOD_DAYS,
  PERIOD_LABEL,
  CANDLE_UNSUPPORTED_PERIODS,
  computeLineStats,
  computeCandleStats,
  chartDataStatus,
} from "../lib/chart.js";
import { displayAmount, relativeTime, formatPercent } from "../lib/format.js";
import { loadChartPrefs, saveChartPrefs } from "../lib/storage.js";

// Kartu ringkas ini tingginya dipatok ~300px total (biar sejajar sama
// kartu Riwayat) — dengan padding + 4 baris info di sekitarnya, plot-nya
// cuma kebagian ~140px. Modal "Lihat detail" pakai tinggi sendiri yang
// jauh lebih lega (lihat ChartDetailModal.jsx).
export const CHART_HEIGHT = 128;

const STATUS_LABEL = {
  live: "Data pasar",
  delayed: "Data tertunda",
  stale: "Harga terakhir",
  unknown: "Status tidak diketahui",
};

function latestPoint(data, chartType) {
  if (!data) return null;
  if (chartType === "candle") {
    const c = data.candles?.[data.candles.length - 1];
    return c ? { time: c[0], open: c[1], high: c[2], low: c[3], close: c[4] } : null;
  }
  const p = data.points?.[data.points.length - 1];
  return p ? { time: p[0], price: p[1] } : null;
}

/* Kartu "Insight Harga [TOKEN]" — fitur SAMPINGAN di bawah kalkulator.  */
/* Mengikuti aset tujuan converter (lihat resolveChartPair di lib/chart) */
/* dan tidak pernah menutupi atau mengecilkan kalkulator itu sendiri.    */
export default function PriceInsightCard({ fromSym, toSym, icons }) {
  const [chartType, setChartType] = useState(() => loadChartPrefs().chartType || "line");
  const [period, setPeriod] = useState(() => loadChartPrefs().period || "24J");
  const [hoverPoint, setHoverPoint] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const detailBtnRef = useRef(null);
  const kartuRef = useRef(null);

  /* Menandai <body> selagi pointer berada di kartu chart, supaya badge
     bantuan yang melayang di pojok kanan bawah diredupkan & dikecilkan
     dan tidak menutupi kontrol atau tooltip chart (lihat CSS
     body.psa-chart-aktif .psa-help-bot). Kelasnya selalu dilepas saat
     unmount agar tidak tertinggal. */
  useEffect(() => {
    const el = kartuRef.current;
    if (!el) return undefined;
    const masuk = () => document.body.classList.add("psa-chart-aktif");
    const keluar = () => document.body.classList.remove("psa-chart-aktif");
    el.addEventListener("pointerenter", masuk);
    el.addEventListener("pointerleave", keluar);
    return () => {
      el.removeEventListener("pointerenter", masuk);
      el.removeEventListener("pointerleave", keluar);
      keluar();
    };
  }, []);
  const [retryNonce, setRetryNonce] = useState(0);

  const pair = useMemo(() => resolveChartPair(fromSym, toSym), [fromSym, toSym]);
  const candleDisabled = CANDLE_UNSUPPORTED_PERIODS.has(period);

  // Kalau pengguna lagi di mode Candle terus pindah ke periode yang candle-nya
  // nggak didukung (1J), otomatis balik ke Garis — bukan dibiarkan macet.
  useEffect(() => {
    if (chartType === "candle" && candleDisabled) setChartType("line");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  useEffect(() => {
    saveChartPrefs({ chartType, period });
  }, [chartType, period]);

  useEffect(() => {
    setHoverPoint(null);
  }, [chartType, period, pair?.coinId, pair?.vsCurrency]);

  const { status, data, error, updatedAt } = useChartData({
    coinId: pair?.coinId,
    vsCurrency: pair?.vsCurrency,
    type: chartType,
    period,
    retryNonce,
  });

  const stats = useMemo(() => {
    if (!data) return null;
    return chartType === "candle" ? computeCandleStats(data.candles) : computeLineStats(data.points);
  }, [data, chartType]);

  const seriesLength = chartType === "candle" ? data?.candles?.length : data?.points?.length;
  const displayPoint = hoverPoint || latestPoint(data, chartType);
  // Harga di baris 2 ikut bereaksi ke posisi crosshair — jadi info hover
  // tetap "kebaca" di kartu ringkas walau baris OHLC terpisah (yang detail)
  // cuma ada di modal, bukan digambar ulang di sini demi hemat tinggi.
  const displayPrice = displayPoint ? (chartType === "candle" ? displayPoint.close : displayPoint.price) : null;
  const dataStatus = chartDataStatus(updatedAt, PERIOD_DAYS[period]);

  if (!pair) {
    return (
      <div className="psa-card psa-insight-card">
        <div className="psa-insight-head">
          <h2 className="psa-insight-title">Insight Harga</h2>
        </div>
        <ChartEmptyState
          height={CHART_HEIGHT}
          message="Grafik cuma tersedia untuk pasangan yang melibatkan aset kripto."
        />
      </div>
    );
  }

  return (
    <div className="psa-card psa-insight-card" ref={kartuRef}>
      {/* Baris 1: judul + tombol detail */}
      <div className="psa-insight-head">
        <div className="psa-insight-title-row">
          <CoinIcon sym={pair.sym} size={18} iconUrl={icons?.[pair.coinId]} />
          <h2 className="psa-insight-title">Insight Harga {pair.sym.toUpperCase()}</h2>
        </div>
        {/* Tombol yang sama dengan sebelumnya (satu kontrol, bukan dua):
            hanya ditambah ikon perbesar supaya jelas ini membuka tampilan
            besar. Modalnya sudah punya Escape, focus trap, dan pengembalian
            fokus ke tombol ini — lihat ChartDetailModal.jsx. */}
        <Tooltip label="Buka grafik dalam tampilan penuh">
          {(ttId) => (
            <button
              ref={detailBtnRef}
              className="psa-insight-detail-btn"
              onClick={() => setModalOpen(true)}
              aria-label="Perbesar grafik harga"
              aria-describedby={ttId}
            >
              <IconMaximize size={13} />
              Perbesar
            </button>
          )}
        </Tooltip>
      </div>

      {/* Baris 2: pasangan + harga, toggle Garis|Candle */}
      <div className="psa-insight-price-row">
        <div className="psa-insight-price-col">
          <span className="psa-insight-pair">
            {pair.pairLabel}
            {/* role="note": lihat catatan yang sama di Converter.jsx */}
            {pair.isProxy && (
              <span
                className="psa-info-dot"
                role="note"
                tabIndex={0}
                title={pair.proxyNote}
                aria-label={pair.proxyNote}
              >
                <IconInfo size={11} />
              </span>
            )}
          </span>
          <span className="psa-insight-price">
            {displayPrice != null ? displayAmount(displayPrice, pair.vsCurrency) : "—"}
          </span>
        </div>
        <ChartTypeToggle
          value={chartType}
          onChange={setChartType}
          candleDisabled={candleDisabled}
          candleDisabledReason={`Candle ${PERIOD_LABEL[period]} belum didukung API gratis — granularitasnya cuma cukup buat mode Garis.`}
        />
      </div>

      {/* Baris 3: perubahan %, periode 1J..1T */}
      <div className="psa-insight-change-row">
        {stats ? (
          <span className={`psa-insight-change ${stats.changeAbs >= 0 ? "psa-ticker-up" : "psa-ticker-down"}`}>
            {stats.changeAbs >= 0 ? "+" : "−"}
            {formatPercent(stats.changePct)} dalam {PERIOD_LABEL[period].toLowerCase()}
          </span>
        ) : (
          <span className="psa-insight-change" />
        )}
        <TimeframeSelector value={period} onChange={setPeriod} />
      </div>

      {/* Baris 4: plot */}
      <div className="psa-insight-chart-wrap">
        {status === "loading" && !data && <ChartLoadingState height={CHART_HEIGHT} />}
        {status === "error" && (
          <ChartErrorState height={CHART_HEIGHT} message={error?.message} onRetry={() => setRetryNonce((n) => n + 1)} />
        )}
        {status === "done" && seriesLength === 0 && <ChartEmptyState height={CHART_HEIGHT} />}
        {data && seriesLength > 0 && (
          /* key berganti tiap tipe/periode berubah -> React memasang ulang
             blok ini, dan animasi crossfade-nya jalan lagi dari awal. */
          <div
            key={`${chartType}-${period}`}
            className={`psa-chart-fade ${status === "loading" ? "psa-chart-dim" : ""}`}
          >
            <Suspense fallback={<ChartLoadingState height={CHART_HEIGHT} />}>
              {chartType === "line" ? (
                <LinePriceChart
                  points={data.points}
                  height={CHART_HEIGHT}
                  quoteSym={pair.vsCurrency}
                  onCrosshairMove={setHoverPoint}
                />
              ) : (
                <CandlestickPriceChart
                  candles={data.candles}
                  height={CHART_HEIGHT}
                  quoteSym={pair.vsCurrency}
                  onCrosshairMove={setHoverPoint}
                />
              )}
            </Suspense>
          </div>
        )}
      </div>

      {/* Baris 5: tinggi/rendah periode + sumber & waktu update */}
      <div className="psa-insight-foot-row">
        <span>
          Tinggi ({period}) <strong>{stats ? displayAmount(stats.high, pair.vsCurrency) : "—"}</strong>
        </span>
        <span>
          Rendah ({period}) <strong>{stats ? displayAmount(stats.low, pair.vsCurrency) : "—"}</strong>
        </span>
        <span className="psa-insight-updated">
          {STATUS_LABEL[dataStatus]}
          {updatedAt ? ` · Diperbarui ${relativeTime(updatedAt)}` : ""}
        </span>
      </div>

      {/* Chart-nya kanvas — pembaca layar butuh ringkasan teks terpisah. */}
      <p className="visually-hidden">
        {stats
          ? `Grafik harga ${pair.pairLabel}. Harga terakhir ${displayAmount(stats.last, pair.vsCurrency)}, ${
              stats.changePct >= 0 ? "naik" : "turun"
            } ${Math.abs(stats.changePct).toFixed(2)} persen dalam periode ${period}. Tertinggi ${displayAmount(
              stats.high,
              pair.vsCurrency
            )}, terendah ${displayAmount(stats.low, pair.vsCurrency)}.`
          : `Grafik harga ${pair.pairLabel} sedang dimuat.`}
      </p>

      {modalOpen && (
        /* Tanpa fallback: modal cuma muncul setelah diklik, dan chunk-nya    */
        /* sudah ikut terambil bareng chart utama di atas — jadi praktis      */
        /* selalu sudah ada di cache saat sampai sini. Fallback null lebih    */
        /* baik daripada mengedipkan kotak kosong seukuran modal.             */
        <Suspense fallback={null}>
          <ChartDetailModal
            onClose={() => setModalOpen(false)}
            pair={pair}
            icons={icons}
            chartType={chartType}
            onChartTypeChange={setChartType}
            period={period}
            onPeriodChange={setPeriod}
            candleDisabled={candleDisabled}
            data={data}
            status={status}
            error={error}
            stats={stats}
            updatedAt={updatedAt}
            dataStatus={dataStatus}
            displayPoint={displayPoint}
            onHoverPoint={setHoverPoint}
            onRetry={() => setRetryNonce((n) => n + 1)}
          />
        </Suspense>
      )}
    </div>
  );
}
