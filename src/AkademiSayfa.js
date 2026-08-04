// ═══════════════════════════════════════════════════════════════════════════
// AKADEMİ — İKİ KATMANLI EĞİTİM + Gloxoo CİDDİ SINAV + "işini göster" + GLOXORG SERTİFİKASI
// ─────────────────────────────────────────────────────────────────────────────
// Akış: (1) Meslek seç →
//   (2) TEMEL EĞİTİM — Gloxoo meslek hakkında genel eğitim verir (tamamlanır, kesilmez) →
//   (3) ÇEŞİTLER/KONULAR — her tür/ürün TEK TEK: ölçüsü + yapılışı (hamurcu: her hamur; kuaför: her kesim;
//       tırnak: her model). Kullanıcı çeşide dokunur, Gloxoo o çeşidi ölçü/adım ile eksiksiz anlatır →
//   (4) CİDDİ SINAV — profesyonel, zor, anlatılan içerikten (geçme ≥%70) →
//   (5) İşini foto/video ile göster →
//   (6) doğrulanabilir GLOXORG sertifikası (kod + QR).
// DÜRÜST: Bu GLOXORG belgesidir; "uluslararası resmî" DEĞİL (o ancak resmî akreditasyonla olur).
// GÖRSELLİ/VİDEOLU gösterim + "kendi fotoğrafında dene" görsel yapay zekâ ister (paralı) → SIRADA.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MESLEK_LISTESI } from "./meslekler";
import { mc } from "./i18n"; // meslek adını kullanıcının diline çevir (Berber→Барбер…)
import qrOlustur from "qrcode-generator";
import { akademiKayitEkle, akademiKayitlarimOku, gorselYukle, videoYukle, akademiGorselOku, akademiGorselYaz } from "./veri";
import { gloxooResimUret } from "./firebase"; // ana uygulamayla AYNI çalışan Google/Gemini görsel üretimi (worker OpenAI değil)

// Dosyayı base64'e oku (foto yüklemek için)
function dosyaOku(file) { return new Promise((res) => { try { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(""); r.readAsDataURL(file); } catch (e) { res(""); } }); }
// Benzersiz sertifika kodu (GLX-...)
function kodUret() { return "GLX-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase(); }
// Dil koduna göre AI'ya "hangi dilde yaz" talimatı
const DIL_AD = { tr: "Türkçe", en: "English", de: "Almanca (Deutsch)", fr: "Fransızca", es: "İspanyolca", it: "İtalyanca", pt: "Portekizce", ru: "Rusça", uk: "Ukraynaca", ar: "Arapça", zh: "Çince", ja: "Japonca", hi: "Hintçe" };

// AI ders başlıkları (SÖZLÜK, MALZEME VE ÖLÇÜLER…) eskiden Türkçe komuta gömülü olduğu için Türkçe/yarı-çeviri kalıyordu.
// Artık başlığı AI'ye BIRAKMIYORUZ — 13 dile hazır çevirisini KENDİMİZ ekliyoruz; AI sadece gövdeyi kendi dilinde yazıyor.
const AK_ISARET = "◆ "; // başlık satırı işareti (satirBaslikMi bunu tanır, ekranda gizlenir; her dilde başlık kutusu çalışsın diye)
const AK_BASLIK = {
  nedir: { tr:"BU MESLEK NEDİR", en:"WHAT THIS PROFESSION IS", de:"WAS DIESER BERUF IST", ru:"ЧТО ЭТО ЗА ПРОФЕССИЯ", uk:"ЩО ЦЕ ЗА ПРОФЕСІЯ", es:"QUÉ ES ESTA PROFESIÓN", fr:"CE QU'EST CE MÉTIER", it:"COS'È QUESTA PROFESSIONE", pt:"O QUE É ESTA PROFISSÃO", ar:"ما هذه المهنة", zh:"这个职业是什么", hi:"यह पेशा क्या है", ja:"この職業とは" },
  malzemeHijyen: { tr:"MALZEME, ARAÇLAR VE HİJYEN", en:"MATERIALS, TOOLS & HYGIENE", de:"MATERIAL, WERKZEUGE & HYGIENE", ru:"МАТЕРИАЛЫ, ИНСТРУМЕНТЫ И ГИГИЕНА", uk:"МАТЕРІАЛИ, ІНСТРУМЕНТИ ТА ГІГІЄНА", es:"MATERIALES, HERRAMIENTAS E HIGIENE", fr:"MATÉRIEL, OUTILS ET HYGIÈNE", it:"MATERIALI, ATTREZZI E IGIENE", pt:"MATERIAIS, FERRAMENTAS E HIGIENE", ar:"المواد والأدوات والنظافة", zh:"材料、工具与卫生", hi:"सामग्री, उपकरण और स्वच्छता", ja:"材料・道具・衛生" },
  akisIpucu: { tr:"ÇALIŞMA AKIŞI VE İPUÇLARI", en:"WORKFLOW & PRO TIPS", de:"ABLAUF & PROFI-TIPPS", ru:"ПОРЯДОК РАБОТЫ И СОВЕТЫ", uk:"ПОРЯДОК РОБОТИ ТА ПОРАДИ", es:"FLUJO DE TRABAJO Y CONSEJOS", fr:"DÉROULEMENT ET ASTUCES", it:"FLUSSO DI LAVORO E CONSIGLI", pt:"FLUXO DE TRABALHO E DICAS", ar:"سير العمل ونصائح المحترفين", zh:"工作流程与专业技巧", hi:"कार्यप्रवाह और सुझाव", ja:"作業の流れとコツ" },
  sozluk: { tr:"SÖZLÜK", en:"GLOSSARY", de:"GLOSSAR", ru:"СЛОВАРЬ", uk:"СЛОВНИК", es:"GLOSARIO", fr:"GLOSSAIRE", it:"GLOSSARIO", pt:"GLOSSÁRIO", ar:"قاموس المصطلحات", zh:"术语表", hi:"शब्दावली", ja:"用語集" },
  tanim: { tr:"NEDİR / TANIM", en:"WHAT IT IS / DEFINITION", de:"WAS ES IST / DEFINITION", ru:"ЧТО ЭТО / ОПРЕДЕЛЕНИЕ", uk:"ЩО ЦЕ / ВИЗНАЧЕННЯ", es:"QUÉ ES / DEFINICIÓN", fr:"QU'EST-CE QUE C'EST / DÉFINITION", it:"COS'È / DEFINIZIONE", pt:"O QUE É / DEFINIÇÃO", ar:"ما هو / التعريف", zh:"是什么 / 定义", hi:"यह क्या है / परिभाषा", ja:"とは / 定義" },
  malzemeOlcu: { tr:"MALZEME VE ÖLÇÜLER", en:"INGREDIENTS & MEASUREMENTS", de:"ZUTATEN & MENGEN", ru:"ИНГРЕДИЕНТЫ И МЕРЫ", uk:"ІНГРЕДІЄНТИ ТА МІРИ", es:"INGREDIENTES Y MEDIDAS", fr:"INGRÉDIENTS ET MESURES", it:"INGREDIENTI E DOSI", pt:"INGREDIENTES E MEDIDAS", ar:"المكونات والمقادير", zh:"配料与用量", hi:"सामग्री और माप", ja:"材料と分量" },
  hazirlikMaya: { tr:"HAZIRLIK VE MAYALANMA", en:"PREPARATION & FERMENTATION", de:"VORBEREITUNG & GÄRUNG", ru:"ПОДГОТОВКА И БРОЖЕНИЕ", uk:"ПІДГОТОВКА ТА БРОДІННЯ", es:"PREPARACIÓN Y FERMENTACIÓN", fr:"PRÉPARATION ET FERMENTATION", it:"PREPARAZIONE E LIEVITAZIONE", pt:"PREPARO E FERMENTAÇÃO", ar:"التحضير والتخمير", zh:"准备与发酵", hi:"तैयारी और खमीरीकरण", ja:"準備と発酵" },
  sekilPisirme: { tr:"ŞEKİL VERME VE PİŞİRME", en:"SHAPING & BAKING", de:"FORMEN & BACKEN", ru:"ФОРМОВКА И ВЫПЕЧКА", uk:"ФОРМУВАННЯ ТА ВИПІКАННЯ", es:"FORMADO Y HORNEADO", fr:"FAÇONNAGE ET CUISSON", it:"FORMATURA E COTTURA", pt:"MODELAGEM E ASSAMENTO", ar:"التشكيل والخبز", zh:"整形与烘烤", hi:"आकार देना और बेकिंग", ja:"成形と焼成" },
  pufHata: { tr:"PÜF NOKTALARI VE SIK HATALAR", en:"PRO TIPS & COMMON MISTAKES", de:"PROFI-TIPPS & HÄUFIGE FEHLER", ru:"СЕКРЕТЫ И ЧАСТЫЕ ОШИБКИ", uk:"СЕКРЕТИ ТА ЧАСТІ ПОМИЛКИ", es:"TRUCOS Y ERRORES COMUNES", fr:"ASTUCES ET ERREURS FRÉQUENTES", it:"SEGRETI ED ERRORI COMUNI", pt:"SEGREDOS E ERROS COMUNS", ar:"أسرار وأخطاء شائعة", zh:"诀窍与常见错误", hi:"राज़ और आम गलतियाँ", ja:"コツとよくある失敗" },
  // KURULUŞ & FİZİBİLİTE bölümleri (fabrika/imalathane kurulumu)
  fizGenel: { tr:"FİZİBİLİTE VE GENEL BAKIŞ", en:"FEASIBILITY & OVERVIEW", de:"MACHBARKEIT & ÜBERBLICK", ru:"ОСУЩЕСТВИМОСТЬ И ОБЗОР", uk:"ЗДІЙСНЕННІСТЬ ТА ОГЛЯД", es:"VIABILIDAD Y VISIÓN GENERAL", fr:"FAISABILITÉ ET APERÇU", it:"FATTIBILITÀ E PANORAMICA", pt:"VIABILIDADE E VISÃO GERAL", ar:"دراسة الجدوى ونظرة عامة", zh:"可行性与概述", hi:"व्यवहार्यता और अवलोकन", ja:"実現可能性と概要" },
  fizKurulus: { tr:"KURULUŞ ADIMLARI VE İZİNLER", en:"SETUP STEPS & PERMITS", de:"GRÜNDUNGSSCHRITTE & GENEHMIGUNGEN", ru:"ЭТАПЫ ОТКРЫТИЯ И РАЗРЕШЕНИЯ", uk:"ЕТАПИ ВІДКРИТТЯ ТА ДОЗВОЛИ", es:"PASOS DE MONTAJE Y PERMISOS", fr:"ÉTAPES D'INSTALLATION ET PERMIS", it:"FASI DI AVVIO E PERMESSI", pt:"ETAPAS DE MONTAGEM E LICENÇAS", ar:"خطوات التأسيس والتراخيص", zh:"建厂步骤与许可", hi:"स्थापना चरण और अनुमतियाँ", ja:"設立手順と許認可" },
  fizMakine: { tr:"MAKİNE VE TEÇHİZAT", en:"MACHINERY & EQUIPMENT", de:"MASCHINEN & AUSRÜSTUNG", ru:"МАШИНЫ И ОБОРУДОВАНИЕ", uk:"МАШИНИ ТА ОБЛАДНАННЯ", es:"MAQUINARIA Y EQUIPO", fr:"MACHINES ET ÉQUIPEMENT", it:"MACCHINARI E ATTREZZATURE", pt:"MÁQUINAS E EQUIPAMENTOS", ar:"الآلات والمعدات", zh:"机器与设备", hi:"मशीनरी और उपकरण", ja:"機械と設備" },
  fizHammadde: { tr:"HAM MADDE VE TEMİNİ", en:"RAW MATERIALS & SOURCING", de:"ROHSTOFFE & BESCHAFFUNG", ru:"СЫРЬЁ И ЗАКУПКА", uk:"СИРОВИНА ТА ЗАКУПІВЛЯ", es:"MATERIAS PRIMAS Y ABASTECIMIENTO", fr:"MATIÈRES PREMIÈRES ET APPROVISIONNEMENT", it:"MATERIE PRIME E APPROVVIGIONAMENTO", pt:"MATÉRIAS-PRIMAS E FORNECIMENTO", ar:"المواد الخام والتوريد", zh:"原材料与采购", hi:"कच्चा माल और आपूर्ति", ja:"原材料と調達" },
  fizUretim: { tr:"ÜRETİM AKIŞI VE KAPASİTE", en:"PRODUCTION FLOW & CAPACITY", de:"PRODUKTIONSABLAUF & KAPAZITÄT", ru:"ПРОИЗВОДСТВЕННЫЙ ПРОЦЕСС И МОЩНОСТЬ", uk:"ВИРОБНИЧИЙ ПРОЦЕС ТА ПОТУЖНІСТЬ", es:"FLUJO DE PRODUCCIÓN Y CAPACIDAD", fr:"FLUX DE PRODUCTION ET CAPACITÉ", it:"FLUSSO PRODUTTIVO E CAPACITÀ", pt:"FLUXO DE PRODUÇÃO E CAPACIDADE", ar:"سير الإنتاج والطاقة الإنتاجية", zh:"生产流程与产能", hi:"उत्पादन प्रवाह और क्षमता", ja:"生産の流れと生産能力" },
  fizMaliyet: { tr:"MALİYET, BÜTÇE VE KÂR", en:"COSTS, BUDGET & PROFIT", de:"KOSTEN, BUDGET & GEWINN", ru:"ЗАТРАТЫ, БЮДЖЕТ И ПРИБЫЛЬ", uk:"ВИТРАТИ, БЮДЖЕТ ТА ПРИБУТОК", es:"COSTOS, PRESUPUESTO Y GANANCIA", fr:"COÛTS, BUDGET ET PROFIT", it:"COSTI, BUDGET E PROFITTO", pt:"CUSTOS, ORÇAMENTO E LUCRO", ar:"التكاليف والميزانية والربح", zh:"成本、预算与利润", hi:"लागत, बजट और लाभ", ja:"コスト・予算・利益" },
};

// Yapay zekâ metnindeki markdown işaretlerini temizle (**kalın**, #başlık, *madde → • ) → düzgün görünsün.
function duzelt(m) {
  return String(m || "")
    .replace(/\*\*/g, "").replace(/__/g, "").replace(/`/g, "")
    .replace(/(^|\n)\s*#{1,6}\s+/g, "$1")
    .replace(/(^|\n)\s*[*\-–]\s+/g, "$1• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Çeşit adına göre uygun bir EMOJİ seç (renkli kartlarda ikon olarak) → yoksa meslek ikonuna düşülür.
// NOT: kısa kelimeler (et, bal…) BAŞKA kelimelerin içinde eşleşmesin diye \b (kelime sınırı) kullanılır (örn. "palet"teki "et" ARTIK eşleşmez).
function cesitIkon(ad) {
  const s = (ad || "").toLocaleLowerCase("tr");
  const kv = [
    [/\bbaget|\bbaton|baguette/, "🥖"], [/yaş pasta|\bpasta\b|gato|tort|cheesecake/, "🎂"], [/\bkek\b|muffin|cupcake|brownie|kağıt helva/, "🧁"], [/kurabiye|biscu|cookie/, "🍪"],
    [/\btart|turta|\bpie\b/, "🥧"], [/çikolata|choco|trüf/, "🍫"], [/dondurma|ice ?cream/, "🍨"], [/baklava|şerbet|tatlı|helva|lokum|revani|kadayıf|sütlaç|tulumba/, "🍮"],
    [/ekler|profiterol|krema|sufle|magnol|\bpuf\b/, "🍥"], [/ekmek|\bbread|khlib|somun|lavaş|paska|kalach|baton/, "🍞"], [/poğaça|açma|börek|pyrizhky|çörek|simit|gözleme|bazlama/, "🥐"],
    [/pizza|\bpide\b|lahmacun/, "🍕"],
    // SAÇ MODELLERİ — Türkçe + yaygın İngilizce/uluslararası kesim adları (hepsi 💇 olsun; eskiden bilinmeyenler berber direğine düşüyordu → karışık)
    [/\bsaç|kesim|\bfön|perma|röfle|topuz|ombre|undercut|pompadour|quiff|mohawk|mohican|\bbun\b|\bbuzz\b|\bcrew\b|\btaper\b|\bslick\b|\bfade\b|\bcrop\b|\bbob\b|mullet|fringe|comb ?over|side ?part|pixie|\bcut\b|kuaför|berber/, "💇"],
    [/sakal|beard|\btıraş|shave|razor|bıyık|mustache/, "🧔"], [/tırnak|\bnail\b|\boje\b|manikür|pedikür/, "💅"],
    [/\bkaş\b|kirpik|makyaj/, "💄"], [/masaj|\bspa\b|cilt bakım/, "💆"], [/dövme|tattoo|piercing/, "🎨"], [/kahve|coffee|espresso|latte/, "☕"],
    [/\bçay\b|\btea\b/, "🍵"], [/kebap|köfte|döner|izgara|steak|biftek|kavurma|sucuk/, "🍖"], [/tavuk|piliç/, "🍗"], [/balık|\bfish\b/, "🐟"], [/salata|sebze|vegan/, "🥗"], [/meyve|\bfruit|çilek/, "🍓"],
    [/süt|peynir|yoğurt|kaymak/, "🧀"], [/reçel|marmelat|\bbal\b/, "🍯"], [/çorba|\bsoup\b/, "🍲"], [/makarna|noodle|erişte|spagetti/, "🍝"], [/hamburger|sandviç|\btost\b/, "🍔"],
  ];
  for (const [re, em] of kv) if (re.test(s)) return em;
  return null;
}
// Renkli kart zeminleri (çeşitler sırayla bu renkleri alır → renkli görünür)
const CESIT_RENK = [
  "linear-gradient(135deg,#e0115f,#b3094c)", "linear-gradient(135deg,#7a4a2a,#5c3720)", "linear-gradient(135deg,#16a085,#0e7c65)",
  "linear-gradient(135deg,#e67e22,#c9611a)", "linear-gradient(135deg,#8e44ad,#6c3483)", "linear-gradient(135deg,#2980b9,#1f6391)",
  "linear-gradient(135deg,#c0392b,#96271c)", "linear-gradient(135deg,#27ae60,#1e8449)", "linear-gradient(135deg,#d6336c,#a82554)",
  "linear-gradient(135deg,#e84393,#b93172)", "linear-gradient(135deg,#f39c12,#c87f0a)", "linear-gradient(135deg,#00838f,#005f68)",
];
// Metinden sabit bir sayı (tohum) üret → aynı model hep AYNI fotoğrafı versin.
function tohumUret(s) {
  let h = 0; const m = String(s || "");
  for (let i = 0; i < m.length; i++) { h = (h * 31 + m.charCodeAt(i)) | 0; }
  return Math.abs(h) % 1000000;
}
// ÜCRETSİZ görsel (anahtar/ücret YOK) — Pollinations. İstemden doğrudan resim URL'si üretir.
function ucretsizGorselUrl(istem, anahtar) {
  const p = encodeURIComponent(String(istem || "").slice(0, 500));
  return "https://image.pollinations.ai/prompt/" + p + "?width=1024&height=1024&nologo=true&model=flux&seed=" + tohumUret(anahtar || istem);
}

// SESLİ ANLATIM — EN BASİT HALİ: yazıyı baştan sona TEK SEFERDE okur (tarayıcının kendi sesi, ÜCRETSİZ).
// Sesli okuma için metni temizle (ana uygulamadaki çalışan yöntemin aynısı): yıldız/markdown/emoji okunmasın.
function sesTemizle(m) {
  return String(m || "")
    .replace(/\*\*?|__?|`+|#+|>|~+|\|/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu, "")
    .replace(/[•★☆◆♦]/g, " ")
    .replace(/Gloxoo/gi, "Gloksu").replace(/GLOXORG/gi, "Gloksorg")
    .replace(/\s+/g, " ").trim();
}
// SESLİ ANLATIM — ANA UYGULAMADAKİ ÇALIŞAN yöntemin aynısı: sesler yüklenene kadar BEKLE, en iyi sesi seç,
// CÜMLELERE böl ve hepsini KUYRUĞA koy, resume() ile uyandır. (Motor "uyandırma" Anasayfa'da global zaten var.)
function SesliMetin({ metin, className, sesDili, onSesIlerleme }) {
  const { t } = useTranslation();
  const [okunuyor, setOkunuyor] = useState(false);
  const [aktif, setAktif] = useState(-1); // okunan cümle/satır (vurgu)
  const varMi = typeof window !== "undefined" && "speechSynthesis" in window;
  const besleIvRef = useRef(null);
  // Metni görüntülenecek cümle/satır parçalarına böl (vurgu bunun üstünde yürür)
  const cumleler = useMemo(() => {
    const arr = [];
    for (const sat of String(metin || "").split(/\n+/)) {
      const s = sat.trim(); if (!s) continue;
      for (const c of (s.match(/[^.!?…]+[.!?…]*/g) || [s])) { const t = c.trim(); if (t) arr.push(t); }
    }
    return arr;
  }, [metin]);
  function besleDur() { if (besleIvRef.current) { clearInterval(besleIvRef.current); besleIvRef.current = null; } }
  function dur() { besleDur(); try { window.speechSynthesis.cancel(); } catch (e) {} setOkunuyor(false); setAktif(-1); }
  useEffect(() => () => { besleDur(); try { window.speechSynthesis.cancel(); } catch (e) {} }, []);
  useEffect(() => { dur(); }, [metin]); // eslint-disable-line react-hooks/exhaustive-deps
  function besle() { try { onSesIlerleme && onSesIlerleme(); } catch (e) {} } // ana uygulamanın "14sn bekçisini" besle
  function oku() {
    if (!cumleler.length || !varMi) return;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    const lk = (sesDili || "tr").toLowerCase(); const kok = lk.split("-")[0];
    const sesSec = () => {
      const sesler = (window.speechSynthesis.getVoices && window.speechSynthesis.getVoices()) || [];
      const dilli = sesler.filter((v) => v.lang && (v.lang.toLowerCase() === lk || v.lang.toLowerCase().startsWith(kok)));
      const iyi = (v) => /natural|neural|online|premium|enhanced|google/i.test(v.name || "");
      return dilli.find((v) => v.localService === false) || dilli.find(iyi) || dilli[0] || null;
    };
    setOkunuyor(true); setAktif(0);
    besleDur(); besle();
    besleIvRef.current = setInterval(() => { try { if (window.speechSynthesis.speaking || window.speechSynthesis.pending) { besle(); try { window.speechSynthesis.resume(); } catch (e) {} } else { besleDur(); } } catch (e) {} }, 3000);
    let basladi = false;
    const konus = () => {
      if (basladi) return; basladi = true;
      const ses = sesSec();
      cumleler.forEach((cumle, idx) => {
        const soku = sesTemizle(cumle); if (!soku) return;
        const u = new window.SpeechSynthesisUtterance(soku);
        u.lang = sesDili || "tr-TR"; u.rate = 0.9; u.pitch = 1; if (ses) u.voice = ses; // biraz YAVAŞ (kullanıcı: hızlı okuyor)
        u.onstart = () => { besle(); setAktif(idx); }; // OKUNAN cümleyi vurgula (nerede olduğu görünür)
        u.onboundary = () => besle();
        if (idx === cumleler.length - 1) u.onend = () => { besleDur(); setOkunuyor(false); setAktif(-1); };
        try { window.speechSynthesis.speak(u); } catch (e) {}
      });
      try { window.speechSynthesis.resume(); } catch (e) {}
    };
    if (((window.speechSynthesis.getVoices && window.speechSynthesis.getVoices()) || []).length > 0) konus();
    else { try { window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; konus(); }; } catch (e) {} setTimeout(konus, 400); }
  }
  return (
    <>
      {varMi && metin ? <button className="ak-sesli-btn" onClick={okunuyor ? dur : oku}>{okunuyor ? "⏸ " + t("akDurdur", "Durdur") : "🔊 " + t("akSesliAnlat", "Sesli anlat")}</button> : null}
      <div className={className}>
        {cumleler.map((c, k) => {
          const bas = satirBaslikMi(c);
          const gc = c.replace(/^◆\s*/, ""); // ekrandan ◆ işaretini gizle
          return <div key={k} className={(bas ? "ak-kat-baslik" : "ak-satir") + (okunuyor && k === aktif ? " ak-okunan" : "")}>{gc}</div>;
        })}
      </div>
    </>
  );
}
// Bir satır KATEGORİ BAŞLIĞI mı? (◆ işaretiyle başlıyorsa KESİN başlık — her dilde çalışır; ayrıca büyük harfli kısa satırlar)
function satirBaslikMi(t) {
  const ham = String(t || "").trim();
  if (ham.indexOf(AK_ISARET.trim()) === 0) return true; // kendi eklediğimiz çevrili başlık (◆) — Rusça/Arapça/Çince dahil
  const x = ham.replace(/^[•\-]\s*/, "");
  if (!x || x.length > 70) return false;
  return !/[a-zçğıiöşü]/.test(x) && /[A-ZÇĞİÖŞÜ]/.test(x);
}
// KOPYALA / İNDİR / PAYLAŞ araçları (anlatım/sözlük metnini kopyala, .txt indir, paylaş)
function MetinAraclar({ metin, baslik }) {
  const { t } = useTranslation();
  const [kop, setKop] = useState(false);
  const tam = (baslik ? baslik + "\n\n" : "") + String(metin || "").replace(/^◆\s*/gm, "") + "\n\n— GLOXORG Akademi";
  function kopyala() { try { navigator.clipboard.writeText(tam); setKop(true); setTimeout(() => setKop(false), 1600); } catch (e) {} }
  function indir() {
    try {
      // BOM (﻿) ekle: bazı telefon/masaüstü metin okuyucular kodlamayı yanlış seçip Türkçe/Rusça harfleri
      // bozuk gösteriyordu (ü→Ã¼, ş→ÅŸ, •→â€¢). BOM ile dosya KESİN UTF-8 açılır → harfler düzgün görünür.
      const b = new Blob(["﻿" + tam], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url; a.download = ((baslik || "gloxorg-akademi").replace(/[^\wÇĞİÖŞÜçğıöşü -]/g, "").trim().slice(0, 40) || "gloxorg-akademi") + ".txt";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (e) {}
  }
  async function paylas() { try { if (navigator.share) await navigator.share({ title: baslik || "GLOXORG Akademi", text: tam }); else kopyala(); } catch (e) {} }
  if (!metin) return null;
  return (
    <div className="ak-arac-satir">
      <button className="ak-arac" onClick={kopyala}>{kop ? "✓ " + t("akKopyalandi", "Kopyalandı") : "📋 " + t("akKopyala", "Kopyala")}</button>
      <button className="ak-arac" onClick={indir}>⬇️ {t("akIndir", "İndir")}</button>
      <button className="ak-arac" onClick={paylas}>📤 {t("akPaylas", "Paylaş")}</button>
    </div>
  );
}

// Izgara çeşit fotoğrafı — ücretsiz servis yüklenmezse 2 kez daha DENER (gecikmeli), yine olmazsa ikon gösterir (kırık kutu OLMAZ).
function KonuFoto({ src, ad, ik }) {
  const [durum, setDurum] = useState("yuk"); // yuk | ok | hata
  const [src2, setSrc2] = useState(src);
  const denemeRef = useRef(0);
  useEffect(() => { setSrc2(src); setDurum("yuk"); denemeRef.current = 0; }, [src]);
  if (durum === "hata") return <span className="ak-konu-kart-foto ak-konu-kart-ik">{ik || "🖼️"}</span>;
  return (
    <span className="ak-konu-kart-foto">
      {durum === "yuk" && <span className="ak-konu-kart-yuk">…</span>}
      <img src={src2} alt={ad} loading="lazy" referrerPolicy="no-referrer"
        style={durum === "ok" ? undefined : { opacity: 0 }}
        onLoad={() => setDurum("ok")}
        onError={() => { if (denemeRef.current < 2) { denemeRef.current++; const n = denemeRef.current; setTimeout(() => setSrc2(src + "&yeniden=" + n), 3000 * n); } else setDurum("hata"); }} />
    </span>
  );
}

export default function AkademiSayfa({ uid, benAd, benFoto, dil, aiKopru, ulke, sehir, onKatman, onSesIlerleme }) {
  const { t } = useTranslation();
  const [gorunum, setGorunum] = useState("liste"); // liste | kurs | sertifikalarim
  const [ara, setAra] = useState("");
  const [meslek, setMeslek] = useState(null);
  // TEMEL EĞİTİM
  const [ders, setDers] = useState(""); const [dersYuk, setDersYuk] = useState(false);
  // ÇEŞİTLER / KONULAR (her tür tek tek anlatım)
  const [konular, setKonular] = useState(null); const [konularYuk, setKonularYuk] = useState(false);
  const [aktifKonu, setAktifKonu] = useState(""); const [konuDers, setKonuDers] = useState(""); const [konuYuk, setKonuYuk] = useState(false);
  const [konuAra, setKonuAra] = useState(""); // listede olmayan çeşidi kullanıcı kendi yazıp sorar
  const [konuAsama, setKonuAsama] = useState(0); // tarif hazırlanırken ilerleme (2/5 gibi)
  const [dersAsama, setDersAsama] = useState(0); // temel eğitim yükleme ilerlemesi (3 bölüm)
  // GÖRSEL (yapay zekâ ile üretilen örnek/model fotoğrafı — bir kez üretilir, saklanır)
  const [kapakGorsel, setKapakGorsel] = useState(""); // mesleğe göre kapak
  const [konuGorsel, setKonuGorsel] = useState(""); const [konuGorselYuk, setKonuGorselYuk] = useState(false); const [konuGorselHata, setKonuGorselHata] = useState("");
  // KURULUŞ & FİZİBİLİTE (fabrika/imalathane nasıl kurulur — makine, ham madde temini, maliyet)
  const [fizibilite, setFizibilite] = useState(""); const [fizibiliteYuk, setFizibiliteYuk] = useState(false); const [fizibiliteAsama, setFizibiliteAsama] = useState(0);
  const istekNoRef = useRef(0); // çeşitler arası yarış (race) koruması
  const konuDetayRef = useRef(null); // bir çeşide basınca tarife otomatik kaydır (aşağıda kaybolmasın)
  const sorulanRef = useRef([]); // daha önce sorulan sınav soruları (her denemede farklı sorulsun diye)
  // SINAV
  const [sorular, setSorular] = useState(null); const [sinavYuk, setSinavYuk] = useState(false);
  const [cevaplar, setCevaplar] = useState({}); const [sonuc, setSonuc] = useState(null); // {dogru, toplam, gecti}
  // İŞİNİ GÖSTER
  const [isFoto, setIsFoto] = useState(""); const [isVideo, setIsVideo] = useState("");
  const [yukDurum, setYukDurum] = useState(""); // "foto" | "video" | ""
  const [videoYuzde, setVideoYuzde] = useState(0);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [kayitlarim, setKayitlarim] = useState([]);
  const [aktifSertifika, setAktifSertifika] = useState(null);
  const fotoInpRef = useRef(null); const videoInpRef = useRef(null);
  const dilAd = DIL_AD[dil] || "English";
  const GECME = 0.7; // sertifika için geçme oranı (%70) — ciddi sınav
  // FOTOĞRAF: ücretsiz servis yanlış/bozuk resim veriyordu (Lavaş'a dağ, bagete kadın) → KAPALI, temiz ikon gösterilir.
  // OpenAI anahtarı eklenince açılıp gerçek/kaliteli resim gelir → o zaman true yapılır.
  const FOTO_ACIK = true; // AÇIK: Akademi fotoğrafları Google/Gemini ile üretilir (ana uygulamayla aynı; kullanıcının Google kredisi). Olmazsa temiz simge kalır.

  useEffect(() => { if (uid) akademiKayitlarimOku(uid).then((l) => setKayitlarim(l || [])).catch(() => {}); }, [uid]);

  // Bir çeşide/Sor'a basınca açılan tarife OTOMATİK KAYDIR (en aşağıda kaybolmasın, hemen görünsün).
  useEffect(() => {
    if (!aktifKonu) return;
    const z = setTimeout(() => { try { konuDetayRef.current && konuDetayRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {} }, 60);
    return () => clearTimeout(z);
  }, [aktifKonu]);

  // ANDROID GERİ TUŞU: Akademi içi derinliği ana ekrana bildir → alt pencere (kurs/sertifikalarım/sertifika)
  // açıkken geri tuşu SADECE onu kapatır, Akademi'de kalınır (ana sayfaya atmaz). 0 liste, 1 alt, 2 sertifika.
  useEffect(() => {
    const derinlik = aktifSertifika ? 2 : (gorunum === "liste" ? 0 : 1);
    const geri = () => {
      if (aktifSertifika) { setAktifSertifika(null); return; }
      if (gorunum !== "liste") { setGorunum("liste"); return; }
    };
    if (onKatman) onKatman(derinlik, geri);
  }, [gorunum, aktifSertifika]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (onKatman) onKatman(0, null); }, []); // Akademi'den çıkınca derinliği sıfırla // eslint-disable-line react-hooks/exhaustive-deps

  async function gloxSor(prompt, sistem) {
    try {
      const r = await fetch(aiKopru, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, sistem }) });
      const j = await r.json().catch(() => ({}));
      return (j && j.metin) || "";
    } catch (e) { return ""; }
  }

  // GÖRSEL üret (ÖNCE paylaşımlı önbellek → yoksa yapay zekâ ile üret → Storage'a yükle → önbelleğe yaz).
  // Böylece her model/çeşit fotoğrafı DÜNYADA BİR KEZ üretilir; sonra herkes hazırdan görür (ücret 1 kez).
  // Dönüş: { url, hata } — hata varsa ekrana yazıp sebebi göstereceğiz.
  async function gorselUret(anahtar, istem) {
    // 1) Önbellek — daha önce üretilmiş URL varsa onu ver (DÜNYADA bir kez üretilir, herkes hazırdan görür, ücret 1 kez).
    try { const eski = await akademiGorselOku(anahtar); if (eski) return { url: eski, hata: "" }; } catch (e) {}
    // 2) GOOGLE/GEMINI (ana uygulamanın ÇALIŞAN görsel yolu) — düzgün, alakalı fotoğraf üretir; kullanıcının Google kredisini kullanır.
    //    Bozuk ücretsiz servisi (Pollinations: dağ/kadın gibi alakasız resimler) KALDIRILDI. Google olmazsa foto YOK (temiz simge kalır).
    try {
      const res = await gloxooResimUret(istem);
      const dataUrl = res && res.dataUrl;
      if (dataUrl) {
        let url = "";
        try { url = await gorselYukle(dataUrl, uid || "akademi"); } catch (e) {}
        const kayit = url || dataUrl; // Storage'a yüklenemezse bile fotoğrafı göster
        akademiGorselYaz(anahtar, kayit).catch(() => {});
        return { url: kayit, hata: "" };
      }
    } catch (e) { return { url: "", hata: String(e && e.message || e) }; }
    return { url: "", hata: "" };
  }

  // Bir çeşidin basit fotoğraf istemi (yedek).
  function fotoIstem(ad) {
    return `a realistic, detailed photograph of "${ad}" (${meslek.ad}), no text, no watermark, no logo`;
  }
  // TEK fotoğraf için Gloxoo'dan KONUYA UYGUN İngilizce istem al (yemekse insansız ürün fotosu → dağ/kadın gelmesin).
  async function gorselIstemGetir(ad) {
    const p = `Give ONE short English image prompt (max 25 words) for a realistic photo of "${ad}" in "${meslek.ad}". If it is food/an object, describe that food/object clearly and END with "close-up, food photography, no people, no person, no text". If it is a hairstyle/beauty look, show a person with that look. Output ONLY the prompt.`;
    const c = await gloxSor(p, "Sadece İngilizce istem cümlesini ver, başka hiçbir şey yazma, tırnak koyma.");
    return String(c || "").replace(/\n/g, " ").replace(/^["']|["']$/g, "").trim().slice(0, 300);
  }

  // Mesleğe girince o mesleğe uygun KAPAK fotoğrafı (bir kez üretilir, saklanır)
  useEffect(() => {
    if (!FOTO_ACIK || gorunum !== "kurs" || !meslek) return; // foto kapalıyken kapak da üretilmez
    let iptal = false; setKapakGorsel("");
    const istem = `Professional realistic cover photo representing the profession "${meslek.ad}": a person skillfully working at their craft in a beautiful, tidy workspace. Warm inviting lighting, photorealistic, high quality, no text, no watermark, no logo.`;
    gorselUret("kapak|" + meslek.ad, istem).then((res) => { if (!iptal) setKapakGorsel(res.url || ""); }).catch(() => {});
    return () => { iptal = true; };
  }, [gorunum, meslek]); // eslint-disable-line react-hooks/exhaustive-deps

  function kursAc(m) {
    setMeslek(m); setGorunum("kurs");
    setDers(""); setKonular(null); setAktifKonu(""); setKonuDers(""); setKonuGorsel(""); setKapakGorsel("");
    setSorular(null); setCevaplar({}); setSonuc(null); setIsFoto(""); setIsVideo(""); setAktifSertifika(null); sorulanRef.current = [];
    setFizibilite(""); setFizibiliteYuk(false); setFizibiliteAsama(0);
  }

  // (2) TEMEL EĞİTİM — kesilmesin diye KÜÇÜK başlıklara bölünür (her başlık kısa+tam), birleşince eksiksiz olur.
  async function egitimAl() {
    if (dersYuk || !meslek) return; setDersYuk(true); setDers(""); setDersAsama(0);
    // ÖNEMLİ: Başlığı AI YAZMAZ (Türkçe kalıyordu). AI SADECE gövdeyi ${dilAd} dilinde yazar; başlığı biz çevrili ekleriz.
    const sistem = `Sen Gloxoo'sun — GLOXORG Akademi'nin USTA eğitmeni (HER meslek için). CEVABIN TAMAMI ${dilAd} DİLİNDE olacak. BAŞLIK YAZMA — sadece içerik/maddeler yaz. DETAYLI, DOLU ve ÖĞRETİCİ yaz; yüzeysel geçme, örnek ve somut bilgi ver. ~320 KELİMEYE kadar yaz ama SON CÜMLEYİ MUTLAKA TAMAMLA, noktayla bitir; ASLA yarıda kesme. Markdown/yıldız (**) KULLANMA; maddeleri • ile yaz.`;
    const on = `"${meslek.ad}" mesleğine yeni başlayan birine, SADECE şu konunun İÇERİĞİNİ ${dilAd} dilinde yaz (başlık yazma)`;
    const bolumler = [
      { bas: "nedir", p: `${on} — ne iş yapılır, neyin nesidir, kimler yapar, neyi bilmek şart.` },
      { bas: "malzemeHijyen", p: `${on} — gerekli malzeme ve araçlar: isim isim, ne işe yarar; ve temel hijyen / güvenlik kuralları.` },
      { bas: "akisIpucu", p: `${on} — genel çalışma akışı: işin baştan sona sırası + yeni başlayana usta öğütleri.` },
      { bas: "sozluk", p: `${on} — bu meslekte geçen YABANCI/TEKNİK/zor kelimeleri seç ve her birini "Kelime: kelimenin ${dilAd} dilinde basit anlamı" biçiminde • ile açıkla. HEM kelime HEM anlamı ${dilAd} dilinde olsun. Yeni öğrenen anlasın diye sade anlat.` },
    ];
    const parcalar = []; let il = 0;
    for (const b of bolumler) {
      const c = await gloxSor(b.p, sistem);
      const baslik = AK_ISARET + ((AK_BASLIK[b.bas] && (AK_BASLIK[b.bas][dil] || AK_BASLIK[b.bas].tr)) || "");
      if (c) parcalar.push(baslik + "\n" + duzelt(c));
      il++; setDersAsama(il);
    }
    setDers(parcalar.join("\n\n") || t("akDersOlmadi", "Eğitim şu an alınamadı, tekrar dene.")); setDersYuk(false);
  }

  // (2b) KURULUŞ & FİZİBİLİTE — bu mesleğin fabrika/imalathanesi nasıl kurulur: fizibilite, makine-teçhizat,
  // HAM MADDE ve nasıl temin edilir, üretim akışı, maliyet/kâr. Eksiksiz olsun diye 6 bölüme bölünür (her biri tam biter).
  async function fizibiliteAl() {
    if (fizibiliteYuk || !meslek) return; setFizibiliteYuk(true); setFizibilite(""); setFizibiliteAsama(0);
    const bolge = [sehir, ulke].filter(Boolean).join(", ");
    const sistem = `Sen Gloxoo'sun — GLOXORG Akademi'nin sanayi/işletme kuruluş danışmanı. CEVABIN TAMAMI ${dilAd} DİLİNDE olacak. BAŞLIK YAZMA — sadece içerik/maddeler yaz. GERÇEKÇİ, DETAYLI ve UYGULANABİLİR ol; SOMUT rakam ver (adet, kapasite, kW, m², para birimi, süre). Yüzeysel geçme. ~340 KELİMEYE kadar yaz ama SON CÜMLEYİ MUTLAKA TAMAMLA, noktayla bitir; ASLA yarıda kesme. Markdown/yıldız (**) KULLANMA; maddeleri • ile yaz.`;
    const on = `"${meslek.ad}" işini/ürününü ÜRETECEK bir imalathane/fabrika KURMAK isteyen birine, SADECE şu bölümün İÇERİĞİNİ ${dilAd} dilinde yaz (başlık yazma)${bolge ? `. Bölge: ${bolge} (yerel koşulları dikkate al)` : ""}`;
    const bolumler = [
      { bas: "fizGenel", p: `${on} — FİZİBİLİTE: bu üretim kârlı mı, pazar/talep durumu, hedef müşteri, küçük atölyeden büyük fabrikaya ölçek seçenekleri, yaklaşık başlangıç sermayesi aralığı ve geri dönüş mantığı.` },
      { bas: "fizKurulus", p: `${on} — KURULUŞ ADIMLARI: yer/mekân seçimi ve gereken m², elektrik/su/altyapı, ruhsat/izin/belgeler (işyeri, gıda/sağlık, çevre vb.), sırayla ne yapılır.` },
      { bas: "fizMakine", p: `${on} — MAKİNE VE TEÇHİZAT: gereken TÜM makineler ve ekipmanlar tek tek, her birinin ne işe yaradığı, yaklaşık kapasitesi/gücü (kW), küçük ve büyük ölçek için seçenekler.` },
      { bas: "fizHammadde", p: `${on} — HAM MADDE VE TEMİNİ: üretim için gereken TÜM ham maddeler tek tek, kalite kriterleri, nereden/nasıl temin edilir (toptancı, üretici, ithalat), yaklaşık miktar/oran ve nasıl DEPOLANIR/saklanır.` },
      { bas: "fizUretim", p: `${on} — ÜRETİM AKIŞI: ham maddeden bitmiş ürüne kadar adım adım üretim süreci, günlük/aylık kapasite örneği, kaç kişi/personel gerekir, kalite kontrol.` },
      { bas: "fizMaliyet", p: `${on} — MALİYET, BÜTÇE VE KÂR: başlangıç yatırımı kalem kalem, aylık işletme gideri (kira, işçi, enerji, ham madde), satış fiyatı mantığı, başabaş noktası, tahmini kâr ve başlıca riskler.` },
    ];
    const parcalar = []; let il = 0;
    for (const b of bolumler) {
      const c = await gloxSor(b.p, sistem);
      const baslik = AK_ISARET + ((AK_BASLIK[b.bas] && (AK_BASLIK[b.bas][dil] || AK_BASLIK[b.bas].tr)) || "");
      if (c) parcalar.push(baslik + "\n" + duzelt(c));
      il++; setFizibiliteAsama(il);
    }
    setFizibilite(parcalar.join("\n\n") || t("akDersOlmadi", "Eğitim şu an alınamadı, tekrar dene.")); setFizibiliteYuk(false);
  }

  // (3a) ÇEŞİTLERİ getir — bu meslekteki tüm tür/ürün/konu listesi (JSON)
  async function konulariYukle() {
    if (konularYuk || !meslek) return; setKonularYuk(true); setKonular(null); setAktifKonu(""); setKonuDers("");
    const sistem = "Sen Gloxoo'sun. SADECE geçerli JSON döndür, başka hiçbir şey yazma.";
    const bolge = [sehir, ulke].filter(Boolean).join(", ") || "bilinmiyor";
    const p = `"${meslek.ad}" mesleğinde öğrenilmesi gereken çeşitleri/ürünleri/modelleri listele.
ÇOK ÖNEMLİ KURALLAR:
1) SADECE "${meslek.ad}" mesleğinin GERÇEK ürünlerini/çeşitlerini ver — BAŞKA mesleğin ürününü ASLA KATMA. Meslek NE İSE ONUN ürünleri: meslek PASTANE/tatlı ise pastalar, yaş pasta, kek, tart, turta, ekler, profiterol, kurabiye, baklava, sütlü tatlılar gibi TATLILAR (EKMEK YAZMA); meslek FIRIN/EKMEK ise ekmek çeşitleri, poğaça, simit, açma, börek gibi HAMUR İŞLERİ; meslek KUAFÖR ise saç kesim/modelleri; meslek TIRNAK ise tırnak modelleri; vb.
2) Her başlık TEK ve SOMUT bir çeşit olsun (örn. pastane: "Çikolatalı Yaş Pasta", "Limonlu Tart", "Ekler"); GENEL KATEGORİ YAZMA ("Pastalar", "Tatlı Çeşitleri" gibi TOPLU başlık OLMASIN).
3) BÖLGE ÖNCE: kullanıcı "${bolge}" bölgesinde. O ülke/bölgede en çok yapılan YEREL çeşitleri (ama YİNE bu mesleğin ürünü olmalı) LİSTENİN BAŞINA koy, sonra tanınmış diğer/dünya çeşitleri.
4) ÇOK ÇEŞİT ver (dar kalma), bu mesleğin tüm alt dallarından SOMUT örnekler.
${dilAd} dilinde SADECE isimleri yaz. SADECE şu JSON: {"konular":["Somut Çeşit 1","Somut Çeşit 2"]} — en az 20, en çok 30 öğe, KISA isimler, YEREL olanlar BAŞTA. Başka hiçbir şey EKLEME.`;
    const c = await gloxSor(p, sistem);
    let arr = null;
    try {
      const temiz = c.replace(/```json|```/g, "").trim();
      const o = JSON.parse(temiz.slice(temiz.indexOf("{"), temiz.lastIndexOf("}") + 1));
      if (o && Array.isArray(o.konular)) arr = o.konular.map((x) => (typeof x === "string" ? x : (x && x.ad) || "")).map((x) => String(x).trim()).filter(Boolean).slice(0, 30);
    } catch (e) {}
    setKonular(arr && arr.length ? arr : []); setKonularYuk(false);
  }

  // (3b) Bir çeşidi AÇ — o türün ölçü + adım adım YAPILIŞI (tam, kesilmez) + KENDİ FOTOĞRAFI
  // k: {ad, g} objesi VEYA düz metin (kullanıcı kendi yazınca).
  async function konuAc(k) {
    const ad = (k && typeof k === "object") ? k.ad : String(k);
    if (aktifKonu === ad) { setAktifKonu(""); setKonuDers(""); setKonuGorsel(""); setKonuGorselHata(""); return; } // aynısına dokununca kapat
    const no = ++istekNoRef.current;
    setAktifKonu(ad); setKonuDers(""); setKonuGorsel(""); setKonuGorselHata(""); setKonuYuk(true); setKonuGorselYuk(false);
    // FOTOĞRAF KAPALI (FOTO_ACIK=false): ücretsiz görsel servisi alakasız/saçma resimler veriyordu (kullanıcı: "çok alakasız, düzensiz").
    // Düzgün ve alakalı foto için ücretli anahtar gerekiyor; o gelene kadar foto ÜRETİLMEZ, temiz kalır. Açılırsa bu blok çalışır.
    if (FOTO_ACIK) {
      setKonuGorselYuk(true);
      (async () => {
        let istem = ""; try { istem = await gorselIstemGetir(ad); } catch (e) {}
        if (!istem) istem = fotoIstem(ad);
        const res = await gorselUret("v4|" + meslek.ad + "|" + ad, istem);
        if (istekNoRef.current === no) { setKonuGorsel(res.url || ""); setKonuGorselHata(res.url ? "" : (res.hata || "")); setKonuGorselYuk(false); }
      })();
    }
    // METİN — KESİLMEMESİ için KÜÇÜK BAŞLIKLARA bölünür: her başlık KISA (~180 kelime) ve kendi içinde TAM biter,
    // hepsi birleşince UZUN ve EKSİKSİZ olur. Böylece uzunluk sınırına takılıp yarıda kesilmez.
    // ÖNEMLİ: Başlığı AI YAZMAZ (Türkçe/yarı-çeviri kalıyordu). AI SADECE gövdeyi ${dilAd} dilinde yazar; başlığı biz çevrili ekleriz.
    const sistem = `Sen Gloxoo'sun — usta eğitmen (HER meslek için). CEVABIN TAMAMI ${dilAd} DİLİNDE olacak. BAŞLIK YAZMA — sadece içerik/maddeler yaz. DETAYLI, DOLU ve ÖĞRETİCİ yaz; ölçü/rakam/sıcaklık/süre gibi somut bilgileri EKSİKSİZ ver, yüzeysel geçme. ~320 KELİMEYE kadar yaz ama SON CÜMLEYİ MUTLAKA TAMAMLA, noktayla bitir; ASLA yarıda kesme. Doğru ve net bilgi ver. Markdown/yıldız (**) KULLANMA; maddeleri • ile yaz.`;
    const on = `"${meslek.ad}" mesleğinde "${ad}" için, SADECE şu konunun İÇERİĞİNİ ${dilAd} dilinde yaz (başlık yazma)`;
    const bolumler = [
      { bas: "tanim", p: `${on} — nedir, neyin nesidir, hangi ülke/kültüre ait, özellikleri, nerede kullanılır.` },
      { bas: "malzemeOlcu", p: `${on} — gereken her şey ve KESİN rakamlar. Bir hamur/yemekse: 1 kg una kaç gr tuz, kaç gr maya, kaç gr şeker, kaç gr/ml yağ, kaç ml su; toplam ölçüler. "Biraz/az" DEME, RAKAM ver. Yemek değilse gerekli alet/malzemeler.` },
      { bas: "hazirlikMaya", p: `${on} — bir hamur/ekmekse yoğurma, 1. mayalanma (kaç saat, kaç derece, hacim kaç katı), gerekiyorsa soğuk fermantasyon/buzdolabında dinlendirme (kaç saat, neden). Yemek değilse hazırlık ve ilk uygulama adımları.` },
      { bas: "sekilPisirme", p: `${on} — şekil verme, 2. mayalanma, pişirme (kaç derece, kaç dakika, buhar/su). Yemek değilse son uygulama ve bitirme adımları.` },
      { bas: "pufHata", p: `${on} — kaliteyi artıran ustalık sırları + sık yapılan hatalar ve nasıl önlenir.` },
      { bas: "sozluk", p: `${on} — bu konuda geçen YABANCI/TEKNİK/zor kelimeleri seç ve her birini "Kelime: kelimenin ${dilAd} dilinde basit anlamı" biçiminde • ile açıkla. HEM kelime HEM anlamı ${dilAd} dilinde olsun. Yeni öğrenen anlasın diye sade anlat.` },
    ];
    // Hepsi hazır OLUNCA tek seferde göster (parça parça belirme yok; ilerleme "2/5" görünür).
    const parcalar = []; let ilerle = 0; setKonuAsama(0);
    for (const b of bolumler) {
      if (istekNoRef.current !== no) return; // kullanıcı başka çeşide geçtiyse bırak
      const c = await gloxSor(b.p, sistem);
      const baslik = AK_ISARET + ((AK_BASLIK[b.bas] && (AK_BASLIK[b.bas][dil] || AK_BASLIK[b.bas].tr)) || "");
      if (c) parcalar.push(baslik + "\n" + duzelt(c));
      ilerle++; if (istekNoRef.current === no) setKonuAsama(ilerle);
    }
    if (istekNoRef.current === no) {
      setKonuDers(parcalar.join("\n\n") || t("akKonuOlmadi", "Şu an alınamadı, tekrar dene.")); setKonuYuk(false);
    }
  }

  // (4) CİDDİ SINAV — profesyonel, zor; HER DENEMEDE FARKLI sorular (ezberleyip geçmesin) — 8 soru
  async function sinavaGir() {
    if (sinavYuk || !meslek) return; setSinavYuk(true); setSonuc(null); setCevaplar({}); setSorular(null);
    const sistem = "Sen Gloxoo'sun — ciddi bir sınav hazırlayıcısın. SADECE geçerli JSON döndür, başka hiçbir şey yazma. Sorular kolay/çocukça DEĞİL; mesleğin gerçek bilgisini ölçen PROFESYONEL sorular olsun (ölçü, teknik, malzeme, sıra, hata).";
    // ÖNCEKİ denemelerdeki soruları hatırla → tekrar sorma (kullanıcı ezberleyip 2-3. denemede geçmesin).
    const oncekiler = (sorulanRef.current || []).slice(-40);
    const kacinma = oncekiler.length ? ` ÇOK ÖNEMLİ: Aşağıdaki DAHA ÖNCE sorulan sorularla AYNI/BENZER soruları SORMA, TAMAMEN FARKLI ve farklı konulardan sor: ${oncekiler.map((s) => "«" + s + "»").join(" ")}.` : "";
    const p = `${dilAd} dilinde, "${meslek.ad}" mesleği için 8 adet CİDDİ çoktan seçmeli sınav sorusu hazırla. Sorular gerçek mesleki bilgi ölçsün (ölçüler/oranlar, doğru teknik, malzeme, işlem sırası, güvenlik/hijyen, sık yapılan hata). Kolay/genel-kültür DEĞİL. Her sorunun 4 şıkkı olsun, biri doğru. Sorular ve şıkların SIRASI karışık olsun.${kacinma} SADECE şu JSON'u döndür: {"sorular":[{"s":"soru","c":["şık1","şık2","şık3","şık4"],"d":0}]} — "d" doğru şıkkın indeksi (0-3). Başka açıklama yazma.`;
    const c = await gloxSor(p, sistem);
    let arr = null;
    try { const temiz = c.replace(/```json|```/g, "").trim(); const o = JSON.parse(temiz.slice(temiz.indexOf("{"), temiz.lastIndexOf("}") + 1)); if (o && Array.isArray(o.sorular)) arr = o.sorular.filter((x) => x && x.s && Array.isArray(x.c) && x.c.length >= 2).slice(0, 8); } catch (e) {}
    if (arr && arr.length) { sorulanRef.current = (sorulanRef.current || []).concat(arr.map((x) => x.s)).slice(-60); } // hatırla
    setSorular(arr && arr.length ? arr : []); setSinavYuk(false);
  }

  function sinaviBitir() {
    if (!sorular || !sorular.length) return;
    let dogru = 0; sorular.forEach((s, i) => { if (cevaplar[i] === s.d) dogru++; });
    const gecti = dogru >= Math.ceil(sorular.length * GECME);
    setSonuc({ dogru, toplam: sorular.length, gecti });
  }

  async function fotoSec(e) {
    const f = e.target && e.target.files && e.target.files[0]; if (!f || !uid) return;
    setYukDurum("foto"); try { const d = await dosyaOku(f); const url = await gorselYukle(d, uid); if (url) setIsFoto(url); } catch (x) {} setYukDurum("");
    if (fotoInpRef.current) fotoInpRef.current.value = "";
  }
  async function videoSec(e) {
    const f = e.target && e.target.files && e.target.files[0]; if (!f || !uid) return;
    setYukDurum("video"); setVideoYuzde(0);
    try { const url = await videoYukle(f, uid, (p) => setVideoYuzde(p)); if (url) setIsVideo(url); } catch (x) {}
    setYukDurum(""); if (videoInpRef.current) videoInpRef.current.value = "";
  }

  async function sertifikaAl() {
    if (!uid || !meslek || kaydediyor) return;
    if (!sonuc || !sonuc.gecti) { alert(t("akOnceSinav", "Önce sınavı geç.")); return; }
    if (!isFoto && !isVideo) { alert(t("akOnceIs", "Önce yaptığın işi foto ya da video ile göster.")); return; }
    setKaydediyor(true);
    const kod = kodUret();
    const tarih = new Date();
    const tarihMetin = tarih.getDate() + "." + (tarih.getMonth() + 1) + "." + tarih.getFullYear();
    try {
      const id = await akademiKayitEkle({
        uid, ad: benAd || "", foto: benFoto || isFoto || "", meslek: meslek.ad, meslekIk: meslek.ik || "🎓",
        sertifikaKod: kod, puan: sonuc.dogru, puanToplam: sonuc.toplam, durum: "onaylandi",
        isFoto: isFoto || "", isVideo: isVideo || "", ulke: ulke || "", sehir: sehir || "", tarihMetin,
      });
      const yeni = { id, uid, ad: benAd || "", foto: benFoto || isFoto || "", meslek: meslek.ad, meslekIk: meslek.ik || "🎓", sertifikaKod: kod, puan: sonuc.dogru, puanToplam: sonuc.toplam, durum: "onaylandi", isFoto, isVideo, ulke, sehir, tarihMetin, zamanMs: Date.now() };
      setKayitlarim((a) => [yeni, ...a]);
      setAktifSertifika(yeni);
    } catch (e) { alert(t("akKaydOlmadi", "Sertifika oluşturulamadı, tekrar dene.")); }
    setKaydediyor(false);
  }

  // QR üret (sertifika kodunu doğrulama metniyle)
  function qrKaynak(kod) {
    try { const qr = qrOlustur(0, "M"); qr.addData("GLOXORG Akademi Sertifikasi | Kod: " + kod + " | gloxorg.com"); qr.make(); return qr.createDataURL(5, 12); } catch (e) { return ""; }
  }

  // ── SERTİFİKA GÖRÜNÜMÜ ──
  if (aktifSertifika) {
    const s = aktifSertifika;
    return (
      <div className="ana-pencere ak-pencere" key="ak-sertifika">
        <button className="ak-geri" onClick={() => setAktifSertifika(null)}>‹ {t("geri", "Geri")}</button>
        <div className="ak-sertifika">
          <div className="ak-srt-ust"><span className="ak-srt-marka notranslate" translate="no">GLOXORG</span><span className="ak-srt-akademi">🎓 {t("akAkademi", "AKADEMİ")}</span></div>
          <div className="ak-srt-baslik">{t("akSertifika", "SERTİFİKA")}</div>
          <div className="ak-srt-foto">{(s.foto || s.isFoto) ? <img src={s.foto || s.isFoto} alt="" referrerPolicy="no-referrer" /> : <span>{(s.ad || "?").trim()[0]}</span>}</div>
          <div className="ak-srt-ad">{s.ad || "—"}</div>
          <div className="ak-srt-metin">{s.meslekIk} <b>{mc(s.meslek, dil)}</b> {t("akTamamladi", "eğitimini başarıyla tamamladı")}</div>
          <div className="ak-srt-puan">✓ {t("akPuan", "Sınav")}: {s.puan}/{s.puanToplam} · {s.tarihMetin}</div>
          <div className="ak-srt-alt">
            <div className="ak-srt-kod"><span>{t("akKod", "Doğrulama kodu")}</span><b>{s.sertifikaKod}</b></div>
            {qrKaynak(s.sertifikaKod) && <img className="ak-srt-qr" src={qrKaynak(s.sertifikaKod)} alt="QR" />}
          </div>
          <div className="ak-srt-not">{t("akSrtNot", "Bu bir GLOXORG Akademi belgesidir. Kod ile doğrulanabilir.")}</div>
        </div>
        {s.isVideo && <video className="ak-is-video" src={s.isVideo} controls playsInline />}
      </div>
    );
  }

  // ── SERTİFİKALARIM ──
  if (gorunum === "sertifikalarim") {
    return (
      <div className="ana-pencere ak-pencere" key="ak-sertlerim">
        <div className="ak-ust"><button className="ak-geri" onClick={() => setGorunum("liste")}>‹ {t("geri", "Geri")}</button><div className="ak-ust-bas">🏅 {t("akSertifikalarim", "Sertifikalarım")}</div></div>
        {kayitlarim.length === 0 ? (
          <div className="ak-bos"><span className="ak-bos-ik">🎓</span><div>{t("akHenuzYok", "Henüz sertifikan yok. Bir eğitim al, sınavı geç, işini göster!")}</div></div>
        ) : (
          <div className="ak-sert-liste">
            {kayitlarim.map((s) => (
              <button className="ak-sert-kart" key={s.id} onClick={() => setAktifSertifika(s)}>
                <span className="ak-sert-ik">{s.meslekIk || "🎓"}</span>
                <span className="ak-sert-bilgi"><b>{mc(s.meslek, dil)}</b><span>{s.tarihMetin} · {s.puan}/{s.puanToplam} ✓</span><span className="ak-sert-kod2">{s.sertifikaKod}</span></span>
                <span className="ak-sert-ok">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── KURS (temel eğitim + çeşitler + sınav + işini göster) ──
  if (gorunum === "kurs" && meslek) {
    return (
      <div className="ana-pencere ak-pencere" key="ak-kurs">
        <div className="ak-ust"><button className="ak-geri" onClick={() => setGorunum("liste")}>‹ {t("geri", "Geri")}</button><div className="ak-ust-bas" style={{ background: meslek.bg }}>{meslek.ik} {mc(meslek.ad, dil)}</div></div>

        {/* MESLEK KAPAK FOTOĞRAFI (yapay zekâ, bir kez üretilir) */}
        <div className="ak-kapak" style={{ background: meslek.bg }}>
          {kapakGorsel ? <img src={kapakGorsel} alt="" referrerPolicy="no-referrer" /> : <span className="ak-kapak-ik">{meslek.ik}</span>}
        </div>

        {/* 1) TEMEL EĞİTİM */}
        <div className="ak-adim">
          <div className="ak-adim-bas"><span className="ak-adim-no">1</span> 📚 {t("akTemelEgitim", "Temel Eğitim")}</div>
          <div className="ak-adim-alt">{t("akTemelAlt", "Gloxoo bu meslek hakkında genel bilgiyi öğretir.")}</div>
          {!ders && !dersYuk && <button className="ak-btn" onClick={egitimAl}>{t("akEgitimAl", "Eğitimi başlat")}</button>}
          {dersYuk && <div className="ak-yuk">⏳ {t("akHazirliyor2", "Gloxoo eğitimi hazırlıyor")}{dersAsama ? " %" + Math.round((dersAsama / 4) * 100) : "…"}</div>}
          {ders && <SesliMetin metin={ders} className="ak-ders" sesDili={dil} onSesIlerleme={onSesIlerleme} />}
          {ders && !dersYuk && <MetinAraclar metin={ders} baslik={mc(meslek.ad, dil) + " — " + t("akTemelEgitim", "Temel Eğitim")} />}
          {ders && !dersYuk && <div className="ak-bitti">✓ {t("akBitti", "Anlatım tamamlandı")}</div>}
        </div>

        {/* 2) ÇEŞİTLER — artık temel eğitime BAĞLI DEĞİL; sayfa açılınca hemen görünür (kullanıcı: her seferinde ilk sayfayı yüklemek zorunda kalmayayım, çeşitlere ayrı gireyim) */}
        {(
          <div className="ak-adim">
            <div className="ak-adim-bas"><span className="ak-adim-no">2</span> 🧩 {t("akCesitler", "Çeşitler — hepsi tek tek")}</div>
            <div className="ak-adim-alt">{t("akCesitAlt2", "Bir çeşide dokun; Gloxoo onu ölçüsü ve adım adım yapılışıyla anlatır. Listede yoksa aşağıya kendin yaz, Gloxoo onu da anlatır + fotoğrafını verir.")}</div>
            {/* LİSTEDE OLMAYAN ÇEŞİDİ KENDİN SOR */}
            <div className="ak-konu-ara">
              <input value={konuAra} onChange={(e) => setKonuAra(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && konuAra.trim()) { konuAc(konuAra.trim()); } }} placeholder={t("akKonuAraYer", "Başka bir çeşit/model yaz (örn. dünyadan bir ekmek)…")} />
              <button className="ak-konu-ara-btn" disabled={!konuAra.trim() || konuYuk} onClick={() => { if (konuAra.trim()) konuAc(konuAra.trim()); }}>{t("akSor", "Sor")}</button>
            </div>
            {/* TARİF/DETAY — bir çeşide ya da Sor'a basınca HEMEN BURADA (Sor kutusunun altında) açılır; aşağıda kaybolmaz */}
            {aktifKonu && (
              <div className="ak-konu-detay" ref={konuDetayRef}>
                <div className="ak-konu-bas">📌 {aktifKonu}</div>
                {/* TEK FOTOĞRAF — bu çeşide özel, tek tek yüklenir */}
                {konuGorsel ? (
                  <img className="ak-konu-gorsel" src={konuGorsel} alt={aktifKonu} referrerPolicy="no-referrer" />
                ) : konuGorselYuk ? (
                  <div className="ak-gorsel-yuk">🖼️ {t("akGorselHazir2", "Fotoğraf hazırlanıyor…")}</div>
                ) : null}
                {konuYuk
                  ? <div className="ak-yuk">⏳ {t("akKonuYuk3", "Gloxoo tarifi hazırlıyor")}{konuAsama ? " %" + Math.round((konuAsama / 6) * 100) : "…"}</div>
                  : <SesliMetin metin={konuDers} className="ak-ders" sesDili={dil} onSesIlerleme={onSesIlerleme} />}
                {!konuYuk && konuDers && <MetinAraclar metin={konuDers} baslik={aktifKonu} />}
                {!konuYuk && konuDers && <div className="ak-bitti">✓ {t("akBitti", "Anlatım tamamlandı")}</div>}
              </div>
            )}
            {!konular && !konularYuk && <button className="ak-btn" onClick={konulariYukle}>{t("akCesitGetir", "Çeşitleri getir")}</button>}
            {konularYuk && <div className="ak-yuk">⏳ {t("akCesitYuk", "Çeşitler getiriliyor…")}</div>}
            {konular && konular.length === 0 && <div className="ak-yuk">{t("akCesitOlmadi", "Alınamadı.")} <button className="ak-btn kucuk" onClick={konulariYukle}>{t("tekrar", "Tekrar")}</button></div>}
            {konular && konular.length > 0 && (
              <div className="ak-konu-izgara">
                {konular.map((k, i) => {
                  const ad = (k && typeof k === "object") ? k.ad : String(k);
                  const ik = cesitIkon(ad) || meslek.ik;
                  return (
                    <button key={ad + i} className={"ak-konu-kart" + (aktifKonu === ad ? " aktif" : "")} style={{ background: CESIT_RENK[i % CESIT_RENK.length] }} onClick={() => konuAc(k)}>
                      <span className="ak-konu-kart-ik2" aria-hidden="true">{ik}</span>
                      <span className="ak-konu-kart-ad">{ad}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3) KURULUŞ & FİZİBİLİTE — fabrika/imalathane nasıl kurulur: makine, HAM MADDE temini, maliyet/kâr */}
        {(
          <div className="ak-adim">
            <div className="ak-adim-bas"><span className="ak-adim-no">3</span> 🏭 {t("akKurulus", "Kuruluş & Fizibilite")}</div>
            <div className="ak-adim-alt">{t("akKurulusAlt", "Bu işin imalathanesi/fabrikası nasıl kurulur: makine-teçhizat, ham madde nedir ve nasıl temin edilir, üretim akışı, maliyet ve kâr — eksiksiz fizibilite.")}</div>
            {!fizibilite && !fizibiliteYuk && <button className="ak-btn" onClick={fizibiliteAl}>{t("akKurulusAl", "Fizibiliteyi hazırla")}</button>}
            {fizibiliteYuk && <div className="ak-yuk">⏳ {t("akKurulusHazir", "Gloxoo fizibiliteyi hazırlıyor")}{fizibiliteAsama ? " %" + Math.round((fizibiliteAsama / 6) * 100) : "…"}</div>}
            {fizibilite && <SesliMetin metin={fizibilite} className="ak-ders" sesDili={dil} onSesIlerleme={onSesIlerleme} />}
            {fizibilite && !fizibiliteYuk && <MetinAraclar metin={fizibilite} baslik={mc(meslek.ad, dil) + " — " + t("akKurulus", "Kuruluş & Fizibilite")} />}
            {fizibilite && !fizibiliteYuk && <div className="ak-bitti">✓ {t("akBitti", "Anlatım tamamlandı")}</div>}
          </div>
        )}

        {/* 4) CİDDİ SINAV — temel eğitime BAĞLI DEĞİL; istediğinde doğrudan sınava girebilir */}
        {(
          <div className="ak-adim">
            <div className="ak-adim-bas"><span className="ak-adim-no">4</span> 📝 {t("akSinav", "Sınav (ciddi)")}</div>
            <div className="ak-adim-alt">{t("akSinavAlt", "Gerçek mesleki sorular. Sertifika için en az %70 gerekir.")}</div>
            {!sorular && !sinavYuk && <button className="ak-btn" onClick={sinavaGir}>{t("akSinavaGir", "Sınava gir")}</button>}
            {sinavYuk && <div className="ak-yuk">⏳ {t("akSorular", "Sorular hazırlanıyor…")}</div>}
            {sorular && sorular.length === 0 && <div className="ak-yuk">{t("akSinavOlmadi", "Sınav alınamadı, tekrar dene.")} <button className="ak-btn kucuk" onClick={sinavaGir}>{t("tekrar", "Tekrar")}</button></div>}
            {sorular && sorular.length > 0 && (
              <div className="ak-sinav">
                {sorular.map((s, i) => (
                  <div className="ak-soru" key={i}>
                    <div className="ak-soru-m"><b>{i + 1}.</b> {s.s}</div>
                    <div className="ak-secenekler">
                      {s.c.map((c, j) => (
                        <button key={j} className={"ak-secenek" + (cevaplar[i] === j ? " sec" : "") + (sonuc ? (j === s.d ? " dogru" : (cevaplar[i] === j ? " yanlis" : "")) : "")} disabled={!!sonuc} onClick={() => setCevaplar((o) => ({ ...o, [i]: j }))}>{c}</button>
                      ))}
                    </div>
                  </div>
                ))}
                {!sonuc ? (
                  <button className="ak-btn" disabled={Object.keys(cevaplar).length < sorular.length} onClick={sinaviBitir}>{t("akBitir", "Sınavı bitir")}</button>
                ) : (
                  <div className={"ak-sonuc" + (sonuc.gecti ? " gecti" : " kaldi")}>
                    {sonuc.gecti ? "🎉 " + t("akGecti", "Geçtin!") : "😔 " + t("akKaldi", "Geçemedin")} — {sonuc.dogru}/{sonuc.toplam}
                    {!sonuc.gecti && <button className="ak-btn kucuk" onClick={sinavaGir}>{t("akTekrarSinav", "Tekrar dene")}</button>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5) İŞİNİ GÖSTER */}
        {sonuc && sonuc.gecti && (
          <div className="ak-adim">
            <div className="ak-adim-bas"><span className="ak-adim-no">5</span> 🎥 {t("akIsGoster", "Yaptığın işi göster")}</div>
            <div className="ak-adim-alt">{t("akIsAlt", "Kendi yaptığın işi foto ve/veya video ile yükle — sertifikanda kanıt olarak kalır.")}</div>
            <div className="ak-yukle-satir">
              <button className="ak-yukle-btn" onClick={() => fotoInpRef.current && fotoInpRef.current.click()} disabled={yukDurum === "foto"}>{yukDurum === "foto" ? "…" : (isFoto ? "✓ 📷 " + t("akFoto", "Foto") : "📷 " + t("akFotoEkle", "Foto ekle"))}</button>
              <button className="ak-yukle-btn" onClick={() => videoInpRef.current && videoInpRef.current.click()} disabled={yukDurum === "video"}>{yukDurum === "video" ? ("… %" + videoYuzde) : (isVideo ? "✓ 🎥 " + t("akVideo", "Video") : "🎥 " + t("akVideoEkle", "Video ekle"))}</button>
              <input ref={fotoInpRef} type="file" accept="image/*" style={{ display: "none" }} onChange={fotoSec} />
              <input ref={videoInpRef} type="file" accept="video/*" style={{ display: "none" }} onChange={videoSec} />
            </div>
            {isFoto && <img className="ak-onizleme" src={isFoto} alt="" referrerPolicy="no-referrer" />}
            {isVideo && <video className="ak-onizleme" src={isVideo} controls playsInline />}
            <button className="ak-btn ak-sertifika-al" disabled={(!isFoto && !isVideo) || kaydediyor} onClick={sertifikaAl}>{kaydediyor ? "…" : "🏅 " + t("akSertifikamiAl", "Sertifikamı al")}</button>
          </div>
        )}
      </div>
    );
  }

  // ── MESLEK LİSTESİ (ana) ──
  const q = ara.trim().toLocaleLowerCase("tr");
  const liste = q ? MESLEK_LISTESI.filter((m) => ((m.ad || "") + " " + mc(m.ad, dil)).toLocaleLowerCase("tr").indexOf(q) !== -1) : MESLEK_LISTESI;
  return (
    <div className="ana-pencere ak-pencere" key="ak-liste">
      <div className="ak-hero">
        <div className="ak-hero-bas">🎓 {t("akBaslik", "GLOXORG Akademi")}</div>
        <div className="ak-hero-alt">{t("akHeroAlt", "Her meslek için eğitim al, çeşitleri tek tek öğren, Gloxoo sınavını geç, işini göster — doğrulanabilir sertifikanı kazan.")}</div>
        <button className="ak-sertlerim-btn" onClick={() => setGorunum("sertifikalarim")}>🏅 {t("akSertifikalarim", "Sertifikalarım")}{kayitlarim.length ? " (" + kayitlarim.length + ")" : ""}</button>
      </div>
      <div className="ak-ara-sar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
        <input value={ara} onChange={(e) => setAra(e.target.value)} placeholder={t("akAra", "Meslek ara…")} />
        {ara && <button onClick={() => setAra("")}>✕</button>}
      </div>
      <div className="ak-kurs-izgara">
        {liste.map((m, i) => {
          const alindi = kayitlarim.some((s) => s.meslek === m.ad);
          return (
            <button className="ak-kurs-kart" key={m.ad + i} style={{ background: m.bg }} onClick={() => kursAc(m)}>
              <span className="ak-kurs-ik">{m.ik}</span>
              <span className="ak-kurs-ad">{mc(m.ad, dil)}</span>
              {alindi && <span className="ak-kurs-rozet">🏅</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
