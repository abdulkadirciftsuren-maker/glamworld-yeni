/* GLOXORG servis çalışanı — bildirim göstermek için (Android Chrome new Notification() desteklemez,
   ServiceWorkerRegistration.showNotification() gerekir). Tam ekran/arka plan sekmede bildirim çıkar.
   SW_SURUM: her yayında ARTAR → tarayıcı yeni sw.js farkını görüp yeni sürümü kurar (eski önbellekte takılmaz). */
const SW_SURUM = "B132";
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil((async () => {
  // Eski onbellekleri temizle (kullanici bir daha ESKI surumde takilmasin)
  try { const anahtarlar = await caches.keys(); await Promise.all(anahtarlar.map((k) => caches.delete(k))); } catch (x) {}
  await self.clients.claim();
  // Yeni surum devraldi → acik sayfalara "yenile" haberi gonder (kullanici hep guncel gorur, elle yenilemesi gerekmez)
  try { const cl = await self.clients.matchAll({ type: "window", includeUncontrolled: true }); cl.forEach((c) => { try { c.postMessage({ tip: "sw-guncellendi", surum: SW_SURUM }); } catch (x) {} }); } catch (x) {}
})()); });

// SAYFA GEZINMESI icin ONCE AGDAN getir (index.html asla onbellekte takilmasin → her guncelleme ANINDA gorunur).
// Cevrimdisi/hata olursa tarayici onbellegine dus. Diger istekler (hash'li JS/CSS) normal akisla gider.
self.addEventListener("fetch", (e) => {
  const istek = e.request;
  if (istek.mode === "navigate") {
    e.respondWith((async () => {
      try { return await fetch(istek, { cache: "no-store" }); }
      catch (x) { const c = await caches.match(istek); return c || Response.error(); }
    })());
  }
});

// Push (FCM/sunucu bağlanınca uygulama TAM KAPALIYKEN de çalışır — şu an hazır temel)
self.addEventListener("push", (e) => {
  let veri = {};
  try { veri = e.data ? e.data.json() : {}; } catch (x) { veri = { title: "GLOXORG", body: e.data && e.data.text() }; }
  const baslik = veri.title || "GLOXORG";
  e.waitUntil(self.registration.showNotification(baslik, {
    body: veri.body || "", icon: veri.icon || "logo192.png",
    badge: "logo192.png", tag: "grox-bildirim",
  }));
});

// Bildirime dokununca uygulamayı aç/öne getir
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((liste) => {
    for (const c of liste) { if ("focus" in c) return c.focus(); }
    if (self.clients.openWindow) return self.clients.openWindow("./");
  }));
});
