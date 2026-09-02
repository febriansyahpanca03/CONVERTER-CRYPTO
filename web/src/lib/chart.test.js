import { describe, it, expect } from "vitest";
import {
  resolveChartPair,
  filterToWindow,
  computeLineStats,
  computeCandleStats,
  intervalLabel,
  toLineSeriesData,
  toCandleSeriesData,
  chartDataStatus,
  CANDLE_UNSUPPORTED_PERIODS,
} from "./chart.js";

describe("resolveChartPair", () => {
  it("aset tujuan kripto, asal fiat yang didukung -> pasangan akurat langsung", () => {
    const r = resolveChartPair("idr", "btc");
    expect(r).toEqual({
      sym: "btc",
      coinId: "bitcoin",
      vsCurrency: "idr",
      pairLabel: "BTC/IDR",
      isProxy: false,
      proxyNote: null,
    });
  });

  it("aset tujuan kripto, asal stablecoin -> acuan USD, ditandai proxy", () => {
    const r = resolveChartPair("usdt", "eth");
    expect(r.sym).toBe("eth");
    expect(r.vsCurrency).toBe("usd");
    expect(r.pairLabel).toBe("ETH/USDT");
    expect(r.isProxy).toBe(true);
    expect(r.proxyNote).toMatch(/USD/);
  });

  it("aset tujuan fiat, asal kripto -> tetap chart kripto yang di sisi asal", () => {
    const r = resolveChartPair("btc", "idr");
    expect(r.sym).toBe("btc");
    expect(r.vsCurrency).toBe("idr");
    expect(r.pairLabel).toBe("BTC/IDR");
  });

  it("kripto ke kripto lain -> acuan USD sebagai referensi umum", () => {
    const r = resolveChartPair("eth", "sol");
    expect(r.sym).toBe("sol");
    expect(r.vsCurrency).toBe("usd");
    expect(r.pairLabel).toBe("SOL/USD");
    expect(r.isProxy).toBe(true);
  });

  it("dua-duanya fiat -> null (tidak ada aset buat di-chart)", () => {
    expect(resolveChartPair("usd", "idr")).toBeNull();
  });

  it("tujuan stablecoin, asal kripto volatil -> tetap chart kripto volatilnya (bukan USDT)", () => {
    // Ini kasus nyata "Pasangan populer" SOL/USDT: from=sol, to=usdt.
    const r = resolveChartPair("sol", "usdt");
    expect(r.sym).toBe("sol");
    expect(r.pairLabel).toBe("SOL/USDT");
    expect(r.isProxy).toBe(true);
  });

  it("BTC -> USDT tetap chart BTC, bukan USDT", () => {
    const r = resolveChartPair("btc", "usdt");
    expect(r.sym).toBe("btc");
  });
});

describe("filterToWindow", () => {
  it("membuang titik yang lebih tua dari jendela", () => {
    const now = 1_000_000;
    const points = [
      [now - 5000, 1],
      [now - 1500, 2],
      [now - 1000, 3],
    ];
    const result = filterToWindow(points, 2000, now);
    expect(result).toEqual([
      [now - 1500, 2],
      [now - 1000, 3],
    ]);
  });

  it("tetap kasih minimal 2 titik terakhir kalau hasil filter terlalu tipis", () => {
    const now = 1_000_000;
    const points = [
      [now - 9000, 1],
      [now - 5000, 2],
      [now - 100, 3],
    ];
    const result = filterToWindow(points, 50, now); // jendela super sempit, cuma nyisa 1 titik
    expect(result.length).toBe(2);
  });

  it("array kosong tetap aman", () => {
    expect(filterToWindow([], 1000)).toEqual([]);
  });
});

describe("computeLineStats", () => {
  it("menghitung high/low/perubahan dari titik pertama & terakhir", () => {
    const points = [
      [1000, 100],
      [2000, 120],
      [3000, 90],
      [4000, 110],
    ];
    const stats = computeLineStats(points);
    expect(stats.last).toBe(110);
    expect(stats.high).toBe(120);
    expect(stats.low).toBe(90);
    expect(stats.changeAbs).toBe(10);
    expect(stats.changePct).toBeCloseTo(10, 5);
    expect(stats.updatedAt).toBe(4000);
  });

  it("null kalau tidak ada data", () => {
    expect(computeLineStats([])).toBeNull();
  });
});

describe("computeCandleStats", () => {
  it("pakai open candle pertama & close candle terakhir, high/low dari semua candle", () => {
    const candles = [
      [1000, 100, 105, 95, 102], // t, o, h, l, c
      [2000, 102, 130, 101, 125],
    ];
    const stats = computeCandleStats(candles);
    expect(stats.last).toBe(125); // close candle terakhir
    expect(stats.high).toBe(130);
    expect(stats.low).toBe(95);
    expect(stats.changeAbs).toBe(25); // 125 - 100 (open candle pertama)
    expect(stats.lastCandle).toEqual({ time: 2000, open: 102, high: 130, low: 101, close: 125 });
  });

  it("null kalau tidak ada candle", () => {
    expect(computeCandleStats([])).toBeNull();
  });
});

describe("toLineSeriesData / toCandleSeriesData", () => {
  it("mengubah milidetik jadi detik buat lightweight-charts", () => {
    const out = toLineSeriesData([[1_700_000_000_000, 42]]);
    expect(out).toEqual([{ time: 1_700_000_000, value: 42 }]);
  });

  it("menggabungkan titik yang jatuh di detik yang sama, pakai yang belakangan", () => {
    const out = toLineSeriesData([
      [1_700_000_000_100, 10],
      [1_700_000_000_900, 20], // detik sama setelah dibulatkan
    ]);
    expect(out).toEqual([{ time: 1_700_000_000, value: 20 }]);
  });

  it("candle: memetakan o/h/l/c dengan benar", () => {
    const out = toCandleSeriesData([[1_700_000_000_000, 1, 2, 0.5, 1.5]]);
    expect(out).toEqual([{ time: 1_700_000_000, open: 1, high: 2, low: 0.5, close: 1.5 }]);
  });
});

describe("chartDataStatus", () => {
  it("candle 4-jam berumur 2 jam masih dianggap live (bukan basi)", () => {
    const now = 1_000_000_000;
    expect(chartDataStatus(now - 2 * 60 * 60_000, 7, now)).toBe("live");
  });

  it("data periode pendek (days=1) 2 jam nyaris kadaluarsa dianggap stale", () => {
    const now = 1_000_000_000;
    expect(chartDataStatus(now - 2 * 60 * 60_000, 1, now)).toBe("stale");
  });

  it("tidak ada updatedAt -> unknown", () => {
    expect(chartDataStatus(null, 7)).toBe("unknown");
  });
});

describe("intervalLabel & CANDLE_UNSUPPORTED_PERIODS", () => {
  it("periode 1J tidak mendukung candle (granularitas API tidak cukup halus)", () => {
    expect(CANDLE_UNSUPPORTED_PERIODS.has("1J")).toBe(true);
    expect(CANDLE_UNSUPPORTED_PERIODS.has("24J")).toBe(false);
  });

  it("label interval beda antara mode garis dan candle", () => {
    expect(intervalLabel("line", "24J")).toBe("~5 menit");
    expect(intervalLabel("candle", "24J")).toBe("30 menit");
  });
});
