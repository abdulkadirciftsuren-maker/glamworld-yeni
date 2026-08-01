// ═══════════════════════════════════════════════════════════════════════════
// KONUM SAYFASI — Navigasyon haritası (MapLibre GL, dönebilen modern harita)
// ─────────────────────────────────────────────────────────────────────────────
// Kendi konumun (altın pin) + yakın yerler (renkli noktalar) + yer ARAMA + YOL TARİFİ.
// Ayrı bileşen → Anasayfa'nın başka yerini BOZMAZ. maplibregl zaten pakette.
// Harita üstü yazılar yerel dildedir (resim döşeme, çevrilemez); arayüz düğmeleri çevrilir.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { useTranslation } from "react-i18next";

// Yol tarifi — telefonun/masaüstünün harita uygulamasında hedefe rota açar (Google Haritalar).
function yolTarifiAc(lat, lon) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  try { const w = window.open(url, "_blank", "noopener,noreferrer"); if (!w) window.location.href = url; }
  catch (e) { try { window.location.href = url; } catch (x) {} }
}

// Yakın yer türlerine göre renk (Ayarlar haritasıyla aynı düzen)
const POI_RENK = { hairdresser: "#ff2d9b", beauty: "#ff2d9b", barber: "#ff2d9b", bank: "#f7b500", atm: "#f7b500", hotel: "#00b8d4", motel: "#00b8d4", guest_house: "#00b8d4", hostel: "#00b8d4", fast_food: "#e74c3c", restaurant: "#ff6b3d", cafe: "#e67e22", supermarket: "#27ae60", convenience: "#2ecc71", marketplace: "#27ae60", pharmacy: "#8e44ad", hospital: "#e91e63", clinic: "#e91e63", post_office: "#16a085", fuel: "#d35400", school: "#3498db", university: "#3498db", bakery: "#e8a33d", mosque: "#2ecc71", church: "#bdc3c7", clothes: "#9b59b6", jewelry: "#f1c40f", townhall: "#2980b9", courthouse: "#9b59b6", police: "#34495e", fire_station: "#c0392b", library: "#16a085", government: "#2980b9", tax: "#2980b9" };

export default function KonumHarita({ benLat, benLon }) {
  const { t } = useTranslation();
  const kapRef = useRef(null);        // harita kabı (div)
  const haritaRef = useRef(null);     // maplibregl.Map
  const benPinRef = useRef(null);     // kendi konum pini (altın)
  const hedefPinRef = useRef(null);   // aranan/dokunulan hedef pini (kırmızı)
  const poiMarksRef = useRef([]);     // yakın yer noktaları
  const poiZmnRef = useRef(null);
  const [hazir, setHazir] = useState(false);
  const [ara, setAra] = useState("");
  const [sonuclar, setSonuclar] = useState(null); // arama sonuçları | null
  const [araniyor, setAraniyor] = useState(false);
  const [hedef, setHedef] = useState(null);        // {lat, lon, ad}
  const [benKonum, setBenKonum] = useState(() => (typeof benLat === "number" && typeof benLon === "number") ? { lat: benLat, lon: benLon } : null);

  // ── Yakın yerleri (banka, kafe, otel, berber…) yükle (Overpass, çok sunuculu yedek) ──
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
        mk.getElement().addEventListener("click", () => { setHedef({ lat: el.lat, lon: el.lon, ad }); hedefKoy(el.lat, el.lon); });
        poiMarksRef.current.push(mk);
      });
    }).catch(() => {});
  }

  // Hedef pini (kırmızı) koy/güncelle
  function hedefKoy(lat, lon) {
    const map = haritaRef.current; if (!map) return;
    if (hedefPinRef.current) hedefPinRef.current.setLngLat([lon, lat]);
    else hedefPinRef.current = new maplibregl.Marker({ color: "#e0202c" }).setLngLat([lon, lat]).addTo(map);
  }

  // ── Harita kur (bir kez) ──
  useEffect(() => {
    if (!kapRef.current || haritaRef.current) return;
    const bLat = benKonum ? benKonum.lat : 39, bLon = benKonum ? benKonum.lon : 35;
    let map;
    try {
      map = new maplibregl.Map({
        container: kapRef.current,
        style: { version: 8, sources: { osm: { type: "raster", tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 19, attribution: "© OpenStreetMap" } }, layers: [{ id: "osm", type: "raster", source: "osm", paint: { "raster-fade-duration": 0 } }] },
        center: [bLon, bLat], zoom: benKonum ? 15 : 4, attributionControl: false, fadeDuration: 0,
      });
    } catch (e) { return; }
    haritaRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right"); // pusula: döndür/eğ/sıfırla
    map.on("load", () => setHazir(true));
    // Haritaya dokun → hedef koy (yol tarifi için)
    map.on("click", (e) => { const la = e.lngLat.lat, lo = e.lngLat.lng; setHedef({ lat: la, lon: lo, ad: "" }); hedefKoy(la, lo); });
    // Gezindikçe yakın yerleri güncelle
    map.on("moveend", () => { if (map.getZoom() < 13) return; clearTimeout(poiZmnRef.current); poiZmnRef.current = setTimeout(() => { const c = map.getCenter(); poiYukle(c.lat, c.lng); }, 600); });
    map.once("idle", () => { if (map.getZoom() >= 13) { const c = map.getCenter(); poiYukle(c.lat, c.lng); } });
    if (benKonum) { benPinRef.current = new maplibregl.Marker({ color: "#FFD700" }).setLngLat([bLon, bLat]).addTo(map); poiYukle(bLat, bLon); }
    // Konum yoksa cihazdan iste
    if (!benKonum && navigator.geolocation) navigator.geolocation.getCurrentPosition((pos) => {
      const la = pos.coords.latitude, lo = pos.coords.longitude; if (!haritaRef.current) return;
      setBenKonum({ lat: la, lon: lo }); map.flyTo({ center: [lo, la], zoom: 15 });
      benPinRef.current = new maplibregl.Marker({ color: "#FFD700" }).setLngLat([lo, la]).addTo(map); poiYukle(la, lo);
    }, () => {}, { enableHighAccuracy: true, timeout: 8000 });
    return () => { try { clearTimeout(poiZmnRef.current); map.remove(); } catch (e) {} haritaRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // "Konumum" — cihaz konumuna dön ve altın pini oraya koy
  function konumumaGit() {
    const map = haritaRef.current; if (!map || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const la = pos.coords.latitude, lo = pos.coords.longitude;
      setBenKonum({ lat: la, lon: lo }); map.flyTo({ center: [lo, la], zoom: 16 });
      if (benPinRef.current) benPinRef.current.setLngLat([lo, la]); else benPinRef.current = new maplibregl.Marker({ color: "#FFD700" }).setLngLat([lo, la]).addTo(map);
      poiYukle(la, lo);
    }, () => {}, { enableHighAccuracy: true, timeout: 8000 });
  }

  // Yer ARA (Nominatim geocode) — yazıp Enter/butona basınca
  function yerAra() {
    const q = (ara || "").trim(); if (q.length < 2 || araniyor) return;
    setAraniyor(true); setSonuclar(null);
    const url = "https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=tr&q=" + encodeURIComponent(q);
    fetch(url, { headers: { "Accept": "application/json" } }).then((r) => r.json()).then((liste) => {
      setSonuclar((Array.isArray(liste) ? liste : []).map((y) => ({ lat: parseFloat(y.lat), lon: parseFloat(y.lon), ad: y.display_name || q })));
    }).catch(() => setSonuclar([])).finally(() => setAraniyor(false));
  }

  // Arama sonucuna git → hedef pini + haritayı oraya uçur
  function sonucaGit(y) {
    const map = haritaRef.current; setSonuclar(null); setHedef(y);
    if (map) { map.flyTo({ center: [y.lon, y.lat], zoom: 16 }); }
    hedefKoy(y.lat, y.lon);
  }

  return (
    <div className="knh-sar">
      {/* ARAMA */}
      <div className="knh-ara-sar">
        <svg className="knh-ara-ik" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
        <input className="knh-ara-in" value={ara} onChange={(e) => setAra(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") yerAra(); }} placeholder={t("knhAra", "Yer, adres, mekân ara…")} />
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
      {/* DÜĞMELER */}
      <button className="knh-konumum" onClick={konumumaGit} aria-label={t("knhKonumum", "Konumum")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
        <span>{t("knhKonumum", "Konumum")}</span>
      </button>
      {hedef && (
        <button className="knh-yol" onClick={() => yolTarifiAc(hedef.lat, hedef.lon)}>
          <span aria-hidden="true">🧭</span> {t("knhYolTarifi", "Yol tarifi")} ↗
        </button>
      )}
    </div>
  );
}
