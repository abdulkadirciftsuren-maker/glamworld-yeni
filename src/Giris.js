import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, OAuthProvider, FacebookAuthProvider, sendPasswordResetEmail, signOut, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "./firebase";
import { girisEpostasiGonder } from "./eposta";
import DilSecici from "./DilSecici";
import SurumRozeti from "./SurumRozeti";
import { Elmas6Kose } from "./Anasayfa";
import "./Giris.css";

const ALTIN_STILLERI = [
  "linear-gradient(110deg,#B8860B 0%,#FFE9A8 38%,#FFD700 52%,#FFE9A8 66%,#B8860B 100%)",
  "linear-gradient(110deg,#9c6f00 0%,#ffd966 30%,#fff4cc 50%,#ffd966 70%,#9c6f00 100%)",
  "linear-gradient(110deg,#7a5c00 0%,#e8c254 35%,#fff8e0 52%,#e8c254 68%,#7a5c00 100%)",
  "linear-gradient(110deg,#a8841a 0%,#ffe9a8 40%,#fffbe8 50%,#ffd700 62%,#a8841a 100%)",
  "linear-gradient(110deg,#c9a227 0%,#fff4cc 45%,#ffe9a8 55%,#c9a227 100%)",
];

// Giriş kartı elması — ana sayfadakinden FARKLI: ALTI KÖŞE (hexagon) elmas (kullanıcı: ana sayfa pırlantasını kullanma).
const Elmas = ({ extra }) => (
  <span className={"elmas " + (extra || "")}>
    <Elmas6Kose c="#bfe3ff" />
  </span>
);

function hataKey(kod) {
  switch (kod) {
    case "auth/invalid-email": return "ghEpostaGecerli";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential": return "ghYanlis";
    case "auth/too-many-requests": return "ghCokDeneme";
    case "auth/network-request-failed": return "ghInternet";
    default: return "ghGenel";
  }
}

// ŞİFRE MASKOTU — köşeye tüneyen GERÇEK karakter (yuvarlak içine sıkışmış DEĞİL). Şifre AÇIK iken
// gözlerini SAPLARI üzerinde AŞAĞI-SOLA (yazıya doğru) UZATIR ve şifreye bakar; gizliyken sapları
// kısalır, gözleri kapanır. Hata olunca kırmızı. Yazının ÜSTÜNE binmez (şeridin üstünde tüner).
function MiniMaskot({ acik, hata }) {
  const renk = hata ? "#ff5d6c" : "#3f63e8";
  const koyu = hata ? "#b8313c" : "#243f9c";
  const gy = acik ? 46 : 30;          // göz küresi y: açıkken aşağı UZAR (yazıya bakar)
  const dx = acik ? 3 : 0;            // açıkken hafif SOLA (yazıya doğru) eğil
  const solX = 13 - dx, sagX = 25 - dx;
  return (
    <svg viewBox="0 0 38 58" width="38" height="58" aria-hidden="true">
      {/* tepedeki gövde + minik kulaklar (karakter şeritte tüner) */}
      <ellipse cx="11" cy="7" rx="3.4" ry="4.6" fill={renk} /><ellipse cx="27" cy="7" rx="3.4" ry="4.6" fill={renk} />
      <ellipse cx="11" cy="7" rx="1.5" ry="2.4" fill={koyu} /><ellipse cx="27" cy="7" rx="1.5" ry="2.4" fill={koyu} />
      <circle cx="19" cy="15" r="11.5" fill={renk} />
      <ellipse cx="19" cy="18" rx="6.5" ry="5" fill={koyu} opacity="0.35" />
      <path d="M14 21 Q19 25.5 24 21" stroke={koyu} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* GÖZ SAPLARI (boyun) — gövdeden aşağı uzanır; açıkken uzar */}
      <path d={`M14 24 Q${solX - 1} ${(24 + gy) / 2} ${solX} ${gy}`} stroke={renk} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d={`M24 24 Q${sagX + 1} ${(24 + gy) / 2} ${sagX} ${gy}`} stroke={renk} strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* GÖZ KÜRELERİ */}
      <circle cx={solX} cy={gy} r="5.4" fill="#fff" stroke={koyu} strokeWidth="1" />
      <circle cx={sagX} cy={gy} r="5.4" fill="#fff" stroke={koyu} strokeWidth="1" />
      {acik ? (
        <>
          {/* göz bebekleri AŞAĞI-SOLA (yazıya) bakar */}
          <circle cx={solX - 1.4} cy={gy + 1.8} r="2.6" fill="#10131c" /><circle cx={sagX - 1.4} cy={gy + 1.8} r="2.6" fill="#10131c" />
          <circle cx={solX - 2.1} cy={gy + 0.9} r="0.8" fill="#fff" /><circle cx={sagX - 2.1} cy={gy + 0.9} r="0.8" fill="#fff" />
        </>
      ) : (
        <>
          {/* kapalı göz (uyur gibi) */}
          <path d={`M${solX - 3} ${gy} Q${solX} ${gy + 2.6} ${solX + 3} ${gy}`} stroke="#10131c" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d={`M${sagX - 3} ${gy} Q${sagX} ${gy + 2.6} ${sagX + 3} ${gy}`} stroke="#10131c" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export default function Giris({ zorunluUye }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const kokRef = useRef(null);
  const logoRef = useRef(null);
  // zorunluUye: Google ile gelip henüz kaydı OLMAYAN kullanıcı → doğrudan üye modunda açılır (tür seçer).
  const [mod, setMod] = useState(zorunluUye ? "uye" : "giris");
  const [aciklama, setAciklama] = useState(null);  // (kullanılmıyor — üyelik tek kart)
  const [isim, setIsim] = useState("");
  const [soyad, setSoyad] = useState("");
  const [sifre2, setSifre2] = useState(""); // şifre tekrar
  const [sifreHata, setSifreHata] = useState(false); // şifrelerde sorun → KIRMIZI
  const [ep, setEp] = useState("");
  const [sifre, setSifre] = useState("");
  const [goz, setGoz] = useState(false);
  // Tarayıcı OTOMATİK DOLDURMA kilidi: alanlar açılışta readOnly → Chrome/telefon eski/başka hesabın
  // e-posta+şifresini sayfa yüklenince YAPIŞTIRAMAZ. Kullanıcı bir alana dokununca (yazma niyeti) açılır.
  const [kilit, setKilit] = useState(true);
  const kilitAc = () => { if (kilit) setKilit(false); };
  // E-posta: HERHANGİ geçerli adres kabul (Gmail/Hotmail/groxorg...). @groxorg.com SABİT DEĞİL —
  // sadece arka-fon ipucu (placeholder), yazınca kaybolur. Kullanıcı eski hesabına istediği e-postayla girer.
  const epGecerli = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((ep || "").trim());
  // İki şifre tutmuyorsa ANINDA uyar (yazarken kırmızı + alt yazı) — kullanıcı: hemen uyarsın.
  const sifreUyumsuz = (sifre || "").length > 0 && (sifre2 || "").length > 0 && sifre !== sifre2;
  // Kart değiştir → alanları TEMİZLE: giriş↔üye arası e-posta/şifre TAŞINMASIN (kullanıcı isteği).
  function modGec(yeni) {
    setMod(yeni); setEp(""); setSifre(""); setSifre2(""); setBilgi(""); setSifreHata(false); setGoz(false);
  }
  const [bilgi, setBilgi] = useState("");
  const [yuk, setYuk] = useState(false);
  const [sifreModal, setSifreModal] = useState(false); // şifre sıfırlama penceresi
  const [sifreEp, setSifreEp] = useState("");           // sıfırlanacak e-posta (yukarıdaki adres önerilir)
  const [sifreMsg, setSifreMsg] = useState("");
  const [toast, setToast] = useState("");               // ekran üstü bildirim
  function saglayiciAdi(saglayici) {
    const id = (saglayici && saglayici.providerId) || "";
    if (id.indexOf("google") !== -1) return "Google";
    if (id.indexOf("microsoft") !== -1) return "Microsoft";
    if (id.indexOf("facebook") !== -1) return "Facebook";
    if (id.indexOf("apple") !== -1) return "Apple";
    return "";
  }

  // Yazılan e-postanın alan adına göre giriş sağlayıcısını öner (doğru düğme öne çıksın).
  function saglayiciOner(email) {
    const m = ((email || "").split("@")[1] || "").toLowerCase().trim();
    if (!m) return "";
    if (["gmail.com", "googlemail.com"].includes(m)) return "google";
    if (["hotmail.com", "outlook.com", "live.com", "msn.com", "windowslive.com", "hotmail.co.uk", "outlook.com.tr"].includes(m)) return "microsoft";
    if (["icloud.com", "me.com", "mac.com"].includes(m)) return "apple";
    return "";
  }
  const oneri = saglayiciOner(ep);

  // Sosyal giriş yükleme ekranı index.html'de (#gw-yuk). React'ten ÖNCE de görünür,
  // sayfa yeniden yüklense bile beyaz flash olmaz — tek koyu ekran kalır.
  function sosyalYukGoster(metin) {
    try { sessionStorage.setItem("gwYukMetin", metin); } catch (e) {}
    const el = document.getElementById("gw-yuk");
    if (el) { const m = document.getElementById("gw-yuk-m"); if (m) m.textContent = metin; el.style.display = "flex"; }
  }
  function sosyalYukGizle() {
    try { sessionStorage.removeItem("gwYukMetin"); } catch (e) {}
    const el = document.getElementById("gw-yuk"); if (el) el.style.display = "none";
  }

  // Herkes MÜŞTERİ olarak girer — profili DOĞRUDAN burada oluştur (ayrı form yok)
  async function musteriProfilYaz(u, isimAd, soyAd) {
    const ad = (isimAd || (u.displayName || "").split(" ")[0] || "").trim();
    const soy = (soyAd || (u.displayName || "").split(" ").slice(1).join(" ") || "").trim();
    try { await setDoc(doc(db, "kullanicilar", u.uid), { tip: "musteri", isim: ad, soyisim: soy, eposta: u.email || "", foto: u.photoURL || "", olusturma: Date.now() }, { merge: true }); } catch (e) {}
    try { await updateProfile(u, { displayName: (ad + " " + soy).trim() || u.displayName }); } catch (e) {}
    try { localStorage.setItem("gw_profilVar", "1"); localStorage.setItem("gw_tip", "musteri"); localStorage.setItem("gw_profilVarZaman", String(Date.now())); } catch (e) {}
    try { girisEpostasiGonder(u.email, (ad + " " + soy).trim()).catch(() => {}); } catch (e) {}
  }
  // ÜYE OL — tek kart: isim, soyad, e-posta, 2 şifre → müşteri → ana sayfa
  async function uyeOl() {
    if (!isim.trim()) { setBilgi(t("hataIsim", "Lütfen isminizi girin.")); return; }
    if (!soyad.trim()) { setBilgi(t("hataSoyisim", "Lütfen soyisminizi girin.")); return; }
    if (!epGecerli) { setBilgi(t("ghEpostaGecerli")); return; }
    if ((sifre || "").length < 8 || !/[0-9]/.test(sifre) || !/[a-zA-ZçğıİıöşüÇĞÖŞÜ]/.test(sifre)) { setSifreHata(true); setGoz(true); setBilgi(t("ghSifreKural", "Şifre en az 8 karakter olmalı ve harf + rakam içermeli.")); return; }
    if (sifre !== sifre2) { setSifreHata(true); setGoz(true); setBilgi(t("ghSifreUyusmuyor", "İki şifre aynı değil.")); return; }
    setSifreHata(false); setBilgi(""); setYuk(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, ep.trim(), sifre);
      await musteriProfilYaz(cred.user, isim, soyad);
      navigate("/anasayfa", { replace: true });
    } catch (e) {
      const k = (e && e.code) || "";
      if (k === "auth/email-already-in-use") { setBilgi(t("ghEpostaVar", "Bu e-posta zaten kayıtlı, giriş yapabilirsin.")); setMod("giris"); }
      else setBilgi(t(hataKey(k)));
    } finally { setYuk(false); }
  }

  async function sosyal(saglayici) {
    sosyalYukGoster(t("sosyalGirisMetin", { ad: saglayiciAdi(saglayici) }));
    try {
      const cred = await signInWithPopup(auth, saglayici);
      // KAYIT ŞART: profil yoksa OTOMATİK üye YAPMA. Varsa direkt gir, yoksa tür seçtir.
      let profilVar = false;
      try {
        const snap = await getDoc(doc(db, "kullanicilar", cred.user.uid));
        profilVar = snap.exists();
      } catch (_) { profilVar = true; } // okuma hatasında kilitleme
      if (profilVar) {
        try { localStorage.setItem("gw_profilVar", "1"); } catch (e) {}
        // (Giriş bildirim e-postası TEK SEFERLİK — sadece ilk kayıtta gönderilir, her girişte değil.)
        navigate("/anasayfa", { replace: true });
      } else {
        // Kayıt YOK → OTOMATİK müşteri profili oluştur + ana sayfa (ayrı form/Pro seçimi YOK)
        await musteriProfilYaz(cred.user);
        navigate("/anasayfa", { replace: true });
      }
    } catch (e) {
      sosyalYukGizle();
      const k = (e && e.code) || "";
      if (k.indexOf("popup") === -1 && k !== "auth/cancelled-popup-request") setBilgi(t("ghYontemKapali") + (k ? " [" + k + "]" : ""));
    }
  }

  // Şifremi unuttum penceresini aç — yukarıda girilen e-postayı hazır getir.
  function sifreModalAc() {
    setSifreEp(ep || "");
    setSifreMsg("");
    setSifreModal(true);
  }

  // Şifre sıfırlama: girilen e-posta adresine sıfırlama bağlantısı gönder.
  async function sifreSifirla() {
    if (!sifreEp.trim() || sifreEp.indexOf("@") === -1) { setSifreMsg(t("sifreEpostaGir")); return; }
    setSifreMsg("");
    try {
      await sendPasswordResetEmail(auth, sifreEp.trim());
      // Başarılı: pencereyi kapat, ekranda bildirim göster.
      setSifreModal(false);
      setToast(t("sifreSifirlandi"));
      setTimeout(() => setToast(""), 6000);
    } catch (e) {
      setSifreMsg(t(hataKey(e.code)));
    }
  }

  // GİRİŞ — SADECE var olan hesaba girer. ASLA yeni hesap AÇMAZ (kullanıcı: giriş kartı her seferinde yeni
  // hesap açıyordu, Google/Hotmail ile açtığım eski profilime/fotoğraflarıma erişemiyordum). Hesap yoksa
  // "üye ol" der. Hesap açma SADECE Üye Ol kartında (uyeOl) olur.
  async function epGiris() {
    if (!epGecerli) { setBilgi(t("ghEpostaGecerli")); return; }
    if (!sifre.trim()) { setBilgi(t("ghSifreGir")); return; }
    setBilgi(""); setYuk(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, ep.trim(), sifre);
      // Mevcut kullanıcının profili VAR → bayrağı HEMEN set et (giriş sonrası ARADA kart çıkmasın, direkt sayfa)
      let varmi = false; try { const s = await getDoc(doc(db, "kullanicilar", cred.user.uid)); varmi = s.exists(); } catch (_) { varmi = true; }
      if (varmi) { try { localStorage.setItem("gw_profilVar", "1"); localStorage.setItem("gw_profilVarZaman", String(Date.now())); } catch (e) {} }
      else { await musteriProfilYaz(cred.user); } // gerçekten girilen mevcut hesap ama profil belgesi yoksa oluştur
      navigate("/anasayfa", { replace: true });
    } catch (e) {
      const kod = (e && e.code) || "";
      // Hesap yok / şifre yanlış → YENİ HESAP AÇMA, ŞERİT KIRMIZI + maskot şifreyi AÇSIN + hata altta yaz.
      if (kod === "auth/wrong-password" || kod === "auth/invalid-credential" || kod === "auth/user-not-found" || kod === "auth/invalid-login-credentials") {
        setSifreHata(true); setGoz(true);
        setBilgi(t("ghGirisYanlis", "E-posta veya şifre hatalı. Hesabın yoksa yukarıdan ÜYE OL. (Daha önce Google/Microsoft ile girdiysen o düğmeyi kullan.)"));
      } else { setSifreHata(true); setGoz(true); setBilgi(t(hataKey(kod))); }
    } finally { setYuk(false); }
  }

  // ZORUNLU ÜYE ekranından ÇIKIŞ → giriş kartına dön (başka hesapla, ör. Google ile gir).
  // Kullanıcı: Hotmail ile girince boş hesap açılıyor, eski (Google) paylaşımlarıma dönemiyorum, kapana kısılıyorum.
  async function cikisYapVeGiris() {
    setYuk(true);
    try { localStorage.removeItem("gw_profilVar"); localStorage.removeItem("gw_tip"); localStorage.removeItem("gw_profilVarZaman"); } catch (e) {}
    try { await signOut(auth); } catch (e) {}
    setYuk(false); setMod("giris"); setAciklama(null); setBilgi("");
    // signOut → App onAuthStateChanged → kullanici null → "/" giriş kartını gösterir
  }

  // Formdan "zaten kayıtlı" yönlendirmesi geldiyse: bildirim göster + e-postayı hazırla.
  useEffect(() => {
    try {
      const tm = sessionStorage.getItem("gw_toast");
      if (tm) { setToast(tm); sessionStorage.removeItem("gw_toast"); setTimeout(() => setToast(""), 6000); }
      const le = sessionStorage.getItem("gw_login_ep");
      if (le) { setEp(le); sessionStorage.removeItem("gw_login_ep"); }
    } catch (e) {}
  }, []);

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
      {toast && <div className="giris-toast" onClick={() => setToast("")}>{toast}</div>}
      <DilSecici />
      <SurumRozeti />
      <div className="giris-ic">
        <div className="kart">
          <div className="logo-sat">
            <span className="logo-amblem">
              <span className="elmas-konum"><Elmas extra="sol" /></span>
              <span className="logo notranslate" translate="no" ref={logoRef}>GLOXORG</span>
            </span>
          </div>
          <div className="hosgeldin">{t('hosgeldin')}</div>
          <div className="slogan">{t('slogan')}</div>

          {/* Üye Ol modunda başlık; Giriş modunda başlık yerine üstte üye-ol düğmesi + açıklama */}
          {mod === "uye" && <div className="giris-mod-baslik">{t('uyeolBaslik')}</div>}

          {mod === "uye" ? (
            <>
              {/* ÜYE OL — SADECE alanlar (sosyal düğmeler GİRİŞ kartında; burada YOK). isim+soyad ve 2 şifre YAN YANA. */}
              <div className="uye-yonerge">{t('uyeYonergeKart', 'Saniyede üye ol — bilgilerini gir.')}</div>
              <div className="uye-ikili-alan">
                <div><label className="giris-label">{t('isim', 'İsim')}</label><input className="giris-input" type="text" name="gw-ad" autoComplete="given-name" placeholder={t('isimPh', 'İsminiz')} value={isim} onChange={(e) => { setIsim(e.target.value); setBilgi(""); }} /></div>
                <div><label className="giris-label">{t('soyisim', 'Soyisim')}</label><input className="giris-input" type="text" name="gw-soyad" autoComplete="family-name" placeholder={t('soyisimPh', 'Soyisminiz')} value={soyad} onChange={(e) => { setSoyad(e.target.value); setBilgi(""); }} /></div>
              </div>
              <label className="giris-label">{t('eposta')}</label>
              <input className="giris-input" type="email" inputMode="email" name="gw-uye-mail" autoComplete="email" readOnly={kilit} onFocus={kilitAc} placeholder="ornek@groxorg.com" value={ep} onChange={(e) => { setEp(e.target.value); setBilgi(""); }} />
              <div className="uye-ikili-alan uye-sifre-alan">
                <div>
                  <label className="giris-label">{t('sifre')}</label>
                  <div className={"giris-sifre" + ((sifreHata || sifreUyumsuz) ? " hatali" : "")}>
                    <input className={"giris-input" + ((sifreHata || sifreUyumsuz) ? " hatali" : "")} type={goz ? "text" : "password"} name="gw-uye-pw" autoComplete="new-password" readOnly={kilit} onFocus={kilitAc} placeholder={t('sifrenPh')} value={sifre} onChange={(e) => { setSifre(e.target.value); setBilgi(""); setSifreHata(false); }} />
                    <button type="button" className="sifre-maskot" onClick={() => setGoz(g => !g)} aria-label={goz ? t('sifreGizle', 'Gizle') : t('sifreGoster', 'Göster')}><MiniMaskot acik={goz} hata={sifreHata} /></button>
                  </div>
                </div>
                <div>
                  <label className="giris-label">{t('sifreTekrar', 'Şifre (tekrar)')}</label>
                  <div className={"giris-sifre" + ((sifreHata || sifreUyumsuz) ? " hatali" : "")}>
                    <input className={"giris-input" + ((sifreHata || sifreUyumsuz) ? " hatali" : "")} type={goz ? "text" : "password"} name="gw-uye-pw2" autoComplete="new-password" readOnly={kilit} onFocus={kilitAc} placeholder={t('sifreTekrarPh', 'Tekrar')} value={sifre2} onChange={(e) => { setSifre2(e.target.value); setBilgi(""); setSifreHata(false); }} />
                    <button type="button" className="sifre-maskot" onClick={() => setGoz(g => !g)} aria-label={goz ? t('sifreGizle', 'Gizle') : t('sifreGoster', 'Göster')}><MiniMaskot acik={goz} hata={sifreHata} /></button>
                  </div>
                </div>
              </div>
              {(bilgi || sifreUyumsuz) && <div className="giris-bilgi">{bilgi || t('ghSifreUyusmuyor', 'İki şifre aynı değil.')}</div>}
              <button className="btn btn-uye" style={{ marginTop: "14px" }} onClick={uyeOl} disabled={yuk}>{yuk ? t('girisYapiliyor') : t('uyeolBaslik', 'Üye Ol')}</button>
              {!zorunluUye && <div className="alt-not">{t('zatenHesap')} <b onClick={() => modGec("giris")}>{t('girisYapLink')}</b></div>}
              {zorunluUye && (
                <div className="zorunlu-cikis">
                  <div className="zorunlu-cikis-not">{t('zorunluHesapNot', 'Bu yeni bir hesap. Eski paylaşımların başka hesabındaysa (örn. Google), o hesapla giriş yap.')}</div>
                  <button type="button" className="zorunlu-cikis-btn" onClick={cikisYapVeGiris} disabled={yuk}>{t('baskaHesapGiris', '← Çıkış yap / başka hesapla giriş')}</button>
                </div>
              )}
            </>
          ) : (
            <>
              <button type="button" className="ust-uyeol" onClick={() => modGec("uye")}>
                <span className="ust-uyeol-yazi">{t('hesabinYok')} <b>{t('hemenUyeol')}</b></span>
                <span className="ust-uyeol-ok" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h14" /><path d="M13 6l6 6-6 6" /></svg>
                </span>
              </button>
              <div className="uye-misin">{t('uyeMisin')}</div>
              <div className="sosyal-grid">
                <button className={"sbtn g" + (oneri === "google" ? " oneri-vurgu" : "")} onClick={() => sosyal(googleProvider)}>
                  <svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.6 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.5 29.6 4.5 24 4.5 16.3 4.5 9.7 8.8 6.3 14.7z" /><path fill="#4CAF50" d="M24 43.5c5.2 0 9.9-2 13.5-5.2l-6.2-5.3C29.2 34.5 26.7 35.5 24 35.5c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.1 16.2 43.5 24 43.5z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.3C41.4 35.8 43.5 30.4 43.5 24c0-1.2-.1-2.3-.4-3.5z" /></svg>
                  Google
                </button>
                <button className={"sbtn m" + (oneri === "microsoft" ? " oneri-vurgu" : "")} onClick={() => sosyal(new OAuthProvider("microsoft.com"))}>
                  <svg viewBox="0 0 23 23"><path fill="#f25022" d="M1 1h10v10H1z" /><path fill="#7fba00" d="M12 1h10v10H12z" /><path fill="#00a4ef" d="M1 12h10v10H1z" /><path fill="#ffb900" d="M12 12h10v10H12z" /></svg>
                  Microsoft
                </button>
                <button className="sbtn f" onClick={() => sosyal(new FacebookAuthProvider())}>
                  <svg viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.5 0-1.96.93-1.96 1.89v2.25h3.34l-.53 3.49h-2.81V24C19.61 23.1 24 18.1 24 12.07z" /></svg>
                  Facebook
                </button>
                <button className={"sbtn a" + (oneri === "apple" ? " oneri-vurgu" : "")} onClick={() => sosyal(new OAuthProvider("apple.com"))}>
                  <svg viewBox="0 0 24 24"><path fill="#fff" d="M16.37 1.43c.06.86-.27 1.7-.83 2.32-.6.66-1.57 1.17-2.5 1.1-.08-.86.32-1.74.85-2.3.6-.64 1.64-1.13 2.48-1.12zM20.5 17.2c-.43 1-.64 1.45-1.2 2.34-.78 1.24-1.88 2.78-3.24 2.79-1.2.01-1.51-.79-3.14-.78-1.63.01-1.97.79-3.18.78-1.36-.01-2.4-1.4-3.18-2.64C3.13 15.9 2.9 11.6 4.5 9.3c.97-1.4 2.5-2.22 3.94-2.22 1.47 0 2.4.8 3.62.8 1.18 0 1.9-.8 3.6-.8 1.3 0 2.67.71 3.65 1.93-3.2 1.76-2.68 6.33.69 7.99z" /></svg>
                  Apple
                </button>
              </div>

              <div className="ayrac"><div className="cizgi"></div><span>{t('veya')}</span><div className="cizgi"></div></div>

              <label className="giris-label">{t('eposta')}</label>
              <input className="giris-input" type="email" inputMode="email" name="gw-giris-mail" autoComplete="email" readOnly={kilit} onFocus={kilitAc} placeholder="ornek@groxorg.com" value={ep} onChange={(e) => { setEp(e.target.value); setBilgi(""); }} />
              <label className="giris-label">{t('sifre')}</label>
              <div className={"giris-sifre" + (sifreHata ? " hatali" : "")}>
                <input className={"giris-input" + (sifreHata ? " hatali" : "")} type={goz ? "text" : "password"} name="gw-giris-pw" autoComplete="current-password" readOnly={kilit} onFocus={kilitAc} placeholder={t('sifrenPh')} value={sifre} onChange={(e) => { setSifre(e.target.value); setBilgi(""); setSifreHata(false); }} />
                <button type="button" className="sifre-maskot" onClick={() => setGoz(g => !g)} aria-label={goz ? t('sifreGizle', 'Gizle') : t('sifreGoster', 'Göster')}><MiniMaskot acik={goz} hata={sifreHata} /></button>
              </div>
              <div className="sifremi-unuttum" onClick={sifreModalAc}>{t('sifremiUnuttum')}</div>
              {bilgi && <div className="giris-bilgi">{bilgi}</div>}
              <button className="btn btn-uye" style={{ marginTop: "14px" }} onClick={epGiris} disabled={yuk}>{yuk ? t('girisYapiliyor') : t('girisyap')}</button>
            </>
          )}

          <div className="kvkk">{t('kvkk')}</div>
        </div>
      </div>

      {/* Şifre sıfırlama penceresi */}
      {sifreModal && (
        <div className="sifre-katman" onClick={(e) => { if (e.target === e.currentTarget) setSifreModal(false); }}>
          <div className="sifre-kutu">
            <button className="sifre-kapat" onClick={() => setSifreModal(false)} aria-label="Kapat">&#10005;</button>
            <h3 className="sifre-baslik">{t('sifreBaslik')}</h3>
            <p className="sifre-aciklama">{t('sifreAciklama')}</p>
            <input className="giris-input" type="email" autoComplete="email" placeholder={t('epostaPh')} value={sifreEp} onChange={(e) => { setSifreEp(e.target.value); setSifreMsg(""); }} />
            {sifreMsg && <div className="giris-bilgi" style={{ marginTop: "10px" }}>{sifreMsg}</div>}
            <button className="btn btn-uye" style={{ marginTop: "14px" }} onClick={sifreSifirla}>{t('baglantiGonder')}</button>
          </div>
        </div>
      )}

    </div>
  );
}
