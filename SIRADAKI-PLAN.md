# 🌙 SIRADAKİ PLAN — kullanıcının "WhatsApp gibi GLOME" hayali

> Bu dosya, kullanıcı çok yorulup gece bıraktığında yazıldı (2026-07-14, ~01:00).
> Kullanıcı "yarın hepsini unutacaksın" diye endişelendi — **unutmayalım diye burada.**
> Kullanıcı WhatsApp'ı örnek gösterdi (ekran görüntüsü); GLOME'un öyle olmasını istiyor.
> KURAL: Yeni sorun aramak yerine **bu listeden** git. TEK TEK yap, her birini bitirince
> kullanıcıya göster + onay al, öyle devam et. Her şey Türkçe, adım adım.

## 🎯 YAPILACAKLAR (öncelik sırası — kullanıcının istediği gibi)

1. **GLOME kişi listesi (WhatsApp gibi):** Bütün kişiler alt alta, **fotoğraflı**, isim + son
   mesaj/arama önizlemesi + saat + okunmamış sayısı; üstte arama çubuğu; aşağı kaydırmalı.
   Şu an sadece "ara-bul" şeridi var, herkes listelenmiyor → **herkes listelenecek.**

2. **Asılı (floating) arama düğmesi:** Arama düğmeleri şu an sohbet başlığının **ÜSTÜNDE**
   (B70). Kullanıcı bunu İSTEMİYOR. Sağ **ALTTA, yuvarlak, "asılı" güzel** bir düğme olsun
   (WhatsApp'ın yeşil FAB'ı gibi). Basınca sesli/görüntülü arama seçeneği çıksın. Üstteki
   sabit düğmeler kalksın. "Bize has, değişik" bir tasarım istiyor.

3. **Bildirimde GÖNDERENİN fotoğrafı:** Bildirimde hâlâ **GLOXORG logosu** çıkıyor (iki tarafta
   da), kimden geldiği belli değil. functions foto:gonderenFoto/arayanFoto gönderiyor (B71,
   kullanıcı functions'ı YÜKLEDİ) ve sw.js `icon:d.foto` kullanıyor — AMA hâlâ logo çıkıyor.
   **SEBEP ARAŞTIR:** (a) gonderenFoto boş mu geliyor (mesajGonder/bildirimEkle gonderenFoto
   dolu mu?), (b) Google foto URL'si (lh3.googleusercontent) bildirim ikonu olarak
   yüklenemiyor mu (referrer/CORS)? Gerekirse foto'yu Storage'a al ya da uygun URL kullan.

4. **Sayfa AÇIKKEN pencere-içi bildirim:** Kapalıyken FCM push geliyor (ÇALIŞIYOR). Ama sayfa
   AÇIKKEN pencerede hiç uyarı çıkmıyor. Uygulama açıkken mesaj/beğeni/arama gelince pencere
   içinde **güzel bir bildirim şeridi/balonu** göster (in-app toast/banner).

## 🔧 AÇIK / TEŞHİS BEKLEYEN

- Arama: "telefon açıkken sadece GLOME'de arama geliyor" — gelen dinleyici global (deps [u],
  satır ~3026) + arayüz global render (satır ~7186). Kullanıcı hâlâ yaşıyorsa **ekran kaydı** iste.
- Arama: "ben kapatınca karşı taraf kapanmıyor" — firestore.rules **YAYINLANDI** (kullanıcı
  deploy etti); tekrar test edilsin. Hâlâ olursa aramaKapat/aramaDinle "bitti" akışına bak.
- Büyük ekran (desktop) düzeni bozuk (başlık/amblem/isim/ikonlar geniş ekranda) — ayrı iş.
- "Ayarlar güncellemede sıfırlanıyor" — hangi ayar net değil; kullanıcıya sor.

## ✅ BUGÜN BİTENLER (kullanıcıya hatırlat — moral)

- **Kapalıyken bildirim ÇALIŞIYOR** (FCM; ayrı firebase-messaging-sw.js gstatic'ten yüklenemiyordu
  → sitenin kendi sw.js'i FCM push alıyor, B66). Kök çözüm.
- Zil sesi zarif çan + cevapsız arama 30sn (B68); aramaya hoparlör/ses düğmesi (B71).
- gloxorg.com şeridi kalktı + paylaşımda "yazıma gloxorg.com ekle" (B62); yazıda link tıklanır.
- Beğeni gerçek sayı + tepkiler (firestore.rules **YAYINLANDI** — kullanıcı deploy etti).
- Tepki simgesi GLOME üstünde seçilebilir/gizlenebilir (B70).
- functions (bildirim + gönderen fotoğrafı) kullanıcı tarafından YÜKLENDİ.

---
*Kullanıcı teknik değil, İngilizce bilmez, çok yoruldu. Sabırlı, Türkçe, adım adım, TEK TEK, onayla.*
