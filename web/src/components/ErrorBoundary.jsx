import { Component } from "react";

/* Pagar pengaman React. Tanpa ini, satu komponen yang melempar error saat  */
/* render (mis. grafik kena bentuk data yang tak terduga) akan meng-unmount */
/* SELURUH pohon komponen dan pengunjung cuma dapat halaman putih kosong —  */
/* kalkulatornya ikut hilang padahal tidak ada hubungannya.                 */
/*                                                                          */
/* Harus class component: sampai React 18 belum ada padanan hook untuk      */
/* componentDidCatch/getDerivedStateFromError.                              */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // Sengaja cuma console: situs ini tidak memakai analytics/pelacakan
    // apa pun (dijanjikan eksplisit di bagian Tentang), jadi error-nya
    // tidak dikirim ke mana-mana.
    console.error("ErrorBoundary menangkap error:", error, info?.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    // `fallback` null dipakai untuk bagian pelengkap (mis. kartu grafik):
    // kalau rusak, lebih baik hilang diam-diam daripada memasang kotak
    // error yang malah mengalihkan perhatian dari kalkulatornya.
    if (this.props.fallback !== undefined) return this.props.fallback;

    return (
      <div className="psa-boundary" role="alert">
        <p className="psa-boundary-title">Ada bagian yang gagal dimuat</p>
        <p className="psa-boundary-text">
          Coba muat ulang halamannya. Kalau masih sama, tunggu sebentar lalu buka lagi.
        </p>
        <button className="psa-boundary-btn" onClick={() => window.location.reload()}>
          Muat ulang
        </button>
      </div>
    );
  }
}
