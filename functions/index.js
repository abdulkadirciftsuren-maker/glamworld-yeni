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
  console.log(`[pushGonder] alici=${uid} | bulunan token sayisi=${tokens.length} | baslik="${baslik}" | govde="${govde}"`);
  if (!tokens.length) { console.log(`[pushGonder] ${uid} icin KAYITLI TOKEN YOK -> bildirim gonderilmedi (kullanici bildirim iznini/anahtarini kaydetmemis olabilir)`); return; }
  // SADECE-VERİ (data-only): bildirimi servis çalışanı kendi çizer → çift bildirim OLMAZ, tam kontrol.
  const veriTam = Object.assign({ baslik: String(baslik || "GLOXORG"), govde: String(govde || "") }, veri || {});
  // ÖNEMLİ: FCM data limiti ~4KB. Profil fotoğrafı "data:" (base64, ~50KB) olabiliyor → sığmayıp bildirim HİÇ gitmiyordu.
  // ÇOK UZUN ya da "data:" ile başlayan alanları AT (özellikle foto) → bildirim GARANTİ gider. (Kısa http foto URL'si kalır.)
  Object.keys(veriTam).forEach((k) => {
    const v = veriTam[k];
    if (typeof v === "string" && (v.length > 700 || v.slice(0, 5) === "data:")) { delete veriTam[k]; }
  });
  const mesaj = {
    tokens,
    data: Object.fromEntries(Object.entries(veriTam).map(([k, v]) => [k, String(v)])),
    webpush: { headers: { Urgency: "high" }, fcmOptions: { link: "https://gloxorg.com/" } },
    android: { priority: "high" },
  };
  try {
    const res = await getMessaging().sendEachForMulticast(mesaj);
    console.log(`[pushGonder] GONDERILDI -> basarili=${res.successCount}, basarisiz=${res.failureCount}`);
    res.responses.forEach((r, i) => { if (!r.success) console.log(`  token[${i}] HATA: ${r.error && r.error.code} | ${r.error && r.error.message}`); });
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

// 1) GENEL BİLDİRİM — mesaj / beğeni / yorum / tepki / takip + CEVAPSIZ ARAMA (hepsi "bildirimler" koleksiyonuna düşer)
exports.genelBildirim = onDocumentCreated("bildirimler/{id}", async (event) => {
  const b = event.data && event.data.data();
  console.log(`[genelBildirim] yeni bildirim: tip=${b && b.tip} | aliciUid=${b && b.aliciUid} | gonderenAd=${b && b.gonderenAd}`);
  if (!b || !b.aliciUid) { console.log("[genelBildirim] aliciUid yok -> atlandi"); return; }
  const ad = b.gonderenAd || "Biri";
  let baslik = ad, govde = "";
  switch (b.tip) {
    case "mesaj": baslik = ad; govde = b.metin || "📷 Yeni mesaj"; break;
    case "begeni": govde = "gönderini beğendi ❤️"; break;
    case "yorum": govde = "gönderine yorum yaptı 💬"; break;
    case "takip": govde = "seni takip etmeye başladı ➕"; break;
    case "mesaj-tepki": govde = (b.metin || "mesajına tepki verdi"); break;
    // ⛔ CEVAPSIZ ARAMA (kullanıcı isteği): arama ANINDA DEĞİL, karşı taraf CEVAP VERMEYİNCE gönderilir → "X seni aradı, geri ara".
    case "arama-cevapsiz": govde = (b.metin || "seni aradı 📞 — geri aramak için dokun"); break;
    default: govde = b.metin || "yeni bir bildirimin var"; break;
  }
  await pushGonder(b.aliciUid, baslik, String(govde).slice(0, 140), { tip: b.tip || "bildirim", gonderenUid: b.gonderenUid || "", foto: b.gonderenFoto || "" });
});

// 2) ⛔ ARAMA ANINDA PUSH KALDIRILDI (kullanıcı: "aramadan ÖNCE bildirim geliyor 'cevap ver' diyor — bu yanlış; zaten arama ekranı
//    geliyor, kime cevap vereyim? Bildirim sadece CEVAP VERİLMEZSE gelsin, 'seni aradı geri ara' diye").
//    Artık arama gelince SADECE uygulama-içi arama EKRANI gelir (Firestore listener); telefon push'u yalnızca CEVAPSIZ kalınca
//    "arama-cevapsiz" bildirimiyle (yukarıdaki genelBildirim) gider. Eski onDocumentCreated("aramalar/{id}") push'u KALDIRILDI.
