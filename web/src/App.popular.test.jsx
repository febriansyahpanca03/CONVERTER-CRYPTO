/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Di-mock supaya tes tidak menyentuh jaringan sama sekali. Yang diuji di
// sini murni: apakah komponen memilih angka yang BENAR untuk tiap pasangan.
vi.mock("./lib/api.js", () => ({
  fetchPricesFor: vi.fn(),
  fetchSparklines: vi.fn(),
}));

import { PopularPairs } from "./App.jsx";
import { fetchPricesFor, fetchSparklines } from "./lib/api.js";

const PRICES = {
  bitcoin: { usd: 77_600, idr: 1_372_000_000, usd_24h_change: 0.42 },
  tether: { usd: 0.9997, idr: 17_679, usd_24h_change: 0.01 },
  ethereum: { usd: 2400, idr: 42_000_000, usd_24h_change: -0.68 },
};

describe("PopularPairs", () => {
  beforeEach(() => {
    fetchPricesFor.mockReset();
    // Default: sparkline tidak tersedia. Tes yang memang menguji grafik
    // mini menimpanya sendiri — jadi tes lain tidak diam-diam bergantung
    // pada data grafik.
    fetchSparklines.mockReset();
    fetchSparklines.mockResolvedValue({});
    fetchPricesFor.mockResolvedValue(PRICES);
  });

  /* Ini regresi untuk bug nyata: kartu berlabel "BTC/IDR" dan "USDT/IDR"  */
  /* dulu menampilkan harga USD ($77.600) karena render selalu membaca     */
  /* entry.usd tanpa melihat mata uang pasangannya.                        */
  it("menampilkan nilai Rupiah untuk pasangan /IDR, bukan nilai USD", async () => {
    render(<PopularPairs icons={{}} onSelect={() => {}} />);

    const btcIdr = await screen.findByText("BTC/IDR");
    const harga = btcIdr.parentElement.querySelector(".psa-popular-price");

    expect(harga.textContent).toContain("Rp");
    expect(harga.textContent).not.toContain("$");
    // 1.372.000.000 -> harus terbaca sebagai miliaran, bukan puluhan ribu
    expect(harga.textContent.replace(/\D/g, "")).toMatch(/^1372/);
  });

  it("menampilkan nilai USD untuk pasangan /USDT", async () => {
    render(<PopularPairs icons={{}} onSelect={() => {}} />);

    const btcUsdt = await screen.findByText("BTC/USDT");
    const harga = btcUsdt.parentElement.querySelector(".psa-popular-price");

    expect(harga.textContent).toContain("$");
    expect(harga.textContent).not.toContain("Rp");
  });

  it("meminta USD dan IDR sekaligus, bukan USD saja", async () => {
    render(<PopularPairs icons={{}} onSelect={() => {}} />);
    await waitFor(() => expect(fetchPricesFor).toHaveBeenCalled());

    const [, vs] = fetchPricesFor.mock.calls[0];
    expect(vs).toContain("usd");
    expect(vs).toContain("idr");
  });

  it("menampilkan enam kartu secara default lalu sisanya setelah diperluas", async () => {
    const user = userEvent.setup();
    render(<PopularPairs icons={{}} onSelect={() => {}} />);

    // Enam kartu = tepat dua baris penuh di grid 3 dan satu baris di grid 6,
    // jadi tidak pernah ada kartu nyangkut sendirian di baris terakhir.
    expect(document.querySelectorAll(".psa-popular-card")).toHaveLength(6);

    await user.click(screen.getByRole("button", { name: /Lihat semua/i }));
    expect(document.querySelectorAll(".psa-popular-card").length).toBeGreaterThan(6);
  });

  it("meneruskan pasangan yang diklik ke onSelect", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PopularPairs icons={{}} onSelect={onSelect} />);

    const kartu = (await screen.findByText("BTC/IDR")).closest("button");
    await user.click(kartu);

    expect(onSelect).toHaveBeenCalledWith("btc", "idr");
  });

  it("menggambar sparkline dari harga asli, dan skeleton kalau datanya tidak ada", async () => {
    fetchPricesFor.mockResolvedValue(PRICES);
    // Hanya bitcoin yang punya sparkline; sisanya harus tetap skeleton —
    // komponennya tidak boleh mengarang garis pengganti.
    fetchSparklines.mockResolvedValue({
      bitcoin: [10, 12, 11, 15, 14, 18],
    });
    render(<PopularPairs icons={{}} onSelect={() => {}} />);

    const btcIdr = await screen.findByText("BTC/IDR");
    const kartuBtc = btcIdr.closest(".psa-popular-card");
    const garis = kartuBtc.querySelector(".psa-sparkline path");
    expect(garis).toBeInTheDocument();
    // 6 titik -> 1 perintah M + 5 perintah L
    expect(garis.getAttribute("d").match(/L/g)).toHaveLength(5);

    // Token tanpa data sparkline tetap menampilkan skeleton.
    const ethUsdt = await screen.findByText("ETH/USDT");
    const kartuEth = ethUsdt.closest(".psa-popular-card");
    expect(kartuEth.querySelector(".psa-skeleton-spark")).toBeInTheDocument();
    expect(kartuEth.querySelector(".psa-sparkline")).toBeNull();
  });

  it("menampilkan skeleton, bukan crash, kalau harga belum sempat dimuat", async () => {
    fetchPricesFor.mockRejectedValue(new Error("jaringan mati"));
    render(<PopularPairs icons={{}} onSelect={() => {}} />);

    const btcIdr = await screen.findByText("BTC/IDR");
    const harga = btcIdr.parentElement.querySelector(".psa-popular-price");
    // Harga yang belum sampai ditandai skeleton, bukan "—": em dash
    // terbaca sebagai "tidak ada nilainya", padahal ini keadaan sementara.
    const skeleton = harga.querySelector(".psa-skeleton");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute("aria-label", "Memuat harga");
    // Tidak boleh ada angka yang bocor sebagai nilai palsu.
    expect(harga.textContent).not.toMatch(/\d/);
  });
});
