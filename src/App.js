import { useState, useEffect, useRef } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, girisOtomatikTekrar, girisDenemeTemizle } from "./firebase";
import Acilis from "./Acilis";
import Giris from "./Giris";
// NOT: MusteriForm ve ProfesyonelForm artık akışta DEĞİL (kayıt tek kart Giris'te). İçe aktarımları
// kaldırıldı çünkü hiçbir yerde render edilmiyordu ama ana pakete ~2850 satır yük biniyordu → paket küçüldü.
// (Dosyalar duruyor; ileride gerekirse geri bağlanır.)
import AltinCerceve from "./AltinCerceve";
import KayitTamam from "./KayitTamam";
// ⛔ ANASAYFA TEK PARÇA (eager) — GERİ ALINDI (kullanıcı: "sarı perdede takılıyor, açılmıyor"). Geç-yükleme (lazy)
//   ilk açılışı hafifletiyordu AMA ağ bir an takılınca/yayından sonra Anasayfa parçası inemeyince sayfa SONSUZA KADAR
//   sarı "Yükleniyor" ekranında kalıyordu (Suspense fallback asılı). İSTİKRAR için tek parçaya döndü: ya tam yüklenir
//   ya temiz hata verir (asılı kalmaz). İlk indirme biraz daha büyük ama GÜVENİLİR.
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
      // SOSYAL GİRİŞ (Google/redirect) SÜRÜYORSA giriş kartını FLAŞ etme → "yükleniyor" göster.
      // (Kullanıcı: "Google ile girince gene giriş sayfası çıkıyor 2-3 saniye kalıp gidiyor." SEBEP: Google'dan
      //  dönünce oturum birkaç saniyede gelir; o arada kullanici=null olduğu için GİRİŞ KARTI görünüyordu. Sosyal
      //  giriş bayrağı (gwYukMetin, redirect öncesi yazılır) varken giriş kartı yerine YÜKLENİYOR ekranı kalır →
      //  oturum gelince ana sayfaya geçer, giriş kartı hiç flaş etmez. Oturum gelmezse onAuthStateChanged null ile
      //  gerçek çıkışa düşer ve giriş kartı normal gösterilir, takılı kalmaz.)
      try { if (sessionStorage.getItem("gwYukMetin")) return "yukleniyor"; } catch (e) {}
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
  const cikisTimerRef = useRef(null); // yenileme anındaki geçici "oturum yok" için bekleme zamanlayıcısı
  useEffect(() => onAuthStateChanged(auth, (u) => {
    if (u) {
      if (cikisTimerRef.current) { clearTimeout(cikisTimerRef.current); cikisTimerRef.current = null; }
      setKullanici(u);
      // Oturum doğrulandı → KENDİ bayrağımızı yaz (bir sonraki açılışta giriş kartı flaş etmesin). Çıkış bayrağını temizle.
      try { localStorage.setItem("gw_oturum", "1"); localStorage.removeItem("gw_cikis"); } catch (e) {}
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
            else {
              // PROFİL YOK — kullanıcı: "Google ile giriyorum ama GENE kayıt/bilgi doldur diyor." SEBEP: popup yolunda
              // profil OTOMATİK oluşuyordu; Android redirect yolunda oluşmuyordu → zorunlu kayıt FORMU çıkıyordu.
              // ÇÖZÜM: Google zaten isim/e-posta/foto veriyor → burada OTOMATİK müşteri profili oluştur → form ÇIKMAZ,
              // direkt ana sayfaya geçer (popup ile AYNI davranış). İyimser: önce "var" (form flaş etmez), doc arkada yazılır.
              setProfil("var"); setTip("musteri");
              try {
                const ad = ((u.displayName || "").split(" ")[0] || "").trim();
                const soy = ((u.displayName || "").split(" ").slice(1).join(" ") || "").trim();
                try { localStorage.setItem("gw_profilVar", "1"); localStorage.setItem("gw_tip", "musteri"); localStorage.setItem("gw_profilVarZaman", String(Date.now())); } catch (e) {}
                setDoc(doc(db, "kullanicilar", u.uid), { tip: "musteri", isim: ad, soyisim: soy, eposta: u.email || "", foto: u.photoURL || "", olusturma: Date.now() }, { merge: true }).catch(() => {});
              } catch (e) {}
            }
          }
        })
        .catch(() => { setProfil("var"); }); // okuma hatasında kullanıcıyı KİLİTLEME
    } else {
      // Oturum "yok" geldi. Bu GERÇEK bir çıkış mı, yoksa YENİLEME anındaki geçici boşluk mu?
      // Gerçek çıkış HER ZAMAN cikisYap/cikisYapVeGiris içinden geçer ve önce gw_cikis="1" yazar.
      // gw_cikis yoksa AMA daha önce oturum vardıysa (gw_oturum ya da firebase authUser) → bu GEÇİCİ boşluktur:
      // giriş kartını GÖSTERME, oturumun (birazdan) gelmesini bekle. Böylece her güncellemede kendiliğinden çıkış OLMAZ.
      let cikisYapildi = false, oturumVardi = false;
      try {
        cikisYapildi = localStorage.getItem("gw_cikis") === "1";
        oturumVardi = localStorage.getItem("gw_oturum") === "1";
        if (!oturumVardi) { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf("firebase:authUser:") === 0) { oturumVardi = true; break; } } }
      } catch (e) {}
      const gercekCikis = () => {
        setKullanici(null); setProfil("yok"); setTip("");
        try { localStorage.removeItem("gw_profilVar"); localStorage.removeItem("gw_tip"); localStorage.removeItem("gw_uyelik"); localStorage.removeItem("gw_oturum"); localStorage.removeItem("gw_cikis"); } catch (e) {}
      };
      if (cikisYapildi || !oturumVardi) { gercekCikis(); } // kesin çıkış → giriş kartı
      else {
        // GEÇİCİ boşluk → giriş kartını gösterme, "yükleniyor" kal; oturum gelirse (üstteki u dalı) düzelir.
        setKullanici("yukleniyor");
        if (cikisTimerRef.current) clearTimeout(cikisTimerRef.current);
        cikisTimerRef.current = setTimeout(() => { if (!auth.currentUser) gercekCikis(); }, 25000); // 25 sn hâlâ gelmezse gerçekten çıkış say (YAVAŞ/YORGUN telefonda oturum geç gelebilir; 6 sn'de "çıkış" sanıp kullanıcıyı giriş kartına ATIYOR + ayar bayraklarını siliyordu — kullanıcı: "her açılışta tekrar giriş istiyor, ayarlarım sıfırlanıyor". 25 sn ile oturum geri gelir, yanlış çıkış OLMAZ.)
      }
    }
  }), []);

  // ANDROID UYGULAMASI (TWA) GOOGLE GİRİŞİ — redirect dönüşü.
  // Android'de Google girişi signInWithRedirect ile yapılır (popup orada "giriş yapılıyor…" diye asılı kalıyordu).
  // Sayfa Google'dan geri dönünce sonucu İŞLE: başarılıysa onAuthStateChanged oturumu açar ve yükleme ekranını (#gw-yuk)
  // gizler (yukarıda). Sonuç gelmezse / hata olursa → yükleme ekranını BURADA gizle ki "Google ile giriş yapılıyor…"
  // ekranı asılı kalmasın; kullanıcı giriş kartına döner, tekrar deneyebilir veya e-posta ile girebilir.
  useEffect(() => {
    let iptal = false;
    const yukGizle = () => {
      try { sessionStorage.removeItem("gwYukMetin"); } catch (e) {}
      const el = typeof document !== "undefined" && document.getElementById("gw-yuk");
      if (el) el.style.display = "none";
    };
    getRedirectResult(auth)
      .then(async (res) => {
        if (iptal) return;
        if ((res && res.user) || auth.currentUser) { try { girisDenemeTemizle(); } catch (e) {} return; } // giriş OLDU → sayaç temizle, onAuthStateChanged ana sayfaya geçirir
        // Oturum GELMEDİ (redirect ilk seferde boş döndü — "ısınma"). OTOMATİK 2. deneme gerekiyor mu?
        let tekrar = false;
        try { tekrar = await girisOtomatikTekrar(); } catch (e) {}
        if (tekrar) return; // 2. redirect başladı, sayfa Google'a gidiyor → YÜKLENİYOR ekranı kalsın (giriş kartı çıkmasın)
        yukGizle(); // tekrar yok/başarısız → giriş kartına dön (elle tekrar denenebilir)
      })
      .catch(() => { if (!iptal) { try { girisDenemeTemizle(); } catch (e) {} yukGizle(); } });
    return () => { iptal = true; };
  }, []);

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
