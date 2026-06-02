// GEÇİCİ kayıt-başarılı sayfası. Kullanıcıyı Giriş (Hoş Geldin) kartına geri
// ATMAZ — kayıt burada biter. İleride gerçek Profesyonel Anasayfası yapılınca
// bu sayfa onunla değiştirilecek.
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { auth } from "./firebase";

export default function KayitTamam() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const eposta = (auth.currentUser && auth.currentUser.email) || "";
  // Kayıt biter bitmez kısa bir kutlamadan sonra ANA SAYFAYA götür
  useEffect(() => {
    const z = setTimeout(() => navigate("/anasayfa", { replace: true }), 4000);
    return () => clearTimeout(z);
  }, [navigate]);
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      background: "radial-gradient(circle at 50% 32%, #1a1206 0%, #0a0a0f 72%)",
      color: "#FFD700", padding: "24px", fontFamily: "'Cormorant Garamond', serif",
    }}>
      <svg width="88" height="88" viewBox="0 0 88 88" style={{ marginBottom: "20px" }}>
        <circle cx="44" cy="44" r="40" fill="none" stroke="#C9A227" strokeWidth="3" />
        <circle cx="44" cy="44" r="40" fill="none" stroke="rgba(255,215,0,.25)" strokeWidth="8" />
        <path d="M27 45 L39 57 L62 31" fill="none" stroke="#FFD700" strokeWidth="5"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h1 style={{
        fontFamily: "'Cinzel', serif", fontSize: "30px", letterSpacing: "2px",
        margin: "0 0 12px", color: "#FFE9A8",
      }}>{t('kayitTamam')}</h1>
      <p style={{ fontSize: "19px", color: "#d8c89a", maxWidth: "420px", margin: "0 0 18px", lineHeight: 1.4 }}>
        {t('kayitTamamMesaj')}
      </p>
      {eposta && (
        <div style={{
          margin: "0 0 22px", padding: "12px 20px", borderRadius: "14px",
          border: "1.5px solid rgba(255,215,0,.45)", background: "rgba(255,215,0,.07)",
          maxWidth: "380px", boxShadow: "0 0 18px rgba(255,215,0,.15)",
        }}>
          <div style={{ fontSize: "13px", color: "#b6a87f", marginBottom: "4px" }}>✓ {t('kayitliEposta')}</div>
          <div style={{ fontSize: "16px", color: "#FFD700", fontWeight: 700, wordBreak: "break-word" }}>{eposta}</div>
        </div>
      )}
      <p style={{ fontSize: "15px", color: "#8a7d5c", maxWidth: "380px", margin: "0 0 24px", lineHeight: 1.4, fontStyle: "italic" }}>
        {t('profilYakinda')}
      </p>
      <button onClick={() => navigate("/anasayfa", { replace: true })} style={{
        background: "linear-gradient(180deg,#FFE9A8,#FFD700,#B8860B)", color: "#2a1d00", border: "none",
        borderRadius: "26px", padding: "13px 34px", fontSize: "16px", letterSpacing: ".5px",
        fontFamily: "'Cinzel', serif", fontWeight: 700, cursor: "pointer",
        boxShadow: "0 8px 22px rgba(255,215,0,.3)",
      }}>{t('anaSayfaKutla')} →</button>
    </div>
  );
}
