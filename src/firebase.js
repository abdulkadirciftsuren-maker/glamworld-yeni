// GLOXORG — Firebase bağlantısı (gerçek arka yüz: veritabanı + giriş)
// Bu dosya sitenin "beyni"dir: Üye Ol → veriler buraya kaydedilir,
// Giriş Yap → buradan doğrulanır. Anahtar genel web kimliğidir (gizli şifre değil).
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { getAI, getGenerativeModel, GoogleAIBackend, VertexAIBackend, ResponseModality } from "firebase/ai";

const firebaseConfig = {
  apiKey: "AIzaSyBMMMMcHl5IGsUc7k6n5vLvSn_vNruKspw",
  authDomain: "glamworld2.firebaseapp.com",
  projectId: "glamworld2",
  storageBucket: "glamworld2.firebasestorage.app",
  messagingSenderId: "656498925104",
  appId: "1:656498925104:web:2b684fa8f2eafab97b57f5",
  measurementId: "G-PT7KC15D51",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// Oturum KALICI: tarayıcı kapanıp açılsa / sayfa yenilense / arka plandan dönülse bile
// site seni hatırlar (yeniden giriş istemez, kartlara atmaz).
setPersistence(auth, browserLocalPersistence).catch(() => {});
export const db = getFirestore(app);
// VİDEO/büyük dosya deposu (Firestore 1MB sınırına takılmadan video yüklenir)
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
// Google'a basınca DÜZ "e-posta gir" değil, HESAP SEÇME penceresi çıksın:
// kullanıcı kendi Google hesabını görür/seçer (veya "başka hesap"). Eskiden olduğu gibi.
googleProvider.setCustomParameters({ prompt: "select_account" });

// PUSH BİLDİRİM (FCM) — site KAPALIYKEN bile mesaj/beğeni/arama bildirimi almak için telefon "anahtarı" (token) alır.
// vapidKey = Firebase Console > Proje Ayarları > Cloud Messaging > "Web Push sertifikaları" anahtarı.
// Boş/desteklenmiyorsa sessizce "" döner (uygulama etkilenmez).
// AYRINTILI: telefon anahtarını al AMA nerede takıldıysa SEBEBİNİ de döndür ({ token, sebep }).
// Böylece kullanıcı bildirimi açınca ekranda TAM sebebi görür (sunucu logu / bilgisayar gerekmez).
export async function fcmDurumAl(vapidKey) {
  try {
    if (!vapidKey) return { token: "", sebep: "anahtar-yok" };
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return { token: "", sebep: "servis-calisani-yok" };
    let destek = false; try { destek = await isSupported(); } catch (e) {}
    if (!destek) return { token: "", sebep: "tarayici-desteklemiyor" };
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") return { token: "", sebep: "izin-verilmedi" };
    const messaging = getMessaging(app);
    // ÖNEMLİ DEĞİŞİKLİK: Ayrı firebase-messaging-sw.js + gstatic importScripts KULLANMA
    // (o telefonda "ServiceWorker script evaluation failed" veriyordu — dışarıdan kütüphane çekemiyor).
    // Sitenin KENDİ sw.js'i (zaten kayıtlı, çalışıyor, dışa bağımlılığı yok) FCM push'u alacak.
    let reg;
    try { reg = await navigator.serviceWorker.ready; } catch (e) { reg = undefined; }
    let token = "";
    try {
      token = await getToken(messaging, reg ? { vapidKey, serviceWorkerRegistration: reg } : { vapidKey });
    } catch (e) { return { token: "", sebep: "token-hatasi: " + ((e && (e.code || e.message || e.name)) || e) }; }
    if (!token) return { token: "", sebep: "token-bos" };
    return { token, sebep: "ok" };
  } catch (e) { return { token: "", sebep: "genel-hata: " + ((e && (e.message || e.name)) || e) }; }
}

// ── FIREBASE AI LOGIC (Gemini) — Gloxoo'nun GERÇEK (fotoğraf gibi) resim üretmesi için ──
// Google'ın Gemini "Nano Banana" resim modeli. Kurulum: Firebase Console > AI Logic > Gemini Developer API (etkin).
// Resim üretimi için Blaze planı gerekebilir; hata olursa SEBEBİ döner → ekranda görünür, kolay teşhis.
// İKİ KATMAN: ÖNCE Vertex AI (Firebase'in ZATEN AÇIK Blaze/Cloud faturasını kullanır), OLMAZSA Gemini Developer API.
// Hangisi açık/çalışıyorsa ondan resim gelir; ikisi de olmazsa iki sebep birden döner (ekranda görünür, teşhis kolay).
function _hataMetni(e) {
  const parca = [];
  try { if (e && e.code) parca.push("kod=" + e.code); } catch (x) {}
  try { if (e && e.message) parca.push(String(e.message)); } catch (x) {}
  try { if (e && !e.code && !e.message && e.name) parca.push(e.name); } catch (x) {}
  try { if (e && e.customErrorData) parca.push("veri=" + JSON.stringify(e.customErrorData)); } catch (x) {}
  try { if (e && e.cause && e.cause.message) parca.push("neden=" + e.cause.message); } catch (x) {}
  return parca.join(" | ") || "bilinmeyen hata";
}
// FİLİGRAN — üretilen HER resmin SAĞ ALT köşesine "GLOXORG" markası basılır (her zaman görünür, marka korunur).
// Tarayıcıda canvas ile eklenir (model yazıyı yanlış yazamaz → marka HER SEFERİNDE net ve doğru çıkar).
// Dışarıdan filigran ekleme (Sanal Ayna 2. aşama başarısız olursa 1. aşamaya GLOXORG filigranı ekleyebilmek için)
export async function filigranEkle(dataUrl) { try { return await _filigranEkle(dataUrl); } catch (e) { return dataUrl; } }
function _filigranEkle(dataUrl) {
  return new Promise((cz) => {
    try {
      if (typeof document === "undefined" || !dataUrl) return cz(dataUrl);
      const img = new Image();
      img.onload = () => {
        try {
          const g = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
          if (!g || !h) return cz(dataUrl);
          const c = document.createElement("canvas"); c.width = g; c.height = h;
          const x = c.getContext("2d");
          x.drawImage(img, 0, 0, g, h);
          const yazi = "GLOXORG";
          const boy = Math.max(20, Math.round(Math.min(g, h) * 0.05)); // yazı boyu (kısa kenara göre — çok büyüyüp taşmasın)
          const pay = Math.round(Math.min(g, h) * 0.055);        // köşe boşluğu DAHA GENİŞ (kısa kenara göre) → alt/sağ kenarda KESİLMEZ
          x.font = "800 " + boy + "px Arial, Helvetica, sans-serif";
          x.textAlign = "right"; x.textBaseline = "alphabetic";
          const yaziEn = x.measureText(yazi).width;
          const dolguX = Math.round(boy * 0.45), dolguY = Math.round(boy * 0.30);
          const serEn = yaziEn + dolguX * 2, serBoy = boy + dolguY * 2;
          const serX = g - pay - serEn, serY = h - pay - serBoy;
          // ARKA ŞERİT: koyu yarı saydam yuvarlatılmış zemin → altın yazı HER resimde net okunur (parlak/açık resimde bile)
          const r = Math.round(serBoy * 0.28);
          x.fillStyle = "rgba(0,0,0,0.42)";
          x.beginPath();
          x.moveTo(serX + r, serY);
          x.arcTo(serX + serEn, serY, serX + serEn, serY + serBoy, r);
          x.arcTo(serX + serEn, serY + serBoy, serX, serY + serBoy, r);
          x.arcTo(serX, serY + serBoy, serX, serY, r);
          x.arcTo(serX, serY, serX + serEn, serY, r);
          x.closePath(); x.fill();
          // YAZI: önce ince koyu kontur, sonra ALTIN dolgu (kalın, belirgin)
          const tx = g - pay - dolguX, ty = h - pay - dolguY;
          x.lineWidth = Math.max(2, Math.round(boy * 0.12)); x.lineJoin = "round";
          x.strokeStyle = "rgba(0,0,0,0.85)"; x.strokeText(yazi, tx, ty);
          x.fillStyle = "#FFD700"; x.fillText(yazi, tx, ty);
          cz(c.toDataURL("image/png"));
        } catch (e) { cz(dataUrl); }
      };
      img.onerror = () => cz(dataUrl);
      img.src = dataUrl;
    } catch (e) { cz(dataUrl); }
  });
}
// girdiResim: kullanıcının verdiği fotoğraf {base64, mediaType} — VARSA modele girdi olur (o resmi işler/düzenler,
// örn. kişinin YÜZÜNÜ koruyarak istenen sahneyi kurar). YOKSA yalnız metinden yeni resim üretir.
// girdiResim2: İKİNCİ referans görsel (örn. reklamdaki ELBİSE) — varsa modele 2. resim olarak verilir
// → "1. fotoğraftaki kişiye 2. fotoğraftaki ürünü giydir" gibi. (Sanal Ayna'da reklamdaki ürünü üstünde deneme.)
async function _resimDene(backend, istem, girdiResim, girdiResim2) {
  const ai = getAI(app, { backend });
  const model = getGenerativeModel(ai, { model: "gemini-2.5-flash-image", generationConfig: { responseModalities: [ResponseModality.TEXT, ResponseModality.IMAGE] } });
  const metin = (istem || "").toString().slice(0, 1200);
  let girisi;
  if (girdiResim && girdiResim.base64) {
    // Çok parçalı istek: ÖNCE kullanıcının fotoğrafı (varsa 2. ürün fotoğrafı), SONRA ne yapılacağı → model bunları kullanır
    girisi = [{ inlineData: { mimeType: girdiResim.mediaType || "image/jpeg", data: girdiResim.base64 } }];
    if (girdiResim2 && girdiResim2.base64) girisi.push({ inlineData: { mimeType: girdiResim2.mediaType || "image/jpeg", data: girdiResim2.base64 } });
    girisi.push({ text: metin });
  } else {
    girisi = metin;
  }
  const sonuc = await model.generateContent(girisi);
  const resp = sonuc && sonuc.response;
  let parcalar = [];
  try { parcalar = (resp && resp.candidates && resp.candidates[0] && resp.candidates[0].content && resp.candidates[0].content.parts) || []; } catch (e) {}
  for (const p of parcalar) {
    if (p && p.inlineData && p.inlineData.data) return "data:" + (p.inlineData.mimeType || "image/png") + ";base64," + p.inlineData.data;
  }
  throw new Error("Resim gelmedi (modelin cevabinda gorsel yok)");
}
export async function gloxooResimUret(istem, girdiResim, girdiResim2, filigransiz) {
  // ÖNCE Gemini Developer API (kullanıcının kurduğu + kredi ekleyeceği yer), OLMAZSA Vertex AI.
  // filigransiz=true → ARA adım (örn. Sanal Ayna 2 aşamalı giydirme: 1. gövde+elbise) → filigran EKLENMEZ;
  // son adımda (yüz yerleştirme) filigran eklenir → çift filigran olmaz.
  const yollar = [{ ad: "Gemini", yap: () => new GoogleAIBackend() }, { ad: "Vertex", yap: () => new VertexAIBackend() }];
  const hatalar = [];
  for (const y of yollar) {
    try {
      let bk; try { bk = y.yap(); } catch (e) { hatalar.push(y.ad + ":kurulamadi"); continue; }
      const url = await _resimDene(bk, istem, girdiResim, girdiResim2);
      if (url) { if (filigransiz) return { dataUrl: url }; let fil; try { fil = await _filigranEkle(url); } catch (e) { fil = url; } return { dataUrl: fil || url }; }
    } catch (e) { hatalar.push(y.ad + ": " + _hataMetni(e)); }
  }
  return { hata: (hatalar.join("  ||  ") || "bilinmeyen hata").slice(0, 500) };
}

// ── GLOXOO GERÇEK İNSAN SESİ (Google/Gemini TTS) ──
// Sesi, resim üretimiyle AYNI Google/Gemini kurulumundan üretir → ayrı hesap/anahtar GEREKMEZ,
// kullanıcının resim için eklediği Google kredisini kullanır. İki katman: önce Gemini Developer API,
// olmazsa Vertex AI (resimdeki gibi). Dönen ses ham PCM'dir → tarayıcıda çalması için WAV'a sarılır.
// Ses gelmezse { hata } döner → uygulama eski tarayıcı sesine düşer (Gloxoo asla susmaz).
function _pcmToWav(base64Pcm, mimeType) {
  try {
    let rate = 24000; // Gemini TTS varsayılanı 24kHz, 16-bit, mono
    const m = /rate=(\d+)/i.exec(mimeType || ""); if (m) rate = parseInt(m[1], 10) || 24000;
    const bin = atob(base64Pcm);
    const len = bin.length;
    const numCh = 1, bits = 16, blockAlign = numCh * bits / 8, byteRate = rate * blockAlign;
    const buf = new ArrayBuffer(44 + len);
    const dv = new DataView(buf);
    const yaz = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
    yaz(0, "RIFF"); dv.setUint32(4, 36 + len, true); yaz(8, "WAVE");
    yaz(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, numCh, true);
    dv.setUint32(24, rate, true); dv.setUint32(28, byteRate, true); dv.setUint16(32, blockAlign, true); dv.setUint16(34, bits, true);
    yaz(36, "data"); dv.setUint32(40, len, true);
    const pcm = new Uint8Array(buf, 44);
    for (let i = 0; i < len; i++) pcm[i] = bin.charCodeAt(i);
    let out = ""; const bytes = new Uint8Array(buf), yigin = 0x8000;
    for (let i = 0; i < bytes.length; i += yigin) out += String.fromCharCode.apply(null, bytes.subarray(i, i + yigin));
    return "data:audio/wav;base64," + btoa(out);
  } catch (e) { return ""; }
}
async function _sesDene(backend, metin, sesAdi) {
  const ai = getAI(app, { backend });
  const model = getGenerativeModel(ai, {
    model: "gemini-2.5-flash-preview-tts",
    generationConfig: {
      responseModalities: [ResponseModality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: sesAdi || "Aoede" } } },
    },
  });
  const sonuc = await model.generateContent(String(metin || "").slice(0, 1500));
  const resp = sonuc && sonuc.response;
  let parcalar = [];
  try { parcalar = (resp && resp.candidates && resp.candidates[0] && resp.candidates[0].content && resp.candidates[0].content.parts) || []; } catch (e) {}
  for (const p of parcalar) {
    if (p && p.inlineData && p.inlineData.data) {
      const wav = _pcmToWav(p.inlineData.data, p.inlineData.mimeType);
      if (wav) return wav;
    }
  }
  throw new Error("ses gelmedi (cevapta ses yok)");
}
export async function gloxooSesUret(metin, dil, sesAdi) {
  if (!metin || !String(metin).trim()) return { hata: "bos metin" };
  const yollar = [{ ad: "Gemini", yap: () => new GoogleAIBackend() }, { ad: "Vertex", yap: () => new VertexAIBackend() }];
  const hatalar = [];
  for (const y of yollar) {
    try {
      let bk; try { bk = y.yap(); } catch (e) { hatalar.push(y.ad + ":kurulamadi"); continue; }
      const url = await _sesDene(bk, metin, sesAdi);
      if (url) return { dataUrl: url };
    } catch (e) { hatalar.push(y.ad + ": " + _hataMetni(e)); }
  }
  return { hata: (hatalar.join("  ||  ") || "bilinmeyen hata").slice(0, 500) };
}

// Basit sürüm (sessiz; girişte otomatik kayıt için) — sadece token döndürür.
export async function fcmTokenAl(vapidKey) {
  try { const d = await fcmDurumAl(vapidKey); return d.token || ""; } catch (e) { return ""; }
}

export default app;
