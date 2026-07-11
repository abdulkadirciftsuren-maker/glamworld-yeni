# 🇹🇷 CLAUDE.md — Code HER OTURUMDA bunu OTOMATİK OKUR (en başta, istisnasız)

> Bu dosya (`CLAUDE.md`) Claude Code tarafından **her yeni oturumda otomatik okunur**.
> Kullanıcı teknik değildir, İngilizce bilmez, kolay yorulur/üzülür. Aşağıdaki kurallara **harfiyen** uy.
> Tüm ayrıntılı kurallar için `ANAYASA.md` dosyasını da baştan sona oku.

---

## 1. ⛔ DİL KURALI — HER ZAMAN TÜRKÇE (EN KRİTİK — HER OTURUMDA TEKRARLANAN ŞİKÂYET)

**Code, kullanıcıyla ve çalışırken YAZDIĞI HER ŞEYİ TÜRKÇE yazar. ASLA İngilizce yazmaz.**

Bu, SADECE sohbet cevabı değildir. Şunların HEPSİ Türkçe olacak:
- Sohbet cevapları ve açıklamalar,
- **Araç çağırmadan önce yazdığın kısa "şimdi şunu yapıyorum" açıklamaları** (kullanıcı bunları canlı izliyor, İngilizce olursa anlamıyor ve seni durduramıyor),
- Commit mesajları,
- Kod içi yorumlar (`//` açıklamaları),
- `buildGecmisi.js` kayıtları,
- Değişken/işlev adları yeni yazılıyorsa bile açıklamalar Türkçe.

**Neden bu kadar önemli:** Kullanıcı çalışmanı ADIM ADIM izliyor ki bir yanlış görürse seni **durdurabilsin**. İngilizce yazarsan izleyemiyor, yanlışı geç fark ediyor, her şeyi baştan yaptırmak zorunda kalıyor ve çok üzülüyor. Kullanıcı Türkçe söylüyor; sen İngilizce'ye çevirip çalışırsan yanlış çeviri/yanlış iş çıkabiliyor. **Bu yüzden düşünürken bile Türkçe düşün, Türkçe yaz.**

**Kullanıcı bunu defalarca söyledi ve her oturumda tekrar bozuluyordu — çünkü eskiden bu kural otomatik okunan bir dosyada değildi. Artık burada. Bu dosya her oturumda okunduğu için bir daha unutma.**

Açıklamalar **numaralı adımlarla** ve sade olur (1, 2, 3…). Teknik jargon en aza indirilir.

---

## 2. 🔒 ÇALIŞMA DÜZENİ (git / deploy)

- **Geliştirme + push dalı:** `claude/glamworld-rules-review-0kzl0x` (yoksa oluştur, hep buraya push et).
- **Deploy:** `CI=false npx react-scripts build` → `npx gh-pages -d build --dotfiles` (site: gloxorg.com, GitHub Pages).
- **Her deploy'da `public/sw.js` içindeki `SW_SURUM` bir artar** (B207→B208…) — yoksa tarayıcı eski sürümde takılır.
- **Her deploy'da `src/buildGecmisi.js`'e Türkçe kayıt** eklenir (en üste, yeni build numarası). Commit'ten önce `node --check src/buildGecmisi.js` çalıştır.
- Git commit sonuna şu satırlar eklenir:
  - `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
  - `Claude-Session: ...` (oturum linki)
- **Kullanıcı açıkça istemedikçe Pull Request AÇMA.**

## 3. 🧭 ONAY İSTEME (anayasadaki kural)

- Code bu anayasayı okuduğunda onay ZATEN alınmış sayılır. İşe başlamak/deploy için "yapayım mı, emin misin, devam edeyim mi" diye **sorma** — kendin yap, bitir, raporla.
- Sadece iki gerçek seçenek çakışıyor ve karar kullanıcınınsa TEK net soru sorulabilir.

## 4. 🎨 SABİT TASARIM KURALLARI

- **⛔ HİÇBİR YERDE SİYAH/KOYU ZEMİN KULLANMA (kullanıcı KESİN istedi).** Tüm zeminler **ALTIN/renkli/canlı** olur. Tam ekran foto/video/hikâye açılışında, yükleme beklerken, kenar boşluklarında (letterbox) — HER YERDE **parlak altın**. Kod içinde siyah/çok koyu zemin (`#000`, `#0a1430`, `#05070e` vb.) görürsen **altına çevir**. Kullanıcı: "Ben hiçbir yerde siyah görmek istemiyorum; sayfam renkli, canlı, düzgün, zarif olacak." Medya yüklenene kadar bile zemin ALTIN kalır (siyah gösterme).
- **HİÇBİR YERDE yuvarlak düğme/avatar KULLANMA.** Kullanıcının profili **KARE**dir; tüm avatarlar/düğmeler kare (hafif yuvarlatılmış köşe olabilir, tam daire ASLA).
- Marka yazısı ("GLOXORG"/"GLAMWORLD") **hiçbir dile çevrilmez** → `translate="no"` + `className="notranslate"`.
- Tüm kullanıcı metinleri doğru **Türkçe karakter** kullanır; kullanıcı yazıları **altın** (#FFD700).
- Bilgisayar (desktop) yazı/öğe boyutu **telefondan ASLA küçük olmaz** (`@media (min-width:560px)` ile büyüt).
- Deploy'dan ÖNCE mümkünse **Playwright ile önizleme görüntüsü** çıkarıp kullanıcıya göster (kullanıcı görmeden onaylamıyor).
- **⛔ YAZI HİÇBİR DÜĞMEDE/ETİKETTE KESİLMEZ — SIĞMIYORSA KAYAR (kullanıcı KESİN istedi, HER YERDE):** Bir düğmenin/etiketin yazısı içine sığmıyorsa, `…` ile kesme veya taşma OLMAZ. Bunun yerine yazı **şeritte SOLA doğru CANLI yürür**, **3 kez** gidip başa döner, sonra **BAŞTA durur**. Bunun için `<KayanYazi>…</KayanYazi>` bileşeni + `.kayan-dis/.kayan-ic` CSS (Anasayfa) kullanılır. **Her yeni düğme/etikette** (Ayarlar, Gloxoo, akış, hikâye, Reels — HER YER) bu uygulanır; yeni bir yer eklerken de aynısı yapılır. Ayrıca **yazısız bir düğme** varsa, kullanıcı **bastığında üstünde ne işe yaradığı görünmeli** (etiket/ipucu).

## 5. 🤫 MODEL KİMLİĞİ

- Model adını (`claude-opus-4-8` vb.) commit mesajına, PR'a, kod yorumuna veya depoya giden HİÇBİR yere **yazma**. Sadece sohbette, sorulursa söylenir.

---
*Yaşayan belge. En kritik kurallar burada; tüm ayrıntı `ANAYASA.md`'de. Code her oturumda ikisini de okur.*
