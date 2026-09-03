import { useEffect, useRef, useState } from "react";
import { fetchChartData } from "../lib/api.js";
import { PERIOD_DAYS, filterToWindow } from "../lib/chart.js";

const DEBOUNCE_MS = 250;

/* Cache mentah (belum dipotong jendela waktu) per kombinasi tipe/token/ */
/* mata uang/hari — modul-level supaya tetap hidup selama tab terbuka,   */
/* dan dipakai bersama oleh 1J & 24J (dua-duanya sama-sama minta         */
/* days=1 ke API, bedanya cuma dipotong di sisi klien atau tidak).       */
const cache = new Map();

// Samain dengan chartTtlFor() di server/app.js — kalau beda, klien cuma
// akan refetch lebih sering dari yang sebenarnya diperlukan (server-nya
// toh masih ngasih data cache yang sama, jadi nggak salah, cuma boros).
function cacheTtlMs(days) {
  if (days <= 1) return 3 * 60_000;
  if (days <= 30) return 20 * 60_000;
  return 60 * 60_000;
}

function shape(raw, type, period) {
  if (type === "line") {
    let points = raw.prices || [];
    if (period === "1J") points = filterToWindow(points, 60 * 60 * 1000);
    return { points };
  }
  return { candles: Array.isArray(raw) ? raw : [] };
}

/* Ambil data grafik buat satu kombinasi token/mata-uang/tipe/periode.   */
/* Membatalkan request lama (AbortController) dan nge-debounce 250ms     */
/* setiap kali salah satu parameter berubah cepat — biar ganti-ganti     */
/* pasangan atau periode dengan cepat nggak numpuk request yang basi.    */
export function useChartData({ coinId, vsCurrency, type, period, retryNonce = 0 }) {
  const [state, setState] = useState({ status: "idle", data: null, error: null, updatedAt: null });
  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const seqRef = useRef(0);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (!coinId || !vsCurrency) {
      setState({ status: "idle", data: null, error: null, updatedAt: null });
      return () => {};
    }

    const days = PERIOD_DAYS[period];
    const key = `${type}|${coinId}|${vsCurrency}|${days}`;
    const mySeq = ++seqRef.current;
    const hit = cache.get(key);

    if (hit && Date.now() - hit.at < cacheTtlMs(days)) {
      setState({ status: "done", data: shape(hit.data, type, period), error: null, updatedAt: hit.at });
      return () => {};
    }

    setState((s) => ({ status: "loading", data: s.data, error: null, updatedAt: s.updatedAt }));

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;

      fetchChartData({ coinId, vsCurrency, days, type, signal: controller.signal })
        .then((raw) => {
          if (mySeq !== seqRef.current) return; // sudah ditimpa perubahan parameter berikutnya
          const at = Date.now();
          cache.set(key, { at, data: raw });
          setState({ status: "done", data: shape(raw, type, period), error: null, updatedAt: at });
        })
        .catch((err) => {
          if (controller.signal.aborted || mySeq !== seqRef.current) return;
          setState({ status: "error", data: null, error: err, updatedAt: null });
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [coinId, vsCurrency, type, period, retryNonce]);

  return state;
}
