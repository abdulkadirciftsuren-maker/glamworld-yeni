// GLOXORG — BİLDİRİM (PUSH) SUNUCU PROGRAMI
// Görev: Biri MESAJ atınca / BEĞENİNCE / YORUM yapınca / TEPKİ verince / ARADIĞINDA,
//        karşı tarafın telefonuna (site KAPALI olsa bile) Android/tarayıcı bildirimi gönderir.
// Çalışma: Firestore'a yeni "bildirimler" veya "aramalar" kaydı düşünce otomatik tetiklenir,
//          ilgili kişinin kayıtlı telefon anahtarlarına (fcmTokens) push yollar.
// KURULUM: Firebase Blaze planı gerekir. Bilgisayarda: firebase deploy --only functions

const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { getStorage } = require("firebase-admin/storage");

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

// 3) 📞 KAPALIYKEN ARAMA ZİLİ (WhatsApp gibi) — SADECE YENİ TELEFON UYGULAMASINA gider (kullanicilar/{uid}.fcmTokensArama).
//    Bilgisayar/tarayıcı bu listeye HİÇ girmez → web'de "aramadan önce bildirim" (B170 şikâyeti) GERİ GELMEZ.
//    Uygulama ekrandaysa bildirimi uygulama göstermez (sayfa zaten çalıyor); kapalı/arka plandaysa telefon ZİL ÇALAR,
//    "Cevapla / Reddet" düğmeli tam ekran arama bildirimi çıkar. Arama bitince/reddedilince/açılınca "arama-bitti" ile susar.
// ÖNCELİK: hepsi ACİL (high). 9 Kas'ta "arama-bitti" normal önceliğe alınmıştı → ekranı kapalı telefona GEÇ ulaştı, arayan
//   kapatınca zil DURMADI (kullanıcı: "aramayı sonlandırıyorum ama zil sesi devam ediyor"). Google'ın "bildirimsiz acil haber"
//   cezası için çözüm uygulamada (açıkken gelen aramada sessiz kısa bildirim, 2.0.24) → burada öncelik DÜŞÜRÜLMEZ.
async function aramaPushGonder(uid, veri) {
  if (!uid) return;
  let tokens = [];
  try {
    const snap = await db.collection("kullanicilar").doc(uid).get();
    const d = snap.exists ? snap.data() : {};
    tokens = Array.isArray(d.fcmTokensArama) ? d.fcmTokensArama.filter(Boolean) : [];
  } catch (e) { tokens = []; }
  console.log(`[aramaPush] alici=${uid} | tip=${veri.tip} | uygulama anahtari=${tokens.length}`);
  if (!tokens.length) return;
  const data = {};
  Object.keys(veri).forEach((k) => {
    const v = veri[k];
    if (v === undefined || v === null) return;
    const s = String(v);
    if (s.length > 700 || s.slice(0, 5) === "data:") return; // FCM 4KB sınırı (base64 foto atılır)
    data[k] = s;
  });
  try {
    // ttl 40 sn: telefon o an internetsizse, sonradan "eski" bir arama için zil ÇALMASIN.
    const res = await getMessaging().sendEachForMulticast({ tokens, data, android: { priority: "high", ttl: 40000 } });
    console.log(`[aramaPush] basarili=${res.successCount}, basarisiz=${res.failureCount}`);
    const gecersiz = [];
    res.responses.forEach((r, i) => {
      const c = (!r.success && r.error && r.error.code) || "";
      if (c === "messaging/registration-token-not-registered" || c === "messaging/invalid-argument" || c === "messaging/invalid-registration-token") gecersiz.push(tokens[i]);
    });
    if (gecersiz.length) await db.collection("kullanicilar").doc(uid).set({ fcmTokensArama: tokens.filter((t) => !gecersiz.includes(t)) }, { merge: true });
  } catch (e) { console.error("aramaPush hata:", e); }
}

exports.aramaZili = onDocumentCreated("aramalar/{id}", async (event) => {
  const a = event.data && event.data.data();
  if (!a || a.durum !== "calliyor" || !a.arananUid || a.arananUid === a.arayanUid) return;
  const video = a.tip === "goruntulu";
  await aramaPushGonder(a.arananUid, {
    tip: "arama-gelen",
    aramaId: event.params.id,
    arayanAd: a.arayanAd || "GLOXORG",
    aramaTip: video ? "goruntulu" : "sesli",
    baslik: a.arayanAd || "GLOXORG",
    govde: video ? "📹 Görüntülü arıyor…" : "📞 Sesli arıyor…",
    foto: a.arayanFoto || "",
    // ⏱️ SUNUCU SAATİ (8 Kas — kullanıcı: "Oppo'dan S25'i arayınca kapalı telefonda çalmıyor, bilgisayardan çalıyor"):
    //   eskiden ARAYAN telefonun kendi saati (a.zamanMs) yollanıyordu; uygulama 60 sn'den "eski" aramayı çalmıyor → arayan
    //   telefonun saati 1 dk'dan fazla kaymışsa YENİ arama "eski" sanılıp hiç çalmıyordu. Bu kod arama oluştuğu an çalışır,
    //   sunucu saati internet saatidir → hangi telefon ararsa arasın doğru.
    zamanMs: Date.now(),
  });
});

// Arama "çalıyor"dan çıktı (açıldı / reddedildi / arayan vazgeçti) → aranan telefonun zili SUSSUN.
exports.aramaZiliSustur = onDocumentUpdated("aramalar/{id}", async (event) => {
  const once = event.data && event.data.before && event.data.before.data();
  const sonra = event.data && event.data.after && event.data.after.data();
  if (!once || !sonra || once.durum !== "calliyor" || sonra.durum === "calliyor") return;
  await aramaPushGonder(once.arananUid, { tip: "arama-bitti", aramaId: event.params.id });
});

// Çalarken kayıt silindiyse (eski/takılı arama temizliği) → zil sussun.
exports.aramaZiliSilindi = onDocumentDeleted("aramalar/{id}", async (event) => {
  const a = event.data && event.data.data();
  if (!a || a.durum !== "calliyor") return;
  await aramaPushGonder(a.arananUid, { tip: "arama-bitti", aramaId: event.params.id });
});

// ===================================================================================================================
// 🎬 VİDEO ÇEVİRİCİ (10 Kas 2026 — kullanıcı onayı: "Evet, videoları çevir, onay veriyorum").
//   Sorun: yeni telefonlar videoyu HEVC 10-bit HDR (HLG) çekiyor; Redmi gibi telefonların tarayıcısı bu biçimi ÇÖZEMİYOR
//   (sarı perde, oynamıyor), S25 geç açıyor; dosyalar da çok büyük (99 MB). Çözüm: paylaşımdaki video HEVC / çok büyük /
//   1280 pikselden büyükse sunucu onu HER TELEFONUN açabildiği H.264 720p'ye çevirir (HDR renkleri ton eşlemeyle doğru
//   dönüştürülür), yeni dosyayı paylaşıma bağlar. ORİJİNAL DOSYA SİLİNMEZ (paylaşımda videoOrijinal alanında kayıtlı).
//   Kontrol edilen ve sorunsuz bulunan video "videoKontrol" ile işaretlenir → bir daha bakılmaz.
const KOVA = "glamworld2.firebasestorage.app";
const { spawn } = require("child_process");
const os = require("os");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function calistir(bin, args) {
  return new Promise((ok, no) => {
    const p = spawn(bin, args);
    let cikti = "", hata = "";
    p.stdout.on("data", (d) => { cikti += d; });
    p.stderr.on("data", (d) => { hata += d; if (hata.length > 20000) hata = hata.slice(-8000); });
    p.on("error", no);
    p.on("close", (k) => (k === 0 ? ok(cikti) : no(new Error("kod " + k + ": " + hata.slice(-600)))));
  });
}
function depoYolu(url) {
  if (!url || url.indexOf(KOVA) < 0) return null;
  const m = /\/o\/([^?]+)/.exec(url);
  return m ? decodeURIComponent(m[1]) : null;
}
// Video gerekiyorsa çevirir → yeni adres; gerekmiyorsa "" döner.
async function videoyuCevir(url) {
  const yol = depoYolu(url);
  if (!yol || /_h264\.mp4$/.test(yol)) return "";
  const ffmpeg = require("ffmpeg-static");
  const ffprobe = require("ffprobe-static").path;
  const kova = getStorage().bucket(KOVA);
  const kaynak = kova.file(yol);
  const [meta] = await kaynak.getMetadata();
  const boyut = Number(meta.size || 0);
  const ad = crypto.randomBytes(6).toString("hex");
  const giris = path.join(os.tmpdir(), "glox-" + ad + ".in");
  const cikis = path.join(os.tmpdir(), "glox-" + ad + ".mp4");
  try {
    await kaynak.download({ destination: giris });
    const bilgi = JSON.parse(await calistir(ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height,color_transfer", "-of", "json", giris]));
    const v = (bilgi.streams && bilgi.streams[0]) || {};
    const enUzun = Math.max(Number(v.width || 0), Number(v.height || 0));
    const gerek = v.codec_name !== "h264" || enUzun > 1280 || boyut > 20 * 1024 * 1024;
    console.log(`[videoCevir] ${yol} | ${v.codec_name} ${v.width}x${v.height} ${v.color_transfer || ""} | ${Math.round(boyut / 1048576)} MB | cevrilecek=${gerek}`);
    if (!gerek) return "";
    // Boyutlar ÇİFT sayı olmalı (H.264 tek sayıyı kabul etmez — 987 px yükseklikli Ayna klipleri bu yüzden çevrilemiyordu)
    const olcek = "scale=w='if(gte(iw,ih),trunc(min(iw,1280)/2)*2,-2)':h='if(gte(iw,ih),-2,trunc(min(ih,1280)/2)*2)'";
    const hdr = /arib-std-b67|smpte2084/.test(v.color_transfer || "");
    const tonEsle = "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv," + olcek + ",format=yuv420p";
    const duz = olcek + ",format=yuv420p";
    const kodla = (vf) => calistir(ffmpeg, ["-v", "error", "-y", "-i", giris, "-map", "0:v:0", "-map", "0:a:0?", "-vf", vf,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "25", "-profile:v", "high", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", cikis]);
    try { await kodla(hdr ? tonEsle : duz); }
    catch (e) { if (!hdr) throw e; console.log("[videoCevir] ton eşleme olmadı, düz çeviriliyor:", e.message); await kodla(duz); }
    const yeniYol = yol.replace(/\.[A-Za-z0-9]+$/, "") + "_h264.mp4";
    const anahtar = crypto.randomUUID();
    await kova.upload(cikis, { destination: yeniYol, metadata: { contentType: "video/mp4", cacheControl: "public,max-age=31536000", metadata: { firebaseStorageDownloadTokens: anahtar, gloxKaynak: yol } } });
    const yeni = `https://firebasestorage.googleapis.com/v0/b/${KOVA}/o/${encodeURIComponent(yeniYol)}?alt=media&token=${anahtar}`;
    console.log(`[videoCevir] TAMAM ${yol} → ${yeniYol} | ${Math.round(fs.statSync(cikis).size / 1048576)} MB`);
    return yeni;
  } finally {
    try { fs.unlinkSync(giris); } catch (e) {}
    try { fs.unlinkSync(cikis); } catch (e) {}
  }
}

exports.videoCevir = onDocumentWritten({ document: "gonderiler/{id}", memory: "2GiB", cpu: 2, timeoutSeconds: 540, maxInstances: 3 }, async (event) => {
  const sonra = event.data && event.data.after && event.data.after.exists ? event.data.after.data() : null;
  if (!sonra || !sonra.video || typeof sonra.video !== "string") return;
  if (sonra.videoKontrol === sonra.video) return; // bu video zaten kontrol edildi / çevrildi
  const ref = event.data.after.ref;
  const eski = sonra.video;
  let yeni = "";
  try { yeni = await videoyuCevir(eski); }
  catch (e) { console.error("[videoCevir] HATA", event.params.id, e.message); return; } // bir sonraki güncellemede tekrar denenir
  await db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    if (!s.exists || s.get("video") !== eski) return; // bu arada video değiştiyse dokunma
    if (yeni) tx.update(ref, { video: yeni, videoOrijinal: eski, videoKontrol: yeni });
    else tx.update(ref, { videoKontrol: eski });
  });
});


// 🎥 CANLI DERS (B474) — biri canlı yayın açınca TAKİPÇİLERİNE "X şu an canlı yayında" bildirimi (en çok 400 kişi).
exports.canliYayinBildirim = onDocumentCreated("canliYayinlar/{id}", async (event) => {
  const y = event.data && event.data.data();
  if (!y || !y.yayinciUid || y.durum !== "canli") return;
  let takipciler = [];
  try {
    const s = await db.collection("takipler").where("hedefUid", "==", y.yayinciUid).limit(400).get();
    takipciler = s.docs.map((d) => d.get("takipciUid")).filter((u) => u && u !== y.yayinciUid);
  } catch (e) { console.error("[canliYayin] takipci okunamadi:", e); return; }
  console.log(`[canliYayin] yayin=${event.params.id} | takipci=${takipciler.length}`);
  const govde = "🔴 şu an canlı yayında" + (y.baslik ? ": " + String(y.baslik).slice(0, 80) : "") + " — izlemek için dokun";
  for (let i = 0; i < takipciler.length; i += 20) {
    await Promise.all(takipciler.slice(i, i + 20).map((u) => pushGonder(u, y.ad || "GLOXORG", govde, { tip: "canli", yayinId: event.params.id, foto: y.foto || "" })));
  }
});
