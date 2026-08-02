// ═══════════════════════════════════════════════════════════════════════════
// ADRES HARİTASI — haritaya dokun → o noktanın ADRESİ (kapı numaralı) çıkar,
// hem O ÜLKENİN DİLİNDE hem İNGİLİZCE, KOPYALA düğmeleriyle. (HERE adres servisi)
// ─────────────────────────────────────────────────────────────────────────────
// Konum sayfasında ARKADAŞ haritasının ALTINDA durur. Küçük önizleme → dokun → tam ekran.
// HERE anahtarı yoksa ücretsiz Nominatim'e düşer (yedek; ama kapı numarası çoğu ülkede yok).
// ═══════════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { useTranslation } from "react-i18next";
import { ADRES_KOPRU } from "./hereConfig";

// Ülke kodu (HERE 3 harfli ISO) → o ülkenin ana dili (yerel adres bu dilde gelsin)
const CC3_LANG = { TUR: "tr", UKR: "uk", RUS: "ru", BLR: "be", KAZ: "ru", AZE: "az", GEO: "ka", ARM: "hy",
  CHN: "zh", TWN: "zh", HKG: "zh", JPN: "ja", KOR: "ko", THA: "th", VNM: "vi", IDN: "id",
  SAU: "ar", ARE: "ar", EGY: "ar", IRQ: "ar", SYR: "ar", JOR: "ar", KWT: "ar", QAT: "ar", OMN: "ar", YEM: "ar", MAR: "ar", DZA: "ar", TUN: "ar", LBY: "ar", LBN: "ar",
  IRN: "fa", ISR: "he", GRC: "el", CZE: "cs", SWE: "sv", DNK: "da", NOR: "nb", FIN: "fi",
  DEU: "de", AUT: "de", CHE: "de", FRA: "fr", ESP: "es", ITA: "it", PRT: "pt", BRA: "pt",
  MEX: "es", ARG: "es", NLD: "nl", POL: "pl", ROU: "ro", BGR: "bg", HUN: "hu", HRV: "hr", SRB: "sr",
  IND: "hi", PAK: "ur", BGD: "bn", GBR: "en", USA: "en", AUS: "en", CAN: "en", IRL: "en", NZL: "en" };

const ETKILER = ["dragPan", "scrollZoom", "boxZoom", "dragRotate", "keyboard", "doubleClickZoom", "touchZoomRotate"];
function etkilesim(map, ac) { ETKILER.forEach((n) => { try { if (map[n]) ac ? map[n].enable() : map[n].disable(); } catch (e) {} }); }

export default function AdresHarita({ benLat, benLon }) {
  const { t } = useTranslation();
  const kapRef = useRef(null);
  const haritaRef = useRef(null);
  const pinRef = useRef(null);
  const acikRef = useRef(false);
  const [acik, setAcik] = useState(false);
  const [hazir, setHazir] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [yerel, setYerel] = useState("");     // o ülkenin dilinde adres
  const [enAdres, setEnAdres] = useState(""); // İngilizce adres
  const [kopyalandi, setKopyalandi] = useState("");
  const benRef = useRef((typeof benLat === "number" && typeof benLon === "number") ? { lat: benLat, lon: benLon } : null);

  function pinKoy(lat, lon) { const map = haritaRef.current; if (!map) return; if (pinRef.current) pinRef.current.setLngLat([lon, lat]); else pinRef.current = new maplibregl.Marker({ color: "#e0202c" }).setLngLat([lon, lat]).addTo(map); }

  // NOMİNATİM yedek (HERE anahtarı yoksa) — kapı numarası çoğu ülkede olmayabilir ama en azından çalışır
  async function nominatimCoz(lat, lon) {
    const base = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const rEn = await fetch(base + "&accept-language=en", { headers: { Accept: "application/json" } }); const dEn = await rEn.json();
    setEnAdres((dEn && dEn.display_name) || "");
    const cc = (dEn && dEn.address && dEn.address.country_code) || "";
    const lang = ({ tr: "tr", ua: "uk", ru: "ru", de: "de", fr: "fr", es: "es", it: "it" })[cc] || "";
    if (lang && lang !== "en") { try { const rY = await fetch(base + "&accept-language=" + lang, { headers: { Accept: "application/json" } }); const dY = await rY.json(); setYerel((dY && dY.display_name) || (dEn && dEn.display_name) || ""); } catch (e) { setYerel((dEn && dEn.display_name) || ""); } }
    else setYerel((dEn && dEn.display_name) || "");
  }

  // HERE ters coğrafi kodlama — GÜVENLİ KÖPRÜ (worker) üzerinden. Anahtar sitede DEĞİL, worker'da gizli.
  // İngilizce + yerel dil (kapı numaralı label). Köprü yoksa Nominatim yedeği.
  async function adresCoz(lat, lon) {
    setYukleniyor(true); setYerel(""); setEnAdres(""); setKopyalandi("");
    try {
      if (!ADRES_KOPRU) { await nominatimCoz(lat, lon); setYukleniyor(false); return; }
      const ayrac = ADRES_KOPRU.indexOf("?") === -1 ? "?" : "&";
      const url = (lang) => `${ADRES_KOPRU}${ayrac}at=${lat},${lon}&lang=${lang}`;
      const rEn = await fetch(url("en-US")); const dEn = await rEn.json();
      const enItem = dEn && dEn.items && dEn.items[0];
      const enLabel = (enItem && enItem.address && enItem.address.label) || "";
      setEnAdres(enLabel);
      const cc = (enItem && enItem.address && enItem.address.countryCode) || "";
      const lang = CC3_LANG[cc] || "";
      if (lang && lang !== "en") {
        try { const rY = await fetch(url(lang)); const dY = await rY.json(); const yItem = dY && dY.items && dY.items[0]; setYerel((yItem && yItem.address && yItem.address.label) || enLabel); }
        catch (e) { setYerel(enLabel); }
      } else setYerel(enLabel);
    } catch (e) { try { await nominatimCoz(lat, lon); } catch (e2) {} }
    setYukleniyor(false);
  }

  function kopyala(metin) {
    const a = (metin || "").trim(); if (!a) return;
    try { navigator.clipboard.writeText(a); } catch (e) { try { const ta = document.createElement("textarea"); ta.value = a; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); } catch (e2) {} }
    setKopyalandi(a); setTimeout(() => setKopyalandi(""), 1800);
  }

  function konumumuBul() {
    const map = haritaRef.current; if (!map || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const la = pos.coords.latitude, lo = pos.coords.longitude; benRef.current = { lat: la, lon: lo };
      map.flyTo({ center: [lo, la], zoom: 17 }); pinKoy(la, lo); adresCoz(la, lo);
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
    map.on("click", (e) => { if (!acikRef.current) return; const la = e.lngLat.lat, lo = e.lngLat.lng; pinKoy(la, lo); adresCoz(la, lo); });
    if (ben) pinKoy(bLat, bLon);
    return () => { try { map.remove(); } catch (e) {} haritaRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    acikRef.current = acik; const map = haritaRef.current; if (!map) return;
    etkilesim(map, acik);
    const z = setTimeout(() => {
      try { map.resize(); } catch (e) {}
      if (acik) { const ben = benRef.current; if (ben) { map.flyTo({ center: [ben.lon, ben.lat], zoom: 16 }); } else konumumuBul(); }
    }, 90);
    return () => clearTimeout(z);
  }, [acik]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={"adh-sar" + (acik ? " adh-tam" : " adh-oniz")} onClick={!acik ? () => setAcik(true) : undefined}>
      <div className={"adh-baslik"}>
        <span aria-hidden="true">📋</span> {t("adhBaslik", "Adres bul ve kopyala")}
      </div>
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
        <div className="adh-ust-ipuc">📍 {t("adhDokun", "Adresini istediğin yere haritada dokun")}</div>
        <button className="adh-konumum" onClick={(e) => { e.stopPropagation(); konumumuBul(); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
          {t("adhKonumum", "Konumumu bul")}
        </button>

        {(yukleniyor || yerel || enAdres) && (
          <div className="adh-sonuc" onClick={(e) => e.stopPropagation()}>
            {yukleniyor ? <div className="adh-yukl">⏳ {t("adhAraniyor", "Adres bulunuyor…")}</div> : (<>
              {yerel && (
                <div className="adh-kart">
                  <div className="adh-kart-et">🌍 {t("adhYerel", "Yerel dilde")}</div>
                  <div className="adh-kart-adres">{yerel}</div>
                  <button className="adh-kopya" onClick={() => kopyala(yerel)}>📋 {t("adhKopyala", "Kopyala")}</button>
                </div>
              )}
              {enAdres && (
                <div className="adh-kart">
                  <div className="adh-kart-et">🇬🇧 {t("adhEn", "İngilizce")}</div>
                  <div className="adh-kart-adres">{enAdres}</div>
                  <button className="adh-kopya" onClick={() => kopyala(enAdres)}>📋 {t("adhKopyala", "Kopyala")}</button>
                </div>
              )}
              {kopyalandi && <div className="adh-kopyalandi">✓ {t("adhKopyalandi", "Adres kopyalandı")}</div>}
            </>)}
          </div>
        )}
      </>)}
    </div>
  );
}
