// ADRES SERVİSİ — GÜVENLİ KÖPRÜ (worker)
// ─────────────────────────────────────────────────────────────────────────────
// HERE anahtarı ARTIK BURADA DEĞİL (kart bağlı olduğu için sitede açıkta durmamalı).
// Anahtar kullanıcının Cloudflare "worker"ında GİZLİ duruyor. Site, adresi worker'dan ister;
// worker anahtarı ekleyip HERE'ye sorar, sonucu geri verir → anahtar hiç sitede görünmez.
//
// Kullanıcı adres worker'ını oluşturunca URL'si BURAYA yazılır (ör:
// "https://gloxorg-adres.abdulkadirciftsuren.workers.dev"). Boşken adres haritası GÖSTERİLMEZ.
export const ADRES_KOPRU = "";
