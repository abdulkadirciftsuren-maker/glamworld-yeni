/* GLOXORG servis çalışanı — bildirim göstermek için (Android Chrome new Notification() desteklemez,
   ServiceWorkerRegistration.showNotification() gerekir). Tam ekran/arka plan sekmede bildirim çıkar.
   SW_SURUM: her yayında ARTAR → tarayıcı yeni sw.js farkını görüp yeni sürümü kurar (eski önbellekte takılmaz). */
const SW_SURUM = "A13B294";
// ONBELLEK ADI SW_SURUM'e bağlı → her yeni yayında YENİ önbellek; eskisi activate'te silinir (eski sürümde takılma OLMAZ).
const ONBELLEK = "glox-onbellek-" + SW_SURUM;
// RESİM ÖNBELLEĞİ — SÜRÜMDEN BAĞIMSIZ (yeni yayında SİLİNMEZ) → indirilen fotoğraflar telefonda KALICI kalır,
// kaydırıp geri gelince internetten YENİDEN İNMEZ, anında yerelden gelir (sarı flaş/parlama biter). B262.
const RESIM_ONBELLEK = "glox-resim-v1";
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil((async () => {
  // SADECE ESKİ SÜRÜMLERİN önbelleğini sil; bu sürümünkini KORU (böylece hız için sakladıklarımız durur).
  try { const anahtarlar = await caches.keys(); await Promise.all(anahtarlar.filter((k) => k !== ONBELLEK && k !== RESIM_ONBELLEK).map((k) => caches.delete(k))); } catch (x) {}
  await self.clients.claim();
  // Yeni surum devraldi → acik sayfalara "yenile" haberi gonder (kullanici hep guncel gorur, elle yenilemesi gerekmez)
  try { const cl = await self.clients.matchAll({ type: "window", includeUncontrolled: true }); cl.forEach((c) => { try { c.postMessage({ tip: "sw-guncellendi", surum: SW_SURUM }); } catch (x) {} }); } catch (x) {}
})()); });

// RESİM ÖNBELLEĞİ sınırsız büyümesin — 350'yi geçince en ESKİ 80 kaydı sil (basit LRU).
async function resimBudama(c) {
  try { const anahtarlar = await c.keys(); if (anahtarlar.length > 350) { for (let i = 0; i < 80; i++) { await c.delete(anahtarlar[i]); } } } catch (x) {}
}

// FETCH stratejisi:
//  1) SAYFA GEZINMESI (index.html): ÖNCE AĞDAN (no-store) → her güncelleme ANINDA görünür; ağ yoksa önbelleğe düş.
//  2) AYNI SİTE + /static/ (hash'li JS/CSS/resim — içeriği ASLA değişmez): ÖNCE ÖNBELLEK → bir kez inip saklanır,
//     sonraki açılışlar ANINDA (5.3MB'ı her seferinde indirmez). Yeni yayında dosya adı(hash) değişir → yenisi inip saklanır.
//  3) Diğer her şey (Firebase, AI köprüsü, Google, dış istekler): DOKUNMA, normal aksın.
self.addEventListener("fetch", (e) => {
  const istek = e.request;
  if (istek.method !== "GET") return;
  let url; try { url = new URL(istek.url); } catch (x) { return; }
  if (istek.mode === "navigate") {
    e.respondWith((async () => {
      try { return await fetch(istek, { cache: "no-store" }); }
      catch (x) { const c = await caches.match(istek); return c || Response.error(); }
    })());
    return;
  }
  // RESİMLER (Firebase/Cloudinary/bayrak + <img> destination): KALICI ÖNBELLEK, "önce göster sonra tazele"
  // (stale-while-revalidate). Kaydırıp ekran dışına çıkan foto geri gelince AĞDAN yeniden İNMEZ → ANINDA yerelden
  // gelir (sarı flaş/parlama BİTER). Arka planda sessizce tazeler (foto güncellenirse bir sonrakinde yeni gelir).
  // ⛔ Range (video akışı) istekleri HARİÇ (onları bozmayalım) — sadece gerçek resimler.
  const resimMi = (istek.destination === "image") || /\.(jpe?g|png|webp|gif|avif|bmp)(\?|$)/i.test(url.pathname);
  if (resimMi && !istek.headers.has("range")) {
    e.respondWith((async () => {
      try {
        const c = await caches.open(RESIM_ONBELLEK);
        const bulunan = await c.match(istek);
        const agdan = fetch(istek).then((cevap) => {
          try { if (cevap && (cevap.ok || cevap.type === "opaque")) { c.put(istek, cevap.clone()).then(() => resimBudama(c)).catch(() => {}); } } catch (x) {}
          return cevap;
        }).catch(() => null);
        return bulunan || (await agdan) || Response.error();       // önbellekte varsa ANINDA; yoksa ağdan (ilk sefer)
      } catch (x) { const b = await caches.match(istek); return b || Response.error(); }
    })());
    return;
  }
  if (url.origin === self.location.origin && url.pathname.indexOf("/static/") !== -1) {
    e.respondWith((async () => {
      const bulunan = await caches.match(istek);
      if (bulunan) return bulunan;                                    // önbellekte varsa ANINDA ver
      try {
        const cevap = await fetch(istek);
        if (cevap && cevap.ok && cevap.type === "basic") {            // sadece geçerli, aynı-site cevabı sakla
          const kopya = cevap.clone();
          try { const c = await caches.open(ONBELLEK); await c.put(istek, kopya); } catch (x) {}
        }
        return cevap;
      } catch (x) { const c = await caches.match(istek); return c || Response.error(); }
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
