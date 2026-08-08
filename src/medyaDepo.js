// GLOXORG — MEDYA DEPOSU (IndexedDB). Gloxoo sohbetindeki AĞIR görseller (üretilen resimler + kullanıcı fotoğrafları)
// localStorage'a SIĞMIYORDU (~5MB kota) → kayıt başarısız olunca yenilemede konuşmalar/fotoğraflar KAYBOLUYORDU.
// Artık büyük base64 görseller BURAYA (IndexedDB, çok daha büyük/kalıcı) yazılır; localStorage'da sadece küçük "anahtar" kalır.
// Böylece: metin/konuşma HER ZAMAN kalır, fotoğraflar da KAYBOLMAZ. Her şey defansif — IndexedDB yoksa sessizce atlar (çökmez).
const DB_AD = "gloxMedya";
const DEPO = "medya";

function veritabaniAc() {
  return new Promise((res, rej) => {
    try {
      if (typeof indexedDB === "undefined") { rej(new Error("indexedDB yok")); return; }
      const istek = indexedDB.open(DB_AD, 1);
      istek.onupgradeneeded = () => { try { const d = istek.result; if (!d.objectStoreNames.contains(DEPO)) d.createObjectStore(DEPO); } catch (e) {} };
      istek.onsuccess = () => res(istek.result);
      istek.onerror = () => rej(istek.error || new Error("açılamadı"));
    } catch (e) { rej(e); }
  });
}

// Bir görseli (dataURL/base64 metni) anahtarla kaydet. Başarılıysa true.
export async function medyaYaz(anahtar, deger) {
  if (!anahtar || !deger) return false;
  try {
    const d = await veritabaniAc();
    return await new Promise((res) => {
      try { const tx = d.transaction(DEPO, "readwrite"); tx.objectStore(DEPO).put(deger, anahtar); tx.oncomplete = () => res(true); tx.onerror = () => res(false); tx.onabort = () => res(false); }
      catch (e) { res(false); }
    });
  } catch (e) { return false; }
}

// Anahtardaki görseli oku (yoksa "").
export async function medyaOku(anahtar) {
  if (!anahtar) return "";
  try {
    const d = await veritabaniAc();
    return await new Promise((res) => {
      try { const tx = d.transaction(DEPO, "readonly"); const rq = tx.objectStore(DEPO).get(anahtar); rq.onsuccess = () => res(rq.result || ""); rq.onerror = () => res(""); }
      catch (e) { res(""); }
    });
  } catch (e) { return ""; }
}
