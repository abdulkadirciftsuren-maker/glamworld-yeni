// GLOXORG — VİTRİN / REKLAM: ana sayfada soldan-sağa akan reklam şeridi. Firmalar ürün (elbise/ayakkabı/çanta/
// aksesuar/makyaj) reklamı verir; müşteri reklama basınca ürünü Gloxoo ile KENDİ üstünde dener + satıcıya yazar/sipariş verir.
// Altyapı: Elite Pazar'ın "pazarUrunleri" koleksiyonu (reklam:true işaretli) → yeni Firestore kuralı GEREKMEZ.
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import L from "leaflet"; // haritadan konum seçmek için (iş yerini işaretle) — OSM, uygulamanın kullandığı kaynak
import { pazarUrunEkle, pazarUrunleriOku, pazarUrunSil, gorselYukle } from "./veri";

const KATEGORILER = [
  { k: "elbise", ik: "👕", ck: "saElbise", ad: "Kıyafet" },
  { k: "ayakkabi", ik: "👟", ck: "saAyakkabi", ad: "Ayakkabı" },
  { k: "canta", ik: "👜", ck: "saCanta", ad: "Çanta" },
  { k: "aksesuar", ik: "⌚", ck: "saAksesuar", ad: "Aksesuar" },
  { k: "makyaj", ik: "💄", ck: "saMakyaj", ad: "Makyaj" },
];
const KISILER = [
  { k: "bayan", ik: "👩", ck: "saKisiBayan", ad: "Bayan" }, { k: "erkek", ik: "👨", ck: "saKisiErkek", ad: "Erkek" },
  { k: "kiz", ik: "👧", ck: "saKisiKiz", ad: "Kız" }, { k: "erkekcocuk", ik: "👦", ck: "saKisiErkekCocuk", ad: "Erkek Çocuk" },
  { k: "bebek", ik: "👶", ck: "saKisiBebek", ad: "Bebek" },
];
// FİRMA / İŞLETME reklam kategorileri (moda DIŞI her şey: yemek, market, emlak, araç, firma...)
const FIRMA_KATEGORI = [
  { k: "yemek", ik: "🍽️", ck: "fkYemek", ad: "Yemek / Restoran" },
  { k: "market", ik: "🛒", ck: "fkMarket", ad: "Market / Bakkal" },
  { k: "guzellik", ik: "💇", ck: "fkGuzellik", ad: "Kuaför / Güzellik" },
  { k: "emlak", ik: "🏠", ck: "fkEmlak", ad: "Emlak" },
  { k: "arac", ik: "🚗", ck: "fkArac", ad: "Araç / Oto" },
  { k: "magaza", ik: "🏬", ck: "fkMagaza", ad: "Mağaza" },
  { k: "saglik", ik: "🏥", ck: "fkSaglik", ad: "Sağlık" },
  { k: "egitim", ik: "🎓", ck: "fkEgitim", ad: "Eğitim" },
  { k: "hizmet", ik: "🔧", ck: "fkHizmet", ad: "Hizmet" },
  { k: "diger", ik: "🏢", ck: "fkDiger", ad: "Diğer / Firma" },
];
// Web adresini düzelt (başında http yoksa ekle) + Yol tarifi (harita) linki
function webDuzelt(w) { w = (w || "").toString().trim(); if (!w) return ""; return /^https?:\/\//i.test(w) ? w : ("https://" + w); }
function yolTarifiUrl(r) {
  if (r && r.konum && r.konum.enlem != null && r.konum.boylam != null) return "https://www.google.com/maps/dir/?api=1&destination=" + r.konum.enlem + "," + r.konum.boylam;
  if (r && r.adres) return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(r.adres);
  return "";
}
function dosyaOku(file) { return new Promise((res) => { try { const r = new FileReader(); r.onload = () => res(String(r.result || "")); r.onerror = () => res(""); r.readAsDataURL(file); } catch (e) { res(""); } }); }
// Fotoğrafı küçült (küçük base64) → "üstümde dene"de GERÇEK ürünü giydirmek için doğrudan görsel yollanır (CORS derdi olmaz)
function kucultB64(dataUrl, max = 720) {
  return new Promise((res) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          let w = img.width, h = img.height;
          if (w >= h && w > max) { h = Math.round(h * max / w); w = max; } else if (h > max) { w = Math.round(w * max / h); h = max; }
          const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h);
          res(c.toDataURL("image/jpeg", 0.82));
        } catch (e) { res(dataUrl); }
      };
      img.onerror = () => res(dataUrl); img.src = dataUrl;
    } catch (e) { res(dataUrl); }
  });
}

export default function Reklam({ uid, benAd, benFoto, dil, paraSym, onDene, saticiyaYaz, pasif, yonetici }) {
  const { t } = useTranslation();
  const [reklamlar, setReklamlar] = useState([]);
  const [detay, setDetay] = useState(null);       // açık reklam (detay penceresi)
  const [verAcik, setVerAcik] = useState(false);   // "Reklam Ver" formu

  // Form durumları
  const [foto, setFoto] = useState("");
  const [ad, setAd] = useState("");
  const [kategori, setKategori] = useState("elbise");
  const [kisi, setKisi] = useState("bayan");
  const [beden, setBeden] = useState("");
  const [renk, setRenk] = useState("");
  const [kumas, setKumas] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [fiyat, setFiyat] = useState("");
  const [paraSimge, setParaSimge] = useState(paraSym || "₺"); // ülkeye göre otomatik para birimi
  const [kaydet, setKaydet] = useState(false);
  const [hata, setHata] = useState("");
  const inpRef = useRef(null);
  // FİRMA / İŞLETME reklam formu
  const [firmaVerAcik, setFirmaVerAcik] = useState(false);
  const [fFoto, setFFoto] = useState("");
  const [fAd, setFAd] = useState("");
  const [fKat, setFKat] = useState("yemek");
  const [fAciklama, setFAciklama] = useState("");
  const [fTel, setFTel] = useState("");
  const [fWeb, setFWeb] = useState("");
  const [fAdres, setFAdres] = useState("");
  const [fKonum, setFKonum] = useState(null);       // {enlem,boylam} — haritadan seçilen tam yer
  const [fKonumDurum, setFKonumDurum] = useState("");
  const [fKaydet, setFKaydet] = useState(false);
  const [fHata, setFHata] = useState("");
  const fInpRef = useRef(null);
  // HARİTADAN KONUM SEÇME (iş yerini işaretle — GPS'in aldığı "şu anki yer" değil)
  const [haritaAcik, setHaritaAcik] = useState(false);
  const [haritaKonum, setHaritaKonum] = useState(null); // {lat,lng} — haritada seçili nokta
  const haritaRef = useRef(null);
  const haritaMapRef = useRef(null);

  async function yukle() {
    try { const hepsi = await pazarUrunleriOku(200); setReklamlar((hepsi || []).filter((p) => p.reklam)); } catch (e) {}
  }
  useEffect(() => { yukle(); }, []);

  // HARİTA — açılınca Leaflet haritası kur (OSM); parmakla dokun/pini sürükle → nokta seç. Kapanınca temizle.
  useEffect(() => {
    if (!haritaAcik) return;
    const el = haritaRef.current; if (!el) return;
    let map, marker;
    const bas = fKonum ? [fKonum.enlem, fKonum.boylam] : [39.0, 35.0]; // seçili varsa oraya, yoksa Türkiye ortası
    const zoom = fKonum ? 16 : 5;
    try {
      map = L.map(el, { zoomControl: true }).setView(bas, zoom);
      L.tileLayer("https://a.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
      // Altın damla pin (resim gerektirmez — Leaflet varsayılan ikon 404 vermesin)
      const pin = L.divIcon({ className: "", html: '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#FFD700;border:2.5px solid #7a5a00;box-shadow:0 2px 8px rgba(0,0,0,.5)"></div>', iconSize: [26, 26], iconAnchor: [13, 26] });
      marker = L.marker(bas, { draggable: true, icon: pin }).addTo(map);
      if (fKonum) setHaritaKonum({ lat: bas[0], lng: bas[1] });
      marker.on("dragend", () => { const p = marker.getLatLng(); setHaritaKonum({ lat: p.lat, lng: p.lng }); });
      map.on("click", (e) => { marker.setLatLng(e.latlng); setHaritaKonum({ lat: e.latlng.lat, lng: e.latlng.lng }); });
      // Seçili yer yoksa GPS ile yaklaştır (başlangıç kolaylığı) — kullanıcı sonra pini iş yerine taşır
      if (!fKonum && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const ll = [pos.coords.latitude, pos.coords.longitude];
          try { map.setView(ll, 15); marker.setLatLng(ll); setHaritaKonum({ lat: ll[0], lng: ll[1] }); } catch (e) {}
        }, () => {}, { timeout: 8000 });
      }
      setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, 250); // modal açılınca harita boyutunu düzelt
      haritaMapRef.current = map;
    } catch (e) {}
    return () => { try { if (map) map.remove(); } catch (e) {} haritaMapRef.current = null; };
  }, [haritaAcik]); // eslint-disable-line react-hooks/exhaustive-deps

  // ŞERİT OTOMATİK AKIŞ — üstteki değerler şeridi gibi: yavaşça sola akar, parmak basınca DURUR,
  // parmakla sağa-sola serbest çekilir, bırakınca 1-2 sn sonra otomatik devam eder. Liste 2 kez basılır → sonsuz döngü.
  const akisRef = useRef(null);
  const oto = useRef({ dokunuyor: false, sonEtkilesim: 0, raf: 0 });
  const gorunur = useRef(true); // şerit ekranda mı (kaydırınca/görünmeyince boşuna boyama YOK → titreme/parlama olmaz)
  const durRef = useRef({ detay: false, verAcik: false, pasif: false });
  durRef.current = { detay: !!detay, verAcik: !!verAcik, pasif: !!pasif };
  useEffect(() => {
    if (!reklamlar.length) return;
    const el = akisRef.current; if (!el) return;
    let iptal = false;
    // Şerit görünürlüğü: ekranda değilse (kaydırıldı) veya sekme arka planda ise AKIŞI DURDUR → gereksiz ekran boyama olmaz.
    let gozlemci = null;
    try { gozlemci = new IntersectionObserver((g) => { gorunur.current = !!(g[0] && g[0].isIntersecting); }, { threshold: 0.01 }); gozlemci.observe(el); } catch (e) {}
    // ⛔ iPHONE DÜZELTMESİ (kullanıcı: "iPhone'da reklam şeridi yürümüyor, Android'de yürüyor"): iOS Safari scrollLeft'i TAM SAYIYA
    //   yuvarlar → "el.scrollLeft += 0.65" her karede 0'a yuvarlanıp şerit HİÇ İLERLEMİYORDU. Android'de kesir korunduğu için orada
    //   yürüyordu. ÇÖZÜM: konumu FLOAT olarak BİZ tutarız (poz) ve her kare el.scrollLeft = poz yazarız → poz sürekli büyüdüğü için
    //   iOS floor(poz) görüntülese bile şerit yürür. Kullanıcı parmakla kaydırınca poz gerçek konuma senkronlanır (oradan devam eder).
    let poz = el.scrollLeft || 0;
    const adim = () => {
      if (iptal) return;
      const d = durRef.current;
      // Üstte bir pencere açıkken (Sanal Ayna/detay/form), sekme gizliyken ya da şerit görünmezken YAZMA → sayfa parlamaz/titremez.
      const engel = d.pasif || d.detay || d.verAcik || !gorunur.current || (typeof document !== "undefined" && document.hidden);
      if (!engel) {
        const yari = el.scrollWidth / 2; // tek set genişliği (liste iki kez basıldı)
        if (yari > 0) {
          const bosVakit = Date.now() - oto.current.sonEtkilesim > 1600; // bırakınca ~1.6 sn sonra devam
          if (!oto.current.dokunuyor && bosVakit) {
            poz += 0.65;                          // yavaşça sola akış (FLOAT — iOS'ta da birikir, yürür)
            if (poz >= yari) poz -= yari;         // sonsuz döngü: sınırı geçince bir set kadar sar (görsel fark yok)
            else if (poz < 0) poz += yari;
            el.scrollLeft = poz;
          } else {
            poz = el.scrollLeft;                  // kullanıcı dokunuyor / yeni bıraktı → gerçek konumu takip et
            if (!oto.current.dokunuyor) {          // elle kaydırınca da sonsuz döngü sarması
              if (poz >= yari) { poz -= yari; el.scrollLeft = poz; }
              else if (poz < 0) { poz += yari; el.scrollLeft = poz; }
            }
          }
        }
      }
      oto.current.raf = requestAnimationFrame(adim);
    };
    oto.current.raf = requestAnimationFrame(adim);
    return () => { iptal = true; cancelAnimationFrame(oto.current.raf); try { gozlemci && gozlemci.disconnect(); } catch (e) {} };
  }, [reklamlar.length]);
  const etkilesimBas = () => { oto.current.dokunuyor = true; oto.current.sonEtkilesim = Date.now(); };
  const etkilesimHar = () => { oto.current.sonEtkilesim = Date.now(); };
  const etkilesimBit = () => { oto.current.dokunuyor = false; oto.current.sonEtkilesim = Date.now(); };

  function formSifirla() { setFoto(""); setAd(""); setKategori("elbise"); setKisi("bayan"); setBeden(""); setRenk(""); setKumas(""); setAciklama(""); setFiyat(""); setParaSimge(paraSym || "₺"); setHata(""); }
  async function fotoSec(e) { const f = e.target.files && e.target.files[0]; if (!f) return; const d = await dosyaOku(f); if (d) { setFoto(d); setHata(""); } }
  async function yayinla() {
    if (kaydet) return;
    if (!foto) { setHata(t("rkFotoOnce", "Önce ürün fotoğrafı ekle.")); return; }
    if (!ad.trim()) { setHata(t("rkAdOnce", "Ürün adı yaz.")); return; }
    setKaydet(true); setHata("");
    try {
      let kapak = ""; try { kapak = await gorselYukle(foto, uid || "reklam"); } catch (e) {}
      if (!kapak) kapak = foto; // yüklenemezse data URL
      let refB64 = ""; try { refB64 = await kucultB64(foto, 720); } catch (e) {} // "üstümde dene" için küçük referans (gerçek ürün)
      await pazarUrunEkle({
        reklam: true, tur: "reklam", kapak, refB64, baslik: ad.trim(), kategori, kimIcin: kisi,
        beden: beden.trim(), renk: renk.trim(), kumas: kumas.trim(), aciklama: aciklama.trim(),
        fiyat: (fiyat || "").toString().trim(), paraSimge, uid: uid || "", satici: benAd || "", saticiFoto: benFoto || "",
      });
      formSifirla(); setVerAcik(false); yukle();
    } catch (e) { setHata(t("rkOlmadi", "Yayınlanamadı, tekrar dene.")); }
    setKaydet(false);
  }

  const kAd = (kkey) => { const k = KATEGORILER.find((x) => x.k === kkey); return k ? t(k.ck, k.ad) : kkey; };

  // REKLAMI SİL — kendi reklamını herkes, YÖNETİCİ ise HER reklamı silebilir (uygun olmayanı kaldır). Kural zaten korur.
  const benimMi = (r) => !!(uid && (r.sahipUid === uid || r.uid === uid));
  const silinebilir = (r) => !!(r && (benimMi(r) || yonetici));
  async function reklamSilEt(r) {
    if (!r || !r.id) return;
    if (typeof window !== "undefined" && !window.confirm(t("rkSilOnay", "Bu reklamı silmek istiyor musun?"))) return;
    setReklamlar((a) => a.filter((x) => x.id !== r.id)); // anında kaldır
    setDetay(null);
    try { await pazarUrunSil(r.id); } catch (e) {}
  }

  // --- FİRMA / İŞLETME reklamı ---
  function firmaFormSifirla() { setFFoto(""); setFAd(""); setFKat("yemek"); setFAciklama(""); setFTel(""); setFWeb(""); setFAdres(""); setFKonum(null); setFKonumDurum(""); setFHata(""); }
  async function firmaFotoSec(e) { const f = e.target.files && e.target.files[0]; if (!f) return; const d = await dosyaOku(f); if (d) { setFFoto(d); setFHata(""); } }
  // HARİTAYI AÇ — iş yerini haritada işaretle (parmakla dokun/pini sürükle)
  function haritaAc() { setHaritaKonum(fKonum ? { lat: fKonum.enlem, lng: fKonum.boylam } : null); setHaritaAcik(true); }
  // Seçilen noktayı onayla → firma konumu + (adres boşsa) ters-coğrafya ile adresi doldur
  async function haritaOnayla() {
    if (!haritaKonum) { setHaritaAcik(false); return; }
    setFKonum({ enlem: haritaKonum.lat, boylam: haritaKonum.lng }); setFKonumDurum("ok");
    if (!fAdres.trim()) {
      try {
        const r = await fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" + haritaKonum.lat + "&lon=" + haritaKonum.lng + "&zoom=18&accept-language=" + (dil || "tr"), { headers: { Accept: "application/json" } });
        if (r.ok) { const j = await r.json(); if (j && j.display_name) setFAdres(j.display_name); }
      } catch (e) {}
    }
    setHaritaAcik(false);
  }
  async function firmaYayinla() {
    if (fKaydet) return;
    if (!fFoto) { setFHata(t("fkFotoOnce", "Önce işletme fotoğrafı/logosu ekle.")); return; }
    if (!fAd.trim()) { setFHata(t("fkAdOnce", "İşletme/firma adı yaz.")); return; }
    if (!fTel.trim() && !fWeb.trim() && !fAdres.trim() && !fKonum) { setFHata(t("fkIletisimOnce", "En az bir iletişim ekle: telefon, web veya adres.")); return; }
    setFKaydet(true); setFHata("");
    try {
      let kapak = ""; try { kapak = await gorselYukle(fFoto, uid || "reklam"); } catch (e) {}
      if (!kapak) kapak = fFoto;
      await pazarUrunEkle({
        reklam: true, reklamTur: "firma", tur: "reklam", kapak, baslik: fAd.trim(), kategori: fKat,
        aciklama: fAciklama.trim(), telefon: fTel.trim(), web: webDuzelt(fWeb), adres: fAdres.trim(), konum: fKonum || null,
        uid: uid || "", satici: benAd || "", saticiFoto: benFoto || "",
      });
      firmaFormSifirla(); setFirmaVerAcik(false); yukle();
    } catch (e) { setFHata(t("rkOlmadi", "Yayınlanamadı, tekrar dene.")); }
    setFKaydet(false);
  }
  const fkAd = (kkey) => { const k = FIRMA_KATEGORI.find((x) => x.k === kkey); return k ? t(k.ck, k.ad) : kkey; };
  // İKİ AYRI ŞERİT: MODA (denenebilir ürün) ve FİRMA (işletme/yemek/emlak...)
  const modaListe = reklamlar.filter((r) => r.reklamTur !== "firma");
  const firmaListe = reklamlar.filter((r) => r.reklamTur === "firma");

  return (
    <>
      {/* MODA ŞERİDİ — ana sayfada soldan-sağa akar (kıyafet/ayakkabı/çanta/takı/makyaj — üstümde dene) */}
      <div className="reklam-serit">
        <div className="reklam-serit-bas">
          <span className="reklam-serit-ad">🛍️ {t("rkBaslik", "Vitrin — Reklam")}</span>
          <button className="reklam-ver-mini" onClick={() => { formSifirla(); setVerAcik(true); }}>＋ {t("rkVer", "Reklam Ver")}</button>
        </div>
        {modaListe.length === 0 ? (
          <button className="reklam-bos" onClick={() => { formSifirla(); setVerAcik(true); }}>＋ {t("rkIlk", "İlk reklamı sen ver — ürününü buradan tanıt")}</button>
        ) : (
          <div className="reklam-akis" ref={akisRef}
            onTouchStart={etkilesimBas} onTouchMove={etkilesimHar} onTouchEnd={etkilesimBit}
            onPointerDown={etkilesimBas} onPointerMove={(e) => { if (e.buttons) etkilesimHar(); }} onPointerUp={etkilesimBit} onPointerLeave={etkilesimBit}>
            <div className="reklam-track">
              {/* liste İKİ kez basılır → kesintisiz sonsuz akış */}
              {modaListe.concat(modaListe).map((r, i) => (
                <button className="reklam-kart" key={r.id + "-" + i} onClick={() => setDetay(r)}>
                  <span className="reklam-kart-foto" style={r.kapak ? { backgroundImage: `url(${r.kapak})` } : {}}>{!r.kapak && "🛍️"}</span>
                  <span className="reklam-kart-ad">{r.baslik || ""}</span>
                  {r.fiyat ? <span className="reklam-kart-fiyat">{r.fiyat} {r.paraSimge || "₺"}</span> : null}
                  <span className="reklam-kart-dene">🪞 {t("rkDene", "Üstümde dene")}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FİRMA / İŞLETME ŞERİDİ — yemek/restoran, market, emlak, araç, firma... (Ara / Mesaj / Web / Yol tarifi) */}
      <div className="reklam-serit firma-serit">
        <div className="reklam-serit-bas">
          <span className="reklam-serit-ad">🏢 {t("fkBaslik", "Firma / İşletme Reklamları")}</span>
          <button className="reklam-ver-mini" onClick={() => { firmaFormSifirla(); setFirmaVerAcik(true); }}>＋ {t("fkVer", "Firma Reklamı Ver")}</button>
        </div>
        {firmaListe.length === 0 ? (
          <button className="reklam-bos" onClick={() => { firmaFormSifirla(); setFirmaVerAcik(true); }}>＋ {t("fkIlk", "İşletmeni buradan tanıt — yemek, market, emlak, firma…")}</button>
        ) : (
          <div className="reklam-akis firma-akis">
            <div className="reklam-track">
              {firmaListe.map((r) => (
                <button className="reklam-kart firma-kart" key={r.id} onClick={() => setDetay(r)}>
                  {/* AD ÜSTTE (kullanıcı isteği) → foto → kategori */}
                  <span className="reklam-kart-ad">{r.baslik || ""}</span>
                  <span className="reklam-kart-foto" style={r.kapak ? { backgroundImage: `url(${r.kapak})` } : {}}>{!r.kapak && "🏢"}</span>
                  <span className="reklam-kart-fkat">{fkAd(r.kategori)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DETAY penceresi */}
      {detay && (
        <div className="reklam-fon" onClick={(e) => { if (e.target === e.currentTarget) setDetay(null); }}>
          <div className="reklam-detay">
            <div className="reklam-detay-ust">
              <span className="reklam-detay-bas">{detay.baslik || ""}</span>
              <button className="reklam-kapat" onClick={() => setDetay(null)} aria-label={t("kapat", "Kapat")}>✕</button>
            </div>
            <div className="reklam-detay-kaydir">
              {detay.kapak && <img className="reklam-detay-foto" src={detay.kapak} alt="" referrerPolicy="no-referrer" />}
              {detay.reklamTur === "firma" ? (
                <>
                  {/* FİRMA / İŞLETME detayı — Ara / Mesaj / Web / Yol tarifi */}
                  <div className="reklam-detay-satici">🏢 {detay.satici || t("fkSahip", "İşletme")}</div>
                  <div className="reklam-detay-ozet"><span className="reklam-oz"><b>{fkAd(detay.kategori)}</b></span>{detay.adres && <span className="reklam-oz">📍 {detay.adres}</span>}</div>
                  {detay.aciklama && <div className="reklam-detay-aciklama">{detay.aciklama}</div>}
                  <div className="reklam-detay-dugmeler">
                    {detay.telefon && <a className="reklam-firma-btn firma-ara" href={"tel:" + detay.telefon}>📞 {t("fkAra", "Ara")}</a>}
                    <button className="reklam-firma-btn firma-mesaj" onClick={() => { const m = `"${detay.baslik}" işletmeniz için yazıyorum. Bilgi almak istiyorum.`; setDetay(null); saticiyaYaz && saticiyaYaz({ uid: detay.sahipUid || detay.uid, ad: detay.satici, foto: detay.saticiFoto }, m); }}>💬 {t("fkMesaj", "Mesaj")}</button>
                    {detay.web && <a className="reklam-firma-btn firma-web" href={detay.web} target="_blank" rel="noreferrer">🌐 {t("fkWeb", "Web sitesi")}</a>}
                    {yolTarifiUrl(detay) && <a className="reklam-firma-btn firma-yol" href={yolTarifiUrl(detay)} target="_blank" rel="noreferrer">🗺️ {t("fkYol", "Yol tarifi")}</a>}
                    {silinebilir(detay) && <button className="reklam-sil-btn" onClick={() => reklamSilEt(detay)}>🗑 {t("rkSil", "Reklamı Sil")}{yonetici && !benimMi(detay) ? " (" + t("yonetici", "yönetici") + ")" : ""}</button>}
                  </div>
                </>
              ) : (
                <>
                  {detay.fiyat ? <div className="reklam-detay-fiyat">{detay.fiyat} {detay.paraSimge || "₺"}</div> : null}
                  <div className="reklam-detay-satici">🏪 {detay.satici || t("rkSatici", "Satıcı")}</div>
                  <div className="reklam-detay-ozet">
                    <span className="reklam-oz"><b>{t("rkKimIcin", "Kim için")}:</b> {(KISILER.find((x) => x.k === detay.kimIcin) || {}).ad ? t((KISILER.find((x) => x.k === detay.kimIcin) || {}).ck, "") : "—"}</span>
                    <span className="reklam-oz"><b>{kAd(detay.kategori)}</b></span>
                    {detay.beden && <span className="reklam-oz"><b>{t("rkBeden", "Beden")}:</b> {detay.beden}</span>}
                    {detay.renk && <span className="reklam-oz"><b>{t("saRenk", "Renk")}:</b> {detay.renk}</span>}
                    {detay.kumas && <span className="reklam-oz"><b>{t("rkKumas", "Kumaş")}:</b> {detay.kumas}</span>}
                  </div>
                  {detay.aciklama && <div className="reklam-detay-aciklama">{detay.aciklama}</div>}
                  <div className="reklam-detay-dugmeler">
                    <button className="reklam-dene-btn" onClick={() => {
                      const tarif = [detay.renk && ("renk: " + detay.renk), detay.kumas && ("kumaş: " + detay.kumas), detay.beden && ("beden: " + detay.beden), detay.aciklama].filter(Boolean).join("; ");
                      const urun = { kategori: detay.kategori || "elbise", kisi: detay.kimIcin || "bayan", model: [detay.baslik, detay.renk, detay.kumas].filter(Boolean).join(", "), ad: detay.baslik || "", tarif, refFotoUrl: detay.kapak || "", refB64: detay.refB64 || "" };
                      setDetay(null); onDene && onDene(urun);
                    }}>🪞 {t("rkDene", "Üstümde dene")}</button>
                    <button className="reklam-yaz-btn" onClick={() => {
                      const m = `"${detay.baslik}" reklamınız için yazıyorum. ${detay.fiyat ? "(" + detay.fiyat + " " + (detay.paraSimge || "₺") + ") " : ""}Bilgi/sipariş almak istiyorum.`;
                      setDetay(null); saticiyaYaz && saticiyaYaz({ uid: detay.sahipUid || detay.uid, ad: detay.satici, foto: detay.saticiFoto }, m);
                    }}>💬 {t("rkYaz", "Satıcıya Yaz")}</button>
                    {silinebilir(detay) && (
                      <button className="reklam-sil-btn" onClick={() => reklamSilEt(detay)}>🗑 {t("rkSil", "Reklamı Sil")}{yonetici && !benimMi(detay) ? " (" + t("yonetici", "yönetici") + ")" : ""}</button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REKLAM VER formu */}
      {verAcik && (
        <div className="reklam-fon" onClick={(e) => { if (e.target === e.currentTarget) setVerAcik(false); }}>
          <div className="reklam-detay">
            <div className="reklam-detay-ust">
              <span className="reklam-detay-bas">🛍️ {t("rkYeni", "Yeni Reklam")}</span>
              <button className="reklam-kapat" onClick={() => setVerAcik(false)} aria-label={t("kapat", "Kapat")}>✕</button>
            </div>
            <div className="reklam-detay-kaydir">
              <div className="reklam-not">{t("rkUcretsizNot", "Şimdilik ÜCRETSİZ. İleride reklam yayını ücretli olacak.")}</div>
              <div className="reklam-foto-kutu" onClick={() => inpRef.current && inpRef.current.click()}>
                {foto ? <img src={foto} alt="" /> : <span className="reklam-foto-bos">📷<br />{t("rkFotoEkle", "Ürün fotoğrafı ekle")}</span>}
              </div>
              <input ref={inpRef} type="file" accept="image/*" style={{ display: "none" }} onChange={fotoSec} />
              <input className="reklam-inp" type="text" value={ad} onChange={(e) => setAd(e.target.value)} placeholder={t("rkAd", "Ürün adı")} />
              <div className="reklam-kim-bas">{t("rkKategori", "Kategori")}</div>
              <div className="reklam-cip-satir">{KATEGORILER.map((kt) => <button key={kt.k} className={"reklam-cip" + (kategori === kt.k ? " sec" : "")} onClick={() => setKategori(kt.k)}>{kt.ik} {t(kt.ck, kt.ad)}</button>)}</div>
              <div className="reklam-kim-bas">{t("saKimIcin", "Kim için?")}</div>
              <div className="reklam-cip-satir">{KISILER.map((ks) => <button key={ks.k} className={"reklam-cip" + (kisi === ks.k ? " sec" : "")} onClick={() => setKisi(ks.k)}>{ks.ik} {t(ks.ck, ks.ad)}</button>)}</div>
              <div className="reklam-ikili">
                <input className="reklam-inp" type="text" value={beden} onChange={(e) => setBeden(e.target.value)} placeholder={t("rkBeden", "Beden")} />
                <input className="reklam-inp" type="text" value={renk} onChange={(e) => setRenk(e.target.value)} placeholder={t("saRenk", "Renk")} />
              </div>
              <input className="reklam-inp" type="text" value={kumas} onChange={(e) => setKumas(e.target.value)} placeholder={t("rkKumas", "Kumaş / malzeme")} />
              <textarea className="reklam-inp reklam-alan" value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder={t("rkAciklama", "Açıklama (detay, kullanım, kargo…)")} rows={3} />
              <div className="reklam-ikili">
                <input className="reklam-inp" type="number" inputMode="decimal" value={fiyat} onChange={(e) => setFiyat(e.target.value)} placeholder={t("rkFiyat", "Fiyat")} />
                <select className="reklam-inp" value={paraSimge} onChange={(e) => setParaSimge(e.target.value)}>
                  <option value="₺">₺ TL</option><option value="$">$ USD</option><option value="€">€ EUR</option><option value="₴">₴ UAH</option><option value="£">£ GBP</option>
                </select>
              </div>
              {hata && <div className="reklam-hata">⚠️ {hata}</div>}
              <button className="reklam-yayinla" disabled={kaydet} onClick={yayinla}>{kaydet ? "⏳ " + t("rkYayinlaniyor", "Yayınlanıyor…") : "✅ " + t("rkYayinla", "Yayınla")}</button>
            </div>
          </div>
        </div>
      )}

      {/* FİRMA / İŞLETME REKLAMI VER formu */}
      {firmaVerAcik && (
        <div className="reklam-fon" onClick={(e) => { if (e.target === e.currentTarget) setFirmaVerAcik(false); }}>
          <div className="reklam-detay">
            <div className="reklam-detay-ust">
              <span className="reklam-detay-bas">🏢 {t("fkYeni", "Firma / İşletme Reklamı")}</span>
              <button className="reklam-kapat" onClick={() => setFirmaVerAcik(false)} aria-label={t("kapat", "Kapat")}>✕</button>
            </div>
            <div className="reklam-detay-kaydir">
              <div className="reklam-not">{t("rkUcretsizNot", "Şimdilik ÜCRETSİZ. İleride reklam yayını ücretli olacak.")}</div>
              <div className="reklam-foto-kutu" onClick={() => fInpRef.current && fInpRef.current.click()}>
                {fFoto ? <img src={fFoto} alt="" /> : <span className="reklam-foto-bos">📷<br />{t("fkFotoEkle", "İşletme fotoğrafı / logosu ekle")}</span>}
              </div>
              <input ref={fInpRef} type="file" accept="image/*" style={{ display: "none" }} onChange={firmaFotoSec} />
              <input className="reklam-inp" type="text" value={fAd} onChange={(e) => setFAd(e.target.value)} placeholder={t("fkAd", "İşletme / firma adı")} />
              <div className="reklam-kim-bas">{t("rkKategori", "Kategori")}</div>
              <div className="reklam-cip-satir">{FIRMA_KATEGORI.map((kt) => <button key={kt.k} className={"reklam-cip" + (fKat === kt.k ? " sec" : "")} onClick={() => setFKat(kt.k)}>{kt.ik} {t(kt.ck, kt.ad)}</button>)}</div>
              <textarea className="reklam-inp reklam-alan" value={fAciklama} onChange={(e) => setFAciklama(e.target.value)} placeholder={t("fkAciklama", "Kısa tanıtım (ne yapıyorsunuz, öne çıkanlar…)")} rows={3} />
              <input className="reklam-inp" type="tel" inputMode="tel" value={fTel} onChange={(e) => setFTel(e.target.value)} placeholder={t("fkTel", "📞 Telefon (Ara düğmesi için)")} />
              <input className="reklam-inp" type="text" inputMode="url" value={fWeb} onChange={(e) => setFWeb(e.target.value)} placeholder={t("fkWebInp", "🌐 Web sitesi / link (varsa)")} />
              <input className="reklam-inp" type="text" value={fAdres} onChange={(e) => setFAdres(e.target.value)} placeholder={t("fkAdres", "📍 Adres (Yol tarifi için)")} />
              <button className={"reklam-cip reklam-konum-btn" + (fKonum ? " sec" : "")} onClick={haritaAc}>
                {fKonum ? "✓ " + t("fkKonumSecildi", "İş yeri haritada seçildi (değiştir)") : "🗺️ " + t("fkHaritaSec", "Haritadan iş yerini seç")}
              </button>
              {fHata && <div className="reklam-hata">⚠️ {fHata}</div>}
              <button className="reklam-yayinla" disabled={fKaydet} onClick={firmaYayinla}>{fKaydet ? "⏳ " + t("rkYayinlaniyor", "Yayınlanıyor…") : "✅ " + t("rkYayinla", "Yayınla")}</button>
            </div>
          </div>
        </div>
      )}

      {/* HARİTADAN KONUM SEÇME — iş yerini işaretle (dokun / pini sürükle) */}
      {haritaAcik && (
        <div className="reklam-harita-fon" onClick={(e) => { if (e.target === e.currentTarget) setHaritaAcik(false); }}>
          <div className="reklam-harita-kutu">
            <div className="reklam-harita-bas">
              <span className="reklam-harita-bilgi">🗺️ {t("fkHaritaBilgi", "Haritada iş yerine dokun ya da pini sürükle")}</span>
              <button className="reklam-kapat" onClick={() => setHaritaAcik(false)} aria-label={t("kapat", "Kapat")}>✕</button>
            </div>
            <div ref={haritaRef} className="reklam-harita" />
            <div className="reklam-harita-alt">
              <button className="reklam-harita-vaz" onClick={() => setHaritaAcik(false)}>{t("vazgec", "Vazgeç")}</button>
              <button className="reklam-harita-tamam" disabled={!haritaKonum} onClick={haritaOnayla}>✓ {t("fkBuKonum", "Bu konumu kullan")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
