# ⚡ YENİ OTURUM — ÖNCE BUNU OKU (kullanıcı: "her yeni Code sayfayı bilmiyor, bozuyor, sıfırdan anlattırıyor")

> Bu bölüm, oturumlar arası **süreklilik** için. Yeni gelen Code, sayfayı buradan TANIYARAK başlar; kullanıcıya
> sıfırdan anlattırmaz ve düzeltilenleri bozmaz. **En güncel tam kayıt: `src/buildGecmisi.js` (en üstteki maddeler).**

## 🧭 SAYFA HARİTASI (yeni gelen HEMEN bilsin)
- **Ana sayfa ÜST ikon şeridi (`ana-nav`):** 🪞 Ayna · 🏠 Ana Sayfa · 💎 (Pro/Elite) · 👥 Topluluk · 📹 Video · 📍 Konum · 🎓 Akademi · Profil. **Hepsi buradan açılıyor ve ÇALIŞIYOR.** (Topluluk=Tanış sayfası, Akademi=eğitim+sertifika — ikisi de hazır.)
- **Alt tab bar:** Keşfet · Ara · Makara (Reels) · Konum · Glome · Profil.
- **AI asistan = "Gloxoo".** Sesli okuma VARSAYILAN olarak **telefonun kendi sesi** (tarayıcı TTS); internet/worker "gerçek ses" güvenilmez → kapalı (`gercekSesKapaliRef=true`).
- **Ben (Code) giriş yapmış sayfayı buradan GÖREMEM** (sadece açılış/giriş ekranı). Giriş-içi bir şeyi tam anlamak için kullanıcıdan **ekran görüntüsü** iste; körlemesine tahmin etme.

## 🛠️ ÇALIŞMA DİSİPLİNİ (kırılmayı önleyen kurallar — HARFİYEN)
1. **Deploy'dan ÖNCE KENDİN dene:** `CI=false npx react-scripts build`, sonra Playwright ile `build/`'i yerelde aç (chromium: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, `--no-sandbox`, localhost'ta proxy YOK) → sayfa render oluyor mu + konsol hatası var mı bak. Kullanıcıya **bozuk verme.**
2. **Eskiyi SİL, yorumla bırakma:** bir şeyi düzeltince eski bozuk yolu tamamen kaldır (yedekte kalırsa iş kayınca ona düşüp yine bozulur — kullanıcının en büyük şikâyeti bu).
3. **TEK seferde TEK iş:** yap → yayınla → kullanıcı denesin → onay → sonrakine geç. Toplu/çoklu değişiklik yapma.
4. **Onaylanmış/çalışan şeyi ASLA geri bozma.** Emin değilsen `buildGecmisi.js`'i oku.
5. **Kullanıcı çok yoruldu ve kırıldı.** Sakin, Türkçe, adım adım, tahminsiz. Söz verdiğini yap, olmayanı "oldu" deme.
6. **Deploy:** `CI=false npx react-scripts build` → `npx gh-pages -d build --dotfiles`. HER deploy: `public/sw.js`'de `SW_SURUM` +1 **ve** `src/buildGecmisi.js`'e en üste Türkçe kayıt.

## ✅ SON DÜZELTMELER (B105→B114 — BOZMA, geri alma)
- **B106–B109 · Sesli okuma:** cümleler SIRAYLA okunur (Android "ilk cümleden sonra susma" düzeldi) + keepalive (`resume`) + imleç senkron (parça gerçek konumu `indexOf`) + Gloxoo artık "sesli okuyamıyorum/ses motoru" DEMEZ (sistem promptu).
- **B110 · Canlı sohbet:** son cümlenin kesilmesi + dinleme kilidi düzeldi (`canliDevam` gloxKonusuyor + ~1.2sn kesintisiz sessizlik). **Barge-in:** Gloxoo konuşurken/düşünürken YEŞİL düğme (o an ALTIN olur) = durdur + yeniden dinle (`canliKes`, `aiTurRef`). Mola 3.5sn.
- **B111–B112 · Arka plandan dönünce ZORLA yeniden yükleme KALDIRILDI.** `guvenliYenile`'ye kilit: `sonGorunurMs` — dönüşten 12sn içinde reload YOK. Otomatik güncelleme KORUNDU (60sn interval + temiz açılış). Dönüşte reload'un tek kapısı burası; kilit orada.
- **B113 · Akışta yazı YERİNDE açılır:** yazıya dokun → tam ekran değil, fotoğrafın ALTINDA aç/kapa (`yaziAcikSet`; 2 satır + "devamını oku"/"gizle"). Foto tıklama hâlâ tam ekran. Başlık sınırsız (maxLength 20000). Açık yazı ekrandan çıkınca IntersectionObserver ile otomatik kapanır (`data-pid`).
- **B114 · Menü sadeleşti:** gereksiz "Ana Sayfa / Topluluk·Çok yakında / Akademi·Çok yakında" düğmeleri silindi (üst şeritte zaten var).

## ⏳ AÇIK / DOKUNMA (kullanıcı izni olmadan)
- **Android GERİ tuşu, ana sayfada 2 kez basınca** sayfanın bir kısmını yeniden yüklüyor. Kullanıcı şimdilik **"B — dokunma"** dedi. Burası sayfanın **EN kırılgan yeri** (buildGecmisi'de defalarca eklenip sökülmüş: pushState koruma kaydı + popstate). Düzeltmeye ancak kullanıcı "başla" derse, KÜÇÜK ve denenmiş şekilde gir.

---

# 🌙 SIRADAKİ PLAN — kullanıcının "WhatsApp gibi GLOME" hayali

> Bu dosya, kullanıcı çok yorulup gece bıraktığında yazıldı (2026-07-14, ~01:00).
> Kullanıcı "yarın hepsini unutacaksın" diye endişelendi — **unutmayalım diye burada.**
> Kullanıcı WhatsApp'ı örnek gösterdi (ekran görüntüsü); GLOME'un öyle olmasını istiyor.
> KURAL: Yeni sorun aramak yerine **bu listeden** git. TEK TEK yap, her birini bitirince
> kullanıcıya göster + onay al, öyle devam et. Her şey Türkçe, adım adım.

## 🎓 AKADEMİ — kullanıcının tam vizyonu (2026-08-03, UNUTMA)

> Akademi sayfası kuruldu (B253). Kullanıcı vizyonu netleştirdi. YAPILDI + SIRADA:
- ✅ **İki katmanlı eğitim:** (a) TEMEL eğitim (meslek genel), (b) ÇEŞİTLER — her tür TEK TEK
  ölçüsü + yapılışı ile (hamurcu: her hamur ne kadar tuz/su/maya, nasıl yoğrulur/şekil verilir;
  kuaför: her kesim nasıl; tırnak: her model nasıl). B254'te yapıldı.
- ✅ **Sınav CİDDİ:** "çocuk oyuncağı" sorular gitti; profesyonel, zor, anlatılan içerikten;
  geçme ≥%70. Sertifika bu ciddi sınavdan gelir. B254.
- ✅ **Yazı KESİLMEZ:** her ders/konu tamamlanır, yarım cümle kalmaz (bölüm bölüm + "tamamla" talimatı). B254.
- ⏳ **GÖRSELLİ/VİDEOLU EĞİTİM (SIRADA — görsel yapay zekâ, PARALI):** her saç kesimi/tırnak/hamur
  şeklinin FOTOĞRAFI + nasıl yapıldığının VİDEOSU. Metin var; gerçek görsel için görsel-üreten
  yapay zekâ (paralı) gerekir — canlı yayın gibi ertelendi.
- ⏳ **MÜŞTERİ "KENDİ FOTOĞRAFINDA DENE" (SIRADA, EĞİTİMİN DIŞINDA, PARALI görsel YZ):** müşteri saç
  modelini/tırnağı KENDİ fotoğrafı üzerinde dener, kaydeder/indirir, kuaförüne gönderir. Bu, eğitim
  DEĞİL; kuaförün profili/randevu akışında ayrı bir bölüm olacak (kullanıcı böyle istedi).
- ⏳ **Uluslararası geçerli sertifika:** ancak resmî akreditasyon kurumu anlaşmasıyla (para/anlaşma).

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

## 🆕 GLOXOO YETENEK EKLEME (2026-07-27 — kullanıcı 4'ünü de istedi, SIRAYLA)

> Kredi (Anthropic yazı beyni) düzeldikten sonra kullanıcı "Gloxoo'ya ne ekleyebiliriz" dedi;
> 4 yetenek seçildi: (1) gerçek insan sesi (2) fotoğrafa baksın (3) belge/PDF okusun (4) resim üretmeyi aç.
- ✅ **(1) GERÇEK İNSAN SESİ — B165 BİTTİ, KULLANICI ONAYLADI ("ses doğal geldi, harika oldu").**
  Google/Gemini TTS (gemini-2.5-flash-preview-tts, ses "Aoede"); resimle AYNI Google kredisi, worker
  gerekmez. firebase.js gloxooSesUret + Anasayfa gercekSesOku (tek parça <audio> → uzun cevap kesilmez).
  Gelmezse eski tarayıcı sesine düşer. NOT: worker'da B164'te eklenen /seslendir (OpenAI) KULLANILMIYOR
  ama zararsız duruyor — kullanıcı OpenAI kredisi eklemek istemedi, Google'ı seçti.
- ✅ **(2) FOTOĞRAFA BAKSIN — BİTTİ, KULLANICI ONAYLADI** ("gördü doğru anlattı"). Zaten vardı (ataç→foto→Claude vision); kredi açılınca çalıştı.
- ✅ **(3) BELGE/PDF OKUSUN — BİTTİ, KULLANICI ONAYLADI** ("PDF'i de gördü"). Ataç→Dosya→Claude document bloğu.
- ✅ **(4) RESİM ÜRETSİN — BİTTİ, KULLANICI ONAYLADI** ("resim de geldi"). Google/Gemini; kredi açık.

## ✅ 2026-07-27 GECE BİTENLER (moral — kullanıcıya hatırlat)
- **Gerçek insan sesi (Google TTS)** B165–B166: hemen başlar (cümle cümle), kelime imleci balonda yürür, ses seçimi (B168).
- **Sayfa hızlandırıldı** B167: sw.js /static JS/CSS önbelleğe alıyor → tekrar açılışlar hızlı.
- **Foto/konu hafızası** B168–B169: Gloxoo yenilemeden sonra da fotoğrafı/konuyu hatırlar; yüz düzenlemede son fotoğrafı otomatik kullanır.
- **ELİTE PAZAR (1. parça) B170 KURULDU** (kullanıcı mockup onayladı + firestore.rules YAYINLADI + ilk ilanı verdi).
  src/ElitePazar.js(+css). Renkli kategoriler, ilan verme (foto/video/fiyat/etiket), Gloxoo ilan yazma+fiyat önerisi,
  favori, detay, Satıcıya Yaz (Glome). **Kullanıcı ekran fotoğrafı GÖSTEREMEDİ (internet zayıf) → yarın görünümü kontrol et.**

## 🛒 ELİTE PAZAR — SIRADAKİ PARÇALAR (yarın)
1. **Kullanıcıdan ekran görüntüsü al**, görünüm/hizalama düzelt (gerçek app'te canlı önizlenemiyor, foto şart).
2. Alıcıya **"bu fiyat uygun mu?"** (Gloxoo değerlendirir) + **pazarlık mesajı önerisi** (Satıcıya Yaz'da).
3. **Akıllı arama:** "20 bin altı temiz telefon bul" → Gloxoo filtreler.
4. Şüpheli ilan **güvenlik uyarısı**; ilanlarım/favorilerim sekmesi; (ileride) ödeme.
5. Diğer boş sayfalar da sırayla doldurulacak (kullanıcı: "sayfa sayfa dolduralım").

## 🎯 YAPILACAKLAR (öncelik sırası — kullanıcının istediği gibi)

1. ✅ **(B73 BİTTİ) GLOME kişi listesi (WhatsApp gibi):** Bütün kişiler alt alta, **fotoğraflı**,
   isim + önizleme; üstte arama çubuğu; aşağı kaydırmalı. Arama boşken önce "Sohbetler" sonra
   "Kişiler" bölümü herkesi listeliyor (glomeDigerKisiler memo). **Kullanıcı onayı bekleniyor.**

2. ✅ **(B73 BİTTİ) Asılı (floating) arama düğmesi:** Arama düğmeleri sohbet başlığından kaldırıldı,
   sağ **ALTTA** yuvarlatılmış "asılı" altın düğmeye alındı; basınca Görüntülü/Sesli menüsü açılıyor
   (.sohbet-arama-fab). **Kullanıcı onayı bekleniyor.**

3. ✅ **(A13.B5 BİTTİ) Bildirimde GÖNDERENİN fotoğrafı:** KÖK SEBEP BULUNDU — `benimFotoGetir()`
   (mesaj/beğeni/yorum/takip bildirimlerinde gonderenFoto kaynağı) `foto||isFoto` yani BASE64
   "data:" döndürüyordu; sunucu (functions) 4KB sınırı için "data:" alanları SİLİYOR → foto boş
   → logo çıkıyordu. Aramalar zaten `bildirimFotoUrl` (kısa http Storage URL) kullanıyordu, o yüzden
   aramalarda foto görünüyordu. DÜZELTME: `benimFotoGetir()` artık önce `bildirimFotoUrl`'ü (kısa
   http URL) döndürüyor → tüm bildirimlerde gönderenin fotoğrafı görünür. functions redeploy GEREKMEZ.
   **Kullanıcı testi bekleniyor** (başka hesaptan mesaj/beğeni gelsin, foto çıkmalı).

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
