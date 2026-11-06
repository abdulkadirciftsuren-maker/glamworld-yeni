// GLOXORG — Çoklu dil sistemi (i18next, son sistem)
// 12 dil insan çevirisiyle; tarayıcı dili otomatik algılanır,
// bizde yoksa İngilizce'ye düşer (fallbackLng:'en').
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { DIL_SURUM } from "./dilSurum";
import { MESLEK_EK } from "./meslekCevirEk";
import { MESLEK_EK2 } from "./meslekCevirEk2";
import { MESLEK_EK3 } from "./meslekCevirEk3";
import { MESLEK_EK4 } from "./meslekCevirEk4";
import { MESLEK_EK5 } from "./meslekCevirEk5";

// Dil seçicide görünecek diller (yerel adları + gerçek bayrak ISO kodu)
export const DILLER = [
  { kod: "tr", ad: "Türkçe",      bayrak: "tr" },
  { kod: "en", ad: "English",     bayrak: "gb" },
  { kod: "de", ad: "Deutsch",     bayrak: "de" },
  { kod: "ar", ad: "العربية",      bayrak: "sa" },
  { kod: "ru", ad: "Русский",     bayrak: "ru" },
  { kod: "uk", ad: "Українська",  bayrak: "ua" },
  { kod: "es", ad: "Español",     bayrak: "es" },
  { kod: "fr", ad: "Français",    bayrak: "fr" },
  { kod: "it", ad: "Italiano",    bayrak: "it" },
  { kod: "zh", ad: "中文",         bayrak: "cn" },
  { kod: "hi", ad: "हिन्दी",        bayrak: "in" },
  { kod: "pt", ad: "Português",   bayrak: "pt" },
  { kod: "ja", ad: "日本語",       bayrak: "jp" },
];

// ⚡ B451 — SADECE KULLANICININ DİLİ İNER: eskiden 13 dilin TÜM çevirisi (~1,9 MB) ana dosyadaydı ve her telefon hepsini
//   indirip işliyordu (zayıf telefon/iPhone kasmasının en büyük payı). Artık çeviriler public/diller/<dil>.<özet>.json
//   dosyalarında (scripts/dilleriAyir.js üretir, kaynak: src/dilKaynaklari.js); açılışta sadece seçili dil (+ gerekirse
//   İngilizce yedek) iner, dil değişince yenisi anında gelir. İnemezse (internet yok) sayfa yine açılır, Türkçe yedek yazılar görünür.
const dilYukleyici = {
  type: "backend",
  init() {},
  read(lng, ns, cb) {
    const kod = String(lng || "").split("-")[0];
    const ozet = DIL_SURUM[kod];
    if (!ozet) { cb(null, {}); return; }
    fetch((process.env.PUBLIC_URL || "") + "/diller/" + kod + "." + ozet + ".json")
      .then((r) => { if (!r.ok) throw new Error("dil " + r.status); return r.json(); })
      .then((veri) => cb(null, veri))
      .catch((e) => cb(e, false));
  },
};

export const i18nHazir = i18n
  .use(dilYukleyici)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Türkçe kullanıcı İngilizce yedeği İNDİRMEZ (kod içindeki Türkçe yedek yazılar var); diğer diller eksik yazıda İngilizceye düşer
    fallbackLng: { tr: [], default: ["en"] },
    load: "languageOnly", // "de-DE" → sadece "de" dosyası
    react: { useSuspense: false, bindI18n: "languageChanged loaded" }, // dosya geç inerse yazılar inince yenilenir
    supportedLngs: DILLER.map((d) => d.kod),
    nonExplicitSupportedLngs: true, // "de-DE" gibi varyantlar "de"ye düşer
    interpolation: { escapeValue: false },
    detection: {
      // Önce kullanıcının ELLE seçtiği dil (gw_dil2), yoksa TELEFON/cihaz dili.
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "gw_dil2",
      // Otomatik algılamayı KAYDETME — yoksa ilk dil kilitlenir, telefon dili değişince izlemez.
      // Elle seçim DilSecici içinde ayrıca kaydedilir (kalıcı olur).
      caches: [],
    },
  });

// Arapça sağdan-sola: yön ayarı + SAYFA DİLİ (html lang)
// ÖNEMLİ: html lang'i o an gösterilen dile eşitliyoruz. Yoksa index.html'de sabit lang="tr" kalıyor
// ve TÜRKÇE OLMAYAN herkesin tarayıcısı "bu sayfa Türkçe, çevrilsin mi?" bandını gösteriyordu
// (sanki sayfa herkese Türkçe dayatıyormuş gibi). Artık her kullanıcının sayfası KENDİ dilinde işaretlenir → o bant çıkmaz.
function yonAyarla(lng) {
  const kod = (lng || "en").split("-")[0];
  document.documentElement.dir = kod === "ar" ? "rtl" : "ltr";
  try { document.documentElement.lang = kod; } catch (e) {}
}
yonAyarla(i18n.language);
i18n.on("languageChanged", yonAyarla);

// Ülke ISO kodundan o anki dildeki ülke adı (Intl.DisplayNames — ~250 ülke, 12 dil, otomatik).
// Tarayıcı yerleşik; manuel çeviri gerekmez. Bulamazsa Türkçe yedeğe düşer.
const _ulkeAdOnbellek = {};
export function ulkeAdiCevir(iso, lng, yedek) {
  const kod = (iso || "").toUpperCase();
  if (kod.length !== 2) return yedek || iso || "";
  const dil = (lng || i18n.language || "en").split("-")[0];
  const ck = dil + ":" + kod;
  if (_ulkeAdOnbellek[ck]) return _ulkeAdOnbellek[ck];
  try {
    const ad = new Intl.DisplayNames([dil], { type: "region" }).of(kod);
    if (ad && ad !== kod) { _ulkeAdOnbellek[ck] = ad; return ad; }
  } catch (e) { /* eski tarayıcı → yedek */ }
  return yedek || iso || "";
}

// Meslek / iş / üretici ADLARI çevirisi (Türkçe ad = anahtar, diğer diller = değer).
// Eksik dil veya ad → Türkçe ada düşer (mc). Parça parça doldurulur, hiçbir şey boş kalmaz.
export const meslekCevir = {
  // --- ÜRETİCİ / TEDARİKÇİ ---
  "Fabrika / İmalat": { en:"Factory / Manufacturing", de:"Fabrik / Fertigung", ar:"مصنع / تصنيع", ru:"Фабрика / Производство", uk:"Фабрика / Виробництво", es:"Fábrica / Manufactura", fr:"Usine / Fabrication", it:"Fabbrica / Produzione", zh:"工厂/制造", hi:"फ़ैक्ट्री / निर्माण", pt:"Fábrica / Manufatura" },
  "Toptancı": { en:"Wholesaler", de:"Großhändler", ar:"تاجر جملة", ru:"Оптовик", uk:"Оптовик", es:"Mayorista", fr:"Grossiste", it:"Grossista", zh:"批发商", hi:"थोक विक्रेता", pt:"Atacadista" },
  "Tedarikçi / Bayi": { en:"Supplier / Dealer", de:"Lieferant / Händler", ar:"مورّد / وكيل", ru:"Поставщик / Дилер", uk:"Постачальник / Дилер", es:"Proveedor / Distribuidor", fr:"Fournisseur / Revendeur", it:"Fornitore / Rivenditore", zh:"供应商/经销商", hi:"आपूर्तिकर्ता / डीलर", pt:"Fornecedor / Revendedor" },
  "İthalat / İhracat": { en:"Import / Export", de:"Import / Export", ar:"استيراد / تصدير", ru:"Импорт / Экспорт", uk:"Імпорт / Експорт", es:"Importación / Exportación", fr:"Import / Export", it:"Import / Export", zh:"进口/出口", hi:"आयात / निर्यात", pt:"Importação / Exportação" },
  "Üretici / Çiftçi": { en:"Producer / Farmer", de:"Erzeuger / Landwirt", ar:"مُنتِج / مزارع", ru:"Производитель / Фермер", uk:"Виробник / Фермер", es:"Productor / Agricultor", fr:"Producteur / Agriculteur", it:"Produttore / Agricoltore", zh:"生产者/农户", hi:"उत्पादक / किसान", pt:"Produtor / Agricultor" },
  "Hayvancılık / Çiftlik": { en:"Livestock / Farm", de:"Viehzucht / Bauernhof", ar:"ثروة حيوانية / مزرعة", ru:"Животноводство / Ферма", uk:"Тваринництво / Ферма", es:"Ganadería / Granja", fr:"Élevage / Ferme", it:"Allevamento / Fattoria", zh:"畜牧/农场", hi:"पशुपालन / फ़ार्म", pt:"Pecuária / Fazenda" },
  "Gıda Üretimi": { en:"Food Production", de:"Lebensmittelproduktion", ar:"إنتاج غذائي", ru:"Производство продуктов питания", uk:"Виробництво продуктів", es:"Producción de alimentos", fr:"Production alimentaire", it:"Produzione alimentare", zh:"食品生产", hi:"खाद्य उत्पादन", pt:"Produção de alimentos" },
  "Tekstil / Konfeksiyon": { en:"Textile / Apparel", de:"Textil / Bekleidung", ar:"نسيج / ملابس", ru:"Текстиль / Одежда", uk:"Текстиль / Одяг", es:"Textil / Confección", fr:"Textile / Confection", it:"Tessile / Abbigliamento", zh:"纺织/服装", hi:"वस्त्र / परिधान", pt:"Têxtil / Confecção" },
  "İnşaat Malzemesi": { en:"Construction Materials", de:"Baumaterialien", ar:"مواد بناء", ru:"Стройматериалы", uk:"Будматеріали", es:"Materiales de construcción", fr:"Matériaux de construction", it:"Materiali edili", zh:"建筑材料", hi:"निर्माण सामग्री", pt:"Materiais de construção" },
  "Mobilya / Ahşap": { en:"Furniture / Wood", de:"Möbel / Holz", ar:"أثاث / خشب", ru:"Мебель / Дерево", uk:"Меблі / Дерево", es:"Muebles / Madera", fr:"Meubles / Bois", it:"Mobili / Legno", zh:"家具/木材", hi:"फ़र्नीचर / लकड़ी", pt:"Móveis / Madeira" },
  "Metal / Makine": { en:"Metal / Machinery", de:"Metall / Maschinen", ar:"معادن / آلات", ru:"Металл / Техника", uk:"Метал / Техніка", es:"Metal / Maquinaria", fr:"Métal / Machines", it:"Metallo / Macchinari", zh:"金属/机械", hi:"धातु / मशीनरी", pt:"Metal / Máquinas" },
  "Plastik / Ambalaj": { en:"Plastic / Packaging", de:"Kunststoff / Verpackung", ar:"بلاستيك / تغليف", ru:"Пластик / Упаковка", uk:"Пластик / Упаковка", es:"Plástico / Embalaje", fr:"Plastique / Emballage", it:"Plastica / Imballaggio", zh:"塑料/包装", hi:"प्लास्टिक / पैकेजिंग", pt:"Plástico / Embalagem" },
  "Kimya / Kozmetik Üretimi": { en:"Chemicals / Cosmetics", de:"Chemie / Kosmetik", ar:"كيماويات / مستحضرات تجميل", ru:"Химия / Косметика", uk:"Хімія / Косметика", es:"Química / Cosmética", fr:"Chimie / Cosmétiques", it:"Chimica / Cosmetici", zh:"化工/化妆品", hi:"रसायन / कॉस्मेटिक", pt:"Química / Cosméticos" },
  "Lojistik / Dağıtım": { en:"Logistics / Distribution", de:"Logistik / Vertrieb", ar:"لوجستيات / توزيع", ru:"Логистика / Дистрибуция", uk:"Логістика / Дистрибуція", es:"Logística / Distribución", fr:"Logistique / Distribution", it:"Logistica / Distribuzione", zh:"物流/配送", hi:"लॉजिस्टिक्स / वितरण", pt:"Logística / Distribuição" },
  "El Sanatları / Atölye": { en:"Crafts / Workshop", de:"Handwerk / Werkstatt", ar:"حِرف يدوية / ورشة", ru:"Ремёсла / Мастерская", uk:"Ремесла / Майстерня", es:"Artesanía / Taller", fr:"Artisanat / Atelier", it:"Artigianato / Laboratorio", zh:"手工艺/作坊", hi:"हस्तशिल्प / कार्यशाला", pt:"Artesanato / Oficina" },
  "İçecek / Su Üretimi": { en:"Beverage / Water Production", de:"Getränke / Wasserproduktion", ar:"إنتاج مشروبات / مياه", ru:"Производство напитков / воды", uk:"Виробництво напоїв / води", es:"Producción de bebidas / agua", fr:"Production de boissons / eau", it:"Produzione bevande / acqua", zh:"饮料/水生产", hi:"पेय / जल उत्पादन", pt:"Produção de bebidas / água" },
  "Un / Fırın Ürünleri": { en:"Flour / Bakery Products", de:"Mehl / Backwaren", ar:"دقيق / منتجات مخبوزة", ru:"Мука / Хлебобулочные изделия", uk:"Борошно / Хлібобулочні вироби", es:"Harina / Productos de panadería", fr:"Farine / Produits de boulangerie", it:"Farina / Prodotti da forno", zh:"面粉/烘焙产品", hi:"आटा / बेकरी उत्पाद", pt:"Farinha / Produtos de panificação" },
  "Zeytin / Yağ Üretimi": { en:"Olive / Oil Production", de:"Oliven / Ölproduktion", ar:"إنتاج زيتون / زيت", ru:"Производство оливок / масла", uk:"Виробництво оливок / олії", es:"Producción de aceitunas / aceite", fr:"Production d'olives / huile", it:"Produzione olive / olio", zh:"橄榄/油生产", hi:"जैतून / तेल उत्पादन", pt:"Produção de azeitona / óleo" },
  "Hırdavat / Nalbur Toptan": { en:"Hardware Wholesale", de:"Eisenwaren-Großhandel", ar:"خردوات بالجملة", ru:"Скобяные товары оптом", uk:"Залізні товари оптом", es:"Ferretería al por mayor", fr:"Quincaillerie en gros", it:"Ferramenta all'ingrosso", zh:"五金批发", hi:"हार्डवेयर थोक", pt:"Ferragens no atacado" },
  "Elektrik / Elektronik Üretim": { en:"Electrical / Electronics Mfg.", de:"Elektro- / Elektronikfertigung", ar:"تصنيع كهربائي / إلكتروني", ru:"Производство электроники", uk:"Виробництво електроніки", es:"Fabricación electrónica", fr:"Fabrication électronique", it:"Produzione elettronica", zh:"电气/电子制造", hi:"विद्युत / इलेक्ट्रॉनिक निर्माण", pt:"Fabricação eletrônica" },
  "İlaç / Medikal Üretim": { en:"Pharma / Medical Production", de:"Pharma / Medizinproduktion", ar:"إنتاج أدوية / طبي", ru:"Фарма / Медицинское производство", uk:"Фарма / Медичне виробництво", es:"Producción farmacéutica / médica", fr:"Production pharmaceutique / médicale", it:"Produzione farmaceutica / medicale", zh:"医药/医疗生产", hi:"फार्मा / चिकित्सा उत्पादन", pt:"Produção farmacêutica / médica", ja:"医薬・医療生産" },
  "Et İşleme Fabrikası": { en:"Meat Processing Plant", de:"Fleischverarbeitung", ar:"مصنع تجهيز اللحوم", ru:"Мясокомбинат", uk:"М'ясокомбінат", es:"Planta de procesamiento de carne", fr:"Usine de transformation de viande", it:"Stabilimento di lavorazione carni", zh:"肉类加工厂", hi:"मांस प्रसंस्करण कारख़ाना", pt:"Frigorífico / Processamento de carne", ja:"食肉加工工場" },
  "Süt / Mandıra Ürünleri": { en:"Dairy Products", de:"Molkereiprodukte", ar:"منتجات الألبان", ru:"Молочная продукция", uk:"Молочна продукція", es:"Productos lácteos", fr:"Produits laitiers", it:"Prodotti lattiero-caseari", zh:"乳制品", hi:"डेयरी उत्पाद", pt:"Laticínios", ja:"乳製品" },
  "Konserve / Salça": { en:"Canned Food / Tomato Paste", de:"Konserven / Tomatenmark", ar:"معلبات / معجون طماطم", ru:"Консервы / Томатная паста", uk:"Консерви / Томатна паста", es:"Conservas / Concentrado de tomate", fr:"Conserves / Concentré de tomate", it:"Conserve / Concentrato di pomodoro", zh:"罐头/番茄酱", hi:"डिब्बाबंद भोजन / टमाटर पेस्ट", pt:"Conservas / Extrato de tomate", ja:"缶詰・トマトペースト" },
  "Dondurma / Şekerleme": { en:"Ice Cream / Confectionery", de:"Eis / Süßwaren", ar:"آيس كريم / حلويات", ru:"Мороженое / Кондитерские изделия", uk:"Морозиво / Кондитерські вироби", es:"Helados / Confitería", fr:"Glaces / Confiserie", it:"Gelati / Dolciumi", zh:"冰淇淋/糖果", hi:"आइसक्रीम / कन्फेक्शनरी", pt:"Sorvete / Confeitaria", ja:"アイスクリーム・菓子" },
  "Deri / Ayakkabı Üretimi": { en:"Leather / Footwear Mfg.", de:"Leder / Schuhherstellung", ar:"جلود / صناعة الأحذية", ru:"Кожа / Производство обуви", uk:"Шкіра / Виробництво взуття", es:"Cuero / Fabricación de calzado", fr:"Cuir / Fabrication de chaussures", it:"Pelletteria / Calzature", zh:"皮革/制鞋", hi:"चमड़ा / जूता निर्माण", pt:"Couro / Calçados", ja:"皮革・靴製造" },
  "Cam / Seramik": { en:"Glass / Ceramics", de:"Glas / Keramik", ar:"زجاج / سيراميك", ru:"Стекло / Керамика", uk:"Скло / Кераміка", es:"Vidrio / Cerámica", fr:"Verre / Céramique", it:"Vetro / Ceramica", zh:"玻璃/陶瓷", hi:"कांच / सिरेमिक", pt:"Vidro / Cerâmica", ja:"ガラス・陶磁器" },
  "Kağıt / Karton": { en:"Paper / Cardboard", de:"Papier / Karton", ar:"ورق / كرتون", ru:"Бумага / Картон", uk:"Папір / Картон", es:"Papel / Cartón", fr:"Papier / Carton", it:"Carta / Cartone", zh:"纸张/纸板", hi:"कागज़ / गत्ता", pt:"Papel / Papelão", ja:"紙・段ボール" },
  "Maden / Mermer / Doğal Taş": { en:"Mining / Marble / Stone", de:"Bergbau / Marmor / Naturstein", ar:"تعدين / رخام / حجر طبيعي", ru:"Добыча / Мрамор / Камень", uk:"Видобуток / Мармур / Камінь", es:"Minería / Mármol / Piedra", fr:"Mines / Marbre / Pierre", it:"Estrazione / Marmo / Pietra", zh:"矿业/大理石/石材", hi:"खनन / संगमरमर / पत्थर", pt:"Mineração / Mármore / Pedra", ja:"鉱業・大理石・石材" },
  "Gübre / Tarım İlacı": { en:"Fertilizer / Agrochemicals", de:"Dünger / Agrochemie", ar:"أسمدة / مبيدات زراعية", ru:"Удобрения / Агрохимия", uk:"Добрива / Агрохімія", es:"Fertilizantes / Agroquímicos", fr:"Engrais / Produits agrochimiques", it:"Fertilizzanti / Agrofarmaci", zh:"化肥/农药", hi:"उर्वरक / कृषि रसायन", pt:"Fertilizantes / Agroquímicos", ja:"肥料・農薬" },
  "Yem / Hayvan Besini": { en:"Animal Feed", de:"Tierfutter", ar:"أعلاف حيوانية", ru:"Корма для животных", uk:"Корми для тварин", es:"Pienso / Alimento animal", fr:"Aliments pour animaux", it:"Mangimi", zh:"动物饲料", hi:"पशु आहार", pt:"Ração animal", ja:"飼料" },
  "Geri Dönüşüm": { en:"Recycling", de:"Recycling", ar:"إعادة تدوير", ru:"Переработка / Утилизация", uk:"Переробка / Утилізація", es:"Reciclaje", fr:"Recyclage", it:"Riciclaggio", zh:"回收利用", hi:"पुनर्चक्रण", pt:"Reciclagem", ja:"リサイクル" },
  "Enerji / Yenilenebilir": { en:"Energy / Renewables", de:"Energie / Erneuerbare", ar:"طاقة / متجددة", ru:"Энергетика / ВИЭ", uk:"Енергетика / ВДЕ", es:"Energía / Renovables", fr:"Énergie / Renouvelables", it:"Energia / Rinnovabili", zh:"能源/可再生能源", hi:"ऊर्जा / नवीकरणीय", pt:"Energia / Renováveis", ja:"エネルギー・再生可能" },
  // --- HİZMET VEREN (1/3) ---
  "Makyaj Sanatçısı": { en:"Makeup Artist", de:"Make-up-Artist", ar:"فنان مكياج", ru:"Визажист", uk:"Візажист", es:"Maquillador", fr:"Maquilleur", it:"Truccatore", zh:"化妆师", hi:"मेकअप आर्टिस्ट", pt:"Maquiador" },
  "Kuaför": { en:"Hairdresser", de:"Friseur", ar:"مصفف شعر", ru:"Парикмахер", uk:"Перукар", es:"Peluquero", fr:"Coiffeur", it:"Parrucchiere", zh:"美发师", hi:"हेयरड्रेसर", pt:"Cabeleireiro" },
  "Berber": { en:"Barber", de:"Barbier", ar:"حلاق", ru:"Барбер", uk:"Барбер", es:"Barbero", fr:"Barbier", it:"Barbiere", zh:"理发师", hi:"नाई", pt:"Barbeiro" },
  "Cilt Bakımı": { en:"Skincare", de:"Hautpflege", ar:"العناية بالبشرة", ru:"Уход за кожей", uk:"Догляд за шкірою", es:"Cuidado de la piel", fr:"Soins de la peau", it:"Cura della pelle", zh:"皮肤护理", hi:"त्वचा देखभाल", pt:"Cuidados com a pele" },
  "Tırnak Sanatçısı": { en:"Nail Artist", de:"Nageldesigner", ar:"فنان أظافر", ru:"Мастер маникюра", uk:"Майстер манікюру", es:"Manicurista", fr:"Prothésiste ongulaire", it:"Onicotecnico", zh:"美甲师", hi:"नेल आर्टिस्ट", pt:"Manicure" },
  "Kaş / Kirpik": { en:"Brows / Lashes", de:"Augenbrauen / Wimpern", ar:"حواجب / رموش", ru:"Брови / Ресницы", uk:"Брови / Вії", es:"Cejas / Pestañas", fr:"Sourcils / Cils", it:"Sopracciglia / Ciglia", zh:"美眉/睫毛", hi:"भौंह / पलकें", pt:"Sobrancelhas / Cílios" },
  "Masaj Terapisti": { en:"Massage Therapist", de:"Masseur", ar:"معالج بالتدليك", ru:"Массажист", uk:"Масажист", es:"Masajista", fr:"Masseur", it:"Massaggiatore", zh:"按摩师", hi:"मसाज थेरेपिस्ट", pt:"Massagista" },
  "Dövme Sanatçısı": { en:"Tattoo Artist", de:"Tätowierer", ar:"فنان وشم", ru:"Тату-мастер", uk:"Тату-майстер", es:"Tatuador", fr:"Tatoueur", it:"Tatuatore", zh:"纹身师", hi:"टैटू आर्टिस्ट", pt:"Tatuador" },
  "Fotoğrafçı": { en:"Photographer", de:"Fotograf", ar:"مصور", ru:"Фотограф", uk:"Фотограф", es:"Fotógrafo", fr:"Photographe", it:"Fotografo", zh:"摄影师", hi:"फ़ोटोग्राफ़र", pt:"Fotógrafo" },
  "Kameraman": { en:"Videographer", de:"Kameramann", ar:"مصور فيديو", ru:"Видеооператор", uk:"Відеооператор", es:"Camarógrafo", fr:"Cadreur", it:"Videomaker", zh:"摄像师", hi:"कैमरामैन", pt:"Cinegrafista" },
  "Müzisyen": { en:"Musician", de:"Musiker", ar:"موسيقي", ru:"Музыкант", uk:"Музикант", es:"Músico", fr:"Musicien", it:"Musicista", zh:"音乐家", hi:"संगीतकार", pt:"Músico" },
  "DJ": { en:"DJ", de:"DJ", ar:"دي جيه", ru:"Диджей", uk:"Діджей", es:"DJ", fr:"DJ", it:"DJ", zh:"DJ", hi:"डीजे", pt:"DJ" },
  "Dansçı": { en:"Dancer", de:"Tänzer", ar:"راقص", ru:"Танцор", uk:"Танцюрист", es:"Bailarín", fr:"Danseur", it:"Ballerino", zh:"舞者", hi:"नर्तक", pt:"Dançarino" },
  "Tasarımcı": { en:"Designer", de:"Designer", ar:"مصمم", ru:"Дизайнер", uk:"Дизайнер", es:"Diseñador", fr:"Designer", it:"Designer", zh:"设计师", hi:"डिज़ाइनर", pt:"Designer" },
  "İç Mimar": { en:"Interior Designer", de:"Innenarchitekt", ar:"مصمم داخلي", ru:"Дизайнер интерьера", uk:"Дизайнер інтер'єру", es:"Diseñador de interiores", fr:"Architecte d'intérieur", it:"Architetto d'interni", zh:"室内设计师", hi:"इंटीरियर डिज़ाइनर", pt:"Designer de interiores" },
  "Terzi / Moda": { en:"Tailor / Fashion", de:"Schneider / Mode", ar:"خياط / أزياء", ru:"Портной / Мода", uk:"Кравець / Мода", es:"Sastre / Moda", fr:"Tailleur / Mode", it:"Sarto / Moda", zh:"裁缝/时装", hi:"दर्ज़ी / फ़ैशन", pt:"Alfaiate / Moda" },
  "Doktor": { en:"Doctor", de:"Arzt", ar:"طبيب", ru:"Врач", uk:"Лікар", es:"Médico", fr:"Médecin", it:"Medico", zh:"医生", hi:"डॉक्टर", pt:"Médico" },
  "Diş Hekimi": { en:"Dentist", de:"Zahnarzt", ar:"طبيب أسنان", ru:"Стоматолог", uk:"Стоматолог", es:"Dentista", fr:"Dentiste", it:"Dentista", zh:"牙医", hi:"दंत चिकित्सक", pt:"Dentista" },
  "Psikolog": { en:"Psychologist", de:"Psychologe", ar:"طبيب نفسي", ru:"Психолог", uk:"Психолог", es:"Psicólogo", fr:"Psychologue", it:"Psicologo", zh:"心理医生", hi:"मनोवैज्ञानिक", pt:"Psicólogo" },
  "Diyetisyen": { en:"Dietitian", de:"Ernährungsberater", ar:"أخصائي تغذية", ru:"Диетолог", uk:"Дієтолог", es:"Dietista", fr:"Diététicien", it:"Dietista", zh:"营养师", hi:"आहार विशेषज्ञ", pt:"Nutricionista" },
  "Fizyoterapist": { en:"Physiotherapist", de:"Physiotherapeut", ar:"أخصائي علاج طبيعي", ru:"Физиотерапевт", uk:"Фізіотерапевт", es:"Fisioterapeuta", fr:"Kinésithérapeute", it:"Fisioterapista", zh:"理疗师", hi:"फ़िज़ियोथेरेपिस्ट", pt:"Fisioterapeuta" },
  "Avukat": { en:"Lawyer", de:"Anwalt", ar:"محامٍ", ru:"Адвокат", uk:"Адвокат", es:"Abogado", fr:"Avocat", it:"Avvocato", zh:"律师", hi:"वकील", pt:"Advogado" },
  "Mali Müşavir": { en:"Accountant", de:"Steuerberater", ar:"محاسب قانوني", ru:"Бухгалтер", uk:"Бухгалтер", es:"Asesor fiscal", fr:"Expert-comptable", it:"Commercialista", zh:"会计顾问", hi:"लेखाकार", pt:"Contador" },
  "Mühendis": { en:"Engineer", de:"Ingenieur", ar:"مهندس", ru:"Инженер", uk:"Інженер", es:"Ingeniero", fr:"Ingénieur", it:"Ingegnere", zh:"工程师", hi:"इंजीनियर", pt:"Engenheiro" },
  "Mimar": { en:"Architect", de:"Architekt", ar:"مهندس معماري", ru:"Архитектор", uk:"Архітектор", es:"Arquitecto", fr:"Architecte", it:"Architetto", zh:"建筑师", hi:"वास्तुकार", pt:"Arquiteto" },
  "Öğretmen": { en:"Teacher", de:"Lehrer", ar:"معلم", ru:"Учитель", uk:"Вчитель", es:"Profesor", fr:"Enseignant", it:"Insegnante", zh:"教师", hi:"शिक्षक", pt:"Professor" },
  "Tercüman": { en:"Translator", de:"Übersetzer", ar:"مترجم", ru:"Переводчик", uk:"Перекладач", es:"Traductor", fr:"Traducteur", it:"Traduttore", zh:"翻译", hi:"अनुवादक", pt:"Tradutor" },
  "Yazılımcı": { en:"Software Developer", de:"Softwareentwickler", ar:"مطور برمجيات", ru:"Программист", uk:"Програміст", es:"Desarrollador de software", fr:"Développeur", it:"Sviluppatore", zh:"软件开发者", hi:"सॉफ़्टवेयर डेवलपर", pt:"Desenvolvedor" },
  "Restoran / Cafe": { en:"Restaurant / Cafe", de:"Restaurant / Café", ar:"مطعم / مقهى", ru:"Ресторан / Кафе", uk:"Ресторан / Кафе", es:"Restaurante / Café", fr:"Restaurant / Café", it:"Ristorante / Caffè", zh:"餐厅/咖啡馆", hi:"रेस्तरां / कैफ़े", pt:"Restaurante / Café" },
  "Pastane": { en:"Pastry Shop", de:"Konditorei", ar:"محل حلويات", ru:"Кондитерская", uk:"Кондитерська", es:"Pastelería", fr:"Pâtisserie", it:"Pasticceria", zh:"糕点店", hi:"पेस्ट्री शॉप", pt:"Confeitaria" },
  "Çiçekçi": { en:"Florist", de:"Florist", ar:"بائع زهور", ru:"Флорист", uk:"Флорист", es:"Floristería", fr:"Fleuriste", it:"Fioraio", zh:"花店", hi:"फूलवाला", pt:"Florista" },
  "Organizasyon": { en:"Event Planning", de:"Eventplanung", ar:"تنظيم فعاليات", ru:"Организация мероприятий", uk:"Організація заходів", es:"Organización de eventos", fr:"Organisation d'événements", it:"Organizzazione eventi", zh:"活动策划", hi:"इवेंट प्लानिंग", pt:"Organização de eventos" },
  "Emlakçı": { en:"Real Estate Agent", de:"Immobilienmakler", ar:"وكيل عقارات", ru:"Риелтор", uk:"Ріелтор", es:"Agente inmobiliario", fr:"Agent immobilier", it:"Agente immobiliare", zh:"房产中介", hi:"रियल एस्टेट एजेंट", pt:"Corretor de imóveis" },
  "Oto Tamir": { en:"Auto Repair", de:"Autowerkstatt", ar:"تصليح سيارات", ru:"Автосервис", uk:"Автосервіс", es:"Taller mecánico", fr:"Réparation auto", it:"Officina auto", zh:"汽车维修", hi:"ऑटो रिपेयर", pt:"Oficina mecânica" },
  "Elektrikçi": { en:"Electrician", de:"Elektriker", ar:"كهربائي", ru:"Электрик", uk:"Електрик", es:"Electricista", fr:"Électricien", it:"Elettricista", zh:"电工", hi:"इलेक्ट्रीशियन", pt:"Eletricista" },
  "Tesisatçı": { en:"Plumber", de:"Klempner", ar:"سبّاك", ru:"Сантехник", uk:"Сантехнік", es:"Fontanero", fr:"Plombier", it:"Idraulico", zh:"水管工", hi:"प्लंबर", pt:"Encanador" },
  "Temizlik": { en:"Cleaning", de:"Reinigung", ar:"تنظيف", ru:"Уборка", uk:"Прибирання", es:"Limpieza", fr:"Nettoyage", it:"Pulizie", zh:"清洁", hi:"सफ़ाई", pt:"Limpeza" },
  "Nakliyat": { en:"Moving / Transport", de:"Umzug / Transport", ar:"نقل", ru:"Грузоперевозки", uk:"Вантажоперевезення", es:"Mudanzas / Transporte", fr:"Déménagement / Transport", it:"Traslochi / Trasporti", zh:"搬运/运输", hi:"मूविंग / परिवहन", pt:"Mudanças / Transporte" },
  "Özel Ders": { en:"Private Tutoring", de:"Nachhilfe", ar:"دروس خصوصية", ru:"Репетиторство", uk:"Репетиторство", es:"Clases particulares", fr:"Cours particuliers", it:"Lezioni private", zh:"私人辅导", hi:"निजी ट्यूशन", pt:"Aulas particulares" },
  "Spor Eğitmeni": { en:"Fitness Trainer", de:"Fitnesstrainer", ar:"مدرب رياضي", ru:"Фитнес-тренер", uk:"Фітнес-тренер", es:"Entrenador", fr:"Coach sportif", it:"Personal trainer", zh:"健身教练", hi:"फ़िटनेस ट्रेनर", pt:"Personal trainer" },
  "Yoga / Pilates": { en:"Yoga / Pilates", de:"Yoga / Pilates", ar:"يوغا / بيلاتس", ru:"Йога / Пилатес", uk:"Йога / Пілатес", es:"Yoga / Pilates", fr:"Yoga / Pilates", it:"Yoga / Pilates", zh:"瑜伽/普拉提", hi:"योग / पिलाटे", pt:"Yoga / Pilates" },
  "Bakıcı / Dadı": { en:"Nanny / Caregiver", de:"Kindermädchen / Betreuer", ar:"مربية / مقدم رعاية", ru:"Няня / Сиделка", uk:"Няня / Доглядальниця", es:"Niñera / Cuidador", fr:"Nounou / Aide", it:"Babysitter / Badante", zh:"保姆/看护", hi:"आया / देखभालकर्ता", pt:"Babá / Cuidador" },
  "Veteriner": { en:"Veterinarian", de:"Tierarzt", ar:"طبيب بيطري", ru:"Ветеринар", uk:"Ветеринар", es:"Veterinario", fr:"Vétérinaire", it:"Veterinario", zh:"兽医", hi:"पशु चिकित्सक", pt:"Veterinário" },
  "Kurye": { en:"Courier", de:"Kurier", ar:"مندوب توصيل", ru:"Курьер", uk:"Кур'єр", es:"Mensajero", fr:"Coursier", it:"Corriere", zh:"快递员", hi:"कूरियर", pt:"Entregador" },
  "Galerici": { en:"Gallery", de:"Galerie", ar:"معرض فني", ru:"Галерея", uk:"Галерея", es:"Galería", fr:"Galerie", it:"Galleria", zh:"画廊", hi:"गैलरी", pt:"Galeria" },
  "Marketçi / Bakkal": { en:"Grocery / Market", de:"Lebensmittelladen", ar:"بقالة / سوبر ماركت", ru:"Магазин / Бакалея", uk:"Магазин / Бакалія", es:"Tienda / Mercado", fr:"Épicerie", it:"Alimentari", zh:"杂货店", hi:"किराना / बाज़ार", pt:"Mercearia" },
  "Oto Galerici": { en:"Car Dealer", de:"Autohändler", ar:"معرض سيارات", ru:"Автосалон", uk:"Автосалон", es:"Concesionario", fr:"Concessionnaire auto", it:"Concessionaria", zh:"汽车经销", hi:"कार डीलर", pt:"Concessionária" },
  "Kasap Dükkanı": { en:"Butcher Shop", de:"Metzgerei", ar:"محل جزارة", ru:"Мясная лавка", uk:"М'ясна крамниця", es:"Carnicería", fr:"Boucherie", it:"Macelleria", zh:"肉店", hi:"कसाई की दुकान", pt:"Açougue" },
  "Fırın / Ekmek": { en:"Bakery / Bread", de:"Bäckerei", ar:"مخبز", ru:"Пекарня", uk:"Пекарня", es:"Panadería", fr:"Boulangerie", it:"Panificio", zh:"面包房", hi:"बेकरी", pt:"Padaria" },
  "Eczacı": { en:"Pharmacist", de:"Apotheker", ar:"صيدلي", ru:"Фармацевт", uk:"Фармацевт", es:"Farmacéutico", fr:"Pharmacien", it:"Farmacista", zh:"药剂师", hi:"फ़ार्मासिस्ट", pt:"Farmacêutico" },
  "Optisyen": { en:"Optician", de:"Optiker", ar:"أخصائي بصريات", ru:"Оптик", uk:"Оптик", es:"Óptico", fr:"Opticien", it:"Ottico", zh:"眼镜师", hi:"ऑप्टिशियन", pt:"Ótico" },
  "Kuyumcu": { en:"Jeweler", de:"Juwelier", ar:"صائغ", ru:"Ювелир", uk:"Ювелір", es:"Joyero", fr:"Bijoutier", it:"Gioielliere", zh:"珠宝商", hi:"जौहरी", pt:"Joalheiro" },
  "Kırtasiyeci": { en:"Stationery", de:"Schreibwaren", ar:"قرطاسية", ru:"Канцтовары", uk:"Канцтовари", es:"Papelería", fr:"Papeterie", it:"Cartoleria", zh:"文具店", hi:"स्टेशनरी", pt:"Papelaria" },
  "Teknik Servis": { en:"Tech Repair", de:"Technischer Service", ar:"خدمة تقنية", ru:"Техсервис", uk:"Техсервіс", es:"Servicio técnico", fr:"Service technique", it:"Assistenza tecnica", zh:"技术维修", hi:"तकनीकी सेवा", pt:"Assistência técnica" },
  "Otelci / Pansiyon": { en:"Hotel / Guesthouse", de:"Hotel / Pension", ar:"فندق / نزل", ru:"Отель / Гостиница", uk:"Готель / Пансіон", es:"Hotel / Pensión", fr:"Hôtel / Pension", it:"Hotel / Pensione", zh:"酒店/旅馆", hi:"होटल / गेस्टहाउस", pt:"Hotel / Pousada" },
  "Kafeci / Barista": { en:"Café / Barista", de:"Café / Barista", ar:"مقهى / باريستا", ru:"Кафе / Бариста", uk:"Кафе / Бариста", es:"Café / Barista", fr:"Café / Barista", it:"Caffè / Barista", zh:"咖啡馆/咖啡师", hi:"कैफ़े / बरिस्ता", pt:"Café / Barista" },
  "Barmen": { en:"Bartender", de:"Barkeeper", ar:"بارمان", ru:"Бармен", uk:"Бармен", es:"Barman", fr:"Barman", it:"Barista", zh:"调酒师", hi:"बारटेंडर", pt:"Barman" },
  "Matbaacı": { en:"Printer", de:"Druckerei", ar:"مطبعة", ru:"Типография", uk:"Друкарня", es:"Imprenta", fr:"Imprimerie", it:"Tipografia", zh:"印刷", hi:"प्रिंटर", pt:"Gráfica" },
  "Saat Tamircisi": { en:"Watch Repair", de:"Uhrmacher", ar:"تصليح ساعات", ru:"Часовщик", uk:"Годинникар", es:"Relojero", fr:"Horloger", it:"Orologiaio", zh:"钟表维修", hi:"घड़ी मरम्मत", pt:"Relojoeiro" },
  "Ayakkabıcı": { en:"Shoe Shop", de:"Schuhgeschäft", ar:"محل أحذية", ru:"Обувной магазин", uk:"Взуттєвий магазин", es:"Zapatería", fr:"Magasin de chaussures", it:"Calzature", zh:"鞋店", hi:"जूते की दुकान", pt:"Sapataria" },
  "Mobilyacı": { en:"Furniture Shop", de:"Möbelhaus", ar:"محل أثاث", ru:"Мебельный магазин", uk:"Меблевий магазин", es:"Mueblería", fr:"Magasin de meubles", it:"Mobilificio", zh:"家具店", hi:"फ़र्नीचर की दुकान", pt:"Loja de móveis" },
  "Peyzaj / Bahçe": { en:"Landscaping / Garden", de:"Landschaftsbau / Garten", ar:"تنسيق حدائق", ru:"Ландшафт / Сад", uk:"Ландшафт / Сад", es:"Paisajismo / Jardín", fr:"Paysagisme / Jardin", it:"Giardinaggio", zh:"园艺/花园", hi:"लैंडस्केप / बाग़", pt:"Paisagismo / Jardim" },
  "Seyahat / Tur": { en:"Travel / Tours", de:"Reisen / Touren", ar:"سفر / جولات", ru:"Путешествия / Туры", uk:"Подорожі / Тури", es:"Viajes / Tours", fr:"Voyages / Circuits", it:"Viaggi / Tour", zh:"旅游/旅行", hi:"यात्रा / टूर", pt:"Viagens / Tours" },
  "Sigortacı": { en:"Insurance Agent", de:"Versicherungsmakler", ar:"وكيل تأمين", ru:"Страховой агент", uk:"Страховий агент", es:"Agente de seguros", fr:"Assureur", it:"Assicuratore", zh:"保险代理", hi:"बीमा एजेंट", pt:"Corretor de seguros" },
  "Sanatçı / Ressam": { en:"Artist / Painter", de:"Künstler / Maler", ar:"فنان / رسام", ru:"Художник", uk:"Художник", es:"Artista / Pintor", fr:"Artiste / Peintre", it:"Artista / Pittore", zh:"艺术家/画家", hi:"कलाकार / चित्रकार", pt:"Artista / Pintor" },
  // --- HİZMET VEREN (ek) ---
  "Bankacı / Banka": { en:"Banker / Bank", de:"Bankkaufmann / Bank", ar:"مصرفي / بنك", ru:"Банкир / Банк", uk:"Банкір / Банк", es:"Banca", fr:"Banque", it:"Bancario / Banca", zh:"银行/银行家", hi:"बैंकर / बैंक", pt:"Bancário / Banco" },
  "Dövizci": { en:"Currency Exchange", de:"Wechselstube", ar:"صرافة", ru:"Обмен валют", uk:"Обмін валют", es:"Cambio de divisas", fr:"Bureau de change", it:"Cambio valute", zh:"货币兑换", hi:"मुद्रा विनिमय", pt:"Câmbio" },
  "Gazete / Medya": { en:"Newspaper / Media", de:"Zeitung / Medien", ar:"صحيفة / إعلام", ru:"Газета / СМИ", uk:"Газета / ЗМІ", es:"Prensa / Medios", fr:"Presse / Médias", it:"Giornale / Media", zh:"报刊/媒体", hi:"समाचार / मीडिया", pt:"Jornal / Mídia" },
  "Benzin İstasyonu": { en:"Gas Station", de:"Tankstelle", ar:"محطة وقود", ru:"АЗС", uk:"АЗС", es:"Gasolinera", fr:"Station-service", it:"Distributore di benzina", zh:"加油站", hi:"पेट्रोल पंप", pt:"Posto de gasolina" },
  "Oto Yıkama": { en:"Car Wash", de:"Autowäsche", ar:"غسيل سيارات", ru:"Автомойка", uk:"Автомийка", es:"Lavado de autos", fr:"Lavage auto", it:"Autolavaggio", zh:"洗车", hi:"कार वॉश", pt:"Lava-rápido" },
  "Lastikçi": { en:"Tire Shop", de:"Reifenservice", ar:"محل إطارات", ru:"Шиномонтаж", uk:"Шиномонтаж", es:"Taller de neumáticos", fr:"Garage pneus", it:"Gommista", zh:"轮胎店", hi:"टायर शॉप", pt:"Borracharia" },
  "Araç Kiralama": { en:"Car Rental", de:"Autovermietung", ar:"تأجير سيارات", ru:"Аренда авто", uk:"Оренда авто", es:"Alquiler de coches", fr:"Location de voitures", it:"Autonoleggio", zh:"租车", hi:"कार किराया", pt:"Aluguel de carros" },
  "Giyim Mağazası": { en:"Clothing Store", de:"Bekleidungsgeschäft", ar:"محل ملابس", ru:"Магазин одежды", uk:"Магазин одягу", es:"Tienda de ropa", fr:"Magasin de vêtements", it:"Negozio di abbigliamento", zh:"服装店", hi:"कपड़ों की दुकान", pt:"Loja de roupas" },
  "Elektronik / Beyaz Eşya": { en:"Electronics / Appliances", de:"Elektronik / Haushaltsgeräte", ar:"إلكترونيات / أجهزة منزلية", ru:"Электроника / Бытовая техника", uk:"Електроніка / Побутова техніка", es:"Electrónica / Electrodomésticos", fr:"Électronique / Électroménager", it:"Elettronica / Elettrodomestici", zh:"电子/家电", hi:"इलेक्ट्रॉनिक्स / उपकरण", pt:"Eletrônicos / Eletrodomésticos" },
  "Telefon / GSM Bayi": { en:"Phone / Mobile Shop", de:"Handy-Shop", ar:"محل هواتف / موبايل", ru:"Салон связи", uk:"Салон зв'язку", es:"Tienda de móviles", fr:"Boutique mobile", it:"Negozio di telefonia", zh:"手机店", hi:"मोबाइल शॉप", pt:"Loja de celulares" },
  "Bilgisayarcı": { en:"Computer Shop", de:"Computerladen", ar:"محل كمبيوتر", ru:"Компьютерный магазин", uk:"Комп'ютерний магазин", es:"Tienda de informática", fr:"Magasin informatique", it:"Negozio di informatica", zh:"电脑店", hi:"कंप्यूटर शॉप", pt:"Loja de informática" },
  "Nalbur / Hırdavat": { en:"Hardware Store", de:"Eisenwarenladen", ar:"محل خردوات", ru:"Хозяйственный магазин", uk:"Господарський магазин", es:"Ferretería", fr:"Quincaillerie", it:"Ferramenta", zh:"五金店", hi:"हार्डवेयर स्टोर", pt:"Loja de ferragens" },
  "Oyuncakçı": { en:"Toy Shop", de:"Spielwarenladen", ar:"محل ألعاب", ru:"Магазин игрушек", uk:"Магазин іграшок", es:"Juguetería", fr:"Magasin de jouets", it:"Negozio di giocattoli", zh:"玩具店", hi:"खिलौनों की दुकान", pt:"Loja de brinquedos" },
  "Pet Shop / Evcil Hayvan": { en:"Pet Shop", de:"Tierhandlung", ar:"محل حيوانات أليفة", ru:"Зоомагазин", uk:"Зоомагазин", es:"Tienda de mascotas", fr:"Animalerie", it:"Negozio di animali", zh:"宠物店", hi:"पेट शॉप", pt:"Pet shop" },
  "Parfümeri / Kozmetik": { en:"Perfumery / Cosmetics", de:"Parfümerie / Kosmetik", ar:"عطور / مستحضرات تجميل", ru:"Парфюмерия / Косметика", uk:"Парфумерія / Косметика", es:"Perfumería / Cosmética", fr:"Parfumerie / Cosmétiques", it:"Profumeria / Cosmetici", zh:"香水/化妆品", hi:"परफ्यूम / कॉस्मेटिक", pt:"Perfumaria / Cosméticos" },
  "Manav": { en:"Greengrocer", de:"Gemüsehändler", ar:"بائع خضار", ru:"Овощная лавка", uk:"Овочева крамниця", es:"Frutería", fr:"Primeur", it:"Fruttivendolo", zh:"果蔬店", hi:"सब्ज़ी विक्रेता", pt:"Quitanda" },
  "Şarküteri": { en:"Delicatessen", de:"Feinkost", ar:"أطعمة فاخرة", ru:"Гастроном", uk:"Делікатеси", es:"Charcutería", fr:"Charcuterie", it:"Salumeria", zh:"熟食店", hi:"डेलिकैटसन", pt:"Delicatessen" },
  "Balıkçı": { en:"Fishmonger", de:"Fischhändler", ar:"بائع سمك", ru:"Рыбная лавка", uk:"Рибна крамниця", es:"Pescadería", fr:"Poissonnerie", it:"Pescheria", zh:"鱼店", hi:"मछली विक्रेता", pt:"Peixaria" },
  "Kuruyemişçi": { en:"Nuts & Snacks Shop", de:"Trockenfrüchte / Nüsse", ar:"محل مكسرات", ru:"Орехи и сухофрукты", uk:"Горіхи та сухофрукти", es:"Frutos secos", fr:"Fruits secs", it:"Frutta secca", zh:"坚果店", hi:"ड्राई फ्रूट्स", pt:"Loja de castanhas" },
  "Su / İçecek Bayi": { en:"Water / Beverage Dealer", de:"Wasser / Getränkehandel", ar:"موزّع مياه / مشروبات", ru:"Вода / Напитки", uk:"Вода / Напої", es:"Distribuidor de bebidas", fr:"Distributeur de boissons", it:"Distributore bevande", zh:"水/饮料经销", hi:"पानी / पेय वितरक", pt:"Distribuidora de bebidas" },
  "Tatlıcı / Dondurma": { en:"Desserts / Ice Cream", de:"Süßwaren / Eis", ar:"حلويات / آيس كريم", ru:"Десерты / Мороженое", uk:"Десерти / Морозиво", es:"Postres / Helados", fr:"Desserts / Glaces", it:"Dolci / Gelato", zh:"甜点/冰淇淋", hi:"मिठाई / आइसक्रीम", pt:"Doces / Sorvete" },
  "Döner / Fast Food": { en:"Doner / Fast Food", de:"Döner / Fast Food", ar:"شاورما / وجبات سريعة", ru:"Донер / Фастфуд", uk:"Донер / Фастфуд", es:"Döner / Comida rápida", fr:"Döner / Fast-food", it:"Kebab / Fast food", zh:"烤肉/快餐", hi:"डोनर / फ़ास्ट फ़ूड", pt:"Döner / Fast food" },
  "Çilingir / Anahtarcı": { en:"Locksmith", de:"Schlüsseldienst", ar:"صانع مفاتيح / أقفال", ru:"Слесарь / Ключи", uk:"Слюсар / Ключі", es:"Cerrajero", fr:"Serrurier", it:"Fabbro / Chiavi", zh:"锁匠", hi:"ताला-चाबी वाला", pt:"Chaveiro" },
  "Cam / Ayna": { en:"Glass / Mirror", de:"Glas / Spiegel", ar:"زجاج / مرايا", ru:"Стекло / Зеркала", uk:"Скло / Дзеркала", es:"Vidrios / Espejos", fr:"Verre / Miroirs", it:"Vetri / Specchi", zh:"玻璃/镜子", hi:"कांच / दर्पण", pt:"Vidros / Espelhos" },
  "Klima / Soğutma": { en:"AC / Cooling", de:"Klima / Kühlung", ar:"تكييف / تبريد", ru:"Кондиционеры / Охлаждение", uk:"Кондиціонери / Охолодження", es:"Aire acondicionado / Refrigeración", fr:"Climatisation / Froid", it:"Climatizzazione", zh:"空调/制冷", hi:"एसी / कूलिंग", pt:"Ar-condicionado / Refrigeração" },
  "Halı Yıkama": { en:"Carpet Cleaning", de:"Teppichreinigung", ar:"غسيل سجاد", ru:"Чистка ковров", uk:"Чищення килимів", es:"Limpieza de alfombras", fr:"Nettoyage de tapis", it:"Lavaggio tappeti", zh:"地毯清洗", hi:"कालीन सफ़ाई", pt:"Lavagem de tapetes" },
  "Kuru Temizleme": { en:"Dry Cleaning", de:"Chemische Reinigung", ar:"تنظيف جاف", ru:"Химчистка", uk:"Хімчистка", es:"Tintorería", fr:"Pressing", it:"Lavanderia a secco", zh:"干洗", hi:"ड्राई क्लीनिंग", pt:"Lavanderia a seco" },
  "Noter": { en:"Notary", de:"Notar", ar:"كاتب عدل", ru:"Нотариус", uk:"Нотаріус", es:"Notaría", fr:"Notaire", it:"Notaio", zh:"公证处", hi:"नोटरी", pt:"Cartório" },
  "Danışmanlık": { en:"Consulting", de:"Beratung", ar:"استشارات", ru:"Консалтинг", uk:"Консалтинг", es:"Consultoría", fr:"Conseil", it:"Consulenza", zh:"咨询", hi:"परामर्श", pt:"Consultoria" },
  "Reklam / Ajans": { en:"Advertising / Agency", de:"Werbung / Agentur", ar:"إعلان / وكالة", ru:"Реклама / Агентство", uk:"Реклама / Агентство", es:"Publicidad / Agencia", fr:"Publicité / Agence", it:"Pubblicità / Agenzia", zh:"广告/代理", hi:"विज्ञापन / एजेंसी", pt:"Publicidade / Agência" },
  "Web / Dijital": { en:"Web / Digital", de:"Web / Digital", ar:"ويب / رقمي", ru:"Веб / Диджитал", uk:"Веб / Діджитал", es:"Web / Digital", fr:"Web / Digital", it:"Web / Digitale", zh:"网站/数字", hi:"वेब / डिजिटल", pt:"Web / Digital" },
  "Sürücü Kursu": { en:"Driving School", de:"Fahrschule", ar:"مدرسة قيادة", ru:"Автошкола", uk:"Автошкола", es:"Autoescuela", fr:"Auto-école", it:"Scuola guida", zh:"驾校", hi:"ड्राइविंग स्कूल", pt:"Autoescola" },
  "Kreş / Anaokulu": { en:"Nursery / Kindergarten", de:"Kita / Kindergarten", ar:"حضانة / روضة", ru:"Ясли / Детский сад", uk:"Ясла / Дитсадок", es:"Guardería", fr:"Crèche / Maternelle", it:"Asilo nido", zh:"托儿所/幼儿园", hi:"नर्सरी / किंडरगार्टन", pt:"Creche" },
  "Müzik Kursu": { en:"Music School", de:"Musikschule", ar:"مدرسة موسيقى", ru:"Музыкальная школа", uk:"Музична школа", es:"Escuela de música", fr:"École de musique", it:"Scuola di musica", zh:"音乐学校", hi:"संगीत स्कूल", pt:"Escola de música" },
  "Spor Salonu / Fitness": { en:"Gym / Fitness", de:"Fitnessstudio", ar:"نادي رياضي", ru:"Спортзал / Фитнес", uk:"Спортзал / Фітнес", es:"Gimnasio", fr:"Salle de sport", it:"Palestra", zh:"健身房", hi:"जिम / फ़िटनेस", pt:"Academia" },
  "Düğün Salonu": { en:"Wedding Venue", de:"Hochzeitssaal", ar:"قاعة أفراح", ru:"Свадебный зал", uk:"Весільний зал", es:"Salón de bodas", fr:"Salle de mariage", it:"Sala matrimoni", zh:"婚礼场地", hi:"शादी हॉल", pt:"Salão de festas" },
  "İnşaat Firması": { en:"Construction Company", de:"Bauunternehmen", ar:"شركة إنشاءات", ru:"Строительная компания", uk:"Будівельна компанія", es:"Empresa de construcción", fr:"Entreprise de construction", it:"Impresa edile", zh:"建筑公司", hi:"निर्माण कंपनी", pt:"Construtora" },
  "PVC / Doğrama": { en:"PVC / Joinery", de:"PVC / Fensterbau", ar:"PVC / نجارة", ru:"ПВХ / Столярка", uk:"ПВХ / Столярка", es:"PVC / Carpintería", fr:"PVC / Menuiserie", it:"PVC / Serramenti", zh:"PVC/门窗", hi:"PVC / जॉइनरी", pt:"PVC / Esquadrias" },
  "Klinik / Poliklinik": { en:"Clinic", de:"Klinik", ar:"عيادة", ru:"Клиника", uk:"Клініка", es:"Clínica", fr:"Clinique", it:"Clinica", zh:"诊所", hi:"क्लिनिक", pt:"Clínica" },
  "Güvenlik / Kamera Sistemleri": { en:"Security / Camera Systems", de:"Sicherheit / Kamerasysteme", ar:"أنظمة أمن / كاميرات", ru:"Системы безопасности / Камеры", uk:"Системи безпеки / Камери", es:"Sistemas de seguridad / Cámaras", fr:"Sécurité / Caméras", it:"Sicurezza / Videosorveglianza", zh:"安防/监控", hi:"सुरक्षा / कैमरा सिस्टम", pt:"Segurança / Câmeras" },
  // --- İŞÇİ / HİZMET ALAN ---
  "Garson": { en:"Waiter", de:"Kellner", ar:"نادل", ru:"Официант", uk:"Офіціант", es:"Camarero", fr:"Serveur", it:"Cameriere", zh:"服务员", hi:"वेटर", pt:"Garçom" },
  "Kasiyer": { en:"Cashier", de:"Kassierer", ar:"أمين صندوق", ru:"Кассир", uk:"Касир", es:"Cajero", fr:"Caissier", it:"Cassiere", zh:"收银员", hi:"कैशियर", pt:"Caixa" },
  "Aşçı / Mutfak": { en:"Cook / Kitchen", de:"Koch / Küche", ar:"طاهٍ / مطبخ", ru:"Повар / Кухня", uk:"Кухар / Кухня", es:"Cocinero / Cocina", fr:"Cuisinier / Cuisine", it:"Cuoco / Cucina", zh:"厨师/厨房", hi:"रसोइया / किचन", pt:"Cozinheiro / Cozinha" },
  "Komi / Bulaşık": { en:"Busser / Dishwasher", de:"Hilfskraft / Spüler", ar:"مساعد / غسيل صحون", ru:"Помощник / Посудомойка", uk:"Помічник / Посуд", es:"Ayudante / Lavaplatos", fr:"Aide / Plonge", it:"Aiuto / Lavapiatti", zh:"杂工/洗碗", hi:"सहायक / बर्तन", pt:"Auxiliar / Lavador de louça" },
  "Temizlik Görevlisi": { en:"Cleaner", de:"Reinigungskraft", ar:"عامل نظافة", ru:"Уборщик", uk:"Прибиральник", es:"Personal de limpieza", fr:"Agent d'entretien", it:"Addetto pulizie", zh:"清洁工", hi:"सफ़ाईकर्मी", pt:"Faxineiro" },
  "Şoför": { en:"Driver", de:"Fahrer", ar:"سائق", ru:"Водитель", uk:"Водій", es:"Conductor", fr:"Chauffeur", it:"Autista", zh:"司机", hi:"ड्राइवर", pt:"Motorista" },
  "Kurye / Motokurye": { en:"Courier / Moto-Courier", de:"Kurier", ar:"مندوب / موتوسيكل", ru:"Курьер / Мотокурьер", uk:"Кур'єр / Мотокур'єр", es:"Mensajero / Moto", fr:"Coursier / Moto", it:"Corriere / Moto", zh:"快递/骑手", hi:"कूरियर", pt:"Motoboy" },
  "Tezgâhtar": { en:"Shop Assistant", de:"Verkäufer", ar:"بائع", ru:"Продавец", uk:"Продавець", es:"Dependiente", fr:"Vendeur", it:"Commesso", zh:"店员", hi:"दुकान सहायक", pt:"Balconista" },
  "Depo / Ambar": { en:"Warehouse", de:"Lager", ar:"مستودع", ru:"Склад", uk:"Склад", es:"Almacén", fr:"Entrepôt", it:"Magazzino", zh:"仓库", hi:"गोदाम", pt:"Estoque" },
  "İnşaat İşçisi": { en:"Construction Worker", de:"Bauarbeiter", ar:"عامل بناء", ru:"Строитель", uk:"Будівельник", es:"Obrero de construcción", fr:"Ouvrier du bâtiment", it:"Operaio edile", zh:"建筑工人", hi:"निर्माण मज़दूर", pt:"Operário de construção" },
  "Boyacı / Badana": { en:"Painter (walls)", de:"Maler / Anstreicher", ar:"دهّان", ru:"Маляр", uk:"Маляр", es:"Pintor (paredes)", fr:"Peintre en bâtiment", it:"Imbianchino", zh:"油漆工", hi:"पेंटर", pt:"Pintor" },
  "Kalfa / Çırak": { en:"Apprentice", de:"Geselle / Lehrling", ar:"صبي / متدرب", ru:"Подмастерье", uk:"Підмайстер", es:"Aprendiz", fr:"Apprenti", it:"Apprendista", zh:"学徒", hi:"शागिर्द", pt:"Aprendiz" },
  "Bakıcı / Yaşlı Bakım": { en:"Elderly Caregiver", de:"Altenpfleger", ar:"رعاية مسنين", ru:"Уход за пожилыми", uk:"Догляд за літніми", es:"Cuidador de mayores", fr:"Aide aux personnes âgées", it:"Assistente anziani", zh:"老人护理", hi:"बुज़ुर्ग देखभाल", pt:"Cuidador de idosos" },
  "Çocuk Bakıcı": { en:"Babysitter", de:"Babysitter", ar:"جليسة أطفال", ru:"Няня", uk:"Няня", es:"Niñera", fr:"Garde d'enfants", it:"Babysitter", zh:"育儿嫂", hi:"बेबीसिटर", pt:"Babá" },
  "Bahçıvan": { en:"Gardener", de:"Gärtner", ar:"بستاني", ru:"Садовник", uk:"Садівник", es:"Jardinero", fr:"Jardinier", it:"Giardiniere", zh:"园丁", hi:"माली", pt:"Jardineiro" },
  "İşçi / Fabrika": { en:"Worker / Factory", de:"Arbeiter / Fabrik", ar:"عامل / مصنع", ru:"Рабочий / Завод", uk:"Робітник / Завод", es:"Obrero / Fábrica", fr:"Ouvrier / Usine", it:"Operaio / Fabbrica", zh:"工人/工厂", hi:"मज़दूर / फ़ैक्ट्री", pt:"Operário / Fábrica" },
  "Paketleme": { en:"Packaging", de:"Verpackung", ar:"تغليف", ru:"Упаковка", uk:"Пакування", es:"Empaquetado", fr:"Emballage", it:"Imballaggio", zh:"包装", hi:"पैकेजिंग", pt:"Embalagem" },
  "Servis Elemanı": { en:"Service Staff", de:"Servicekraft", ar:"عامل خدمة", ru:"Работник зала", uk:"Працівник залу", es:"Personal de servicio", fr:"Personnel de service", it:"Addetto al servizio", zh:"服务人员", hi:"सर्विस स्टाफ़", pt:"Atendente" },
  "Barista": { en:"Barista", de:"Barista", ar:"باريستا", ru:"Бариста", uk:"Бариста", es:"Barista", fr:"Barista", it:"Barista", zh:"咖啡师", hi:"बरिस्ता", pt:"Barista" },
  "Fırın Elemanı": { en:"Bakery Worker", de:"Bäckereihelfer", ar:"عامل مخبز", ru:"Работник пекарни", uk:"Працівник пекарні", es:"Empleado de panadería", fr:"Employé de boulangerie", it:"Addetto panificio", zh:"面包房员工", hi:"बेकरी कर्मचारी", pt:"Padeiro auxiliar" },
  "Berber Kalfası": { en:"Barber Assistant", de:"Barbier-Gehilfe", ar:"مساعد حلاق", ru:"Помощник барбера", uk:"Помічник барбера", es:"Ayudante de barbero", fr:"Aide-barbier", it:"Aiuto barbiere", zh:"理发助理", hi:"नाई सहायक", pt:"Auxiliar de barbeiro" },
  "Kuaför Kalfası": { en:"Hairdresser Assistant", de:"Friseur-Gehilfe", ar:"مساعد مصفف شعر", ru:"Помощник парикмахера", uk:"Помічник перукаря", es:"Ayudante de peluquero", fr:"Aide-coiffeur", it:"Aiuto parrucchiere", zh:"美发助理", hi:"हेयरड्रेसर सहायक", pt:"Auxiliar de cabeleireiro" },
  "Terzi Elemanı": { en:"Tailor Assistant", de:"Schneider-Gehilfe", ar:"مساعد خياط", ru:"Помощник портного", uk:"Помічник кравця", es:"Ayudante de sastre", fr:"Aide-tailleur", it:"Aiuto sarto", zh:"裁缝助理", hi:"दर्ज़ी सहायक", pt:"Auxiliar de costura" },
  "Tamirci Yardımcısı": { en:"Repair Assistant", de:"Mechaniker-Helfer", ar:"مساعد ميكانيكي", ru:"Помощник механика", uk:"Помічник механіка", es:"Ayudante de mecánico", fr:"Aide-mécanicien", it:"Aiuto meccanico", zh:"维修助理", hi:"मरम्मत सहायक", pt:"Auxiliar de mecânico" },
  "Cam / Boya": { en:"Glass / Paint", de:"Glas / Lack", ar:"زجاج / دهان", ru:"Стекло / Покраска", uk:"Скло / Фарбування", es:"Vidrio / Pintura", fr:"Vitre / Peinture", it:"Vetri / Vernici", zh:"玻璃/喷漆", hi:"कांच / पेंट", pt:"Vidro / Pintura" },
  "Hamal / Taşıyıcı": { en:"Porter / Carrier", de:"Träger", ar:"حمّال", ru:"Грузчик", uk:"Вантажник", es:"Mozo / Cargador", fr:"Porteur", it:"Facchino", zh:"搬运工", hi:"कुली / वाहक", pt:"Carregador" },
  "Vale / Otopark": { en:"Valet / Parking", de:"Parkservice", ar:"خدمة ركن سيارات", ru:"Парковщик", uk:"Паркувальник", es:"Aparcacoches", fr:"Voiturier", it:"Parcheggiatore", zh:"代客泊车", hi:"वैले / पार्किंग", pt:"Manobrista" },
  "Kapıcı": { en:"Doorman / Janitor", de:"Hausmeister / Portier", ar:"بواب", ru:"Консьерж / Дворник", uk:"Консьєрж / Двірник", es:"Portero / Conserje", fr:"Concierge / Gardien", it:"Portiere", zh:"门卫", hi:"दरबान", pt:"Porteiro / Zelador" },
  "Çağrı Merkezi": { en:"Call Center", de:"Callcenter", ar:"مركز اتصال", ru:"Колл-центр", uk:"Кол-центр", es:"Centro de llamadas", fr:"Centre d'appels", it:"Call center", zh:"呼叫中心", hi:"कॉल सेंटर", pt:"Call center" },
  "Veri Girişi": { en:"Data Entry", de:"Dateneingabe", ar:"إدخال بيانات", ru:"Ввод данных", uk:"Введення даних", es:"Entrada de datos", fr:"Saisie de données", it:"Inserimento dati", zh:"数据录入", hi:"डेटा एंट्री", pt:"Entrada de dados" },
  "Stajyer": { en:"Intern", de:"Praktikant", ar:"متدرب", ru:"Стажёр", uk:"Стажер", es:"Becario", fr:"Stagiaire", it:"Tirocinante", zh:"实习生", hi:"प्रशिक्षु", pt:"Estagiário" },
  "Hemşire Yardımcısı": { en:"Nurse Assistant", de:"Pflegehelfer", ar:"مساعد ممرض", ru:"Помощник медсестры", uk:"Помічник медсестри", es:"Auxiliar de enfermería", fr:"Aide-soignant", it:"Assistente infermiere", zh:"护士助理", hi:"नर्स सहायक", pt:"Auxiliar de enfermagem" },
  "Laborant": { en:"Lab Technician", de:"Laborant", ar:"فني مختبر", ru:"Лаборант", uk:"Лаборант", es:"Técnico de laboratorio", fr:"Laborantin", it:"Tecnico di laboratorio", zh:"化验员", hi:"लैब तकनीशियन", pt:"Técnico de laboratório" },
  "Satış Elemanı": { en:"Sales Assistant", de:"Verkäufer", ar:"مندوب مبيعات", ru:"Продавец-консультант", uk:"Продавець-консультант", es:"Vendedor", fr:"Vendeur", it:"Addetto vendite", zh:"销售员", hi:"सेल्स असिस्टेंट", pt:"Vendedor" },
  "Reyon Görevlisi": { en:"Shelf Stocker", de:"Regalauffüller", ar:"عامل رفوف", ru:"Мерчандайзер", uk:"Мерчандайзер", es:"Reponedor", fr:"Employé de rayon", it:"Scaffalista", zh:"理货员", hi:"शेल्फ़ स्टॉकर", pt:"Repositor" },
  "Bekçi": { en:"Watchman", de:"Wächter", ar:"حارس", ru:"Сторож", uk:"Сторож", es:"Vigilante", fr:"Veilleur", it:"Guardiano", zh:"看守", hi:"चौकीदार", pt:"Vigia" },
  "Çay Ocağı": { en:"Tea House Worker", de:"Teestuben-Mitarbeiter", ar:"عامل مقهى شاي", ru:"Работник чайной", uk:"Працівник чайної", es:"Empleado de salón de té", fr:"Employé de salon de thé", it:"Addetto sala da tè", zh:"茶水间员工", hi:"चाय स्टॉल कर्मचारी", pt:"Atendente de chá" },
  "Hemşire": { en:"Nurse", de:"Krankenpfleger", ar:"ممرض", ru:"Медсестра", uk:"Медсестра", es:"Enfermero", fr:"Infirmier", it:"Infermiere", zh:"护士", hi:"नर्स", pt:"Enfermeiro" },
  "Sağlık Personeli": { en:"Healthcare Staff", de:"Gesundheitspersonal", ar:"طاقم صحي", ru:"Медперсонал", uk:"Медперсонал", es:"Personal sanitario", fr:"Personnel de santé", it:"Personale sanitario", zh:"医护人员", hi:"स्वास्थ्यकर्मी", pt:"Profissional de saúde" },
  "Garson Yardımcısı": { en:"Waiter Assistant", de:"Kellner-Hilfe", ar:"مساعد نادل", ru:"Помощник официанта", uk:"Помічник офіціанта", es:"Ayudante de camarero", fr:"Aide-serveur", it:"Aiuto cameriere", zh:"服务员助理", hi:"वेटर सहायक", pt:"Auxiliar de garçom" },
  "Otobüs / TIR Şoförü": { en:"Bus / Truck Driver", de:"Bus- / LKW-Fahrer", ar:"سائق حافلة / شاحنة", ru:"Водитель автобуса / фуры", uk:"Водій автобуса / фури", es:"Conductor de autobús / camión", fr:"Chauffeur de bus / camion", it:"Autista bus / camion", zh:"巴士/卡车司机", hi:"बस / ट्रक ड्राइवर", pt:"Motorista de ônibus / caminhão" },
  "Tekstil İşçisi": { en:"Textile Worker", de:"Textilarbeiter", ar:"عامل نسيج", ru:"Текстильщик", uk:"Текстильник", es:"Trabajador textil", fr:"Ouvrier textile", it:"Operaio tessile", zh:"纺织工人", hi:"वस्त्र मज़दूर", pt:"Trabalhador têxtil" },
  "Makine Operatörü": { en:"Machine Operator", de:"Maschinenbediener", ar:"مشغّل آلات", ru:"Оператор станка", uk:"Оператор верстата", es:"Operario de máquina", fr:"Opérateur machine", it:"Operatore macchine", zh:"机器操作员", hi:"मशीन ऑपरेटर", pt:"Operador de máquina" },
  "Elektrik Yardımcısı": { en:"Electrician Assistant", de:"Elektriker-Helfer", ar:"مساعد كهربائي", ru:"Помощник электрика", uk:"Помічник електрика", es:"Ayudante de electricista", fr:"Aide-électricien", it:"Aiuto elettricista", zh:"电工助理", hi:"इलेक्ट्रीशियन सहायक", pt:"Auxiliar de eletricista" },
  "Tesisat Yardımcısı": { en:"Plumber Assistant", de:"Klempner-Helfer", ar:"مساعد سبّاك", ru:"Помощник сантехника", uk:"Помічник сантехніка", es:"Ayudante de fontanero", fr:"Aide-plombier", it:"Aiuto idraulico", zh:"水管工助理", hi:"प्लंबर सहायक", pt:"Auxiliar de encanador" },
  "Tarım İşçisi": { en:"Farm Worker", de:"Landarbeiter", ar:"عامل زراعي", ru:"Сельхозрабочий", uk:"Сільгоспробітник", es:"Trabajador agrícola", fr:"Ouvrier agricole", it:"Bracciante agricolo", zh:"农业工人", hi:"कृषि मज़दूर", pt:"Trabalhador rural" },
  "Usta Yardımcısı": { en:"Master's Assistant", de:"Meister-Helfer", ar:"مساعد أسطى", ru:"Помощник мастера", uk:"Помічник майстра", es:"Ayudante de maestro", fr:"Aide-artisan", it:"Aiuto artigiano", zh:"师傅助手", hi:"उस्ताद सहायक", pt:"Auxiliar de mestre" },
  "Salon Çalışanı": { en:"Salon Worker", de:"Salon-Mitarbeiter", ar:"عامل صالون", ru:"Работник салона", uk:"Працівник салону", es:"Empleado de salón", fr:"Employé de salon", it:"Addetto salone", zh:"沙龙员工", hi:"सैलून कर्मचारी", pt:"Funcionário de salão" },
  "Mağaza Çalışanı": { en:"Store Worker", de:"Ladenmitarbeiter", ar:"عامل متجر", ru:"Работник магазина", uk:"Працівник магазину", es:"Empleado de tienda", fr:"Employé de magasin", it:"Addetto negozio", zh:"商店员工", hi:"स्टोर कर्मचारी", pt:"Funcionário de loja" },
  "Ofis Elemanı": { en:"Office Staff", de:"Büromitarbeiter", ar:"موظف مكتب", ru:"Офисный работник", uk:"Офісний працівник", es:"Personal de oficina", fr:"Employé de bureau", it:"Impiegato", zh:"办公室职员", hi:"ऑफ़िस स्टाफ़", pt:"Auxiliar de escritório" },
  "Mutfak Yardımcısı": { en:"Kitchen Assistant", de:"Küchenhilfe", ar:"مساعد مطبخ", ru:"Помощник повара", uk:"Помічник кухаря", es:"Ayudante de cocina", fr:"Aide de cuisine", it:"Aiuto cuoco", zh:"厨房助理", hi:"किचन सहायक", pt:"Auxiliar de cozinha" },
  "Spa / Hamam Çalışanı": { en:"Spa / Bath Worker", de:"Spa- / Bademitarbeiter", ar:"عامل سبا / حمّام", ru:"Работник спа / бани", uk:"Працівник спа / лазні", es:"Empleado de spa / baño", fr:"Employé de spa / hammam", it:"Addetto spa / terme", zh:"水疗/浴场员工", hi:"स्पा / हम्माम कर्मचारी", pt:"Funcionário de spa" },
  "Kaynakçı": { en:"Welder", de:"Schweißer", ar:"لحّام", ru:"Сварщик", uk:"Зварювальник", es:"Soldador", fr:"Soudeur", it:"Saldatore", zh:"焊工", hi:"वेल्डर", pt:"Soldador" },
  "Marangoz": { en:"Carpenter", de:"Tischler", ar:"نجار", ru:"Плотник", uk:"Тесля", es:"Carpintero", fr:"Menuisier", it:"Falegname", zh:"木匠", hi:"बढ़ई", pt:"Carpinteiro" },
  "Sıvacı / Fayansçı": { en:"Plasterer / Tiler", de:"Verputzer / Fliesenleger", ar:"لياس / مبلّط", ru:"Штукатур / Плиточник", uk:"Штукатур / Плиточник", es:"Yesero / Alicatador", fr:"Plâtrier / Carreleur", it:"Intonacatore / Piastrellista", zh:"抹灰/瓷砖工", hi:"प्लास्टर / टाइल", pt:"Rebocador / Azulejista" },
  "Forklift Operatörü": { en:"Forklift Operator", de:"Staplerfahrer", ar:"مشغّل رافعة شوكية", ru:"Оператор погрузчика", uk:"Оператор навантажувача", es:"Operador de montacargas", fr:"Cariste", it:"Carrellista", zh:"叉车操作员", hi:"फ़ोर्कलिफ़्ट ऑपरेटर", pt:"Operador de empilhadeira" },
  "Resepsiyon / Sekreter": { en:"Reception / Secretary", de:"Empfang / Sekretär", ar:"استقبال / سكرتير", ru:"Ресепшен / Секретарь", uk:"Ресепшн / Секретар", es:"Recepción / Secretario", fr:"Réception / Secrétaire", it:"Reception / Segretario", zh:"前台/秘书", hi:"रिसेप्शन / सचिव", pt:"Recepção / Secretário" },
  "Muhasebe Elemanı": { en:"Accounting Clerk", de:"Buchhaltungskraft", ar:"موظف محاسبة", ru:"Бухгалтер", uk:"Бухгалтер", es:"Auxiliar contable", fr:"Comptable", it:"Addetto contabilità", zh:"会计文员", hi:"लेखा क्लर्क", pt:"Auxiliar contábil" },
  "Pazarlama Elemanı": { en:"Marketing Staff", de:"Marketing-Mitarbeiter", ar:"موظف تسويق", ru:"Маркетолог", uk:"Маркетолог", es:"Personal de marketing", fr:"Chargé de marketing", it:"Addetto marketing", zh:"营销人员", hi:"मार्केटिंग स्टाफ़", pt:"Profissional de marketing" },
  "Ütücü / Kuru Temizleme": { en:"Ironing / Dry Cleaning", de:"Bügeln / Reinigung", ar:"كي / تنظيف جاف", ru:"Глажка / Химчистка", uk:"Прасування / Хімчистка", es:"Planchado / Tintorería", fr:"Repassage / Pressing", it:"Stiratura / Lavanderia", zh:"熨烫/干洗", hi:"इस्त्री / ड्राई क्लीन", pt:"Passadeira / Lavanderia" },
  "Ev İşleri / Yardımcı": { en:"Housekeeping / Helper", de:"Haushaltshilfe", ar:"أعمال منزلية / مساعدة", ru:"Помощь по дому", uk:"Хатня робота", es:"Tareas del hogar / Ayudante", fr:"Aide ménagère", it:"Collaboratore domestico", zh:"家务/帮手", hi:"घरेलू सहायक", pt:"Empregada doméstica" },
  "Animatör / Sunucu": { en:"Animator / Host", de:"Animateur / Moderator", ar:"منشّط / مقدّم", ru:"Аниматор / Ведущий", uk:"Аніматор / Ведучий", es:"Animador / Presentador", fr:"Animateur / Présentateur", it:"Animatore / Presentatore", zh:"主持/司仪", hi:"एनिमेटर / होस्ट", pt:"Animador / Apresentador" },
};

// --- JAPONCA meslek adları (tek sözlük → aşağıda meslekCevir'e işlenir) ---
const meslekJa = {
  "Fabrika / İmalat":"工場・製造", "Toptancı":"卸売業者", "Tedarikçi / Bayi":"供給業者・販売代理店", "İthalat / İhracat":"輸入・輸出",
  "Üretici / Çiftçi":"生産者・農家", "Hayvancılık / Çiftlik":"畜産・牧場", "Gıda Üretimi":"食品生産", "Tekstil / Konfeksiyon":"繊維・アパレル",
  "İnşaat Malzemesi":"建材", "Mobilya / Ahşap":"家具・木材", "Metal / Makine":"金属・機械", "Plastik / Ambalaj":"プラスチック・包装",
  "Kimya / Kozmetik Üretimi":"化学・化粧品製造", "Lojistik / Dağıtım":"物流・配送", "El Sanatları / Atölye":"手工芸・工房",
  "İçecek / Su Üretimi":"飲料・水生産", "Un / Fırın Ürünleri":"小麦粉・製パン", "Zeytin / Yağ Üretimi":"オリーブ・油生産",
  "Hırdavat / Nalbur Toptan":"金物卸売", "Elektrik / Elektronik Üretim":"電気・電子製造", "İlaç / Medikal Üretim":"医薬・医療生産",
  "Et İşleme Fabrikası":"食肉加工工場", "Süt / Mandıra Ürünleri":"乳製品", "Konserve / Salça":"缶詰・トマトペースト",
  "Dondurma / Şekerleme":"アイスクリーム・菓子", "Deri / Ayakkabı Üretimi":"皮革・靴製造", "Cam / Seramik":"ガラス・陶磁器",
  "Kağıt / Karton":"紙・段ボール", "Maden / Mermer / Doğal Taş":"鉱業・大理石・石材", "Gübre / Tarım İlacı":"肥料・農薬",
  "Yem / Hayvan Besini":"飼料", "Geri Dönüşüm":"リサイクル", "Enerji / Yenilenebilir":"エネルギー・再生可能",
  "Makyaj Sanatçısı":"メイクアップアーティスト", "Kuaför":"美容師", "Berber":"理髪師", "Cilt Bakımı":"スキンケア",
  "Tırnak Sanatçısı":"ネイリスト", "Kaş / Kirpik":"眉・まつ毛", "Masaj Terapisti":"マッサージ師", "Dövme Sanatçısı":"タトゥーアーティスト",
  "Fotoğrafçı":"写真家", "Kameraman":"ビデオグラファー", "Müzisyen":"ミュージシャン", "DJ":"DJ", "Dansçı":"ダンサー",
  "Tasarımcı":"デザイナー", "İç Mimar":"インテリアデザイナー", "Terzi / Moda":"仕立て屋・ファッション", "Doktor":"医師",
  "Diş Hekimi":"歯科医", "Psikolog":"心理士", "Diyetisyen":"栄養士", "Fizyoterapist":"理学療法士", "Avukat":"弁護士",
  "Mali Müşavir":"会計士", "Mühendis":"エンジニア", "Mimar":"建築家", "Öğretmen":"教師", "Tercüman":"翻訳者",
  "Yazılımcı":"ソフトウェア開発者", "Restoran / Cafe":"レストラン・カフェ", "Pastane":"ケーキ店", "Çiçekçi":"花屋",
  "Organizasyon":"イベント企画", "Emlakçı":"不動産業者", "Oto Tamir":"自動車修理", "Elektrikçi":"電気工", "Tesisatçı":"配管工",
  "Temizlik":"清掃", "Nakliyat":"運送・引越", "Özel Ders":"家庭教師", "Spor Eğitmeni":"フィットネストレーナー",
  "Yoga / Pilates":"ヨガ・ピラティス", "Bakıcı / Dadı":"ベビーシッター・介護者", "Veteriner":"獣医", "Kurye":"宅配員",
  "Galerici":"ギャラリー", "Marketçi / Bakkal":"食料品店", "Oto Galerici":"自動車販売店", "Kasap Dükkanı":"精肉店",
  "Fırın / Ekmek":"パン屋", "Eczacı":"薬剤師", "Optisyen":"眼鏡士", "Kuyumcu":"宝石商", "Kırtasiyeci":"文房具店",
  "Teknik Servis":"技術サービス", "Otelci / Pansiyon":"ホテル・民宿", "Kafeci / Barista":"カフェ・バリスタ", "Barmen":"バーテンダー",
  "Matbaacı":"印刷業", "Saat Tamircisi":"時計修理", "Ayakkabıcı":"靴店", "Mobilyacı":"家具店", "Peyzaj / Bahçe":"造園・ガーデン",
  "Seyahat / Tur":"旅行・ツアー", "Sigortacı":"保険代理店", "Sanatçı / Ressam":"芸術家・画家", "Bankacı / Banka":"銀行・銀行員",
  "Dövizci":"両替商", "Gazete / Medya":"新聞・メディア", "Benzin İstasyonu":"ガソリンスタンド", "Oto Yıkama":"洗車",
  "Lastikçi":"タイヤ店", "Araç Kiralama":"レンタカー", "Giyim Mağazası":"衣料品店", "Elektronik / Beyaz Eşya":"電子機器・家電",
  "Telefon / GSM Bayi":"携帯電話ショップ", "Bilgisayarcı":"パソコン店", "Nalbur / Hırdavat":"金物店", "Oyuncakçı":"おもちゃ店",
  "Pet Shop / Evcil Hayvan":"ペットショップ", "Parfümeri / Kozmetik":"香水・化粧品", "Manav":"八百屋", "Şarküteri":"デリカテッセン",
  "Balıkçı":"鮮魚店", "Kuruyemişçi":"ナッツ店", "Su / İçecek Bayi":"水・飲料販売", "Tatlıcı / Dondurma":"スイーツ・アイス",
  "Döner / Fast Food":"ケバブ・ファストフード", "Çilingir / Anahtarcı":"鍵屋", "Cam / Ayna":"ガラス・鏡", "Klima / Soğutma":"エアコン・冷却",
  "Halı Yıkama":"絨毯洗浄", "Kuru Temizleme":"ドライクリーニング", "Noter":"公証人", "Danışmanlık":"コンサルティング",
  "Reklam / Ajans":"広告・代理店", "Web / Dijital":"ウェブ・デジタル", "Sürücü Kursu":"自動車教習所", "Kreş / Anaokulu":"保育園・幼稚園",
  "Müzik Kursu":"音楽教室", "Spor Salonu / Fitness":"ジム・フィットネス", "Düğün Salonu":"結婚式場", "İnşaat Firması":"建設会社",
  "PVC / Doğrama":"PVC・建具", "Klinik / Poliklinik":"クリニック", "Güvenlik / Kamera Sistemleri":"警備・防犯カメラ",
  "Garson":"ウェイター", "Kasiyer":"レジ係", "Aşçı / Mutfak":"料理人・厨房", "Komi / Bulaşık":"見習い・皿洗い",
  "Temizlik Görevlisi":"清掃員", "Şoför":"運転手", "Kurye / Motokurye":"配達員・バイク便", "Tezgâhtar":"店員",
  "Depo / Ambar":"倉庫", "İnşaat İşçisi":"建設作業員", "Boyacı / Badana":"塗装工", "Kalfa / Çırak":"見習い職人",
  "Bakıcı / Yaşlı Bakım":"高齢者介護", "Çocuk Bakıcı":"ベビーシッター", "Bahçıvan":"庭師", "İşçi / Fabrika":"工員・工場",
  "Paketleme":"梱包", "Servis Elemanı":"サービススタッフ", "Barista":"バリスタ", "Fırın Elemanı":"パン店スタッフ",
  "Berber Kalfası":"理髪助手", "Kuaför Kalfası":"美容助手", "Terzi Elemanı":"仕立て助手", "Tamirci Yardımcısı":"修理助手",
  "Cam / Boya":"ガラス・塗装", "Hamal / Taşıyıcı":"運搬人", "Vale / Otopark":"駐車係", "Kapıcı":"管理人・門番",
  "Çağrı Merkezi":"コールセンター", "Veri Girişi":"データ入力", "Stajyer":"インターン", "Hemşire Yardımcısı":"看護助手",
  "Laborant":"臨床検査技師", "Satış Elemanı":"販売員", "Reyon Görevlisi":"品出し係", "Bekçi":"警備員", "Çay Ocağı":"給茶係",
  "Hemşire":"看護師", "Sağlık Personeli":"医療スタッフ", "Garson Yardımcısı":"ウェイター助手", "Otobüs / TIR Şoförü":"バス・トラック運転手",
  "Tekstil İşçisi":"繊維工", "Makine Operatörü":"機械オペレーター", "Elektrik Yardımcısı":"電気工助手", "Tesisat Yardımcısı":"配管工助手",
  "Tarım İşçisi":"農業労働者", "Usta Yardımcısı":"職人助手", "Salon Çalışanı":"サロンスタッフ", "Mağaza Çalışanı":"店舗スタッフ",
  "Ofis Elemanı":"事務員", "Mutfak Yardımcısı":"厨房助手", "Spa / Hamam Çalışanı":"スパ・浴場スタッフ", "Kaynakçı":"溶接工",
  "Marangoz":"大工", "Sıvacı / Fayansçı":"左官・タイル工", "Forklift Operatörü":"フォークリフト運転手",
  "Resepsiyon / Sekreter":"受付・秘書", "Muhasebe Elemanı":"経理担当", "Pazarlama Elemanı":"マーケティング担当",
  "Ütücü / Kuru Temizleme":"アイロン・ドライクリーニング", "Ev İşleri / Yardımcı":"家事手伝い", "Animatör / Sunucu":"アニメーター・司会",
};
// Japonca adları meslekCevir'e işle (varsa ja alanını ekler)
for (const _k in meslekJa) { if (meslekCevir[_k]) meslekCevir[_k].ja = meslekJa[_k]; }
// Eksik meslek adlarının 12 dile çevirisi (meslekCevirEk.js) — meslekCevir'e ekle (B119)
Object.assign(meslekCevir, MESLEK_EK, MESLEK_EK2, MESLEK_EK3, MESLEK_EK4, MESLEK_EK5);

// Meslek adı çevirisi: o dilde varsa onu, yoksa Türkçe adı döndürür.
export function mc(ad, lng) {
  const k = (lng || "tr").split("-")[0];
  if (k === "tr") return ad;
  return (meslekCevir[ad] && meslekCevir[ad][k]) || ad;
}

export default i18n;
