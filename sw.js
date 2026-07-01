/* GLOXORG servis çalışanı — bildirim göstermek için (Android Chrome new Notification() desteklemez,
   ServiceWorkerRegistration.showNotification() gerekir). Tam ekran/arka plan sekmede bildirim çıkar. */
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });

// Push (FCM/sunucu bağlanınca uygulama TAM KAPALIYKEN de çalışır — şu an hazır temel)
self.addEventListener("push", (e) => {
  let veri = {};
  try { veri = e.data ? e.data.json() : {}; } catch (x) { veri = { title: "GLOXORG", body: e.data && e.data.text() }; }
  const baslik = veri.title || "GLOXORG";
  e.waitUntil(self.registration.showNotification(baslik, {
    body: veri.body || "", icon: veri.icon || "/glamworld-yeni/logo192.png",
    badge: "/glamworld-yeni/logo192.png", tag: "grox-bildirim",
  }));
});

// Bildirime dokununca uygulamayı aç/öne getir
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((liste) => {
    for (const c of liste) { if ("focus" in c) return c.focus(); }
    if (self.clients.openWindow) return self.clients.openWindow("/glamworld-yeni/");
  }));
});
