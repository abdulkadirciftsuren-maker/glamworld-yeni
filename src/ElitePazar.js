// GLOXORG — ELİTE PAZAR (ürün ilanları: al, sat, kazan). Gloxoo baştan sona içinde.
// Ayrı bileşen → dev Anasayfa dosyasını bozmadan, temiz ve modüler. Firestore: pazarUrunleri.
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { pazarUrunEkle, pazarUrunleriOku, pazarUrunSil, pazarFavGuncelle, gorselYukle, videoYukle } from "./veri";
import KayanYazi from "./KayanYazi";
import L from "leaflet";
import "./ElitePazar.css";

// Gloxoo hangi dilde cevap versin — aktif arayüz diline göre (kullanıcı dili değiştirince Gloxoo da o dilde yazar)
const DIL_ADI = { tr:"Türkçe", en:"English", de:"Deutsch (German)", ar:"العربية (Arabic)", ru:"Русский (Russian)", uk:"Українська (Ukrainian)", es:"Español (Spanish)", fr:"Français (French)", it:"Italiano (Italian)", zh:"中文 (Chinese)", hi:"हिन्दी (Hindi)", pt:"Português (Portuguese)", ja:"日本語 (Japanese)" };
const dilAdi = (k) => DIL_ADI[String(k || "en").slice(0, 2)] || "English";
// GÜÇLÜ dil talimatı (İngilizce meta-talimat) — istem Türkçe yazılı olsa bile model CEVABI seçilen dilde versin.
// (Eskiden "Yanıtı X dilinde ver" tek başına zayıftı; istem Türkçe olunca model Türkçe'ye kayıyordu.)
const dilTalimati = (ad) => `Reply ONLY in ${ad}. This is mandatory: write your ENTIRE answer in ${ad}, and do NOT use any other language even though these instructions are written in another language.`;
// PARA BİRİMLERİ — ilan verenin ÜLKESİNİN parası (sabit TL DEĞİL). Kullanıcının kendi parası öntanımlı gelir.
const PARALAR = [
  { kod: "UAH", sim: "₴" }, { kod: "TRY", sim: "₺" }, { kod: "EUR", sim: "€" }, { kod: "USD", sim: "$" },
  { kod: "GBP", sim: "£" }, { kod: "RUB", sim: "₽" }, { kod: "PLN", sim: "zł" }, { kod: "AZN", sim: "₼" },
  { kod: "KZT", sim: "₸" }, { kod: "GEL", sim: "₾" }, { kod: "AED", sim: "د.إ" }, { kod: "SAR", sim: "﷼" },
];
// Bir ilanın para sembolü: kayıtlı simge > kod->simge > eski "TL" > ne yazılıysa
const paraSimEP = (kod) => { const b = PARALAR.find((x) => x.kod === kod); return b ? b.sim : (kod === "TL" ? "₺" : (kod || "₺")); };

// İki nokta arası mesafe (km) — haversine
function mesafeKm(la1, lo1, la2, lo2) {
  const R = 6371, d2r = Math.PI / 180;
  const dLa = (la2 - la1) * d2r, dLo = (lo2 - lo1) * d2r;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * d2r) * Math.cos(la2 * d2r) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
// Leaflet varsayılan ikon resmi (bundler'da) kırılabilir → basit emoji pin (kesin görünür)
function pazarPin() { return L.divIcon({ className: "ep-pin-div", html: "<span class='ep-pin'>📍</span>", iconSize: [30, 30], iconAnchor: [15, 30] }); }

// YOL TARİFİ'ni GÜVENİLİR aç: uygulama içi (PWA/webview) target=_blank çoğu zaman AÇILMIYOR.
// Google Haritalar YÖN (directions) bağlantısı + window.open, olmazsa location.href (kesin gider → harita uygulaması/tarayıcı açılır).
function yolTarifiAc(lat, lon) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  try { const w = window.open(url, "_blank", "noopener,noreferrer"); if (!w) window.location.href = url; }
  catch (e) { try { window.location.href = url; } catch (x) {} }
}

const AI_KOPRU = "https://gloxorg-ai.abdulkadirciftsuren.workers.dev";
// GLOXOO'YA SOR — ortak yardımcı (fiyat değerlendirme, pazarlık mesajı, akıllı arama). body: {prompt/mesajlar, sistem}
async function gloxSor(body) {
  try {
    const r = await fetch(AI_KOPRU, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return (j && j.metin) || "";
  } catch (e) { return ""; }
}

// RENKLİ + İKONLU KATEGORİLER — her birine ayrı renk ve ikon (yazı da yanında)
export const KATEGORILER = [
  { id: "tumu", ad: "Tümü", renk: "#FFD700", ik: "✦" },
  { id: "moda", ad: "Moda", renk: "#e0348b", ik: "👗" },
  { id: "ayakkabi", ad: "Ayakkabı & Çanta", renk: "#c0398b", ik: "👜" },
  { id: "elektronik", ad: "Elektronik", renk: "#2f7fd8", ik: "💻" },
  { id: "telefon", ad: "Telefon", renk: "#00a6a6", ik: "📱" },
  { id: "ev", ad: "Ev & Yaşam", renk: "#2ca85a", ik: "🛋️" },
  { id: "arac", ad: "Araç", renk: "#e0492f", ik: "🚗" },
  { id: "moto", ad: "Motosiklet", renk: "#d13a3a", ik: "🏍️" },
  { id: "yedek", ad: "Yedek Parça", renk: "#6b7280", ik: "🔧" },
  { id: "emlak", ad: "Emlak", renk: "#7a5cd0", ik: "🏠" },
  { id: "bebek", ad: "Bebek", renk: "#ff7aa8", ik: "🍼" },
  { id: "spor", ad: "Spor", renk: "#ff8c1a", ik: "⚽" },
  { id: "hayvan", ad: "Hayvan", renk: "#b5651d", ik: "🐾" },
  { id: "kozmetik", ad: "Kozmetik", renk: "#e84ea8", ik: "💄" },
  { id: "saglik", ad: "Sağlık", renk: "#d6336c", ik: "💊" },
  { id: "kitap", ad: "Kitap & Hobi", renk: "#3a7d44", ik: "📚" },
  { id: "oyun", ad: "Oyun & Konsol", renk: "#5a4fd0", ik: "🎮" },
  { id: "muzik", ad: "Müzik", renk: "#b5417a", ik: "🎸" },
  { id: "bahce", ad: "Bahçe & Yapı", renk: "#4a8c2a", ik: "🌿" },
  { id: "antika", ad: "Antika", renk: "#a0722e", ik: "🏺" },
  { id: "hizmet", ad: "İş / Hizmet", renk: "#1f9e8c", ik: "🧰" },
  { id: "luks", ad: "Lüks", renk: "#d4a017", ik: "💎" },
  { id: "diger", ad: "Diğer", renk: "#8a8a8a", ik: "📦" },
];
const KAT = (id) => KATEGORILER.find((k) => k.id === id) || KATEGORILER[0];

// ETİKETLER — emoji kodda, kelime çeviriden (epEt_<id>)
const ETIKETLER = [
  { id: "pazarlik", emoji: "🟢", sinif: "pz" },
  { id: "kargo", emoji: "📦", sinif: "kg" },
  { id: "elden", emoji: "🤝", sinif: "el" },
  { id: "acil", emoji: "🔥", sinif: "ac" },
  { id: "takas", emoji: "🔄", sinif: "tk" },
  { id: "ucretsiz", emoji: "🎁", sinif: "uc" },
];

// Fotoğrafı küçült → dataURL (yükleme hızlı + AI görsün). EXIF/dönme sorununu düzeltir (siyah şerit/yan dönme olmaz).
async function fotoKucult(file, max = 1200) {
  const cizVeVer = (kaynak, gw, gh) => {
    let w = gw, h = gh;
    if (w > max || h > max) { const o = Math.min(max / w, max / h); w = Math.round(w * o); h = Math.round(h * o); }
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d");
    // önce ALTIN doldur (herhangi bir boşluk siyah değil altın olsun — anayasa) sonra resmi çiz
    x.fillStyle = "#fff6df"; x.fillRect(0, 0, w, h);
    x.drawImage(kaynak, 0, 0, w, h);
    return c.toDataURL("image/jpeg", 0.85);
  };
  // 1) EN SAĞLAM: createImageBitmap ile EXIF yönünü düzelt (yan dönme/siyah bar olmaz)
  try {
    if (typeof createImageBitmap === "function") {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      const url = cizVeVer(bmp, bmp.width, bmp.height);
      try { bmp.close(); } catch (e) {}
      if (url) return url;
    }
  } catch (e) {}
  // 2) YEDEK: FileReader + Image
  return await new Promise((cz) => {
    try {
      const rd = new FileReader();
      rd.onload = () => {
        const img = new Image();
        img.onload = () => { try { cz(cizVeVer(img, img.naturalWidth || img.width, img.naturalHeight || img.height)); } catch (e) { cz(""); } };
        img.onerror = () => cz("");
        img.src = rd.result;
      };
      rd.onerror = () => cz("");
      rd.readAsDataURL(file);
    } catch (e) { cz(""); }
  });
}

export default function ElitePazar({ uid, benAd, benFoto, konum, dil, saticiyaYaz, onPencere, kapatRef, benLat, benLon, para, paraSym, ulkeAd }) {
  const { t, i18n } = useTranslation();
  const [urunler, setUrunler] = useState([]);
  const [yuk, setYuk] = useState(true);
  const [kat, setKat] = useState("tumu");
  const [ara, setAra] = useState("");
  const [akilliYuk, setAkilliYuk] = useState(false);
  const [akilliFiltre, setAkilliFiltre] = useState(null); // {kategori, maxFiyat, minFiyat, anahtar, ozet}
  const [akilliMesaj, setAkilliMesaj] = useState("");     // kullanıcıya geri bildirim (boş/hata/normal arama)
  const [detay, setDetay] = useState(null);       // detay için seçilen ürün
  const [satAcik, setSatAcik] = useState(false);   // ilan verme formu
  const [favSet, setFavSet] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem("gw_pazarFav") || "[]")); } catch (e) { return new Set(); } });

  // Ürünleri yükle
  const yukle = async () => { setYuk(true); const l = await pazarUrunleriOku(200); setUrunler(l); setYuk(false); };
  useEffect(() => { yukle(); }, []);

  // ANDROID GERİ DÜĞMESİ: detay/ilan formu açıkken geri basınca onu KAPAT, Elite'de KAL (ana sayfaya atma).
  // Parent'a (Anasayfa) pencere açık mı bildir + kapatma fonksiyonunu ver.
  useEffect(() => {
    const acik = !!(detay || satAcik);
    if (onPencere) onPencere(acik);
    if (kapatRef) kapatRef.current = acik ? () => { setSatAcik(false); setDetay(null); } : null;
  }, [detay, satAcik]); // eslint-disable-line react-hooks/exhaustive-deps
  // Elite'den çıkınca (bileşen kalkınca) temizle
  useEffect(() => () => { if (onPencere) onPencere(false); if (kapatRef) kapatRef.current = null; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // AKILLI ARAMA — "20 bin altı temiz telefon bul" gibi bir cümleyi Gloxoo filtreye çevirir; yerelde uygulanır (ucuz + hızlı)
  const akilliAra = async () => {
    const q = (ara || "").trim();
    if (!q) { setAkilliMesaj(t("epAkilliOnce")); return; }
    if (akilliYuk) return;
    setAkilliYuk(true); setAkilliMesaj("");
    const katListe = KATEGORILER.filter((k) => k.id !== "tumu").map((k) => k.id + "=" + k.ad).join(", ");
    const t = `Kullanıcı bir alışveriş pazarında şunu aradı: "${q}". Bunu arama filtresine çevir. Kategori id listesi: ${katListe}. Yanıtı SADECE şu JSON biçiminde ver, başka HİÇBİR şey yazma: {"kategori":"<uygun id ya da boş>","maxFiyat":<üst fiyat TL sayı ya da 0>,"minFiyat":<alt fiyat TL sayı ya da 0>,"anahtar":"<üründe aranacak kelimeler, boşlukla>"}`;
    const c = await gloxSor({ prompt: t, sistem: "Sen Gloxoo'sun. SADECE istenen JSON'u ver, açıklama ekleme." });
    let f = null;
    try {
      const j = JSON.parse((c.match(/\{[\s\S]*\}/) || ["{}"])[0]);
      f = { kategori: (j.kategori || "").trim(), maxFiyat: parseInt(j.maxFiyat, 10) || 0, minFiyat: parseInt(j.minFiyat, 10) || 0, anahtar: (j.anahtar || "").trim() };
    } catch (e) { f = null; }
    // Gloxoo çözemediyse (boş/hatalı) → düz kelime aramasına düş (yine de sonuç ver)
    if (!f || (!f.kategori && !f.maxFiyat && !f.minFiyat && !f.anahtar)) {
      f = { kategori: "", maxFiyat: 0, minFiyat: 0, anahtar: q };
      setAkilliMesaj(t("epAkilliCozemedi"));
    }
    setAkilliFiltre(f);
    if (f.kategori && KATEGORILER.some((k) => k.id === f.kategori)) setKat(f.kategori); else setKat("tumu");
    setAkilliYuk(false);
  };
  const akilliTemizle = () => { setAkilliFiltre(null); setAkilliMesaj(""); setAra(""); setKat("tumu"); };

  const filtreli = useMemo(() => {
    const a = (ara || "").trim().toLowerCase();
    const af = akilliFiltre;
    return urunler.filter((u) => {
      if (kat !== "tumu" && u.kategori !== kat) return false;
      if (af) {
        const fy = parseInt(u.fiyat, 10) || 0;
        if (af.maxFiyat && fy && fy > af.maxFiyat) return false;
        if (af.minFiyat && fy < af.minFiyat) return false;
        if (af.anahtar) {
          const kelimeler = af.anahtar.toLowerCase().split(/\s+/).filter(Boolean);
          const metin = ((u.urunAd || "") + " " + (u.aciklama || "")).toLowerCase();
          if (kelimeler.length && !kelimeler.some((kel) => metin.includes(kel))) return false;
        }
        return true;
      }
      if (a && !((u.urunAd || "").toLowerCase().includes(a) || (u.aciklama || "").toLowerCase().includes(a))) return false;
      return true;
    });
  }, [urunler, kat, ara, akilliFiltre]);

  const favToggle = (u) => {
    setFavSet((prev) => {
      const s = new Set(prev); const vardi = s.has(u.id);
      if (vardi) s.delete(u.id); else s.add(u.id);
      try { localStorage.setItem("gw_pazarFav", JSON.stringify([...s])); } catch (e) {}
      try { pazarFavGuncelle(u.id, vardi ? -1 : 1); } catch (e) {}
      // ekrandaki sayıyı da anında güncelle
      setUrunler((liste) => liste.map((x) => x.id === u.id ? { ...x, favSayi: Math.max(0, (x.favSayi || 0) + (vardi ? -1 : 1)) } : x));
      return s;
    });
  };

  return (
    <div className="ep-sar">
      {/* SLİM BAŞLIK — üst barda zaten "Elite Pazar" yazıyor, tekrar etme; sadece kısa tanıtım */}
      <div className="ep-ust"><span className="ep-elmas">💎</span><span className="ep-tag">{t("epTagA")} · <b>{t("epTagB")}</b></span></div>

      {/* ARAMA + AKILLI ARAMA (Gloxoo) */}
      <div className="ep-ara">
        <span className="ep-lup">🔍</span>
        <input value={ara} onChange={(e) => { setAra(e.target.value); if (akilliFiltre) setAkilliFiltre(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") akilliAra(); }} placeholder={t("epAraPh")} />
        {(ara || akilliFiltre) && <button className="ep-ara-x" onClick={akilliTemizle}>✕</button>}
      </div>
      <button className="ep-akilli" onClick={akilliAra} disabled={akilliYuk}>
        {akilliYuk ? ("💎 " + t("epAkilliAriyor")) : ("💎 " + t("epAkilliAra"))}
      </button>
      {akilliMesaj && !akilliFiltre && <div className="ep-akilli-ozet">{akilliMesaj}</div>}
      {akilliFiltre && (
        <div className="ep-akilli-ozet">
          💎 {t("epGloxPre")} {akilliFiltre.kategori ? (t("epKat_" + akilliFiltre.kategori) + " · ") : ""}
          {akilliFiltre.maxFiyat ? (akilliFiltre.maxFiyat.toLocaleString() + " " + (paraSym || "₺") + " " + t("epAlti") + " ") : ""}
          {akilliFiltre.minFiyat ? ("· " + akilliFiltre.minFiyat.toLocaleString() + " " + (paraSym || "₺") + " " + t("epUstu") + " ") : ""}
          {akilliFiltre.anahtar ? ("· \"" + akilliFiltre.anahtar + "\" ") : ""}
          {"— "}<b>{filtreli.length > 0 ? t("epIlanBulundu", { n: filtreli.length }) : t("epUygunYok")}</b>
          {akilliMesaj ? (" · " + akilliMesaj) : ""}
        </div>
      )}

      {/* RENKLİ + İKONLU KATEGORİLER (yana kayan; yazı sığmazsa kesilmez → yürür) */}
      <div className="ep-kats">
        {KATEGORILER.map((k) => (
          <button key={k.id} className={"ep-chip" + (kat === k.id ? " sec" : "") + (k.id === "tumu" ? " tumu" : "")}
            style={{ "--c": k.renk }} onClick={() => setKat(k.id)}>
            <span className="ep-chip-ik" aria-hidden="true">{k.ik}</span>
            <span className="ep-chip-ad"><KayanYazi>{t("epKat_" + k.id)}</KayanYazi></span>
          </button>
        ))}
      </div>

      {/* SAT DÜĞMESİ */}
      <button className="ep-sat" onClick={() => setSatAcik(true)}><span className="ep-arti">＋</span> {t("epSat")}</button>

      <div className="ep-bolum">✦ {kat === "tumu" ? t("epOneCikan") : t("epKat_" + kat)}</div>

      {/* IZGARA */}
      {yuk ? (
        <div className="ep-durum">{t("epIlanYukleniyor")}</div>
      ) : filtreli.length === 0 ? (
        <div className="ep-durum">
          {urunler.length === 0 ? t("epHenuzYok") : t("epAramaYok")}
          <button className="ep-durum-btn" onClick={() => setSatAcik(true)}>＋ {t("epIlkIlan")}</button>
        </div>
      ) : (
        <div className="ep-izgara">
          {filtreli.map((u) => {
            const k = KAT(u.kategori); const etk = u.etiketler || [];
            const foto = (u.kapak) || (u.medyalar && u.medyalar[0] && u.medyalar[0].url) || "";
            const videoVar = (u.medyalar || []).some((m) => m.tip === "video");
            const favli = favSet.has(u.id);
            const ucretsiz = etk.includes("ucretsiz");
            return (
              <div className="ep-kart" key={u.id} onClick={() => setDetay(u)}>
                <div className="ep-kfoto" style={foto ? { backgroundImage: `url(${foto})` } : {}}>
                  {!foto && <span className="ep-kfoto-ik">{k.ik}</span>}
                  {etk.includes("acil") && <span className="ep-acil">🔥 {t("epEt_acil")}</span>}
                  <button className={"ep-fav" + (favli ? " dolu" : "")} onClick={(e) => { e.stopPropagation(); favToggle(u); }}>
                    <span className="ep-kalp">{favli ? "❤️" : "🤍"}</span><b>{u.favSayi || 0}</b>
                  </button>
                  <span className="ep-kkat" style={{ background: k.renk }}><span className="ep-kkat-ik">{k.ik}</span><KayanYazi>{t("epKat_" + k.id)}</KayanYazi></span>
                  {videoVar && <span className="ep-vid">▶</span>}
                </div>
                <div className="ep-kbil">
                  <div className="ep-kad"><KayanYazi>{u.urunAd || t("epIlan")}</KayanYazi></div>
                  {etk.length > 0 && (
                    <div className="ep-etks">
                      {etk.slice(0, 2).map((eid) => { const et = ETIKETLER.find((x) => x.id === eid); return et ? <span key={eid} className={"ep-et " + et.sinif}>{et.emoji + " " + t("epEt_" + et.id)}</span> : null; })}
                    </div>
                  )}
                  <div className={"ep-kfiyat" + (ucretsiz ? " bedava" : "")}>{ucretsiz ? t("epUcretsiz") : (u.fiyat ? <>{u.fiyat}<span className="ep-sym">{" " + (u.paraSimge || paraSimEP(u.paraBirimi))}</span></> : "—")}</div>
                  <div className="ep-ksat">
                    <span className="ep-kavatar">{(u.saticiFoto) ? <img src={u.saticiFoto} alt="" /> : (u.satici || "?").slice(0, 1).toUpperCase()}</span>
                    <span className="ep-kyer"><KayanYazi>{u.konum || ""}</KayanYazi></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAY */}
      {detay && <PazarDetay urun={detay} benim={detay.sahipUid === uid} favli={favSet.has(detay.id)} benLat={benLat} benLon={benLon} ulkeAd={ulkeAd}
        onKapat={() => setDetay(null)} onFav={() => favToggle(detay)}
        onYaz={(mesaj) => { setDetay(null); saticiyaYaz && saticiyaYaz({ uid: detay.sahipUid, ad: detay.satici, foto: detay.saticiFoto }, typeof mesaj === "string" ? mesaj : ""); }}
        onSil={async () => { if (window.confirm(t("epSilOnay"))) { await pazarUrunSil(detay.id); setDetay(null); yukle(); } }} />}

      {/* İLAN VER FORMU */}
      {satAcik && <SatForm uid={uid} benAd={benAd} benFoto={benFoto} konum={konum} dil={dil} para={para} paraSym={paraSym} ulkeAd={ulkeAd}
        onKapat={() => setSatAcik(false)} onYayin={() => { setSatAcik(false); yukle(); }} />}
    </div>
  );
}

// ---------- ÜRÜN DETAYI ----------
function PazarDetay({ urun, benim, favli, benLat, benLon, onKapat, onFav, onYaz, onSil, ulkeAd }) {
  const { t, i18n } = useTranslation();
  const aktifDil = dilAdi(i18n.language);
  const k = KAT(urun.kategori); const etk = urun.etiketler || [];
  const parSim = urun.paraSimge || paraSimEP(urun.paraBirimi); // bu ilanın para sembolü (₴/₺/€…), sabit ₺ DEĞİL
  const nerede = urun.konum || ulkeAd || "";                    // ürünün satıldığı yer (Gloxoo buna göre değerlendirir)
  // Sadece GEÇERLİ (url'i olan) medyaları göster; kapak yedek. Bozuk/boş öğe elenir → şeritte "mavi/boş" kutu kalmaz.
  const medyalar = ((urun.medyalar && urun.medyalar.length ? urun.medyalar : (urun.kapak ? [{ tip: "foto", url: urun.kapak }] : [])) || [])
    .filter((x) => x && x.url && typeof x.url === "string" && x.url.indexOf("http") === 0);
  const [aktif, setAktif] = useState(0);
  const ucretsiz = etk.includes("ucretsiz");
  const m = medyalar[aktif] || medyalar[0];
  const il = urun.iletisim || {}; // satıcı iletişim (telefon/email/adres) — ne koyduysa o
  const [gloxDurum, setGloxDurum] = useState("");   // "fiyat" | "pazarlik" | ""
  const [gloxCevap, setGloxCevap] = useState("");   // "fiyat uygun mu" sonucu
  const [pazarlik, setPazarlik] = useState("");     // Gloxoo'nun yazdığı pazarlık mesajı
  // İLANI KENDİ DİLİNE ÇEVİR — ilan başka dilde yazılmışsa okuyabilmen için (başlık + açıklama)
  const [cev, setCev] = useState({ acik: false, yuk: false, baslik: "", aciklama: "" });
  const ilaniCevir = async () => {
    if (cev.yuk) return;
    if (cev.acik) { setCev({ acik: false, yuk: false, baslik: "", aciklama: "" }); return; } // orijinale dön
    setCev({ acik: true, yuk: true, baslik: "", aciklama: "" });
    const kaynak = `BASLIK: ${urun.urunAd || ""}\nACIKLAMA: ${urun.aciklama || ""}`;
    const istem = `Aşağıdaki ürün ilanını ${aktifDil} diline çevir. Anlamı koru, doğal ve akıcı çevir. Marka/model adlarını olduğu gibi bırak. Yanıtı SADECE şu biçimde ver (BASLIK/ACIKLAMA etiketleri aynen kalsın):\nBASLIK: ...\nACIKLAMA: ...\n\n${kaynak}`;
    const c = await gloxSor({ prompt: istem, sistem: `Sen bir çevirmensin. Metni ${aktifDil} diline çevir; başka hiçbir şey ekleme.` });
    const bm = (c.match(/BASLIK\s*:\s*(.+)/i) || [])[1];
    const am = (c.match(/ACIKLAMA\s*:\s*([\s\S]+)/i) || [])[1];
    setCev({ acik: true, yuk: false, baslik: (bm || "").trim(), aciklama: (am || "").trim() });
  };
  const gosterBaslik = (cev.acik && cev.baslik) ? cev.baslik : urun.urunAd;
  const gosterAciklama = (cev.acik && cev.aciklama) ? cev.aciklama : urun.aciklama;
  const fiyatUygunMu = async () => {
    if (gloxDurum) return; setGloxDurum("fiyat"); setGloxCevap("");
    const istem = `${dilTalimati(aktifDil)}\n\nBir alıcı bu ürünün fiyatını değerlendirmeni istiyor. Ürün: "${urun.urunAd}". İstenen fiyat: ${urun.fiyat || "?"} ${parSim} (${urun.paraBirimi || "yerel para"}). ${urun.aciklama ? ("Açıklama: " + urun.aciklama + ". ") : ""}Kategori: ${k.ad}. ${nerede ? ("Ürünün satıldığı yer: " + nerede + ". ") : ""}Bu ürünün SATILDIĞI ÜLKENİN/BÖLGENİN güncel piyasasına göre değerlendir — TÜRKİYE'yi VARSAYMA. Fiyat UYGUN mu, PAHALI mı, yoksa UCUZ (kelepir) mi? 1-2 cümlede dürüst ve net söyle; makul bir fiyat aralığını da AYNI para birimi (${parSim}) cinsinden ver. "Bilmiyorum" DEME, en iyi tahminini ver.\n\n${dilTalimati(aktifDil)}`;
    const c = await gloxSor({ prompt: istem, sistem: `You are Gloxoo, the GLOXORG Elite Pazar assistant. ${dilTalimati(aktifDil)} Be short, clear and honest. Judge the price by the LOCAL market of where the item is sold — never assume Turkey. Use the item's own currency (${parSim}).` });
    setGloxCevap(c || t("epDegerlendiremedim")); setGloxDurum("");
  };
  const pazarlikYaz = async () => {
    if (gloxDurum) return; setGloxDurum("pazarlik"); setPazarlik("");
    const istem = `${dilTalimati(aktifDil)}\n\nBir alıcı, satıcıya kibar bir PAZARLIK mesajı yazmak istiyor. Ürün: "${urun.urunAd}", istenen fiyat ${urun.fiyat || "?"} ${parSim}. Satıcıyı kırmadan, saygılı ve kısa (2-3 cümle) bir pazarlık mesajı yaz; makul bir indirim iste. SADECE mesajın kendisini yaz, başına/sonuna açıklama ekleme.\n\n${dilTalimati(aktifDil)}`;
    const c = await gloxSor({ prompt: istem, sistem: `You are Gloxoo, the GLOXORG Elite Pazar assistant. ${dilTalimati(aktifDil)} Be short and polite.` });
    setPazarlik((c || "").trim()); setGloxDurum("");
  };
  const kopyala = (metin) => { try { navigator.clipboard && navigator.clipboard.writeText(metin); } catch (e) {} };
  return (
    <div className="ep-fon" onClick={(e) => { if (e.target === e.currentTarget) onKapat(); }}>
      <div className="ep-detay">
        <button className="ep-detay-x" onClick={onKapat}>✕</button>
        <div className="ep-dmedya">
          {m ? (m.tip === "video"
            ? <video src={m.url} controls playsInline />
            : <img src={m.url} alt="" />)
            : <span className="ep-dmedya-ik">{k.ik}</span>}
        </div>
        {medyalar.length > 1 && (
          <div className="ep-dkucuk">
            {medyalar.map((mm, i) => (
              <button key={i} className={"ep-dk" + (i === aktif ? " sec" : "")} onClick={() => setAktif(i)}>
                {mm.tip === "video"
                  ? <span className="ep-dk-vd">▶</span>
                  : <img src={mm.url} alt="" referrerPolicy="no-referrer" />}
              </button>
            ))}
          </div>
        )}
        <div className="ep-dbil">
          <span className="ep-dkat" style={{ background: k.renk }}>{t("epKat_" + k.id)}</span>
          <h2 className="ep-dad">{cev.yuk ? t("ceviriliyor", "Çevriliyor…") : gosterBaslik}</h2>
          <div className={"ep-dfiyat" + (ucretsiz ? " bedava" : "")}>{ucretsiz ? (t("epUcretsiz") + " 🎁") : (urun.fiyat ? <>{urun.fiyat}<span className="ep-sym">{" " + parSim}</span></> : "—")}</div>
          {etk.length > 0 && (
            <div className="ep-etks">
              {etk.map((eid) => { const et = ETIKETLER.find((x) => x.id === eid); return et ? <span key={eid} className={"ep-et " + et.sinif}>{et.emoji + " " + t("epEt_" + et.id)}</span> : null; })}
              {urun.durum && <span className="ep-et dr">{urun.durum === "yeni" ? ("✨ " + t("epYeni")) : t("epIkinciEl")}</span>}
            </div>
          )}
          {gosterAciklama && <p className="ep-daciklama">{cev.yuk ? t("ceviriliyor", "Çevriliyor…") : gosterAciklama}</p>}
          {/* İLANI KENDİ DİLİNE ÇEVİR — başka dilde yazılmış ilanı okuyabilmen için */}
          {(urun.urunAd || urun.aciklama) && (
            <button className={"ep-cevir" + (cev.acik ? " acik" : "")} onClick={ilaniCevir} disabled={cev.yuk}>
              🌐 {cev.yuk ? t("ceviriliyor", "Çevriliyor…") : (cev.acik ? t("orijinalGoster", "Orijinal") : t("cevir", "Çevir"))}
            </button>
          )}
          {(typeof urun.lat === "number" && typeof urun.lon === "number") && <HaritaGoster lat={urun.lat} lon={urun.lon} benLat={benLat} benLon={benLon} />}
          <div className="ep-dsatici">
            <span className="ep-kavatar buyuk">{urun.saticiFoto ? <img src={urun.saticiFoto} alt="" /> : (urun.satici || "?").slice(0, 1).toUpperCase()}</span>
            <div><div className="ep-dsatici-ad">{urun.satici || t("epSatici")}</div><div className="ep-dsatici-yer">{urun.konum || ""}</div></div>
          </div>

          {/* GLOXOO YARDIMI (alıcı için) — fiyat uygun mu + pazarlık mesajı */}
          {!benim && (
            <div className="ep-dglox">
              <div className="ep-dglox-btnlar">
                <button className="ep-dgb" onClick={fiyatUygunMu} disabled={!!gloxDurum}>{gloxDurum === "fiyat" ? ("💎 " + t("epBakiyor")) : ("💎 " + t("epFiyatUygun"))}</button>
                <button className="ep-dgb" onClick={pazarlikYaz} disabled={!!gloxDurum}>{gloxDurum === "pazarlik" ? ("🤝 " + t("epYaziyor")) : ("🤝 " + t("epPazarlikMesaji"))}</button>
              </div>
              {gloxCevap && <div className="ep-dglox-cevap">💎 {gloxCevap}</div>}
              {pazarlik && (
                <div className="ep-dpazarlik">
                  <div className="ep-dpazarlik-metin">{pazarlik}</div>
                  <div className="ep-dpazarlik-arac">
                    <button className="ep-dp-btn kul" onClick={() => onYaz(pazarlik)}>💬 {t("epBuMesajla")}</button>
                    <button className="ep-dp-btn kop" onClick={() => kopyala(pazarlik)}>{t("epKopyala")}</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* İLETİŞİM — satıcı ne koyduysa: Mesaj (hep) + Ara / E-posta / Adres */}
          {!benim && (
            <div className="ep-diletisim">
              <button className="ep-di-mesaj" onClick={() => onYaz()}>💬 {t("epMesajGonder")}</button>
              {il.telefon && <a className="ep-di-ara" href={"tel:" + il.telefon.replace(/[^\d+]/g, "")}>📞 {t("epAra")}<span className="ep-di-alt">{il.telefon}</span></a>}
              {il.email && <a className="ep-di-email" href={"mailto:" + il.email}>✉️ {t("epEposta")}<span className="ep-di-alt">{il.email}</span></a>}
              {il.adres && <div className="ep-di-adres">🏠 <span>{il.adres}</span></div>}
            </div>
          )}

          <div className="ep-dbtnlar">
            <button className={"ep-dfav" + (favli ? " dolu" : "")} onClick={onFav}>{favli ? ("❤️ " + t("epFavorimde")) : ("🤍 " + t("epFavori"))}</button>
            {benim && <button className="ep-dsil" onClick={onSil}>🗑️ {t("epIlaniSil")}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- İLAN VER FORMU (Gloxoo yardımıyla) ----------
function SatForm({ uid, benAd, benFoto, konum, dil, onKapat, onYayin, para, paraSym, ulkeAd }) {
  const { t, i18n } = useTranslation();
  const aktifDil = dilAdi(i18n.language);
  // PARA BİRİMİ: öntanımlı KULLANICININ KENDİ parası (Ukrayna'daysan ₴ UAH), sabit TL DEĞİL. İstersen değiştir.
  const kullaniciParaKod = (() => { const k = String(para || "").toUpperCase(); return k === "TL" ? "TRY" : (k || "TRY"); })();
  // Seçici listesi: kullanıcının kendi parası (listede yoksa gerçek sembolüyle) en başta + yaygın paralar
  const paraListesi = useMemo(() => {
    if (kullaniciParaKod && !PARALAR.some((x) => x.kod === kullaniciParaKod)) return [{ kod: kullaniciParaKod, sim: paraSym || kullaniciParaKod }, ...PARALAR];
    return PARALAR;
  }, [kullaniciParaKod, paraSym]);
  const [paraKod, setParaKod] = useState(kullaniciParaKod);
  const parSim = (paraListesi.find((x) => x.kod === paraKod) || {}).sim || paraSimEP(paraKod);
  const [medyalar, setMedyalar] = useState([]);   // [{tip, url, b64?}]
  const [medyaYuk, setMedyaYuk] = useState(false);
  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [fiyat, setFiyat] = useState("");
  const [kategori, setKategori] = useState("");
  const [durum, setDurum] = useState("ikinci");
  const [konumYazi, setKonumYazi] = useState(konum || ""); // NEREDEN satılıyor (profilden gelir, düzenlenebilir)
  const [konumLL, setKonumLL] = useState(null); // haritadan seçilen {lat, lon}
  const [haritaAcik, setHaritaAcik] = useState(false);
  const [telefon, setTelefon] = useState(""); // satıcı iletişim (isteğe bağlı)
  const [email, setEmail] = useState("");
  const [adres, setAdres] = useState("");
  const [etiketler, setEtiketler] = useState(new Set());
  const [gloxDurum, setGloxDurum] = useState(""); // "yaziyor" | "fiyat" | ""
  const [gloxFiyat, setGloxFiyat] = useState("");
  const [hata, setHata] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const fotoRef = useRef(null), videoRef = useRef(null);

  const kapakB64 = (medyalar.find((m) => m.tip === "foto" && m.b64) || {}).b64 || "";

  const fotoSecildi = async (e) => {
    const dosyalar = Array.from(e.target.files || []); e.target.value = "";
    if (!dosyalar.length) return;
    setMedyaYuk(true); setHata("");
    for (const f of dosyalar.slice(0, 6)) {
      try {
        const durl = await fotoKucult(f);
        if (!durl) continue;
        const url = await gorselYukle(durl, uid);
        if (url) setMedyalar((a) => [...a, { tip: "foto", url, b64: durl.split(",")[1] }].slice(0, 8));
      } catch (x) {}
    }
    setMedyaYuk(false);
  };
  const videoSecildi = async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = "";
    if (!f) return;
    if (f.size > 60 * 1024 * 1024) { setHata(t("epVideoBuyuk")); return; }
    setMedyaYuk(true); setHata("");
    try { const url = await videoYukle(f, uid); if (url) setMedyalar((a) => [...a, { tip: "video", url }].slice(0, 8)); } catch (x) { setHata(t("epVideoYuklenemedi")); }
    setMedyaYuk(false);
  };
  const medyaSil = (i) => setMedyalar((a) => a.filter((_, j) => j !== i));

  // Gloxoo'yu çağır (görsel + talimat)
  const gloxCagir = async (talimat, b64) => {
    const parcalar = [];
    if (b64) parcalar.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } });
    parcalar.push({ type: "text", text: talimat });
    const mesajlar = [{ role: "user", content: parcalar.length > 1 ? parcalar : talimat }];
    try {
      const r = await fetch(AI_KOPRU, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mesajlar, sistem: `You are Gloxoo, the GLOXORG Elite Pazar selling assistant. ${dilTalimati(aktifDil)} Be short, clear, honest. If a product photo is attached, look CAREFULLY and write ONLY about the item you actually see.` }) });
      const j = await r.json().catch(() => ({}));
      return (j && j.metin) || "";
    } catch (e) { return ""; }
  };
  const gloxYaz = async () => {
    if (gloxDurum) return;
    if (!kapakB64 && !baslik) { setHata(t("epHataFoto")); return; }
    setGloxDurum("yaziyor"); setHata("");
    const talimat = `${dilTalimati(aktifDil)}\n\nBu bir Elite Pazar ürün ilanı. ${kapakB64 ? "Ekteki fotoğrafa dikkatlice bak" : ("Ürün: " + baslik)} ve satışa uygun, çekici ama DÜRÜST (abartısız) bir ilan yaz. Kısa bir BAŞLIK (en fazla 8 kelime) ve 2-3 cümlelik bir AÇIKLAMA ver. BASLIK ve ACIKLAMA metinlerini ${aktifDil} dilinde yaz. Yanıtı SADECE şu biçimde ver, başka bir şey yazma (BASLIK/ACIKLAMA etiketleri aynen kalsın):\nBASLIK: ...\nACIKLAMA: ...`;
    const cevap = await gloxCagir(talimat, kapakB64);
    const bm = cevap.match(/BASLIK\s*:\s*(.+)/i);
    const am = cevap.match(/ACIKLAMA\s*:\s*([\s\S]+)/i);
    if (bm) setBaslik(bm[1].trim().replace(/^["']|["']$/g, ""));
    if (am) setAciklama(am[1].trim());
    if (!bm && !am && cevap) setAciklama(cevap.trim());
    setGloxDurum("");
  };
  const gloxFiyatOner = async () => {
    if (gloxDurum) return;
    if (!kapakB64 && !baslik) { setHata(t("epHataFotoFiyat")); return; }
    setGloxDurum("fiyat"); setHata("");
    const nerede = (konumYazi || konum || ulkeAd || "").trim();
    const talimat = `Bu ürünün ${nerede ? ("\"" + nerede + "\" bölgesindeki/ülkesindeki") : "satıldığı ülkedeki"} güncel ikinci el / piyasa değerini TAHMİN et — TÜRKİYE'yi VARSAYMA. Ürün: "${baslik || "(fotoğraftaki ürün)"}".${aciklama ? (" Açıklama: " + aciklama) : ""} Makul bir fiyat ARALIĞI ver ve fiyatı ${paraKod} (${parSim}) para biriminde ver. Yanıtı SADECE şu biçimde ver: FIYAT: <alt sayı> - <üst sayı> ${parSim}. Emin değilsen bile en iyi tahminini ver, "bilmiyorum" DEME.`;
    const cevap = await gloxCagir(talimat, kapakB64);
    const fm = cevap.match(/FIYAT\s*:\s*(.+)/i);
    setGloxFiyat((fm ? fm[1] : cevap).trim());
    setGloxDurum("");
  };
  const fiyatKullan = () => {
    const say = (gloxFiyat.match(/[\d.\s]{2,}/g) || []).map((s) => s.replace(/[^\d]/g, "")).filter(Boolean);
    if (say.length) setFiyat(say[0]);
  };
  const etkToggle = (id) => setEtiketler((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const yayinla = async () => {
    if (gonderiliyor) return;
    const ucretsiz = etiketler.has("ucretsiz");
    if (!baslik.trim()) { setHata(t("epHataBaslik")); return; }
    if (!ucretsiz && !String(fiyat).trim()) { setHata(t("epHataFiyat")); return; }
    if (!kategori) { setHata(t("epHataKategori")); return; }
    if (medyalar.length === 0) { setHata(t("epHataFotoEkle")); return; }
    setGonderiliyor(true); setHata("");
    try {
      const temizMedya = medyalar.map((m) => ({ tip: m.tip, url: m.url }));
      const kapak = (medyalar.find((m) => m.tip === "foto") || {}).url || "";
      await pazarUrunEkle({
        uid, satici: benAd || t("epSatici"), saticiFoto: benFoto || "",
        urunAd: baslik.trim(), aciklama: aciklama.trim(),
        fiyat: ucretsiz ? "" : String(fiyat).replace(/[^\d]/g, ""), paraBirimi: paraKod, paraSimge: parSim,
        kategori: kategori, durum, etiketler: [...etiketler], medyalar: temizMedya, kapak, konum: (konumYazi || konum || "").trim(),
        ...(konumLL ? { lat: konumLL.lat, lon: konumLL.lon } : {}),
        iletisim: { mesaj: true, telefon: telefon.trim(), email: email.trim(), adres: adres.trim() },
      });
      onYayin();
    } catch (e) {
      setHata(t("epHataYayin", { hata: (e && (e.message || e.code)) || "hata" }));
      setGonderiliyor(false);
    }
  };

  return (
    <div className="ep-fon" onClick={(e) => { if (e.target === e.currentTarget) onKapat(); }}>
      <div className="ep-sat-form">
        <div className="ep-sat-bas"><button className="ep-detay-x" onClick={onKapat}>‹</button><h2>{t("epUrununuSat")}</h2></div>
        <div className="ep-sat-icerik">
          {/* FOTO/VİDEO */}
          <div className="ep-kutu">
            <div className="ep-etk">📸 {t("epFotoVideo")}</div>
            <div className="ep-fotolar">
              {medyalar.map((m, i) => (
                <div className="ep-fbox" key={i} style={m.tip === "foto" ? { backgroundImage: `url(${m.url})` } : {}}>
                  {m.tip === "video" && <span className="ep-fbox-vd">▶</span>}
                  <button className="ep-fbox-x" onClick={() => medyaSil(i)}>✕</button>
                </div>
              ))}
              {medyalar.length < 8 && <button className="ep-fekle" onClick={() => fotoRef.current && fotoRef.current.click()}><span className="ep-fp">＋</span>{t("epFoto")}</button>}
              {medyalar.length < 8 && <button className="ep-fekle vid" onClick={() => videoRef.current && videoRef.current.click()}><span className="ep-fp">🎥</span>{t("epVideo")}</button>}
            </div>
            {medyaYuk && <div className="ep-yuk-not">{t("epYukleniyorKisa")}</div>}
            <input ref={fotoRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={fotoSecildi} />
            <input ref={videoRef} type="file" accept="video/*" style={{ display: "none" }} onChange={videoSecildi} />
          </div>

          {/* GLOXOO YARDIMCI */}
          <div className="ep-glox">
            <div className="ep-glox-bas"><span className="ep-glox-rozet">💎</span> {t("epGloxYardimcin")}</div>
            <div className="ep-glox-alt">{t("epGloxAlt")}</div>
            <div className="ep-glox-btnlar">
              <button className="ep-gb" onClick={gloxYaz} disabled={!!gloxDurum}>{gloxDurum === "yaziyor" ? ("✍️ " + t("epYaziyor")) : ("✍️ " + t("epIlaniGloxYazsin"))}</button>
              <button className="ep-gb" onClick={gloxFiyatOner} disabled={!!gloxDurum}>{gloxDurum === "fiyat" ? ("💰 " + t("epBakiyor")) : ("💰 " + t("epFiyatOner"))}</button>
            </div>
          </div>

          {/* BAŞLIK + AÇIKLAMA */}
          <div className="ep-kutu">
            <div className="ep-etk">📝 {t("epBaslik")}</div>
            <input className="ep-inp" value={baslik} onChange={(e) => setBaslik(e.target.value)} placeholder={t("epBaslikPh")} />
            <div className="ep-etk" style={{ marginTop: 11 }}>{t("epAciklama")}</div>
            <textarea className="ep-inp ep-ta" value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder={t("epAciklamaPh")} rows={3} />
          </div>

          {/* FİYAT + GLOXOO ÖNERİSİ */}
          <div className="ep-kutu">
            <div className="ep-etk">💰 {t("epFiyatEtk")} ({parSim})</div>
            <div className="ep-fiyat-in">
              <input className="ep-fiyat-val" inputMode="numeric" value={fiyat} onChange={(e) => setFiyat(e.target.value.replace(/[^\d]/g, ""))} placeholder="0" /><span className="ep-tl">{parSim}</span></div>
            {/* PARA BİRİMİ SEÇİCİ — öntanımlı senin paran; istersen değiştir (satılan ülkenin parası) */}
            <div className="ep-parasec">
              {paraListesi.map((pp) => (
                <button key={pp.kod} className={"ep-pc" + (paraKod === pp.kod ? " sec" : "")} onClick={() => setParaKod(pp.kod)}>{pp.sim} {pp.kod}</button>
              ))}
            </div>
            {gloxFiyat && (
              <div className="ep-glox-fiyat">
                <div className="ep-gf-bas">💎 {t("epGloxFiyatOneri")}</div>
                <div className="ep-gf-ara">{gloxFiyat}</div>
                <button className="ep-gf-kul" onClick={fiyatKullan}>✓ {t("epOneriKullan")}</button>
              </div>
            )}

            <div className="ep-etk" style={{ marginTop: 13 }}>🏷️ {t("epKategoriEtk")}</div>
            <div className="ep-katsec">
              {KATEGORILER.filter((k) => k.id !== "tumu").map((k) => (
                <button key={k.id} className={"ep-kc" + (kategori === k.id ? " sec" : "")} style={{ "--c": k.renk }} onClick={() => setKategori(k.id)}>{t("epKat_" + k.id)}</button>
              ))}
            </div>

            <div className="ep-etk" style={{ marginTop: 13 }}>{t("epDurumEtk")}</div>
            <div className="ep-durum-sec">
              <button className={"ep-dc" + (durum === "ikinci" ? " sec" : "")} onClick={() => setDurum("ikinci")}>{t("epIkinciEl")}</button>
              <button className={"ep-dc" + (durum === "yeni" ? " sec" : "")} onClick={() => setDurum("yeni")}>{t("epYeni")}</button>
            </div>

            <div className="ep-etk" style={{ marginTop: 13 }}>📍 {t("epKonumEtk")}</div>
            <input className="ep-inp" value={konumYazi} onChange={(e) => setKonumYazi(e.target.value)} placeholder={t("epKonumPh")} />
            <button className={"ep-harita-sec-btn" + (konumLL ? " secili" : "")} onClick={() => setHaritaAcik(true)}>
              🗺️ {konumLL ? t("epKonumIsaretli") : t("epHaritadanSec")}
            </button>
            <div className="ep-ipucu">{t("epKonumIpucu")}</div>

            <div className="ep-etk" style={{ marginTop: 13 }}>🏷️ {t("epEtiketlerEtk")}</div>
            <div className="ep-etsec">
              {ETIKETLER.map((et) => (
                <button key={et.id} className={"ep-es " + et.sinif + (etiketler.has(et.id) ? " sec" : "")} onClick={() => etkToggle(et.id)}>{et.emoji + " " + t("epEt_" + et.id)}{etiketler.has(et.id) ? " ✓" : ""}</button>
              ))}
            </div>

            <div className="ep-etk" style={{ marginTop: 13 }}>📞 {t("epIletisimEtk")}</div>
            <div className="ep-iletisim-not">💬 {t("epIletisimNot")}</div>
            <input className="ep-inp" style={{ marginTop: 7 }} inputMode="tel" value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder={t("epTelefonPh")} />
            <input className="ep-inp" style={{ marginTop: 7 }} inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("epEpostaPh")} />
            <input className="ep-inp" style={{ marginTop: 7 }} value={adres} onChange={(e) => setAdres(e.target.value)} placeholder={t("epAdresPh")} />
          </div>

          {hata && <div className="ep-hata">{hata}</div>}
          <button className="ep-yayinla" onClick={yayinla} disabled={gonderiliyor || medyaYuk}>{gonderiliyor ? t("epYayinlaniyor") : ("✦ " + t("epIlaniYayinla"))}</button>
        </div>
      </div>
      {haritaAcik && <HaritaSecici baslaLat={konumLL && konumLL.lat} baslaLon={konumLL && konumLL.lon}
        onKapat={() => setHaritaAcik(false)}
        onSec={(lat, lon) => { setKonumLL({ lat, lon }); setHaritaAcik(false); }} />}
    </div>
  );
}

// ---------- HARİTADAN KONUM SEÇ (satıcı ilan verirken) ----------
function HaritaSecici({ baslaLat, baslaLon, onSec, onKapat }) {
  const { t } = useTranslation();
  const ref = useRef(null), haritaRef = useRef(null), markerRef = useRef(null);
  const [sec, setSec] = useState(baslaLat && baslaLon ? { lat: baslaLat, lon: baslaLon } : null);
  const secRef = useRef(sec); useEffect(() => { secRef.current = sec; }, [sec]);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const s = secRef.current;
    const h = L.map(el, { attributionControl: false }).setView(s ? [s.lat, s.lon] : [39, 35], s ? 13 : 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(h);
    const koy = (lat, lon) => {
      setSec({ lat, lon });
      if (markerRef.current) markerRef.current.setLatLng([lat, lon]);
      else markerRef.current = L.marker([lat, lon], { icon: pazarPin() }).addTo(h);
    };
    if (s) koy(s.lat, s.lon);
    h.on("click", (e) => koy(e.latlng.lat, e.latlng.lng));
    haritaRef.current = h;
    setTimeout(() => { try { h.invalidateSize(); } catch (x) {} }, 250);
    return () => { try { h.remove(); } catch (x) {} };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const gps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => {
      const lat = p.coords.latitude, lon = p.coords.longitude;
      setSec({ lat, lon });
      const h = haritaRef.current; if (h) { h.setView([lat, lon], 15); if (markerRef.current) markerRef.current.setLatLng([lat, lon]); else markerRef.current = L.marker([lat, lon], { icon: pazarPin() }).addTo(h); }
    }, () => {}, { enableHighAccuracy: true, timeout: 10000 });
  };
  return (
    <div className="ep-fon" onClick={(e) => { if (e.target === e.currentTarget) onKapat(); }}>
      <div className="ep-harita-pen">
        <div className="ep-sat-bas"><button className="ep-detay-x" onClick={onKapat}>‹</button><h2>{t("epKonumSec")}</h2></div>
        <div className="ep-harita-not">{t("epHaritaNot")}</div>
        <div ref={ref} className="ep-harita"></div>
        <div className="ep-harita-btnlar">
          <button className="ep-hg-gps" onClick={gps}>📍 {t("epKonumumuKullan")}</button>
          <button className="ep-hg-sec" disabled={!sec} onClick={() => sec && onSec(sec.lat, sec.lon)}>✓ {t("epBuKonumuSec")}</button>
        </div>
      </div>
    </div>
  );
}

// ---------- KONUMU HARİTADA GÖSTER + MESAFE (alıcı detayda görür) ----------
function HaritaGoster({ lat, lon, benLat, benLon }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const [ben, setBen] = useState((benLat && benLon) ? { lat: benLat, lon: benLon } : null);
  const [tam, setTam] = useState(false); // tam ekran harita açık mı
  useEffect(() => {
    const el = ref.current; if (!el) return;
    // Önizleme: dokununca tam ekran açılır (bu yüzden kendisi sabit — sürükleme kapalı)
    const h = L.map(el, { attributionControl: false, zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, tap: false, keyboard: false }).setView([lat, lon], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(h);
    L.marker([lat, lon], { icon: pazarPin() }).addTo(h);
    // Modal açılışında kutu boyutu geç oturuyordu → harita GRİ kalıyordu. Birkaç kez invalidateSize ile düzelt.
    const fix = () => { try { h.invalidateSize(); } catch (x) {} };
    setTimeout(fix, 100); setTimeout(fix, 400); setTimeout(fix, 900);
    return () => { try { h.remove(); } catch (x) {} };
  }, [lat, lon]);
  useEffect(() => {
    if (ben || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => setBen({ lat: p.coords.latitude, lon: p.coords.longitude }), () => {}, { timeout: 9000 });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const km = ben ? mesafeKm(ben.lat, ben.lon, lat, lon) : null;
  return (
    <div className="ep-harita-goster">
      <div className="ep-etk" style={{ marginBottom: 6 }}>📍 {t("epKonum")}</div>
      {/* Önizleme haritası — dokununca TAM EKRAN açılır (yeri gezerek görebilesin) */}
      <div className="ep-harita-onizleme" onClick={() => setTam(true)}>
        <div ref={ref} className="ep-harita ep-harita-kucuk"></div>
        <span className="ep-harita-genislet" aria-hidden="true">⛶</span>
      </div>
      <div className="ep-harita-bilgi">
        {km != null
          ? <span className="ep-km">📍 {t("epUzaklik", { mesafe: (km < 1 ? (Math.round(km * 1000) + " m") : (km.toFixed(1) + " km")) })}</span>
          : <span className="ep-km">📍 {t("epUrununKonumu")}</span>}
        <button className="ep-yol" onClick={() => yolTarifiAc(lat, lon)}>{t("epYolTarifi")} ↗</button>
      </div>
      {tam && <HaritaTamEkran lat={lat} lon={lon} onKapat={() => setTam(false)} baslik={t("epUrununKonumu")} yolYazi={t("epYolTarifi")} />}
    </div>
  );
}

// ---------- TAM EKRAN HARİTA (alıcı yeri gezerek görür + yol tarifi) ----------
function HaritaTamEkran({ lat, lon, onKapat, baslik, yolYazi }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    // TAM interaktif: sürükle + yakınlaştır (yeri istediğin gibi gör)
    const h = L.map(el, { attributionControl: false, zoomControl: true }).setView([lat, lon], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(h);
    L.marker([lat, lon], { icon: pazarPin() }).addTo(h);
    const fix = () => { try { h.invalidateSize(); } catch (x) {} };
    setTimeout(fix, 100); setTimeout(fix, 400); setTimeout(fix, 900);
    return () => { try { h.remove(); } catch (x) {} };
  }, [lat, lon]);
  return (
    <div className="ep-fon" onClick={(e) => { if (e.target === e.currentTarget) onKapat(); }}>
      <div className="ep-harita-pen">
        <div className="ep-sat-bas"><button className="ep-detay-x" onClick={onKapat}>‹</button><h2>📍 {baslik}</h2></div>
        <div ref={ref} className="ep-harita ep-harita-tam"></div>
        <div className="ep-harita-btnlar">
          <button className="ep-hg-sec" onClick={() => yolTarifiAc(lat, lon)}>➡️ {yolYazi}</button>
        </div>
      </div>
    </div>
  );
}
