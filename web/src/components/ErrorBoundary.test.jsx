/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary.jsx";

function Meledak() {
  throw new Error("komponen ini sengaja gagal");
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React selalu mencetak error yang tertangkap ke console; dibungkam
    // supaya output tes tetap bersih dan kegagalan asli tetap terlihat.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("menampilkan anak-anaknya kalau tidak ada error", () => {
    render(
      <ErrorBoundary>
        <p>konten normal</p>
      </ErrorBoundary>
    );
    expect(screen.getByText("konten normal")).toBeInTheDocument();
  });

  it("menampilkan pesan + tombol muat ulang saat anaknya melempar error", () => {
    render(
      <ErrorBoundary>
        <Meledak />
      </ErrorBoundary>
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Muat ulang" })).toBeInTheDocument();
  });

  it("memakai fallback kustom kalau diberikan", () => {
    render(
      <ErrorBoundary fallback={<span>pengganti</span>}>
        <Meledak />
      </ErrorBoundary>
    );
    expect(screen.getByText("pengganti")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("menghilang diam-diam kalau fallback-nya null", () => {
    // Ini yang dipakai kartu grafik: kalau rusak, cukup hilang tanpa
    // memasang kotak error yang mengalihkan perhatian dari kalkulator.
    const { container } = render(
      <ErrorBoundary fallback={null}>
        <Meledak />
      </ErrorBoundary>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
