import { useState, useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import Acilis from "./Acilis";
import Giris from "./Giris";
import MusteriForm from "./MusteriForm";
import ProfesyonelForm from "./ProfesyonelForm";
import AltinCerceve from "./AltinCerceve";
import KayitTamam from "./KayitTamam";
import Anasayfa from "./Anasayfa";

// HashRouter: geri tuşu açık PENCEREYİ kapatır (siteyi değil) — güvenilir, özel kod yok.
// ÖNEMLİ: Adres çubuğunda ekran adı görünür ama bu YENİDEN YÜKLEME DEĞİL ve Google'a
// veri gitmez — sadece etiket. Sayfa TEK SEFER yüklenir (no-store kaldırıldı, reload yok).
// Geri tuşuna özel kod YOK (GeriKopru/trap/popstate YOK).

// Sayfa YENİDEN yüklendiğinde eski adres (#/musteri, #/profesyonel ...) açık kalıp
// doğrudan FORMU açmasın → her yeni yüklemede baştan başla. (Tek sefer, açılışta.)
let basRotaSifirlandi = false;
try {
  if (!basRotaSifirlandi) {
    basRotaSifirlandi = true;
    const h = (window.location.hash || "").replace(/^#/, "");
    if (/^\/(musteri|profesyonel|kayit-tamam|uyeol|giris-yap)/.test(h)) {
      window.location.hash = "/";
    }
  }
} catch (e) {}

// Oturum çözülürken (Google/kalıcı oturum) gösterilen KOYU yükleniyor ekranı — giriş kartı FLAŞ etmesin.
function Yukleniyor() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse at 50% 0%,#1c2842 0%,#111a2e 55%,#0a1020 100%)" }}>
      <style>{"@keyframes gwYukYanip{0%,100%{opacity:.5;transform:scale(.99)}50%{opacity:1;transform:scale(1.02)}}"}</style>
      <div style={{ fontFamily: "'Cinzel',serif", fontWeight: 700, fontSize: "32px", letterSpacing: ".09em", background: "linear-gradient(110deg,#B8860B,#FFE9A8,#FFD700,#FFE9A8,#B8860B)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", animation: "gwYukYanip 1.4s ease-in-out infinite" }}>GROXORG</div>
    </div>
  );
}

function App() {
  // Animasyon sadece İLK açılışta. Yenileme/aşağı-çekme (aynı oturum) → animasyon ATLANIR, direkt sayfa.
  const [acilisBitti, setAcilisBitti] = useState(() => {
    try { return localStorage.getItem("gwAcilisGoruldu") === "1"; } catch (e) { return false; }
  });
  // Firebase oturumu: giriş yapan kullanıcı tarayıcıda kalıcı saklanır.
  // ARA EKRAN YOK: "kim giriş yapmış?" cevabını beklemeden, tarayıcı hafızasındaki
  // Firebase oturum anahtarına bakıp ANINDA tahmin ediyoruz → siyah/boş ekran çıkmaz.
  //   "yukleniyor" (truthy) = hafızada oturum var, obje birazdan gelecek (direkt ana sayfa)
  //   null = oturum yok (direkt giriş kartı)   |   obje = gerçek kullanıcı
  const [kullanici, setKullanici] = useState(() => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf("firebase:authUser:") === 0) return "yukleniyor";
      }
    } catch (e) {}
    return null;
  });
  // ÜYELİK (profil) durumu — KAYIT ŞART: profili olmayan (Google ile gelip kayıt yapmamış) kişi
  // ana sayfaya GİREMEZ; önce Müşteri/Profesyonel seçip üye olur. Dönen üyede flaş olmasın diye önbellek.
  //   "var"=kayıtlı  |  "yok"=kesin kayıtsız  |  "belirsiz"=henüz okunmadı (Google oturumu çözülüyor → kart DEĞİL, yükleniyor göster)
  const [profil, setProfil] = useState(() => {
    try { return localStorage.getItem("gw_profilVar") === "1" ? "var" : "belirsiz"; } catch (e) { return "belirsiz"; }
  });
  // Hesap TİPİ — profesyonel girince ana sayfa PROFESYONEL modda (kırmızı) açılır. Optimistik önbellek.
  const [tip, setTip] = useState(() => { try { return localStorage.getItem("gw_tip") || ""; } catch (e) { return ""; } });
  useEffect(() => onAuthStateChanged(auth, (u) => {
    setKullanici(u);
    if (u) {
      // Oturum doğrulandı → sosyal giriş yükleme ekranını (#gw-yuk) gizle ve bayrağı temizle.
      try { sessionStorage.removeItem("gwYukMetin"); } catch (e) {}
      const el = typeof document !== "undefined" && document.getElementById("gw-yuk");
      if (el) el.style.display = "none";
      // Üyelik kaydı (profil) var mı?
      getDoc(doc(db, "kullanicilar", u.uid))
        .then((snap) => {
          if (snap.exists()) { setProfil("var"); const d = snap.data() || {}; setTip(d.tip || ""); try { localStorage.setItem("gw_profilVar", "1"); localStorage.setItem("gw_tip", d.tip || ""); } catch (e) {} }
          else {
            // YENİ kayıt olduysa (son 15 sn) bu okuma yarış olabilir → kullanıcıyı geri ATMA, profili VAR say.
            let yeniKayit = false;
            try { const z = parseInt(localStorage.getItem("gw_profilVarZaman") || "0", 10); if (Date.now() - z < 15000) yeniKayit = true; } catch (e) {}
            if (yeniKayit) { setProfil("var"); }
            else { setProfil("yok"); try { localStorage.removeItem("gw_profilVar"); } catch (e) {} }
          }
        })
        .catch(() => { setProfil("var"); }); // okuma hatasında kullanıcıyı KİLİTLEME
    } else {
      setProfil("yok"); setTip("");
      try { localStorage.removeItem("gw_profilVar"); localStorage.removeItem("gw_tip"); } catch (e) {}
    }
  }), []);

  // Kayıt tamamlanınca form "profil hazır" der → anında ana sayfaya geçer (yarış/yeniden yükleme yok).
  useEffect(() => {
    const onProfil = () => {
      setProfil("var"); try { localStorage.setItem("gw_profilVar", "1"); } catch (e) {}
      const uu = auth.currentUser;
      if (uu) getDoc(doc(db, "kullanicilar", uu.uid)).then((s) => { if (s.exists()) { const d = s.data() || {}; setTip(d.tip || ""); try { localStorage.setItem("gw_tip", d.tip || ""); } catch (e) {} } }).catch(() => {});
    };
    window.addEventListener("gwProfilVar", onProfil);
    return () => window.removeEventListener("gwProfilVar", onProfil);
  }, []);

  if (!acilisBitti) {
    return (
      <>
        <Acilis baslik="GROXORG" onBitti={() => { try { localStorage.setItem("gwAcilisGoruldu", "1"); } catch (e) {} setAcilisBitti(true); }} />
        <AltinCerceve />
      </>
    );
  }

  // Üyelik kaydı var mı? (state veya önbellek). devamEt/forms önbelleği hemen günceller.
  let profilVarmi = profil === "var";
  try { if (localStorage.getItem("gw_profilVar") === "1") profilVarmi = true; } catch (e) {}

  return (
    <HashRouter>
      <AltinCerceve />
      <Routes>
        {/* Giriş yok → Giriş kartı. Giriş var + KAYIT YOK → üyeliğini tamamla (tür seç).
            Giriş var + kayıt var → ana sayfa. */}
        <Route path="/" element={
          kullanici === "yukleniyor" ? <Yukleniyor />
          : !kullanici ? <Giris />
          : profilVarmi ? <Navigate to="/anasayfa" replace />
          : profil === "belirsiz" ? <Yukleniyor />
          : <Giris zorunluUye />
        } />
        {/* Giriş + Üye Ol artık TEK kart (Giris). Eski ayrı UyeOl kartına gelen olursa ana giriş kartına yollanır. */}
        <Route path="/uyeol" element={<Navigate to="/" replace />} />
        {/* Eski kayıt formları AKIŞTA DEĞİL (kayıt tek kart Giris'te) — gelen olursa giriş kartına yollanır (araya girmesin) */}
        <Route path="/musteri" element={<Navigate to="/" replace />} />
        <Route path="/profesyonel" element={<Navigate to="/" replace />} />
        <Route path="/kayit-tamam" element={<KayitTamam />} />
        {/* Giriş Yap artık Hoş Geldin kartının içinde (sekme). Eski yola gelen olursa ana karta. */}
        <Route path="/giris-yap" element={<Navigate to="/" replace />} />
        {/* Kaydı olmayan (üye olmamış) kişi ana sayfayı GÖREMEZ → üyeliğini tamamlamaya yollanır.
            Hesap tipi PROFESYONEL ise ana sayfa PROFESYONEL modda (kırmızı) açılır;
            müşteri/diğer herkes AYNEN müşteri ana sayfasını görür (birbirini görmezler). */}
        <Route path="/anasayfa" element={(!kullanici || !profilVarmi) ? <Navigate to="/" replace /> : <Anasayfa pro={tip === "profesyonel"} />} />
        {/* Eski kırmızı profil sayfası KALDIRILDI (kullanıcı: sil her yerden, bir daha görmeyeyim).
            Profil artık ana sayfanın İÇİNDE kendi penceresi. Eski adrese gelen ana sayfaya gider. */}
        <Route path="/profil" element={<Navigate to="/anasayfa" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
