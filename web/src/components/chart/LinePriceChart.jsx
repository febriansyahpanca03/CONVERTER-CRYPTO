import { useEffect, useRef } from "react";
import { createChart, AreaSeries } from "lightweight-charts";
import { toLineSeriesData } from "../../lib/chart.js";
import { formatCompactAmount } from "../../lib/format.js";

/* Mode Garis: area chart minimalis (garis cyan + fill gradient tipis).  */
/* Rendering lightweight-charts murni imperatif (bukan berbasis props    */
/* React biasa) makanya semua kerja lewat useEffect + ref, bukan JSX.    */
export default function LinePriceChart({ points, height, quoteSym, onCrosshairMove }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const onCrosshairMoveRef = useRef(onCrosshairMove);
  onCrosshairMoveRef.current = onCrosshairMove;

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { color: "transparent" },
        textColor: "#94a3b8",
        fontFamily: "inherit",
        fontSize: 11,
      },
      // Label sumbu harga dipersingkat (mis. "Rp1,39 M") biar nggak tabrakan
      // di kartu yang sempit — harga utama/tooltip di React tetap nilai penuh.
      localization: { priceFormatter: (p) => formatCompactAmount(p, quoteSym) },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.08)", minimumWidth: 56 },
      timeScale: { borderColor: "rgba(255,255,255,0.08)", timeVisible: true, secondsVisible: false },
      crosshair: { vertLine: { labelBackgroundColor: "#0c0e19" }, horzLine: { labelBackgroundColor: "#0c0e19" } },
      handleScroll: false,
      handleScale: false,
    });
    const series = chart.addSeries(AreaSeries, {
      lineColor: "#22d3ee",
      topColor: "rgba(34, 211, 238, 0.25)",
      bottomColor: "rgba(34, 211, 238, 0.02)",
      lineWidth: 2,
      priceLineVisible: false,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: "#22d3ee",
      crosshairMarkerBackgroundColor: "#0c0e19",
    });

    chart.subscribeCrosshairMove((param) => {
      const v = param.point && param.time ? param.seriesData.get(series) : null;
      const value = v && typeof v === "object" ? v.value : v;
      onCrosshairMoveRef.current?.(value != null ? { time: param.time * 1000, price: value } : null);
    });

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) chart.applyOptions({ width: Math.floor(w) });
    });
    ro.observe(containerRef.current);

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.setData(toLineSeriesData(points));
    chartRef.current?.timeScale().fitContent();
  }, [points]);

  // Chart-nya sendiri tidak dibuat ulang tiap ganti pasangan (mahal) — cukup
  // formatter label sumbunya yang di-update lewat applyOptions.
  useEffect(() => {
    chartRef.current?.applyOptions({
      localization: { priceFormatter: (p) => formatCompactAmount(p, quoteSym) },
    });
  }, [quoteSym]);

  return <div ref={containerRef} className="psa-chart-canvas" />;
}
