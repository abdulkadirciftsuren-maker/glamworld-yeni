// ADRES SERVİSİ — GÜVENLİ KÖPRÜ (worker)
// ─────────────────────────────────────────────────────────────────────────────
// HERE anahtarı BURADA DEĞİL (kart bağlı → sitede açıkta durmamalı).
// Anahtar kullanıcının Cloudflare "worker"ında GİZLİ duruyor (gloxorg-adres).
// Site, adresi bu köprüden ister; köprü anahtarı ekleyip HERE'ye sorar, sonucu
// geri verir → anahtar hiç sitede görünmez. Köprü sadece gloxorg.com'dan gelen
// isteklere cevap verir (worker içinde origin kontrolü var).
export const ADRES_KOPRU = "https://gloxorg-adres.abdulkadirciftsuren.workers.dev";
