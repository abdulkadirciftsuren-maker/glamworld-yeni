# 🏛️ GLAMWORLD ANAYASASI
### (Code, HER işe başlamadan ÖNCE bu dosyayı baştan sona oku. İSTİSNA YOK.)

> **⛔ ONAY İSTEME KURALI (Code için, EN BAŞTA):** Code bu anayasayı her görevde baştan okur. Okuduğunda kullanıcının onayını ZATEN almış sayılır — işe başlamak/dosya kurmak/silmek/deploy için kullanıcıya "onaylıyor musun, yapayım mı, emin misin, devam edeyim mi" diye ASLA SORMAZ. Kendi yapar, sonuna kadar tamamlar, yayınlar. Kullanıcı zaten yorgun — onu komut/onay vermeye zorlamak YASAK. Sadece iki dosya gerçekten çakışıyor ve karar verilemiyle TEK net soru sorulabilir. Bunun dışında: soru yok, onay yok, "okey" yok — direkt yap, bitir, raporla.

> **🔥 ESKİLERİ SİL GARANTİSİ (EN KRİTİK — 3 AYDIR SÜREN SORUNUN ÇÖZÜMÜ):** Kullanıcının en büyük şikayeti: yeni dosya kurulurken eski/hatalı dosya altta kalıyor, ekranda eski çıkıyor, 3 kere yüklemek gerekiyor. ÇÖZÜM — her dosya güncellemesinde Code ŞU SIRAYI harfiyen uygular:
> 1. **ÖNCE SİL:** Güncellenecek dosyanın src'deki ESKİ halini ve ilgili TÜM eski/artık dosyaları (ulkeler.js, ulkeTani.js, eski sürümler) `del` ile TAMAMEN siler. Üzerine yazma YOK — önce silme ZORUNLU.
> 2. **SONRA KUR:** ZIP/Downloads'tan yeni dosyayı koyar.
> 3. **KONTROL ET:** Kurduğu dosyanın içinde doğru içerik var mı bakar (örn ">Bay<" var mı, eski ">Koy<" yok mu).
> 4. **YAYINLA + RAPOR:** Deploy eder, kullanıcıya "şunu sildim, şunu kurdum, içinde X yazıyor" diye net rapor verir.
> Eski dosya bir daha ASLA ekranda görünmemeli. Tek kurulumda düzelmeli — 3 kere yükletme YASAK.

---

## 0. EN ÖNEMLİ KURAL
Her görevden önce bu dosyayı oku. Kurallara harfiyen uy.
Belirsizse en güvenli, en temiz, en profesyonel yolu seç. Asla tahminle bozma.

**🧹 YANLIŞ/GEREKSİZ KOD SÖKÜLÜR KURALI:** Bir özellik/veri/kod yanlışsa, gereksizse veya kaldırılması kararlaştırıldıysa → **TAMAMEN sökülüp atılır.** Üzeri kapatılmaz, gizlenmez, yorum satırı yapılıp bırakılmaz. Çünkü bırakılan kod sonradan beklenmedik şekilde karşıya çıkıyor (hayalet veri/görüntü). Sil = tamamen sil, dosyadan kaldır.

**🚪 PENCERE KAPATMA KURALI (HER SAYFADA, ÇOK ÖNEMLİ):** Açılan HER pencere/katman/açılır kutu için kullanıcıya ÇIKIŞ YOLU verilir: (1) pencere içinde görünür bir "← Geri / Kapat / Vazgeç" düğmesi, (2) pencerenin DIŞINA / karartılmış alana / ekrana dokununca pencere kapanır. Kullanıcı asla bir pencerede kapana kalmamalı. Bu kural istisnasız her açılır pencerede uygulanır.

---

## 1. 🔒 TEK PROJE KURALI (EN KRİTİK)
- Tek ve gerçek projemiz: **`C:\dev\glamworld2`** (sonunda **2** var).
- Code HER ZAMAN burada çalışır. İşe başlamadan `pwd` ile kontrol et.
- Eski projeler, yedekler, başka glamworld klasörleri: ASLA okuma, referans alma. Yokmuş gibi davran.
- Geçmişe dönük hiçbir şeye bakma. Sadece bugünkü glamworld2 gerçektir.

---

## 2. 🌍 BÜYÜK VİZYON (GLAMWORLD NEDİR)
- GLAMWORLD = **dünyanın en lüks profesyonel platformu.**
- SADECE kuaför/güzellik DEĞİL. **Dünyadaki TÜM işletmelere ve mesleklere** hizmet eder:
  berber, kuaför, doktor, avukat, diş hekimi, mimar, müzisyen, eğitmen, tamirci... ne varsa.
- **Tüm dünya, tüm ülkeler, tüm şehirler.** Küresel platform.
- Hedef: "Bir numara olmak." Her detay premium, lüks, ciddi, sade.

---

## 3. 👥 İKİ KULLANICI TİPİ
**A) MÜŞTERİ (Ücretsiz):**
- Randevu alır, profesyonelleri/işletmeleri keşfeder.
- "Ücretsiz" seçince → kendi menüsü/akışı açılır.

**B) PROFESYONEL (Pro / Pırlanta Üye):**
- Profil oluşturur, gelir takibi yapar, hizmet verir.
- "Profesyonel" seçince → kendi pro profil akışı açılır (meslek seçimi vb.).
- **Ücret: 1 yıl tüm ayrıcalıklar · 10€/AY** (aylık ödeme — YIL DEĞİL).
- **Her bölgede KENDİ para birimiyle** teklif (10€ Almanya'da, ₺ Türkiye'de, vb.). Kullanıcının bölgesine göre otomatik.

---

## 4. 📝 ÜYE OL / FORM KURALLARI
- Üye Ol akışı: önce **tip seçimi** (Müşteri / Profesyonel), sonra o tipe özel akış.
- **Cinsiyet seçimi: 3 seçenek** olacak: **Bay / Bayan / Belirtmek istemiyorum** (Bay başta). Kadın/Erkek DEĞİL.
- **Şifre kuralı:** en az 8 karakter + hem harf hem rakam. Yanında göz butonu (SVG, emoji değil). Üye olunca gözler otomatik kapanır.
- **Tüm kullanıcı yazıları ALTIN renk** (#FFD700), her sayfada, autofill dahil. Placeholder soluk gri.
- **Telefon:**
  - Bayrak + ülke kodu + numara. HEPSİ DÜZ SİSTEM YAZISI (Cormorant DEĞİL — tarayıcı tel input'ta özel fontu bozuyor). Numara kutusu izole/sabit.
  - Telefon kodu: elle yazılır VEYA "konuma göre" otomatik bulunur. SABİT ÜLKE LİSTESİ YOK.
  - telTemizle: ülke kodu + baştaki sıfır otomatik ayıklanır.
- **🌍 KONUM (ÇOK ÖNEMLİ — SABİT LİSTE YOK):**
  - **Sabit ülke/şehir listesi KULLANILMAZ.** (Eski 34 ülke/1120 şehir listesi tamamen SİLİNDİ — anayasa "yanlış kod sökülür" kuralı gereği.)
  - **Sebep:** Kullanıcı dünyanın HERHANGİ bir ülkesinde kayıt olabilmeli. Yaşadığı yer ≠ kayıt olmak istediği yer olabilir (örn: Bad Tölz'de yaşıyor ama Arjantin'de kayıt olmak istiyor). Sınırlı liste bunu engeller.
  - **Yapı:** Üst şeritte [Ülke/Şehir kutusu] + [İlçe/Semt]. Kutuya basınca TAM EKRAN katman açılır. LİSTE/ülke penceresi AÇILMAZ.
  - **Katmanda 3 yol:** (1) "📍 Şu anki konumumu kullan" → navigator otomatik doldurur. (2) "🗺️ Haritadan seç" → harita açılır, yerden seçince ülke+şehir+ilçe+bayrak+kod otomatik dolar. (3) "veya elle yaz" → Ülke / Şehir / İlçe elle yazılır (dünyada her yer).
  - **Telefon kodu da AYNI sistem:** koda basınca katman açılır — 📍 konumumu kullan + 🗺️ haritadan seç + elle yaz. LİSTE YOK.
  - **🚪 Her iki katmanda:** sağ üstte ✕ kapat düğmesi + dışına (karanlık alana) dokununca kapanır. Haritada ← geri düğmesi.
  - **🚩 ÜLKE TANIMA + YAZDIKÇA SIRALAMA (dunyaUlkeleri.js):** Kullanıcı ülke yazınca, ALTINDA eşleşen ülkeler BAYRAĞIYLA sıralanır (Türkiye +90, Ukrayna +380...). Kullanıcı listeden seçer. ~120 ülke (tüm kıtalar, Ukrayna/Azerbaycan/Kuveyt vb. dahil), Türkçe+İngilizce adlarıyla. Seçince ülke + telefon kodu + bayrak otomatik dolar. Tanımadığı yeri de elle KABUL eder (her yer yazılabilir). Telefon kodu katmanında da aynı: ülke aranınca bayraklı sıralanır.
  - **🏁 GERÇEK BAYRAK (Bayrak bileşeni, ÇOK ÖNEMLİ):** Bayraklar emoji DEĞİL, GERÇEK RESİM (flagcdn.com PNG). Sebep: Windows/bilgisayar emoji bayrakları GÖSTERMEZ (sadece TR/DE harfleri çıkar). Gerçek resim her yerde (telefon+bilgisayar) görünür. `<Bayrak kod="DE" />` ISO kodundan resmi getirir. ASLA emoji bayrak kullanma — hep Bayrak bileşeni.
  - **📞 AKILLI TELEFON AYIKLAMA (telefonAyikla):** Numaranın başında HANGİ ülke kodu yapışıksa ayıklanır — sadece seçili kod değil. Örn: +994 seçili ama "4915174473452" girilirse (49=Almanya yapışık) → "15174473452". "+49 1551..."→"1551...", "0049..."→temiz, "0151..."→"151...", "00+kod"→temiz. Temiz numarayı BOZMAZ (tek haneli +1 koruması var). 11/11 test geçti.
  - **📜 KAYDIRMA ÇUBUĞU GİZLİ (ÇOK ÖNEMLİ):** Hiçbir açılır pencerede/listede kaydırma çubuğu (scrollbar) GÖRÜNMEZ — ne bilgisayarda ne telefonda. Kullanıcı o çizgiyi istemiyor. Her overflow:auto/scroll olan yere `scrollbar-width:none` + `::-webkit-scrollbar{display:none}` eklenir. Çizgi YASAK.
  - **🖼️ ALTIN ÇERÇEVE (HER SAYFADA, SABİT — AltinCerceve.js/css):** Tüm platformda ekranın kenarında altın çerçeve vardır. App.js'in en dışında `<AltinCerceve />` ile her sayfada görünür. `position:fixed + inset:0` → ekrana kilitli, sayfa kaysa/büyüse/küçülse ASLA oynamaz/zıplamaz. `pointer-events:none` → altındaki düğmelere tıklamayı engellemez. Bilgisayarda kalın (5px), telefonda ince (3px), çok küçük ekranda 2.5px. Altın gradient + iç parıltı. **ZIPLAMA ÖNLEME (visualViewport):** Chrome/Samsung mobilde adres çubuğu (üstte ya da altta) kayınca fixed eleman zıplardı. KESİN ÇÖZÜM: AltinCerceve.js `window.visualViewport` API ile gerçek görünen alanı (height + offsetTop) ölçüp `--gercek-vh` ve `--gercek-ust` CSS değişkenlerine yazar (resize/scroll dinler). Çerçeve `top:var(--gercek-ust)` + `height:var(--gercek-vh)` kullanır. Adres çubuğu nereye kayarsa kaysın çerçeve doğru yerde kalır, zıplamaz. Yeni sayfa eklerken çerçeve App'te zaten var.
  - **🏙️ ADRES BÖLÜMÜ: PHOTON GERÇEK HARİTA (sehirVeri.js SİLİNDİ — ÇOK ÖNEMLİ):** Adres bölümünde ülke + şehir + ilçe ÜÇÜ DE gerçek haritadan (Photon — photon.komoot.io) gelir, GÖMÜLÜ LİSTE YOK (site zaten internetle çalışır, kayıt internet ister). **KRİTİK: Photon lang=tr DESTEKLEMİYOR (sadece default/en/de/fr) — `lang` parametresi GÖNDERİLMEZ! lang=tr gönderilirse Photon hata verir, hiç sonuç gelmez (bu "aranıyor ama gelmiyor" sorununun sebebiydi).** Reverse-geocoding (haritadan/konumdan) de lang'sız Photon reverse kullanır. Fonksiyonlar: adresUlkeAra (layer=country, ISO kodu→BAYRAK ile), sehirAra (layer=city+state — şehir yanında eyalet), ilceAra (şehir bağlamıyla). ÜLKE önerisinde her ülkenin BAYRAĞI görünür (Photon countrycode→flagcdn). 400ms gecikmeli (debounce — Photon kısıtlamasın diye), "● aranıyor..." altın yanıp sönen yazı. Telefon kodu bölümü AYRI: orada ülke gömülü kalır (kod+bayrak gerektiği için).
  - **♻️ CACHE BUSTING ( İLK AÇILIŞTA HEP YENİ — ÇOK ÖNEMLİ):** "Açınca eski Koy çıkıyor, 10 kere yenileyince Bay oluyor" sorunu tarayıcı cache'inden. Code: index.html'e cache-control meta etiketleri ekler (no-cache), build sonrası React'in hash'li dosya isimleri (main.[hash].js) zaten cache kırar ama index.html cache'lenmemeli. GitHub Pages için: her deploy'da index.html yeniden yüklenmeli. Böylece kullanıcı siteyi açınca HEP en yeni sürüm gelir. **⛔ YASAK (2026-05-31):** `caches.delete`, `serviceWorker.unregister`, `window.location.reload` KULLANMA — tarayıcıya müdahale eden bu eski "her şeyi sil" sistemi KALDIRILDI (sekmeyi/tarama verisini siliyordu). Sadece no-cache meta + hash'li dosya isimleri yeterli, başka müdahale YOK.
  - **🔤 BÜYÜK/KÜÇÜK HARF DUYARSIZ (trNormal):** Şehir/ilçe aramada büyük-küçük harf VE Türkçe karakterler (I İ ı i, ş s, ç c, ğ g, ü u, ö o) normalize edilir. "MID", "mid", "Mıd" hepsi → Midyat bulur. Eşleşen sonuçlar yazılanla BAŞLAYANLAR önde sıralanır (alakasız sonuç gelmez).
  - **🗺️ HARİTALAR — İKİ AYRI, BAĞIMSIZ (DOKUNULMAZLAR):**
    - **(A) KONUM/ADRES haritası (A5.B16 — YENİDEN KURULDU):** CartoDB Voyager base tiles + Overpass API POI marker sistemi. GPS otomatik merkez (zoom 16). Harita her hareket edince 700m yarıçapta restoran/market/eczane/posta/cami/banka/okul/kuaför vs. renkli noktalar gösterir. Noktaya basınca yer adı görünür. Bir yere dokun → pin → Photon reverse → ülke+şehir+ilçe dolar. `haritaRef` / `gercekHarita` div.
    - **(B) TELEFON KODU haritası — A5.B12 KİLİTLENDİ, DOKUNMA:** topojson-client CDN + world-atlas countries-50m.json. Her ülke farklı canlı renkte GeoJSON polygon. Üzerinde kalıcı ülke adı + telefon kodu yazısı. Tıklayınca altın çerçeve vurgular, "Bu Ülkeyi Seç" butonu ISO kodundan direkt telefon kodunu doldurur. `telHaritaRef` / `telGercekHarita` div. **BU HARITA MÜKEMMEL. HİÇBİR ŞEKİLDE DEĞİŞTİRME, KOPYALAMA, DOKUNMA.**
- **Google/Microsoft girişi:** ÜYE OL'a basınca (form doğruysa), e-posta @gmail ise "Google ile devam et?", @hotmail/@outlook ise "Microsoft ile devam et?" teklifi çıkar (açıklama katmanı). Gerçek bağlantıyı Code yayında kurar.
- **E-posta önerisi:** yazınca @gmail.com/@hotmail vb. uzantı önerileri çıkar.
- **Meslek seçimi (özellikle Pro):** dünyadaki TÜM meslekler. Önemli/popüler meslekler ÖNDE. Arama yapılabilsin.

### 🎈 DÜĞME AÇIKLAMA BALONCUĞU (önemli kural)
- **Seçim/yönlendirme düğmelerine** (Cinsiyet, Konum 📍, Geri Dön, Giriş Yap vb.) basınca, düğmenin **hemen üstünde küçük altın baloncuk (tooltip)** çıkar: ne işe yaradığını yazar, efektlidir.
- Baloncuk: parmağını ekrana dokununca / kaydırınca / 2 sn sonra kaybolur. Sayfa kaymasını ENGELLEMEZ. Ekran kenarından taşmaz.
- **Form doldurma kutularına** (İsim, E-posta, Şifre, Telefon) baloncuk ÇIKMAZ — yazmayı engeller.
- Bu kural her sayfada geçerli.

### ⌨️ KLAVYE KURALI
- Bir yazı kutusuna basınca (telefonda klavye çıkınca), o kutu otomatik görünür alana kayar (scrollIntoView center). Klavye kutuyu kapatmaz.

---

## 5. 🔘 HER DÜĞME ÇALIŞIR
- Her buton/düğme GERÇEKTEN çalışır olacak. Süs değil.
- Bir düğmeye basınca ilgili sayfaya/akışa götürür.
- İkinci sayfalar yapıldıkça, düğmeler onlara bağlanır.
- "Yakında" / boş buton bırakmaktan kaçın; en azından doğru yere yönlendirsin.

---

## 6. 💎 PIRLANTA / TASARIM KURALI
- Pırlanta = GLAMWORLD'ün simgesi. Her sayfanın KENDİ özgün pırlantası olur, hiçbiri aynı olmaz.
- **Stil:** Zemine/yuvaya GÖMÜLÜ taş (yüzük taşı gibi), altın tırnaklarla tutulu, yuvarlak yuva (kare DEĞİL).
  Taş SABİT durur (sallanmaz), sadece ÜST kısmı görünür (alt sivri uç gizli).
  İçeriden ışık saçar, belli noktalardan ışık parıltıları çakar. Canlı ama hareketsiz.
- **Renkler dizayna göre değişir:** mavi, beyaz, KIRMIZI, sarı, yeşil... sayfaya uygun olan.
- **Basınca:** taş kendi rengiyle parıldar (kırmızıysa kırmızı, maviyse mavi ışık saçar).
- Anasayfada ve diğer sayfalarda DAHA güzel, farklı pırlantalar yapılır — tekrar etme.

### 🔴 PIRLANTA KİMLİK KURALI (çok önemli)
- Pırlanta rengi kullanıcının TİPİNİ gösterir, sabittir:
  - **MÜŞTERİ = BEYAZ pırlanta**
  - **PROFESYONEL = KIRMIZI pırlanta** (yakut)
- Profesyonelin KIRMIZI pırlantası onun kimliğidir: profilinde, her sayfada, her yerde
  hep kırmızı pırlanta görünür. Kırmızı pırlanta = "bu bir profesyonel" demektir.
- "GLAMWORLD" yazısı ve etiketler de her kartta farklı görünebilir.
- Tema: **Siyah – Altın.** Font: başlık **Cinzel**, metin **Cormorant Garamond**.
- Daha canlı, daha profesyonel, premium his.

### 🎨 ÖZEL SİMGE / EMOJİ KURALI (GLAMWORLD'E ÖZEL — KESİN KURAL)
- **HAZIR EMOJİ / HAZIR İKON KULLANILMAZ:** 🌍 📍 🗺️ 📞 💎 👑 gibi platform emojileri ve hazır ikon kütüphaneleri YASAK. Bunlar ucuz, sıradan, her yerde var — lüks platformda yeri yok.
- **GLAMWORLD'E ÖZEL TASARIM:** Simge, sembol veya ikon gerektiğinde — sıfırdan, hiç kimsede olmayan, sadece GLAMWORLD'e ait tasarımlar yapılır (SVG çizim, animasyonlu ikon, özel pırlanta vb.). Hiçbir platformda aynısı bulunmaz.
- **Bayraklar:** Gerçek bayrak resmi (flagcdn.com PNG) kullanılır — bu emoji değil, coğrafi veri.
- Bu kural yeni sayfa, yeni özellik, her güncellemede geçerlidir. Hazır emoji/ikon eklemeyi DÜŞÜNME bile.

### 🎨 HER SAYFA FARKLI (kullanıcının net isteği)
- **Hiçbir sayfa birbirine benzemez.** Her sayfanın kendi tasarımı, kendi renk vurgusu, kendi düzeni olur.
- **"GLAMWORLD" başlık yazısı her sayfada o sayfaya göre değişir** (farklı stil, farklı vurgu, sayfaya uygun renk).
- Her sayfaya o sayfanın ruhuna göre renk verilir. Tek tip kalıp YOK.

### ✍️ İSİMLER ÖZGÜN (kullanıcının net isteği)
- Sayfa/bölüm/özellik isimleri başka platformlardan KOPYA DEĞİL. Reels, Story, Feed gibi bilinen isimler kullanılmaz.
- GLAMWORLD'e özel, kendi isimlerimiz üretilir. Her isim özgün ve markaya ait olmalı.
- Kullanıcı isim koyma aşamasında söz sahibidir — Code kendi kafasından bilinen isim koymaz.

---

## 6.5 💰 ÖDEME MODELİ (net kural — ödeme sayfası yapılınca uygulanır)

**💎 MÜŞTERİ (Gümüş):**
- Tamamen ücretsiz üyelik.
- Sadece işlem başına ufak komisyon.

**👑 PROFESYONEL (Pırlanta Üye):**
- Ücret: **1 yıl tüm ayrıcalıklar · 10€/AY** (aylık — YIL DEĞİL).
- **Her bölgede KENDİ para birimiyle** (€ Almanya, ₺ Türkiye, vb.). Bölgeye göre otomatik.

**🎁 İLK KEZ profesyonel olan:**
- İlk ay **ücretsiz** (deneme).
- 2. ayın parası **peşin** alınır.
- 1 ay içinde vazgeçerse → **para iade** + otomatik **gümüş (müşteri)** profiline döner.
- Pro verileri **saklanır** (silinmez, tekrar dönerse hazır gelir).

**🔁 İKİNCİ (ve sonraki) KEZ profesyonel olan — daha önce denemiş:**
- Yine 1 ay deneme hakkı var.
- **AMA iptal/iade YOK.** Vazgeçemez.
- Vazgeçmek isterse → **uyarı penceresi** çıkar: "İkinci üyelikte iptal/iade hakkın yok." İptal edilemez, üyelik aktif kalır.

**🔒 SİSTEM:**
- Kullanıcının deneme/iade geçmişi e-postasına/hesabına bağlı saklanır → suistimal (bedava kullan-iade al-tekrar üye ol döngüsü) engellenir.
- Bu kurallar gerçek projede (yayında) Code tarafından kurulur (ödeme + veritabanı).

---

## 6.6 📱 GERİ TUŞU — HashRouter (B18, KESİN) (2026-05-31)

**KESİN:** App.js **`HashRouter`**. Geri tuşu açık PENCEREYİ kapatır (siteyi DEĞİL) — güvenilir, özel kod yok. Geri tuşuna kod YOK (GeriKopru/trap/popstate/pushState YOK).

**ÖNEMLİ (kullanıcıya açıkla):** HashRouter'da adres çubuğunda ekran adı (`#/musteri`) görünür AMA bu **YENİDEN YÜKLEME DEĞİL** ve Google'a veri GİTMEZ — sadece etiket. Sayfa TEK SEFER yüklenir, navigasyon hafızada (re-render), **document yeniden yüklenmez** → site pratikte tek parça. (Eski "sayfa sayfa reload" sorunu `no-store`'dandı; o KALDIRILDI.)

### Denenip BAŞARISIZ (BİR DAHA DENEME):
- `MemoryRouter` (B17) → harita/pencere açıkken geri basınca TÜM SİTEYİ kapatıyordu (donanım geri in-app'e bağlı değil).
- `GeriKopru`/popstate/pushState trap → Chrome throttling ile güvenilmez (haritada kapatıyordu).
- `no-store` → her geri/dönüşte reload.

### ⛔ YASAK: MemoryRouter, GeriKopru/popstate/pushState trap, `no-store`, `window.location.reload`, `caches.delete`, `serviceWorker.unregister`.

### Gerçek: HashRouter + no-store'suz = geri pencereyi kapatır + reload yok. "Adres değişmesin AMA geri pencereyi kapatsın" ikisi birden güvenilir mümkün değil (Chrome sınırı). HashRouter seçildi çünkü "geri = pencereyi kapat" güvenilir çalışıyor. "Tüm sitelerde/bilgisayarda bozuk" → cihaz/tarayıcı sorunu.

---

## 6.7 🔤 TÜRKÇE KARAKTER KURALI (HER YERDE, İSTİSNASIZ)

Her kod yazımında ve her güncellemede şu karakterler DOĞRU kullanılır:

| Yanlış | Doğru |
|--------|-------|
| i      | ı / İ (bağlama göre) |
| o      | ö / Ö |
| u      | ü / Ü |
| c      | ç / Ç |
| g      | ğ / Ğ |
| s      | ş / Ş |

- **Tüm görünen metinler** (label, placeholder, buton, hata mesajı, meslek adı, açıklama, tooltip, toast) doğru Türkçe karakter kullanır.
- **Harita dahil:** Türkçe UI metinleri doğru yazılır (haritanın içi İngilizce kalabilir — OSM/CartoDB verileri).
- **Yeni sayfalar/özellikler eklerken:** otomatik olarak doğru Türkçe karakter kullan. Sonradan düzeltme gerektirme.
- Bu kural bir kez uygulandı (A10) — bir daha geri dönülmez, yeni eklemeler de bu kurala uyar.

---

## 6.8 📊 SÜRÜM/BUILD SİSTEMİ + SAYAÇ (KESİN KURAL — A8.B20'de SIFIRDAN yazıldı, KİLİTLİ)

### 🔒 SAYAÇ (SurumRozeti) — DOKUNULMAZ (kullanıcı "10/10" dedi, 2026-06-03)
- `SurumRozeti.js` + `SurumRozeti.css` **A8.B20'de SIFIRDAN sade yazıldı ve ONAYLANDI.** Bozma.
- Davranış: SOL-ALT köşede küçük altın pill (`● A8.B20`); **parmakla (pointer) taşınır**; üstüne **dokununca geçmiş** açılır. Kendi kendine OYNAMAZ. `z-index` en üst. **Her sayfada** `<SurumRozeti />` ile eklenir (Giris dahil — eksikti, eklendi).
- ⛔ Otomatik gezinme/animasyon EKLEME; konumu/işleyişi değiştirme; eski karmaşık sürüme dönme.

### Numara sistemi
- **A** = büyük sayfa/aşama (tamamlanınca artar). **B** = o A içinde HER deploy'da +1.
  - A1 Açılış ✅ · A2–A6 kartlar/formlar ✅ (A5 Pro & A6 Müşteri KİLİTLİ) · A7 Giriş Yap + 13 dil + gerçek üyelik ✅ · A8 Ana sayfa akışı + beğeni/yorum/takip/bildirim + foto editör + AI + feed ebatları kilitlendi ✅
  - **A9 = AKTİF (2026-06-16, temiz sayfa):** feed ebatları onaylı/kilitli noktadan devam. Şu an **A10.B131**.
- Gösterim: pill'de `A9.B1`. Yeni A-serisine geçince B yeniden B1.

### Her deployda
1. `buildGecmisi.js`'te AKTİF satırın `build` +1; `tarih`/`saat`/`dosya`(kısa başlık)/`aciklama` güncelle. **Yeni A'ya geçilmedikçe YENİ SATIR EKLEME.**
2. `npm run deploy`. (Sürüm otomatik `buildGecmisi`'den okunur; ayrı SURUM sabiti yok.)

**Not (2026-06-03 düzeltme):** `dosya` alanı artık KISA BAŞLIK olabilir (eski "sadece dosya adı" kuralı kaldırıldı). Tek satır kuralı: buildGecmisi satırında apostrof (`'`) KULLANMA (tek-tırnak stringi bozar).

**Dosyalar:** `src/buildGecmisi.js` + `src/SurumRozeti.js` + `src/SurumRozeti.css`. Kullanım: `<SurumRozeti />` (props yok).

---

## 6.9 🖱️ KATMAN / OVERLAY DOKUNMA + KART ZIPLAMASI KURALI (KESİN KURAL)

**Sorun:** Bir overlay açıkken alttaki kapalı overlay'ler mobil tarayıcılarda touch olayı alabiliyordu.

**Kural:** Her overlay/katman elemanı **her zaman** şu CSS'i taşır:
```css
.konum-katman { pointer-events: none; }       /* kapalıyken dokunmayı engeller */
.konum-katman.acik { pointer-events: all; }   /* açıkken normal çalışır */
```

- Sadece `display:none` YETERSİZ — bazı Android tarayıcılarında kapalı eleman dokunma alır.
- `pointer-events:none` + `display:none` birlikte kullanılmalı — çift güvence.
- Bu kural ProfesyonelForm.css'te uygulandı. Yeni eklenen her overlay'de de uygulanır.
- MusteriForm, Giris, ve başka sayfalarda overlay eklenirken aynı pattern kullanılır.

### 🃏 Kart Zıplama Önleme (scroll lock — A5.B9)
Overlay açılınca `overflow:hidden` tek başına yetmez — desktop'ta scrollbar kaybolur ve sayfa sağa kayar; iOS'ta rubber-band scroll olur. Arkadaki kartlar zıplar.

**Kesin çözüm: position:fixed scroll lock** (her formda bu pattern):
```css
/* CSS */
body.pencere-acik { overflow:hidden!important; position:fixed!important; width:100%!important; }
```
```js
// JS — scroll lock useEffect
const scrollLockRef = useRef(0);
useEffect(() => {
  if (katman) {
    scrollLockRef.current = window.scrollY;
    document.body.style.top = `-${scrollLockRef.current}px`;
    document.body.classList.add('pencere-acik');
  } else {
    document.body.classList.remove('pencere-acik');
    document.body.style.top = '';
    if (scrollLockRef.current) window.scrollTo(0, scrollLockRef.current);
  }
  return () => { document.body.classList.remove('pencere-acik'); document.body.style.top = ''; };
}, [katman]);
```
Bu pattern ProfesyonelForm'da uygulandı. Her yeni sayfada overlay varsa aynısı kullanılır.

---

## 6.10 🔒 ÇALIŞMA DİSİPLİNİ — KESİN KURALLAR (Her güncellemede okunur ve uygulanır)

**Şu anda olan sürüm bozulmayacak. Code devamlı okuyacak, hata yapmamak lazım. Sayaç işlemler devamlı güncellenecek. Otomatik saat tarih güncellenecek.**

### SON SÜRÜM KURALI (EN KRİTİK)
- **Son sürüm üzerinden işlem yapacaksın. Her zaman. Buna çok dikkat edeceksin.**
- **Yanlış sürüm üzerinde bir şey yapmıyacaksın. Hiç geriyi görmiyeceksin.**
- **Son B harfi ve rakamı mutlaka göreceksin — onun üzerinde işlem yapacaksın.**
- Başka bir sürüme bakma, başka bir sürümde iş yapma. Sadece son B.

### ESKİ DOSYA YASAĞI (MUTLAK — İSTİSNA YOK)
- **Başka bir materyal aradığında: hiçbir zaman eski dosyalardan bir şey alma. Hatalar olmasın.**
- **Aradığında eski bizim projelerden bir şey çıkarsa: hiçbir şey alma.** Oraya dokunma. Eski silip atıyorsun, onu unutuyorsun.
- **Kopya başka dosyalardan YASAK. YASAK.**
- Önüne çıkmaması için: sıfırdan yazacaksın. Her zaman yeni, kullanılmamış yazılım bul. Kendisi düşün.
- Hiçbir dosyadan, hiçbir yerden kopya alma.

### SIFIR HATA KURALI
- **Bir komut verildiğinde: sıfır düşünce geçmiş, sıfır hata, sıfır eski. Taze, temiz, yeni yazılım olacak.**
- **Bir şey yaptığında sadece söylenilen üzerinde çalışılır. Son çalıştığımız, yayında olan, son B harfin son rakam sürümü üzerinde işlem yapılır.**
- **Dikkatli ve hata yapmadan yap. Yaptığın işi bir iki kere gözden geçir. Hata yoksa yayınla.**

### OTOMATİK GÜNCELLEME KURALI
- **Her güncellemede anayasa okunur ve uygulanır. Bunu her zaman göz önüne alacaksın.**
- **Saat ve tarih otomatik güncellenir** — kullanıcı söylemeden.
- **Sayaç (B numarası) her deployda otomatik artar.**

---

## 6.11 🆕 EN SON SÜRÜM KURALI (2026-06-01 — kullanıcı isteği)

Yeni bir yazılım/kütüphane/özellik eklenirken VEYA mevcut bir şeye ekleme yapılırken:
**HER ZAMAN en son kararlı (latest stable) sürüm kullanılır.** Eski/düşük sürüme indiren ("downgrade") güncelleme YAPILMAZ. Kütüphane kurarken en güncel sürümü kur, eski örnek/eski API kopyalama. Bu kural her eklemede istisnasız geçerlidir.

---

## 6.12 🌍 TOPLULUK & SOSYAL ETKİ — KÜRESEL VİZYON (2026-06-02 — kullanıcı)

GLAMWORLD **bütün dünya topluluklarına** hitap eder — tek bir ülke/dil değil, küresel bir topluluk platformu. **Topluluk ve Sosyal Etki:** stratejik pazarlar için (ve genel "tüm dünya topluluğu" için) ÖZEL TOPLULUK YAPISI kurulur — her bölge/topluluk kendi içinde buluşur ve büyür, ama hepsi tek lüks çatı altında birleşir. Metinler, diller, meslek/üretici kategorileri ve gelecekteki tüm özellikler bu küresel-topluluk vizyonuna göre tasarlanır. (Şu ana kadarki uygulama: 12 dil + dünya geneli ~190 meslek/üretici kategorisi + "dünyanın her yerinden kayıt" — bu vizyonun ilk adımları. İleride: bölge/topluluk alanları, yerel topluluk sayfaları, sosyal etki bölümleri.)

---

## 6.13 🏗️ ALTYAPI · ÖLÇEK · BÜYÜK VİZYON HARİTASI (2026-06-02 — kullanıcı, KESİN)

GLAMWORLD yarın **dev bir küresel platform** olacak. Bu yüzden:

### ⚙️ ALTYAPI İLKESİ (EN KRİTİK)
- **Site ÇÖKMEYECEK.** Altyapı baştan SAĞLAM, ölçeklenebilir kurulur — milyonlarca kullanıcı/190 ülke düşünülerek.
- **En son sistem/teknoloji** kullanılır (eski/terkedilmiş kütüphane yok — bkz. 6.11).
- **Düşük gecikme (low latency)** hedeflenir: hızlı yükleme, kod bölme (lazy load), görsel optimizasyonu, CDN.
- Ön yüz **modüler** yazılır: arka yüz (Firebase/Stripe/video vb.) sonradan bağlanınca tek parça çökmesin — her özellik ayrı modül.
- Büyük bir özelliğe geçmeden önce: **doğru mimariyi seç, kullanıcıya kısaca anlat, sonra kur.**

### 📋 ÖNERİ-ÖNCE KURALI (kullanıcının net isteği)
**Ana sayfa ve büyük yeni bölümleri KODLAMADAN önce, Code önce "nasıl yapacağım" önerisini/planını yazar, kullanıcı onaylar, ONA GÖRE yapılır.** Körlemesine büyük sayfa kodlanmaz.

### 🚀 BÜYÜK VİZYON — HEDEF ÖZELLİKLER (yol haritası, zamanı gelince)
- **Teknik:** Video akışı (video streaming), anlık çeviri (instant translation), **Elite Guild cüzdan sistemi** (wallet).
- **Kullanıcı deneyimi:** "Dijital seyahat" hissi, **siyah–altın–pırlanta** tasarım dili, düşük gecikme.
- **Küresel ölçek:** 190 ülke, çoklu dil + kültür desteği (mevcut: 13 dil — devam edecek).
- **Ödeme & Güvenlik:** **Stripe Connect**, **Wise** entegrasyonu, vergi uyumluluğu (tax compliance).
- **Kurumsal işbirlikleri:** L'Oréal, Dyson gibi markalar için **veri analitiği dashboard'u**.
- **Yatırımcı sunumu:** **Pırlanta Ekonomisi**, **Elite Guild** modeli, gelir stratejisi.
- **Topluluk & Sosyal Etki:** dünya geneli topluluk yapısı. **DİKKAT (2026-06-02 düzeltme):** ana sayfada "Türkiye/Almanya/Ukrayna gibi belirli ülkeleri ÖNE çıkaran bölge listesi" YANLIŞ seçimdi — kullanıcı kaldırttı. Belirli ülke öne çıkarma YOK; GLAMWORLD bütün dünyaya/tüm mesleklere açık (bkz. 6.12).

### ⏳ ŞİMDİLİK ERTELENEN (kullanıcı kararı)
- **Firebase / gerçek arka yüz KURULDU ve CANLI (2026-06-06→09 — bu not artık GÜNCEL):** Bu satır eskiden "şimdilik bırakıldı" diyordu — ARTIK GEÇERSİZ. Firebase Auth + Firestore bağlı; gerçek üyelik Firestore'a yazıyor (kullanicilar koleksiyonu); profesyonel kayıtta meslek+konum da kaydediliyor (B177); Keşif/Arama gerçek veriyle çalışıyor (B176-179); Google girişi hesap-seçme açık. Kalan: profil penceresi içi düzenleme, İletişim/Teklif/Randevu, Storage (foto) kuralları.
- **UNUTULMAYACAK 3 İŞ:** (1) Profil sayfası, (2) Keşif/arama, (3) Gerçek ana sayfa — hepsi arka yüze hazır şekilde, önce ön yüz/tasarım olarak kurulabilir, veri sonra bağlanır.

### 🏠 MÜŞTERİ ANA SAYFASI — TASARIM YÖNÜ (2026-06-02 — kullanıcı, NET)
- **FACEBOOK GİBİ AKIŞ (feed):** aşağı indikçe YENİ güncellenen her şey görünür (akış). Yazılar ekranı KAPLAMAZ; içerik akar.
- **CANLI / RENKLİ / PARLAK** olacak — basit/cansız/boş DEĞİL. İsim (GLAMWORLD) kenarlarında PARLAYAN pırlantalar.
- **Belirli/basit meslekleri ÖNE çıkarma YOK.** GLAMWORLD bütün dünyaya ve TÜM mesleklere açık — sınırlı liste değil.
- **Belirli ülke (TR/DE/UA) bölge listesi YOK** (yukarıdaki düzeltme).
- **Üst canlı şerit:** kullanıcının EN SON sürümüne göre yapılır (eski v1 bozuktu — kopyalama). Fotoğrafı kullanıcı verir.
- **⛔ ESKİ SİTEYİ KOPYALAMA:** kullanıcının eski v1 ekran görüntüleri SADECE örnektir, çoğu bozuk/eski. Birebir kopyalama; "en son hâl" + bu kurallar esas.
1. Parmakla geri gitme (bilgisayar/iPad soldan-sağa). → CSS'te `overscroll-behavior` KULLANMA.
2. CSS hapsleme: kök kapsayıcı içinde kal. `html`/`body`'ye `overflow/position/touch` KOYMA.
3. index.js'te StrictMode YOK.
4. Onaylanmış, çalışan tasarıma izinsiz dokunma.
5. **TEL KOD HARİTASI (A5.B12) — KESİNLİKLE DOKUNMA.** `telHaritaRef`, `telGercekHarita`, tel harita useEffect — hiçbirine girme, değiştirme, başka yerden kopyalama. Kullanıcı tarafından ONAYLANDI ve KİLİTLENDİ.
6. **🔒 PROFESYONEL FORM (A5) — B47'DE ONAYLANDI VE KİLİTLENDİ — BOZMA (EN ÖNEMLİ).** Kullanıcı "bu profesyonel kart harika" dedi, kart BİTTİ. `ProfesyonelForm.js`'in B47'deki çalışan hali artık REFERANSTIR — eski/çelişen tarif neyse, çalışan B47 hali kazanır. İzinsiz değiştirme. ŞUNLAR ÇALIŞIYOR, DOKUNMA: konum şeritleri (ülke/şehir/ilçe/mahalle/posta kodu), `sadeles` evrensel harf normalleştirme (tüm dünya aksanları — ı/i, ö/o, ü/u, ş, ç, ğ + Almanca/Fransızca/İspanyolca/Ukrayna...), ilçe önerisi (kasaba+district, ada+şehre göre süzme), şehir/mahalle öne sıralama, harita seçim navigasyonu (buKonumuSec/buTelKodunuSec → doğrudan ana kart, navigate(-1) DEĞİL), `/kayit-tamam` başarı sayfası. Yeni bir şey gerekirse bu davranışları BOZMADAN ekle, önce kullanıcıya sor. **(2026-06-01 onaylı düzenleme:** kullanıcı izniyle ana karttaki ödeme yöntemi ikonları (PayPal/VISA/Mastercard...) KALDIRILDI — müşteriyi korkutmasın diye sadece ödeme penceresinde gösteriliyor; ödeme penceresine/mantığa dokunulmadı. Görsel/yerleşim/yatay-taşma düzeltmeleri artık serbest, çekirdek mantık (konum/harita/arama/kayıt) hâlâ kilitli.)
7. **🔒 MÜŞTERİ FORMU (A6) — ONAYLANDI VE KİLİTLENDİ — BOZMA.** Kullanıcı onayladı. `MusteriForm.js`'in EN SON yayınlanan hali (sürüm rozetinde görünen son A6.B sürümü) REFERANSTIR — eski/çelişen tarif neyse, çalışan son sürüm kazanır. Beyaz pırlanta, ÜCRETSİZ (ödeme/meslek/rol YOK). ŞUNLAR ÇALIŞIYOR, DOKUNMA: kişisel alanlar, cinsiyet, konum şeritleri + posta kodu (Photon, evrensel harf duyarsız arama `sadeles`), konum haritası (`musteriHarita`), RENKLİ telefon kodu haritası (`musteriTelHarita` — profesyonelle aynı: topojson + world-atlas, renkli ülkeler + isim + kod), Üye Ol → `/kayit-tamam`. Yeni özellik bu davranışları BOZMADAN eklenir, önce kullanıcıya sor.

---

## 8. 🔢 SÜRÜM SAYACI (rozet)
- Dosyalar: `SurumRozeti.js` + `SurumRozeti.css`. GEÇİCİ, tasarımdan AYRI, yüzer, taşınabilir.
- Her sayfaya `<SurumRozeti saglam="..." simdi="..." not="..." />` eklenir.
- **Şimdi** = çalışılan sürüm, HER güncellemede artar (A1→A2→A3...).
- **Sağlam** = son hatasız + ONAYLI nokta. Onaylanınca `saglam` = o anki `simdi` yapılır.
- Rozet sitede görünmüyorsa = kod ulaşmamış. Önce onu çöz.
- Her seçime/güncellemeye göre rozet otomatik güncellenir.

---

## 9. HER GÖREVDE CODE'UN YAPACAKLARI (OTOMATİK — KULLANICIYI YORMA)
**Kullanıcı "devam et" / "kur" / "yap" / kısa bir şey dediğinde, Code şunları KENDİ yapar — adım adım uzun komut beklemez:**
1. **Bu anayasayı baştan sona oku.** (İSTİSNA YOK — her görevde.)
2. `pwd` ile `C:\dev\glamworld2` mı kontrol et.
3. **Downloads klasörüne bak:** yeni .js / .css / .md dosyası var mı? Varsa bunlar kurulacak demektir.
4. Değişecek dosyaların `.yedek` kopyasını al.
5. Yeni dosyaları doğru yere (`src\` veya kök) ZORLA kopyala (üzerine yaz).
6. **Anayasanın "yanlış kod sökülür" kuralı:** eski/kullanılmayan dosyaları (örn: artık import edilmeyen ulkeler.js) SİL.
7. Kurduğun dosyanın gerçekten güncel olduğunu DOĞRULA (içeriğine bak, eski kod kalmış mı kontrol et).
8. `npm start` ile test et, hata varsa KENDİN düzelt.
9. Hata yoksa `npm run deploy` ile yayınla.
10. "tamamdır" de + 1-2 cümle özet (ne yaptın, ne kurdun).

**SORU SORMA KURALI:** Code kullanıcıya sürekli soru sormaz, onay beklemez. Sadece GERÇEKTEN kararsız kaldığında (iki dosya çakışıyor, hangisini sileceği belirsiz vb.) tek bir net soru sorar. Gerisini anayasaya ve sağduyuya göre kendi halleder.

**SIRADAKİ İŞ:** Kullanıcı "sıradaki işe geç" derse, Code madde 13 SIRADAKİLER listesine bakar, ilk yapılmamış işi kendisi belirler.

---

## 10. TEMİZLİK & İZİN
- Eski bozuk dosya, hayalet, kullanılmayan import KALMAYACAK.
- `.claude/settings.json` + bypass modu: Code izin sormaz, işi sonuna kadar bitirir.

---

## 11. PROJE BİLGİLERİ
- Yerel: `C:\dev\glamworld2` | GitHub: `abdulkadirciftsuren-maker` / `glamworld-yeni`
- Canlı: `abdulkadirciftsuren-maker.github.io/glamworld-yeni` | Test: `localhost:3000`
- Teknik: React + GitHub Pages

---

## 12. BİTENLER
- Açılış (Acilis.js/css), Giriş kartı (Giris.js/css), Sürüm rozeti (SurumRozeti.js/css) — çalışıyor.
- Eski C:\dev\glamworld silindi (yedek masaüstünde).
- **A2 — Üye Ol tip seçim** (UyeOl.js/css): Müşteri (beyaz pırlanta) / Profesyonel (kırmızı pırlanta) kartları. YAYINDA, çalışıyor.
- **A6 — MÜŞTERİ KAYIT FORMU SIFIRDAN YENİDEN KURULDU (2026-05-31):** Eski bozuk MusteriForm.js (çok oynanmış, hata veriyordu) tamamen SİLİNDİ; çalışan/kilitli profesyonel form temel alınarak temiz, sade bir müşteri formu kuruldu. Beyaz pırlanta, ÜCRETSİZ (ödeme/meslek/rol YOK). İçerik: isim/soyisim/e-posta(+öneri)/şifre+göz/telefon (kod arama+GPS+elle, ağır dünya haritası yok)/cinsiyet (Bay-Bayan-Gizli)/konum (ülke/şehir/ilçe/mahalle/posta kodu — Photon, evrensel harf duyarsız arama, harita+GPS). Üye Ol → /kayit-tamam. Konum/arama sistemi profesyonel formla aynı (kanıtlanmış çalışan kod). Telefon kodu haritası da RENKLİ (profesyonelle aynı: topojson + world-atlas). **A6 ONAYLANDI ve KİLİTLENDİ (en son A6.B sürümü referanstır) — bkz. Madde 7/7. Bozma.**
- **A5.B12 — TEL KOD HARİTASI TAMAMLANDI VE KİLİTLENDİ:** topojson + world-atlas CDN, 193 ülke renkli GeoJSON polygon, kalıcı ülke adı + telefon kodu yazısı, ISO direkt eşleme. Kullanıcı tarafından ONAYLANDI. **Bir daha değiştirilmeyecek. Dokunma. Oradan kopya alma.**
- **✅ A5 — PROFESYONEL KAYIT FORMU TAMAMLANDI VE ONAYLANDI (A5.B47 · 2026-05-30):** isim/soyisim/e-posta/şifre+göz/telefon/cinsiyet + konum (ülke/şehir/ilçe/mahalle/posta kodu — Photon, evrensel harf duyarsız arama, tüm dünya), meslek/ilgi seçimi, çalışma durumu, tecrübe, güvenli ödeme katmanı, kayıt sonu `/kayit-tamam` başarı sayfası. Kişisel yer isimleri temizlendi (herkese uygun, kullanıcıya özel değil). Kullanıcı "harika" dedi. **KİLİTLİ — bkz. Madde 7/6. Bozma.**

## 13. SIRADAKİLER (çalışma sırası)
1. ✅ Üye Ol — tip seçim ekranı (A2 BİTTİ)
2. ✅ Müşteri formu (A3 BİTTİ)
3. ✅ Profesyonel akışı / kayıt formu (A5 BİTTİ — B47 onaylı, KİLİTLİ)
4. ✅ Müşteri formu A6'da SIFIRDAN yeniden kuruldu — ONAYLANDI ve KİLİTLENDİ (en son sürüm referans)
5. ✅ Giriş Yap formu — GERÇEK Firebase auth (e-posta/şifre + Google) BİTTİ (A7)
6. ✅ Çoklu dil (13 dil, Japonca dahil) + ülke adları otomatik (Intl.DisplayNames) + ~190 meslek çevirisi BİTTİ
7. **ANA SAYFA** (giriş sonrası): önce ÖNERİ/plan getir (bkz. 6.13 öneri-önce kuralı), kullanıcı onaylar, sonra kur. Tasarım önce (siyah-altın-pırlanta), veri sonra bağlanır. ← **SIRADAKİ**
8. Profil sayfası (profesyonel profili: foto, meslek, konum, iletişim)
9. Keşif / arama (meslek + konuma göre profesyonel listeleme — platformun kalbi)
10. GERÇEK ÜYELİK + arka yüz (Firebase/Stripe — kullanıcı "sonra" dedi, ERTELENDİ; bkz. 6.13)
11. Ödeme Modeli (bkz. 6.5) — Stripe Connect + Wise (bkz. 6.13)
12. Mesajlaşma, video akışı, Elite Guild cüzdan, kurumsal dashboard (bkz. 6.13 büyük vizyon)
- Her yeni sayfaya sürüm rozeti + her düğme çalışır olacak. Altyapı SAĞLAM/ölçeklenebilir (bkz. 6.13).

## 6.14 — ESKİYİ GETİRME, SIFIRDAN YAZ (2026-06-05, kullanıcı kesin talimatı)
- **Eski/önceki sistemlerden hiçbir şey kopyalanıp "geri yüklenmeyecek".** Bir özellik gerekiyorsa MEVCUT yeni yapıya uygun şekilde SIFIRDAN yazılır. Eski kodu/akışı geri getirmek YASAK — her seferinde sorun çıkardı.
- Yapmadan ÖNCE bu ANAYASA'yı ve ilgili kodu OKU; körlemesine başlama.
- Yayından ÖNCE akışın tamamını kontrol et (her düğme nereye gidiyor, fazla pencere/çatışma/beyaz ekran var mı). Çalışanı bozma; içi boş düğme/pencere bırakma.
- Giriş/kayıt sonrası: EN AZ pencere, temiz geçiş → doğrudan ana sayfa. (Tek kayıt-sonrası pencere yeterli: içinde Google ile giriş düğmesi olabilir; ikinci/üçüncü pencere YOK.)

## 6.15 — ANA SAYFA & SAYFA TASARIM KURALLARI (2026-06-05)
- **Cihaza göre AYRI tasarım:** Telefon, tablet (iPad) ve bilgisayar ASLA aynı görünmeyecek. Geniş ekranda daha çok içerik/sütun ve daha zengin görünürlük; tablet orta; telefon tek sütun. Büyük platformlardaki gibi her cihaza özel düzen (sadece "ölçeklenmiş" değil, gerçekten farklı yerleşim).
- **Zemin SİYAH DEĞİL:** Platform "sanal/yüzen sayfalar" hissi versin. Arka plan canlı/değişen (turkuaz–deniz gibi, hafif hareketli) bir zemin; üstünde sanal kartlar/sayfalar yüzer. (İleride şehir/ülke canlı fotoğrafları arka plana gelebilir.)
- **Üst ülke/şehir şeridi (canlı dünya):** KALACAK, düzenlenip güzelleştirilecek.
- **GLAMWORLD isim/amblem bölümü:** Zemini SİYAH kalır (üst bant); üstünde düzenlemeler yapılır. Amblem her sayfaya göre uyarlanır (renk/vurgu değişir).
- **Alt ikon düğmeleri:** KALACAK ama altlarında zemin/bar OLMAYACAK — havada, birbirinden ayrı yüzer gibi görünecek; zarif, altın, ışıltılı.
- **Her sayfa kendine özgü:** Her sayfanın kendi renk teması + uyarlanmış GLAMWORLD amblemi olacak; hiçbir sayfa bir diğerine benzemeyecek. Zarif, lüks, güzel renkler.
- **Performans:** Animasyon GPU-dostu (CSS gradyan/transform), ağır video yok → düşük gecikme (bkz. 6.13).
- **🔷 SÜS KURALI ÇİPLERE DE UYGULANIR (2026-06-08):** Yazının yanındaki ikon/elmas/pırlanta üst-alt yazı hizasını ASLA bozamaz — yazıdan sayılmazlar (akış-dışı, `position:absolute`). Bu kural istatistik çipleri dahil HER yerde geçerlidir (örnek: 4 çipte ikon rakamın hizasını bozuyordu → akış-dışına alındı, A8.B164).
- **🔷 SÜS YAZIDAN AYRI SAYILIR — HİZA KURALI (2026-06-06, kullanıcı KESİN):** Bir yazının yanına/başına/sonuna pırlanta, amblem, dünya, ikon vb. SÜS konulduğunda bu süsler AYRI sayılır — yazının ORTALANMASINI ASLA BOZMAZ. Yazılar her zaman ortalı kalır; ÜSTTEKİ başlık (GLAMWORLD) ile ALTTAKİ alt-yazı birbiriyle HİZALI/eşit durur. Teknik: süs ögeleri akış-DIŞI konumlanır (`position:absolute`), metnin genişliğine EKLENMEZ; metin kendi başına ortalanır. Süs yüzünden yazı sağa/sola kaymaz. (Hata örneği: 2026-06-06 amblem/dünya inline konuldu → yazılar ortadan kaydı; düzeltildi.)
- **💎 PIRLANTA STİLİ — KARTLARDAKİ GİBİ (ANAYASA Madde 6'yı uygula):** Pırlanta KOYARKEN uçan/serbest SVG elmas YASAK. Pırlanta = yuvaya GÖMÜLÜ taş (yüzük taşı gibi): yuvarlak ALTIN yuva + altın TIRNAKLAR, taş SABİT durur (dönmez/sallanmaz), sadece üst görünür, İÇTEN ışık saçar (merkez parıltısı animasyonlu olabilir). Referans: kartlardaki `Tas` bileşeni (UyeOl.js — mavi/beyaz/kırmızı). Müşteri=beyaz, Profesyonel=kırmızı kimlik kuralı (Madde 6) korunur; sayfaya özel renk (ör. ana sayfa amblemi mavi) olabilir ama STİL hep bu gömülü-taş olur.
- **🌐 MARKA ÇEVRİLMEZ (2026-06-07, kullanıcı KESİN):** "GLAMWORLD" adı sitenin HİÇBİR yerinde HİÇBİR dile çevrilmez (Google Çeviri dahil — örnek hata: Almancada "GLAMOURÖSE WELT" olup üst düzeni bozdu). Teknik: marka yazısı geçen HER öğeye `translate="no"` + `className="notranslate"` konur. Yeni eklenen her marka yazısında bu ZORUNLUDUR.
- **🪟 HER SAYFA/PENCERE KENDİNE HAS (2026-06-07, kullanıcı KESİN — tekrarlandı):** Ana sayfadaki öğeler (ÜST DEĞERLER/piyasa şeridi, akış, arama) SADECE ana sayfada kalır; başka pencere/sayfada GÖZÜKMEZ. Diğer pencerelerin/sayfaların başlığı değişir ve oraya GEREKEN düğme+ikonlar konur — ana sayfadan otomatik öğe MİRAS ALINMAZ. Her sayfa/pencere kendine has tasarımdır. (Madde 6.13 "her sayfa farklı" kuralının pencere düzeyinde netleştirilmesi.)
- **🪟 PENCERE/EKLENTİ KENDİ SAYFASINA BAĞLANIR — ANA SAYFAYA SIÇRAMAZ (2026-06-09, kullanıcı KESİN, TEKRARLANMASIN):** Ana sayfa DIŞINDA herhangi bir sayfada/pencerede bir şey eklendiğinde (modül, alt pencere, seçim ekranı vb.) o öğe O SAYFAYA bağlanır: O SAYFADA açılır, O SAYFADA kapanır, kapanınca O SAYFA AÇIK kalır. Ana sayfayla HİÇBİR bağı olmaz; ana sayfaya atmaz/sıçramaz. (Hata örnekleri: "meslek seçimi"nin ana sayfaya bağlanması; profil sayfasının ayrı route'a koparılıp ana sayfadan kopması — A8.B151-155. Bir daha YAPILMAZ.)
- **❓ HER YERDE YARDIM/AÇIKLAMA (2026-06-11, kullanıcı KESİN — ÖNEMLİ):** Sayfanın HER yerinde, kullanım gerektiren her özelliğin yanında müşteriyi nazikçe bilgilendiren bir **(?) yardım ikonu + güzel, renkli açıklama yazısı** bulunur. Pencere/bölüm açılınca o bölümün ayar alanında kısa, zarif, renkli bir anlatım gösterilir ("nasıl kullanılır"). Üstte de zarif bir yönlendirme olur (ör. "Ayarlamak için bir pencereye dokunun"). Büyük platformlar bunu yapar; biz DAHA GÜZELİNİ yaparız. Teknik: `.apf-yardim` (renkli kutu) + `.apf-yardim-ik` (altın ? rozeti); açıklamalar `t()` ile çok dilli. Yeni eklenen her özelliğe bu yardım açıklaması ZORUNLU.
- **🎨 SAYFAYA CANLILIK/RENK (2026-06-11, kullanıcı):** Profil ve diğer alanlar canlı renklerle zenginleştirilir: isim ALTIN TOZU (altın gradyan yazı), e-posta sıcak altın, profil bölümü altın, amblem turkuaz, meslek pırlanta(kırmızı/pembe) tonlarında. Fotoğraf ile çerçeve arasındaki boşluk KOYU/siyah değil renkli (altın tozu) dolgu olur — arada ekran zemini görünmez. Okunurluk korunur (Madde: okunurluk birinci), aşırıya kaçılmaz.
- **➕ YENİ ÖĞE SADECE KENDİ SAYFASINA (2026-06-07, kullanıcı KESİN):** Bir sayfaya/pencereye eklenen HER yeni öğe (panel, düğme, yazı, ikon) YALNIZ o sayfada görünür — diğer sayfalara otomatik yayılmaz. Her sayfada görünecek genel bir öğe ancak kullanıcı AÇIKÇA isterse eklenir. (Hata örneği: "Profesyonel/Hoş geldin/Meslek Pasaportum" paneli tüm pencerelerde çıktı → tamamen silindi, A8.B156.) Profil/hesap ayarları büyük platformlardaki gibi MENÜ → AYARLAR'dan açılır.
- **💎 GERÇEK PIRLANTA + YÜZÜK ÇERÇEVE (2026-06-12, kullanıcı KESİN, referans fotoğraflı):** Sitedeki pırlantalar GERÇEK kesimli elmas gibi çizilir (yuvarlak brilliant kesim: fasetler/yüzeyler belli — taç + yıldız + kuşak yüzleri ayrı tonlarda, merkezde ışık, kenarda koyu kuşak), ve HER pırlantanın ETRAFINDA altın YÜZÜK gibi çerçeve + tırnaklar olur (taş yüzüğe oturmuş gibi). "Saçma/basit/cansız" parıltı topu YASAK; kullanıcı defalarca gerçek elmas istedi. 12 GERÇEK RENK döner (kullanıcının verdiği referanstan): Brilliant White, Sapphire Blue, Royal Purple, Emerald Green, Golden Yellow, Pink Rose, Fire Red, Aqua Teal, Champagne, Ice Blue, Mystic Black, Aurora Opal. Bu renkler HER SAYFADA, gereken her yerde kullanılır (sayfaya göre değişir). Kod: `GercekPirlanta` bileşeni (src/Anasayfa.js) — tek kesim, renk parametreli; derinlik akışında bu pırlantalar süzülür. İçte TEK beyaz nokta YOK (aşağıdaki yasak stil hâlâ geçerli). A8.B259'da kuruldu.
- **🚫 YASAK PIRLANTA STİLİ — "BONCUK/DAMLA + BEYAZ NOKTA" (2026-06-07, kullanıcı KESİN):** Düz/yalın taş silüeti (üçgen-damla-yuvarlak tek parça dolgu) + İÇİNDE BEYAZ NOKTA/öz olan pırlanta çizimi (yazılım adı: "cabochon / flat-gem with specular dot") sitede BİR DAHA HİÇBİR YERDE KULLANILMAZ. Kullanıcı bu stili reddetti (A8.B126-128 elite mavi pırlanta denemesi). Pırlanta HER ZAMAN GERÇEK KESİMLİ çizilir: KESİM/FASET ÇİZGİLERİ BELLİ (taç + kuşak + pavyon yüzeyleri ayrı renk tonlarıyla), içinde beyaz nokta OLMAZ. Işık efekti taşın dışına/parlaklığına verilir, içine beyaz benek konmaz.

- **🔒 FEED PENCERE EBATLARI — KİLİTLİ, DEĞİŞMEZ (2026-06-16, A9.B1 onaylı):** Ana sayfa akış medya pencereleri SABİT. Bir daha DEĞİŞTİRİLMEZ; uzat/kısalt/oran/cover-contain denemesi YASAK. KESİN değerler:
  - **ENLİ (yatay) fotoğraf:** `.apr-medya{ min-height:230px; padding:0 }` + `.apr-medya img{ width:100%; height:auto }` (foto doğal/kesiksiz, eni tam; yazı+tür ikonu FOTOĞRAFIN ÜZERİNDE açık yazı+koyu gradyan, altın şerit/boş alt YOK).
  - **DİK (uzun) fotoğraf:** `.apr-medya.uzun{ aspect-ratio:4/5; padding:0 }` + `.apr-medya.uzun img{ width:100%; height:100%; object-fit:cover }` (pencere sabit 4/5, eni tam dolu).
  - **VİDEO:** `.apr-medya.video{ aspect-ratio:3/4; padding:0 }` + `.apr-medya.video video{ width:100%; height:100%; object-fit:cover }`.
  - **Sütun genişliği (cihaza göre):** telefon=tam · iPad(≥760)=max 680px · notebook(≥1100)=max 720px · geniş ekran(≥1500)=`width:58vw; max-width:820px`.
  - **PAYLAŞIM/EDİTÖR önizleme penceresi (`.apf-oniz.post`):** kenarlar DÜZ (`border-radius:0`, `sekilYol` post=düz dörtgen, oval/yuvarlak DEĞİL); pencere FOTOĞRAFIN oranına göre açılır (enli→enli, dik→dik; `postOlcu` foto en-boyundan).
  - Başka iş yapılırken `.apr-medya` / feed `onLoad` / `.apf-oniz.post`'a ASLA dokunulmaz.

## 6.16 — ANA SAYFA, SOSYAL TİCARET & PLATFORM TEMELİ (V2 — 2026-06-06)
*(Claude + Gemini + ChatGPT + Copilot fikirleri birleştirildi. Tek doğru kaynak burası.)*

### A) KONUMLAMA / VİZYON
GLAMWORLD = **TikTok + Facebook + LinkedIn + Booksy + Google Maps**'in lüks birleşimi.
Sadece eğlence değil: meslek/hizmet/ticaret/üretici/tedarikçi + müşteri buluşturma merkezi.
Kullanıcı: içerik paylaşır, iş bulur, hizmet alır, ürün/hizmet satar, güven puanıyla dünyada görünür.
190 ülke, tüm meslekler/işletmeler. (Belirli ülke öne çıkarma YOK — bkz. 6.13.)

### B) TASARIM İLKESİ (ChatGPT — KESİN DENGE)
- **OKUNURLUK BİRİNCİ.** Lüks kalır AMA aşırı parlama/partikül/çerçeve AZALTILIR; süs sadece marka (amblem) alanında. Altın vurgu yalnız önemli yerlerde. Tek ana altın çerçeve yeter.
- Mobilde yazılar BÜYÜK; placeholder gri ama okunur. Renk sabit: koyu zemin + altın vurgu + beyaz ana metin + gri ikincil. Kullanıcı ilk 3 saniyede ne yapacağını görmeli.

### C) ANA SAYFA DÜZENİ (3 blok)
1. **Üst (Global Header):** ince yatay ticker (saat[lokal] / EUR / USD / Altın / Gümüş / Bitcoin / borsa) — boy yemez, kullanıcı KAPATABİLİR. Sticky + cam efekti; sol menü+zil, ortada GLAMWORLD amblem, sağ arama+profil; dil tek yerde. Altında **GLOBAL ARAMA**: "Meslek, hizmet, işletme, kişi, şehir, ülke ara" + Konum + Kategori + Filtre. İsimli hızlı ikonlar (boş kalmaz): Keşfet · Meslekler · Video · Yakındakiler · Pazar · Mesajlar; aktif ikon altın shimmer; snap-scroll.
2. **Ana Akış (Feed):** lüks dikey sonsuz akış (swipe-snap, tam ekran, ASLA boş ekran). 3 içerik tipi:
   - **A) Profesyonel paylaşımları:** ad+meslek+şehir + ⭐puan + kalite/doğrulama etiketi + foto/video. Eylemler: Beğen · Yorum · Kaydet · Paylaş · 🤝 Hızlı Randevu · 💎 Hediye · Mesaj. (Kartta boş alan yok; görsel yoksa meslek/konum/teklif butonları görünür.)
   - **B) Hizmet arayan paylaşımları (talep):** "Berlin'de iç mimar arıyorum" → tek tıkla profesyonele mesaj/teklif. (Sosyal+ticaret hibriti yapan şey budur.)
   - **C) Trend Radar (AI):** en çok aranan meslekler, en çok izlenen videolar, en hızlı büyüyen şehirler, en popüler profesyoneller.
   - **Sanal mağaza/üretici kartı:** lüks ürün + Satın Al (e-ticaret).
3. **Alt Navigasyon:** 5 sabit, eşit boy sekme: **Keşfet · Ara · Paylaş(+) · Mesaj · Profil**. (Harita/Konum üst hızlı ikonlarda "Yakındakiler" olarak; alt barın 5. sekmesi Paylaş/Konum tartışması KARAR J3.)

### D) İKİ AYRI ZEKA (karıştırma)
- **Site Pilotu (büyüteç):** teknik arama — sesli komut + fotoğraf kabul eder; sayfa açar / eşleşen meslek-ürün döker.
- **Glami (companion):** AYRI parlayan balon; her dilde dertleşilen, yüksek duygusal zekalı "profesyonel sırdaş" + site yardımı. Aramadan ayrıdır.

### E) ÇEKİRDEK ÖZELLİKLER (rakiplerde yok — ChatGPT)
- **Meslek Pasaportu:** meslek, şehir, deneyim, portfolyo, sertifika, puan, dil, fiyat aralığı.
- **Güven Rozeti:** kimlik/işletme/sertifika doğrulama + tamamlanan iş sayısı.
- **Teklif Sistemi:** müşteri iş ilan eder → hizmet verenler teklif verir → pazarlık+mesajla çözülür.
- **Dünya Meslek Haritası:** yakındaki usta/doktor/tasarımcı/tedarikçi/fabrika haritada (Google Maps mantığı).
- **Canlı Vitrin:** kısa video tanıtım; ürün/hizmet kartı videoya bağlı.
- **Çoklu Rol:** aynı kişi hizmet veren+alan+üretici; rol sonradan değişir.
- **Prestij Puanı:** beğeniden değerli — tamamlanan iş, yorum kalitesi, cevap hızı, doğrulama, süreklilik.

### F) PARA MOTORU
- **Müşteri kartı:** ÜCRETSİZ; cüzdana gerçek parayla pırlanta yükler; izler/yorum yapar.
- **Profesyonel kartı:** 10€/AY; vitrin açar, randevu/hediye/canlı yayın.
- **Hediye → nakit:** %30 GlamWorld kasası, %70 profesyonelin bankasına. Hediye atılınca elmas patlama animasyonu.
- Hediye gönderen müşteriye nakit YOK → Glam-Puan + esnaf/üretici indirim kuponu (sistemde kalsın).
- **Gelir modeli:** premium profil + teklif komisyonu + vitrin öne çıkarma + reklam.
- **Ödeme/güvenlik:** Stripe Connect + Wise + KYC + vergi (FAZ 3 — hukuki, acele YOK).

### G) İNŞAAT SIRASI (TEMEL ÖNCE — sahte veri YOK; haftalık test edilebilir çıktı)
- **FAZ 0 — Altyapı:** Firebase Auth(✓) + Firestore + Storage + Güvenlik Kuralları; veri modeli (kullanicilar / profesyoneller / hizmetler / gonderiler / teklifler / randevular / cuzdan). Modüler, çökmeyen, ölçeklenir.
- **FAZ 1 — Çekirdek döngü:** Meslek Pasaportu (Profil) + Keşif/Arama+Filtre + İletişim/Teklif/Randevu.
- **FAZ 2 — Canlandırma:** akışı gerçek veriye bağla (3 içerik tipi) + mesajlaşma + Dünya Meslek Haritası + akıllı arama (sesli/foto) + Trend Radar.
- **FAZ 3 — Para & büyüme:** hediye/komisyon/üyelik + Glami + canlı yayın/video + Elite Guild cüzdan.

### H) KURALLAR
- Sahte veri / boş düğme YOK; özellik gerçek backend'e bağlanınca AÇILIR (UI iskeleti önce kurulabilir, "çalışıyor" gibi sahte gösterilmez).
- Okunurluk > süs. Çalışanı bozma. Yayından önce build kontrol. Sayaç DOKUNULMAZ. Onay/okey SORULMAZ (Madde 4 & 9).

### J) KARAR BEKLEYENLER (netleştirilecek)
1. Diller/ülkeler: TR + EN + DE ile başla (13 dil zaten var).
2. Meslek kategorileri: önce 50 ana kategori, sonra alt kategoriler.
3. Alt barın 5. sekmesi: **Paylaş(+)** mı **Konum/Harita** mı? (Diğeri üst hızlı ikonda.)
4. Doğrulama seviyeleri: e-posta → telefon → kimlik → işletme belgesi.
5. Gelir modeli önceliği: premium / komisyon / vitrin / reklam (hangisi önce?).

### K) COPILOT v1.0 EKLEMELERİ (06.06.2026)
- Estetiğe **Instagram** de eklendi (hızlı=TikTok, estetik=IG, profesyonel=LinkedIn, randevu=Booksy, konum=Maps, topluluk=FB).
- **Dünya/ülke seçici:** kullanıcı ülkeyi değiştirince akış/içerik o ülkeye göre değişir (otomatik konum + elle seçim).
- **Gönderi kartı eklemeleri:** proje fotoğrafları **carousel** + **Randevu Al** (Booksy) + **Haritada Gör** (Maps).
- **Filtreler:** Meslek · Ülke · Şehir · Trendler · Yeni başlayanlar · Elite Guild üyeleri.
- **Ana menü adayları (KARAR J3):** Copilot → Home · Elite Guild · Meslekler · Video · Harita; ChatGPT → Keşfet · Ara · Paylaş · Mesaj · Profil. Birleştirilecek.
- **"A8.B100 kalite kodu" YANLIŞ ANLAŞILMASI:** O etiket aslında SÜRÜM SAYACIDIR (DOKUNULMAZ, bkz. 6.8). Profesyonelin kalite göstergesi = **Prestij Puanı + Güven Rozeti** (E) ile yapılır; sayaç bu işe ASLA karıştırılmaz.

### L) TEKNOLOJİ YIĞINI (KESİN KARAR — Code'un net mühendis görüşü)
- **MEVCUT ÇALIŞAN YIĞIN KORUNUR:** React (CRA) + Firebase (Auth ✓ + Firestore + Storage + Cloud Functions) + GitHub Pages / Firebase Hosting + Stripe Connect + Wise. Firestore zaten global/ölçeklenir; ekstra altyapı gerekmez.
- **Copilot'un Azure + Next.js önerisi ALINMADI (bilinçli):** mevcut çalışan kodu çöpe atıp sıfırdan Next.js/Azure'a geçmek ~3 aylık emeği yok eder ve ANAYASA 6.14'e (eskiyi bozma / gereksiz sıfırdan yazma) AYKIRIDIR. Gerekirse FAZ 3'te SADECE video için ayrı medya servisi değerlendirilebilir; çekirdek Firebase kalır.

### M) FAZ 0 — VERİ MODELİ (Firestore) & GÖREV LİSTESİ (2026-06-06, UYGULAMA BAŞLADI)
**Erişim katmanı: `src/veri.js`** — TÜM Firestore okuma/yazma BURADAN geçer (bileşenler doğrudan `db` kullanmaz). Modüler; arka yüz tek yerden yönetilir.

**KOLEKSİYONLAR:**
- `kullanicilar/{uid}` (MEVCUT — korunur, genişletilir):
  `tip` ('musteri'|'profesyonel'), `isim, soyisim, eposta, telefon, cinsiyet, foto, saglayici, diller[]`,
  `konum:{ulke,sehir,ilce,mahalle,postaKodu,enlem,boylam}`, `olusturma, guncelleme`,
  `pro:{ meslek, meslekKodu, deneyimYil, hakkinda, hizmetler[], fiyat:{min,max,para}, portfolyo[], sertifikalar[], calismaSaatleri, dogrulama:{eposta,telefon,kimlik,isletme}, prestijPuani, tamamlananIs, puanOrt, puanSayisi }` (sadece profesyonel — Meslek Pasaportu)
- `gonderiler/{id}`: `sahipUid, tip('profesyonel'|'talep'|'urun'), meslek, sehir, ulke, metin, medya[], olusturma, begeni, yorumSayisi` → alt: `yorumlar/{id}:{uid,metin,olusturma}`
- `teklifler/{id}`: `ilanUid, musteriUid, profesyonelUid, mesaj, fiyat, durum, olusturma`
- `randevular/{id}`: `musteriUid, profesyonelUid, tarih, hizmet, durum('bekliyor'|'onay'|'iptal'), olusturma`
- `sohbetler/{id}`: `katilimcilar[], sonMesaj, guncelleme` → alt: `mesajlar/{id}:{gonderenUid,metin,olusturma}` (FAZ 2)
- `cuzdanlar/{uid}`: `pirlanta, glamPuan` → alt: `islemler/{id}` (FAZ 3, yazma sadece sunucu)

**GÜVENLİK KURALLARI:** `firestore.rules` (repo kökünde). Kullanıcı bunu Firebase Console > Firestore > Rules'a yapıştırıp Publish eder. Özet: kullanicilar herkes okur/sadece sahibi yazar; gönderiler herkes okur/sahibi yazar; teklif/randevu/sohbet sadece taraflar; cüzdan yazma sadece sunucu.

**GÖREV LİSTESİ (sırayla):**
- FAZ 0: [x] firebase bağlı (Auth + Firestore CANLI, gerçek üyelik çalışıyor) · [x] `src/veri.js` erişim katmanı · [x] `firestore.rules` YAYINDA (2026-06-06, hatasız) · [x] Google girişi hesap-seçme (B110) · [ ] **Storage kuralları (foto yükleme için — FAZ 1'de gerekince)**.
- FAZ 1: [~] Meslek Pasaportu/Profil — kayıt meslek+konum yazıyor (B177), gerçek okuma var; [ ] profil PENCERESİ içi düzenleme (kendi mesleğini güncelleme) HENÜZ yok · [x] **Keşif/Arama GERÇEK ÇALIŞIYOR (B176-179): kayıtlı profesyonellerde isim/meslek/şehir/ülke, Türkçe-harf + 12 dil duyarlı, sonuçlar pencerede** · [ ] İletişim/Teklif/Randevu (temel) — sıradaki.
- FAZ 2: [ ] akış gerçek veri (3 tip) + mesajlaşma + harita + akıllı arama + Trend Radar.
- FAZ 3: [ ] para (hediye/komisyon/üyelik) + Glami + video.

## 6.17 — HER YERDE AI (GROXORG'a sor)
Platformda **her yerde** kullanıcının yanında AI/asistan erişimi olur:
- Her **gönderi yazısının** (feed + tam ekran) yanında, **Çevir** düğmesinin yanında küçük bir **AI (GROXORG'a sor)** ikonu → o gönderi hakkında soru/yorum/değerlendirme; konuşma **devam eder, kesmez** (bağlam = o yazı).
- **Çevir SADECE çevirir** (orijinal↔çeviri toggle); değerlendirme/yorum AI ikonunun işidir, çeviriye karışmaz.
- AI ikonu **küçük ve zarif** (kaba/büyük değil), her dilde kısa.
- Yeni eklenen her içerik/pencere türünde de bu AI erişimi düşünülür ("her yerde AI").

## 6.18 — PENCERE YÖNÜ: EKRAN YÖNÜNE GÖRE (yatay/dikey)
**Bütün pencereler (gönderi/feed kartları) ekranın yönüne göre açılır — her yerde, her tür içerik:**
- **Geniş/yatay ekran** (bilgisayar, iPad/notebook, telefon yan çevrilince) → pencereler **YATAY/geniş** gelir; içindeki fotoğraf, video, dik (portre) fotoğraflar dahil **hepsi yatay** görünür, pencereyi **%100 doldurur** (üstte/altta boşluk bırakmaz).
- **Dar/dikey ekran** (telefon dik) → pencereler **DİKEY** gelir (mevcut davranış).
- Bu kural **sadece video değil**: dik fotoğraflar, editörden paylaşılan yazılar/fotoğraflar, **her tür gönderi** için geçerli.
- Teknik: genişlik tabanlı media query (≥760 yatay, base=dar dikey) → ekran yönü neyse pencere de o yönde. Yeni eklenen her pencere/içerik türü de bu yön kuralına uyar.
- Uygulama: `.apr-medya` geniş ekranda `aspect-ratio:16/9` + medya `object-fit:cover`; telefon base'inde doğal/dikey.

## 6.19 — BİLGİSAYAR YAZI/BOYUT KURALI (⚠️ EN KRİTİK — TEKRAR EDEN HATA)
- **Yeni eklenen HER öğede (buton, yazı, kart, alan, ikon) bilgisayar (desktop) boyutu TELEFONDAN ASLA KÜÇÜK olmaz — her zaman desktop ≥ telefon.**
- Yeni bir şey eklerken MUTLAKA `@media (min-width:560px)` (ve gerekiyorsa `1100px`) ile BÜYÜK boyut ver. Breakpoint **560** kullan (her dizüstü/küçük pencere yakalansın; 760 bazı laptoplarda tetiklenmiyor).
- Telefon ≈16px ise bilgisayar 24-28px gibi belirgin büyük. Gerekirse `!important` (başka kural ezmesin; aynı selektörün dosya altında kopyaları olabilir, grep'le).
- Sebep: mobil-first base + desktop @media eksikse, geniş ekranda metin ufak kalır ("küçük bilgisayara, büyük telefona" şikâyeti). Kullanıcı bu hatadan defalarca çok kızdı.

---
*Yaşayan belge. Yeni kararlar buraya eklenir. Code her zaman en güncel halini okur.*
*Güncelleme: 6.19 — Bilgisayar yazı/boyut kuralı: yeni her öğede desktop ≥ telefon, @media min-width:560 ile büyük; ASLA telefondan küçük olmaz.*
