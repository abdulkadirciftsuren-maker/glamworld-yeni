# 🎓 CANLI DERS VE CANLI DANIŞMANLIK — PLAN (taslak, kullanıcı onayı bekliyor)

> 10 Kasım 2026. Kullanıcı: "Canlı ders ve danışmanlık olsun, planını çıkar." GLOXORG'daki **Canlı Akış** sekmesinin
> yerine gelecek. (AI Danışma Ofisi AYRI proje → `AI-DANISMA-OFISI-PLAN.md`.) Onay gelmeden KOD YAZILMAZ.

## 1. Fikir
- Profesyoneller (kuaför, usta, aşçı, öğretmen, avukat, muhasebeci, satıcı…) **canlı yayın açar**: işini gösterir, ders verir,
  soru cevaplar. İnsanlar izler, yazar, kalp atar, **hediye** gönderir.
- **Canlı ders:** önceden planlanan, istenirse **biletli** (ücretli) küçük grup dersleri.
- **Canlı danışmanlık:** müşteri bir profesyonelden **randevu** alır, **ücretli birebir görüntülü** görüşme yapar (Glome altyapısı).
- GLOXORG'un "profesyonel ile müşteriyi buluşturma" fikrinin canlı hali. İnsanların sayfaya girmek için nedeni:
  "şu an kim canlı, ne öğretiyor", "sorumu uzmana canlı sorayım".

## 2. Elimizde hazır olanlar (üstüne kurulur, sıfırdan yazılmaz)
- **Canlı görüntü sunucusu:** Hetzner + LiveKit (Glome aramaları ve 10 kişilik grup görüşmesi bununla çalışıyor).
  Canlı yayında yayıncı 1, izleyici çok olur; sunucu bunu da yapabilir.
- **Grup görüşmesi kodu** (Anasayfa: grupLivekitBaglan) — kamera/mikrofon, katılımcı listesi hazır.
- **Akademi** (meslek eğitimi + sınav + sertifika) — canlı dersler buna bağlanabilir ("Akademi'de canlı ders").
- **Bildirim sistemi** (telefona push) — "X şu an canlı yayında" bildirimi için.
- **Profesyonel profilleri ve meslekler** — yayınları mesleğe göre listelemek için.

## 3. Sayfa nasıl görünecek (Canlı Akış yerine)
1. **Üstte: "Şu an canlı"** — canlı yayın kartları (kare kapak, yayıncının kare fotoğrafı, meslek, izleyici sayısı, kırmızı CANLI).
2. **"Yaklaşan dersler"** — tarih/saat, konu, ücretsiz/biletli, "Hatırlat" düğmesi.
3. **Meslek filtreleri** — Kuaför, Usta, Yemek, Moda, Eğitim, Hukuk, Finans… (yazılar kesilmez, kayar).
4. **"Canlı yayın başlat"** düğmesi (profesyoneller için; büyük, altın).
5. **"Danışmanlık al"** — uzman listesi, fiyat, müsait saatler, randevu.
6. Küçük **"AI Danışma Ofisi"** girişi (yeni bağımsız siteye götürür).
Tasarım: altın zemin, siyah yok, kare düğme ve avatar, yazılar kesilmez.

## 4. Canlı yayın ekranı
- **Yayıncı:** ön/arka kamera, mikrofon aç/kapa, ekranda izleyici sayısı, gelen yorumlar, hediyeler, yayını bitir.
- **İzleyici:** tam ekran görüntü, alttan akan **canlı yorumlar**, kalp/tepki, **hediye gönder**, "takip et", "danışmanlık al".
- **Canlı çeviri altyazı (öne çıkan özellik):** yayıncı Türkçe konuşur, izleyici kendi dilinde **altyazı** görür
  (yapay zekâ ile; 13 dil). GLOXORG'un çok dilli kitlesi için büyük fark. (Maliyeti var → Aşama 3, Pırlanta üyelere.)
- **Güvenlik:** yorum şikâyet et/engelle, yayıncı kişiyi yayından çıkarabilir, uygunsuz içerik bildirme.

## 5. Para modeli
- **Hediyeler:** izleyici "GLOX" hediyeleri gönderir (gül, elmas, taç…); yayıncıya pay, platforma pay (öneri %30 platform).
- **Biletli ders:** yayıncı fiyat koyar (örn. 3–20 €); platform komisyonu (öneri %15–20).
- **Birebir danışmanlık:** uzmanın fiyatı + platform komisyonu (öneri %15–20).
- **Pırlanta üyelik:** canlı altyazı, yayınlarda öne çıkma, sınırsız kayıt izleme.

### ⚠️ Ödeme ile ilgili dürüst gerçekler
1. **Play Store kuralı:** Uygulama içinde satılan dijital şeyler (hediye, canlı ders bileti) için Google kendi ödeme sistemini
   ZORUNLU tutar ve kesinti alır (%15–30). Web sitesinde Stripe kullanılabilir. **Birebir danışmanlık** (gerçek kişiden
   hizmet) için kurallar daha esnek; yine de dikkatle kurulmalı.
2. **Yayıncılara para ödemek** (pay dağıtmak) için "pazar yeri" ödeme sistemi gerekir (Stripe Connect): her yayıncı kimliğini
   doğrular, para onun hesabına geçer. Bu, platformun yasal olarak "aracı" olması demek → **Gewerbe/şirket kaydı ve vergi
   danışmanı ŞART.** (Aynı konu AI Danışma Ofisi için de geçerli; birlikte çözülmeli.)
3. Bu yüzden **ilk aşama ÜCRETSİZ** başlar: önce insanlar yayın açsın/izlesin, sayfa canlansın; ödeme altyapısı yasal
   hazırlık bitince eklenir.

## 6. Kapasite ve maliyet
- Mevcut Hetzner sunucusu (CPX22: 2 işlemci, 4 GB) aynı anda **birkaç yayını ve her birinde yaklaşık 50–100 izleyiciyi**
  normal kalitede taşıyabilir (tahmini; gerçek sayı denemeyle ölçülür). Aylık trafik kotası geniş (20 TB).
- Büyüyünce daha güçlü sunucuya geçiş: ayda **~15–30 €**. Yayın **kaydı** (sonradan izleme) ayrı işlem gücü ister → Aşama 3.
- Canlı altyazı (yapay zekâ): dakika başına küçük maliyet → üyelik/ücretli derse bağlanır.

## 7. Aşamalar
- **Aşama 1 — Ücretsiz canlı yayın (~1 hafta):**
  yeni sayfa ("Şu an canlı" + meslek filtresi + "Canlı yayın başlat"), yayıncı ve izleyici ekranı, canlı yorum + kalp,
  izleyici sayısı, takipçilere "canlı yayında" bildirimi, şikâyet/engelle, "AI Danışma Ofisi" girişi.
  Eski Canlı Akış (kısa videolar) kaldırılır; videolar zaten **Makara**'da.
- **Aşama 2 — Planlı dersler ve randevu:** ders takvimi, "Hatırlat", birebir danışmanlık randevusu (Glome görüntülü),
  uzmanın müsait saatleri; henüz ücretsiz ya da "ödeme yakında".
- **Aşama 3 — Para ve öne çıkan özellikler:** hediyeler, biletli dersler, ücretli danışmanlık (yasal hazırlık + Stripe
  Connect + Play ödeme), canlı çeviri altyazı, yayın kaydı → Makara/Akademi.

## 8. Kullanıcıdan beklenen kararlar
1. Kimler yayın açabilsin? (Öneri: başta **sadece profesyonel profili olanlar** — kalite ve güven için; sonra herkes.)
2. Aşama 1'i ücretsiz başlatalım mı? (Öneri: evet.)
3. Hediye ve komisyon oranları (öneri: hediyede %30, derste/danışmanlıkta %15–20 platform).
