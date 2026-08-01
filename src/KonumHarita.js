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

function kmArasi(la1, lo1, la2, lo2) {
  const R = 6371, dLa = (la2 - la1) * Math.PI / 180, dLo = (lo2 - lo1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const POI_RENK = { hairdresser: "#ff2d9b", beauty: "#ff2d9b", barber: "#ff2d9b", bank: "#f7b500", atm: "#f7b500", hotel: "#00b8d4", motel: "#00b8d4", guest_house: "#00b8d4", hostel: "#00b8d4", fast_food: "#e74c3c", restaurant: "#ff6b3d", cafe: "#e67e22", supermarket: "#27ae60", convenience: "#2ecc71", marketplace: "#27ae60", pharmacy: "#8e44ad", hospital: "#e91e63", clinic: "#e91e63", post_office: "#16a085", fuel: "#d35400", school: "#3498db", university: "#3498db", bakery: "#e8a33d", mosque: "#2ecc71", church: "#bdc3c7", clothes: "#9b59b6", jewelry: "#f1c40f", townhall: "#2980b9", courthouse: "#9b59b6", police: "#34495e", fire_station: "#c0392b", library: "#16a085", government: "#2980b9", tax: "#2980b9" };

const ETKILER = ["dragPan", "scrollZoom", "boxZoom", "dragRotate", "keyboard", "doubleClickZoom", "touchZoomRotate"];
function haritaEtkilesim(map, ac) { ETKILER.forEach((n) => { try { if (map[n]) ac ? map[n].enable() : map[n].disable(); } catch (e) {} }); }

export default function KonumHarita({ benLat, benLon }) {
  const { t } = useTranslation();
  const kapRef = useRef(null);
  const haritaRef = useRef(null);
  const benPinRef = useRef(null);
  const hedefPinRef = useRef(null);
  const poiMarksRef = useRef([]);
  const poiZmnRef = useRef(null);
  const araZmnRef = useRef(null);
  const acikRef = useRef(false);
  const [acik, setAcik] = useState(false); // false=küçük önizleme, true=tam ekran (işlem yapılır)
  const [hazir, setHazir] = useState(false);
  const [ara, setAra] = useState("");
  const [sonuclar, setSonuclar] = useState(null);
  const [araniyor, setAraniyor] = useState(false);
  const [hedef, setHedef] = useState(null);
  const [rotaBilgi, setRotaBilgi] = useState(null);
  const [rotaYukleniyor, setRotaYukleniyor] = useState(false);
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
  // Rota KATMANINI baştan (boş) hazırla — çalışma anında katman EKLEMEK yerine sadece verisini güncelleriz (en güvenilir yöntem)
  function rotaKatmanHazirla() {
    const m = haritaRef.current; if (!m) return false;
    try {
      if (!m.getSource("rota")) m.addSource("rota", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      if (!m.getLayer("rota-kenar")) m.addLayer({ id: "rota-kenar", type: "line", source: "rota", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#ffffff", "line-width": 12, "line-opacity": 0.95 } });
      if (!m.getLayer("rota")) m.addLayer({ id: "rota", type: "line", source: "rota", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#1f6fd0", "line-width": 7.5, "line-opacity": 0.98 } });
      return true;
    } catch (e) { return false; }
  }
  function rotaTemizle() { const m = haritaRef.current; if (!m) return; try { const s = m.getSource("rota"); if (s && s.setData) s.setData({ type: "FeatureCollection", features: [] }); } catch (e) {} }
  // ROTA ÇİZGİSİNİ KOY — katman zaten hazır; sadece verisini güncelle (setData). Kaynak yoksa hazırla.
  function cizgiKoy(coords) {
    const m0 = haritaRef.current; if (!m0 || !Array.isArray(coords) || coords.length < 2) return;
    coords = coords.map((c) => [Number(c[0]), Number(c[1])]).filter((c) => isFinite(c[0]) && isFinite(c[1]));
    if (coords.length < 2) return;
    const gj = { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } };
    const koy = () => {
      const m = haritaRef.current; if (!m) return;
      if (!rotaKatmanHazirla()) return;
      try {
        const s = m.getSource("rota"); if (s && s.setData) s.setData(gj);
        if (m.getLayer("rota-kenar")) m.moveLayer("rota-kenar"); if (m.getLayer("rota")) m.moveLayer("rota");
        const b = coords.reduce((bb, c) => bb.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
        m.fitBounds(b, { padding: 80, maxZoom: 16 });
        try { m.triggerRepaint(); } catch (e) {}
      } catch (e) {}
    };
    koy();
    setTimeout(koy, 500); // stil/döşeme geç hazırsa yeniden veri koy (zararsız)
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
    map.on("load", () => { setHazir(true); try { map.resize(); } catch (e) {} try { rotaKatmanHazirla(); } catch (e) {} });
    setTimeout(() => { try { map.resize(); } catch (e) {} }, 250);
    map.on("click", (e) => { if (!acikRef.current) return; const la = e.lngLat.lat, lo = e.lngLat.lng; setHedef({ lat: la, lon: lo, ad: "" }); hedefKoy(la, lo); setRotaBilgi(null); rotaTemizle(); });
    map.on("moveend", () => { if (!acikRef.current || map.getZoom() < 13) return; clearTimeout(poiZmnRef.current); poiZmnRef.current = setTimeout(() => { const c = map.getCenter(); poiYukle(c.lat, c.lng); }, 600); });
    if (ben) benPinRef.current = new maplibregl.Marker({ color: "#FFD700" }).setLngLat([bLon, bLat]).addTo(map);
    if (!ben && navigator.geolocation) navigator.geolocation.getCurrentPosition((pos) => {
      const la = pos.coords.latitude, lo = pos.coords.longitude; if (!haritaRef.current) return;
      benRef.current = { lat: la, lon: lo }; map.flyTo({ center: [lo, la], zoom: 15 });
      benPinRef.current = new maplibregl.Marker({ color: "#FFD700" }).setLngLat([lo, la]).addTo(map);
    }, () => {}, { enableHighAccuracy: true, timeout: 8000 });
    return () => { try { clearTimeout(poiZmnRef.current); map.remove(); } catch (e) {} haritaRef.current = null; };
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
    setRotaBilgi({ km: km.toFixed(1), dk: Math.max(1, Math.round(km / 0.5)), yaklasik: true });
  }
  async function rotaCiz() {
    const map = haritaRef.current, ben = benRef.current; if (!map || !hedef) return; if (!ben) { konumumaGit(); return; }
    setRotaYukleniyor(true);
    try {
      const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${ben.lon},${ben.lat};${hedef.lon},${hedef.lat}?overview=full&geometries=geojson`);
      const d = await r.json(); const rota = d && d.routes && d.routes[0];
      const coords = rota && rota.geometry && rota.geometry.coordinates;
      if (Array.isArray(coords) && coords.length > 1 && Array.isArray(coords[0])) {
        cizgiKoy(coords); // gerçek yol rotası — dolu mavi hat
        setRotaBilgi({ km: (rota.distance / 1000).toFixed(1), dk: Math.max(1, Math.round(rota.duration / 60)) });
      } else duzRotaCiz(); // geometri yok/bozuk → düz çizgi yedeği
    } catch (e) { duzRotaCiz(); }
    setRotaYukleniyor(false);
  }

  return (
    <div className={"knh-sar" + (acik ? " knh-tam" : " knh-oniz-sar")} onClick={!acik ? () => setAcik(true) : undefined}>
      {/* HARİTA (küçük önizleme ya da tam ekran). Önizlemede pointer-events:none → parmak sayfayı kaydırır; dokununca sarmalayıcı açar. */}
      <div className={"knh-harita" + (acik ? " knh-harita-tam" : "")} ref={kapRef}>
        {!hazir && <div className="knh-yukleniyor">🗺️ {t("knhYukleniyor", "Harita geliyor…")}</div>}
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
        <div className="knh-ara-sar">
          <svg className="knh-ara-ik" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input className="knh-ara-in" value={ara} onChange={(e) => araDegisti(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { clearTimeout(araZmnRef.current); yerAra(); } }} placeholder={t("knhAra", "Yer, adres, mekân ara…")} />
          {ara && <button className="knh-ara-temizle" onClick={() => { setAra(""); setSonuclar(null); }} aria-label={t("temizle", "Temizle")}>✕</button>}
          <button className="knh-ara-btn" onClick={() => yerAra()} disabled={araniyor}>{araniyor ? "…" : t("knhBul", "Bul")}</button>
        </div>
        {sonuclar && (
          <div className="knh-sonuc">
            {sonuclar.length === 0 ? <div className="knh-sonuc-bos">{t("knhSonucYok", "Sonuç bulunamadı.")}</div>
              : sonuclar.map((y, i) => (<button className="knh-sonuc-oge" key={i} onClick={() => sonucaGit(y)}><span className="knh-sonuc-ik" aria-hidden="true">📍</span><span className="knh-sonuc-ad">{y.ad}</span></button>))}
          </div>
        )}
        {/* Kapat (küçük önizlemeye dön) */}
        <button className="knh-kapat" onClick={() => setAcik(false)} aria-label={t("kapat", "Kapat")}>✕</button>
        {/* Konumum */}
        <button className="knh-konumum" onClick={konumumaGit} aria-label={t("knhKonumum", "Konumum")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
          <span>{t("knhKonumum", "Konumum")}</span>
        </button>
        {hedef && !rotaBilgi && (
          <button className="knh-yol" onClick={rotaCiz} disabled={rotaYukleniyor}><span aria-hidden="true">🧭</span> {rotaYukleniyor ? t("knhRotaHesap", "Rota çiziliyor…") : t("knhYolTarifi", "Yol tarifi")}</button>
        )}
        {rotaBilgi && (
          <div className="knh-rota-serit">
            <span className="knh-rota-bilgi">🚗 {rotaBilgi.yaklasik ? "~" : ""}{rotaBilgi.km} km · {rotaBilgi.yaklasik ? "~" : ""}{sureYaz(rotaBilgi.dk)}</span>
            <button className="knh-rota-kapat" onClick={() => { setRotaBilgi(null); rotaTemizle(); }} aria-label={t("temizle", "Temizle")}>✕</button>
          </div>
        )}
      </>)}
    </div>
  );
}
