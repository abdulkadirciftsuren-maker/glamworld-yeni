import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DilSecici from "./DilSecici";
import "./Giris.css";

const ALTIN_STILLERI = [
  "linear-gradient(110deg,#B8860B 0%,#FFE9A8 38%,#FFD700 52%,#FFE9A8 66%,#B8860B 100%)",
  "linear-gradient(110deg,#9c6f00 0%,#ffd966 30%,#fff4cc 50%,#ffd966 70%,#9c6f00 100%)",
  "linear-gradient(110deg,#7a5c00 0%,#e8c254 35%,#fff8e0 52%,#e8c254 68%,#7a5c00 100%)",
  "linear-gradient(110deg,#a8841a 0%,#ffe9a8 40%,#fffbe8 50%,#ffd700 62%,#a8841a 100%)",
  "linear-gradient(110deg,#c9a227 0%,#fff4cc 45%,#ffe9a8 55%,#c9a227 100%)",
];

const Elmas = ({ extra }) => (
  <svg className={"elmas " + (extra || "")} viewBox="0 0 60 56">
    <defs>
      <linearGradient id="ust" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#bfe3ff" />
      </linearGradient>
      <linearGradient id="altg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#a8d6ff" /><stop offset=".5" stopColor="#5aa6e0" /><stop offset="1" stopColor="#2f6fa8" />
      </linearGradient>
    </defs>
    <polygon points="12,18 22,18 18,8" fill="#dff1ff" />
    <polygon points="22,18 38,18 34,8 26,8" fill="#ffffff" />
    <polygon points="38,18 48,18 42,8" fill="#dff1ff" />
    <polygon points="18,8 26,8 22,18" fill="#eaf7ff" />
    <polygon points="34,8 42,8 38,18" fill="#eaf7ff" />
    <polygon points="26,8 34,8 30,2 " fill="#ffffff" />
    <polygon points="26,8 34,8 38,18 22,18 30,14" fill="url(#ust)" opacity=".7" />
    <rect x="12" y="17" width="36" height="2.5" fill="#cdebff" />
    <polygon points="12,19 48,19 30,54" fill="url(#altg)" />
    <polygon points="12,19 30,19 30,54" fill="#7fc0f5" opacity=".55" />
    <polygon points="20,19 30,54 12,19" fill="#3a86c9" opacity=".4" />
    <polygon points="40,19 30,54 48,19" fill="#2f6fa8" opacity=".5" />
    <polygon points="30,19 30,54 40,19" fill="#9fd0ff" opacity=".4" />
  </svg>
);

export default function Giris() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const kokRef = useRef(null);
  const logoRef = useRef(null);

  useEffect(() => {
    const stil = ALTIN_STILLERI[Math.floor(Math.random() * ALTIN_STILLERI.length)];
    if (logoRef.current) logoRef.current.style.setProperty("--logo-stil", stil);
    const kok = kokRef.current;
    if (!kok) return;
    const zerreler = [];
    for (let i = 0; i < 18; i++) {
      const z = document.createElement("div");
      z.className = "zerre";
      z.style.left = Math.random() * 100 + "%";
      z.style.top = Math.random() * 100 + "%";
      z.style.animationDuration = 4 + Math.random() * 5 + "s";
      z.style.animationDelay = Math.random() * 5 + "s";
      kok.appendChild(z);
      zerreler.push(z);
    }
    return () => { zerreler.forEach((z) => z.remove()); };
  }, []);

  return (
    <div className="giris-kok" ref={kokRef}>
      <DilSecici />
      <div className="giris-ic">
      <div className="kart">
        <div className="logo-sat">
          <Elmas extra="sol" />
          <span className="logo" ref={logoRef}>GLAMWORLD</span>
          <Elmas extra="sag" />
        </div>

        <div className="hosgeldin">{t('hosgeldin')}</div>
        <div className="slogan">{t('slogan')}</div>

        <div style={{ margin: "14px 0 8px", display: "flex", flexDirection: "column", gap: "7px", fontSize: "13.5px", fontWeight: 600, lineHeight: 1.35, textAlign: "left", fontFamily: "'Cormorant Garamond',serif" }}>
          {[t('deger1'), t('deger2'), t('deger3')].map((d, i) => (
            <div key={i} style={{
              background: "linear-gradient(110deg,#B8860B,#FFE9A8,#FFD700,#FFE9A8,#B8860B)",
              WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
              filter: "drop-shadow(0 1px 4px rgba(255,215,0,.35))"
            }}>
              <span style={{ color: "#FFD700", WebkitTextFillColor: "#FFD700", marginRight: "4px" }}>✦</span>{d}
            </div>
          ))}
        </div>

        <button className="btn btn-uye" onClick={() => navigate('/uyeol')}>{t('uyeol')}</button>
        <button className="btn btn-giris" onClick={() => navigate('/giris-yap')}>{t('girisyap')}</button>

        <div className="ayrac"><div className="cizgi"></div><span>{t('veya')}</span><div className="cizgi"></div></div>

        <div className="sosyal">
          <button className="sbtn g" onClick={() => alert('google ile giriş - yakında')}>
            <svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.6 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.6 4.5 24 4.5 16.3 4.5 9.7 8.8 6.3 14.7z" /><path fill="#4CAF50" d="M24 43.5c5.2 0 9.9-2 13.5-5.2l-6.2-5.3C29.2 34.5 26.7 35.5 24 35.5c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.1 16.2 43.5 24 43.5z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.3C41.4 35.8 43.5 30.4 43.5 24c0-1.2-.1-2.3-.4-3.5z" /></svg>
            {t('googleDevam')}
          </button>
          <button className="sbtn m" onClick={() => alert('microsoft ile giriş - yakında')}>
            <svg viewBox="0 0 23 23"><path fill="#f25022" d="M1 1h10v10H1z" /><path fill="#7fba00" d="M12 1h10v10H12z" /><path fill="#00a4ef" d="M1 12h10v10H1z" /><path fill="#ffb900" d="M12 12h10v10H12z" /></svg>
            {t('microsoftDevam')}
          </button>
          <button className="sbtn e" onClick={() => alert('eposta ile giriş - yakında')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#C9A227" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 6l10 7L22 6" /></svg>
            {t('epostaDevam')}
          </button>
        </div>

        <div className="alt-not">{t('hesabinYok')} <b onClick={() => navigate('/uyeol')}>{t('hemenUyeol')}</b></div>
        <div className="kvkk">{t('kvkk')}</div>
      </div>
      </div>
    </div>
  );
}
