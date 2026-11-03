// AĞIR KÜTÜPHANELER — açılışta DEĞİL, lazım olunca (ve açılıştan birkaç saniye sonra arka planda) yüklenir.
// SEBEP (B436): ana paket 6.3 MB'tı; harita (maplibre ~1 MB), canlı görüşme (livekit ~0.5 MB) ve zil sesleri (~0.23 MB)
//   kullanıcı haritayı/aramayı hiç açmasa bile her açılışta okunup çalıştırılıyordu → zayıf telefonda/iPhone'da açılış donuyordu.
// "SARI PERDE"/PARÇA-404 OLMASIN DİYE: açılıştan kısa süre sonra hepsi sessizce iner (zil+LiveKit yüklenir, harita sadece indirilir); kullanıcı
//   harita/arama ekranına geldiğinde zaten hazırdır (beklemez). Her yükleme bir kez yapılır, sonra aynı söz döner.

let haritaSozu = null;
export function haritaYukle() {
  // webpackPrefetch: tarayıcı bu parçayı boşta SADECE İNDİRİR (çalıştırmaz) → açılışta takılma yok; Konum açılınca diskten anında gelir.
  if (!haritaSozu) haritaSozu = import(/* webpackPrefetch: true */ "maplibre-gl").then((m) => m.default || m).catch((e) => { haritaSozu = null; throw e; });
  return haritaSozu;
}

let livekitSozu = null;
let livekitHazir = null; // yüklendiyse modülün kendisi (mobilde kamera izni dokunuş anında istenmeli → beklemeden kullanılır)
export function livekitYukle() {
  if (!livekitSozu) livekitSozu = import("livekit-client").then((m) => { livekitHazir = m; return m; }).catch((e) => { livekitSozu = null; throw e; });
  return livekitSozu;
}
export function livekitHemen() { return livekitHazir; }

let zilSozu = null;
let zilHazir = null; // { ZIL_GELEN, ZIL_GIDEN }
export function zilYukle() {
  if (!zilSozu) zilSozu = import("./zilSesi").then((m) => { zilHazir = m; return m; }).catch((e) => { zilSozu = null; throw e; });
  return zilSozu;
}
export function zilHemen() { return zilHazir; }

// Açılış bitince (sayfa ekrana geldikten sonra) zil + canlı görüşme parçalarını sırayla, işlemciyi boğmadan yükle.
// (Harita parçası yukarıdaki webpackPrefetch ile boşta sadece indirilir; burada ÇALIŞTIRILMAZ — 1 MB'ı çalıştırmak takılma yapıyordu.)
let onYuklendi = false;
export function arkaPlandaOnYukle() {
  if (onYuklendi) return; onYuklendi = true;
  const bosta = (f) => { try { if (window.requestIdleCallback) return window.requestIdleCallback(f, { timeout: 4000 }); } catch (e) {} return setTimeout(f, 300); };
  setTimeout(() => {
    bosta(() => { zilYukle().catch(() => {}); });
    setTimeout(() => bosta(() => { livekitYukle().catch(() => {}); }), 1500);
  }, 2500);
}
