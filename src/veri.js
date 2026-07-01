// GLOXORG VERİ ERİŞİM KATMANI (FAZ 0) — ANAYASA 6.16/M
// TÜM Firestore okuma/yazma BURADAN geçer. Bileşenler doğrudan db kullanmaz.
// Böylece arka yüz tek yerden yönetilir, modüler kalır, çökerse tek parça çökmez.
import { db } from "./firebase";
import {
  doc, getDoc, setDoc, deleteDoc, updateDoc,
  collection, query, where, limit as fsLimit, orderBy, getDocs, onSnapshot,
  serverTimestamp, increment,
} from "firebase/firestore";

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

// ---------- VİDEO YÜKLEME (Cloudinary — ÜCRETSİZ, kartsız) ----------
// Büyük video Firestore'a sığmaz → Cloudinary'e yüklenir, sadece güvenli URL saklanır.
// İmzasız (unsigned) yükleme: tarayıcıdan doğrudan; gizli anahtar gerekmez.
const CLOUDINARY_CLOUD = "dqtclc035";   // Bulut adı (public)
const CLOUDINARY_PRESET = "GLOXORG";    // İmzasız yükleme ön ayarı
export function videoYukle(file, uid, onProgress) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("eksik"));
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", CLOUDINARY_PRESET);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD + "/video/upload");
    xhr.upload.onprogress = (e) => { if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      try {
        const r = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && r.secure_url) resolve(r.secure_url);
        else reject(new Error((r.error && r.error.message) || "yukleme"));
      } catch (e) { reject(e); }
    };
    xhr.onerror = () => reject(new Error("ag"));
    xhr.send(fd);
  });
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

// ---------- GÖNDERİLER (akış — FAZ 2'de kullanılacak, temel hazır) ----------
export async function gonderiEkle(veri) {
  try {
    const ref = doc(collection(db, "gonderiler"));
    // sahipUid ZORUNLU (güvenlik kuralı bunu ister) — veri.uid'den alınır.
    await setDoc(ref, { ...veri, sahipUid: veri.uid || "", olusturma: serverTimestamp(), begeni: 0, yorumSayisi: 0 });
    return ref.id;
  } catch (e) { return null; }
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
// Gönderi sil (sadece sahibi — kural zaten korur)
export async function gonderiSil(id) {
  if (!id) return false;
  try { await deleteDoc(doc(db, "gonderiler", id)); return true; } catch (e) { return false; }
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

export async function gonderileriOku({ ulke, meslek } = {}, adet = 30) {
  try {
    const kosullar = [];
    if (ulke) kosullar.push(where("ulke", "==", ulke));
    if (meslek) kosullar.push(where("meslek", "==", meslek));
    const q = query(collection(db, "gonderiler"), ...kosullar, orderBy("olusturma", "desc"), fsLimit(adet));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) { return []; }
}
