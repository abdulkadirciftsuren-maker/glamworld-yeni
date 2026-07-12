// GLOXORG — BİLDİRİM (PUSH) SUNUCU PROGRAMI
// Görev: Biri MESAJ atınca / BEĞENİNCE / YORUM yapınca / TEPKİ verince / ARADIĞINDA,
//        karşı tarafın telefonuna (site KAPALI olsa bile) Android/tarayıcı bildirimi gönderir.
// Çalışma: Firestore'a yeni "bildirimler" veya "aramalar" kaydı düşünce otomatik tetiklenir,
//          ilgili kişinin kayıtlı telefon anahtarlarına (fcmTokens) push yollar.
// KURULUM: Firebase Blaze planı gerekir. Bilgisayarda: firebase deploy --only functions

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();
setGlobalOptions({ maxInstances: 10 });

// Bir kullanıcının kayıtlı telefon anahtarlarını (fcmTokens) getir
async function tokenlariGetir(uid) {
  if (!uid) return [];
  try {
    const snap = await db.collection("kullanicilar").doc(uid).get();
    const d = snap.exists ? snap.data() : {};
    return Array.isArray(d.fcmTokens) ? d.fcmTokens.filter(Boolean) : [];
  } catch (e) { return []; }
}

// Push gönder (bir kullanıcının tüm cihazlarına) + geçersiz anahtarları temizle
async function pushGonder(uid, baslik, govde, veri) {
  const tokens = await tokenlariGetir(uid);
  if (!tokens.length) return;
  // SADECE-VERİ (data-only): bildirimi servis çalışanı (firebase-messaging-sw.js) kendi çizer → çift bildirim OLMAZ, tam kontrol.
  const veriTam = Object.assign({ baslik: String(baslik || "GLOXORG"), govde: String(govde || "") }, veri || {});
  const mesaj = {
    tokens,
    data: Object.fromEntries(Object.entries(veriTam).map(([k, v]) => [k, String(v)])),
    webpush: { headers: { Urgency: "high" }, fcmOptions: { link: "https://gloxorg.com/" } },
    android: { priority: "high" },
  };
  try {
    const res = await getMessaging().sendEachForMulticast(mesaj);
    // Artık geçersiz olan anahtarları listeden çıkar (uygulamayı silmiş/çıkmış cihazlar)
    const gecersiz = [];
    res.responses.forEach((r, i) => {
      if (!r.success) {
        const c = (r.error && r.error.code) || "";
        if (c === "messaging/registration-token-not-registered" || c === "messaging/invalid-argument" || c === "messaging/invalid-registration-token") {
          gecersiz.push(tokens[i]);
        }
      }
    });
    if (gecersiz.length) {
      const kalan = tokens.filter((t) => !gecersiz.includes(t));
      await db.collection("kullanicilar").doc(uid).set({ fcmTokens: kalan }, { merge: true });
    }
  } catch (e) { console.error("push hata:", e); }
}

// 1) GENEL BİLDİRİM — mesaj / beğeni / yorum / tepki / takip (hepsi "bildirimler" koleksiyonuna düşer)
exports.genelBildirim = onDocumentCreated("bildirimler/{id}", async (event) => {
  const b = event.data && event.data.data();
  if (!b || !b.aliciUid) return;
  const ad = b.gonderenAd || "Biri";
  let baslik = ad, govde = "";
  switch (b.tip) {
    case "mesaj": baslik = ad; govde = b.metin || "📷 Yeni mesaj"; break;
    case "begeni": govde = "gönderini beğendi ❤️"; break;
    case "yorum": govde = "gönderine yorum yaptı 💬"; break;
    case "takip": govde = "seni takip etmeye başladı ➕"; break;
    case "mesaj-tepki": govde = (b.metin || "mesajına tepki verdi"); break;
    default: govde = b.metin || "yeni bir bildirimin var"; break;
  }
  await pushGonder(b.aliciUid, baslik, String(govde).slice(0, 140), { tip: b.tip || "bildirim", gonderenUid: b.gonderenUid || "" });
});

// 2) ARAMA — biri seni arayınca ÇALAN bildirim (site kapalı olsa da)
exports.aramaBildirim = onDocumentCreated("aramalar/{id}", async (event) => {
  const a = event.data && event.data.data();
  if (!a || !a.arananUid) return;
  const ad = a.arayanAd || "Biri";
  const tip = a.tip === "goruntulu" ? "📹 Görüntülü arama" : "📞 Sesli arama";
  await pushGonder(a.arananUid, ad + " seni arıyor", tip, { tip: "arama", aramaId: event.params.id, arayanUid: a.arayanUid || "" });
});
