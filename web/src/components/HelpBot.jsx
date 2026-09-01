import { useEffect, useRef, useState } from "react";
import { askAssistant } from "../lib/api.js";

const GREETING = {
  role: "assistant",
  text: "Halo! Aku asisten Panca Swap Agent 👋 Tanya aku cara pakai converter ini, atau ketik pertanyaanmu di bawah.",
};

/* Avatar maskot: pakai gambar kalau ada di /public/mascot.png,          */
/* fallback ke emoji kalau file belum ditaruh / gagal dimuat.            */
function Avatar({ size = 22 }) {
  const [broken, setBroken] = useState(false);
  if (broken) return <span aria-hidden="true">🤖</span>;
  return (
    <img
      src="/mascot.png"
      alt=""
      width={size}
      height={size}
      style={{ borderRadius: "50%", objectFit: "cover" }}
      onError={() => setBroken(true)}
    />
  );
}

/* Maskot robot, sekarang jadi asisten AI beneran (bukan FAQ statis) —  */
/* pakai Groq yang sudah terhubung lewat /api/assistant, dengan prompt  */
/* yang dibatasi hanya menjawab seputar cara pakai situs ini.            */
export default function HelpBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const panelRef = useRef(null);
  const btnRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

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
              <span style={{ fontSize: 11, color: "var(--text-faint)" }}>Siap bantu cara pakai situs ini</span>
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
              ➤
            </button>
          </div>
        </div>
      )}
      <div className={`psa-help-bot-track ${open ? "is-docked" : ""}`}>
        <button
          ref={btnRef}
          className="psa-help-bot"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Tutup asisten" : "Buka asisten bantuan"}
          title="Asisten bantuan"
        >
          <span className="psa-help-bot-bob">
            <Avatar size={28} />
          </span>
        </button>
      </div>
    </>
  );
}
