/* GLOXORG — FCM (push bildirim) servis çalışanı.
   Görev: Site KAPALIYKEN bile, sunucudan gelen push'u yakalayıp telefonda bildirim gösterir
   (mesaj/beğeni/yorum/tepki/arama). Arama bildirimi "Aç / Reddet" düğmeleriyle ve kalıcı (requireInteraction) çıkar. */
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBMMMMcHl5IGsUc7k6n5vLvSn_vNruKspw",
  authDomain: "glamworld2.firebaseapp.com",
  projectId: "glamworld2",
  storageBucket: "glamworld2.firebasestorage.app",
  messagingSenderId: "656498925104",
  appId: "1:656498925104:web:2b684fa8f2eafab97b57f5",
});

const messaging = firebase.messaging();

// Arka planda push gelince (site kapalı/arka planda) → bildirimi ÇİZ
messaging.onBackgroundMessage((payload) => {
  const d = (payload && payload.data) || {};
  const arama = d.tip === "arama";
  const baslik = d.baslik || "GLOXORG";
  const secenekler = {
    body: d.govde || "",
    // BÜYÜK İKON = GÖNDERENİN/ARAYANIN fotoğrafı (varsa kısa http URL; sunucu base64'ü FCM'e sığmadığından atıyor → yoksa logo).
    // Böylece bildirimde artık GLOXORG amblemi (G) değil, ARAYANIN fotoğrafı görünür.
    icon: (d.foto && d.foto.indexOf("http") === 0) ? d.foto : "/logo192.png",
    badge: "/logo192.png",              // küçük rozet: uygulama amblemi (Android tek renk yapar)
    // BENZERSİZ tag → normal bildirimler üst üste binmez, her biri ayrı gelir (arama tek tag'de kalır ki tekrar çalsın)
    tag: arama ? "grox-arama" : ("grox-" + Date.now() + "-" + Math.round(Math.random() * 1e6)),
    renotify: arama,
    data: d,
    requireInteraction: arama,           // arama bildirimi kendiliğinden kapanmasın (kullanıcı cevaplasın)
    vibrate: arama ? [400, 200, 400, 200, 400] : [200, 100, 200],
  };
  if (arama) secenekler.actions = [{ action: "ac", title: "📞 Aç" }, { action: "reddet", title: "Reddet" }];
  return self.registration.showNotification(baslik, secenekler);
});

// Bildirime (veya "Aç"a) dokununca → uygulamayı aç/öne getir. "Reddet" → sadece kapat.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  if (e.action === "reddet") return;
  e.waitUntil((async () => {
    const liste = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of liste) { if ("focus" in c) { try { await c.focus(); return; } catch (x) {} } }
    if (self.clients.openWindow) return self.clients.openWindow("/");
  })());
});
