import { useEffect, useMemo, useState } from "react";
import CoinIcon from "./CoinIcon.jsx";
import { IconInfo } from "./Icons.jsx";
import ChartTypeToggle from "./chart/ChartTypeToggle.jsx";
import TimeframeSelector from "./chart/TimeframeSelector.jsx";
import LinePriceChart from "./chart/LinePriceChart.jsx";
import CandlestickPriceChart from "./chart/CandlestickPriceChart.jsx";
import ChartTooltip from "./chart/ChartTooltip.jsx";
import ChartLoadingState from "./chart/ChartLoadingState.jsx";
import ChartErrorState from "./chart/ChartErrorState.jsx";
import ChartEmptyState from "./chart/ChartEmptyState.jsx";
import ChartDetailModal from "./chart/ChartDetailModal.jsx";
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
import { formatAmount, relativeTime } from "../lib/format.js";
import { loadChartPrefs, saveChartPrefs } from "../lib/storage.js";

export const CHART_HEIGHT = 260; // di dalam rentang 240-300px yang diminta brief

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
    <div className="psa-card psa-insight-card">
      <div className="psa-insight-head">
        <div className="psa-insight-title-row">
          <CoinIcon sym={pair.sym} size={20} iconUrl={icons?.[pair.coinId]} />
          <h2 className="psa-insight-title">Insight Harga {pair.sym.toUpperCase()}</h2>
        </div>
        <ChartTypeToggle
          value={chartType}
          onChange={setChartType}
          candleDisabled={candleDisabled}
          candleDisabledReason={`Candle ${PERIOD_LABEL[period]} belum didukung API gratis — granularitasnya cuma cukup buat mode Garis.`}
        />
      </div>

      <div className="psa-insight-meta">
        <span className="psa-insight-pair">
          {pair.pairLabel}
          {pair.isProxy && (
            <span className="psa-info-dot" tabIndex={0} title={pair.proxyNote} aria-label={pair.proxyNote}>
              <IconInfo size={11} />
            </span>
          )}
        </span>
        {stats && (
          <>
            <span className="psa-insight-price">{formatAmount(stats.last, pair.vsCurrency)}</span>
            <span className={`psa-insight-change ${stats.changeAbs >= 0 ? "psa-ticker-up" : "psa-ticker-down"}`}>
              {stats.changeAbs >= 0 ? "▲" : "▼"} {formatAmount(Math.abs(stats.changeAbs), pair.vsCurrency)} (
              {stats.changePct >= 0 ? "+" : "−"}
              {Math.abs(stats.changePct).toFixed(2)}% · {period})
            </span>
          </>
        )}
      </div>

      <TimeframeSelector value={period} onChange={setPeriod} />

      <div className="psa-insight-chart-wrap">
        {status === "loading" && !data && <ChartLoadingState height={CHART_HEIGHT} />}
        {status === "error" && (
          <ChartErrorState height={CHART_HEIGHT} message={error?.message} onRetry={() => setRetryNonce((n) => n + 1)} />
        )}
        {status === "done" && seriesLength === 0 && <ChartEmptyState height={CHART_HEIGHT} />}
        {data && seriesLength > 0 && (
          <div className={status === "loading" ? "psa-chart-dim" : ""}>
            {chartType === "line" ? (
              <LinePriceChart points={data.points} height={CHART_HEIGHT} onCrosshairMove={setHoverPoint} />
            ) : (
              <CandlestickPriceChart candles={data.candles} height={CHART_HEIGHT} onCrosshairMove={setHoverPoint} />
            )}
          </div>
        )}
      </div>

      {data && seriesLength > 0 && <ChartTooltip type={chartType} point={displayPoint} quoteSym={pair.vsCurrency} />}

      <div className="psa-insight-hilo-row">
        <span>
          Tinggi ({period}) <strong>{stats ? formatAmount(stats.high, pair.vsCurrency) : "—"}</strong>
        </span>
        <span>
          Rendah ({period}) <strong>{stats ? formatAmount(stats.low, pair.vsCurrency) : "—"}</strong>
        </span>
      </div>

      <div className="psa-insight-status-row">
        <span>
          CoinGecko · {STATUS_LABEL[dataStatus]}
          {updatedAt ? ` · Diperbarui ${relativeTime(updatedAt)}` : ""}
        </span>
        <button className="psa-insight-detail-btn" onClick={() => setModalOpen(true)}>
          Lihat detail
        </button>
      </div>

      {/* Chart-nya kanvas — pembaca layar butuh ringkasan teks terpisah. */}
      <p className="visually-hidden">
        {stats
          ? `Grafik harga ${pair.pairLabel}. Harga terakhir ${formatAmount(stats.last, pair.vsCurrency)}, ${
              stats.changePct >= 0 ? "naik" : "turun"
            } ${Math.abs(stats.changePct).toFixed(2)} persen dalam periode ${period}. Tertinggi ${formatAmount(
              stats.high,
              pair.vsCurrency
            )}, terendah ${formatAmount(stats.low, pair.vsCurrency)}.`
          : `Grafik harga ${pair.pairLabel} sedang dimuat.`}
      </p>

      {modalOpen && (
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
      )}
    </div>
  );
}
