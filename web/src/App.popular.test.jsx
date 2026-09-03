import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Di-mock supaya tes tidak menyentuh jaringan sama sekali. Yang diuji di
// sini murni: apakah komponen memilih angka yang BENAR untuk tiap pasangan.
vi.mock("./lib/api.js", () => ({
  fetchPricesFor: vi.fn(),
}));

import { PopularPairs } from "./App.jsx";
import { fetchPricesFor } from "./lib/api.js";

const PRICES = {
  bitcoin: { usd: 77_600, idr: 1_372_000_000, usd_24h_change: 0.42 },
  tether: { usd: 0.9997, idr: 17_679, usd_24h_change: 0.01 },
  ethereum: { usd: 2400, idr: 42_000_000, usd_24h_change: -0.68 },
};

describe("PopularPairs", () => {
  beforeEach(() => {
    fetchPricesFor.mockReset();
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

  it("menampilkan em dash, bukan crash, kalau harga belum sempat dimuat", async () => {
    fetchPricesFor.mockRejectedValue(new Error("jaringan mati"));
    render(<PopularPairs icons={{}} onSelect={() => {}} />);

    const btcIdr = await screen.findByText("BTC/IDR");
    const harga = btcIdr.parentElement.querySelector(".psa-popular-price");
    expect(harga.textContent).toBe("—");
  });
});
