# 📑 AI DANIŞMA OFİSİ — PLAN (taslak, kullanıcı onayı bekliyor)

> 10 Kasım 2026. Kullanıcı: "Canlı Akış sayfasını hepten değiştireceğiz, para kazandıran, insanların girmek için nedeni olan
> bir şey koyacağız → AI Danışma Ofisi." Bu dosya her oturumda okunmalı; karar verilmeden KOD YAZILMAZ.

## 1. Fikir (kullanıcının sözleriyle özet)
- Dünyadaki **bütün resmi ve resmi olmayan kurumların** (resmi daireler, bankalar, sağlık kuruluşları, sigortalar…) **formları**
  her ülke için, her dilde bulunabilsin.
- Kullanıcı formu **boş indirip kendi doldurabilir** ya da **yapay zekâ onun yerine doldurur**: kullanıcı sadece bilgi verir, AI hazırlar.
- Site **GLOXORG'dan BAĞIMSIZ** olacak; Google aramasında form adını yazan kişi **doğrudan bu sayfaya** gelebilecek.
- Para: kullanıcı ister **abone olur**, ister **küçük bir ücretle tek form** indirir. Para **en sonda** sorulur: önce formu hazırlar,
  ne indireceğini **önizlemede görür**, indirmek isteyince öder.

## 2. Dürüst gerçekler (planı bunlara göre kurduk)
1. **"Bütün dünyanın bütün formlarını" önceden toplamak mümkün değil.** Milyonlarca form var ve sürekli değişiyor.
   ÇÖZÜM — üç yol birlikte:
   - **a) Hazır katalog:** En çok aranan formlar (önce birkaç ülke), resmi kaynağı ve "son kontrol tarihi" ile.
   - **b) "Her formu doldur":** Kullanıcı dünyanın herhangi bir yerinden aldığı formu (PDF ya da fotoğraf) yükler → AI doldurur.
     Böylece katalogda olmayan form da doldurulur. **"Bütün formlar" vaadini asıl bu karşılar.**
   - **c) AI form bulucu:** "Almanya'da çocuk parası başvuru formu" yaz → AI resmi sitedeki formu bulur, getirir, doldurur.
2. **Telif / yasal:** Devlet formları genelde serbestçe dağıtılabilir; bankaların ve özel kurumların formları onların malıdır.
   Bu yüzden özel kurum formlarını **kendi sitemizde saklamayız**; resmi bağlantısını veririz ya da kullanıcı kendisi yükler.
   Sitede açıkça yazılır: "Resmi kurum değiliz; hukuki danışmanlık değildir."
3. **Kişisel veri (çok önemli):** Formlarda kimlik numarası, adres, sağlık bilgisi var. Avrupa kuralları (GDPR) gereği:
   - veriler şifreli tutulur, Avrupa sunucusunda;
   - indirmeden sonra kısa sürede **otomatik silinir** (örn. 24 saat; kullanıcı isterse "bilgilerimi sakla" der);
   - gizlilik metni + açık onay.
   Yayından önce bir avukata (Datenschutz) kısa kontrol ettirmek önerilir.
4. **Ödeme:** Web sitesinde **Stripe** (kart, Apple Pay, Google Pay, SEPA, PayPal eklenebilir).
   Stripe hesabı kullanıcının adına açılır, kimlik ve banka doğrulaması ister. Satış vergisi (KDV/OSS) için
   **vergi danışmanına (Steuerberater) sorulmalı.**
   ⚠️ GLOXORG Android uygulamasının içinden dijital ürün satarsak Google kendi ödeme sistemini (%15) zorunlu tutar.
   Bu yüzden satış **bağımsız web sitesinde** olur; uygulama sadece bağlantı verir (kurallara uygun şekilde).
5. **Doldurma doğruluğu:**
   - Doldurulabilir PDF (kutuları olan) → alanlar birebir, kusursuz doldurulur.
   - Taranmış/düz PDF ve fotoğraf → AI kutuların yerini bulup yazar; kullanıcı önizlemede kontrol eder, gerekirse
     yazıyı parmağıyla kaydırır. İlk sürümde önce kutulu PDF'ler, sonra düz PDF'ler.
6. **Önizleme–ödeme güvenliği:** Önizleme **"ÖNİZLEME" filigranlı** ve düşük çözünürlüklü gösterilir. Temiz PDF
   ödeme doğrulandıktan sonra **sunucuda** üretilir; ödemeden indirilemez.

## 3. Kullanıcı ne yapabilecek (özellikler)
1. **Form ara** — ülke + kurum + konu (örn. "Almanya → Familienkasse → Kindergeld"); her dilde arama.
2. **Boş formu indir** — resmi kaynak bağlantısıyla (resmi formlar ücretsiz; reklam/üyelik için çekici kapı).
3. **AI ile doldur** — sohbet gibi: AI kutuları kullanıcının **kendi dilinde** sorar ("Bu kutuya doğum yerin yazılır"),
   cevapları formun dilinde forma yazar. Kullanıcı Türkçe konuşur, form Almanca dolar.
4. **Her kutunun açıklaması** — "Bu kutu ne demek, ne yazılır, örnek" (kullanıcının dilinde).
5. **Eklenecek belgeler listesi** — "Pasaport fotokopisi, maaş bordrosu, doğum belgesi…" kontrol listesi.
6. **Nereye, nasıl gönderilir** — adres, online gönderim bağlantısı, randevu bağlantısı, son tarih.
7. **İmza** — parmakla imza çizip forma ekleme.
8. **Resmi yazını anla** (ilk fikir) — gelen mektubun fotoğrafı → ne diyor, son tarih ne, ne yapmalıyım, cevap mektubu.
9. **Hazır mektuplar** — itiraz (Widerspruch), sözleşme iptali (Kündigung: spor salonu, telefon, sigorta…),
   ödeme planı isteme, adres değişikliği… Almanya'da çok aranan, iyi para getiren bir alan.
10. **Son tarih hatırlatıcı** — "Bu formu 14 gün içinde göndermelisin" → e-posta/telefon hatırlatması.
11. **Bilgi kasası (isteğe bağlı, şifreli)** — ad, adres, vergi no bir kez kaydedilir; sonraki formlar kendiliğinden dolar.
12. **Gerçek uzmana sor** — GLOXORG'daki avukat, muhasebeci, tercümana Glome ile ücretli görüntülü danışmanlık
    (biz komisyon alırız). İki siteyi birbirine bağlayan köprü budur.

## 4. Para modeli (öneri — rakamlar kullanıcının kararı)
- Boş resmi form indirme: **ücretsiz** (Google'dan ziyaretçi çeker).
- AI ile doldurulmuş formu indirme: **tek seferlik ~2,99 €**. (Stripe her işlemde küçük sabit ücret alır, o yüzden
  1 €'nun altı kârsız.)
- Abonelik: **~5,99 €/ay** — sınırsız doldurma (adil kullanım), bilgi kasası, hatırlatıcılar, öncelik.
- Uzman danışmanlığı: uzmanın fiyatı + **%15–20 komisyon**.
- Her işlemin yapay zekâ maliyeti birkaç kuruş; fiyat bunu rahat karşılar.

## 5. Teknik yapı (kısa)
- **Ayrı alan adı** (marka adı kullanıcının kararı) — yıllık ~10–20 €.
- **Ayrı site**, her form için Google'ın okuyabildiği **ayrı sayfa** (ülke/kurum/form/dil) → "Kindergeld Antrag ausfüllen"
  diye arayan doğrudan o sayfaya gelir. (GLOXORG'un mevcut sitesi Google'a uygun değil; bu yüzden ayrı ve hafif kurulur.)
- Arayüz 13 dilde (GLOXORG'daki çeviri sistemi yeniden kullanılır).
- Sunucu: mevcut Firebase projesi (Avrupa bölgesi) — veritabanı, dosya, sunucu programları (doldurma + ödeme doğrulama).
- AI: Claude (belge anlama, doldurma) + Gemini (yedek); kişisel veri saklamama ayarlarıyla.

## 6. Aşamalar
- **Aşama 0 — Kararlar (kullanıcı):** marka adı + alan adı, Stripe hesabı, ilk ülkeler, fiyatlar, avukat/vergi kontrolü.
- **Aşama 1 — İlk sürüm (~1–2 hafta):**
  her PDF'i yükle → AI doldur (kutulu PDF) → filigranlı önizleme → Stripe ile öde → indir;
  resmi yazını anla; ilk katalog: **Almanya + Türkiye** en çok aranan ~30'ar form; 13 dil arayüz; gizlilik/otomatik silme.
- **Aşama 2:** düz PDF ve fotoğraf formlar; AI form bulucu; hazır mektuplar (Kündigung/Widerspruch); hatırlatıcı;
  bilgi kasası; yeni ülkeler (Avusturya, Hollanda, Fransa, İngiltere, ABD…); her form için ayrı Google sayfaları.
- **Aşama 3:** abonelik; "gerçek uzmana sor" (GLOXORG + Glome); kurumlar için toplu kullanım.
- **GLOXORG'da:** Canlı Akış sekmesi yerine "AI Danışma Ofisi" girişi (siteyi açar). Kullanıcı söyleyene kadar Canlı Akış'a DOKUNMA.

## 7. Kullanıcıdan beklenen kararlar
1. Marka adı / alan adı (GLOXORG'dan bağımsız olacak).
2. Stripe hesabını kim, hangi şirket/kişi adına açacak? (Gewerbe/şirket var mı?)
3. İlk hangi ülkeler? (Öneri: Almanya + Türkiye)
4. Fiyatlar (öneri: 2,99 € tek form, 5,99 €/ay abonelik).

## 8. KULLANICININ EK İSTEKLERİ (10 Kas, 2. konuşma)
1. **Kişisel dosya (abone):** Abone bütün bilgilerini bir kez yükler → sayfa her evrakı onun istediği gibi yazar, evrakları
   orada **saklar** (kişinin dosyası). Kişinin kaydı ve **durumu** (örn. Almanya'da nasıl kalıyor: AB vatandaşı, oturum izni,
   süresiz oturum, Mavi Kart, öğrenci, iltica, vatandaş…) bilinir; sayfadaki yapay zekâ buna göre **öneriler ve
   hatırlatmalar** yapar (örn. "oturum iznin 3 ay sonra bitiyor, uzatma formun hazır", "vergi beyannamesi son tarihi",
   "Kindergeld yenileme").
   → Bu, en hassas veri türü (kimlik, oturum durumu, sağlık). ŞART: uçtan uca şifreleme, Avrupa sunucusu, açık onay,
   kullanıcı her an "her şeyimi sil" diyebilmeli, AI sağlayıcılarında veri saklamama ayarı. Yayından önce Datenschutz avukatı.
2. **GLOXORG'dan tamamen ayrı:** ayrı marka, ayrı site, **ayrı Firebase projesi** (hassas veriler sosyal ağdan ayrı dursun;
   biri sorun yaşarsa öteki etkilenmesin), **ayrı GitHub deposu**, kendi Android uygulaması → **Play Store'da ayrı yayın**
   (mevcut geliştirici hesabıyla; ek ücret yok).
3. **Ödeme durumu:** Kullanıcının fincanla.com ve bebelumo.com sitelerine bağlı Alman kartı var; **şirketi yok**,
   vergi kimlik numarası (Steuer-ID) verilmiş. Not: Almanya'da düzenli satış için genelde **Gewerbe kaydı** gerekir
   (Kleinunternehmer olarak; birkaç on euro). Satışa başlamadan önce Steuerberater'a sorulmalı. Stripe kişi adına da açılabilir.
   ⚠️ Play Store uygulamasının İÇİNDEN abonelik satılırsa Google Play ödeme sistemi zorunlu (abonelikte %15 kesinti).
   Web sitesinde Stripe. İkisi aynı hesaba bağlanır (web'de ya da uygulamada abone olan her yerde abone sayılır).

## 9. MALİYET (ayrı kurulursa, tahmini)
- Alan adı: ~10–20 €/yıl.
- Sunucu (ayrı Firebase projesi, Avrupa): başta **neredeyse 0** (ücretsiz kotalar); kullanıcı arttıkça az ölçüde artar.
- Yapay zekâ: form başına birkaç kuruş – ~10 kuruş; kişisel dosya özetleri/hatırlatmalar için aylık abone başına birkaç kuruş.
  → Ücretler (2,99 € / 5,99 €) bunu rahat karşılar.
- Ödeme kesintisi: Stripe kart başına ~%1,5 + 0,25 € (Avrupa kartları); Play aboneliğinde %15.
- Play Store: mevcut geliştirici hesabı → ek ücret yok. (iPhone App Store ileride: yıllık ~99 $.)
- Avukat/vergi danışmanı kontrolü: bir kerelik (kullanıcının kararı).

## 10. YAPI ÖNERİSİ (sağlam)
- Google'ın okuyabildiği hızlı web sitesi (her form için ayrı sayfa) + aynı kodla telefon uygulaması (Play).
- Ayrı Firebase projesi: giriş (e-posta/Google), şifreli veritabanı, belge deposu, sunucu programları (doldurma, ödeme doğrulama,
  hatırlatma), Avrupa bölgesi.
- Yapay zekâ: Claude (anlama/doldurma/öneri) + yedek; kişisel veriler sadece gerektiği kadar gönderilir.
- 13 dil arayüz; formlar kendi dilinde, açıklamalar kullanıcının dilinde.

## 11. MARKA ADI ÖNERİLERİ (müsaitlik henüz kontrol EDİLMEDİ)
Antrago · Formigo · Amtly · Papeo · Dokumo · Formalo — kullanıcı seçecek, sonra alan adı müsaitliği kontrol edilecek.
