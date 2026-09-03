import { useEffect, useMemo, useRef } from "react";

/* Posisi bintang twinkle — statis (bukan Math.random() tiap render)      */
/* supaya tidak "meloncat" tiap hot-reload/re-render. Hanya sebagian      */
/* kecil bintang yang berkedip; far/middle/near starfield sisanya cuma    */
/* drift pelan lewat background-image.                                    */
/*                                                                        */
/* Semua posisi sengaja ditaruh di pita luar layar (kiri <26% / kanan     */
/* >72%) — tidak boleh ada titik terang persis di belakang judul hero     */
/* atau kartu converter yang ada di tengah.                               */
const TWINKLE_STARS = [
  { left: "6%", top: "14%", delay: "0.2s", duration: "4.2s" },
  { left: "14%", top: "62%", delay: "1.8s", duration: "5.6s" },
  { left: "21%", top: "33%", delay: "3.1s", duration: "3.4s" },
  { left: "9%", top: "84%", delay: "0.9s", duration: "6.1s" },
  { left: "25%", top: "88%", delay: "2.4s", duration: "4.8s" },
  { left: "78%", top: "21%", delay: "4.2s", duration: "3.9s" },
  { left: "86%", top: "58%", delay: "1.1s", duration: "5.2s" },
  { left: "93%", top: "33%", delay: "3.6s", duration: "4.5s" },
  { left: "81%", top: "79%", delay: "0.5s", duration: "6.4s" },
  { left: "73%", top: "90%", delay: "2.9s", duration: "3.6s" },
  { left: "95%", top: "12%", delay: "1.5s", duration: "5.9s" },
  { left: "4%", top: "45%", delay: "3.9s", duration: "4.1s" },
];

/* Meteor: diacak sekali per-load, bukan lewat timer yang terus berjalan. */
/* Durasi 18-28 detik sesuai target, dan yang benar-benar "menyala" cuma  */
/* ~6% dari siklus (lihat keyframes psa-shooting-star-move), jadi lewatnya */
/* jarang dan singkat. Posisi awalnya dibatasi ke pita atas/pinggir supaya */
/* lintasannya tidak memotong kartu converter di tengah layar.            */
function acakMeteor() {
  const rnd = (a, b) => a + Math.random() * (b - a);
  return [
    {
      duration: `${rnd(18, 23).toFixed(1)}s`,
      delay: `${rnd(0, 8).toFixed(1)}s`,
      top: `${rnd(8, 22).toFixed(0)}%`,
      left: `${rnd(4, 18).toFixed(0)}%`,
    },
    {
      duration: `${rnd(23, 28).toFixed(1)}s`,
      delay: `${rnd(6, 16).toFixed(1)}s`,
      top: `${rnd(26, 40).toFixed(0)}%`,
      left: `${rnd(58, 74).toFixed(0)}%`,
    },
  ];
}

/* Live wallpaper luar angkasa berlapis: galaksi spiral yang berputar     */
/* sangat lambat, tiga lapis starfield dengan kecepatan drift berbeda     */
/* (far paling lambat, near paling cepat = kesan kedalaman), sedikit      */
/* bintang berkedip, meteor sesekali, lalu lapisan-lapisan gelap yang     */
/* menjaga keterbacaan teks di atasnya.                                   */
/*                                                                        */
/* Seluruh layer dekoratif: pointer-events:none dan tidak bisa diseleksi, */
/* jadi kalkulator tetap jadi pusat perhatian, bukan langitnya.           */
export default function Starfield() {
  const bgRef = useRef(null);
  // useMemo, bukan useState: nilainya cukup ditentukan sekali saat mount
  // dan tidak pernah memicu render ulang.
  const meteor = useMemo(() => acakMeteor(), []);

  useEffect(() => {
    const el = bgRef.current;
    if (!el) return undefined;

    // Parallax kursor: sangat kecil (maks 8px), dan dimatikan TOTAL di
    // touch device / reduced-motion / layar sempit — bukan sekadar
    // diperkecil, supaya tidak ada listener yang jalan sia-sia di
    // perangkat yang memang tidak akan memakainya.
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia?.("(pointer: coarse)").matches;
    const isNarrow = window.matchMedia?.("(max-width: 900px)").matches;
    const parallaxEnabled = !reduceMotion && !isTouch && !isNarrow;

    let raf = null;
    function onPointerMove(e) {
      if (raf) return; // satu update per frame, bukan per event mousemove
      raf = requestAnimationFrame(() => {
        const px = e.clientX / window.innerWidth - 0.5; // -0.5..0.5
        const py = e.clientY / window.innerHeight - 0.5;
        el.style.setProperty("--px", px.toFixed(3));
        el.style.setProperty("--py", py.toFixed(3));
        raf = null;
      });
    }
    if (parallaxEnabled) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    // Jangan jalankan animasi latar saat tab disembunyikan — tidak ada
    // yang melihat, hanya membuang CPU/baterai.
    function onVisibility() {
      el.classList.toggle("is-paused", document.hidden);
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (parallaxEnabled) window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="psa-bg" aria-hidden="true" ref={bgRef}>
      {/* 1: galaksi spiral, rotasi sangat lambat */}
      <div className="psa-bg-parallax psa-bg-parallax-galaxy">
        <div className="psa-bg-galaxy" />
      </div>
      {/* 2: tiga lapis starfield, makin dekat makin cepat drift-nya */}
      <div className="psa-bg-parallax psa-bg-parallax-far">
        <div className="psa-stars psa-stars-far" />
      </div>
      <div className="psa-bg-parallax psa-bg-parallax-mid">
        <div className="psa-stars psa-stars-mid" />
      </div>
      <div className="psa-bg-parallax psa-bg-parallax-near">
        <div className="psa-stars psa-stars-near" />
      </div>
      {/* 3: subset kecil yang berkedip, tiap bintang beda durasi & delay */}
      {TWINKLE_STARS.map((s, i) => (
        <span
          key={i}
          className="psa-twinkle"
          style={{ left: s.left, top: s.top, animationDelay: s.delay, animationDuration: s.duration }}
        />
      ))}
      {/* 4: meteor, maksimal dua dan hampir tidak pernah barengan */}
      {meteor.map((m, i) => (
        <div
          key={i}
          className={`psa-shooting-star psa-shooting-star-${i === 0 ? "one" : "two"}`}
          style={{
            top: m.top,
            left: m.left,
            animationDuration: m.duration,
            animationDelay: m.delay,
          }}
        />
      ))}
      {/* 5: lapisan gelap penjaga keterbacaan — kiri pekat ke kanan tipis, */}
      {/*    kubah gelap di belakang converter, lalu vignette tepi layar.   */}
      <div className="psa-bg-scrim" />
      <div className="psa-bg-shade" />
      <div className="psa-bg-vignette" />
      {/* 6: focal glow tipis di belakang converter */}
      <div className="psa-bg-focus" />
    </div>
  );
}
