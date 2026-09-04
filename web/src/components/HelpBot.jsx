import { useEffect, useRef, useState } from "react";
import { askAssistant } from "../lib/api.js";
import { IconSend } from "./Icons.jsx";

const GREETING = {
  role: "assistant",
  text: "Halo 👋 Bingung cara pakainya? Tanya aja di sini.",
};

/* Avatar maskot: pakai gambar kalau ada di /public/mascot.png,          */
/* fallback ke emoji kalau file belum ditaruh / gagal dimuat.            */
function Avatar({ size = 22, circle = true }) {
  const [broken, setBroken] = useState(false);
  if (broken) return <span aria-hidden="true" style={{ fontSize: size * 0.8 }}>🤖</span>;
  return (
    <img
      src="/mascot.png"
      alt=""
      width={size}
      height={size}
      style={circle ? { borderRadius: "50%", objectFit: "cover" } : { objectFit: "contain" }}
      onError={() => setBroken(true)}
    />
  );
}

/* NB: sempat ada versi maskot yang jalan bolak-balik pakai 86 potongan */
/* pose, sekarang diganti badge bundar statis biar menyatu dengan gaya  */
/* widget bantuan yang lebih tenang/compact. File frame-nya (1,7 MB)    */
/* sudah dihapus dari /public karena ikut ter-deploy tanpa dipakai —    */
/* ada di riwayat git kalau suatu saat mau dipakai lagi.                */

/* Maskot robot, sekarang jadi asisten AI beneran (bukan FAQ statis) —  */
/* pakai Groq yang sudah terhubung lewat /api/assistant, dengan prompt  */
/* yang dibatasi hanya menjawab seputar cara pakai situs ini.            */
export default function HelpBot() {
  const [open, setOpen] = useState(false);
  /* Di layar sempit, badge yang melayang di pojok kanan bawah pasti
     bertumpuk dengan tombol Konversi yang selebar kartu (terukur di
     390x844). Karena CTA tidak boleh pernah tertutupi, badge-nya
     disembunyikan selama CTA berada di dalam viewport — dan muncul lagi
     begitu pengguna menggulir melewatinya. */
  const [tertutupCta, setTertutupCta] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const panelRef = useRef(null);
  const btnRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const cta = document.querySelector(".psa-convert-btn");
    if (!cta || !window.matchMedia?.("(max-width: 640px)").matches) return undefined;
    const obs = new IntersectionObserver(
      ([en]) => setTertutupCta(en.isIntersecting),
      { threshold: 0.15 }
    );
    obs.observe(cta);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        !btnRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
    };
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setSending(true);
    try {
      const reply = await askAssistant(text);
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: err.message || "Maaf, ada gangguan. Coba lagi sebentar lagi." },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {open && (
        <div className="psa-help-panel" ref={panelRef} role="dialog" aria-label="Asisten Panca Swap Agent">
          <div className="psa-help-head">
            <Avatar size={26} />
            <div>
              <h3 style={{ margin: 0 }}>Asisten Panca Swap</h3>
              <span style={{ fontSize: 11, color: "var(--text-faint)" }}>Tanya-tanya soal situs ini</span>
            </div>
          </div>

          <div className="psa-help-messages" ref={listRef}>
            {messages.map((m, i) => (
              <div key={i} className={`psa-help-msg psa-help-msg-${m.role}`}>
                {m.role === "assistant" && (
                  <span className="psa-help-msg-avatar">
                    <Avatar size={20} />
                  </span>
                )}
                <span className="psa-help-msg-bubble">{m.text}</span>
              </div>
            ))}
            {sending && (
              <div className="psa-help-msg psa-help-msg-assistant">
                <span className="psa-help-msg-avatar">
                  <Avatar size={20} />
                </span>
                <span className="psa-help-msg-bubble psa-help-typing" aria-label="Asisten sedang mengetik">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            )}
          </div>

          <div className="psa-help-input-row">
            <label htmlFor="psa-help-input" className="visually-hidden">
              Tanya asisten
            </label>
            <input
              id="psa-help-input"
              ref={inputRef}
              className="psa-help-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Tanya cara pakai converter…"
              disabled={sending}
            />
            <button
              className="psa-help-send"
              onClick={send}
              disabled={sending || !input.trim()}
              aria-label="Kirim pertanyaan"
              title="Kirim"
            >
              <IconSend size={14} />
            </button>
          </div>
        </div>
      )}
      <button
        ref={btnRef}
        className={`psa-help-bot ${tertutupCta && !open ? "is-tersembunyi" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Tutup asisten" : "Buka asisten bantuan"}
        title="Butuh bantuan?"
      >
        <Avatar size={40} />
      </button>
    </>
  );
}
