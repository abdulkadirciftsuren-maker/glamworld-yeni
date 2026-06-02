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

## 6.8 📊 SÜRÜM/BUILD SİSTEMİ (KESİN KURAL — A5.B9'dan itibaren geçerli)

### Sistem
- **A numarası** = ana sayfa/özellik (1 kere artar, o sayfa tamamlanınca):
  - A1 = Acilis.js (açılış animasyonu) ✅
  - A2 = Giris.js (hoş geldin kartı) ✅
  - A3 = UyeOl.js (müşteri/profesyonel seçimi) ✅
  - A4 = MusteriForm.js (müşteri kayıt formu) ✅
  - A5 = ProfesyonelForm.js (profesyonel formu) ✅ **B47'DE ONAYLANDI VE KİLİTLENDİ**
  - A6 = MusteriForm.js (müşteri kayıt formu) ✅ **ONAYLANDI VE KİLİTLENDİ (en son A6.B sürümü referans)**
  - A7 = Giriş Yap formu ← aktif (sıradaki)
  - A8, A9... = sıradaki sayfalar
- **B numarası** = o A-serisi içinde her deploy'da 1 artar (B1, B2, B3...)
  - Her yeni deploy: önceki B'ye +1 ekle
  - Yeni A-serisine geçince B sıfırdan başlar (B1)
- **Gösterim:** Rozette `A5.B9` formatında görünür

### Her deployda ne yapılır
1. `buildGecmisi.js`'te AKTİF A-serisi satırını güncelle (YENİ SATIR EKLEME):
   - `build` → +1 artır
   - `tarih`, `saat` → güncelle
   - `dosya` → sadece dosya adı yaz (örn: `'ProfesyonelForm.js'`) — açıklama koyma
   - `aciklama` → kısa açıklama
2. (App.js/index.js'te `SURUM` sabiti YOK — sürüm rozeti otomatik `buildGecmisi`'den okunur. Cache-bust kodu kaldırıldı.)
3. Deploy et: `npm run deploy`

**YASAK:** `dosya` alanına dosya adı dışında bir şey yazmak. `dosya:'ProfesyonelForm.js'` — başka değil.

### Onay sistemi
- Kullanıcı **"okey"** dediğinde → o B sürümü kararlı kabul edilir, A6'ya geçilir
- A6'da B yeniden B1'den başlar

**Dosyalar:** `src/buildGecmisi.js` + `src/SurumRozeti.js` + `src/SurumRozeti.css`

**SurumRozeti:** `buildGecmisi` import eder, `sonBuild`'den otomatik okur. Rozette `A5.B9` gösterir. Tıklayınca tüm geçmiş açılır. Props yok.

**Kullanım:** `<SurumRozeti />` — props verilmez. Her sayfada bu şekilde eklenir.

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
- **Firebase / gerçek arka yüz şimdilik BIRAKILDI** — kullanıcı "sonra kurarım" dedi. Şu an üye-olma Firebase'e yazmıyor (sahte akış); bu BİLİNÇLİ ertelemedir, hata değil. Arka yüz kurulunca: gerçek üyelik (hesap açma + Firestore'a profil kaydı), profil sayfaları, keşif/arama, gerçek ana sayfa bağlanacak.
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

---
*Yaşayan belge. Yeni kararlar buraya eklenir. Code her zaman en güncel halini okur.*
*Güncelleme: Büyük vizyon (tüm dünya meslekleri, ülke/şehir, cinsiyet, çalışan düğmeler) eklendi.*
