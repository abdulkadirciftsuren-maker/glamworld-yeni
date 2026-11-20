// GLOXORG — ORTAK "DOSYA VER" ve "YAZDIR" (PDF, Excel, Word, foto).
// ⛔ ESKİ HATA (20 Kas, kullanıcı: "Muhasebe PDF çalışmıyor"): telefon UYGULAMASINDA (WebView) sayfanın ürettiği dosya
//   İNDİRİLEMİYOR (blob adresi), "paylaş" penceresi de yok → düğmeye basınca HİÇBİR ŞEY olmuyordu; window.print() da çalışmıyor.
// DOĞRUSU: uygulamadaysak dosya uygulamaya verilir (AndroidGlox.dosyaVer) → İndirilenler/GLOXORG'a kaydedilir + "Aç / Gönder".
//   Tarayıcıda: paylaş penceresi (WhatsApp vb.), olmazsa İndirilenler'e iner.
import i18n from "./i18n";

const ceviri = (k, v) => { try { return i18n.t(k, v); } catch (e) { return v; } };
const kopru = () => { try { return window.AndroidGlox || null; } catch (e) { return null; } };

function base64Yap(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => { const s = String(r.result || ""); res(s.slice(s.indexOf(",") + 1)); };
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

// blob: dosyanın kendisi, ad: "GLOXORG-....pdf", baslik: paylaş başlığı
export async function dosyaVer(blob, ad, baslik) {
  const tur = blob.type || "application/octet-stream";
  const k = kopru();
  if (k && typeof k.dosyaVer === "function") {
    try {
      const b64 = await base64Yap(blob);
      const ok = k.dosyaVer(b64, ad, tur, ceviri("dosyaHazir", "Dosya hazır ✓ (İndirilenler/GLOXORG)"), ceviri("dosyaAc", "Aç"), ceviri("dosyaGonder", "Gönder"));
      if (ok) return;
    } catch (e) {}
  }
  try {
    const dosya = new File([blob], ad, { type: tur });
    if (navigator.canShare && navigator.canShare({ files: [dosya] })) { await navigator.share({ files: [dosya], title: baslik || "GLOXORG" }); return; }
  } catch (e) {} // paylaş kapatıldı/olmadı → yedek: İndirilenler'e iner (eskisi gibi)
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = ad;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// Yazdır: uygulamada telefonun yazıcı ekranı, tarayıcıda window.print()
export function yazdirBaslat(baslik) {
  const k = kopru();
  if (k && typeof k.yazdir === "function") { try { k.yazdir(baslik || "GLOXORG"); return; } catch (e) {} }
  try { window.focus(); } catch (e) {}
  try { window.print(); } catch (e) {}
}
