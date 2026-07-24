// GLOXORG — Firebase bağlantısı (gerçek arka yüz: veritabanı + giriş)
// Bu dosya sitenin "beyni"dir: Üye Ol → veriler buraya kaydedilir,
// Giriş Yap → buradan doğrulanır. Anahtar genel web kimliğidir (gizli şifre değil).
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { getAI, getGenerativeModel, GoogleAIBackend, ResponseModality } from "firebase/ai";

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
let _gloxAi = null;
function _aiAl() { if (!_gloxAi) { try { _gloxAi = getAI(app, { backend: new GoogleAIBackend() }); } catch (e) { _gloxAi = null; } } return _gloxAi; }
export async function gloxooResimUret(istem) {
  try {
    const ai = _aiAl();
    if (!ai) return { hata: "AI baglanamadi (Firebase AI Logic kurulu mu?)" };
    const model = getGenerativeModel(ai, { model: "gemini-2.5-flash-image", generationConfig: { responseModalities: [ResponseModality.TEXT, ResponseModality.IMAGE] } });
    const sonuc = await model.generateContent((istem || "").toString().slice(0, 1200));
    const resp = sonuc && sonuc.response;
    let parcalar = [];
    try { parcalar = (resp && resp.candidates && resp.candidates[0] && resp.candidates[0].content && resp.candidates[0].content.parts) || []; } catch (e) {}
    for (const p of parcalar) {
      if (p && p.inlineData && p.inlineData.data) {
        return { dataUrl: "data:" + (p.inlineData.mimeType || "image/png") + ";base64," + p.inlineData.data };
      }
    }
    return { hata: "Resim gelmedi (modelin cevabinda gorsel yok)" };
  } catch (e) {
    return { hata: (e && (e.code || e.message || e.name)) ? String(e.code || e.message || e.name) : "bilinmeyen hata" };
  }
}

// Basit sürüm (sessiz; girişte otomatik kayıt için) — sadece token döndürür.
export async function fcmTokenAl(vapidKey) {
  try { const d = await fcmDurumAl(vapidKey); return d.token || ""; } catch (e) { return ""; }
}

export default app;
