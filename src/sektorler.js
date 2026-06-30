// GROXORG — Sektör/bölüm kategorileri (Ayarlar'da seçilir). Gerçek şirket adı DEĞİL, TÜR/kategori listeleri.
// Kullanıcı listede yoksa kendi yazar → onaylanıp eklenir. Her öğe { ik, ad }.

// FABRİKA / İMALAT türleri
export const FABRIKA_LISTESI = [
  { ik:"🧦", ad:"Çorap / Triko Fabrikası" }, { ik:"🪡", ad:"Halı Fabrikası" }, { ik:"🛏️", ad:"Ev Tekstili / Battaniye" }, { ik:"🍝", ad:"Makarna / Bulgur" }, { ik:"🍪", ad:"Bisküvi / Kraker" }, { ik:"🫒", ad:"Zeytinyağı / Yağ Fabrikası" }, { ik:"🥫", ad:"Salça / Konserve" }, { ik:"🍦", ad:"Dondurma Fabrikası" }, { ik:"⛏️", ad:"Maden / Cevher İşleme" }, { ik:"🔩", ad:"Vida / Bağlantı Elemanı" }, { ik:"🪈", ad:"Boru / Profil" }, { ik:"📦", ad:"Streç / Naylon Ambalaj" },
  { ik: "🧵", ad: "Tekstil Fabrikası" }, { ik: "👕", ad: "Konfeksiyon / Hazır Giyim" }, { ik: "🧶", ad: "İplik / Dokuma" },
  { ik: "🍞", ad: "Gıda Fabrikası" }, { ik: "🥤", ad: "İçecek Fabrikası" }, { ik: "🥛", ad: "Süt / Süt Ürünleri" },
  { ik: "🍫", ad: "Şekerleme / Çikolata" }, { ik: "🥩", ad: "Et / Et Ürünleri" }, { ik: "🌾", ad: "Un / Yem Fabrikası" },
  { ik: "🚗", ad: "Otomotiv / Araç" }, { ik: "🔩", ad: "Otomotiv Yan Sanayi" }, { ik: "⚙️", ad: "Makine İmalatı" },
  { ik: "🛞", ad: "Lastik Fabrikası" }, { ik: "🔋", ad: "Akü / Batarya" }, { ik: "🔌", ad: "Kablo Fabrikası" },
  { ik: "📺", ad: "Elektronik" }, { ik: "🧊", ad: "Beyaz Eşya" }, { ik: "💡", ad: "Aydınlatma" },
  { ik: "🪵", ad: "Mobilya Fabrikası" }, { ik: "🪑", ad: "Ahşap / Orman Ürünleri" }, { ik: "🧱", ad: "Tuğla / Kiremit" },
  { ik: "🏭", ad: "Çimento Fabrikası" }, { ik: "🪟", ad: "Cam Fabrikası" }, { ik: "🍶", ad: "Seramik / Porselen" },
  { ik: "🧪", ad: "Kimya Fabrikası" }, { ik: "🧴", ad: "Plastik / Ambalaj" }, { ik: "📦", ad: "Kağıt / Karton" },
  { ik: "💊", ad: "İlaç Fabrikası" }, { ik: "💄", ad: "Kozmetik" }, { ik: "🧼", ad: "Temizlik Ürünleri" },
  { ik: "🪙", ad: "Metal / Döküm" }, { ik: "⛓️", ad: "Demir Çelik" }, { ik: "🥫", ad: "Konserve" },
  { ik: "👞", ad: "Ayakkabı Fabrikası" }, { ik: "🧥", ad: "Deri / Deri Ürünleri" }, { ik: "🎨", ad: "Boya / Vernik" },
  { ik: "🌱", ad: "Gübre / Tarım Kimyası" }, { ik: "🚜", ad: "Tarım Makineleri" }, { ik: "🛡️", ad: "Savunma Sanayi" },
  { ik: "🚢", ad: "Gemi / Tersane" }, { ik: "✈️", ad: "Havacılık" }, { ik: "🪟", ad: "Doğrama / PVC" },
  { ik: "🔥", ad: "Soba / Isıtma Cihazları" }, { ik: "🧰", ad: "El Aleti / Hırdavat" }, { ik: "🪟", ad: "Alüminyum" },
];

// TEDARİK & HİZMET ZİNCİRİ (kim ne satar / ne hizmet eder)
export const TEDARIK_LISTESI = [
  { ik:"👕", ad:"Toptan Giyim / Tekstil" }, { ik:"💄", ad:"Toptan Kozmetik" }, { ik:"✏️", ad:"Toptan Kırtasiye" }, { ik:"🧸", ad:"Toptan Oyuncak" }, { ik:"🍽️", ad:"Toptan Züccaciye" }, { ik:"🩺", ad:"Medikal / Sağlık Malzeme Tedarik" }, { ik:"🍳", ad:"Otel / Restoran Ekipmanı" }, { ik:"🌱", ad:"Tohum / Fide Tedarik" }, { ik:"🌾", ad:"Hayvan Yemi Tedarik" }, { ik:"🛞", ad:"Akü / Lastik Toptan" }, { ik:"🪞", ad:"Cam / Ayna Tedarik" }, { ik:"🎨", ad:"Boya / Hırdavat Toptan" },
  { ik: "🚚", ad: "Lojistik / Nakliye" }, { ik: "📦", ad: "Depo / Antrepo" }, { ik: "🛻", ad: "Kargo / Kurye" },
  { ik: "🌍", ad: "İthalat / İhracat" }, { ik: "🏬", ad: "Toptan Gıda" }, { ik: "🥬", ad: "Sebze / Meyve Hali" },
  { ik: "🍖", ad: "Toptan Et / Tavuk" }, { ik: "🐟", ad: "Su Ürünleri Tedarik" }, { ik: "🧱", ad: "İnşaat Malzemesi" },
  { ik: "🪵", ad: "Kereste / Ahşap Tedarik" }, { ik: "🔩", ad: "Hırdavat / Nalbur" }, { ik: "⚡", ad: "Elektrik Malzemesi" },
  { ik: "🚰", ad: "Su / Sıhhi Tesisat Malzeme" }, { ik: "🛞", ad: "Yedek Parça" }, { ik: "🛢️", ad: "Akaryakıt / Yağ" },
  { ik: "⛽", ad: "Petrol / Gaz Tedarik" }, { ik: "🔋", ad: "Enerji Tedarik" }, { ik: "💧", ad: "Su Tedarik / Arıtma" },
  { ik: "📡", ad: "Telekom / İnternet" }, { ik: "🧹", ad: "Temizlik Hizmeti" }, { ik: "🛡️", ad: "Güvenlik Hizmeti" },
  { ik: "💻", ad: "Bilişim / IT Hizmeti" }, { ik: "📊", ad: "Danışmanlık" }, { ik: "📣", ad: "Reklam / Pazarlama" },
  { ik: "🧮", ad: "Muhasebe / Mali Müşavir" }, { ik: "⚖️", ad: "Hukuk / Avukatlık Hizmeti" }, { ik: "🍽️", ad: "Catering / Yemek" },
  { ik: "🛠️", ad: "Ekipman / Makine Kiralama" }, { ik: "🏗️", ad: "İş Makinesi Kiralama" }, { ik: "🧊", ad: "Soğuk Zincir" },
  { ik: "📦", ad: "Ambalaj Tedarik" }, { ik: "🧶", ad: "Tekstil Hammadde" }, { ik: "🧪", ad: "Kimyasal Tedarik" },
  { ik: "🌾", ad: "Tarım Ürünleri Tedarik" }, { ik: "🪙", ad: "Metal / Hurda Tedarik" }, { ik: "🖨️", ad: "Matbaa / Baskı" },
  { ik: "🚿", ad: "Bakım / Onarım Hizmeti" }, { ik: "❄️", ad: "Soğutma / İklimlendirme" }, { ik: "🏦", ad: "Finans / Sigorta Hizmeti" },
  { ik: "📋", ad: "İnsan Kaynakları / İstihdam" }, { ik: "🚐", ad: "Personel Taşıma" }, { ik: "🏷️", ad: "Etiket / Barkod" },
];

// İŞÇİ / İŞ GÜCÜ türleri
export const ISCI_LISTESI = [
  { ik:"🏗️", ad:"Vinç Operatörü" }, { ik:"🚜", ad:"Ekskavatör / İş Makinesi Operatörü" }, { ik:"🧱", ad:"Kalıpçı / Betoncu" }, { ik:"🪝", ad:"Demir Bağlama (İnşaat)" }, { ik:"🏠", ad:"Çatı Ustası" }, { ik:"🔲", ad:"Fayans / Seramik Ustası" }, { ik:"🚰", ad:"Sıhhi Tesisatçı" }, { ik:"❄️", ad:"Klima / Soğutma Teknisyeni" }, { ik:"🛗", ad:"Asansör Bakım" }, { ik:"🖥️", ad:"CNC Operatörü" }, { ik:"✅", ad:"Kalite Kontrol Elemanı" }, { ik:"📋", ad:"Depo Sorumlusu" },
  { ik: "🏗️", ad: "İnşaat İşçisi" }, { ik: "🧱", ad: "Duvarcı / Sıvacı" }, { ik: "🪚", ad: "Marangoz / Doğramacı" },
  { ik: "🔧", ad: "Tesisatçı Yardımcısı" }, { ik: "⚡", ad: "Elektrikçi Yardımcısı" }, { ik: "🔥", ad: "Kaynakçı" },
  { ik: "🎨", ad: "Boyacı / Badanacı" }, { ik: "🪟", ad: "Cam / PVC Montaj" }, { ik: "🧰", ad: "Tamirci / Usta" },
  { ik: "🏭", ad: "Fabrika İşçisi" }, { ik: "⚙️", ad: "Makine Operatörü" }, { ik: "📦", ad: "Paketleme / Ambalaj İşçisi" },
  { ik: "🚛", ad: "Yükleme / Boşaltma" }, { ik: "🏬", ad: "Depo İşçisi" }, { ik: "🚜", ad: "Tarım İşçisi" },
  { ik: "🌾", ad: "Mevsimlik İşçi" }, { ik: "🧹", ad: "Temizlik Görevlisi" }, { ik: "🌳", ad: "Bahçıvan / Peyzaj" },
  { ik: "🚚", ad: "Şoför (Ağır Vasıta)" }, { ik: "🚐", ad: "Şoför (Hafif Vasıta)" }, { ik: "📦", ad: "Kurye / Dağıtım" },
  { ik: "🍽️", ad: "Bulaşıkçı / Komi" }, { ik: "👨‍🍳", ad: "Aşçı Yardımcısı" }, { ik: "🛎️", ad: "Garson" },
  { ik: "🛒", ad: "Reyon / Market Görevlisi" }, { ik: "🧺", ad: "Çamaşırhane İşçisi" }, { ik: "🏨", ad: "Kat Görevlisi" },
  { ik: "🛡️", ad: "Güvenlik Görevlisi" }, { ik: "🚧", ad: "Yol / Asfalt İşçisi" }, { ik: "⛏️", ad: "Maden İşçisi" },
  { ik: "🐄", ad: "Çoban / Hayvan Bakıcısı" }, { ik: "🧵", ad: "Konfeksiyon İşçisi" }, { ik: "📐", ad: "Montaj İşçisi" },
  { ik: "🚿", ad: "Bakım Onarım İşçisi" }, { ik: "🪜", ad: "Düz İşçi / Vasıfsız" },
  { ik: "🍽️", ad: "Garson Yardımcısı" }, { ik: "🚙", ad: "Vale / Otopark" }, { ik: "🏢", ad: "Kapıcı / Apartman Görevlisi" },
  { ik: "📞", ad: "Çağrı Merkezi" }, { ik: "⌨️", ad: "Veri Girişi" }, { ik: "🎓", ad: "Stajyer" },
  { ik: "🩺", ad: "Hemşire / Sağlık Yardımcısı" }, { ik: "🧪", ad: "Laborant" }, { ik: "🛍️", ad: "Satış / Mağaza Elemanı" },
  { ik: "🔦", ad: "Bekçi / Gece Görevlisi" }, { ik: "📋", ad: "Ofis Elemanı" }, { ik: "🛎️", ad: "Resepsiyon / Sekreter" },
  { ik: "🧾", ad: "Muhasebe Elemanı" }, { ik: "📣", ad: "Pazarlama Elemanı" }, { ik: "🎙️", ad: "Animatör / Sunucu" },
  { ik: "🏠", ad: "Ev İşleri / Yardımcı" }, { ik: "🚜", ad: "Forklift Operatörü" }, { ik: "🧖", ad: "Spa / Hamam Çalışanı" },
  { ik: "👵", ad: "Yaşlı / Hasta Bakıcı" }, { ik: "👶", ad: "Çocuk Bakıcı / Dadı" }, { ik: "☕", ad: "Barista / Çay Ocağı" },
];

// DEVLET DAİRELERİ / KAMU KURUMLARI
export const DEVLET_LISTESI = [
  { ik:"🚓", ad:"Belediye Zabıta" }, { ik:"🏥", ad:"İl/İlçe Sağlık Müdürlüğü" }, { ik:"🏫", ad:"Milli Eğitim Müdürlüğü" }, { ik:"🤝", ad:"Sosyal Yardımlaşma Vakfı" }, { ik:"📚", ad:"Halk Eğitim Merkezi" }, { ik:"📖", ad:"Kütüphane" }, { ik:"🏟️", ad:"Spor İl Müdürlüğü" }, { ik:"💰", ad:"Defterdarlık / Mal Müdürlüğü" }, { ik:"🚨", ad:"AFAD / Afet Yönetimi" }, { ik:"⚖️", ad:"Bölge İdare Mahkemesi" },
  { ik: "🏛️", ad: "Belediye" }, { ik: "🏢", ad: "Valilik" }, { ik: "🏤", ad: "Kaymakamlık" },
  { ik: "📇", ad: "Nüfus Müdürlüğü" }, { ik: "📜", ad: "Tapu Müdürlüğü" }, { ik: "🗺️", ad: "Kadastro" },
  { ik: "💰", ad: "Vergi Dairesi" }, { ik: "🧾", ad: "SGK / Sosyal Güvenlik" }, { ik: "⚖️", ad: "Adliye / Mahkeme" },
  { ik: "👨‍⚖️", ad: "Savcılık" }, { ik: "📂", ad: "İcra Dairesi" }, { ik: "✍️", ad: "Noter" },
  { ik: "🚓", ad: "Emniyet / Polis" }, { ik: "🪖", ad: "Jandarma" }, { ik: "🚒", ad: "İtfaiye" },
  { ik: "🏥", ad: "Hastane / Sağlık" }, { ik: "🩺", ad: "Aile Sağlığı Merkezi" }, { ik: "🏫", ad: "Okul / MEB" },
  { ik: "🎓", ad: "Üniversite" }, { ik: "📮", ad: "PTT" }, { ik: "🛣️", ad: "Karayolları" },
  { ik: "🌳", ad: "Orman İşletme" }, { ik: "🌱", ad: "Tarım / İl Müdürlüğü" }, { ik: "♻️", ad: "Çevre / Şehircilik" },
  { ik: "🛂", ad: "Göç İdaresi" }, { ik: "🛃", ad: "Gümrük" }, { ik: "🏷️", ad: "Ticaret Odası" },
  { ik: "🏭", ad: "Sanayi Odası" }, { ik: "🚜", ad: "Ziraat Odası" }, { ik: "💧", ad: "Su / Kanalizasyon İdaresi (SU)" },
  { ik: "⚡", ad: "Elektrik İdaresi" }, { ik: "🔥", ad: "Doğalgaz İdaresi" }, { ik: "🚌", ad: "Toplu Taşıma İdaresi" },
  { ik: "🏦", ad: "Kamu Bankası" }, { ik: "📊", ad: "İŞKUR / İstihdam" }, { ik: "🏛️", ad: "Bakanlık / Genel Müdürlük" },
  { ik: "🗳️", ad: "Seçim / İlçe Seçim Kurulu" }, { ik: "📋", ad: "Muhtarlık" },
];

// TELEFON ÜLKE KODLARI (bayrak + ad + kod) — arama ile seçilir
export const ULKE_KOD = [
  { b: "🇹🇷", ad: "Türkiye", k: "+90" }, { b: "🇩🇪", ad: "Almanya", k: "+49" }, { b: "🇦🇹", ad: "Avusturya", k: "+43" },
  { b: "🇨🇭", ad: "İsviçre", k: "+41" }, { b: "🇳🇱", ad: "Hollanda", k: "+31" }, { b: "🇧🇪", ad: "Belçika", k: "+32" },
  { b: "🇫🇷", ad: "Fransa", k: "+33" }, { b: "🇬🇧", ad: "İngiltere", k: "+44" }, { b: "🇮🇹", ad: "İtalya", k: "+39" },
  { b: "🇪🇸", ad: "İspanya", k: "+34" }, { b: "🇵🇹", ad: "Portekiz", k: "+351" }, { b: "🇸🇪", ad: "İsveç", k: "+46" },
  { b: "🇳🇴", ad: "Norveç", k: "+47" }, { b: "🇩🇰", ad: "Danimarka", k: "+45" }, { b: "🇫🇮", ad: "Finlandiya", k: "+358" },
  { b: "🇵🇱", ad: "Polonya", k: "+48" }, { b: "🇨🇿", ad: "Çekya", k: "+420" }, { b: "🇬🇷", ad: "Yunanistan", k: "+30" },
  { b: "🇷🇺", ad: "Rusya", k: "+7" }, { b: "🇺🇦", ad: "Ukrayna", k: "+380" }, { b: "🇺🇸", ad: "ABD", k: "+1" },
  { b: "🇨🇦", ad: "Kanada", k: "+1" }, { b: "🇦🇿", ad: "Azerbaycan", k: "+994" }, { b: "🇸🇦", ad: "Suudi Arabistan", k: "+966" },
  { b: "🇦🇪", ad: "BAE", k: "+971" }, { b: "🇶🇦", ad: "Katar", k: "+974" }, { b: "🇰🇼", ad: "Kuveyt", k: "+965" },
  { b: "🇮🇶", ad: "Irak", k: "+964" }, { b: "🇮🇷", ad: "İran", k: "+98" }, { b: "🇪🇬", ad: "Mısır", k: "+20" },
  { b: "🇲🇦", ad: "Fas", k: "+212" }, { b: "🇩🇿", ad: "Cezayir", k: "+213" }, { b: "🇹🇳", ad: "Tunus", k: "+216" },
  { b: "🇱🇾", ad: "Libya", k: "+218" }, { b: "🇯🇴", ad: "Ürdün", k: "+962" }, { b: "🇱🇧", ad: "Lübnan", k: "+961" },
  { b: "🇸🇾", ad: "Suriye", k: "+963" }, { b: "🇮🇳", ad: "Hindistan", k: "+91" }, { b: "🇵🇰", ad: "Pakistan", k: "+92" },
  { b: "🇨🇳", ad: "Çin", k: "+86" }, { b: "🇯🇵", ad: "Japonya", k: "+81" }, { b: "🇰🇷", ad: "Güney Kore", k: "+82" },
  { b: "🇧🇷", ad: "Brezilya", k: "+55" }, { b: "🇦🇺", ad: "Avustralya", k: "+61" }, { b: "🇿🇦", ad: "Güney Afrika", k: "+27" },
  { b: "🇧🇬", ad: "Bulgaristan", k: "+359" }, { b: "🇷🇴", ad: "Romanya", k: "+40" }, { b: "🇭🇺", ad: "Macaristan", k: "+36" },
  { b: "🇷🇸", ad: "Sırbistan", k: "+381" }, { b: "🇲🇰", ad: "Kuzey Makedonya", k: "+389" }, { b: "🇽🇰", ad: "Kosova", k: "+383" },
  { b: "🇦🇱", ad: "Arnavutluk", k: "+355" }, { b: "🇧🇦", ad: "Bosna Hersek", k: "+387" }, { b: "🇬🇪", ad: "Gürcistan", k: "+995" },
];
