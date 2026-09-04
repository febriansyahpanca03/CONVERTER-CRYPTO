import { useEffect, useRef } from "react";
import CoinIcon from "../CoinIcon.jsx";
import ChartTypeToggle from "./ChartTypeToggle.jsx";
import TimeframeSelector from "./TimeframeSelector.jsx";
import LinePriceChart from "./LinePriceChart.jsx";
import CandlestickPriceChart from "./CandlestickPriceChart.jsx";
import ChartTooltip from "./ChartTooltip.jsx";
import ChartLoadingState from "./ChartLoadingState.jsx";
import ChartErrorState from "./ChartErrorState.jsx";
import ChartEmptyState from "./ChartEmptyState.jsx";
import { IconClose } from "../Icons.jsx";
import { displayAmount, relativeTime, formatPercent } from "../../lib/format.js";
import { PERIOD_LABEL } from "../../lib/chart.js";

const DETAIL_HEIGHT = 380;

const STATUS_LABEL = {
  live: "Data pasar",
  delayed: "Data tertunda",
  stale: "Harga terakhir",
  unknown: "Status tidak diketahui",
};

/* "Lihat detail" — modal (bottom sheet di mobile lewat CSS) dengan      */
/* chart lebih besar. Pilihan Garis/Candle dan periode dibagi lewat      */
/* props dari PriceInsightCard, jadi state-nya nyambung dua arah: ganti  */
/* di modal juga kepakai pas modal ditutup, dan sebaliknya.              */
export default function ChartDetailModal({
  onClose,
  pair,
  icons,
  chartType,
  onChartTypeChange,
  period,
  onPeriodChange,
  candleDisabled,
  data,
  status,
  error,
  stats,
  updatedAt,
  dataStatus,
  displayPoint,
  onHoverPoint,
  onRetry,
}) {
  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeBtnRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = panelRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;
      const list = Array.from(focusables);
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  const seriesLength = chartType === "candle" ? data?.candles?.length : data?.points?.length;

  return (
    <div
      className="psa-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="psa-modal psa-chart-modal" role="dialog" aria-modal="true" aria-labelledby="psa-chart-modal-title" ref={panelRef}>
        <div className="psa-modal-head">
          <div className="psa-insight-title-row">
            <CoinIcon sym={pair.sym} size={22} iconUrl={icons?.[pair.coinId]} />
            <h2 id="psa-chart-modal-title" className="psa-insight-title">
              Insight Harga {pair.sym.toUpperCase()}
            </h2>
          </div>
          <button ref={closeBtnRef} className="psa-icon-btn" onClick={onClose} aria-label="Tutup detail grafik">
            <IconClose size={18} />
          </button>
        </div>

        <div className="psa-insight-meta">
          <span className="psa-insight-pair">{pair.pairLabel}</span>
          {stats && (
            <>
              <span className="psa-insight-price">{displayAmount(stats.last, pair.vsCurrency)}</span>
              <span className={`psa-insight-change ${stats.changeAbs >= 0 ? "psa-ticker-up" : "psa-ticker-down"}`}>
                {stats.changeAbs >= 0 ? "▲" : "▼"} {displayAmount(Math.abs(stats.changeAbs), pair.vsCurrency)} (
                {stats.changePct >= 0 ? "+" : "−"}
                {formatPercent(stats.changePct)} · {period})
              </span>
            </>
          )}
        </div>

        <div className="psa-chart-controls-row">
          <ChartTypeToggle
            value={chartType}
            onChange={onChartTypeChange}
            candleDisabled={candleDisabled}
            candleDisabledReason={`Candle ${PERIOD_LABEL[period]} belum didukung API gratis.`}
          />
          <TimeframeSelector value={period} onChange={onPeriodChange} />
        </div>

        <div className="psa-insight-chart-wrap">
          {status === "loading" && !data && <ChartLoadingState height={DETAIL_HEIGHT} />}
          {status === "error" && <ChartErrorState height={DETAIL_HEIGHT} message={error?.message} onRetry={onRetry} />}
          {status === "done" && seriesLength === 0 && <ChartEmptyState height={DETAIL_HEIGHT} />}
          {data && seriesLength > 0 && (
            <div className={status === "loading" ? "psa-chart-dim" : ""}>
              {chartType === "line" ? (
                <LinePriceChart
                  points={data.points}
                  height={DETAIL_HEIGHT}
                  quoteSym={pair.vsCurrency}
                  onCrosshairMove={onHoverPoint}
                />
              ) : (
                <CandlestickPriceChart
                  candles={data.candles}
                  height={DETAIL_HEIGHT}
                  quoteSym={pair.vsCurrency}
                  onCrosshairMove={onHoverPoint}
                />
              )}
            </div>
          )}
        </div>

        {data && seriesLength > 0 && <ChartTooltip type={chartType} point={displayPoint} quoteSym={pair.vsCurrency} />}

        <div className="psa-insight-hilo-row">
          <span>
            Tinggi ({period}) <strong>{stats ? displayAmount(stats.high, pair.vsCurrency) : "—"}</strong>
          </span>
          <span>
            Rendah ({period}) <strong>{stats ? displayAmount(stats.low, pair.vsCurrency) : "—"}</strong>
          </span>
        </div>

        <p className="psa-modal-source">
          Sumber: CoinGecko · {STATUS_LABEL[dataStatus]}
          {updatedAt ? ` · Diperbarui ${relativeTime(updatedAt)}` : ""}
        </p>
      </div>
    </div>
  );
}
