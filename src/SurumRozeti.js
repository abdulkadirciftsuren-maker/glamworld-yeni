import { useRef, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { buildGecmisi, sonBuild } from "./buildGecmisi";
import "./SurumRozeti.css";

// Sürüm rozetini SADECE yönetici görür (müşterilere gizli).
const YONETICI_EPOSTA = "abdulkadirciftsuren@gmail.com";

// SIFIRDAN SADE SÜRÜM ROZETİ — sol-altta küçük pill, parmakla taşınır,
// dokununca geçmiş açılır. SADECE yönetici (sahip e-posta) için görünür.
export default function SurumRozeti() {
  const el = useRef(null);
  const s = useRef({ on: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const [acik, setAcik] = useState(false);
  const [yonetici, setYonetici] = useState(false);

  useEffect(() => {
    try {
      const cur = auth.currentUser;
      if (cur && cur.email && cur.email.toLowerCase() === YONETICI_EPOSTA) setYonetici(true);
    } catch (_) {}
    const off = onAuthStateChanged(auth, (u) => {
      setYonetici(!!(u && u.email && u.email.toLowerCase() === YONETICI_EPOSTA));
    });
    return () => { try { off(); } catch (_) {} };
  }, []);

  const surum = `${sonBuild.surum}.B${sonBuild.build}`;

  if (!yonetici) return null;

  function bas(e) {
    if (e.target.closest(".sr-list")) return;
    const r = el.current.getBoundingClientRect();
    s.current = { on: true, moved: false, sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top };
    try { el.current.setPointerCapture(e.pointerId); } catch (_) {}
  }
  function git(e) {
    const d = s.current; if (!d.on) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;
    const w = el.current.offsetWidth, h = el.current.offsetHeight;
    const x = Math.max(6, Math.min(d.ox + dx, window.innerWidth - w - 6));
    const y = Math.max(6, Math.min(d.oy + dy, window.innerHeight - h - 6));
    el.current.style.left = x + "px";
    el.current.style.top = y + "px";
    el.current.style.bottom = "auto";
    el.current.style.right = "auto";
  }
  function bitir() { s.current.on = false; }
  function tikla() { if (!s.current.moved) setAcik((v) => !v); }

  return (
    <div className="sr" ref={el} onPointerDown={bas} onPointerMove={git} onPointerUp={bitir} onPointerCancel={bitir} onClick={tikla}>
      <span className="sr-dot" />
      <span className="sr-ver">{surum}</span>
      {acik && (
        <div className="sr-list" onClick={(e) => e.stopPropagation()}>
          {buildGecmisi.slice(0, 15).map((b, i) => (
            <div className={"sr-row" + (i === 0 ? " sr-son" : "")} key={i}>
              <div className="sr-row-ust"><b>{b.surum}.{b.build}</b><span>{b.tarih} {b.saat}</span></div>
              <div className="sr-dosya">{b.dosya}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
