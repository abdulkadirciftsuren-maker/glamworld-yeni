import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n'; // çoklu dil sistemi (i18next) — uygulama açılışında başlar
import App from './App';
import reportWebVitals from './reportWebVitals';

// ⛔ TARAYICIYA MÜDAHALE YOK: reload YOK, cache/SW silme YOK, geçmiş tamponu YOK.
// Routing tamamen hafızada (App.js MemoryRouter) — Chrome geçmişine dokunmaz.
// Yeni sürüm otomatik gelir: hash'li dosya isimleri + index.html no-cache meta.

// ================= KALICI DEPOLAMA (kullanıcı: "her açılışta AYARLAR siliniyor, gene GİRİŞ istiyor, dil Rusça oluyor") =================
// GERÇEK SEBEP: Android/Chrome, telefonda YER AZALINCA "kalıcı" işaretlenmemiş sitelerin verisini SİLER:
//   IndexedDB (= Firebase GİRİŞ bilgisi) + localStorage (= TÜM ayarlar, seçili DİL, feed önbelleği). Silinince →
//   giriş gider (tekrar giriş sorar), ayarlar sıfırlanır, bildirim izni YENİDEN sorulur, dil otomatiğe dönüp
//   (Rusça vb.) gösterir. Bu yüzden "her açılışta her şey siliniyor" oluyordu.
// ÇÖZÜM (KISITLAMA DEĞİL — tam tersi, veriyi KORUR): tarayıcıdan verimizi SİLMEMESİNİ iste.
//   (Ana ekrana eklenmiş/yüklenmiş uygulamada çoğu zaman kendiliğinden ONAYLANIR; normal sekmede de zarar vermez.)
try {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persisted()
      .then((zatenKalici) => { if (!zatenKalici) { try { navigator.storage.persist().catch(() => {}); } catch (e) {} } })
      .catch(() => { try { navigator.storage.persist().catch(() => {}); } catch (e) {} });
  }
} catch (e) {}

// ================= OTOMATİK KURTARMA (kullanıcı: "sayfa bazen boş sarı kalıyor, silip yeniden yüklemem lazım") =================
// SEBEP: bir JS çökmesi ya da bir "parça" (chunk: hash'li js/css) yüklenemezse (yeni sürüm yayınlanınca eski sayfa eski parçayı
//   ararsa) uygulama boş kalıyordu ve KENDİNİ TOPARLAMIYORDU. Çözüm: böyle bir hatada sayfayı BİR KEZ otomatik yenile
//   (kapat-aç ile aynı etki) → boş kalmaz. Döngüye girmesin diye 20 sn kilidi var; toparlanmazsa altın "Yeniden Yükle" ekranı gösterilir.
const _KURTARMA_ANAHTAR = "gloxSonKurtarma";
function _chunkHatasiMi(msg) {
  const s = String((msg && msg.message) || msg || "");
  return /ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module|Failed to fetch dynamically|Importing a module script failed/i.test(s);
}
function _kurtar() {
  try {
    const son = parseInt(sessionStorage.getItem(_KURTARMA_ANAHTAR) || "0", 10);
    if (Date.now() - son < 20000) return false; // 20 sn içinde zaten denedik → sonsuz döngü YOK
    sessionStorage.setItem(_KURTARMA_ANAHTAR, String(Date.now()));
    // ⛔ BOZUK/ESKİ ÖNBELLEĞİ TEMİZLE (kullanıcı: "kaydırınca silinip yükleniyor, ayarlar sıfırlanıyor" — telefonda
    //   ESKİ sürüm takılı kalıp sürekli çöküyordu). Önbellekleri + servis çalışanını temizleyip TEMİZ yükle →
    //   eski bozuk sürümden KESİN çıkar, en güncel sürüm gelir. (Bir sonraki temiz açılışta SW tekrar kaydolur.)
    const bitir = () => { try { window.location.reload(); } catch (e) {} };
    let bekle = 0; const belki = () => { bekle--; if (bekle <= 0) bitir(); };
    try { if (window.caches && caches.keys) { bekle++; caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))).catch(() => {}).finally(belki); } } catch (e) {}
    try { if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) { bekle++; navigator.serviceWorker.getRegistrations().then((rs) => Promise.all(rs.map((r) => r.unregister()))).catch(() => {}).finally(belki); } } catch (e) {}
    if (bekle === 0) bitir(); else setTimeout(bitir, 2500); // en fazla 2.5 sn bekle, yine de yenile (takılmasın)
    return true;
  } catch (e) { try { window.location.reload(); } catch (x) {} return false; }
}
try {
  // Parça (script/stylesheet) yüklenemezse (capture: kaynak hataları böyle yakalanır) → otomatik yenile
  window.addEventListener("error", (e) => {
    const hedef = e && e.target;
    if (hedef && (hedef.tagName === "SCRIPT" || hedef.tagName === "LINK")) { _kurtar(); return; }
    if (e && _chunkHatasiMi(e.message)) _kurtar();
  }, true);
  // Yakalanmamış söz reddi (dinamik import başarısız vb.) → chunk hatasıysa otomatik yenile
  window.addEventListener("unhandledrejection", (e) => { if (e && _chunkHatasiMi(e.reason)) _kurtar(); });
} catch (x) {}

// ÜST DÜZEY HATA SINIRI — bir render çökmesi TÜM sayfayı boş bırakmasın: bir kez otomatik yenile; olmazsa altın kurtarma ekranı.
class KokHataSiniri extends React.Component {
  constructor(p) { super(p); this.state = { hata: false, mesaj: "" }; }
  static getDerivedStateFromError(err) { return { hata: true, mesaj: (err && (err.message || String(err))) || "" }; }
  componentDidCatch(err) {
    // Hata detayını sakla (kurtarma ekranında küçük gösterilir → tekrar çökerse sebebi görülür)
    try { this._detay = (((err && err.stack) || "").split("\n").slice(0, 4).join(" | ")).slice(0, 300); } catch (e) { this._detay = ""; }
    // Çökünce BİR KEZ otomatik yenile (kilitli). Kilit doluysa (tekrar çöktü) ekran görünür kalır → hata okunabilir.
    if (!_kurtar()) { /* zaten yakın zamanda denendi → kurtarma ekranı görünür kalsın */ }
  }
  render() {
    if (this.state.hata) {
      return React.createElement("div", {
        style: { position: "fixed", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", padding: "24px", textAlign: "center",
          background: "radial-gradient(circle at 50% 40%, #ffe9a8, #ffd54a 60%, #e0b000)", color: "#4a3500", fontFamily: "inherit" }
      },
        React.createElement("div", { style: { fontSize: "40px" } }, "💎"),
        React.createElement("div", { style: { fontSize: "18px", fontWeight: 800, maxWidth: "320px", lineHeight: 1.4 } }, "Küçük bir aksaklık oldu. Sayfa yenileniyor…"),
        React.createElement("button", {
          onClick: () => { try { sessionStorage.removeItem(_KURTARMA_ANAHTAR); } catch (e) {} try { window.location.reload(); } catch (e) {} },
          style: { border: "none", borderRadius: "14px", padding: "14px 26px", fontSize: "16px", fontWeight: 900, cursor: "pointer",
            background: "linear-gradient(180deg,#fff7d6,#ffd700 60%,#c79a17)", color: "#3a2a00", boxShadow: "0 6px 18px rgba(120,90,0,.4)" }
        }, "Yeniden Yükle"),
        // HATA DETAYI (küçük) — geliştiriciye yardım için; kullanıcı ekran görüntüsü alıp iletebilir
        (this.state.mesaj || this._detay) ? React.createElement("div", {
          style: { marginTop: "10px", maxWidth: "340px", fontSize: "11px", lineHeight: 1.35, color: "#6a4e00", opacity: 0.85, wordBreak: "break-word", fontFamily: "monospace" }
        }, "hata: " + (this.state.mesaj || "") + (this._detay ? (" — " + this._detay) : "")) : null
      );
    }
    return this.props.children;
  }
}

// UYGULAMAYI YÜKLE (PWA "Ana ekrana ekle"): tarayıcı hazır olunca beforeinstallprompt tetiklenir —
// olayı ERKEN yakalayıp sakla ki Davet penceresindeki "Uygulamayı yükle" düğmesi çalışsın.
try {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.__groxKurPrompt = e;
    try { window.dispatchEvent(new Event('grox-kurulabilir')); } catch (x) {}
  });
  window.addEventListener('appinstalled', () => {
    window.__groxKurPrompt = null;
    try { window.dispatchEvent(new Event('grox-kurulabilir')); } catch (x) {}
  });
} catch (x) {}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<KokHataSiniri><App /></KokHataSiniri>);
reportWebVitals();
