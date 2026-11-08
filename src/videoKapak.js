// 🎬 VİDEO KAPAĞI KORUMASI (B460) — kullanıcı: "videoların üstünde gri perde + büyük siyah oynat işareti çıkıyor, ana sayfada
// çıkıp kayboluyor". Sebep: Android uygulama penceresi (WebView), kapak resmi (poster) OLMAYAN her videoya KENDİ gri
// "oynat" resmini koyuyor. Bizim kodumuz değil. ÇÖZÜM: kapaksız her <video>'ya görünmez (şeffaf) kapak verilir → altın zemin
// görünür; video bilgisi gelince durdurulmuş videolar ilk kareye kaydırılır → kutuda videonun GERÇEK görüntüsü çıkar.
// Bütün sayfalarda (akış, profil, Reels, sohbet, Akademi...) tek yerden çalışır.
export const SEFFAF_KAPAK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function kapakVer(v) {
  try { if (!v.getAttribute("poster")) v.setAttribute("poster", SEFFAF_KAPAK); } catch (e) {}
}

if (typeof document !== "undefined" && typeof MutationObserver !== "undefined") {
  // Video bilgisi (süre/boyut) gelince: duruyor, kendiliğinden oynamayacak ve en baştaysa → ilk kareye kaydır (kare çizilsin)
  document.addEventListener("loadedmetadata", (e) => {
    const v = e.target;
    try {
      if (!v || v.tagName !== "VIDEO" || v.srcObject) return;
      if (v.getAttribute("poster") !== SEFFAF_KAPAK) return; // gerçek kapağı olan videoya dokunma
      if (v.autoplay || !v.paused || v.currentTime > 0.05) return;
      const hedef = (v.duration && isFinite(v.duration)) ? Math.min(0.12, v.duration / 2) : 0.12;
      v.currentTime = hedef;
    } catch (x) {}
  }, true);

  const gozcu = new MutationObserver((liste) => {
    for (const m of liste) {
      if (m.type === "attributes") { if (m.target.tagName === "VIDEO") kapakVer(m.target); continue; }
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.tagName === "VIDEO") kapakVer(n);
        else if (n.querySelectorAll) n.querySelectorAll("video:not([poster])").forEach(kapakVer);
      }
    }
  });
  gozcu.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["poster"] });
}
