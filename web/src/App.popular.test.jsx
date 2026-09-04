/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PopularPairs } from "./App.jsx";

/* PopularPairs sendiri tidak lagi mengambil data — harga & sparkline      */
/* diambil sekali di App level lalu diteruskan sebagai props, supaya       */
/* Popular Pairs dan token picker berbagi satu fetch yang sama, bukan      */
/* menembak endpoint yang identik dua kali. Karena itu tes di sini murni   */
/* menguji cara komponennya MERENDER data yang sudah diberikan — bukan     */
/* mock jaringan. Tes untuk fetch-nya sendiri ada di App level (kalau      */
/* diperlukan), bukan di sini lagi.                                        */
const PRICES = {
  bitcoin: { usd: 77_600, idr: 1_372_000_000, usd_24h_change: 0.42 },
  tether: { usd: 0.9997, idr: 17_679, usd_24h_change: 0.01 },
  ethereum: { usd: 2400, idr: 42_000_000, usd_24h_change: -0.68 },
};

describe("PopularPairs", () => {
  /* Ini regresi untuk bug nyata: kartu berlabel "BTC/IDR" dan "USDT/IDR"  */
  /* dulu menampilkan harga USD ($77.600) karena render selalu membaca     */
  /* entry.usd tanpa melihat mata uang pasangannya.                        */
  it("menampilkan nilai Rupiah untuk pasangan /IDR, bukan nilai USD", () => {
    render(<PopularPairs icons={{}} prices={PRICES} sparks={{}} onSelect={() => {}} />);

    const btcIdr = screen.getByText("BTC/IDR");
    const harga = btcIdr.parentElement.querySelector(".psa-popular-price");

    expect(harga.textContent).toContain("Rp");
    expect(harga.textContent).not.toContain("$");
    // 1.372.000.000 -> harus terbaca sebagai miliaran, bukan puluhan ribu
    expect(harga.textContent.replace(/\D/g, "")).toMatch(/^1372/);
  });

  it("menampilkan nilai USD untuk pasangan /USDT", () => {
    render(<PopularPairs icons={{}} prices={PRICES} sparks={{}} onSelect={() => {}} />);

    const btcUsdt = screen.getByText("BTC/USDT");
    const harga = btcUsdt.parentElement.querySelector(".psa-popular-price");

    expect(harga.textContent).toContain("$");
    expect(harga.textContent).not.toContain("Rp");
  });

  it("menampilkan enam kartu secara default lalu sisanya setelah diperluas", async () => {
    const user = userEvent.setup();
    render(<PopularPairs icons={{}} prices={PRICES} sparks={{}} onSelect={() => {}} />);

    // Enam kartu = tepat dua baris penuh di grid 3 dan satu baris di grid 6,
    // jadi tidak pernah ada kartu nyangkut sendirian di baris terakhir.
    expect(document.querySelectorAll(".psa-popular-card")).toHaveLength(6);

    await user.click(screen.getByRole("button", { name: /Lihat semua/i }));
    expect(document.querySelectorAll(".psa-popular-card").length).toBeGreaterThan(6);
  });

  it("meneruskan pasangan yang diklik ke onSelect", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PopularPairs icons={{}} prices={PRICES} sparks={{}} onSelect={onSelect} />);

    const kartu = screen.getByText("BTC/IDR").closest("button");
    await user.click(kartu);

    expect(onSelect).toHaveBeenCalledWith("btc", "idr");
  });

  it("menggambar sparkline dari harga asli, dan skeleton kalau datanya tidak ada", () => {
    // Hanya bitcoin yang punya sparkline; sisanya harus tetap skeleton —
    // komponennya tidak boleh mengarang garis pengganti.
    const sparks = { bitcoin: [10, 12, 11, 15, 14, 18] };
    render(<PopularPairs icons={{}} prices={PRICES} sparks={sparks} onSelect={() => {}} />);

    const btcIdr = screen.getByText("BTC/IDR");
    const kartuBtc = btcIdr.closest(".psa-popular-card");
    const garis = kartuBtc.querySelector(".psa-sparkline path");
    expect(garis).toBeInTheDocument();
    // 6 titik -> 1 perintah M + 5 perintah L
    expect(garis.getAttribute("d").match(/L/g)).toHaveLength(5);

    // Token tanpa data sparkline tetap menampilkan skeleton.
    const ethUsdt = screen.getByText("ETH/USDT");
    const kartuEth = ethUsdt.closest(".psa-popular-card");
    expect(kartuEth.querySelector(".psa-skeleton-spark")).toBeInTheDocument();
    expect(kartuEth.querySelector(".psa-sparkline")).toBeNull();
  });

  it("menampilkan skeleton, bukan crash, kalau harga belum sempat dimuat", () => {
    // prices masih null: kondisi persis sebelum fetch App-level selesai.
    render(<PopularPairs icons={{}} prices={null} sparks={{}} onSelect={() => {}} />);

    const btcIdr = screen.getByText("BTC/IDR");
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
