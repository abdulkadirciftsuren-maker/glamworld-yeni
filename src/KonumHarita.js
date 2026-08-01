// ═══════════════════════════════════════════════════════════════════════════
// KONUM SAYFASI — Navigasyon haritası (MapLibre GL, dönebilen modern harita)
// ─────────────────────────────────────────────────────────────────────────────
// Kendi konumun (altın pin) + yakın yerler (renkli noktalar) + yer ARAMA +
// UYGULAMA İÇİNDE YOL TARİFİ (mavi rota çizgisi + km/dk; OSRM) + TAM EKRAN.
// Ayrı bileşen → Anasayfa'nın başka yerini BOZMAZ. maplibregl zaten pakette.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { useTranslation } from "react-i18next";

// Gerçek Google Haritalar uygulamasında rota (isteyen dışarıda adım adım navigasyon için)
function googleYolAc(bLat, bLon, hLat, hLon) {
  const url = (typeof bLat === "number")
    ? `https://www.google.com/maps/dir/?api=1&origin=${bLat},${bLon}&destination=${hLat},${hLon}`
    : `https://www.google.com/maps/dir/?api=1&destination=${hLat},${hLon}`;
  try { const w = window.open(url, "_blank", "noopener,noreferrer"); if (!w) window.location.href = url; }
  catch (e) { try { window.location.href = url; } catch (x) {} }
}

// İki nokta arası kuş uçuşu km (düz-çizgi yedeği için)
function kmArasi(la1, lo1, la2, lo2) {
  const R = 6371, dLa = (la2 - la1) * Math.PI / 180, dLo = (lo2 - lo1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const POI_RENK = { hairdresser: "#ff2d9b", beauty: "#ff2d9b", barber: "#ff2d9b", bank: "#f7b500", atm: "#f7b500", hotel: "#00b8d4", motel: "#00b8d4", guest_house: "#00b8d4", hostel: "#00b8d4", fast_food: "#e74c3c", restaurant: "#ff6b3d", cafe: "#e67e22", supermarket: "#27ae60", convenience: "#2ecc71", marketplace: "#27ae60", pharmacy: "#8e44ad", hospital: "#e91e63", clinic: "#e91e63", post_office: "#16a085", fuel: "#d35400", school: "#3498db", university: "#3498db", bakery: "#e8a33d", mosque: "#2ecc71", church: "#bdc3c7", clothes: "#9b59b6", jewelry: "#f1c40f", townhall: "#2980b9", courthouse: "#9b59b6", police: "#34495e", fire_station: "#c0392b", library: "#16a085", government: "#2980b9", tax: "#2980b9" };

export default function KonumHarita({ benLat, benLon }) {
  const { t } = useTranslation();
  const kapRef = useRef(null);
  const haritaRef = useRef(null);
  const benPinRef = useRef(null);
  const hedefPinRef = useRef(null);
  const poiMarksRef = useRef([]);
  const poiZmnRef = useRef(null);
  const araZmnRef = useRef(null); // yazarken otomatik arama gecikmesi
  const [hazir, setHazir] = useState(false);
  const [ara, setAra] = useState("");
  const [sonuclar, setSonuclar] = useState(null);
  const [araniyor, setAraniyor] = useState(false);
  const [hedef, setHedef] = useState(null);
  const [rotaBilgi, setRotaBilgi] = useState(null);   // {km, dk}
  const [rotaYukleniyor, setRotaYukleniyor] = useState(false);
  const [tamEkran, setTamEkran] = useState(false);
  const benRef = useRef((typeof benLat === "number" && typeof benLon === "number") ? { lat: benLat, lon: benLon } : null);

  function poiYukle(lat, lon) {
    const q = `[out:json][timeout:16];(node["amenity"~"^(restaurant|cafe|fast_food|pharmacy|hospital|clinic|bank|atm|post_office|fuel|school|university|bakery|marketplace|mosque|church|supermarket|townhall|courthouse|police|fire_station|library)$"](around:1400,${lat},${lon});node["tourism"~"^(hotel|motel|guest_house|hostel)$"](around:1400,${lat},${lon});node["shop"~"^(supermarket|convenience|hairdresser|beauty|barber|clothes|bakery|jewelry)$"](around:1400,${lat},${lon}););out body 120;`;
    const sunucu = ["https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://overpass.osm.ch/api/interpreter"];
    const dene = (i) => {
      if (i >= sunucu.length) return Promise.resolve(null);
      return fetch(sunucu[i] + "?data=" + encodeURIComponent(q)).then((r) => { if (!r.ok) throw new Error("op"); return r.json(); }).then((d) => ((!d || !d.elements || !d.elements.length) && i + 1 < sunucu.length) ? dene(i + 1) : d).catch(() => dene(i + 1));
    };
    dene(0).then((d) => {
      const map = haritaRef.current; if (!map || !d) return;
      poiMarksRef.current.forEach((m) => { try { m.remove(); } catch (e) {} }); poiMarksRef.current = [];
      (d.elements || []).forEach((el) => {
        const tur = el.tags && (el.tags.amenity || el.tags.tourism || el.tags.shop || ""); if (!tur) return;
        const renk = POI_RENK[tur] || "#7f8c8d";
        const dot = document.createElement("div");
        dot.style.cssText = `background:${renk};width:18px;height:18px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.6);cursor:pointer`;
        const ad = (el.tags && el.tags.name) || tur;
        const mk = new maplibregl.Marker({ element: dot }).setLngLat([el.lon, el.lat])
          .setPopup(new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(`<b>${ad}</b>`)).addTo(map);
        mk.getElement().addEventListener("click", () => { setHedef({ lat: el.lat, lon: el.lon, ad }); hedefKoy(el.lat, el.lon); setRotaBilgi(null); rotaTemizle(); });
        poiMarksRef.current.push(mk);
      });
    }).catch(() => {});
  }

  function hedefKoy(lat, lon) {
    const map = haritaRef.current; if (!map) return;
    if (hedefPinRef.current) hedefPinRef.current.setLngLat([lon, lat]);
    else hedefPinRef.current = new maplibregl.Marker({ color: "#e0202c" }).setLngLat([lon, lat]).addTo(map);
  }
  function rotaTemizle() {
    const map = haritaRef.current; if (!map) return;
    try { if (map.getLayer("rota")) map.removeLayer("rota"); if (map.getSource("rota")) map.removeSource("rota"); } catch (e) {}
  }

  useEffect(() => {
    if (!kapRef.current || haritaRef.current) return;
    const ben = benRef.current;
    const bLat = ben ? ben.lat : 39, bLon = ben ? ben.lon : 35;
    let map;
    try {
      map = new maplibregl.Map({
        container: kapRef.current,
        style: { version: 8, sources: { osm: { type: "raster", tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 19, attribution: "© OpenStreetMap" } }, layers: [{ id: "osm", type: "raster", source: "osm", paint: { "raster-fade-duration": 0 } }] },
        center: [bLon, bLat], zoom: ben ? 15 : 4, attributionControl: false, fadeDuration: 0,
      });
    } catch (e) { return; }
    haritaRef.current = map;
    // Yakınlaştırma okları/pusula KALDIRILDI (üstte arama+tam ekran ile çakışıyordu). İki parmakla yakınlaş/döndür yeter.
    map.on("load", () => { setHazir(true); try { map.resize(); } catch (e) {} });
    // Harita ilk açılışta kabı 0 boyutlu ölçebilir → birkaç kez resize (boş/gri kalmasın)
    setTimeout(() => { try { map.resize(); } catch (e) {} }, 250);
    setTimeout(() => { try { map.resize(); } catch (e) {} }, 900);
    map.on("click", (e) => { const la = e.lngLat.lat, lo = e.lngLat.lng; setHedef({ lat: la, lon: lo, ad: "" }); hedefKoy(la, lo); setRotaBilgi(null); rotaTemizle(); });
    map.on("moveend", () => { if (map.getZoom() < 13) return; clearTimeout(poiZmnRef.current); poiZmnRef.current = setTimeout(() => { const c = map.getCenter(); poiYukle(c.lat, c.lng); }, 600); });
    map.once("idle", () => { if (map.getZoom() >= 13) { const c = map.getCenter(); poiYukle(c.lat, c.lng); } });
    if (ben) { benPinRef.current = new maplibregl.Marker({ color: "#FFD700" }).setLngLat([bLon, bLat]).addTo(map); poiYukle(bLat, bLon); }
    if (!ben && navigator.geolocation) navigator.geolocation.getCurrentPosition((pos) => {
      const la = pos.coords.latitude, lo = pos.coords.longitude; if (!haritaRef.current) return;
      benRef.current = { lat: la, lon: lo }; map.flyTo({ center: [lo, la], zoom: 15 });
      benPinRef.current = new maplibregl.Marker({ color: "#FFD700" }).setLngLat([lo, la]).addTo(map); poiYukle(la, lo);
    }, () => {}, { enableHighAccuracy: true, timeout: 8000 });
    return () => { try { clearTimeout(poiZmnRef.current); map.remove(); } catch (e) {} haritaRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Tam ekran açılıp kapanınca haritayı yeniden boyutlandır (gri kalmasın)
  useEffect(() => { const map = haritaRef.current; if (!map) return; const z = setTimeout(() => { try { map.resize(); } catch (e) {} }, 80); return () => clearTimeout(z); }, [tamEkran]);

  function konumumaGit() {
    const map = haritaRef.current; if (!map) return;
    if (!navigator.geolocation) { if (benRef.current) map.flyTo({ center: [benRef.current.lon, benRef.current.lat], zoom: 16 }); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      const la = pos.coords.latitude, lo = pos.coords.longitude;
      benRef.current = { lat: la, lon: lo }; map.flyTo({ center: [lo, la], zoom: 16 });
      if (benPinRef.current) benPinRef.current.setLngLat([lo, la]); else benPinRef.current = new maplibregl.Marker({ color: "#FFD700" }).setLngLat([lo, la]).addTo(map);
      poiYukle(la, lo);
    }, () => { if (benRef.current) map.flyTo({ center: [benRef.current.lon, benRef.current.lat], zoom: 16 }); }, { enableHighAccuracy: true, timeout: 8000 });
  }

  function yerAra(sorgu) {
    const q = ((typeof sorgu === "string" ? sorgu : ara) || "").trim(); if (q.length < 2) return;
    setAraniyor(true); setSonuclar(null);
    const url = "https://nominatim.openstreetmap.org/search?format=json&limit=7&accept-language=tr&q=" + encodeURIComponent(q);
    fetch(url, { headers: { "Accept": "application/json" } }).then((r) => r.json()).then((liste) => {
      setSonuclar((Array.isArray(liste) ? liste : []).map((y) => ({ lat: parseFloat(y.lat), lon: parseFloat(y.lon), ad: y.display_name || q })));
    }).catch(() => setSonuclar([])).finally(() => setAraniyor(false));
  }
  // Yazarken OTOMATİK ara (düğmeye basmaya gerek yok) — 650ms bekleyip arar
  function araDegisti(v) {
    setAra(v); clearTimeout(araZmnRef.current);
    if (v.trim().length < 3) { setSonuclar(null); return; }
    araZmnRef.current = setTimeout(() => yerAra(v), 650);
  }

  function sonucaGit(y) {
    const map = haritaRef.current; setSonuclar(null); setHedef(y); setRotaBilgi(null); rotaTemizle();
    if (map) map.flyTo({ center: [y.lon, y.lat], zoom: 16 });
    hedefKoy(y.lat, y.lon);
  }

  // Düz-çizgi yedeği — OSRM çalışmazsa: kuş uçuşu hat + yaklaşık km/dk (yine UYGULAMA İÇİNDE, Google'a atmaz)
  function duzRotaCiz() {
    const map = haritaRef.current, ben = benRef.current; if (!map || !ben || !hedef) return;
    const gj = { type: "Feature", geometry: { type: "LineString", coordinates: [[ben.lon, ben.lat], [hedef.lon, hedef.lat]] } };
    try {
      rotaTemizle();
      map.addSource("rota", { type: "geojson", data: gj });
      map.addLayer({ id: "rota", type: "line", source: "rota", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#1f6fd0", "line-width": 6, "line-opacity": 0.85, "line-dasharray": [2, 2] } });
      const b = new maplibregl.LngLatBounds([ben.lon, ben.lat], [ben.lon, ben.lat]).extend([hedef.lon, hedef.lat]);
      map.fitBounds(b, { padding: 70, maxZoom: 16 });
    } catch (e) {}
    const km = kmArasi(ben.lat, ben.lon, hedef.lat, hedef.lon);
    setRotaBilgi({ km: km.toFixed(1), dk: Math.max(1, Math.round(km / 0.5)), yaklasik: true }); // ~30 km/s kaba tahmin
  }

  // UYGULAMA İÇİNDE YOL TARİFİ — OSRM ile gerçek yol rotası (mavi çizgi) + km/dk; olmazsa düz-çizgi yedeği
  async function rotaCiz() {
    const map = haritaRef.current, ben = benRef.current;
    if (!map || !hedef) return;
    if (!ben) { konumumaGit(); return; } // konum yoksa önce konumu al
    setRotaYukleniyor(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${ben.lon},${ben.lat};${hedef.lon},${hedef.lat}?overview=full&geometries=geojson`;
      const r = await fetch(url); const d = await r.json();
      const rota = d && d.routes && d.routes[0];
      if (rota && rota.geometry) {
        const gj = { type: "Feature", geometry: rota.geometry };
        rotaTemizle();
        map.addSource("rota", { type: "geojson", data: gj });
        map.addLayer({ id: "rota", type: "line", source: "rota", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#1f6fd0", "line-width": 7, "line-opacity": 0.9 } });
        const coords = rota.geometry.coordinates || [];
        if (coords.length) {
          const b = coords.reduce((bb, c) => bb.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
          map.fitBounds(b, { padding: 70, maxZoom: 16 });
        }
        setRotaBilgi({ km: (rota.distance / 1000).toFixed(1), dk: Math.max(1, Math.round(rota.duration / 60)) });
      } else { duzRotaCiz(); } // OSRM boş → düz-çizgi
    } catch (e) { duzRotaCiz(); } // OSRM hata → düz-çizgi (Google'a atmadan içeride göster)
    setRotaYukleniyor(false);
  }

  const ben = benRef.current;
  return (
    <div className={"knh-sar" + (tamEkran ? " knh-tam" : "")}>
      {/* ARAMA */}
      <div className="knh-ara-sar">
        <svg className="knh-ara-ik" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
        <input className="knh-ara-in" value={ara} onChange={(e) => araDegisti(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { clearTimeout(araZmnRef.current); yerAra(); } }} placeholder={t("knhAra", "Yer, adres, mekân ara…")} />
        {ara && <button className="knh-ara-temizle" onClick={() => { setAra(""); setSonuclar(null); }} aria-label={t("temizle", "Temizle")}>✕</button>}
        <button className="knh-ara-btn" onClick={yerAra} disabled={araniyor}>{araniyor ? "…" : t("knhBul", "Bul")}</button>
      </div>
      {sonuclar && (
        <div className="knh-sonuc">
          {sonuclar.length === 0 ? <div className="knh-sonuc-bos">{t("knhSonucYok", "Sonuç bulunamadı.")}</div>
            : sonuclar.map((y, i) => (
              <button className="knh-sonuc-oge" key={i} onClick={() => sonucaGit(y)}>
                <span className="knh-sonuc-ik" aria-hidden="true">📍</span>
                <span className="knh-sonuc-ad">{y.ad}</span>
              </button>
            ))}
        </div>
      )}
      {/* HARİTA */}
      <div className="knh-harita" ref={kapRef}>
        {!hazir && <div className="knh-yukleniyor">🗺️ {t("knhYukleniyor", "Harita geliyor…")}</div>}
      </div>
      {/* TAM EKRAN aç/kapat */}
      <button className="knh-tamekran" onClick={() => setTamEkran((v) => !v)} aria-label={t("knhTamEkran", "Tam ekran")}>
        {tamEkran ? "✕" : "⛶"}
      </button>
      {/* Konumum */}
      <button className="knh-konumum" onClick={konumumaGit} aria-label={t("knhKonumum", "Konumum")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
        <span>{t("knhKonumum", "Konumum")}</span>
      </button>
      {/* Yol tarifi (uygulama içi rota) — hedef seçilince */}
      {hedef && !rotaBilgi && (
        <button className="knh-yol" onClick={rotaCiz} disabled={rotaYukleniyor}>
          <span aria-hidden="true">🧭</span> {rotaYukleniyor ? t("knhRotaHesap", "Rota çiziliyor…") : t("knhYolTarifi", "Yol tarifi")}
        </button>
      )}
      {/* Rota bilgi şeridi (km · dk) + Google'da adım adım aç */}
      {rotaBilgi && (
        <div className="knh-rota-serit">
          <span className="knh-rota-bilgi">🚗 {rotaBilgi.yaklasik ? "~" : ""}{rotaBilgi.km} km · {rotaBilgi.yaklasik ? "~" : ""}{rotaBilgi.dk} {t("knhDk", "dk")}</span>
          <button className="knh-rota-google" onClick={() => googleYolAc(ben && ben.lat, ben && ben.lon, hedef.lat, hedef.lon)}>{t("knhAdimAdim", "Adım adım (Google)")} ↗</button>
          <button className="knh-rota-kapat" onClick={() => { setRotaBilgi(null); rotaTemizle(); }} aria-label={t("temizle", "Temizle")}>✕</button>
        </div>
      )}
    </div>
  );
}
