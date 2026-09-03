/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Converter from "./Converter.jsx";

/* Props minimum supaya komponennya bisa dirender; tiap tes menimpa yang  */
/* relevan saja. Converter sendiri tidak melakukan fetch — semua data     */
/* masuk lewat props, jadi tidak perlu mock jaringan sama sekali.         */
function setup(overrides = {}) {
  const props = {
    amount: "",
    onAmountChange: vi.fn(),
    fromSym: "usdt",
    onFromChange: vi.fn(),
    toSym: "btc",
    onToChange: vi.fn(),
    onSwap: vi.fn(),
    onConvert: vi.fn(),
    status: "idle",
    result: null,
    amountError: "",
    icons: {},
    query: "",
    onQueryChange: vi.fn(),
    onRunQuickCommand: vi.fn(),
    message: "",
    offline: false,
    onRefresh: vi.fn(),
    onCopyResult: vi.fn(),
    justCopied: false,
    onShare: vi.fn(),
    onToggleFavorite: vi.fn(),
    isFavorite: false,
    ...overrides,
  };
  render(<Converter {...props} />);
  return props;
}

describe("Converter", () => {
  it("meneruskan angka yang diketik ke onAmountChange", async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.type(screen.getByLabelText("Jumlah yang dibayar"), "5");
    expect(props.onAmountChange).toHaveBeenCalledWith("5");
  });

  it("menjalankan konversi saat tombol Konversi diklik", async () => {
    const user = userEvent.setup();
    const props = setup({ amount: "2" });

    await user.click(screen.getByRole("button", { name: "Konversi" }));
    expect(props.onConvert).toHaveBeenCalledTimes(1);
  });

  it("menjalankan konversi saat menekan Enter di kolom jumlah", async () => {
    const user = userEvent.setup();
    const props = setup({ amount: "2" });

    await user.type(screen.getByLabelText("Jumlah yang dibayar"), "{Enter}");
    expect(props.onConvert).toHaveBeenCalled();
  });

  it("memanggil onSwap saat tombol tukar arah diklik", async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.click(screen.getByRole("button", { name: /Tukar arah aset/i }));
    expect(props.onSwap).toHaveBeenCalledTimes(1);
  });

  it("menampilkan hasil konversi yang sudah diformat", () => {
    setup({
      status: "done",
      result: { value: 0.00003852, from: "usdt", to: "btc", updatedAt: Date.now() },
    });
    // Nilainya diformat lewat formatAmountSafe, jadi yang dicek cukup
    // bahwa angkanya muncul dan bukan placeholder "0".
    expect(screen.getByText(/0[.,]0000/)).toBeInTheDocument();
  });

  it("menonaktifkan tombol saat status loading dan menampilkan teks memuat", () => {
    setup({ status: "loading" });
    const tombol = screen.getByRole("button", { name: /Mengambil harga/i });
    expect(tombol).toBeDisabled();
  });

  it("menampilkan pesan error jumlah dengan role alert", () => {
    setup({ amountError: "Jumlah tidak valid" });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Jumlah tidak valid");
    // Kolom input harus ikut ditandai invalid untuk pembaca layar.
    expect(screen.getByLabelText("Jumlah yang dibayar")).toHaveAttribute("aria-invalid", "true");
  });

  it("meneruskan perintah Quick Command saat tombol Proses diklik", async () => {
    const user = userEvent.setup();
    const props = setup({ query: "250 USDT ke ETH" });

    await user.click(screen.getByRole("button", { name: "Proses" }));
    expect(props.onRunQuickCommand).toHaveBeenCalledWith("250 USDT ke ETH");
  });

  it("tombol salin hasil nonaktif selama belum ada hasil", () => {
    setup({ status: "idle", result: null });
    expect(screen.getByRole("button", { name: "Salin hasil" })).toBeDisabled();
  });
});
