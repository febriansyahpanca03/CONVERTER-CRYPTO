import { describe, it, expect } from "vitest";
import { computeRate, parseFallback } from "./api.js";

/* parseFallback dipakai saat panggilan ke model Groq gagal — jadi harus  */
/* tetap bisa membaca pola dasar "angka aset ke aset" tanpa AI sama      */
/* sekali.                                                                */
describe("parseFallback", () => {
  it("membaca pola dasar 'angka aset ke aset'", () => {
    expect(parseFallback("250 usdt ke eth")).toEqual({ amount: 250, from: "usdt", to: "eth" });
  });

  it("default jumlah ke 1 kalau tidak disebut", () => {
    expect(parseFallback("btc ke usdt")).toEqual({ amount: 1, from: "btc", to: "usdt" });
  });

  it("terima variasi kata sambung (to, jadi, panah)", () => {
    expect(parseFallback("1 btc to usdt")).toEqual({ amount: 1, from: "btc", to: "usdt" });
    expect(parseFallback("1 btc jadi usdt")).toEqual({ amount: 1, from: "btc", to: "usdt" });
    expect(parseFallback("1 btc -> usdt")).toEqual({ amount: 1, from: "btc", to: "usdt" });
  });

  it("ubah koma jadi titik desimal, bukan pemisah ribuan", () => {
    expect(parseFallback("1,5 eth ke btc")).toEqual({ amount: 1.5, from: "eth", to: "btc" });
  });

  it("mengembalikan null kalau kalimatnya tidak dikenali polanya", () => {
    expect(parseFallback("halo apa kabar")).toBeNull();
  });
});

/* computeRate murni matematika (tanpa network), jadi bisa dites langsung */
/* dengan bentuk data yang persis sama seperti balasan /api/price.        */
describe("computeRate", () => {
  const sample = {
    bitcoin: { usd: 60000, idr: 950000000, last_updated_at: 1_700_000_000 },
    ethereum: { usd: 3000 },
    tether: { usd: 1 },
  };

  it("menghitung kurs kripto ke kripto lewat basis BTC", () => {
    const { rate } = computeRate(sample, "usdt", "eth");
    // 1 USDT = 1/3000 ETH
    expect(rate).toBeCloseTo(1 / 3000, 10);
  });

  it("menghitung kurs kripto ke fiat", () => {
    const { rate } = computeRate(sample, "btc", "idr");
    expect(rate).toBeCloseTo(950000000, 5);
  });

  it("menghitung kurs fiat ke kripto (kebalikan dari fiat ke btc)", () => {
    const { rate } = computeRate(sample, "idr", "btc");
    expect(rate).toBeCloseTo(1 / 950000000, 15);
  });

  it("kurs pasangan yang sama menghasilkan 1", () => {
    const { rate } = computeRate(sample, "eth", "eth");
    expect(rate).toBeCloseTo(1, 10);
  });

  it("updatedAt diambil dari last_updated_at bitcoin (detik -> ms)", () => {
    const { updatedAt } = computeRate(sample, "usdt", "eth");
    expect(updatedAt).toBe(1_700_000_000 * 1000);
  });

  it("melempar error kalau data bitcoin tidak ada", () => {
    expect(() => computeRate({}, "usdt", "eth")).toThrow();
  });

  it("melempar error kalau harga aset yang diminta tidak tersedia", () => {
    expect(() => computeRate(sample, "usdt", "sol")).toThrow();
  });
});
