import { useState, useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import Acilis from "./Acilis";
import Giris from "./Giris";
// NOT: MusteriForm ve ProfesyonelForm artık akışta DEĞİL (kayıt tek kart Giris'te). İçe aktarımları
// kaldırıldı çünkü hiçbir yerde render edilmiyordu ama ana pakete ~2850 satır yük biniyordu → paket küçüldü.
// (Dosyalar duruyor; ileride gerekirse geri bağlanır.)
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

// Oturum çözülürken (Google/kalıcı oturum) gösterilen yükleniyor ekranı.
// KURAL: hiçbir yerde siyah/koyu YOK → zemin ALTIN. Parlama (yanıp sönme) YOK.
// Ama müşteri yüklendiğini ANLASIN diye ORTADA yavaşça DÖNEN bir halka + "Yükleniyor…" var (dönme parlama değildir).
function Yukleniyor() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "22px", background: "radial-gradient(ellipse at 50% 22%, #3d63a0 0%, #294a7d 42%, #1a3560 72%, #142b4f 100%)" }}>
      <style>{"@keyframes gwDon{to{transform:rotate(360deg)}}"}</style>
      <div style={{ fontFamily: "'Playfair Display','Cinzel',Georgia,serif", fontWeight: 800, fontSize: "40px", letterSpacing: ".08em", background: "linear-gradient(180deg,#fff4cf,#ffd700 55%,#b8860b)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", filter: "drop-shadow(0 2px 7px rgba(0,0,0,.4))" }}>GLOXORG</div>
      {/* Dönen halka — yüklendiğini gösterir (altın, mavi zeminde net görünür) */}
      <div style={{ width: "46px", height: "46px", borderRadius: "50%", border: "4px solid rgba(255,233,168,.28)", borderTopColor: "#ffd700", borderRightColor: "#ffe9a8", animation: "gwDon .8s linear infinite" }} />
      <div style={{ fontFamily: "Georgia,serif", fontWeight: 700, fontSize: "15px", letterSpacing: ".05em", color: "#cfe0ff" }}>Yükleniyor…</div>
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
      // KENDİ güvenilir bayrağımız (oturum açılınca yazarız) → Firebase IndexedDB'de saklasa bile
      // dönen üyeyi ANINDA tanırız, giriş kartı FLAŞ etmez (direkt yükleniyor ekranı).
      if (localStorage.getItem("gw_oturum") === "1" || localStorage.getItem("gw_profilVar") === "1") return "yukleniyor";
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
      // Oturum doğrulandı → KENDİ bayrağımızı yaz (bir sonraki açılışta giriş kartı flaş etmesin).
      try { localStorage.setItem("gw_oturum", "1"); } catch (e) {}
      // Sosyal giriş yükleme ekranını (#gw-yuk) gizle ve bayrağı temizle.
      try { sessionStorage.removeItem("gwYukMetin"); } catch (e) {}
      const el = typeof document !== "undefined" && document.getElementById("gw-yuk");
      if (el) el.style.display = "none";
      // Üyelik kaydı (profil) var mı?
      getDoc(doc(db, "kullanicilar", u.uid))
        .then((snap) => {
          if (snap.exists()) { setProfil("var"); const d = snap.data() || {}; setTip(d.tip || ""); try { localStorage.setItem("gw_profilVar", "1"); localStorage.setItem("gw_tip", d.tip || ""); localStorage.setItem("gw_uyelik", d.uyelik || ""); } catch (e) {} }
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
      // Oturum YOK → kendi bayrağımızı da temizle (bir daha açılışta yükleniyor takılmasın, giriş kartı gelsin)
      try { localStorage.removeItem("gw_profilVar"); localStorage.removeItem("gw_tip"); localStorage.removeItem("gw_uyelik"); localStorage.removeItem("gw_oturum"); } catch (e) {}
    }
  }), []);

  // Kayıt tamamlanınca form "profil hazır" der → anında ana sayfaya geçer (yarış/yeniden yükleme yok).
  useEffect(() => {
    const onProfil = () => {
      setProfil("var"); try { localStorage.setItem("gw_profilVar", "1"); } catch (e) {}
      const uu = auth.currentUser;
      if (uu) getDoc(doc(db, "kullanicilar", uu.uid)).then((s) => { if (s.exists()) { const d = s.data() || {}; setTip(d.tip || ""); try { localStorage.setItem("gw_tip", d.tip || ""); localStorage.setItem("gw_uyelik", d.uyelik || ""); } catch (e) {} } }).catch(() => {});
    };
    window.addEventListener("gwProfilVar", onProfil);
    return () => window.removeEventListener("gwProfilVar", onProfil);
  }, []);

  if (!acilisBitti) {
    return (
      <>
        <Acilis baslik="GLOXORG" onBitti={() => { try { localStorage.setItem("gwAcilisGoruldu", "1"); } catch (e) {} setAcilisBitti(true); }} />
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
