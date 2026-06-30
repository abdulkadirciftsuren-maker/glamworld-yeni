import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { profilOku, profilKaydet } from "./veri";
import SurumRozeti from "./SurumRozeti";
import "./Profil.css";

// Kırmızı pırlanta (profesyonel kimliği) — yuvaya gömülü taş, içten ışık (ANAYASA Madde 6)
function KirmiziTas() {
  return (
    <span className="pf-elmas" aria-hidden="true">
      <svg viewBox="0 0 120 120">
        <defs>
          <radialGradient id="ptYuva" cx="50%" cy="42%" r="62%"><stop offset="0" stopColor="#2a1818" /><stop offset="60%" stopColor="#120909" /><stop offset="100%" stopColor="#050303" /></radialGradient>
          <radialGradient id="ptTas" cx="50%" cy="40%" r="62%"><stop offset="0" stopColor="#fff0f0" /><stop offset="35%" stopColor="#ffb0b0" /><stop offset="70%" stopColor="#e0353f" /><stop offset="100%" stopColor="#8a1018" /></radialGradient>
          <radialGradient id="ptIc" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ffffff" /><stop offset="30%" stopColor="rgba(255,220,220,.95)" /><stop offset="100%" stopColor="rgba(255,120,120,0)" /></radialGradient>
        </defs>
        <ellipse cx="60" cy="60" rx="50" ry="50" fill="url(#ptYuva)" stroke="#C9A227" strokeWidth="2.5" />
        <circle cx="60" cy="60" r="33" fill="url(#ptTas)" />
        <polygon points="60,60 40,46 60,38" fill="#fff0f0" opacity=".5" />
        <polygon points="60,60 60,38 80,46" fill="#ffd0d0" opacity=".45" />
        <polygon points="60,60 80,46 86,64" fill="#ff9a9a" opacity=".4" />
        <polygon points="60,60 86,64 74,82" fill="#e0353f" opacity=".5" />
        <polygon points="60,60 74,82 46,82" fill="#a01820" opacity=".5" />
        <polygon points="60,60 46,82 34,64" fill="#c02028" opacity=".5" />
        <polygon points="60,60 34,64 40,46" fill="#ff7a7a" opacity=".4" />
        <circle className="pf-elmas-ic" cx="60" cy="60" r="27" fill="url(#ptIc)" />
        <circle cx="60" cy="29" r="5" fill="#FFD700" stroke="#8a6010" strokeWidth="1.2" />
        <circle cx="89" cy="48" r="5" fill="#FFD700" stroke="#8a6010" strokeWidth="1.2" />
        <circle cx="31" cy="48" r="5" fill="#FFD700" stroke="#8a6010" strokeWidth="1.2" />
        <circle cx="74" cy="84" r="4.5" fill="#C9A227" stroke="#6a4d0a" strokeWidth="1.2" />
        <circle cx="46" cy="84" r="4.5" fill="#C9A227" stroke="#6a4d0a" strokeWidth="1.2" />
      </svg>
    </span>
  );
}

// FAZ 1 — MESLEK PASAPORTU / PROFİL. Bilgiler GERÇEK (Firestore + Auth) otomatik gelir.
export default function Profil() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [u, setU] = useState(auth.currentUser);
  const [p, setP] = useState(null);
  const [yuk, setYuk] = useState(true);
  const [duzen, setDuzen] = useState(false);
  // ANDROID GERİ (kullanıcı kuralı): Profil içinde açık pencere (düzenleme) varsa geri tuşu
  // ÖNCE onu kapatır → PROFİLDE kalınır; yapılacak başka şey yoksa SONRAKİ basış ANA SAYFAYA atar.
  // Katman dokunuş jestiyle eklenir (Chrome kod eklemesini saymıyor). Pencere geri tuşu DIŞINDA
  // (Vazgeç/Kaydet ile) kapatıldıysa bayat katman tek basışta atlanır — ölü basış olmaz.
  // GERİ TUŞU GENEL KURALI (kullanıcı, KESİN): bu sayfada KAÇ modül/pencere açıksa,
  // geri her basışta SADECE BİRİNİ kapatır ve SAYFADA BIRAKIR; hiçbiri kalmayınca
  // sonraki basış ana sayfaya döner. Sayaçlar ANINDA (eşzamanlı) güncellenir —
  // hızlı art arda basışta "iki işi birden yapma" yarış hatası böylece yok.
  const duzenRef = useRef(false);     // düzenleme açık mı (anında güncellenir)
  const acikSayRef = useRef(0);       // açık modül katmanı sayısı
  const yutRef = useRef(false);       // bizim tetiklediğimiz geri adımını yut
  const duzenAc = () => {             // katman TIKLAMANIN İÇİNDE eklenir (Chrome jest kuralı)
    // router'ın gizli kaydı (history.state) AYNEN KOPYALANIR — kendi verimizi yazarsak
    // router yol takibini şaşırıyor (Profilim düğmesi "tanımıyor" hatasının sebebi buydu)
    try { window.history.pushState(window.history.state, "", window.location.href); acikSayRef.current++; } catch (e) {}
    duzenRef.current = true; setDuzen(true);
  };
  const duzenKapat = () => {          // Vazgeç/Kaydet ile elle kapatma: katmanı da sessizce tüket
    duzenRef.current = false; setDuzen(false);
    if (acikSayRef.current > 0) {
      acikSayRef.current--; yutRef.current = true;
      try { window.history.back(); } catch (e) { yutRef.current = false; }
    }
  };
  useEffect(() => {
    const onPop = () => {
      if (yutRef.current) { yutRef.current = false; return; }      // bizim tetiklediğimiz adım
      if (acikSayRef.current > 0) {                                 // modül katmanı var:
        acikSayRef.current--;
        if (duzenRef.current) { duzenRef.current = false; setDuzen(false); } // BİR modül kapat
        return;                                                     // SAYFADA KAL
      }
      // katman yok → doğal geri: ana sayfaya döner
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [f, setF] = useState({});

  useEffect(() => onAuthStateChanged(auth, setU), []);
  useEffect(() => {
    const au = auth.currentUser;
    if (!au) { navigate("/", { replace: true }); return; }
    profilOku(au.uid).then((d) => {
      const v = d || {};
      setP(v);
      const pro = v.pro || {};
      setF({
        isim: v.isim || (au.displayName ? au.displayName.split(" ")[0] : "") || "",
        soyisim: v.soyisim || (au.displayName ? au.displayName.split(" ").slice(1).join(" ") : "") || "",
        telefon: v.telefon || au.phoneNumber || "",
        konum: typeof v.konum === "string" ? v.konum : (v.konum && v.konum.sehir) || "",
        meslek: pro.meslek || "",
        hakkinda: pro.hakkinda || "",
        deneyim: pro.deneyimYil || "",
        hizmetler: (pro.hizmetler || []).join(", "),
        fiyatMin: (pro.fiyat && pro.fiyat.min) || "",
        fiyatMax: (pro.fiyat && pro.fiyat.max) || "",
      });
      setYuk(false);
    });
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const pro = p && p.tip === "profesyonel";
  const foto = (u && u.photoURL) || (p && p.foto) || "";
  const tamAd = [f.isim, f.soyisim].filter(Boolean).join(" ");
  const harf = ((tamAd || (u && u.email) || "G").trim()[0] || "G").toUpperCase();
  const tipEt = pro ? t("uyeProfesyonel", "Profesyonel") : t("uyeMusteri", "Müşteri");
  const gir = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));

  async function kaydet() {
    const au = auth.currentUser;
    if (!au) return;
    setKaydediliyor(true);
    const veri = { isim: f.isim.trim(), soyisim: f.soyisim.trim(), telefon: f.telefon.trim(), konum: f.konum.trim() };
    if (pro) {
      veri.pro = {
        meslek: f.meslek.trim(), hakkinda: f.hakkinda.trim(),
        deneyimYil: f.deneyim ? (Number(f.deneyim) || f.deneyim) : "",
        hizmetler: f.hizmetler.split(",").map((s) => s.trim()).filter(Boolean),
        fiyat: { min: f.fiyatMin ? Number(f.fiyatMin) : "", max: f.fiyatMax ? Number(f.fiyatMax) : "", para: "" },
      };
    }
    await profilKaydet(au.uid, veri);
    const yeni = await profilOku(au.uid);
    if (yeni) setP(yeni);
    setKaydediliyor(false);
    duzenKapat(); // katmanı da sessizce tüket (geri tuşu düzeni bozulmasın)
  }

  return (
    <div className={"pf-kok" + (pro ? " pro" : "")}>
      <header className="pf-bar">
        {/* Sayfa içi geri oku da AYNI KURALA uyar: modül açıksa ÖNCE onu kapatır (profilde kal),
            açık bir şey yoksa ana sayfaya döner — Android geri tuşuyla birebir aynı davranış */}
        <button className="pf-geri" onClick={() => { if (duzenRef.current) duzenKapat(); else navigate("/anasayfa"); }} aria-label="Geri">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span className="pf-baslik">{pro ? t("profilPasaport", "Meslek Pasaportu") : t("profilBaslik", "GROXORG Profilim")}</span>
        {!duzen && !yuk ? <button className="pf-duzen" onClick={duzenAc}>{t("profDuzenle", "Düzenle")}</button> : <span className="pf-bos" />}
      </header>

      {yuk ? (
        <div className="pf-yuk">{t("profilYukleniyor", "Yükleniyor...")}</div>
      ) : (
        <div className="pf-kart">
          <div className="pf-ust">
            {pro ? <KirmiziTas /> : (
              <div className="pf-foto musteri">{foto ? <img src={foto} alt="" referrerPolicy="no-referrer" /> : <span>{harf}</span>}</div>
            )}
            {pro && foto && <div className="pf-foto pro mini">{<img src={foto} alt="" referrerPolicy="no-referrer" />}</div>}
            <div className={"pf-rozet " + (pro ? "pro" : "musteri")}>◆ {tipEt}</div>
          </div>

          {!duzen ? (
            <>
              <div className="pf-ad">{tamAd || "—"}</div>
              {pro && f.meslek && <div className="pf-meslek">{f.meslek}</div>}
              {f.konum && <div className="pf-konum">{f.konum}</div>}
              {u && u.email && <div className="pf-eposta">{u.email}</div>}

              {pro && (
                <>
                  {(f.hakkinda || f.deneyim || f.hizmetler || f.fiyatMin || f.fiyatMax) ? (
                    <div className="pf-pasaport">
                      {f.hakkinda && <div className="pf-blok"><span className="pf-eti">{t("profilHakkinda", "Hakkında")}</span><p>{f.hakkinda}</p></div>}
                      {f.deneyim && <div className="pf-satir"><span className="pf-eti">{t("profilDeneyim", "Deneyim")}</span><span>{f.deneyim} {t("profilYil", "yıl")}</span></div>}
                      {f.hizmetler && <div className="pf-blok"><span className="pf-eti">{t("profilHizmetler", "Hizmetler")}</span><div className="pf-etiketler">{f.hizmetler.split(",").map((s, i) => s.trim() && <span key={i} className="pf-tag">{s.trim()}</span>)}</div></div>}
                      {(f.fiyatMin || f.fiyatMax) && <div className="pf-satir"><span className="pf-eti">{t("profilFiyat", "Fiyat aralığı")}</span><span>{f.fiyatMin || "?"} – {f.fiyatMax || "?"}</span></div>}
                    </div>
                  ) : (
                    <div className="pf-bilgi">{t("profilEksik", "Mesleki bilgilerini ekle — yukarıdaki Düzenle'ye dokun.")}</div>
                  )}

                  <div className="pf-akis">
                    <div className="pf-akis-bas">{t("profilAkis", "Akışım · Portfolyo")}</div>
                    <div className="pf-akis-bos">{t("profilAkisBos", "Çalışmaların, fotoğraf ve videoların burada akacak. (Paylaşım yakında)")}</div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="pf-form">
              <div className="pf-ikili">
                <label className="pf-l">{t("profilAd", "Ad")}<input value={f.isim} onChange={gir("isim")} /></label>
                <label className="pf-l">{t("profilSoyad", "Soyad")}<input value={f.soyisim} onChange={gir("soyisim")} /></label>
              </div>
              <label className="pf-l">{t("profilTelefon", "Telefon")}<input value={f.telefon} onChange={gir("telefon")} inputMode="tel" /></label>
              <label className="pf-l">{t("profilKonum", "Konum (şehir/ülke)")}<input value={f.konum} onChange={gir("konum")} /></label>
              {pro && (
                <>
                  <label className="pf-l">{t("profilMeslek", "Meslek")}<input value={f.meslek} onChange={gir("meslek")} /></label>
                  <label className="pf-l">{t("profilDeneyim", "Deneyim (yıl)")}<input value={f.deneyim} onChange={gir("deneyim")} inputMode="numeric" /></label>
                  <label className="pf-l">{t("profilHakkinda", "Hakkında")}<textarea rows={3} value={f.hakkinda} onChange={gir("hakkinda")} /></label>
                  <label className="pf-l">{t("profilHizmetlerVir", "Hizmetler (virgülle ayır)")}<input value={f.hizmetler} onChange={gir("hizmetler")} /></label>
                  <div className="pf-ikili">
                    <label className="pf-l">{t("profilFiyatMin", "Fiyat min")}<input value={f.fiyatMin} onChange={gir("fiyatMin")} inputMode="numeric" /></label>
                    <label className="pf-l">{t("profilFiyatMax", "Fiyat max")}<input value={f.fiyatMax} onChange={gir("fiyatMax")} inputMode="numeric" /></label>
                  </div>
                </>
              )}
              <div className="pf-dugmeler">
                <button className="pf-vazgec" onClick={duzenKapat} disabled={kaydediliyor}>{t("profilVazgec", "Vazgeç")}</button>
                <button className="pf-kaydet" onClick={kaydet} disabled={kaydediliyor}>{kaydediliyor ? t("profilKaydediliyor", "Kaydediliyor...") : t("profKaydet", "Kaydet")}</button>
              </div>
            </div>
          )}
        </div>
      )}
      <SurumRozeti />
    </div>
  );
}
