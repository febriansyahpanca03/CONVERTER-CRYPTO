import { useEffect, useRef } from "react";

/* Posisi bintang twinkle — statis (bukan Math.random() tiap render)      */
/* supaya nggak "meloncat" tiap hot-reload/re-render. Cuma sebagian kecil */
/* dari seluruh bintang yang kedap-kedip (lihat psa-star-twinkle di CSS); */
/* far/near starfield sisanya cuma drift pelan lewat background-image.    */
/*                                                                        */
/* Semua posisi sengaja ditaruh di pita luar layar (kiri <28% / kanan     */
/* >70%) — bintang paling terang tidak boleh jatuh persis di belakang     */
/* judul hero atau kartu converter yang ada di tengah.                    */
const TWINKLE_STARS = [
  { left: "6%", top: "14%", delay: "0.2s", duration: "4.2s" },
  { left: "14%", top: "62%", delay: "1.8s", duration: "5.6s" },
  { left: "21%", top: "33%", delay: "3.1s", duration: "3.4s" },
  { left: "9%", top: "84%", delay: "0.9s", duration: "6.1s" },
  { left: "27%", top: "88%", delay: "2.4s", duration: "4.8s" },
  { left: "78%", top: "21%", delay: "4.2s", duration: "3.9s" },
  { left: "86%", top: "58%", delay: "1.1s", duration: "5.2s" },
  { left: "93%", top: "33%", delay: "3.6s", duration: "4.5s" },
  { left: "81%", top: "79%", delay: "0.5s", duration: "6.4s" },
  { left: "72%", top: "90%", delay: "2.9s", duration: "3.6s" },
  { left: "95%", top: "12%", delay: "1.5s", duration: "5.9s" },
  { left: "4%", top: "45%", delay: "3.9s", duration: "4.1s" },
];

/* Live wallpaper luar angkasa berlapis: galaksi spiral yang berputar     */
/* sangat lambat, far/near starfield dengan kecepatan drift beda (kesan   */
/* kedalaman), sedikit bintang kedap-kedip, meteor sesekali, lalu scrim   */
/* gelap + focal glow cyan di belakang converter.                         */
/*                                                                        */
/* Seluruh layer sekunder: pointer-events:none dan redup di balik scrim,  */
/* jadi kalkulator tetap jadi pusat perhatian, bukan langitnya.           */
export default function Starfield() {
  const bgRef = useRef(null);

  useEffect(() => {
    const el = bgRef.current;
    if (!el) return undefined;

    // Parallax kursor: opsional & sangat kecil, dimatikan total di touch
    // device / reduced-motion / layar sempit — bukan cuma diperkecil,
    // supaya nggak ada listener nganggur yang jalan sia-sia di perangkat
    // yang memang tidak akan memakainya.
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

    // Jangan jalankan animasi latar saat tab disembunyikan — nggak ada
    // yang lihat, cuma buang-buang CPU/baterai kalau tetap dianimasikan.
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
      {/* 2: far starfield */}
      <div className="psa-bg-parallax psa-bg-parallax-far">
        <div className="psa-stars psa-stars-far" />
      </div>
      {/* 3: near starfield, drift lebih cepat dari far */}
      <div className="psa-bg-parallax psa-bg-parallax-near">
        <div className="psa-stars psa-stars-near" />
      </div>
      {/* 3b: subset kecil yang kedap-kedip, tiap bintang beda durasi/delay */}
      {TWINKLE_STARS.map((s, i) => (
        <span
          key={i}
          className="psa-twinkle"
          style={{ left: s.left, top: s.top, animationDelay: s.delay, animationDuration: s.duration }}
        />
      ))}
      {/* 4: meteor sesekali, maksimal dua dan jarang barengan */}
      <div className="psa-shooting-star psa-shooting-star-one" />
      <div className="psa-shooting-star psa-shooting-star-two" />
      {/* 5: scrim keterbacaan */}
      <div className="psa-bg-scrim" />
      {/* 6: focal glow di belakang converter */}
      <div className="psa-bg-focus" />
    </div>
  );
}
