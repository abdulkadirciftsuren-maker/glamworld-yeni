/* GLOXORG servis çalışanı — bildirim göstermek için (Android Chrome new Notification() desteklemez,
   ServiceWorkerRegistration.showNotification() gerekir). Tam ekran/arka plan sekmede bildirim çıkar.
   SW_SURUM: her yayında ARTAR → tarayıcı yeni sw.js farkını görüp yeni sürümü kurar (eski önbellekte takılmaz). */
const SW_SURUM = "A12B82";
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

// PUSH — sunucudan (FCM) gelen bildirimi TAM KAPALIYKEN bile gösterir (mesaj/beğeni/yorum/tepki/arama).
// FCM verisi farklı biçimlerde gelebilir: { notification:{title,body}, data:{...} } VEYA data-only { baslik, govde, tip }.
// Hepsini defansif oku ki her durumda bildirim çıksın.
self.addEventListener("push", (e) => {
  let veri = {};
  try { veri = e.data ? e.data.json() : {}; } catch (x) { try { veri = { govde: e.data && e.data.text() }; } catch (y) { veri = {}; } }
  const n = veri.notification || {};
  const d = veri.data || veri;
  const arama = (d && d.tip === "arama");
  const baslik = n.title || veri.title || (d && d.baslik) || "GLOXORG";
  const govde = n.body || veri.body || (d && d.govde) || "";
  const secenek = {
    body: govde,
    icon: (d && d.foto) || "logo192.png", badge: "logo192.png",  // varsa GÖNDERENİN fotoğrafı (sunucu gönderince); yoksa logo
    // ÖNEMLİ: normal bildirimlerde BENZERSİZ tag → her biri AYRI gelir ve SES/TİTREŞİM çıkarır (eskiden aynı "grox-bildirim" tag'i yüzünden sessizce üst üste biniyorlardı).
    tag: arama ? "grox-arama" : ("grox-" + Date.now() + "-" + Math.round(Math.random() * 1e6)),
    data: d || {},
    requireInteraction: !!arama,                        // arama bildirimi kendiliğinden kapanmasın (cevaplansın)
    renotify: !!arama,                                  // arama aynı tag'le tekrar gelirse yine uyarsın
    silent: false,                                      // AÇIKÇA sesli (sistem bildirim sesi çalsın)
    vibrate: arama ? [500, 250, 500, 250, 500] : [300, 150, 300],
  };
  if (arama) secenek.actions = [{ action: "ac", title: "📞 Aç" }, { action: "reddet", title: "Reddet" }];
  e.waitUntil(self.registration.showNotification(baslik, secenek));
});

// Bildirime (veya "Aç"a) dokununca uygulamayı aç/öne getir; "Reddet" → sadece kapat.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  if (e.action === "reddet") return;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((liste) => {
    for (const c of liste) { if ("focus" in c) return c.focus(); }
    if (self.clients.openWindow) return self.clients.openWindow("./");
  }));
});
