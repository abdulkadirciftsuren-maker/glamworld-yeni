// GLOXORG VERİ ERİŞİM KATMANI (FAZ 0) — ANAYASA 6.16/M
// TÜM Firestore okuma/yazma BURADAN geçer. Bileşenler doğrudan db kullanmaz.
// Böylece arka yüz tek yerden yönetilir, modüler kalır, çökerse tek parça çökmez.
import { db, storage } from "./firebase";
import {
  doc, getDoc, setDoc, deleteDoc, updateDoc,
  collection, collectionGroup, query, where, limit as fsLimit, orderBy, getDocs, onSnapshot,
  serverTimestamp, increment,
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
  try { await setDoc(doc(db, "begeniler", postId + "_" + k.uid), { postId, uid: k.uid, ad: k.ad || "", foto: k.foto || "", zamanMs: Date.now() }); return true; } catch (e) { return false; }
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

// ---------- VİDEO / DOSYA YÜKLEME (FIREBASE DEPOLAMA) ----------
// Cloudinary'den TAŞINDI (ücretsiz kota aşımı + hesap kapanma riski). Artık videolar/dosyalar
// Firebase Depolama'ya yüklenir: tek çatı (Firebase), silince OTOMATİK silinir (medyaSil), şeffaf
// kullandıkça-öde. Dosya yolu: medya/{uid}/{zaman}_{ad} → sadece o kullanıcı yazar/siler (kural).
// Fotoğraflar eskisi gibi Firestore'da (base64) — burada değil.
function _guvenliAd(file, varsayilan) {
  const ad = (file && file.name) || varsayilan;
  return String(ad).replace(/[^\w.\-]+/g, "_").slice(-60) || varsayilan;
}
function _depoyaYukle(file, uid, onProgress, tipVarsayilan) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("eksik"));
    try {
      const yol = "medya/" + (uid || "anon") + "/" + Date.now() + "_" + _guvenliAd(file, "medya");
      const gorev = uploadBytesResumable(depoRef(storage, yol), file, { contentType: file.type || tipVarsayilan });
      gorev.on("state_changed",
        (s) => { if (onProgress && s.totalBytes) onProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)); },
        (e) => reject(e),
        async () => { try { resolve(await getDownloadURL(gorev.snapshot.ref)); } catch (e) { reject(e); } }
      );
    } catch (e) { reject(e); }
  });
}
// Büyük video → Firebase Depolama; güvenli indirilebilir URL döner (post'ta video:URL saklanır).
export function videoYukle(file, uid, onProgress) {
  return _depoyaYukle(file, uid, onProgress, "video/mp4");
}
// Belge (pdf/word/zip vb.) → Firebase Depolama; {url, ad, boyut} döner (post'ta dosya:{...}).
export async function dosyaYukle(file, uid, onProgress) {
  const url = await _depoyaYukle(file, uid, onProgress, "application/octet-stream");
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

// Profili kaydet/güncelle (merge — var olanı bozmaz)
export async function profilKaydet(uid, veri) {
  if (!uid) return false;
  try {
    await setDoc(doc(db, KULLANICILAR, uid), { ...veri, guncelleme: serverTimestamp() }, { merge: true });
    return true;
  } catch (e) { return false; }
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
// Mesaj gönder (arama detayından bir profesyonele). serverTimestamp + zamanMs (anında sıralama için).
export async function mesajGonder({ aliciUid, aliciAd, metin, gonderen } = {}) {
  if (!aliciUid || !metin || !metin.trim() || !gonderen || !gonderen.uid) return false;
  try {
    const ref = doc(collection(db, "mesajlar"));
    await setDoc(ref, {
      aliciUid, aliciAd: aliciAd || "",
      gonderenUid: gonderen.uid, gonderenAd: gonderen.ad || "", gonderenFoto: gonderen.foto || "",
      metin: metin.trim().slice(0, 1000), okundu: false,
      zaman: serverTimestamp(), zamanMs: Date.now(),
    });
    // Alıcıya BİLDİRİM bırak (zil + telefon bildirimi için)
    bildirimEkle({ aliciUid, gonderenUid: gonderen.uid, gonderenAd: gonderen.ad || "", gonderenFoto: gonderen.foto || "", tip: "mesaj", metin: metin.trim().slice(0, 60) }).catch(() => {});
    return true;
  } catch (e) { return false; }
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
  await setDoc(ref, { ...veri, sahipUid: veri.uid || "", olusturma: serverTimestamp(), begeni: 0, yorumSayisi: 0 });
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
  try {
    const kosullar = [];
    if (ulke) kosullar.push(where("ulke", "==", ulke));
    if (meslek) kosullar.push(where("meslek", "==", meslek));
    // ÖNEMLİ: orderBy("olusturma") KULLANMIYORUZ — o alanı OLMAYAN (eski) gönderileri Firestore
    // tamamen DIŞLIYORDU → akışta "kayboluyorlar" sanılıyordu (aslında silinmemişler). Artık tüm
    // gönderileri çekip İSTEMCİDE zamanMs'e göre sıralıyoruz → hiçbir gönderi kaybolmaz.
    const q = query(collection(db, "gonderiler"), ...kosullar, fsLimit(adet));
    const snap = await getDocs(q);
    const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    liste.sort((a, b) => (b.zamanMs || 0) - (a.zamanMs || 0));
    return liste;
  } catch (e) { return []; }
}
