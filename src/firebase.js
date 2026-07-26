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
          const boy = Math.max(15, Math.round(g * 0.040));       // resim boyuna göre yazı boyu
          const pay = Math.round(g * 0.028);                     // köşe boşluğu
          x.font = "700 " + boy + "px Arial, Helvetica, sans-serif";
          x.textAlign = "right"; x.textBaseline = "bottom";
          const kx = g - pay, ky = h - pay;
          x.lineWidth = Math.max(2, Math.round(boy * 0.18)); x.lineJoin = "round";
          x.strokeStyle = "rgba(0,0,0,0.55)"; x.strokeText(yazi, kx, ky); // okunur olsun diye koyu kontur
          x.fillStyle = "#FFD700"; x.fillText(yazi, kx, ky);              // ALTIN marka yazısı
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
async function _resimDene(backend, istem, girdiResim) {
  const ai = getAI(app, { backend });
  const model = getGenerativeModel(ai, { model: "gemini-2.5-flash-image", generationConfig: { responseModalities: [ResponseModality.TEXT, ResponseModality.IMAGE] } });
  const metin = (istem || "").toString().slice(0, 1200);
  let girisi;
  if (girdiResim && girdiResim.base64) {
    // Çok parçalı istek: ÖNCE kullanıcının fotoğrafı, SONRA ne yapılacağı → model o resmi düzenler/kullanır
    girisi = [{ inlineData: { mimeType: girdiResim.mediaType || "image/jpeg", data: girdiResim.base64 } }, { text: metin }];
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
export async function gloxooResimUret(istem, girdiResim) {
  // ÖNCE Gemini Developer API (kullanıcının kurduğu + kredi ekleyeceği yer), OLMAZSA Vertex AI.
  const yollar = [{ ad: "Gemini", yap: () => new GoogleAIBackend() }, { ad: "Vertex", yap: () => new VertexAIBackend() }];
  const hatalar = [];
  for (const y of yollar) {
    try {
      let bk; try { bk = y.yap(); } catch (e) { hatalar.push(y.ad + ":kurulamadi"); continue; }
      const url = await _resimDene(bk, istem, girdiResim);
      if (url) { let fil; try { fil = await _filigranEkle(url); } catch (e) { fil = url; } return { dataUrl: fil || url }; }
    } catch (e) { hatalar.push(y.ad + ": " + _hataMetni(e)); }
  }
  return { hata: (hatalar.join("  ||  ") || "bilinmeyen hata").slice(0, 500) };
}

// Basit sürüm (sessiz; girişte otomatik kayıt için) — sadece token döndürür.
export async function fcmTokenAl(vapidKey) {
  try { const d = await fcmDurumAl(vapidKey); return d.token || ""; } catch (e) { return ""; }
}

export default app;
