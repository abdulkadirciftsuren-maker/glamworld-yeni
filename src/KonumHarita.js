// ═══════════════════════════════════════════════════════════════════════════
// KONUM SAYFASI — Navigasyon haritası (MapLibre GL)
// ─────────────────────────────────────────────────────────────────────────────
// AÇILIŞ: KÜÇÜK önizleme haritası (konumunun üzerinde). Üzerinde parmakla sağa-sola
// kaydırınca SAYFA değişir, aşağı-yukarı sayfa kayar (önizlemede işlem YOK).
// DOKUNUNCA: harita TAM EKRAN açılır → arama, konum bul, yol tarifi hep orada.
// Yol tarifi UYGULAMA İÇİNDE çizilir (mavi rota + km + saat/dk); Google'a ATMAZ.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { useTranslation } from "react-i18next";

// OSRM dönüş adımını Türkçe (t ile) talimata çevir — "Sağa dön", "Düz devam" vb.
function adimTalimat(step, t) {
  const m = (step && step.maneuver) || {}; const tip = m.type || "", yon = m.modifier || "";
  const ad = step && step.name ? " → " + step.name : "";
  if (tip === "depart") return t("navCik", "Yola çık") + ad;
  if (tip === "arrive") return t("navVar", "Hedefe vardın 🎉");
  if (tip === "roundabout" || tip === "rotary") return t("navDonel", "Dönel kavşaktan çık") + ad;
  const yonAd = { left: t("navSol", "sola dön"), right: t("navSag", "sağa dön"), "slight left": t("navHafifSol", "hafif sola"), "slight right": t("navHafifSag", "hafif sağa"), "sharp left": t("navKeskinSol", "keskin sola"), "sharp right": t("navKeskinSag", "keskin sağa"), straight: t("navDuz", "düz devam et"), uturn: t("navUdonus", "U dönüşü yap") }[yon];
  if (yonAd) return (yonAd.charAt(0).toUpperCase() + yonAd.slice(1)) + ad;
  return t("navDuz", "Düz devam et") + ad;
}

function kmArasi(la1, lo1, la2, lo2) {
  const R = 6371, dLa = (la2 - la1) * Math.PI / 180, dLo = (lo2 - lo1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const POI_RENK = { hairdresser: "#ff2d9b", beauty: "#ff2d9b", barber: "#ff2d9b", bank: "#f7b500", atm: "#f7b500", hotel: "#00b8d4", motel: "#00b8d4", guest_house: "#00b8d4", hostel: "#00b8d4", fast_food: "#e74c3c", restaurant: "#ff6b3d", cafe: "#e67e22", supermarket: "#27ae60", convenience: "#2ecc71", marketplace: "#27ae60", pharmacy: "#8e44ad", hospital: "#e91e63", clinic: "#e91e63", post_office: "#16a085", fuel: "#d35400", school: "#3498db", university: "#3498db", bakery: "#e8a33d", mosque: "#2ecc71", church: "#bdc3c7", clothes: "#9b59b6", jewelry: "#f1c40f", townhall: "#2980b9", courthouse: "#9b59b6", police: "#34495e", fire_station: "#c0392b", library: "#16a085", government: "#2980b9", tax: "#2980b9" };

const ETKILER = ["dragPan", "scrollZoom", "boxZoom", "dragRotate", "keyboard", "doubleClickZoom", "touchZoomRotate"];
function haritaEtkilesim(map, ac) { ETKILER.forEach((n) => { try { if (map[n]) ac ? map[n].enable() : map[n].disable(); } catch (e) {} }); }

export default function KonumHarita({ benLat, benLon }) {
  const { t, i18n } = useTranslation();
  const kapRef = useRef(null);
  const haritaRef = useRef(null);
  const benPinRef = useRef(null);
  const hedefPinRef = useRef(null);
  const poiMarksRef = useRef([]);
  const poiZmnRef = useRef(null);
  const araZmnRef = useRef(null);
  const acikRef = useRef(false);
  const rotaCoordsRef = useRef(null); // rota koordinatları (SVG ile çizmek için)
  const pathRef = useRef(null);       // mavi çizgi SVG path
  const pathKenarRef = useRef(null);  // beyaz kenar SVG path
  const [acik, setAcik] = useState(false); // false=küçük önizleme, true=tam ekran (işlem yapılır)
  const [hazir, setHazir] = useState(false);
  const [ara, setAra] = useState("");
  const [sonuclar, setSonuclar] = useState(null);
  const [araniyor, setAraniyor] = useState(false);
  const [hedef, setHedef] = useState(null);
  const [rotaBilgi, setRotaBilgi] = useState(null);
  const [rotaYukleniyor, setRotaYukleniyor] = useState(false);
  const [mod, setMod] = useState("araba"); // ulaşım türü: araba | yurume | bisiklet
  const [navAktif, setNavAktif] = useState(false);   // adım-adım navigasyon açık mı
  const [navAdim, setNavAdim] = useState(null);      // {yazi, mesafe(m)}
  const [navKalan, setNavKalan] = useState(null);    // {km, dk}
  const watchRef = useRef(null);
  const stepsRef = useRef([]);      // OSRM dönüş adımları
  const stepIdxRef = useRef(0);
  const soylenenRef = useRef(-1);   // hangi adım sesli söylendi
  const benRef = useRef((typeof benLat === "number" && typeof benLon === "number") ? { lat: benLat, lon: benLon } : null);

  function poiYukle(lat, lon) {
    const q = `[out:json][timeout:16];(node["amenity"~"^(restaurant|cafe|fast_food|pharmacy|hospital|clinic|bank|atm|post_office|fuel|school|university|bakery|marketplace|mosque|church|supermarket|townhall|courthouse|police|fire_station|library)$"](around:1400,${lat},${lon});node["tourism"~"^(hotel|motel|guest_house|hostel)$"](around:1400,${lat},${lon});node["shop"~"^(supermarket|convenience|hairdresser|beauty|barber|clothes|bakery|jewelry)$"](around:1400,${lat},${lon}););out body 120;`;
    const sunucu = ["https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://overpass.osm.ch/api/interpreter"];
    const dene = (i) => { if (i >= sunucu.length) return Promise.resolve(null); return fetch(sunucu[i] + "?data=" + encodeURIComponent(q)).then((r) => { if (!r.ok) throw new Error("op"); return r.json(); }).then((d) => ((!d || !d.elements || !d.elements.length) && i + 1 < sunucu.length) ? dene(i + 1) : d).catch(() => dene(i + 1)); };
    dene(0).then((d) => {
      const map = haritaRef.current; if (!map || !d) return;
      poiMarksRef.current.forEach((m) => { try { m.remove(); } catch (e) {} }); poiMarksRef.current = [];
      (d.elements || []).forEach((el) => {
        const tur = el.tags && (el.tags.amenity || el.tags.tourism || el.tags.shop || ""); if (!tur) return;
        const renk = POI_RENK[tur] || "#7f8c8d";
        const dot = document.createElement("div"); dot.style.cssText = `background:${renk};width:18px;height:18px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.6);cursor:pointer`;
        const ad = (el.tags && el.tags.name) || tur;
        const mk = new maplibregl.Marker({ element: dot }).setLngLat([el.lon, el.lat]).setPopup(new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(`<b>${ad}</b>`)).addTo(map);
        mk.getElement().addEventListener("click", () => { if (!acikRef.current) return; setHedef({ lat: el.lat, lon: el.lon, ad }); hedefKoy(el.lat, el.lon); setRotaBilgi(null); rotaTemizle(); });
        poiMarksRef.current.push(mk);
      });
    }).catch(() => {});
  }
  function hedefKoy(lat, lon) { const map = haritaRef.current; if (!map) return; if (hedefPinRef.current) hedefPinRef.current.setLngLat([lon, lat]); else hedefPinRef.current = new maplibregl.Marker({ color: "#e0202c" }).setLngLat([lon, lat]).addTo(map); }
  // ROTAYI SVG İLE ÇİZ — MapLibre vektör çizgisi bazı cihazlarda görünmüyordu; çizgiyi haritanın ÜSTÜNE
  // SVG olarak çiziyoruz (pinler gibi DOM → kesin görünür). Her harita hareketinde ("render") yeniden hizalanır.
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
    rotaCizSVG();
    setTimeout(rotaCizSVG, 400); // fitBounds bitince tekrar hizala
  }

  useEffect(() => {
    if (!kapRef.current || haritaRef.current) return;
    const ben = benRef.current; const bLat = ben ? ben.lat : 39, bLon = ben ? ben.lon : 35;
    let map;
    try {
      map = new maplibregl.Map({ container: kapRef.current, style: { version: 8, sources: { osm: { type: "raster", tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 19, attribution: "© OpenStreetMap" } }, layers: [{ id: "osm", type: "raster", source: "osm", paint: { "raster-fade-duration": 0 } }] }, center: [bLon, bLat], zoom: ben ? 15 : 4, attributionControl: false, fadeDuration: 0 });
    } catch (e) { return; }
    haritaRef.current = map;
    haritaEtkilesim(map, false); // AÇILIŞ = önizleme (dokunma kapalı → parmak sayfayı kaydırır)
    map.on("load", () => { setHazir(true); try { map.resize(); } catch (e) {} });
    map.on("render", rotaCizSVG); // harita her çizildiğinde/oynadığında rota SVG'sini yeniden hizala
    setTimeout(() => { try { map.resize(); } catch (e) {} }, 250);
    map.on("click", (e) => { if (!acikRef.current) return; const la = e.lngLat.lat, lo = e.lngLat.lng; setHedef({ lat: la, lon: lo, ad: "" }); hedefKoy(la, lo); setRotaBilgi(null); rotaTemizle(); });
    map.on("moveend", () => { if (!acikRef.current || map.getZoom() < 13) return; clearTimeout(poiZmnRef.current); poiZmnRef.current = setTimeout(() => { const c = map.getCenter(); poiYukle(c.lat, c.lng); }, 600); });
    if (ben) benPinRef.current = new maplibregl.Marker({ color: "#FFD700" }).setLngLat([bLon, bLat]).addTo(map);
    if (!ben && navigator.geolocation) navigator.geolocation.getCurrentPosition((pos) => {
      const la = pos.coords.latitude, lo = pos.coords.longitude; if (!haritaRef.current) return;
      benRef.current = { lat: la, lon: lo }; map.flyTo({ center: [lo, la], zoom: 15 });
      benPinRef.current = new maplibregl.Marker({ color: "#FFD700" }).setLngLat([lo, la]).addTo(map);
    }, () => {}, { enableHighAccuracy: true, timeout: 8000 });
    return () => { try { if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current); } catch (e) {} try { clearTimeout(poiZmnRef.current); map.remove(); } catch (e) {} haritaRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // AÇ/KAPA: tam ekranda dokunma açık + konuma odaklan + yakın yerler; önizlemede kapalı
  useEffect(() => {
    acikRef.current = acik; const map = haritaRef.current; if (!map) return;
    haritaEtkilesim(map, acik);
    const z = setTimeout(() => {
      try { map.resize(); } catch (e) {}
      if (acik) { const ben = benRef.current; if (ben) { map.flyTo({ center: [ben.lon, ben.lat], zoom: 15 }); poiYukle(ben.lat, ben.lon); } else konumumaGit(); }
    }, 90);
    return () => clearTimeout(z);
  }, [acik]); // eslint-disable-line react-hooks/exhaustive-deps

  function konumumaGit() {
    const map = haritaRef.current; if (!map) return;
    if (!navigator.geolocation) { if (benRef.current) map.flyTo({ center: [benRef.current.lon, benRef.current.lat], zoom: 16 }); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      const la = pos.coords.latitude, lo = pos.coords.longitude; benRef.current = { lat: la, lon: lo }; map.flyTo({ center: [lo, la], zoom: 16 });
      if (benPinRef.current) benPinRef.current.setLngLat([lo, la]); else benPinRef.current = new maplibregl.Marker({ color: "#FFD700" }).setLngLat([lo, la]).addTo(map);
      poiYukle(la, lo);
    }, () => { if (benRef.current) map.flyTo({ center: [benRef.current.lon, benRef.current.lat], zoom: 16 }); }, { enableHighAccuracy: true, timeout: 8000 });
  }

  function sureYaz(dk) { dk = Math.max(1, Math.round(dk)); if (dk < 60) return dk + " " + t("knhDk", "dk"); const sa = Math.floor(dk / 60), k = dk % 60; return sa + " " + t("knhSaat", "sa") + (k ? " " + k + " " + t("knhDk", "dk") : ""); }
  // Ulaşım türüne göre süre (dk): araba=gerçek OSRM süresi; yürüme ~5 km/s; bisiklet ~15 km/s
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
  function sonucaGit(y) { const map = haritaRef.current; setSonuclar(null); setHedef(y); setRotaBilgi(null); rotaTemizle(); if (map) map.flyTo({ center: [y.lon, y.lat], zoom: 16 }); hedefKoy(y.lat, y.lon); }

  function duzRotaCiz() {
    const ben = benRef.current; if (!ben || !hedef) return;
    cizgiKoy([[ben.lon, ben.lat], [hedef.lon, hedef.lat]]); // düz çizgi (rota alınamadıysa)
    const km = kmArasi(ben.lat, ben.lon, hedef.lat, hedef.lon);
    setRotaBilgi({ km: km.toFixed(1), arabaDk: Math.max(1, Math.round(km / 0.5)), yaklasik: true });
  }
  async function rotaCiz() {
    const map = haritaRef.current, ben = benRef.current; if (!map || !hedef) return; if (!ben) { konumumaGit(); return; }
    setRotaYukleniyor(true);
    try {
      const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${ben.lon},${ben.lat};${hedef.lon},${hedef.lat}?overview=full&geometries=geojson&steps=true`);
      const d = await r.json(); const rota = d && d.routes && d.routes[0];
      const coords = rota && rota.geometry && rota.geometry.coordinates;
      if (Array.isArray(coords) && coords.length > 1 && Array.isArray(coords[0])) {
        cizgiKoy(coords); // gerçek yol rotası — dolu mavi hat
        try { stepsRef.current = (rota.legs && rota.legs[0] && rota.legs[0].steps) || []; } catch (e) { stepsRef.current = []; }
        setRotaBilgi({ km: (rota.distance / 1000).toFixed(1), arabaDk: Math.max(1, Math.round(rota.duration / 60)) });
      } else duzRotaCiz(); // geometri yok/bozuk → düz çizgi yedeği
    } catch (e) { duzRotaCiz(); }
    setRotaYukleniyor(false);
  }

  // ── ADIM-ADIM NAVİGASYON ("git" — harita seni takip eder, dönüşleri sesli söyler) ──
  function navSes(yazi) {
    try { if (!("speechSynthesis" in window) || !yazi) return; const u = new SpeechSynthesisUtterance(yazi); u.lang = i18n.language || "tr"; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch (e) {}
  }
  function navGuncelle(pos) {
    const map = haritaRef.current; if (!map || !pos || !pos.coords) return;
    const la = pos.coords.latitude, lo = pos.coords.longitude;
    benRef.current = { lat: la, lon: lo };
    if (benPinRef.current) benPinRef.current.setLngLat([lo, la]); else benPinRef.current = new maplibregl.Marker({ color: "#FFD700" }).setLngLat([lo, la]).addTo(map);
    const opts = { center: [lo, la], zoom: 17, duration: 700 };
    if (typeof pos.coords.heading === "number" && !isNaN(pos.coords.heading) && pos.coords.speed > 1) opts.bearing = pos.coords.heading;
    try { map.easeTo(opts); } catch (e) {}
    const steps = stepsRef.current || []; if (!steps.length) return;
    let idx = stepIdxRef.current;
    const st0 = steps[Math.min(idx, steps.length - 1)];
    const ml0 = st0 && st0.maneuver && st0.maneuver.location;
    if (ml0) {
      const dm0 = kmArasi(la, lo, ml0[1], ml0[0]) * 1000;
      if (dm0 < 25 && idx < steps.length - 1) { stepIdxRef.current = ++idx; }
    }
    const st = steps[Math.min(idx, steps.length - 1)];
    const ml = st && st.maneuver && st.maneuver.location;
    const dm = ml ? Math.round(kmArasi(la, lo, ml[1], ml[0]) * 1000) : 0;
    setNavAdim({ yazi: adimTalimat(st, t), mesafe: dm });
    if (dm < 170 && soylenenRef.current !== idx) { soylenenRef.current = idx; navSes(adimTalimat(st, t)); }
    let kalanM = 0; for (let i = idx; i < steps.length; i++) kalanM += (steps[i].distance || 0);
    const kalanKm = kalanM / 1000;
    setNavKalan({ km: kalanKm.toFixed(1), dk: modSure(mod, kalanKm, Math.max(1, Math.round(kalanKm / 0.5))) });
    if (kalanM < 30) { navSes(t("navVar", "Hedefe vardın 🎉")); navBitir(); }
  }
  function navBaslat() {
    if (!stepsRef.current || !stepsRef.current.length) { rotaCiz(); return; } // rota yoksa önce çiz
    if (!navigator.geolocation) return;
    stepIdxRef.current = 0; soylenenRef.current = -1; setNavAktif(true);
    navSes(t("navBasla", "Navigasyon başladı, yola çık"));
    try { watchRef.current = navigator.geolocation.watchPosition(navGuncelle, () => {}, { enableHighAccuracy: true, maximumAge: 1000, timeout: 12000 }); } catch (e) {}
  }
  function navBitir() {
    try { if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current); } catch (e) {}
    watchRef.current = null; setNavAktif(false); setNavAdim(null); setNavKalan(null);
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
  }

  return (
    <div className={"knh-sar" + (acik ? " knh-tam" : " knh-oniz-sar")} onClick={!acik ? () => setAcik(true) : undefined}>
      {/* HARİTA (küçük önizleme ya da tam ekran). Önizlemede pointer-events:none → parmak sayfayı kaydırır; dokununca sarmalayıcı açar. */}
      <div className={"knh-harita" + (acik ? " knh-harita-tam" : "")} ref={kapRef}>
        {!hazir && <div className="knh-yukleniyor">🗺️ {t("knhYukleniyor", "Harita geliyor…")}</div>}
        {/* ROTA ÇİZGİSİ — haritanın üstünde SVG (kesin görünür). Renk/desen ulaşım türüne göre (mod-*) CSS'ten. */}
        <svg className={"knh-rota-svg mod-" + mod} aria-hidden="true"><path ref={pathKenarRef} className="knh-rota-kenar" d="" /><path ref={pathRef} className="knh-rota-cizgi" d="" /></svg>
      </div>
      {/* ÖNİZLEME: "dokun aç" ipucu (üstünde parmak sağa-sola = sayfa değişir) */}
      {!acik && (
        <div className="knh-oniz-ipuc" onClick={() => setAcik(true)}>
          <span className="knh-oniz-ik" aria-hidden="true">🗺️</span>
          <span>{t("knhAcHarita", "Haritayı açmak için dokun")}</span>
          <span className="knh-oniz-buyut" aria-hidden="true">⛶</span>
        </div>
      )}

      {/* ── TAM EKRAN İŞLEMLERİ (sadece açıkken) ── */}
      {acik && (<>
        {!navAktif && <div className="knh-ara-sar">
          <svg className="knh-ara-ik" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input className="knh-ara-in" value={ara} onChange={(e) => araDegisti(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { clearTimeout(araZmnRef.current); yerAra(); } }} placeholder={t("knhAra", "Yer, adres, mekân ara…")} />
          {ara && <button className="knh-ara-temizle" onClick={() => { setAra(""); setSonuclar(null); }} aria-label={t("temizle", "Temizle")}>✕</button>}
          <button className="knh-ara-btn" onClick={() => yerAra()} disabled={araniyor}>{araniyor ? "…" : t("knhBul", "Bul")}</button>
        </div>}
        {sonuclar && (
          <div className="knh-sonuc">
            {sonuclar.length === 0 ? <div className="knh-sonuc-bos">{t("knhSonucYok", "Sonuç bulunamadı.")}</div>
              : sonuclar.map((y, i) => (<button className="knh-sonuc-oge" key={i} onClick={() => sonucaGit(y)}><span className="knh-sonuc-ik" aria-hidden="true">📍</span><span className="knh-sonuc-ad">{y.ad}</span></button>))}
          </div>
        )}
        {/* Kapat (küçük önizlemeye dön) */}
        {!navAktif && <button className="knh-kapat" onClick={() => setAcik(false)} aria-label={t("kapat", "Kapat")}>✕</button>}
        {/* Konumum */}
        {!navAktif && <button className="knh-konumum" onClick={konumumaGit} aria-label={t("knhKonumum", "Ortala")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
          <span>{t("knhKonumum", "Ortala")}</span>
        </button>}
        {/* SAĞ DÜĞMELER — pusula (kuzeye çevir) + yakınlaştır/uzaklaştır */}
        <div className="knh-kontrol">
          <button className="knh-kbtn" onClick={() => { const m = haritaRef.current; if (m) try { m.easeTo({ bearing: 0, pitch: 0, duration: 400 }); } catch (e) {} }} aria-label={t("knhPusula", "Kuzey")}>🧭</button>
          <button className="knh-kbtn" onClick={() => { const m = haritaRef.current; if (m) try { m.zoomIn(); } catch (e) {} }} aria-label={t("knhYakin", "Yakınlaştır")}>＋</button>
          <button className="knh-kbtn" onClick={() => { const m = haritaRef.current; if (m) try { m.zoomOut(); } catch (e) {} }} aria-label={t("knhUzak", "Uzaklaştır")}>－</button>
        </div>
        {hedef && !rotaBilgi && (
          <button className="knh-yol" onClick={rotaCiz} disabled={rotaYukleniyor}><span aria-hidden="true">🧭</span> {rotaYukleniyor ? t("knhRotaHesap", "Rota çiziliyor…") : t("knhYolTarifi", "Yol tarifi")}</button>
        )}
        {rotaBilgi && !navAktif && (
          <div className="knh-rota-serit">
            <div className="knh-mod-satir">
              <div className="knh-mod-sec">
                {[["araba", "🚗", t("knhAraba", "Araba")], ["yurume", "🚶", t("knhYurume", "Yürü")], ["bisiklet", "🚴", t("knhBisiklet", "Bisiklet")]].map(([m, ik, et]) => (
                  <button key={m} className={"knh-mod" + (mod === m ? " sec" : "")} onClick={() => setMod(m)}><span aria-hidden="true">{ik}</span> {et}</button>
                ))}
              </div>
              <button className="knh-rota-kapat" onClick={() => { setRotaBilgi(null); rotaTemizle(); }} aria-label={t("temizle", "Temizle")}>✕</button>
            </div>
            <div className="knh-rota-alt">
              <div className="knh-rota-bilgi">
                <span className="knh-rota-ik" aria-hidden="true">{mod === "yurume" ? "🚶" : mod === "bisiklet" ? "🚴" : "🚗"}</span>
                {rotaBilgi.km} km · {mod === "araba" && rotaBilgi.yaklasik ? "~" : ""}{sureYaz(modSure(mod, rotaBilgi.km, rotaBilgi.arabaDk))}
              </div>
              <button className="knh-git" onClick={navBaslat}>▶ {t("knhGit", "Git")}</button>
            </div>
          </div>
        )}
        {/* ADIM-ADIM NAVİGASYON EKRANI */}
        {navAktif && (<>
          <div className="knh-nav-ust">
            <span className="knh-nav-ok" aria-hidden="true">{navAdim && /sol/i.test(navAdim.yazi) ? "↰" : navAdim && /sağ/i.test(navAdim.yazi) ? "↱" : "↑"}</span>
            <div className="knh-nav-ic">
              <div className="knh-nav-mesafe">{navAdim ? (navAdim.mesafe >= 1000 ? (navAdim.mesafe / 1000).toFixed(1) + " km" : navAdim.mesafe + " m") : ""}</div>
              <div className="knh-nav-talimat">{navAdim ? navAdim.yazi : t("knhYolAlin", "Yola çık")}</div>
            </div>
          </div>
          <div className="knh-nav-alt">
            <span className="knh-nav-kalan">{navKalan ? (navKalan.km + " km · " + sureYaz(navKalan.dk)) : ""}</span>
            <button className="knh-nav-bitir" onClick={navBitir}>■ {t("knhBitir", "Bitir")}</button>
          </div>
        </>)}
      </>)}
    </div>
  );
}
