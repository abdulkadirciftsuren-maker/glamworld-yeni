# ⚡ YENİ OTURUM — ÖNCE BUNU OKU (kullanıcı: "her yeni Code sayfayı bilmiyor, bozuyor, sıfırdan anlattırıyor")

> Bu bölüm, oturumlar arası **süreklilik** için. Yeni gelen Code, sayfayı buradan TANIYARAK başlar; kullanıcıya
> sıfırdan anlattırmaz ve düzeltilenleri bozmaz. **En güncel tam kayıt: `src/buildGecmisi.js` (en üstteki maddeler).**

## 📱 PLAY STORE (Android uygulaması) — DEVAM EDİYOR (19 Ağu 2026, kullanıcıyla adım adım)
> Kullanıcı sayfayı Google Play'e uygulama olarak koymak istedi. PWABuilder (TWA) yolu seçildi. **BUGÜN YAPILANLAR:**
> - ✅ **Manifest/hazırlık** (B185-B189): manifest link eklendi, .ico çıkarıldı, description İngilizce, açılış/şerit rengi mavi (#294a7d).
> - ✅ **PWABuilder** → gloxorg.com paketlendi → **`Gloxorg.aab` + imza anahtarı (signing.keystore) + assetlinks İNDİ** (kullanıcının bilgisayarında, Downloads). Package ID: **com.gloxorg.twa**.
> - ✅ **assetlinks.json** siteye eklendi (`public/.well-known/assetlinks.json`, sha256 parmak izi 34:29:6F...C6:98) → uygulama tam ekran açılır. (deploy --dotfiles ile gider.)
> - ✅ **Google Play geliştirici hesabı AÇILDI** — 25$ ödendi. Hesap adı "GLOXORG", Kişisel hesap, Hesap Kimliği 6524637860521605101, e-posta abdulkadirciftsuren@gmail.com. Geliştirici adı: GLOXORG.
> - ✅ **KİMLİK + ADRES DOĞRULAMASI ONAYLANDI** (20 Ağu, aynı gün "Kimliğiniz doğrulandı"). Kimlik = Türk pasaportu. Adres = ÖNCE oturum kartı reddedildi ("belge türü desteklenmiyor") → SONRA **PrivatBank hesap özeti (Виписка по картці, Privat24 → Довідки → Виписка)** kabul edildi: üzerinde adı + kayıtlı adresi (вул. Ігоря Бедзая 215Г кв.14, Миколаїв, 54003) + tarih var. NOT gelecekte: yurt dışı Türk vatandaşı + Ukrayna adresi → adres belgesi olarak **PrivatBank Виписка** çalışıyor (oturum kartı/реквізити ÇALIŞMIYOR — реквізити'de adres yok).
> **UYGULAMA OLUŞTURULDU (20 Ağu):** Play Console'da app yaratıldı. **Package ID `com.gloxorg.twa`** (.aab ile aynı, DEĞİŞMEZ). Uygulama/Ücretsiz. TÜM doğrulamalar (kimlik + Android cihaz + telefon) BİTTİ, hesap kurulumu tamam.
> **KURULUM GÖREVLERİ (11 tane) — 4/11 BİTTİ (20 Ağu gece):**
> - ✅ **Gizlilik politikası** → `https://gloxorg.com/gizlilik.html` (`public/gizlilik.html`, B190'da deploy edildi, CANLI — TR+EN).
> - ✅ **Oturum açma bilgileri (App access)** → Google denetçisine TEST HESABI verildi: **`gloxtest2026@gloxorg.com` / `Gloxorg2026test`** (uygulamada Üye Ol ile açıldı; "tam erişim" kutusu işaretli).
> - ✅ **Reklam** → Hayır. ✅ **İçerik derecelendirme** → IARC anketi tamam (Sosyal/İletişim, hepsi Hayır, sonuç 12+/13+/USK16+). engelle/şikayet YOK dedik.
> - ✅ **Hedef kitle** → 18+ seçildi (21 Ağu). ✅ **Hesap silme sayfası** yayında (`gloxorg.com/hesap-sil.html`, B191).
> - ⏳ **VERİ GÜVENLİĞİ (Data Safety) — DEVAM EDİYOR, yarıda kaldı** (kullanıcı çok yoruldu + Claude mesaj limiti doldu 21:20 reset). Adım 3 (Veri türleri) SEÇİLDİ; Adım 4 (Veri kullanımı) yarım. **TAM CEVAP ANAHTARI aşağıda ⬇️**
> - ⏳ **KALAN:** Veri güvenliği'ni bitir + Resmi kurum→Hayır, Finans→Hayır, Sağlık→Hayır, Kategori+iletişim, **Mağaza girişi (logo+açıklama+ekran görüntüleri)**.
>
> **🔑 VERİ GÜVENLİĞİ TAM CEVAP ANAHTARI (yarım kaldı, buradan devam):**
> - **Adım 2:** Veri topluyor→Evet · Şifreleniyor→Evet · Hesap oluşturma→"Kullanıcı adı ve şifre"+"OAuth" · Hesap silme URL→`https://gloxorg.com/hesap-sil.html` · Kısmi silme→Hayır · Ek rozetler→boş.
> - **Adım 3 (Veri türleri SEÇ):** Konum(Yaklaşık+Tam) · Kişisel(Ad,E-posta,Kullanıcı kimlikleri,Adres,Telefon,Diğer bilgiler=6/9) · Mesajlar(Uygulama içi=1/3) · Fotoğraf+Video(2/2) · Uygulama etkinliği(Kullanıcı içeriği=1/5) · Cihaz kimlikleri. DİĞER HEPSİ BOŞ (Finansal, Sağlık, Ses, Dosya, Takvim, Kişiler, Web, Uyg.bilgi/performans).
> - **Adım 4 (Veri kullanımı — HER tür):** Toplandı✅ · Paylaşıldı❌ · Kısa süreli→**Hayır** · Amaç→**Uygulama işlevselliği**. ZORUNLU olanlar: Ad/E-posta/Kullanıcı kimlikleri (+bunlarda **Hesap yönetimi** de) ve Cihaz kimlikleri (Hesap yönetimi YOK). İSTEĞE BAĞLI ("Kullanıcılar seçebilir"): Adres,Telefon,Diğer bilgiler,Konum(2),Mesajlar,Fotoğraf,Video,Kullanıcı içeriği.
> - **NOT:** Adım 4'te bir türde "Uygulama işlevselliği" işaretli ama Kaydet gri kaldıysa = UI takılması; sayfa yenileyince (F5) taslak seçimler KALIR ama Adım 4 usage sıfırlanabilir — dikkatli. Diğer amaç kutularını (Analiz/Reklam/Hesap yönetimi hariç gereken) ASLA ekleme.
> - **HÂLÂ EKSİK (Code yapacak, yayından önce):** kullanıcı **engelle+şikayet** düğmeleri (UGC), in-app **hesabımı sil** düğmesi (şimdilik e-posta ile), **temiz logo**, **mağaza açıklaması** (TR/EN çok dilli).
> **⚠️ ENGELLE + ŞİKAYET (UGC politikası — ÖNEMLİ):** Sosyal uygulama olduğu için Google kullanıcı "**engelle (block)**" + "**şikayet et (report)**" düğmesi İSTER; GLOXORG'da YOK (sadece sahip yönetim paneli var, o kullanıcı-block değil). **Yayından ÖNCE Code bunları KODA EKLEYECEK** → sonra içerik derecelendirmede Evet yapılır. SÖZ verildi.
> **HAZIRLANACAK (Code, mağaza girişi için):** kısa+uzun açıklama (TR/EN + çok dil), **TEMİZ LOGO/simge** (kullanıcı yeni mavi-elmas "G" logo verdi — tüm harfler içeride, siyah köşe yok, 512x512; eskisi ana ekranda kesiliyordu). Ekran görüntülerini kullanıcı verecek.
> **SONRA:** setup bitince **KAPALI TEST** açılır → **≥12 testçi 14 gün** → production başvuru. **Play App Signing** sonrası assetlinks.json'a **Google'ın 2. parmak izini** ekle (Play Console → Uygulama imzalama sertifikası SHA-256) yoksa TWA tam ekran açılmaz.
> **NOT:** İmza dosyaları (signing.keystore + signing-key-info) kullanıcıda; kaybederse güncelleme zorlaşır. Bu oturumda yerel repo birkaç kez b70fbc6'ya düştü (konteyner); origin SAĞLAM, her seferinde `git reset --hard origin` ile geri alındı, iş kaybı YOK.

## 🎨 YAPILACAK — ÜYELİK SEVİYESİNE GÖRE RENK (kullanıcı 19 Ağu B189'da hatırlattı, UNUTMA)
> Renk kullanıcının üyelik seviyesine göre değişmeli — **GLOXORG marka yazısı + üst şerit (theme-color) + Gloxoo konuşma
> sayfası zemini + Glome zemini** HEPSİ aynı seviye rengini kullanacak. Mantık `Anasayfa.js:2879` `uyeTasAd`:
> **altın üyelik → yeşil (Max)**, **pro → mavi (Pro)**, **diğer → kırmızı (ücretsiz)**.
> ŞU AN: theme-color sabit **mavi (#294a7d)** yapıldı (B189, kullanıcı parlak sarıyı reddetti). Sabit mavi = "Pro" rengi.
> YAPILACAK (ayrı, dikkatli, TEK task — Gloxoo/Glome'yi BOZMADAN): giriş yapan kullanıcının seviyesine göre `<meta name="theme-color">`'ı
> ÇALIŞMA ANINDA JS ile güncelle (kırmızı/mavi/yeşil) + Gloxoo ve Glome zemin rengini de aynı seviyeye bağla. Önce tier hex renklerini
> CSS'ten bul (c-kirmizi/kart-kirmizi vb.), her seviyeyi tek tek test et, sonra yayınla. Play Store işi bitince ya da kullanıcı isteyince yap.

## 🟡 GLOXOO MASRAF KONTROLÜ — İLERLİYOR (19 Ağu 2026, B183). Kullanıcı: "her sefer 20$ ekliyorum bir ay yetmiyor, akıllı yapı lazım".
> **YAPILDI:**
> 1. ✅ **Kredi eklendi** — kullanıcı $20 yatırdı, Gloxoo yazı+fotoğraf yine çalışıyor (DOĞRULANDI, fotoğraf değerlendirdi).
> 2. ✅ **UCUZ MODEL (Haiku)** — Cloudflare `gloxorg-ai` worker → `SOHBET_MODELLERI[0] = "claude-haiku-4-5-20251001"` (kullanıcı panelden
>    "Kodu düzenle"→18. satır→Dağıt ile yaptı, DOĞRULANDI). Sonnet'e göre ~10x, Opus'a göre ~30x ucuz. (Worker'daki 19/20. satır yedekleri
>    hâlâ opus-4-8/3-5-sonnet — ANLIK Haiku hatasında pahalıya düşebilir; SIRADA onları da Haiku yedeğine çekmek var.)
> 3. ✅ **KOD İSRAFI KESİLDİ (B183, Anasayfa.js yardimciGonder):** eskiden her mesajda TÜM geçmiş + TÜM eski fotoğraflar base64 yeniden
>    gidiyordu. Artık yapay zekâya SADECE son 16 mesaj (`AI_GECMIS=16`, `aiListe`) + yalnız EN SON fotoğraf (`aiSonFotoIdx`) resim olarak
>    gider; eski fotoğraflar yazı notuna döner. Ekranda konuşma tam durur, hafıza bozulmaz. (Kişi-başı günlük limit ZATEN vardı: ücretsiz 20/gün,
>    üye sınırsız — `Anasayfa.js:~5608`.)
> **SIRADA (kullanıcıyla, adım adım):**
> - **(a) Anthropic aylık harcama TAVANI** (console.anthropic.com → Settings/Limits) → sürpriz fatura olmasın. ⚠️ **AUTO-RELOAD (otomatik
>   yükleme) AÇMA** — kullanıcı elle sabit miktar eklesin. NOT: ön-ödemeli kredi zaten doğal tavan; auto-reload kapalıyken bitince durur.
> - **(b) Worker'da PROMPT ÖNBELLEK (cache_control)** — ~4000 tokenlik dev sistem metni her mesajda tam ücretleniyor; Anthropic prompt
>   caching ile tekrar-ücreti ~%90 düşer (en büyük kalan kazanç). Ama worker düzeni + sistem metnini statik-önek/dinamik-son diye ayırmak
>   gerekir; DİKKATLİ yap, tek seferde.
> - **(c) Worker yedek modelleri** (SOHBET_MODELLERI 19/20) da Haiku/ucuz yap.
> **NOT:** Arama (farklı ağ/metered TURN) ve iPhone Gloxoo KONUŞMASI (B181/B182) ÇALIŞIYOR — dokunma.

## ✅ ARAMA "POSTACISI" (TURN relay) ÇALIŞIYOR — metered.ca (18 Ağu 2026, B178 — KULLANICI DOĞRULADI "şimdi çalıştı"). ⛔ DOKUNMA.
> **DURUM:** Farklı ağda (biri WiFi biri mobil veri, iPhone dahil) arama ARTIK BAĞLANIYOR. Uzun TURN sağası bitti.
> **AÇIK KALAN (SIRADA — ses/gesture, iPhone):** (1) iPhone'da GELEN aramada ZİL SESİ çıkmıyor. (2) Gloxoo balon yazısı çıkıyor ama
> KONUŞMUYOR. İkisi de büyük ihtimalle iOS'un "kullanıcı ekrana dokunmadan ses/TTS çalmaz" (autoplay/gesture) kısıtı → çözüm: ilk
> dokunuşta global AudioContext + speechSynthesis'i "aç" (B155'te benzeri vardı, B167 revert'inde gitti). ÖNCE kullanıcıyla cihaz/Android
> karşılaştırması netleştir, çalışan aramayı/okumayı bozmadan yap.
> **DURUM:** Aynı WiFi'de arama zaten çalışıyordu; farklı ağda (iPhone mobil veri) medya akmıyordu (relay yoktu; eski openrelay ölü).
> Kullanıcıyla birlikte **metered.ca ÜCRETSİZ** hesabı açıldı (`gloxorg` app, 500MB/ay ücretsiz plan, KART YOK).
> **KURULUM DERSİ (ÖNEMLİ — tekrar gerekirse):** TURN kimlik endpoint'i `gloxorg.metered.live/...?apiKey=SECRET` DEĞİL (o "Invalid API
> Key" verir). DOĞRUSU: metered dashboard → TURN Server → "Kimlik Bilgisi Ekle" → oluşan satırda **"Share ICE Servers Array"** → hazır
> `iceServers` bloğu (KALICI username/password) → doğrudan koda. TURN sunucuları `global.relay.metered.ca` (80/443, turns:443=TLS).
> **KOD (`Anasayfa.js` `ICE_SUNUCULAR` ~3625):** Google STUN + `stun.relay.metered.ca` + `turn/turns:global.relay.metered.ca` (username
> `de30a9edca0d3007045ca1b9`). `turns:443` TLS → iPhone mobil veri/katı güvenlik duvarı geçer. Çalışma-anındaki fetch YOK (statik, CORS
> derdi yok). Güvenlik: TURN user/pass client'ta görünür (WebRTC'de NORMAL, gizli anahtar değil).
> **KOTA/BÜYÜME:** 500MB/ay ücretsiz. Dolunca → metered ücretli VEYA kendi `coturn` (~$5-10/ay VPS). Aramaların çoğu TURN kullanmaz.
> **NATIVE/Play Store:** TURN ihtiyacını KALDIRMAZ (WhatsApp bile kendi TURN'ünü çalıştırır); bu postacı native'de de aynen çalışır.

## ✅ ARAMA (GLOME sesli/görüntülü) — TIKANMA ÇÖZÜLDÜ, ÇALIŞIYOR (17 Ağu 2026, B171). ⛔ BOZMA.
> **KULLANICI KANITI (B171):** Üst üste bağlanan aramalar — Sesli 8 sn, Görüntülü 9 sn, Sesli 6 sn, Görüntülü 46 sn. İki taraftan da arayabildi.
- **KÖK SEBEP (bulundu):** `src/veri.js` `gelenAramalariDinle` sorgusu `fsLimit(20)` idi ve ZAMAN sıralaması yoktu. Günlerce biriken
  "aramalar" dokümanları 20'yi geçince, Firestore rastgele 20 kaydı getiriyor, YENİ "calliyor" çağrı o 20'nin DIŞINDA kalıyordu →
  aranan taraf çağrıyı HİÇ görmüyor (arayan yazabildiği için cevapsız push yine gidiyor → "arıyorum ama beni arayamıyorlar"). İlk
  arama azken çalışıyor, sonra tıkanıyordu. (Eski "3. arama gelmiyor" şikâyetinin de gerçek sebebi buydu — B168 istemci-sort ÇÖZMEDİ.)
- **ÇÖZÜM (B171) — DOKUNMA:** (1) `fsLimit(20)→fsLimit(300)` (iki kişilik uygulamada dolmaz, en yeni GARANTİ gelir). (2) OTOMATİK
  TEMİZLİK: her snapshot'ta `bitti`/`red` ve 90 sn'den eski takılı `calliyor` dokümanları `deleteDoc` ile silinir — **AKTİF çağrıya
  dokunulmaz** (taze `calliyor` ve `kabul`=konuşulan ASLA silinmez). (3) yeni `aramaSil(id)` + `Anasayfa.aramaKapat` arama bitince
  dokümanı anında siler. Firestore kuralı zaten izin veriyor (arananUid siler — `firestore.rules` satır ~174).
- **B172'DE YAPILDI (kullanıcı testi bekleniyor) — DOKUNMA:**
  1. **Kapatınca karşı taraf DONMASI:** `Anasayfa.js pcOlustur` içine WebRTC bağlantı-durumu yedek yolu eklendi — `onconnectionstatechange`/
     `oniceconnectionstatechange` "failed" → `aramaKapat(false)`; "disconnected" → 5 sn bekle, hâlâ kopuksa kapat (geçici titremede
     erken kapatma yok). `pcRef.current===pc` guard → eski aramanın timer'ı yeni aramayı kapatmaz. Sağlıklı aramada "failed" olmaz →
     çalışan akış bozulmaz. **B171 sinyal yolu (Firestore "bitti"/silme) AYNEN duruyor; bu sadece YEDEK.**
  2. **Zil sesi:** `Anasayfa.js zilBaslat` klasik telefon ziline çevrildi — 440+480 Hz çift ton, DynamicsCompressor + master gain 0.95
     (yüksek/dolgun); gelen çağrı "rrring-rrring", arayan tek uzun ringback. **Not:** tarayıcı autoplay kısıtı → gelen tarafta zil,
     kullanıcı sayfada dokunmuşsa (AudioContext resume) duyulur; hiç dokunulmadıysa sessiz olabilir (bilinen web sınırı).
- **NOT:** Kullanıcı **iPhone** ile karşılıklı arama testi yapacak. Giriş-içi arama ekranını Code buradan göremez → ekran görüntüsü iste.

## ✅ SAYFA TAM YÜKLENSİN — YENİ SÜRÜM ÖNCE İNDİRİLİR SONRA YENİLENİR (18 Ağu 2026, B173). ⛔ DOKUNMA.
> **KULLANICI TESPİTİ (çok değerli):** "Sayfa parça parça yükleniyor, bölümler eksik kalıyor, Profilim yarım dk sonra yüklüyor,
> güncelleme yarım geliyor → arama İLK denemede tutmuyor, ikincide (yenileyip bekleyince) çalışıyor." Yani arama kodu (B171/B172)
> sağlam; sorun sayfanın TAM güncellenmemesiydi.
- **KÖK SEBEP:** `build/static/js/main.<hash>.js` **~6.8MB** (çok büyük). Yeni sürüm bulununca `guvenliYenile` HEMEN
  `window.location.reload()` yapıyordu → tarayıcı 6.8MB'ı yeniden indirirken sayfa parça parça açılıyor, bölümler eksik kalıyordu.
- **ÇÖZÜM (B173, `Anasayfa.js` guvenliYenile) — DOKUNMA:** reload'dan ÖNCE sunucu `index.html`'inden yeni `main.<hash>.js` +
  `main.<hash>.css` yolları okunur, arka planda `fetch` ile TAM indirilir (SW `/static` önbelleği dolar); ancak indikten SONRA
  reload → yenileme ANINDA + TAM. İndirme başarısız/uzarsa en fazla 15 sn bekleyip yine reload (takılma yok). Tüm reload yolları
  (25 sn sürüm kontrolü, SW mesajı, SW updatefound) aynı `guvenliYenile`'den geçtiği için hepsi bu korumayı alır.
- **DAHA DERİN (sonra, isterse):** 6.8MB `main.js`'i code-splitting ile küçültmek İLK açılışı da hızlandırır ama BÜYÜK/riskli refactor —
  kullanıcı net isterse, tek tek, çalışanı bozmadan. Şimdilik B173 (önce-indir-sonra-yenile) güncellemeyi zaten TAM yapıyor.
- **⏸️ GÜNLÜK YAVAŞLIK — KULLANICI ŞİMDİLİK ERTELEDİ (18 Ağu 2026):** Kullanıcı asıl "sayfa teker teker/geç yükleniyor, Profilim'i
  açınca paylaştıklarım 5-10 sn sonra geliyor" diyor. SEBEP (teşhis edildi): (a) 6.8MB `main.js` (ilk açılış), (b) `gonderilerimOku`
  Profilim açılınca **60 gönderiyi birden** çekiyor (`Anasayfa.js:~4436`, `veri.js:664` `adet=60`) → 5-10 sn. Medya Storage'da URL
  (base64 değil), o iyi. **GÜVENLİ HIZLI ÇÖZÜM (kullanıcı onaylayınca):** Profilim ilk açılışta 60 yerine ~12 çek, gerisi kaydırınca.
  Kullanıcı "şimdilik dokunma" dedi → ERTELENDİ; sonra istediğinde yap. **NOT:** Arama (aynı WiFi'de) ÇALIŞIYOR (kullanıcı doğruladı).

## ✅ iPhone REKLAM ŞERİDİ ARTIK YÜRÜYOR (18 Ağu 2026, B174 — kullanıcı testi bekleniyor). ⛔ DOKUNMA.
- **KÖK SEBEP:** Şerit CSS animasyonu DEĞİL, JS ile `el.scrollLeft += 0.65` (Reklam.js `adim()` RAF döngüsü). iOS Safari scrollLeft'i
  HER OKUYUŞTA tam sayıya yuvarlıyor → 0.65'ler birikmiyor, şerit ilerlemiyordu (Android kesri koruyor → orada yürüyordu).
- **ÇÖZÜM (B174):** (1) `Reklam.js`: konum artık FLOAT `poz` değişkeninde tutulur; her kare `poz += 0.65` → `el.scrollLeft = poz`
  (poz büyüdüğü için iOS floor gösterse de yürür). Parmakla kaydırınca `poz = el.scrollLeft` senkron. Sonsuz döngü sarması korundu.
  (2) `Anasayfa.css .reklam-akis`: `-webkit-overflow-scrolling:touch` KALDIRILDI (iOS programlı kaydırmayı bozuyordu). Android etkilenmez.

## ✅ SESLİ OKUMA + İMLEÇ — ÇALIŞIYOR (12 Ağu 2026, B143). ⛔⛔ BU BÖLÜMÜ OKU, BURAYA DOKUNMA — bozarsan kullanıcı yıkılır (günlerce acı çekti, sonunda düzeldi).
> **KULLANICI SÖZÜ (ders):** "Eskiyi sildiğin zaman her şey düzeliyor." → **KURAL: TEK uygulama, eskiyi SİL (yorumla/yedekte bırakma), üstüne yama yapma. Yeni bir "iyileştirme" EKLEME — çalışıyor.**
- **NEREDE:** `src/Anasayfa.js` → `sesliOkuTarayici` (okuma) + `renkliCumleler` (ekranda cümle vurgusu/imleç) + `okunanCumle`/`teleCumle`/`maskotKaydirCumle`.
- **ÇALIŞAN YAPI (B140-B143) — DEĞİŞTİRME:**
  1. Okuma **cümle cümle**: her cümle ayrı `SpeechSynthesisUtterance`; `u.onend/onerror → oku(idx+1)`. Samsung ilk cümleden sonra "bittim" (onend) sinyali GÖNDERİYOR, o yüzden zincir sonuna kadar ilerler. **`cancel()` YOK (cümle yutulur), `speaking` tabanlı kontrol YOK (Samsung okurken bile speaking=false diyor → erken keser), tahmin zamanlayıcı YOK.** Sadece onend + onend hiç gelmezse cömert emniyet (`c.length*120+3500`).
  2. **İMLEÇ KAYMASIN (B143 kök çözüm):** cümleler `metin` (HAM) üstünden `renkliCumleler` ile **AYNI regex** (`/[^.!?…\n]+[.!?…]*/g`) bölünür (`hamCumleler`). `onCumle(idx)` = ekrandaki `data-ci=idx`. Her cümle okumadan önce `cumleTemizle()` ile temizlenir; temizlenince boş kalan (◆/emoji) cümle konuşulmaz ama **HAM indeks korunur** → imleç ekrandaki cümleyle birebir. **Okuma ve imleç AYNI kaynaktan sayar; iki ayrı bölme = imleç kayar (eski hata).**
- **SİLİNDİ, GERİ EKLEME:** Gemini/gerçek-ses okuma yolu (`gercekSesOku` çağrılmıyor, `gercekSesKapaliRef` hep true), tek-parça(onboundary) okuma, `temiz`-metin bölmesi, `cumleBas/cumleBul/runDili/scriptTip/_sesCache`, çok-utterance guard'ları, `cancel()`-arası, Duraklat/Devam, kelime imleci (`okunanKelime`) sohbette. **Bunları geri getirme = bozma.**
- **TAKAS (bilerek):** okuma TEK sesle (dil ayrımı yok — karışık dilde tek ses). Kullanıcı önceliği: SONUNA KADAR + imleç senkron. Erkek/kadın telefonun TTS'inde O dilde ses varsa değişir (kod değiştiremez).
- **AÇIK KALAN (kullanıcı sonra isterse, TEK TEK bak, dokunmadan):** canlı sohbette mikrofonun erken açılması / Gloxoo'nun kendi sesini dinlemesi (echo).

## 🚨 (ESKİ NOTLAR — çözüm süreci, B133) SESLİ OKUMA ACISI
- **KÖK SEBEP (nihayet bulundu, B133):** Kullanıcı Gloxoo Sesi menüsünden ses seçince `gercekSesKapaliRef=false` oluyordu → okuma
  ARTIK çalışan tarayıcı yolundan (`sesliOkuTarayici`) DEĞİL, eski **BOZUK "gerçek ses (Gemini)" yolundan** (`gercekSesOku`)
  gidiyordu; o yol İLK CÜMLEDEN (kırmızı cümle) sonra ağ/kota/parça-zinciri yüzünden KESİLİYORDU. Kullanıcının "ses örneği
  çalışıyor ama mesaj kesiliyor" gözlemi bunu doğruladı (örnek kısa=1 parça, mesaj uzun=zincir kesilir).
- **ÇÖZÜM (B133):** `sesliOku` ARTIK HER ZAMAN `sesliOkuTarayici` çağırır. Ses seçici `gercekSesKapaliRef`'i false YAPMAZ.
  `gercekSesOku` artık HİÇ çağrılmıyor (ölü kod, çalışamaz). **⛔ SAKIN Gemini/gerçek-ses yolunu geri açma — kesilmenin sebebi oydu.**
- **Duraklat/Devam KALDIRILDI (B132):** Okuma ikonu tek başına oku↔durdur (play/pause). Ayrı Duraklat YOK. Geri ekleme.
- **Erkek ses:** Telefonun TTS motorunda O DİLDE erkek ses yüklüyse gelir (kullanıcının Samsung TTS'inde Türkçe TEK ses=Kadın; Rusça 2 ses). Kod bunu değiştiremez — dürüstçe söyle.
- **KULLANICI GERİ BİLDİRİMİ (aynen, saygıyla):** "Sen 'bir şeyler yaptım' diyorsun ama inanmıyorum, daha çok yer bozdun diye düşünüyorum. Gloxoo çok fazla şişirilmiş/bozuk yazılım içeriyor; eskiyi silmezsen gene ona dönüyor." → **DERS: konuşma değil SONUÇ. Bozuk/yedek yolları YORUMLA bırakma, ÇAĞRILMAZ hale getir/SİL. Tek iş yap, doğrula, kullanıcı denesin.**

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
