# 🌙 SIRADAKİ PLAN — kullanıcının "WhatsApp gibi GLOME" hayali

> Bu dosya, kullanıcı çok yorulup gece bıraktığında yazıldı (2026-07-14, ~01:00).
> Kullanıcı "yarın hepsini unutacaksın" diye endişelendi — **unutmayalım diye burada.**
> Kullanıcı WhatsApp'ı örnek gösterdi (ekran görüntüsü); GLOME'un öyle olmasını istiyor.
> KURAL: Yeni sorun aramak yerine **bu listeden** git. TEK TEK yap, her birini bitirince
> kullanıcıya göster + onay al, öyle devam et. Her şey Türkçe, adım adım.

## 🏗️ BÜYÜK YENİDEN TASARIM (2026-07-14 — kullanıcı onayladı, SIRAYLA yap, UNUTMA)

> Kullanıcı bilgisayar/tablet düzeni + tema için net karar verdi. TEK TEK yap, göster, onayla.

- **A) TEMA (B82 — YAPILDI, kullanıcı onayı bekleniyor):** Zemin AÇIK GECE MAVİSİ (derin radial, düz boya değil).
  İsim RESİM değil YAZI oldu (Playfair/serif altın, 4 no tasarım), geniş ekranda büyür. İsim altında
  KİŞİYE ÖZEL ince şerit (uid'den renk, herkes farklı). theme-color + yükleme ekranları da mavi.
- **B) BÖLÜMLER (sıradaki):** Yakındaki Profesyoneller (gerçek üyeler) / İş İlanları (tur=is postlar) /
  Trend (paylaşım #etiketleri). HEM bilgisayarda HEM telefonda görünecek. Telefonda akışı BOZMADAN
  yatay şerit(ler) olarak (hikâye şeridi gibi) araya girecek.
- **C) BİLGİSAYAR YATAY ŞERİT DÜZENİ (sıradaki):** Akış AŞAĞI değil SOLA kayan yatay şerit (makara gibi);
  altına Profesyoneller/İlanlar/Trend yatay şeritleri (Netflix gibi, aşağı indikçe). Üstte isim BÜYÜK +
  ikonlar görünür + isim şeridi tüm eni kaplamaz, yanına şeyler gelir. Boş yer kalmayacak. Postlar YATAY/geniş.
  Referans mock: scratchpad/masaustu-taslak3.png (kullanıcıya gösterildi, beğendi).
- ⚠️ Bilgisayar düzeni CANLI önizlenemiyor (giriş+veri lazım) → mock ile göster, ONAYLA, sonra kur.
  B80'de çok-sütun yaptım → kullanıcı çok kızdı, geri alındı (B81). Bir daha körlemesine yayınlama.

## 🎯 YAPILACAKLAR (öncelik sırası — kullanıcının istediği gibi)

1. ✅ **(B73 BİTTİ) GLOME kişi listesi (WhatsApp gibi):** Bütün kişiler alt alta, **fotoğraflı**,
   isim + önizleme; üstte arama çubuğu; aşağı kaydırmalı. Arama boşken önce "Sohbetler" sonra
   "Kişiler" bölümü herkesi listeliyor (glomeDigerKisiler memo). **Kullanıcı onayı bekleniyor.**

2. ✅ **(B73 BİTTİ) Asılı (floating) arama düğmesi:** Arama düğmeleri sohbet başlığından kaldırıldı,
   sağ **ALTTA** yuvarlatılmış "asılı" altın düğmeye alındı; basınca Görüntülü/Sesli menüsü açılıyor
   (.sohbet-arama-fab). **Kullanıcı onayı bekleniyor.**

3. **Bildirimde GÖNDERENİN fotoğrafı:** Bildirimde hâlâ **GLOXORG logosu** çıkıyor (iki tarafta
   da), kimden geldiği belli değil. functions foto:gonderenFoto/arayanFoto gönderiyor (B71,
   kullanıcı functions'ı YÜKLEDİ) ve sw.js `icon:d.foto` kullanıyor — AMA hâlâ logo çıkıyor.
   **SEBEP ARAŞTIR:** (a) gonderenFoto boş mu geliyor (mesajGonder/bildirimEkle gonderenFoto
   dolu mu?), (b) Google foto URL'si (lh3.googleusercontent) bildirim ikonu olarak
   yüklenemiyor mu (referrer/CORS)? Gerekirse foto'yu Storage'a al ya da uygun URL kullan.

4. ✅ **(B125 BİTTİ) Sayfa AÇIKKEN pencere-içi bildirim:** Uygulama açıkken mesaj/beğeni/yorum/
   tepki/takip gelince üstten altın şerit iniyor (gönderenin KARE fotoğrafı + Türkçe metin + ✕),
   5 sn sonra kapanıyor, dokununca ilgili yere gidiyor (mesaj→Glome, diğerleri→bildirimler);
   Glome zaten açıkken mesaj şeridi gösterilmiyor. (pencereBildirimGoster/pencereBildirim)
   **Kullanıcı onayı bekleniyor.**

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
