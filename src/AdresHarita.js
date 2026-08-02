// ═══════════════════════════════════════════════════════════════════════════
// ADRES HARİTASI — haritaya dokun → o noktanın ADRESİ (kapı numaralı) çıkar,
// hem O ÜLKENİN DİLİNDE hem İNGİLİZCE, KOPYALA düğmeleriyle. (HERE — güvenli köprü)
// ─────────────────────────────────────────────────────────────────────────────
// + Mekân noktaları (banka/kafe/restoran…) isimleriyle görünür, dokununca adı+adresi gelir.
// + Yazıyla adres/mekân ARAMA. + Temizle (yanlış adresi silip yeniden ara).
// Arkadaş haritasıyla AYNI boyutta önizleme. HERE köprüsü yoksa Nominatim yedeği.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { useTranslation } from "react-i18next";
import { ADRES_KOPRU } from "./hereConfig";
import { mekanEkle, mekanlariOku, mekanSil } from "./veri";

// Kullanıcının ekleyebileceği mekân türleri (renk poiRenk ile eşleşir)
const MEKAN_TURLERI = ["Banka", "Kafe", "Restoran", "Bar", "Market / Bakkal", "Mağaza", "Fabrika", "Otel", "Eczane", "Kuaför / Berber", "Elektronikçi", "Beyaz Eşya", "Anahtarcı / Çilingir", "Fırın / Pastane", "Akaryakıt", "Okul", "Hastane / Klinik", "Diğer"];

// Ülke kodu (HERE 3 harfli ISO) → o ülkenin ana dili (yerel adres bu dilde gelsin)
const CC3_LANG = { TUR: "tr", UKR: "uk", RUS: "ru", BLR: "be", KAZ: "ru", AZE: "az", GEO: "ka", ARM: "hy",
  CHN: "zh", TWN: "zh", HKG: "zh", JPN: "ja", KOR: "ko", THA: "th", VNM: "vi", IDN: "id",
  SAU: "ar", ARE: "ar", EGY: "ar", IRQ: "ar", SYR: "ar", JOR: "ar", KWT: "ar", QAT: "ar", OMN: "ar", YEM: "ar", MAR: "ar", DZA: "ar", TUN: "ar", LBY: "ar", LBN: "ar",
  IRN: "fa", ISR: "he", GRC: "el", CZE: "cs", SWE: "sv", DNK: "da", NOR: "nb", FIN: "fi",
  DEU: "de", AUT: "de", CHE: "de", FRA: "fr", ESP: "es", ITA: "it", PRT: "pt", BRA: "pt",
  MEX: "es", ARG: "es", NLD: "nl", POL: "pl", ROU: "ro", BGR: "bg", HUN: "hu", HRV: "hr", SRB: "sr",
  IND: "hi", PAK: "ur", BGD: "bn", GBR: "en", USA: "en", AUS: "en", CAN: "en", IRL: "en", NZL: "en" };

const POI_RENK = { hairdresser: "#ff2d9b", beauty: "#ff2d9b", barber: "#ff2d9b", bank: "#f7b500", atm: "#f7b500", hotel: "#00b8d4", motel: "#00b8d4", guest_house: "#00b8d4", hostel: "#00b8d4", fast_food: "#e74c3c", restaurant: "#ff6b3d", cafe: "#e67e22", supermarket: "#27ae60", convenience: "#2ecc71", marketplace: "#27ae60", pharmacy: "#8e44ad", hospital: "#e91e63", clinic: "#e91e63", post_office: "#16a085", fuel: "#d35400", school: "#3498db", university: "#3498db", bakery: "#e8a33d", mosque: "#2ecc71", church: "#bdc3c7", clothes: "#9b59b6", jewelry: "#f1c40f", townhall: "#2980b9", courthouse: "#9b59b6", police: "#34495e", fire_station: "#c0392b", library: "#16a085" };

const ETKILER = ["dragPan", "scrollZoom", "boxZoom", "dragRotate", "keyboard", "doubleClickZoom", "touchZoomRotate"];
function etkilesim(map, ac) { ETKILER.forEach((n) => { try { if (map[n]) ac ? map[n].enable() : map[n].disable(); } catch (e) {} }); }

export default function AdresHarita({ benLat, benLon, onTam, uid, benAd }) {
  const { t } = useTranslation();
  const kapRef = useRef(null);
  const haritaRef = useRef(null);
  const pinRef = useRef(null);
  const poiMarksRef = useRef([]);
  const mekanMarksRef = useRef([]);   // kullanıcı ekli mekân işaretleri
  const yeniMarkRef = useRef(null);   // ekleme sırasında geçici işaret
  const ekleModuRef = useRef(false);
  const poiZmnRef = useRef(null);
  const araZmnRef = useRef(null);
  const acikRef = useRef(false);
  const [acik, setAcik] = useState(false);
  const [hazir, setHazir] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [yerAdi, setYerAdi] = useState("");   // dokunulan mekânın adı (banka/kafe…)
  const [yerel, setYerel] = useState("");     // o ülkenin dilinde adres
  const [enAdres, setEnAdres] = useState(""); // İngilizce adres
  const [kopyalandi, setKopyalandi] = useState("");
  const [ara, setAra] = useState("");
  const [sonuclar, setSonuclar] = useState(null);
  const [araniyor, setAraniyor] = useState(false);
  const [benMekanlar, setBenMekanlar] = useState([]);   // kullanıcıların eklediği mekânlar
  const [ekleModu, setEkleModu] = useState(false);       // "yerimi ekle" modu
  const [yeniNokta, setYeniNokta] = useState(null);      // eklenecek yerin konumu {lat,lon}
  const [yeniAd, setYeniAd] = useState("");
  const [yeniTur, setYeniTur] = useState(MEKAN_TURLERI[0]);
  const [yeniTel, setYeniTel] = useState("");
  const [kaydediyor, setKaydediyor] = useState(false);
  const [secilenMekan, setSecilenMekan] = useState(null); // dokunulan kullanıcı mekânı (bilgi kartı)
  const benRef = useRef((typeof benLat === "number" && typeof benLon === "number") ? { lat: benLat, lon: benLon } : null);

  function pinKoy(lat, lon) { const map = haritaRef.current; if (!map) return; if (pinRef.current) pinRef.current.setLngLat([lon, lat]); else pinRef.current = new maplibregl.Marker({ color: "#e0202c" }).setLngLat([lon, lat]).addTo(map); }
  function pinKaldir() { if (pinRef.current) { try { pinRef.current.remove(); } catch (e) {} pinRef.current = null; } }
  function temizle() { setYerAdi(""); setYerel(""); setEnAdres(""); setKopyalandi(""); setSecilenMekan(null); pinKaldir(); }

  // KULLANICI EKLİ MEKANLAR — altın KARE işaret (HERE'nin yuvarlak noktalarından ayrı dursun) + isim
  function mekanlariGoster(liste) {
    const map = haritaRef.current; if (!map) return;
    mekanMarksRef.current.forEach((m) => { try { m.remove(); } catch (e) {} }); mekanMarksRef.current = [];
    (liste || []).forEach((m) => {
      if (typeof m.lat !== "number" || typeof m.lon !== "number") return;
      const wrap = document.createElement("div");
      wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:translateY(-4px)";
      const kare = document.createElement("div");
      kare.style.cssText = "width:26px;height:26px;border-radius:7px;border:2.5px solid #7a5c12;background:linear-gradient(160deg,#ffe9a8,#e6bd52);display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 7px rgba(0,0,0,.5)";
      kare.textContent = "⭐";
      const et = document.createElement("div");
      et.textContent = (m.ad || "").split(/\s+/).slice(0, 2).join(" ");
      et.style.cssText = "margin-top:2px;padding:1px 6px;background:rgba(122,92,18,.95);color:#fff;font-weight:800;font-size:10.5px;line-height:1.5;border-radius:6px;white-space:nowrap;max-width:96px;overflow:hidden;text-overflow:ellipsis";
      wrap.appendChild(kare); if (m.ad) wrap.appendChild(et);
      const mk = new maplibregl.Marker({ element: wrap, anchor: "bottom" }).setLngLat([m.lon, m.lat]).addTo(map);
      wrap.addEventListener("click", (ev) => { ev.stopPropagation(); if (!acikRef.current) return; setSecilenMekan(m); try { map.flyTo({ center: [m.lon, m.lat], zoom: Math.max(map.getZoom(), 16) }); } catch (e) {} });
      mekanMarksRef.current.push(mk);
    });
  }
  function mekanlariYukle() { mekanlariOku(800).then((l) => { setBenMekanlar(l || []); mekanlariGoster(l || []); }).catch(() => {}); }

  function ekleBaslat() { setSecilenMekan(null); temizle(); setSonuclar(null); ekleModuRef.current = true; setEkleModu(true); setYeniNokta(null); setYeniAd(""); setYeniTur(MEKAN_TURLERI[0]); setYeniTel(""); }
  function ekleIptal() { ekleModuRef.current = false; setEkleModu(false); setYeniNokta(null); if (yeniMarkRef.current) { try { yeniMarkRef.current.remove(); } catch (e) {} yeniMarkRef.current = null; } }
  function yeniNoktaKoy(lat, lon) {
    const map = haritaRef.current; if (!map) return;
    if (yeniMarkRef.current) yeniMarkRef.current.setLngLat([lon, lat]);
    else yeniMarkRef.current = new maplibregl.Marker({ color: "#e6bd52" }).setLngLat([lon, lat]).addTo(map);
    setYeniNokta({ lat, lon });
  }
  async function mekanKaydet() {
    if (!uid) { alert(t("adhGiris", "Mekân eklemek için giriş yapmalısın.")); return; }
    if (!yeniNokta || !yeniAd.trim()) return;
    setKaydediyor(true);
    try {
      await mekanEkle({ uid, ekleyenAd: benAd || "", ad: yeniAd.trim().slice(0, 80), tur: yeniTur, telefon: yeniTel.trim().slice(0, 40), lat: yeniNokta.lat, lon: yeniNokta.lon });
      ekleIptal(); mekanlariYukle();
    } catch (e) { alert(t("adhKaydOlmadi", "Kaydedilemedi, tekrar dene.")); }
    setKaydediyor(false);
  }
  async function mekanSilDene(m) {
    if (!m || !m.id) return;
    if (!window.confirm(t("adhSilOnay", "Bu mekânı silmek istiyor musun?"))) return;
    try { await mekanSil(m.id); setSecilenMekan(null); mekanlariYukle(); } catch (e) {}
  }

  // HERE kategori adına göre nokta rengi
  function poiRenk(kat) {
    const s = (kat || "").toLowerCase();
    if (/bank|atm|finan/.test(s)) return "#f7b500";
    if (/pharma|eczane|drug/.test(s)) return "#8e44ad";
    if (/hospital|clinic|health|hastane|medical|doctor|sağlık/.test(s)) return "#e91e63";
    if (/hotel|motel|hostel|lodg|konaklama/.test(s)) return "#00b8d4";
    if (/coffee|cafe|kahve|çay|tea/.test(s)) return "#e67e22";
    if (/fast/.test(s)) return "#e74c3c";
    if (/restaur|food|eat|lokanta|yemek|dining|kebab|pizza/.test(s)) return "#ff6b3d";
    if (/baker|fırın|firin|pastane/.test(s)) return "#e8a33d";
    if (/fuel|gas|petrol|benzin|akaryak/.test(s)) return "#d35400";
    if (/school|univers|educat|okul|üniversite|kolej|eğitim/.test(s)) return "#3498db";
    if (/mosque|church|worship|cami|kilise|ibadet|religio/.test(s)) return "#2ecc71";
    if (/police|polis/.test(s)) return "#34495e";
    if (/hair|beauty|barber|kuaför|berber|güzellik|salon/.test(s)) return "#ff2d9b";
    if (/market|grocery|supermarket|shop|store|mall|mağaza|alışveriş|retail/.test(s)) return "#27ae60";
    return "#7f8c8d";
  }
  // Çevredeki MEKÂNLARI (banka/kafe/restoran…) isimleriyle göster — ÖNCE HERE (zengin veri), olmazsa Overpass yedeği
  function poiYukle(lat, lon) {
    if (!ADRES_KOPRU) { poiOverpass(lat, lon); return; }
    const ayrac = ADRES_KOPRU.indexOf("?") === -1 ? "?" : "&";
    fetch(`${ADRES_KOPRU}${ayrac}browse=${lat},${lon}&lang=tr`).then((r) => r.json()).then((d) => {
      const map = haritaRef.current; if (!map) return;
      if (!d || !Array.isArray(d.items) || !d.items.length) { poiOverpass(lat, lon); return; }
      poiMarksRef.current.forEach((m) => { try { m.remove(); } catch (e) {} }); poiMarksRef.current = [];
      d.items.forEach((it) => {
        const pos = it.position; if (!pos || typeof pos.lat !== "number") return;
        const kat = (it.categories && it.categories[0] && it.categories[0].name) || "";
        const renk = poiRenk(kat); const ad = it.title || "";
        const dot = document.createElement("div"); dot.style.cssText = `background:${renk};width:17px;height:17px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.6);cursor:pointer`;
        const mk = new maplibregl.Marker({ element: dot }).setLngLat([pos.lng, pos.lat]).addTo(map);
        mk.getElement().addEventListener("click", (ev) => { ev.stopPropagation(); if (!acikRef.current) return; pinKoy(pos.lat, pos.lng); adresCoz(pos.lat, pos.lng, ad); try { map.flyTo({ center: [pos.lng, pos.lat], zoom: Math.max(map.getZoom(), 17) }); } catch (e) {} });
        poiMarksRef.current.push(mk);
      });
    }).catch(() => poiOverpass(lat, lon));
  }
  // YEDEK: Overpass (HERE erişilemezse)
  function poiOverpass(lat, lon) {
    const q = `[out:json][timeout:16];(node["amenity"~"^(restaurant|cafe|fast_food|pharmacy|hospital|clinic|bank|atm|post_office|fuel|school|university|bakery|marketplace|mosque|church|supermarket|townhall|courthouse|police|fire_station|library)$"](around:1200,${lat},${lon});node["tourism"~"^(hotel|motel|guest_house|hostel)$"](around:1200,${lat},${lon});node["shop"~"^(supermarket|convenience|hairdresser|beauty|barber|clothes|bakery|jewelry)$"](around:1200,${lat},${lon}););out body 110;`;
    const sunucu = ["https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://overpass.osm.ch/api/interpreter"];
    const dene = (i) => { if (i >= sunucu.length) return Promise.resolve(null); return fetch(sunucu[i] + "?data=" + encodeURIComponent(q)).then((r) => { if (!r.ok) throw new Error("op"); return r.json(); }).then((d) => ((!d || !d.elements || !d.elements.length) && i + 1 < sunucu.length) ? dene(i + 1) : d).catch(() => dene(i + 1)); };
    dene(0).then((d) => {
      const map = haritaRef.current; if (!map || !d) return;
      poiMarksRef.current.forEach((m) => { try { m.remove(); } catch (e) {} }); poiMarksRef.current = [];
      (d.elements || []).forEach((el) => {
        const tur = el.tags && (el.tags.amenity || el.tags.tourism || el.tags.shop || ""); if (!tur) return;
        const renk = POI_RENK[tur] || "#7f8c8d";
        const dot = document.createElement("div"); dot.style.cssText = `background:${renk};width:17px;height:17px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.6);cursor:pointer`;
        const ad = (el.tags && el.tags.name) || "";
        const mk = new maplibregl.Marker({ element: dot }).setLngLat([el.lon, el.lat]).addTo(map);
        mk.getElement().addEventListener("click", (ev) => { ev.stopPropagation(); if (!acikRef.current) return; pinKoy(el.lat, el.lon); adresCoz(el.lat, el.lon, ad); try { map.flyTo({ center: [el.lon, el.lat], zoom: Math.max(map.getZoom(), 17) }); } catch (e) {} });
        poiMarksRef.current.push(mk);
      });
    }).catch(() => {});
  }

  // NOMİNATİM yedek (köprü yoksa)
  async function nominatimCoz(lat, lon) {
    const base = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const rEn = await fetch(base + "&accept-language=en", { headers: { Accept: "application/json" } }); const dEn = await rEn.json();
    setEnAdres((dEn && dEn.display_name) || "");
    const cc = (dEn && dEn.address && dEn.address.country_code) || "";
    const lang = ({ tr: "tr", ua: "uk", ru: "ru", de: "de", fr: "fr", es: "es", it: "it" })[cc] || "";
    if (lang && lang !== "en") { try { const rY = await fetch(base + "&accept-language=" + lang, { headers: { Accept: "application/json" } }); const dY = await rY.json(); setYerel((dY && dY.display_name) || (dEn && dEn.display_name) || ""); } catch (e) { setYerel((dEn && dEn.display_name) || ""); } }
    else setYerel((dEn && dEn.display_name) || "");
  }

  // HERE ters coğrafi kodlama — GÜVENLİ KÖPRÜ üzerinden (anahtar sitede değil)
  async function adresCoz(lat, lon, poiAdi) {
    setYukleniyor(true); setYerel(""); setEnAdres(""); setKopyalandi(""); setSonuclar(null); setYerAdi(poiAdi || "");
    try {
      if (!ADRES_KOPRU) { await nominatimCoz(lat, lon); setYukleniyor(false); return; }
      const ayrac = ADRES_KOPRU.indexOf("?") === -1 ? "?" : "&";
      const url = (lang) => `${ADRES_KOPRU}${ayrac}at=${lat},${lon}&lang=${lang}`;
      const rEn = await fetch(url("en-US")); const dEn = await rEn.json();
      const enItem = dEn && dEn.items && dEn.items[0];
      const enLabel = (enItem && enItem.address && enItem.address.label) || "";
      setEnAdres(enLabel);
      if (!poiAdi && enItem && enItem.title && enItem.resultType && enItem.resultType !== "street" && enItem.resultType !== "houseNumber" && enItem.resultType !== "administrativeArea") setYerAdi(enItem.title);
      const cc = (enItem && enItem.address && enItem.address.countryCode) || "";
      const lang = CC3_LANG[cc] || "";
      if (lang && lang !== "en") {
        try { const rY = await fetch(url(lang)); const dY = await rY.json(); const yItem = dY && dY.items && dY.items[0]; setYerel((yItem && yItem.address && yItem.address.label) || enLabel); }
        catch (e) { setYerel(enLabel); }
      } else setYerel(enLabel);
    } catch (e) { try { await nominatimCoz(lat, lon); } catch (e2) {} }
    setYukleniyor(false);
  }

  // YAZIYLA ARAMA — köprü ?q= (HERE geocode). Köprü yoksa Nominatim.
  async function yerAra(sorgu) {
    const q = ((typeof sorgu === "string" ? sorgu : ara) || "").trim(); if (q.length < 2) return;
    setAraniyor(true); setSonuclar(null); const ben = benRef.current;
    try {
      if (ADRES_KOPRU) {
        const ayrac = ADRES_KOPRU.indexOf("?") === -1 ? "?" : "&";
        const r = await fetch(`${ADRES_KOPRU}${ayrac}q=${encodeURIComponent(q)}&lang=tr`);
        const d = await r.json();
        const arr = ((d && d.items) || []).map((it) => ({ ad: it.title || (it.address && it.address.label) || q, adres: (it.address && it.address.label) || "", lat: it.position && it.position.lat, lon: it.position && it.position.lng })).filter((x) => typeof x.lat === "number" && typeof x.lon === "number");
        setSonuclar(arr);
      } else {
        const r = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=8&q=" + encodeURIComponent(q) + (ben ? "&viewbox=" : ""), { headers: { Accept: "application/json" } });
        const l = await r.json(); setSonuclar((Array.isArray(l) ? l : []).map((y) => ({ ad: y.display_name || q, adres: y.display_name || "", lat: parseFloat(y.lat), lon: parseFloat(y.lon) })));
      }
    } catch (e) { setSonuclar([]); }
    setAraniyor(false);
  }
  function araDegisti(v) { setAra(v); clearTimeout(araZmnRef.current); if (v.trim().length < 3) { setSonuclar(null); return; } araZmnRef.current = setTimeout(() => yerAra(v), 650); }
  function sonucaGit(y) { const map = haritaRef.current; setSonuclar(null); setAra(""); if (map) map.flyTo({ center: [y.lon, y.lat], zoom: 17 }); pinKoy(y.lat, y.lon); adresCoz(y.lat, y.lon, y.ad); poiYukle(y.lat, y.lon); }

  function kopyala(metin) {
    const a = (metin || "").trim(); if (!a) return;
    try { navigator.clipboard.writeText(a); } catch (e) { try { const ta = document.createElement("textarea"); ta.value = a; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); } catch (e2) {} }
    setKopyalandi(a); setTimeout(() => setKopyalandi(""), 1800);
  }

  function konumumuBul() {
    const map = haritaRef.current; if (!map || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const la = pos.coords.latitude, lo = pos.coords.longitude; benRef.current = { lat: la, lon: lo };
      map.flyTo({ center: [lo, la], zoom: 17 }); pinKoy(la, lo); adresCoz(la, lo); poiYukle(la, lo);
    }, () => {}, { enableHighAccuracy: true, timeout: 9000 });
  }

  useEffect(() => {
    if (!kapRef.current || haritaRef.current) return;
    const ben = benRef.current; const bLat = ben ? ben.lat : 39, bLon = ben ? ben.lon : 35;
    let map;
    try {
      map = new maplibregl.Map({ container: kapRef.current, style: { version: 8, sources: { osm: { type: "raster", tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 19, attribution: "© OpenStreetMap" } }, layers: [{ id: "osm", type: "raster", source: "osm", paint: { "raster-fade-duration": 0 } }] }, center: [bLon, bLat], zoom: ben ? 16 : 4, attributionControl: false, fadeDuration: 0 });
    } catch (e) { return; }
    haritaRef.current = map;
    etkilesim(map, false); // önizlemede dokunma kapalı → parmak sayfayı kaydırır
    map.on("load", () => { setHazir(true); try { map.resize(); } catch (e) {} });
    setTimeout(() => { try { map.resize(); } catch (e) {} }, 250);
    map.on("click", (e) => { if (!acikRef.current) return; const la = e.lngLat.lat, lo = e.lngLat.lng; if (ekleModuRef.current) { yeniNoktaKoy(la, lo); return; } pinKoy(la, lo); adresCoz(la, lo); });
    map.on("moveend", () => { if (!acikRef.current || map.getZoom() < 13) return; clearTimeout(poiZmnRef.current); poiZmnRef.current = setTimeout(() => { const c = map.getCenter(); poiYukle(c.lat, c.lng); }, 600); });
    if (ben) pinKoy(bLat, bLon);
    return () => { try { clearTimeout(poiZmnRef.current); map.remove(); } catch (e) {} haritaRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Harita tam ekran açılınca/kapanınca ANA UYGULAMAYA haber ver (geri tuşu = katman sistemine bağlanır)
  useEffect(() => { if (onTam) onTam(acik, () => setAcik(false)); }, [acik]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    acikRef.current = acik; const map = haritaRef.current; if (!map) return;
    etkilesim(map, acik);
    const z = setTimeout(() => {
      try { map.resize(); } catch (e) {}
      if (acik) { const ben = benRef.current; if (ben) { map.flyTo({ center: [ben.lon, ben.lat], zoom: 16 }); poiYukle(ben.lat, ben.lon); } else konumumuBul(); mekanlariYukle(); }
    }, 90);
    return () => clearTimeout(z);
  }, [acik]); // eslint-disable-line react-hooks/exhaustive-deps

  const sonucVar = yukleniyor || yerel || enAdres;

  return (
    <div className={"adh-sar" + (acik ? " adh-tam" : " adh-oniz")} onClick={!acik ? () => setAcik(true) : undefined}>
      <div className="adh-baslik"><span aria-hidden="true">📋</span> {t("adhBaslik", "Adres bul ve kopyala")}</div>
      <div className={"adh-harita" + (acik ? " adh-harita-tam" : "")} ref={kapRef}>
        {!hazir && <div className="adh-yukleniyor">🗺️ {t("knhYukleniyor", "Harita geliyor…")}</div>}
      </div>

      {!acik && (
        <div className="adh-ipuc" onClick={() => setAcik(true)}>
          <span aria-hidden="true">👆</span> {t("adhAc", "Adresini öğrenmek için dokun")}
          <span className="adh-buyut" aria-hidden="true">⛶</span>
        </div>
      )}

      {acik && (<>
        <button className="adh-kapat" onClick={(e) => { e.stopPropagation(); setAcik(false); }} aria-label={t("kapat", "Kapat")}>✕</button>

        {/* Yazıyla arama */}
        <div className="adh-ara-sar" onClick={(e) => e.stopPropagation()}>
          <svg className="adh-ara-ik" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input className="adh-ara-in" value={ara} onChange={(e) => araDegisti(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { clearTimeout(araZmnRef.current); yerAra(); } }} placeholder={t("adhAraYaz", "Adres/mekân yaz ara…")} />
          {ara && <button className="adh-ara-temizle" onClick={() => { setAra(""); setSonuclar(null); }} aria-label={t("temizle", "Temizle")}>✕</button>}
        </div>
        {sonuclar && (
          <div className="adh-arasonuc" onClick={(e) => e.stopPropagation()}>
            {sonuclar.length === 0 ? <div className="adh-arasonuc-bos">{t("knhSonucYok", "Sonuç bulunamadı.")}</div>
              : sonuclar.map((y, i) => (<button className="adh-arasonuc-oge" key={i} onClick={() => sonucaGit(y)}><span aria-hidden="true">📍</span><span>{y.ad}</span></button>))}
          </div>
        )}

        {!sonucVar && !sonuclar && !ekleModu && !secilenMekan && <div className="adh-ust-ipuc">📍 {t("adhDokun", "Bir yere/mekâna dokun ya da yukarıdan ara")}</div>}
        {!ekleModu && (
          <button className="adh-konumum" onClick={(e) => { e.stopPropagation(); konumumuBul(); }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
            {t("adhKonumum", "Konumumu bul")}
          </button>
        )}

        {/* YERİMİ EKLE düğmesi (sol alt) */}
        {!ekleModu && !sonucVar && !secilenMekan && (
          <button className="adh-ekle-btn" onClick={(e) => { e.stopPropagation(); ekleBaslat(); }}>➕ {t("adhYerEkle", "Yerimi ekle")}</button>
        )}

        {/* EKLEME MODU: önce haritaya dokun, sonra form */}
        {ekleModu && (
          <div className="adh-ekle-panel" onClick={(e) => e.stopPropagation()}>
            {!yeniNokta ? (
              <div className="adh-ekle-ipuc">
                <span>👆 {t("adhEkleDokun", "İşyerinin/yerin haritada olduğu noktaya dokun")}</span>
                <button className="adh-ekle-iptal" onClick={ekleIptal}>{t("vazgec", "Vazgeç")}</button>
              </div>
            ) : (
              <div className="adh-ekle-form">
                <div className="adh-ekle-baslik">⭐ {t("adhYeniYer", "Yeni yer ekle")}</div>
                <input className="adh-ekle-in" value={yeniAd} onChange={(e) => setYeniAd(e.target.value)} placeholder={t("adhYerAdi", "Yerin adı (örn: Ahmet Market)")} maxLength={80} />
                <select className="adh-ekle-sec" value={yeniTur} onChange={(e) => setYeniTur(e.target.value)}>
                  {MEKAN_TURLERI.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
                <input className="adh-ekle-in" value={yeniTel} onChange={(e) => setYeniTel(e.target.value)} placeholder={t("adhTelefon", "Telefon (isteğe bağlı)")} maxLength={40} />
                <div className="adh-ekle-dugmeler">
                  <button className="adh-ekle-vazgec" onClick={ekleIptal}>{t("vazgec", "Vazgeç")}</button>
                  <button className="adh-ekle-kaydet" onClick={mekanKaydet} disabled={kaydediyor || !yeniAd.trim()}>{kaydediyor ? "…" : "✓ " + t("kaydet", "Kaydet")}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* KULLANICI MEKÂNI bilgi kartı */}
        {secilenMekan && (
          <div className="adh-mekan-kart" onClick={(e) => e.stopPropagation()}>
            <button className="adh-sonuc-kapat" onClick={() => setSecilenMekan(null)} aria-label={t("kapat", "Kapat")}>✕</button>
            <div className="adh-mekan-ad">⭐ {secilenMekan.ad}</div>
            <div className="adh-mekan-tur">{secilenMekan.tur || ""}{secilenMekan.telefon ? " · ☎ " + secilenMekan.telefon : ""}</div>
            {secilenMekan.ekleyenAd && <div className="adh-mekan-ekleyen">{t("adhEkleyen", "Ekleyen")}: {secilenMekan.ekleyenAd}</div>}
            {uid && secilenMekan.uid === uid && <button className="adh-mekan-sil" onClick={() => mekanSilDene(secilenMekan)}>🗑 {t("sil", "Sil")}</button>}
          </div>
        )}

        {sonucVar && (
          <div className="adh-sonuc" onClick={(e) => e.stopPropagation()}>
            <button className="adh-sonuc-kapat" onClick={temizle} aria-label={t("temizle", "Temizle")}>✕</button>
            {yukleniyor ? <div className="adh-yukl">⏳ {t("adhAraniyor", "Adres bulunuyor…")}</div> : (<>
              {yerAdi && <div className="adh-yeradi">📌 {yerAdi}</div>}
              {yerel && (
                <div className="adh-kart">
                  <div className="adh-kart-et">🌍 {t("adhYerel", "Yerel dilde")}</div>
                  <div className="adh-kart-adres">{yerel}</div>
                  <button className="adh-kopya" onClick={() => kopyala((yerAdi ? yerAdi + " — " : "") + yerel)}>📋 {t("adhKopyala", "Kopyala")}</button>
                </div>
              )}
              {enAdres && (
                <div className="adh-kart">
                  <div className="adh-kart-et">🇬🇧 {t("adhEn", "İngilizce")}</div>
                  <div className="adh-kart-adres">{enAdres}</div>
                  <button className="adh-kopya" onClick={() => kopyala((yerAdi ? yerAdi + " — " : "") + enAdres)}>📋 {t("adhKopyala", "Kopyala")}</button>
                </div>
              )}
              {kopyalandi && <div className="adh-kopyalandi">✓ {t("adhKopyalandi", "Adres kopyalandı")}</div>}
              <button className="adh-yeni" onClick={temizle}>🔄 {t("adhYeni", "Temizle / yeniden ara")}</button>
            </>)}
          </div>
        )}
      </>)}
    </div>
  );
}
