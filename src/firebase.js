// GLOXORG — Firebase bağlantısı (gerçek arka yüz: veritabanı + giriş)
// Bu dosya sitenin "beyni"dir: Üye Ol → veriler buraya kaydedilir,
// Giriş Yap → buradan doğrulanır. Anahtar genel web kimliğidir (gizli şifre değil).
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
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

// Oturum KALICI: tarayıcı kapanıp açılsa / sayfa yenilense / arka plandan dönülse bile site seni hatırlar.
// getAuth ZATEN kalıcı (IndexedDB) oturumla başlar. ⛔ Eskiden buraya EK bir setPersistence(browserLocalPersistence)
// konmuştu; bu async çağrı, sayfa YENİLENİRKEN (her güncelleme sonrası) oturumu bir an "yok" gösterip kullanıcıyı
// giriş ekranına atıyordu (kendiliğinden çıkış). O çağrı KALDIRILDI → yenilemede oturum korunur, tekrar giriş istemez.
export const auth = getAuth(app);
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
          // ⛔ ZARİF DAMGA (kullanıcı: "aynadaki eski ÇİRKİN/zeminli damgayı kaldır; paylaşımdaki gibi ZARİF olsun"):
          //   Paylaşım filigranı (Anasayfa fotoFiligranla) ile BİREBİR AYNI stil → koyu ZEMİN KUTUSU YOK, ince SERİF,
          //   "◈ GLOXORG", yumuşak gölge + altın. Böylece ayna, indir/kaydet ve tüm üretilen resimler paylaşımdaki gibi zarif çıkar.
          const yazi = "◈ GLOXORG";
          const fs = Math.max(15, Math.round(Math.min(g, h) * 0.045));
          const pay = Math.round(fs * 0.7);
          x.font = "700 " + fs + "px Georgia, 'Times New Roman', serif";
          x.textAlign = "right"; x.textBaseline = "bottom";
          x.shadowColor = "rgba(0,0,0,.75)"; x.shadowBlur = Math.round(fs * 0.35); x.shadowOffsetY = 1;
          x.lineWidth = Math.max(2, fs * 0.14); x.strokeStyle = "rgba(0,0,0,.55)";
          x.strokeText(yazi, g - pay, h - pay);
          x.shadowColor = "transparent";
          x.fillStyle = "rgba(255,215,0,.95)"; // altın
          x.fillText(yazi, g - pay, h - pay);
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
  // GEÇİCİ hata mı? (503/deadline/overloaded/500/timeout/fetch) → beklenmedik değil, sunucu meşgul → TEKRAR DENE.
  const geciciMi = (e) => { const m = (_hataMetni(e) || "").toLowerCase(); return m.indexOf("503") !== -1 || m.indexOf("deadline") !== -1 || m.indexOf("overload") !== -1 || m.indexOf("unavailable") !== -1 || m.indexOf("500") !== -1 || m.indexOf("timeout") !== -1 || m.indexOf("fetch") !== -1 || m.indexOf("try again") !== -1; };
  // ⛔ ÇİFT GLOXORG ÖNLE (kullanıcı: "foto zaten GLOXORG'luysa yapay zekâ bir tane daha koyuyor, üst üste biniyor"):
  //   Girdi fotoğrafında GLOXORG varsa model onu KOPYALIYOR, sonra biz (_filigranEkle) bir tane daha ekleyince ÇİFT oluyordu.
  //   Modele HER ZAMAN: hiç watermark/logo/GLOXORG EKLEME + girdideki MEVCUDU TEMİZLE. Damgayı hep BİZ ekleriz → tek GLOXORG kalır.
  const istemTemiz = String(istem || "") + " CRITICAL WATERMARK RULE: The output image MUST be completely CLEAN — NO watermark, NO logo, NO brand mark, NO caption, NO sticker and NO text of any kind, especially the word 'GLOXORG'. VERY IMPORTANT: the provided/source image very often ALREADY has a 'GLOXORG' watermark or logo in the BOTTOM-RIGHT corner (sometimes gold text, sometimes on a dark rounded box). You MUST completely ERASE and PAINT OVER that whole corner with the surrounding clean background so that absolutely NO trace of any watermark, box or 'GLOXORG' text remains. NEVER copy, keep or recreate any existing watermark or logo from the source image.";
  for (const y of yollar) {
    let bk; try { bk = y.yap(); } catch (e) { hatalar.push(y.ad + ":kurulamadi"); continue; }
    // Her yol için EN FAZLA 3 deneme; geçici hatada bekleyip tekrar dener (503 "Deadline expired" çoğu zaman geçicidir).
    for (let deneme = 0; deneme < 3; deneme++) {
      try {
        const url = await _resimDene(bk, istemTemiz, girdiResim, girdiResim2);
        if (url) { if (filigransiz) return { dataUrl: url }; let fil; try { fil = await _filigranEkle(url); } catch (e) { fil = url; } return { dataUrl: fil || url }; }
        break; // resim gelmedi ama hata da yok → sonraki yola geç
      } catch (e) {
        if (geciciMi(e) && deneme < 2) { await new Promise((r) => setTimeout(r, 1600 * (deneme + 1))); continue; } // 1.6s, 3.2s bekle, tekrar dene
        hatalar.push(y.ad + ": " + _hataMetni(e)); break;
      }
    }
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

// ── GLOXOO ŞARKI TANIMA (dinle → hangi şarkı çalıyor) ──
// Mikrofondan alınan kısa ses kaydını Google/Gemini'ye verir, çalan müziği/şarkıyı TAHMİN ettirir.
// Not: Shazam gibi kesin PARMAK-İZİ değildir; yapay zekâ tanıdığı şarkıları bilir, bilmediğinde tahmin eder.
// Resim/ses ile AYNI Google kurulumunu kullanır (ayrı hesap/anahtar gerekmez).
async function _sesTaniDene(backend, base64Ses, mimeType) {
  const ai = getAI(app, { backend });
  const model = getGenerativeModel(ai, { model: "gemini-2.5-flash" });
  const soru = "Bu bir ses kaydidir. Icinde CALAN MUZIGI/SARKIYI tanimaya calis. Cevabini SADECE Turkce ver, kisa ve net. Taniyabiliyorsan tam su bicimde yaz: Sarki: <ad> — Sanatci: <isim>. Altina TEK cumle ekle (turu/ruh hali). Emin degilsen en olasi tahmini soyle ve sonuna (kesin degil) yaz. Icinde muzik yoksa sadece 'Muzik duyamadim, sesi biraz acip tekrar dene.' yaz.";
  const girisi = [{ inlineData: { data: base64Ses, mimeType: mimeType || "audio/webm" } }, { text: soru }];
  const sonuc = await model.generateContent(girisi);
  const resp = sonuc && sonuc.response;
  let parcalar = [];
  try { parcalar = (resp && resp.candidates && resp.candidates[0] && resp.candidates[0].content && resp.candidates[0].content.parts) || []; } catch (e) {}
  let metin = "";
  for (const p of parcalar) { if (p && typeof p.text === "string") metin += p.text; }
  if (!metin) { try { metin = resp.text(); } catch (e) {} }
  if (metin && metin.trim()) return metin.trim();
  throw new Error("cevap yok");
}
export async function gloxooSesTani(base64Ses, mimeType) {
  if (!base64Ses) return { hata: "ses yok" };
  const yollar = [{ ad: "Gemini", yap: () => new GoogleAIBackend() }, { ad: "Vertex", yap: () => new VertexAIBackend() }];
  const hatalar = [];
  for (const y of yollar) {
    try {
      let bk; try { bk = y.yap(); } catch (e) { hatalar.push(y.ad + ":kurulamadi"); continue; }
      const m = await _sesTaniDene(bk, base64Ses, mimeType);
      if (m) return { metin: m };
    } catch (e) { hatalar.push(y.ad + ": " + _hataMetni(e)); }
  }
  return { hata: (hatalar.join("  ||  ") || "bilinmeyen hata").slice(0, 500) };
}

// Basit sürüm (sessiz; girişte otomatik kayıt için) — sadece token döndürür.
export async function fcmTokenAl(vapidKey) {
  try { const d = await fcmDurumAl(vapidKey); return d.token || ""; } catch (e) { return ""; }
}

export default app;
