// GLOXORG VERİ ERİŞİM KATMANI (FAZ 0) — ANAYASA 6.16/M
// TÜM Firestore okuma/yazma BURADAN geçer. Bileşenler doğrudan db kullanmaz.
// Böylece arka yüz tek yerden yönetilir, modüler kalır, çökerse tek parça çökmez.
import { db, storage } from "./firebase";
import {
  doc, getDoc, setDoc, deleteDoc, updateDoc,
  collection, collectionGroup, query, where, limit as fsLimit, orderBy, getDocs, onSnapshot,
  serverTimestamp, increment, deleteField, arrayUnion, arrayRemove,
} from "firebase/firestore";
import { ref as depoRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";

// BEĞENİ / YORUM SAYACI — ATOMİK artır/azalt (oku-yaz YOK → farklı kişiler aynı anda beğenince üst üste yazmaz, doğru toplanır)
export async function sayacDegistir(postId, alan, delta) {
  if (!postId || !alan) return false;
  try { await updateDoc(doc(db, "gonderiler", postId), { [alan]: increment(delta), guncelleme: serverTimestamp() }); return true; } catch (e) { return false; }
}
// KİM BEĞENDİ — her beğeni ayrı doküman (begeniler/{post}_{uid}); kalbe uzun basınca liste gösterilir
export async function begeniYaz(postId, k) {
  if (!postId || !k || !k.uid) return false;
  try { await setDoc(doc(db, "begeniler", postId + "_" + k.uid), { postId, uid: k.uid, ad: k.ad || "", foto: k.foto || "", tepki: k.tepki || "kalp", zamanMs: Date.now() }); return true; } catch (e) { return false; }
}
export async function begeniSilDoc(postId, uid) {
  if (!postId || !uid) return false;
  try { await deleteDoc(doc(db, "begeniler", postId + "_" + uid)); return true; } catch (e) { return false; }
}
// BENİM beğendiğim gönderilerin id'leri (her cihazda/yeni girişte kalp DOLU görünsün diye backend'den)
export async function benimBegenilerim(uid, adet = 400) {
  if (!uid) return [];
  try {
    const q = query(collection(db, "begeniler"), where("uid", "==", uid), fsLimit(adet));
    const snap = await getDocs(q);
    return snap.docs.map((d) => (d.data() || {}).postId).filter(Boolean);
  } catch (e) { return []; }
}
export async function begenenleriOku(postId, adet = 100) {
  if (!postId) return [];
  try {
    const q = query(collection(db, "begeniler"), where("postId", "==", postId), fsLimit(adet));
    const snap = await getDocs(q);
    const l = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    l.sort((a, b) => (b.zamanMs || 0) - (a.zamanMs || 0));
    return l;
  } catch (e) { return []; }
}

// ---------- ANKET OYLARI ----------
// Kim hangi seçeneğe oy verdi — her oy AYRI doküman (anketOylari/{post}_{uid}), tıpkı beğeniler gibi.
// Gönderi dokümanına DOKUNULMAZ (sahip kuralı korunur) → başkasının anketine oy vermek serbest.
// Kişi kendi oyunu değiştirebilir (aynı doküman üzerine yazılır); seçenek = seçilen şıkkın sırası (0,1,2,3).
export async function anketOyVer(postId, uid, secenek) {
  if (!postId || !uid) return false;
  try { await setDoc(doc(db, "anketOylari", postId + "_" + uid), { postId, uid, secenek, zamanMs: Date.now() }); return true; } catch (e) { return false; }
}
// Bir anketin TÜM oyları (sayım + kimin ne oy verdiği). Feed'de anket gösterilince çağrılır.
export async function anketOylariOku(postId, adet = 2000) {
  if (!postId) return [];
  try {
    const q = query(collection(db, "anketOylari"), where("postId", "==", postId), fsLimit(adet));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() || {});
  } catch (e) { return []; }
}

// ---------- VİDEO / DOSYA YÜKLEME (FIREBASE DEPOLAMA) ----------
// Cloudinary'den TAŞINDI (ücretsiz kota aşımı + hesap kapanma riski). Artık videolar/dosyalar
// Firebase Depolama'ya yüklenir: tek çatı (Firebase), silince OTOMATİK silinir (medyaSil), şeffaf
// kullandıkça-öde. Dosya yolu: medya/{uid}/{zaman}_{ad} → sadece o kullanıcı yazar/siler (kural).
// Fotoğraflar eskisi gibi Firestore'da (base64) — burada değil.
function _guvenliAd(file, varsayilan) {
  const ad = (file && file.name) || varsayilan;
  return String(ad).replace(/[^\w.\-]+/g, "_").slice(-60) || varsayilan;
}
function _depoyaYukle(file, uid, onProgress, tipVarsayilan, zorTip) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("eksik"));
    try {
      const yol = "medya/" + (uid || "anon") + "/" + Date.now() + "_" + _guvenliAd(file, "medya");
      // zorTip verilmişse (video) onu KULLAN (dosyanın quicktime tipini EZ); yoksa dosya tipi ya da varsayılan.
      const gorev = uploadBytesResumable(depoRef(storage, yol), file, { contentType: zorTip || file.type || tipVarsayilan });
      gorev.on("state_changed",
        (s) => { if (onProgress && s.totalBytes) onProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)); },
        (e) => reject(e),
        async () => { try { resolve(await getDownloadURL(gorev.snapshot.ref)); } catch (e) { reject(e); } }
      );
    } catch (e) { reject(e); }
  });
}
// Büyük video → Firebase Depolama; güvenli indirilebilir URL döner (post'ta video:URL saklanır).
// ⚠️ İÇERİK TİPİ (Content-Type): telefon kamerası videoyu ".mov" (video/quicktime) kaydedebiliyor; bu tiple
// yüklenince tarayıcı (Chrome) İNTERNETTEN gelen videoyu OYNATMAYI REDDEDİYOR (yerel önizleme oynuyor ama site'de oynamıyor).
// ÇÖZÜM: web-uyumlu olmayan (quicktime/bilinmeyen) tipleri "video/mp4" olarak yükle → tarayıcı oynatır. (mp4/webm/ogg korunur.)
export function videoYukle(file, uid, onProgress) {
  const t = (file && file.type) || "";
  const webUyumlu = /^video\/(mp4|webm|ogg)$/i.test(t);
  const zorTip = webUyumlu ? t : "video/mp4";
  return _depoyaYukle(file, uid, onProgress, zorTip, zorTip);
}
// Belge (pdf/word/zip vb.) → Firebase Depolama; {url, ad, boyut} döner (post'ta dosya:{...}).
export async function dosyaYukle(file, uid, onProgress) {
  const ct = (file && file.type) || "application/octet-stream"; // gerçek tür → video oynar, foto görünür (octet yerine)
  const url = await _depoyaYukle(file, uid, onProgress, ct);
  return { url, ad: (file && file.name) || "dosya", boyut: (file && file.size) || 0 };
}
// base64 (dataURL) FOTOĞRAF → Firebase Depolama'ya yükle, indirilebilir URL döner.
// ÇOK fotoğraflı gönderilerde her foto Firestore'a (1MB) sığmaz → Storage'a yüklenir, post'ta URL saklanır.
export async function gorselYukle(dataURL, uid, onProgress) {
  if (!dataURL || dataURL.indexOf("data:") !== 0) return "";
  // dataURL → Blob
  const blob = await (await fetch(dataURL)).blob();
  const dosya = new File([blob], "foto.jpg", { type: blob.type || "image/jpeg" });
  return _depoyaYukle(dosya, uid, onProgress, "image/jpeg");
}
// MEDYA SİL — Firebase Depolama'daki dosyayı indirilebilir URL'inden siler.
// Eski Cloudinary URL'leri (veya boş) atlanır (istemciden silinemez, hata vermez).
export async function medyaSil(url) {
  try {
    if (!url || typeof url !== "string") return false;
    if (url.indexOf("firebasestorage.googleapis.com") < 0 && url.indexOf("firebasestorage.app") < 0) return false;
    await deleteObject(depoRef(storage, url));
    return true;
  } catch (e) { return false; } // zaten yok/silinmişse sorun değil
}

// ---------- HİKÂYELER (Stories) — 24 saatte kaybolan foto/video ----------
const HIKAYELER = "hikayeler";
// Hikâye ekle. k={uid,ad,foto,amblem}, medya={tip:'foto'|'video', url, poster, yer}. id döner.
export async function hikayeEkle(k, medya) {
  if (!k || !k.uid || !medya || !medya.url) return false;
  try {
    const id = k.uid + "_" + Date.now();
    await setDoc(doc(db, HIKAYELER, id), {
      uid: k.uid, ad: k.ad || "", foto: k.foto || "", amblem: !!k.amblem,
      tip: medya.tip || "foto", url: medya.url, poster: medya.poster || "",
      yazilar: Array.isArray(medya.yazilar) ? medya.yazilar.slice(0, 6) : [], // istediğin yere konmuş birden çok yazı
      ses: medya.ses || "", // hikâyeye eklenen müzik/ses
      yer: medya.yer || "", zamanMs: Date.now(), gorulme: 0,
    });
    return id;
  } catch (e) { return false; }
}
// Son 24 saatin hikâyeleri (eskiler otomatik düşer), zamana göre eskiden yeniye sıralı.
export async function hikayeleriOku(adet = 300) {
  try {
    const snap = await getDocs(query(collection(db, HIKAYELER), fsLimit(adet)));
    const esik = Date.now() - 24 * 60 * 60 * 1000;
    const l = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((h) => (h.zamanMs || 0) > esik);
    l.sort((a, b) => (a.zamanMs || 0) - (b.zamanMs || 0));
    return l;
  } catch (e) { return []; }
}
// Kendi hikâyeni sil.
export async function hikayeSil(id) {
  if (!id) return false;
  try { await deleteDoc(doc(db, HIKAYELER, id)); return true; } catch (e) { return false; }
}
// Görülme sayacını 1 artır (atomik).
export async function hikayeGorulduSay(id) {
  if (!id) return false;
  try { await updateDoc(doc(db, HIKAYELER, id), { gorulme: increment(1) }); return true; } catch (e) { return false; }
}

const KULLANICILAR = "kullanicilar";

// ---------- KULLANICI / PROFİL ----------
// Profili oku (yoksa null)
export async function profilOku(uid) {
  if (!uid) return null;
  try {
    const s = await getDoc(doc(db, KULLANICILAR, uid));
    return s.exists() ? { uid, ...s.data() } : null;
  } catch (e) { return null; }
}

// Profili CANLI dinle — tek seferlik okuma (getDoc) ağ/önbellek yüzünden BOŞ/ESKİ gelebiliyordu ("sayfa eksik geliyor:
// profil resmi/PRO/ayar yüklenmiyor, kırmızı kalıyor; çıkış-giriş yapınca düzeliyor"). onSnapshot sunucu verisi hazır
// olunca HEMEN verir, doküman değişince güncel tutar ve ağ dönünce kendi tekrar bağlanır → yarım-yükleme biter.
export function profilDinle(uid, cb) {
  if (!uid) { try { cb(null); } catch (e) {} return () => {}; }
  try {
    return onSnapshot(doc(db, KULLANICILAR, uid),
      (s) => { try { cb(s.exists() ? { uid, ...s.data() } : null); } catch (e) {} },
      () => {}); // hata → sessiz (dinleyici ağ dönünce kendi devam eder)
  } catch (e) { try { cb(null); } catch (x) {} return () => {}; }
}

// Profili kaydet/güncelle (merge — var olanı bozmaz)
export async function profilKaydet(uid, veri) {
  if (!uid) return false;
  try {
    await setDoc(doc(db, KULLANICILAR, uid), { ...veri, guncelleme: serverTimestamp() }, { merge: true });
    return true;
  } catch (e) { return false; }
}

// ===================== MUHASEBE (muhasebeci sayfası — çok bölümlü) =====================
// TEK koleksiyon: kullanicilar/{uid}/muhasebe/{id}. Her doküman "tip" ile ayrılır:
//   cari  (müşteri/tedarikçi cari hesap) · stok (depo ürünü) · islem (alış-satış) · kasa (gelir-gider)
// YUMUŞAK SİLME (çöp kutusu): silme HARD-DELETE değil → silindi:true + silinmeMs. ~30 gün sonra kalıcı silinir (purge).
// Çöp kutusundan geri yüklenebilir. Canlı dinleme (onSnapshot) → hep güncel; SADECE kullanıcı silince silinir.
export const MUH_COP_GUN = 30; // çöp kutusunda saklama süresi (gün)
// NOT: Şu an CİHAZDA saklanıyor (localStorage) → hemen çalışır, "Yükleniyor"da takılmaz, izin/kural gerektirmez.
// (Firestore alt-koleksiyon kuralı yayınlanınca buluta/çok-cihaza da bağlanabilir. Foto→PDF gibi büyük görseller BURADA
//  tutulmaz — sadece küçük metin verisi: müşteri/stok/kayıt/belge; kotayı zorlamaz.)
function muhAnahtar(uid) { return "gw_muhasebe_" + (uid || "yerel"); }
function muhOku(uid) { try { return JSON.parse(localStorage.getItem(muhAnahtar(uid)) || "[]"); } catch (e) { return []; } }
function muhYaz(uid, liste) {
  try { localStorage.setItem(muhAnahtar(uid), JSON.stringify(liste)); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent("gw-muhasebe-degisti", { detail: uid || "yerel" })); } catch (e) {}
}
export function muhasebeDinle(uid, cb) {
  const gonder = () => { try { cb(muhOku(uid)); } catch (e) {} };
  gonder(); // ANINDA (takılma yok)
  const f = (e) => { if (!e || !e.detail || e.detail === (uid || "yerel")) gonder(); };
  const g = (e) => { if (e && e.key === muhAnahtar(uid)) gonder(); }; // başka sekmede değişirse de güncelle
  try { window.addEventListener("gw-muhasebe-degisti", f); window.addEventListener("storage", g); } catch (e) {}
  return () => { try { window.removeEventListener("gw-muhasebe-degisti", f); window.removeEventListener("storage", g); } catch (e) {} };
}
export async function muhasebeEkle(uid, veri) {
  const id = "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const liste = muhOku(uid); liste.push({ id, ...veri, silindi: false, silinmeMs: 0, zamanMs: Date.now() }); muhYaz(uid, liste); return id;
}
export async function muhasebeGuncelle(uid, id, veri) {
  const liste = muhOku(uid); const i = liste.findIndex((x) => x.id === id); if (i < 0) return false;
  liste[i] = { ...liste[i], ...veri }; muhYaz(uid, liste); return true;
}
export async function muhasebeCopeAt(uid, id) { return muhasebeGuncelle(uid, id, { silindi: true, silinmeMs: Date.now() }); }
export async function muhasebeGeriYukle(uid, id) { return muhasebeGuncelle(uid, id, { silindi: false, silinmeMs: 0 }); }
export async function muhasebeKaliciSil(uid, id) { const liste = muhOku(uid).filter((x) => x.id !== id); muhYaz(uid, liste); return true; }

// CANLI KONUM — kullanıcının ŞU ANKİ yerini yaz (arkadaşları haritada "yanında" görsün).
// zaman: tazelik (eski konumları elemek için). merge → profilin gerisini bozmaz.
export async function canliKonumYaz(uid, lat, lon) {
  if (!uid || typeof lat !== "number" || typeof lon !== "number") return false;
  try {
    await setDoc(doc(db, KULLANICILAR, uid), { canliKonum: { lat, lon, zaman: Date.now() } }, { merge: true });
    return true;
  } catch (e) { return false; }
}
// CANLI KONUM PAYLAŞIMINI KAPAT — konumu sil (artık haritada görünmesin).
export async function canliKonumSil(uid) {
  if (!uid) return false;
  try { await setDoc(doc(db, KULLANICILAR, uid), { canliKonum: null }, { merge: true }); return true; } catch (e) { return false; }
}

// Meslek Pasaportu (profesyonel ayrıntıları) — kullanicilar/{uid}.pro altına
export async function pasaportKaydet(uid, pro) {
  if (!uid) return false;
  try {
    await setDoc(doc(db, KULLANICILAR, uid), { tip: "profesyonel", pro, guncelleme: serverTimestamp() }, { merge: true });
    return true;
  } catch (e) { return false; }
}

// ---------- KEŞİF / ARAMA ----------
// Profesyonelleri meslek/ülke/şehre göre listele (gerçek sorgu; indeks gerekirse boş döner)
export async function profesyonelAra({ meslek, ulke, sehir } = {}, adet = 30) {
  try {
    const kosullar = [where("tip", "==", "profesyonel")];
    if (meslek) kosullar.push(where("pro.meslek", "==", meslek));
    if (ulke) kosullar.push(where("konum.ulke", "==", ulke));
    if (sehir) kosullar.push(where("konum.sehir", "==", sehir));
    const q = query(collection(db, KULLANICILAR), ...kosullar, fsLimit(adet));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  } catch (e) { return []; }
}

// ---------- MESAJLAŞMA ----------
// Mesaj gönder (bir kişiye). Metin ve/veya foto (gorsel) / video / dosya ({url,ad}) — hepsi yüklenmiş URL. serverTimestamp + zamanMs.
export async function mesajGonder({ aliciUid, aliciAd, metin, gorsel, video, dosya, medyalar, gonderen, arama } = {}) {
  if (!aliciUid || !gonderen || !gonderen.uid) return false;
  const mt = (metin || "").trim();
  const med = Array.isArray(medyalar) ? medyalar.filter((x) => x && x.url).slice(0, 6) : [];
  // ARAMA GÜNLÜĞÜ (WhatsApp gibi): sohbete "Görüntülü/Sesli arama · süre/Cevaplanmadı" kaydı. Metinsiz de geçerli.
  const ar = (arama && (arama.tip === "goruntulu" || arama.tip === "sesli"))
    ? { tip: arama.tip, durum: arama.durum === "cevaplandi" ? "cevaplandi" : "cevapsiz", sureSn: Math.max(0, Math.round(arama.sureSn || 0)) } : null;
  if (!mt && !gorsel && !video && !(dosya && dosya.url) && !med.length && !ar) return false; // boş mesaj gitmesin
  try {
    const ref = doc(collection(db, "mesajlar"));
    await setDoc(ref, {
      aliciUid, aliciAd: aliciAd || "",
      gonderenUid: gonderen.uid, gonderenAd: gonderen.ad || "", gonderenFoto: gonderen.foto || "",
      metin: mt.slice(0, 2000), gorsel: gorsel || "", video: video || "", dosya: (dosya && dosya.url) ? { url: dosya.url, ad: (dosya.ad || "dosya").slice(0, 120) } : null,
      medyalar: med.length ? med.map((x) => ({ tip: x.tip || "foto", url: x.url, ad: (x.ad || "").slice(0, 120) })) : null,
      arama: ar,
      okundu: false, zaman: serverTimestamp(), zamanMs: Date.now(),
    });
    // Alıcıya BİLDİRİM bırak (zil + telefon bildirimi için). Arama günlüğü için bildirim BIRAKMA (arama zaten kendi bildirimini yaptı).
    if (!ar) {
      const oz = mt || (med.length ? ("📷 " + med.length + " medya") : gorsel ? "📷 Fotoğraf" : video ? "🎥 Video" : dosya ? "📎 Dosya" : "");
      bildirimEkle({ aliciUid, gonderenUid: gonderen.uid, gonderenAd: gonderen.ad || "", gonderenFoto: gonderen.foto || "", tip: "mesaj", metin: oz.slice(0, 60) }).catch(() => {});
    }
    return true;
  } catch (e) { return false; }
}
// TÜM mesajlarım (GELEN + GİDEN) — WhatsApp gibi sohbet merkezi + baloncuklu sohbet için CANLI dinle.
// İki dinleyici (aliciUid==ben, gonderenUid==ben); istemcide birleştirilip zamana göre ARTAN sıralanır.
// Geri: iki aboneliği de iptal eden fonksiyon. (Firestore OR sorgusu index ister → iki ayrı dinleyici daha güvenli.)
export function mesajlarimiDinle(uid, cb, adet = 500) {
  if (!uid) return () => {};
  let gelen = [], giden = [];
  const yolla = () => {
    const harita = new Map();
    [...gelen, ...giden].forEach((m) => { if (m && m.id) harita.set(m.id, m); });
    const liste = Array.from(harita.values()).sort((a, b) => (a.zamanMs || 0) - (b.zamanMs || 0));
    try { cb(liste); } catch (e) {}
  };
  let a1 = () => {}, a2 = () => {};
  try {
    const q1 = query(collection(db, "mesajlar"), where("aliciUid", "==", uid), fsLimit(adet));
    a1 = onSnapshot(q1, (s) => { gelen = s.docs.map((d) => ({ id: d.id, ...d.data() })); yolla(); }, () => {});
    const q2 = query(collection(db, "mesajlar"), where("gonderenUid", "==", uid), fsLimit(adet));
    a2 = onSnapshot(q2, (s) => { giden = s.docs.map((d) => ({ id: d.id, ...d.data() })); yolla(); }, () => {});
  } catch (e) {}
  return () => { try { a1(); } catch (e) {} try { a2(); } catch (e) {} };
}
// Mesajı GERİ ÇEK / SİL (herkesten) — silmek yerine "silindi" işaretle (delete kuralı gerekmez; update = gönderen/alıcı).
export async function mesajSilGeriCek(mesajId) {
  if (!mesajId) return false;
  try { await setDoc(doc(db, "mesajlar", mesajId), { silindi: true, metin: "", gorsel: "", video: "", dosya: null, medyalar: null }, { merge: true }); return true; } catch (e) { return false; }
}
// Mesaj METNİNİ düzelt (WhatsApp "düzenle" gibi) — gönderen kendi yazısını günceller.
export async function mesajDuzelt(mesajId, metin) {
  if (!mesajId) return false;
  try { await setDoc(doc(db, "mesajlar", mesajId), { metin: (metin || "").trim().slice(0, 2000), duzenlendi: true }, { merge: true }); return true; } catch (e) { return false; }
}
// PUSH BİLDİRİM anahtarı (fcmTokens) — kullanıcının cihazını kaydet (site kapalıyken bildirim gelebilsin). Çoklu cihaz: dizi.
export async function fcmTokenKaydet(uid, token) {
  if (!uid || !token) return false;
  try { await setDoc(doc(db, "kullanicilar", uid), { fcmTokens: arrayUnion(token) }, { merge: true }); return true; } catch (e) { return false; }
}
export async function fcmTokenSil(uid, token) {
  if (!uid || !token) return false;
  try { await setDoc(doc(db, "kullanicilar", uid), { fcmTokens: arrayRemove(token) }, { merge: true }); return true; } catch (e) { return false; }
}
// Bir mesaja TEPKİ (emoji) ver/değiştir (WhatsApp gibi). tepkiler = { uid: emoji } haritası. Boş emoji → tepkiyi kaldır.
export async function mesajTepkiVer(mesajId, uid, emoji) {
  if (!mesajId || !uid) return false;
  try {
    await setDoc(doc(db, "mesajlar", mesajId), { tepkiler: { [uid]: emoji ? emoji : deleteField() } }, { merge: true });
    return true;
  } catch (e) { return false; }
}
// Bir sohbetteki BANA GELEN okunmamış mesajları "okundu" yap (çift tik ✓✓). Sadece alıcı güncelleyebilir (kural).
export async function mesajOkunduYap(mesajlar) {
  try {
    await Promise.all((mesajlar || []).filter((m) => m && m.id && !m.okundu).map((m) =>
      setDoc(doc(db, "mesajlar", m.id), { okundu: true }, { merge: true })));
  } catch (e) {}
}

// ---------- İNTERNET ARAMASI (WebRTC sinyalleşme — sesli/görüntülü, iki üye arası) ----------
// Firestore "aramalar" koleksiyonu = signaling (offer/answer/durum) + alt koleksiyon adaylar (ICE).
// Arayan bir arama dokümanı oluşturur (offer), aranan dinler ve cevaplar (answer). ICE adayları alt koleksiyonlarda paylaşılır.
export async function aramaOlustur(veri) {
  try {
    const ref = doc(collection(db, "aramalar"));
    await setDoc(ref, {
      arayanUid: veri.arayanUid, arayanAd: veri.arayanAd || "", arayanFoto: veri.arayanFoto || "",
      arananUid: veri.arananUid, arananAd: veri.arananAd || "",
      tip: veri.tip || "sesli", offer: veri.offer || null, answer: null,
      durum: "calliyor", zamanMs: Date.now(), olusturma: serverTimestamp(),
    });
    return ref.id;
  } catch (e) { return null; }
}
// Bir aramayı CANLI dinle (answer gelince / durum değişince). Geri: iptal.
export function aramaDinle(aramaId, cb) {
  if (!aramaId) return () => {};
  try { return onSnapshot(doc(db, "aramalar", aramaId), (s) => cb(s.exists() ? { id: s.id, ...s.data() } : null), () => {}); }
  catch (e) { return () => {}; }
}
// Arama dokümanını güncelle (answer yaz / durumu değiştir: kabul, red, bitti)
export async function aramaGuncelle(aramaId, veri) {
  try { await setDoc(doc(db, "aramalar", aramaId), veri, { merge: true }); return true; } catch (e) { return false; }
}
// BANA GELEN çağrıları dinle (arananUid == ben, durum "calliyor"). Tek eşitlik sorgusu (index gerektirmez), istemcide filtre.
export function gelenAramalariDinle(uid, cb) {
  if (!uid) return () => {};
  try {
    const q = query(collection(db, "aramalar"), where("arananUid", "==", uid), fsLimit(20));
    return onSnapshot(q, (snap) => {
      const simdi = Date.now();
      const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .filter((a) => a.durum === "calliyor" && (simdi - (a.zamanMs || 0)) < 60000); // son 60 sn içinde çalan
      cb(liste);
    }, () => cb([]));
  } catch (e) { return () => {}; }
}
// ICE adayı ekle (kim: "arayan" | "aranan")
export async function iceAdayEkle(aramaId, kim, cand) {
  if (!aramaId || !cand) return;
  try { const ref = doc(collection(db, "aramalar", aramaId, "aday_" + kim)); await setDoc(ref, { cand, zamanMs: Date.now() }); } catch (e) {}
}
// Karşı tarafın ICE adaylarını dinle (yeni ekleneni cb'ye ver)
export function iceAdaylariDinle(aramaId, kim, cb) {
  if (!aramaId) return () => {};
  try {
    return onSnapshot(collection(db, "aramalar", aramaId, "aday_" + kim), (snap) => {
      snap.docChanges().forEach((ch) => { if (ch.type === "added") { try { cb(ch.doc.data().cand); } catch (e) {} } });
    }, () => {});
  } catch (e) { return () => {}; }
}

// ---------- BİLDİRİMLER (zil + telefon bildirimi) ----------
// Bir kullanıcıya bildirim bırak (beğeni/yorum/mesaj). Kendine bildirim YOK.
export async function bildirimEkle(b) {
  if (!b || !b.aliciUid || !b.gonderenUid || b.aliciUid === b.gonderenUid) return null;
  try {
    const ref = doc(collection(db, "bildirimler"));
    await setDoc(ref, {
      aliciUid: b.aliciUid, gonderenUid: b.gonderenUid,
      gonderenAd: b.gonderenAd || "", gonderenFoto: b.gonderenFoto || "",
      tip: b.tip || "", gonderiId: b.gonderiId || "", metin: (b.metin || "").slice(0, 80),
      gonderiResim: b.gonderiResim || "", gonderiZemin: b.gonderiZemin || "", gonderiVideo: b.gonderiVideo || "",
      okundu: false, zamanMs: Date.now(), olusturma: serverTimestamp(),
    });
    return ref.id;
  } catch (e) { return null; }
}
// CANLI dinle (sayfa açıkken anında gelir) — istemcide sıralanır. Geri: aboneliği iptal eden fonksiyon.
export function bildirimleriDinle(uid, cb) {
  if (!uid) return () => {};
  try {
    const q = query(collection(db, "bildirimler"), where("aliciUid", "==", uid), fsLimit(50));
    return onSnapshot(q, (snap) => {
      const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      liste.sort((a, b) => (b.zamanMs || 0) - (a.zamanMs || 0));
      cb(liste);
    }, () => cb([]));
  } catch (e) { return () => {}; }
}
// Okundu işaretle (zile basınca)
export async function bildirimleriOkunduYap(liste) {
  try {
    await Promise.all((liste || []).filter((b) => !b.okundu).map((b) =>
      setDoc(doc(db, "bildirimler", b.id), { okundu: true }, { merge: true })));
  } catch (e) {}
}
// Gelen mesajlar (bana gelenler) — index gerekmesin diye where-only, istemcide sıralanır.
export async function mesajlariOku(uid, adet = 60) {
  if (!uid) return [];
  try {
    const q = query(collection(db, "mesajlar"), where("aliciUid", "==", uid), fsLimit(adet));
    const snap = await getDocs(q);
    const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    liste.sort((a, b) => (b.zamanMs || 0) - (a.zamanMs || 0));
    return liste;
  } catch (e) { return []; }
}

// ---------- GERİ BİLDİRİM (Gloxoo öneri beğen/beğenme + yorum → yönetici sayfası) ----------
export async function geriBildirimEkle(b) {
  if (!b) return null;
  try {
    const ref = doc(collection(db, "geriBildirim"));
    await setDoc(ref, {
      uid: b.uid || "", ad: (b.ad || "").slice(0, 80),
      oneri: (b.oneri || "").slice(0, 600), yorum: (b.yorum || "").slice(0, 600),
      begendi: !!b.begendi, sayfa: b.sayfa || "paylas-ai",
      zamanMs: Date.now(), olusturma: serverTimestamp(),
    });
    return ref.id;
  } catch (e) { return null; }
}
export async function geriBildirimOku(adet = 200) {
  try {
    const q = query(collection(db, "geriBildirim"), fsLimit(adet));
    const snap = await getDocs(q);
    const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    liste.sort((a, b) => (b.zamanMs || 0) - (a.zamanMs || 0));
    return liste;
  } catch (e) { return []; }
}
// YÖNETİCİ — tüm kullanıcılar / tüm gönderiler (sahip konsolu için)
export async function tumKullanicilar(adet = 400) {
  try {
    const q = query(collection(db, KULLANICILAR), fsLimit(adet));
    const snap = await getDocs(q);
    const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    liste.sort((a, b) => {
      const ta = (a.guncelleme && a.guncelleme.seconds) || 0, tb = (b.guncelleme && b.guncelleme.seconds) || 0;
      return tb - ta;
    });
    return liste;
  } catch (e) { return []; }
}
// ---------- KULLANICI EKLİ MEKANLAR (kendi dükkanını/işini haritaya ekle) ----------
// Herkes OKUR (haritada görsün); giriş yapan KENDİ mekânını ekler; sahibi siler. (firestore.rules: mekanlar)
export async function mekanEkle(veri) {
  const ref = doc(collection(db, "mekanlar"));
  await setDoc(ref, { zamanMs: Date.now(), ...veri, olusturma: serverTimestamp() });
  return ref.id;
}
export async function mekanlariOku(adet = 800) {
  try {
    const q = query(collection(db, "mekanlar"), fsLimit(adet));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) { return []; }
}
// ---------- AKADEMİ (eğitim + GLOXORG sertifikası) ----------
// Herkes OKUR (sertifika doğrulama açık); giriş yapan KENDİ kaydını oluşturur; sahibi/yönetici günceller-siler.
export async function akademiKayitEkle(veri) {
  const ref = doc(collection(db, "akademiKayit"));
  await setDoc(ref, { zamanMs: Date.now(), ...veri, olusturma: serverTimestamp() });
  return ref.id;
}
export async function akademiKayitlarimOku(uid, adet = 100) {
  if (!uid) return [];
  try {
    const q = query(collection(db, "akademiKayit"), where("uid", "==", uid), fsLimit(adet));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.zamanMs || 0) - (a.zamanMs || 0));
  } catch (e) { return []; }
}
export async function akademiKayitGuncelle(id, veri) {
  if (!id) return false;
  try { await setDoc(doc(db, "akademiKayit", id), { ...veri, guncelleme: serverTimestamp() }, { merge: true }); return true; } catch (e) { return false; }
}
// Sertifikayı KOD ile doğrula (herkes sorgulayabilir)
export async function sertifikaDogrula(kod) {
  if (!kod) return null;
  try {
    const q = query(collection(db, "akademiKayit"), where("sertifikaKod", "==", String(kod).trim().toUpperCase()), fsLimit(1));
    const snap = await getDocs(q);
    const d = snap.docs[0];
    return d ? { id: d.id, ...d.data() } : null;
  } catch (e) { return null; }
}

// ---------- AKADEMİ GÖRSEL ÖNBELLEĞİ (paylaşımlı) ----------
// Her model/çeşit fotoğrafı BİR KEZ üretilir; herkes aynı fotoğrafı görür (tekrar üretilmez → ücret sadece 1 kez).
// Anahtar (ör. "kuafor|bob-kesimi") → güvenli belge kimliğine çevrilir.
function _gorselAnahtar(s) {
  return String(s || "").toLocaleLowerCase("tr")
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9|]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 200) || "genel";
}
// Önbellekten oku → fotoğraf URL'si (yoksa "").
export async function akademiGorselOku(anahtar) {
  try {
    const s = await getDoc(doc(db, "akademiGorsel", _gorselAnahtar(anahtar)));
    return (s.exists() && s.data() && s.data().url) || "";
  } catch (e) { return ""; }
}
// Önbelleğe yaz (üretilen fotoğrafın URL'si).
export async function akademiGorselYaz(anahtar, url) {
  if (!url) return false;
  try { await setDoc(doc(db, "akademiGorsel", _gorselAnahtar(anahtar)), { url, zamanMs: Date.now(), olusturma: serverTimestamp() }, { merge: true }); return true; } catch (e) { return false; }
}
// AKADEMİ DERS/METİN ÖNBELLEĞİ — üretilen ders/tarif/fizibilite yazısı DÜNYADA bir kez üretilir, herkes hazırdan görür
// (2. açılış ANINDA + yapay zekâ ücreti tekrar gitmez). Aynı "akademiGorsel" koleksiyonu kullanılır (yeni Firestore kuralı GEREKMEZ);
// metin ayrı "metin" alanında, anahtar öneki (ders|/konu|/fiz|) fotoğraf anahtarlarıyla çakışmaz.
export async function akademiMetinOku(anahtar) {
  try {
    const s = await getDoc(doc(db, "akademiGorsel", _gorselAnahtar(anahtar)));
    return (s.exists() && s.data() && s.data().metin) || "";
  } catch (e) { return ""; }
}
export async function akademiMetinYaz(anahtar, metin) {
  if (!metin) return false;
  try { await setDoc(doc(db, "akademiGorsel", _gorselAnahtar(anahtar)), { metin, zamanMs: Date.now(), olusturma: serverTimestamp() }, { merge: true }); return true; } catch (e) { return false; }
}

export async function mekanGuncelle(id, veri) {
  if (!id) return false;
  try { await setDoc(doc(db, "mekanlar", id), { ...veri, guncelleme: serverTimestamp() }, { merge: true }); return true; } catch (e) { return false; }
}
export async function mekanSil(id) {
  if (!id) return false;
  try { await deleteDoc(doc(db, "mekanlar", id)); return true; } catch (e) { return false; }
}

// Kullanıcı (profil) belgesini sil — SADECE yönetici (Firestore kuralında sahip e-posta) — hayalet/eski kayıtları temizlemek için
// Hesap sil → o kullanıcının TÜM gönderileri + medyaları (video/dosya) da silinir (silinen hesabın paylaşımları kalmasın)
export async function kullaniciSil(uid) {
  if (!uid) return false;
  try {
    try {
      const q = query(collection(db, "gonderiler"), where("sahipUid", "==", uid), fsLimit(500));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        const p = d.data() || {};
        try { if (p.video) await medyaSil(p.video); if (p.dosya && p.dosya.url) await medyaSil(p.dosya.url); } catch (e) {}
        try { await deleteDoc(d.ref); } catch (e) {}
      }
    } catch (e) {}
    await deleteDoc(doc(db, KULLANICILAR, uid));
    return true;
  } catch (e) { return false; }
}
export async function tumGonderiler(adet = 300) {
  try {
    // orderBy("olusturma") KULLANMIYORUZ — o alanı olmayan eski gönderiler dışlanıp yönetici listesinde de kaybolmasın.
    const q = query(collection(db, "gonderiler"), fsLimit(adet));
    const snap = await getDocs(q);
    const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    liste.sort((a, b) => (b.zamanMs || 0) - (a.zamanMs || 0));
    return liste;
  } catch (e) { return []; }
}

// ---------- GÖNDERİLER (akış — FAZ 2'de kullanılacak, temel hazır) ----------
export async function gonderiEkle(veri) {
  // NOT: hata artık YUTULMUYOR → FIRLATIYOR (çağıran gerçek sebebi görebilsin: doc çok büyük / izin / ağ).
  const ref = doc(collection(db, "gonderiler"));
  // sahipUid ZORUNLU (güvenlik kuralı bunu ister) — veri.uid'den alınır.
  // zamanMs GARANTİ: akış zamanMs'e göre sıralanıp çekiliyor; eksikse gönderi sıralamadan düşer → HER ZAMAN yaz.
  await setDoc(ref, { zamanMs: Date.now(), ...veri, sahipUid: veri.uid || "", olusturma: serverTimestamp(), begeni: 0, yorumSayisi: 0 });
  return ref.id;
}

// Kullanıcının KENDİ gönderileri (Profilim'de listeler) — where-only, istemcide sıralanır.
export async function gonderilerimOku(uid, adet = 60) {
  if (!uid) return [];
  try {
    const q = query(collection(db, "gonderiler"), where("sahipUid", "==", uid), fsLimit(adet));
    const snap = await getDocs(q);
    const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    liste.sort((a, b) => (b.zamanMs || 0) - (a.zamanMs || 0));
    return liste;
  } catch (e) { return []; }
}
// PROFİL FOTOĞRAFI/ADI DEĞİŞİNCE kullanıcının TÜM gönderilerindeki avatar+ad GÜNCELLENİR
// (kullanıcı: "profili değiştirdim ama paylaşımlarımda eski fotoğraf duruyor"). AMBLEM'li gönderiler
// (kendi iş amblemini avatar yapanlar) korunur — onların foto'su amblemdir, ezilmez. Kaç gönderi güncellendiğini döndürür.
export async function gonderiAvatarGuncelle(uid, foto, ad) {
  if (!uid) return 0;
  try {
    const q = query(collection(db, "gonderiler"), where("sahipUid", "==", uid), fsLimit(500));
    const snap = await getDocs(q);
    let n = 0;
    await Promise.all(snap.docs.map(async (d) => {
      const p = d.data() || {};
      if (p.amblem) return; // amblemli gönderi = iş amblemi, avatarla değiştirme
      const yama = {};
      if (typeof foto === "string" && p.foto !== foto) yama.foto = foto;
      if (typeof ad === "string" && ad && p.ad !== ad) yama.ad = ad;
      if (Object.keys(yama).length) { try { await updateDoc(d.ref, yama); n++; } catch (e) {} }
    }));
    return n;
  } catch (e) { return 0; }
}
// Profil fotoğrafı/adı değişince BEĞENİLERDEKİ (beğenenler şeridindeki) avatar+ad da yenilenir.
export async function begeniAvatarGuncelle(uid, foto, ad) {
  if (!uid) return 0;
  try {
    const q = query(collection(db, "begeniler"), where("uid", "==", uid), fsLimit(600));
    const snap = await getDocs(q);
    let n = 0;
    await Promise.all(snap.docs.map(async (d) => {
      const p = d.data() || {};
      const yama = {};
      if (typeof foto === "string" && p.foto !== foto) yama.foto = foto;
      if (typeof ad === "string" && ad && p.ad !== ad) yama.ad = ad;
      if (Object.keys(yama).length) { try { await updateDoc(d.ref, yama); n++; } catch (e) {} }
    }));
    return n;
  } catch (e) { return 0; }
}
// Profil fotoğrafı/adı değişince YORUMLARDAKİ avatar+ad da yenilenir (tüm gönderilerin yorumlar alt-koleksiyonu).
// collectionGroup index yoksa sessizce 0 döner (çökmez) — Firestore konsolunda "yorumlar" için index istenebilir.
export async function yorumAvatarGuncelle(uid, foto, ad) {
  if (!uid) return 0;
  try {
    const q = query(collectionGroup(db, "yorumlar"), where("uid", "==", uid), fsLimit(600));
    const snap = await getDocs(q);
    let n = 0;
    await Promise.all(snap.docs.map(async (d) => {
      const p = d.data() || {};
      const yama = {};
      if (typeof foto === "string" && p.foto !== foto) yama.foto = foto;
      if (typeof ad === "string" && ad && p.ad !== ad) yama.ad = ad;
      if (Object.keys(yama).length) { try { await updateDoc(d.ref, yama); n++; } catch (e) {} }
    }));
    return n;
  } catch (e) { return 0; }
}
// Gönderi sil (sadece sahibi — kural zaten korur) + MEDYASINI depodan OTOMATİK sil (boşuna yer/masraf kalmasın)
export async function gonderiSil(id) {
  if (!id) return false;
  try {
    try {
      const s = await getDoc(doc(db, "gonderiler", id));
      if (s.exists()) { const p = s.data() || {}; if (p.video) await medyaSil(p.video); if (p.dosya && p.dosya.url) await medyaSil(p.dosya.url); }
    } catch (e) {}
    await deleteDoc(doc(db, "gonderiler", id));
    return true;
  } catch (e) { return false; }
}
// Gönderi güncelle (yazı/görsel/tür değiştir)
export async function gonderiGuncelle(id, veri) {
  if (!id) return false;
  try { await setDoc(doc(db, "gonderiler", id), { ...veri, guncelleme: serverTimestamp() }, { merge: true }); return true; } catch (e) { return false; }
}
// ÇÖP KUTUSU — yumuşak silme: gönderi SİLİNMEZ, "silindi" işaretlenir → akıştan kalkar, çöp kutusunda durur (geri getirilebilir).
export async function gonderiCopAt(id) {
  if (!id) return false;
  try { await setDoc(doc(db, "gonderiler", id), { silindi: true, silinmeMs: Date.now(), guncelleme: serverTimestamp() }, { merge: true }); return true; } catch (e) { return false; }
}
// ÇÖP KUTUSUNDAN GERİ GETİR — "silindi" işaretini kaldırır → akışa geri döner.
export async function gonderiGeriGetir(id) {
  if (!id) return false;
  try { await setDoc(doc(db, "gonderiler", id), { silindi: false, silinmeMs: null, guncelleme: serverTimestamp() }, { merge: true }); return true; } catch (e) { return false; }
}

// ---------- YORUMLAR (gönderiye yorum) ----------
export async function yorumEkle(postId, y) {
  if (!postId || !y || !y.uid || !y.metin || !y.metin.trim()) return null;
  try {
    const ref = doc(collection(db, "gonderiler", postId, "yorumlar"));
    await setDoc(ref, { uid: y.uid, ad: y.ad || "", foto: y.foto || "", metin: y.metin.trim().slice(0, 500), zamanMs: Date.now(), olusturma: serverTimestamp() });
    return ref.id;
  } catch (e) { return null; }
}
export async function yorumlariOku(postId, adet = 80) {
  if (!postId) return [];
  try {
    const q = query(collection(db, "gonderiler", postId, "yorumlar"), fsLimit(adet));
    const snap = await getDocs(q);
    const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    liste.sort((a, b) => (a.zamanMs || 0) - (b.zamanMs || 0)); // eski → yeni
    return liste;
  } catch (e) { return []; }
}

// ---------- TAKİP ET (kişileri takip et — akış kişiselleşir) ----------
// Takip et: takipler/{takipci}_{hedef} dokümanı. Kendini takip edemezsin.
export async function takipEt(takipciUid, hedefUid, hedefBilgi = {}) {
  if (!takipciUid || !hedefUid || takipciUid === hedefUid) return false;
  try {
    await setDoc(doc(db, "takipler", takipciUid + "_" + hedefUid), {
      takipciUid, hedefUid,
      hedefAd: hedefBilgi.ad || "", hedefFoto: hedefBilgi.foto || "", hedefMeslek: hedefBilgi.meslek || "",
      zamanMs: Date.now(), olusturma: serverTimestamp(),
    });
    return true;
  } catch (e) { return false; }
}
// Takipten çık
export async function takiptenCik(takipciUid, hedefUid) {
  if (!takipciUid || !hedefUid) return false;
  try { await deleteDoc(doc(db, "takipler", takipciUid + "_" + hedefUid)); return true; } catch (e) { return false; }
}
// Takip ettiklerimin uid listesi (akışı kişiselleştirmek için)
export async function takipEttiklerimOku(uid, adet = 200) {
  if (!uid) return [];
  try {
    const q = query(collection(db, "takipler"), where("takipciUid", "==", uid), fsLimit(adet));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data().hedefUid).filter(Boolean);
  } catch (e) { return []; }
}

export async function gonderileriOku({ ulke, meslek } = {}, adet = 150) {
  // AKIŞ HERKESTE AYNI + EN YENİ olsun diye zamanMs'e göre SIRALI çekilir.
  // ESKİ HATA: orderBy YOKken fsLimit(150) Firestore'dan RASTGELE 150 gönderi getiriyordu (en yeniler değil)
  // → yeni paylaşımlar karşı tarafa "gitmiyor", sıra bozuk görünüyordu. ÇÖZÜM: orderBy("zamanMs","desc")
  // → EN YENİ 'adet' gönderi, HERKESE AYNI sırada gelir. (Her paylaşımda zamanMs yazılıyor; gonderiEkle garanti ediyor.)
  try {
    const kosullar = [];
    if (ulke) kosullar.push(where("ulke", "==", ulke));
    if (meslek) kosullar.push(where("meslek", "==", meslek));
    try {
      const q = query(collection(db, "gonderiler"), ...kosullar, orderBy("zamanMs", "desc"), fsLimit(adet));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => !p.silindi); // ÇÖPE atılanlar akışta GÖRÜNMEZ
    } catch (indexErr) {
      // Filtre (ulke/meslek) + orderBy için bileşik dizin yoksa: filtreli çek, İSTEMCİDE sırala (yine çalışsın, boş kalmasın)
      const q2 = query(collection(db, "gonderiler"), ...kosullar, fsLimit(adet));
      const snap2 = await getDocs(q2);
      const liste = snap2.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => !p.silindi);
      liste.sort((a, b) => (b.zamanMs || 0) - (a.zamanMs || 0));
      return liste;
    }
  } catch (e) { return []; }
}

// ================= ELİTE PAZAR (ürün ilanları) =================
// Ürün ilanı: {uid, satici, saticiFoto, urunAd, aciklama, fiyat, paraBirimi, kategori, durum, etiketler[], medyalar[{tip,url}], kapak, konum, zamanMs, favSayi}
// Güvenlik: herkes OKUR; giriş yapan KENDİ ilanını oluşturur; favSayi herkes günceller; sahibi siler. (firestore.rules: pazarUrunleri)
export async function pazarUrunEkle(veri) {
  const ref = doc(collection(db, "pazarUrunleri"));
  await setDoc(ref, { zamanMs: Date.now(), ...veri, sahipUid: veri.uid || "", olusturma: serverTimestamp(), favSayi: 0 });
  return ref.id;
}
export async function pazarUrunleriOku(adet = 200) {
  try {
    const q = query(collection(db, "pazarUrunleri"), fsLimit(adet));
    const snap = await getDocs(q);
    const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => !p.silindi);
    liste.sort((a, b) => (b.zamanMs || 0) - (a.zamanMs || 0));
    return liste;
  } catch (e) { return []; }
}
export async function pazarUrunlerimOku(uid, adet = 100) {
  if (!uid) return [];
  try {
    const q = query(collection(db, "pazarUrunleri"), where("sahipUid", "==", uid), fsLimit(adet));
    const snap = await getDocs(q);
    const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => !p.silindi);
    liste.sort((a, b) => (b.zamanMs || 0) - (a.zamanMs || 0));
    return liste;
  } catch (e) { return []; }
}
export async function pazarUrunSil(id) {
  try { await deleteDoc(doc(db, "pazarUrunleri", id)); return true; } catch (e) { return false; }
}
export async function pazarFavGuncelle(id, delta) {
  try { await updateDoc(doc(db, "pazarUrunleri", id), { favSayi: increment(delta) }); return true; } catch (e) { return false; }
}
