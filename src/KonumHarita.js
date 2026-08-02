// ═══════════════════════════════════════════════════════════════════════════
// KONUM SAYFASI — ARKADAŞ HARİTASI (MapLibre GL)
// ─────────────────────────────────────────────────────────────────────────────
// AMAÇ (kullanıcının isteği): En yakın arkadaşların haritada FOTOĞRAFLARIYLA
// görünsün — kim nerede, bir bakışta. Bir arkadaşa dokununca ismi çıkar, "Mesaj"
// ile yazabilirsin ya da "Yol tarifi" ile ne kadar uzak olduğunu görürsün.
// AÇILIŞ: KÜÇÜK önizleme (arkadaşların da görünür). Üstünde parmak sağa-sola =
// SAYFA değişir. DOKUNUNCA harita TAM EKRAN açılır: arkadaşların, kendi konumun,
// yakın yerler, yer ARAMA, yakınlaştır/uzaklaştır, pusula, ortala.
// NOT: Adım-adım "git" navigasyonu KULLANICI İSTEMEDİĞİ İÇİN YOK.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { useTranslation } from "react-i18next";
import { ADRES_KOPRU } from "./hereConfig";

function kmArasi(la1, lo1, la2, lo2) {
  const R = 6371, dLa = (la2 - la1) * Math.PI / 180, dLo = (lo2 - lo1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const POI_RENK = { hairdresser: "#ff2d9b", beauty: "#ff2d9b", barber: "#ff2d9b", bank: "#f7b500", atm: "#f7b500", hotel: "#00b8d4", motel: "#00b8d4", guest_house: "#00b8d4", hostel: "#00b8d4", fast_food: "#e74c3c", restaurant: "#ff6b3d", cafe: "#e67e22", supermarket: "#27ae60", convenience: "#2ecc71", marketplace: "#27ae60", pharmacy: "#8e44ad", hospital: "#e91e63", clinic: "#e91e63", post_office: "#16a085", fuel: "#d35400", school: "#3498db", university: "#3498db", bakery: "#e8a33d", mosque: "#2ecc71", church: "#bdc3c7", clothes: "#9b59b6", jewelry: "#f1c40f", townhall: "#2980b9", courthouse: "#9b59b6", police: "#34495e", fire_station: "#c0392b", library: "#16a085", government: "#2980b9", tax: "#2980b9" };

const ETKILER = ["dragPan", "scrollZoom", "boxZoom", "dragRotate", "keyboard", "doubleClickZoom", "touchZoomRotate"];
function haritaEtkilesim(map, ac) { ETKILER.forEach((n) => { try { if (map[n]) ac ? map[n].enable() : map[n].disable(); } catch (e) {} }); }

export default function KonumHarita({ benLat, benLon, arkadaslar, arkadasaYaz, benFoto, benAd, konumPaylasAcik, konumPaylasDegis, onTam }) {
  const { t } = useTranslation();
  const benFotoRef = useRef(benFoto || "");
  const benAdRef = useRef(benAd || "");
  useEffect(() => { benFotoRef.current = benFoto || ""; benAdRef.current = benAd || ""; }, [benFoto, benAd]);
  const kapRef = useRef(null);
  const haritaRef = useRef(null);
  const benPinRef = useRef(null);
  const hedefPinRef = useRef(null);
  const poiMarksRef = useRef([]);
  const arkMarksRef = useRef([]);      // arkadaş fotoğraf işaretleri
  const arkRef = useRef([]);           // güncel arkadaş listesi (olay işleyicileri için)
  const poiZmnRef = useRef(null);
  const araZmnRef = useRef(null);
  const acikRef = useRef(false);
  const rotaCoordsRef = useRef(null);
  const pathRef = useRef(null);
  const pathKenarRef = useRef(null);
  const [acik, setAcik] = useState(false);
  const [hazir, setHazir] = useState(false);
  const [ara, setAra] = useState("");
  const [sonuclar, setSonuclar] = useState(null);
  const [araniyor, setAraniyor] = useState(false);
  const [hedef, setHedef] = useState(null);
  const [secilenArkadas, setSecilenArkadas] = useState(null); // dokunulan arkadaş kartı
  const [rotaBilgi, setRotaBilgi] = useState(null);
  const [rotaYukleniyor, setRotaYukleniyor] = useState(false);
  const [mod, setMod] = useState("araba"); // araba | yurume | bisiklet (çizgi rengi/deseni)
  const benRef = useRef((typeof benLat === "number" && typeof benLon === "number") ? { lat: benLat, lon: benLon } : null);
  const [benNokta, setBenNokta] = useState(benRef.current); // kendi konumum (uzaklık hesabı ekranda güncellensin)
  function benGuncelle(la, lo) { benRef.current = { lat: la, lon: lo }; setBenNokta({ lat: la, lon: lo }); }

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
  // Çevredeki yerler — ÖNCE HERE (zengin veri), olmazsa Overpass yedeği
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
        const renk = poiRenk(kat); const ad = it.title || kat;
        const dot = document.createElement("div"); dot.style.cssText = `background:${renk};width:16px;height:16px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.6);cursor:pointer`;
        const mk = new maplibregl.Marker({ element: dot }).setLngLat([pos.lng, pos.lat]).setPopup(new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(`<b>${ad}</b>`)).addTo(map);
        mk.getElement().addEventListener("click", () => { if (!acikRef.current) return; setSecilenArkadas(null); setHedef({ lat: pos.lat, lon: pos.lng, ad }); hedefKoy(pos.lat, pos.lng); setRotaBilgi(null); rotaTemizle(); });
        poiMarksRef.current.push(mk);
      });
    }).catch(() => poiOverpass(lat, lon));
  }
  // YEDEK: Overpass
  function poiOverpass(lat, lon) {
    const q = `[out:json][timeout:16];(node["amenity"~"^(restaurant|cafe|fast_food|pharmacy|hospital|clinic|bank|atm|post_office|fuel|school|university|bakery|marketplace|mosque|church|supermarket|townhall|courthouse|police|fire_station|library)$"](around:1400,${lat},${lon});node["tourism"~"^(hotel|motel|guest_house|hostel)$"](around:1400,${lat},${lon});node["shop"~"^(supermarket|convenience|hairdresser|beauty|barber|clothes|bakery|jewelry)$"](around:1400,${lat},${lon}););out body 120;`;
    const sunucu = ["https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://overpass.osm.ch/api/interpreter"];
    const dene = (i) => { if (i >= sunucu.length) return Promise.resolve(null); return fetch(sunucu[i] + "?data=" + encodeURIComponent(q)).then((r) => { if (!r.ok) throw new Error("op"); return r.json(); }).then((d) => ((!d || !d.elements || !d.elements.length) && i + 1 < sunucu.length) ? dene(i + 1) : d).catch(() => dene(i + 1)); };
    dene(0).then((d) => {
      const map = haritaRef.current; if (!map || !d) return;
      poiMarksRef.current.forEach((m) => { try { m.remove(); } catch (e) {} }); poiMarksRef.current = [];
      (d.elements || []).forEach((el) => {
        const tur = el.tags && (el.tags.amenity || el.tags.tourism || el.tags.shop || ""); if (!tur) return;
        const renk = POI_RENK[tur] || "#7f8c8d";
        const dot = document.createElement("div"); dot.style.cssText = `background:${renk};width:16px;height:16px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.6);cursor:pointer`;
        const ad = (el.tags && el.tags.name) || tur;
        const mk = new maplibregl.Marker({ element: dot }).setLngLat([el.lon, el.lat]).setPopup(new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(`<b>${ad}</b>`)).addTo(map);
        mk.getElement().addEventListener("click", () => { if (!acikRef.current) return; setSecilenArkadas(null); setHedef({ lat: el.lat, lon: el.lon, ad }); hedefKoy(el.lat, el.lon); setRotaBilgi(null); rotaTemizle(); });
        poiMarksRef.current.push(mk);
      });
    }).catch(() => {});
  }
  function hedefKoy(lat, lon) { const map = haritaRef.current; if (!map) return; if (hedefPinRef.current) hedefPinRef.current.setLngLat([lon, lat]); else hedefPinRef.current = new maplibregl.Marker({ color: "#e0202c" }).setLngLat([lon, lat]).addTo(map); }
  function hedefPinKaldir() { if (hedefPinRef.current) { try { hedefPinRef.current.remove(); } catch (e) {} hedefPinRef.current = null; } }

  // ── KENDİ İŞARETİM: kendi FOTOĞRAFIM (kare, MAVİ çerçeve, "Sen" etiketi) — sarı iğne yerine ──
  function benKaresi() {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:translateY(-6px)";
    const kare = document.createElement("div");
    kare.style.cssText = "width:54px;height:54px;border-radius:12px;border:3.5px solid #1f9dff;background:#0f5e31;box-shadow:0 3px 11px rgba(0,0,0,.55);overflow:hidden;display:flex;align-items:center;justify-content:center";
    if (benFotoRef.current) {
      const im = document.createElement("img"); im.src = benFotoRef.current; im.referrerPolicy = "no-referrer"; im.alt = "";
      im.style.cssText = "width:100%;height:100%;object-fit:cover;display:block"; kare.appendChild(im);
    } else { kare.textContent = "🙂"; kare.style.fontSize = "28px"; }
    const et = document.createElement("div");
    et.textContent = t("knhSen", "Sen"); et.style.cssText = "margin-top:3px;padding:1px 10px;background:#1f9dff;color:#fff;font-weight:800;font-size:11px;line-height:1.6;border-radius:7px;box-shadow:0 1px 4px rgba(0,0,0,.4)";
    wrap.appendChild(kare); wrap.appendChild(et);
    return wrap;
  }
  function benPinYerlestir(lat, lon) {
    const map = haritaRef.current; if (!map) return;
    if (benPinRef.current) { try { benPinRef.current.setLngLat([lon, lat]); } catch (e) {} return; }
    try { benPinRef.current = new maplibregl.Marker({ element: benKaresi(), anchor: "bottom" }).setLngLat([lon, lat]).addTo(map); } catch (e) {}
  }

  // ── ARKADAŞLARI HARİTAYA KOY (kare fotoğraf işaretleri; KURAL: yuvarlak DEĞİL, kare) ──
  function arkadasKaresi(a) {
    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:translateY(-6px)";
    const kare = document.createElement("div");
    kare.style.cssText = "width:48px;height:48px;border-radius:11px;border:3px solid #FFD700;background:#0f5e31;box-shadow:0 2px 9px rgba(0,0,0,.55);overflow:hidden;display:flex;align-items:center;justify-content:center";
    if (a.foto) {
      const im = document.createElement("img");
      im.src = a.foto; im.referrerPolicy = "no-referrer"; im.alt = "";
      im.style.cssText = "width:100%;height:100%;object-fit:cover;display:block";
      kare.appendChild(im);
    } else {
      kare.textContent = ((a.ad || "?").trim()[0] || "?").toUpperCase();
      kare.style.color = "#FFD700"; kare.style.fontWeight = "900"; kare.style.fontSize = "22px";
    }
    // İsim etiketi — KESİLMEZ: sadece İLK AD gösterilir (kısa), tam görünür (… ile kesme yok).
    const ilkAd = ((a.ad || "").trim().split(/\s+/)[0]) || "";
    if (ilkAd) {
      const et = document.createElement("div");
      et.textContent = ilkAd;
      et.style.cssText = "margin-top:3px;padding:1px 7px;background:rgba(15,94,49,.94);color:#FFD700;font-weight:800;font-size:11px;line-height:1.5;border-radius:7px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.4)";
      wrap.appendChild(kare); wrap.appendChild(et);
    } else { wrap.appendChild(kare); }
    return wrap;
  }
  function arkadaslariKoy() {
    const map = haritaRef.current; if (!map) return;
    arkMarksRef.current.forEach((m) => { try { m.remove(); } catch (e) {} }); arkMarksRef.current = [];
    (arkRef.current || []).forEach((a) => {
      if (typeof a.lat !== "number" || typeof a.lon !== "number") return;
      const el = arkadasKaresi(a);
      const mk = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([a.lon, a.lat]).addTo(map);
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (!acikRef.current) { setAcik(true); return; }
        hedefPinKaldir(); setRotaBilgi(null); rotaTemizle();
        setSecilenArkadas(a); setHedef({ lat: a.lat, lon: a.lon, ad: a.ad, arkadas: true });
        try { map.flyTo({ center: [a.lon, a.lat], zoom: Math.max(map.getZoom(), 14) }); } catch (e) {}
      });
      arkMarksRef.current.push(mk);
    });
  }
  // Herkesi (ben + arkadaşlar) ekrana sığdır
  function hepsiniGoster() {
    const map = haritaRef.current; if (!map) return;
    const pts = []; const ben = benRef.current; if (ben) pts.push([ben.lon, ben.lat]);
    (arkRef.current || []).forEach((a) => { if (typeof a.lat === "number" && typeof a.lon === "number") pts.push([a.lon, a.lat]); });
    if (!pts.length) return;
    if (pts.length === 1) { try { map.flyTo({ center: pts[0], zoom: 14 }); } catch (e) {} return; }
    try { const b = pts.reduce((bb, p) => bb.extend(p), new maplibregl.LngLatBounds(pts[0], pts[0])); map.fitBounds(b, { padding: 90, maxZoom: 15, duration: 600 }); } catch (e) {}
  }

  // Rota çizgisini SVG ile çiz (haritanın üstünde — kesin görünür). Her harita hareketinde ("render") yeniden hizalanır.
  function rotaCizSVG() {
    const map = haritaRef.current, cizgi = pathRef.current, kenar = pathKenarRef.current;
    if (!cizgi || !kenar) return;
    const coords = rotaCoordsRef.current;
    if (!map || !coords || coords.length < 2) { cizgi.setAttribute("d", ""); kenar.setAttribute("d", ""); return; }
    let d = "";
    try { for (let i = 0; i < coords.length; i++) { const p = map.project(coords[i]); d += (i ? " L" : "M") + p.x.toFixed(1) + " " + p.y.toFixed(1); } } catch (e) { return; }
    kenar.setAttribute("d", d); cizgi.setAttribute("d", d);
  }
  function rotaTemizle() { rotaCoordsRef.current = null; rotaCizSVG(); }
  function cizgiKoy(coords) {
    const map = haritaRef.current; if (!Array.isArray(coords)) return;
    coords = coords.map((c) => [Number(c[0]), Number(c[1])]).filter((c) => isFinite(c[0]) && isFinite(c[1]));
    if (coords.length < 2) return;
    rotaCoordsRef.current = coords;
    if (map) { try { const b = coords.reduce((bb, c) => bb.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0])); map.fitBounds(b, { padding: 80, maxZoom: 16 }); } catch (e) {} }
    rotaCizSVG(); setTimeout(rotaCizSVG, 400);
  }

  useEffect(() => {
    if (!kapRef.current || haritaRef.current) return;
    const ben = benRef.current; const bLat = ben ? ben.lat : 39, bLon = ben ? ben.lon : 35;
    let map;
    try {
      map = new maplibregl.Map({ container: kapRef.current, style: { version: 8, sources: { osm: { type: "raster", tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 19, attribution: "© OpenStreetMap" } }, layers: [{ id: "osm", type: "raster", source: "osm", paint: { "raster-fade-duration": 0 } }] }, center: [bLon, bLat], zoom: ben ? 13 : 4, attributionControl: false, fadeDuration: 0 });
    } catch (e) { return; }
    haritaRef.current = map;
    haritaEtkilesim(map, false); // önizlemede dokunma kapalı → parmak sayfayı kaydırır
    map.on("load", () => { setHazir(true); try { map.resize(); } catch (e) {} arkadaslariKoy(); setTimeout(hepsiniGoster, 120); });
    map.on("render", rotaCizSVG);
    setTimeout(() => { try { map.resize(); } catch (e) {} }, 250);
    map.on("click", (e) => { if (!acikRef.current) return; setSecilenArkadas(null); const la = e.lngLat.lat, lo = e.lngLat.lng; setHedef({ lat: la, lon: lo, ad: "" }); hedefKoy(la, lo); setRotaBilgi(null); rotaTemizle(); });
    map.on("moveend", () => { if (!acikRef.current || map.getZoom() < 13) return; clearTimeout(poiZmnRef.current); poiZmnRef.current = setTimeout(() => { const c = map.getCenter(); poiYukle(c.lat, c.lng); }, 600); });
    if (ben) benPinYerlestir(bLat, bLon);
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition((pos) => {
      const la = pos.coords.latitude, lo = pos.coords.longitude; if (!haritaRef.current) return;
      benGuncelle(la, lo); if (!ben) map.flyTo({ center: [lo, la], zoom: 13 });
      benPinYerlestir(la, lo);
      setTimeout(hepsiniGoster, 150);
    }, () => {}, { enableHighAccuracy: true, timeout: 8000 });
    return () => { try { clearTimeout(poiZmnRef.current); map.remove(); } catch (e) {} haritaRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Arkadaş listesi değişince (yüklenince) haritadaki fotoğrafları yenile
  useEffect(() => {
    arkRef.current = Array.isArray(arkadaslar) ? arkadaslar : [];
    if (haritaRef.current && hazir) { arkadaslariKoy(); if (!acikRef.current) setTimeout(hepsiniGoster, 100); }
  }, [arkadaslar, hazir]); // eslint-disable-line react-hooks/exhaustive-deps

  // Harita tam ekran açılınca/kapanınca ANA UYGULAMAYA haber ver (geri tuşu = katman sistemine bağlanır)
  useEffect(() => { if (onTam) onTam(acik, () => setAcik(false)); }, [acik]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    acikRef.current = acik; const map = haritaRef.current; if (!map) return;
    haritaEtkilesim(map, acik);
    const z = setTimeout(() => {
      try { map.resize(); } catch (e) {}
      if (acik) {
        if ((arkRef.current || []).length) hepsiniGoster(); else { const ben = benRef.current; if (ben) { map.flyTo({ center: [ben.lon, ben.lat], zoom: 14 }); poiYukle(ben.lat, ben.lon); } else konumumaGit(); }
        // KENDİ KONUMUMU TAZELE → uzaklıklar (km) gerçek anlık yerinden hesaplansın
        if (navigator.geolocation) navigator.geolocation.getCurrentPosition((pos) => { benGuncelle(pos.coords.latitude, pos.coords.longitude); benPinYerlestir(pos.coords.latitude, pos.coords.longitude); }, () => {}, { enableHighAccuracy: true, timeout: 8000 });
      }
    }, 90);
    return () => clearTimeout(z);
  }, [acik]); // eslint-disable-line react-hooks/exhaustive-deps

  function konumumaGit() {
    const map = haritaRef.current; if (!map) return;
    if (!navigator.geolocation) { if (benRef.current) map.flyTo({ center: [benRef.current.lon, benRef.current.lat], zoom: 15 }); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      const la = pos.coords.latitude, lo = pos.coords.longitude; benGuncelle(la, lo); map.flyTo({ center: [lo, la], zoom: 15 });
      benPinYerlestir(la, lo);
      poiYukle(la, lo);
    }, () => { if (benRef.current) map.flyTo({ center: [benRef.current.lon, benRef.current.lat], zoom: 15 }); }, { enableHighAccuracy: true, timeout: 8000 });
  }

  function sureYaz(dk) { dk = Math.max(1, Math.round(dk)); if (dk < 60) return dk + " " + t("knhDk", "dk"); const sa = Math.floor(dk / 60), k = dk % 60; return sa + " " + t("knhSaat", "sa") + (k ? " " + k + " " + t("knhDk", "dk") : ""); }
  function modSure(m, km, arabaDk) { km = Number(km) || 0; if (m === "yurume") return Math.max(1, Math.round(km / 5 * 60)); if (m === "bisiklet") return Math.max(1, Math.round(km / 15 * 60)); return arabaDk || Math.max(1, Math.round(km / 0.5)); }

  async function yerAra(sorgu) {
    const q = ((typeof sorgu === "string" ? sorgu : ara) || "").trim(); if (q.length < 2) return;
    setAraniyor(true); setSonuclar(null); const ben = benRef.current;
    const photonMap = (d) => ((d && d.features) || []).map((f) => { const c = (f.geometry && f.geometry.coordinates) || []; const p = f.properties || {}; const yer = p.name || [p.street, p.housenumber].filter(Boolean).join(" "); const yerel = [p.city || p.town || p.village || p.county, p.state, p.country].filter(Boolean).join(", "); return { lat: c[1], lon: c[0], ad: [yer, yerel].filter(Boolean).join(" · ") || q }; }).filter((x) => typeof x.lat === "number" && typeof x.lon === "number");
    const nominAra = async () => { const r2 = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=8&q=" + encodeURIComponent(q), { headers: { Accept: "application/json" } }); const l = await r2.json(); return (Array.isArray(l) ? l : []).map((y) => ({ lat: parseFloat(y.lat), lon: parseFloat(y.lon), ad: y.display_name || q })); };
    try {
      const r = await fetch("https://photon.komoot.io/api/?limit=8&q=" + encodeURIComponent(q) + (ben ? "&lat=" + ben.lat + "&lon=" + ben.lon : ""));
      const d = await r.json(); let arr = photonMap(d);
      if (!arr.length) { try { arr = await nominAra(); } catch (e) {} }
      setSonuclar(arr);
    } catch (e) { try { setSonuclar(await nominAra()); } catch (e2) { setSonuclar([]); } }
    setAraniyor(false);
  }
  function araDegisti(v) { setAra(v); clearTimeout(araZmnRef.current); if (v.trim().length < 3) { setSonuclar(null); return; } araZmnRef.current = setTimeout(() => yerAra(v), 650); }
  function sonucaGit(y) { const map = haritaRef.current; setSonuclar(null); setSecilenArkadas(null); setHedef(y); setRotaBilgi(null); rotaTemizle(); if (map) map.flyTo({ center: [y.lon, y.lat], zoom: 16 }); hedefKoy(y.lat, y.lon); }

  function duzRotaCiz() {
    const ben = benRef.current; if (!ben || !hedef) return;
    cizgiKoy([[ben.lon, ben.lat], [hedef.lon, hedef.lat]]);
    const km = kmArasi(ben.lat, ben.lon, hedef.lat, hedef.lon);
    setRotaBilgi({ km: km.toFixed(1), arabaDk: Math.max(1, Math.round(km / 0.5)), yaklasik: true });
  }
  async function rotaCiz() {
    const map = haritaRef.current, ben = benRef.current; if (!map || !hedef) return; if (!ben) { konumumaGit(); return; }
    setRotaYukleniyor(true);
    try {
      const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${ben.lon},${ben.lat};${hedef.lon},${hedef.lat}?overview=full&geometries=geojson`);
      const d = await r.json(); const rota = d && d.routes && d.routes[0];
      const coords = rota && rota.geometry && rota.geometry.coordinates;
      if (Array.isArray(coords) && coords.length > 1 && Array.isArray(coords[0])) {
        cizgiKoy(coords);
        setRotaBilgi({ km: (rota.distance / 1000).toFixed(1), arabaDk: Math.max(1, Math.round(rota.duration / 60)) });
      } else duzRotaCiz();
    } catch (e) { duzRotaCiz(); }
    setRotaYukleniyor(false);
  }

  const arkSayi = (Array.isArray(arkadaslar) ? arkadaslar : []).length;
  // Arkadaşları UZAKLIĞA göre sırala (en yakın önce) — "yanıma yaklaşan arkadaş" için.
  const yakinlar = (Array.isArray(arkadaslar) ? arkadaslar : []).map((a) => {
    const km = benNokta ? kmArasi(benNokta.lat, benNokta.lon, a.lat, a.lon) : null;
    return { ...a, km };
  }).sort((x, y) => (x.km == null ? 1e9 : x.km) - (y.km == null ? 1e9 : y.km));
  const enYakin = yakinlar[0] || null;
  function kmYaz(km) { if (km == null) return ""; return km < 1 ? Math.round(km * 1000) + " m" : (km < 10 ? km.toFixed(1) : Math.round(km)) + " km"; }
  function arkadasaGit(a) {
    const map = haritaRef.current; hedefPinKaldir(); setRotaBilgi(null); rotaTemizle();
    setSecilenArkadas(a); setHedef({ lat: a.lat, lon: a.lon, ad: a.ad, arkadas: true });
    if (map) try { map.flyTo({ center: [a.lon, a.lat], zoom: Math.max(map.getZoom(), 14) }); } catch (e) {}
  }

  return (
    <div className={"knh-sar" + (acik ? " knh-tam" : " knh-oniz-sar")} onClick={!acik ? () => setAcik(true) : undefined}>
      <div className={"knh-harita" + (acik ? " knh-harita-tam" : "")} ref={kapRef}>
        {!hazir && <div className="knh-yukleniyor">🗺️ {t("knhYukleniyor", "Harita geliyor…")}</div>}
        <svg className={"knh-rota-svg mod-" + mod} aria-hidden="true"><path ref={pathKenarRef} className="knh-rota-kenar" d="" /><path ref={pathRef} className="knh-rota-cizgi" d="" /></svg>
      </div>
      {!acik && (
        <div className="knh-oniz-ipuc" onClick={() => setAcik(true)}>
          <span className="knh-oniz-ik" aria-hidden="true">🗺️</span>
          <span>{arkSayi ? (arkSayi + " " + t("knhArkadasHaritada", "arkadaşın haritada — dokun")) : t("knhAcHaritaSen", "Kendini ve yakındaki arkadaşları gör — dokun")}</span>
          <span className="knh-oniz-buyut" aria-hidden="true">⛶</span>
        </div>
      )}

      {acik && (<>
        <div className="knh-ara-sar">
          <svg className="knh-ara-ik" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input className="knh-ara-in" value={ara} onChange={(e) => araDegisti(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { clearTimeout(araZmnRef.current); yerAra(); } }} placeholder={t("knhAra", "Yer, adres, mekân ara…")} />
          {ara && <button className="knh-ara-temizle" onClick={() => { setAra(""); setSonuclar(null); }} aria-label={t("temizle", "Temizle")}>✕</button>}
          <button className="knh-ara-btn" onClick={() => yerAra()} disabled={araniyor}>{araniyor ? "…" : t("knhBul", "Bul")}</button>
        </div>

        {/* Arkadaş bilgi şeridi — en yakın arkadaş + "Hepsini göster" */}
        <div className="knh-ark-serit">
          <span className="knh-ark-kalp" aria-hidden="true">💛</span>
          <span className="knh-ark-yazi">
            {arkSayi === 0 ? t("knhArkadasYok", "Yakınında arkadaş yok")
              : enYakin && enYakin.km != null ? (t("knhEnYakin", "En yakın") + ": " + ((enYakin.ad || "").split(/\s+/)[0] || t("knhArkadas", "Arkadaş")) + " · " + kmYaz(enYakin.km))
              : (arkSayi + " " + t("knhArkadasVar", "arkadaşın haritada"))}
          </span>
          {arkSayi > 0 && <button className="knh-ark-hepsi" onClick={() => { setSecilenArkadas(null); hedefPinKaldir(); setHedef(null); setRotaBilgi(null); rotaTemizle(); hepsiniGoster(); }}>{t("knhHepsiniGoster", "Hepsini göster")}</button>}
        </div>

        {/* YAKINDAKİLER şeridi — arkadaşlar UZAKLIK sırasına göre, fotoğraflarıyla; dokun → git */}
        {arkSayi > 0 && !secilenArkadas && !rotaBilgi && (
          <div className="knh-yakin-serit">
            {yakinlar.map((a) => (
              <button className="knh-yakin-oge" key={a.uid} onClick={() => arkadasaGit(a)}>
                <span className="knh-yakin-foto">{a.foto ? <img src={a.foto} alt="" referrerPolicy="no-referrer" /> : <span>{((a.ad || "?").trim()[0] || "?").toUpperCase()}</span>}</span>
                <span className="knh-yakin-ad">{(a.ad || "").split(/\s+/)[0]}</span>
                {a.km != null && <span className="knh-yakin-km">{kmYaz(a.km)}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Yakında arkadaş yoksa: sen buradasın + arkadaşlar uygulamayı açınca burada görünecek */}
        {arkSayi === 0 && !sonuclar && (
          <div className="knh-bos-bilgi">
            <span className="knh-bos-ik" aria-hidden="true">📍</span>
            <div>
              <b>{t("knhSenBurada", "Sen buradasın 🙂")}</b>
              <p>{t("knhBosArkadas", "Uygulamayı açıp konumunu paylaşan kişiler — uzakta ya da yakında — sana kaç km olduklarıyla burada fotoğraflarıyla görünecek.")}</p>
            </div>
          </div>
        )}

        {sonuclar && (
          <div className="knh-sonuc">
            {sonuclar.length === 0 ? <div className="knh-sonuc-bos">{t("knhSonucYok", "Sonuç bulunamadı.")}</div>
              : sonuclar.map((y, i) => (<button className="knh-sonuc-oge" key={i} onClick={() => sonucaGit(y)}><span className="knh-sonuc-ik" aria-hidden="true">📍</span><span className="knh-sonuc-ad">{y.ad}</span></button>))}
          </div>
        )}

        <button className="knh-kapat" onClick={() => setAcik(false)} aria-label={t("kapat", "Kapat")}>✕</button>

        {/* KONUM PAYLAŞIMI aç/kapa — müşteri konumunu paylaşmak istemeyebilir */}
        {konumPaylasDegis && (
          <button className={"knh-paylas" + (konumPaylasAcik ? " acik" : " kapali")} onClick={() => konumPaylasDegis(!konumPaylasAcik)}>
            <span aria-hidden="true">{konumPaylasAcik ? "📍" : "🚫"}</span>
            {konumPaylasAcik ? t("knhPaylasimAcik", "Konumum açık") : t("knhPaylasimKapali", "Konumum kapalı")}
          </button>
        )}
        <div className="knh-kontrol">
          <button className="knh-kbtn" onClick={() => { const m = haritaRef.current; if (m) try { m.easeTo({ bearing: 0, pitch: 0, duration: 400 }); } catch (e) {} }} aria-label={t("knhPusula", "Kuzey")}>🧭</button>
          <button className="knh-kbtn" onClick={() => { const m = haritaRef.current; if (m) try { m.zoomIn(); } catch (e) {} }} aria-label={t("knhYakin", "Yakınlaştır")}>＋</button>
          <button className="knh-kbtn" onClick={() => { const m = haritaRef.current; if (m) try { m.zoomOut(); } catch (e) {} }} aria-label={t("knhUzak", "Uzaklaştır")}>－</button>
        </div>
        <button className="knh-konumum" onClick={konumumaGit} aria-label={t("knhKonumum", "Ortala")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
          <span>{t("knhKonumum", "Ortala")}</span>
        </button>

        {/* Dokunulan ARKADAŞ kartı — foto + isim + Mesaj + ne kadar uzak (rota şeridi açıkken gizlenir) */}
        {secilenArkadas && !rotaBilgi && (
          <div className="knh-ark-kart">
            <div className="knh-ark-kart-foto">
              {secilenArkadas.foto ? <img src={secilenArkadas.foto} alt="" referrerPolicy="no-referrer" /> : <span>{((secilenArkadas.ad || "?").trim()[0] || "?").toUpperCase()}</span>}
            </div>
            <div className="knh-ark-kart-bilgi">
              <div className="knh-ark-kart-ad">{secilenArkadas.ad || t("knhArkadas", "Arkadaş")}</div>
              {(() => { const ben = benRef.current; if (ben) { const km = kmArasi(ben.lat, ben.lon, secilenArkadas.lat, secilenArkadas.lon); return <div className="knh-ark-kart-uzak">📍 {km < 1 ? Math.round(km * 1000) + " m" : km.toFixed(1) + " km"} {t("knhUzakta", "uzakta")}{secilenArkadas.sehir ? " · " + secilenArkadas.sehir : ""}</div>; } return secilenArkadas.sehir ? <div className="knh-ark-kart-uzak">📍 {secilenArkadas.sehir}</div> : null; })()}
            </div>
            <div className="knh-ark-kart-dugmeler">
              {arkadasaYaz && <button className="knh-ark-yaz" onClick={() => arkadasaYaz(secilenArkadas)}>💬 {t("knhMesaj", "Mesaj")}</button>}
              <button className="knh-ark-yol" onClick={rotaCiz} disabled={rotaYukleniyor}>🧭 {rotaYukleniyor ? "…" : t("knhNeKadarUzak", "Ne kadar uzak")}</button>
              <button className="knh-ark-kart-kapat" onClick={() => { setSecilenArkadas(null); setHedef(null); setRotaBilgi(null); rotaTemizle(); }} aria-label={t("kapat", "Kapat")}>✕</button>
            </div>
          </div>
        )}

        {hedef && !secilenArkadas && !rotaBilgi && (
          <button className="knh-yol" onClick={rotaCiz} disabled={rotaYukleniyor}><span aria-hidden="true">🧭</span> {rotaYukleniyor ? t("knhRotaHesap", "Rota çiziliyor…") : t("knhYolTarifi", "Yol tarifi")}</button>
        )}
        {rotaBilgi && (
          <div className="knh-rota-serit">
            <div className="knh-mod-satir">
              <div className="knh-mod-sec">
                {[["araba", "🚗", t("knhAraba", "Araba")], ["yurume", "🚶", t("knhYurume", "Yürü")], ["bisiklet", "🚴", t("knhBisiklet", "Bisiklet")]].map(([m, ik, et]) => (
                  <button key={m} className={"knh-mod" + (mod === m ? " sec" : "")} onClick={() => setMod(m)}><span aria-hidden="true">{ik}</span> {et}</button>
                ))}
              </div>
              <button className="knh-rota-kapat" onClick={() => { setRotaBilgi(null); rotaTemizle(); }} aria-label={t("temizle", "Temizle")}>✕</button>
            </div>
            <div className="knh-rota-bilgi">
              <span className="knh-rota-ik" aria-hidden="true">{mod === "yurume" ? "🚶" : mod === "bisiklet" ? "🚴" : "🚗"}</span>
              {rotaBilgi.km} km · {mod === "araba" && rotaBilgi.yaklasik ? "~" : ""}{sureYaz(modSure(mod, rotaBilgi.km, rotaBilgi.arabaDk))}
            </div>
          </div>
        )}
      </>)}
    </div>
  );
}
