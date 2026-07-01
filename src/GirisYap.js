import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, OAuthProvider } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import "./GirisYap.css";
import SurumRozeti from "./SurumRozeti";

// Firebase hata kodlarını çeviri ANAHTARINA çevirir (t() ile dile döner)
function hataMesajiKey(kod) {
  switch (kod) {
    case "auth/invalid-email": return "ghEpostaGecerli";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential": return "ghYanlis";
    case "auth/too-many-requests": return "ghCokDeneme";
    case "auth/network-request-failed": return "ghInternet";
    case "auth/popup-closed-by-user": return "ghPopup";
    case "auth/operation-not-allowed": return "ghYontemKapali";
    default: return "ghGenel";
  }
}

// E-posta alan adına göre sağlayıcı öner: gmail → Google, hotmail/outlook/live → Microsoft
function saglayiciOner(email) {
  const m = (String(email).split("@")[1] || "").toLowerCase().trim();
  if (!m) return "";
  if (m === "gmail.com" || m === "googlemail.com" || m.endsWith(".gmail.com")) return "google";
  if (/^(hotmail|outlook|live|msn|windowslive|passport)\./.test(m) ||
      ["hotmail.com", "outlook.com", "live.com", "msn.com", "windowslive.com"].includes(m)) return "microsoft";
  return "";
}

// Giriş sayfasına özel ALTIN gömülü pırlanta ("tekrar hoş geldin" — sıcak)
function AltinTas({ boyut = 58 }) {
  const id = useRef("g" + Math.random().toString(36).slice(2, 8)).current;
  return (
    <svg viewBox="0 0 120 120" style={{ width: boyut, height: boyut }}>
      <defs>
        <radialGradient id={id + "y"} cx="50%" cy="42%" r="62%"><stop offset="0" stopColor="#2a2418" /><stop offset="60%" stopColor="#120f09" /><stop offset="100%" stopColor="#050403" /></radialGradient>
        <radialGradient id={id + "t"} cx="50%" cy="40%" r="62%"><stop offset="0" stopColor="#fffbe0" /><stop offset="40%" stopColor="#ffe79a" /><stop offset="75%" stopColor="#e0a020" /><stop offset="100%" stopColor="#8a6010" /></radialGradient>
        <radialGradient id={id + "m"} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="rgba(255,240,180,.98)" /><stop offset="100%" stopColor="rgba(255,210,80,0)" /></radialGradient>
      </defs>
      <ellipse cx="60" cy="60" rx="50" ry="50" fill={`url(#${id}y)`} stroke="#C9A227" strokeWidth="2.5" />
      <ellipse cx="60" cy="60" rx="41" ry="41" fill="#0a0805" stroke="rgba(201,162,39,.3)" strokeWidth="1.2" />
      <circle cx="60" cy="60" r="32" fill={`url(#${id}t)`} />
      <polygon points="60,60 40,46 60,38" fill="#fffbe0" opacity=".55" /><polygon points="60,60 60,38 80,46" fill="#fff0c0" opacity=".5" />
      <polygon points="60,60 80,46 86,64" fill="#ffe79a" opacity=".45" /><polygon points="60,60 86,64 74,82" fill="#e0a020" opacity=".5" />
      <polygon points="60,60 74,82 46,82" fill="#a07818" opacity=".5" /><polygon points="60,60 46,82 34,64" fill="#c08a18" opacity=".5" />
      <polygon points="60,60 34,64 40,46" fill="#ffe79a" opacity=".45" />
      <circle cx="60" cy="58" r="14" fill={`url(#${id}m)`} />
      <circle cx="60" cy="29" r="5.5" fill="#FFE9A8" stroke="#8a6010" strokeWidth="1.2" /><circle cx="89" cy="48" r="5.5" fill="#FFD700" stroke="#8a6010" strokeWidth="1.2" /><circle cx="31" cy="48" r="5.5" fill="#FFD700" stroke="#8a6010" strokeWidth="1.2" />
    </svg>
  );
}

export default function GirisYap() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const kokRef = useRef(null);
  const [ep, setEp] = useState("");
  const [sifre, setSifre] = useState("");
  const [sifreTip, setSifreTip] = useState("password");
  const [hata, setHata] = useState({});
  const [bilgi, setBilgi] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    const kok = kokRef.current; if (!kok) return;
    const zerreler = [];
    for (let i = 0; i < 16; i++) {
      const z = document.createElement("div");
      z.className = "gy-zerre";
      z.style.left = Math.random() * 100 + "%";
      z.style.top = Math.random() * 100 + "%";
      z.style.animationDuration = 4 + Math.random() * 5 + "s";
      z.style.animationDelay = Math.random() * 5 + "s";
      kok.appendChild(z); zerreler.push(z);
    }
    return () => zerreler.forEach(z => z.remove());
  }, []);

  async function girisYap() {
    const h = {};
    if (!ep.trim()) h.ep = t("ghEpostaGir");
    else if (ep.indexOf("@") === -1) h.ep = t("ghEpostaGecerli");
    if (!sifre.trim()) h.sifre = t("ghSifreGir");
    setHata(h);
    if (Object.keys(h).length > 0) return;
    setBilgi("");
    setYukleniyor(true);
    try {
      await signInWithEmailAndPassword(auth, ep.trim(), sifre);
      navigate("/anasayfa", { replace: true });
    } catch (e) {
      // Hesap YOKSA / kimlik eşleşmiyorsa → herhangi bir e-posta ile YENİ hesap aç (ilk girişteki gibi kabul et)
      if (e.code === "auth/user-not-found" || e.code === "auth/invalid-credential" || e.code === "auth/invalid-login-credentials") {
        if ((sifre || "").length < 6) { setBilgi(t("ghSifreKisa", "Şifre en az 6 karakter olmalı.")); setYukleniyor(false); return; }
        try {
          await createUserWithEmailAndPassword(auth, ep.trim(), sifre);
          navigate("/anasayfa", { replace: true });
        } catch (e2) {
          if (e2.code === "auth/email-already-in-use") setBilgi(t("ghVarSifreYanlis", "Bu e-posta kayıtlı ama şifre yanlış. (Google ile açtıysan Google düğmesiyle gir.)"));
          else setBilgi(t(hataMesajiKey(e2.code)));
        }
      } else {
        setBilgi(t(hataMesajiKey(e.code)));
      }
    } finally {
      setYukleniyor(false);
    }
  }

  async function googleGiris() {
    setBilgi("");
    setYukleniyor(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/anasayfa", { replace: true });
    } catch (e) {
      setBilgi(t(hataMesajiKey(e.code)));
    } finally {
      setYukleniyor(false);
    }
  }

  async function microsoftGiris() {
    setBilgi("");
    setYukleniyor(true);
    try {
      await signInWithPopup(auth, new OAuthProvider("microsoft.com"));
      navigate("/anasayfa", { replace: true });
    } catch (e) {
      setBilgi(t(hataMesajiKey(e.code)));
    } finally {
      setYukleniyor(false);
    }
  }

  function yakinda(ad) {
    setBilgi(ad + " " + t("yakindaSon"));
    setTimeout(() => setBilgi(""), 3500);
  }

  return (
    <div className="gy-kok" ref={kokRef}>
      <SurumRozeti />
      <div className="gy-kart">
        <div className="gy-logo-sat">
          <AltinTas boyut={58} />
          <span className="gy-logo notranslate" translate="no">GLOXORG</span>
        </div>
        <div className="gy-baslik">{t('girisYapLink')}</div>
        <div className="gy-slogan">{t('tekrarHosgeldinBaslik')}</div>

        <label className="gy-label">{t('eposta')}</label>
        <input className={"gy-input" + (hata.ep ? " hatali" : "")} type="email" autoComplete="email" placeholder={t('epostaPh')}
          value={ep} onChange={e => { setEp(e.target.value); setHata(h => ({ ...h, ep: "" })); }} />
        {hata.ep && <span className="gy-hata">{hata.ep}</span>}

        <label className="gy-label">{t('sifre')}</label>
        <div className="gy-sifre-sar">
          <input className={"gy-input" + (hata.sifre ? " hatali" : "")} type={sifreTip} autoComplete="current-password" placeholder={t('sifrenPh')}
            value={sifre} onChange={e => { setSifre(e.target.value); setHata(h => ({ ...h, sifre: "" })); }} />
          <span className="gy-goz" onClick={() => setSifreTip(p => p === "password" ? "text" : "password")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
          </span>
        </div>
        {hata.sifre && <span className="gy-hata">{hata.sifre}</span>}

        <div className="gy-unuttum" onClick={() => yakinda(t('sifreSifirlama'))}>{t('sifreniUnuttun')}</div>

        {bilgi && <div className="gy-bilgi">{bilgi}</div>}
        <button className="gy-btn" onClick={girisYap} disabled={yukleniyor}>{yukleniyor ? t('girisYapiliyor') : t('girisyap')}</button>

        <div className="gy-ayrac"><span>{t('veya')}</span></div>

        {(() => {
          const oneri = saglayiciOner(ep);
          const rozet = <span style={{ marginLeft: "auto", fontSize: "11px", fontWeight: 700, color: "#FFD700", border: "1px solid rgba(255,215,0,.5)", borderRadius: "8px", padding: "2px 8px", letterSpacing: ".3px" }}>{t('onerilen')}</span>;
          const vurguStil = { borderColor: "#FFD700", boxShadow: "0 0 18px rgba(255,215,0,.45)" };
          const google = (
            <button key="g" className="gy-sosyal" style={oneri === "google" ? vurguStil : undefined} onClick={googleGiris} disabled={yukleniyor}>
              <svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.6 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.6 4.5 24 4.5 16.3 4.5 9.7 8.8 6.3 14.7z" /><path fill="#4CAF50" d="M24 43.5c5.2 0 9.9-2 13.5-5.2l-6.2-5.3C29.2 34.5 26.7 35.5 24 35.5c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.1 16.2 43.5 24 43.5z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.3C41.4 35.8 43.5 30.4 43.5 24c0-1.2-.1-2.3-.4-3.5z" /></svg>
              {t('googleGiris')}{oneri === "google" && rozet}
            </button>
          );
          const microsoft = (
            <button key="m" className="gy-sosyal" style={oneri === "microsoft" ? vurguStil : undefined} onClick={microsoftGiris} disabled={yukleniyor}>
              <svg viewBox="0 0 23 23"><path fill="#f25022" d="M1 1h10v10H1z" /><path fill="#7fba00" d="M12 1h10v10H12z" /><path fill="#00a4ef" d="M1 12h10v10H1z" /><path fill="#ffb900" d="M12 12h10v10H12z" /></svg>
              {t('microsoftGiris')}{oneri === "microsoft" && rozet}
            </button>
          );
          return oneri === "microsoft" ? [microsoft, google] : [google, microsoft];
        })()}

        <button className="gy-geri" onClick={() => navigate(-1)}>&#8592; {t('geriDon')}</button>
        <div className="gy-alt">{t('hesabinYok')} <b onClick={() => navigate("/uyeol")}>{t('uyeolBaslik')}</b></div>
      </div>
    </div>
  );
}
