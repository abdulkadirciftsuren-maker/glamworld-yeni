// GLAMWORLD - DUNYA ULKELERI (tam liste, ~120 ulke)
// Kullanici yazdikca bu listeden eslesen ulkeler siralanir (bayrak + ad + kod).
// Tanimadigi yeri de KABUL eder (her yer yazilabilir). Sabit zorlamasi YOK.
// NOT: Adres bolumu (ulke/sehir/ilce) artik PHOTON (gercek harita) kullanir.
//      Telefon kodu bolumu bu listeyi kullanir (kod+bayrak gerektigi icin).

const ULKELER = [
  { kod:"TR", tel:"+90", ad:"Turkiye", ara:["turkiye","türkiye","turkey"] },
  { kod:"DE", tel:"+49", ad:"Almanya", ara:["almanya","germany","deutschland"] },
  { kod:"US", tel:"+1", ad:"Amerika", ara:["amerika","abd","amerika birlesik devletleri","usa","united","states","america"] },
  { kod:"GB", tel:"+44", ad:"Ingiltere", ara:["ingiltere","birlesik krallik","uk","united","kingdom","britain","england"] },
  { kod:"FR", tel:"+33", ad:"Fransa", ara:["fransa","france"] },
  { kod:"IT", tel:"+39", ad:"Italya", ara:["italya","italy","italia"] },
  { kod:"ES", tel:"+34", ad:"Ispanya", ara:["ispanya","spain","espana"] },
  { kod:"NL", tel:"+31", ad:"Hollanda", ara:["hollanda","netherlands","holland"] },
  { kod:"BE", tel:"+32", ad:"Belcika", ara:["belcika","belçika","belgium"] },
  { kod:"AT", tel:"+43", ad:"Avusturya", ara:["avusturya","austria"] },
  { kod:"CH", tel:"+41", ad:"Isvicre", ara:["isvicre","isviçre","switzerland"] },
  { kod:"SE", tel:"+46", ad:"Isvec", ara:["isvec","isveç","sweden"] },
  { kod:"NO", tel:"+47", ad:"Norvec", ara:["norvec","norveç","norway"] },
  { kod:"DK", tel:"+45", ad:"Danimarka", ara:["danimarka","denmark"] },
  { kod:"FI", tel:"+358", ad:"Finlandiya", ara:["finlandiya","finland"] },
  { kod:"PL", tel:"+48", ad:"Polonya", ara:["polonya","poland"] },
  { kod:"RU", tel:"+7", ad:"Rusya", ara:["rusya","russia"] },
  { kod:"UA", tel:"+380", ad:"Ukrayna", ara:["ukrayna","ukraine"] },
  { kod:"GR", tel:"+30", ad:"Yunanistan", ara:["yunanistan","greece"] },
  { kod:"PT", tel:"+351", ad:"Portekiz", ara:["portekiz","portugal"] },
  { kod:"IE", tel:"+353", ad:"Irlanda", ara:["irlanda","ireland"] },
  { kod:"CZ", tel:"+420", ad:"Cekya", ara:["cekya","çekya","cek cumhuriyeti","czechia","czech"] },
  { kod:"HU", tel:"+36", ad:"Macaristan", ara:["macaristan","hungary"] },
  { kod:"RO", tel:"+40", ad:"Romanya", ara:["romanya","romania"] },
  { kod:"BG", tel:"+359", ad:"Bulgaristan", ara:["bulgaristan","bulgaria"] },
  { kod:"HR", tel:"+385", ad:"Hirvatistan", ara:["hirvatistan","hırvatistan","croatia"] },
  { kod:"RS", tel:"+381", ad:"Sirbistan", ara:["sirbistan","sırbistan","serbia"] },
  { kod:"BA", tel:"+387", ad:"Bosna", ara:["bosna","bosna hersek","bosnia"] },
  { kod:"AL", tel:"+355", ad:"Arnavutluk", ara:["arnavutluk","albania"] },
  { kod:"MK", tel:"+389", ad:"Makedonya", ara:["makedonya","kuzey makedonya","macedonia"] },
  { kod:"SI", tel:"+386", ad:"Slovenya", ara:["slovenya","slovenia"] },
  { kod:"SK", tel:"+421", ad:"Slovakya", ara:["slovakya","slovakia"] },
  { kod:"LT", tel:"+370", ad:"Litvanya", ara:["litvanya","lithuania"] },
  { kod:"LV", tel:"+371", ad:"Letonya", ara:["letonya","latvia"] },
  { kod:"EE", tel:"+372", ad:"Estonya", ara:["estonya","estonia"] },
  { kod:"IS", tel:"+354", ad:"Izlanda", ara:["izlanda","iceland"] },
  { kod:"LU", tel:"+352", ad:"Luksemburg", ara:["luksemburg","lüksemburg","luxembourg"] },
  { kod:"MT", tel:"+356", ad:"Malta", ara:["malta","malta"] },
  { kod:"CY", tel:"+357", ad:"Kibris", ara:["kibris","kıbrıs","cyprus"] },
  { kod:"AZ", tel:"+994", ad:"Azerbaycan", ara:["azerbaycan","azerbaijan"] },
  { kod:"GE", tel:"+995", ad:"Gurcistan", ara:["gurcistan","gürcistan","georgia"] },
  { kod:"AM", tel:"+374", ad:"Ermenistan", ara:["ermenistan","armenia"] },
  { kod:"KZ", tel:"+7", ad:"Kazakistan", ara:["kazakistan","kazakhstan"] },
  { kod:"UZ", tel:"+998", ad:"Ozbekistan", ara:["ozbekistan","özbekistan","uzbekistan"] },
  { kod:"TM", tel:"+993", ad:"Turkmenistan", ara:["turkmenistan","türkmenistan","turkmenistan"] },
  { kod:"KG", tel:"+996", ad:"Kirgizistan", ara:["kirgizistan","kırgızistan","kyrgyzstan"] },
  { kod:"TJ", tel:"+992", ad:"Tacikistan", ara:["tacikistan","tajikistan"] },
  { kod:"IR", tel:"+98", ad:"Iran", ara:["iran","iran"] },
  { kod:"IQ", tel:"+964", ad:"Irak", ara:["irak","iraq"] },
  { kod:"SY", tel:"+963", ad:"Suriye", ara:["suriye","syria"] },
  { kod:"LB", tel:"+961", ad:"Lubnan", ara:["lubnan","lübnan","lebanon"] },
  { kod:"IL", tel:"+972", ad:"Israil", ara:["israil","filistin","israel","palestine"] },
  { kod:"JO", tel:"+962", ad:"Urdun", ara:["urdun","ürdün","jordan"] },
  { kod:"SA", tel:"+966", ad:"Suudi Arabistan", ara:["suudi arabistan","suudi","saudi","arabia"] },
  { kod:"AE", tel:"+971", ad:"Birlesik Arap Emirlikleri", ara:["birlesik arap emirlikleri","bae","dubai","uae","emirates"] },
  { kod:"QA", tel:"+974", ad:"Katar", ara:["katar","qatar"] },
  { kod:"KW", tel:"+965", ad:"Kuveyt", ara:["kuveyt","kuwait"] },
  { kod:"BH", tel:"+973", ad:"Bahreyn", ara:["bahreyn","bahrain"] },
  { kod:"OM", tel:"+968", ad:"Umman", ara:["umman","oman"] },
  { kod:"YE", tel:"+967", ad:"Yemen", ara:["yemen","yemen"] },
  { kod:"EG", tel:"+20", ad:"Misir", ara:["misir","mısır","egypt"] },
  { kod:"MA", tel:"+212", ad:"Fas", ara:["fas","morocco"] },
  { kod:"DZ", tel:"+213", ad:"Cezayir", ara:["cezayir","algeria"] },
  { kod:"TN", tel:"+216", ad:"Tunus", ara:["tunus","tunisia"] },
  { kod:"LY", tel:"+218", ad:"Libya", ara:["libya","libya"] },
  { kod:"SD", tel:"+249", ad:"Sudan", ara:["sudan","sudan"] },
  { kod:"ZA", tel:"+27", ad:"Guney Afrika", ara:["guney afrika","güney afrika","south","africa"] },
  { kod:"NG", tel:"+234", ad:"Nijerya", ara:["nijerya","nigeria"] },
  { kod:"KE", tel:"+254", ad:"Kenya", ara:["kenya","kenya"] },
  { kod:"ET", tel:"+251", ad:"Etiyopya", ara:["etiyopya","ethiopia"] },
  { kod:"GH", tel:"+233", ad:"Gana", ara:["gana","ghana"] },
  { kod:"TZ", tel:"+255", ad:"Tanzanya", ara:["tanzanya","tanzania"] },
  { kod:"UG", tel:"+256", ad:"Uganda", ara:["uganda","uganda"] },
  { kod:"SN", tel:"+221", ad:"Senegal", ara:["senegal","senegal"] },
  { kod:"CI", tel:"+225", ad:"Fildisi Sahili", ara:["fildisi sahili","fildişi","ivory","coast"] },
  { kod:"CM", tel:"+237", ad:"Kamerun", ara:["kamerun","cameroon"] },
  { kod:"AO", tel:"+244", ad:"Angola", ara:["angola","angola"] },
  { kod:"MZ", tel:"+258", ad:"Mozambik", ara:["mozambik","mozambique"] },
  { kod:"ZW", tel:"+263", ad:"Zimbabve", ara:["zimbabve","zimbabwe"] },
  { kod:"CN", tel:"+86", ad:"Cin", ara:["cin","çin","china"] },
  { kod:"JP", tel:"+81", ad:"Japonya", ara:["japonya","japan"] },
  { kod:"KR", tel:"+82", ad:"Guney Kore", ara:["guney kore","güney kore","kore","south","korea"] },
  { kod:"KP", tel:"+850", ad:"Kuzey Kore", ara:["kuzey kore","north","korea"] },
  { kod:"IN", tel:"+91", ad:"Hindistan", ara:["hindistan","india"] },
  { kod:"PK", tel:"+92", ad:"Pakistan", ara:["pakistan","pakistan"] },
  { kod:"BD", tel:"+880", ad:"Banglades", ara:["banglades","bangladesh"] },
  { kod:"LK", tel:"+94", ad:"Sri Lanka", ara:["sri lanka","sri","lanka"] },
  { kod:"NP", tel:"+977", ad:"Nepal", ara:["nepal","nepal"] },
  { kod:"AF", tel:"+93", ad:"Afganistan", ara:["afganistan","afghanistan"] },
  { kod:"ID", tel:"+62", ad:"Endonezya", ara:["endonezya","indonesia"] },
  { kod:"MY", tel:"+60", ad:"Malezya", ara:["malezya","malaysia"] },
  { kod:"TH", tel:"+66", ad:"Tayland", ara:["tayland","thailand"] },
  { kod:"VN", tel:"+84", ad:"Vietnam", ara:["vietnam","vietnam"] },
  { kod:"PH", tel:"+63", ad:"Filipinler", ara:["filipinler","philippines"] },
  { kod:"SG", tel:"+65", ad:"Singapur", ara:["singapur","singapore"] },
  { kod:"MM", tel:"+95", ad:"Myanmar", ara:["myanmar","burma","myanmar"] },
  { kod:"KH", tel:"+855", ad:"Kambocya", ara:["kambocya","kamboçya","cambodia"] },
  { kod:"LA", tel:"+856", ad:"Laos", ara:["laos","laos"] },
  { kod:"MN", tel:"+976", ad:"Mogolistan", ara:["mogolistan","moğolistan","mongolia"] },
  { kod:"HK", tel:"+852", ad:"Hong Kong", ara:["hong kong","hong","kong"] },
  { kod:"TW", tel:"+886", ad:"Tayvan", ara:["tayvan","taiwan"] },
  { kod:"AU", tel:"+61", ad:"Avustralya", ara:["avustralya","australia"] },
  { kod:"NZ", tel:"+64", ad:"Yeni Zelanda", ara:["yeni zelanda","new","zealand"] },
  { kod:"CA", tel:"+1", ad:"Kanada", ara:["kanada","canada"] },
  { kod:"MX", tel:"+52", ad:"Meksika", ara:["meksika","mexico"] },
  { kod:"BR", tel:"+55", ad:"Brezilya", ara:["brezilya","brazil"] },
  { kod:"AR", tel:"+54", ad:"Arjantin", ara:["arjantin","argentina"] },
  { kod:"CL", tel:"+56", ad:"Sili", ara:["sili","şili","chile"] },
  { kod:"CO", tel:"+57", ad:"Kolombiya", ara:["kolombiya","colombia"] },
  { kod:"PE", tel:"+51", ad:"Peru", ara:["peru","peru"] },
  { kod:"VE", tel:"+58", ad:"Venezuela", ara:["venezuela","venezuela"] },
  { kod:"EC", tel:"+593", ad:"Ekvador", ara:["ekvador","ecuador"] },
  { kod:"BO", tel:"+591", ad:"Bolivya", ara:["bolivya","bolivia"] },
  { kod:"PY", tel:"+595", ad:"Paraguay", ara:["paraguay","paraguay"] },
  { kod:"UY", tel:"+598", ad:"Uruguay", ara:["uruguay","uruguay"] },
  { kod:"CU", tel:"+53", ad:"Kuba", ara:["kuba","cuba"] },
  { kod:"DO", tel:"+1", ad:"Dominik", ara:["dominik","dominican"] },
  { kod:"GT", tel:"+502", ad:"Guatemala", ara:["guatemala","guatemala"] },
  { kod:"CR", tel:"+506", ad:"Kosta Rika", ara:["kosta rika","costa","rica"] },
  { kod:"PA", tel:"+507", ad:"Panama", ara:["panama","panama"] },
];

// ISO kodundan bayrak emojisi (TR -> bayrak) - telefonda guzel gorunur
export function bayrakEmoji(kod) {
  if (!kod || kod.length !== 2) return "";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + (kod.charCodeAt(0) - 65)) +
         String.fromCodePoint(A + (kod.charCodeAt(1) - 65));
}

// ISO kodundan GERCEK bayrak resmi URL'i (Windows/bilgisayar dahil HER YERDE gorunur)
// flagcdn.com ucretsiz, hizli, tum dunya bayraklari
export function bayrakURL(kod) {
  if (!kod || kod.length !== 2) return "";
  return "https://flagcdn.com/w40/" + kod.toLowerCase() + ".png";
}

// Ulke adindan TEK eslesme bul: {kod, tel, bayrak, ad} | null
export function ulkeTani(metin) {
  if (!metin) return null;
  const t = metin.trim().toLowerCase();
  if (t.length < 2) return null;
  for (const u of ULKELER) {
    if (u.ara.some((a) => a === t)) return { kod: u.kod, tel: u.tel, bayrak: bayrakEmoji(u.kod), ad: u.ad };
  }
  // tam eslesme yoksa, baslangic eslesmesi
  for (const u of ULKELER) {
    if (u.ara.some((a) => a.startsWith(t))) return { kod: u.kod, tel: u.tel, bayrak: bayrakEmoji(u.kod), ad: u.ad };
  }
  return null;
}

// Yazdikca SIRALAMA: metne uyan ulkeleri don (en fazla 8)
export function ulkeAra(metin) {
  const t = (metin || "").trim().toLowerCase();
  if (!t) return [];
  const tam = [], bas = [], ic = [];
  for (const u of ULKELER) {
    const b = bayrakEmoji(u.kod);
    const kayit = { kod: u.kod, tel: u.tel, bayrak: b, ad: u.ad };
    if (u.ara.some((a) => a === t)) tam.push(kayit);
    else if (u.ara.some((a) => a.startsWith(t))) bas.push(kayit);
    else if (u.ara.some((a) => a.includes(t))) ic.push(kayit);
  }
  return [...tam, ...bas, ...ic].slice(0, 8);
}

// Telefon kodu icin: yazilan metne (ad veya +kod) gore sirala
export function telKodAra(metin) {
  const t = (metin || "").trim().toLowerCase().replace("+", "");
  if (!t) return [];
  const sonuc = [];
  for (const u of ULKELER) {
    const adEs = u.ara.some((a) => a.startsWith(t) || a.includes(t));
    const telEs = u.tel.replace("+", "").startsWith(t);
    if (adEs || telEs) sonuc.push({ kod: u.kod, tel: u.tel, bayrak: bayrakEmoji(u.kod), ad: u.ad });
  }
  return sonuc.slice(0, 10);
}

// Telefon kodundan bayrak bul (+49 -> Almanya bayragi)
export function telKodBayrak(tel) {
  const u = ULKELER.find((x) => x.tel === tel);
  return u ? bayrakEmoji(u.kod) : "";
}

// AKILLI TELEFON AYIKLAMA: numaranin basinda HANGI ulke kodu varsa ayikla
// seciliKod: o an secili olan kod (+49 gibi) - oncelikli kontrol edilir
// Tum dunya kodlarini tanir, en uzun eslesmeyi ayiklar (yanlis kesmeyi onler)
export function telefonAyikla(ham, seciliKod) {
  let v = (ham || "").replace(/\D/g, ""); // sadece rakam
  if (!v) return "";
  // 1) bastaki uluslararasi "00" on ekini temizle (0049 -> 49)
  const vardiSifirSifir = v.startsWith("00");
  v = v.replace(/^00/, "");
  // 2) once SECILI kodu dene (en guvenli - kullanici o ulkeyi sectiyse)
  //    AMA tek haneli kod (+1 Amerika) icin sadece "00" on eki vardiysa ayikla
  //    (yoksa "1" ile baslayan normal numarayi yanlis keser)
  const secili = (seciliKod || "").replace(/\D/g, "");
  if (secili && v.startsWith(secili) && v.length - secili.length >= 6 &&
      (secili.length >= 2 || vardiSifirSifir)) {
    v = v.slice(secili.length);
  } else if (vardiSifirSifir) {
    // 3a) "00" on eki vardiysa kesin uluslararasi format -> herhangi kodu ayikla
    const kodlar = [...new Set(ULKELER.map((u) => u.tel.replace(/\D/g, "")))]
      .filter((k) => k.length >= 2).sort((a, b) => b.length - a.length);
    for (const k of kodlar) {
      if (v.startsWith(k) && v.length - k.length >= 6) { v = v.slice(k.length); break; }
    }
  } else if (v.length >= 12) {
    // 3b) "00" yok ama numara COK uzun (12+) -> bastaki bir ulke kodu yapismis olabilir
    //     SADECE 2-3 haneli kodlari dene (tek haneli "1" haric, gercek basini kesmesin)
    const kodlar = [...new Set(ULKELER.map((u) => u.tel.replace(/\D/g, "")))]
      .filter((k) => k.length >= 2).sort((a, b) => b.length - a.length);
    for (const k of kodlar) {
      if (v.startsWith(k) && v.length - k.length >= 9) { v = v.slice(k.length); break; }
    }
  }
  // 4) bastaki sifirlari sil (0151 -> 151)
  v = v.replace(/^0+/, "");
  return v;
}

// Harita demo noktalari (YAYINDA gercek Google Haritalar - Code kuracak)
// SEHIR ARAMA: secili ulkede, yazilan harfle baslayan sehirleri internetten getir
// Ucretsiz OpenStreetMap/Nominatim - key yok. ulkeKodu: ISO (TR, DE...)
// Donen: [{ad, ilce}] listesi (max ~8)
// Turkce harf duyarsiz karsilastirma icin normalize (I İ ı i, ş s, ç c, ...)
function trNormal(s) {
  return (s || "").toLowerCase()
    .replace(/ı/g, "i").replace(/i̇/g, "i")
    .replace(/İ/g, "i").replace(/I/g, "i")
    .replace(/ş/g, "s").replace(/ç/g, "c")
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o");
}

// ============ ADRES BOLUMU: PHOTON (gercek harita, internetten) ============
// Photon = OpenStreetMap'in yazdikca-arama servisi. Yazim hatasi affeder, dunya capinda.
// ONEMLI: Photon lang=tr DESTEKLEMIYOR (sadece default/en/de/fr). lang YOK gonderiyoruz.
// Gomulu liste YOK - her sey internetten gelir (site zaten internetle calisir).
const PHOTON = "https://photon.komoot.io/api/";

// ============================================================
// ULKE ARAMA - sadece ULKE onerir (bayrakli)
// ============================================================
export async function adresUlkeAra(metin) {
  const t = (metin || "").trim();
  if (t.length < 2) return [];
  const tl = trNormal(t);
  // 1) ONCE kendi listemizden (alman->Almanya garantili, Albania karismaz)
  const baslayan = [], iceren = [];
  for (const u of ULKELER) {
    const adNorm = trNormal(u.ad);
    const eslesmeBas = adNorm.startsWith(tl) || u.ara.some((a) => trNormal(a).startsWith(tl));
    const eslesmeIc = adNorm.includes(tl) || u.ara.some((a) => trNormal(a).includes(tl));
    if (eslesmeBas) baslayan.push({ ad: u.ad, iso: u.kod });
    else if (eslesmeIc) iceren.push({ ad: u.ad, iso: u.kod });
  }
  const kendiListe = [...baslayan, ...iceren];
  // Eger kendi listemizde BASLAYAN eslesme varsa, Photon'a gerek yok (kesin dogru)
  if (baslayan.length > 0) return kendiListe.slice(0, 8);
  // 2) Kendi listede yoksa Photon (dunyadaki diger ulkeler)
  try {
    const r = await fetch(`${PHOTON}?q=${encodeURIComponent(t)}&limit=10&osm_tag=place:country&layer=country`);
    const d = await r.json();
    const gorulen = new Set(kendiListe.map((x) => x.ad));
    const sonuc = [...kendiListe];
    for (const f of (d.features || [])) {
      const p = f.properties || {};
      const ad = p.country || p.name;
      const iso = p.countrycode || "";
      if (!ad || gorulen.has(ad)) continue;
      gorulen.add(ad);
      sonuc.push({ ad, iso });
    }
    return sonuc.slice(0, 8);
  } catch (e) {
    return kendiListe.slice(0, 8);
  }
}

// ============================================================
// SEHIR ARAMA - SADECE SEHIR onerir (il/buyuksehir). Ilce/mahalle ASLA.
// Photon osm_value: city, town, state -> sehir kabul. district/suburb/village -> RED.
// ============================================================
export async function sehirAra(metin, ulkeKodu) {
  const t = (metin || "").trim();
  if (t.length < 2) return [];
  try {
    const r = await fetch(`${PHOTON}?q=${encodeURIComponent(t)}&limit=15&layer=city&layer=state`);
    const d = await r.json();
    const gorulen = new Set();
    const sonuc = [];
    for (const f of (d.features || [])) {
      const p = f.properties || {};
      const anahtar = p.osm_key || "";
      const tur = p.osm_value || "";
      // SADECE yerlesim (place) + sehir seviyesi. Sokak/bina/dukkan RED.
      if (anahtar !== "place" && anahtar !== "boundary") continue;
      const sehirMi = ["city", "town", "municipality", "state", "province", "region", "administrative"].includes(tur);
      if (!sehirMi) continue;
      const ad = p.name || p.city;
      const bolge = (p.state && p.state !== ad) ? p.state : "";
      if (!ad || gorulen.has(ad)) continue;
      gorulen.add(ad);
      sonuc.push({ ad, bolge });
    }
    return sonuc.slice(0, 8);
  } catch (e) {
    return [];
  }
}

// ============================================================
// ILCE ARAMA - SADECE ILCE onerir. Mahalle/koy/semt ASLA.
// Photon osm_value: district, county, borough -> ilce. suburb/village/neighbourhood -> RED.
// ============================================================
export async function ilceAra(metin, ulkeKodu, sehirAdi) {
  const t = (metin || "").trim();
  if (t.length < 2) return [];
  try {
    const sorgu = sehirAdi ? `${t} ${sehirAdi}` : t;
    const r = await fetch(`${PHOTON}?q=${encodeURIComponent(sorgu)}&limit=15&layer=city&layer=district`);
    const d = await r.json();
    const gorulen = new Set();
    const sonuc = [];
    for (const f of (d.features || [])) {
      const p = f.properties || {};
      const anahtar = p.osm_key || "";
      const tur = p.osm_value || "";
      if (anahtar !== "place" && anahtar !== "boundary") continue;
      // Mahalle (suburb, neighbourhood, quarter, village, hamlet, locality) RED.
      const mahalleSeviye = ["suburb", "neighbourhood", "quarter", "village", "hamlet", "locality", "isolated_dwelling"].includes(tur);
      if (mahalleSeviye) continue;
      const ilceSeviye = ["district", "county", "borough", "city", "town", "municipality", "administrative"].includes(tur);
      if (!ilceSeviye) continue;
      const ad = p.district || p.county || p.city || p.name;
      const bolge = [p.city, p.state].filter(Boolean).filter((x) => x !== ad).join(", ");
      if (!ad || gorulen.has(ad) || ad === sehirAdi) continue;
      gorulen.add(ad);
      sonuc.push({ ad, bolge });
    }
    return sonuc.slice(0, 8);
  } catch (e) {
    return [];
  }
}

// ============================================================
// MAHALLE/KOY ARAMA - SADECE mahalle/koy/semt onerir.
// Photon osm_value: suburb, neighbourhood, quarter, village, hamlet, locality.
// ============================================================
export async function mahalleAra(metin, sehirAdi, ilceAdi) {
  const t = (metin || "").trim();
  if (t.length < 2) return [];
  try {
    const baglamYer = [ilceAdi, sehirAdi].filter(Boolean).join(" ");
    const sorgu = baglamYer ? `${t} ${baglamYer}` : t;
    const r = await fetch(`${PHOTON}?q=${encodeURIComponent(sorgu)}&limit=15`);
    const d = await r.json();
    const gorulen = new Set();
    const sonuc = [];
    for (const f of (d.features || [])) {
      const p = f.properties || {};
      const anahtar = p.osm_key || "";
      const tur = p.osm_value || "";
      if (anahtar !== "place") continue;
      // SADECE mahalle/koy seviyesi.
      const mahalleSeviye = ["suburb", "neighbourhood", "quarter", "village", "hamlet", "locality", "residential", "isolated_dwelling", "city_block"].includes(tur);
      if (!mahalleSeviye) continue;
      const ad = p.name || p.suburb || p.locality;
      const bolge = [p.district, p.city, p.state].filter(Boolean).filter((x) => x !== ad).join(", ");
      if (!ad || gorulen.has(ad) || ad === sehirAdi || ad === ilceAdi) continue;
      gorulen.add(ad);
      sonuc.push({ ad, bolge });
    }
    return sonuc.slice(0, 8);
  } catch (e) {
    return [];
  }
}

export default ULKELER;
