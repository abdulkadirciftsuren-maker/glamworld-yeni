# 💳 GLOXORG — HESAPLAR, ÖDEMELER VE HATIRLATMALAR

> **Code her oturumda bu dosyayı okur** (CLAUDE.md'de yazılı). Bir şey "çalışmıyor" denince ÖNCE buraya bak:
> çoğu zaman sebep **bir bakiyenin/aboneliğin bitmesidir**. ⛔ Bu dosyaya **ŞİFRE, API ANAHTARI, KART NUMARASI YAZILMAZ**
> (depo herkese açık olabilir). Sadece "nerede, ne işe yarar, ne kadar, ne zaman" yazılır.
>
> Son güncelleme: **5 Kasım 2026**

---

## 🔴 BİR ŞEY BOZULURSA — HANGİ HESABA BAKILIR

| Belirti | Büyük ihtimalle sebep | Bakılacak yer |
|---|---|---|
| **Glome aramaları açılmıyor / bağlanmıyor** | Hetzner sunucusunun bakiyesi bitti → sunucu kapandı | Hetzner (aşağıda #1) |
| **Gloxoo cevap vermiyor / yazmıyor** | Anthropic kredisi bitti | Anthropic (#2) |
| **Gloxoo konuşmuyor (sesi yok / robot ses)** veya **"Üstümde Dene" resim üretmiyor** | Google Gemini ön ödemesi bitti **ya da Firebase App Check kilidi zorunlu** (aşağıda #4) | Google AI Studio (#3), Firebase App Check (#4) |
| **Adres bulma çalışmıyor** | HERE kotası/kartı | HERE (#7) |
| **Site hiç açılmıyor (gloxorg.com)** | Alan adı süresi doldu | Namecheap (#5) |
| **Play'de uygulama kaldırıldı / güncelleme gönderilemiyor** | Play beyanları eksik | Play Console (#6) |

---

## 💰 PARALI HİZMETLER (bitince bir şey DURUR)

### 1. Hetzner — Canlı görüşme sunucusu (Glome aramaları, LiveKit)
- **Ne işe yarar:** Bütün Glome sesli/görüntülü aramaları ve 10 kişilik grup görüşmeleri bu sunucudan geçer. **Kapanırsa aramalar çalışmaz.**
- **Nereden girilir:** console.hetzner.cloud (Gmail ile kayıtlı; sunucu şifresi Gmail'de)
- **Sunucu:** `ubuntu-4gb-nbg1-1`, tip CPX22 (2 işlemci / 4 GB), Nürnberg. Adres: `canli.gloxorg.com`
- **Fiyat:** notlara göre **~24 € / ay**
- **Ödeme şekli:** Hesaba **ön ödemeli bakiye** (Eylül'de 25 € yüklendi). ⚠️ Düzeltme (8 Kas): Hetzner arama sayısına göre DEĞİL, sunucunun açık kaldığı süreye göre (saatlik, ay sonunda fatura) keser. CPX22 için aylık birkaç € (kesin tutar Hetzner fiyat/fatura sayfasında). Yani 25 € büyük ihtimalle birkaç ay yeter; '~1 ay' tahmini yanlıştı. 8 Kas'ta sunucu çalışıyordu (GitHub'dan kontrol: canli.gloxorg.com OK + bilet kabul). Kalan bakiye için: accounts.hetzner.com → Faturalar.
- **✅ Durum (5 Kas 2026):** Kullanıcı kontrol etti: sunucu **çalışıyor (yeşil)**, `canli.gloxorg.com` → **OK**. Fatura sayfası (accounts.hetzner.com/invoice) henüz kontrol edilmedi.
- **💶 Bakiye (9 Kas 2026):** **15,41 €** kaldı (Eylül'de 25 € yüklenmişti → ~2 ayda ~9,6 € harcandı, ayda ~5 €). Bu hızla **Ocak sonu – Şubat 2027** civarına kadar yeter. **Ocak 2027 başında tekrar bak**, gerekirse Hetzner → faturalar → kredi → Şarj ile yükle.
- **🔐 Güvenlik (9 Kas 2026):** Hetzner hesabında **iki faktörlü doğrulama AÇIK** (Google Authenticator, telefonda). Kurtarma anahtarı kullanıcıda KÂĞITTA (buraya YAZILMAZ). Girişte şifreden sonra Authenticator'daki 6 haneli sayı istenir. Telefon değişirse kurtarma anahtarı gerekir.
- **Hızlı test:** tarayıcıda `https://canli.gloxorg.com` (noktalı **i**!) → "OK" yazıyorsa arama sunucusu çalışıyor.
- **Kontrol:** Hetzner → sol üstte **Billing / Faturalar** → bakiye ve ödenmemiş fatura var mı? Sunucu listesinde sunucu **"Running" (çalışıyor)** mu?
- **İpucu:** Her ay elle yüklemek yerine karta bağlı **otomatik aylık ödeme** açılabilir (sabit ~24 €, sürpriz yok).

### 2. Anthropic — Gloxoo'nun "yazı beyni" (sohbet)
- **Ne işe yarar:** Gloxoo ile yazışma/konuşma cevapları buradan gelir. **Kredi biterse Gloxoo cevap veremez.**
- **Nereden girilir:** console.anthropic.com → **Plans & Billing / Faturalandırma**
- **Ödeme şekli:** **Ön ödemeli kredi.** Otomatik yükleme (auto-reload) **KAPALI tutulsun** → bitince durur, sürpriz fatura olmaz.
- **⚠️ Temmuz 2026'da bir kez bitmişti.** Şimdi Gloxoo susuyorsa ilk bakılacak yerlerden biri.
- **Not:** Bu, Claude Code (bu kodlama asistanı) aboneliğinden AYRI bir hesaptır.

### 3. Google AI Studio / Gemini — Gloxoo'nun sesi + resim üretme
- **Ne işe yarar:** Gloxoo'nun doğal insan sesi (konuşması) ve "Üstümde Dene" resimleri.
- **Nereden girilir:** aistudio.google.com/apikey → proje `gen-lang-client-0534452347` → Faturalama
- **Ödeme şekli:** **Ön ödeme (Cloud Prepay).** Otomatik yükleme **KAPALI** (böyle kalsın).
- **Son yükleme:** 18 Eylül 2026 → **20 €**. Bitince "Kredi satın al" ile 10-20 € yüklenir.
- **Bütçe uyarısı:** Google Cloud'da 15 €/ay uyarısı var (e-posta gelir).
- **⚠️ Not:** Telefon uygulamasında (Android) tarayıcının yedek "robot sesi" YOK → Gemini bakiyesi biterse Gloxoo uygulamada **hiç** konuşamaz.

### 4. Google Cloud / Firebase (proje `glamworld2`)
- **⚠️ APP CHECK (5 Kas 2026):** Firebase → App Check → API'ler → **Firebase AI Logic** "Basic – erzwungen" (zorunlu) idi → Gloxoo doğal sesi ve "Üstümde Dene" isteklerini REDDEDİYORDU ("Firebase App Check token is invalid", 401; uygulamada "fetch-error"). Sitemizde App Check hiç kurulu değil. Kullanıcıyla **"Nicht erzwungen (nur Monitoring)"** yapıldı → tekrar çalışıyor.
  - **⏰ GOOGLE 21 OCAK 2027'DE KİLİDİ OTOMATİK YENİDEN AÇACAK.** O güne kadar App Check kurulmalı: web = reCAPTCHA Enterprise (Firebase'de web uygulamasını kaydet + site anahtarı + `initializeAppCheck` firebase.js), Android = Play Integrity (com.gloxorg.twa + com.gloxorg.app kaydı + uygulamaya App Check SDK). Hatırlatma: 7 Aralık 2026.
- **Ne işe yarar:** Üyelik/giriş, veritabanı (gönderiler, mesajlar, profiller), fotoğraf depolama, bildirim gönderen sunucu programı.
- **🎬 Video çevirici (10 Kas 2026):** Sunucu programı (videoCevir) videoları H.264 720p'ye çeviriyor (2 GB bellek, video başına ~10–60 sn). Firebase faturasına küçük bir ek getirir. Orijinal videolar silinmediği için depolama biraz büyür.
- **Nereden girilir:** console.firebase.google.com → glamworld2
- **Ödeme:** Kullandıkça öde (Blaze). Şu an küçük kullanımda ücret çok düşük veya sıfır. Ödeme profili: **4526-1126-8343 (Almanya, Kyreinstraße 7)**.

### 5. Namecheap — Alan adı `gloxorg.com`
- **Ne işe yarar:** gloxorg.com adresinin sahibi biziz. **Süresi dolarsa site açılmaz.**
- **Nereden girilir:** namecheap.com → Domain List
- **Bitiş tarihi:** **4 Temmuz 2027** → ⏰ **Haziran 2027'de yenile** (hatırlatma kurulu).
- **Adres:** Kyreinstraße 7'ye güncellendi (Kasım 2026). DNS de burada (Advanced DNS). ⛔ GitHub A kayıtlarına dokunma.

### 6. Google Play Console — Uygulama mağazası
- **Hesap:** Kişisel hesap, kimlik 6524637860521605101. Tek seferlik ücret ödenmiş, **yıllık ücret YOK.**
- **Uygulama:** GLOXORG (`com.gloxorg.twa`). **2 Kasım 2026'dan beri YAYINDA** (115 / 2.0.15, %100, herkese). Eski uygulamayı kullananlara güncelleme olarak gitti.
  - ⚠️ Not: yeni uygulamanın belleği ayrı → eski (Chrome tabanlı) uygulamada telefonda tutulan Gloxoo konuşmaları yeni uygulamaya geçmedi.
  - Play'in "bir sonraki yayın için" önerileri (uçtan uca ekran + eski komutlar) bir sonraki sürümde düzeltildi (Kasım 2026).
- **Yasal adres:** Ukrayna adresi (doğrulanmış; inceleme bitene kadar değiştirmiyoruz). İletişim tel: Ukrayna numarası (kullanıcıda).
- **⏰ YAPILACAK BEYANLAR (yapılmazsa uygulama Play'den KALDIRILIR):**
  - **Satıcı (tüccar) durumu beyanı — SON GÜN 1 ŞUBAT 2027.** Hesabı yönet → Hesap ayrıntıları → Hakkınızda → Satıcı durumu.
    (Satıcı seçilirse telefon + adres Play'de herkese açık görünür. Para kazanılmıyorsa "satıcı değilim" denebilir — birlikte karar verilecek.)
  - **Tam konum (ACCESS_FINE_LOCATION) beyanı — 27 OCAK 2027'ye kadar.** Cevap: "Kullanıcı yakınındaki profesyonelleri haritada görür ve konumunu paylaşır."

### 7. HERE — Adres bulma (harita adres servisi)
- **Ne işe yarar:** "Adres bul ve kopyala" özelliği. Karta bağlı (ücretsiz kota içinde kullanılıyor).
- **Anahtar:** Cloudflare `gloxorg-adres` köprüsünde gizli duruyor (sitede yok).

---

## 🆓 ÜCRETSİZ HİZMETLER (şimdilik para yok)

| Hizmet | Ne işe yarar | Not |
|---|---|---|
| **GitHub** (abdulkadirciftsuren-maker/glamworld-yeni) | Kodlar + site yayını (GitHub Pages) | Ücretsiz. Uygulama dosyalarını (APK/AAB) da derler. |
| **Cloudflare Workers** | Gloxoo köprüsü (`gloxorg-ai`), adres köprüsü (`gloxorg-adres`) | Ücretsiz plan. Aralık 2026 kayıt (log) fiyat değişikliği bizi etkilemez. |
| **Cloudinary** (cloud `dqtclc035`) | Video/resim saklama ve küçültme | Ücretsiz plan (kota dolarsa e-posta gelir). |
| **OpenStreetMap, Photon, OSRM** | Harita görüntüsü, yer arama, yol tarifi | Ücretsiz, hesap yok. |
| **flagcdn, döviz/kripto servisleri** | Bayraklar, kurlar | Ücretsiz. |
| ~~Metered.ca~~ | Eski arama aktarıcısı | **BIRAKILDI** (Eylül 2026, yerine Hetzner+LiveKit). |

---

## ⏰ HATIRLATMA TAKVİMİ (Code bunları zamanı gelince kullanıcıya hatırlatır)

| Ne zaman | Ne yapılacak |
|---|---|
| **Her ayın 1'i** | Hetzner bakiyesi + Anthropic kredisi + Gemini bakiyesi kontrol |
| **7 Aralık 2026** | **App Check kurulumu** (Google 21 Ocak 2027'de AI Logic kilidini otomatik açacak → Gloxoo sesi/Üstümde Dene durur) |
| **10 Kas 2026** | Play'e 2.0.25 + tam ekran intent beyanı gönderildi (inceleme bekleniyor) |
| **10 Ocak 2027** | Play: **satıcı durumu beyanı** (son gün 1 Şubat) + **konum beyanı** (son gün 27 Ocak) |
| **1 Haziran 2027** | Namecheap: **gloxorg.com yenile** (bitiş 4 Temmuz 2027) |

---

## 📒 YAPILANLAR GÜNLÜĞÜ (önemli hesap işlemleri)
- **26 Eki 2026:** Play yükleme anahtarı sıfırlama talebi → 28 Eki onaylandı.
- **1 Kas 2026:** Native uygulama Play üretimine gönderildi (115 / 2.0.15, Android 16 hedefli). 178 ülke + dünyanın geri kalanı.
- **3 Kas 2026:** Taşınma → Kyreinstraße 7, 83646 Bad Tölz. Namecheap ✅, Google ödeme profili ✅, eski adresler silindi ✅, Visa 8979 fatura adresi ✅. Play geliştirici adresi Ukrayna'da bırakıldı.
- **3 Kas 2026:** ABD vergi formu (W-8BEN) Google tarafından onaylandı.
- **2 Kas 2026:** Native uygulama Play'de yayınlandı (115 / 2.0.15).
- **5 Kas 2026:** Gloxoo doğal ses yok → sebep Firebase App Check (AI Logic zorunlu). Zorunluluk kaldırıldı (21 Oca 2027'ye kadar).
- **5 Kas 2026:** Aramalar + Gloxoo durdu → kontrol: Hetzner sunucusu çalışıyor, LiveKit OK, Cloudflare köprüsü OK. Arama sorunu PARA DEĞİL: telefon uygulamasında karşının görüntüsü duraklıyordu (izin penceresi) → B437 ile düzeltildi. Anthropic/Gemini bakiyesi henüz kontrol edilmedi.
- **Hızlı test (Gloxoo köprüsü):** tarayıcıda `https://gloxorg-ai.abdulkadirciftsuren.workers.dev` → `{"metin":"","hata":"Sadece POST"}` yazıyorsa köprü çalışıyor; "Error 1027" çıkarsa Cloudflare günlük sınırı dolmuş.
