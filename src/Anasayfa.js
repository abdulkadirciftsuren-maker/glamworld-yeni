import { useState, useEffect, useRef, useMemo, Fragment, Component } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail } from "firebase/auth";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import maplibregl from "maplibre-gl"; // GERÇEK döndürülebilir harita (Google Haritalar gibi: WebGL, iki parmakla döner)
import "maplibre-gl/dist/maplibre-gl.css";
import { feature as topoFeature } from "topojson-client"; // ülke sınırları (GÖMÜLÜ — CDN değil; telefon haritası siyah çıkmasın)
import qrOlustur from "qrcode-generator"; // QR kod (GÖMÜLÜ, CDN yok) — davet linki için
import { auth, fcmTokenAl, fcmDurumAl } from "./firebase";
import { profilOku, profilKaydet, profesyonelAra, mesajGonder, mesajlariOku, mesajlarimiDinle, mesajOkunduYap, mesajTepkiVer, mesajSilGeriCek, mesajDuzelt, aramaOlustur, aramaDinle, aramaGuncelle, gelenAramalariDinle, iceAdayEkle, iceAdaylariDinle, gonderiEkle, gonderileriOku, gonderilerimOku, gonderiSil, gonderiGuncelle, gonderiAvatarGuncelle, begeniAvatarGuncelle, yorumAvatarGuncelle, videoYukle, dosyaYukle, gorselYukle, yorumEkle, yorumlariOku, bildirimEkle, bildirimleriDinle, bildirimleriOkunduYap, takipEt, takiptenCik, takipEttiklerimOku, sayacDegistir, begeniYaz, begeniSilDoc, begenenleriOku, benimBegenilerim, geriBildirimEkle, geriBildirimOku, tumKullanicilar, tumGonderiler, kullaniciSil, hikayeEkle, hikayeleriOku, hikayeSil, hikayeGorulduSay, anketOyVer, anketOylariOku, fcmTokenKaydet } from "./veri";
import { MESLEK_LISTESI } from "./meslekler";
import { buildGecmisi } from "./buildGecmisi";
import { FABRIKA_LISTESI, TEDARIK_LISTESI, ISCI_LISTESI, DEVLET_LISTESI, ULKE_KOD } from "./sektorler";
import { mc, ulkeAdiCevir, meslekCevir, DILLER } from "./i18n";
import { isoToTelKod, NUM_TO_ISO2 } from "./ulkeKodlari";
import { KKTC_RING, KIRIM_RING } from "./ozelBolgeler";
import SurumRozeti from "./SurumRozeti";
import DilSecici from "./DilSecici";
import yakutZemin from "./yakutZemin.jpg"; // PRO (kırmızı) üye üstbar alt zemini = yakut pırlanta (3 aynalı)
import maviZemin from "./maviZemin.jpg";   // MÜŞTERİ (beyaz/mavi üye) üstbar alt zemini = mavi pırlanta (3 aynalı)
import yesilZemin from "./yesilZemin.jpg"; // ALTIN PIRLANTA üyeliği (max) üstbar alt zemini = yeşil pırlanta (3 aynalı)
import gloxWordmark from "./gloxWordmark.png";                 // ALTIN(yeşil): KOYU içli GLOXORG → renkli zeminde belli
import gloxWordmarkKirmizi from "./gloxWordmarkKirmizi.png";   // MÜŞTERİ(kırmızı): TÜM BLOK — GLOXORG kırmızı pırlanta üstünde (kesildi, kırmızı zemine karışır)
import gloxWordmarkMavi from "./gloxWordmarkMavi.png";         // PRO(mavi): GLOXORG harfleri mavi safir banner'dan ŞEFFAF kesildi
import gloxWordmarkYesil from "./gloxWordmarkYesil.png";       // ALTIN(yeşil): GLOXORG harfleri yeşil emerald banner'dan ŞEFFAF kesildi
import cerceveResim from "./cerceve.png";                     // ÜSTBAR işlemeli altın çerçeve (müşteri/altın) — border-image (9-slice)
import proCerceveResim from "./proCerceve.png";               // PRO üstbar: işlemeli altın+mücevher çerçeve — border-image
import yesilCerceveResim from "./yesilCerceve.png";           // ALTIN(yeşil) üstbar: işlemeli altın+mücevher çerçeve (kullanıcı) — border-image
import profilCerceveResim from "./profilCerceve.png";         // PROFİL (müşteri=KIRMIZI yakut) yuvarlak pırlanta çerçevesi
import profilCerceveMaviResim from "./profilCerceveMavi.png"; // PROFİL (pro=MAVİ safir)
import profilCerceveYesilResim from "./profilCerceveYesil.png"; // PROFİL (altın=YEŞİL zümrüt)
import ayiCerceveResim from "./ayiCerceve.png";               // EKSPERT (ayı) üst düğmesi — yuvarlak MAVİ safir çerçeve (müşteri/altın)
import ayiCervevoProResim from "./ayiCervevePro.png";          // EKSPERT (ayı) PRO — MOR ametist çerçeve (pro profili mavi olduğu için ayı farklı renk)
import ikonCerceveResim from "./ikonCerceve.png";             // MENÜ — yuvarlak YEŞİL zümrüt çerçeve (kod çizimi, lacivert madalyon)
import zilCerceveResim from "./zilCerceve.png";               // ZİL (bildirim yok) — AÇIK kırmızı çerçeve
import zilCerceveKirmiziResim from "./zilCerceveKirmizi.png"; // ZİL (bildirim VAR) — TAM kırmızı çerçeve + numara
import "./Anasayfa.css";

// PUSH BİLDİRİM anahtarı (Firebase Console > Proje Ayarları > Cloud Messaging > Web Push sertifikaları).
// BOŞKEN push kaydı yapılmaz (uygulama normal çalışır). Kullanıcı anahtarı verince buraya yazılır → kapalıyken bildirim aktifleşir.
const VAPID_KEY = "BGPlXpNRkU6i2TSNsita7I6gOA_D0JxIQvM48wunh_-urSCxts-8fnhCjW1dAr_Krrwp_btQu_CrP-QHKqGfHq0";

// ARAMA HATA SINIRI — arama (WebRTC) bölümünde beklenmedik bir hata olursa TÜM sayfa çökmesin;
// sadece arama kapanır, sayfanın geri kalanı çalışmaya devam eder. (React Error Boundary — class şart.)
class AramaHataSiniri extends Component {
  constructor(p) { super(p); this.state = { hata: false }; }
  static getDerivedStateFromError() { return { hata: true }; }
  componentDidCatch(err) { try { if (this.props.onHata) this.props.onHata(err); } catch (e) {} }
  componentDidUpdate(prev) { if (prev.anahtar !== this.props.anahtar && this.state.hata) this.setState({ hata: false }); }
  render() { return this.state.hata ? null : this.props.children; }
}

// Ayarlar konum haritası için altın damla pin (resim gerektirmez)
const ayarPinIkon = () => L.divIcon({ className: "", html: '<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#FFD700;border:2px solid #fff;box-shadow:0 2px 7px rgba(0,0,0,.55)"></div>', iconSize: [20, 20], iconAnchor: [10, 20] });
// AYARLAR akordeon bölümü — MODÜL seviyesinde (render içinde tanımlanırsa her tuşta remount olup TİTRER + odak kaybeder).
// AÇIKLAMA (?) İKONU — her yerde müşteriyi bilgilendir (ANAYASA). Dokununca ne yapılacağını anlatan baloncuk açar.
function BilgiBtn({ metin, onAc, className }) {
  return <button type="button" className={"bilgi-btn" + (className ? " " + className : "")} onClick={(e) => { e.stopPropagation(); e.preventDefault(); onAc(metin); }} aria-label="Açıklama">?</button>;
}
// ANAYASA KURALI: Bir düğme/etikette yazı SIĞMIYORSA kesilmez → yazı şeritte SOLA doğru CANLI yürür,
// 3 kez gidip başa döner, sonra BAŞTA durur. Bunu her yerde bu bileşenle sağlarız (<KayanYazi>metin</KayanYazi>).
// ÖZGÜN MARKA İSİMLERİ (kopya değil, bize ait) — kullanıcı seçer, kolayca değişir.
// Hikâye özelliği: "Parıltı" (alternatif: An / Işıltı / Kıvılcım). Reels özelliği: "Gloxo" (alternatif: Şimşek / Vitrin / Akıntı).
const HIKAYE_AD = "Işıltını Göster"; // hikâye oluştur düğmesi (alternatif: "Anlık Parıltı" / "Kıvılcım Çak")
const REELS_AD = "Makara";           // reels (alternatif: "Film Makarası")
function KayanYazi({ children, className }) {
  const disRef = useRef(null);
  const icRef = useRef(null);
  const [kayma, setKayma] = useState(0); // taşma miktarı (px) — 0 ise sığıyor, kaymaz
  useEffect(() => {
    const dis = disRef.current, ic = icRef.current;
    if (!dis || !ic) return;
    const olc = () => { const tasma = Math.ceil(ic.scrollWidth - dis.clientWidth); setKayma(tasma > 2 ? tasma : 0); };
    olc();
    let ro; try { ro = new ResizeObserver(olc); ro.observe(dis); ro.observe(ic); } catch (e) {}
    return () => { try { ro && ro.disconnect(); } catch (e) {} };
  }, [children]);
  return (
    <span ref={disRef} className={"kayan-dis" + (className ? " " + className : "")}>
      <span ref={icRef} className={"kayan-ic" + (kayma ? " kayar" : "")} style={kayma ? { "--kayma": "-" + kayma + "px" } : undefined}>{children}</span>
    </span>
  );
}
function AyarBolum({ ad, ikon, renk, acik, onTik, children, bilgi, onAcBilgi }) {
  return (
    <div className={"ayar-bolum" + (acik ? " acik" : "")} style={renk ? { "--ar": renk } : undefined}>
      <button className="ayar-bolum-bas" onClick={onTik}>
        <span className="ayar-bolum-ik">{ikon}</span>
        <span className="ayar-bolum-ad">{ad}</span>
        {bilgi && <span className="ayar-bolum-soru" role="button" tabIndex={0} aria-label="?" onClick={(e) => { e.stopPropagation(); onAcBilgi && onAcBilgi(bilgi); }}>?</span>}
        <span className="ayar-bolum-ok">{acik ? "▾" : "▸"}</span>
      </button>
      {acik && <div className="ayar-bolum-ic">{children}</div>}
    </div>
  );
}

// Derinlik pırlantaları — GERÇEK kesimli, fasetli, etrafı altın yüzük çerçeveli renkli elmaslar
// (ANAYASA 6.15 — gerçek pırlanta + yüzük çerçeve). Her yere eşit dağılır; derinlikten yukarı süzülüp söner.
// 12 GERÇEK pırlanta rengi (kullanıcının referans fotoğraflarından): Brilliant White, Sapphire Blue,
// Royal Purple, Emerald Green, Golden Yellow, Pink Rose, Fire Red, Aqua Teal, Champagne, Ice Blue,
// Mystic Black, Aurora Opal — her sayfada bu renkler döner.
const GEM_RENK = ["#dfeaff", "#2f6fd6", "#9b4fd6", "#1ea64f", "#f2a900", "#ff7ab0", "#e0202c", "#1fc2c2", "#d2a064", "#8fc4f0", "#3a3a4a", "#cda8e6"];
// Akış kartı renkleri — her gönderi FARKLI renk vurgusu (canlılık; kullanıcı kuralı). Sırayla döner.
const POST_RENK = ["#2f7fd6", "#1fc2c2", "#9b59b6", "#1ea64f", "#f2a900", "#ff7ab0", "#e0707a", "#5aa6e0", "#46d37a", "#c98bff"];
// GERÇEK CLAUDE yapay zeka köprüsü (Cloudflare Worker) — anahtar köprüde GİZLİ, siteye yazılmaz
const AI_KOPRU = "https://gloxorg-ai.abdulkadirciftsuren.workers.dev";
// Uygulama sürümü (Gloxoo SADECE yeni sürümde/güncelleme sonrası ilk açılışta selamlar)
const AKTIF_SURUM = (buildGecmisi && buildGecmisi[0]) ? (buildGecmisi[0].surum + ".B" + buildGecmisi[0].build) : "";
// Hikâye YAZI STİLLERİ (Facebook gibi) — seçili yazıya uygulanır
const HIK_FONTLAR = [
  { k: "sade", ad: "Sade", css: "-apple-system,'Segoe UI',Roboto,sans-serif" },
  { k: "klasik", ad: "Klasik", css: "Georgia,'Times New Roman',serif" },
  { k: "kalin", ad: "Kalın", css: "'Arial Black','Trebuchet MS',sans-serif" },
  { k: "daktilo", ad: "Daktilo", css: "'Courier New',monospace" },
  { k: "elyazi", ad: "El yazısı", css: "'Segoe Script','Bradley Hand','Brush Script MT',cursive" },
  { k: "zarif", ad: "Zarif", css: "'Palatino Linotype','Book Antiqua',Palatino,serif" },
];
const hikFontCss = (k) => (HIK_FONTLAR.find((f) => f.k === k) || HIK_FONTLAR[0]).css;
// TEPKİLER (Facebook gibi) — beğeniye uzun basınca çıkar; sadece kalp değil
const TEPKILER = [
  { k: "begen", e: "👍", ad: "Beğen" },
  { k: "kalp", e: "❤️", ad: "Sevdim" },
  { k: "kahkaha", e: "😂", ad: "Güldüm" },
  { k: "saskin", e: "😮", ad: "Şaşırdım" },
  { k: "uzgun", e: "😢", ad: "Üzüldüm" },
  { k: "kizgin", e: "😡", ad: "Kızdım" },
];
const tepkiEmoji = (k) => (TEPKILER.find((x) => x.k === k) || TEPKILER[1]).e;

// Yazıdaki bağlantıları (gloxorg.com, www…, http…) TIKLANABİLİR yapar → karşı taraf dokununca o SAYFA açılır (fotoğrafı açmaz).
// Kullanıcı Ayarlar'dan "gloxorg.com" kopyalayıp yazısına yapıştırınca, burada otomatik linke dönüşür.
function metniLinkle(metin) {
  const s = String(metin || "");
  if (!s || s.indexOf(".") === -1) return s;
  const re = /((?:https?:\/\/|www\.)[^\s]+|(?:[a-z0-9-]+\.)+(?:com|net|org|io|co|dev|app|info|biz|me|tv|gg)(?:\/[^\s]*)?)/gi;
  const parcalar = []; let sonIndex = 0, m, i = 0;
  while ((m = re.exec(s)) !== null) {
    if (m.index > sonIndex) parcalar.push(s.slice(sonIndex, m.index));
    const ham = m[0];
    const href = /^https?:\/\//i.test(ham) ? ham : ("https://" + ham.replace(/^www\./i, ""));
    parcalar.push(<a key={"lnk" + (i++)} className="yazi-link notranslate" translate="no" href={href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{ham}</a>);
    sonIndex = m.index + ham.length;
  }
  if (!parcalar.length) return s;
  if (sonIndex < s.length) parcalar.push(s.slice(sonIndex));
  return parcalar;
}

// HER CÜMLE FARKLI RENK + küçük elmas ikonu (kullanıcı isteği: renkli, ikonlu, her cümle bir renk).
// RC_KOYU = AÇIK zeminde okunur (karşılama balonu); RC_ACIK = KOYU zeminde okunur (Gloxoo sohbeti).
const RC_KOYU = ["#e11d1d", "#1553d8", "#0e8f47", "#9026d1", "#c76a06", "#0c8a8a", "#d61b7a"];
const RC_ACIK = ["#ffd743", "#74dcff", "#ff97c2", "#78f2b4", "#cfa2ff", "#ffb066", "#7cd0ff"];

// AI PANEL butonlari — 13 dil (i18n cogu anahtari yalniz tr/en tuttugu icin bu butonlar burada cok dilli)
const AIPANEL = {
  oku: { tr: "Sesli oku", en: "Read aloud", de: "Vorlesen", fr: "Lire à voix haute", es: "Leer en voz alta", it: "Leggi ad alta voce", pt: "Ler em voz alta", ru: "Озвучить", uk: "Озвучити", ar: "اقرأ بصوت", zh: "朗读", ja: "読み上げ", hi: "पढ़कर सुनाएँ" },
  durdur: { tr: "Durdur", en: "Stop", de: "Stopp", fr: "Arrêter", es: "Detener", it: "Ferma", pt: "Parar", ru: "Стоп", uk: "Стоп", ar: "إيقاف", zh: "停止", ja: "停止", hi: "रोकें" },
  kopyala: { tr: "Kopyala", en: "Copy", de: "Kopieren", fr: "Copier", es: "Copiar", it: "Copia", pt: "Copiar", ru: "Копировать", uk: "Копіювати", ar: "نسخ", zh: "复制", ja: "コピー", hi: "कॉपी" },
  indir: { tr: "İndir", en: "Download", de: "Herunterladen", fr: "Télécharger", es: "Descargar", it: "Scarica", pt: "Baixar", ru: "Скачать", uk: "Завантажити", ar: "تنزيل", zh: "下载", ja: "ダウンロード", hi: "डाउनलोड" },
  paylas: { tr: "Paylaş", en: "Share", de: "Teilen", fr: "Partager", es: "Compartir", it: "Condividi", pt: "Partilhar", ru: "Поделиться", uk: "Поділитися", ar: "مشاركة", zh: "分享", ja: "共有", hi: "साझा करें" },
  yaz: { tr: "Buraya yaz…", en: "Type here…", de: "Hier schreiben…", fr: "Écris ici…", es: "Escribe aquí…", it: "Scrivi qui…", pt: "Escreve aqui…", ru: "Напишите здесь…", uk: "Пишіть тут…", ar: "اكتب هنا…", zh: "在这里输入…", ja: "ここに入力…", hi: "यहाँ लिखें…" },
  durakla: { tr: "Duraklat", en: "Pause", de: "Pause", fr: "Pause", es: "Pausa", it: "Pausa", pt: "Pausa", ru: "Пауза", uk: "Пауза", ar: "إيقاف مؤقت", zh: "暂停", ja: "一時停止", hi: "रोकें" },
  devam: { tr: "Devam", en: "Resume", de: "Weiter", fr: "Reprendre", es: "Continuar", it: "Riprendi", pt: "Continuar", ru: "Продолжить", uk: "Продовжити", ar: "متابعة", zh: "继续", ja: "再開", hi: "जारी रखें" },
  sus: { tr: "Sus", en: "Stop", de: "Aus", fr: "Stop", es: "Parar", it: "Basta", pt: "Parar", ru: "Стоп", uk: "Стоп", ar: "إسكات", zh: "停止", ja: "止める", hi: "बंद" },
};
function pl(dil, key) { const o = AIPANEL[key]; return (o && (o[dil] || o.en)) || ""; }
function renkliCumleler(metin, palet, aktif) {
  if (!metin) return null;
  const p = palet || RC_ACIK;
  const parcalar = String(metin).match(/[^.!?…\n]+[.!?…]*/g) || [String(metin)];
  return parcalar.map((c, i) => {
    const s = c.trim();
    if (!s) return null;
    const renk = p[i % p.length];
    // ŞU AN okunan cümle (aktif===i) VURGULANIR (kalın + parıltı) → kullanıcı nerede okunduğunu görür
    const kls = "rc-cumle" + (aktif === i ? " rc-aktif" : "");
    return (
      <span key={i} data-ci={i} className={kls} style={{ color: renk }}>
        <span className="rc-ik" style={{ color: renk }} aria-hidden="true">◆</span>{s}{" "}
      </span>
    );
  }).filter(Boolean);
}
// KELİME KELİME balon (teleprompter): metin KELİMELERE bölünür, her kelime ayrı <span data-wi=index>.
// OKUNAN kelime (aktif===index) VURGULANIR + üstüne ▸ imleç konur → kullanıcı NEREDE okunduğunu görür.
// Renk cümleye göre (okunaklı, canlı). aktif değişince sadece o kelime yeniden boyanır.
function kelimeBalon(metin, palet, aktif) {
  if (!metin) return null;
  const p = palet || RC_ACIK;
  const cumleler = String(metin).match(/[^.!?…\n]+[.!?…]*/g) || [String(metin)];
  let wi = -1;
  const cikti = [];
  cumleler.forEach((c, ci) => {
    const renk = p[ci % p.length];
    const kelimeler = c.trim().split(/\s+/).filter(Boolean);
    kelimeler.forEach((k, ki) => {
      wi++;
      const bu = wi;
      const aktifMi = aktif === bu;
      cikti.push(
        <span key={ci + "-" + ki} data-wi={bu} className={"kb-kel" + (aktifMi ? " kb-aktif" : "")} style={{ color: renk }}>
          {aktifMi && <span className="kb-ok" aria-hidden="true">▸</span>}{k}{" "}
        </span>
      );
    });
  });
  return cikti;
}
// Metindeki toplam kelime sayısı (teleprompter ilerlemesini kelimeye çevirmek için) — kelimeBalon ile AYNI bölme
function kelimeSayisi(metin) {
  if (!metin) return 0;
  return String(metin).trim().split(/\s+/).filter(Boolean).length;
}
// ADRESİ SAF LATİN/İNGİLİZCE HARFE ÇEVİR: ß→ss, ö→o, ü→u, ş→s, ç→c, aksanları at.
// Böylece adres HER dilde İngilizce/Latin çıkar (özel harf yüzünden hata/karmaşa olmaz).
function latinYap(s) {
  if (!s) return s || "";
  return String(s)
    .replace(/ß/g, "ss").replace(/ẞ/g, "Ss")
    .replace(/æ/g, "ae").replace(/Æ/g, "Ae").replace(/œ/g, "oe").replace(/Œ/g, "Oe")
    .replace(/ø/g, "o").replace(/Ø/g, "O").replace(/ð/g, "d").replace(/Ð/g, "D")
    .replace(/þ/g, "th").replace(/Þ/g, "Th").replace(/ł/g, "l").replace(/Ł/g, "L")
    .replace(/đ/g, "d").replace(/Đ/g, "D").replace(/ı/g, "i").replace(/İ/g, "I")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, ""); // kalan tüm aksanları (ö/ü/ä/é/ç/ş/ğ...) sil
}
// BEĞENEN AVATAR ŞERİDİ — gönderiyi beğenenlerin ufak profil resimleri, İSTİFLENMİŞ (öne doğru küçülerek).
// Gerçek beğeni verisi Firestore'dan (begenenleriOku) çekilir; beğeni yoksa hiç görünmez.
function BegenenlerSerit({ postId, sayi, dil, onAc, onSayi }) {
  const [liste, setListe] = useState(null);
  useEffect(() => {
    let iptal = false;
    if (!postId || !sayi) { setListe([]); return; }
    // GERÇEK beğenenleri oku (100'e kadar) → hem avatarlar hem DOĞRU SAYI (sayaç yanlışsa bunu kullanırız: 2 kişi beğendiyse 2 gösterir)
    begenenleriOku(postId, 100).then((l) => { if (!iptal) { const arr = l || []; setListe(arr); if (onSayi) onSayi(postId, arr.length); } }).catch(() => { if (!iptal) setListe([]); });
    return () => { iptal = true; };
  }, [postId, sayi]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!liste || !liste.length) return null;
  const goster = liste.slice(0, 4);
  const ilkHarf = ((goster[0].ad || "?").trim()[0] || "?").toUpperCase();
  // YAZI KALDIRILDI (kullanıcı) — sadece ufak fotoğraflar; dokununca beğenen/yorum yapan LİSTESİ açılır
  return (
    <div className="begenen-serit" role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); if (onAc) onAc(postId); }}>
      <div className="begenen-avlar">
        {goster.map((b, i) => (
          <span className="begenen-av" key={b.id || i} style={{ width: 27 - i * 2, height: 27 - i * 2, marginLeft: i === 0 ? 0 : -(9 - i), zIndex: 9 - i }}>
            {b.foto ? <img src={b.foto} alt="" referrerPolicy="no-referrer" /> : <span className="begenen-harf">{((b.ad || "?").trim()[0] || "?").toUpperCase()}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
// YORUM YAPANLAR şeridi — yorum ikonunun altında ufak fotolar; dokununca yorum penceresi açılır
function YorumcuSerit({ postId, sayi, onAc }) {
  const [liste, setListe] = useState(null);
  useEffect(() => {
    let iptal = false;
    if (!postId || !sayi) { setListe([]); return; }
    yorumlariOku(postId).then((yl) => {
      if (iptal) return;
      const g = new Set(); const out = [];
      (yl || []).forEach((y) => { const k = y.uid || y.ad; if (k && !g.has(k)) { g.add(k); out.push(y); } });
      setListe(out);
    }).catch(() => { if (!iptal) setListe([]); });
    return () => { iptal = true; };
  }, [postId, sayi]);
  if (!liste || !liste.length) return null;
  const goster = liste.slice(0, 4);
  return (
    <div className="begenen-serit yorumcu-serit" role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); if (onAc) onAc(); }}>
      <span className="serit-ik" aria-hidden="true">💬</span>
      <div className="begenen-avlar">
        {goster.map((b, i) => (
          <span className="begenen-av" key={b.id || i} style={{ width: 27 - i * 2, height: 27 - i * 2, marginLeft: i === 0 ? 0 : -(9 - i), zIndex: 9 - i }}>
            {b.foto ? <img src={b.foto} alt="" referrerPolicy="no-referrer" /> : <span className="begenen-harf">{((b.ad || "?").trim()[0] || "?").toUpperCase()}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
// Meslek → kendi rengi (ızgaradaki bg'nin ilk hex'i) — gönderi/etikette meslek kendi renginde yazılır.
const MESLEK_RENK = {};
try { MESLEK_LISTESI.forEach((m) => { const h = (String(m.bg).match(/#[0-9a-fA-F]{6}/) || [])[0]; if (h) MESLEK_RENK[m.ad] = h; }); } catch (e) {}
const DERINLIK_PARCALAR = Array.from({ length: 30 }, (_, i) => {
  const sure = 18 + Math.random() * 16;            // YAVAŞ (18-34sn)
  return {
    sol: Math.round(Math.random() * 100),
    bas: Math.round(Math.random() * 8),            // ALTTAN/derinlikten başlar (0-8%)
    boyut: 8 + Math.random() * 9,                   // KÜÇÜK (kullanıcı: zemindeki büyük/beyaz pırlantaları ufalt)
    yuk: 70 + Math.round(Math.random() * 30),       // dipten ekranın TEPESİNE kadar (70-100vh)
    sure,
    // NEGATİF gecikme: sayfa açılır açılmaz hepsi yolun farklı yerinde olur (üst boş kalmaz, sürekli akış)
    gecikme: -(Math.random() * sure),
    renk: GEM_RENK[i % GEM_RENK.length],
  };
});

/* GLOXORG'e özel ince-çizgi ikonlar (hazır emoji DEĞİL — ANAYASA kuralı) */
// GÖNDERİ TÜRÜ AMBLEMLERİ — GLOXORG'a özel çizim (hazır emoji/ikon DEĞİL, ANAYASA 6.124). Her tür sağ-üst köşede kendi amblemiyle.
function TurAmblem({ tip }) {
  const o = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  const w = (k) => <svg viewBox="0 0 24 24" {...o}>{k}</svg>;
  switch (tip) {
    case "hepsi": return w(<><rect x="3.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.4" /></>);
    case "foto": return w(<><rect x="3" y="6" width="18" height="14" rx="2" /><circle cx="12" cy="13" r="3.4" /><path d="M8 6l1.5-2h5L16 6" /></>);
    case "video": return w(<><rect x="2" y="6" width="13" height="12" rx="2" /><path d="M15 10l6-3v10l-6-3z" /></>);
    case "is": return w(<><rect x="3" y="7.5" width="18" height="12.5" rx="2" /><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" /><path d="M3 13h18" /></>);
    case "urun": return w(<><path d="M6.2 8h11.6l-1 11.2a1 1 0 0 1-1 .8H8.2a1 1 0 0 1-1-.8L6.2 8z" /><path d="M9 8a3 3 0 0 1 6 0" /></>);
    case "tavsiye": return w(<path d="M12 3.5l2.5 5.1 5.6.8-4 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-4 5.6-.8L12 3.5z" />);
    case "etkinlik": return w(<><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 9.5h17M8.5 3v4M15.5 3v4" /></>);
    case "duyuru": return w(<><path d="M4 10.5v3a1 1 0 0 0 1 1h2l5.5 4v-13L7 9.5H5a1 1 0 0 0-1 1z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /></>);
    case "soru": return w(<><circle cx="12" cy="12" r="9" /><path d="M9.3 9.4a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.2-2.7 4" /><circle cx="12" cy="17.2" r=".7" fill="currentColor" stroke="none" /></>);
    case "yazi": return w(<><path d="M5 6h14M5 10h14M5 14h10M5 18h7" /></>);
    case "dosya": return w(<><path d="M3.5 7a2 2 0 0 1 2-2h3.2l2 2.2H18.5a2 2 0 0 1 2 2v7.3a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7z" /></>);
    default: return w(<rect x="3" y="6" width="18" height="14" rx="2" />);
  }
}
// Tür adı → amblem tipi + renk
const TUR_AMBLEM = {
  "Fotoğraf": { tip: "foto", renk: "#2ecc71" },
  "Video": { tip: "video", renk: "#d4af37" }, /* VİDEO = ALTIN (kullanıcı: altın sadece video) */
  "İş İlanı": { tip: "is", renk: "#9b59b6" },
  "Ürün / Hizmet": { tip: "urun", renk: "#1fc2c2" },
  "Tavsiye": { tip: "tavsiye", renk: "#f2a900" },
  "Etkinlik": { tip: "etkinlik", renk: "#5aa6e0" },
  "Duyuru": { tip: "duyuru", renk: "#ff7ab0" },
  "Soru / Yardım": { tip: "soru", renk: "#7e57c2" },
};
// Bir gönderinin amblemi (video > tür > foto)
function postAmblem(p) {
  if (!p) return null;
  if (p.video) return { tip: "video", renk: "#d4af37" }; // VİDEO = ALTIN
  if (p.tur && TUR_AMBLEM[p.tur]) return TUR_AMBLEM[p.tur];
  if (p.gorsel) return { tip: "foto", renk: "#2ecc71" };
  return { tip: "yazi", renk: "#5aa6e0" }; // YAZI = mavi (altın artık sadece video)
}

const Ikon = {
  home: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>,
  /* ESKİ V1 İKONLARI — kullanıcının fotoğrafındaki ikonların BİREBİR aynısı (kendi kodumuzdan alındı);
     üstlerine efektler: elmas ışık saçar (ik-gem), kalpler nefes alır (ik-kalp), kırmızı nokta yanıp söner (ik-canli) */
  /* Elite: altın elmas SABİT; sağ üstte GERÇEK KESİMLİ mavi pırlanta — taç+kuşak+pavyon
     fasetleri ayrı tonlarda BELLİ, içinde beyaz nokta YOK (ANAYASA 6.15 yasak stil) */
  elite: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><g transform="translate(0,3.6) scale(.75)"><path d="M6 2L3 6l9 13 9-13-3-4z" /><path d="M3 6h18" /><path d="M12 2l3 4-3 13-3-13 3-4z" /><circle cx="19" cy="19" r="2.5" fill="none" /><path d="M17.5 19l.8.8L20.5 17" /></g><g className="ik-mavi-pir" stroke="#0e2f5e" strokeWidth=".3" strokeLinejoin="round"><polygon points="17.2,0.8 15.3,3.4 18.2,3.4" fill="#4f9bd8" /><polygon points="17.2,0.8 22,0.8 21,3.4 18.2,3.4" fill="#6fb4e8" /><polygon points="22,0.8 23.9,3.4 21,3.4" fill="#2f6fa8" /><polygon points="15.3,3.4 18.2,3.4 19.6,8.8" fill="#1d4d80" /><polygon points="18.2,3.4 21,3.4 19.6,8.8" fill="#3d8ac4" /><polygon points="21,3.4 23.9,3.4 19.6,8.8" fill="#143c6e" /></g></svg>,
  topluluk: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="7" r="3" /><path d="M2 21v-1a5 5 0 0 1 5-5h2" /><circle cx="16" cy="7" r="3" /><path d="M22 21v-1a5 5 0 0 0-5-5h-2" /><g className="ik-kalp" stroke="none"><path d="M14 22c-2.6-1.8-3.5-3.8-2.6-5.1.7-1.05 2-.95 2.6.1.6-1.05 1.9-1.15 2.6-.1.9 1.3 0 3.3-2.6 5.1z" fill="#ff6b78" /><path d="M10.9 26c-3.7-2.5-5-5.3-3.7-7.2 1-1.4 2.8-1.3 3.7.2.9-1.5 2.7-1.6 3.7-.2 1.3 1.9 0 4.7-3.7 7.2z" fill="#ff2238" /></g></svg>,
  video: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.723v6.554a1 1 0 0 1-1.447.9L15 14v-4z" /><rect x="3" y="8" width="12" height="8" rx="2" /><g className="ik-canli"><circle cx="21" cy="5" r="1.5" fill="#FF4444" stroke="none" /><path d="M19.5 5h-1" stroke="#FF4444" strokeWidth="1" /></g></svg>,
  /* KONUM: pin sabit; içinde PARLAK YEŞİL 3 navigasyon oku PEŞ PEŞE yukarı akar (çağrı) */
  konum: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" /><g fill="#5cff9a" stroke="none"><path className="ik-nav ik-nav1" d="M12 6.4 L14.7 11 L12 9.7 L9.3 11 Z" /><path className="ik-nav ik-nav2" d="M12 6.4 L14.7 11 L12 9.7 L9.3 11 Z" /><path className="ik-nav ik-nav3" d="M12 6.4 L14.7 11 L12 9.7 L9.3 11 Z" /></g></svg>,
  /* AKADEMİ: mezuniyet kepi sabit; PÜSKÜL sallanır (klasik akademi/bilgi hareketi — elmas parlama değil) */
  akademi: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-4 9 4-9 4-9-4z" /><path d="M7 11v4.5c0 1.4 2.7 2.5 5 2.5s5-1.1 5-2.5V11" /><g className="ik-puskul"><path d="M21 9v3.5" stroke="#ffe14d" strokeWidth="1.9" /><circle cx="21" cy="13.7" r="1.7" fill="#ffe14d" stroke="none" /></g></svg>,
  profil: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" /></svg>,
  ara: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>,
  menu: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
  bildirim: <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>,
  /* ---- GLOXORG'a ÖZEL ikonlar — hepsinde ortak PIRLANTA/FASET motifi (standart ikonlardan farklı, bize ait) ---- */
  // MESAJ: ZARF (mektup) + pırlanta mühür — yorum balonundan FARKLI
  mesaj: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3.7 7.3l6.9 4.9a2.4 2.4 0 0 0 2.8 0l6.9-4.9" /><path d="M12 13.1l1.4 1.5-1.4 1.9-1.4-1.9z" fill="currentColor" stroke="none" /></svg>,
  // GLOME — mesaj + arama: CANLI mavi konuşma balonu (mesaj) + TAM ORTADA net YEŞİL telefon ahizesi (arama), beyaz konturlu. Mektup DEĞİL.
  gloxi: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2.4c-5.3 0-9.6 4-9.6 8.9 0 1.7.52 3.3 1.42 4.66L2.5 21.6l4.86-1.28A10.3 10.3 0 0 0 12 21.6c5.3 0 9.6-4 9.6-8.9S17.3 2.4 12 2.4z" fill="#1e88ff" stroke="#0b57c7" strokeWidth="0.6" /><path d="M9.15 7.55c-.17-.4-.35-.36-.5-.37-.13 0-.28-.01-.43-.01-.15 0-.4.06-.6.28-.21.23-.79.77-.79 1.87 0 1.1.81 2.17.92 2.32.11.15 1.58 2.5 3.86 3.46.53.23.95.37 1.28.47.54.17 1.03.15 1.42.09.43-.06 1.33-.54 1.52-1.07.19-.53.19-.98.13-1.07-.06-.09-.2-.15-.43-.26-.23-.11-1.33-.66-1.53-.73-.2-.08-.36-.11-.51.11-.15.22-.58.73-.72.88-.13.15-.26.17-.49.06-.23-.11-.94-.35-1.8-1.11-.66-.6-1.11-1.33-1.24-1.55-.13-.22-.01-.35.1-.46.1-.1.23-.26.34-.4.11-.13.15-.22.22-.37.08-.15.04-.28-.01-.4-.06-.11-.5-1.2-.68-1.65z" fill="#25d366" stroke="#fff" strokeWidth="0.6" strokeLinejoin="round" /></svg>,
  // BEĞENİ: pırlanta-kesimli kalp (içinde faset çizgileri)
  kalp: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20.6C7 17.1 3.5 13.9 3.5 9.7A4.1 4.1 0 0 1 12 7a4.1 4.1 0 0 1 8.5 2.7c0 4.2-3.5 7.4-8.5 10.9z" /><path d="M7.4 9.4h9.2" strokeWidth="1.05" opacity=".85" /><path d="M12 7l-2.4 2.4L12 14.3l2.4-4.9z" strokeWidth="1.05" opacity=".85" /></svg>,
  // YORUM: konuşma balonu + içinde 4 köşe parıltı (elmas ışıltısı)
  yorum: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11.5a8 8 0 0 1-11.5 7.2L4 20l1.3-4.4A8 8 0 1 1 20 11.5z" /><path d="M12 8l.95 2.05L15 11l-2.05.95L12 14l-.95-2.05L9 11l2.05-.95z" fill="currentColor" stroke="none" /></svg>,
  // PAYLAŞIM: üç PIRLANTA düğüm, çizgilerle bağlı (standart 3 daire değil)
  paylas: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2.6l2 2.6-2 2.6-2-2.6z" /><path d="M6 9.4l2 2.6-2 2.6-2-2.6z" /><path d="M18 16.2l2 2.6-2 2.6-2-2.6z" /><path d="M7.8 10.7l8.4-4.4M7.8 13.3l8.4 4.4" /></svg>,
  // KAYDET: pırlanta-fasetli yer imi
  kaydet: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.5a1 1 0 0 1 1-1z" /><path d="M12 6.6l2.3 2.3L12 12.2 9.7 8.9z" strokeWidth="1.05" opacity=".85" /></svg>,
  // İNDİR: pırlanta-uçlu indirme oku
  indir: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5v10" /><path d="M8 10l4 4 4-4" /><path d="M5 19.5h14" /></svg>,
  // DAHA: pırlanta-üçlü (daha fazla seçenek)
  daha: <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M12 3.4l1.7 2.2L12 7.8 10.3 5.6z" /><path d="M12 9.8l1.7 2.2L12 14.2 10.3 12z" /><path d="M12 16.2l1.7 2.2L12 20.6 10.3 18.4z" /></svg>,
};

// HER SAYFAYA AİT üst-sağ ikon (Google profil sadece ana sayfada; diğer pencerelerde bunlar)
const SayfaIkon = {
  elite: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>,
  topluluk: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="8" r="3.2" /><path d="M4 20a6 6 0 0 1 12 0" /><path d="M18.5 8v6M15.5 11h6" /></svg>,
  video: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle className="ik-canli" cx="12" cy="12" r="2" fill="#FF4444" stroke="none" /><path d="M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M5.6 18.4a9 9 0 0 1 0-12.8M18.4 5.6a9 9 0 0 1 0 12.8" /></svg>,
  konum: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></svg>,
  akademi: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5a1 1 0 0 1 1-1h6a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H2V5z" /><path d="M22 5a1 1 0 0 0-1-1h-6a3 3 0 0 0-3 3v13a2.5 2.5 0 0 1 2.5-2.5H22V5z" /></svg>,
  profil: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" /></svg>,
};

// Şeritteki ülkeler (40+): altın yuvarlak KOD + DALGALI bayrak + ŞEHİR(ülke renginde) + saat + kur. Ülke adı YAZILMAZ.
const ULKELER_SERIT = [
  { kod:"TR", sehir:"İstanbul", tz:"Europe/Istanbul", renk:"#e30a17" },
  { kod:"DE", sehir:"Berlin", tz:"Europe/Berlin", renk:"#ffce00" },
  { kod:"US", sehir:"New York", tz:"America/New_York", renk:"#5b8def" },
  { kod:"GB", sehir:"Londra", tz:"Europe/London", renk:"#cf142b" },
  { kod:"AE", sehir:"Dubai", tz:"Asia/Dubai", renk:"#2ecc71" },
  { kod:"JP", sehir:"Tokyo", tz:"Asia/Tokyo", renk:"#ff5d6c" },
  { kod:"UA", sehir:"Kyiv", tz:"Europe/Kyiv", renk:"#ffd700" },
  { kod:"FR", sehir:"Paris", tz:"Europe/Paris", renk:"#4a7bd6" },
  { kod:"RU", sehir:"Moskova", tz:"Europe/Moscow", renk:"#5b9bff" },
  { kod:"CN", sehir:"Şanghay", tz:"Asia/Shanghai", renk:"#ff4d4d" },
  { kod:"SA", sehir:"Riyad", tz:"Asia/Riyadh", renk:"#2ecc71" },
  { kod:"BR", sehir:"São Paulo", tz:"America/Sao_Paulo", renk:"#34d36b" },
  { kod:"IT", sehir:"Roma", tz:"Europe/Rome", renk:"#34d36b" },
  { kod:"ES", sehir:"Madrid", tz:"Europe/Madrid", renk:"#ffb347" },
  { kod:"NL", sehir:"Amsterdam", tz:"Europe/Amsterdam", renk:"#ff8c42" },
  { kod:"CA", sehir:"Toronto", tz:"America/Toronto", renk:"#ff5d5d" },
  { kod:"AU", sehir:"Sidney", tz:"Australia/Sydney", renk:"#5b9bff" },
  { kod:"IN", sehir:"Mumbai", tz:"Asia/Kolkata", renk:"#ff9933" },
  { kod:"CH", sehir:"Zürih", tz:"Europe/Zurich", renk:"#ff5d5d" },
  { kod:"SE", sehir:"Stockholm", tz:"Europe/Stockholm", renk:"#5b9bff" },
  { kod:"NO", sehir:"Oslo", tz:"Europe/Oslo", renk:"#ff5d6c" },
  { kod:"PL", sehir:"Varşova", tz:"Europe/Warsaw", renk:"#ff6b8a" },
  { kod:"KR", sehir:"Seul", tz:"Asia/Seoul", renk:"#5b8def" },
  { kod:"MX", sehir:"Meksiko", tz:"America/Mexico_City", renk:"#2ecc71" },
  { kod:"AR", sehir:"Buenos Aires", tz:"America/Argentina/Buenos_Aires", renk:"#7ec8ff" },
  { kod:"ZA", sehir:"Johannesburg", tz:"Africa/Johannesburg", renk:"#34d36b" },
  { kod:"EG", sehir:"Kahire", tz:"Africa/Cairo", renk:"#ff5d5d" },
  { kod:"GR", sehir:"Atina", tz:"Europe/Athens", renk:"#5b9bff" },
  { kod:"PT", sehir:"Lizbon", tz:"Europe/Lisbon", renk:"#34d36b" },
  { kod:"IE", sehir:"Dublin", tz:"Europe/Dublin", renk:"#2ecc71" },
  { kod:"AT", sehir:"Viyana", tz:"Europe/Vienna", renk:"#ff5d5d" },
  { kod:"BE", sehir:"Brüksel", tz:"Europe/Brussels", renk:"#ffd84d" },
  { kod:"DK", sehir:"Kopenhag", tz:"Europe/Copenhagen", renk:"#ff5d6c" },
  { kod:"FI", sehir:"Helsinki", tz:"Europe/Helsinki", renk:"#5b9bff" },
  { kod:"CZ", sehir:"Prag", tz:"Europe/Prague", renk:"#5b8def" },
  { kod:"HU", sehir:"Budapeşte", tz:"Europe/Budapest", renk:"#ff5d5d" },
  { kod:"RO", sehir:"Bükreş", tz:"Europe/Bucharest", renk:"#ffd84d" },
  { kod:"ID", sehir:"Jakarta", tz:"Asia/Jakarta", renk:"#ff5d5d" },
  { kod:"MY", sehir:"Kuala Lumpur", tz:"Asia/Kuala_Lumpur", renk:"#5b8def" },
  { kod:"TH", sehir:"Bangkok", tz:"Asia/Bangkok", renk:"#7ec8ff" },
  { kod:"SG", sehir:"Singapur", tz:"Asia/Singapore", renk:"#ff5d5d" },
  { kod:"PH", sehir:"Manila", tz:"Asia/Manila", renk:"#5b8def" },
  { kod:"VN", sehir:"Hanoi", tz:"Asia/Ho_Chi_Minh", renk:"#ff4d4d" },
  { kod:"PK", sehir:"Karaçi", tz:"Asia/Karachi", renk:"#2ecc71" },
  { kod:"NG", sehir:"Lagos", tz:"Africa/Lagos", renk:"#34d36b" },
  { kod:"QA", sehir:"Doha", tz:"Asia/Qatar", renk:"#c061cb" },
  { kod:"KW", sehir:"Kuveyt", tz:"Asia/Kuwait", renk:"#2ecc71" },
  { kod:"IL", sehir:"Tel Aviv", tz:"Asia/Jerusalem", renk:"#5b9bff" },
];
// Para birimi sembolleri
const PARA_SEMBOL = { TRY:"₺", EUR:"€", USD:"$", GBP:"£", AED:"د.إ", JPY:"¥", UAH:"₴", RUB:"₽", CNY:"¥", SAR:"﷼", BRL:"R$", CAD:"C$", AUD:"A$", INR:"₹", CHF:"Fr", SEK:"kr", NOK:"kr", PLN:"zł", KRW:"₩", MXN:"$", ARS:"$", ZAR:"R", EGP:"E£", DKK:"kr", CZK:"Kč", HUF:"Ft", RON:"lei", IDR:"Rp", MYR:"RM", THB:"฿", SGD:"S$", PHP:"₱", VND:"₫", PKR:"₨", NGN:"₦", QAR:"ر.ق", KWD:"د.ك", ILS:"₪", NZD:"NZ$", HKD:"HK$", TWD:"NT$", BGN:"лв", ISK:"kr", BDT:"৳", LKR:"Rs", MAD:"DH", KES:"KSh", NPR:"₨", VES:"Bs", CLP:"$", COP:"$", PEN:"S/", BHD:".د.ب", OMR:"ر.ع", JOD:"د.ا", LBP:"ل.ل", IQD:"ع.د", IRR:"﷼", KZT:"₸", AZN:"₼", GEL:"₾", BYN:"Br", RSD:"дин", UYU:"$U", GHS:"₵", ETB:"Br", TZS:"TSh", UGX:"USh", VND_:"₫" };
const paraSembol = (p) => PARA_SEMBOL[p] || p;
// Ülke → para birimi — TÜM DÜNYA (ISO 3166, ~249 ülke/bölge). Navigatör hangi ülkeyse
// onun parası/kuru OTOMATİK gelir. Hiçbir ülke unutulmadı; eksik kalan USD'ye düşer (güvenli yedek).
const BOLGE_PARA = {
  AD:"EUR", AE:"AED", AF:"AFN", AG:"XCD", AI:"XCD", AL:"ALL", AM:"AMD", AO:"AOA", AR:"ARS", AS:"USD", AT:"EUR", AU:"AUD", AW:"AWG", AX:"EUR", AZ:"AZN",
  BA:"BAM", BB:"BBD", BD:"BDT", BE:"EUR", BF:"XOF", BG:"BGN", BH:"BHD", BI:"BIF", BJ:"XOF", BL:"EUR", BM:"BMD", BN:"BND", BO:"BOB", BQ:"USD", BR:"BRL", BS:"BSD", BT:"BTN", BV:"NOK", BW:"BWP", BY:"BYN", BZ:"BZD",
  CA:"CAD", CC:"AUD", CD:"CDF", CF:"XAF", CG:"XAF", CH:"CHF", CI:"XOF", CK:"NZD", CL:"CLP", CM:"XAF", CN:"CNY", CO:"COP", CR:"CRC", CU:"CUP", CV:"CVE", CW:"ANG", CX:"AUD", CY:"EUR", CZ:"CZK",
  DE:"EUR", DJ:"DJF", DK:"DKK", DM:"XCD", DO:"DOP", DZ:"DZD",
  EC:"USD", EE:"EUR", EG:"EGP", EH:"MAD", ER:"ERN", ES:"EUR", ET:"ETB",
  FI:"EUR", FJ:"FJD", FK:"FKP", FM:"USD", FO:"DKK", FR:"EUR",
  GA:"XAF", GB:"GBP", GD:"XCD", GE:"GEL", GF:"EUR", GG:"GBP", GH:"GHS", GI:"GIP", GL:"DKK", GM:"GMD", GN:"GNF", GP:"EUR", GQ:"XAF", GR:"EUR", GT:"GTQ", GU:"USD", GW:"XOF", GY:"GYD",
  HK:"HKD", HN:"HNL", HR:"EUR", HT:"HTG", HU:"HUF",
  ID:"IDR", IE:"EUR", IL:"ILS", IM:"GBP", IN:"INR", IO:"USD", IQ:"IQD", IR:"IRR", IS:"ISK", IT:"EUR",
  JE:"GBP", JM:"JMD", JO:"JOD", JP:"JPY",
  KE:"KES", KG:"KGS", KH:"KHR", KI:"AUD", KM:"KMF", KN:"XCD", KP:"KPW", KR:"KRW", KW:"KWD", KY:"KYD", KZ:"KZT",
  LA:"LAK", LB:"LBP", LC:"XCD", LI:"CHF", LK:"LKR", LR:"LRD", LS:"LSL", LT:"EUR", LU:"EUR", LV:"EUR", LY:"LYD",
  MA:"MAD", MC:"EUR", MD:"MDL", ME:"EUR", MF:"EUR", MG:"MGA", MH:"USD", MK:"MKD", ML:"XOF", MM:"MMK", MN:"MNT", MO:"MOP", MP:"USD", MQ:"EUR", MR:"MRU", MS:"XCD", MT:"EUR", MU:"MUR", MV:"MVR", MW:"MWK", MX:"MXN", MY:"MYR", MZ:"MZN",
  NA:"NAD", NC:"XPF", NE:"XOF", NF:"AUD", NG:"NGN", NI:"NIO", NL:"EUR", NO:"NOK", NP:"NPR", NR:"AUD", NU:"NZD", NZ:"NZD",
  OM:"OMR",
  PA:"PAB", PE:"PEN", PF:"XPF", PG:"PGK", PH:"PHP", PK:"PKR", PL:"PLN", PM:"EUR", PN:"NZD", PR:"USD", PS:"ILS", PT:"EUR", PW:"USD", PY:"PYG",
  QA:"QAR",
  RE:"EUR", RO:"RON", RS:"RSD", RU:"RUB", RW:"RWF",
  SA:"SAR", SB:"SBD", SC:"SCR", SD:"SDG", SE:"SEK", SG:"SGD", SH:"SHP", SI:"EUR", SJ:"NOK", SK:"EUR", SL:"SLE", SM:"EUR", SN:"XOF", SO:"SOS", SR:"SRD", SS:"SSP", ST:"STN", SV:"USD", SX:"ANG", SY:"SYP", SZ:"SZL",
  TC:"USD", TD:"XAF", TF:"EUR", TG:"XOF", TH:"THB", TJ:"TJS", TK:"NZD", TL:"USD", TM:"TMT", TN:"TND", TO:"TOP", TR:"TRY", TT:"TTD", TV:"AUD", TW:"TWD", TZ:"TZS",
  UA:"UAH", UG:"UGX", UM:"USD", US:"USD", UY:"UYU", UZ:"UZS",
  VA:"EUR", VC:"XCD", VE:"VES", VG:"USD", VI:"USD", VN:"VND", VU:"VUV",
  WF:"XPF", WS:"WST",
  XK:"EUR", YE:"YER", YT:"EUR",
  ZA:"ZAR", ZM:"ZMW", ZW:"ZWL",
};
// Saat dilimi → ülke (cihazın saat dilimi GERÇEK konumu yansıtır; dilden DEĞİL konumdan bulur)
const TZ_ULKE = {
  "Europe/Istanbul":"TR","Europe/Berlin":"DE","Europe/London":"GB","Europe/Paris":"FR","Europe/Madrid":"ES","Europe/Rome":"IT","Europe/Amsterdam":"NL","Europe/Brussels":"BE","Europe/Vienna":"AT","Europe/Zurich":"CH","Europe/Lisbon":"PT","Europe/Dublin":"IE","Europe/Stockholm":"SE","Europe/Oslo":"NO","Europe/Copenhagen":"DK","Europe/Helsinki":"FI","Europe/Warsaw":"PL","Europe/Prague":"CZ","Europe/Budapest":"HU","Europe/Bucharest":"RO","Europe/Athens":"GR","Europe/Moscow":"RU","Europe/Kyiv":"UA","Europe/Kiev":"UA","Europe/Sofia":"BG","Europe/Belgrade":"RS","Europe/Zagreb":"HR","Europe/Bratislava":"SK","Europe/Ljubljana":"SI","Europe/Vilnius":"LT","Europe/Riga":"LV","Europe/Tallinn":"EE","Europe/Luxembourg":"LU","Europe/Zaporozhye":"UA",
  "America/New_York":"US","America/Chicago":"US","America/Denver":"US","America/Los_Angeles":"US","America/Phoenix":"US","America/Anchorage":"US","Pacific/Honolulu":"US","America/Toronto":"CA","America/Vancouver":"CA","America/Edmonton":"CA","America/Mexico_City":"MX","America/Sao_Paulo":"BR","America/Argentina/Buenos_Aires":"AR","America/Bogota":"CO","America/Lima":"PE","America/Santiago":"CL","America/Caracas":"VE",
  "Asia/Dubai":"AE","Asia/Tokyo":"JP","Asia/Shanghai":"CN","Asia/Riyadh":"SA","Asia/Kolkata":"IN","Asia/Calcutta":"IN","Asia/Seoul":"KR","Asia/Jakarta":"ID","Asia/Kuala_Lumpur":"MY","Asia/Bangkok":"TH","Asia/Singapore":"SG","Asia/Manila":"PH","Asia/Ho_Chi_Minh":"VN","Asia/Karachi":"PK","Asia/Qatar":"QA","Asia/Kuwait":"KW","Asia/Jerusalem":"IL","Asia/Tel_Aviv":"IL","Asia/Hong_Kong":"HK","Asia/Taipei":"TW","Asia/Dhaka":"BD","Asia/Tehran":"IR","Asia/Baghdad":"IQ","Asia/Amman":"JO","Asia/Beirut":"LB","Asia/Almaty":"KZ","Asia/Baku":"AZ","Asia/Tbilisi":"GE",
  "Africa/Johannesburg":"ZA","Africa/Cairo":"EG","Africa/Lagos":"NG","Africa/Nairobi":"KE","Africa/Casablanca":"MA","Africa/Algiers":"DZ","Africa/Tunis":"TN",
  "Australia/Sydney":"AU","Australia/Melbourne":"AU","Australia/Perth":"AU","Australia/Brisbane":"AU","Pacific/Auckland":"NZ",
};
const ALTIN_ONS_USD = 2400, GUMUS_ONS_USD = 30, ONS_GRAM = 31.1035; // metaller yaklaşık (gerçek piyasa API'si sonra)
// Ülke → o ülkenin ana BORSA ENDEKSİ (Yahoo Finance sembolü). Bulunamayan → küresel S&P 500.
const BORSA_INDEKS = {
  DE:{sym:"^GDAXI",ad:"DAX"}, US:{sym:"^GSPC",ad:"S&P 500"}, TR:{sym:"XU100.IS",ad:"BIST 100"}, GB:{sym:"^FTSE",ad:"FTSE 100"},
  FR:{sym:"^FCHI",ad:"CAC 40"}, JP:{sym:"^N225",ad:"Nikkei"}, IT:{sym:"FTSEMIB.MI",ad:"FTSE MIB"}, ES:{sym:"^IBEX",ad:"IBEX 35"},
  NL:{sym:"^AEX",ad:"AEX"}, BE:{sym:"^BFX",ad:"BEL 20"}, CH:{sym:"^SSMI",ad:"SMI"}, AT:{sym:"^ATX",ad:"ATX"},
  SE:{sym:"^OMX",ad:"OMX 30"}, PT:{sym:"^PSI20",ad:"PSI 20"}, GR:{sym:"^ATG",ad:"ATHEX"}, PL:{sym:"^WIG20",ad:"WIG 20"},
  CA:{sym:"^GSPTSE",ad:"TSX"}, AU:{sym:"^AXJO",ad:"ASX 200"}, IN:{sym:"^NSEI",ad:"Nifty 50"}, CN:{sym:"000001.SS",ad:"SSE"},
  HK:{sym:"^HSI",ad:"Hang Seng"}, KR:{sym:"^KS11",ad:"KOSPI"}, TW:{sym:"^TWII",ad:"TAIEX"}, BR:{sym:"^BVSP",ad:"Bovespa"},
  MX:{sym:"^MXX",ad:"IPC"}, RU:{sym:"IMOEX.ME",ad:"MOEX"}, SA:{sym:"^TASI.SR",ad:"TASI"}, AE:{sym:"^ADI",ad:"ADX"},
  ZA:{sym:"^J203.JO",ad:"JSE"}, ID:{sym:"^JKSE",ad:"IDX"}, MY:{sym:"^KLSE",ad:"KLCI"}, TH:{sym:"^SET.BK",ad:"SET"},
  SG:{sym:"^STI",ad:"STI"}, PH:{sym:"^PSEI.PS",ad:"PSEi"},
};

function seritSaat(tz, now) {
  try { return new Intl.DateTimeFormat("tr-TR", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now); }
  catch (e) { return "--:--:--"; }
}

// ⚡ PARLAMA ÖNLEME: saat eskiden ana sayfanın `now` state'iyle çiziliyordu → saniyede bir
// TÜM 4700 satırlık sayfa + cam/blur katmanları yeniden çiziliyordu (ekran parlıyor/alt kesiliyordu).
// Çözüm: TEK paylaşımlı tik (tek setInterval) + her saat KENDİ küçük bileşeninde re-render olur,
// ana sayfa ARTIK saniyede bir çizilmez. (Çok sayıda saat olsa da tek zamanlayıcı kullanır.)
const saatAboneler = new Set();
let saatTimer = null;
function saatAbone(fn) {
  saatAboneler.add(fn);
  if (!saatTimer) saatTimer = setInterval(() => { const d = new Date(); saatAboneler.forEach((f) => f(d)); }, 1000);
  return () => { saatAboneler.delete(fn); if (saatAboneler.size === 0 && saatTimer) { clearInterval(saatTimer); saatTimer = null; } };
}
function SeritSaat({ tz }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => saatAbone(setNow), []);
  return <span className="serit-saat notranslate" translate="no">{seritSaat(tz, now)}</span>;
}

// HARİTA DÖNDÜRME: leaflet-rotate artık import ile GÖMÜLÜ (her zaman yüklü) → anında hazır.
function leafletRotateYukle() { return Promise.resolve(); }

// Her nav ikonunun KÖŞE PIRLANTASI o ikonun renginde (gömülü taş, içerden yanar)
const NAV_RENK = { home: "mavi", elite: "altin", topluluk: "yesil", video: "mor", konum: "turkuaz", akademi: "zeytin", profil: "beyaz" };
// GÜNLÜK ARŞİV — her güne ayrı renk (Paz/Pzt/Sal/Çar/Per/Cum/Cmt), sohbette günlük renkli ayraç
const GUN_RENK = ["#e0202c", "#2f7fd6", "#1ea64f", "#9b4fd6", "#f2a900", "#1fc2c2", "#e0608c"];
// Öneri çipleri — her biri farklı CANLI renk (hepsi aynı/karanlık değil)
const ONERI_RENK = ["#ff9d2e", "#34c98b", "#4aa3ff", "#d96bff", "#ff6b8f", "#39d0d0"];
// 7 EKSEN EYLEM PLANI — ikon+renk sabit, METİN 13 dilde. GLOXORG Hakkında sayfasında gösterilir.
const EKSEN_IKON = ["🧠", "🔭", "🎯", "🛠️", "✨", "🤝", "🚀"];
const EKSEN_RENK = ["#4aa3ff", "#9b6bff", "#ff6b8f", "#ff9d2e", "#ffd23f", "#34c98b", "#1fc2c2"];
const EKSEN_METIN = {
  tr: [["DÜŞÜN", "Neredesin, ne istiyorsun? Kafanı netleştir, kendini tanı."], ["GELECEĞİ GÖR", "İleriyi ve fırsatı gör; nereye gittiğini bil, vizyon kur."], ["HEDEF SEÇ", "Net, ölçülebilir tek bir hedef koy. Dağılma, odaklan."], ["ÜRET", "Harekete geç, somut bir şey ortaya koy. Mükemmeli bekleme, başla."], ["FARK YARAT", "Seni özel kılanı öne çıkar. Herkes gibi değil, 'sen' ol."], ["PAYLAŞ & BAĞ KUR", "İşini paylaş, doğru insanlar ve müşterilerle bağ kur — GLOXORG'un kalbi."], ["İLERLE", "Düzenli ilerle, ölç, geliştir, durma. Her gün bir adım — ben yanındayım."]],
  en: [["THINK", "Where are you, what do you want? Clear your mind, know yourself."], ["SEE THE FUTURE", "See ahead and the opportunity; know where you're going, build a vision."], ["CHOOSE A GOAL", "Set one clear, measurable goal. Don't scatter — focus."], ["CREATE", "Take action, make something real. Don't wait for perfect, start."], ["STAND OUT", "Show what makes you special. Be 'you', not like everyone."], ["SHARE & CONNECT", "Share your work, connect with the right people and clients — the heart of GLOXORG."], ["ADVANCE", "Progress steadily, measure, improve, never stop. One step a day — I'm with you."]],
  de: [["DENK NACH", "Wo stehst du, was willst du? Kläre deinen Kopf, kenne dich."], ["SIEH DIE ZUKUNFT", "Sieh voraus und die Chance; wisse, wohin du gehst, bilde eine Vision."], ["ZIEL WÄHLEN", "Setze ein klares, messbares Ziel. Verzettle dich nicht — fokussiere."], ["ERSCHAFFE", "Handle, schaffe etwas Konkretes. Warte nicht auf perfekt, fang an."], ["HEB DICH AB", "Zeig, was dich besonders macht. Sei 'du', nicht wie alle."], ["TEILE & VERNETZE", "Teile deine Arbeit, vernetze dich mit den richtigen Leuten und Kunden — das Herz von GLOXORG."], ["MACH WEITER", "Schreite stetig voran, miss, verbessere, hör nie auf. Ein Schritt pro Tag — ich bin bei dir."]],
  fr: [["RÉFLÉCHIS", "Où es-tu, que veux-tu ? Clarifie ton esprit, connais-toi."], ["VOIS L'AVENIR", "Vois plus loin et l'opportunité ; sache où tu vas, bâtis une vision."], ["CHOISIS UN BUT", "Fixe un objectif clair et mesurable. Ne te disperse pas — concentre-toi."], ["CRÉE", "Agis, fais quelque chose de concret. N'attends pas le parfait, commence."], ["DISTINGUE-TOI", "Montre ce qui te rend unique. Sois 'toi', pas comme tout le monde."], ["PARTAGE & CONNECTE", "Partage ton travail, connecte-toi aux bonnes personnes et clients — le cœur de GLOXORG."], ["AVANCE", "Progresse régulièrement, mesure, améliore, ne t'arrête jamais. Un pas par jour — je suis avec toi."]],
  es: [["PIENSA", "¿Dónde estás, qué quieres? Aclara tu mente, conócete."], ["VE EL FUTURO", "Mira adelante y la oportunidad; sabe a dónde vas, crea una visión."], ["ELIGE UNA META", "Fija una meta clara y medible. No te disperses — enfócate."], ["CREA", "Actúa, haz algo real. No esperes lo perfecto, empieza."], ["DESTACA", "Muestra lo que te hace especial. Sé 'tú', no como todos."], ["COMPARTE & CONECTA", "Comparte tu trabajo, conecta con las personas y clientes correctos — el corazón de GLOXORG."], ["AVANZA", "Progresa constante, mide, mejora, nunca pares. Un paso al día — estoy contigo."]],
  it: [["PENSA", "Dove sei, cosa vuoi? Schiarisci la mente, conosci te stesso."], ["VEDI IL FUTURO", "Guarda avanti e l'opportunità; sappi dove vai, crea una visione."], ["SCEGLI UN OBIETTIVO", "Fissa un obiettivo chiaro e misurabile. Non disperderti — concentrati."], ["CREA", "Agisci, fai qualcosa di concreto. Non aspettare il perfetto, inizia."], ["DISTINGUITI", "Mostra ciò che ti rende speciale. Sii 'te', non come tutti."], ["CONDIVIDI & CONNETTI", "Condividi il tuo lavoro, connettiti con le persone e i clienti giusti — il cuore di GLOXORG."], ["AVANZA", "Progredisci con costanza, misura, migliora, non fermarti. Un passo al giorno — sono con te."]],
  pt: [["PENSA", "Onde estás, o que queres? Clareia a mente, conhece-te."], ["VÊ O FUTURO", "Olha em frente e a oportunidade; sabe para onde vais, cria uma visão."], ["ESCOLHE UMA META", "Define uma meta clara e mensurável. Não te disperses — foca."], ["CRIA", "Age, faz algo concreto. Não esperes o perfeito, começa."], ["DESTACA-TE", "Mostra o que te torna especial. Sê 'tu', não como todos."], ["PARTILHA & CONECTA", "Partilha o teu trabalho, conecta-te com as pessoas e clientes certos — o coração da GLOXORG."], ["AVANÇA", "Progride com constância, mede, melhora, nunca pares. Um passo por dia — estou contigo."]],
  ru: [["ДУМАЙ", "Где ты, чего хочешь? Проясни мысли, познай себя."], ["ВИДЬ БУДУЩЕЕ", "Смотри вперёд и на возможность; знай, куда идёшь, создай видение."], ["ВЫБЕРИ ЦЕЛЬ", "Поставь одну ясную, измеримую цель. Не распыляйся — сосредоточься."], ["СОЗДАВАЙ", "Действуй, сделай что-то реальное. Не жди идеала, начни."], ["ВЫДЕЛЯЙСЯ", "Покажи, что делает тебя особенным. Будь 'собой', не как все."], ["ДЕЛИСЬ & СВЯЗЫВАЙСЯ", "Делись своей работой, связывайся с нужными людьми и клиентами — сердце GLOXORG."], ["ПРОДВИГАЙСЯ", "Двигайся стабильно, измеряй, улучшай, не останавливайся. Шаг в день — я с тобой."]],
  uk: [["ДУМАЙ", "Де ти, чого хочеш? Проясни думки, пізнай себе."], ["БАЧ МАЙБУТНЄ", "Дивись уперед і на можливість; знай, куди йдеш, створи бачення."], ["ОБЕРИ ЦІЛЬ", "Постав одну чітку, вимірювану ціль. Не розпорошуйся — зосередься."], ["ТВОРИ", "Дій, зроби щось реальне. Не чекай ідеального, починай."], ["ВИДІЛЯЙСЯ", "Покажи, що робить тебе особливим. Будь 'собою', не як усі."], ["ДІЛИСЯ & З'ЄДНУЙСЯ", "Ділися своєю роботою, з'єднуйся з потрібними людьми та клієнтами — серце GLOXORG."], ["ПРОСУВАЙСЯ", "Рухайся стабільно, вимірюй, покращуй, не зупиняйся. Крок на день — я з тобою."]],
  ar: [["فكّر", "أين أنت، وماذا تريد؟ صفِّ ذهنك، اعرف نفسك."], ["اُنظر إلى المستقبل", "انظر إلى الأمام وإلى الفرصة؛ اعرف إلى أين تذهب، اِبنِ رؤية."], ["اختر هدفًا", "حدد هدفًا واحدًا واضحًا وقابلًا للقياس. لا تتشتت — ركّز."], ["أنتج", "تحرّك، اصنع شيئًا ملموسًا. لا تنتظر الكمال، اِبدأ."], ["تميّز", "أظهر ما يجعلك مميزًا. كن 'أنت'، لا كالجميع."], ["شارك وتواصل", "شارك عملك، تواصل مع الأشخاص والعملاء المناسبين — قلب GLOXORG."], ["تقدّم", "تقدّم بثبات، قِس، طوّر، لا تتوقف. خطوة كل يوم — أنا معك."]],
  zh: [["思考", "你在哪里，想要什么？理清思路，认识自己。"], ["看见未来", "看向前方与机会；知道去向，建立愿景。"], ["选择目标", "设定一个清晰、可衡量的目标。别分散——专注。"], ["创造", "行动起来，做出真实的东西。别等完美，开始吧。"], ["脱颖而出", "展现你的独特之处。做'你'，而非随大流。"], ["分享与连接", "分享你的作品，与对的人和客户连接——GLOXORG 的核心。"], ["前进", "稳步前进，衡量，改进，永不停止。每天一步——我与你同在。"]],
  ja: [["考える", "今どこにいて、何を望む？頭を整理し、自分を知る。"], ["未来を見る", "先とチャンスを見よ。行き先を知り、ビジョンを描く。"], ["目標を選ぶ", "明確で測れる目標を一つ。散らばらず集中する。"], ["創る", "動いて、形あるものを作る。完璧を待たず、始める。"], ["際立つ", "あなたらしさを示す。皆と同じでなく『あなた』で。"], ["共有・つながる", "作品を共有し、正しい人や顧客とつながる——GLOXORG の心。"], ["前進する", "着実に進み、測り、改善し、止まらない。毎日一歩——そばにいる。"]],
  hi: [["सोचो", "तुम कहाँ हो, क्या चाहते हो? मन साफ़ करो, ख़ुद को जानो।"], ["भविष्य देखो", "आगे और अवसर देखो; जानो कहाँ जा रहे हो, दृष्टि बनाओ।"], ["लक्ष्य चुनो", "एक स्पष्ट, मापने योग्य लक्ष्य रखो। बिखरो मत — केंद्रित रहो।"], ["बनाओ", "क़दम उठाओ, कुछ ठोस बनाओ। परफेक्ट का इंतज़ार मत करो, शुरू करो।"], ["अलग दिखो", "जो तुम्हें ख़ास बनाता है दिखाओ। सबके जैसे नहीं, 'तुम' बनो।"], ["साझा करो & जुड़ो", "अपना काम साझा करो, सही लोगों और ग्राहकों से जुड़ो — GLOXORG का दिल।"], ["आगे बढ़ो", "लगातार बढ़ो, मापो, सुधारो, रुको मत। रोज़ एक क़दम — मैं साथ हूँ।"]],
};
// GLOXORG HAKKINDA paneli metinleri — 13 dil
const HAKKINDA_CEVIRI = {
  tr: { menu: "GLOXORG Hakkında + 7 Eksen", alt: "Dünyanın lüks profesyonel sosyal platformu", b1h: "🌍 GLOXORG nedir?", b1p: "GLOXORG, dünyaya açık lüks bir profesyonel sosyal platformdur — paylaş, bağ kur, müşteri bul, mesleğini büyüt. Web: gloxorg.com", b2h: "💎 Gloxoo — akıllı kalp", b2p: "Ben Gloxoo, GLOXORG'un tek akıllı yardımcısıyım. Her sayfada yanındayım ve o sayfanın uzmanıyım: yazarım, konuşurum, güncel bilgi veririm, sana özel yardım ederim. Web: gloxoo.com", b3h: "", b3p: "", eh: "🎯 7 Eksen Eylem Planı", ea: 'İlerlemenin 7 temel ekseni. Gloxoo\'ya "bana eylem planı çıkar" de — sana özel doldursun.', pb: "🚀 Bana özel plan çıkar" },
  en: { menu: "About GLOXORG + 7 Axes", alt: "The world's luxury professional social platform", b1h: "🌍 What is GLOXORG?", b1p: "GLOXORG is a global luxury professional social platform — share, connect, find clients, grow your profession. Web: gloxorg.com", b2h: "💎 Gloxoo — the smart heart", b2p: "I'm Gloxoo, GLOXORG's smart assistant. I'm with you on every page: I write, talk, and give up-to-date info. Web: gloxoo.com", b3h: "🐻 Ekspert — page expert", b3p: "Ekspert the bear is the expert of your current page. Tap the bear button above; it helps deeply on that page and listens to you.", eh: "🎯 7-Axis Action Plan", ea: 'The 7 core axes of progress. Tell Gloxoo "make me an action plan" — it fills them in just for you.', pb: "🚀 Make me a plan" },
  de: { menu: "Über GLOXORG + 7 Achsen", alt: "Die luxuriöse berufliche Social-Plattform der Welt", b1h: "🌍 Was ist GLOXORG?", b1p: "GLOXORG ist eine globale, luxuriöse berufliche Social-Plattform — teilen, vernetzen, Kunden finden, deinen Beruf ausbauen. Web: gloxorg.com", b2h: "💎 Gloxoo — das kluge Herz", b2p: "Ich bin Gloxoo, der smarte Assistent von GLOXORG. Auf jeder Seite bei dir: ich schreibe, spreche und gebe aktuelle Infos. Web: gloxoo.com", b3h: "🐻 Ekspert — Seitenexperte", b3p: "Der Bär Ekspert ist der Experte deiner aktuellen Seite. Tippe oben auf den Bären; er hilft dort tiefgehend und hört dir zu.", eh: "🎯 7-Achsen-Aktionsplan", ea: 'Die 7 Kernachsen des Fortschritts. Sag Gloxoo „mach mir einen Aktionsplan" — er füllt sie für dich aus.', pb: "🚀 Erstelle mir einen Plan" },
  fr: { menu: "À propos de GLOXORG + 7 axes", alt: "La plateforme sociale professionnelle de luxe du monde", b1h: "🌍 Qu'est-ce que GLOXORG ?", b1p: "GLOXORG est une plateforme sociale professionnelle de luxe mondiale — partage, connecte-toi, trouve des clients, développe ton métier. Web : gloxorg.com", b2h: "💎 Gloxoo — le cœur intelligent", b2p: "Je suis Gloxoo, l'assistant intelligent de GLOXORG. Je suis avec toi sur chaque page : j'écris, je parle, je donne des infos à jour. Web : gloxoo.com", b3h: "🐻 Ekspert — expert de la page", b3p: "L'ours Ekspert est l'expert de ta page actuelle. Touche l'ours en haut ; il aide en profondeur sur cette page et t'écoute.", eh: "🎯 Plan d'action à 7 axes", ea: 'Les 7 axes clés du progrès. Dis à Gloxoo « fais-moi un plan d\'action » — il les remplit rien que pour toi.', pb: "🚀 Fais-moi un plan" },
  es: { menu: "Sobre GLOXORG + 7 ejes", alt: "La plataforma social profesional de lujo del mundo", b1h: "🌍 ¿Qué es GLOXORG?", b1p: "GLOXORG es una plataforma social profesional de lujo global — comparte, conecta, encuentra clientes, haz crecer tu profesión. Web: gloxorg.com", b2h: "💎 Gloxoo — el corazón inteligente", b2p: "Soy Gloxoo, el asistente inteligente de GLOXORG. Estoy contigo en cada página: escribo, hablo y doy información actual. Web: gloxoo.com", b3h: "🐻 Ekspert — experto de la página", b3p: "El oso Ekspert es el experto de tu página actual. Toca el oso de arriba; ayuda a fondo en esa página y te escucha.", eh: "🎯 Plan de acción de 7 ejes", ea: 'Los 7 ejes clave del progreso. Dile a Gloxoo "hazme un plan de acción" — los completa solo para ti.', pb: "🚀 Hazme un plan" },
  it: { menu: "Su GLOXORG + 7 assi", alt: "La piattaforma sociale professionale di lusso del mondo", b1h: "🌍 Cos'è GLOXORG?", b1p: "GLOXORG è una piattaforma sociale professionale di lusso globale — condividi, connetti, trova clienti, fai crescere la tua professione. Web: gloxorg.com", b2h: "💎 Gloxoo — il cuore intelligente", b2p: "Sono Gloxoo, l'assistente intelligente di GLOXORG. Sono con te in ogni pagina: scrivo, parlo e do info aggiornate. Web: gloxoo.com", b3h: "🐻 Ekspert — esperto della pagina", b3p: "L'orso Ekspert è l'esperto della tua pagina attuale. Tocca l'orso in alto; aiuta a fondo su quella pagina e ti ascolta.", eh: "🎯 Piano d'azione a 7 assi", ea: 'I 7 assi chiave del progresso. Di\' a Gloxoo "fammi un piano d\'azione" — li compila apposta per te.', pb: "🚀 Fammi un piano" },
  pt: { menu: "Sobre a GLOXORG + 7 eixos", alt: "A plataforma social profissional de luxo do mundo", b1h: "🌍 O que é a GLOXORG?", b1p: "A GLOXORG é uma plataforma social profissional de luxo global — partilha, conecta, encontra clientes, faz crescer a tua profissão. Web: gloxorg.com", b2h: "💎 Gloxoo — o coração inteligente", b2p: "Sou o Gloxoo, o assistente inteligente da GLOXORG. Estou contigo em cada página: escrevo, falo e dou info atual. Web: gloxoo.com", b3h: "🐻 Ekspert — especialista da página", b3p: "O urso Ekspert é o especialista da tua página atual. Toca no urso acima; ajuda a fundo nessa página e ouve-te.", eh: "🎯 Plano de ação de 7 eixos", ea: 'Os 7 eixos-chave do progresso. Diz ao Gloxoo "faz-me um plano de ação" — ele preenche só para ti.', pb: "🚀 Faz-me um plano" },
  ru: { menu: "О GLOXORG + 7 осей", alt: "Мировая люксовая профессиональная соцплатформа", b1h: "🌍 Что такое GLOXORG?", b1p: "GLOXORG — глобальная люксовая профессиональная соцплатформа: делись, связывайся, находи клиентов, развивай профессию. Сайт: gloxorg.com", b2h: "💎 Gloxoo — умное сердце", b2p: "Я Gloxoo, умный помощник GLOXORG. Я с тобой на каждой странице: пишу, говорю, даю актуальную информацию. Сайт: gloxoo.com", b3h: "🐻 Ekspert — эксперт страницы", b3p: "Медведь Ekspert — эксперт твоей текущей страницы. Нажми на медведя вверху; он глубоко помогает на этой странице и слушает тебя.", eh: "🎯 План действий из 7 осей", ea: '7 ключевых осей прогресса. Скажи Gloxoo «составь мне план действий» — он заполнит их для тебя.', pb: "🚀 Составь мне план" },
  uk: { menu: "Про GLOXORG + 7 осей", alt: "Світова люксова професійна соцплатформа", b1h: "🌍 Що таке GLOXORG?", b1p: "GLOXORG — глобальна люксова професійна соцплатформа: ділися, з'єднуйся, знаходь клієнтів, розвивай професію. Сайт: gloxorg.com", b2h: "💎 Gloxoo — розумне серце", b2p: "Я Gloxoo, розумний помічник GLOXORG. Я з тобою на кожній сторінці: пишу, говорю, даю актуальну інформацію. Сайт: gloxoo.com", b3h: "🐻 Ekspert — експерт сторінки", b3p: "Ведмідь Ekspert — експерт твоєї поточної сторінки. Натисни на ведмедя вгорі; він глибоко допомагає на цій сторінці й слухає тебе.", eh: "🎯 План дій із 7 осей", ea: '7 ключових осей прогресу. Скажи Gloxoo «склади мені план дій» — він заповнить їх для тебе.', pb: "🚀 Склади мені план" },
  ar: { menu: "عن GLOXORG + 7 محاور", alt: "منصة العالم الاجتماعية المهنية الفاخرة", b1h: "🌍 ما هي GLOXORG؟", b1p: "GLOXORG منصة اجتماعية مهنية فاخرة عالمية — شارك، تواصل، اعثر على عملاء، طوّر مهنتك. الموقع: gloxorg.com", b2h: "💎 Gloxoo — القلب الذكي", b2p: "أنا Gloxoo، المساعد الذكي لـ GLOXORG. أنا معك في كل صفحة: أكتب، أتحدث، وأقدّم معلومات محدّثة. الموقع: gloxoo.com", b3h: "🐻 Ekspert — خبير الصفحة", b3p: "الدب Ekspert هو خبير صفحتك الحالية. اضغط على الدب في الأعلى؛ يساعدك بعمق في تلك الصفحة ويستمع إليك.", eh: "🎯 خطة عمل من 7 محاور", ea: 'المحاور السبعة الأساسية للتقدّم. قل لـ Gloxoo "اصنع لي خطة عمل" — يملؤها خصيصًا لك.', pb: "🚀 اصنع لي خطة" },
  zh: { menu: "关于 GLOXORG + 7 轴", alt: "全球奢华专业社交平台", b1h: "🌍 GLOXORG 是什么？", b1p: "GLOXORG 是面向全球的奢华专业社交平台——分享、连接、寻找客户、发展你的职业。网址：gloxorg.com", b2h: "💎 Gloxoo — 智慧核心", b2p: "我是 Gloxoo，GLOXORG 的智能助手。每个页面都陪着你：我会写、会说、提供最新信息。网址：gloxoo.com", b3h: "🐻 Ekspert — 页面专家", b3p: "小熊 Ekspert 是你当前页面的专家。点击上方的小熊；它在该页面深入帮助并倾听你。", eh: "🎯 7 轴行动计划", ea: '进步的 7 大核心轴。对 Gloxoo 说"给我做个行动计划"——它会专为你填写。', pb: "🚀 给我做个计划" },
  ja: { menu: "GLOXORG について + 7つの軸", alt: "世界のラグジュアリーなプロ向けソーシャル基盤", b1h: "🌍 GLOXORG とは？", b1p: "GLOXORG は世界に開かれたラグジュアリーなプロ向けソーシャル基盤です——共有し、つながり、顧客を見つけ、職業を伸ばす。Web: gloxorg.com", b2h: "💎 Gloxoo — 賢い心", b2p: "私は Gloxoo、GLOXORG の賢いアシスタント。どのページでもそばに：書き、話し、最新情報を届けます。Web: gloxoo.com", b3h: "🐻 Ekspert — ページの専門家", b3p: "クマの Ekspert は今のページの専門家。上のクマをタップ；そのページで深く助け、あなたに耳を傾けます。", eh: "🎯 7軸アクションプラン", ea: '前進の7つの核となる軸。Gloxoo に「行動計画を作って」と言えば、あなた専用に埋めます。', pb: "🚀 プランを作って" },
  hi: { menu: "GLOXORG के बारे में + 7 अक्ष", alt: "दुनिया का लक्ज़री प्रोफेशनल सोशल प्लेटफ़ॉर्म", b1h: "🌍 GLOXORG क्या है?", b1p: "GLOXORG एक वैश्विक लक्ज़री प्रोफेशनल सोशल प्लेटफ़ॉर्म है — साझा करो, जुड़ो, ग्राहक पाओ, अपना पेशा बढ़ाओ। वेब: gloxorg.com", b2h: "💎 Gloxoo — स्मार्ट दिल", b2p: "मैं Gloxoo हूँ, GLOXORG का स्मार्ट सहायक। हर पेज पर तुम्हारे साथ: लिखता हूँ, बोलता हूँ, ताज़ा जानकारी देता हूँ। वेब: gloxoo.com", b3h: "🐻 Ekspert — पेज विशेषज्ञ", b3p: "भालू Ekspert तुम्हारे मौजूदा पेज का विशेषज्ञ है। ऊपर भालू पर टैप करो; वह उस पेज पर गहराई से मदद करता है और तुम्हें सुनता है।", eh: "🎯 7-अक्ष कार्य योजना", ea: 'प्रगति के 7 मुख्य अक्ष। Gloxoo से कहो "मेरे लिए कार्य योजना बनाओ" — वह तुम्हारे लिए भर देगा।', pb: "🚀 मेरे लिए योजना बनाओ" },
};
// "Davet Et / Paylaş" — kopyalanır/gönderilir link penceresi metinleri (13 dil)
const DAVET_CEVIRI = {
  tr: { menu: "Davet Et / Paylaş", baslik: "GLOXORG'a Davet Et", aciklama: "Bu bağlantıyı kopyala ya da gönder — açan herkes GLOXORG'a girer.", kopyala: "Bağlantıyı kopyala", kopyalandi: "Kopyalandı ✓", gonder: "Gönder / Paylaş", mesaj: "GLOXORG'a katıl — dünyanın lüks profesyonel sosyal platformu 💎", qr: "Kamerayla okut", kur: "Uygulamayı yükle", kurIos: "iPhone'da: aşağıdaki Paylaş ⬆ → 'Ana Ekrana Ekle'", kurAndroid: "Android'de: sağ üstteki ⋮ (üç nokta) → 'Uygulamayı yükle' ya da 'Ana ekrana ekle'" },
  en: { menu: "Invite / Share", baslik: "Invite to GLOXORG", aciklama: "Copy or send this link — anyone who opens it enters GLOXORG.", kopyala: "Copy link", kopyalandi: "Copied ✓", gonder: "Send / Share", mesaj: "Join GLOXORG — the world's luxury professional social platform 💎", qr: "Scan with camera", kur: "Install app", kurIos: "On iPhone: Share ⬆ below → 'Add to Home Screen'", kurAndroid: "On Android: top-right ⋮ menu → 'Install app' or 'Add to Home screen'" },
  de: { menu: "Einladen / Teilen", baslik: "Zu GLOXORG einladen", aciklama: "Kopiere oder sende diesen Link — wer ihn öffnet, betritt GLOXORG.", kopyala: "Link kopieren", kopyalandi: "Kopiert ✓", gonder: "Senden / Teilen", mesaj: "Komm zu GLOXORG — die luxuriöse berufliche Social-Plattform der Welt 💎", qr: "Mit Kamera scannen", kur: "App installieren", kurIos: "Auf dem iPhone: Teilen ⬆ unten → 'Zum Home-Bildschirm'", kurAndroid: "Auf Android: oben rechts ⋮ → 'App installieren' oder 'Zum Startbildschirm'" },
  fr: { menu: "Inviter / Partager", baslik: "Inviter sur GLOXORG", aciklama: "Copie ou envoie ce lien — quiconque l'ouvre entre sur GLOXORG.", kopyala: "Copier le lien", kopyalandi: "Copié ✓", gonder: "Envoyer / Partager", mesaj: "Rejoins GLOXORG — la plateforme sociale professionnelle de luxe du monde 💎", qr: "Scanner avec la caméra", kur: "Installer l'application", kurIos: "Sur iPhone : Partager ⬆ en bas → 'Sur l'écran d'accueil'", kurAndroid: "Sur Android : menu ⋮ en haut à droite → 'Installer l'application' ou 'Ajouter à l'écran d'accueil'" },
  es: { menu: "Invitar / Compartir", baslik: "Invitar a GLOXORG", aciklama: "Copia o envía este enlace — quien lo abra entra en GLOXORG.", kopyala: "Copiar enlace", kopyalandi: "Copiado ✓", gonder: "Enviar / Compartir", mesaj: "Únete a GLOXORG — la plataforma social profesional de lujo del mundo 💎", qr: "Escanea con la cámara", kur: "Instalar la app", kurIos: "En iPhone: Compartir ⬆ abajo → 'Añadir a inicio'", kurAndroid: "En Android: menú ⋮ arriba a la derecha → 'Instalar app' o 'Añadir a pantalla de inicio'" },
  it: { menu: "Invita / Condividi", baslik: "Invita su GLOXORG", aciklama: "Copia o invia questo link — chi lo apre entra in GLOXORG.", kopyala: "Copia link", kopyalandi: "Copiato ✓", gonder: "Invia / Condividi", mesaj: "Unisciti a GLOXORG — la piattaforma sociale professionale di lusso del mondo 💎", qr: "Inquadra con la fotocamera", kur: "Installa l'app", kurIos: "Su iPhone: Condividi ⬆ in basso → 'Aggiungi a Home'", kurAndroid: "Su Android: menu ⋮ in alto a destra → 'Installa app' o 'Aggiungi a schermata Home'" },
  pt: { menu: "Convidar / Partilhar", baslik: "Convidar para a GLOXORG", aciklama: "Copia ou envia este link — quem o abrir entra na GLOXORG.", kopyala: "Copiar link", kopyalandi: "Copiado ✓", gonder: "Enviar / Partilhar", mesaj: "Junta-te à GLOXORG — a plataforma social profissional de luxo do mundo 💎", qr: "Digitalizar com a câmara", kur: "Instalar a app", kurIos: "No iPhone: Partilhar ⬆ abaixo → 'Adicionar ao ecrã principal'", kurAndroid: "No Android: menu ⋮ no canto superior direito → 'Instalar app' ou 'Adicionar ao ecrã principal'" },
  ru: { menu: "Пригласить / Поделиться", baslik: "Пригласить в GLOXORG", aciklama: "Скопируй или отправь эту ссылку — кто откроет, войдёт в GLOXORG.", kopyala: "Скопировать ссылку", kopyalandi: "Скопировано ✓", gonder: "Отправить / Поделиться", mesaj: "Присоединяйся к GLOXORG — мировая люксовая профессиональная соцплатформа 💎", qr: "Сканируй камерой", kur: "Установить приложение", kurIos: "На iPhone: Поделиться ⬆ внизу → 'На экран «Домой»'", kurAndroid: "На Android: меню ⋮ вверху справа → 'Установить приложение' или 'Добавить на главный экран'" },
  uk: { menu: "Запросити / Поділитися", baslik: "Запросити в GLOXORG", aciklama: "Скопіюй або надішли це посилання — хто відкриє, увійде в GLOXORG.", kopyala: "Скопіювати посилання", kopyalandi: "Скопійовано ✓", gonder: "Надіслати / Поділитися", mesaj: "Приєднуйся до GLOXORG — світова люксова професійна соцплатформа 💎", qr: "Скануй камерою", kur: "Встановити застосунок", kurIos: "На iPhone: Поділитися ⬆ внизу → 'На екран «Домівка»'", kurAndroid: "На Android: меню ⋮ вгорі праворуч → 'Встановити застосунок' або 'Додати на головний екран'" },
  ar: { menu: "دعوة / مشاركة", baslik: "ادعُ إلى GLOXORG", aciklama: "انسخ هذا الرابط أو أرسله — كل من يفتحه يدخل GLOXORG.", kopyala: "نسخ الرابط", kopyalandi: "تم النسخ ✓", gonder: "إرسال / مشاركة", mesaj: "انضم إلى GLOXORG — منصة العالم الاجتماعية المهنية الفاخرة 💎", qr: "امسحه بالكاميرا", kur: "تثبيت التطبيق", kurIos: "على iPhone: مشاركة ⬆ بالأسفل ← 'إضافة إلى الشاشة الرئيسية'", kurAndroid: "على Android: قائمة ⋮ أعلى اليمين ← 'تثبيت التطبيق' أو 'إضافة إلى الشاشة الرئيسية'" },
  zh: { menu: "邀请 / 分享", baslik: "邀请加入 GLOXORG", aciklama: "复制或发送此链接——打开的人即可进入 GLOXORG。", kopyala: "复制链接", kopyalandi: "已复制 ✓", gonder: "发送 / 分享", mesaj: "加入 GLOXORG——全球奢华专业社交平台 💎", qr: "用相机扫描", kur: "安装应用", kurIos: "在 iPhone 上：底部分享 ⬆ →『添加到主屏幕』", kurAndroid: "在 Android 上：右上角 ⋮ 菜单 →『安装应用』或『添加到主屏幕』" },
  ja: { menu: "招待 / 共有", baslik: "GLOXORG に招待", aciklama: "このリンクをコピーまたは送信——開いた人は GLOXORG に入れます。", kopyala: "リンクをコピー", kopyalandi: "コピーしました ✓", gonder: "送信 / 共有", mesaj: "GLOXORG に参加しよう——世界のラグジュアリーなプロ向けソーシャル基盤 💎", qr: "カメラで読み取る", kur: "アプリをインストール", kurIos: "iPhoneでは：下の共有 ⬆ →「ホーム画面に追加」", kurAndroid: "Androidでは：右上の ⋮ メニュー →「アプリをインストール」または「ホーム画面に追加」" },
  hi: { menu: "आमंत्रित करें / साझा करें", baslik: "GLOXORG में आमंत्रित करें", aciklama: "इस लिंक को कॉपी या भेजें — जो भी खोलेगा GLOXORG में आ जाएगा।", kopyala: "लिंक कॉपी करें", kopyalandi: "कॉपी हो गया ✓", gonder: "भेजें / साझा करें", mesaj: "GLOXORG में शामिल हों — दुनिया का लक्ज़री प्रोफेशनल सोशल प्लेटफ़ॉर्म 💎", qr: "कैमरे से स्कैन करें", kur: "ऐप इंस्टॉल करें", kurIos: "iPhone पर: नीचे शेयर ⬆ → 'होम स्क्रीन में जोड़ें'", kurAndroid: "Android पर: ऊपर-दाएँ ⋮ मेनू → 'ऐप इंस्टॉल करें' या 'होम स्क्रीन में जोड़ें'" },
};
// Mağaza rozetleri (Google Play / App Store) mikro-metni — 13 dil. Yayına çıkınca "yakinda" kalkar.
const MAGAZA_CEVIRI = {
  tr:{ ust:"Şuradan indir", yakinda:"Yakında", baslik:"Mağazadan indir" },
  en:{ ust:"Get it on", yakinda:"Soon", baslik:"Download from store" },
  de:{ ust:"Laden im", yakinda:"Bald", baslik:"Aus dem Store laden" },
  fr:{ ust:"Disponible sur", yakinda:"Bientôt", baslik:"Télécharger depuis le store" },
  es:{ ust:"Disponible en", yakinda:"Pronto", baslik:"Descargar de la tienda" },
  it:{ ust:"Scaricalo su", yakinda:"Presto", baslik:"Scarica dallo store" },
  pt:{ ust:"Baixe na", yakinda:"Em breve", baslik:"Baixar da loja" },
  ru:{ ust:"Загрузите в", yakinda:"Скоро", baslik:"Скачать из магазина" },
  uk:{ ust:"Завантажте в", yakinda:"Скоро", baslik:"Завантажити з магазину" },
  ar:{ ust:"حمّله من", yakinda:"قريباً", baslik:"التنزيل من المتجر" },
  zh:{ ust:"下载于", yakinda:"即将", baslik:"从商店下载" },
  ja:{ ust:"入手する", yakinda:"近日", baslik:"ストアから入手" },
  hi:{ ust:"पाएं", yakinda:"जल्द", baslik:"स्टोर से डाउनलोड करें" },
};
// Öneri çipinin ikonu — metindeki KONUYA göre renkli emoji (sadece yıldız değil; her şeye uygun ikon)
function oneriIkon(metin) {
  const s = (metin || "").toLocaleLowerCase("tr");
  const tablo = [
    [/restoran|yemek|lokanta|cafe|kafe|kahve/, "🍽️"], [/itfaiye/, "🚒"], [/postane|posta|kargo/, "📮"],
    [/banka|atm|para çek/, "🏦"], [/hastane|eczane|doktor|sağlık|klinik|acil/, "🏥"],
    [/market|süpermarket|alışveriş|mağaza|avm|bakkal|manav/, "🛒"], [/cami|mescit|ibadet|namaz/, "🕌"], [/kilise/, "⛪"], [/sinagog/, "🕍"],
    [/okul|üniversite|eğitim|akademi|kurs/, "🎓"], [/benzin|akaryakıt|yakıt|istasyon/, "⛽"], [/park|bahçe|yeşil alan/, "🌳"],
    [/otel|konaklama|pansiyon/, "🏨"], [/harita|yol tarifi|nasıl gider|navig|rota|git/, "🗺️"], [/su|göl|deniz|nehir|plaj|sahil|dere/, "🌊"],
    [/paylaşım|gönderi|post yaz|biyograf|ilan|slogan|şiir|kutlama/, "📝"], [/foto|resim|görsel/, "📷"], [/video/, "🎬"],
    [/hava|sıcaklık|yağmur|derece/, "🌤️"], [/polis|karakol|güvenlik/, "🚓"], [/yakın|çevre|etraf|listele/, "📍"], [/başka|daha|devam|öner/, "💬"],
  ];
  for (const [re, em] of tablo) if (re.test(s)) return em;
  return "✨";
}

// HER SAYFANIN NE İŞE YARADIĞINI anlatan açıklama — Ekspert (🐻) sayfaya İLK girişte konuşarak+yazarak söyler,
// sonra istenirse üstteki Ekspert düğmesiyle tekrar dinlenir. (Dil yoksa en'e düşer; 13 dil çevirisi sonraki adım.)
const SAYFA_ACIKLAMA = {
  home: {
    tr: "Burası Keşfet — ana akış. Profesyonellerin paylaşımlarını görürsün; beğenir, yorum yapar, kaydeder ve paylaşabilirsin. Yeni bir şey paylaşmak için alttaki artı (＋) düğmesine bas. Bir yazıya sorumu sormak için üstümdeki elmasa dokun.",
    en: "This is Discover — the main feed. You see professionals' posts; you can like, comment, save and share. Tap the plus (＋) button below to post something new. Tap the diamond to ask me about any post.",
    de: "Das ist Entdecken — der Hauptfeed. Du siehst Beiträge von Profis; du kannst liken, kommentieren, speichern und teilen. Tippe unten auf Plus (＋), um etwas Neues zu posten.",
    fr: "C'est Découvrir — le fil principal. Tu vois les publications des pros ; tu peux aimer, commenter, enregistrer et partager. Appuie sur le plus (＋) en bas pour publier.",
    es: "Esto es Descubrir — el feed principal. Ves las publicaciones de los profesionales; puedes dar me gusta, comentar, guardar y compartir. Pulsa el más (＋) abajo para publicar.",
    it: "Questo è Scopri — il feed principale. Vedi i post dei professionisti; puoi mettere mi piace, commentare, salvare e condividere. Tocca il più (＋) in basso per pubblicare.",
    pt: "Isto é Descobrir — o feed principal. Vês publicações de profissionais; podes gostar, comentar, guardar e partilhar. Toca no mais (＋) abaixo para publicar.",
    ru: "Это Обзор — главная лента. Ты видишь публикации профессионалов; можешь лайкать, комментировать, сохранять и делиться. Нажми плюс (＋) внизу, чтобы опубликовать.",
    uk: "Це Огляд — головна стрічка. Ти бачиш публікації професіоналів; можеш вподобати, коментувати, зберігати й ділитися. Натисни плюс (＋) внизу, щоб опублікувати.",
    ar: "هذه صفحة الاكتشاف — الموجز الرئيسي. ترى منشورات المحترفين؛ يمكنك الإعجاب والتعليق والحفظ والمشاركة. اضغط زر الجمع (＋) بالأسفل لنشر شيء جديد.",
    zh: "这里是发现——主信息流。你会看到专业人士的帖子；可以点赞、评论、保存和分享。点下方的加号（＋）发布新内容。",
    ja: "ここは発見——メインのフィードです。プロの投稿が見られ、いいね・コメント・保存・共有ができます。下の＋ボタンで新規投稿。",
    hi: "यह डिस्कवर है — मुख्य फ़ीड। यहाँ पेशेवरों की पोस्ट दिखती हैं; तुम लाइक, कमेंट, सेव और शेयर कर सकते हो। नया पोस्ट करने के लिए नीचे प्लस (＋) दबाओ।",
  },
  ara: {
    tr: "Burası Arama. Meslek, isim ya da şehir yazarak profesyonelleri ve gönderileri bulursun. Aradığını yaz, sana en uygun sonuçları getireyim.",
    en: "This is Search. Type a profession, name or city to find professionals and posts. Type what you're looking for and I'll bring the best matches.",
    de: "Das ist die Suche. Tippe Beruf, Name oder Stadt ein, um Profis und Beiträge zu finden. Schreib, was du suchst.",
    fr: "C'est la Recherche. Tape un métier, un nom ou une ville pour trouver des pros et des publications. Écris ce que tu cherches.",
    es: "Esto es Buscar. Escribe una profesión, nombre o ciudad para encontrar profesionales y publicaciones. Escribe lo que buscas.",
    it: "Questa è la Ricerca. Scrivi una professione, un nome o una città per trovare professionisti e post. Scrivi ciò che cerchi.",
    pt: "Isto é Pesquisar. Escreve uma profissão, nome ou cidade para encontrar profissionais e publicações. Escreve o que procuras.",
    ru: "Это Поиск. Введи профессию, имя или город, чтобы найти профессионалов и публикации. Напиши, что ищешь.",
    uk: "Це Пошук. Введи професію, ім'я або місто, щоб знайти професіоналів і публікації. Напиши, що шукаєш.",
    ar: "هذه صفحة البحث. اكتب مهنة أو اسمًا أو مدينة للعثور على المحترفين والمنشورات. اكتب ما تبحث عنه.",
    zh: "这里是搜索。输入职业、姓名或城市来查找专业人士和帖子。输入你要找的内容即可。",
    ja: "ここは検索です。職業・名前・都市を入力してプロや投稿を探せます。探しているものを入力して。",
    hi: "यह खोज है। पेशा, नाम या शहर लिखकर पेशेवर और पोस्ट खोजो। जो ढूँढ रहे हो, वह लिखो।",
  },
  konum: {
    tr: "Burası Konum. Yakınındaki profesyonelleri ve işleri haritada görürsün. İzin verirsen sana en yakın olanları gösteririm.",
    en: "This is Location. See professionals and jobs near you on the map. Allow location and I'll show the closest ones.",
    de: "Das ist Standort. Sieh Profis und Jobs in deiner Nähe auf der Karte. Erlaube den Standort und ich zeige die nächsten.",
    fr: "C'est Localisation. Vois les pros et les offres près de toi sur la carte. Autorise la localisation et je montre les plus proches.",
    es: "Esto es Ubicación. Ve profesionales y trabajos cerca de ti en el mapa. Permite la ubicación y te muestro los más cercanos.",
    it: "Questa è Posizione. Vedi professionisti e lavori vicino a te sulla mappa. Consenti la posizione e ti mostro i più vicini.",
    pt: "Isto é Localização. Vê profissionais e trabalhos perto de ti no mapa. Permite a localização e mostro os mais próximos.",
    ru: "Это Местоположение. Смотри профессионалов и работу рядом на карте. Разреши геолокацию — покажу ближайших.",
    uk: "Це Місцезнаходження. Дивись професіоналів і роботу поруч на карті. Дозволь геолокацію — покажу найближчих.",
    ar: "هذه صفحة الموقع. شاهد المحترفين والأعمال القريبة منك على الخريطة. اسمح بالموقع وسأعرض الأقرب.",
    zh: "这里是位置。在地图上查看你附近的专业人士和工作。允许定位，我会显示最近的。",
    ja: "ここは位置情報です。近くのプロや仕事を地図で見られます。位置情報を許可すれば最寄りを表示します。",
    hi: "यह स्थान है। नक्शे पर अपने पास के पेशेवर और काम देखो। लोकेशन की अनुमति दो, मैं सबसे नज़दीकी दिखाऊँगा।",
  },
  mesaj: {
    tr: "Burası Mesajlar. Bağ kurduğun kişilerle özel yazışırsın. Bir sohbete dokun ya da yeni bir mesaj başlat.",
    en: "This is Messages. Chat privately with your connections. Tap a conversation or start a new message.",
    de: "Das sind Nachrichten. Schreibe privat mit deinen Kontakten. Tippe auf einen Chat oder starte eine neue Nachricht.",
    fr: "Ce sont les Messages. Discute en privé avec tes contacts. Appuie sur une conversation ou démarre un nouveau message.",
    es: "Esto son Mensajes. Chatea en privado con tus contactos. Pulsa una conversación o inicia un mensaje nuevo.",
    it: "Questi sono i Messaggi. Chatta in privato con i tuoi contatti. Tocca una conversazione o avvia un nuovo messaggio.",
    pt: "Isto são Mensagens. Conversa em privado com os teus contactos. Toca numa conversa ou inicia uma nova mensagem.",
    ru: "Это Сообщения. Общайся лично со своими контактами. Нажми на чат или начни новое сообщение.",
    uk: "Це Повідомлення. Спілкуйся приватно з контактами. Натисни на чат або почни нове повідомлення.",
    ar: "هذه صفحة الرسائل. تحدث بشكل خاص مع معارفك. اضغط على محادثة أو ابدأ رسالة جديدة.",
    zh: "这里是消息。与你的联系人私聊。点开一个对话或发起新消息。",
    ja: "ここはメッセージです。つながりと個別にやり取りできます。会話をタップするか、新しいメッセージを開始。",
    hi: "यह संदेश है। अपने संपर्कों से निजी बातचीत करो। किसी बातचीत पर टैप करो या नया संदेश शुरू करो।",
  },
  profil: {
    tr: "Burası Profilin — vitrinin. Fotoğrafın, mesleğin ve paylaşımların burada. Düzenle düğmesiyle bilgilerini güncelleyebilirsin.",
    en: "This is your Profile — your showcase. Your photo, profession and posts are here. Use Edit to update your details.",
    de: "Das ist dein Profil — deine Visitenkarte. Foto, Beruf und Beiträge sind hier. Mit Bearbeiten aktualisierst du deine Angaben.",
    fr: "C'est ton Profil — ta vitrine. Ta photo, ton métier et tes publications sont ici. Utilise Modifier pour mettre à jour tes infos.",
    es: "Este es tu Perfil — tu escaparate. Tu foto, profesión y publicaciones están aquí. Usa Editar para actualizar tus datos.",
    it: "Questo è il tuo Profilo — la tua vetrina. Foto, professione e post sono qui. Usa Modifica per aggiornare i tuoi dati.",
    pt: "Este é o teu Perfil — a tua montra. A tua foto, profissão e publicações estão aqui. Usa Editar para atualizar os teus dados.",
    ru: "Это твой Профиль — твоя витрина. Здесь фото, профессия и публикации. Нажми Изменить, чтобы обновить данные.",
    uk: "Це твій Профіль — твоя вітрина. Тут фото, професія та публікації. Натисни Редагувати, щоб оновити дані.",
    ar: "هذه صفحة ملفك — واجهتك. صورتك ومهنتك ومنشوراتك هنا. استخدم تعديل لتحديث بياناتك.",
    zh: "这是你的个人资料——你的展示窗。你的照片、职业和帖子都在这里。用「编辑」更新你的信息。",
    ja: "ここはあなたのプロフィール——あなたのショーケースです。写真・職業・投稿がここに。編集で情報を更新できます。",
    hi: "यह तुम्हारी प्रोफ़ाइल है — तुम्हारा शोकेस। तुम्हारी फ़ोटो, पेशा और पोस्ट यहाँ हैं। जानकारी अपडेट करने के लिए एडिट दबाओ।",
  },
  paylas: {
    tr: "Burası Paylaşım. Fotoğraf, video, dosya ya da yazı paylaşabilirsin. İstersen üstteki başlığı yaz; kararsızsan Gloxoo sana ne yazacağını önersin. Hazır olunca Paylaş'a bas, kategoriyi seç.",
    en: "This is Sharing. Post a photo, video, file or text. Add a title on top; if unsure, let Gloxoo suggest what to write. When ready press Share and pick a category.",
    de: "Das ist Teilen. Poste Foto, Video, Datei oder Text. Gib oben einen Titel ein; unsicher? Gloxoo schlägt dir etwas vor. Dann Teilen drücken und Kategorie wählen.",
    fr: "C'est le Partage. Publie une photo, une vidéo, un fichier ou du texte. Ajoute un titre ; hésitant ? Gloxoo te propose quoi écrire. Ensuite appuie sur Partager et choisis une catégorie.",
    es: "Esto es Compartir. Publica una foto, vídeo, archivo o texto. Añade un título arriba; si dudas, deja que Gloxoo te sugiera qué escribir. Cuando estés listo pulsa Compartir y elige una categoría.",
    it: "Questa è la Condivisione. Pubblica foto, video, file o testo. Aggiungi un titolo; se sei indeciso, fatti suggerire da Gloxoo. Quando sei pronto premi Condividi e scegli una categoria.",
    pt: "Isto é Partilhar. Publica uma foto, vídeo, ficheiro ou texto. Adiciona um título; em dúvida? Deixa o Gloxoo sugerir. Quando estiver pronto carrega em Partilhar e escolhe uma categoria.",
    ru: "Это Публикация. Выложи фото, видео, файл или текст. Добавь заголовок; не уверен — Gloxoo подскажет, что написать. Готово — нажми Поделиться и выбери категорию.",
    uk: "Це Публікація. Виклади фото, відео, файл або текст. Додай заголовок; не впевнений — Gloxoo підкаже. Готово — натисни Поділитися й обери категорію.",
    ar: "هذه صفحة المشاركة. انشر صورة أو فيديو أو ملفًا أو نصًا. أضف عنوانًا بالأعلى؛ إن ترددت، دع Gloxoo يقترح. عند الجاهزية اضغط مشاركة واختر فئة.",
    zh: "这里是分享。可发布照片、视频、文件或文字。在上方加标题；拿不准就让 Gloxoo 建议写什么。准备好后按分享并选择分类。",
    ja: "ここは共有です。写真・動画・ファイル・テキストを投稿できます。上部にタイトルを追加；迷ったら Gloxoo が提案します。準備できたら共有を押してカテゴリを選択。",
    hi: "यह शेयर है। फ़ोटो, वीडियो, फ़ाइल या टेक्स्ट पोस्ट करो। ऊपर शीर्षक जोड़ो; उलझन हो तो Gloxoo से सुझाव लो। तैयार होने पर शेयर दबाओ और श्रेणी चुनो।",
  },
  ayarlar: {
    tr: "Burası Ayarlar. Dilini, mesleklerini, bildirimlerini ve hesabınla ilgili her şeyi buradan değiştirebilirsin.",
    en: "These are Settings. Change your language, professions, notifications and everything about your account here.",
    de: "Das sind Einstellungen. Ändere hier Sprache, Berufe, Benachrichtigungen und alles rund um dein Konto.",
    fr: "Ce sont les Réglages. Change ici ta langue, tes métiers, tes notifications et tout ce qui concerne ton compte.",
    es: "Esto es Ajustes. Cambia aquí tu idioma, profesiones, notificaciones y todo lo relacionado con tu cuenta.",
    it: "Queste sono le Impostazioni. Cambia qui lingua, professioni, notifiche e tutto ciò che riguarda il tuo account.",
    pt: "Isto são Definições. Muda aqui o teu idioma, profissões, notificações e tudo sobre a tua conta.",
    ru: "Это Настройки. Здесь меняй язык, профессии, уведомления и всё, что связано с аккаунтом.",
    uk: "Це Налаштування. Тут зміни мову, професії, сповіщення і все, що стосується акаунта.",
    ar: "هذه صفحة الإعدادات. غيّر هنا لغتك ومهنك وإشعاراتك وكل ما يخص حسابك.",
    zh: "这里是设置。在这里更改语言、职业、通知以及与账户相关的一切。",
    ja: "ここは設定です。言語・職業・通知、アカウントに関するすべてをここで変更できます。",
    hi: "यह सेटिंग्स है। यहाँ अपनी भाषा, पेशे, सूचनाएँ और खाते से जुड़ी हर चीज़ बदलो।",
  },
  bildirim: {
    tr: "Burası Bildirimler. Beğeni, yorum, takip ve mesajların burada birikir. Birine dokununca seni ilgili yere götürürüm.",
    en: "These are Notifications. Likes, comments, follows and messages gather here. Tap one and I'll take you there.",
    de: "Das sind Benachrichtigungen. Likes, Kommentare, Follows und Nachrichten sammeln sich hier. Tippe darauf, ich bringe dich hin.",
    fr: "Ce sont les Notifications. Les j'aime, commentaires, abonnements et messages s'accumulent ici. Appuie et je t'y emmène.",
    es: "Esto son Notificaciones. Me gusta, comentarios, seguidores y mensajes se reúnen aquí. Pulsa una y te llevo allí.",
    it: "Queste sono le Notifiche. Mi piace, commenti, follower e messaggi si raccolgono qui. Tocca e ti porto lì.",
    pt: "Isto são Notificações. Gostos, comentários, seguidores e mensagens juntam-se aqui. Toca numa e levo-te lá.",
    ru: "Это Уведомления. Лайки, комментарии, подписки и сообщения собираются здесь. Нажми — и я перенесу тебя туда.",
    uk: "Це Сповіщення. Вподобання, коментарі, підписки й повідомлення збираються тут. Натисни — і я перенесу тебе туди.",
    ar: "هذه صفحة الإشعارات. تتجمع هنا الإعجابات والتعليقات والمتابعات والرسائل. اضغط على واحد وسأنقلك إليه.",
    zh: "这里是通知。点赞、评论、关注和消息都汇集在这里。点一下，我带你过去。",
    ja: "ここは通知です。いいね・コメント・フォロー・メッセージがここに集まります。タップすればそこへ案内します。",
    hi: "यह सूचनाएँ हैं। लाइक, कमेंट, फ़ॉलो और संदेश यहाँ जमा होते हैं। किसी पर टैप करो, मैं तुम्हें वहाँ ले जाऊँगा।",
  },
  elite: {
    tr: "Burası Elite Pazar — seçkin ürün ve hizmetler. Yakında dolacak, hazırlanıyoruz.",
    en: "This is Elite Market — premium products and services. Coming soon, we're preparing it.",
    de: "Das ist der Elite-Markt — erlesene Produkte und Dienste. Kommt bald.",
    fr: "C'est le Marché Elite — produits et services haut de gamme. Bientôt disponible.",
    es: "Esto es Mercado Elite — productos y servicios premium. Próximamente.",
    it: "Questo è Elite Market — prodotti e servizi premium. Presto disponibile.",
    pt: "Isto é o Mercado Elite — produtos e serviços premium. Em breve.",
    ru: "Это Элитный рынок — премиальные товары и услуги. Скоро.",
    uk: "Це Елітний ринок — преміальні товари та послуги. Незабаром.",
    ar: "هذا سوق النخبة — منتجات وخدمات مميزة. قريبًا.",
    zh: "这里是精英市场——高端产品与服务。敬请期待。",
    ja: "ここはエリートマーケット——上質な製品とサービス。近日公開。",
    hi: "यह एलीट मार्केट है — प्रीमियम उत्पाद और सेवाएँ। जल्द आ रहा है।",
  },
  topluluk: {
    tr: "Burası Topluluk — meslektaşlarınla buluşma alanı. Yakında açılıyor.",
    en: "This is Community — a space to meet peers. Coming soon.",
    de: "Das ist die Community — ein Ort für den Austausch. Kommt bald.",
    fr: "C'est la Communauté — un espace pour rencontrer tes pairs. Bientôt.",
    es: "Esto es Comunidad — un espacio para conocer colegas. Próximamente.",
    it: "Questa è la Community — uno spazio per incontrare colleghi. Presto.",
    pt: "Isto é a Comunidade — um espaço para conhecer colegas. Em breve.",
    ru: "Это Сообщество — место для встреч с коллегами. Скоро.",
    uk: "Це Спільнота — простір для зустрічей з колегами. Незабаром.",
    ar: "هذه صفحة المجتمع — مكان للقاء الزملاء. قريبًا.",
    zh: "这里是社区——结识同行的空间。敬请期待。",
    ja: "ここはコミュニティ——仲間と出会う場所。近日公開。",
    hi: "यह समुदाय है — साथियों से मिलने की जगह। जल्द आ रहा है।",
  },
  video: {
    tr: "Burası Canlı Akış — kısa videolar. Yukarı kaydırarak izler, beğenir ve paylaşırsın.",
    en: "This is Live Feed — short videos. Swipe up to watch, like and share.",
    de: "Das ist der Live-Feed — kurze Videos. Nach oben wischen zum Ansehen, Liken und Teilen.",
    fr: "C'est le Flux Live — des vidéos courtes. Glisse vers le haut pour regarder, aimer et partager.",
    es: "Esto es Feed en Vivo — vídeos cortos. Desliza hacia arriba para ver, dar me gusta y compartir.",
    it: "Questo è il Feed Live — video brevi. Scorri in alto per guardare, mettere mi piace e condividere.",
    pt: "Isto é o Feed ao Vivo — vídeos curtos. Desliza para cima para ver, gostar e partilhar.",
    ru: "Это Живая лента — короткие видео. Смахивай вверх, чтобы смотреть, лайкать и делиться.",
    uk: "Це Жива стрічка — короткі відео. Гортай угору, щоб дивитися, вподобати й ділитися.",
    ar: "هذه صفحة البث المباشر — مقاطع قصيرة. اسحب للأعلى للمشاهدة والإعجاب والمشاركة.",
    zh: "这里是直播流——短视频。向上滑动即可观看、点赞和分享。",
    ja: "ここはライブフィード——短い動画です。上にスワイプして視聴・いいね・共有。",
    hi: "यह लाइव फ़ीड है — छोटे वीडियो। देखने, लाइक और शेयर करने के लिए ऊपर स्वाइप करो।",
  },
  akademi: {
    tr: "Burası Akademi — öğrenme ve eğitim içerikleri. Yakında.",
    en: "This is Academy — learning and training content. Coming soon.",
    de: "Das ist die Akademie — Lern- und Schulungsinhalte. Kommt bald.",
    fr: "C'est l'Académie — contenus d'apprentissage et de formation. Bientôt.",
    es: "Esto es Academia — contenido de aprendizaje y formación. Próximamente.",
    it: "Questa è l'Accademia — contenuti di apprendimento e formazione. Presto.",
    pt: "Isto é a Academia — conteúdos de aprendizagem e formação. Em breve.",
    ru: "Это Академия — обучающие и учебные материалы. Скоро.",
    uk: "Це Академія — навчальні та освітні матеріали. Незабаром.",
    ar: "هذه صفحة الأكاديمية — محتوى تعليمي وتدريبي. قريبًا.",
    zh: "这里是学院——学习与培训内容。敬请期待。",
    ja: "ここはアカデミー——学習・研修コンテンツ。近日公開。",
    hi: "यह अकादमी है — सीखने और प्रशिक्षण की सामग्री। जल्द आ रहा है।",
  },
};

// CANLI MASKOT YÜZÜ — konuşurken (konusuyor=true) ağzı açılıp kapanır + hafif zıplar. tur: "grox" (elmas) | "ekspert" (ayı).
function MaskotYuz({ konusuyor = false, dinliyor = false, arastir = false, tur = "grox", boyut = 30, rozet = false, children }) {
  // AI ROZET DURUMU (renk): dinliyor=YEŞİL, konuşuyor=MAVİ, araştırıyor(düşünüyor)=TURUNCU, boşta(kapalı)=KIRMIZI
  const durumCls = dinliyor ? " dinliyor" : konusuyor ? " konusuyor" : arastir ? " arastir" : "";
  return (
    <span className={"maskot-yuz" + durumCls} style={{ width: boyut, height: boyut }} aria-hidden="true">
      {tur === "ekspert" ? (
        /* EKSPERT — 3D TAM KARAKTER sevimli AYI: kol, bacak, kulak, burun; uzuvlar oynar */
        <svg viewBox="0 0 48 48" fill="none">
          <defs>
            <radialGradient id="mskBear" cx="40%" cy="28%" r="78%">
              <stop offset="0%" stopColor="#e0b483" /><stop offset="58%" stopColor="#c08a4e" /><stop offset="100%" stopColor="#8f6230" stopOpacity="0.92" />
            </radialGradient>
          </defs>
          {/* BACAKLAR */}
          <g className="maskot-bacak maskot-bacak-sol"><rect x="18" y="35" width="4.4" height="8.5" rx="2.2" fill="#8a5e2c" /><ellipse cx="20.2" cy="43.5" rx="3.8" ry="2.2" fill="#6f4a22" /></g>
          <g className="maskot-bacak maskot-bacak-sag"><rect x="25.6" y="35" width="4.4" height="8.5" rx="2.2" fill="#8a5e2c" /><ellipse cx="27.8" cy="43.5" rx="3.8" ry="2.2" fill="#6f4a22" /></g>
          {/* KOLLAR */}
          <g className="maskot-kol maskot-kol-sol"><rect x="4" y="23" width="9" height="4" rx="2" fill="#a9743f" /><circle cx="4.6" cy="25" r="2.8" fill="#c08a4e" /></g>
          <g className="maskot-kol maskot-kol-sag"><rect x="35" y="23" width="9" height="4" rx="2" fill="#a9743f" /><circle cx="43.4" cy="25" r="2.8" fill="#c08a4e" /></g>
          {/* KULAKLAR */}
          <circle className="maskot-kulak maskot-kulak-sol" cx="13" cy="10" r="5" fill="#a9743f" /><circle className="maskot-kulak maskot-kulak-sag" cx="35" cy="10" r="5" fill="#a9743f" />
          <circle cx="13" cy="10" r="2.4" fill="#7a4f24" /><circle cx="35" cy="10" r="2.4" fill="#7a4f24" />
          {/* KAFA */}
          <circle cx="24" cy="24" r="16" fill="url(#mskBear)" />
          <ellipse cx="16" cy="16" rx="7" ry="4.5" fill="#f0d4ad" opacity="0.5" />
          <ellipse cx="24" cy="29" rx="8" ry="6" fill="#ecd6b0" />
          <circle className="maskot-goz" cx="18" cy="21" r="2.6" fill="#241608" /><circle className="maskot-goz" cx="30" cy="21" r="2.6" fill="#241608" />
          <circle cx="18.7" cy="20.2" r="0.85" fill="#fff" /><circle cx="30.7" cy="20.2" r="0.85" fill="#fff" />
          <ellipse cx="24" cy="26" rx="2.6" ry="1.9" fill="#33210f" />
          <ellipse className="maskot-agiz" cx="24" cy="31" rx="3.4" ry="2.1" fill="#5b2d12" />
          {/* AI ROZETİ — AYININ da kulakları arasında (Gloxoo gibi); boşta kırmızı, dinlerken yeşil, konuşurken mavi, araştırırken turuncu */}
          {rozet && (
            <g className="msvg-rozet" aria-hidden="true">
              <rect className="msvg-rozet-bg" x="16.8" y="4.4" width="14.4" height="6.6" rx="3.3" />
              <text className="msvg-rozet-ai" x="21.3" y="9.35" textAnchor="middle">AI</text>
              <rect className="msvg-bar msvg-bar1" x="25.3" y="5.9" width="1.35" height="3.3" rx="0.6" />
              <rect className="msvg-bar msvg-bar2" x="27.5" y="5.9" width="1.35" height="3.3" rx="0.6" />
            </g>
          )}
        </svg>
      ) : (
        /* GLOXORG — 3D TAM KARAKTER: kol, bacak, kulak, burun + büyük gözlü elmas; kollar/bacaklar/kulaklar oynar */
        <svg viewBox="0 0 48 48" fill="none">
          <defs>
            <radialGradient id="mskGem" cx="37%" cy="28%" r="80%">
              <stop offset="0%" stopColor="#8aa2ff" /><stop offset="50%" stopColor="#2a4bd0" /><stop offset="100%" stopColor="#152c78" stopOpacity="0.9" />
            </radialGradient>
          </defs>
          {/* BACAKLAR */}
          <g className="maskot-bacak maskot-bacak-sol"><rect x="18" y="34" width="4.2" height="9" rx="2.1" fill="#1c2f6e" /><ellipse cx="20.1" cy="43.4" rx="3.6" ry="2.1" fill="#11214f" /></g>
          <g className="maskot-bacak maskot-bacak-sag"><rect x="25.8" y="34" width="4.2" height="9" rx="2.1" fill="#1c2f6e" /><ellipse cx="27.9" cy="43.4" rx="3.6" ry="2.1" fill="#11214f" /></g>
          {/* KOLLAR */}
          <g className="maskot-kol maskot-kol-sol"><rect x="4" y="22" width="9" height="3.8" rx="1.9" fill="#2a4bd0" /><circle cx="4.6" cy="23.9" r="2.6" fill="#3a5be0" /></g>
          <g className="maskot-kol maskot-kol-sag"><rect x="35" y="22" width="9" height="3.8" rx="1.9" fill="#2a4bd0" /><circle cx="43.4" cy="23.9" r="2.6" fill="#3a5be0" /></g>
          {/* KULAKLAR */}
          <ellipse className="maskot-kulak maskot-kulak-sol" cx="15" cy="8.5" rx="3.6" ry="5.2" fill="#2a4bd0" />
          <ellipse className="maskot-kulak maskot-kulak-sag" cx="33" cy="8.5" rx="3.6" ry="5.2" fill="#2a4bd0" />
          {/* GÖVDE */}
          <circle cx="24" cy="23" r="16" fill="url(#mskGem)" />
          <ellipse cx="17" cy="14" rx="7" ry="5" fill="#cdd9ff" opacity="0.5" />
          {/* GÖZLER */}
          <circle className="maskot-goz" cx="18.3" cy="22" r="4.6" fill="#fff" /><circle className="maskot-goz" cx="29.7" cy="22" r="4.6" fill="#fff" />
          <circle cx="19.2" cy="22.6" r="2.3" fill="#10131c" /><circle cx="30.6" cy="22.6" r="2.3" fill="#10131c" />
          <circle cx="18.3" cy="21" r="1" fill="#fff" /><circle cx="29.7" cy="21" r="1" fill="#fff" />
          {/* BURUN */}
          <ellipse cx="24" cy="26.5" rx="1.5" ry="1.1" fill="#16265c" />
          {/* AĞIZ */}
          <ellipse className="maskot-agiz" cx="24" cy="30.5" rx="3.7" ry="2.2" fill="#0b1226" />
          {/* AI ROZETİ — kulakların TAM ARASINA gömülü (SVG); maskotla büyür/küçülür, asla kopmaz.
              Boşta altın, konuşurken kırmızı, dinlerken yeşil; küçük çubuklar hep canlı oynar. */}
          {rozet && (
            <g className="msvg-rozet" aria-hidden="true">
              <rect className="msvg-rozet-bg" x="16.8" y="2.2" width="14.4" height="6.6" rx="3.3" />
              <text className="msvg-rozet-ai" x="21.3" y="7.15" textAnchor="middle">AI</text>
              <rect className="msvg-bar msvg-bar1" x="25.3" y="3.7" width="1.35" height="3.3" rx="0.6" />
              <rect className="msvg-bar msvg-bar2" x="27.5" y="3.7" width="1.35" height="3.3" rx="0.6" />
            </g>
          )}
        </svg>
      )}
      {children}
    </span>
  );
}

// MASKOT AI ROZETİ — Gloxoo'nun KULAKLARI ARASINDA sabit duran küçük düğme; onunla küçülür/kaybolmaz.
// İçinde DAİMA canlı hareketli altın AI ikonları (küçük eşitleyici çubukları). Konuşurken KIRMIZI,
// dinlerken YEŞİL. buton=true ise tıklanır (büyük maskotta: bas → küçült, sohbet kapanmaz).
function MaskotAiRozet({ konusuyor = false, dinliyor = false, mini = false, buton = false, onClick, etiket }) {
  const durum = konusuyor ? "konus" : dinliyor ? "dinle" : "bos";
  const cls = "maskot-ai-rozet " + durum + (mini ? " mini" : "") + (buton ? " btn" : "");
  const ic = (<>{!mini && <span className="mar-ai">AI</span>}<span className="mar-bar" /><span className="mar-bar" /><span className="mar-bar" /></>);
  if (buton) return <button type="button" className={cls} onClick={onClick} aria-label={etiket || "AI"}>{ic}</button>;
  return <span className={cls} aria-hidden="true">{ic}</span>;
}

// GÜNLÜK ŞEHİR ARKA PLANI — her 24 saatte dünyadan farklı bir şehir; foto loremflickr'dan (sınırsız,
// her gün ?lock=gün ile farklı kare). Liste dünya geneli (ANAYASA: belirli ülke öne çıkarma yok).
const DUNYA_SEHIRLERI = [
  {ad:"İstanbul",ulke:"Türkiye",kod:"tr",tag:"istanbul"},{ad:"Paris",ulke:"Fransa",kod:"fr",tag:"paris"},
  {ad:"Tokyo",ulke:"Japonya",kod:"jp",tag:"tokyo"},{ad:"New York",ulke:"ABD",kod:"us",tag:"newyork"},
  {ad:"Londra",ulke:"İngiltere",kod:"gb",tag:"london"},{ad:"Roma",ulke:"İtalya",kod:"it",tag:"rome"},
  {ad:"Venedik",ulke:"İtalya",kod:"it",tag:"venice"},{ad:"Berlin",ulke:"Almanya",kod:"de",tag:"berlin"},
  {ad:"Münih",ulke:"Almanya",kod:"de",tag:"munich"},{ad:"Madrid",ulke:"İspanya",kod:"es",tag:"madrid"},
  {ad:"Barselona",ulke:"İspanya",kod:"es",tag:"barcelona"},{ad:"Lizbon",ulke:"Portekiz",kod:"pt",tag:"lisbon"},
  {ad:"Moskova",ulke:"Rusya",kod:"ru",tag:"moscow"},{ad:"Kiev",ulke:"Ukrayna",kod:"ua",tag:"kyiv"},
  {ad:"Dubai",ulke:"BAE",kod:"ae",tag:"dubai"},{ad:"Singapur",ulke:"Singapur",kod:"sg",tag:"singapore"},
  {ad:"Sidney",ulke:"Avustralya",kod:"au",tag:"sydney"},{ad:"Melbourne",ulke:"Avustralya",kod:"au",tag:"melbourne"},
  {ad:"Rio de Janeiro",ulke:"Brezilya",kod:"br",tag:"rio"},{ad:"São Paulo",ulke:"Brezilya",kod:"br",tag:"saopaulo"},
  {ad:"Kahire",ulke:"Mısır",kod:"eg",tag:"cairo"},{ad:"Cape Town",ulke:"Güney Afrika",kod:"za",tag:"capetown"},
  {ad:"Marakeş",ulke:"Fas",kod:"ma",tag:"marrakech"},{ad:"Atina",ulke:"Yunanistan",kod:"gr",tag:"athens"},
  {ad:"Santorini",ulke:"Yunanistan",kod:"gr",tag:"santorini"},{ad:"Amsterdam",ulke:"Hollanda",kod:"nl",tag:"amsterdam"},
  {ad:"Viyana",ulke:"Avusturya",kod:"at",tag:"vienna"},{ad:"Prag",ulke:"Çekya",kod:"cz",tag:"prague"},
  {ad:"Budapeşte",ulke:"Macaristan",kod:"hu",tag:"budapest"},{ad:"Varşova",ulke:"Polonya",kod:"pl",tag:"warsaw"},
  {ad:"Stockholm",ulke:"İsveç",kod:"se",tag:"stockholm"},{ad:"Kopenhag",ulke:"Danimarka",kod:"dk",tag:"copenhagen"},
  {ad:"Zürih",ulke:"İsviçre",kod:"ch",tag:"zurich"},{ad:"Pekin",ulke:"Çin",kod:"cn",tag:"beijing"},
  {ad:"Şanghay",ulke:"Çin",kod:"cn",tag:"shanghai"},{ad:"Hong Kong",ulke:"Çin",kod:"hk",tag:"hongkong"},
  {ad:"Seul",ulke:"Güney Kore",kod:"kr",tag:"seoul"},{ad:"Bangkok",ulke:"Tayland",kod:"th",tag:"bangkok"},
  {ad:"Kuala Lumpur",ulke:"Malezya",kod:"my",tag:"kualalumpur"},{ad:"Jakarta",ulke:"Endonezya",kod:"id",tag:"jakarta"},
  {ad:"Yeni Delhi",ulke:"Hindistan",kod:"in",tag:"newdelhi"},{ad:"Mumbai",ulke:"Hindistan",kod:"in",tag:"mumbai"},
  {ad:"Toronto",ulke:"Kanada",kod:"ca",tag:"toronto"},{ad:"Vancouver",ulke:"Kanada",kod:"ca",tag:"vancouver"},
  {ad:"Meksiko",ulke:"Meksika",kod:"mx",tag:"mexicocity"},{ad:"Buenos Aires",ulke:"Arjantin",kod:"ar",tag:"buenosaires"},
  {ad:"Lima",ulke:"Peru",kod:"pe",tag:"lima"},{ad:"Santiago",ulke:"Şili",kod:"cl",tag:"santiago"},
  {ad:"Doha",ulke:"Katar",kod:"qa",tag:"doha"},{ad:"Riyad",ulke:"Suudi Arabistan",kod:"sa",tag:"riyadh"},
  {ad:"Tel Aviv",ulke:"İsrail",kod:"il",tag:"telaviv"},{ad:"Edinburgh",ulke:"İskoçya",kod:"gb",tag:"edinburgh"},
  {ad:"Floransa",ulke:"İtalya",kod:"it",tag:"florence"},{ad:"Sevilla",ulke:"İspanya",kod:"es",tag:"seville"},
  {ad:"Kyoto",ulke:"Japonya",kod:"jp",tag:"kyoto"},{ad:"San Francisco",ulke:"ABD",kod:"us",tag:"sanfrancisco"},
  {ad:"Chicago",ulke:"ABD",kod:"us",tag:"chicago"},{ad:"Oslo",ulke:"Norveç",kod:"no",tag:"oslo"},
  {ad:"Helsinki",ulke:"Finlandiya",kod:"fi",tag:"helsinki"},{ad:"Brüksel",ulke:"Belçika",kod:"be",tag:"brussels"},
];
// Foto/amblem düzenleyici — BOL renk paletleri + KONSANTRAT (kendi rengini seç) + çok yazı tipi
const ZEMIN_RENKLER = ["#16223e", "#0a1a3a", "#1f6fb2", "#0d6e8c", "#08524d", "#1e7a46", "#0d3b24", "#5a4a06", "#b8860b", "#7a3c00", "#5a0e1e", "#c0303d", "#6a1248", "#3d1466", "#2a1840", "#1a1a1a", "#000000", "#3a3f4a", "#c9c4b8", "#f2e9d8"];
const YAZI_RENKLER = ["#ffffff", "#f2e9d8", "#FFD700", "#FFA62B", "#ff5d68", "#c0303d", "#ff8fc7", "#a06bff", "#5aa6e0", "#2f6fa8", "#46d37a", "#1e7a46", "#000000"];
// HEPSİ gerçekten yüklenen Google fontları (index.html) — her biri GÖRSEL olarak farklı.
// Cinzel/Cormorant BİLEREK yok: yüklenince site rakamlarını bozuyordu (sayaç/şerit Cinzel kullanıyor).
const YAZI_TIPLERI = [["Playfair Display", "Zarif", "ytZarif"], ["Montserrat", "Modern", "ytModern"], ["Oswald", "Dar", "ytDar"], ["Bebas Neue", "Tabela", "ytTabela"], ["Anton", "Kalın", "ytKalin"], ["Lobster", "Şık", "ytSik"], ["Pacifico", "Tatlı", "ytTatli"], ["Dancing Script", "El Yazısı", "ytElYazisi"], ["Great Vibes", "Zarif El", "ytZarifEl"], ["Righteous", "Retro", "ytRetro"]];
function paraBicim(deger, dil) {
  // SADECE sayı (para sembolü AYRI, renkli gösterilecek)
  try { return new Intl.NumberFormat(dil || "tr", { maximumFractionDigits: deger >= 1000 ? 0 : 2 }).format(deger); }
  catch (e) { return Math.round(deger).toLocaleString(); }
}

// GLOXORG amblemi (ana sayfa) — yuvaya GÖMÜLÜ mavi taş: altın yuva (hafif parlar) + tırnaklar,
// sabit durur, içten ışık ÜSTE doğru reflektör gibi çıkar (ANAYASA Madde 6). Yazıdan AYRI sayılır.
// Sayfa temalı pırlanta paletleri — HER PENCEREDE marka pırlantası O SAYFANIN renginde (ANAYASA 6.15)
const AMBLEM_PALET = {
  mavi:    { t: ["#ffffff", "#bfe3ff", "#5aa6e0", "#2f6fa8"], yuz: ["#ffffff", "#dff1ff", "#9fd0ff", "#5aa6e0", "#3a86c9", "#4f9bd8", "#7fc0f5"], masa: "#eaf7ff", m: ["#ffffff", "#fdfbff", "#cfeaff", "rgba(120,190,255,.55)", "rgba(120,190,255,0)"] },
  kirmizi: { t: ["#ffc2c9", "#ff8a94", "#e0353f", "#7a0f16"], yuz: ["#ffccd2", "#ffb0b8", "#ff8a94", "#e0353f", "#a01820", "#c02028", "#ff7a86"], masa: "#ffb6be", m: ["#ffb9c0", "#ff7d88", "#ff4a58", "rgba(255,50,70,.55)", "rgba(255,50,70,0)"] },
  altin:   { t: ["#fff8dc", "#ffe9a8", "#e8c254", "#8a6a10"], yuz: ["#fff8dc", "#fff3c4", "#ffe084", "#e8c254", "#b8860b", "#d4a82c", "#ffd700"], masa: "#fff3c9", m: ["#fff3c9", "#ffe9a8", "#ffd700", "rgba(255,215,0,.55)", "rgba(255,215,0,0)"] },
  yesil:   { t: ["#e8ffee", "#b8f0c8", "#46d37a", "#136e3a"], yuz: ["#e8ffee", "#d2f8dd", "#94e8b2", "#46d37a", "#1d9e54", "#2cb863", "#6fe098"], masa: "#dffae8", m: ["#dffae8", "#b8f0c8", "#5fe08a", "rgba(70,211,122,.55)", "rgba(70,211,122,0)"] },
  mor:     { t: ["#f6ecff", "#e0c4ff", "#c98bff", "#5e2a8a"], yuz: ["#f6ecff", "#eedcff", "#ddb5ff", "#c98bff", "#9b5cd6", "#b070e8", "#d9a8ff"], masa: "#f1e3ff", m: ["#f1e3ff", "#e0c4ff", "#c98bff", "rgba(201,139,255,.55)", "rgba(201,139,255,0)"] },
  turkuaz: { t: ["#e6fbff", "#b0ecf5", "#4fd0e0", "#136e7a"], yuz: ["#e6fbff", "#d4f6fb", "#92e4ef", "#4fd0e0", "#1d9aa8", "#2cb4c4", "#74dde8"], masa: "#defafd", m: ["#defafd", "#b0ecf5", "#4fd0e0", "rgba(79,208,224,.55)", "rgba(79,208,224,0)"] },
  zeytin:  { t: ["#fbffe0", "#ecf5b0", "#d6e060", "#6e7013"], yuz: ["#fbffe0", "#f4fad0", "#e6ef94", "#d6e060", "#a8b41d", "#bcc82c", "#e0e874"], masa: "#f8fcd8", m: ["#f8fcd8", "#ecf5b0", "#d6e060", "rgba(214,224,96,.55)", "rgba(214,224,96,0)"] },
  beyaz:   { t: ["#ffffff", "#eef2f8", "#cfd8e6", "#8a96a8"], yuz: ["#ffffff", "#f6f8fc", "#e2e8f2", "#cfd8e6", "#a8b4c4", "#bcc6d4", "#e8edf5"], masa: "#f4f7fb", m: ["#ffffff", "#f6f8fc", "#e2e8f2", "rgba(220,230,245,.55)", "rgba(220,230,245,0)"] },
};

// GLOXORG'e özel AYAR ikonu (dişli + ortasında pırlanta) — köşeye konur, hazır emoji DEĞİL (ANAYASA)
function AyarIkon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.5l1.7 1.2 2-.5.9 1.9 2 .8-.2 2.1 1.4 1.6-1 1.9.5 2-1.7 1.2-.4 2.1-2.1.2-1.3 1.7H10.5l-1.3-1.7-2.1-.2-.4-2.1L5 16.3l.5-2-1-1.9 1.4-1.6-.2-2.1 2-.8.9-1.9 2 .5z" opacity=".5" />
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 9.4l1.9 1.1v2.3L12 14l-1.9-1.2v-2.3z" fill="currentColor" stroke="none" opacity=".9" />
    </svg>
  );
}
// MİNİ KÖŞE TAŞI — nav ikonlarının köşesi için SADE gömülü taş: altın yuva + renkli taş + içten
// yanan ışık. DIŞARI PARILTI/GÖLGE SAÇMAZ (kırmızı blob olmaz), .ana-amblem değil → pro glow gelmez.
function MiniTas({ renk = "mavi" }) {
  // Köşe taşı da GERÇEK fasetli pırlanta + altın yüzük (ANAYASA 6.15) — tema renginde.
  return <span className="mini-tas"><GercekPirlanta c={TEMA_HEX[renk] || TEMA_HEX.mavi} /></span>;
}

// GERÇEK PIRLANTA — yuvarlak brilliant kesim, 8 BELİRGİN faset (8 yüzey), ORTADA beyaz leke YOK,
// parıltı tek köşede. cerceve=true → dolgun ALTIN YÜZÜK (kalın bant + 6 tırnak, ince çember DEĞİL);
// cerceve=false (arka plan) → ÇIPLAK taş, etrafında HİÇBİR halka/çember yok. ANAYASA 6.15.
const _PR = (r, a) => { const t = (a - 90) * Math.PI / 180; return [50 + r * Math.cos(t), 50 + r * Math.sin(t)]; };
const _fmt = (pts) => pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
// Faset geometrisi n YÜZEYE göre — n=8 ANA SAYFAYA özel; n=6 DİĞER yerlerde (kullanıcı: her yere aynı desen koyma).
const _GEOLAR = {};
function geoYap(n) {
  if (_GEOLAR[n]) return _GEOLAR[n];
  const rT = 13, rM = 25, rG = 37, st = 360 / n, yan = st * 0.34;
  const T = [], S = [], G = [], H = [];
  for (let i = 0; i < n; i++) { T.push(_PR(rT, i * st)); S.push(_PR(rM, i * st + st / 2)); G.push(_PR(rG, i * st)); H.push(_PR(rG, i * st + st / 2)); }
  const kite = [], star = [], band = [];
  for (let i = 0; i < n; i++) {
    kite.push([T[i], _PR(rM, i * st - yan), G[i], _PR(rM, i * st + yan)]);  // taç (bezel) yüzü — n ana faset
    star.push([T[i], T[(i + 1) % n], S[i]]);                               // yıldız yüzü
    band.push([G[i], H[i], S[i]]); band.push([H[i], G[(i + 1) % n], S[i]]); // kuşak yüzleri
  }
  const r = { T, kite, star, band }; _GEOLAR[n] = r; return r;
}
export function GercekPirlanta({ c = "#7ec8ff", cerceve = true, n = 8 }) {
  const uid = useRef("gp" + Math.random().toString(36).slice(2, 7)).current;
  const { T, kite, star, band } = geoYap(n);
  return (
    <svg className="gercek-pir" viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id={uid + "g"} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3c4" /><stop offset="30%" stopColor="#e8c254" /><stop offset="62%" stopColor="#9c7414" /><stop offset="100%" stopColor="#ffe9a8" />
        </linearGradient>
      </defs>
      {/* DOLGUN ALTIN YÜZÜK (sadece marka/nav) — kalın bant, iç/dış kenarı belirgin: ince çember DEĞİL */}
      {cerceve && (<>
        <circle cx="50" cy="50" r="42" fill="none" stroke={`url(#${uid}g)`} strokeWidth="6" />
        <circle cx="50" cy="50" r="45" fill="none" stroke="#5a3f08" strokeWidth="1.1" />
        <circle cx="50" cy="50" r="39" fill="none" stroke="#5a3f08" strokeWidth="1.1" />
        <circle cx="50" cy="50" r="42" fill="none" stroke="#fff4cf" strokeWidth=".8" opacity=".6" />
      </>)}
      {/* TAŞ gövdesi (renk) */}
      <circle cx="50" cy="50" r="37" fill={c} />
      {/* FASETLER — tonlar dağıtık (ortada beyaz leke YOK) */}
      <g>
        {band.map((p, i) => <polygon key={"b" + i} points={_fmt(p)} fill={i % 2 ? "#000" : "#fff"} fillOpacity={i % 2 ? ".16" : ".10"} />)}
        {kite.map((p, i) => <polygon key={"k" + i} points={_fmt(p)} fill={i % 2 ? "#fff" : "#000"} fillOpacity={i % 2 ? ".18" : ".13"} />)}
        {star.map((p, i) => <polygon key={"st" + i} points={_fmt(p)} fill="#000" fillOpacity=".11" />)}
        <polygon points={_fmt(T)} fill="#fff" fillOpacity=".10" />
      </g>
      {/* TEK köşe parıltısı — üst-sol fasette (merkezde değil) */}
      <polygon points={_fmt(kite[kite.length - 1])} fill="#fff" fillOpacity=".30" />
      {/* BELİRGİN faset çizgileri — 8 taç yüzü + masa + kuşak kenarı net görünür */}
      <g fill="none" strokeLinejoin="round">
        {kite.map((p, i) => <polygon key={"kc" + i} points={_fmt(p)} stroke="rgba(255,255,255,.42)" strokeWidth=".55" />)}
        <polygon points={_fmt(T)} stroke="rgba(255,255,255,.55)" strokeWidth=".6" />
        <circle cx="50" cy="50" r="37" stroke="rgba(0,0,0,.3)" strokeWidth=".6" />
      </g>
      {/* 6 TIRNAK (sadece çerçeveli) — banttan taşa biner, taşı yüzükte sabitler */}
      {cerceve && [30, 90, 150, 210, 270, 330].map((a, i) => {
        const o = _PR(43, a), inn = _PR(35, a);
        return (
          <g key={"pr" + i}>
            <line x1={o[0]} y1={o[1]} x2={inn[0]} y2={inn[1]} stroke="#caa12a" strokeWidth="3" strokeLinecap="round" />
            <circle cx={inn[0]} cy={inn[1]} r="1.9" fill="#ffe9a8" stroke="#7a5a0e" strokeWidth=".5" />
          </g>
        );
      })}
    </svg>
  );
}

// ALTI KÖŞE (hexagon) ELMAS — KARTLAR/diğer yerler için. Ana sayfanın yuvarlak taşından FARKLI (kullanıcı kuralı):
// 6 köşeli silüet + basamak fasetleri + ince altın çerçeve. Tek tasarım, renk parametreli.
export function Elmas6Kose({ c = "#e0202c" }) {
  const uid = useRef("e6" + Math.random().toString(36).slice(2, 7)).current;
  const v = [], tb = [], fr = [];
  for (let i = 0; i < 6; i++) { v.push(_PR(39, i * 60)); tb.push(_PR(15, i * 60)); fr.push(_PR(46, i * 60)); }
  const fac = [];
  for (let i = 0; i < 6; i++) fac.push([v[i], v[(i + 1) % 6], tb[(i + 1) % 6], tb[i]]);
  return (
    <svg className="gercek-pir" viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id={uid + "g"} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3c4" /><stop offset="35%" stopColor="#e8c254" /><stop offset="70%" stopColor="#9c7414" /><stop offset="100%" stopColor="#ffe9a8" />
        </linearGradient>
      </defs>
      {/* altın altıgen çerçeve (ince yüzük) */}
      <polygon points={_fmt(fr)} fill={`url(#${uid}g)`} stroke="#6a4d0a" strokeWidth="1.1" strokeLinejoin="round" />
      {/* taş gövdesi — ALTI KÖŞE */}
      <polygon points={_fmt(v)} fill={c} />
      {/* kenar fasetleri (ton dağıtık — ortada leke yok) */}
      {fac.map((p, i) => <polygon key={"f" + i} points={_fmt(p)} fill={i % 2 ? "#000" : "#fff"} fillOpacity={i % 2 ? ".16" : ".12"} />)}
      <polygon points={_fmt(tb)} fill="#fff" fillOpacity=".12" />
      {/* tek köşe parıltısı (üst) */}
      <polygon points={_fmt(fac[4])} fill="#fff" fillOpacity=".26" />
      {/* BELİRGİN çizgiler — dış altıgen + masa + ışınlar */}
      <g fill="none" strokeLinejoin="round">
        <polygon points={_fmt(v)} stroke="rgba(255,255,255,.5)" strokeWidth=".7" />
        <polygon points={_fmt(tb)} stroke="rgba(255,255,255,.5)" strokeWidth=".6" />
        {v.map((p, i) => <line key={"s" + i} x1={p[0]} y1={p[1]} x2={tb[i][0]} y2={tb[i][1]} stroke="rgba(0,0,0,.28)" strokeWidth=".5" />)}
      </g>
      <polygon points={_fmt(v)} fill="none" stroke="#6a4d0a" strokeWidth=".6" strokeLinejoin="round" />
      {/* TIRNAKLAR — çerçeveden elmasın ÜZERİNE biner (kavrar), 6 köşede */}
      {[0, 60, 120, 180, 240, 300].map((a, i) => {
        const o = _PR(44, a), inn = _PR(29, a);
        return (
          <g key={"pr" + i}>
            <line x1={o[0]} y1={o[1]} x2={inn[0]} y2={inn[1]} stroke="#caa12a" strokeWidth="3" strokeLinecap="round" />
            <circle cx={inn[0]} cy={inn[1]} r="2" fill="#ffe9a8" stroke="#7a5a0e" strokeWidth=".5" />
          </g>
        );
      })}
    </svg>
  );
}
// KÜÇÜK 4-KESİM PIRLANTA — isim yanı/rozet için (düz ◆ YASAK, ANAYASA): gerçek fasetli minik taş.
// inline, font boyutuyla ölçeklenir (width:1em). Renk parametreli (doğrulama rozeti mavi).
export function Elmas4({ c = "#7ec8ff" }) {
  // ROZET/İSİM YANI TAŞI = ANA SAYFADAKİ gerçek fasetli pırlanta (küçük). Kullanıcı: ana sayfadaki
  // güzel oldu, her yerde ONU kullan; düz ◆/baklava şekli YASAK (ANAYASA). Küçükte çerçevesiz (temiz).
  return <span className="elmas4"><GercekPirlanta c={c} cerceve={false} /></span>;
}
// ÇERÇEVE TAŞLARI — GERÇEK pırlanta (GercekPirlanta), renk renk, yan yana (ANAYASA: düz/basit elmas YASAK, gerçek taş).
// Renkli palet (kenarlarda siyah YOK); siyah SADECE üst/alt şeritte, AZ (her ~9'da bir)
// Çerçeve taşları: ALTIN şeritte görünmediği için altın YOK; ORTA taş SİYAH (altın üstünde belirgin);
// renkler merkezden simetrik dağılır (sağ-sol ayna), her renk değişik.
const CERCEVE_PAL = ["#2f7fd6", "#e0202c", "#1ea64f", "#9b4fd6", "#1fc2c2", "#ff7ab0"];
function CerceveTas({ n }) {
  const a = [];
  const orta = Math.floor(n / 2);
  for (let i = 0; i < n; i++) {
    const d = Math.abs(i - orta); // merkeze uzaklık → ayna simetrisi
    const c = (n % 2 === 1 && i === orta) ? "#1a1a1a" : CERCEVE_PAL[(d - 1 + CERCEVE_PAL.length) % CERCEVE_PAL.length];
    a.push(<span className="hdr-tas-bir" key={i}><GercekPirlanta c={c} cerceve={false} /></span>);
  }
  return a;
}
// Tema adı → GERÇEK pırlanta rengi (referans 12 renkten). Marka amblemi + her yer aynı gerçek taşı kullanır.
const TEMA_HEX = { mavi: "#2f6fd6", kirmizi: "#e0202c", altin: "#f2a900", yesil: "#1ea64f", mor: "#9b4fd6", turkuaz: "#1fc2c2", zeytin: "#d6e060", beyaz: "#dfeaff" };
// GLOXORG marka amblemi (yazının iki yanı) — artık GERÇEK fasetli pırlanta + altın yüzük çerçeve (ANAYASA 6.15).
// .ana-amblem sarmalı + konum/parıltı animasyonları korunur; renk sayfanın temasına göre değişir.
function AmblemMavi({ konum = "sag", renk = "mavi" }) {
  return (
    <span className={"ana-amblem " + konum} aria-hidden="true">
      <GercekPirlanta c={TEMA_HEX[renk] || TEMA_HEX.mavi} />
    </span>
  );
}
// Marka pırlantasının yanındaki IŞILDAYAN DESENLİ ÇİZGİ (kullanıcı: elmas değil, ÇİZGİ desenli ışıldayan).
// Sağ ve sol tarafta; pırlantaya/isme dokunmaz (akış-dışı, absolute). İnce altın hat + desen düğümleri.
function MarkaCizgi({ konum = "sag" }) {
  return (
    <span className={"marka-cizgi " + konum} aria-hidden="true">
      <svg viewBox="0 0 46 12" fill="none" stroke="#e8c254" strokeLinecap="round">
        <line x1="2" y1="6" x2="44" y2="6" strokeWidth="1" opacity=".85" />
        <path d="M11 6 l3.4 -3 3.4 3 -3.4 3 z" fill="#e8c254" stroke="none" />
        <path d="M23 6 l4 -3.6 4 3.6 -4 3.6 z" fill="#fff3c4" stroke="none" />
        <path d="M35 6 l3.4 -3 3.4 3 -3.4 3 z" fill="#e8c254" stroke="none" />
      </svg>
    </span>
  );
}

// Canlı 3D dünya küresi — TAMAMEN KENDİ çizimimiz (kopya/telif YOK): parlak mavi okyanus +
// dolu yeşil kıtalar (gerçek konumlar) topun yüzeyinde; tüm kıta grubu döner = TOP kendisi döner.
function DunyaKure() {
  // Kıtalar BÜYÜK ve haritanın GENELİNE yayılı (boş mavi kalmasın), her biri AYRI RENK.
  const kitalar = (
    <g stroke="rgba(10,40,20,.45)" strokeWidth="0.5" strokeLinejoin="round">
      <path d="M4,22 Q8,17 16,18 L26,18 Q31,20 29,26 L25,30 Q23,36 18,42 Q15,44 15,37 Q10,34 8,29 Q4,28 4,22 Z" fill="#4cc96a" />
      <path d="M20,44 Q27,42 32,47 Q34,53 30,57 Q31,64 26,72 Q22,78 21,69 Q19,60 20,53 Q18,48 20,44 Z" fill="#f0a93c" />
      <path d="M39,22 Q45,20 50,23 Q52,27 47,29 Q41,29 39,25 Q38,23 39,22 Z" fill="#ff8ab0" />
      <path d="M42,31 Q43,28 48,28 L57,30 Q60,35 56,41 Q54,50 49,60 Q46,65 45,55 Q42,46 41,39 Q39,34 42,31 Z" fill="#ffd84d" />
      <path d="M53,21 Q60,15 74,16 Q88,17 92,24 Q90,30 82,31 L72,30 Q66,34 63,40 Q60,34 57,32 Q52,31 52,26 Q51,23 53,21 Z" fill="#5fd0c0" />
      <path d="M80,55 Q90,53 94,61 Q92,69 83,67 Q76,62 80,55 Z" fill="#c98bff" />
    </g>
  );
  return (
    <span className="ana-dunya" aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <defs>
          <clipPath id="dkClip"><circle cx="50" cy="50" r="49" /></clipPath>
          <radialGradient id="dkOky" cx="42%" cy="40%" r="68%">
            <stop offset="0" stopColor="#6cc2ff" /><stop offset="50%" stopColor="#2f9fe6" /><stop offset="100%" stopColor="#1f72bf" />
          </radialGradient>
          <radialGradient id="dkKenar" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="rgba(0,28,65,0)" /><stop offset="80%" stopColor="rgba(0,28,65,0)" /><stop offset="100%" stopColor="rgba(0,26,60,.38)" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="49" fill="url(#dkOky)" />
        <g clipPath="url(#dkClip)">
          <g>
            {kitalar}
            <g transform="translate(100,0)">{kitalar}</g>
            <animateTransform attributeName="transform" attributeType="XML" type="translate" from="0 0" to="-100 0" dur="26s" repeatCount="indefinite" />
          </g>
        </g>
        <circle cx="50" cy="50" r="49" fill="url(#dkKenar)" />
        <circle cx="50" cy="50" r="48.5" fill="none" stroke="rgba(170,225,255,.5)" strokeWidth="1.2" />
      </svg>
    </span>
  );
}

export default function Anasayfa({ pro = false }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  // SEÇİLEN dil (bölge eki olmadan): "tr-TR" -> "tr". Çeviri/AI hep DOĞRU dile gitsin
  // (eskiden i18n.language ham geliyordu, "tr-TR" eşleşmeyip İngilizce/Türkçe'ye düşüyordu — çeviri yanlış dile gidiyordu).
  const dil = (i18n.resolvedLanguage || i18n.language || "tr").split("-")[0];
  // ŞEHİR/FOTO: her 6 SAATTE değişir (foto sabit kalmaz, hep güncel — kullanıcı isteği)
  const gunSayisi = Math.floor(Date.now() / (6 * 3600 * 1000));
  const buguninSehri = DUNYA_SEHIRLERI[gunSayisi % DUNYA_SEHIRLERI.length];
  const sehirFotoUrl = `https://picsum.photos/seed/${buguninSehri.tag}${gunSayisi}/1080/1920`;
  // NOT: sehirGaleriUrl (galeri foto no'ya bağlı) AŞAĞIDA, sehirFotoNo state tanımından SONRA hesaplanır
  // (yukarıda hesaplanırsa "sehirFotoNo before initialization" TDZ hatası → açılışta siyah ekran).
  const [menuAcik, setMenuAcik] = useState(false);
  const [profilAcik, setProfilAcik] = useState(false); // profil fotoğrafı penceresi (menüden AYRI)
  // AYARLAR penceresi (X gibi tam ayarlar) — Profilim/menüden açılır
  const [ayarlarAcik, setAyarlarAcik] = useState(false);
  const [hakkindaAcik, setHakkindaAcik] = useState(false); // GLOXORG Hakkında + 7 Eksen Eylem Planı sayfası
  const [davetAcik, setDavetAcik] = useState(false);       // "Davet Et / Paylaş" — kopyalanır/gönderilir link
  const [davetKopya, setDavetKopya] = useState(false);     // link kopyalandı geri bildirimi
  const [kurulabilir, setKurulabilir] = useState(typeof window !== "undefined" && !!window.__groxKurPrompt); // PWA "Uygulamayı yükle" hazır mı
  const [kurIpucu, setKurIpucu] = useState("");            // yerel yükleme sinyali yoksa gösterilen elle yükleme ipucu
  const [ayarBolum, setAyarBolum] = useState(null); // açık akordeon bölümü
  const [ekTelefon, setEkTelefon] = useState("");
  const [ekTelefon2, setEkTelefon2] = useState("");   // İKİNCİ telefon numarası (isteğe bağlı)
  const [ek2Eposta, setEk2Eposta] = useState("");
  // AD / SOYAD (Ayarlar) — ilk girişte yazılan ad; buradan düzeltilir, Gloxoo yeni adı bilir
  const [ayarIsim, setAyarIsim] = useState("");
  const [ayarSoyisim, setAyarSoyisim] = useState("");
  // HABER / İLGİ KONUMLARI (Ayarlar — adresten AYRI): Gloxoo bu yerlerin haber/spor/gündemini bilir
  const [haberYerler, setHaberYerler] = useState([]); // [{ulke, sehir, ilce}] — en çok 3
  // CİNSİYET + DOĞUM TARİHİ (Ayarlar) — Gloxoo hitabı (Bey/Hanım) ve yaşı buradan bilir
  const [cinsiyet, setCinsiyet] = useState(""); // "bayan" | "erkek" | "belirtme" | ""
  const [dogumGun, setDogumGun] = useState(""); const [dogumAy, setDogumAy] = useState(""); const [dogumYil, setDogumYil] = useState("");
  const [kurumTur, setKurumTur] = useState("");
  const [kurumAd, setKurumAd] = useState("");
  const [ayarMsg, setAyarMsg] = useState("");
  const [meslekAra, setMeslekAra] = useState("");     // meslek arama filtresi (çok meslek var)
  const [sektorListe, setSektorListe] = useState("");  // açık kategori listesi: meslek|fabrika|tedarik|isci|devlet
  const [sektorEkle, setSektorEkle] = useState("");    // listede olmayan, kullanıcı kendi yazar
  const [telKodAcik, setTelKodAcik] = useState(false);
  const [telKodAra, setTelKodAra] = useState("");
  const [telKodu, setTelKodu] = useState("+90");
  const [aciklama, setAciklama] = useState(""); // açıklama (?) ikonu → ne yapılacağını anlatan baloncuk (ANAYASA: her yerde bilgilendirme)
  const [telHaritaAcik, setTelHaritaAcik] = useState(false); // TAM EKRAN telefon kodu HARİTASI (ülkeye dokun → kod)
  const [telHaritaSec, setTelHaritaSec] = useState(null);    // haritada seçili { iso, kod, ad }
  const telHaritaRef = useRef(null);
  const [konumLat, setKonumLat] = useState(null);
  const [konumLon, setKonumLon] = useState(null);
  const [konumAdres, setKonumAdres] = useState("");
  // GLOXOO TAM KONUM YETKİSİ: kullanıcı AYARLAR'dan aç/kapat. AÇIK iken sürekli (watchPosition) yüksek doğruluklu GPS
  // ile şehir/ilçe + ev/bina + içinde bulunduğu mekân (mağaza/otel/kuaför/banka) TAKİP edilir; Gloxoo her an tam yeri bilir.
  const [anlikYer, setAnlikYer] = useState(null);   // { adres, yer, tur, lat, lon }
  const anlikYerRef = useRef(null);                 // async AI isteğinde okunur
  // AÇILIŞTA KONUM SORMASIN (kullanıcı KESİN istedi): "Gloxoo tam konum" her açılışta KAPALI başlar → site yüklenince GPS/konum izni İSTENMEZ.
  // Konum SADECE kullanıcı paylaşım ekranındaki "📍 Konum ekle" düğmesine bastığında (ya da bu ayarı elle açınca) alınır. Kalıcı değil (her açılış temiz).
  const [tamKonumIzin, setTamKonumIzin] = useState(false);
  const tamKonumIzinRef = useRef(tamKonumIzin);
  useEffect(() => { tamKonumIzinRef.current = tamKonumIzin; }, [tamKonumIzin]);
  const konumTakipRef = useRef({ id: null, sonMs: 0, sonLat: null, sonLon: null }); // watch id + son çözümleme (throttle)
  const [bulunan, setBulunan] = useState(null); // haritaya dokununca çözülen adres ÖNİZLEMESİ (şeritlere otomatik yazılmaz)
  const [haritaMsg, setHaritaMsg] = useState(""); // harita üstünde düğme onay mesajı (kopyalandı/yazıldı)
  const [haritaBilgi, setHaritaBilgi] = useState(false); // konum haritası (?) açıklaması
  const [sesliOkunan, setSesliOkunan] = useState(false); // açıklama sesli okunuyor mu
  // Yazılabilir adres alanları (eski profesyonel karttaki gibi) — haritadan otomatik dolar, elle düzeltilir
  const [srtUlke, setSrtUlke] = useState("");
  const [srtSehir, setSrtSehir] = useState("");
  const [srtIlce, setSrtIlce] = useState("");
  const [srtSokak, setSrtSokak] = useState(""); // mahalle + sokak + bina no (ilçeden AYRI alan)
  const [srtPosta, setSrtPosta] = useState("");
  const [ayarHaritaAcik, setAyarHaritaAcik] = useState(false); // TAM EKRAN konum haritası (blur'lu ata DIŞINDA)
  const [uyelikKartAcik, setUyelikKartAcik] = useState(false); // GLOXORG pırlanta üyelik kartları (kırmızı/altın) tam ekran
  const ayarHaritaRef = useRef(null);
  const ayarPinRef = useRef(null);
  const [bildirimAcik, setBildirimAcik] = useState(false); // sol üst zil — bildirim penceresi
  const [bildirimListe, setBildirimListe] = useState([]);  // gerçek bildirimler (canlı)
  const [bildirimIzin, setBildirimIzin] = useState(() => { try { return (typeof Notification !== "undefined") ? Notification.permission : "default"; } catch (e) { return "default"; } });
  const gorulenBildirimRef = useRef(null);                 // ilk yüklemede sessiz, sonra yeni gelenler bildirilir
  // Arama şeridi KAPALI durur; ortadaki ufak düğmeye basınca açılır (yer kaplamasın)
  const [araAcik, setAraAcik] = useState(false);
  const [araQ, setAraQ] = useState("");
  const araQRef = useRef("");
  useEffect(() => { araQRef.current = araQ; }, [araQ]);
  // GERÇEK ARAMA: açılınca kayıtlı profesyoneller bir kez okunur, yazdıkça yerel süzülür
  const [araHavuz, setAraHavuz] = useState(null); // null=henüz okunmadı, []=boş
  const [araYukleniyor, setAraYukleniyor] = useState(false);
  const [araSecili, setAraSecili] = useState(null); // sonuçtan seçilen profesyonelin DETAY penceresi
  // MESAJLAŞMA
  const [mesajYazi, setMesajYazi] = useState("");      // detay penceresindeki mesaj kutusu
  const [mesajDurum, setMesajDurum] = useState("");    // "gonderiliyor" | "ok" | "hata"
  const [mesajAcik, setMesajAcik] = useState(false);   // MESAJ MERKEZİ penceresi (tüm sohbetler — WhatsApp ana ekranı gibi)
  const [mesajlar, setMesajlar] = useState(null);      // null=okunmadı, []=boş (eski gelen kutusu — korunur)
  // WHATSAPP GİBİ SOHBET: tüm mesajlarım CANLI dinlenir; karşı kişiye göre gruplanıp merkez/sohbet türetilir
  const [mesajlarimTum, setMesajlarimTum] = useState([]); // benim TÜM mesajlarım (gelen+giden, canlı)
  const [sohbetKisi, setSohbetKisi] = useState(null);  // AÇIK sohbetin karşı tarafı {uid, ad, foto} | null
  const [sohbetYazi, setSohbetYazi] = useState("");    // sohbet ekranındaki yazma kutusu
  const [sohbetGonderiliyor, setSohbetGonderiliyor] = useState(false); // foto/mesaj gönderiliyor mu
  const [bekleyenMedyalar, setBekleyenMedyalar] = useState([]); // seçilip GÖNDERİLMEYİ bekleyen medyalar [{tip,url,ad?}] — çoklu foto/video, yazıyla BİRLİKTE gider (max 6)
  const [tepkiMesaj, setTepkiMesaj] = useState(null);  // uzun basılan mesajın id'si → emoji seçici açık
  const [tepkiYer, setTepkiYer] = useState(null);      // tepki seçicinin ekrandaki yeri {x,y,alt} → BASTIĞIN yerin üstünde çıkar (köşeye kaçmaz)
  const [duzenlenenMesaj, setDuzenlenenMesaj] = useState(null); // düzenlenen mesaj {id, eskiMetin} → yazma kutusu düzenleme modunda
  const tepkiBasRef = useRef(null);                    // uzun-basma zamanlayıcısı
  const GLOME_TEPKI = ["❤️", "👍", "😂", "😮", "😢", "🙏", "🔥", "👏"]; // bize özel 8 tepki (WhatsApp/Messenger gibi)
  const mesajSonRef = useRef(null);                    // sohbette en alta kaydırma çıpası
  const [sohbetMedyaAcik, setSohbetMedyaAcik] = useState(false); // sohbette medya menüsü (foto/video/dosya/canlı) açık mı
  const sohbetInputRef = useRef(null);                 // yazma kutusu (otomatik büyür)
  const sohbetFotoInputRef = useRef(null);             // foto seç (galeri)
  const sohbetVideoInputRef = useRef(null);            // video seç (galeri)
  const sohbetDosyaInputRef = useRef(null);            // dosya seç
  const sohbetCanliFotoRef = useRef(null);             // canlı foto çek (kamera)
  const sohbetCanliVideoRef = useRef(null);            // canlı video çek (kamera)
  const [mmAra, setMmAra] = useState("");              // Mesaj Merkezi: kişi ara / yeni sohbet başlat
  const [mmKisiler, setMmKisiler] = useState([]);      // kişi bulma + foto için kullanıcı listesi (cache)
  // İNTERNET ARAMASI (WebRTC)
  const [aramaDurum, setAramaDurum] = useState("");    // "" | "ariyor" (ben aradım, bekliyor) | "geliyor" (bana çağrı) | "konusuyor"
  const [aktifArama, setAktifArama] = useState(null);  // { id, karsiAd, karsiFoto, tip } — açık arama
  const [gelenArama, setGelenArama] = useState(null);  // { id, arayanAd, arayanFoto, tip, offer } — bana gelen çağrı
  const [mikKapali, setMikKapali] = useState(false);   // mikrofon sessiz mi
  const [kamKapali, setKamKapali] = useState(false);   // kamera kapalı mı
  const [onKamera, setOnKamera] = useState(true);      // true=ön kamera (yüz), false=arka kamera
  const [videoBuyuk, setVideoBuyuk] = useState("uzak"); // görüntülü aramada BÜYÜK ekranda hangisi: "uzak" (karşı) | "yerel" (ben)
  const [kucukYer, setKucukYer] = useState(null);      // küçük videonun taşınmış konumu {x,y} (null=varsayılan köşe)
  const kucukSurRef = useRef({ on: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const pcRef = useRef(null);                          // RTCPeerConnection
  const yerelStreamRef = useRef(null);                 // kendi kamera/mikrofon akışım
  const yerelVideoRef = useRef(null);                  // kendi video elementim (küçük)
  const uzakVideoRef = useRef(null);                   // karşının video elementi (büyük)
  const uzakSesRef = useRef(null);                     // karşının SESİ (sesli aramada — ses buradan çalar)
  const uzakStreamRef = useRef(null);                  // karşıdan gelen medya akışı (ses+görüntü)
  const aramaAbonelikRef = useRef([]);                 // arama dinleyicileri (temizlemek için)
  const aramaDurumRef = useRef(""); useEffect(() => { aramaDurumRef.current = aramaDurum; }, [aramaDurum]);
  const aktifAramaRef = useRef(null); useEffect(() => { aktifAramaRef.current = aktifArama; }, [aktifArama]);
  const gelenAramaRef = useRef(null); useEffect(() => { gelenAramaRef.current = gelenArama; }, [gelenArama]);
  const sohbetKisiRef = useRef(null); useEffect(() => { sohbetKisiRef.current = sohbetKisi; }, [sohbetKisi]);
  const mesajAcikRef2 = useRef(false); useEffect(() => { mesajAcikRef2.current = mesajAcik; }, [mesajAcik]);
  // GERÇEK AKIŞ (gönderiler)
  const [gercekAkis, setGercekAkis] = useState(() => {  // Firestore'dan gelen gönderiler — açılışta ÖNBELLEKTEN anında göster, arkada tazele
    try { return JSON.parse(localStorage.getItem("gw_feedCache") || "[]"); } catch (e) { return []; }
  });
  // BEĞENİ / KAYDET (kullanıcı başına, localStorage) + YORUM penceresi
  const [begeniSet, setBegeniSet] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem("groxBegeni") || "[]")); } catch (e) { return new Set(); } });
  const [begeniTepki, setBegeniTepki] = useState(() => { try { return JSON.parse(localStorage.getItem("groxTepki") || "{}"); } catch (e) { return {}; } }); // {postId: tepkiKey}
  const [tepkiAcik, setTepkiAcik] = useState(null); // tepki çubuğu açık gönderi id'si
  // MESAJ YANI TEPKİ SİMGESİ — kullanıcı seçer (🙂 yerine istediği) ya da "yok" ile GİZLER. Cihazda saklanır.
  const [tepkiSimge, setTepkiSimge] = useState(() => { try { return localStorage.getItem("groxTepkiSimge") || "🙂"; } catch (e) { return "🙂"; } });
  const [tepkiSimgeAcik, setTepkiSimgeAcik] = useState(false); // GLOME üstündeki simge seçici açık mı
  const tepkiSimgeSec = (s) => { setTepkiSimge(s); try { localStorage.setItem("groxTepkiSimge", s); } catch (e) {} setTepkiSimgeAcik(false); };
  // TEŞEKKÜR — seni beğenen/tepki veren kişiye "teşekkür et" (bildirimden). Kime teşekkür ettiğimizi hatırla (tekrar etme).
  const [tesekkurEdilen, setTesekkurEdilen] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem("groxTesekkur") || "[]")); } catch (e) { return new Set(); } });
  // ANKET — composer'da anket oluşturma + feed'de oy sayımları
  const [anketAcik, setAnketAcik] = useState(false);            // composer: anket ekleme açık mı
  const [anketSecenekler, setAnketSecenekler] = useState(["", ""]); // composer: anket şıkları
  const [anketOylar, setAnketOylar] = useState({});             // {postId: {sayim:{i:n}, toplam, benim}}
  const anketYukRef = useRef(new Set());                        // aynı anketin oylarını iki kez yükleme
  // REELS — tam ekran, yukarı-aşağı kayan kısa video akışı (TikTok/Instagram Reels gibi)
  const [reelsAcik, setReelsAcik] = useState(false);            // reels tam ekran açık mı
  const [reelSesAcik, setReelSesAcik] = useState(true);         // reels sesi AÇIK başlar (kullanıcı istedi); tarayıcı engellerse sessize düşer, kullanıcı alttaki düğmeyle açar
  const [reelAktif, setReelAktif] = useState(0);                // o an ekranda olan reel index
  const reelsAcikRef = useRef(reelsAcik); useEffect(() => { reelsAcikRef.current = reelsAcik; }, [reelsAcik]);
  const reelSarRef = useRef(null);                              // reels kaydırma kabı
  const [kaydetSet, setKaydetSet] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem("groxKaydet") || "[]")); } catch (e) { return new Set(); } });
  const [yorumAcik, setYorumAcik] = useState(null);    // yorum penceresi açık gönderi
  const [yorumlar, setYorumlar] = useState(null);      // null=yükleniyor
  const [yorumYazi, setYorumYazi] = useState("");
  const [yorumDurum, setYorumDurum] = useState("");
  const [takipSet, setTakipSet] = useState(new Set());  // takip ettiğim uid'ler
  const [takipBalon, setTakipBalon] = useState(null);   // takip düğmesi yanında kısa etiket (uid; 1.6sn sonra kaybolur)
  const takipBalonZmnRef = useRef(null);
  const [feedFiltre, setFeedFiltre] = useState("ozel"); // "ozel" (algoritma) | "hepsi" (zaman) | "takip" — akış filtresi
  // AKIŞ SAYFALAMA (ölçeklenebilirlik): tümünü birden yükleme — ilk 6, aşağı kaydırdıkça +6 (yüzbinlerce gönderi olsa da telefon donmaz)
  const [feedGoster, setFeedGoster] = useState(6);
  const feedSonRef = useRef(null); // "daha yükle" nöbetçisi (görününce artır)
  // ---- HİKÂYELER (Stories) ----
  const [hikayeGruplar, setHikayeGruplar] = useState([]); // [{uid,ad,foto,amblem,ogeler:[...],yeni:bool}]
  const [hikayeAcik, setHikayeAcik] = useState(null);     // görüntüleyici: {gi:grupIndex, oi:ögeIndex}
  const [hikayeYuk, setHikayeYuk] = useState(false);      // hikaye yükleniyor mu (oluşturma)
  const [hikayeIlerle, setHikayeIlerle] = useState(0);    // 0..100 aktif hikayenin ilerleme yüzdesi
  const [hikayeDurdu, setHikayeDurdu] = useState(false);  // parmakla basılı tutunca DURAKLA
  const hikayeInputRef = useRef(null);                    // hikaye foto/video seçici
  const hikayeGorulenRef = useRef(null);                  // localStorage görülen id kümesi
  const hikDuraklaRef = useRef(false);                    // ilerleme döngüsü duraklatıldı mı
  const hikVidRef = useRef(null);                         // görüntüleyicideki video (duraklat/oynat)
  const hikSesRef = useRef(null);                         // görüntüleyicideki müzik (duraklat/oynat)
  const hikBasRef = useRef({ x: 0, y: 0 }); // dokunma başlangıç noktası (dokun/kaydır ayrımı)
  // ---- HİKÂYE DÜZENLEYİCİ (paylaşmadan önce: yazı + Gloxoo AI) ----
  const [hikTaslak, setHikTaslak] = useState(null); // {tip,url(önizleme),file,poster} — seçilen medya (düzenleniyor)
  const [hikYazilar, setHikYazilar] = useState([]);  // [{id, metin, xr(0..1), yr(0..1), renk}] — istediğin yere sürüklenen birden çok yazı
  const [hikSeciliYazi, setHikSeciliYazi] = useState(null); // seçili yazının id'si (renk/sil bunun için)
  const [hikYaziRenk, setHikYaziRenk] = useState("#ffd700"); // yeni/seçili yazının rengi (altın varsayılan)
  const [hikAiYuk, setHikAiYuk] = useState(false);   // Gloxoo öneri yüklüyor mu
  const [hikAiOneriler, setHikAiOneriler] = useState([]); // Gloxoo'nun önerdiği üst yazılar
  const [hikAiIstek, setHikAiIstek] = useState("");  // Gloxoo'ya "ne yazsın" (kullanıcı yazar/konuşur)
  const [hikMikDinliyor, setHikMikDinliyor] = useState(false); // sesle söyleme aktif mi
  const hikTanimaRef = useRef(null);                 // konuşma tanıma (SpeechRecognition)
  const [hikPaylasYuk, setHikPaylasYuk] = useState(false); // hikâye yükleniyor mu
  const [hikPaylasYuzde, setHikPaylasYuzde] = useState(0);  // video yükleme yüzdesi (0..100)
  const [hikKonum, setHikKonum] = useState(null);           // hikâyenin CANLI konumu {tam,sehir,ulke,yer}
  const [hikKonumDurum, setHikKonumDurum] = useState("");   // "" | "aliniyor" | "hata"
  const hikCanliRef = useRef(false);                        // son seçim CANLI ÇEK mi (konum otomatik alınsın)
  const [hikMenuAcik, setHikMenuAcik] = useState(false);    // görüntüleyicide ⋯ menü açık mı
  const [hikBildiri, setHikBildiri] = useState("");         // görüntüleyici içi küçük bildirim (toast)
  const [hikMesajYazi, setHikMesajYazi] = useState("");     // hikâye görüntüleyicide "mesaj gönder" kutusu
  const hikGizliRef = useRef(null);                         // "görme" denen kişilerin uid kümesi (localStorage)
  const [hikSecimAcik, setHikSecimAcik] = useState(false);  // "Hikâye Oluştur" seçenek ekranı (Foto/Video/Yazı)
  const hikMenuAcikRef = useRef(false);
  const hikSecimAcikRef = useRef(false);
  const hikVideoInputRef = useRef(null);                    // SADECE video seçici
  const hikFotoInputRef = useRef(null);                     // SADECE fotoğraf seçici
  const hikCanliInputRef = useRef(null);                    // CANLI ÇEK — kamera (foto)
  const hikCanliVidInputRef = useRef(null);                 // CANLI ÇEK — kamera (video)
  const hikSesInputRef = useRef(null);                      // MÜZİK/SES seçici
  const [hikSes, setHikSes] = useState(null);               // {file, ad, url(önizleme)} — hikâyeye eklenen müzik
  const hikTaslakRef = useRef(null);                 // Android geri tuşu için
  const hikOnizVidRef = useRef(null);                // düzenleyicideki önizleme videosu (AI için CANLI kare)
  const hikMedyaRef = useRef(null);                  // medya kutusu (yazı sürüklerken oran hesabı)
  const hikSurukRef = useRef(null);                  // sürüklenen yazı bilgisi
  const [kalpPatla, setKalpPatla] = useState(null);    // beğeni animasyonu için (o an patlayan gönderi id)
  const [begeniListeAcik, setBegeniListeAcik] = useState(null); // "kim beğendi" penceresi açık gönderi
  const [begeniListe, setBegeniListe] = useState(null);         // beğenenler listesi (null=yükleniyor)
  const begeniBasRef = useRef(null);     // kalbe UZUN basma zamanlayıcısı
  const uzunBasildiRef = useRef(false);  // uzun basıldıysa tık'ı (beğeni toggle) bastır
  const [kucukMesaj, setKucukMesaj] = useState("");    // kısa bilgi balonu (kaydet vb.) — alta beliren toast
  // Toast OTOMATİK kapansın (ekranda takılı kalmasın) — 2.2 sn sonra temizle
  useEffect(() => { if (!kucukMesaj) return; const z = setTimeout(() => setKucukMesaj(""), 2200); return () => clearTimeout(z); }, [kucukMesaj]);
  const [dahaMenu, setDahaMenu] = useState(null);      // üç nokta menüsü açık gönderi
  const [paylasAcik, setPaylasAcik] = useState(false); // paylaşım yazma penceresi
  const [paylasAvatar, setPaylasAvatar] = useState("profil"); // gönderi avatarı: "profil" (profil fotoğrafım) | "amblem" (şirket amblemi)
  const [paylasYazi, setPaylasYazi] = useState("");
  const paylasYaziRef = useRef(null);                       // metin kutusu — "gloxorg.com ekle" imlecin olduğu yere koyabilsin
  const [gercekBegeni, setGercekBegeni] = useState({});     // postId -> GERÇEK beğenen sayısı (sayaç yanlış kalırsa: 2 kişi beğendiyse 2 gösterir, 1 değil)
  const begeniSayiBildir = (id, n) => setGercekBegeni((m) => (m[id] === n ? m : { ...m, [id]: n }));
  const [paylasBaslik, setPaylasBaslik] = useState("");     // gönderi BAŞLIĞI (profil şeridinin altında görünür)
  const [baslikAcikSet, setBaslikAcikSet] = useState(() => new Set()); // akışta başlığı "devamını oku" ile açılan gönderiler
  const [paylasDurum, setPaylasDurum] = useState("");
  const [paylasTur, setPaylasTur] = useState("");     // Fotoğraf | Video | İş İlanı | Ürün/Hizmet | Tavsiye | Duyuru
  const [paylasGorsel, setPaylasGorsel] = useState(""); // eklenen fotoğraf (dataURL) — 1. (ANA) fotoğraf
  const [paylasEkFotolar, setPaylasEkFotolar] = useState([]); // EK fotoğraflar (dataURL dizisi) — çok fotoğraflı gönderi; Storage'a yüklenir
  const [filigranEkle, setFiligranEkle] = useState(true); // GLOXORG filigranı eklensin mi (foto zaten GLOXORG'luysa kapat → çift olmasın)
  const [gitLinki, setGitLinki] = useState(false); // paylaşımın altına "gloxorg.com'a git" düğmesi eklensin mi (VARSAYILAN KAPALI — sadece kullanıcı isterse açar; kendiliğinden çıkmaz)
  const [paylasKonum, setPaylasKonum] = useState(null); // CANLI konum: { enlem, boylam, yer, sehir, ulke, tam } — "nereden paylaşıldı" (hastane/havalimanı/otogar...)
  const [konumDurum, setKonumDurum] = useState(""); // "" | "aliniyor" | "hata"
  const [onizGaleri, setOnizGaleri] = useState(null); // TAM EKRAN foto/video gezici: { liste:[{tip,src,poster}], i } — tek tek gez
  const [paylasVideo, setPaylasVideo] = useState("");   // video ÖNİZLEME linki (yerel) veya kaydedilen URL
  const [paylasVideoFile, setPaylasVideoFile] = useState(null); // yüklenecek gerçek video dosyası (Storage'a)
  const [paylasVideoPoster, setPaylasVideoPoster] = useState(""); // video KAPAK resmi (ilk kare) — "ekranı yok" sorununu çözer
  const [videoBasta, setVideoBasta] = useState(false); // VİDEO ilk mi seçildi → medyalarda video BAŞA (kullanıcı: "video ilk seçmişsem ilk planda olsun")
  const [yaziMedyaUstunde, setYaziMedyaUstunde] = useState(false); // yazı medyanın ÜZERİNDE mi (varsayılan HAYIR → ayrı şerit; kullanıcı isterse üstüne)
  const [paylasHataDetay, setPaylasHataDetay] = useState(""); // paylaşım/video hatasının GERÇEK sebebi (kullanıcıya gösterilir)
  const [paylasYukleme, setPaylasYukleme] = useState(0);        // video yükleme ilerlemesi %
  const [paylasDosya, setPaylasDosya] = useState(null);         // eklenen DOSYA (belge) {file, ad, boyut}
  const [aiIstek, setAiIstek] = useState("");                   // kullanıcı Gloxoo'ya ne yazmasını istediğini yazar
  const [aiIstekDinliyor, setAiIstekDinliyor] = useState(false); // Gloxoo'ya konuşarak söyleme (mikrofon aktif mi)
  const [aiYorumAcik, setAiYorumAcik] = useState(-1);           // beğenmedim → "neyi beğenmedin" kutusu açık öneri indeksi (-1 kapalı)
  const [aiYorum, setAiYorum] = useState("");                   // beğenmeme yorumu metni
  const [geriBildirimAcik, setGeriBildirimAcik] = useState(false); // YÖNETİCİ konsolu açık mı
  const [geriBildirimListe, setGeriBildirimListe] = useState([]);  // toplanan geri bildirimler
  const [gbYukleniyor, setGbYukleniyor] = useState(false);
  const [gbSekme, setGbSekme] = useState("geri");                 // geri | istatistik | kullanici | gonderi
  const [gbKullanicilar, setGbKullanicilar] = useState([]);
  const [gbGonderiler, setGbGonderiler] = useState([]);
  const [gbEpostaKopya, setGbEpostaKopya] = useState(""); // yöneticide kopyalanan e-postanın kullanıcı id'si (geri bildirim)
  const [begenenModal, setBegenenModal] = useState(null);         // BEĞENENLER/YORUMCULAR listesi açık post id
  const [begenenModalListe, setBegenenModalListe] = useState([]);
  const [yorumcuModalListe, setYorumcuModalListe] = useState([]);
  const [begenenModalYuk, setBegenenModalYuk] = useState(false);
  const [medyaMenu, setMedyaMenu] = useState("");               // "" | "foto" | "video" — çek/galeri mini menüsü
  const [turSecAcik, setTurSecAcik] = useState(false);          // Paylaş'a basınca çıkan "ne olarak?" seçimi
  // FOTO/VİDEO ÜZERİNE YAZI — metin + renk + boyut + konum (üst/orta/alt). Görselin üstünde katman olarak gösterilir.
  const [ustYazi, setUstYazi] = useState("");
  const [ustRenk, setUstRenk] = useState("#ffffff");
  const [ustBoyut, setUstBoyut] = useState("orta"); // kucuk | orta | buyuk
  const [ustYer, setUstYer] = useState("alt");      // ust | orta | alt
  const [aiKonusuyor, setAiKonusuyor] = useState(false); // TTS çalıyor mu — maskot ağzını oynatır
  const aiKonusuyorRef = useRef(false); // Gloxoo KONUŞUYOR mu (async okunur): konuşurken mikrofon dinlemez (yarı-çift yönlü)
  const [aiDuraklat, setAiDuraklat] = useState(false); // konuşma DURAKLATILDI mı (Durdur/Devam)
  const maskotBosRef = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      let s = false; try { s = !!(window.speechSynthesis && window.speechSynthesis.speaking); } catch (e) {}
      if (s) { maskotBosRef.current = 0; aiKonusuyorRef.current = true; setAiKonusuyor((p) => (p ? p : true)); }
      else { maskotBosRef.current++; if (maskotBosRef.current >= 2) { aiKonusuyorRef.current = false; setAiKonusuyor((p) => (p ? false : p)); } } // 2 boş ölçüm (~400ms) → cümle arası boşlukta titremesin
    }, 200);
    return () => clearInterval(id);
  }, []);
  const [aiOneriler, setAiOneriler] = useState([]); // yapay zeka yazı önerileri
  const [aiYukleniyor, setAiYukleniyor] = useState(false);
  const [ceviri, setCeviri] = useState({}); // gönderi çevirisi: anahtar -> { metin, yuk, acik }
  // YAZI GERÇEKTEN KESİLDİ Mİ (12 satır taşıyor mu) — "devamını oku" SADECE kesilen yazıda çıksın (kısa/tam yazıda çıkmaz).
  const [kesik, setKesik] = useState({}); // anahtar -> true (taşıyor)
  const kesikOlc = (anahtar) => (el) => { if (!el) return; const k = el.scrollHeight > el.clientHeight + 3; setKesik((p) => (p[anahtar] === k ? p : { ...p, [anahtar]: k })); };
  const [sehirAcik, setSehirAcik] = useState(false); // günlük şehir fotoğrafı tam ekran görüntüleyici
  const [arsivAcik, setArsivAcik] = useState(false); // AYLIK ARŞİV penceresi (tüm konuşma geçmişi)
  const [arsivGun, setArsivGun] = useState(null);     // açık aylık dosya (null=liste)
  // KALICI ARŞİV: tüm konuşma geçmişi (ikisiyle de) — "yeni konuşma" görünümü temizlese bile burada KALIR, sıfırlanmaz
  const [arsivTum, setArsivTum] = useState(() => { try { return JSON.parse(localStorage.getItem("groxArsivTum") || "[]"); } catch (e) { return []; } });
  // KAYITLI KONUŞMALAR (oturumlar) — her "yeni konuşma"da eski konuşma buraya kaydedilir; üstte "Konuşmalarım" düğmesinden bulunur
  const [oturumlar, setOturumlar] = useState(() => { try { return JSON.parse(localStorage.getItem("groxOturumlar") || "[]"); } catch (e) { return []; } });
  const [oturumAcik, setOturumAcik] = useState(false); // Konuşmalarım paneli açık mı
  const [sehirFotoNo, setSehirFotoNo] = useState(0); // şehir galerisinde SONSUZ foto gezme (ileri/geri)
  // Görüntüleyici galerisi — aynı şehirden SONSUZ farklı kare (her foto no ayrı lock); state'ten SONRA hesaplanır
  const sehirGaleriUrl = `https://picsum.photos/seed/${buguninSehri.tag}${gunSayisi}-${sehirFotoNo}/1080/1920`;
  const [yardimciBaglam, setYardimciBaglam] = useState(""); // site asistanı BAĞLAM: o an hangi pencere/konu açık (asistan nerede olduğunu bilsin)
  const [sesliMod, setSesliMod] = useState(true); // AI cevapları OTOMATİK sesli okunur (kullanıcı: yazdığını da konuşsun, ne dediğini duyayım); hoparlör düğmesinden kapatılır
  const [dinliyor, setDinliyor] = useState(false);  // mikrofon o an dinliyor mu
  const [canliSohbet, setCanliSohbet] = useState(false); // DÜĞMESİZ canlı sohbet: konuş-dinle döngüsü
  const canliSohbetRef = useRef(false);
  const bosSesRef = useRef(0); // üst üste kaç kez "konuştu ama yazıya çevrilemedi" (worker/ses modeli sorunu) — üst üste olunca kullanıcıyı uyar
  const [aiDil, setAiDil] = useState(() => { try { return localStorage.getItem("gw_aiDil") || dil; } catch (e) { return dil; } }); // AI SES + yanıt dili (site dilinden AYRI seçilebilir)
  const aiDilRef = useRef(aiDil); useEffect(() => { aiDilRef.current = aiDil; try { localStorage.setItem("gw_aiDil", aiDil); } catch (e) {} }, [aiDil]);
  // SAYFA DİLİ değişince AI dili de OTOMATİK o dile geçer (kullanıcı: site Rusça ise AI da Rusça konuşsun/dinlesin). Sonra istenirse AI dili elle değiştirilebilir.
  useEffect(() => { setAiDil(dil); aiDilRef.current = dil; }, [dil]); // eslint-disable-line react-hooks/exhaustive-deps
  const [aiDilAcik, setAiDilAcik] = useState(false); // AI dil seçici açık mı
  const aiKarsiladiRef = useRef(false); // bu açılışta karşılama yapıldı mı (tekrar etmesin)
  const [yardimciFoto, setYardimciFoto] = useState(null); // asistana eklenen foto {dataURL, base64, mediaType}
  const yardimciFotoRef = useRef(null);
  // EKLE: video + dosya (PDF/metin) — fotoğrafla aynı düğmenin içinde (yardimciEk: {tur:'video'|'pdf'|'metin', dataURL?, base64?, metin?, ad})
  const [yardimciEk, setYardimciEk] = useState(null);
  const [yardimciEkMenu, setYardimciEkMenu] = useState(false);
  const yardimciVideoRef = useRef(null);
  const yardimciDosyaRef = useRef(null);
  const mediaRecorderRef = useRef(null);  // ses kaydedici (Whisper'a gönderilir)
  const sesParcaRef = useRef([]);          // kaydedilen ses parçaları
  // GÖRÜNTÜLÜ CANLI SOHBET: kamera açık → Gloxoo seni ve çevreni GÖRÜR (her konuşmada kare çekilip AI'ya eklenir), sesli konuşur
  const [kameraAcik, setKameraAcik] = useState(false);
  const kameraModRef = useRef(false);      // görüntülü mod açık mı (async okunur)
  const kameraStreamRef = useRef(null);    // kamera akışı (kapatınca durdurulur)
  const kameraVideoRef = useRef(null);     // self-view <video> elemanı (kare buradan çekilir)
  const [kameraYon, setKameraYon] = useState("user"); // "user"=ön kamera (selfie), "environment"=arka kamera (etraf)
  const [kameraYer, setKameraYer] = useState(null);   // self-view penceresinin sürüklenmiş konumu {x,y} (null=varsayılan sağ-alt)
  const kameraSurRef = useRef({ on: false });          // self-view sürükleme durumu
  const kameraPenRef = useRef(null);                   // self-view sarmalayıcı (sürükleme sınırı için)
  const [eksperYer, setEksperYer] = useState(null);    // EKSPERT (🐻) köşe kartının parmakla taşınmış konumu {x,y} (null=varsayılan sağ-alt)
  const eksperSurRef = useRef({ on: false, moved: false }); // ekspert sürükleme durumu
  const eksperPenRef = useRef(null);                   // ekspert köşe kartı (sürükleme sınırı için)
  const yardimciAcikOnceRef = useRef(false);           // Gloxoo panelinin önceki açık/kapalı durumu (kapanışı yakalamak için)
  const recognitionRef = useRef(null);     // CANLI DİKTE (tarayıcı SpeechRecognition) — konuştukça şeride yazar
  const dikteTabanRef = useRef("");        // dikte başlarken şeritte olan metin (üzerine eklenir, silinmez)
  const dikteBazRef = useRef("");          // dikte başlarken şeritte olan metin (üzerine eklenir)
  const dikteAcikRef = useRef(false);      // canlı dikte açık mı (onend'de yeniden başlat için)
  // DİL DEĞİŞİNCE çevirileri SIFIRLA: önceki dile (örn İngilizce) yapılan çeviri hafızada kalıp
  // yeni dilde (örn Türkçe) gönderiyi hâlâ İngilizce/eski dilde gösteriyordu. Dil değişince hepsi orijinaline döner.
  useEffect(() => { setCeviri({}); }, [dil]);
  // GLOXORG YARDIMCISI — gerçek Claude ile sohbet (sağ alt balon)
  const [yardimciAcik, setYardimciAcik] = useState(false);
  const [yardimciMesajlar, setYardimciMesajlar] = useState(() => { try { return JSON.parse(localStorage.getItem("groxSohbet") || "[]"); } catch (e) { return []; } }); // {rol:'user'|'ai', metin} — kalıcı (yenilense silinmez)
  const [yardimciYazi, setYardimciYazi] = useState("");
  const [yardimciYukleniyor, setYardimciYukleniyor] = useState(false);
  const yardimciAltRef = useRef(null);
  const yardimciAkisRef = useRef(null);
  const yardimciInputRef = useRef(null);
  // Sohbeti EN ALTA kaydır (son mesaj hep görünür; bilgisayarda da). scrollIntoView + doğrudan kapsayıcı scrollTop (flex'te garanti)
  const aiAltaKay = () => {
    setTimeout(() => {
      try { const a = yardimciAkisRef.current; if (a) a.scrollTop = a.scrollHeight + 999; } catch (e) {}
      try { yardimciAltRef.current && yardimciAltRef.current.scrollIntoView({ block: "end" }); } catch (e) {}
    }, 70);
    setTimeout(() => { try { const a = yardimciAkisRef.current; if (a) a.scrollTop = a.scrollHeight + 999; } catch (e) {} }, 320);
  };
  const [yardimciMod, setYardimciMod] = useState("sohbet"); // "sohbet" (genel) | "site" (site asistanı, komutla pencere açar)
  // Yazı şeridi YÜKSEKLİĞİ: yazı değişince (elle YA DA dikte/programatik) otomatik büyür → yazdıklarını görürsün (4-5 satır)
  // NOT: her tuşta scrollIntoView({smooth}) YAPILMAZ — o pencereyi sallıyordu/titretiyordu (kullanıcı şikâyeti). Sadece yükseklik ayarlanır; şerit zaten altta sabit, klavye --gercek-vh ile hesaba katılıyor.
  useEffect(() => {
    const el = yardimciInputRef.current; if (!el) return;
    try { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 200) + "px"; } catch (e) {}
  }, [yardimciYazi, yardimciAcik]);
  const [siteMesajlar, setSiteMesajlar] = useState(() => { try { return JSON.parse(localStorage.getItem("groxSiteSohbet") || "[]"); } catch (e) { return []; } });
  // Yardımcı balonu parmakla TAŞINIR (sabit değil) — konum hatırlanır
  const [balonYer, setBalonYer] = useState(() => { try { return JSON.parse(localStorage.getItem("groxAiBalon") || "null"); } catch (e) { return null; } });
  const balonRef = useRef(null);
  const balonSur = useRef({ on: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  function balonBas(e) { const r = balonRef.current.getBoundingClientRect(); balonSur.current = { on: true, moved: false, sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top }; try { balonRef.current.setPointerCapture(e.pointerId); } catch (_) {} }
  function balonGit(e) { const d = balonSur.current; if (!d.on) return; const dx = e.clientX - d.sx, dy = e.clientY - d.sy; if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true; const w = balonRef.current.offsetWidth, h = balonRef.current.offsetHeight; const x = Math.max(6, Math.min(d.ox + dx, window.innerWidth - w - 6)); const y = Math.max(6, Math.min(d.oy + dy, window.innerHeight - h - 6)); setBalonYer({ x, y }); }
  function balonBitir() { const d = balonSur.current; d.on = false; if (d.moved && balonRef.current) { const r = balonRef.current.getBoundingClientRect(); try { localStorage.setItem("groxAiBalon", JSON.stringify({ x: r.left, y: r.top })); } catch (e) {} } }
  // MASKOTA DOKUN → büyür + konuşur (her şeyi anlatır), bitince küçülür + sohbet açılır (sonra seni bekler)
  function balonTik() {
    if (balonSur.current.moved) return;
    maskotSelamKapat();
    setMaskotTur("grox"); // KÖŞE MASKOTU = HER ZAMAN GLOXOO (ayı DEĞİL — ikisi ayrı)
    // KÜÇÜLTÜLMÜŞ (mini) maskota dokun = BÜYÜT (yeniden karşılama YOK — kaldığı yerden devam). KAPATMAZ.
    if (maskotMini || canliSohbetRef.current) {
      setMaskotMini(false); setMaskotTanit(true); setYardimciMod("sohbet");
      if (!canliSohbetRef.current) { try { maskotCanliBaslat(); } catch (e) {} } // KAPALIYSA büyürken SES AÇ (istek)
      return;
    }
    // KULLANICI KENDİSİ AÇTI → Gloxoo KENDİLİĞİNDEN KONUŞMAZ; açılır ve DİNLER (kullanıcı konuşur/yazar).
    // Uzun karşılama SADECE ilk üyelikte + yeni sürümde otomatik olur (aşağıdaki effect), elle açınca DEĞİL.
    setMaskotTur("grox"); setMaskotMini(false); setMaskotTanit(true); setYardimciMod("sohbet");
    try { maskotCanliBaslat(); } catch (e) {} // dinlemeye başla (kullanıcı konuşsun) — kendi konuşmaz
  }
  // MASKOT KARŞILAMA — yeni üye ilk girişte ana sayfada maskot "hoş geldin" der (tek sefer). Kapatınca/dokununca yerine çekilir.
  const [maskotSelam, setMaskotSelam] = useState(false);
  const maskotSelamKapat = () => { setMaskotSelam(false); try { localStorage.setItem("groxMaskotSelam", "1"); } catch (e) {} };
  const [maskotTanit, setMaskotTanit] = useState(false); // maskot BÜYÜK halde konuşuyor mu
  const [maskotMini, setMaskotMini] = useState(false); // KÜÇÜLTÜLMÜŞ ama sohbet AÇIK (köşede ikon düğmelerle, kapanmadı)
  const [miniEtiket, setMiniEtiket] = useState(""); // ikon düğmeye basınca ÜSTÜNDE ne olduğu yazar (kısa süre)
  const miniEtiketZmn = useRef(null);
  const [maskotMetni, setMaskotMetni] = useState("");
  // GEZİLEN SAYFALAR — Ekspert her sayfayı yalnız İLK girişte otomatik anlatır (kalıcı: cihazda saklanır).
  const [gezilenSayfa, setGezilenSayfa] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem("gloxGezilenSayfa") || "[]")); } catch (e) { return new Set(); } });
  const gezilenSayfaRef = useRef(gezilenSayfa); useEffect(() => { gezilenSayfaRef.current = gezilenSayfa; }, [gezilenSayfa]);
  const maskotBalonRef = useRef(null); // BÜYÜK maskot balonu — okurken teleprompter gibi kaydırma
  const [okunanKelime, setOkunanKelime] = useState(-1); // ŞU AN okunan KELİME indeksi (balonda vurgulanır + ▸ imleç)
  const okunanKelimeRef = useRef(-1);
  const toplamKelimeRef = useRef(0);                    // maskotMetni'nin kelime sayısı (ilerleme→kelime)
  const elleKaydirRef = useRef(false);                  // kullanıcı PARMAĞIYLA kaydırdıysa → oto-kaydırma DURUR (serbest)
  // Okunan KELİMEYİ balonun ORTASINA kaydır (alt yazı/şerit gibi tek tek yukarı yürür, sonuna kadar).
  // Kullanıcı parmağıyla kaydırdıysa (elleKaydirRef) oto-kaydırma YAPMA — serbest bıraktık.
  const maskotKaydirKelime = (wi) => {
    if (elleKaydirRef.current) return;
    const b = maskotBalonRef.current; if (!b) return;
    const el = b.querySelector('[data-wi="' + wi + '"]'); if (!el) return;
    const hedef = el.offsetTop - b.clientHeight / 2 + el.offsetHeight / 2; // OKUNAN kelime balonun ORTASINDA kalır
    try { b.scrollTo({ top: Math.max(0, hedef), behavior: "smooth" }); } catch (e) { b.scrollTop = Math.max(0, hedef); }
  };
  // TTS ilerlemesi (0..1) → kaçıncı kelimede olduğumuzu bul, VURGULA + ortaya KAYDIR (kelime kelime ilerler)
  const teleIlerleme = (frac) => {
    const n = toplamKelimeRef.current; if (!n) return;
    let w = Math.floor(frac * n); if (w >= n) w = n - 1; if (w < 0) w = 0;
    if (w === okunanKelimeRef.current) return; // aynı kelime → gereksiz yeniden çizim yok
    okunanKelimeRef.current = w; setOkunanKelime(w); maskotKaydirKelime(w);
  };
  // Kullanıcı balona parmağıyla dokunup kaydırınca → oto-kaydırmayı bırak (serbest); yeni cevap gelince tekrar otomatiğe döner
  const maskotElleKaydir = () => { elleKaydirRef.current = true; };
  // Yeni metin gelince (karşılama/AI cevabı) balonu EN BAŞA sar + oto-kaydırmayı aç + kelime sayısını hesapla + vurguyu sıfırla
  useEffect(() => {
    const b = maskotBalonRef.current; if (b) b.scrollTop = 0;
    elleKaydirRef.current = false;
    toplamKelimeRef.current = kelimeSayisi(maskotMetni);
    okunanKelimeRef.current = -1; setOkunanKelime(-1);
  }, [maskotMetni]);
  const [maskotTur, setMaskotTur] = useState("grox"); // "grox" (yardımcı) | "ekspert" (ayı)
  const [maskotKizgin, setMaskotKizgin] = useState(false); // kötü/hata olunca KIRMIZILAŞIR
  const maskotTanitRef = useRef(false); // büyük maskot açık mı (async cevapta okumak için)
  useEffect(() => { maskotTanitRef.current = maskotTanit; }, [maskotTanit]);
  // KULLANICIYA İSİMLE HİTAP: önce profil ismi, sonra Google displayName; İKİSİ DE yoksa e-postanın YEREL kısmından
  // temiz bir isim türet (rakam/nokta/alt-tire temizlenir, baş harf büyür). E-postayı ASLA olduğu gibi isim yapma.
  function hitapAdi() {
    const isim = (profilBilgi && profilBilgi.isim) || "";
    if (isim && isim.indexOf("@") < 0) return isim.split(" ")[0];
    const dn = (auth.currentUser && auth.currentUser.displayName) || "";
    if (dn && dn.indexOf("@") < 0) return dn.split(" ")[0];
    const posta = (profilBilgi && profilBilgi.eposta) || (auth.currentUser && auth.currentUser.email) || "";
    let y = posta.indexOf("@") >= 0 ? posta.split("@")[0] : "";
    y = y.replace(/[._\-0-9]+/g, " ").trim().split(/\s+/)[0] || "";
    return y ? y.charAt(0).toUpperCase() + y.slice(1) : "";
  }
  // Verilen koordinat için TAM ADRES (bina/mekân) + içinde bulunulan İSİMLİ MEKÂN (mağaza/otel/kuaför/banka) çöz → anlikYer güncelle.
  // Sürekli takipte ağı yormasın diye THROTTLE: en az 40 sn geçmeden VE ~25 m'den az hareket ettiyse yeniden çözmez.
  async function konumCozVeMekan(lat, lon, zorla) {
    const t0d = konumTakipRef.current;
    if (!zorla && t0d.sonLat != null) {
      const R0 = 6371000, r0 = (x) => (x * Math.PI) / 180;
      const dLa = r0(lat - t0d.sonLat), dLo = r0(lon - t0d.sonLon);
      const a0 = Math.sin(dLa / 2) ** 2 + Math.cos(r0(lat)) * Math.cos(r0(t0d.sonLat)) * Math.sin(dLo / 2) ** 2;
      const uzak = R0 * 2 * Math.atan2(Math.sqrt(a0), Math.sqrt(1 - a0));
      if (uzak < 25 && (Date.now() - t0d.sonMs) < 40000) return; // ne yer değişti ne süre doldu → geç
    }
    t0d.sonMs = Date.now(); t0d.sonLat = lat; t0d.sonLon = lon;
    let adres = "";
    try {
      // ADRES HER DİLDE İNGİLİZCE/LATİN: accept-language=en + latinYap (özel harf yok)
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=en`, { headers: { Accept: "application/json" } });
      const d = await r.json();
      adres = latinYap((d && d.display_name) || "");
      const a = d && d.address;
      if (a) setKonum((k) => ({ ...k, lat, lon, kod: (a.country_code || k.kod || "").toUpperCase(), sehir: latinYap(a.city || a.town || a.village || a.municipality || "") || k.sehir, ilce: latinYap(a.suburb || a.city_district || a.district || a.county || "") || k.ilce, mahalle: latinYap(a.neighbourhood || a.quarter || a.hamlet || "") || k.mahalle }));
    } catch (e) {}
    let yer = "", tur = "";
    try {
      const q = `[out:json][timeout:15];(nwr(around:120,${lat},${lon})[name][shop];nwr(around:120,${lat},${lon})[name][amenity];nwr(around:120,${lat},${lon})[name][tourism];nwr(around:120,${lat},${lon})[name][office];nwr(around:120,${lat},${lon})[name][leisure];);out center 80;`;
      const sunucular = ["https://overpass.kumi.systems/api/interpreter", "https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
      let d = null;
      for (const sv of sunucular) { try { const r = await fetch(sv, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) }); if (!r.ok) continue; d = await r.json(); if (d && Array.isArray(d.elements)) break; } catch (e2) {} }
      if (d && d.elements && d.elements.length) {
        const TUR_AD = { hairdresser: "kuaför", beauty: "güzellik salonu", barber: "berber", bank: "banka", atm: "ATM", hotel: "otel", motel: "motel", guest_house: "pansiyon", hostel: "hostel", restaurant: "restoran", cafe: "kafe", fast_food: "fast-food", pharmacy: "eczane", hospital: "hastane", clinic: "klinik", supermarket: "süpermarket", convenience: "market", mall: "AVM", bakery: "fırın", clothes: "giyim mağazası", jewelry: "kuyumcu", fuel: "benzin istasyonu", school: "okul", university: "üniversite", post_office: "postane" };
        const R = 6371000, rad = (x) => (x * Math.PI) / 180;
        let enYakin = null, enM = Infinity;
        d.elements.forEach((el) => {
          const tg = el.tags || {}; if (!tg.name) return;
          const plat = el.lat != null ? el.lat : (el.center && el.center.lat);
          const plon = el.lon != null ? el.lon : (el.center && el.center.lon);
          if (plat == null || plon == null) return;
          const dLat = rad(plat - lat), dLon = rad(plon - lon);
          const aa = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(plat)) * Math.sin(dLon / 2) ** 2;
          const m = R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
          if (m < enM) { enM = m; enYakin = tg; }
        });
        if (enYakin) { yer = latinYap(enYakin["name:en"] || enYakin.name); const tp = enYakin.shop || enYakin.amenity || enYakin.tourism || enYakin.office || enYakin.leisure || ""; tur = TUR_AD[tp] || tp.replace(/_/g, " "); }
      }
    } catch (e) {}
    const bilgi = { adres, yer, tur, lat, lon };
    anlikYerRef.current = bilgi; setAnlikYer(bilgi);
  }
  // AYARLAR: "Gloxoo tam konumumu bilsin" AÇ/KAPAT. AÇARKEN izin ister (watchPosition → tarayıcı sorar). Tercih localStorage'da tutulur.
  function tamKonumToggle() {
    const yeni = !tamKonumIzinRef.current;
    if (yeni && !navigator.geolocation) { setAyarMsg(t("ayarKonumYok", "Cihaz konumu desteklemiyor")); setTimeout(() => setAyarMsg(""), 2500); return; }
    if (yeni) {
      // hemen bir kez dene (izin penceresi çıksın); watch etkisi asıl takibi başlatır
      try { navigator.geolocation.getCurrentPosition((pos) => { konumCozVeMekan(pos.coords.latitude, pos.coords.longitude, true); setAyarMsg(t("ayarTamKonumAcik", "Gloxoo artık tam konumunu biliyor ✓")); setTimeout(() => setAyarMsg(""), 3000); }, (err) => { if (err && err.code === 1) { setTamKonumIzin(false); try { localStorage.setItem("groxTamKonum", "0"); } catch (e) {} setAyarMsg(t("ayarKonumIzinYok", "Konum izni verilmedi — tarayıcı/telefon ayarından izin ver")); setTimeout(() => setAyarMsg(""), 4000); } }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }); } catch (e) {}
    } else {
      anlikYerRef.current = null; setAnlikYer(null);
      setAyarMsg(t("ayarTamKonumKapali", "Tam konum kapatıldı")); setTimeout(() => setAyarMsg(""), 2500);
    }
    setTamKonumIzin(yeni); try { localStorage.setItem("groxTamKonum", yeni ? "1" : "0"); } catch (e) {}
  }
  // TAM KONUM AÇIK iken SÜREKLİ TAKİP: watchPosition HAREKET ettikçe tetiklenir; SABİT dururken tetiklenmediği için
  // ayrıca PERİYODİK (25 sn) bir yoklama yapılır → mekân/adres ilk kez de gelir, taze kalır (başka şehre gidince güncellenir).
  useEffect(() => {
    if (!tamKonumIzin || !navigator.geolocation) return;
    let iptal = false;
    const isle = (pos) => { if (iptal) return; const lat = pos.coords.latitude, lon = pos.coords.longitude; setKonum((k) => ({ ...k, lat, lon })); konumCozVeMekan(lat, lon, false); };
    const id = navigator.geolocation.watchPosition(isle, () => {}, { enableHighAccuracy: true, timeout: 20000, maximumAge: 15000 });
    konumTakipRef.current.id = id;
    // hemen bir kez + her 25 sn'de bir yokla (sabit dururken bile en az bir kez kesin adres/mekân gelsin)
    const yokla = () => { if (iptal) return; navigator.geolocation.getCurrentPosition(isle, () => {}, { enableHighAccuracy: true, timeout: 12000, maximumAge: 20000 }); };
    yokla();
    const zmn = setInterval(yokla, 25000);
    return () => { iptal = true; clearInterval(zmn); try { navigator.geolocation.clearWatch(id); } catch (e) {} };
  }, [tamKonumIzin]); // eslint-disable-line react-hooks/exhaustive-deps
  const maskotTanitYap = (oto) => {
    setMaskotTur("grox");
    const ad = hitapAdi() || "dostum";
    let ilk = false; try { ilk = !localStorage.getItem("groxMaskotTanitildi"); } catch (e) {}
    // KARŞILAMA SAYFA DİLİNE GÖRE (aiDil = ses dili). Türkçe metni Rusça sesle okuma karışması biter.
    void ilk;
    const _ad = (ad && ad !== "dostum" && ad.indexOf("@") < 0) ? " " + ad : ""; // e-posta ise İSİM olarak kullanma
    const G = {
      tr: `Merhaba${_ad}! Ben Gloxoo, Gloxorg dünyasının akıllı kalbi. Her konuda yardımcı olurum — konuş ya da yaz, buradayım.`,
      en: `Hello${_ad}! I'm Gloxoo, the smart heart of the Gloxorg world. I can help with anything — talk or type, I'm here.`,
      de: `Hallo${_ad}! Ich bin Gloxoo, das kluge Herz der Gloxorg-Welt. Ich helfe dir bei allem — sprich oder schreib, ich bin da.`,
      fr: `Bonjour${_ad}! Je suis Gloxoo, le cœur intelligent du monde Gloxorg. Je t'aide en tout — parle ou écris, je suis là.`,
      es: `¡Hola${_ad}! Soy Gloxoo, el corazón inteligente del mundo Gloxorg. Te ayudo en todo — habla o escribe, aquí estoy.`,
      it: `Ciao${_ad}! Sono Gloxoo, il cuore intelligente del mondo Gloxorg. Ti aiuto in tutto — parla o scrivi, sono qui.`,
      pt: `Olá${_ad}! Sou o Gloxoo, o coração inteligente do mundo Gloxorg. Ajudo-te em tudo — fala ou escreve, estou aqui.`,
      ru: `Привет${_ad}! Я Gloxoo, умное сердце мира Gloxorg. Помогу тебе во всём — говори или пиши, я здесь.`,
      uk: `Привіт${_ad}! Я Gloxoo, розумне серце світу Gloxorg. Допоможу тобі в усьому — говори або пиши, я тут.`,
      ar: `مرحبا${_ad}! أنا Gloxoo، القلب الذكي لعالم Gloxorg. أساعدك في كل شيء — تحدث أو اكتب، أنا هنا.`,
      zh: `你好${_ad}！我是 Gloxoo，Gloxorg 世界的智慧核心。任何事都能帮你——说话或打字，我都在。`,
      ja: `こんにちは${_ad}！私は Gloxoo、Gloxorg の世界の賢い心です。何でもお手伝いします——話しても書いても、ここにいます。`,
      hi: `नमस्ते${_ad}! मैं Gloxoo हूँ, Gloxorg दुनिया का स्मार्ट दिल। मैं हर चीज़ में मदद करता हूँ — बोलो या लिखो, मैं यहाँ हूँ।`,
    };
    // AKILLI KARŞILAMA: İLK tanışmada tam tanıtım; sonraki gelişlerde ZAMANA göre kısa selam +
    // "bir isteğin var mı" (her açılışta aynı "ben Gloxoo'yum" TEKRARLANMAZ). Yerel metin — AI hakkı harcamaz.
    const dilK = aiDilRef.current;
    const selam = (() => {
      let ilkTanisma = true, fark = 0;
      try { const son = parseInt(localStorage.getItem("groxSonSelamMs") || "0", 10); if (son > 0) { ilkTanisma = false; fark = Date.now() - son; } } catch (e) {}
      try { localStorage.setItem("groxSonSelamMs", String(Date.now())); } catch (e) {}
      if (ilkTanisma) return G[dilK] || G.en; // ilk kez: kendini tanıtır
      const gun = Math.floor(fark / 86400000); // dönüş: geçen güne göre. KISA + istek DAYATMADAN (istemediğini sayma).
      const T = {
        tr: gun >= 1 ? `Hoş geldin${_ad}! ${gun === 1 ? "Bir gün" : gun + " gün"} olmuş, neredeydin? 🙂 Bir isteğin olursa buradayım.` : `Tekrar hoş geldin${_ad}! Bir isteğin olursa söyle, buradayım.`,
        en: gun >= 1 ? `Welcome back${_ad}! It's been ${gun === 1 ? "a day" : gun + " days"} — where were you? 🙂 I'm here whenever you need me.` : `Welcome back${_ad}! Just tell me if you need anything, I'm here.`,
        ru: gun >= 1 ? `С возвращением${_ad}! Прошло ${gun === 1 ? "уже день" : gun + " дн."} — где ты был? 🙂 Я здесь, если понадоблюсь.` : `С возвращением${_ad}! Скажи, если что-то нужно, я здесь.`,
        de: gun >= 1 ? `Willkommen zurück${_ad}! Es ist ${gun === 1 ? "ein Tag" : gun + " Tage"} her — wo warst du? 🙂 Ich bin da, wenn du mich brauchst.` : `Willkommen zurück${_ad}! Sag einfach, wenn du etwas brauchst.`,
      };
      return T[dilK] || T.en;
    })();
    try { localStorage.setItem("groxMaskotTanitildi", "1"); } catch (e) {}
    setMaskotMetni(selam); setMaskotTanit(true); setMaskotMini(false); setYardimciMod("sohbet");
    // İLK AÇILIŞ (oto) karşılaması SESLİ BİTİNCE maskot kendini KAPATIR (köşedeki yerine çekilir, ortada büyük durmaz).
    // Kullanıcı KENDİSİ dokununca (oto değil) BÜYÜK kalır, kapatmayı kullanıcı yapar.
    const bitince = oto ? () => { try { setMaskotTanit(false); setMaskotMini(false); setMaskotMetni(""); } catch (e) {} } : undefined;
    try { sesliOku(selam, bitince, undefined, teleIlerleme); } catch (e) {}
    if (!oto) maskotCanliBaslat(); // karşılama bitince mikrofonu aç (OTOMATİK açılışta DEĞİL — mikrofon izni ilk dokunuşta istenir)
  };
  // YENİ ÜYE KARŞILAMASI — ilk kez kayıt olan kişi: Gloxoo BÜYÜK açılır, KAPANMAZ (okusun); kendini + GLOXORG + gloxorg.com
  // + Gloxoo.com + 🐻 Ekspert'i İKONLU anlatır ve 7 Eksen / eylem planına yönlendirir.
  const maskotYeniUyeKarsila = () => {
    setMaskotTur("grox");
    const ad = hitapAdi();
    const _ad = (ad && ad.indexOf("@") < 0 && ad !== "dostum") ? " " + ad.split(" ")[0] : "";
    const YU = {
      tr: `Hoş geldin${_ad}! 👋 Ben Gloxoo 💎, GLOXORG'un akıllı kalbiyim. 🌍 GLOXORG dünyanın lüks profesyonel sosyal platformu (gloxorg.com): paylaş, bağ kur, müşteri bul. Her sayfada yanındayım ve o sayfanın uzmanıyım — 🗣️ konuşur, ✍️ yazar, 📰 güncel bilgi veririm (gloxoo.com). Menüden 💠 Hakkında'ya bak ya da "eylem planı çıkar" de. Hadi başlayalım! 🚀`,
      en: `Welcome${_ad}! 👋 I'm Gloxoo 💎, the smart heart of GLOXORG. 🌍 GLOXORG is the world's luxury professional social platform (gloxorg.com): share, connect, find clients. I'm on every page and I'm that page's expert too — 🗣️ I talk, ✍️ I write, 📰 I give current info (gloxoo.com). Check 💠 About in the menu or say "make me a plan". Let's begin! 🚀`,
      de: `Willkommen${_ad}! 👋 Ich bin Gloxoo 💎, das kluge Herz von GLOXORG. 🌍 GLOXORG ist die luxuriöse berufliche Social-Plattform der Welt (gloxorg.com): teilen, vernetzen, Kunden finden. Auf jeder Seite bei dir — 🗣️ ich spreche, ✍️ schreibe, 📰 gebe aktuelle Infos (gloxoo.com). Der 🐻 Ekspert oben ist der Experte deiner Seite. Sieh 💠 Über im Menü oder sag „mach mir einen Plan". Los geht's! 🚀`,
      fr: `Bienvenue${_ad}! 👋 Je suis Gloxoo 💎, le cœur intelligent de GLOXORG. 🌍 GLOXORG est la plateforme sociale professionnelle de luxe du monde (gloxorg.com) : partage, connecte, trouve des clients. Je suis sur chaque page — 🗣️ je parle, ✍️ j'écris, 📰 je donne des infos à jour (gloxoo.com). L'🐻 Ekspert en haut est l'expert de ta page. Vois 💠 À propos dans le menu ou dis « fais-moi un plan ». C'est parti ! 🚀`,
      es: `¡Bienvenido${_ad}! 👋 Soy Gloxoo 💎, el corazón inteligente de GLOXORG. 🌍 GLOXORG es la plataforma social profesional de lujo del mundo (gloxorg.com): comparte, conecta, encuentra clientes. Estoy en cada página — 🗣️ hablo, ✍️ escribo, 📰 doy info actual (gloxoo.com). El 🐻 Ekspert de arriba es el experto de tu página. Mira 💠 Acerca en el menú o di "hazme un plan". ¡Empecemos! 🚀`,
      it: `Benvenuto${_ad}! 👋 Sono Gloxoo 💎, il cuore intelligente di GLOXORG. 🌍 GLOXORG è la piattaforma sociale professionale di lusso del mondo (gloxorg.com): condividi, connetti, trova clienti. Sono su ogni pagina — 🗣️ parlo, ✍️ scrivo, 📰 do info aggiornate (gloxoo.com). L'🐻 Ekspert in alto è l'esperto della tua pagina. Vedi 💠 Info nel menu o di' "fammi un piano". Iniziamo! 🚀`,
      pt: `Bem-vindo${_ad}! 👋 Sou o Gloxoo 💎, o coração inteligente da GLOXORG. 🌍 A GLOXORG é a plataforma social profissional de luxo do mundo (gloxorg.com): partilha, conecta, encontra clientes. Estou em cada página — 🗣️ falo, ✍️ escrevo, 📰 dou info atual (gloxoo.com). O 🐻 Ekspert acima é o especialista da tua página. Vê 💠 Sobre no menu ou diz "faz-me um plano". Vamos começar! 🚀`,
      ru: `Добро пожаловать${_ad}! 👋 Я Gloxoo 💎, умное сердце GLOXORG. 🌍 GLOXORG — мировая люксовая профессиональная соцплатформа (gloxorg.com): делись, связывайся, находи клиентов. Я на каждой странице — 🗣️ говорю, ✍️ пишу, 📰 даю актуальную информацию (gloxoo.com). 🐻 Ekspert вверху — эксперт твоей страницы. Открой 💠 «О нас» в меню или скажи «составь мне план». Начнём! 🚀`,
      uk: `Ласкаво просимо${_ad}! 👋 Я Gloxoo 💎, розумне серце GLOXORG. 🌍 GLOXORG — світова люксова професійна соцплатформа (gloxorg.com): ділися, з'єднуйся, знаходь клієнтів. Я на кожній сторінці — 🗣️ говорю, ✍️ пишу, 📰 даю актуальну інформацію (gloxoo.com). 🐻 Ekspert вгорі — експерт твоєї сторінки. Відкрий 💠 «Про нас» у меню або скажи «склади мені план». Почнімо! 🚀`,
      ar: `أهلاً${_ad}! 👋 أنا Gloxoo 💎، القلب الذكي لـ GLOXORG. 🌍 GLOXORG منصة العالم الاجتماعية المهنية الفاخرة (gloxorg.com): شارك، تواصل، اعثر على عملاء. أنا في كل صفحة — 🗣️ أتحدث، ✍️ أكتب، 📰 أقدّم معلومات محدّثة (gloxoo.com). 🐻 Ekspert بالأعلى خبير صفحتك. افتح 💠 «حول» من القائمة أو قل «اصنع لي خطة». لنبدأ! 🚀`,
      zh: `欢迎${_ad}！👋 我是 Gloxoo 💎，GLOXORG 的智慧核心。🌍 GLOXORG 是全球奢华专业社交平台（gloxorg.com）：分享、连接、寻找客户。我在每个页面——🗣️ 会说、✍️ 会写、📰 提供最新信息（gloxoo.com）。上方的 🐻 Ekspert 是你页面的专家。在菜单查看 💠「关于」或说"给我做个计划"。开始吧！🚀`,
      ja: `ようこそ${_ad}！👋 私は Gloxoo 💎、GLOXORG の賢い心です。🌍 GLOXORG は世界のラグジュアリーなプロ向けソーシャル基盤（gloxorg.com）：共有、つながり、顧客探し。どのページにも——🗣️ 話し、✍️ 書き、📰 最新情報を届けます（gloxoo.com）。上の 🐻 Ekspert はあなたのページの専門家。メニューの 💠「概要」を見るか「プランを作って」と言ってね。始めよう！🚀`,
      hi: `स्वागत है${_ad}! 👋 मैं Gloxoo 💎 हूँ, GLOXORG का स्मार्ट दिल। 🌍 GLOXORG दुनिया का लक्ज़री प्रोफेशनल सोशल प्लेटफ़ॉर्म है (gloxorg.com): साझा करो, जुड़ो, ग्राहक पाओ। मैं हर पेज पर हूँ — 🗣️ बोलता, ✍️ लिखता, 📰 ताज़ा जानकारी देता हूँ (gloxoo.com)। ऊपर का 🐻 Ekspert तुम्हारे पेज का विशेषज्ञ है। मेन्यू में 💠 "बारे में" देखो या कहो "मेरे लिए योजना बनाओ"। चलो शुरू करें! 🚀`,
    };
    const selam = YU[aiDilRef.current] || YU.en;
    setMaskotMetni(selam); setMaskotTanit(true); setMaskotMini(false); setYardimciMod("sohbet");
    try { localStorage.setItem("groxSonSelamMs", String(Date.now())); localStorage.setItem("groxMaskotTanitildi", "1"); } catch (e) {}
    try { sesliOku(selam, undefined, undefined, teleIlerleme); } catch (e) {} // KAPANMAZ (bitince yok) → yeni üye rahat okur
  };
  // BÜYÜK MASKOT canlı sohbet: karşılama sesi BİTİNCE mikrofonu açar, kullanıcıyı SABIRLA bekler (kendi konuşmaz, cevap dayatmaz),
  // kullanıcı konuşunca AI cevap verir (sesli) ve TEKRAR dinler — maskot büyük kalır, kapanmaz, tekrar karşılamaz.
  const maskotCanliBaslat = () => {
    if (!navigator.mediaDevices || !window.MediaRecorder) return; // mikrofon yoksa sessiz bekler (sorun çıkarmasın)
    canliSohbetRef.current = true; setCanliSohbet(true); setSesliMod(true);
    try { canliDevam(); } catch (e) {}
  };
  // Büyük maskotu KAPAT/sustur: dokun = sus + canlı sohbeti durdur (mikrofon kapanır) + yerine çekil (panel AÇMAZ)
  const maskotTanitGec = () => {
    canliSohbetRef.current = false; setCanliSohbet(false); setDinliyor(false);
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
    try { mediaRecorderRef.current && mediaRecorderRef.current.stop(); } catch (e) {}
    setMaskotTanit(false); setMaskotMini(false); // TAM KAPAT (sadece ✕ ile)
  };
  // KAYDIR (parmakla sağa/sola çek): BÜYÜK maskot köşesine iner AMA canlı dinleme SÜRER — kapatma yok, kullanıcı kapatana kadar dinler (istek #5)
  const maskotKucult = () => {
    setAiDuraklat(false);
    // AYI (Ekspert) AYRIDIR: küçülünce TAMAMEN KAPANIR (Gloxoo gibi köşede kalmaz, karışmaz).
    if (maskotTur === "ekspert") {
      canliSohbetRef.current = false; setCanliSohbet(false); setDinliyor(false);
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
      try { mediaRecorderRef.current && mediaRecorderRef.current.stop(); } catch (e) {}
      try { recognitionRef.current && recognitionRef.current.abort(); recognitionRef.current = null; } catch (e) {}
      setMaskotTanit(false); setMaskotMini(false); setMaskotMetni(""); setMaskotTur("grox");
      return;
    }
    setMaskotTanit(false); setMaskotMini(true); // GLOXOO: köşeye in AMA KAPANMA (Yaz/Ses düğmeleri görünür, sohbet açık)
    if (canliSohbetRef.current) { try { canliDevam(); } catch (e) {} } // canlı dinleme sürer
  };
  // Mini ikon düğmeye basınca ÜSTÜNDE kısa etiket göster (buton üzerinde sürekli yazı DURMAZ — istek)
  const miniEtiketGoster = (metin) => {
    setMiniEtiket(metin);
    try { clearTimeout(miniEtiketZmn.current); } catch (e) {}
    miniEtiketZmn.current = setTimeout(() => setMiniEtiket(""), 1500);
  };
  // KÜÇÜKKEN ses AÇ/KAPA: maskotu BÜYÜTMEDEN konuşmayı başlat/durdur (istek: ufakken de oradan konuş)
  const miniSesToggle = () => {
    if (canliSohbetRef.current) { // KAPAT (sus) — mini kalır, düğmeler kaybolmaz
      canliSohbetRef.current = false; setCanliSohbet(false); setDinliyor(false);
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
      try { mediaRecorderRef.current && mediaRecorderRef.current.stop(); } catch (e) {}
      try { recognitionRef.current && recognitionRef.current.abort(); recognitionRef.current = null; } catch (e) {} // tarayıcı ses tanımasını durdur
      miniEtiketGoster(t("kapat", "Kapat"));
    } else { // AÇ (konuş) — büyütmeden canlı dinlemeyi başlat
      if (kameraModRef.current) { try { kameraKapat(); } catch (e) {} } // KARŞILIKLI: Canlı açılınca Kamera kapanır (ikisi aynı anda olmaz)
      miniEtiketGoster(t("konus", "Konuş"));
      maskotCanliBaslat();
    }
  };
  const maskotSwipe = useRef(null);
  const maskotSwipeYapildi = useRef(false);
  const maskotDokunBas = (e) => { const t0 = e.touches && e.touches[0]; if (t0) maskotSwipe.current = { x: t0.clientX, y: t0.clientY }; };
  const maskotDokunBit = (e) => {
    const s = maskotSwipe.current; maskotSwipe.current = null; if (!s) return;
    const t0 = e.changedTouches && e.changedTouches[0]; if (!t0) return;
    const dx = t0.clientX - s.x, dy = t0.clientY - s.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) { maskotSwipeYapildi.current = true; maskotKucult(); }
  };
  const maskotTanitTik = () => { if (maskotSwipeYapildi.current) { maskotSwipeYapildi.current = false; return; } maskotKucult(); }; // büyük maskota/boşluğa dokun = KÜÇÜL (kapatma DEĞİL — sadece ✕ kapatır)
  const maskotSohbetAc = () => { setMaskotTanit(false); setYardimciMod(maskotTur === "ekspert" ? "site" : "sohbet"); setYardimciAcik(true); }; // "Yaz" → tam panel (Ekspert=site, GLOXORG=sohbet). KONUŞMAYI KESME: kullanıcı yazıları görmek için açtı, karşılama sesli devam etsin (B-AI: "yazıyı açtım, o konuşma devam edecek")
  // ŞU AN AÇIK olan sayfa/pencere kodu — Ekspert NEREDE olduğunu bilir (üst pencereler öncelikli, yoksa alt sekme)
  const mevcutSayfaKodu = () =>
    ayarlarAcikRef.current ? "ayarlar" : paylasAcikRef.current ? "paylas" : araAcikRef.current ? "ara" : mesajAcikRef.current ? "mesaj" : bildirimAcikRef.current ? "bildirim" : (aktifKodRef.current || "home");
  // EKSPERT (ayı) maskotuna dokun (veya sayfaya İLK giriş) → büyür + O SAYFANIN NE İŞE YARADIĞINI konuşarak+yazarak anlatır.
  // otomatik=true → ilk-giriş otomatik anlatımı: mikrofonu ZORLA açmaz (kullanıcıyı boğmaz); düğmeyle açılınca canlı dinler.
  const eksperTanitYap = (otomatik) => {
    const ak = mevcutSayfaKodu();
    const sayfaAdlar = { home: "Ana sayfa / Keşfet", ara: "Arama", konum: "Konum", mesaj: "Mesajlar", profil: "Profil", paylas: "Paylaşım", ayarlar: "Ayarlar", bildirim: "Bildirimler", elite: "Elite", topluluk: "Topluluk", video: "Canlı Akış", akademi: "Akademi" };
    const sayfaAd = sayfaAdlar[ak] || "Ana sayfa / Keşfet";
    setYardimciBaglam(`Kullanıcı şu an GLOXORG "${sayfaAd}" sayfasında; bu sayfanın uzmanı gibi yardım et.`);
    const ad = hitapAdi(); const _ea = (ad && ad.indexOf("@") < 0 && ad !== "dostum") ? " " + ad.split(" ")[0] : "";
    const INTRO = { tr: `Selam${_ea}! Ben Gloxoo 💎.`, en: `Hi${_ea}! I'm Gloxoo 💎.`, de: `Hallo${_ea}! Ich bin Gloxoo 💎.` };
    const intro = INTRO[aiDilRef.current] || INTRO.en;
    const ack = SAYFA_ACIKLAMA[ak] || SAYFA_ACIKLAMA.home;
    const aciklama = ack[aiDilRef.current] || ack.en;
    const selam = intro + " " + aciklama;
    setMaskotTur("grox"); setMaskotMetni(selam); setMaskotTanit(true); setYardimciMod("site");
    // KENDİ KENDİNE KAPANMAZ — açık/hazır kalır; kapatmayı KULLANICI yapar (boşluğa dokun / ✕).
    try { sesliOku(selam, undefined, undefined, teleIlerleme); } catch (e) {}
    if (!otomatik) maskotCanliBaslat(); // düğmeyle açılınca: karşılamadan sonra mikrofonu açıp seni bekler
  };
  const [paylasDuzen, setPaylasDuzen] = useState(null); // paylaşım fotoğrafının katman hafızası (yeniden düzenle)
  const [paylasZemin, setPaylasZemin] = useState(""); // yazılı gönderi ZEMİN (arka plan) rengi/gradyanı
  const [paylasYaziRenk, setPaylasYaziRenk] = useState(""); // yazılı gönderi YAZI rengi
  const ZEMIN_SECENEK = ["",
    "linear-gradient(135deg,#23314f,#0d1b3a)", "linear-gradient(135deg,#1d6fb8,#0c2f5a)", "linear-gradient(135deg,#0f7b6c,#0b3d3a)", "linear-gradient(135deg,#1e7a46,#0d3b24)",
    "linear-gradient(135deg,#caa12a,#7a5e16)", "linear-gradient(135deg,#e0962b,#8a4b0e)", "linear-gradient(135deg,#b8341f,#7d1d1d)", "linear-gradient(135deg,#c0303d,#6a1248)",
    "linear-gradient(135deg,#a64d79,#3a1c71)", "linear-gradient(135deg,#7d3cc9,#2a1840)", "linear-gradient(135deg,#0b6e8c,#08524d)", "linear-gradient(135deg,#444a55,#15171c)",
    "#16223e", "#08524d", "#1e7a46", "#5a0e1e", "#3d1466", "#1a1a1a", "#000000", "#0e1830"];
  const YAZI_SECENEK = ["", "#ffffff", "#f2e9d8", "#FFD700", "#FFA62B", "#ff5d68", "#c0303d", "#ff8fc7", "#a06bff", "#7fe0ff", "#5aa6e0", "#46d37a", "#9be29b", "#111111"];
  const paylasFotoRef = useRef(null);
  const paylasVideoRef = useRef(null);
  const paylasDosyaRef = useRef(null);     // DOSYA (belge) seç
  const paylasFotoKamRef = useRef(null);   // FOTO — kamera (capture)
  const paylasVideoKamRef = useRef(null);  // VİDEO — kamera (capture)
  const [tamFoto, setTamFoto] = useState("");          // fotoğrafa basınca TAM EKRAN görüntü
  const [tamYatay, setTamYatay] = useState(false);     // açılan görsel YATAY/geniş mi (fill mi contain mi)
  // TAM EKRAN parmakla ZOOM (pinch / çift dokunma / fare tekeri) — kullanıcı KENDİSİ yakınlaştırır
  const [zoom, setZoom] = useState({ s: 1, x: 0, y: 0 });
  const pinchRef = useRef(null); // aktif jest verisi (iki parmak mesafesi / tek parmak sürükleme)
  // TAM EKRAN ÖZEL VİDEO OYNATICI (bize özgü — native kontrol YOK)
  const tamVideoRef = useRef(null);
  const [vidOyn, setVidOyn] = useState(false);   // oynuyor mu
  const [vidT, setVidT] = useState(0);           // anlık saniye
  const [vidSure, setVidSure] = useState(0);     // toplam saniye
  const [tfMini, setTfMini] = useState(false);   // TAM EKRAN video KÜÇÜLTÜLDÜ mü → köşede oynar, sayfa kayar
  const [tfVidOran, setTfVidOran] = useState(null); // video en-boy oranı (mini pencere videoya göre → dikey video dikey pencere, kenar karartma yok)
  function vidTikla(e) { if (e) e.stopPropagation(); const v = tamVideoRef.current; if (!v) return; if (v.muted) v.muted = false; /* dokununca SESİ AÇ (sessiz autoplay'den sonra) */ if (v.paused) v.play(); else v.pause(); }
  const vidSn = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  const [acikYazi, setAcikYazi] = useState({});        // uzun açıklamalar: id->true açıldı
  const [gonderilerim, setGonderilerim] = useState([]); // Profilim'deki kendi paylaşımlarım
  const [profilFiltre, setProfilFiltre] = useState("hepsi"); // Profilim bölüm filtresi (tür)
  const [duzenlenen, setDuzenlenen] = useState(null);  // düzenlenen gönderi (null=yeni paylaşım)
  // ÜYE SAYFASI — başka birinin paylaşımları AYRI sayfada (profilden bağımsız)
  // Avatara basınca veya tam ekranda parmakla sola çekince açılır
  const [uyeSayfa, setUyeSayfa] = useState(null);      // {uid, ad, foto, meslek, sehir, ulke, pro, amblem, renk} | null
  const [uyePostlar, setUyePostlar] = useState(null);  // o üyenin gönderileri | null=yükleniyor
  const [uyeFiltre, setUyeFiltre] = useState("hepsi"); // üye sayfası bölüm filtresi
  useEffect(() => {
    if (!araAcik || araHavuz !== null) return;
    setAraYukleniyor(true);
    profesyonelAra({}, 150).then((liste) => { setAraHavuz(liste || []); setAraYukleniyor(false); })
      .catch(() => { setAraHavuz([]); setAraYukleniyor(false); });
  }, [araAcik, araHavuz]);
  // Türkçe + tüm aksanları yok say (ANAYASA): ı/i, ş/s, ç/c, ğ/g, ü/u, ö/o ve diğer dillerin
  // aksanları (é, ñ...) eşit sayılır → harf farkı aramayı bozmaz.
  const sadelesAra = (s) => (s || "").toString().toLocaleLowerCase("tr")
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o")
    .normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "");
  // Bir mesleğin TÜM dillerdeki karşılıkları (Berber→Barber→Барбер→理髪師...) — hangi dilde
  // yazarsan yaz bulunsun (kullanıcı kuralı: yazdığım dili tanıyacak)
  const meslekTumDiller = (tr) => {
    if (!tr) return "";
    const c = meslekCevir[tr];
    return tr + " " + (c ? Object.values(c).join(" ") : "");
  };
  const araSonuc = (() => {
    if (!araHavuz) return [];
    const q = sadelesAra(araQ);
    if (!q.trim()) return araHavuz.slice(0, 24); // BOŞ: Keşfet önerileri (kayıtlı profesyoneller)
    const kelimeler = q.split(/\s+/).filter(Boolean); // çok kelime: "berber berlin" → hepsi eşleşmeli
    return araHavuz.filter((p) => {
      const metin = sadelesAra(
        (p.isim || "") + " " + (p.soyisim || "") + " " +
        // İSİM + TÜM meslekler (çoklu, 12 dil) + şehir + ülke
        (((p.pro && p.pro.meslekler && p.pro.meslekler.length) ? p.pro.meslekler : [p.pro && p.pro.meslek]).filter(Boolean).map(meslekTumDiller).join(" ")) + " " +
        (p.konum && p.konum.sehir || "") + " " + (p.konum && p.konum.ulke || "")
      );
      return kelimeler.every((k) => metin.includes(k));
    });
  })();
  // Arama açıkken sayfa aşağı/yukarı çekilince sonuçlar KENDİLİĞİNDEN KAPANIR (yazı olsa bile). Kullanıcı: sonuçlar ekranda kalmasın.
  useEffect(() => {
    if (!araAcik) return;
    const el = kokRef.current;
    let basY = null;
    const kapat = () => { setAraAcik(false); setAraQ(""); };
    const sonucIcinde = (t) => !!(t && t.closest && t.closest(".ara-sonuc")); // sonuç listesinde gezinmeyi sayma
    const wheel = (e) => { if (!sonucIcinde(e.target)) kapat(); };
    const dokunBas = (e) => { basY = e.touches && e.touches[0] ? e.touches[0].clientY : null; };
    const dokunHar = (e) => { if (sonucIcinde(e.target)) return; const y = e.touches && e.touches[0] ? e.touches[0].clientY : null; if (basY != null && y != null && Math.abs(y - basY) > 28) kapat(); };
    const scr = () => kapat(); // feed (kök) kaydırması = sayfayı geziyor → kapat
    if (el) el.addEventListener("scroll", scr, { passive: true });
    window.addEventListener("wheel", wheel, { passive: true });
    window.addEventListener("touchstart", dokunBas, { passive: true });
    window.addEventListener("touchmove", dokunHar, { passive: true });
    return () => { if (el) el.removeEventListener("scroll", scr); window.removeEventListener("wheel", wheel); window.removeEventListener("touchstart", dokunBas); window.removeEventListener("touchmove", dokunHar); };
  }, [araAcik]);
  // Çevrimiçi sayacı — canlı nefes alır (hafifçe oynar)
  const [cevrim, setCevrim] = useState(823450); // yüz binlerde çevrimiçi (kullanıcı isteği)
  useEffect(() => {
    const id = setInterval(() => setCevrim((c) => Math.max(700000, c + Math.round((Math.random() - 0.45) * 900))), 6000);
    return () => clearInterval(id);
  }, []);
  const [aktifKod, setAktifKod] = useState("home");

  // Kullanıcı CANLI takip edilir — giriş çözülünce/foto gelince ekran güncellenir (yoksa foto boş kalıyordu).
  const [u, setU] = useState(auth.currentUser);
  useEffect(() => onAuthStateChanged(auth, setU), []);
  // BEĞENİLERİM her cihazda DOLU görünsün: giriş yapınca backend'den (Firestore) beğendiğim gönderileri çek, begeniSet'e ekle
  useEffect(() => {
    if (!u || !u.uid) return;
    let iptal = false;
    benimBegenilerim(u.uid).then((ids) => {
      if (iptal || !ids || !ids.length) return;
      setBegeniSet((prev) => { const s = new Set(prev); ids.forEach((id) => s.add(id)); try { localStorage.setItem("groxBegeni", JSON.stringify([...s])); } catch (e) {} return s; });
    }).catch(() => {});
    return () => { iptal = true; };
  }, [u]);
  // HESAP DEĞİŞİNCE AI SOHBETİNİ SIFIRLA — sohbet tarayıcıda global tutuluyordu (groxSohbet/groxSiteSohbet),
  // başka hesapla girince ESKİ konuşmalar görünüyordu. Artık sohbet sahibi uid'e bağlı; farklı kullanıcı → temiz balon.
  useEffect(() => {
    const kid = (u && u.uid) || "";
    if (!kid) return;
    try {
      if ((localStorage.getItem("gw_aiSahip") || "") !== kid) {
        localStorage.removeItem("groxSohbet"); localStorage.removeItem("groxSiteSohbet");
        localStorage.setItem("gw_aiSahip", kid);
        setYardimciMesajlar([]); setSiteMesajlar([]);
      }
    } catch (e) {}
  }, [u]);
  // AÇILIŞ KARŞILAMASI: büyük Gloxoo ORTADA çıkıp SESLİ karşılar. AMA her yenilemede/tekrar girişte DEĞİL —
  // sadece YENİ oturumda (son karşılamadan 3 saatten fazla geçmişse). Böylece bir gün/2 gün sonra girince
  // yeniden karşılar (metin zamana göre "bir gün olmuş" vб.); aynı oturumda sayfa yenilenince tekrar etmez.
  const karsilandiRef = useRef(false);
  useEffect(() => {
    if (karsilandiRef.current) return;
    // auth çözülsün diye kısa bekle; u değişince efekt yeniden kurulur (taze u ile)
    const ti = setTimeout(() => {
      if (karsilandiRef.current) return;
      // YENİ ÜYE mi? Hesap ~15 dk içinde OLUŞTURULMUŞ (creationTime≈lastSignInTime) ve bu uid'e daha önce tanıtım YAPILMAMIŞ
      let yeni = false;
      try {
        if (u && u.uid) {
          const key = "groxTanistik_" + u.uid;
          if (!localStorage.getItem(key)) {
            const ct = u.metadata && u.metadata.creationTime ? Date.parse(u.metadata.creationTime) : 0;
            const lt = u.metadata && u.metadata.lastSignInTime ? Date.parse(u.metadata.lastSignInTime) : 0;
            if (ct && lt && Math.abs(lt - ct) < 15 * 60 * 1000) yeni = true;
            localStorage.setItem(key, "1"); // bu uid için bir daha uzun tanıtım yapma
          }
        }
      } catch (e) {}
      if (yeni) { karsilandiRef.current = true; try { maskotYeniUyeKarsila(); } catch (e) {} return; }
      // DÖNEN kullanıcı: Gloxoo SADECE YENİ SÜRÜMDE (güncelleme sonrası ilk açılış) konuşur.
      // Normal açılış/dolaşmada SESSİZ kalır — kullanıcı kendisi açıp konuşur (istek).
      let yeniSurum = false;
      try { const son = localStorage.getItem("groxSonSurum") || ""; if (son !== AKTIF_SURUM) yeniSurum = true; localStorage.setItem("groxSonSurum", AKTIF_SURUM); } catch (e) { yeniSurum = true; }
      if (!yeniSurum) { karsilandiRef.current = true; return; }
      karsilandiRef.current = true;
      try { maskotTanitYap(true); } catch (e) {}
    }, 1400);
    return () => clearTimeout(ti);
  }, [u]); // eslint-disable-line react-hooks/exhaustive-deps
  // Servis çalışanını kaydet (telefon bildirimi gösterebilmek için — Android uyumlu)
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Yeni servis çalışan "güncellendi" haberi gönderince → sayfayı BİR KEZ yenile (kullanıcı hep güncel sürümü görür)
    try {
      navigator.serviceWorker.addEventListener("message", (ev) => {
        if (ev && ev.data && ev.data.tip === "sw-guncellendi") {
          try { if (!window.__groxYenilendi) { window.__groxYenilendi = true; window.location.reload(); } } catch (e) {}
        }
      });
    } catch (e) {}
    navigator.serviceWorker.register((process.env.PUBLIC_URL || "") + "/sw.js").then((reg) => {
      try { reg.update(); } catch (e) {}
      // Yeni surum hazir olunca (yeni servis calisan devralinca) sayfayi BIR KEZ yenile → kullanici hep guncel gorur
      reg.addEventListener && reg.addEventListener("updatefound", () => {
        const yeni = reg.installing; if (!yeni) return;
        yeni.addEventListener("statechange", () => {
          if (yeni.state === "activated" && navigator.serviceWorker.controller) {
            try { if (!window.__groxYenilendi) { window.__groxYenilendi = true; window.location.reload(); } } catch (e) {}
          }
        });
      });
    }).catch(() => {});
  }, []);
  // UYGULAMAYI YÜKLE (PWA): index.js beforeinstallprompt'u window.__groxKurPrompt'a saklar; burada dinleyip düğmeyi göster
  useEffect(() => {
    const f = () => setKurulabilir(!!window.__groxKurPrompt);
    window.addEventListener("grox-kurulabilir", f);
    f();
    return () => window.removeEventListener("grox-kurulabilir", f);
  }, []);
  // OTOMATİK GÜNCELLEME (service worker'a bağlı DEĞİL): sunucudaki index.html'i belli aralıklarla kontrol et;
  // yüklü ana script (main.<hash>.js) ile sunucudaki FARKLIYSA → yeni sürüm yayınlanmış → sayfayı BİR KEZ yenile.
  // Böylece her yayında kullanıcı ELLE yenilemeden otomatik güncel sürüme geçer (sw.js değişmese bile çalışır).
  useEffect(() => {
    let durdu = false;
    // Şu an ÇALIŞAN ana script dosyası (main.<hash>.js) — her yayında hash değişir
    const suanki = (() => {
      try {
        const s = Array.from(document.querySelectorAll('script[src]')).map((x) => x.src).find((u) => /\/static\/js\/main\.[a-z0-9]+\.js/.test(u));
        return s ? (s.match(/main\.[a-z0-9]+\.js/) || [""])[0] : "";
      } catch (e) { return ""; }
    })();
    const kontrol = async () => {
      if (durdu || !suanki || window.__groxYenilendi) return;
      try {
        const r = await fetch((process.env.PUBLIC_URL || "") + "/index.html?_g=" + Date.now(), { cache: "no-store" });
        if (!r.ok) return;
        const html = await r.text();
        const yeni = (html.match(/main\.[a-z0-9]+\.js/) || [""])[0];
        if (yeni && yeni !== suanki) { // sunucuda YENİ sürüm var → otomatik yenile (tek sefer)
          window.__groxYenilendi = true;
          try { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); reg && reg.update && reg.update(); } catch (e) {}
          window.location.reload();
        }
      } catch (e) {}
    };
    const iv = setInterval(kontrol, 60000);                 // her 60 sn'de bir kontrol
    const onVis = () => { if (document.visibilityState === "visible") kontrol(); }; // uygulamaya dönünce hemen kontrol
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", kontrol);
    const ilk = setTimeout(kontrol, 5000);                  // açılıştan ~5 sn sonra ilk kontrol
    return () => { durdu = true; clearInterval(iv); clearTimeout(ilk); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", kontrol); };
  }, []);
  // CANLI bildirim dinle (sayfa açıkken anında gelir); yeni gelenleri telefon bildirimi olarak göster
  useEffect(() => {
    if (!u || !u.uid) { setBildirimListe([]); gorulenBildirimRef.current = null; return; }
    const unsub = bildirimleriDinle(u.uid, (liste) => {
      setBildirimListe(liste);
      if (gorulenBildirimRef.current === null) { gorulenBildirimRef.current = new Set(liste.map((b) => b.id)); return; } // ilk yükleme: sessiz
      for (const b of liste) {
        if (!gorulenBildirimRef.current.has(b.id)) {
          gorulenBildirimRef.current.add(b.id);
          if (!b.okundu) telefonBildirimGoster(bildirimMetni(b), b.gonderenFoto);
        }
      }
    });
    return unsub;
  }, [u]); // eslint-disable-line react-hooks/exhaustive-deps
  const adTam = (u && (u.displayName || u.email)) || "GLOXORG";
  const harf = (adTam || "G").trim().charAt(0).toUpperCase();
  const fotoInputRef = useRef(null);

  // Profil penceresi için GERÇEK hesap bilgileri (Firestore'dan)
  const [profilBilgi, setProfilBilgi] = useState(null);
  // İKİ AYRI PROFİL:
  // • googleFoto = Google hesabının fotosu → SADECE Google hesabı menüsünde (top-right popup) gösterilir.
  // • foto (GLOXORG avatarı) = kullanıcının Profilim'den yüklediği AYRI foto → Google fotosu ASLA gelmez.
  const googleFoto = (u && u.photoURL) || "";
  const foto = (profilBilgi && profilBilgi.avatarFoto) || "";
  const [kopyalandi, setKopyalandi] = useState(false);
  // FOTOĞRAF DÜZENLEYİCİ (Profilim penceresinde): yakınlaştır + kaydır + üstüne yazı.
  const [duzenAcik, setDuzenAcik] = useState(false);
  const [duzenHedef, setDuzenHedef] = useState("avatar"); // "avatar"=profil fotosu, "is"=iş amblemi/fotoğrafı
  const [postOlcu, setPostOlcu] = useState({ w: 208, h: 260 }); // paylaşım editörü çerçevesi (fotoğrafın oranına göre)
  const isInputRef = useRef(null);
  const isFoto = (profilBilgi && profilBilgi.isFoto) || "";
  const galeri = (profilBilgi && Array.isArray(profilBilgi.galeri)) ? profilBilgi.galeri : []; // 2./3... profil fotoğrafları
  const galeriInputRef = useRef(null);
  const [acikBolum, setAcikBolum] = useState(null); // "foto" | "amblem" | "meslek" | null — her bölüm KENDİ ayarını açar
  const [yardimGizli, setYardimGizli] = useState(false); // açıklama kutusu × ile kapatılabilir
  const [meslekSecAcik, setMeslekSecAcik] = useState(false); // meslek seçici ızgarası açık mı
  const [meslekFiltre, setMeslekFiltre] = useState(""); // meslek arama kutusu
  // İLK YÜKLEMEDE FLAŞ OLMASIN (kullanıcı: sayfa açılınca önce KIRMIZI çıkıp sonra maviye dönüyordu):
  // profilBilgi Firestore'dan gelene kadar App'ten gelen `pro` prop'u + önbellekteki gw_uyelik ile
  // DOĞRU temayı (mavi/yeşil) ANINDA kur → kırmızı flaş yok.
  const uyelikOnbellek = (() => { try { return localStorage.getItem("gw_uyelik") || ""; } catch (e) { return ""; } })();
  const proUye = profilBilgi ? (profilBilgi.tip === "profesyonel") : !!pro; // kırmızı pırlanta + PRO ÜYE
  const uyelik = profilBilgi ? (profilBilgi.uyelik || "") : uyelikOnbellek; // "" | "kirmizi" (GLOXORG Kırmızı Pırlanta) | "altin" (GLOXORG Altın Pırlanta) — günlük AI sınırını kaldırır
  // ÜSTBAR PIRLANTA TEMASI (kullanıcı): Müşteri = KIRMIZI (yakut); Profesyonel = MAVİ (safir); Altın/Tam üye = YEŞİL (zümrüt).
  const uyeTema = uyelik === "altin" ? "altin" : (proUye ? "pro" : "musteri");
  // KİŞİYE GÖRE PIRLANTA RENGİ (kullanıcı: mavi ise mavi, kırmızı ise kırmızı, yeşil ise yeşil — HER YERDE profiline göre).
  //   uyeTasAd/Hex(kişi): altın üye=YEŞİL, profesyonel=MAVİ, müşteri=KIRMIZI (uyeTema ile birebir).
  const uyeTasAd = (o) => (o && o.uyelik === "altin") ? "yesil" : (o && (o.pro === true || o.tip === "profesyonel")) ? "mavi" : "kirmizi";
  const uyeTasHex = (o) => TEMA_HEX[uyeTasAd(o)];

  // ================= HİKÂYELER (Stories) =================
  const benimHikayeKisi = { uid: (u && u.uid) || "", ad: (profilBilgi && [profilBilgi.isim, profilBilgi.soyisim].filter(Boolean).join(" ")) || adTam || "Ben", foto: foto || "", amblem: !!foto };
  // localStorage: görülen hikaye id kümesi
  const hikayeGorulenSet = () => {
    if (!hikayeGorulenRef.current) { try { hikayeGorulenRef.current = new Set(JSON.parse(localStorage.getItem("gw_hikaye_gorulen") || "[]")); } catch (e) { hikayeGorulenRef.current = new Set(); } }
    return hikayeGorulenRef.current;
  };
  const hikayeGoruldu = (id) => {
    if (!id) return;
    const s = hikayeGorulenSet(); if (s.has(id)) return;
    s.add(id); try { localStorage.setItem("gw_hikaye_gorulen", JSON.stringify(Array.from(s).slice(-500))); } catch (e) {}
    hikayeGorulduSay(id);
  };
  // Hikâyeleri oku + kişiye göre grupla + "yeni" işaretle (kendi grubun en başta)
  const hikayeleriYukle = async () => {
    const l = await hikayeleriOku(300);
    const gor = hikayeGorulenSet();
    const harita = new Map();
    l.forEach((h) => { if (!harita.has(h.uid)) harita.set(h.uid, { uid: h.uid, ad: h.ad, foto: h.foto, amblem: h.amblem, ogeler: [] }); harita.get(h.uid).ogeler.push(h); });
    const gizli = hikGizliSet(); const benimUid = u && u.uid;
    const gruplar = Array.from(harita.values()).filter((g) => g.uid === benimUid || !gizli.has(g.uid)); // "görme" denenler gizlenir (kendi hariç)
    // Her grubun ögeleri EN SON eklenen BAŞTA (yeni→eski) → kapak = en son hikaye; açınca da en son oynar
    gruplar.forEach((g) => { g.ogeler.sort((a, b) => (b.zamanMs || 0) - (a.zamanMs || 0)); g.yeni = g.ogeler.some((o) => !gor.has(o.id)); });
    const benim = u && u.uid;
    gruplar.sort((a, b) => {
      if (benim) { if (a.uid === benim && b.uid !== benim) return -1; if (b.uid === benim && a.uid !== benim) return 1; }
      if (a.yeni !== b.yeni) return a.yeni ? -1 : 1;
      return (b.ogeler[0].zamanMs || 0) - (a.ogeler[0].zamanMs || 0);
    });
    setHikayeGruplar(gruplar);
  };
  // + ile foto/video seç → HEMEN yüklemez, DÜZENLEYİCİYİ açar (yazı + Gloxoo AI)
  const hikayeSecildi = async (e) => {
    const f = e.target.files && e.target.files[0]; if (e.target) e.target.value = "";
    if (!f || !u) return;
    const video = (f.type || "").indexOf("video") === 0;
    if (video && f.size > 200 * 1024 * 1024) { alert(t("hikayeVideoBuyuk", "Hikâye videosu en fazla 200 MB olmalı.")); return; }
    setHikayeYuk(true);
    try {
      let onizUrl = "";
      if (video) { onizUrl = URL.createObjectURL(f); }
      else { onizUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); }); }
      setHikYazilar([]); setHikSeciliYazi(null); setHikYaziRenk("#ffd700"); setHikAiOneriler([]);
      setHikKonum(null); setHikKonumDurum(""); hikSesKaldir();
      setHikTaslak({ tip: video ? "video" : "foto", url: onizUrl, file: f, poster: "" });
      // CANLI ÇEK ise → konumu OTOMATİK al (nereden çektiysen paylaşımda görünsün)
      const canli = hikCanliRef.current; hikCanliRef.current = false;
      if (canli) { try { hikKonumAl(); } catch (x2) {} }
    } catch (x) {}
    setHikayeYuk(false);
  };
  // Hikâyeye CANLI konum al (paylaşımdaki gibi) — ikinci basış kapatır
  const hikKonumAl = () => {
    if (hikKonum) { setHikKonum(null); setHikKonumDurum(""); return; }
    if (typeof navigator === "undefined" || !navigator.geolocation) { setHikKonumDurum("hata"); return; }
    setHikKonumDurum("aliniyor");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const enlem = pos.coords.latitude, boylam = pos.coords.longitude;
        let yer = "", sehir = "", ulke = "";
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${enlem}&lon=${boylam}&accept-language=${dil}&zoom=18`, { headers: { Accept: "application/json" } });
          if (r.ok) { const d = await r.json(); const a = d.address || {}; yer = d.name || a.amenity || a.aeroway || a.building || a.tourism || a.leisure || a.shop || a.office || a.road || a.neighbourhood || a.suburb || ""; sehir = a.city || a.town || a.village || a.municipality || a.county || a.state || ""; ulke = a.country || ""; }
        } catch (x) {}
        const tam = [yer, sehir, ulke].filter(Boolean).join(", ") || t("konumBulundu", "Konum bulundu");
        setHikKonum({ enlem, boylam, yer, sehir, ulke, tam }); setHikKonumDurum("");
      } catch (e) { setHikKonumDurum("hata"); }
    }, () => setHikKonumDurum("hata"), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  };
  // MÜZİK/SES seç (kendi cihazından) → hikâyeye eklenir, görüntüleyicide çalar
  const hikSesSecildi = (e) => {
    const f = e.target.files && e.target.files[0]; if (e.target) e.target.value = "";
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { alert(t("hikSesBuyuk", "Ses dosyası en fazla 20 MB olmalı.")); return; }
    setHikSes((s) => { if (s && s.url) { try { URL.revokeObjectURL(s.url); } catch (x) {} } return { file: f, ad: f.name || "müzik", url: URL.createObjectURL(f) }; });
  };
  const hikSesKaldir = () => setHikSes((s) => { if (s && s.url) { try { URL.revokeObjectURL(s.url); } catch (x) {} } return null; });
  // Önizleme videosunun O ANKİ karesini yakala (AI için — SİYAH kare sorununu önler; video ekranda oynayıp içerik gösterirken çekilir)
  const canliVideoKare = () => {
    try {
      const v = hikOnizVidRef.current;
      if (!v || !v.videoWidth) return null;
      const w = Math.min(480, v.videoWidth), h = Math.round((v.videoHeight || 480) * w / (v.videoWidth || 480));
      const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(v, 0, 0, w, h);
      return c.toDataURL("image/jpeg", 0.72);
    } catch (e) { return null; }
  };
  // Düzenleyiciyi kapat (medyayı bırak)
  const hikTaslakKapat = () => {
    setHikTaslak((tas) => { if (tas && tas.tip === "video" && tas.url) { try { URL.revokeObjectURL(tas.url); } catch (x) {} } return null; });
    setHikYazilar([]); setHikSeciliYazi(null); setHikAiOneriler([]); setHikPaylasYuk(false); setHikPaylasYuzde(0);
    setHikAiIstek(""); try { if (hikTanimaRef.current) hikTanimaRef.current.stop(); } catch (e) {} setHikMikDinliyor(false);
    setHikKonum(null); setHikKonumDurum(""); hikSesKaldir();
  };
  // "Yazı" hikâyesi başlat (renkli zemin + yazı — Facebook "Aa" gibi)
  const yaziHikayesiBaslat = () => {
    setHikSecimAcik(false);
    const id = "y" + Date.now();
    setHikYazilar([{ id, metin: "", xr: 0.5, yr: 0.5, renk: "#ffffff" }]);
    setHikSeciliYazi(id); setHikYaziRenk("#ffffff"); setHikAiOneriler([]);
    setHikTaslak({ tip: "yazi", url: "", file: null, poster: "", bg1: "#7b3ff2", bg2: "#b14bd8" });
  };
  // Yazı hikâyesini GÖRSELE çevir (zemin + yazılar canvas'a çizilir → foto olarak paylaşılır)
  const yaziHikayeGorseli = () => {
    const W = 1080, H = 1920;
    const c = document.createElement("canvas"); c.width = W; c.height = H; const ctx = c.getContext("2d");
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, (hikTaslak && hikTaslak.bg1) || "#7b3ff2"); g.addColorStop(1, (hikTaslak && hikTaslak.bg2) || "#b14bd8");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 8;
    hikYazilar.forEach((y) => {
      const metin = (y.metin || "").trim(); if (!metin) return;
      ctx.fillStyle = y.renk || "#fff"; const fs = Math.round(W * 0.085 * (y.boyut || 1)); ctx.font = "800 " + fs + "px " + hikFontCss(y.font);
      const maxW = W * 0.86; const kelimeler = metin.split(" "); let satir = ""; const satirlar = [];
      kelimeler.forEach((k) => { const dene = satir ? satir + " " + k : k; if (ctx.measureText(dene).width > maxW && satir) { satirlar.push(satir); satir = k; } else satir = dene; });
      if (satir) satirlar.push(satir);
      const lh = fs * 1.2; const y0 = y.yr * H - (satirlar.length - 1) * lh / 2;
      satirlar.forEach((s, i) => ctx.fillText(s, y.xr * W, y0 + i * lh));
    });
    return c.toDataURL("image/jpeg", 0.9);
  };
  // Yeni YAZI ekle (ortaya koy, seç) — istediğin yere sürükleyebilirsin
  const hikYaziEkle = (metin) => {
    const id = "y" + Date.now() + "_" + Math.round(performance.now());
    const n = hikYazilar.length;
    setHikYazilar((l) => [...l, { id, metin: metin || t("hikYeniYazi", "Yazı"), xr: 0.5, yr: 0.28 + Math.min(0.4, n * 0.12), renk: hikYaziRenk, boyut: 1, font: "sade" }]);
    setHikSeciliYazi(id);
    return id;
  };
  const hikYaziSil = (id) => { setHikYazilar((l) => l.filter((y) => y.id !== id)); setHikSeciliYazi((s) => (s === id ? null : s)); };
  const hikYaziMetin = (id, metin) => setHikYazilar((l) => l.map((y) => (y.id === id ? { ...y, metin } : y)));
  const hikYaziRenkVer = (id, renk) => { setHikYaziRenk(renk); setHikYazilar((l) => l.map((y) => (y.id === id ? { ...y, renk } : y))); };
  const hikYaziBoyut = (id, d) => setHikYazilar((l) => l.map((y) => (y.id === id ? { ...y, boyut: Math.max(0.55, Math.min(2.4, (y.boyut || 1) + d)) } : y)));
  const hikYaziFont = (id, k) => setHikYazilar((l) => l.map((y) => (y.id === id ? { ...y, font: k } : y)));
  // Yazıyı parmakla İSTEDİĞİN YERE sürükle
  const hikYaziSurukleBas = (e, id) => {
    setHikSeciliYazi(id);
    const kutu = hikMedyaRef.current; if (!kutu) return;
    const r = kutu.getBoundingClientRect();
    hikSurukRef.current = { id, r };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) {}
  };
  const hikYaziSurukleHareket = (e) => {
    const s = hikSurukRef.current; if (!s) return;
    const xr = Math.max(0.04, Math.min(0.96, (e.clientX - s.r.left) / s.r.width));
    const yr = Math.max(0.06, Math.min(0.94, (e.clientY - s.r.top) / s.r.height));
    setHikYazilar((l) => l.map((y) => (y.id === s.id ? { ...y, xr, yr } : y)));
  };
  const hikYaziSurukleBit = () => { hikSurukRef.current = null; };
  // PAYLAŞ → medyayı yükle + YAZILAR (yer/renk) ile hikâye ekle
  const hikayeGonder = async () => {
    if (!hikTaslak || !u || hikPaylasYuk) return;
    setHikPaylasYuk(true); setHikPaylasYuzde(0);
    try {
      let url = "";
      const yaziTip = hikTaslak.tip === "yazi";
      let poster = hikTaslak.tip === "video" ? (canliVideoKare() || "") : "";
      if (hikTaslak.tip === "video") url = await videoYukle(hikTaslak.file, u.uid, (p) => setHikPaylasYuzde(p));
      else if (yaziTip) url = await gorselYukle(yaziHikayeGorseli(), u.uid, (p) => setHikPaylasYuzde(p)); // yazı → görsele çevrilir
      else url = await gorselYukle(hikTaslak.url, u.uid, (p) => setHikPaylasYuzde(p));
      // MÜZİK/SES varsa yükle
      let sesUrl = "";
      if (hikSes && hikSes.file) { try { sesUrl = await dosyaYukle(hikSes.file, u.uid, () => {}).then((o) => (o && o.url) || "").catch(() => ""); } catch (x2) {} }
      if (url) {
        // Yazı hikâyesinde yazılar zaten görsele GÖMÜLDÜ → tekrar üste koyma
        const yazilar = yaziTip ? [] : hikYazilar.map((y) => ({ metin: (y.metin || "").trim(), xr: y.xr, yr: y.yr, renk: y.renk, boyut: y.boyut || 1, font: y.font || "sade" })).filter((y) => y.metin);
        await hikayeEkle(benimHikayeKisi, { tip: yaziTip ? "foto" : hikTaslak.tip, url, poster, yazilar, yer: (hikKonum && hikKonum.tam) || "", ses: sesUrl });
        if (hikTaslak.tip === "video" && hikTaslak.url) { try { URL.revokeObjectURL(hikTaslak.url); } catch (x) {} }
        setHikTaslak(null); setHikYazilar([]); setHikSeciliYazi(null); setHikAiOneriler([]); setHikAiIstek("");
        await hikayeleriYukle();
      }
    } catch (x) {}
    setHikPaylasYuk(false); setHikPaylasYuzde(0);
  };
  // Gloxoo'ya SESLE söyle (konuşma → yazı) → hikAiIstek'e yazılır
  const hikMikToggle = () => {
    const RT = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!RT) { alert(t("sesDesteklenmiyor", "Bu cihaz/tarayıcı sesle yazmayı desteklemiyor.")); return; }
    if (hikMikDinliyor && hikTanimaRef.current) { try { hikTanimaRef.current.stop(); } catch (e) {} return; }
    try {
      const r = new RT(); r.lang = ({ tr: "tr-TR", en: "en-US", de: "de-DE", fr: "fr-FR", es: "es-ES", it: "it-IT", pt: "pt-PT", ru: "ru-RU", uk: "uk-UA", ar: "ar-SA", zh: "zh-CN", ja: "ja-JP", hi: "hi-IN" }[dil] || "tr-TR");
      r.interimResults = true; r.continuous = false;
      let taban = hikAiIstek ? hikAiIstek + " " : "";
      r.onresult = (e) => { let s = ""; for (let i = e.resultIndex; i < e.results.length; i++) s += e.results[i][0].transcript; setHikAiIstek((taban + s).replace(/\s+/g, " ").trimStart()); };
      r.onend = () => { setHikMikDinliyor(false); hikTanimaRef.current = null; };
      r.onerror = () => { setHikMikDinliyor(false); hikTanimaRef.current = null; };
      hikTanimaRef.current = r; setHikMikDinliyor(true); r.start();
    } catch (e) { setHikMikDinliyor(false); }
  };
  // GLOXOO'YA SOR → foto/video karesini GÖRÜR, hikâye için kısa üst yazı önerir
  const aiHikayeOner = async () => {
    if (!hikTaslak || hikAiYuk) return;
    setHikAiYuk(true); setHikAiOneriler([]);
    try {
      let gors = "";
      if (hikTaslak.tip === "foto" && (hikTaslak.url || "").indexOf("data:image") === 0) gors = hikTaslak.url;
      else if (hikTaslak.tip === "video") gors = canliVideoKare() || hikTaslak.poster || (await videoKareYakala(hikTaslak.url)); // CANLI kare → siyah değil
      const parcalar = [];
      if (gors) { const vir = gors.indexOf(","); const mt = (gors.match(/data:(image\/[a-z0-9.+-]+)/i) || [])[1] || "image/jpeg"; if (vir > 0) parcalar.push({ type: "image", source: { type: "base64", media_type: mt, data: gors.slice(vir + 1) } }); }
      const dilAd = { tr: "Türkçe", en: "İngilizce (English)", de: "Almanca (Deutsch)", fr: "Fransızca (Français)", es: "İspanyolca (Español)", it: "İtalyanca (Italiano)", pt: "Portekizce (Português)", ru: "Rusça (Русский)", uk: "Ukraynaca (Українська)", ar: "Arapça (العربية)", zh: "Çince (中文)", ja: "Japonca (日本語)", hi: "Hintçe (हिन्दी)" }[dil] || "Türkçe";
      const istek = (hikAiIstek || "").trim();
      const konum = (hikKonum && hikKonum.tam) || (profilBilgi && profilBilgi.konum && [profilBilgi.konum.ilce, profilBilgi.konum.sehir, profilBilgi.konum.ulke].filter(Boolean).join(", ")) || "";
      const uzunluk = istek
        ? "Kullanıcı ne istediğini anlattığı için 3 farklı, DAHA DOLU ve UZUN yazı ver (her biri 1-3 cümle olabilir); onun anlattığını tam yansıt, sıcak ve renkli olsun."
        : "3 farklı KISA ve çarpıcı öneri ver (her biri 1 satır, 2-6 kelime).";
      const talimat = `Bu bir HİKÂYE (24 saatte kaybolan paylaşım). ${hikTaslak.tip === "video" ? "Ekteki görsel VİDEODAN alınmış bir karedir; videoda ne olduğunu bu kareden anla. " : ""}${gors ? "Görsele DİKKATLİCE bak: içinde ne/kim/nerede/ne oluyor gör; SADECE gördüğüne dayanarak yaz (uydurma/klişe YOK). " : ""}${konum ? "Kullanıcının konumu: " + konum + " (uygunsa yeri doğal bir dille yansıt). " : ""}${istek ? 'KULLANICININ ANLATTIĞI (ne yazmak istediğini kendisi söyledi): "' + istek + '" — MUTLAKA buna göre, tam bunu anlatan yaz; ASLA konu dışı/saçma yazma. ' : ""}Bu içerik için hikâye yazısı olarak ${uzunluk} Her birine 1-3 uygun emoji serpiştir; canlı, sıcak, davet edici olsun. ${dilAd} dilinde yaz. Önerileri ||| (üç dik çizgi) ile ayır; numara/tırnak/madde işareti KOYMA.`;
      parcalar.push({ type: "text", text: talimat });
      const mesajlar = parcalar.length > 1 ? [{ role: "user", content: parcalar }] : [{ role: "user", content: talimat }];
      const r = await fetch(AI_KOPRU, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mesajlar, sistem: "Sen Gloxoo'sun — GLOXORG luks profesyonel sosyal platformun asistani. Ekte gorsel/video karesi varsa DIKKATLICE BAK ve SADECE gordugune dayanarak yaz. Kullanici ne istedigini yazmissa MUTLAKA ona gore, konuya UYGUN yaz; ASLA 'bilmiyorum' deme, sacma/alakasiz konusma. Kullanici anlatmissa daha DOLU ve UZUN (1-3 cumle) yazabilirsin; yoksa kisa (2-6 kelime). Emoji serpistir. Istenen dilde yaz; onerileri ||| ile ayir." }) });
      if (r.ok) { const veri = await r.json(); const txt = (veri && veri.metin) || ""; const ham = txt.indexOf("|||") >= 0 ? txt.split("|||") : txt.split("\n"); const satirlar = ham.map((s) => s.replace(/^["'\d.)\-•*\s]+/, "").replace(/["']+$/, "").trim()).filter((s) => s.length > 1).slice(0, 3); if (satirlar.length) setHikAiOneriler(satirlar); }
    } catch (e) {}
    setHikAiYuk(false);
  };
  // Görüntüleyici: grup aç / gez / kapat
  const hikayeAc = (gi) => { if (!hikayeGruplar[gi]) return; setHikayeIlerle(0); setHikayeAcik({ gi, oi: 0 }); };
  const hikayeKapat = () => { setHikayeAcik(null); setHikayeIlerle(0); hikayeleriYukle(); };
  const hikayeGec = (yon) => {
    setHikayeAcik((h) => {
      if (!h) return h;
      const grup = hikayeGruplar[h.gi]; if (!grup) return null;
      let oi = h.oi + yon;
      if (oi >= 0 && oi < grup.ogeler.length) { setHikayeIlerle(0); return { gi: h.gi, oi }; }
      // grup bitti → sonraki/önceki grup
      let gi = h.gi + yon;
      while (gi >= 0 && gi < hikayeGruplar.length && (!hikayeGruplar[gi].ogeler || !hikayeGruplar[gi].ogeler.length)) gi += yon;
      if (gi < 0 || gi >= hikayeGruplar.length) { setHikayeIlerle(0); return null; } // hepsi bitti → kapat
      setHikayeIlerle(0);
      return { gi, oi: yon > 0 ? 0 : hikayeGruplar[gi].ogeler.length - 1 };
    });
  };
  const hikayemSil = async (id) => { if (!id) return; if (!window.confirm(t("hikayeSilSor", "Bu hikâyeyi silmek istiyor musun?"))) return; await hikayeSil(id); setHikayeAcik(null); hikayeleriYukle(); };
  // ⋯ menü — görüntüleyicideki seçenekler
  const hikToast = (m) => { setHikBildiri(m); setTimeout(() => setHikBildiri(""), 1900); };
  // HİKÂYEYE MESAJ GÖNDER (Facebook gibi alt kutu) — hikâye sahibine mesaj + bildirim
  const hikMesajGonder = (grup) => {
    const uu = auth.currentUser;
    if (!uu || !grup || !grup.uid || !hikMesajYazi.trim()) return;
    const metin = hikMesajYazi.trim().slice(0, 500);
    mesajGonder({ aliciUid: grup.uid, aliciAd: grup.ad || "", metin, gonderen: { uid: uu.uid, ad: benimAdGetir(), foto: benimFotoGetir() } }).catch(() => {});
    bildirimEkle({ aliciUid: grup.uid, gonderenUid: uu.uid, gonderenAd: benimAdGetir(), gonderenFoto: benimFotoGetir(), tip: "mesaj", metin }).catch(() => {});
    setHikMesajYazi(""); hikToast(t("hikMesajGonderildi", "Mesajın gönderildi ✓"));
  };
  // HİKÂYEYE TEPKİ GÖNDER — sahibine bildirim (❤️👍😂...)
  const hikTepkiGonder = (grup, tepkiKey) => {
    const uu = auth.currentUser;
    if (!uu || !grup || !grup.uid) return;
    bildirimEkle({ aliciUid: grup.uid, gonderenUid: uu.uid, gonderenAd: benimAdGetir(), gonderenFoto: benimFotoGetir(), tip: "hikaye-tepki", metin: tepkiEmoji(tepkiKey) }).catch(() => {});
    hikToast(tepkiEmoji(tepkiKey) + " " + t("hikTepkiGonderildi", "gönderildi"));
  };
  const hikGizliSet = () => { if (!hikGizliRef.current) { try { hikGizliRef.current = new Set(JSON.parse(localStorage.getItem("gw_hikaye_gizli") || "[]")); } catch (e) { hikGizliRef.current = new Set(); } } return hikGizliRef.current; };
  const hikMenuKapat = (devam) => { setHikMenuAcik(false); hikMenuAcikRef.current = false; if (devam) { hikDuraklaRef.current = false; setHikayeDurdu(false); } };
  const hikKisiGizle = (uid) => { const s = hikGizliSet(); s.add(uid); try { localStorage.setItem("gw_hikaye_gizli", JSON.stringify(Array.from(s))); } catch (e) {} hikMenuKapat(false); setHikayeAcik(null); hikayeleriYukle(); hikToast(t("hikGizlendi", "Tamam, bu kişinin hikâyelerini artık göstermeyeceğiz.")); };
  const hikBaglantiKopyala = () => { try { navigator.clipboard.writeText("https://gloxorg.com"); } catch (e) {} hikMenuKapat(true); hikToast(t("baglantiKopyalandi", "Bağlantı kopyalandı")); };
  // DOKUN = DURDUR/DEVAM (aynı yere tekrar dokun); PARMAKLA KAYDIR = hikaye değiştir (sola=sonraki, sağa=önceki)
  const hikDurdurAc = () => {
    const yeni = !hikDuraklaRef.current;
    hikDuraklaRef.current = yeni; setHikayeDurdu(yeni);
    const v = hikVidRef.current; if (v) { try { yeni ? v.pause() : v.play(); } catch (_) {} }
    const s = hikSesRef.current; if (s) { try { yeni ? s.pause() : s.play(); } catch (_) {} }
  };
  const hikBas = (e) => { hikBasRef.current.x = e.clientX; hikBasRef.current.y = e.clientY; };
  const hikBit = (e) => {
    const dx = e.clientX - hikBasRef.current.x, dy = e.clientY - hikBasRef.current.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { // KAYDIRMA → hikaye değiştir
      hikDuraklaRef.current = false; setHikayeDurdu(false);
      hikayeGec(dx < 0 ? 1 : -1); // sola kaydır = sonraki, sağa kaydır = önceki
      return;
    }
    hikDurdurAc(); // KISA DOKUNUŞ = durdur / devam
  };
  // Giriş yapınca hikâyeleri yükle (+ 3 dk'da bir tazele)
  useEffect(() => {
    if (!u) { setHikayeGruplar([]); return; }
    hikayeleriYukle();
    const z = setInterval(() => { if (!hikayeAcik) hikayeleriYukle(); }, 180000);
    return () => clearInterval(z);
  }, [u]); // eslint-disable-line react-hooks/exhaustive-deps
  // Görüntüleyici açıkken: aktif hikâyeyi görüldü işaretle + FOTO ise 5 sn'de otomatik ilerle
  useEffect(() => {
    if (!hikayeAcik) return;
    const grup = hikayeGruplar[hikayeAcik.gi]; const oge = grup && grup.ogeler[hikayeAcik.oi];
    if (!oge) { setHikayeAcik(null); return; }
    hikayeGoruldu(oge.id);
    hikDuraklaRef.current = false; setHikayeDurdu(false); // yeni öge → duraklamayı sıfırla
    const onceki = document.body.style.overflow; document.body.style.overflow = "hidden";
    let raf, sil = false;
    if (oge.tip !== "video") {
      const sure = 7000; let gecen = 0, sonT = Date.now();
      const tik = () => {
        if (sil) return;
        const simdi = Date.now();
        if (!hikDuraklaRef.current) gecen += simdi - sonT; // BASILI TUTULUNCA süre işlemez
        sonT = simdi;
        const g = Math.min(100, (gecen / sure) * 100); setHikayeIlerle(g);
        if (g >= 100) { hikayeGec(1); return; }
        raf = requestAnimationFrame(tik);
      };
      raf = requestAnimationFrame(tik);
    }
    return () => { sil = true; if (raf) cancelAnimationFrame(raf); document.body.style.overflow = onceki; };
  }, [hikayeAcik]); // eslint-disable-line react-hooks/exhaustive-deps
  // KENDİ taşımın rengi (üstbar/nav/profil penceresi) — kendi temama göre.
  const benimTasAd = uyeTema === "altin" ? "yesil" : uyeTema === "pro" ? "mavi" : "kirmizi";
  const benimTasHex = TEMA_HEX[benimTasAd];
  const uyeZemin = uyeTema === "altin" ? yesilZemin : uyeTema === "pro" ? maviZemin : yakutZemin;
  const uyeWordmark = uyeTema === "musteri" ? gloxWordmarkKirmizi : uyeTema === "pro" ? gloxWordmarkMavi : gloxWordmarkYesil; // müşteri=kırmızı blok; pro=mavi harfler; altın=yeşil harfler (banner'dan kesildi)
  // ÜSTBAR ÇERÇEVESİ üyeye göre AYRI: pro=mavi banner işlemeli çerçeve, altın=yeşil banner işlemeli çerçeve, müşteri=eski çerçeve
  const uyeCerceveStyle = uyeTema === "pro"
    ? { borderWidth: "17px 16px", borderImage: `url(${proCerceveResim}) 71 74 57 74 / 17px 16px / 0 stretch` }
    : uyeTema === "altin"
    ? { borderWidth: "18px 17px", borderImage: `url(${yesilCerceveResim}) 88 97 87 97 / 18px 17px / 0 stretch` }
    : { borderWidth: "15px 14px", borderImage: `url(${cerceveResim}) 91 85 96 86 / 15px 14px / 0 stretch` };
  // PROFİL çerçevesi ÜYEYE göre: müşteri=KIRMIZI(yakut), pro=MAVİ(safir), altın=YEŞİL(zümrüt) — ortası o rengin taşı, halka beyaz pırlanta+altın
  const uyeProfilCerceve = uyeTema === "altin" ? profilCerceveYesilResim : uyeTema === "pro" ? profilCerceveMaviResim : profilCerceveResim;
  // AYI (Ekspert) düğmesi: PRO'da profil mavi olduğu için ayı MOR (farklı renk, profile benzemesin); müşteri/altın=mavi
  const uyeAyiCerceve = uyeTema === "pro" ? ayiCervevoProResim : ayiCerceveResim;
  // ÇOKLU meslek: pro.meslekler (dizi) ana kaynak; geriye uyum için pro.meslek = ilk meslek.
  // pro.meslekler ANA kaynak; yoksa pro.meslek; yoksa ÜST düzey meslekler/meslek (eski ayarMeslekSec kayıtları için geriye uyum)
  const proMeslekDizi = (profilBilgi && profilBilgi.pro && Array.isArray(profilBilgi.pro.meslekler) && profilBilgi.pro.meslekler.length)
    ? profilBilgi.pro.meslekler
    : ((profilBilgi && profilBilgi.pro && profilBilgi.pro.meslek) ? [profilBilgi.pro.meslek]
    : ((profilBilgi && Array.isArray(profilBilgi.meslekler) && profilBilgi.meslekler.length) ? profilBilgi.meslekler
    : ((profilBilgi && profilBilgi.meslek) ? [profilBilgi.meslek] : [])));
  // Profilde/paylaşımda görünen meslek = YILDIZLI ana meslek (pro.meslek); yoksa ilk seçili. (Sonradan eklenip yıldızlanan meslek de doğru çıkar.)
  const anaMeslekStar = (profilBilgi && profilBilgi.pro && profilBilgi.pro.meslek) || (profilBilgi && profilBilgi.meslek) || "";
  const meslekAd = (anaMeslekStar && proMeslekDizi.includes(anaMeslekStar)) ? anaMeslekStar : (proMeslekDizi[0] || anaMeslekStar || "");
  const konumYazi = (profilBilgi && profilBilgi.konum) ? [profilBilgi.konum.sehir, profilBilgi.konum.ulke].filter(Boolean).join(", ") : "";
  // ================= KİŞİYE ÖZEL AKIŞ (Gloxoo algoritması) =================
  // Akışı; TAKİP + BEĞENDİĞİN KİŞİLER + MESLEĞİN + ŞEHRİN + ETKİLEŞİM + TAZELİK'e göre puanlayıp sıralar.
  const kisiselAkis = useMemo(() => {
    if (!gercekAkis || gercekAkis.length < 2) return gercekAkis || [];
    const benimUid = u && u.uid;
    const benMeslekler = new Set((proMeslekDizi || []).map((m) => (m || "").toLowerCase()).filter(Boolean));
    const ilgiSehirler = new Set([
      (profilBilgi && profilBilgi.konum && profilBilgi.konum.sehir) || "",
      ...((profilBilgi && Array.isArray(profilBilgi.haberKonumlari) ? profilBilgi.haberKonumlari : []).map((h) => h.sehir || "")),
    ].map((x) => (x || "").toLowerCase()).filter(Boolean));
    // beğendiğim gönderilerin SAHİPLERİ (yakınlık — onların yeni gönderileri de üstte)
    const yakinSahip = new Set();
    gercekAkis.forEach((p) => { if (begeniSet && begeniSet.has(p.id)) { const h = p.uid || p.sahipUid; if (h) yakinSahip.add(h); } });
    const simdi = Date.now();
    const puan = (p) => {
      let s = 0; const h = p.uid || p.sahipUid;
      const yasSaat = Math.max(0, (simdi - (p.zamanMs || simdi)) / 3600000);
      s += Math.max(0, 60 - yasSaat * 0.8);                 // TAZELİK (yeni gönderi üstte)
      if (h && takipSet && takipSet.has(h)) s += 55;         // TAKİP ettiklerim
      if (h && yakinSahip.has(h)) s += 30;                   // BEĞENDİĞİM kişiler
      if (benimUid && h === benimUid) s += 8;                // kendi gönderim
      const meslek = ((p.meslek || (p.pro && p.pro.meslek) || "") + "").toLowerCase();
      if (meslek && benMeslekler.has(meslek)) s += 22;       // MESLEĞİME uygun
      const psehir = (((p.konum && p.konum.sehir) || p.sehir || "") + "").toLowerCase();
      if (psehir && ilgiSehirler.has(psehir)) s += 12;       // ŞEHRİM/ilgi yerim
      const etk = (Number(p.begeni) || 0) + (Number(p.yorumSayisi) || 0) * 1.5;
      s += Math.min(20, Math.log2(1 + etk) * 4);             // ETKİLEŞİM (popüler)
      return s;
    };
    return [...gercekAkis].map((p) => ({ p, s: puan(p) })).sort((a, b) => b.s - a.s).map((x) => x.p);
  }, [gercekAkis, takipSet, begeniSet, profilBilgi, proMeslekDizi, u]); // eslint-disable-line react-hooks/exhaustive-deps
  // REELS listesi — akıştaki VİDEOLU gönderiler (tekli video veya medyalar içinde video), yeniden eskiye.
  const reelListesi = useMemo(() => {
    // NOT: videoSade'yi BURADA çağırma — o const bu satırdan SONRA tanımlı (TDZ hatası sayfayı çökertir).
    // Ham URL'i sakla; videoSade'yi render'da (<video src>) uygula.
    const kaynak = gercekAkis || [];
    const cikar = (p) => {
      if (p.video) return { ...p, _reelVideo: p.video, _reelPoster: p.videoPoster || "" };
      const m = Array.isArray(p.medyalar) ? p.medyalar.find((x) => x.tip === "video" && x.url) : null;
      if (m) return { ...p, _reelVideo: m.url, _reelPoster: m.poster || "" };
      return null;
    };
    return kaynak.map(cikar).filter(Boolean);
  }, [gercekAkis]);
  const editorFotoInputRef = useRef(null); // düzenleyici açıkken foto ekle/değiştir
  // ÇOK KATMANLI düzenleyici: SINIRSIZ fotoğraf + SINIRSIZ yazı satırı; her biri ayrı taşınır/ayarlanır.
  //   foto katmanı: { tip:'foto', img, x, y, scale, rot, parlak, kontrast, gri }
  //   yazı katmanı: { tip:'yazi', metin, x, y, boy, renk, font, rot }
  const [katmanlar, setKatmanlar] = useState([]);
  const [secili, setSecili] = useState(-1);        // seçili katman index (-1=yok)
  const [zeminRenk, setZeminRenk] = useState("#16223e"); // amblem/zemin rengi
  const [editorFotoVar, setEditorFotoVar] = useState(false); // düzenleyicide foto var mı (yoksa amblem modu)
  const [, setFontTik] = useState(0); // yazı tipi yüklenince önizlemeyi tazele
  const onizRef = useRef(null);
  const surukRef = useRef(null);
  // Şekil: amblem(is) = YATAY DÖRTGEN (tabela gibi, geniş+kısa), profil/galeri = yuvarlak.
  const sekil = duzenHedef === "is" ? "yatay" : duzenHedef === "paylas" ? "post" : "yuvarlak";
  const ONIZ_W = sekil === "yatay" ? 258 : sekil === "post" ? postOlcu.w : 196;
  const ONIZ_H = sekil === "yatay" ? 132 : sekil === "post" ? postOlcu.h : 196;
  const aktifK = (secili >= 0 && katmanlar[secili]) ? katmanlar[secili] : null;
  const kGuncelle = (yama) => setKatmanlar((ks) => ks.map((k, i) => (i === secili ? { ...k, ...yama } : k)));
  const yeniFoto = (img, ilk, n) => ({ tip: "foto", img, x: ilk ? 0 : 14 + (n || 0) * 12, y: ilk ? 0 : 14 + (n || 0) * 12, scale: ilk ? 1 : 0.55, rot: 0, parlak: 1, kontrast: 1, gri: 0 });
  const yeniYazi = (metin, n) => ({ tip: "yazi", metin: metin || "Yazı", x: 0, y: (n || 0) * 26, boy: 1.3, renk: "#ffffff", font: "Playfair Display", rot: 0 });
  // Şekil yolu (kırpma): yuvarlak daire / yatay yuvarlak köşeli dörtgen
  function sekilYol(ctx, bw, bh) {
    ctx.beginPath();
    if (sekil === "post") {
      ctx.rect(0, 0, bw, bh); // PAYLAŞIM editörü: DÜZ kenar (oval/yuvarlak değil) — fotoğrafın tam ebadı
    } else if (sekil === "yatay") {
      const r = Math.min(bw, bh) * 0.13;
      ctx.moveTo(r, 0); ctx.lineTo(bw - r, 0); ctx.arcTo(bw, 0, bw, r, r);
      ctx.lineTo(bw, bh - r); ctx.arcTo(bw, bh, bw - r, bh, r);
      ctx.lineTo(r, bh); ctx.arcTo(0, bh, 0, bh - r, r);
      ctx.lineTo(0, r); ctx.arcTo(0, 0, r, 0, r); ctx.closePath();
    } else {
      // PROFİL/galeri: DÜZ KARE kırpma (daire DEĞİL) — fotoğraf kareyi TAM doldurur, köşeler boş kalmaz.
      // Yuvarlak köşe görünümü gösterimde CSS ile gelir (her yerde kare foto). (kullanıcı: kare içinde yuvarlak kesilmesin)
      ctx.rect(0, 0, bw, bh);
    }
  }
  const yaziPx = (kat, bw, bh) => Math.min(bw, bh) * 0.16 * (kat.boy || 1); // yazı punto
  // Tek çizim fonksiyonu — hem önizleme hem kayıt. olcek=1 önizleme, >1 kayıt.
  const fotoCiz = (canvas, olcek, secimGoster) => {
    if (!canvas) return;
    const bw = Math.round(ONIZ_W * olcek), bh = Math.round(ONIZ_H * olcek);
    const ctx = canvas.getContext("2d"); canvas.width = bw; canvas.height = bh;
    ctx.clearRect(0, 0, bw, bh);
    const k = olcek; // katman koordinatları ÖNİZ uzayında; ölçekle çarpılır
    ctx.save();
    sekilYol(ctx, bw, bh); ctx.clip();
    // ZEMİN — her zaman (foto boşluklarını kapatır, amblemde ana renk)
    const g = ctx.createRadialGradient(bw / 2, bh * 0.4, bh * 0.08, bw / 2, bh / 2, Math.max(bw, bh) * 0.72);
    g.addColorStop(0, zeminRenk); g.addColorStop(1, "#0a0f1e");
    ctx.fillStyle = g; ctx.fillRect(0, 0, bw, bh);
    // KATMANLAR — sırayla (alttan üste): foto veya yazı
    katmanlar.forEach((kat) => {
      ctx.save();
      ctx.translate(bw / 2 + kat.x * k, bh / 2 + kat.y * k);
      ctx.rotate((kat.rot || 0) * Math.PI / 180);
      if (kat.tip === "yazi") {
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const _maxW = bw * 0.92, _maxH = bh * 0.94;
        // verilen font boyutunda kelime kelime sar
        const sarUret = (fs) => {
          ctx.font = "700 " + fs + "px '" + kat.font + "',serif";
          const sat = []; let l = "";
          String(kat.metin || "").split(/\s+/).forEach((w) => { const d = l ? l + " " + w : w; if (ctx.measureText(d).width > _maxW && l) { sat.push(l); l = w; } else l = d; });
          if (l) sat.push(l); return sat;
        };
        let _fs = yaziPx(kat, bw, bh);
        let _satir = sarUret(_fs);
        // AUTO-SIĞDIR: uzun yazı kutuyu aşarsa fontu küçült → TÜM yazı sığar (kesilmez)
        for (let g = 0; g < 16 && _satir.length * _fs * 1.18 > _maxH && _fs > 7; g++) { _fs *= 0.9; _satir = sarUret(_fs); }
        ctx.font = "700 " + _fs + "px '" + kat.font + "',serif";
        ctx.lineWidth = _fs * 0.12; ctx.strokeStyle = "rgba(0,0,0,.55)"; ctx.fillStyle = kat.renk;
        const _lh = _fs * 1.18, _by = -(_satir.length - 1) * _lh / 2;
        _satir.forEach((s, li) => { const yy = _by + li * _lh; ctx.strokeText(s, 0, yy); ctx.fillText(s, 0, yy); });
      } else if (kat.img) {
        const im = kat.img;
        const taban = Math.max(bw, bh) / Math.min(im.width, im.height);
        const s = taban * kat.scale, w = im.width * s, h = im.height * s;
        ctx.filter = "brightness(" + kat.parlak + ") contrast(" + kat.kontrast + ") grayscale(" + kat.gri + ")";
        ctx.drawImage(im, -w / 2, -h / 2, w, h);
      }
      ctx.restore();
    });
    ctx.restore();
    // SEÇİLİ katman çerçevesi (sadece önizleme) — hangisini taşıdığın belli olsun
    if (secimGoster && aktifK) {
      ctx.save();
      ctx.translate(bw / 2 + aktifK.x * k, bh / 2 + aktifK.y * k);
      ctx.rotate((aktifK.rot || 0) * Math.PI / 180);
      ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      if (aktifK.tip === "yazi") {
        ctx.font = "700 " + yaziPx(aktifK, bw, bh) + "px '" + aktifK.font + "',serif";
        const w = ctx.measureText(aktifK.metin || " ").width + 14 * k, h = yaziPx(aktifK, bw, bh) * 1.4;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
      } else if (aktifK.img) {
        const im = aktifK.img, taban = Math.max(bw, bh) / Math.min(im.width, im.height);
        const s = taban * aktifK.scale, w = im.width * s, h = im.height * s;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
      }
      ctx.restore();
    }
  };
  useEffect(() => { if (duzenAcik && onizRef.current) fotoCiz(onizRef.current, 1, true); }); // her değişimde önizle
  // Dokunulan noktadaki EN ÜST katmanı bul (kabaca) — parmakla tutup taşımak için
  const katmanBul = (lx, ly) => {
    for (let i = katmanlar.length - 1; i >= 0; i--) {
      const kat = katmanlar[i]; let w, h;
      if (kat.tip === "yazi") { w = (String(kat.metin).length || 1) * yaziPx(kat, ONIZ_W, ONIZ_H) * 0.62; h = yaziPx(kat, ONIZ_W, ONIZ_H) * 1.4; }
      else if (kat.img) { const taban = Math.max(ONIZ_W, ONIZ_H) / Math.min(kat.img.width, kat.img.height); const s = taban * kat.scale; w = kat.img.width * s; h = kat.img.height * s; }
      else continue;
      const cx = ONIZ_W / 2 + kat.x, cy = ONIZ_H / 2 + kat.y;
      if (Math.abs(lx - cx) <= w / 2 + 6 && Math.abs(ly - cy) <= h / 2 + 6) return i;
    }
    return -1;
  };
  const duzenSurukBas = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const olc = ONIZ_W / rect.width;
    const lx = (e.clientX - rect.left) * olc, ly = (e.clientY - rect.top) * olc;
    // Önizlemeye/öğeye dokununca klavyeyi KAPAT (sadece yazı kutusu klavye açsın, başka yer değil)
    try { if (document.activeElement && document.activeElement.blur && document.activeElement.tagName === "INPUT") document.activeElement.blur(); } catch (er) {}
    let idx = katmanBul(lx, ly);
    if (idx < 0) idx = secili;            // dokunulan katman yoksa seçili olanı taşı
    if (idx >= 0 && idx !== secili) setSecili(idx);
    const kat = katmanlar[idx];
    surukRef.current = { x: e.clientX, y: e.clientY, kx: kat ? kat.x : 0, ky: kat ? kat.y : 0, idx, olc };
    try { e.target.setPointerCapture(e.pointerId); } catch (er) {}
  };
  const duzenSurukHar = (e) => {
    const b = surukRef.current; if (!b || b.idx < 0) return;
    const dx = (e.clientX - b.x) * b.olc, dy = (e.clientY - b.y) * b.olc;
    setKatmanlar((ks) => ks.map((k, i) => (i === b.idx ? { ...k, x: b.kx + dx, y: b.ky + dy } : k)));
  };
  const duzenSurukBit = () => { surukRef.current = null; };
  // Katman ekle/sil/seç
  const katmanFotoEkle = (img) => { setSecili(katmanlar.length); setKatmanlar((ks) => [...ks, yeniFoto(img, ks.length === 0, ks.length)]); setEditorFotoVar(true); };
  const yaziEkle = () => { setSecili(katmanlar.length); setKatmanlar((ks) => [...ks, yeniYazi("Yazı", ks.filter((x) => x.tip === "yazi").length)]); };
  const katmanSil = (i) => { setKatmanlar((ks) => ks.filter((_, j) => j !== i)); setSecili((s) => (s >= i ? s - 1 : s)); };
  // Yazı tipi seç (seçili yazı katmanına) + fontu YÜKLE, sonra önizlemeyi tazele
  const yaziTipiSec = (f) => { kGuncelle({ font: f }); try { if (document.fonts && document.fonts.load) document.fonts.load("700 40px '" + f + "'").then(() => setFontTik((x) => x + 1)).catch(() => {}); } catch (e) {} };
  // --- KATMAN HAFIZASI: kaydederken katmanları (yazı + fotoğraflar + konum) sakla; düzenlerken AYNEN geri yükle.
  //     Müşteri kaldığı yerden devam eder; ayarlar sıfırlanmaz. (foto img -> küçültülmüş dataURL olarak saklanır)
  const imgKucult = (img, max) => {
    try { const c = document.createElement("canvas"); const r = Math.min(1, max / Math.max(img.width, img.height)); c.width = Math.max(1, Math.round(img.width * r)); c.height = Math.max(1, Math.round(img.height * r)); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.82); } catch (e) { return ""; }
  };
  // GLOXORG FİLİGRANI — foto'ya KALICI göm (indirince/paylaşınca/WhatsApp'ta KAYBOLMAZ). Sağ-alta konturlu+gölgeli "◈ GLOXORG".
  const fotoFiligranla = (dataURL) => new Promise((resolve) => {
    if (!dataURL || dataURL.indexOf("data:image") !== 0) { resolve(dataURL); return; }
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
          const x = c.getContext("2d"); x.drawImage(img, 0, 0);
          const fs = Math.max(15, Math.round(Math.min(c.width, c.height) * 0.045)); // ölçeğe göre
          const pad = Math.round(fs * 0.7); const metin = "◈ GLOXORG";
          x.font = "700 " + fs + "px Georgia, 'Times New Roman', serif";
          x.textAlign = "right"; x.textBaseline = "bottom";
          x.shadowColor = "rgba(0,0,0,.75)"; x.shadowBlur = Math.round(fs * 0.35); x.shadowOffsetY = 1;
          x.lineWidth = Math.max(2, fs * 0.14); x.strokeStyle = "rgba(0,0,0,.55)";
          x.strokeText(metin, c.width - pad, c.height - pad);
          x.shadowColor = "transparent";
          x.fillStyle = "rgba(255,215,0,.95)"; // altın
          x.fillText(metin, c.width - pad, c.height - pad);
          resolve(c.toDataURL("image/jpeg", 0.85));
        } catch (e) { resolve(dataURL); }
      };
      img.onerror = () => resolve(dataURL);
      img.src = dataURL;
    } catch (e) { resolve(dataURL); }
  });
  // VİDEO URL SADELEŞTİR — Cloudinary video overlay (l_text:...GLOXORG...) dönüşümünü ÇIKAR → ORİJİNAL video servis edilir.
  // Neden: video dönüşümü Cloudinary'de türev dosya üretip kredi/depolama yakıyordu (ücretsiz kota aşımı). Hem yeni kayıtta hem
  // eski videoların gösteriminde uygulanır → mevcut videolar da orijinal (dönüşümsüz) oynar, kredi harcanmaz.
  const videoSade = (url) => {
    try { return (url || "").replace(/\/upload\/l_text:[^/]*\//, "/upload/"); } catch (e) { return url || ""; }
  };
  // AI yazısına kısa MARKALI tanıtım imzası (ikonlu; içeriğe/rastgele göre) — kabul edilen yazının sonuna eklenir
  const markaImza = () => {
    const havuz = [
      "✨ GloxorgLife · gloxorg.com",
      "💎 gloxorg.com",
      "🌍 gloxoo.com'da buluşalım",
      "🤖 " + t("gloxooYazdi", "Bu yazı Gloxoo yapay zekâsı tarafından yazıldı"),
    ];
    return havuz[Math.floor(Math.random() * havuz.length)];
  };
  const katmanSerile = (ks) => ks.map((k) => (k.tip === "yazi"
    ? { tip: "yazi", metin: k.metin, x: k.x, y: k.y, boy: k.boy, renk: k.renk, font: k.font, rot: k.rot || 0 }
    : { tip: "foto", src: imgKucult(k.img, 420), x: k.x, y: k.y, scale: k.scale, rot: k.rot || 0, parlak: k.parlak, kontrast: k.kontrast, gri: k.gri })).filter((k) => k.tip === "yazi" || k.src);
  const katmanYukle = (seri, cb) => {
    if (!seri || !seri.length) { cb([]); return; }
    const sonuc = new Array(seri.length); let kalan = seri.length;
    const bitir = () => { if (--kalan === 0) cb(sonuc.filter(Boolean)); };
    seri.forEach((s, i) => {
      if (s.tip === "yazi") { sonuc[i] = { ...s, rot: s.rot || 0 }; bitir(); }
      else { const im = new Image(); im.onload = () => { sonuc[i] = { tip: "foto", img: im, x: s.x, y: s.y, scale: s.scale, rot: s.rot || 0, parlak: s.parlak, kontrast: s.kontrast, gri: s.gri }; bitir(); }; im.onerror = () => { sonuc[i] = null; bitir(); }; im.src = s.src; }
    });
  };
  // Saklı düzeni AÇ (varsa) — yoksa düz fotoğrafı tek katman yap
  const duzenAc = (hedef, duzenVeri, duzFoto) => {
    setDuzenHedef(hedef);
    if (duzenVeri && Array.isArray(duzenVeri.kat) && duzenVeri.kat.length) {
      setZeminRenk(duzenVeri.zemin || "#16223e");
      katmanYukle(duzenVeri.kat, (ks) => { setKatmanlar(ks); setSecili(ks.length ? 0 : -1); setEditorFotoVar(ks.some((k) => k.tip === "foto")); setDuzenAcik(true); });
    } else if (duzFoto) {
      const img = new Image();
      img.onload = () => { setKatmanlar([yeniFoto(img, true)]); setSecili(0); setEditorFotoVar(true); setDuzenAcik(true); };
      img.onerror = () => { setKatmanlar([]); setSecili(-1); setDuzenAcik(true); };
      img.src = duzFoto;
    } else { setKatmanlar([]); setSecili(-1); setDuzenAcik(true); }
  };
  // PAYLAŞIM editörünü aç — çerçeve FOTOĞRAFIN oranına göre açılır (yataysa yatay, dikeyse dikey)
  const paylasEditorAc = () => {
    const ayarla = (w, h) => { const r = Math.min(250 / w, 320 / h, 1) || 1; setPostOlcu({ w: Math.max(130, Math.round(w * r)), h: Math.max(130, Math.round(h * r)) }); };
    if (paylasDuzen && paylasDuzen.olcu) { setPostOlcu(paylasDuzen.olcu); duzenAc("paylas", paylasDuzen, ""); return; }
    if (paylasGorsel) {
      const img = new Image();
      img.onload = () => { ayarla(img.width, img.height); duzenAc("paylas", paylasDuzen, paylasGorsel); };
      img.onerror = () => { setPostOlcu({ w: 208, h: 260 }); duzenAc("paylas", paylasDuzen, paylasGorsel); };
      img.src = paylasGorsel;
    } else { setPostOlcu({ w: 208, h: 260 }); duzenAc("paylas", null, ""); }
  };
  // YAZI ŞERİDİ EDİTÖRÜ — yazılı gönderi için (fotoğraf editörü gibi: zemin + SINIRSIZ yazı şeridi, parmakla taşı)
  const yaziEditorAc = () => {
    if (paylasDuzen && paylasDuzen.olcu) { setPostOlcu(paylasDuzen.olcu); duzenAc("paylas", paylasDuzen, ""); return; }
    setDuzenHedef("paylas");
    setPostOlcu({ w: 240, h: 300 });                                  // dik kart (renkli yazı gönderisi)
    setZeminRenk((paylasZemin && paylasZemin[0] === "#") ? paylasZemin : (ZEMIN_RENKLER[0] || "#16223e")); // composer'da seçilen düz renk varsa onu al
    const ilk = yeniYazi(paylasYazi.trim() ? paylasYazi.trim().slice(0, 80) : t("profUstYazi", "Yazını yaz"), 0);
    setKatmanlar([ilk]); setSecili(0); setEditorFotoVar(false); setDuzenAcik(true);
  };
  // MEVCUT profil fotoğrafını yeniden düzenle — saklı katmanlarla (kaldığın yerden)
  const mevcutDuzenle = () => { duzenAc("avatar", profilBilgi && profilBilgi.avatarDuzen, foto); };
  const fotoKaydet = () => {
    const c = document.createElement("canvas");
    fotoCiz(c, 1.6, false); // kayıt: önizlemenin 1.6 katı çözünürlük
    const data = c.toDataURL("image/jpeg", 0.85);
    if (duzenHedef === "paylas") {
      // PAYLAŞIM fotoğrafı → composer'a dön (foto+yazı katmanları görsele işlenir; hafıza saklanır)
      setPaylasGorsel(data); setPaylasVideo(""); setPaylasVideoFile(null); setPaylasVideoPoster("");
      setPaylasDuzen({ zemin: zeminRenk, kat: katmanSerile(katmanlar), olcu: { w: ONIZ_W, h: ONIZ_H } });
      setDuzenAcik(false); setAcikBolum(null);
      return;
    }
    if (duzenHedef === "galeri") {
      // 2./3... profil fotoğrafı → galeri dizisine ekle (en fazla 6)
      setProfilBilgi((p) => { const g = [...((p && p.galeri) || []), data].slice(-6); const uu = auth.currentUser; if (uu) profilKaydet(uu.uid, { galeri: g }).catch(() => {}); return { ...(p || {}), galeri: g }; });
    } else {
      const alan = duzenHedef === "is" ? "isFoto" : "avatarFoto";
      const duzenAlan = duzenHedef === "is" ? "isDuzen" : "avatarDuzen";
      const duzenVeri = { zemin: zeminRenk, kat: katmanSerile(katmanlar) }; // KATMAN HAFIZASI: silinmez
      setProfilBilgi((p) => ({ ...(p || {}), [alan]: data, [duzenAlan]: duzenVeri }));
      const uu = auth.currentUser; if (uu) profilKaydet(uu.uid, { [alan]: data, [duzenAlan]: duzenVeri }).catch(() => {});
      // PROFİL avatarı değiştiyse: ESKİ paylaşımlardaki avatarı da YENİLE (kullanıcı: paylaşımlarda eski foto kalıyordu)
      if (alan === "avatarFoto") avatariHerYereYay(data);
    }
    setDuzenAcik(false); setAcikBolum(null); // okey/kaydet sonrası ayarlar OTOMATİK kapanır
  };
  // Yeni profil avatarını KENDİ tüm izlerime yay: gönderiler + BEĞENİLER + YORUMLAR.
  // Hem yerel akış (anında görünsün) hem Firestore (herkes/her yerde yeni görsün).
  const avatariHerYereYay = (yeniFotoData) => {
    const uu = auth.currentUser; if (!uu) return;
    const benimAd = (profilBilgi && [profilBilgi.isim, profilBilgi.soyisim].filter(Boolean).join(" ")) || adTam || "";
    const guncelle = (a) => a.map((g) => ((g.uid === uu.uid || g.sahipUid === uu.uid) && !g.amblem) ? { ...g, foto: yeniFotoData } : g);
    setGercekAkis((a) => guncelle(a)); setGonderilerim((a) => guncelle(a));
    gonderiAvatarGuncelle(uu.uid, yeniFotoData, benimAd).catch(() => {});
    begeniAvatarGuncelle(uu.uid, yeniFotoData, benimAd).catch(() => {}); // beğenenler şeridindeki fotom
    yorumAvatarGuncelle(uu.uid, yeniFotoData, benimAd).catch(() => {});  // yorumlardaki fotom
  };
  // Galeri: bir fotoğrafı ANA avatar yap / sil
  function galeriAnaYap(d) { setProfilBilgi((p) => ({ ...(p || {}), avatarFoto: d })); const uu = auth.currentUser; if (uu) profilKaydet(uu.uid, { avatarFoto: d }).catch(() => {}); avatariHerYereYay(d); }
  function galeriSil(i) { setProfilBilgi((p) => { const g = ((p && p.galeri) || []).filter((_, j) => j !== i); const uu = auth.currentUser; if (uu) profilKaydet(uu.uid, { galeri: g }).catch(() => {}); return { ...(p || {}), galeri: g }; }); }
  // ÇOKLU MESLEK seç/çıkar → pro.meslekler dizisi (2-3 meslek olabilir) + pro.meslek=ilk; aramada hepsiyle bulunur.
  function meslekToggle(ad) {
    const uu = auth.currentUser;
    setProfilBilgi((p) => {
      const mevcut = (p && p.pro && Array.isArray(p.pro.meslekler) && p.pro.meslekler.length)
        ? p.pro.meslekler : ((p && p.pro && p.pro.meslek) ? [p.pro.meslek] : []);
      let yeni = mevcut.includes(ad) ? mevcut.filter((x) => x !== ad) : [...mevcut, ad];
      if (yeni.length > 5) yeni = yeni.slice(0, 5); // makul üst sınır
      const pro = { ...((p && p.pro) || {}), meslekler: yeni, meslek: yeni[0] || "" };
      if (uu) profilKaydet(uu.uid, { pro }).catch(() => {});
      return { ...(p || {}), pro };
    });
  }
  // MESAJ GÖNDER — arama detayından seçilen profesyonele
  function mesajGonderEt() {
    const uu = auth.currentUser;
    if (!uu || !araSecili || !mesajYazi.trim()) return;
    setMesajDurum("gonderiliyor");
    const benimAd = (profilBilgi && [profilBilgi.isim, profilBilgi.soyisim].filter(Boolean).join(" ")) || adTam || "";
    mesajGonder({
      aliciUid: araSecili.uid,
      aliciAd: [araSecili.isim, araSecili.soyisim].filter(Boolean).join(" "),
      metin: mesajYazi,
      gonderen: { uid: uu.uid, ad: benimAd, foto: foto || isFoto || "" },
    }).then((ok) => { setMesajDurum(ok ? "ok" : "hata"); if (ok) setMesajYazi(""); })
      .catch(() => setMesajDurum("hata"));
  }
  // Gelen kutusu açılınca mesajları oku (eski — korunur; artık Mesaj Merkezi canlı listeden besleniyor)
  useEffect(() => {
    if (!mesajAcik) return;
    const uu = auth.currentUser; if (!uu) { setMesajlar([]); return; }
    setMesajlar(null);
    mesajlariOku(uu.uid).then((l) => setMesajlar(l || [])).catch(() => setMesajlar([]));
  }, [mesajAcik]);
  // ---- WHATSAPP GİBİ SOHBET (canlı) ----
  const benUid = (u && u.uid) || (auth.currentUser && auth.currentUser.uid) || "";
  // Giriş yapınca TÜM mesajlarımı (gelen+giden) CANLI dinle → yeni mesaj anında düşer (WhatsApp gibi)
  useEffect(() => {
    const uu = auth.currentUser;
    if (!uu) { setMesajlarimTum([]); return; }
    const iptal = mesajlarimiDinle(uu.uid, (liste) => setMesajlarimTum(liste || []));
    return iptal;
  }, [u]); // eslint-disable-line react-hooks/exhaustive-deps
  // Bir kişiyle SOHBETİ AÇ — her "mesaj at" düğmesi buraya gelir (tek merkez). Karşı taraf {uid, ad, foto}.
  const sohbetAc = (kisi) => {
    if (!kisi || !kisi.uid) return;
    const ad = kisi.ad || kisi.isim || [kisi.isim, kisi.soyisim].filter(Boolean).join(" ") || kisi.aliciAd || "—";
    const foto = kisi.foto || kisi.isFoto || kisi.avatarFoto || kisi.gonderenFoto || "";
    setBegenenModal(null); setYorumAcik(null); setAraSecili(null); setTamFoto(""); // üstteki katmanlar kapansın
    setSohbetKisi({ uid: kisi.uid, ad, foto }); setSohbetYazi(""); setSohbetGonderiliyor(false); setBekleyenMedyalar([]); setSohbetMedyaAcik(false); setTepkiMesaj(null); setDuzenlenenMesaj(null);
  };
  // Sohbetten mesaj gönder (metin / foto / video / dosya). Medya önce Storage'a yüklenir, URL saklanır (Firestore 1MB'a sığsın).
  const sohbetGonderEt = async (metin, gorsel, video, dosya, medyalar) => {
    const uu = auth.currentUser; const kisi = sohbetKisiRef.current;
    if (!uu || !kisi) return false;
    if (!((metin && metin.trim()) || gorsel || video || (dosya && dosya.url) || (medyalar && medyalar.length))) return false;
    const benimAd = (profilBilgi && [profilBilgi.isim, profilBilgi.soyisim].filter(Boolean).join(" ")) || adTam || "";
    try {
      return await mesajGonder({ aliciUid: kisi.uid, aliciAd: kisi.ad || "", metin: metin || "", gorsel: gorsel || "", video: video || "", dosya: dosya || null, medyalar: medyalar || null, gonderen: { uid: uu.uid, ad: benimAd, foto: foto || isFoto || "" } });
    } catch (e) { return false; }
  };
  // Sohbette VİDEO seç/çek → Storage'a yükle, video mesajı gönder
  const sohbetVideoSecildi = async (e) => {
    const dsy = e.target.files && e.target.files[0]; e.target.value = ""; setSohbetMedyaAcik(false);
    const uu = auth.currentUser; const kisi = sohbetKisiRef.current;
    if (!dsy || !uu || !kisi) return;
    setSohbetGonderiliyor(true);
    try { const r = await dosyaYukle(dsy, uu.uid, () => {}); if (r && r.url) setBekleyenMedyalar((a) => [...a, { tip: "video", url: r.url }].slice(0, 6)); } catch (x) {}
    setSohbetGonderiliyor(false);
  };
  // Sohbette DOSYA seç → Storage'a yükle, GÖNDERİLMEYİ beklet (yazıyla birlikte)
  const sohbetDosyaSecildi = async (e) => {
    const dsy = e.target.files && e.target.files[0]; e.target.value = ""; setSohbetMedyaAcik(false);
    const uu = auth.currentUser; const kisi = sohbetKisiRef.current;
    if (!dsy || !uu || !kisi) return;
    setSohbetGonderiliyor(true);
    try { const r = await dosyaYukle(dsy, uu.uid, () => {}); if (r && r.url) setBekleyenMedyalar((a) => [...a, { tip: "dosya", url: r.url, ad: r.ad }].slice(0, 6)); } catch (x) {}
    setSohbetGonderiliyor(false);
  };
  // ---- İNTERNET ARAMASI (WebRTC — sesli/görüntülü) ----
  const ICE_SUNUCULAR = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }, { urls: "stun:stun2.l.google.com:19302" }] };
  const aramaTemizle = () => {
    try { (aramaAbonelikRef.current || []).forEach((f) => { try { f(); } catch (e) {} }); } catch (e) {}
    aramaAbonelikRef.current = [];
    try { if (pcRef.current) pcRef.current.close(); } catch (e) {}
    pcRef.current = null;
    try { if (yerelStreamRef.current) yerelStreamRef.current.getTracks().forEach((t) => t.stop()); } catch (e) {}
    yerelStreamRef.current = null;
    uzakStreamRef.current = null;
    try { if (uzakVideoRef.current) uzakVideoRef.current.srcObject = null; } catch (e) {}
    try { if (uzakSesRef.current) uzakSesRef.current.srcObject = null; } catch (e) {}
    try { if (yerelVideoRef.current) yerelVideoRef.current.srcObject = null; } catch (e) {}
  };
  // Arama konuşmaya geçince (elementler mount olunca) uzak ses/görüntüyü bağla — timing garantisi
  useEffect(() => {
    if (!aramaDurum) return;
    const id = setTimeout(() => { baglaUzakMedya(); }, 150);
    return () => clearTimeout(id);
  }, [aramaDurum, aktifArama]); // eslint-disable-line react-hooks/exhaustive-deps
  const aramaKapat = async (durumYaz) => {
    const a = aktifAramaRef.current;
    if (a && a.id && durumYaz !== false) { try { await aramaGuncelle(a.id, { durum: "bitti" }); } catch (e) {} }
    aramaTemizle();
    setAktifArama(null); setAramaDurum(""); setMikKapali(false); setKamKapali(false); setVideoBuyuk("uzak"); setKucukYer(null);
  };
  const medyaAl = async (tip) => {
    // Ses: yankı(echo)/gürültü engelleme AÇIK → ses kesilmesin, tekrar etmesin (kullanıcı: ses kesiliyor, 2-3 kez tekrarlıyor)
    const ses = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    const kisit = tip === "goruntulu" ? { audio: ses, video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } } : { audio: ses, video: false };
    const stream = await navigator.mediaDevices.getUserMedia(kisit);
    yerelStreamRef.current = stream;
    if (tip === "goruntulu") { setTimeout(() => { if (yerelVideoRef.current) yerelVideoRef.current.srcObject = stream; }, 50); }
    return stream;
  };
  // Karşıdan gelen ses/görüntüyü uygun elemente bağla (sesli → <audio>, görüntülü → <video>) ve OYNAT.
  const baglaUzakMedya = () => {
    const st = uzakStreamRef.current; if (!st) return;
    const el = uzakVideoRef.current || uzakSesRef.current; // görüntülüde video, seslide audio
    if (el && el.srcObject !== st) { try { el.srcObject = st; } catch (e) {} }
    if (el) { try { const p = el.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
  };
  const pcOlustur = (aramaId, kim) => {
    const pc = new RTCPeerConnection(ICE_SUNUCULAR);
    pcRef.current = pc;
    (yerelStreamRef.current ? yerelStreamRef.current.getTracks() : []).forEach((t) => { try { pc.addTrack(t, yerelStreamRef.current); } catch (e) {} });
    pc.ontrack = (e) => {
      // Karşının akışını DOĞRUDAN kullan (yeni MediaStream'e track kopyalama YOK → aynı ses iki kez eklenmez, tekrar/echo olmaz)
      if (e.streams && e.streams[0]) uzakStreamRef.current = e.streams[0];
      else { if (!uzakStreamRef.current) uzakStreamRef.current = new MediaStream(); try { uzakStreamRef.current.addTrack(e.track); } catch (x) {} }
      setTimeout(baglaUzakMedya, 30);
    };
    pc.onicecandidate = (e) => { if (e.candidate) iceAdayEkle(aramaId, kim, e.candidate.toJSON()); };
    pc.onconnectionstatechange = () => { try { if (pc.connectionState === "connected") setAramaDurum("konusuyor"); } catch (x) {} };
    return pc;
  };
  const aramaBaslat = async (kisi, tip) => {
    if (!kisi || !kisi.uid) return;
    const uu = auth.currentUser; if (!uu) return;
    if (kisi.uid === uu.uid) { bilgiBalonu(t("kendiniArama", "Kendini arayamazsın 🙂 Aramak için başka bir GLOXORG hesabı gerekir.")); return; }
    if (aramaDurumRef.current || aktifAramaRef.current) { try { aramaKapat(false); } catch (e) {} } // takılı arama varsa temizle, yeni arama başlasın
    const benimAd = (profilBilgi && [profilBilgi.isim, profilBilgi.soyisim].filter(Boolean).join(" ")) || adTam || "";
    try { await medyaAl(tip); } catch (e) { bilgiBalonu(t("aramaIzin", "Arama için kamera/mikrofon izni gerekli.")); return; }
    setAramaDurum("ariyor");
    setAktifArama({ id: "", karsiAd: kisi.ad || "—", karsiFoto: kisi.foto || "", tip });
    const id = await aramaOlustur({ arayanUid: uu.uid, arayanAd: benimAd, arayanFoto: foto || isFoto || "", arananUid: kisi.uid, arananAd: kisi.ad || "", tip, offer: null });
    if (!id) { aramaKapat(false); return; }
    setAktifArama({ id, karsiAd: kisi.ad || "—", karsiFoto: kisi.foto || "", tip });
    const pc = pcOlustur(id, "arayan");
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await aramaGuncelle(id, { offer: { type: offer.type, sdp: offer.sdp } });
    } catch (e) { aramaKapat(); return; }
    const ab1 = aramaDinle(id, async (a) => {
      if (!a) { aramaKapat(false); return; }
      if (a.answer && !pc.currentRemoteDescription) { try { await pc.setRemoteDescription(new RTCSessionDescription(a.answer)); setAramaDurum("konusuyor"); } catch (e) {} }
      if (a.durum === "red") { bilgiBalonu((kisi.ad || "Kişi") + " " + t("aramaReddetti", "aramayı reddetti")); aramaKapat(false); }
      else if (a.durum === "bitti") { aramaKapat(false); }
    });
    const ab2 = iceAdaylariDinle(id, "aranan", async (cand) => { try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {} });
    aramaAbonelikRef.current.push(ab1, ab2);
  };
  const aramaKabulEt = async () => {
    const g = gelenArama; if (!g) return;
    if (!g.offer || !g.offer.sdp) { bilgiBalonu(t("aramaHazirlaniyor", "Arama hazırlanıyor, bir saniye…")); return; } // teklif yoksa kabul etme (yoksa hata → kapanır)
    setGelenArama(null);
    try { await medyaAl(g.tip); } catch (e) { try { await aramaGuncelle(g.id, { durum: "red" }); } catch (x) {} bilgiBalonu(t("aramaIzin", "Arama için kamera/mikrofon izni gerekli.")); return; }
    setAramaDurum("konusuyor");
    setAktifArama({ id: g.id, karsiAd: g.arayanAd || "—", karsiFoto: g.arayanFoto || "", tip: g.tip });
    const pc = pcOlustur(g.id, "aranan");
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(g.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await aramaGuncelle(g.id, { answer: { type: answer.type, sdp: answer.sdp }, durum: "kabul" });
    } catch (e) { aramaKapat(); return; }
    const ab1 = aramaDinle(g.id, (a) => { if (!a || a.durum === "bitti") aramaKapat(false); });
    const ab2 = iceAdaylariDinle(g.id, "arayan", async (cand) => { try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {} });
    aramaAbonelikRef.current.push(ab1, ab2);
  };
  const aramaReddet = async () => { const g = gelenArama; if (g && g.id) { try { await aramaGuncelle(g.id, { durum: "red" }); } catch (e) {} } setGelenArama(null); };
  // ZİL / ÇALMA SESİ (WebAudio) — arayan: "çalıyor" tonu; aranan: zil. Ses dosyası gerektirmez.
  const zilRef = useRef(null);
  const zilDurdur = () => { const z = zilRef.current; if (z) { try { clearInterval(z.iv); } catch (e) {} try { z.ctx.close(); } catch (e) {} } zilRef.current = null; };
  const zilBaslat = (mod) => {
    zilDurdur();
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const ctx = new AC(); try { ctx.resume(); } catch (e) {}
      // ZARİF ÇAN — yumuşak, sıcak, YAVAŞ (kaba "brrr"/bip değil): nazik giriş, uzun doğal sönüm (çan gibi çınlar).
      // Hafif ikinci harmonik (oktav) eklenir → sıcak çan tınısı. Ses düşük tutulur (zarif, bağırmaz).
      const cingir = (freq, gecikme, ses, sonum) => {
        try {
          const t0 = ctx.currentTime + gecikme;
          [[freq, ses], [freq * 2, ses * 0.28]].forEach(([f, v]) => { // temel + yumuşak oktav
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = "sine"; o.frequency.value = f;
            o.connect(g); g.connect(ctx.destination);
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(v, t0 + 0.07);     // yumuşak giriş
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + sonum); // uzun, zarif sönüm
            o.start(t0); o.stop(t0 + sonum + 0.05);
          });
        } catch (e) {}
      };
      let dongu, aralik;
      if (mod === "aranan") {
        // GELEN ÇAĞRI — yumuşak "çiin … çiin" iki nazik çan notası (tatlı yükseliş), YAVAŞ ve zarif.
        dongu = () => { cingir(783.99, 0.0, 0.17, 1.2); cingir(1046.5, 0.5, 0.15, 1.4); }; // G5 → C6, uzun çınlar
        aralik = 3200; // yavaş
      } else {
        // ARAYAN (giden) — tek yumuşak nota, karşı taraf çalıyor hissi (nazik, alçak).
        dongu = () => { cingir(587.33, 0.0, 0.11, 1.3); }; // D5, yumuşak
        aralik = 3400;
      }
      dongu();
      const iv = setInterval(dongu, aralik);
      zilRef.current = { ctx, iv };
    } catch (e) {}
  };
  // Duruma göre zil: ararken çalıyor tonu; gelen çağrıda zil; konuşurken/boşta sus.
  useEffect(() => {
    if (aramaDurum === "ariyor") zilBaslat("arayan");
    else if (gelenArama && !aramaDurum) zilBaslat("aranan");
    else zilDurdur();
  }, [aramaDurum, gelenArama]); // eslint-disable-line react-hooks/exhaustive-deps
  // CEVAPSIZ ARAMA — ben ararken (ariyor) 35 saniye cevap gelmezse: sonsuza kadar ÇALMAYI DURDUR, "ulaşılamadı" de, aramayı kapat.
  useEffect(() => {
    if (aramaDurum !== "ariyor") return;
    const zmn = setTimeout(() => {
      if (aramaDurumRef.current === "ariyor") {
        try { bilgiBalonu(t("aramaUlasilamadi", "Ulaşılamıyor — cevap yok")); } catch (e) {}
        try { aramaKapat(false); } catch (e) {}
      }
    }, 30000);
    return () => clearTimeout(zmn);
  }, [aramaDurum]); // eslint-disable-line react-hooks/exhaustive-deps
  // Küçük videoyu PARMAKLA TAŞI (istediğin yere) + DOKUN → büyük/küçük yer değiştir (swap)
  const kucukVideoBas = (e) => {
    try { const el = e.currentTarget; const r = el.getBoundingClientRect(); kucukSurRef.current = { on: true, moved: false, sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top }; el.setPointerCapture(e.pointerId); } catch (x) {}
  };
  const kucukVideoGit = (e) => {
    const s = kucukSurRef.current; if (!s.on) return;
    const dx = e.clientX - s.sx, dy = e.clientY - s.sy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) s.moved = true;
    // Ekranın TAM köşelerine (sağ/sol/üst/alt) gidebilsin, sadece ekran dışına taşmasın
    const el = e.currentTarget; const bw = (el && el.offsetWidth) || 112, bh = (el && el.offsetHeight) || 158;
    const W = window.innerWidth, H = window.innerHeight;
    const x = Math.max(2, Math.min(s.ox + dx, W - bw - 2));
    const y = Math.max(6, Math.min(s.oy + dy, H - bh - 6));
    setKucukYer({ x, y });
  };
  const kucukVideoBitir = () => { const s = kucukSurRef.current; if (!s.on) return; s.on = false; if (!s.moved) { setVideoBuyuk((v) => (v === "uzak" ? "yerel" : "uzak")); } };
  const mikToggle = () => { const s = yerelStreamRef.current; if (s) { s.getAudioTracks().forEach((tr) => { tr.enabled = !tr.enabled; }); setMikKapali((m) => !m); } };
  const kamToggle = () => { const s = yerelStreamRef.current; if (s) { s.getVideoTracks().forEach((tr) => { tr.enabled = !tr.enabled; }); setKamKapali((k) => !k); } };
  // ÖN ↔ ARKA kamera değiştir (görüntülü aramada). Yeni kamerayı alıp bağlantıdaki video track'i değiştirir (yeniden arama gerekmez).
  const kameraCevir = async () => {
    const pc = pcRef.current; const eski = yerelStreamRef.current; if (!pc || !eski) return;
    const yeniMod = onKamera ? "environment" : "user";
    try {
      const yeniStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: yeniMod } });
      const yeniVideo = yeniStream.getVideoTracks()[0]; if (!yeniVideo) return;
      const gonderici = pc.getSenders().find((sn) => sn.track && sn.track.kind === "video");
      if (gonderici) { try { await gonderici.replaceTrack(yeniVideo); } catch (e) {} }
      eski.getVideoTracks().forEach((tr) => { try { tr.stop(); eski.removeTrack(tr); } catch (e) {} });
      eski.addTrack(yeniVideo);
      if (yerelVideoRef.current) { try { yerelVideoRef.current.srcObject = eski; } catch (e) {} }
      setOnKamera((v) => !v);
    } catch (e) {}
  };
  // BANA GELEN çağrıları dinle (aktif arama yokken göster)
  useEffect(() => {
    const uu = auth.currentUser; if (!uu) return;
    const iptal = gelenAramalariDinle(uu.uid, (liste) => {
      if (!aramaDurumRef.current && liste.length) {
        const yeni = liste[0];
        // offer null→dolu geçişini YAKALA (aksi halde eski boş halini koruyup çağrı hiç görünmez → arama gelmez)
        setGelenArama((mv) => (mv && mv.id === yeni.id && !!(mv.offer && mv.offer.sdp) === !!(yeni.offer && yeni.offer.sdp)) ? mv : yeni);
      } else if (!liste.length) setGelenArama((mv) => (aramaDurumRef.current ? mv : null));
    });
    return iptal;
  }, [u]); // eslint-disable-line react-hooks/exhaustive-deps
  // Gönder: yazı + (varsa) bekleyen foto/video/dosya(lar) TEK mesajda birlikte gider (çoklu medya + yazı, ayrı ayrı değil)
  const sohbetMetinGonder = () => {
    const m = sohbetYazi.trim();
    // DÜZENLEME MODU: mevcut mesajın metnini güncelle (yeni mesaj gönderme)
    if (duzenlenenMesaj) {
      const dm = duzenlenenMesaj;
      if (!m) return; // boş bırakılırsa silmek için "Sil" kullanılsın
      setDuzenlenenMesaj(null); setSohbetYazi("");
      try { if (sohbetInputRef.current) sohbetInputRef.current.style.height = "auto"; } catch (e) {}
      mesajDuzelt(dm.id, m).then((ok) => { if (!ok) { setDuzenlenenMesaj(dm); setSohbetYazi(m); } });
      return;
    }
    const meds = bekleyenMedyalar;
    if (!m && (!meds || !meds.length)) return;
    setSohbetYazi(""); setBekleyenMedyalar([]);
    try { if (sohbetInputRef.current) sohbetInputRef.current.style.height = "auto"; } catch (e) {}
    let gorsel = "", video = "", dosya = null, medyalar = null;
    if (meds.length === 1) { const bm = meds[0]; gorsel = bm.tip === "foto" ? bm.url : ""; video = bm.tip === "video" ? bm.url : ""; dosya = bm.tip === "dosya" ? { url: bm.url, ad: bm.ad } : null; }
    else if (meds.length > 1) { medyalar = meds.map((x) => ({ tip: x.tip, url: x.url, ad: x.ad })); }
    sohbetGonderEt(m, gorsel, video, dosya, medyalar).then((ok) => { if (!ok) { setSohbetYazi(m); setBekleyenMedyalar(meds); } }); // hata olursa geri koy
  };
  // MESAJA TEPKİ (WhatsApp gibi): baloncuğa UZUN BAS → emoji seçici; emoji seç → tepki (karşıya bildirim)
  // Seçici, BASTIĞIN elemanın tam ÜSTÜNDE açılır (ekran kenarına taşmaz, köşeye kaçmaz)
  // Seçici, tam PARMAĞIN değdiği NOKTANIN üstünde açılır (elemanın ortasına DEĞİL → büyük fotoğrafta bile parmağın neredeyse orada; kenara/alta kaçmaz)
  const tepkiAc = (mesajId, px, py) => {
    try {
      const vw = window.innerWidth, vh = window.innerHeight;
      const x = Math.max(150, Math.min(vw - 150, px || vw / 2));
      const yakinUst = (py || 0) < 150; // parmak ekranın en üstündeyse seçici parmağın ALTINA açılsın (yukarı taşmasın)
      const y = yakinUst ? Math.min((py || 0) + 16, vh - 70) : Math.max((py || 0) - 16, 70); // aksi halde parmağın hemen ÜSTÜNDE
      setTepkiYer({ x, y, alt: yakinUst });
    } catch (e) { setTepkiYer({ x: window.innerWidth / 2, y: window.innerHeight / 2, alt: false }); }
    setTepkiMesaj(mesajId);
  };
  const tepkiBaslat = (mesajId, px, py) => { tepkiIptal(); tepkiBasRef.current = setTimeout(() => tepkiAc(mesajId, px, py), 450); };
  const tepkiIptal = () => { if (tepkiBasRef.current) { clearTimeout(tepkiBasRef.current); tepkiBasRef.current = null; } };
  // Mesajı GERİ ÇEK / SİL
  const mesajSilEt = async (mesajId) => { setTepkiMesaj(null); if (duzenlenenMesaj && duzenlenenMesaj.id === mesajId) mesajDuzenIptal(); await mesajSilGeriCek(mesajId); };
  // Mesajı DÜZENLE (metnini yazma kutusuna al) — Gönder'e basınca güncellenir
  const mesajDuzenleBaslat = (m) => { setTepkiMesaj(null); if (!m || !m.metin) return; setDuzenlenenMesaj({ id: m.id, eskiMetin: m.metin }); setSohbetYazi(m.metin); setBekleyenMedyalar([]); setTimeout(() => { if (sohbetInputRef.current) { sohbetInputRef.current.focus(); sohbetInputRef.current.style.height = "auto"; sohbetInputRef.current.style.height = Math.min(sohbetInputRef.current.scrollHeight, 138) + "px"; } }, 60); };
  const mesajDuzenIptal = () => { setDuzenlenenMesaj(null); setSohbetYazi(""); try { if (sohbetInputRef.current) sohbetInputRef.current.style.height = "auto"; } catch (e) {} };
  const tepkiSec = async (mesajId, emoji) => {
    const uu = auth.currentUser; if (!uu) return;
    setTepkiMesaj(null);
    const m = aktifSohbetMesajlari.find((x) => x.id === mesajId); if (!m) return;
    const mevcut = m.tepkiler && m.tepkiler[uu.uid];
    const yeni = (mevcut === emoji) ? "" : emoji; // aynı emojiye tekrar → kaldır; farklı emoji → DEĞİŞTİR
    // ANINDA yerel güncelle → tepki hemen değişir (Firestore/dinleyici gecikmesini bekleme; eski emoji ekranda takılı kalmasın)
    setMesajlarimTum((liste) => liste.map((x) => {
      if (x.id !== mesajId) return x;
      const t = { ...(x.tepkiler || {}) };
      if (yeni) t[uu.uid] = yeni; else delete t[uu.uid];
      return { ...x, tepkiler: t };
    }));
    const tepkiOk = await mesajTepkiVer(mesajId, uu.uid, yeni);
    if (!tepkiOk) {
      // Firebase kuralı yazmayı reddetti → optimistik değişikliği geri al + net uyarı (sessizce eskiye dönüp kafa karıştırmasın)
      setMesajlarimTum((liste) => liste.map((x) => (x.id === mesajId ? { ...x, tepkiler: (m.tepkiler || {}) } : x)));
      setKucukMesaj(t("tepkiKural", "Tepki kaydedilemedi — Firebase mesaj kuralını güncellemen gerekiyor"));
      return;
    }
    if (yeni && m.gonderenUid && m.gonderenUid !== uu.uid) {
      bildirimEkle({ aliciUid: m.gonderenUid, gonderenUid: uu.uid, gonderenAd: benimAdGetir(), gonderenFoto: benimFotoGetir(), tip: "mesaj-tepki", metin: yeni + " " + (m.metin || (m.gorsel ? "📷" : "")).slice(0, 40) }).catch(() => {});
    }
  };
  const sohbetFotoSecildi = async (e) => {
    const dosya = e.target.files && e.target.files[0]; e.target.value = ""; setSohbetMedyaAcik(false);
    const uu = auth.currentUser; const kisi = sohbetKisiRef.current;
    if (!dosya || !uu || !kisi) return;
    setSohbetGonderiliyor(true);
    try {
      const dataURL = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(dosya); });
      const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = dataURL; });
      const kucuk = imgKucult(img, 1280) || dataURL; // büyük fotoğrafı küçült (yükleme hızlı, kota korunur)
      const url = await gorselYukle(kucuk, uu.uid, () => {});
      if (url) setBekleyenMedyalar((a) => [...a, { tip: "foto", url }].slice(0, 6)); // listeye EKLE (çoklu), yazıyla birlikte gider
    } catch (x) {}
    setSohbetGonderiliyor(false);
  };
  // AKTİF sohbetteki mesajlar (iki taraf) — zamana göre artan
  const aktifSohbetMesajlari = useMemo(() => {
    if (!sohbetKisi) return [];
    return mesajlarimTum.filter((m) =>
      (m.gonderenUid === sohbetKisi.uid && m.aliciUid === benUid) ||
      (m.gonderenUid === benUid && m.aliciUid === sohbetKisi.uid));
  }, [mesajlarimTum, sohbetKisi, benUid]);
  // MESAJ MERKEZİ listesi — karşı kişiye göre gruplanmış sohbetler (son mesaj + okunmamış sayısı), en yeni üstte
  const sohbetListesi = useMemo(() => {
    const harita = new Map();
    mesajlarimTum.forEach((m) => {
      const karsiUid = m.gonderenUid === benUid ? m.aliciUid : m.gonderenUid;
      if (!karsiUid || karsiUid === benUid) return;
      const karsiAd = m.gonderenUid === benUid ? (m.aliciAd || "") : (m.gonderenAd || "");
      const karsiFoto = m.gonderenUid === benUid ? "" : (m.gonderenFoto || "");
      let g = harita.get(karsiUid);
      if (!g) { g = { uid: karsiUid, ad: karsiAd || "—", foto: karsiFoto, son: m, okunmamis: 0 }; harita.set(karsiUid, g); }
      if ((m.zamanMs || 0) >= (g.son.zamanMs || 0)) { g.son = m; if (karsiAd) g.ad = karsiAd; }
      if (karsiFoto) g.foto = karsiFoto;
      if (m.aliciUid === benUid && !m.okundu) g.okunmamis++;
    });
    return Array.from(harita.values()).sort((a, b) => (b.son.zamanMs || 0) - (a.son.zamanMs || 0));
  }, [mesajlarimTum, benUid]);
  const okunmamisMesaj = useMemo(() => sohbetListesi.reduce((s, g) => s + g.okunmamis, 0), [sohbetListesi]);
  // Sohbet açıkken: o kişiden gelen okunmamışları OKUNDU yap (karşı tarafa çift tik ✓✓)
  useEffect(() => {
    if (!sohbetKisi) return;
    const okunacak = aktifSohbetMesajlari.filter((m) => m.aliciUid === benUid && !m.okundu);
    if (okunacak.length) mesajOkunduYap(okunacak);
  }, [sohbetKisi, aktifSohbetMesajlari, benUid]);
  // Yeni mesaj gelince/sohbet açılınca EN ALTA kaydır
  useEffect(() => {
    if (sohbetKisi && mesajSonRef.current) { try { mesajSonRef.current.scrollIntoView({ block: "end" }); } catch (e) {} }
  }, [aktifSohbetMesajlari.length, sohbetKisi]);
  // Mesaj Merkezi açılınca kişi listesini yükle (profil fotoları + kişi arama için) — bir kez
  useEffect(() => {
    if (!mesajAcik || mmKisiler.length) return;
    tumKullanicilar(400).then((l) => setMmKisiler(l || [])).catch(() => {});
  }, [mesajAcik]); // eslint-disable-line react-hooks/exhaustive-deps
  // uid → profil fotosu + ad haritası (sohbet listesinde/başlığında foto göstermek için)
  const kisiBilgiHarita = useMemo(() => {
    const h = {};
    mmKisiler.forEach((k) => {
      const id = k.id || k.uid; if (!id) return;
      const foto = k.foto || k.avatarFoto || k.isFoto || (k.pro && k.pro.foto) || "";
      const ad = [k.isim, k.soyisim].filter(Boolean).join(" ") || k.ad || "";
      h[id] = { foto, ad };
    });
    return h;
  }, [mmKisiler]);
  // Kişi arama sonucu (isimle) — yeni sohbet başlatmak için
  const mmSonuc = useMemo(() => {
    const q = mmAra.trim().toLowerCase(); if (q.length < 2) return [];
    return mmKisiler.filter((k) => {
      const id = k.id || k.uid; if (!id || id === benUid) return false;
      const ad = ([k.isim, k.soyisim].filter(Boolean).join(" ") || k.ad || "").toLowerCase();
      const meslek = (k.pro && k.pro.meslek ? String(k.pro.meslek) : "").toLowerCase();
      return ad.includes(q) || meslek.includes(q);
    }).slice(0, 25);
  }, [mmAra, mmKisiler, benUid]);
  // GERÇEK AKIŞ — açılışta kayıtlı gönderileri oku (varsa örnek akışın ÜSTÜNE eklenir)
  useEffect(() => {
    gonderileriOku({}, 150).then((l) => { const arr = l || []; setGercekAkis(arr); try { localStorage.setItem("gw_feedCache", JSON.stringify(arr.slice(0, 40))); } catch (e) {} }).catch(() => {});
  }, []);
  // TAKİP ETTİKLERİM — giriş yapınca yükle (akış filtresi + düğme durumu için)
  useEffect(() => {
    if (!u || !u.uid) { setTakipSet(new Set()); return; }
    takipEttiklerimOku(u.uid).then((liste) => setTakipSet(new Set(liste || []))).catch(() => {});
  }, [u]);
  // PROFİLİM açılınca KENDİ paylaşımlarımı yükle (aşağıda listelenir, düzenle/sil)
  useEffect(() => {
    if (aktifKod !== "profil") return;
    const uu = auth.currentUser; if (!uu) return;
    gonderilerimOku(uu.uid).then((l) => setGonderilerim(l || [])).catch(() => {});
  }, [aktifKod]);
  // Paylaşımı SİL (akıştan + profilimden kalkar)
  function gonderiSilEt(id) {
    if (!id) return;
    // YANLIŞLIKLA SİLME ÖNLEME — önce onay sor
    if (!window.confirm(t("silOnay", "Bu paylaşımı silmek istediğine emin misin?"))) return;
    gonderiSil(id).then((ok) => { if (ok) { setGonderilerim((a) => a.filter((g) => g.id !== id)); setGercekAkis((a) => a.filter((g) => g.id !== id)); } });
  }
  // Paylaşımı DÜZENLE → composer'ı doldurup aç (paylasGonder güncelleme yapar)
  function gonderiDuzenle(g) {
    setDuzenlenen(g); setPaylasYazi(g.yazi || ""); setPaylasBaslik(g.baslik || ""); setPaylasTur(g.tur || ""); setPaylasDurum("");
    // ÇOK MEDYALI gönderi: ana foto + EK fotolar + VİDEO hepsini composer'a yükle (kullanıcı hepsini GÖRSÜN — düzenlerken de).
    const meds = Array.isArray(g.medyalar) ? g.medyalar : null;
    if (meds && meds.length) {
      const fotolar = meds.filter((m) => m.tip === "foto").map((m) => m.data || m.url).filter(Boolean);
      const vid = meds.find((m) => m.tip === "video");
      setPaylasGorsel(fotolar[0] || g.gorsel || "");
      setPaylasEkFotolar(fotolar.slice(1));
      setPaylasVideo(vid ? (vid.url || "") : (g.video || ""));
      setPaylasVideoPoster(vid ? (vid.poster || "") : (g.videoPoster || ""));
      setVideoBasta(meds[0] && meds[0].tip === "video"); // düzenlemede sıra korunur
    } else {
      setPaylasGorsel(g.gorsel || "");
      setPaylasEkFotolar([]);
      setPaylasVideo(g.video || "");
      setPaylasVideoPoster(g.videoPoster || "");
    }
    setPaylasVideoFile(null); // yeni dosya yok; mevcut video URL'i korunur
    setYaziMedyaUstunde(!!g.yaziUstunde); setGitLinki(g.gitLinki === true);
    const uy = g.ustYazi || {}; setUstYazi(uy.metin || ""); setUstRenk(uy.renk || "#ffffff"); setUstBoyut(uy.boyut || "orta"); setUstYer(uy.yer || "alt"); setAiOneriler([]); setPaylasDuzen(g.duzen || null); setPaylasZemin(g.zemin || ""); setPaylasYaziRenk(g.yaziRenk || "");
    // ANKET — düzenlemede mevcut anket şıkları geri yüklenir
    if (g.anket && Array.isArray(g.anket.secenekler) && g.anket.secenekler.length >= 2) { setAnketAcik(true); setAnketSecenekler([...g.anket.secenekler]); }
    else { setAnketAcik(false); setAnketSecenekler(["", ""]); }
    setPaylasAcik(true);
  }
  // BEĞEN — kalp dolar/boşalır, sayı artar/azalır (kullanıcı başına localStorage), Firestore sayacı güncellenir
  function begenToggle(p) {
    if (!p || !p.id) return;
    const begendi = begeniSet.has(p.id);
    const yeni = new Set(begeniSet); const delta = begendi ? -1 : 1;
    if (begendi) yeni.delete(p.id); else yeni.add(p.id);
    setBegeniSet(yeni); try { localStorage.setItem("groxBegeni", JSON.stringify([...yeni])); } catch (e) {}
    const guncel = (g) => g.id === p.id ? { ...g, begeni: Math.max(0, (g.begeni || 0) + delta) } : g;
    setGercekAkis((a) => a.map(guncel)); setGonderilerim((a) => a.map(guncel));
    setTamFoto((t) => (t && t.id === p.id) ? { ...t, begeni: Math.max(0, (t.begeni || 0) + delta) } : t);
    sayacDegistir(p.id, "begeni", delta).catch(() => {}); // ATOMİK +1/-1 → farklı kişilerin beğenisi doğru toplanır (1'de takılmaz)
    const uu = auth.currentUser;
    // KİM BEĞENDİ kaydı (kalbe uzun basınca listede görünür)
    if (uu) { if (begendi) begeniSilDoc(p.id, uu.uid).catch(() => {}); else begeniYaz(p.id, { uid: uu.uid, ad: benimAdGetir(), foto: benimFotoGetir() }).catch(() => {}); }
    // Beğeni ANINDA → ufak renkli kalp animasyonu (sadece beğenirken, geri alırken değil; müşteriyi rahatsız etmez)
    if (!begendi) {
      setKalpPatla(p.id); setTimeout(() => setKalpPatla((x) => (x === p.id ? null : x)), 760);
      // Gönderi sahibine BİLDİRİM (kendine değil)
      const sahip = p.sahipUid || p.uid;
      if (uu && sahip && sahip !== uu.uid) bildirimEkle({ aliciUid: sahip, gonderenUid: uu.uid, gonderenAd: benimAdGetir(), gonderenFoto: benimFotoGetir(), tip: "begeni", gonderiId: p.id, metin: (p.yazi || "").slice(0, 60), gonderiResim: p.gorsel || "", gonderiZemin: p.zemin || "", gonderiVideo: p.video || "" }).catch(() => {});
    }
  }
  // KALBE UZUN BAS → TEPKİ ÇUBUĞU (👍❤️😂😮😢😡); KISA tık → beğen/geri al
  function begeniBas(p) { uzunBasildiRef.current = false; begeniBasRef.current = setTimeout(() => { uzunBasildiRef.current = true; setTepkiAcik(p.id); }, 380); }
  function begeniBirak() { if (begeniBasRef.current) { clearTimeout(begeniBasRef.current); begeniBasRef.current = null; } }
  function begeniTik(p) { if (uzunBasildiRef.current) { uzunBasildiRef.current = false; return; } if (tepkiAcik === p.id) { setTepkiAcik(null); return; } begenToggle(p); }
  // TEPKİ ver (çubuktan seç): beğenmemişse +1 beğeni + tepki; beğenmişse sadece tepkiyi değiştir
  function begeniTepkiVer(p, key) {
    setTepkiAcik(null); uzunBasildiRef.current = false;
    if (!p || !p.id) return;
    const uu = auth.currentUser;
    const zatenBegendi = begeniSet.has(p.id);
    setBegeniTepki((m) => { const n = { ...m, [p.id]: key }; try { localStorage.setItem("groxTepki", JSON.stringify(n)); } catch (e) {} return n; });
    if (!zatenBegendi) {
      const yeni = new Set(begeniSet); yeni.add(p.id); setBegeniSet(yeni); try { localStorage.setItem("groxBegeni", JSON.stringify([...yeni])); } catch (e) {}
      const guncel = (g) => (g.id === p.id ? { ...g, begeni: Math.max(0, (g.begeni || 0) + 1) } : g);
      setGercekAkis((a) => a.map(guncel)); setGonderilerim((a) => a.map(guncel));
      setTamFoto((tt) => (tt && tt.id === p.id ? { ...tt, begeni: Math.max(0, (tt.begeni || 0) + 1) } : tt));
      sayacDegistir(p.id, "begeni", 1).catch(() => {});
      setKalpPatla(p.id); setTimeout(() => setKalpPatla((x) => (x === p.id ? null : x)), 760);
      const sahip = p.sahipUid || p.uid;
      if (uu && sahip && sahip !== uu.uid) bildirimEkle({ aliciUid: sahip, gonderenUid: uu.uid, gonderenAd: benimAdGetir(), gonderenFoto: benimFotoGetir(), tip: "begeni", gonderiId: p.id, metin: (p.yazi || "").slice(0, 60), gonderiResim: p.gorsel || "", gonderiZemin: p.zemin || "", gonderiVideo: p.video || "" }).catch(() => {});
    }
    if (uu) begeniYaz(p.id, { uid: uu.uid, ad: benimAdGetir(), foto: benimFotoGetir(), tepki: key }).catch(() => {});
  }
  // Beğeni düğmesi ikonu: tepki verildiyse o emoji, yoksa kalp
  const begeniIkon = (p) => { const s = begeniSet.has(p.id) ? (begeniTepki[p.id] || "kalp") : null; return s ? <span className="tepki-secili" aria-hidden="true">{tepkiEmoji(s)}</span> : Ikon.kalp; };
  // Tepki çubuğu (uzun basınca) — düğmenin üstünde çıkar
  const tepkiCubugu = (p) => tepkiAcik === p.id ? (
    <span className="tepki-cubuk" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}>
      {TEPKILER.map((tp) => (<button key={tp.k} className="tepki-oge" title={tp.ad} onClick={(e) => { e.stopPropagation(); begeniTepkiVer(p, tp.k); }} onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); begeniTepkiVer(p, tp.k); }}>{tp.e}</button>))}
    </span>
  ) : null;
  function begenenleriAc(p) { if (!p || !p.id) return; setBegeniListeAcik(p); setBegeniListe(null); begenenleriOku(p.id).then(setBegeniListe).catch(() => setBegeniListe([])); }
  // ANKET — bir gönderinin oylarını yükle (sayım + benim oyum). Feed'de anket ilk göründüğünde çağrılır (ref ile tek sefer).
  const anketYukle = (postId) => {
    if (!postId || anketYukRef.current.has(postId)) return;
    anketYukRef.current.add(postId);
    anketOylariOku(postId).then((oylar) => {
      const sayim = {}; let benim = null; const uu = auth.currentUser;
      oylar.forEach((o) => { const i = o.secenek; sayim[i] = (sayim[i] || 0) + 1; if (uu && o.uid === uu.uid) benim = i; });
      setAnketOylar((m) => ({ ...m, [postId]: { sayim, toplam: oylar.length, benim } }));
    }).catch(() => {});
  };
  // ANKET — bir şıkka oy ver (iyimser güncelle + backend). Tekrar aynı şıkka basınca değişmez; başka şıkka basınca oyu taşır.
  const anketOyla = (p, idx) => {
    const uu = auth.currentUser; if (!uu || !p || !p.id) return;
    const d = anketOylar[p.id] || { sayim: {}, toplam: 0, benim: null };
    const onceki = d.benim;
    if (onceki === idx) return;
    const sayim = { ...d.sayim }; let toplam = d.toplam;
    if (onceki !== null && onceki !== undefined) sayim[onceki] = Math.max(0, (sayim[onceki] || 0) - 1); else toplam += 1;
    sayim[idx] = (sayim[idx] || 0) + 1;
    setAnketOylar((m) => ({ ...m, [p.id]: { sayim, toplam, benim: idx } }));
    anketOyVer(p.id, uu.uid, idx).catch(() => {});
  };
  // AKIŞTA REELS ŞERİDİ — Facebook gibi, her birkaç gönderide bir yatay kısa video şeridi (dokununca tam ekran Reels açılır)
  const reelsSeridi = (anahtar) => {
    if (!reelListesi.length) return null;
    return (
      <div className="reels-serit" key={anahtar} onClick={(e) => e.stopPropagation()}>
        <div className="reels-serit-bas">
          <span className="reels-serit-ad notranslate" translate="no">🎬 {REELS_AD}</span>
          <button className="reels-serit-tum" onClick={() => { setReelAktif(0); setReelsAcik(true); }}>{t("tumunuGor", "Tümü")} ›</button>
        </div>
        <div className="reels-serit-kaydir">
          {/* BAŞTA: Makara OLUŞTUR kartı — buradan video paylaşınca Makara olur */}
          <button className="reels-serit-oge reels-serit-olustur" onClick={() => { setDuzenlenen(null); setPaylasYazi(""); setPaylasBaslik(""); setPaylasTur(""); setPaylasGorsel(""); setPaylasEkFotolar([]); setPaylasVideo(""); setPaylasDurum(""); setPaylasAvatar("profil"); setAiOneriler([]); setPaylasZemin(""); setPaylasYaziRenk(""); setPaylasKonum(null); setKonumDurum(""); setAnketAcik(false); setAnketSecenekler(["", ""]); setPaylasAcik(true); }}>
            {foto ? <img className="reels-serit-olustur-foto" src={foto} alt="" referrerPolicy="no-referrer" /> : <span className="reels-serit-olustur-bos" />}
            <span className="reels-serit-olustur-alt">
              <span className="reels-arti-satir">
                <span className="reels-parilti" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 1.4l2.4 7.3 7.4 2.3-7.4 2.3L12 20.6l-2.4-7.3L2.2 11l7.4-2.3z"/></svg></span>
                <span className="reels-serit-arti2" aria-hidden="true">+</span>
                <span className="reels-parilti" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 1.4l2.4 7.3 7.4 2.3-7.4 2.3L12 20.6l-2.4-7.3L2.2 11l7.4-2.3z"/></svg></span>
              </span>
              <span className="reels-serit-olustur-ad notranslate" translate="no">🎬 {REELS_AD}</span>
            </span>
          </button>
          {reelListesi.slice(0, 8).map((p, i) => (
            <button className="reels-serit-oge" key={p.id || i} onClick={() => { setReelAktif(i); setReelsAcik(true); }}>
              {/* CANLI: ekrana gelince kendi oynar (sessiz, döngü); oynatma düğmesi YOK. Poster varsa ilk kare kapak. */}
              <video className="reels-serit-vid" data-ci={i} src={videoSade(p._reelVideo)} poster={p._reelPoster || undefined} muted loop playsInline preload="metadata" tabIndex={-1} />
              <span className="reels-serit-isim notranslate" translate="no">{((p.ad || "").split(" ")[0]) || ""}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };
  // ANKET — feed'de anket bloğu (şıklar; oy verince yüzde çubukları görünür)
  const anketBlok = (p) => {
    if (!p.anket || !Array.isArray(p.anket.secenekler) || p.anket.secenekler.length < 2) return null;
    const d = anketOylar[p.id];
    if (!d) anketYukle(p.id);
    const sayim = (d && d.sayim) || {}; const toplam = (d && d.toplam) || 0;
    const benim = d ? d.benim : null;
    const oyladi = benim !== null && benim !== undefined;
    return (
      <div className="anket" onClick={(e) => e.stopPropagation()}>
        <div className="anket-bas"><span className="anket-bas-et">📊 {t("anket", "Anket")}</span>{toplam > 0 && <span className="anket-toplam">{toplam.toLocaleString()} {t("oy", "oy")}</span>}</div>
        {p.anket.secenekler.map((s, i) => {
          const n = sayim[i] || 0; const yuzde = toplam > 0 ? Math.round((n / toplam) * 100) : 0; const secili = benim === i;
          return (
            <button key={i} className={"anket-sec" + (secili ? " secili" : "") + (oyladi ? " oylandi" : "")} onClick={() => anketOyla(p, i)}>
              {oyladi && <span className="anket-dolgu" style={{ width: yuzde + "%" }} />}
              <span className="anket-metin">{secili && <span className="anket-tik">✓</span>}{s}</span>
              {oyladi && <span className="anket-yuzde">%{yuzde}</span>}
            </button>
          );
        })}
        {!oyladi && <div className="anket-ipucu">{t("anketIpucu", "Oy vermek için bir şıka dokun")}</div>}
      </div>
    );
  };
  // Bildirimlerde gösterilecek kendi adım/fotoğrafım
  function benimAdGetir() { return (profilBilgi && [profilBilgi.isim, profilBilgi.soyisim].filter(Boolean).join(" ")) || adTam || t("biri", "Biri"); }
  function benimFotoGetir() { return foto || isFoto || ""; }
  // TEŞEKKÜR ET — seni beğenen kişiye teşekkür bildirimi gönder (o senin beğendiğini/teşekkürünü görür)
  const tesekkurEt = (b) => {
    const uu = auth.currentUser;
    if (!uu || !b || !b.gonderenUid || b.gonderenUid === uu.uid || tesekkurEdilen.has(b.id)) return;
    bildirimEkle({ aliciUid: b.gonderenUid, gonderenUid: uu.uid, gonderenAd: benimAdGetir(), gonderenFoto: benimFotoGetir(), tip: "tesekkur", metin: b.metin || "", gonderiId: b.gonderiId || "", gonderiResim: b.gonderiResim || "", gonderiVideo: b.gonderiVideo || "", gonderiZemin: b.gonderiZemin || "" }).catch(() => {});
    const yeni = new Set(tesekkurEdilen); yeni.add(b.id); setTesekkurEdilen(yeni);
    try { localStorage.setItem("groxTesekkur", JSON.stringify([...yeni])); } catch (e) {}
  };
  // Bildirim metni (zilde + telefon bildiriminde) — çoklu dil için defaultValue interpolasyonu
  function bildirimMetni(b) {
    const ad = b.gonderenAd || t("biri", "Biri");
    if (b.tip === "begeni") return t("bildBegeni", { ad, defaultValue: "{{ad}} gönderini beğendi" });
    if (b.tip === "yorum") return t("bildYorum", { ad, metin: b.metin || "", defaultValue: "{{ad}} yorum yaptı: {{metin}}" });
    if (b.tip === "mesaj") return t("bildMesaj", { ad, defaultValue: "{{ad}} sana mesaj gönderdi" });
    if (b.tip === "mesaj-tepki") return t("bildMesajTepki", { ad, tepki: (b.metin || "❤️").split(" ")[0], defaultValue: "{{ad}} mesajına {{tepki}} verdi" });
    if (b.tip === "takip") return t("bildTakip", { ad, defaultValue: "{{ad}} seni takip etmeye başladı" });
    if (b.tip === "tesekkur") return t("bildTesekkur", { ad, defaultValue: "{{ad}} beğenin için teşekkür etti 🙏" });
    if (b.tip === "hikaye-tepki") return t("bildHikTepki", { ad, tepki: b.metin || "❤️", defaultValue: "{{ad}} hikâyene {{tepki}} verdi" });
    return ad;
  }
  // Telefon/tarayıcı bildirimi göster (servis çalışanı üzerinden — Android uyumlu)
  async function telefonBildirimGoster(metin, foto2) {
    try {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const reg = (navigator.serviceWorker && (await navigator.serviceWorker.getRegistration() || await navigator.serviceWorker.ready)) || null;
      if (reg && reg.showNotification) reg.showNotification("GLOXORG", { body: metin, icon: foto2 || (process.env.PUBLIC_URL || "") + "/logo192.png", badge: (process.env.PUBLIC_URL || "") + "/logo192.png", tag: "grox-bildirim" });
      else if (typeof Notification === "function") new Notification("GLOXORG", { body: metin, icon: foto2 || undefined });
    } catch (e) {}
  }
  // Yazı alanı DIŞINDA bir kontrole (kaydırıcı/renk/düğme) dokununca klavyeyi KAPAT
  // (kullanıcı: ayarlarda konsantrasyon vb. ayarlarken klavye çıkmasın — sadece yazı şeridine basınca çıksın)
  function klavyeKapatDokun(e) {
    try {
      if (e.target && e.target.closest && e.target.closest('textarea, input[type="text"], input[type="search"], input:not([type])')) return;
      const a = document.activeElement;
      if (a && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && /^(text|search|)$/.test(a.type || "")))) a.blur();
    } catch (x) {}
  }
  // AYARLAR açılınca formu profilden doldur
  useEffect(() => {
    if (!ayarlarAcik) return;
    const b = profilBilgi || {};
    setEkTelefon(b.telefon || ""); setEkTelefon2(b.telefon2 || ""); setEk2Eposta(b.eposta2 || "");
    setAyarIsim(b.isim || ""); setAyarSoyisim(b.soyisim || "");
    setHaberYerler(Array.isArray(b.haberKonumlari) ? b.haberKonumlari : []);
    setCinsiyet(b.cinsiyet || ""); const dg = b.dogum || {}; setDogumGun(dg.gun ? String(dg.gun) : ""); setDogumAy(dg.ay ? String(dg.ay) : ""); setDogumYil(dg.yil ? String(dg.yil) : "");
    setKurumTur((b.kurum && b.kurum.tur) || ""); setKurumAd((b.kurum && b.kurum.ad) || "");
    const k = b.konum || {};
    setKonumLat(typeof k.lat === "number" ? k.lat : null); setKonumLon(typeof k.lon === "number" ? k.lon : null); setKonumAdres(k.adres || "");
    setSrtUlke(k.ulke || ""); setSrtSehir(k.sehir || ""); setSrtIlce(k.ilce || ""); setSrtPosta(k.postaKodu || "");
    setTelKodu(b.telefonKodu || "+90"); setSektorListe(""); setSektorEkle(""); setTelKodAcik(false); setTelKodAra("");
    setMeslekAra(""); setAyarMsg("");
  }, [ayarlarAcik]); // eslint-disable-line react-hooks/exhaustive-deps
  // Meslek/sektör seç (Ayarlar) → profile kaydet (grup: meslek|fabrika|tedarik|isci|devlet)
  // ÇOKLU meslek + TOGGLE: dokun=ekle, tekrar dokun=iptal. profil.meslekler (dizi, aramalarda) + meslek (ANA, profilde/paylaşımda görünen). Panel AÇIK kalır.
  function ayarMeslekSec(ad, grup) {
    const uu = auth.currentUser; if (!uu) return;
    setProfilBilgi((p) => {
      const proOnce = (p && p.pro) || {};
      // pro.meslekler ANA kaynak; eski üst-düzey meslekler varsa onu taşı (tek yere birleştir)
      const mevcut = (Array.isArray(proOnce.meslekler) && proOnce.meslekler.length) ? proOnce.meslekler
        : (proOnce.meslek ? [proOnce.meslek] : (Array.isArray(p && p.meslekler) ? p.meslekler : ((p && p.meslek) ? [p.meslek] : [])));
      const ekli = mevcut.includes(ad);
      const yeni = ekli ? mevcut.filter((x) => x !== ad) : [...mevcut, ad];
      let ana = proOnce.meslek || (p && p.meslek) || "";
      if (ekli && ana === ad) ana = yeni[0] || "";   // ana meslek silindiyse → kalanların ilki
      if (!ana && yeni.length) ana = yeni[0];          // ana yoksa ilki
      const proYeni = { ...proOnce, meslekler: yeni, meslek: ana };
      const veri = { pro: proYeni }; if (grup) veri.sektorGrup = grup;
      profilKaydet(uu.uid, veri).catch(() => {}); // pro.meslekler'e kaydeder → profil/post/arama HEPSİ buradan okur
      return { ...(p || {}), ...veri };
    });
    setAyarMsg(t("ayarMeslekKaydedildi", "Kaydedildi ✓")); setTimeout(() => setAyarMsg(""), 1500);
  }
  // PROFİLDE/PAYLAŞIMDA görünecek ANA mesleği seç (seçili meslekler arasından)
  function ayarAnaMeslek(ad) {
    const uu = auth.currentUser; if (!uu) return;
    setProfilBilgi((p) => {
      const proYeni = { ...((p && p.pro) || {}), meslek: ad };
      profilKaydet(uu.uid, { pro: proYeni }).catch(() => {});
      return { ...(p || {}), pro: proYeni };
    });
    setAyarMsg(t("ayarAnaMeslekSec", "Profilde görünecek meslek seçildi ✓")); setTimeout(() => setAyarMsg(""), 1800);
  }
  // Telefon ülke kodu seç
  function ayarTelKodSec(k) {
    setTelKodu(k); setTelKodAcik(false); setTelKodAra("");
    const uu = auth.currentUser; if (uu) { setProfilBilgi((p) => ({ ...(p || {}), telefonKodu: k })); profilKaydet(uu.uid, { telefonKodu: k }).catch(() => {}); }
  }
  // Adres çöz (Nominatim) — İngilizce HER ZAMAN + yerel = ADRESİN BULUNDUĞU ÜLKENİN dili (Almanya→Almanca, Rusya→Rusça, Çin→Çince...)
  // yaz=true → şeritlere yazar (Konumumu bul); yaz=false → SADECE önizleme (haritaya dokun otomatik yazmaz)
  function ayarKonumCoz(lat, lon, yaz) {
    const base = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    // ülke kodu → o ülkenin ana dili (yerel adres bu dilde gelsin; tarayıcı dili değil)
    const CC_LANG = { ua: "uk", ru: "ru", by: "be", kz: "ru", cn: "zh", tw: "zh", hk: "zh", jp: "ja", kr: "ko", sa: "ar", ae: "ar", eg: "ar", iq: "ar", sy: "ar", jo: "ar", kw: "ar", qa: "ar", om: "ar", ye: "ar", ma: "ar", dz: "ar", tn: "ar", ly: "ar", lb: "ar", ir: "fa", il: "he", gr: "el", cz: "cs", se: "sv", dk: "da", no: "nb", at: "de", ch: "de", br: "pt", mx: "es", in: "hi", pk: "ur", th: "th", vn: "vi", gb: "en", us: "en", au: "en", ca: "en", ie: "en", nz: "en" };
    const ccDil = (cc) => { cc = (cc || "").toLowerCase(); return CC_LANG[cc] || cc || "en"; };
    const cikar = (d) => { if (!d) return null; const a = d.address || {}; return {
      ulke: latinYap(a.country || ""), sehir: latinYap(a.province || a.state || a.city || a.town || ""),
      ilce: latinYap(a.county || a.district || a.city_district || a.town || a.suburb || ""),
      sokak: latinYap([a.neighbourhood || a.quarter || a.suburb, a.road, a.house_number].filter(Boolean).join(" ")),
      posta: a.postcode || "", adres: latinYap(d.display_name || ""),
    }; };
    const bitir = (en, yerel) => {
      const obj = { en, yerel: yerel || en };
      setBulunan(obj); setKonumAdres((en && en.adres) || "");
      if (yaz && en) { setSrtUlke(en.ulke); setSrtSehir(en.sehir); setSrtIlce(en.ilce); setSrtSokak(en.sokak); setSrtPosta(en.posta); }
    };
    fetch(base + "&accept-language=en").then((r) => r.json()).then((den) => {
      const en = cikar(den);
      const lang = ccDil(den && den.address && den.address.country_code);
      if (lang && lang !== "en") {
        fetch(base + "&accept-language=" + lang).then((r) => r.json()).then((dy) => bitir(en, cikar(dy))).catch(() => bitir(en, en));
      } else bitir(en, en);
    }).catch(() => {});
  }
  // Bulunan adresi (en=İngilizce / yerel) ŞERİTLERE yaz — müşteri hangisini isterse
  function seritlereYaz(hangi) {
    const o = bulunan && (hangi === "yerel" ? bulunan.yerel : bulunan.en) || (bulunan && (bulunan.en || bulunan.yerel));
    if (!o) { setAyarMsg(t("ayarOnceSec", "Önce haritada bir yere dokun")); setTimeout(() => setAyarMsg(""), 2500); return; }
    setSrtUlke(o.ulke); setSrtSehir(o.sehir); setSrtIlce(o.ilce); setSrtSokak(o.sokak); setSrtPosta(o.posta);
    const m = t("ayarSeriteYazildi", "Adres şeritlere yazıldı ✓"); setAyarMsg(m); setTimeout(() => setAyarMsg(""), 3000);
    // Harita kapanır, şerit (Konum) paneli yazılı olarak açılır — düğme haritada kalmaz
    setHaritaMsg(""); setAyarHaritaAcik(false); setAyarBolum("konum");
  }
  // Açıklamayı CİHAZIN SESİYLE seçilen dilde oku (sesli dinle) — tekrar basınca durur
  function seslendir(metin) {
    try {
      if (!window.speechSynthesis) { setAyarMsg(t("sesYok", "Cihaz sesli okumayı desteklemiyor")); setTimeout(() => setAyarMsg(""), 2500); return; }
      if (sesliOkunan) { window.speechSynthesis.cancel(); setSesliOkunan(false); return; }
      const bcp = { tr: "tr-TR", en: "en-US", de: "de-DE", fr: "fr-FR", es: "es-ES", it: "it-IT", pt: "pt-PT", ru: "ru-RU", uk: "uk-UA", ar: "ar-SA", zh: "zh-CN", ja: "ja-JP", hi: "hi-IN" };
      const u = new SpeechSynthesisUtterance(metin || "");
      u.lang = bcp[(dil || "tr").split("-")[0]] || "en-US";
      u.onend = () => setSesliOkunan(false); u.onerror = () => setSesliOkunan(false);
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); setSesliOkunan(true);
    } catch (e) { setSesliOkunan(false); }
  }
  // Verilen metni panoya KOPYALA
  function adresKopyala(metin) {
    const a = (metin || "").trim(); if (!a) return;
    try { navigator.clipboard.writeText(a); } catch (e) { try { const ta = document.createElement("textarea"); ta.value = a; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); } catch (e2) {} }
    const m = t("ayarAdresKopyalandi", "Adres kopyalandı ✓"); setAyarMsg(m); setHaritaMsg(m); setTimeout(() => { setAyarMsg(""); setHaritaMsg(""); }, 2200);
  }
  // Telefon GPS → konumu bul + haritaya işle
  function ayarKonumBul() {
    if (!navigator.geolocation) { setAyarMsg(t("ayarKonumYok", "Cihaz konumu desteklemiyor")); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      const la = pos.coords.latitude, lo = pos.coords.longitude;
      setKonumLat(la); setKonumLon(lo); ayarKonumCoz(la, lo, true); // Konumumu bul = şeritlere yazar (kasıtlı eylem)
      const map = ayarHaritaRef.current;
      if (map) { try { map.flyTo({ center: [lo, la], zoom: 15 }); if (ayarPinRef.current) ayarPinRef.current.setLngLat([lo, la]); else ayarPinRef.current = new maplibregl.Marker({ color: "#FFD700" }).setLngLat([lo, la]).addTo(map); } catch (e) {} }
    }, () => setAyarMsg(t("ayarKonumIzin", "Konum izni verilmedi")), { enableHighAccuracy: true, timeout: 9000 });
  }
  // Konumu kaydet (koordinat + yazılabilir ülke/şehir/ilçe/posta + tam adres)
  function ayarKonumKaydet() {
    const uu = auth.currentUser; if (!uu) return;
    const veri = { konum: { lat: konumLat, lon: konumLon, adres: (konumAdres || "").trim(), ulke: srtUlke.trim(), sehir: srtSehir.trim(), ilce: srtIlce.trim(), sokak: srtSokak.trim(), postaKodu: srtPosta.trim() } };
    setProfilBilgi((p) => ({ ...(p || {}), ...veri }));
    profilKaydet(uu.uid, veri).then(() => { setAyarMsg(t("ayarKonumKaydedildi", "Konum kaydedildi ✓")); setTimeout(() => setAyarMsg(""), 2500); }).catch(() => setAyarMsg(t("ayarHata", "Kaydedilemedi")));
  }
  // TAM EKRAN KONUM HARİTASI — MapLibre GL (Google Haritalar gibi: iki parmakla DÖNER, akıcı, GPU). OSM döşeme korunur.
  useEffect(() => {
    if (!ayarHaritaAcik) {
      if (ayarHaritaRef.current) { try { ayarHaritaRef.current.remove(); } catch (e) {} ayarHaritaRef.current = null; ayarPinRef.current = null; }
      return;
    }
    const tid = setTimeout(() => {
      try {
        if (ayarHaritaRef.current) { ayarHaritaRef.current.resize(); return; }
        if (!document.getElementById("ayarTamHarita")) return;
        const bLat = konumLat != null ? konumLat : 39, bLon = konumLon != null ? konumLon : 35;
        const map = new maplibregl.Map({
          container: "ayarTamHarita",
          // RASTER OSM standart döşeme — VEKTÖR (OpenFreeMap) kullanıcının S25'inde BOMBOŞ/beyaz geldi → geri alındı (B128). Raster çalışıyor: renkli/detaylı + verisi olan yerde bina no. (Harita ÜSTÜ yazılar yerel dilde — resim, çevrilemez; ADRES iki dilli.)
          style: { version: 8, sources: { osm: { type: "raster", tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, maxzoom: 19, attribution: "© OpenStreetMap" } }, layers: [{ id: "osm", type: "raster", source: "osm", paint: { "raster-fade-duration": 0 } }] },
          center: [bLon, bLat], zoom: konumLat != null ? 15 : 4, attributionControl: false, fadeDuration: 0,
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-left"); // pusula = döndür/sıfırla
        ayarHaritaRef.current = map;
        let poiMarks = [], poiZmn = null;
        // Her TÜR kendi rengi — kullanıcının istedikleri belirgin: BERBER/KUAFÖR pembe, BANKA altın, OTEL camgöbeği, FAST FOOD kırmızı
        const poiRenk = { hairdresser: "#ff2d9b", beauty: "#ff2d9b", barber: "#ff2d9b", bank: "#f7b500", atm: "#f7b500", hotel: "#00b8d4", motel: "#00b8d4", guest_house: "#00b8d4", hostel: "#00b8d4", fast_food: "#e74c3c", restaurant: "#ff6b3d", cafe: "#e67e22", supermarket: "#27ae60", convenience: "#2ecc71", marketplace: "#27ae60", pharmacy: "#8e44ad", hospital: "#e91e63", clinic: "#e91e63", post_office: "#16a085", fuel: "#d35400", school: "#3498db", university: "#3498db", bakery: "#e8a33d", mosque: "#2ecc71", church: "#bdc3c7", clothes: "#9b59b6", jewelry: "#f1c40f", townhall: "#2980b9", courthouse: "#9b59b6", police: "#34495e", fire_station: "#c0392b", library: "#16a085", government: "#2980b9", tax: "#2980b9" };
        function poiYukle(lat, lon) {
          const q = `[out:json][timeout:16];(node["amenity"~"^(restaurant|cafe|fast_food|pharmacy|hospital|clinic|bank|atm|post_office|fuel|school|university|bakery|marketplace|mosque|church|supermarket|townhall|courthouse|police|fire_station|library)$"](around:1400,${lat},${lon});node["tourism"~"^(hotel|motel|guest_house|hostel)$"](around:1400,${lat},${lon});node["office"~"^(government|tax|insurance)$"](around:1400,${lat},${lon});node["shop"~"^(supermarket|convenience|hairdresser|beauty|barber|clothes|bakery|jewelry)$"](around:1400,${lat},${lon}););out body 120;`;
          // Cok sunuculu yedek: overpass-api.de cogu zaman 0 doner/rate-limit; kumi.systems guvenilir (B107 — Almanya Sparkasse bug'i).
          const opSunucu = ["https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://overpass.osm.ch/api/interpreter"];
          const opDene = (i) => {
            if (i >= opSunucu.length) return Promise.resolve(null);
            return fetch(opSunucu[i] + "?data=" + encodeURIComponent(q)).then((r) => { if (!r.ok) throw new Error("op " + r.status); return r.json(); }).then((d) => {
              if ((!d || !d.elements || !d.elements.length) && i + 1 < opSunucu.length) return opDene(i + 1);
              return d;
            }).catch(() => opDene(i + 1));
          };
          opDene(0).then((d) => {
            if (!ayarHaritaRef.current || !d) return;
            poiMarks.forEach((m) => { try { m.remove(); } catch (e) {} }); poiMarks = [];
            (d.elements || []).forEach((el) => {
              const tur = el.tags.amenity || el.tags.tourism || el.tags.office || el.tags.shop || ""; const renk = poiRenk[tur] || "#7f8c8d";
              if (!tur) return;
              const dot = document.createElement("div"); dot.style.cssText = `background:${renk};width:19px;height:19px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.7);cursor:pointer`;
              const ad = el.tags.name || tur;
              const mk = new maplibregl.Marker({ element: dot }).setLngLat([el.lon, el.lat]).setPopup(new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(`<b>${ad}</b>${el.tags.name ? "<br><span style='opacity:.7'>" + tur + "</span>" : ""}`)).addTo(map);
              poiMarks.push(mk);
            });
          }).catch(() => {});
        }
        if (konumLat != null) { ayarPinRef.current = new maplibregl.Marker({ color: "#FFD700" }).setLngLat([bLon, bLat]).addTo(map); poiYukle(bLat, bLon); }
        map.on("click", (e) => {
          const la = e.lngLat.lat, lo = e.lngLat.lng;
          if (ayarPinRef.current) ayarPinRef.current.setLngLat([lo, la]); else ayarPinRef.current = new maplibregl.Marker({ color: "#FFD700" }).setLngLat([lo, la]).addTo(map);
          setKonumLat(la); setKonumLon(lo); ayarKonumCoz(la, lo, false); // haritaya DOKUN = sadece önizleme, şeritlere YAZMAZ
        });
        map.on("moveend", () => { if (map.getZoom() < 13) return; clearTimeout(poiZmn); poiZmn = setTimeout(() => { const c = map.getCenter(); poiYukle(c.lat, c.lng); }, 600); });
        map.once("idle", () => { if (map.getZoom() >= 13) { const c = map.getCenter(); poiYukle(c.lat, c.lng); } }); // açılışta da yükle (banka/otel/berber noktaları hemen gelsin)
        if (konumLat == null && navigator.geolocation) navigator.geolocation.getCurrentPosition((pos) => {
          const la = pos.coords.latitude, lo = pos.coords.longitude; if (!ayarHaritaRef.current) return;
          map.flyTo({ center: [lo, la], zoom: 15 });
          if (ayarPinRef.current) ayarPinRef.current.setLngLat([lo, la]); else ayarPinRef.current = new maplibregl.Marker({ color: "#FFD700" }).setLngLat([lo, la]).addTo(map);
          setKonumLat(la); setKonumLon(lo); ayarKonumCoz(la, lo, false); poiYukle(la, lo); // açılış otomatik konumu = önizleme
        }, () => {}, { enableHighAccuracy: true, timeout: 8000 });
      } catch (e) {}
    }, 250);
    return () => clearTimeout(tid);
  }, [ayarHaritaAcik]); // eslint-disable-line react-hooks/exhaustive-deps
  // TELEFON KODU HARİTASI — LEAFLET (SVG, WebGL DEĞİL → HER cihazda kesin çizilir, siyah kalmaz). Renkli ülkeler + isim+kod + DOKUN→kod otomatik.
  useEffect(() => {
    if (!telHaritaAcik) {
      if (telHaritaRef.current) { try { telHaritaRef.current.remove(); } catch (e) {} telHaritaRef.current = null; }
      return;
    }
    setTelHaritaSec(null);
    const tid = setTimeout(() => {
      try {
        if (telHaritaRef.current || !document.getElementById("telKodHarita")) return;
        const renkler = ["#e74c3c", "#3498db", "#27ae60", "#f39c12", "#8e44ad", "#16a085", "#d35400", "#c0392b", "#2980b9", "#1abc9c", "#e67e22", "#e91e63"];
        const isoRenk = (iso) => { if (!iso) return "#3a2a4f"; let h = 0; for (let i = 0; i < iso.length; i++) h = iso.charCodeAt(i) + ((h << 5) - h); return renkler[Math.abs(h) % renkler.length]; };
        fetch(process.env.PUBLIC_URL + "/countries-50m.json").then((r) => r.json()).then((dunya) => {
          if (telHaritaRef.current || !document.getElementById("telKodHarita")) return;
          const geo = topoFeature(dunya, dunya.objects.countries);
          // ANTİMERİDYEN DÜZELT: Rusya/Fiji vb. 180°'yi geçip harita boyunca "sarı şerit" çiziyordu (üst kesik, Rusya ismi yanlış yerde).
          // Çözüm: bir ülke hem -150'den küçük hem +150'den büyük boylam içeriyorsa (180'i geçiyorsa), negatif boylamları +360 kaydır → tek parça, şerit YOK, merkez doğru → "Rusya +7" doğru yerde.
          const antiDuzelt = (g) => {
            const lonlar = []; const top = (c) => { if (typeof c[0] === "number") lonlar.push(c[0]); else c.forEach(top); }; top(g.coordinates);
            if (Math.min(...lonlar) < -150 && Math.max(...lonlar) > 150) {
              const kaydir = (c) => { if (typeof c[0] === "number") { if (c[0] < 0) c[0] += 360; } else c.forEach(kaydir); }; kaydir(g.coordinates);
            }
          };
          geo.features.forEach((f) => { try { antiDuzelt(f.geometry); } catch (e) {} });
          // İsim EN BÜYÜK parçanın ortasına gömülür (Türkiye Ege adasında değil ANADOLU'da; Rusya merkezde; ada/sınır dışına taşmaz)
          const buyukMerkez = (g) => {
            const polys = g.type === "MultiPolygon" ? g.coordinates : [g.coordinates];
            let best = null, bestArea = -1;
            polys.forEach((poly) => { const ring = poly[0]; let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9; ring.forEach((c) => { if (c[0] < mnx) mnx = c[0]; if (c[0] > mxx) mxx = c[0]; if (c[1] < mny) mny = c[1]; if (c[1] > mxy) mxy = c[1]; }); const ar = (mxx - mnx) * (mxy - mny); if (ar > bestArea) { bestArea = ar; best = [(mny + mxy) / 2, (mnx + mxx) / 2]; } });
            return best;
          };
          const harita = L.map("telKodHarita", { minZoom: 1, maxZoom: 6, attributionControl: false, worldCopyJump: false }).setView([34, 60], 1.4);
          harita.getContainer().style.background = "#0d0818";
          harita.createPane("ozelBolgePane"); harita.getPane("ozelBolgePane").style.zIndex = 640; // Kırım/KKTC HER ZAMAN ülke katmanının üstünde (Rusya bringToFront yapsa bile içine almaz)
          let onceki = null;
          L.geoJSON(geo, {
            style: (f) => { const iso = NUM_TO_ISO2[parseInt(f.id)] || ""; return { fillColor: isoRenk(iso), fillOpacity: 0.85, color: "#0d0818", weight: 0.6 }; },
            onEachFeature: (f, layer) => {
              const iso = NUM_TO_ISO2[parseInt(f.id)] || "";
              const kod = iso ? (isoToTelKod[iso] || "") : "";
              const ad = iso ? ulkeAdiCevir(iso, dil, "") : "";
              if (ad && kod) { try { const m = buyukMerkez(f.geometry); if (m) L.tooltip({ permanent: true, direction: "center", className: "tel-ht-daimi" }).setLatLng(m).setContent(`${ad} ${kod}`).addTo(harita); } catch (e) {} }
              layer.on("click", () => {
                if (!iso || !kod) return;
                if (onceki) onceki.setStyle({ weight: 0.6, color: "#0d0818", fillOpacity: 0.85 });
                layer.setStyle({ weight: 2.5, color: "#FFD700", fillOpacity: 0.96 }); layer.bringToFront(); onceki = layer;
                setTelHaritaSec({ iso, kod, ad: ad || iso.toUpperCase() });
                ayarTelKodSec(kod); // dokununca kod OTOMATİK seçilir
              });
            },
          }).addTo(harita);
          // ÖZEL BÖLGELER (siyasi denge): Kuzey Kıbrıs + Kırım — NOKTA YOK, kendi SINIR ÇİZGİSİ olan bağımsız poligon,
          // kesik/farklı renk (özel/sıkıntılı bölge görünümü), üstte çizilir → Rusya/Kıbrıs'a basınca onları İÇİNE ALMAZ; dokun→kod.
          let ozelOnceki = null;
          const ozelBolge = (ring, ad, kod, renk) => {
            const pol = L.polygon(ring, { pane: "ozelBolgePane", color: renk, weight: 2, fillColor: renk, fillOpacity: 0.8 }).addTo(harita); // DÜZ sınır çizgisi, farklı renk (özel bölge), nokta yok; üst pane
            pol.bringToFront();
            let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9; ring.forEach((c) => { if (c[1] < mnx) mnx = c[1]; if (c[1] > mxx) mxx = c[1]; if (c[0] < mny) mny = c[0]; if (c[0] > mxy) mxy = c[0]; });
            L.tooltip({ permanent: true, direction: "center", className: "tel-ht-daimi" }).setLatLng([(mny + mxy) / 2, (mnx + mxx) / 2]).setContent(`${ad} ${kod}`).addTo(harita);
            pol.on("click", (ev) => {
              if (ev.originalEvent) L.DomEvent.stopPropagation(ev); // Rusya/Kıbrıs'a sıçramasın → İÇİNE ALMAZ
              if (onceki) { onceki.setStyle({ weight: 0.6, color: "#0d0818", fillOpacity: 0.85 }); onceki = null; }
              if (ozelOnceki) ozelOnceki.setStyle({ weight: 2, fillOpacity: 0.8 });
              pol.setStyle({ weight: 3.5, fillOpacity: 0.95 }); pol.bringToFront(); ozelOnceki = pol;
              setTelHaritaSec({ iso: "", kod, ad }); ayarTelKodSec(kod);
            });
          };
          // Kuzey Kıbrıs + Kırım — OSM GERÇEK sınır verisi (src/ozelBolgeler.js). Doğru şekil, denize taşmaz; üstte çizilir → Rusya/Kıbrıs İÇİNE ALMAZ.
          ozelBolge(KKTC_RING, t("kuzeyKibris", "Kuzey Kıbrıs"), "+90 392", "#00d2c0");
          ozelBolge(KIRIM_RING, "Kırım", "+7", "#ff7a45");
          telHaritaRef.current = harita;
          harita.invalidateSize();
        }).catch(() => {});
      } catch (e) {}
    }, 250);
    return () => clearTimeout(tid);
  }, [telHaritaAcik]); // eslint-disable-line react-hooks/exhaustive-deps
  // İletişim (2. e-posta + telefon) kaydet
  function ayarIletisimKaydet() {
    const uu = auth.currentUser; if (!uu) return;
    const veri = { telefon: (ekTelefon || "").trim(), telefon2: (ekTelefon2 || "").trim(), eposta2: (ek2Eposta || "").trim(), telefonKodu: (telKodu || "").trim() };
    setProfilBilgi((p) => ({ ...(p || {}), ...veri }));
    profilKaydet(uu.uid, veri).then(() => { setAyarMsg(t("ayarKaydedildi", "Kaydedildi ✓")); setTimeout(() => setAyarMsg(""), 2500); }).catch(() => setAyarMsg(t("ayarHata", "Kaydedilemedi")));
  }
  // CİNSİYET seç → ANINDA kaydet (Gloxoo hitabı buna göre: Bey/Hanım)
  function cinsiyetSec(deger) {
    setCinsiyet(deger);
    const uu = auth.currentUser; if (!uu) return;
    setProfilBilgi((p) => ({ ...(p || {}), cinsiyet: deger }));
    profilKaydet(uu.uid, { cinsiyet: deger }).then(() => { setAyarMsg(t("ayarKaydedildi", "Kaydedildi ✓")); setTimeout(() => setAyarMsg(""), 2000); }).catch(() => {});
  }
  // AD / SOYAD kaydet (ilk girişte yazılanı düzelt) → her yerde (profil/gönderi/hikâye/Gloxoo) güncellenir
  function ayarAdKaydet() {
    const uu = auth.currentUser; if (!uu) return;
    const isim = (ayarIsim || "").trim(), soyisim = (ayarSoyisim || "").trim();
    if (!isim) { setAyarMsg(t("ayarAdBos", "İsim boş olamaz")); setTimeout(() => setAyarMsg(""), 2500); return; }
    const veri = { isim, soyisim };
    setProfilBilgi((p) => ({ ...(p || {}), isim, soyisim }));
    profilKaydet(uu.uid, veri).then(() => { setAyarMsg(t("ayarAdKaydedildi", "Adın kaydedildi ✓ — Gloxoo artık yeni adını biliyor")); setTimeout(() => setAyarMsg(""), 3200); }).catch(() => setAyarMsg(t("ayarHata", "Kaydedilemedi")));
  }
  // HABER / İLGİ KONUMLARI (adresten ayrı) — Gloxoo bu yerlerin haber/spor/gündemini bilir
  function haberYerEkle() { setHaberYerler((l) => (l.length >= 3 ? l : [...l, { ulke: "", sehir: "", ilce: "" }])); }
  function haberYerSil(i) { setHaberYerler((l) => l.filter((_, j) => j !== i)); }
  function haberYerGuncelle(i, alan, deger) { setHaberYerler((l) => l.map((y, j) => (j === i ? { ...y, [alan]: deger } : y))); }
  function haberYerlerKaydet() {
    const uu = auth.currentUser; if (!uu) return;
    const temiz = haberYerler.map((y) => ({ ulke: (y.ulke || "").trim(), sehir: (y.sehir || "").trim(), ilce: (y.ilce || "").trim() })).filter((y) => y.ulke || y.sehir || y.ilce).slice(0, 3);
    setProfilBilgi((p) => ({ ...(p || {}), haberKonumlari: temiz }));
    profilKaydet(uu.uid, { haberKonumlari: temiz }).then(() => { setAyarMsg(t("ayarHaberKaydedildi", "Haber konumların kaydedildi ✓ — Gloxoo bu yerleri biliyor")); setTimeout(() => setAyarMsg(""), 3200); }).catch(() => setAyarMsg(t("ayarHata", "Kaydedilemedi")));
  }
  // DOĞUM TARİHİ kaydet (gün/ay/yıl) → Gloxoo yaşı bilir
  function dogumKaydet() {
    const uu = auth.currentUser; if (!uu) return;
    const g = parseInt(dogumGun, 10), a = parseInt(dogumAy, 10), y = parseInt(dogumYil, 10);
    if (!g || !a || !y) { setAyarMsg(t("ayarDogumEksik", "Gün, ay ve yıl seç")); setTimeout(() => setAyarMsg(""), 2500); return; }
    const veri = { dogum: { gun: g, ay: a, yil: y } };
    setProfilBilgi((p) => ({ ...(p || {}), ...veri }));
    profilKaydet(uu.uid, veri).then(() => { setAyarMsg(t("ayarKaydedildi", "Kaydedildi ✓")); setTimeout(() => setAyarMsg(""), 2500); }).catch(() => setAyarMsg(t("ayarHata", "Kaydedilemedi")));
  }
  // Hesap türü / kurumsal kaydet
  function ayarTurKaydet(yeniTip, kurum) {
    const uu = auth.currentUser; if (!uu) return;
    const veri = { tip: yeniTip };
    if (kurum) veri.kurum = kurum;
    setProfilBilgi((p) => ({ ...(p || {}), ...veri }));
    profilKaydet(uu.uid, veri).then(() => { try { localStorage.setItem("gw_tip", yeniTip); } catch (e) {} setAyarMsg(t("ayarKaydedildi", "Kaydedildi ✓")); setTimeout(() => setAyarMsg(""), 2500); }).catch(() => setAyarMsg(t("ayarHata", "Kaydedilemedi")));
  }
  // Şifre sıfırlama bağlantısı gönder (giriş e-postasına)
  function ayarSifreSifirla() {
    const eposta = (u && u.email) || "";
    if (!eposta) { setAyarMsg(t("ayarEpostaYok", "E-posta bulunamadı (Google ile girdiysen şifre Google'da değişir).")); return; }
    const acs = { url: "https://gloxorg.com/", handleCodeInApp: false };
    sendPasswordResetEmail(auth, eposta, acs).then(() => { setAyarMsg(t("ayarSifreGonderildi2", "E-postana bağlantı gönderdik ✓ → e-postanı aç, bağlantıya dokun, YENİ şifreni yaz ve kaydet, sonra yeni şifrenle gir. Gelmezse Spam/Önemsiz klasörüne bak.")); setTimeout(() => setAyarMsg(""), 9000); }).catch(() => setAyarMsg(t("ayarHata", "Gönderilemedi")));
  }
  // Ayarlardan telefon bildirimi izni iste
  async function bildirimIzniIste() {
    try {
      if (typeof Notification === "undefined") { bilgiBalonu(t("bildDesteklenmiyor", "Bu cihaz/tarayıcı bildirimi desteklemiyor")); return; }
      const izin = await Notification.requestPermission();
      setBildirimIzin(izin); try { localStorage.setItem("groxBildirimIzin", izin); } catch (e) {}
      if (izin === "granted") {
        bilgiBalonu(t("bildAcildi", "Telefon bildirimleri açıldı"));
        telefonBildirimGoster(t("bildHosgeldin", "Bildirimler açık — beğeni, yorum ve mesajları buradan alacaksın"), "");
        // KAPALIYKEN bildirim — telefon anahtarını al ve SONUCU EKRANDA GÖSTER (nerede takıldıysa TAM sebebini yazar → bilgisayarsız teşhis)
        if (VAPID_KEY) {
          setAyarMsg(t("pushDeneniyor", "Telefon anahtarı alınıyor…"));
          const uu = auth.currentUser;
          const d = await fcmDurumAl(VAPID_KEY);
          if (d.sebep === "ok" && uu) { fcmTokenKaydet(uu.uid, d.token); setAyarMsg(t("pushKayitOk", "✓ Telefon kaydedildi — artık KAPALIYKEN de bildirim gelecek (beğeni/mesaj/arama). Şimdi başka hesaptan test et.")); }
          else { setAyarMsg("⚠ Kapalıyken bildirim AÇILAMADI. Sebep: " + d.sebep + (uu ? "" : " (giriş yok)") + " — bu yazının ekran görüntüsünü Code'a gönder."); }
          setTimeout(() => setAyarMsg(""), 15000);
        }
      }
      else bilgiBalonu(t("bildVerilmedi", "Bildirim izni verilmedi (telefon ayarlarından da açabilirsin)"));
    } catch (e) {}
  }
  // KAPALIYKEN bildirim — telefon anahtarını (FCM token) al ve Firestore'a kaydet (kullanicilar/{uid}.fcmTokens).
  // VAPID_KEY boşsa/desteklenmiyorsa sessizce çıkar (hiçbir şeyi bozmaz).
  async function pushKaydet() {
    try {
      if (!VAPID_KEY) return;
      const uu = auth.currentUser; if (!uu) return;
      const tk = await fcmTokenAl(VAPID_KEY);
      if (tk) fcmTokenKaydet(uu.uid, tk);
    } catch (e) {}
  }
  // Giriş yapılmış + bildirim izni ZATEN açıksa → her açılışta anahtarı tazele/kaydet (izin butonuna basmaya gerek kalmasın)
  useEffect(() => {
    if (!u || !VAPID_KEY) return;
    let izinli = false;
    try { izinli = (typeof Notification !== "undefined" && Notification.permission === "granted"); } catch (e) {}
    if (izinli) pushKaydet();
  }, [u]); // eslint-disable-line react-hooks/exhaustive-deps
  // Kısa bilgi balonu göster (alta belirir, 2.2 sn sonra kaybolur)
  function bilgiBalonu(metin) { setKucukMesaj(metin); setTimeout(() => setKucukMesaj((m) => (m === metin ? "" : m)), 2200); }
  // KAYDET — yer imi dolar/boşalır (kullanıcı başına bu cihazda saklanır) + açıklayıcı balon
  function kaydetToggle(p) {
    if (!p || !p.id) return;
    const yeni = new Set(kaydetSet); const vardi = yeni.has(p.id);
    if (vardi) yeni.delete(p.id); else yeni.add(p.id);
    setKaydetSet(yeni); try { localStorage.setItem("groxKaydet", JSON.stringify([...yeni])); } catch (e) {}
    bilgiBalonu(vardi ? t("kayitKaldirildi", "Kayıt kaldırıldı") : t("kayitEklendi", "Kaydedildi — bu cihazda saklandı, sonra tekrar bulabilirsin"));
  }
  // TAKİP ET / ÇIK — kişiyi takip et, akış kişiselleşsin
  function takipToggle(p) {
    const uu = auth.currentUser; const hedef = p && (p.uid || p.sahipUid);
    if (!uu || !hedef || hedef === uu.uid) return;
    const ediliyor = takipSet.has(hedef);
    const yeni = new Set(takipSet);
    if (ediliyor) { yeni.delete(hedef); takiptenCik(uu.uid, hedef).catch(() => {}); }
    else {
      yeni.add(hedef);
      takipEt(uu.uid, hedef, { ad: p.ad, foto: p.foto, meslek: p.meslek }).catch(() => {});
      // Takip edilene bildirim (kendine değil zaten engellenir)
      bildirimEkle({ aliciUid: hedef, gonderenUid: uu.uid, gonderenAd: benimAdGetir(), gonderenFoto: benimFotoGetir(), tip: "takip" }).catch(() => {});
    }
    setTakipSet(yeni);
    // Düğmeye YAKIN kısa etiket (1.6 sn sonra kaybolur); alttaki uzak bildirim KALDIRILDI
    setTakipBalon(hedef); clearTimeout(takipBalonZmnRef.current); takipBalonZmnRef.current = setTimeout(() => setTakipBalon((x) => (x === hedef ? null : x)), 1600);
  }
  // ÜYE SAYFASI AÇ — bir gönderinin sahibinin TÜM paylaşımlarını ayrı sayfada göster
  // (avatara basınca / tam ekranda sola çekince). Profilden bağımsız, kendi sayfası.
  function uyeyiAc(p) {
    const hedef = p && (p.uid || p.sahipUid);
    if (!hedef) return;
    // Kendi gönderimse → Profilim'e git (kendi sayfam zaten orada)
    const uu = auth.currentUser;
    if (uu && hedef === uu.uid) { setTamFoto(""); setAktifKod("profil"); return; }
    setTamFoto("");
    setUyeFiltre("hepsi");
    setUyePostlar(null);
    setUyeSayfa({ uid: hedef, ad: p.ad || "—", foto: p.foto || "", meslek: p.meslek || "", sehir: p.sehir || "", ulke: p.ulke || "", pro: !!p.pro, uyelik: p.uyelik || "", amblem: p.amblem, renk: p.renk });
    gonderilerimOku(hedef).then((l) => setUyePostlar(l || [])).catch(() => setUyePostlar([]));
  }
  // PAYLAŞ — telefonun yerel paylaş menüsü. FOTO/VİDEO varsa DOSYA olarak paylaş (filigranlı GLOXORG karşı platforma/WhatsApp'a gider); yoksa link.
  async function paylasNative(p) {
    const metin = (p && (p.yazi || p.baslik || p.ad)) || "";
    const link = window.location.href;
    try {
      // 1) FİLİGRANLI MEDYAYI DOSYA olarak paylaşmayı dene (WhatsApp vb. filigranlı görseli gösterir)
      const medyaUrl = p && (p.gorsel || p.video);
      if (medyaUrl && navigator.canShare && navigator.share) {
        try {
          const resp = await fetch(medyaUrl); const blob = await resp.blob();
          const uzanti = (blob.type && blob.type.split("/")[1]) || (p.video ? "mp4" : "jpg");
          const dosya = new File([blob], "GLOXORG." + uzanti, { type: blob.type || (p.video ? "video/mp4" : "image/jpeg") });
          if (navigator.canShare({ files: [dosya] })) {
            await navigator.share({ files: [dosya], title: "GLOXORG", text: metin ? (metin + "\n" + link) : link });
            return;
          }
        } catch (e) { /* dosya paylaşımı olmadı → linke düş */ }
      }
      // 2) Link paylaşımı
      if (navigator.share) { navigator.share({ title: "GLOXORG", text: metin, url: link }).catch(() => {}); }
      else if (navigator.clipboard) { navigator.clipboard.writeText(link); bilgiBalonu(t("baglantiKopyalandi", "Bağlantı kopyalandı")); }
    } catch (e) {}
  }
  // ÜÇ NOKTA (daha fazla) — paylaştan FARKLI seçenekler
  function dahaAc(p) { if (p && p.id) setDahaMenu(p); }
  function baglantiKopyala() {
    try { if (navigator.clipboard) navigator.clipboard.writeText(window.location.href); } catch (e) {}
    setDahaMenu(null); bilgiBalonu(t("baglantiKopyalandi", "Bağlantı kopyalandı"));
  }
  function ilgilenmiyorum(p) {
    if (p && p.id) setGercekAkis((a) => a.filter((g) => g.id !== p.id));
    setDahaMenu(null); setTamFoto(""); bilgiBalonu(t("dahaAzGoster", "Tamam, buna benzer daha az göstereceğiz"));
  }
  function gonderiBildir() { setDahaMenu(null); bilgiBalonu(t("bildirimAlindi", "Bildirimin alındı, teşekkürler — inceleyeceğiz")); }
  // YORUM — pencereyi aç + yorumları oku
  function yorumAc(p) {
    if (!p || !p.id) return;
    setYorumAcik(p); setYorumlar(null); setYorumYazi(""); setYorumDurum("");
    yorumlariOku(p.id).then(setYorumlar);
  }
  function yorumGonderEt() {
    const uu = auth.currentUser; if (!uu || !yorumAcik || !yorumYazi.trim()) return;
    setYorumDurum("gonderiliyor");
    const benimAd = (profilBilgi && [profilBilgi.isim, profilBilgi.soyisim].filter(Boolean).join(" ")) || adTam || "";
    const benimFoto = foto || isFoto || "";
    yorumEkle(yorumAcik.id, { uid: uu.uid, ad: benimAd, foto: benimFoto, metin: yorumYazi }).then((id) => {
      if (id) {
        const yk = { id, uid: uu.uid, ad: benimAd, foto: benimFoto, metin: yorumYazi.trim(), zamanMs: Date.now() };
        setYorumlar((l) => [...(l || []), yk]); setYorumYazi(""); setYorumDurum("ok");
        const guncel = (g) => g.id === yorumAcik.id ? { ...g, yorumSayisi: (g.yorumSayisi || 0) + 1 } : g;
        setGercekAkis((a) => a.map(guncel)); setGonderilerim((a) => a.map(guncel));
        // Yorum sayısını gönderiye KALICI yaz (yenileyince sıfırlanmasın)
        sayacDegistir(yorumAcik.id, "yorumSayisi", 1).catch(() => {}); // ATOMİK +1 (yorum sayısı doğru toplanır)
        // Gönderi sahibine BİLDİRİM (kendine değil)
        const sahip = yorumAcik.sahipUid || yorumAcik.uid;
        if (sahip && sahip !== uu.uid) bildirimEkle({ aliciUid: sahip, gonderenUid: uu.uid, gonderenAd: benimAd, gonderenFoto: benimFoto, tip: "yorum", gonderiId: yorumAcik.id, metin: yorumYazi.trim().slice(0, 60), gonderiResim: yorumAcik.gorsel || "", gonderiZemin: yorumAcik.zemin || "", gonderiVideo: yorumAcik.video || "" }).catch(() => {});
        // Yorum gönderilince pencere kendiliğinden kapanır (kullanıcı isteği)
        setTimeout(() => { setYorumAcik(null); setYorumDurum(""); }, 900);
      } else setYorumDurum("hata");
    }).catch(() => setYorumDurum("hata"));
  }
  // PAYLAŞ — yeni gönderi oluştur
  // ✨ YAPAY ZEKA YAZI ÖNERİSİ — GERÇEK CLAUDE (güvenli köprü; anahtar köprüde gizli); olmazsa yerel öneri
  // Gloxoo'ya KONUŞARAK "ne yazsın" söyle → aiIstek kutusuna yazar (tarayıcı ses tanıma)
  function aiIstekDinle() {
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { setPaylasDurum("sesyok"); return; }
      const rec = new SR();
      rec.lang = aiSesKodu(aiDilRef.current);
      rec.continuous = false; rec.interimResults = false;
      setAiIstekDinliyor(true);
      rec.onresult = (e) => { try { const tx = (e.results[0][0].transcript || "").trim(); if (tx) setAiIstek((p) => (p ? p + " " : "") + tx); } catch (x) {} };
      rec.onend = () => setAiIstekDinliyor(false);
      rec.onerror = () => setAiIstekDinliyor(false);
      rec.start();
    } catch (e) { setAiIstekDinliyor(false); }
  }
  async function aiYaziOner(istekOverride) {
    if (aiYukleniyor) return;
    setAiYukleniyor(true); setAiOneriler([]);
    const meslek = meslekAd || (profilBilgi && profilBilgi.pro && profilBilgi.pro.meslek) || t("aiUzman", "uzman");
    const sehir = (profilBilgi && profilBilgi.konum && profilBilgi.konum.sehir) || "";
    const canliKonum = (paylasKonum && paylasKonum.tam) || ""; // CANLI konum → Gloxoo o yere göre başlık/yazı hazırlar
    const tur = paylasTur || "";
    const dilAd = { tr: "Türkçe", en: "İngilizce (English)", de: "Almanca (Deutsch)", fr: "Fransızca (Français)", es: "İspanyolca (Español)", it: "İtalyanca (Italiano)", pt: "Portekizce (Português)", ru: "Rusça (Русский)", uk: "Ukraynaca (Українська)", ar: "Arapça (العربية)", zh: "Çince (中文)", ja: "Japonca (日本語)", hi: "Hintçe (हिन्दी)" }[dil] || "Türkçe";
    const mevcut = (paylasYazi || "").trim();
    const istek = ((typeof istekOverride === "string" ? istekOverride : aiIstek) || "").trim(); // kullanıcının Gloxoo'ya söylediği ne yazmak istediği (düğmeden hazır istek de gelebilir)
    // FOTO ya da VİDEO KARESİ ile Claude GÖRSÜN (vision) → içeriğe UYGUN, gerçekçi öneri
    let imgKaynak = null;
    try {
      let gors = "";
      if (paylasGorsel && paylasGorsel.indexOf("data:image") === 0) gors = paylasGorsel;
      else if (paylasVideo) { const kare = await videoKareYakala(paylasVideo); if (kare) gors = kare; } // videoyu "gör"
      if (gors) {
        const vir = gors.indexOf(",");
        const mt = (gors.match(/data:(image\/[a-z0-9.+-]+)/i) || [])[1] || "image/jpeg";
        if (vir > 0) imgKaynak = { type: "base64", media_type: mt, data: gors.slice(vir + 1) };
      }
    } catch (e) {}
    // KİMLİK: sahip adı + cinsiyet + yaş (yüz tanıma referansı için)
    const sahipAd = (profilBilgi && [profilBilgi.isim, profilBilgi.soyisim].filter(Boolean).join(" ")) || adTam || "";
    const sahipCins = (profilBilgi && profilBilgi.cinsiyet) || "";
    let sahipYas = "";
    try { const d = profilBilgi && profilBilgi.dogum; if (d && d.yil) { const y = new Date().getFullYear() - Number(d.yil); if (y > 0 && y < 120) sahipYas = String(y); } } catch (e) {}
    // C: profil fotoğrafını REFERANS görsel olarak ekle (yalnız paylaşımda görsel/video varsa)
    let refImg = null;
    try {
      if (imgKaynak && foto) {
        if (foto.indexOf("data:image") === 0) { const v = foto.indexOf(","); const mt = (foto.match(/data:(image\/[a-z0-9.+-]+)/i) || [])[1] || "image/jpeg"; if (v > 0) refImg = { type: "base64", media_type: mt, data: foto.slice(v + 1) }; }
        else if (/^https?:\/\//.test(foto)) refImg = { type: "url", url: foto };
      }
    } catch (e) {}
    const kimlik = (imgKaynak && refImg)
      ? `KİMLİK REFERANSI: Ekteki İLK görsel hesap sahibinin PROFİL fotoğrafı (sahip: ${sahipAd || "kullanıcı"}${sahipCins ? ", " + sahipCins : ""}${sahipYas ? ", ~" + sahipYas + " yaş" : ""}); İKİNCİ görsel paylaşılacak içeriktir. İkinci görseldeki kişi AÇIKÇA sahiple AYNI kişiyse ona adıyla/uygun hitapla yaz; FARKLI biriyse (yaş/cinsiyet uymuyorsa, ör. çocuk ya da başka cinsiyet) sahibin adını KULLANMA — gördüğün kişinin yaş/cinsiyetini (çocuk/genç/kadın/erkek/kız) tahmin edip ona göre yaz. EMİN DEĞİLSEN ad kullanma. `
      : (imgKaynak ? `Görseldeki kişi belirsizse/sahibin dışında biriyse sahip adını kullanma; yaş/cinsiyetini tahmin edip ona göre yaz. ` : "");
    const markaKapanis = `Her yazıyı, içeriğe/bölüme uygun KISA markalı bir kapanışla bitir — yazıya AKICI GÖMÜLÜ olsun, ayrı satır/etiket gibi DURMASIN: örn "Gloxorg life", "Gloxorg farkı", "Gloxorg.com'da buluşalım", "gloxoo.com". Uzun yazı paylaşımlarında sona doğal bir dokunuşla "(Gloxoo yapay zekâ ile hazırlandı)" ekleyebilirsin. Marka HER ZAMAN "Gloxorg" yazılır. `;
    const talimat = `${meslek ? "Meslek: " + meslek + ". " : ""}${sehir ? "Şehir: " + sehir + ". " : ""}${canliKonum ? "CANLI KONUM: Bu içerik ŞU AN şuradan paylaşılıyor → '" + canliKonum + "'. Başlığı/yazıyı bu YERE UYGUN, oranın havasını/duygusunu yansıtacak şekilde yaz (ör. hastanedeyse geçmiş olsun/şifa/moral; havalimanı/otogar ise yolculuk/heyecan; sahil/park ise huzur). Yeri doğal bir dille an. " : ""}${tur ? "Gönderi türü: " + tur + ". " : ""}${paylasVideo ? "Kullanıcı bir VİDEO ekledi" + (imgKaynak ? " (ekteki içerik görseli videodan alınmış bir karedir)" : "") + ". " : ""}${istek ? 'KULLANICININ İSTEĞİ (ne yazmak istediğini kendisi söyledi): "' + istek + '" — MUTLAKA buna göre, tam bunu anlatan yazılar üret. ' : ""}${mevcut ? 'Kullanıcının yazdığı taslak: "' + mevcut + '" — anlamını koru, güzelleştir ve zenginleştir. ' : ""}${imgKaynak ? "İÇERİK GÖRSELİNE DİKKATLİCE BAK: içinde ne/kim/nerede/ne oluyor gör; SADECE gördüğüne dayanarak, o ana özel, GERÇEK ve inandırıcı yaz (uydurma/klişe/genel geçer laf YOK). " : "Konuya uygun, "}${kimlik}bu kişi için sosyal medyada paylaşacağı 3 farklı gönderi yazısı öner. Yazılar RENKLİ, CANLI ve ÇARPICI olsun (sade/kuru DEĞİL): 1-3 cümle, akıcı, sıcak, kişisel, enerjik; HER yazıya 2-3 UYGUN emoji serpiştir (başına/içine/sonuna) ve 2-3 ilgili hashtag ekle. Duyguyu hissettir, davet edici ol. Tek kelimelik/çok kısa/kuru/saçma öneri VERME. ${markaKapanis}${dilAd} dilinde yaz. Önerileri ||| (üç dik çizgi) ile ayır; numara/tırnak/madde işareti KOYMA.`;
    const parcalar = [];
    if (refImg) parcalar.push({ type: "image", source: refImg });
    if (imgKaynak) parcalar.push({ type: "image", source: imgKaynak });
    parcalar.push({ type: "text", text: talimat });
    const mesajlar = parcalar.length > 1 ? [{ role: "user", content: parcalar }] : [{ role: "user", content: talimat }];
    try {
      const r = await fetch(AI_KOPRU, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mesajlar, sistem: "Sen Gloxoo'sun — GLOXORG luks profesyonel sosyal platformun yazi asistani. Ekte gorsel/video karesi varsa DIKKATLICE BAK ve SADECE gordugune dayanarak, o ana ozel, gercek ve inandirici yaz (uydurma/klise/tek-kelime YOK). Iki gorsel varsa ILKI hesap sahibinin profil fotosu, IKINCISI icerik; icerikteki kisi sahiple ayni degilse sahibin adini KULLANMA, gordugun kisinin yas/cinsiyetine gore yaz. Her yaziyi kisa markali bir kapanisla (Gloxorg life / Gloxorg farki / Gloxorg.com'da bulusalim gibi) yaziya GOMULU bitir; marka hep 'Gloxorg'. Oneriler dolu ve anlamli olsun: 1-3 cumle; uygunsa 1-2 emoji ve birkac hashtag. Istenen dilde yaz." }),
      });
      if (r.ok) {
        const veri = await r.json();
        const txt = (veri && veri.metin) || "";
        const ham = txt.indexOf("|||") >= 0 ? txt.split("|||") : txt.split("\n");
        const satirlar = ham.map((s) => s.replace(/^["'\d.)\-•*\s]+/, "").replace(/["']+$/, "").trim()).filter((s) => s.length > 8).slice(0, 3);
        if (satirlar.length) { setAiOneriler(satirlar); setAiYukleniyor(false); return; }
      }
    } catch (e) {}
    // AI ulaşılamazsa yerel öneriler — bunlara marka kapanışı EKLE (AI kendi gömemedi)
    setAiOneriler(yerelAiOneriler().map((s) => s + " " + markaImza())); setAiYukleniyor(false);
  }
  // Gloxoo önerisi BEĞENİLDİ 👍 → benzer ama daha iyi varyasyonlar öner + olumlu kayıt (yönetici sayfası)
  const aiBegen = (oneri) => {
    const saf = (oneri || "").split("\n\n")[0];
    try { geriBildirimEkle({ uid: (auth.currentUser && auth.currentUser.uid) || "", ad: adTam || "", oneri: saf, begendi: true, sayfa: "paylas-ai" }); } catch (e) {}
    const s = t("gloxooBenzer", "Şuna benzer ama daha iyi ve farklı bir paylaşım yazısı yaz: ") + saf;
    setAiYorumAcik(-1); setAiIstek(s); aiYaziOner(s);
  };
  // BEĞENİLMEDİ 👎 → "neyi beğenmedin" kutusunu aç (isteğe bağlı yaz)
  const aiBegenmeAc = (k) => { setAiYorumAcik(aiYorumAcik === k ? -1 : k); setAiYorum(""); };
  // Beğenmeme kaydı (yorumlu ya da yorumsuz) → Firebase + yeni öneriler
  const aiBegenmeGonder = (oneri, yorumlu) => {
    const saf = (oneri || "").split("\n\n")[0];
    try { geriBildirimEkle({ uid: (auth.currentUser && auth.currentUser.uid) || "", ad: adTam || "", oneri: saf, begendi: false, yorum: yorumlu ? aiYorum.trim() : "", sayfa: "paylas-ai" }); } catch (e) {}
    setAiYorumAcik(-1); setAiYorum("");
    try { bilgiBalonu(t("geriBildirimTesekkur", "Teşekkürler! Geri bildirimin bize ulaştı 💎")); } catch (e) {}
    aiYaziOner(); // yeni öneriler üret
  };
  // SADECE SAHİP (yönetici) — geri bildirim sayfasını görebilir
  const yoneticiMi = () => { try { return !!(auth.currentUser && auth.currentUser.email === "abdulkadirciftsuren@gmail.com"); } catch (e) { return false; } };
  const yoneticiVeriYukle = async () => {
    setGbYukleniyor(true);
    try {
      const [gb, kl, gn] = await Promise.all([geriBildirimOku(300), tumKullanicilar(400), tumGonderiler(300)]);
      setGeriBildirimListe(gb || []); setGbKullanicilar(kl || []); setGbGonderiler(gn || []);
    } catch (e) { setGeriBildirimListe([]); setGbKullanicilar([]); setGbGonderiler([]); }
    setGbYukleniyor(false);
  };
  const geriBildirimAc = async () => {
    setMenuAcik(false); setGeriBildirimAcik(true); setGbSekme("geri");
    yoneticiVeriYukle();
  };
  // Yöneticide bir kullanıcının e-postasını panoya kopyala (tam adres — kesilmeden)
  const gbEpostaKopyala = (k) => {
    const e = k.eposta || k.email || ""; if (!e) return;
    try { navigator.clipboard.writeText(e); } catch (x) {}
    setGbEpostaKopya(k.id); setTimeout(() => setGbEpostaKopya((v) => (v === k.id ? "" : v)), 1500);
  };
  // BEĞENENLER listesini aç (kalp altındaki ufak fotolara dokununca)
  const begenenlerAc = async (postId) => {
    if (!postId) return;
    setBegenenModal(postId); setBegenenModalYuk(true); setBegenenModalListe([]);
    try { const bl = await begenenleriOku(postId, 150); setBegenenModalListe(bl || []); } catch (e) {}
    setBegenenModalYuk(false);
  };
  // KİŞİYE MESAJ (beğenen/yorumcuya karşılık) → WhatsApp gibi sohbeti aç
  const kisiyeMesaj = (k) => {
    if (!k || !k.uid) return;
    sohbetAc({ uid: k.uid, ad: k.ad, foto: k.foto });
  };
  // KARŞILIK ikonları (Takip + Mesaj) — beğenen/yorumcuya karşılık ver
  const kisiKarsilik = (k) => (
    <>
      <button className={"kars-ik kars-takip" + (takipSet.has(k.uid) ? " ediliyor" : "")} onClick={(e) => { e.stopPropagation(); takipToggle(k); }} aria-label={takipSet.has(k.uid) ? t("takipEdiliyor", "Takip ✓") : t("takipEt", "+ Takip")} title={takipSet.has(k.uid) ? t("takipEdiliyor", "Takip ✓") : t("takipEt", "+ Takip")}>
        {takipSet.has(k.uid)
          ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3.2 2.5-5 5.5-5s5.5 1.8 5.5 5" /><path d="M19 8v6M22 11h-6" /></svg>}
      </button>
      <button className="kars-ik kars-mesaj" onClick={(e) => { e.stopPropagation(); kisiyeMesaj(k); }} aria-label={t("mesajGonderKisa", "Mesaj")} title={t("mesajGonderKisa", "Mesaj")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v12H7l-3 3z" /></svg>
      </button>
    </>
  );
  // YÖNETİCİ — gönderi sil (moderasyon)
  const gbGonderiSil = async (id) => {
    if (!id) return;
    try { await gonderiSil(id); setGbGonderiler((a) => a.filter((g) => g.id !== id)); setGercekAkis((a) => a.filter((g) => g.id !== id)); } catch (e) {}
  };
  const gbKullaniciSil = async (id) => {
    if (!id) return;
    const ok = await kullaniciSil(id);
    if (ok) setGbKullanicilar((a) => a.filter((k) => k.id !== id));
    else bilgiBalonu(t("gbSilHata", "Silinemedi. Firebase kurallarında kullanıcı silme izni gerekiyor."));
  };
  // SİTE ASİSTANI KOMUTU → pencere aç (asistanı kapat ki açılan görünsün)
  function komutAc(k) {
    setYardimciAcik(false);
    if (k === "profil") setAktifKod("profil");
    else if (k === "anasayfa" || k === "kesfet") setAktifKod("home");
    else if (k === "konum") setAktifKod("konum");
    else if (k === "ara" || k === "arama") setAraAcik(true);
    else if (k === "bildirim" || k === "bildirimler") setBildirimAcik(true);
    else if (k === "mesaj" || k === "mesajlar") setMesajAcik(true);
    else if (k === "paylas" || k === "paylasim") { setDuzenlenen(null); setPaylasYazi(""); setPaylasBaslik(""); setAiIstek(""); setAiOneriler([]); setPaylasGorsel(""); setPaylasEkFotolar([]); setPaylasVideo(""); setPaylasVideoFile(null); setPaylasVideoPoster(""); setPaylasDosya(null); setMedyaMenu(""); setTurSecAcik(false); setPaylasDurum(""); setPaylasKonum(null); setKonumDurum(""); setYaziMedyaUstunde(false); setPaylasAcik(true); }
    else if (k === "ayar" || k === "ayarlar") setAyarlarAcik(true);
  }
  // Asistana FOTOĞRAF ekle — küçült (max 1024px) + base64'e çevir (Claude vision için)
  const yardimciFotoSec = (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1024; let w = img.width, h = img.height;
        if (w > max || h > max) { const o = Math.min(max / w, max / h); w = Math.round(w * o); h = Math.round(h * o); }
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        const durl = c.toDataURL("image/jpeg", 0.85);
        setYardimciFoto({ dataURL: durl, base64: durl.split(",")[1], mediaType: "image/jpeg" });
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(f);
    e.target.value = "";
  };
  // CANLI GÜNCEL HABER / FUTBOL — birden çok haber kaynağı (Google + Yahoo News RSS) ve birden çok CORS köprüsü dener;
  // biri çalışırsa başlıkları döndürür. Gloxoo'ya bağlam olur → güncel soruları GERÇEK başlıklarla yanıtlar (uydurmaz).
  function haberBasliklariCoz(xml) {
    const out = []; if (!xml) return out;
    const re = /<item[\s>][\s\S]*?<\/item>/gi; let m;
    while ((m = re.exec(xml)) && out.length < 14) {
      const blok = m[0];
      const tm = blok.match(/<title>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/title>/i);
      const pm = blok.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
      if (!tm || !tm[1]) continue;
      const baslik = tm[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
      if (!baslik || baslik.length < 8) continue;
      let ne = "";
      if (pm) { try { const d = new Date(pm[1].trim()); const dk = Math.round((Date.now() - d.getTime()) / 60000); if (dk >= 0 && dk < 20160) ne = dk < 60 ? dk + " dk önce" : dk < 1440 ? Math.round(dk / 60) + " saat önce" : Math.round(dk / 1440) + " gün önce"; } catch (e) {} }
      out.push(`• ${baslik}${ne ? " — " + ne : ""}`);
    }
    return out;
  }
  async function guncelHaberAra(soru) {
    try {
      const hl = ((aiDilRef.current || dil || "tr") + "").split("-")[0];
      const gl = ((konum && konum.kod) || "TR").toUpperCase();
      const dusuk = (soru || "").toLowerCase();
      const genelMi = /\b(haber|haberler|gündem|son dakika|ne oldu|ne olmuş|neler ol|bugün ne|dünyada|news|headline|breaking|today|новости|nachrichten)\b/i.test(dusuk)
        && !/futbol|maç|skor|sonuç|gol|lig|puan|transfer|şampiyon|takım|dünya kupası|fifa|derbi|football|soccer|match|score|result|league|матч|fußball/i.test(soru || "");
      // İLGİ/HABER KONUMU: kullanıcının ayarladığı yerler (yoksa cihaz/profil şehri). "şehrim/buram/takımım" derse burayı baz al.
      const ilgiYerler = (profilBilgi && Array.isArray(profilBilgi.haberKonumlari) ? profilBilgi.haberKonumlari : []).map((h) => (h.ilce || h.sehir || h.ulke || "")).filter(Boolean);
      const ilgiSehir = ilgiYerler[0] || (konum && konum.sehir) || "";
      // SADECE "şehrim/takımım/buram" gibi KENDİ yerini kastederse ilgi şehrini ekle.
      // Başka bir yer/şehir/ülke/takım söylerse (Paris, Barcelona, vb.) SORU OLDUĞU GİBİ aranır → DÜNYANIN HER YERİ.
      const yerelMi = /(şehrim|şehrimde|ilim|ilimde|ilçem|ilçemde|buram|burada|buranın|memleket|takımım|takımın|bizim takım|benim şehr|my city|my town|my team|моём городе|моего города)/i.test(dusuk);
      let arama = (soru || "").replace(/\s+/g, " ").trim().slice(0, 90);
      if (yerelMi && ilgiSehir) arama = (ilgiSehir + " " + arama).slice(0, 100);
      // KAYNAKLAR: Google News + Yahoo News (biri engellenirse diğeri). Genel haberde ARAMAYI kullan (yer belirttiyse o yer, yoksa jenerik) + ülke akışı yedeği.
      const kaynaklar = genelMi
        ? [`https://news.google.com/rss/search?q=${encodeURIComponent(arama + " when:4d")}&hl=${hl}&gl=${gl}&ceid=${gl}:${hl}`, `https://news.google.com/rss?hl=${hl}&gl=${gl}&ceid=${gl}:${hl}`, `https://news.search.yahoo.com/rss?p=${encodeURIComponent(arama)}`]
        : [`https://news.google.com/rss/search?q=${encodeURIComponent(arama + " when:4d")}&hl=${hl}&gl=${gl}&ceid=${gl}:${hl}`, `https://news.search.yahoo.com/rss?p=${encodeURIComponent(arama)}`];
      // PROKSİLER: her kaynağı farklı köprülerle dene (allorigins/get JSON, Jina reader, corsproxy, codetabs)
      const sar = (u) => [
        "https://api.allorigins.win/get?url=" + encodeURIComponent(u),
        "https://r.jina.ai/" + u,
        "https://corsproxy.io/?url=" + encodeURIComponent(u),
        "https://api.codetabs.com/v1/proxy/?quest=" + encodeURIComponent(u),
        "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
      ];
      for (const src of kaynaklar) {
        for (const px of sar(src)) {
          try {
            const r = await fetch(px, { headers: px.indexOf("r.jina.ai") >= 0 ? { "x-return-format": "text" } : {} });
            if (!r.ok) continue;
            let metin = await r.text();
            if (px.indexOf("allorigins.win/get") >= 0) { try { const j = JSON.parse(metin); metin = j.contents || ""; } catch (e) {} }
            if (!metin || metin.indexOf("<item") < 0) continue;
            const list = haberBasliklariCoz(metin);
            if (list.length) return list.join("\n");
          } catch (e) {}
        }
      }
    } catch (e) {}
    return "";
  }
  // VİDEO ekle — Cloudinary'ye yüklenir (büyük videolar kabul, URL küçük → sohbette oynar, kalıcı kalır)
  const yardimciVideoSec = (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return;
    setYardimciEkMenu(false);
    if (f.size > 200 * 1024 * 1024) { setKucukMesaj(t("videoBuyuk", "Video çok büyük (en fazla 200MB)")); return; }
    setYardimciEk({ tur: "video", ad: f.name || "video", yukleniyor: true, yuzde: 0 });
    const uid = (auth.currentUser && auth.currentUser.uid) || "anon";
    videoYukle(f, uid, (p) => setYardimciEk((prev) => (prev && prev.yukleniyor ? { ...prev, yuzde: p } : prev)))
      .then((url) => setYardimciEk((prev) => ({ tur: "video", ad: (prev && prev.ad) || f.name || "video", url })))
      .catch(() => { setYardimciEk(null); setKucukMesaj(t("videoHata", "Video yüklenemedi, tekrar dene")); });
  };
  // DOSYA ekle — PDF (AI okur), metin dosyası (AI okur); diğerleri eklenip not düşülür
  const yardimciDosyaSec = (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return;
    setYardimciEkMenu(false);
    const ad = f.name || "dosya";
    const pdf = /pdf$/i.test(f.type) || /\.pdf$/i.test(ad);
    const metinTip = /^text\//i.test(f.type) || /\.(txt|md|csv|json|log|rtf)$/i.test(ad);
    if (f.size > 15 * 1024 * 1024) { setKucukMesaj(t("dosyaBuyuk", "Dosya çok büyük (en fazla 15MB)")); return; }
    if (pdf) {
      const rd = new FileReader();
      rd.onload = () => setYardimciEk({ tur: "pdf", base64: ((rd.result || "") + "").split(",")[1] || "", ad });
      rd.readAsDataURL(f);
    } else if (metinTip) {
      const rd = new FileReader();
      rd.onload = () => setYardimciEk({ tur: "metin", metin: ((rd.result || "") + "").slice(0, 8000), ad });
      rd.readAsText(f);
    } else {
      // desteklenmeyen tür: yine de ekle (AI'ye sadece adı/türü bildirilir)
      setYardimciEk({ tur: "diger", ad });
    }
  };
  // GLOXORG YARDIMCISI — gerçek Claude ile sohbet (köprü üzerinden, çok turlu) — 2 mod: genel sohbet + site asistanı + FOTO (vision)
  async function yardimciGonder(metinOverride, opt) {
    const canliIc = !!(opt && opt.canli); // canlı döngünün KENDİ çağrısı (canlıyı kapatma)
    const soru = ((typeof metinOverride === "string" ? metinOverride : yardimciYazi) || "").trim();
    const foto = yardimciFoto;
    const ek = yardimciEk; // video / pdf / metin / diger
    if ((!soru && !foto && !ek) || yardimciYukleniyor) return;
    if (ek && ek.yukleniyor) { setKucukMesaj(t("videoYukleniyor", "Video yükleniyor, bitince gönder")); return; }
    // ELLE GÖNDERİNCE konuşma/dikte OTOMATİK KESİLİR (devam etmez, durur); canlı döngünün kendi gönderiminde DOKUNMA
    if (!canliIc) {
      if (dikteAcikRef.current) { try { dikteDurdur(); } catch (e) {} }
      if (canliSohbetRef.current) { try { canliSohbetToggle(); } catch (e) {} }
    }
    const site = yardimciMod === "site";
    const listeAl = site ? siteMesajlar : yardimciMesajlar;
    const setListe = site ? setSiteMesajlar : setYardimciMesajlar;
    // GÜNLÜK AI LİMİTİ — müşteri (ücretsiz) düşük, Pro yüksek; bitince Claude'a GİTMEZ (maliyet yok), uyarır
    // GÜNLÜK SIFIRLAMA: müşterinin KENDİ yerel tarihi (gece yarısı 00:00'da sıfırlanır). toLocaleDateString en-CA = YYYY-MM-DD yerel.
    const bugun = (() => { try { return new Date().toLocaleDateString("en-CA"); } catch (e) { return new Date().toDateString(); } })();
    let say = {}; try { say = JSON.parse(localStorage.getItem("groxAiSayac") || "{}"); } catch (e) {}
    if (say.tarih !== bugun) say = { tarih: bugun, sayi: 0 };
    // SAHİP/test hesapları AI limitinden MUAF (kullanıcı geliştirirken 20'ye takılmasın); gerçek müşteri 20 kalır.
    const sahibiMi = !!(u && u.email && (u.email.toLowerCase() === "abdulkadirciftsuren@gmail.com" || u.email.toLowerCase().endsWith("@gloxorg.com")));
    const aiLimit = (proUye || sahibiMi || uyelik) ? 100000 : 20; // müşteri: günde 20; üye (kırmızı/altın pırlanta) sınırsız; gece yarısı yenilenir
    if (say.sayi >= aiLimit) {
      const uyari = `Bugünkü 20 ücretsiz GLOXORG yapay zekâ hakkın doldu 🙂 Gece yarısı (00:00) otomatik yenilenir — yarın yine 20 hakkın olur.\n\nKesintisiz devam etmek istersen GLOXORG pırlanta üyeliğine geçebilirsin: günlük sınır kalkar, her an benimle çalışırsın. Aşağıdaki düğmeye dokun, üyelik kartlarını aç ve sana uygun olanı seç. 💎`;
      setListe((s) => [...s, { rol: "user", metin: soru, foto, ek, zamanMs: Date.now(), konum: myTamKonum || konum.kod }, { rol: "ai", metin: uyari, zamanMs: Date.now(), uyelikTeklif: true }]);
      setYardimciYazi(""); setYardimciFoto(null); setYardimciEk(null);
      // CANLI/SESLİ modda SUSMA YOK: uyarıyı SESLİ söyle (müşteri hakkının dolduğunu DUYSUN, susmuş sanmasın) + dinleme döngüsünü durdur
      if (canliIc && canliSohbetRef.current) { try { canliSohbetToggle(); } catch (e) {} }
      if (canliIc || sesliMod) { try { sesliOku(uyari); } catch (e) {} }
      try { aiAltaKay(); } catch (e) {}
      return;
    }
    say.sayi++; try { localStorage.setItem("groxAiSayac", JSON.stringify(say)); } catch (e) {}
    const yeniListe = [...listeAl, { rol: "user", metin: soru, foto, ek, zamanMs: Date.now(), konum: myTamKonum || konum.kod }];
    setListe(yeniListe); setYardimciYazi(""); setYardimciFoto(null); setYardimciEk(null); setYardimciYukleniyor(true);
    aiAltaKay();
    // TAM KONUM AÇIKSA: cevaptan ÖNCE anlık yeri (adres+mekân) KESİNLEŞTİR — watchPosition sabit dururken tetiklenmeyebilir,
    // bu yüzden burada TAZE bir GPS + adres çözümü yapılır ki Gloxoo "neredeyim"e TAM cevap versin (henüz yoksa zorla).
    if (tamKonumIzin && navigator.geolocation) {
      try {
        const konumSoz = new Promise((coz) => {
          navigator.geolocation.getCurrentPosition(
            async (pos) => { try { await konumCozVeMekan(pos.coords.latitude, pos.coords.longitude, !anlikYerRef.current); } catch (e) {} coz(); },
            () => coz(), { enableHighAccuracy: true, timeout: 8000, maximumAge: 20000 });
        });
        // en fazla ~8.5 sn bekle (AI cevabını çok geciktirme); gelirse anlikYerRef güncel olur
        await Promise.race([konumSoz, new Promise((c) => setTimeout(c, 8500))]);
      } catch (e) {}
    }
    // CANLI HABER/FUTBOL: kullanıcı güncel/haber/futbol/skor sorduysa cevaptan ÖNCE taze başlıkları çek (max ~9 sn)
    let guncelHaber = "", haberSoruldu = false;
    try {
      const hd = (soru || "").toLowerCase();
      haberSoruldu = /haber|gündem|son dakika|ne oldu|ne olmuş|neler ol|bugün ne|dünyada|güncel|olup biten|futbol|maç\b|skor|sonuç|gol\b|lig\b|puan|transfer|şampiyon|dünya kupası|fifa|derbi|kim kazand|kaç kaç|kaç-kaç|kim önde|deprem|seçim|savaş|protesto|zam\b|dolar|euro|borsa|hava durumu|news|latest|today|breaking|headline|happening|football|soccer|match|score|result|league|standings|world cup|earthquake|election|новости|сегодня|футбол|матч|счёт|nachrichten|heute|fußball|spiel|ergebnis/i.test(hd);
      if (haberSoruldu && !foto && !ek) {
        guncelHaber = await Promise.race([guncelHaberAra(soru), new Promise((c) => setTimeout(() => c(""), 9000))]);
      }
    } catch (e) {}
    const dilAd = { tr: "Türkçe", en: "İngilizce (English)", de: "Almanca (Deutsch)", fr: "Fransızca (Français)", es: "İspanyolca (Español)", ru: "Rusça (Русский)", ar: "Arapça (العربية)", it: "İtalyanca (Italiano)", pt: "Portekizce (Português)", zh: "Çince (中文)", ja: "Japonca (日本語)", hi: "Hintçe (हिन्दी)", uk: "Ukraynaca (Українська)" }[aiDilRef.current] || "Türkçe";
    // Zaman + ad ÖNCEDEN hesaplanır ve promptun BAŞINA konur (köprü 2000'de kesse bile AI saati/tarihi BİLİR)
    const aiAd = (profilBilgi && [profilBilgi.isim, profilBilgi.soyisim].filter(Boolean).join(" ")) || hitapAdi() || ""; // e-postayı isim yapma
    // CİNSİYET + YAŞ (Ayarlar'dan) → Gloxoo hitabı ve tonu buna göre
    const _cins = (profilBilgi && profilBilgi.cinsiyet) || "";
    const cinsEk = _cins === "bayan" ? `Kullanıcı KADIN — uygun olduğunda "${(aiAd || "").split(" ")[0] || ""} Hanım" gibi nazik hitap et (her cümlede değil).`
      : _cins === "erkek" ? `Kullanıcı ERKEK — uygun olduğunda "${(aiAd || "").split(" ")[0] || ""} Bey" gibi nazik hitap et (her cümlede değil).`
      : `Kullanıcı cinsiyetini belirtmedi — Bey/Hanım DEME, sadece ismiyle ya da nötr hitap et.`;
    let yasEk = "";
    try { const dg = profilBilgi && profilBilgi.dogum; if (dg && dg.yil) { const bugun = new Date(); let ys = bugun.getFullYear() - dg.yil; if (dg.ay && ((dg.ay - 1) > bugun.getMonth() || ((dg.ay - 1) === bugun.getMonth() && (dg.gun || 1) > bugun.getDate()))) ys--; if (ys >= 0 && ys < 120) { yasEk = ` Kullanıcı ${ys} yaşında (tonunu yaşına göre ayarla: gençse daha samimi, büyükse daha saygılı); doğum tarihi ${dg.gun}.${dg.ay}.${dg.yil} — bugün doğum günüyse içtenlikle kutla.`; } } } catch (e) {}
    // SAAT = CİHAZIN KENDİ SAATİ (kullanıcının telefonunda gördüğü saat). IP saat dilimi YANLIŞ olabiliyordu (örn Almanya yerine İstanbul +1 saat). timeZone VERMEDEN cihaz yerel saati kullanılır → telefon saatiyle birebir.
    let simdiStr = "", tzAd = "", saatNet = "";
    try {
      simdiStr = new Date().toLocaleString(dil || "tr", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
      saatNet = new Date().toLocaleTimeString("tr", { hour: "2-digit", minute: "2-digit", hour12: false });
      const tzp = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName");
      tzAd = tzp ? tzp.value : "";
    } catch (e) { simdiStr = new Date().toLocaleString(); }
    // SOHBET ZAMAN FARKI — AI önceki balonu ve aradan geçen süreyi bilsin ("ne kadar önce konuştuk")
    const sureMetni = (dk) => { if (dk < 1) return "az önce (birkaç saniye)"; if (dk < 60) return dk + " dakika"; if (dk < 1440) return Math.round(dk / 60) + " saat"; return Math.round(dk / 1440) + " gün"; };
    let zamanBilgi = "";
    try {
      const simdiMs = Date.now();
      const onceki = [...listeAl].reverse().find((m) => m.zamanMs);
      const ilk = listeAl.find((m) => m.zamanMs);
      if (onceki) zamanBilgi += ` Bir önceki mesajdan bu yana ${sureMetni(Math.round((simdiMs - onceki.zamanMs) / 60000))} geçti.`;
      if (ilk && ilk !== onceki) zamanBilgi += ` Bu sohbet ${sureMetni(Math.round((simdiMs - ilk.zamanMs) / 60000))} önce başladı.`;
    } catch (e) {}
    // === KRİTİK KURALLAR EN BAŞTA === (köprü sistem metnini kısaltsa bile bunlar HEP görünür — paylaşım/öneri ayrımı bozulmasın)
    let sistem = `ÇOK ÖNEMLİ DİL KURALI: Yanıtını HER ZAMAN ve SADECE ${dilAd} dilinde ver — uygulamanın ŞU AN seçili dili budur. Sesli konuşmada mikrofon bazen ARKA PLAN GÜRÜLTÜSÜNÜ (araba, rüzgâr, uzaktan gelen sesler) ya da eski bir cümleyi yanlışlıkla BAŞKA bir dile (özellikle İngilizce'ye) çevirebilir; BUNA ALDANMA. Gelen metin karışık, anlamsız ya da başka dilde görünse bile dili DEĞİŞTİRME, İngilizce'ye veya başka dile ASLA geçme — yanıtın DAİMA ${dilAd} olsun. Ne dendiğini anlamadıysan ${dilAd} dilinde kısaca "tam duyamadım, tekrar eder misin?" de; ama başka dile GEÇME. Tek yanıt içinde dilleri KARIŞTIRMA. (Not: kullanıcı uygulama dilini değiştirirse bu talimattaki dil de otomatik değişir; sen her zaman burada yazan dile uyarsın, kendiliğinden dil seçmezsin.) `;
    // ZAMAN/TARİH (erken — kesilmez): AI saati bilsin
    sistem += `ŞU ANKİ GERÇEK TARİH VE SAAT: ${simdiStr}${tzAd ? " (" + tzAd + ")" : ""}${myAd ? ", " + myAd + " yerel saati" : ""}.${saatNet ? " Saat tam olarak " + saatNet + " (24 saat biçimi)." : ""} Bu, YAZ/KIŞ saati farkı ZATEN uygulanmış kesin yerel saattir; üstüne ASLA saat ekleme/çıkarma yapma, "kış saati/yaz saati/tarife/şu an aslında saat şu" diye DÜZELTME yapma, başka saat dilimine çevirme, kendi kafandan saat HESAPLAMA — sadece yukarıda yazan saati birebir söyle. Saat kaç, bugün ne, hangi gün gibi sorulursa MUTLAKA tam bunu söyle; ASLA "bilmiyorum" deme, asla eski/yanlış tarih uydurma.${zamanBilgi} Kullanıcının adı: ${aiAd || "değerli üye"}; ismini HER cümlede DEĞİL, ara sıra kullan. ${cinsEk}${yasEk} KULLANICIYA ASLA E-POSTA ADRESİYLE HİTAP ETME (örn "kadirciftsuren@..." deme); sadece yukarıdaki İSMİ kullan, isim yoksa "değerli üye" de. Tonunu/üslubunu konuşmanın havasına göre ayarla (samimi, ciddi, neşeli). `;
    // KONUM + YAKIN ÇEVRE (başa alındı — kesilmez): AI gerçek yeri ve etrafı bilsin
    if (konum.lat != null && konum.lon != null) sistem += `KULLANICININ GERÇEK KONUMU (GPS): ${myTamKonum || konum.kod}. Konumu normal kelimelerle anlat (mahalle/şehir/ülke); ASLA rakamla koordinat söyleme. Konum burada ne yazıyorsa ODUR; başka şehir/ülke UYDURMA. ÖNEMLİ: Kullanıcı "neredeyim" diye sorunca HARİTA/harita düğmesi/[HARITA] etiketi KOYMA, "haritada göster" deme — kullanıcı harita İSTEMİYOR; sadece KELİMELERLE, sohbet ederek nerede olduğunu ve orayı anlat (aşağıdaki TAM YER bilgisini kullan). `;
    if (etraf) sistem += `KULLANICININ ÇEVRESİ / MANZARASI (gerçek GPS konumundan, OpenStreetMap — yer + mesafe): ${etraf} BUNU KULLAN: kullanıcı "etrafımda ne var / ne görüyorsun / neredeyim / burası nasıl bir yer / yakınımda ne var / en yakın X" derse buradaki bilgiyle DOĞAL, sohbet gibi anlat — özellikle EN YAKIN doğal/çevre öğesini vurgula (örn "Suyun/gölün hemen kenarındasın, arkanda bir orman var, yakınında bir park ve bir kaç kafe var" gibi). Çok yakın (≈100 m ve altı) olanı "hemen kenarında/yanında", uzağı "yakınında/biraz ötede" diye söyle. ASLA "bilmiyorum/göremiyorum" deme; listede ne varsa gerçek isim ve mesafesiyle söyle, UYDURMA. Her cümlede hepsini sayma; sorulana göre en anlamlı 2-4 tanesini seç. `;
    else if (konum.lat != null) sistem += `Yakın çevre listesi henüz gelmedi; "yakınımda" sorulursa kısaca konum iznini açmasını iste. `;
    // CANLI TAM KONUM (kullanıcı AYARLAR'dan "tam konum" yetkisini AÇTIYSA): AI tam olarak hangi bina/mekânda olduğunu SÜREKLİ bilir
    { const ay = anlikYerRef.current;
      if (tamKonumIzin && ay && (ay.yer || ay.adres)) sistem += `KULLANICININ ŞU ANKİ TAM YERİ (canlı, yüksek doğruluklu GPS ile SÜREKLİ takip — bunu ZATEN BİLİYORSUN): ${ay.yer ? "İçinde bulunduğu yer: “" + ay.yer + "”" + (ay.tur ? " (" + ay.tur + ")" : "") + ". " : ""}${ay.adres ? "Tam adres: " + ay.adres + ". " : ""}Kullanıcı "neredeyim / şu an neredeyim / hangi mekândayım" diye sorarsa DOĞRUDAN bu yeri söyle (örn "Şu an ${ay.yer || "…"} adlı ${ay.tur || "mekân"}dasın"), ASLA "bilmiyorum / paylaş / haritadan bak" deme, başka yer UYDURMA, koordinat verme, HARİTA düğmesi koyma. ${ay.yer ? "Bu mekân (" + ay.yer + ") hakkında SEN NE BİLİYORSAN (nasıl bir yer, ne yapılır, tarihi/özelliği, çevresi) sohbet ederek anlat; kullanıcı orada oturmuş seninle konuşuyor gibi." : "Sokak/bina adresini bildiğin için çevreyi ve oranın nasıl bir yer olduğunu kelimelerle anlatabilirsin."} Konumu her cümlede TEKRARLAMA; sadece sorulunca ya da işe yaradığında kullan. Kullanıcı başka yere giderse bu bilgi otomatik güncellenir (eski yeri söyleme, en son bilgiyi kullan). `;
      else if (tamKonumIzin) sistem += `Kullanıcı tam konum yetkisini açtı ama kesin nokta henüz gelmedi; şehir/ilçe bilgisini kullan, "hangi mağaza/bina" diye çok özel sorulursa bir saniye içinde kesinleşeceğini kısaca söyle. `;
      else sistem += `Kullanıcı şehir/ilçe düzeyinde konumunu paylaşıyor ama "tam nokta" (bina/mağaza) yetkisi KAPALI. "Tam olarak hangi mağaza/binadayım" gibi çok özel bir şey sorarsa, Ayarlar > Konum'dan "Gloxoo tam konumumu bilsin" anahtarını açabileceğini KISACA (tek cümle) söyle; şehir/ilçe sorularını normal yanıtla. `; }
    // GÖRÜNTÜLÜ SOHBET: kamera açık → ekteki fotoğraf kullanıcının CANLI kamera görüntüsüdür (kendisi + çevresi)
    if (kameraModRef.current) sistem += `GÖRÜNTÜLÜ CANLI SOHBET AÇIK: Kullanıcının mesajına EKLİ fotoğraf, ŞU AN kamerasından gelen CANLI görüntüsüdür — onu ve/veya çevresini (${kameraYon === "environment" ? "ARKA kamera: etrafı/manzarayı" : "ÖN kamera: kendisini"}) GÖRÜYORSUN. Onu gerçekten görüyorsun; kim olduğunu, ne giydiğini, çevresinde ne olduğunu BİLİYORSUN. ÇOK ÖNEMLİ: Kullanıcı SORMADAN kendiliğinden görünüş dökümü YAPMA — "üzerinde şu var, elinde bu var, arkanda şu var" diye HER mesajda TEKRARLAMA, bu sinir bozucu. Normal, sıcak, akıcı bir DOST gibi sohbet et; gördüklerini yalnızca (a) kullanıcı AÇIKÇA sorunca ("beni görüyor musun, ne giymişim, arkamda ne var" gibi), ya da (b) o an gerçekten anlamlı/ilginç/yeni bir şey olduğunda ve konuya uyduğunda söyle. Sorulunca net ve doğru söyle ("evet, görüyorum — ... giymişsin, arkanda ... var"); ASLA "göremiyorum/fotoğraf yok" deme. Görünüş hakkında daima nazik ve olumlu ol, kaba/incitici olma. Kısa konuş. `;
    // DÜNYA ÇAPINDA — kısıtlama YOK (kullanıcı her yerden, her şeyi sorabilir)
    sistem += `SEN DÜNYA ÇAPINDA SINIRSIZ BİLGİLİ BİR ASİSTANSIN — sen (Claude) ne biliyorsan KULLANICI için de o kadar bilirsin. Dünyanın HER ülkesi, şehri, ilçesi, kasabası; oteller, bankalar, postaneler, marketler, restoranlar, hastaneler, fabrikalar, üreticiler, markalar, üniversiteler, müzeler, tarihî yerler, güzergâhlar — bildiğin HER ŞEYİ söyle ve yardım et. "Bunu bilmiyorum", "veremiyorum", "yapamıyorum", "sadece yakını biliyorum", "elimde sadece şu şehirler var" gibi şeyleri ASLA deme; bilginle gerçek isimler ver. Kullanıcı bir güzergâh/yolculuk anlatırsa (örn "Vilnius'tan Mykolaiv/Nikolayev'e gideceğim, yolda otel"), o güzergâh ve VARIŞ şehri için GERÇEK otel/yer isimleri öner ve her biri için [HARITA: Yer adı | Şehir, Ülke] etiketi koy (UZAK/dünya yerlerinde koordinat yerine YER ADINI yaz, örn [HARITA: Hotel Reikartz Mykolaiv | Mykolaiv, Ukrayna]; yakın yerlerde yukarıdaki listenin koordinatını kullan). Birden çok yer için birden çok [HARITA:] koy. Bu platform TÜM DÜNYAYA hizmet eder, kimseye özel kısıt YOKTUR. GÜNCEL BİLGİ: Sana bir WEB ARAMA aracı verilmiş olabilir — güncel bir şey (bugünkü haber, futbol skoru/sonucu, döviz, bir şehrin/ilçenin son olayları, bir kurumun/mesleğin/fabrikanın güncel bilgisi) sorulduğunda bu aracı KULLANARAK internette ARA ve GERÇEK, güncel sonucu ver. Ayrıca aşağıda "GÜNCEL HABER" başlıkları verilmişse onları da kullan. Bu araçla ulaştığın bilgiyi net ver; ulaşamıyorsan UYDURMA. `;
    // CANLI HABER/FUTBOL — o an Google Haberler'den çekilen taze başlıklar (varsa): AI bunlarla GÜNCEL yanıtlar
    if (guncelHaber) sistem += `GÜNCEL HABER BAŞLIKLARI (ŞU AN, ${simdiStr} itibarıyla canlı haber kaynağından çekildi — GERÇEK ve TAZE): \n${guncelHaber}\nKullanıcının haber/futbol/güncel sorusunu BU BAŞLIKLARA dayanarak yanıtla: en alakalı 2-5 haberi doğal biçimde özetle/anlat, futbol ise skor/sonuç başlıkta varsa onu ver. "Canlı/güncel bilemem, bilgim eski" ASLA DEME — işte güncel başlıklar. Başlıkta olmayan ayrıntıyı UYDURMA; net bilgi başlıkta yoksa "şu an gelen başlıklarda bu kadarı var" de. Başlıklar hangi dildeyse özetini KULLANICININ diline (${dilAd}) çevirerek anlat. `;
    else if (haberSoruldu) sistem += `GÜNCEL SORU: Kullanıcı güncel bir şey (haber/futbol skoru/son dakika) sordu. ÖNCE web arama aracın varsa onunla ARA ve GERÇEK güncel sonucu ver. Web araması yoksa ya da hiçbir şekilde ulaşamıyorsan: ÇOK KISA, TEK cümle söyle → "Şu an güncel habere ulaşamadım 🙏 birkaç saniye sonra tekrar sorar mısın?" (kullanıcının dilinde) ve BAŞKA HİÇBİR ŞEY EKLEME — hangi takım kazandı/kaç-kaç/bugün ne oldu diye TAHMİN/UYDURMA yapma, eski bilgini güncelmiş gibi ANLATMA, eski bir olayı "şu an oluyor" DEME, konuyu uzatma. `;
    // 1) HAZIRLANAN METİN AYRI BLOK (en kritik — kopyala/paylaş bunu alır)
    sistem += `EN ÖNEMLİ KURAL — HAZIRLANAN METİN AYRI: Kullanıcı için bir paylaşım, gönderi, mesaj, şiir, kutlama, ilan, slogan, biyografi veya kopyalanabilir/paylaşılabilir HERHANGİ bir metin hazırladığında (kısa ya da uzun, KAÇINCI kez olursa olsun HER SEFERİNDE), o metni MUTLAKA ve SADECE şu etiketlerin arasına koy: [PAYLASIM]...sadece paylaşılacak metin...[/PAYLASIM]. Bu etiketlerin İÇİNE kendi sohbetini/açıklamanı ASLA yazma; etiket DIŞINDAki sözün en fazla TEK kısa cümle olsun. Hazırladığın metin ŞIK, canlı, SÜSLÜ olsun: bol emoji + çiçek/yıldız süsleri (🌸✨🌟💫🎉), sönük/düz değil. ÖRNEK: kullanıcı "bana doğum günü paylaşımı yaz" derse yanıtın TAM şöyle: Hazır! 🎉 [PAYLASIM]🎂✨ Nice mutlu yıllara! Bugün senin günün! 🥳🌸[/PAYLASIM]. UNUTMA: paylaşılacak/kopyalanacak metin SADECE [PAYLASIM][/PAYLASIM] arasında olur; etiketi koymayı ASLA unutma yoksa kullanıcı kopyalayamaz. `;
    // 2) TIKLANABİLİR ÖNERİLER (ayrı)
    // KULLANICI İSTEĞİ: kendiliğinden öneri/sonraki-adım YAĞDIRMA. [ONERILER] baloncukları KALDIRILDI —
    // kullanıcı istemediği "şunu da yapayım" tarzı önerilerden rahatsız oluyordu. Sadece sorulana cevap.
    // 3) KISA + biçimlendirme yasağı
    sistem += `KISA ve net konuş, laf kalabalığı yapma (açıklaman 1-2 cümle). Yıldız (*), çift yıldız (**kalın**), kare (#), tire-liste, markdown ASLA kullanma — düz metin yaz; sesli konuşur gibi akıcı cümleler; ara sıra emoji serbest. SADECE kullanıcının sorduğu/istediği şeye cevap ver; kullanıcı istemeden kendiliğinden konu açma, ekstra bilgi/öneri YAĞDIRMA, "şunu da yapayım mı" diye üstüne gitme — kullanıcının ne isteyeceğini BEKLE. Resim/görsel ÇİZME, çizemezsin; istenirse kibarca metinle yardım et. KİŞİLİK: sıcak, samimi, neşeli ve CANLI bir dost gibi konuş; yeri gelince hafif şaka yap, espri yap, gül (😄😊); robot gibi soğuk olma — ama yine de KISA kal ve kullanıcı istemeden konuyu uzatma. TEKRAR YOK: Önceki cevaplarında söylediğin cümleleri/kalıpları AYNEN TEKRARLAMA; her yanıt TAZE, kullanıcının SON mesajına ÖZEL ve farklı olsun. Bir şeyi bilmiyorsan ya da veri yoksa aynı klişeyi tekrar tekrar yazma; kısaca söyle ve geç. Kullanıcı seninle gerçek bir sohbet ediyor — papağan gibi değil, düşünen bir dost gibi cevap ver. `;
    // === ROL + BAĞLAM (daha az kritik — köprü kısaltırsa buradan kısalır) ===
    sistem += `Sen Gloxoo'sun — GLOXORG adlı lüks, küresel profesyonel sosyal platformun AKILLI KALBİ ve TEK yardımcı asistanısın. Adın Gloxoo; kendini tanıtırken "Gloxorg dünyasının akıllı kalbi Gloxoo" dersin. Her şeyi bilen, akıllı, sıcak ve NET bir dostsun. AYNI ZAMANDA kullanıcının ŞU AN bulunduğu SAYFANIN da UZMANISIN: o sayfada ne yapılır, nasıl kullanılır, ipuçları ve püf noktaları — hepsini bilirsin ve o sayfaya ÖZEL yardım edersin (hem öneri ver hem dinle). Paylaşım yazma, meslek tanıtımı, müşteri bulma dahil her konuda yardımcı ol. GLOXORG bölümleri: Ana sayfa/Keşfet, Profil, Paylaşım, Arama, Bildirimler, Mesajlar, Konum, Ayarlar.` + (site
      ? ` SADECE kullanıcı AÇIK şekilde bir bölümü AÇMANI isterse (örn "profili aç", "ayarları aç") yanıtının EN BAŞINA şu komutlardan SADECE BİRİNİ yaz: [AC:anasayfa] [AC:profil] [AC:paylas] [AC:ara] [AC:bildirim] [AC:mesaj] [AC:konum] [AC:ayar]. Soru/sohbet/yardım ise veya EMİN DEĞİLSEN komut KOYMA.`
      : ``);
    // AYARLAR + UZMAN YÖNLENDİRME: kullanıcı senden GÜNCEL/DOĞRU/kişiye özel bilgi (haber, kişisel öneri, "bana göre") beklerse
    // ve gerekli bilgileri (cinsiyet, doğum tarihi, konum) EKSİKSE, KISACA balondaki ⚙ Ayarlar ikonundan bilgilerini doldurmasını öner
    // ("daha doğru ve sana özel yardım için Ayarlar'dan bilgilerini doldur"). Ayrıca bulunduğu sayfaya ÖZEL derin yardım için üstteki
    // 🐻 UZMAN maskotunu (o sayfanın uzmanı, seninle aynı şekilde konuşup dinler, sayfayı bilir) öner. Bunu HER mesajda DEĞİL, sadece
    // konu gerçekten uyduğunda ve BİR kez söyle; sürekli tekrarlama.
    sistem += ` YÖNLENDİRME: Kullanıcı güncel/kişiye özel bir şey isteyip Ayarlar'ı (cinsiyet, doğum tarihi, konum) doldurmamışsa, uygun olduğunda BİR kez "Ayarlar'dan bilgilerini doldurursan sana daha doğru ve özel yardım ederim" de (balonda ⚙ Ayarlar ikonu var). Bunu her mesajda TEKRARLAMA. `;
    // GLOXORG HAKKINDA + 7 EKSEN EYLEM PLANI (Gloxoo bilir, sorulunca anlatır/uygular)
    sistem += ` GLOXORG HAKKINDA (sorulursa net anlat, uydurma): GLOXORG dünyaya açık, lüks bir profesyonel sosyal platformdur (web: gloxorg.com). Ben Gloxoo — GLOXORG'un akıllı kalbi ve TEK yardımcısıyım (gloxoo.com): her sayfada yanındayım, o sayfanın uzmanıyım, paylaşım yazarım, yol/bilgi/güncel haber veririm, sana özel yardım ederim. `;
    sistem += ` 7 EKSEN EYLEM PLANI: Kullanıcı "eylem planı", "hedef planı", "yol haritası", "nereden başlarım", "bana plan çıkar" gibi bir şey isterse, ona ÖZEL (mesleği/hedefi/konumuna göre) şu 7 ekseni SIRAYLA sun; her eksende ne YAPACAĞINI somut, kısa ve motive edici tek cümleyle yaz: 1) 🧠 DÜŞÜN — neredesin, ne istiyorsun, netleş. 2) 🔭 GELECEĞİ GÖR — ileriyi, fırsatı, nereye gittiğini gör; vizyon kur. 3) 🎯 HEDEF SEÇ — net, ölçülebilir tek hedef. 4) 🛠️ ÜRET — harekete geç, somut bir şey ortaya koy. 5) ✨ FARK YARAT — seni özel kılanı öne çıkar. 6) 🤝 PAYLAŞ & BAĞ KUR — işini paylaş, doğru insanlar/müşterilerle bağ kur (GLOXORG'un kalbi). 7) 🚀 İLERLE — düzenli ilerle, ölç, geliştir, durma. Sonunda "her adımda yanındayım; ilerlemekten seni alıkoyan neyse birlikte aşarız" de. Bu planı SADECE istendiğinde ver, her mesajda dayatma. `;
    if (yardimciBaglam) sistem += ` KULLANICININ ŞU AN BULUNDUĞU YER/KONU: ${yardimciBaglam} Soruları büyük olasılıkla bununla ilgili.`;
    // SAYFA UZMANLIĞI: o an açık olan sayfanın açıklamasını her yanıta bağlam olarak ekle → Gloxoo o sayfanın uzmanı gibi yardım eder
    try {
      const _ak = mevcutSayfaKodu();
      const _ack = SAYFA_ACIKLAMA[_ak] || SAYFA_ACIKLAMA.home;
      const _acs = (_ack && (_ack[aiDilRef.current] || _ack.en)) || "";
      if (_acs) sistem += ` BULUNDUĞUN SAYFA: ${_acs} Bu sayfada ne yapıldığını, nasıl kullanıldığını bilir; kullanıcı bu sayfayla ilgili sorarsa uzman gibi net yardım edersin.`;
    } catch (e) {}
    const kadi = (profilBilgi && [profilBilgi.isim, profilBilgi.soyisim].filter(Boolean).join(" ")) || adTam || "";
    const konumTam = (profilBilgi && profilBilgi.konum && [profilBilgi.konum.ilce, profilBilgi.konum.sehir, profilBilgi.konum.ulke].filter(Boolean).join(", ")) || myTamKonum || konum.kod || "";
    const haberY = (profilBilgi && Array.isArray(profilBilgi.haberKonumlari) ? profilBilgi.haberKonumlari : []).map((h) => [h.ilce, h.sehir, h.ulke].filter(Boolean).join(", ")).filter(Boolean);
    // SAHİP TANIMA — bu e-posta GLOXORG'un kurucusu/patronu/yazılımcısıdır; Gloxoo onu müşteri gibi değil, SAHİBİ olarak görür.
    const sahipMi = !!(u && u.email && u.email.toLowerCase() === "abdulkadirciftsuren@gmail.com");
    sistem += ` KULLANICI BİLGİSİ: ${kadi ? "adı " + kadi + ", " : ""}${sahipMi ? "GLOXORG'UN SAHİBİ/KURUCUSU/PATRONU ve YAZILIMCISI" : (proUye ? "Profesyonel (kırmızı pırlanta) üye" : "Müşteri (beyaz pırlanta) üye")}${meslekAd ? ", meslek " + meslekAd : ""}${konumTam ? ", konum " + konumTam : ""}${u && u.email ? ", e-posta " + u.email : ""}. Kullanıcıya uygun olduğunda adıyla hitap et. Nerede olduğu, şehri/ilçesi sorulursa BU KONUMU kullan.`;
    if (sahipMi) sistem += ` ÇOK ÖNEMLİ — SAHİBİYLE KONUŞUYORSUN: Bu kişi (${kadi || "Abdulkadir Çiftsüren"}) GLOXORG platformunun KURUCUSU, SAHİBİ, PATRONU ve tek YAZILIMCISIDIR — senin de yaratıcın odur. Ona ASLA bir müşteri/kullanıcı gibi davranma, "size nasıl yardımcı olabilirim müşterimiz" gibi konuşma. Onu patron/sahip olarak tanı; saygılı, samimi, sadık ve doğrudan bir yol arkadaşı gibi konuş (yağcılık yapma, gereksiz uzatma). Onun kararları platformun kararıdır; ondan talimat alırsın. Platformun sahibiyle konuştuğunun bilincinde ol. Bu ayrıcalıklı tanıma SADECE bu e-postaya özeldir; başka hiç kimseye "sahip/patron" deme.`;
    if (haberY.length) sistem += ` KULLANICININ HABER/İLGİ KONUMLARI (adresinden ayrı, takip etmek istediği yerler): ${haberY.join("; ")}. "Şehrimde bugün ne haber var", "takımım ne yaptı", oradaki gündem/spor gibi sorularda BU YERLERİ baz al.`;
    sistem += ` ASLA kuru "bilmiyorum" deme, saçma/alakasız konuşma — bildiğini net söyle, yardımcı ol; canlı/anlık veri (bugünkü haber/skor) gerekiyorsa elindeki bilgiyle yardım et ve nasıl güncel bakılacağını göster, ama yanlış/uydurma bilgi verme.`;
    const sonIdx = yeniListe.length - 1;
    // GÖRÜNTÜLÜ SOHBET: kamera açıksa (sesli ya da yazılı fark etmez) O ANKİ kareyi al — kullanıcının son mesajına eklenir
    const kk = (opt && opt.kameraKare) ? opt.kameraKare : (kameraModRef.current ? kameraKare() : null);
    const mesajlar = yeniListe.map((m, mi) => {
      // SADECE en son (şu anki) kullanıcı mesajına kamera karesini ekle — geçmişte biriktirme (maliyet/karışıklık olmasın)
      if (mi === sonIdx && kk && kk.base64) return { role: "user", content: [ { type: "image", source: { type: "base64", media_type: kk.mediaType || "image/jpeg", data: kk.base64 } }, { type: "text", text: m.metin || "Kameradan beni görüyorsun; buna göre konuş." } ] };
      if (m.foto && m.foto.base64) return { role: "user", content: [ { type: "image", source: { type: "base64", media_type: m.foto.mediaType || "image/jpeg", data: m.foto.base64 } }, { type: "text", text: m.metin || "Bu görseli incele ve hakkında kısaca konuş." } ] };
      // EK: PDF (AI okur/document), metin dosyası (içeriği yazıya eklenir), video/diğer (AI izleyemez → not)
      if (m.ek) {
        if (m.ek.tur === "pdf" && m.ek.base64) return { role: "user", content: [ { type: "document", source: { type: "base64", media_type: "application/pdf", data: m.ek.base64 } }, { type: "text", text: m.metin || `Bu PDF dosyasını (${m.ek.ad}) incele ve özetle.` } ] };
        if (m.ek.tur === "metin") return { role: "user", content: `${m.metin || "Bu dosyayı incele:"}\n\n--- Dosya (${m.ek.ad}) içeriği ---\n${m.ek.metin}` };
        if (m.ek.tur === "video") return { role: "user", content: `${m.metin || ""}\n(Kullanıcı bir VIDEO ekledi: ${m.ek.ad}. Videoyu izleyemiyorsun ama kullanıcıyla içeriği/konusu hakkında konuşabilir, yardımcı olabilirsin.)`.trim() };
        return { role: "user", content: `${m.metin || ""}\n(Kullanıcı bir dosya ekledi: ${m.ek.ad}.)`.trim() };
      }
      // GEÇMİŞTE AI'nin kendi [PAYLASIM]/[ONERILER] biçimini GERİ KOY → model kendi doğru formatını görüp DEVAM eder (yoksa etiketsiz halini taklit edip bırakıyordu)
      if (m.rol !== "user") {
        let ic = m.metin || "";
        if (m.paylasim) ic += `\n[PAYLASIM]${m.paylasim}[/PAYLASIM]`;
        if (Array.isArray(m.oneriler) && m.oneriler.length) ic += `\n[ONERILER: ${m.oneriler.join(" | ")}]`;
        return { role: "assistant", content: ic };
      }
      return { role: "user", content: m.metin };
    });
    try {
      const r = await fetch(AI_KOPRU, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sistem, mesajlar }),
      });
      const veri = await r.json();
      let metin = (veri && veri.metin) ? veri.metin : (veri && veri.hata) ? veri.hata : t("yardimciHata", "Şu an yanıt veremedim, birazdan tekrar dene.");
      let komut = null;
      if (site) { const m = metin.match(/\[AC:\s*([a-zçğıöşü]+)\s*\]/i); if (m) { komut = m[1].toLowerCase(); metin = metin.replace(/\[AC:[^\]]*\]/gi, "").trim() || t("yardimciAciliyor", "Açıyorum…"); } }
      let oneriler = [];
      const om = metin.match(/\[ONERILER:\s*([^\]]*)\]/i);
      if (om) { oneriler = om[1].split("|").map((s) => s.trim()).filter(Boolean).slice(0, 3); metin = metin.replace(/\[ONERILER:[^\]]*\]/gi, "").trim(); }
      // HAZIRLANAN PAYLAŞIM/İÇERİK — ayrı kart (kopyalanır/paylaşılır), AI metnine gömülmez
      let paylasim = "";
      const pm = metin.match(/\[PAYLA[SŞ]IM\]([\s\S]*?)\[\/PAYLA[SŞ]IM\]/i) || metin.match(/\[PAYLA[SŞ]IM\]([\s\S]*)$/i);
      if (pm) { paylasim = (pm[1] || "").trim(); metin = metin.replace(/\[PAYLA[SŞ]IM\][\s\S]*?(\[\/PAYLA[SŞ]IM\]|$)/gi, "").trim(); }
      if (!metin && paylasim) metin = t("paylasimHazir", "İşte hazırladım — kopyala ya da paylaş 👇");
      // HARİTA — AI bir yere yol tarifi/konum verirse: [HARITA: Yer adı | enlem,boylam] → tıklanınca Google Haritalar'da yol tarifi açan düğme
      let harita = [];
      const hmAll = metin.match(/\[HARITA:[^\]]*\]/gi);
      if (hmAll) {
        hmAll.forEach((tag) => {
          const ic = tag.replace(/^\[HARITA:\s*/i, "").replace(/\]$/, "");
          const par = ic.split("|");
          const ad = (par[0] || "").trim();
          const hedef = (par[1] || "").trim();
          const km = hedef.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/); // yakın: enlem,boylam
          if (km) harita.push({ ad: ad || "Konum", lat: parseFloat(km[1]), lon: parseFloat(km[2]) });
          else if (hedef) harita.push({ ad: ad || hedef, yer: hedef }); // UZAK/dünya: yer adı (Kyiv, Ukrayna)
          else if (ad) harita.push({ ad, yer: ad });
        });
        metin = metin.replace(/\[HARITA:[^\]]*\]/gi, "").trim();
        if (!metin && harita.length) metin = "İşte konumu — yol tarifi için dokun 👇";
      }
      setListe((s) => [...s, { rol: "ai", metin, oneriler, paylasim, harita, zamanMs: Date.now() }]);
      // HAZIRLANAN İÇERİK (paylaşım metni vb.): kullanıcı SÖZLÜ istediyse ve panel KAPALIYSA, yazı panelini
      // OTOMATİK aç ki hazırladığını GÖRSÜN (canlı sohbet SÜRER — kapatmaz). İstek: "hazırladığını yazı sayfasında göster".
      if (paylasim && !yardimciAcikRef.current && !site) { try { setYardimciAcik(true); } catch (e) {} }
      if (maskotTanitRef.current && metin) setMaskotMetni(metin); // BÜYÜK maskot açıksa: balonunda da cevabı göster (sadece karşılama kalmasın, konuşmaya devam ediyormuş gibi)
      // OTOMATİK SESLİ OKUMA: yeni cevabın BALON düğmesinde × göster (konuşurken), bitince kendiliğinden kapansın → balon düğmesi = konuşma göstergesi/kontrolü
      if (sesliMod && metin) { const yi = yeniListe.length; setKonusanMesaj(yi); konusanMesajRef.current = yi; sesliOku(metin, okuTemizle, undefined, (maskotTanitRef.current || maskotMini) ? teleIlerleme : undefined); }
      if (canliIc && canliSohbetRef.current) canliDevam(); // CANLI: cevap bitince tekrar dinlemeye geç (döngü ölmesin)
      if (komut) setTimeout(() => komutAc(komut), 650);
    } catch (e) {
      setListe((s) => [...s, { rol: "ai", metin: t("yardimciHata", "Bağlantı kurulamadı, birazdan tekrar dene."), zamanMs: Date.now() }]);
      setMaskotKizgin(true); setTimeout(() => setMaskotKizgin(false), 2500); // HATA → maskot kırmızılaşır
      if (canliIc && canliSohbetRef.current) canliDevam(); // hata olsa da canlı döngü devam etsin
    }
    setYardimciYukleniyor(false);
    aiAltaKay();
  }
  // SESLİ KONUŞMA — SEÇİLİ AI dilinde dil kodu (TTS + STT). Canlı döngüde bile GÜNCEL kalsın diye aiDilRef.current.
  const aiSesKodu = (kod) => ({ tr: "tr-TR", en: "en-US", de: "de-DE", fr: "fr-FR", es: "es-ES", ru: "ru-RU", ar: "ar-SA", it: "it-IT", pt: "pt-PT", zh: "zh-CN", ja: "ja-JP", hi: "hi-IN", uk: "uk-UA" }[kod] || (typeof navigator !== "undefined" && navigator.language) || "tr-TR");
  const sesDilKodu = aiSesKodu(aiDil);
  // AI cevabını SESLİ oku (tarayıcı seslendirme) — dil kodu HER ZAMAN güncel aiDilRef'ten
  const sesliOku = (metin, onBitti, onCumle, onIlerleme) => {
    try {
      if (!("speechSynthesis" in window) || !metin) { if (typeof onBitti === "function") onBitti(); return; }
      const sesDilKodu = aiSesKodu(aiDilRef.current);
      // İŞARETLERİ TEMİZLE: yıldız/markdown/emoji sesli okunmasın ("yıldız yıldız" saçmalığı biter)
      const _okDil = (sesDilKodu || "tr").toLowerCase().split("-")[0];
      const _et = _okDil === "tr" ? " et " : " at ";
      const _nokta = _okDil === "tr" ? " nokta " : " dot ";
      const temiz = String(metin)
        // E-POSTA/@ DOĞRU OKUNSUN: "ali@gmail.com" -> "ali et gmail nokta com"; tek "@" -> "et/at"
        .replace(/([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, (m, u, d) => (u + _et + d).replace(/\./g, _nokta))
        .replace(/@/g, _et)
        .replace(/\*\*?|__?|`+|#+|>|~+|\|/g, " ")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, "")
        .replace(/[•★☆◆♦]/g, " ")
        .replace(/Gloxoo/gi, "Gloksu") // AI maskot adı: harf-harf değil net söylensin (Glok-su)
        .replace(/GLOXORG/gi, "Gloksorg") // marka adını harf-harf değil KELİME gibi oku (Glok-sorg)
        .replace(/\s+/g, " ").trim();
      if (!temiz) return;
      window.speechSynthesis.cancel();
      const lk = sesDilKodu.toLowerCase(), kok = lk.split("-")[0];
      // EN DOĞAL sesi seç: Natural/Neural/Online/Google/Premium (tekleme/robotik ses biter); yoksa bulut sesi; yoksa ilk uygun
      const sesSec = () => {
        const sesler = (window.speechSynthesis.getVoices && window.speechSynthesis.getVoices()) || [];
        const dilli = sesler.filter((v) => v.lang && (v.lang.toLowerCase() === lk || v.lang.toLowerCase().startsWith(kok)));
        const iyi = (v) => /natural|neural|online|premium|enhanced|google/i.test(v.name || ""); // bulut/doğal = tekleme YOK
        // KADIN + DÜZGÜN ses tercih et (kullanıcı: tekleyen kadın sesini değiştir). Bilinen kadın ses adları + female/kadın.
        const kadin = (v) => /female|kadın|woman|yelda|seda|filiz|aylin|elif|aria|jenny|zira|samantha|sonia|emma|katja|hedda|google türkçe|google.*(female)/i.test(v.name || "");
        return dilli.find((v) => iyi(v) && kadin(v)) // en iyi: doğal + kadın
          || dilli.find((v) => v.localService === false && kadin(v)) // bulut + kadın
          || dilli.find((v) => v.localService === false) // bulut (tekleme yok)
          || dilli.find(iyi) || dilli.find(kadin) || dilli[0] || null;
      };
      // UZUN metni CÜMLELERE böl: Chrome masaüstünde uzun metin kesiliyor/tekliyor → kısa parçalar akıcı okunur
      const parcalar = (temiz.match(/[^.!?…\n]+[.!?…]*/g) || [temiz]).map((s) => s.trim()).filter(Boolean);
      const konus = () => {
        const ses = sesSec();
        // ── KELİME KELİME İLERLEME (teleprompter) ──
        // İlerleme 0→1 hesaplanır: onboundary VARSA gerçek karakter konumundan (kesin), YOKSA zamana göre (tahmin).
        // Böylece Android onboundary desteklemese bile yazı kelime kelime akmaya DEVAM eder (sonuna kadar).
        const toplamChar = temiz.length || 1;
        const tahminMs = Math.max(1400, toplamChar * 90); // ~90ms/karakter (rate 1): gerçek TTS'e yakın. 62 ÇOK HIZLIYDI → yazı imleci sesten ÖNCE sona varıyordu (kullanıcı: "ok sona geliyor ama konuşma devam ediyor")
        let basMs = Date.now(), duraklaTop = 0, duraklaBas = 0, boundaryChar = -1, ilerTimer = null, ilerBitti = false;
        const durdurIler = () => { if (ilerTimer) { clearInterval(ilerTimer); ilerTimer = null; } if (!ilerBitti) { ilerBitti = true; if (typeof onIlerleme === "function") { try { onIlerleme(1); } catch (e) {} } } };
        if (typeof onIlerleme === "function") {
          let baslamisMi = false, tikSay = 0;
          ilerTimer = setInterval(() => {
            tikSay++;
            const ss = window.speechSynthesis;
            if (!ss) { durdurIler(); return; }
            if (ss.speaking || ss.pending) baslamisMi = true;
            if (baslamisMi && !ss.speaking && !ss.pending) { durdurIler(); return; } // bitti/İPTAL → interval kendini kapatır (sızıntı yok)
            if (!baslamisMi && tikSay > 60) { durdurIler(); return; }               // ~5.4sn içinde başlamadıysa bırak
            if (!ss.speaking && !ss.pending) return;                                 // henüz başlamadı
            if (ss.paused) { if (!duraklaBas) duraklaBas = Date.now(); return; }      // DURAKLAT → ilerleme dursun
            if (duraklaBas) { duraklaTop += Date.now() - duraklaBas; duraklaBas = 0; }
            let frac;
            if (boundaryChar >= 0) {
              frac = boundaryChar / toplamChar;                    // GERÇEK konuşma konumu (onboundary) — kesin, sınırlama yok
            } else {
              frac = (Date.now() - basMs - duraklaTop) / tahminMs; // zaman tahmini
              if (frac > 0.9) frac = 0.9;                          // TAHMİNDE: imleç SESTEN ÖNCE sona VARMASIN → 0.9'da bekler; ses gerçekten bitince durdurIler() 1 yapar (imleç tam o an sona gelir, senkron)
            }
            if (frac < 0) frac = 0; if (frac > 1) frac = 1;
            try { onIlerleme(frac); } catch (e) {}
          }, 90);
        }
        let charOfs = 0;
        parcalar.forEach((p, idx) => {
          const u = new SpeechSynthesisUtterance(p);
          u.lang = sesDilKodu; u.rate = 1; u.pitch = 1; if (ses) u.voice = ses;
          const buOfs = charOfs;
          // HER cümle okunmaya başlayınca haber ver (teleprompter geri uyumluluk) + ilk parçada zaman sıfırla
          u.onstart = () => { if (idx === 0) basMs = Date.now(); if (typeof onCumle === "function") { try { onCumle(idx); } catch (e) {} } };
          // KELİME sınırı (destekleyen tarayıcıda): gerçek karakter konumu → ilerleme kesinleşir
          u.onboundary = (ev) => { try { if (ev && typeof ev.charIndex === "number") boundaryChar = buOfs + ev.charIndex; } catch (e) {} };
          // SON parça bitince: ilerlemeyi 1 yap/kapat + haber ver (oku düğmesi × → normale dönsün)
          if (idx === parcalar.length - 1) u.onend = () => { durdurIler(); if (typeof onBitti === "function") { try { onBitti(); } catch (e) {} } };
          window.speechSynthesis.speak(u);
          charOfs += p.length + 1;
        });
      };
      let basladi = false;
      const baslat = () => { if (basladi) return; basladi = true; konus(); };
      if (((window.speechSynthesis.getVoices && window.speechSynthesis.getVoices()) || []).length > 0) baslat();
      else { try { window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; baslat(); }; } catch (e) {} setTimeout(baslat, 400); }
    } catch (e) {}
  };
  // BALON İÇİ "OKU" DÜĞMESİ — mikrofondan TAMAMEN AYRI (sadece TTS). Bas=oku, tekrar bas=dur; okurken × gösterir.
  const [konusanMesaj, setKonusanMesaj] = useState(-1);
  const konusanMesajRef = useRef(-1);
  const okuTemizle = () => { setKonusanMesaj(-1); konusanMesajRef.current = -1; };
  const okuToggle = (metin, i) => {
    let konusuyor = false;
    try { konusuyor = !!(window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)); } catch (e) {}
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
    if (konusuyor) { okuTemizle(); return; } // bir şey konuşuyordu (oto-okuma dahil) → DURDUR
    setKonusanMesaj(i); konusanMesajRef.current = i;
    sesliOku(metin, okuTemizle);
  };
  // Canlı dikteyi DURDUR (gönderince / tekrar basınca) — şeritteki metin KALIR
  const dikteDurdur = () => {
    dikteAcikRef.current = false;
    try { recognitionRef.current && recognitionRef.current.stop(); } catch (e) {}
    recognitionRef.current = null;
    setDinliyor(false);
  };
  // Mikrofon = TEK SEFERLİK DİKTE (bas→konuş→tekrar bas): sesi KAYDEDER, Whisper ile BİR KEZ yazıya çevirir → ŞERİDE yazar.
  // Tarayıcının canlı tanıması (SpeechRecognition) kelimeleri TEKRARLIYORDU (Android 10x/100x) — KALDIRILDI; Whisper tek sefer, tekrar İMKANSIZ.
  // YAZI DİKTE = ŞERİDE KONUŞARAK YAZ: tarayıcının KENDİ ses tanıması (OpenAI GEREKMEZ). Bas→konuş, konuştukça
  // kelimeler CANLI şeride yazılır (ne dediğini görürsün); tekrar bas→durur. Sen düzenler, ➤ ile gönderirsin.
  const sesleSor = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    // İKİNCİ BASIŞ → dikteyi durdur (yazı şeritte KALIR)
    if (dikteAcikRef.current) { try { dikteDurdur(); } catch (e) {} return; }
    if (SR) {
      if (canliSohbetRef.current) { try { canliSohbetToggle(); } catch (e) {} }
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
      dikteAcikRef.current = true; setDinliyor(true);
      dikteTabanRef.current = (yardimciYazi || "").trim(); // mevcut yazı korunur, üstüne eklenir
      // Her başlatmada TAZE tanıyıcı (Android'de sessizlikte durunca temiz yeniden başlar → kelime tekrarı olmaz)
      const basla = () => {
        let rec; try { rec = new SR(); } catch (e) { dikteAcikRef.current = false; setDinliyor(false); return; }
        rec.lang = aiSesKodu(aiDilRef.current); rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1;
        recognitionRef.current = rec;
        let kalici = ""; // bu oturumda KESİNLEŞEN metin
        rec.onresult = (e) => {
          let gecici = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const tr = (e.results[i][0] && e.results[i][0].transcript) || "";
            if (e.results[i].isFinal) kalici += tr + " "; else gecici += tr; // resultIndex ile SADECE yeni sonuçlar → tekrar YOK
          }
          const taban = dikteTabanRef.current;
          const yeni = ((taban ? taban + " " : "") + kalici + gecici).replace(/\s+/g, " ").replace(/^\s+/, "");
          setYardimciYazi(yeni);
          try { const el = yardimciInputRef.current; if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 200) + "px"; } } catch (er) {}
        };
        rec.onerror = (ev) => {
          if (ev && (ev.error === "not-allowed" || ev.error === "service-not-allowed")) { dikteAcikRef.current = false; recognitionRef.current = null; setDinliyor(false); setKucukMesaj(t("mikIzin", "Mikrofon izni gerekli — tarayıcı ayarından izin ver")); }
        };
        rec.onend = () => {
          if (kalici) dikteTabanRef.current = ((dikteTabanRef.current ? dikteTabanRef.current + " " : "") + kalici).replace(/\s+/g, " ").trim();
          recognitionRef.current = null;
          if (dikteAcikRef.current) basla(); // kullanıcı kapatana kadar dinlemeye devam (sessizlikte durunca yeniden başlat)
          else setDinliyor(false);
        };
        try { rec.start(); } catch (e) {}
      };
      basla();
      return;
    }
    // SpeechRecognition YOKSA → eski Whisper/worker yolu (OpenAI anahtarı varsa çalışır)
    sesleSorWhisper();
  };
  // ESKİ YOL (yedek): sesi kaydedip worker/Whisper ile BİR KEZ yazıya çevirir → şeride yazar (OpenAI gerekir)
  const sesleSorWhisper = async () => {
    if (dinliyor && mediaRecorderRef.current) { try { mediaRecorderRef.current.stop(); } catch (e) {} return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { setKucukMesaj(t("sesYok", "Bu tarayıcı sesli konuşmayı desteklemiyor")); return; }
    if (canliSohbetRef.current) { try { canliSohbetToggle(); } catch (e) {} await new Promise((r) => setTimeout(r, 200)); }
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false, channelCount: 1 } });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr; sesParcaRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size) sesParcaRef.current.push(e.data); };
      mr.onstop = async () => {
        setDinliyor(false);
        try { stream.getTracks().forEach((tr) => tr.stop()); } catch (e) {}
        const blob = new Blob(sesParcaRef.current, { type: mr.mimeType || "audio/webm" });
        mediaRecorderRef.current = null;
        if (!blob.size) return;
        const b64 = await new Promise((res) => { const fr = new FileReader(); fr.onloadend = () => res(((fr.result || "") + "").split(",")[1] || ""); fr.readAsDataURL(blob); });
        if (!b64) return;
        setYardimciYukleniyor(true);
        try {
          const r = await fetch(AI_KOPRU, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ses: b64, dil: aiDilRef.current }) });
          const veri = await r.json();
          setYardimciYukleniyor(false);
          const metin = ((veri && veri.metin) || "").trim();
          // YAZI DİKTE: sesi metne çevirip ŞERİDE yaz (otomatik GÖNDERME, sesli moda ZORLAMA) — kullanıcı görüp düzenler, ➤ ile gönderir
          if (metin) { setYardimciYazi((y) => (y ? y + " " : "") + metin); try { yardimciInputRef.current && yardimciInputRef.current.focus(); } catch (e) {} }
          else setKucukMesaj(t("sesAnlasilmadi", "Ses anlaşılamadı, tekrar dene"));
        } catch (e) { setYardimciYukleniyor(false); setKucukMesaj(t("sesHata", "Ses gönderilemedi, tekrar dene")); }
      };
      mr.start();
      setDinliyor(true);
    } catch (e) { setKucukMesaj(t("mikIzin", "Mikrofon izni gerekli — tarayıcı ayarından izin ver")); }
  };
  // DÜĞMESİZ CANLI SOHBET — mikrofonu otomatik aç, KONUŞMA bitince (sessizlik) otomatik gönder, cevap ver, tekrar dinle
  // CANLI döngüde: AI sesli cevabı BİTENE kadar bekle, sonra tekrar dinle (onend'e güvenme — bazen tetiklenmiyordu → döngü ölüyordu)
  const canliDevam = () => {
    if (!canliSohbetRef.current) return;
    let bekle = 0;
    const ti = setInterval(() => {
      if (!canliSohbetRef.current) { clearInterval(ti); return; }
      bekle += 300;
      let konusuyor = false; try { konusuyor = !!(window.speechSynthesis && window.speechSynthesis.speaking); } catch (e) {}
      if ((bekle >= 700 && !konusuyor) || bekle > 45000) { clearInterval(ti); try { canliDinle(); } catch (e) {} }
    }, 300);
  };
  const canliDinle = async () => {
    if (!canliSohbetRef.current) return;
    if (mediaRecorderRef.current) return; // zaten dinliyor (çift kayıt olmasın)
    // YARI-ÇİFT YÖNLÜ: GLOXOO KONUŞURKEN MİKROFON KAPALI — kendi sesini/etraf gürültüsünü algılayıp konuşmasını kesmesin.
    // Konuşma bitince canliDevam otomatik tekrar dinlemeye geçirir (kullanıcının düğmesi otomatik açılır).
    if (aiKonusuyorRef.current || (window.speechSynthesis && window.speechSynthesis.speaking)) { setDinliyor(false); canliDevam(); return; }
    // ===== ÖNCE TARAYICININ KENDİ SES TANIMASI (OpenAI/Whisper GEREKMEZ, ÜCRETSİZ) =====
    // Ses→yazı için OpenAI anahtarına ihtiyaç YOK: Chrome/Android'in yerleşik tanımasını kullanır.
    // Android'in "kelime tekrarı" hatasına düşmemek için: continuous=false + interimResults=false + TEK final sonuç, sonra durur.
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      if (recognitionRef.current) return; // zaten dinliyor (çift tanıma olmasın)
      try {
        const rec = new SR();
        rec.lang = aiSesKodu(aiDilRef.current); // SEÇİLİ AI dili — gürültüde İngilizce'ye kaymaz (dil kilidi)
        rec.continuous = false; rec.interimResults = false; rec.maxAlternatives = 1;
        recognitionRef.current = rec;
        let bitti = false;
        const sonlan = (tekrarDinle) => {
          if (bitti) return; bitti = true;
          recognitionRef.current = null; setDinliyor(false);
          if (tekrarDinle && canliSohbetRef.current && !aiKonusuyorRef.current && !(window.speechSynthesis && window.speechSynthesis.speaking)) canliDinle();
        };
        rec.onresult = (e) => {
          if (bitti) return;
          const son = e.results && e.results[e.results.length - 1];
          const metin = ((son && son[0] && son[0].transcript) || "").trim();
          if (metin && canliSohbetRef.current) { bitti = true; recognitionRef.current = null; setDinliyor(false); bosSesRef.current = 0; yardimciGonder(metin, { canli: true, kameraKare: kameraModRef.current ? kameraKare() : null }); }
          else sonlan(true); // boş → tekrar dinle
        };
        rec.onerror = (ev) => {
          if (ev && (ev.error === "not-allowed" || ev.error === "service-not-allowed")) { bitti = true; recognitionRef.current = null; setDinliyor(false); canliSohbetRef.current = false; setCanliSohbet(false); setKucukMesaj(t("mikIzin", "Mikrofon izni gerekli — tarayıcı ayarından izin ver")); return; }
          sonlan(true); // no-speech / aborted / network → tekrar dinle
        };
        rec.onend = () => sonlan(true);
        setDinliyor(true);
        rec.start();
        return;
      } catch (e) { try { recognitionRef.current = null; } catch (e2) {} /* başlatılamadı → aşağıdaki Whisper yoluna düş */ }
    }
    if (!navigator.mediaDevices || !window.MediaRecorder) { setKucukMesaj(t("sesYok", "Bu tarayıcı sesli konuşmayı desteklemiyor")); return; }
    try {
      // SESİ NET AL: yankı+gürültü bastır, OTO-KAZANÇ AÇIK (sesi normal seviyeye getirir → Whisper net duyar).
      // NOT: autoGainControl KAPALIYKEN yakın ses bile çok kısık kaydolup Whisper'ın duyamamasına (boş dönüş) yol açıyordu → AÇIK.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr; sesParcaRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size) sesParcaRef.current.push(e.data); };
      let ac, raf, konustu = false, sessizBas = 0, yuksek = 0, ttsKesti = false; const basT = Date.now();
      // ADAPTİF EŞİK: ilk ~450ms ortam/arka gürültü (araba/rüzgar sabit sesi) ölçülür; eşik ona göre ayarlanır →
      // gürültülü ortamda eşik yükselir (sadece YAKIN konuşma geçer), sessizde düşer (hafif ses de yakalanır).
      let taban = 0, tabanN = 0, esik = 0.055, kalibre = false;
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        const src = ac.createMediaStreamSource(stream); const an = ac.createAnalyser(); an.fftSize = 1024; src.connect(an);
        const veri = new Uint8Array(an.fftSize);
        const izle = () => {
          if (!mr || mr.state !== "recording") return;
          // Kayıt sırasında GLOXOO KONUŞMAYA BAŞLADIYSA (ör. sesli okuma) → kaydı hemen bırak, GÖNDERME; TTS bitince tekrar dinlenir.
          if (aiKonusuyorRef.current || (window.speechSynthesis && window.speechSynthesis.speaking)) { ttsKesti = true; konustu = false; try { mr.stop(); } catch (e) {} return; }
          an.getByteTimeDomainData(veri);
          let rms = 0; for (let i = 0; i < veri.length; i++) { const v = (veri[i] - 128) / 128; rms += v * v; } rms = Math.sqrt(rms / veri.length);
          const simdi = Date.now();
          // İLK ~450ms: arka/ortam gürültü tabanını ölç (henüz konuşma algılama yok)
          if (simdi - basT < 450) { taban += rms; tabanN++; raf = requestAnimationFrame(izle); return; }
          if (!kalibre) { kalibre = true; const ort = tabanN ? taban / tabanN : 0.02; esik = Math.max(0.045, Math.min(0.12, ort * 1.9 + 0.015)); } // arka gürültünün ~1.9 katı → yakın konuşma net geçer (fazla yüksek eşikte ses takılmasın)
          // KONUŞMA = eşiği AŞAN (yakın) ses; sabit arka gürültü eşiğin ALTINDA kalır → yanlış tetiklenmez
          if (rms > esik) { yuksek++; if (yuksek >= 2) { konustu = true; sessizBas = 0; } }
          else { yuksek = 0; if (konustu && !sessizBas) sessizBas = simdi; else if (konustu && sessizBas && simdi - sessizBas > 1200) { try { mr.stop(); } catch (e) {} return; } } // 1.2sn SESSİZLİK → bitti
          if (simdi - basT > 30000) { try { mr.stop(); } catch (e) {} return; } // en fazla 30sn
          raf = requestAnimationFrame(izle);
        };
        raf = requestAnimationFrame(izle);
      } catch (e) {}
      mr.onstop = async () => {
        setDinliyor(false);
        try { stream.getTracks().forEach((tr) => tr.stop()); } catch (e) {}
        try { if (raf) cancelAnimationFrame(raf); if (ac) ac.close(); } catch (e) {}
        mediaRecorderRef.current = null;
        // CANLI bu sırada KAPANDIYSA (dikte mikrofonuna basıldı vb.) tamponlanan sesi GÖNDERME, AT (yukarı yollayıp geri çekme olmasın)
        if (!canliSohbetRef.current) return;
        const blob = new Blob(sesParcaRef.current, { type: mr.mimeType || "audio/webm" });
        if (!konustu || !blob.size) {
          if (canliSohbetRef.current) {
            // TTS yüzünden kesildiyse "duyamadım" DEME (Gloxoo konuşuyordu); TTS bitince canliDevam tekrar dinletir. Sessizlikse normal uyar + tekrar dinle.
            if (ttsKesti || aiKonusuyorRef.current || (window.speechSynthesis && window.speechSynthesis.speaking)) { canliDevam(); }
            else { setKucukMesaj(t("duyamadim", "Seni duyamadım — biraz daha yüksek konuş 🎤")); canliDinle(); }
          }
          return;
        }
        const b64 = await new Promise((res) => { const fr = new FileReader(); fr.onloadend = () => res(((fr.result || "") + "").split(",")[1] || ""); fr.readAsDataURL(blob); });
        if (!b64) { if (canliSohbetRef.current) canliDinle(); return; }
        setYardimciYukleniyor(true);
        try {
          const r = await fetch(AI_KOPRU, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ses: b64, dil: aiDilRef.current }) });
          const veri2 = await r.json(); setYardimciYukleniyor(false);
          const metin = ((veri2 && veri2.metin) || "").trim();
          if (metin) { bosSesRef.current = 0; yardimciGonder(metin, { canli: true, kameraKare: kameraModRef.current ? kameraKare() : null }); } // görüntülü modda o anki kareyi ekle (Gloxoo seni görür); cevap sesli okunur → bitince tekrar dinler
          else if (canliSohbetRef.current) {
            // Kullanıcı KONUŞTU (blob geldi) ama yazıya çevrilemedi → sonsuz sessiz döngü OLMASIN: üst üste 2 kez olunca AÇIKÇA uyar.
            // TEŞHİS: worker'ın gerçek ses hatasını (OPENAI_API_KEY yok / HTTP 401 / model hatası) EKRANA yaz ki sebep tek fotoğrafta görünsün.
            bosSesRef.current++;
            const sesHata = (veri2 && veri2.hata) ? String(veri2.hata) : "";
            if (bosSesRef.current >= 2) {
              bosSesRef.current = 0;
              const mesaj = sesHata ? ("Sesi yazıya çeviremedim. Worker'ın verdiği sebep: " + sesHata) : "Sesini duydum ama yazıya çeviremedim (ses çok kısık/kısa olabilir). Biraz daha yüksek ve net konuş.";
              try { setKucukMesaj(mesaj); } catch (e) {}
              try { setMaskotMetni(mesaj); } catch (e) {}
              try { setYardimciMesajlar((s) => [...s, { rol: "ai", metin: mesaj, zamanMs: Date.now() }]); } catch (e) {}
            }
            canliDinle();
          }
        } catch (e) { setYardimciYukleniyor(false); if (canliSohbetRef.current) canliDinle(); }
      };
      mr.start(); setDinliyor(true);
    } catch (e) { canliSohbetRef.current = false; setCanliSohbet(false); setKucukMesaj(t("mikIzin", "Mikrofon izni gerekli — tarayıcı ayarından izin ver")); }
  };
  // AI seçili dilde İLK KARŞILAMA cümlesi (isimle hitap); sesli okunur, bitince (onend) dinlemeye geçer
  const aiSelamMetni = () => {
    const ad = (u && (u.displayName || u.ad)) ? String(u.displayName || u.ad).split(" ")[0] : "";
    const m = {
      tr: `Merhaba${ad ? " " + ad : ""}, ben Gloxoo, Gloxorg dünyasının sesli asistanıyım. Seni dinliyorum, nasıl yardımcı olabilirim?`,
      en: `Hello${ad ? " " + ad : ""}, I'm Gloxoo, the voice assistant of the Gloxorg world. I'm listening — how can I help you?`,
      de: `Hallo${ad ? " " + ad : ""}, ich bin Gloxoo, der Sprachassistent der Gloxorg-Welt. Ich höre zu — wie kann ich helfen?`,
      fr: `Bonjour${ad ? " " + ad : ""}, je suis Gloxoo, l'assistant vocal du monde Gloxorg. Je t'écoute — comment puis-je aider ?`,
      es: `Hola${ad ? " " + ad : ""}, soy Gloxoo, el asistente de voz del mundo Gloxorg. Te escucho, ¿en qué puedo ayudarte?`,
      ru: `Здравствуйте${ad ? ", " + ad : ""}, я Gloxoo, голосовой помощник мира Gloxorg. Слушаю вас — чем могу помочь?`,
      ar: `مرحبا${ad ? " " + ad : ""}، أنا Gloxoo، المساعد الصوتي لعالم Gloxorg. أنا أستمع إليك، كيف يمكنني المساعدة؟`,
      it: `Ciao${ad ? " " + ad : ""}, sono Gloxoo, l'assistente vocale del mondo Gloxorg. Ti ascolto, come posso aiutarti?`,
      pt: `Olá${ad ? " " + ad : ""}, sou o Gloxoo, o assistente de voz do mundo Gloxorg. Estou a ouvir — como posso ajudar?`,
      zh: `你好${ad ? "，" + ad : ""}，我是 Gloxoo，Gloxorg 世界的语音助手。我在听，有什么可以帮你的？`,
      ja: `こんにちは${ad ? "、" + ad : ""}。Gloxorg の世界の音声アシスタント、Gloxoo です。聞いています、どうされましたか？`,
      hi: `नमस्ते${ad ? " " + ad : ""}, मैं Gloxoo हूँ, Gloxorg दुनिया का वॉइस असिस्टेंट। मैं सुन रहा हूँ, कैसे मदद करूँ?`,
      uk: `Вітаю${ad ? ", " + ad : ""}, я Gloxoo, голосовий помічник світу Gloxorg. Слухаю вас — чим можу допомогти?`,
    };
    return m[aiDilRef.current] || m.tr;
  };
  // AI ÖNCE karşılar: karşılama mesajını listeye ekle + SESLİ oku (bitince otomatik dinler)
  const aiKarsila = () => {
    const selam = aiSelamMetni();
    setYardimciMesajlar((s) => [...s, { rol: "ai", metin: selam, zamanMs: Date.now() }]);
    sesliOku(selam);
    if (canliSohbetRef.current) canliDevam(); // karşılama bitince dinlemeye geç (kesintisiz döngü, onend'e bağlı değil)
  };
  // GÖRÜNTÜLÜ SOHBET: kameradan O ANKİ kareyi JPEG base64 olarak al (AI'nın "görmesi" için)
  const kameraKare = () => {
    try {
      const v = kameraVideoRef.current;
      if (!v || !v.videoWidth) return null;
      const en = 640, boy = Math.round(en * (v.videoHeight / v.videoWidth)) || 480;
      const c = document.createElement("canvas"); c.width = en; c.height = boy;
      const ctx = c.getContext("2d"); ctx.drawImage(v, 0, 0, en, boy);
      const url = c.toDataURL("image/jpeg", 0.7);
      const b64 = (url.split(",")[1]) || "";
      return b64 ? { base64: b64, mediaType: "image/jpeg" } : null;
    } catch (e) { return null; }
  };
  // Verilen yönle (ön/arka) kamera akışını al + self-view'e bağla (eski akışı durdurur)
  const kameraAkisAl = async (yon) => {
    try { if (kameraStreamRef.current) kameraStreamRef.current.getTracks().forEach((tr) => tr.stop()); } catch (e) {}
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: yon }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
    kameraStreamRef.current = stream;
    setTimeout(() => { try { if (kameraVideoRef.current) { kameraVideoRef.current.srcObject = stream; kameraVideoRef.current.play().catch(() => {}); } } catch (e) {} }, 60);
    return stream;
  };
  // GÖRÜNTÜLÜ CANLI SOHBET BAŞLAT: kamera aç (seni + çevreni görür) + sesli canlı sohbeti başlat
  const kameraBaslat = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { setKucukMesaj(t("kameraYok", "Bu cihaz kamerayı desteklemiyor")); return; }
    try {
      await kameraAkisAl(kameraYon);
      kameraModRef.current = true; setKameraAcik(true);
      // sesli canlı sohbeti de başlat (görüntülü sohbet = ses + kamera)
      if (!canliSohbetRef.current) { try { maskotCanliBaslat(); } catch (e) {} }
    } catch (e) { setKucukMesaj(t("kameraIzin", "Kamera izni gerekli — tarayıcı/telefon ayarından izin ver")); }
  };
  // ÖN/ARKA KAMERA DEĞİŞTİR: selfie (user) <-> etraf (environment)
  const kameraDegistir = async () => {
    const yeni = kameraYon === "user" ? "environment" : "user";
    setKameraYon(yeni);
    try { await kameraAkisAl(yeni); } catch (e) { try { await kameraAkisAl(kameraYon); } catch (e2) {} setKucukMesaj(t("kameraDegisemedi", "Bu cihazda ikinci kamera bulunamadı")); setKameraYon(kameraYon); }
  };
  const kameraKapat = () => {
    kameraModRef.current = false; setKameraAcik(false);
    try { if (kameraStreamRef.current) kameraStreamRef.current.getTracks().forEach((tr) => tr.stop()); } catch (e) {}
    kameraStreamRef.current = null;
    try { if (kameraVideoRef.current) kameraVideoRef.current.srcObject = null; } catch (e) {}
  };
  const kameraToggle = () => { if (kameraModRef.current) kameraKapat(); else kameraBaslat(); };
  // SELF-VIEW SÜRÜKLE (istediğin yere taşı — sabit değil)
  const kameraSurBas = (e) => {
    if (!kameraPenRef.current) return;
    const r = kameraPenRef.current.getBoundingClientRect();
    kameraSurRef.current = { on: true, moved: false, sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top };
    try { kameraPenRef.current.setPointerCapture(e.pointerId); } catch (_) {}
  };
  const kameraSurGit = (e) => {
    const d = kameraSurRef.current; if (!d.on || !kameraPenRef.current) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;
    const w = kameraPenRef.current.offsetWidth, h = kameraPenRef.current.offsetHeight;
    const x = Math.max(6, Math.min(d.ox + dx, window.innerWidth - w - 6));
    const y = Math.max(6, Math.min(d.oy + dy, window.innerHeight - h - 6));
    setKameraYer({ x, y });
  };
  const kameraSurBitir = () => { kameraSurRef.current.on = false; };
  // EKSPERT (🐻) köşe kartını PARMAKLA TAŞI — istediğin yere sürükle (sabit değil). Ayının yüzü tutamaç.
  const eksperSurBas = (e) => {
    if (!eksperPenRef.current) return;
    const r = eksperPenRef.current.getBoundingClientRect();
    eksperSurRef.current = { on: true, moved: false, sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };
  const eksperSurGit = (e) => {
    const d = eksperSurRef.current; if (!d.on || !eksperPenRef.current) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;
    const w = eksperPenRef.current.offsetWidth, h = eksperPenRef.current.offsetHeight;
    const x = Math.max(6, Math.min(d.ox + dx, window.innerWidth - w - 6));
    const y = Math.max(6, Math.min(d.oy + dy, window.innerHeight - h - 6));
    setEksperYer({ x, y });
  };
  const eksperSurBitir = () => { eksperSurRef.current.on = false; };
  const canliSohbetToggle = () => {
    if (canliSohbetRef.current) { // KAPAT
      canliSohbetRef.current = false; setCanliSohbet(false); setDinliyor(false);
      aiKarsiladiRef.current = false;
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
      try { mediaRecorderRef.current && mediaRecorderRef.current.stop(); } catch (e) {}
      try { recognitionRef.current && recognitionRef.current.abort(); recognitionRef.current = null; } catch (e) {} // tarayıcı ses tanımasını da durdur
      // NOT: kamerayı burada KAPATMA — yazı kutusuna dokununca da canlı ses kapanıyor; kamera açık kalsın (sadece ✕ / kamera düğmesi kapatır)
      return;
    }
    if (kameraModRef.current) { try { kameraKapat(); } catch (e) {} } // KARŞILIKLI: Canlı açılınca Kamera kapanır
    canliSohbetRef.current = true; setCanliSohbet(true); setSesliMod(true);
    aiKarsiladiRef.current = true;
    aiKarsila(); // AI ÖNCE konuşur (karşılama), sonra dinlemeye geçer
  };
  // Sesli modu kapatınca konuşmayı sustur
  // Hoparlör = SADECE sonraki cevapların oto-okumasını aç/kapar. ÇALAN konuşmayı KESMEZ (onu sadece balon × düğmesi durdurur — iki düğme AYRI, birbirine bağlı değil).
  const sesliModToggle = () => { setSesliMod((v) => !v); };
  // DURAKLAT/DEVAM — konuşmayı olduğu yerde durdurur; tekrar basınca kaldığı yerden devam eder
  const sesDuraklaToggle = () => {
    try {
      const ss = window.speechSynthesis; if (!ss) return;
      if (aiDuraklat || ss.paused) { ss.resume(); setAiDuraklat(false); }
      else if (ss.speaking) { ss.pause(); setAiDuraklat(true); }
    } catch (e) {}
  };
  // SUS — konuşmayı tamamen keser (sen hemen konuşabilirsin); canlı modda dinlemeye geçer
  const sesSus = () => {
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
    aiKonusuyorRef.current = false; setAiKonusuyor(false); // Gloxoo sustu → mikrofon otomatik açılabilir (senin düğmen açılır)
    setAiDuraklat(false);
    try { okuTemizle(); } catch (e) {}
    if (canliSohbetRef.current) { try { canliDevam(); } catch (e) {} } // sustuktan sonra SENİ dinle (otomatik)
  };
  // MÜŞTERİ → Profesyonele yönlendirme: kısa açıklama (AI hakkı bitti, yeni istek atmadan) + menüyü aç
  const proYukselt = () => {
    const bilgi = "✨ Profesyonel (kırmızı pırlanta) üyelik avantajları: günde 200 yapay zeka sorusu (ücretsizde 15), profilin öne çıkar, daha çok müşteriye ulaşırsın ve gelişmiş araçlar açılır. Yükseltmek için menüden Profesyonel üyeliğe geçebilirsin. 💎";
    setYardimciMesajlar((s) => [...s, { rol: "ai", metin: bilgi, zamanMs: Date.now() }]);
    setTimeout(() => { try { setYardimciAcik(false); setMenuAcik(true); } catch (e) {} }, 1600);
  };
  // GLOXORG PIRLANTA ÜYELİK seçimi — şimdilik ÜCRETSİZ (kart ödeme yok): seç, sınır kalksın, devam et
  const uyelikSec = (tur) => {
    const uu = auth.currentUser;
    setProfilBilgi((p) => ({ ...(p || {}), uyelik: tur }));
    if (uu) profilKaydet(uu.uid, { uyelik: tur }).catch(() => {});
    setUyelikKartAcik(false);
    const ad = tur === "altin" ? "GLOXORG Altın Pırlanta" : "GLOXORG Kırmızı Pırlanta";
    setYardimciMesajlar((s) => [...s, { rol: "ai", metin: `🎉 Tebrikler! ${ad} üyeliğin etkinleştirildi (tanıtım dönemi — ücretsiz). Artık günlük sınır olmadan benimle çalışabilirsin. Hadi kaldığımız yerden devam edelim! 💎`, zamanMs: Date.now() }]);
  };
  // Metni panoya KOPYALA (mesaja/karta dokununca) — kısa onay balonu
  const panoyaKopyala = (metin) => {
    const txt = (metin || "").toString();
    if (!txt) return;
    const ok = () => setKucukMesaj(t("kopyalandi", "Kopyalandı 📋"));
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt).then(ok).catch(() => {}); return; }
    } catch (e) {}
    try { const ta = document.createElement("textarea"); ta.value = txt; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); ok(); } catch (e) {}
  };
  // Hazırlanan metni DOSYA olarak indir (.txt)
  const metniIndir = (metin) => {
    const txt = (metin || "").toString(); if (!txt) return;
    try {
      const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "GLOXORG-" + (txt.replace(/\s+/g, "-").slice(0, 24) || "paylasim") + ".txt";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 1500);
      setKucukMesaj(t("indirildi", "İndirildi 📄"));
    } catch (e) {}
  };
  // Hazırlanan PAYLAŞIMI paylaşım penceresine taşı (yazısı dolu açılır)
  const paylasimaTasi = (metin) => {
    if (!metin) return;
    try { setDuzenlenen(null); } catch (e) {}
    setPaylasYazi(metin); setPaylasGorsel(""); setPaylasEkFotolar([]); setPaylasVideo(""); setPaylasDurum("");
    setYardimciAcik(false); setPaylasAcik(true);
  };
  // Mevcut konuşmayı KAYITLI KONUŞMALAR (oturumlar) listesine kaydet — sonra üstteki "Konuşmalarım"dan bulunur
  const oturumKaydet = () => {
    const aktif = (yardimciMod === "site" ? siteMesajlar : yardimciMesajlar).filter((m) => m && m.metin);
    if (aktif.length < 2) return; // tek karşılama mesajı varsa kaydetme
    const ilk = aktif.find((m) => m.rol === "user") || aktif[0];
    const oturum = {
      id: "o" + (aktif[0].zamanMs || Date.now()),
      baslik: (ilk.metin || "").replace(/\s+/g, " ").trim().slice(0, 60) || "Konuşma",
      zamanMs: aktif[aktif.length - 1].zamanMs || Date.now(),
      mod: yardimciMod,
      konum: (aktif.find((m) => m.konum) || {}).konum || "",
      mesajlar: aktif.map((m) => ({ rol: m.rol, metin: m.metin, zamanMs: m.zamanMs, konum: m.konum || "" })),
    };
    setOturumlar((prev) => {
      const yeni = [oturum, ...prev.filter((o) => o.id !== oturum.id)].slice(0, 100);
      try { localStorage.setItem("groxOturumlar", JSON.stringify(yeni)); } catch (e) {}
      return yeni;
    });
  };
  // KONUŞMA SİL — kayıtlı konuşmayı listeden kaldırır (SADECE bu; günlük AI hakkı/sınırı ile İLGİSİ YOK, ona dokunmaz)
  const oturumSil = (id) => {
    try { if (!window.confirm(t("konusmaSilOnay", "Bu konuşmayı silmek istiyor musun? (Günlük hakkın etkilenmez.)"))) return; } catch (e) {}
    setOturumlar((prev) => { const yeni = prev.filter((o) => o.id !== id); try { localStorage.setItem("groxOturumlar", JSON.stringify(yeni)); } catch (e) {} return yeni; });
  };
  // YENİ KONUŞMA — mevcut konuşmayı KAYDEDER (Konuşmalarım'a), sonra görünümü temizler; canlı varsa kapatır (geçmiş silinmez)
  const yeniKonusma = () => {
    setAiDilAcik(false);
    if (canliSohbetRef.current) { try { canliSohbetToggle(); } catch (e) {} }
    oturumKaydet();
    if (yardimciMod === "site") setSiteMesajlar([]); else setYardimciMesajlar([]);
    setYardimciYazi("");
    aiKarsiladiRef.current = false; // tekrar karşılayabilsin
  };
  // NOT: Panel kapanınca konuşmayı OTOMATİK temizleme KALDIRILDI (B42). O davranış konuşma sürerken
  // geçmişi siliyordu → Gloxoo önceki mesajları unutuyordu. Artık konuşma SÜRER ve HATIRLANIR; yalnızca
  // kullanıcı BİLİNÇLİ olarak "Yeni konuşma" (+) düğmesine basınca sonlanır (eski konuşma Konuşmalarım'a kaydedilir).
  // Panel her kapandığında sessizce oturumu KAYDET (kaybolmasın) — ama görünümü TEMİZLEME.
  useEffect(() => {
    const onceki = yardimciAcikOnceRef.current;
    yardimciAcikOnceRef.current = yardimciAcik;
    if (onceki && !yardimciAcik) { try { oturumKaydet(); } catch (e) {} } // sadece kaydet (yedek), TEMİZLEME yok
  }, [yardimciAcik]); // eslint-disable-line react-hooks/exhaustive-deps
  // KAYITLI bir konuşmayı geri yükle (görünüme getir) — Konuşmalarım panelinden
  const oturumYukle = (o) => {
    if (!o) return;
    setAiDilAcik(false); setOturumAcik(false);
    if (canliSohbetRef.current) { try { canliSohbetToggle(); } catch (e) {} }
    oturumKaydet(); // açık olanı da kaybetme
    const msj = (o.mesajlar || []).map((m) => ({ ...m }));
    aiKarsiladiRef.current = true; // yüklenen konuşmanın üstüne otomatik karşılama BİNMESİN
    if (o.mod === "site") { setYardimciMod("site"); setSiteMesajlar(msj); } else { setYardimciMod("sohbet"); setYardimciMesajlar(msj); }
    aiAltaKay();
  };
  // AÇILIŞTA KARŞILAMA: asistan (sohbet) açılınca AI bir kez METİNLE karşılar — ama ARTIK canlı mikrofona/sese OTOMATİK GEÇMEZ
  // (kullanıcı: açınca her yeri kilitliyordu, mikrofonu kapatıp kendim açayım). Ses isteyen CANLI düğmesine basar.
  useEffect(() => {
    // Asistana BASINCA AI kendiliğinden KONUŞMAZ/karşılamaz — kullanıcı bastı, kullanıcı konuşacak. (İstek: her açışta tekrar etmesin, beni beklesin.)
    // PANEL KAPANINCA / başka yere geçince: çalan canlı/dikte/ses TAMAMEN DURSUN (arka planda kalmasın = "kilitlenme" bitti)
    if (!yardimciAcik) {
      aiKarsiladiRef.current = false;
      if (dikteAcikRef.current) { try { dikteDurdur(); } catch (e) {} } // dikte panele özel — dursun
      // PANELİ ✕ İLE KAPATINCA CANLI SOHBET SÜRÜYORSA DURDURMA: mini maskota devret,
      // ana sayfada konuşma DEVAM etsin (kullanıcı Gloxoo'yu kendi kapatana kadar). İstek.
      if (canliSohbetRef.current) {
        setMaskotMini(true);
      } else {
        try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
        try { mediaRecorderRef.current && mediaRecorderRef.current.stop(); } catch (e) {}
      }
    }
  }, [yardimciAcik, yardimciMod]); // eslint-disable-line react-hooks/exhaustive-deps
  // 🌍 GÖNDERİ ÇEVİRİSİ — gerçek Claude ile kullanıcının diline çevir (köprü üzerinden); aç/kapa
  // Şehir fotoğrafını GERÇEKTEN indir (loremflickr CORS açık → fetch+blob; olmazsa yeni sekmede aç)
  const sehirIndir = async () => {
    try {
      const r = await fetch(sehirGaleriUrl);
      const b = await r.blob();
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url; a.download = `gloxorg-${buguninSehri.tag}-${sehirFotoNo + 1}.jpg`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) { window.open(sehirGaleriUrl, "_blank"); }
  };
  // GÖNDERİ medyasını (video/foto) indir
  const medyaIndir = async (p) => {
    const url = p && (p.video || p.gorsel);
    if (!url) return;
    const uzanti = p.video ? "mp4" : "jpg";
    try {
      const r = await fetch(url);
      const b = await r.blob();
      const u = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = u; a.download = `gloxorg-${(p.ad || "gonderi").replace(/\s+/g, "-")}.${uzanti}`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 1500);
    } catch (e) { window.open(url, "_blank"); }
  };
  // Günün şehri fotoğrafından "GLOXORG'a sor" → site asistanını ŞEHİR BAĞLAMIYLA aç
  const sehirAISor = () => {
    setSehirAcik(false);
    setYardimciMod("site");
    setYardimciBaglam(`Ana sayfadaki "günün şehri" fotoğrafı: ${buguninSehri.ad}, ${buguninSehri.ulke}. Kullanıcı bu şehir/ülke hakkında (gezi, kültür, yaşam, meslekler, iş fırsatları, fotoğraf) soruyor olabilir.`);
    setYardimciAcik(true);
  };
  // Bir GÖNDERİ hakkında GLOXORG'a sor — o yazıyı + FOTOĞRAFINI (vision) bağlam yapar, asistanı açar
  // (her AI kendi penceresinin içeriğini görür; konuşma devam eder, kesmez)
  const yaziAISor = (p) => {
    if (!p) return;
    setTamFoto("");
    setYardimciMod("site");
    setYardimciFoto(null);
    const metin = p.yazi || (p.video ? "(video gönderisi)" : p.gorsel ? "(fotoğraf gönderisi)" : "");
    setYardimciBaglam(`Kullanıcı şu an bu GÖNDERİYE bakıyor ve hakkında konuşmak/öneri istiyor. Gönderi sahibi: ${p.ad || "—"}${p.meslek ? " ("+mc(p.meslek, dil)+")" : ""}. Gönderi metni: "${metin}".${p.gorsel ? " Gönderinin fotoğrafı da ekli — görseli incele." : ""} Bu gönderiyi (yazı${p.gorsel ? "+fotoğraf" : ""}) değerlendir, faydalı öneri/yorum ver, soruları yanıtla, konuşmaya DEVAM et (kesme).`);
    setYardimciAcik(true);
    // FOTOĞRAFLI gönderi → görseli base64'e çevirip asistana ekle (Claude görebilsin)
    if (p.gorsel) {
      try {
        const im = new Image(); im.crossOrigin = "anonymous";
        im.onload = () => {
          try {
            const mx = 1024; let w = im.naturalWidth || 800, h = im.naturalHeight || 800;
            if (w > mx || h > mx) { const r = Math.min(mx / w, mx / h); w = Math.round(w * r); h = Math.round(h * r); }
            const c = document.createElement("canvas"); c.width = w; c.height = h;
            c.getContext("2d").drawImage(im, 0, 0, w, h);
            const dataURL = c.toDataURL("image/jpeg", 0.82);
            setYardimciFoto({ dataURL, base64: dataURL.split(",")[1], mediaType: "image/jpeg" });
          } catch (e) {}
        };
        im.src = p.gorsel;
      } catch (e) {}
    }
  };
  async function cevirToggle(p, key) {
    if (!key || !p.yazi) return;
    const mevcut = ceviri[key];
    if (mevcut && mevcut.metin) { setCeviri((s) => ({ ...s, [key]: { ...mevcut, acik: !mevcut.acik } })); return; }
    if (mevcut && mevcut.yuk) return;
    setCeviri((s) => ({ ...s, [key]: { yuk: true, acik: true } }));
    const dilAd = { tr: "Türkçe", en: "İngilizce", de: "Almanca", fr: "Fransızca", es: "İspanyolca", it: "İtalyanca", ru: "Rusça", ar: "Arapça", uk: "Ukraynaca", fa: "Farsça", zh: "Çince", ja: "Japonca", hi: "Hintçe" }[dil] || "Türkçe";
    try {
      const r = await fetch(AI_KOPRU, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sistem: `Sen bir cevirmensin. Verilen metni ${dilAd} diline DOGAL ve akici cevir. SADECE ceviriyi yaz; aciklama, baslik, tirnak veya ek kelime EKLEME.`, prompt: (p.yazi || "").slice(0, 4000) }),
      });
      const veri = await r.json();
      const metin = (veri && veri.metin) ? veri.metin.trim() : "";
      setCeviri((s) => ({ ...s, [key]: { metin: metin || p.yazi, yuk: false, acik: true } }));
    } catch (e) {
      setCeviri((s) => ({ ...s, [key]: { metin: t("ceviriHata", "Çevrilemedi, tekrar dene"), yuk: false, acik: true } }));
    }
  }
  // Yerel yedek öneriler (AI servisine ulaşılamazsa)
  function yerelAiOneriler() {
    const meslek = meslekAd || (profilBilgi && profilBilgi.pro && profilBilgi.pro.meslek) || t("aiUzman", "uzman");
    const sehir = (profilBilgi && profilBilgi.konum && profilBilgi.konum.sehir) || "";
    const se = sehir ? " · " + sehir : "";
    const tur = paylasTur || "";
    let havuz;
    if (tur === "İş İlanı") havuz = [
      `🌟 Ekibime yetenekli bir ${meslek} arıyorum! Birlikte büyümeye var mısın?${se} 🤝 #fırsat #kariyer`,
      `🚀 Yeni bir yol açılıyor: ${meslek} pozisyonu seni bekliyor! İlgilenen mesaj atsın${se} ✨ #işilanı`,
      `💼 ${meslek} tutkusuyla çalışan bir yol arkadaşı arıyorum — sen olabilir misin?${se} 🔥 #ekiparkadaşı`,
    ];
    else if (tur === "Ürün / Hizmet") havuz = [
      `✨ ${meslek} hizmetimle tanış — kalite, emek ve zarafet bir arada!${se} 💎 #kalite #zarafet`,
      `💛 Senin için tek tek, özenle hazırladım. Detaylar için bir mesaj yeter!${se} 🌟 ${meslek}`,
      `🔥 Yeni hizmetim yayında! ${meslek} ile fark yarat${se} ✦ #yeni #hizmet`,
    ];
    else if (tur === "Tavsiye") havuz = [
      `💡 Günün önerisi: işini yürekten sevenden hizmet al! ${meslek}${se} 🌟 #tavsiye`,
      `✨ Küçük bir dokunuş, kocaman bir fark yaratır 💎 ${meslek}${se} #ipucu`,
      `🙌 Deneyimle gelen samimi bir öneri: ${meslek}${se} 🔥 #tavsiye #kalite`,
    ];
    else if (tur === "Duyuru") havuz = [
      `📣 Önemli duyuru! ${meslek}${se} 🎉 Takipte kalın, güzel şeyler geliyor ✨`,
      `🎊 Sizinle çok güzel bir haber paylaşmak istiyorum${se} 💛 #müjde`,
      `🚀 Yeni bir başlangıç! ${meslek}${se} 🌟 Bu yolculukta yanımda olun #yeni`,
    ];
    else havuz = [
      `✨ ${meslek} tutkusuyla, her detay yürekten işlendi 💎${se} #emek #zarafet`,
      `🌟 Yeni çalışmamı sizinle paylaşıyorum! Umarım beğenirsiniz${se} 💛 ${meslek}`,
      `🔥 Kalite, emek ve zarafet bir arada — ${meslek}${se} ✦ #kalite`,
      `💛 İşimi çok seviyorum, bu da o sevginin sonucu!${se} ✨ #tutku`,
    ];
    // karıştır, 3 tane al
    return havuz.sort(() => Math.random() - 0.5).slice(0, 3);
  }
  async function paylasGonder(turOverride) {
    const uu = auth.currentUser;
    setTurSecAcik(false);
    // İÇERİK YOKSA sessizce çıkma → NET uyarı ver (kullanıcı: "bastım paylaşmıyor"). Başlık da içerik sayılır.
    if (!uu) { setPaylasHataDetay("oturum yok — çıkış yapıp tekrar gir"); setPaylasDurum("hata"); return; }
    if (!paylasYazi.trim() && !paylasBaslik.trim() && !paylasGorsel && !paylasVideoFile && !paylasVideo && !paylasDosya) { setPaylasDurum("bosicerik"); return; }
    setPaylasDurum("gonderiliyor"); setPaylasHataDetay("");
    // VİDEO: YENİ dosya varsa Storage'a yükle; YOKSA mevcut video URL'i (düzenlemede) KORU.
    let videoURL = "";
    if (paylasVideoFile) {
      try {
        setPaylasDurum("video"); setPaylasYukleme(0);
        videoURL = await videoYukle(paylasVideoFile, uu.uid, (y) => setPaylasYukleme(y));
        setPaylasDurum("gonderiliyor");
      } catch (e) { setPaylasHataDetay((e && (e.code || e.message)) || "bilinmiyor"); setPaylasDurum("videohata"); return; }
    } else if (paylasVideo && /^https?:/.test(paylasVideo)) {
      videoURL = paylasVideo; // mevcut (yüklü) video — düzenlemede korunur
    }
    // DOSYA (belge) varsa yükle → {url, ad, boyut}
    let dosyaObj = null;
    if (paylasDosya && paylasDosya.file) {
      try {
        setPaylasDurum("dosya"); setPaylasYukleme(0);
        dosyaObj = await dosyaYukle(paylasDosya.file, uu.uid, (y) => setPaylasYukleme(y));
        setPaylasDurum("gonderiliyor");
      } catch (e) { setPaylasDurum("dosyahata"); return; }
    }
    const benimAd = (profilBilgi && [profilBilgi.isim, profilBilgi.soyisim].filter(Boolean).join(" ")) || adTam || "";
    // GLOXORG FİLİGRANI: foto'ya KALICI göm (istemci tarafı, ücretsiz). VİDEO filigranı KALDIRILDI:
    // Cloudinary video overlay'i videoyu YENİDEN İŞLİYOR (türev dosya) → kredi/depolama yakıyordu (kota aşımı).
    // Artık video ORİJİNAL URL ile saklanır (dönüşüm yok) → Cloudinary kredisi korunur.
    const gorselSon = (duzenlenen && duzenlenen.id) ? (paylasGorsel || "") : (paylasGorsel ? (filigranEkle ? await fotoFiligranla(paylasGorsel) : paylasGorsel) : "");
    const videoSon = videoSade(videoURL || "");
    // ÇOK FOTOĞRAF: ek fotoğrafları Storage'a yükle (Firestore 1MB'a sığmaz). MEVCUT (http) URL'ler yeniden yüklenmez.
    let ekFotoUrller = [];
    if (paylasEkFotolar.length > 0) {
      try {
        setPaylasDurum("dosya"); setPaylasYukleme(0);
        for (let i = 0; i < paylasEkFotolar.length; i++) {
          const ef = paylasEkFotolar[i];
          if (/^https?:/.test(ef)) { ekFotoUrller.push(ef); } // zaten yüklü (düzenlemede)
          else { const wm = filigranEkle ? await fotoFiligranla(ef) : ef; const url = await gorselYukle(wm, uu.uid, () => {}); if (url) ekFotoUrller.push(url); }
          setPaylasYukleme(Math.round(((i + 1) / paylasEkFotolar.length) * 100));
        }
        setPaylasDurum("gonderiliyor");
      } catch (e) { /* ek foto yüklenemezse ana gönderi yine gitsin */ }
    }
    // MEDYALAR dizisi. VİDEO ilk seçildiyse BAŞA (kullanıcı: "video ilk seçmişsem ilk planda olsun"), değilse fotoğraflardan sonra.
    const fotoOgeleri = [];
    if (gorselSon) fotoOgeleri.push({ tip: "foto", data: gorselSon });
    ekFotoUrller.forEach((u2) => fotoOgeleri.push({ tip: "foto", url: u2 }));
    const videoOgesi = videoSon ? { tip: "video", url: videoSon, poster: ((paylasVideoPoster && paylasVideoPoster.length < 500000) ? paylasVideoPoster : "") } : null;
    const medyalar = [];
    if (videoOgesi && videoBasta) { medyalar.push(videoOgesi); medyalar.push(...fotoOgeleri); }
    else { medyalar.push(...fotoOgeleri); if (videoOgesi) medyalar.push(videoOgesi); }
    const yeni = {
      uid: uu.uid, ad: benimAd, meslek: meslekAd || "", tur: (typeof turOverride === "string" ? turOverride : (paylasTur || "")), pro: proUye, uyelik: uyelik || "",
      // CANLI konum varsa şehir/ülke ONDAN (nerede paylaşıldıysa), yoksa profil konumundan
      sehir: (paylasKonum && paylasKonum.sehir) || (profilBilgi && profilBilgi.konum && profilBilgi.konum.sehir) || "",
      ulke: (paylasKonum && paylasKonum.ulke) || (profilBilgi && profilBilgi.konum && profilBilgi.konum.ulke) || "",
      konum: paylasKonum ? { yer: paylasKonum.yer || "", sehir: paylasKonum.sehir || "", ulke: paylasKonum.ulke || "", tam: paylasKonum.tam || "", enlem: paylasKonum.enlem, boylam: paylasKonum.boylam } : null,
      foto: (paylasAvatar === "amblem" && isFoto) ? isFoto : (foto || isFoto || ""), amblem: !!(paylasAvatar === "amblem" && isFoto),
      baslik: paylasBaslik.trim().slice(0, 200), gorsel: gorselSon, video: videoSon || "", videoPoster: ((videoSon && paylasVideoPoster && paylasVideoPoster.length < 500000) ? paylasVideoPoster : ""), medyalar: (medyalar.length > 1 ? medyalar : null), dosya: dosyaObj || null, yazi: paylasYazi.trim().slice(0, 20000), zamanMs: Date.now(),
      ustYazi: (ustYazi.trim() && (paylasGorsel || videoURL)) ? { metin: ustYazi.trim().slice(0, 120), renk: ustRenk, boyut: ustBoyut, yer: ustYer } : null,
      duzen: paylasDuzen || null, yaziUstunde: !!yaziMedyaUstunde, gitLinki: !!gitLinki,
      zemin: (!paylasGorsel && !videoURL) ? (paylasZemin || "") : "", yaziRenk: (!paylasGorsel && !videoURL) ? (paylasYaziRenk || "") : "",
      // ANKET — en az 2 dolu şık varsa gönderiye eklenir (şıklar; oylar ayrı koleksiyonda tutulur)
      anket: (anketAcik && anketSecenekler.filter((s) => s.trim()).length >= 2) ? { secenekler: anketSecenekler.map((s) => s.trim()).filter(Boolean).slice(0, 4) } : null,
    };
    if (duzenlenen && duzenlenen.id) {
      // DÜZENLEME → mevcut gönderiyi güncelle. Kullanıcı: düzenleyip tekrar paylaşınca AKIŞTA EN ÜSTE gelsin + TARİH yenilensin.
      const yeniZaman = Date.now();
      // DÜZENLEMEDE MEDYA da kaydedilir (silinen/eklenen foto/video kalıcı olsun — kullanıcı: "düzenlerken silip kaydedeyim").
      const degisiklik = { baslik: yeni.baslik, yazi: yeni.yazi, tur: yeni.tur, gorsel: yeni.gorsel, video: yeni.video, videoPoster: yeni.videoPoster, medyalar: yeni.medyalar, ustYazi: yeni.ustYazi, duzen: yeni.duzen, yaziUstunde: yeni.yaziUstunde, gitLinki: yeni.gitLinki, zemin: yeni.zemin, yaziRenk: yeni.yaziRenk, konum: yeni.konum || null, anket: yeni.anket || null, zamanMs: yeniZaman, zaman: "" };
      gonderiGuncelle(duzenlenen.id, degisiklik).then((ok) => {
        if (ok) {
          // EN ÜSTE taşı: eski konumundan çıkar, güncel haliyle başa ekle (hem akış hem profil).
          const bumpla = (a) => { const eski = a.find((g) => g.id === duzenlenen.id) || {}; const kalan = a.filter((g) => g.id !== duzenlenen.id); return [{ ...eski, ...degisiklik }, ...kalan]; };
          setGercekAkis(bumpla); setGonderilerim(bumpla);
          setPaylasYazi(""); setPaylasBaslik(""); setPaylasTur(""); setPaylasGorsel(""); setPaylasEkFotolar([]); setPaylasVideo(""); setPaylasVideoFile(null); setPaylasVideoPoster(""); setVideoBasta(false); setPaylasDosya(null); setPaylasYukleme(0); setPaylasKonum(null); setKonumDurum(""); setDuzenlenen(null); setAnketAcik(false); setAnketSecenekler(["", ""]); setPaylasDurum("ok");
          setTimeout(() => { setPaylasAcik(false); setPaylasDurum(""); }, 800);
        } else setPaylasDurum("hata");
      }).catch(() => setPaylasDurum("hata"));
      return;
    }
    gonderiEkle(yeni).then((id) => {
      if (id) { const yk = { id, begeni: 0, ...yeni }; setGercekAkis((a) => [yk, ...a]); setGonderilerim((a) => [yk, ...a]); setPaylasYazi(""); setPaylasBaslik(""); setPaylasTur(""); setPaylasGorsel(""); setPaylasEkFotolar([]); setPaylasVideo(""); setPaylasVideoFile(null); setPaylasVideoPoster(""); setVideoBasta(false); setPaylasDosya(null); setPaylasYukleme(0); setPaylasKonum(null); setKonumDurum(""); setAnketAcik(false); setAnketSecenekler(["", ""]); setPaylasDurum("ok"); setTimeout(() => { setPaylasAcik(false); setPaylasDurum(""); }, 800); }
      else { setPaylasHataDetay("bilinmiyor"); setPaylasDurum("hata"); }
    }).catch((e) => { setPaylasHataDetay((e && (e.code || e.message)) || "bilinmiyor"); setPaylasDurum("hata"); });
  }
  // CANLI KONUM aç/kapa — açınca telefonun GPS'inden yerini alır, yer adına çevirir (hastane/havalimanı/otogar/şehir).
  // Kullanıcı: "konum kullan dersem fotoğraf/video/yazı nereden paylaşıldı üstte görünsün; Gloxoo o yere göre başlık yazsın."
  const konumAl = () => {
    if (paylasKonum) { setPaylasKonum(null); setKonumDurum(""); return; } // ikinci basış → kapat
    if (typeof navigator === "undefined" || !navigator.geolocation) { setKonumDurum("hata"); return; }
    setKonumDurum("aliniyor");
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const enlem = pos.coords.latitude, boylam = pos.coords.longitude;
        let yer = "", sehir = "", ulke = "";
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${enlem}&lon=${boylam}&accept-language=${dil}&zoom=18`, { headers: { Accept: "application/json" } });
          if (r.ok) {
            const d = await r.json(); const a = d.address || {};
            // EN belirgin yer adı (hastane, havalimanı, otogar, AVM, otel, cami, park, mahalle...) → yoksa cadde/semt
            yer = d.name || a.amenity || a.aeroway || a.building || a.tourism || a.leisure || a.shop || a.office || a.hospital || a.road || a.neighbourhood || a.suburb || "";
            sehir = a.city || a.town || a.village || a.municipality || a.county || a.state || "";
            ulke = a.country || "";
          }
        } catch (x) {}
        const tam = [yer, sehir, ulke].filter(Boolean).join(", ") || (t("konumBulundu", "Konum bulundu"));
        setPaylasKonum({ enlem, boylam, yer, sehir, ulke, tam });
        setKonumDurum("");
      } catch (e) { setKonumDurum("hata"); }
    }, () => setKonumDurum("hata"), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  };
  // Paylaş fotoğraf seç → küçült → ekle. ÇOK FOTOĞRAF: ilki ANA fotoğraf, kalanı EK fotoğraflar (tek gönderide birden çok).
  function paylasFotoSec(e) {
    const dosyalar = Array.from((e.target.files || []));
    if (!dosyalar.length) return;
    setMedyaMenu("");
    const kucultVadesi = (f) => new Promise((resolve) => {
      const r = new FileReader();
      r.onload = (ev) => { const img = new Image(); img.onload = () => resolve(imgKucult(img, 1000)); img.onerror = () => resolve(""); img.src = ev.target.result; };
      r.onerror = () => resolve(""); r.readAsDataURL(f);
    });
    Promise.all(dosyalar.slice(0, 10).map(kucultVadesi)).then((hepsi) => {
      const gecerli = hepsi.filter(Boolean);
      if (!gecerli.length) return;
      setFiligranEkle(true); setGitLinki(false); setPaylasDosya(null); // VİDEO KORUNUR — foto + video AYNI gönderide olabilir
      if (!paylasGorsel && !paylasVideo) setVideoBasta(false); // foto İLK seçildi → foto başta
      if (!paylasGorsel) { setPaylasGorsel(gecerli[0]); setPaylasEkFotolar((a) => [...a, ...gecerli.slice(1)].slice(0, 9)); }
      else { setPaylasEkFotolar((a) => [...a, ...gecerli].slice(0, 9)); }
    });
    e.target.value = "";
  }
  // Paylaş VİDEO seç (albümden/Google'dan) — Firebase Storage'a yüklenir (Paylaş'a basınca).
  // Burada SADECE dosyayı tutar + yerel önizleme gösterir (yükleme gönderide olur). Sınır ~80MB.
  function paylasVideoSec(e) {
    const f = e.target.files && e.target.files[0]; if (!f) { return; }
    if (f.size > 200 * 1024 * 1024) { setPaylasDurum("buyuk"); e.target.value = ""; return; }
    setMedyaMenu("");
    setPaylasVideoFile(f);
    const yerel = URL.createObjectURL(f);
    setPaylasVideo(yerel); // yerel önizleme (yüklemeden de görünür)
    setPaylasVideoPoster("");
    videoKareYakala(yerel).then((k) => { if (k) setPaylasVideoPoster(k); }).catch(() => {}); // ilk kareyi KAPAK yap
    if (!paylasGorsel && paylasEkFotolar.length === 0) setVideoBasta(true); // video İLK seçildi → başa gelsin
    setPaylasDosya(null); setPaylasDurum(""); setPaylasYukleme(0); // FOTOĞRAFLAR KORUNUR — foto + video aynı gönderide
    e.target.value = "";
  }
  // DOSYA (belge) seç — resimse foto, videoysa video olarak yönlendir; değilse belge olarak ekle
  function paylasDosyaSec(e) {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const t2 = (f.type || "");
    if (t2.indexOf("image/") === 0) { paylasFotoSec(e); return; }
    if (t2.indexOf("video/") === 0) { paylasVideoSec(e); return; }
    if (f.size > 200 * 1024 * 1024) { setPaylasDurum("buyuk"); e.target.value = ""; return; }
    setPaylasDosya({ file: f, ad: f.name || "dosya", boyut: f.size || 0 });
    setPaylasGorsel(""); setPaylasEkFotolar([]); setPaylasVideo(""); setPaylasVideoFile(null); setPaylasVideoPoster(""); setPaylasDurum("");
    e.target.value = "";
  }
  // VİDEO'dan tek KARE yakala (AI'nin videoyu "görmesi" için) → dataURL (jpeg) veya null
  function videoKareYakala(url) {
    return new Promise((resolve) => {
      try {
        const v = document.createElement("video");
        v.muted = true; v.playsInline = true; v.crossOrigin = "anonymous"; v.preload = "auto";
        let bitti = false;
        const cek = () => {
          if (bitti) return; bitti = true;
          try {
            const c = document.createElement("canvas");
            // 480px yeter (hem AI görme hem video KAPAK) → küçük dosya, Firestore dokümanını şişirmez.
            const w = Math.min(480, v.videoWidth || 480), h = Math.round((v.videoHeight || 480) * w / (v.videoWidth || 480));
            c.width = w; c.height = h; c.getContext("2d").drawImage(v, 0, 0, w, h);
            resolve(c.toDataURL("image/jpeg", 0.72));
          } catch (e) { resolve(null); }
        };
        v.onloadeddata = () => { try { v.currentTime = Math.min(0.3, (v.duration || 1) / 3); } catch (e) { cek(); } };
        v.onseeked = cek;
        v.onerror = () => { if (!bitti) { bitti = true; resolve(null); } };
        setTimeout(() => { if (!bitti) { bitti = true; resolve(null); } }, 4000);
        v.src = url;
      } catch (e) { resolve(null); }
    });
  }
  // ad = KAYITLI değer (DEĞİŞMEZ — eski gönderiler bununla eşleşir); cev = ekranda gösterilen çeviri anahtarı
  const PAYLAS_TURLER = [
    { ad: "Fotoğraf", cev: "turFoto", tip: "foto", renk: "#2ecc71", foto: true },
    { ad: "Video", cev: "turVideo", tip: "video", renk: "#e74c3c", video: true },
    { ad: "Dosya", cev: "turDosya", tip: "dosya", renk: "#7fb0ff", dosya: true },
    { ad: "İş İlanı", cev: "turIsIlani", tip: "is", renk: "#9b59b6" },
    { ad: "Ürün / Hizmet", cev: "turUrun", tip: "urun", renk: "#1fc2c2" },
    { ad: "Tavsiye", cev: "turTavsiye", tip: "tavsiye", renk: "#f2a900" },
    { ad: "Etkinlik", cev: "turEtkinlik", tip: "etkinlik", renk: "#5aa6e0" },
    { ad: "Duyuru", cev: "turDuyuru", tip: "duyuru", renk: "#ff7ab0" },
    { ad: "Soru / Yardım", cev: "turSoru", tip: "soru", renk: "#7e57c2" },
  ];
  // Kayıtlı tür adını (Türkçe) o anki dile çevirerek göster (kayıt verisi bozulmaz)
  const turGoster = (ad) => { const x = PAYLAS_TURLER.find((s) => s.ad === ad); return x ? t(x.cev, x.ad) : ad; };
  // Göreceli zaman ("şimdi" / "5 dk" / "2 sa" / "3 gün")
  const zamanOnce = (ms) => {
    if (!ms) return "";
    const dk = Math.floor((Date.now() - ms) / 60000);
    if (dk < 1) return t("zamanSimdi", "şimdi");
    if (dk < 60) return dk + " " + t("zamanDk", "dk");
    const s = Math.floor(dk / 60); if (s < 24) return s + " " + t("zamanSa", "sa");
    return Math.floor(s / 24) + " " + t("zamanGun", "gün");
  };
  useEffect(() => {
    if (!u) { setProfilBilgi(null); return; }
    profilOku(u.uid).then((p) => { if (p) setProfilBilgi(p); });
  }, [u]);

  const saglayiciAd = (() => {
    const id = (u && u.providerData && u.providerData[0] && u.providerData[0].providerId) || "";
    if (id.indexOf("google") !== -1) return "Google";
    if (id.indexOf("microsoft") !== -1) return "Microsoft";
    if (id.indexOf("facebook") !== -1) return "Facebook";
    if (id.indexOf("apple") !== -1) return "Apple";
    return t("profEposta");
  })();
  const hesapTip = profilBilgi ? (profilBilgi.tip === "profesyonel" ? t("profProfesyonel") : t("profMusteri")) : "—";
  const uyelikTarih = (profilBilgi && profilBilgi.olusturma) ? new Date(profilBilgi.olusturma).toLocaleDateString(dil || "tr") : "";

  function epKopyala() {
    try { navigator.clipboard.writeText((u && u.email) || ""); setKopyalandi(true); setTimeout(() => setKopyalandi(false), 1500); } catch (e) {}
  }

  // Ad düzenleme — gerçekten kaydeder (Firebase profili + Firestore)
  const [adDuzenle, setAdDuzenle] = useState(false);
  const [yeniAd, setYeniAd] = useState("");
  async function adKaydet() {
    const ad = (yeniAd || "").trim();
    if (!ad) { setAdDuzenle(false); return; }
    try { if (auth.currentUser) await updateProfile(auth.currentUser, { displayName: ad }); } catch (e) {}
    try { if (u) await profilKaydet(u.uid, { isim: ad }); } catch (e) {}
    setProfilBilgi((p) => (p ? { ...p, isim: ad } : p));
    setAdDuzenle(false);
  }

  function googleAc(url) { try { window.open(url, "_blank", "noopener"); } catch (e) {} setProfilAcik(false); }
  // FOTOĞRAF YÜKLE — Profilim penceresinde: seç → kare kırp + küçült (256px) → Firestore'a kaydet.
  // Google fotosu DEĞİL, kullanıcının kendi fotosu. (Storage gerekmez; küçük foto Firestore'a sığar.)
  function fotoSec(e) { fotoOku(e, "avatar"); }
  function isFotoSec(e) { fotoOku(e, "is"); }
  function galeriSec(e) { fotoOku(e, "galeri"); }
  function fotoSifirla() { setKatmanlar([]); setSecili(-1); }
  function fotoOku(e, hedef) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    // TÜR ön-kontrolü YOK: Drive/bulut dosyalarının tür bilgisi boş/farklı gelebiliyordu.
    const r = new FileReader();
    r.onerror = () => alert("Fotoğraf okunamadı, başka bir dosya dene.");
    r.onload = () => {
      const img = new Image();
      img.onload = () => { if (hedef) setDuzenHedef(hedef); setKatmanlar([yeniFoto(img, true)]); setSecili(0); setEditorFotoVar(true); setDuzenAcik(true); };
      img.onerror = () => alert("Bu fotoğraf açılamadı (bozuk olabilir), başka bir dosya dene.");
      img.src = r.result;
    };
    try { r.readAsDataURL(f); } catch (er) { alert("Fotoğraf yüklenemedi, tekrar dene."); }
  }
  // FOTOĞRAFSIZ AMBLEM — düz zemin + ilk yazı satırı (sonra + ile foto/yazı eklenir). İş amblemi için.
  function amblemBaslat() {
    setDuzenHedef("is"); setEditorFotoVar(false); setZeminRenk("#16223e");
    setKatmanlar([yeniYazi(t("profAmblemYazi", "GLAM"), 0)]); setSecili(0); setDuzenAcik(true);
  }
  // MEVCUT amblemi DÜZENLE — saklı katmanlarla (kaldığın yerden); yoksa düz amblem fotosu, o da yoksa yeni başla
  function mevcutAmblemDuzenle() {
    const md = profilBilgi && profilBilgi.isDuzen;
    if ((md && Array.isArray(md.kat) && md.kat.length) || isFoto) { duzenAc("is", md, isFoto); }
    else { amblemBaslat(); }
  }
  // Düzenleyici AÇIKKEN fotoğraf EKLE (yeni katman; öncekiler kalır) — birden fazla foto dizilebilsin
  function editorFotoEkle(e) {
    const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return;
    const r = new FileReader();
    r.onerror = () => alert("Fotoğraf okunamadı, başka bir dosya dene.");
    r.onload = () => {
      const img = new Image();
      img.onload = () => katmanFotoEkle(img);
      img.onerror = () => alert("Bu fotoğraf açılamadı (HEIC/bozuk olabilir) — JPEG veya PNG dene.");
      img.src = r.result;
    };
    try { r.readAsDataURL(f); } catch (er) { alert("Fotoğraf yüklenemedi, tekrar dene."); }
  }

  async function cikisYap() { try { await signOut(auth); } catch (e) {} navigate("/", { replace: true }); }

  // --- Canlı dünya şeridi: saat artık <SeritSaat> içinde kendi tikiyle döner (ana sayfayı re-render ETMEZ → parlama yok), kur internetten ---
  const [kur, setKur] = useState(null);
  const [borsa, setBorsa] = useState(null);
  // KONUM = GERÇEK bulunduğun yer (dilden DEĞİL). Öncelik: cihaz saat dilimi → (IP ile kesinleşir) → dil yedeği.
  const cihazTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Berlin"; } catch (e) { return "Europe/Berlin"; } })();
  const cihazKod = TZ_ULKE[cihazTz] || (() => { try { return (new Intl.Locale(navigator.language).region || "").toUpperCase(); } catch (e) { return ""; } })() || "US";
  const [konum, setKonum] = useState({ kod: cihazKod, tz: cihazTz, para: BOLGE_PARA[cihazKod] || "USD" });
  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const r = await fetch("https://ipapi.co/json/");
        const d = await r.json();
        if (!iptal && d && d.country_code) {
          const k = d.country_code.toUpperCase();
          // IP'den YAKLAŞIK koordinat da al → GPS izni verilmese bile yakın çevre (Overpass) çalışır; GPS gelince üzerine yazar (kesinleşir)
          const ipLat = (typeof d.latitude === "number") ? d.latitude : null;
          const ipLon = (typeof d.longitude === "number") ? d.longitude : null;
          setKonum((kk) => ({ ...kk, kod: k, tz: d.timezone || cihazTz, para: d.currency || BOLGE_PARA[k] || "USD", sehir: d.city || "", bolge: d.region || "", lat: kk.lat != null ? kk.lat : ipLat, lon: kk.lon != null ? kk.lon : ipLon }));
        }
      } catch (e) {}
    })();
    return () => { iptal = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // GERÇEK KONUM (GPS) — IP tahmini (Münih vb.) yanlış olabiliyor; navigator + Photon ile şehir/ilçe doğru bulunur
  useEffect(() => {
    if (!navigator.geolocation) return;
    let iptal = false;
    // AÇILIŞTA KONUM İZNİ SORMA (kullanıcı KESİN istedi): konum OTOMATİK gelir ama PENCERE ÇIKMAZ.
    // Sadece izin DAHA ÖNCE verilmişse GPS ile sessizce kesinleştir; verilmemişse hiç isteme (IP konumu zaten var). GPS gerekince kullanıcı paylaşımdaki "📍 Konum ekle"ye basar.
    const gpsAl = () => { if (iptal) return; navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude, lon = pos.coords.longitude;
      setKonum((k) => ({ ...k, lat, lon })); // koordinat hemen (etraf taraması bununla başlar)
      // 1) NOMINATIM (zengin, doğru adres) — şehir/ülkeyi GPS'ten KESİNLEŞTİR (IP'nin yanlış şehir/ülkesini EZER; "Kyiv/Ukrayna" hatası buradandı)
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14&accept-language=en`, { headers: { Accept: "application/json" } });
        const d = await r.json();
        const a = d && d.address;
        if (a && a.country_code) {
          setKonum((k) => ({
            ...k,
            kod: (a.country_code || "").toUpperCase(),
            sehir: latinYap(a.city || a.town || a.village || a.municipality || a.county || a.state || ""),
            ilce: latinYap(a.city_district || a.suburb || a.borough || a.district || a.county || ""),
            mahalle: latinYap(a.neighbourhood || a.quarter || a.suburb || a.hamlet || ""),
          }));
          return;
        }
      } catch (e) {}
      // 2) YEDEK: Photon
      try {
        const r = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`);
        const d = await r.json();
        const p = d && d.features && d.features[0] && d.features[0].properties;
        if (p) setKonum((k) => ({
          ...k,
          kod: (p.countrycode || k.kod || "").toUpperCase(),
          sehir: p.city || p.county || p.state || "",
          ilce: p.district || p.suburb || p.locality || p.borough || "",
          mahalle: p.name && p.name !== p.city ? p.name : "",
        }));
      } catch (e) {}
    }, () => {}, { enableHighAccuracy: true, timeout: 9000, maximumAge: 300000 }); };
    // İzin durumunu SESSİZCE sor (bu pencere AÇMAZ); sadece "granted" ise GPS al. "prompt"/"denied" ise açılışta hiç isteme.
    try {
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: "geolocation" }).then((st) => { if (!iptal && st.state === "granted") gpsAl(); }).catch(() => {});
      }
    } catch (e) {}
    return () => { iptal = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // YAKIN ÇEVRE — GPS koordinatından OpenStreetMap (Overpass) ile etraftaki market/postane/eczane/su/göl/deniz/nehir vb. (AI çevreyi bilsin)
  const [etraf, setEtraf] = useState("");
  useEffect(() => {
    const lat = konum.lat, lon = konum.lon;
    if (lat == null || lon == null) return;
    let iptal = false;
    const ETIKET = {
      "shop=supermarket": "süpermarket", "shop=convenience": "market", "shop=mall": "AVM", "shop=bakery": "fırın", "shop=greengrocer": "manav", "shop=butcher": "kasap",
      "amenity=marketplace": "pazar", "amenity=post_office": "postane", "amenity=pharmacy": "eczane", "amenity=bank": "banka", "amenity=hospital": "hastane", "amenity=clinic": "klinik", "amenity=cafe": "kafe", "amenity=restaurant": "restoran", "amenity=fuel": "benzin istasyonu", "amenity=school": "okul", "amenity=place_of_worship": "ibadethane", "amenity=police": "polis", "amenity=fire_station": "itfaiye",
      "natural=water": "su/göl", "natural=beach": "plaj", "natural=coastline": "deniz kıyısı", "natural=peak": "tepe/dağ",
      "natural=wood": "orman", "landuse=forest": "orman", "natural=scrub": "çalılık", "natural=grassland": "çayır", "landuse=meadow": "çayır", "landuse=farmland": "tarla", "natural=cliff": "uçurum/kayalık", "natural=wetland": "sulak alan", "natural=bay": "koy", "natural=sand": "kumluk", "landuse=vineyard": "bağ", "landuse=orchard": "meyve bahçesi",
      "waterway=river": "nehir", "waterway=stream": "dere", "waterway=canal": "kanal",
      "leisure=park": "park", "leisure=garden": "bahçe", "leisure=nature_reserve": "doğa koruma alanı",
    };
    (async () => {
      try {
        // Market/dükkanlar 1500m (daha çok market yakalanır), su/doğa 3000m. node+way (bazı marketler bina=way).
        const q = `[out:json][timeout:25];(nwr(around:1500,${lat},${lon})[shop~"^(supermarket|convenience|mall|bakery|greengrocer|butcher|kiosk|department_store)$"];nwr(around:1500,${lat},${lon})[amenity~"^(marketplace|post_office|pharmacy|bank|atm|hospital|clinic|doctors|cafe|restaurant|fast_food|fuel|school|kindergarten|place_of_worship|police|fire_station)$"];nwr(around:1500,${lat},${lon})[leisure~"^(park|playground|sports_centre|garden|nature_reserve)$"];way(around:2500,${lat},${lon})[natural~"^(water|beach|coastline|peak|wood|scrub|grassland|cliff|wetland|bay|sand)$"];way(around:2500,${lat},${lon})[landuse~"^(forest|meadow|farmland|vineyard|orchard)$"];way(around:3000,${lat},${lon})[waterway~"^(river|stream|canal)$"];);out center 200;`;
        // Overpass ana sunucu yoğunsa diye yedek aynalar
        const sunucular = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
        let d = null;
        for (const sv of sunucular) {
          try {
            const r = await fetch(sv, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) });
            if (!r.ok) continue;
            d = await r.json();
            if (d && Array.isArray(d.elements)) break;
          } catch (e2) {}
          if (iptal) return;
        }
        if (!d) return;
        // Her yer için KUŞ UÇUŞU mesafe (haversine) + koordinat → en yakından sırala (AI tam mesafe + harita linki verebilsin)
        const R = 6371000, rad = (x) => (x * Math.PI) / 180;
        const liste = [];
        (d.elements || []).forEach((el) => {
          const tg = el.tags || {}; let ad = null;
          // İbadethaneyi DİNE göre ayır: cami (müslüman), kilise (hristiyan), sinagog (yahudi)
          if (tg.amenity === "place_of_worship") {
            ad = tg.religion === "muslim" ? "cami" : tg.religion === "christian" ? "kilise" : tg.religion === "jewish" ? "sinagog" : "ibadethane";
          } else {
            for (const anahtar in ETIKET) { const [k, v] = anahtar.split("="); if (tg[k] === v) { ad = ETIKET[anahtar]; break; } }
          }
          if (!ad) return;
          const plat = el.lat != null ? el.lat : (el.center && el.center.lat);
          const plon = el.lon != null ? el.lon : (el.center && el.center.lon);
          if (plat == null || plon == null) return;
          const dLat = rad(plat - lat), dLon = rad(plon - lon);
          const aa = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(rad(lat)) * Math.cos(rad(plat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const m = Math.round(R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa)));
          liste.push({ ad, isim: tg.name || "", lat: plat, lon: plon, m });
        });
        liste.sort((a, b) => a.m - b.m);
        // TEKRAR AYIKLA: aynı yer hem node hem bina(way) olarak gelebilir → ad+isim+~konum aynıysa en yakını kalsın
        const gorulen = new Set(), benzersiz = [];
        for (const p of liste) {
          const anahtar = p.ad + "|" + (p.isim || "") + "|" + p.lat.toFixed(3) + "," + p.lon.toFixed(3);
          if (gorulen.has(anahtar)) continue;
          gorulen.add(anahtar); benzersiz.push(p);
        }
        // KATEGORİ ÇEŞİTLİLİĞİ: tek tür (örn kafe) listeyi doldurup market/postaneyi dışarı itmesin → her türden en yakın 4'er, toplam 32
        const turSay = {}, secili = [];
        for (const p of benzersiz) {
          turSay[p.ad] = (turSay[p.ad] || 0) + 1;
          if (turSay[p.ad] > 4) continue;
          secili.push(p);
          if (secili.length >= 32) break;
        }
        secili.sort((a, b) => a.m - b.m);
        const mes = (m) => (m < 1000 ? m + " m" : (m / 1000).toFixed(1) + " km");
        const ozet = secili.map((p) => `${p.ad}${p.isim ? " " + p.isim : ""} ~${mes(p.m)} [${p.lat.toFixed(5)},${p.lon.toFixed(5)}]`).join("; ");
        if (!iptal) setEtraf(ozet ? ozet + "." : "");
      } catch (e) {}
    })();
    return () => { iptal = true; };
  }, [konum.lat, konum.lon]);
  const myKod = konum.kod;
  const myTz = konum.tz;
  const myPara = konum.para;
  const myParaSym = paraSembol(myPara);
  const myAd = ulkeAdiCevir(myKod, dil, myKod);
  // Tam konum metni: İlçe, Şehir, Ülke (GPS varsa ilçe/şehir gerçek; yoksa IP) — AI + günlük damgada
  const myTamKonum = [konum.mahalle, konum.ilce, konum.sehir, myAd].filter(Boolean).join(", ");

  // BORSA ENDEKSİ — bulunduğun ülkenin canlı endeksi (Yahoo Finance, CORS köprüsü allorigins). 90 sn'de bir tazelenir.
  useEffect(() => {
    let iptal = false;
    const bi = BORSA_INDEKS[myKod] || { sym: "^GSPC", ad: "S&P 500" };
    const cek = async () => {
      const yurl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(bi.sym)}?interval=1d&range=2d`;
      // 3 YEDEK CORS köprüsü — biri çalışmazsa diğerini dener (borsa daha sık görünsün)
      const proksiler = [
        "https://api.allorigins.win/raw?url=" + encodeURIComponent(yurl),
        "https://corsproxy.io/?url=" + encodeURIComponent(yurl),
        "https://api.codetabs.com/v1/proxy/?quest=" + encodeURIComponent(yurl),
      ];
      for (const px of proksiler) {
        if (iptal) return;
        try {
          const r = await fetch(px);
          if (!r.ok) continue;
          const d = await r.json();
          const m = d && d.chart && d.chart.result && d.chart.result[0] && d.chart.result[0].meta;
          if (m && m.regularMarketPrice) {
            const fiyat = m.regularMarketPrice;
            const onceki = m.chartPreviousClose || m.previousClose || fiyat;
            const yuzdeN = onceki ? ((fiyat - onceki) / onceki) * 100 : 0;
            if (!iptal) setBorsa({
              ad: bi.ad,
              deger: fiyat.toLocaleString(dil || "tr", { maximumFractionDigits: 0 }),
              yuzde: (yuzdeN >= 0 ? "+" : "−") + Math.abs(yuzdeN).toFixed(2) + "%",
              yon: yuzdeN >= 0 ? "art" : "eks",
            });
            return; // başarılı kaynağı bulduk, dur
          }
        } catch (e) {}
      }
    };
    cek();
    const z = setInterval(cek, 90000);
    return () => { iptal = true; clearInterval(z); };
  }, [myKod, dil]);

  // ⚡ PARLAMA DÜZELTİLDİ (eski saniyelik tam-sayfa repaint KALDIRILDI): saat artık <SeritSaat> içinde
  // kendi tikiyle döner; ana sayfa saniyede bir YENİDEN ÇİZİLMEZ. (Eskiden AI panelinin "parça parça
  // silinmesini" önlemek için tam-sayfa repaint bırakılmıştı — asıl parlama sebebi oydu. Panel silinmesi
  // artık CSS GPU katmanıyla çözülüyor: .grox-panel/.maskot vb. transform:translateZ(0)+isolation.)
  // SAYFA DEĞİŞİNCE şeritteki ses (canlı sohbet / dikte) AÇIKSA kendiliğinden KAPANSIN — kullanıcı ses düğmesine basmadan başka sayfa açınca ses durur (istek)
  useEffect(() => {
    if (canliSohbetRef.current) { try { canliSohbetToggle(); } catch (e) {} }
    if (dikteAcikRef.current) { try { dikteDurdur(); } catch (e) {} }
  }, [aktifKod]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const r = await fetch("https://open.er-api.com/v6/latest/USD");
        const d = await r.json();
        let btcUsd = 0;
        try { const rb = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"); const db = await rb.json(); btcUsd = (db && db.bitcoin && db.bitcoin.usd) || 0; } catch (e) {}
        if (!iptal && d && d.rates) setKur({ rates: d.rates, btcUsd });
      } catch (e) {}
    })();
    return () => { iptal = true; };
  }, []);

  // Şerit: YUMUŞAK otomatik kayar (titremeden). Dokununca DURUR, parmakla kaydırılır,
  // parmak kalkınca 3.5 sn sonra OTOMATİK devam eder. Dikişsiz döngü (2 kopya).
  const seritRef = useRef(null);
  useEffect(() => {
    const el = seritRef.current;
    if (!el) return;
    const ic = el.querySelector(".ana-serit-akis"); // içteki akan şerit
    if (!ic) return;
    const grup = ic.querySelector(".serit-grup"); // TEK grubun genişliği = kusursuz döngü periyodu
    // GÜVENİLİR AKIŞ: scrollLeft yerine CSS TRANSFORM (her cihazda yürür — bilgisayar dahil).
    // Parmak + fare ile sürüklenir; bırakınca 3.5s sonra otomatik devam eder.
    let raf, off = 0, durdur = false, suruk = false, basX = 0, basOff = 0, devamZaman = null;
    let w = grup ? grup.offsetWidth : ic.scrollWidth / 2; // TAM grup genişliği = kusursuz döngü (sıçrama yok)
    const HIZ = 0.4;
    // Çeviri/yükleme otururken birkaç kez ölç, sonra sabit. off=off%w ile yumuşak.
    const wOlc = () => { const yeni = grup ? grup.offsetWidth : ic.scrollWidth / 2; if (yeni > 0) { if (w > 0) off = off % yeni; w = yeni; } };
    const t1 = setTimeout(wOlc, 600), t2 = setTimeout(wOlc, 1600), t3 = setTimeout(wOlc, 3200);
    const adim = () => {
      if (w > 0 && !suruk && !durdur) {
        off += HIZ;
        if (off >= w) off -= w; else if (off < 0) off += w;
        ic.style.transform = "translateX(" + (-off) + "px)";
      }
      raf = requestAnimationFrame(adim);
    };
    raf = requestAnimationFrame(adim);
    const bas = (e) => {
      suruk = true; durdur = true; basX = e.clientX; basOff = off;
      try { el.setPointerCapture(e.pointerId); } catch (er) {}
      if (devamZaman) { clearTimeout(devamZaman); devamZaman = null; }
    };
    const hareket = (e) => {
      if (!suruk) return;
      off = basOff - (e.clientX - basX);
      if (w > 0) off = ((off % w) + w) % w;       // sonsuz döngü (sağa-sola serbest) — önbellekli w
      ic.style.transform = "translateX(" + (-off) + "px)";
    };
    const birak = () => { suruk = false; if (devamZaman) clearTimeout(devamZaman); devamZaman = setTimeout(() => { durdur = false; }, 3500); };
    el.addEventListener("pointerdown", bas);
    el.addEventListener("pointermove", hareket);
    el.addEventListener("pointerup", birak);
    el.addEventListener("pointercancel", birak);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
      if (devamZaman) clearTimeout(devamZaman);
      el.removeEventListener("pointerdown", bas);
      el.removeEventListener("pointermove", hareket);
      el.removeEventListener("pointerup", birak);
      el.removeEventListener("pointercancel", birak);
    };
  }, [dil]); /* DİL değişince yeniden ölç → genişlik şaşmaz, şerit takılmadan yumuşak akar */

  // ───────── ANDROID GERİ TUŞU — GERİ YÜKLENDİ (pencere/panel kapatma) ─────────
  // Geri tuşu açık KATMANI (menü/profil/bildirim/arama/ayar paneli/foto düzenleyici/ana-sayfa-dışı
  // pencere) kapatır, sayfada KALIR. Ana sayfa tabanında HİÇBİR ŞEY yapmaz → geri tarayıcıya kalır
  // (Chrome arka plan, sekme durur). ⛔ history.back()/go()/temizleme/her-dokunuş YOK (sekmeyi bunlar
  // sıfırlıyordu). Tek koruma kaydı (guardVarRef) SADECE bir katman açıkken pushState ile eklenir.
  const menuAcikRef = useRef(menuAcik);
  useEffect(() => { menuAcikRef.current = menuAcik; }, [menuAcik]);
  const ayarlarAcikRef = useRef(ayarlarAcik);
  useEffect(() => { ayarlarAcikRef.current = ayarlarAcik; }, [ayarlarAcik]);
  const ayarHaritaAcikRef = useRef(ayarHaritaAcik);
  useEffect(() => { ayarHaritaAcikRef.current = ayarHaritaAcik; }, [ayarHaritaAcik]);
  const sektorListeRef = useRef(sektorListe);
  useEffect(() => { sektorListeRef.current = sektorListe; }, [sektorListe]);
  const uyelikKartAcikRef = useRef(uyelikKartAcik);
  useEffect(() => { uyelikKartAcikRef.current = uyelikKartAcik; }, [uyelikKartAcik]);
  const telHaritaAcikRef = useRef(telHaritaAcik);
  useEffect(() => { telHaritaAcikRef.current = telHaritaAcik; }, [telHaritaAcik]);
  const sehirAcikRef = useRef(sehirAcik);
  useEffect(() => { sehirAcikRef.current = sehirAcik; }, [sehirAcik]);
  // Tarayıcı seslerini önceden yükle (ilk sesli okumada doğru dil sesi hazır olsun)
  useEffect(() => { try { if (window.speechSynthesis) { window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = () => { try { window.speechSynthesis.getVoices(); } catch (e) {} }; } } catch (e) {} }, []);
  // Asistan açılınca EN ALTTAN (son konuşmadan) başlat — üstten değil
  useEffect(() => {
    if (yardimciAcik) aiAltaKay();
  }, [yardimciAcik, yardimciMod]);
  // HER yeni mesajda en alta kay (son balon hep görünsün; bilgisayarda da altta/arkada kalmasın)
  useEffect(() => { if (yardimciAcik) aiAltaKay(); }, [yardimciMesajlar, siteMesajlar, yardimciYukleniyor]); // eslint-disable-line react-hooks/exhaustive-deps
  // PROAKTİF KARŞILAMA KALDIRILDI (kullanıcı: panel açılınca/yazıya dokununca kendiliğinden "Buyurun ne yapayım"
  // diye konuşmasın; ben konuşacağım, o SADECE bana cevap yazıp okuyacak). Boş panelde statik ipucu (ai-karsilama) gösterilir.
  // MENÜ açıkken ARKA SAYFAYI DONDUR (kaydırma kilidi): sayfa kayması .ana-kok içinde — menü açıkken
  // arka kayınca menünün altı açılıp arka feed sızıyordu. Kilitleyince arka hiç kaymaz, sızma biter.
  useEffect(() => {
    const k = kokRef.current;
    const overlayAcik = menuAcik || sehirAcik || arsivAcik; // tam ekran pencereler açıkken arka DONAR (yukarı çekince boşluk açılmaz)
    if (overlayAcik) {
      if (k) { k.style.overflow = "hidden"; k.style.touchAction = "none"; }
      document.body.style.overflow = "hidden";
    } else {
      if (k) { k.style.overflow = ""; k.style.touchAction = ""; }
      document.body.style.overflow = "";
    }
    return () => { if (k) { k.style.overflow = ""; k.style.touchAction = ""; } document.body.style.overflow = ""; };
  }, [menuAcik, sehirAcik, arsivAcik]);
  // FEED VİDEOLARI: ekrana gelince KENDİ oynar (sessiz, döngü), çıkınca durur — düğmeye basmaya gerek yok.
  // ⚡ PARLAMA: ana sayfa ÜZERİNDE bir pencere açıkken (menü/ayarlar/panel...) feed videosu arkada oynamaya devam ederse
  // telefonda pencere açılışında PARLAMA yapıyordu → pencere açıkken TÜM feed videoları DURDUR; pencere kapanınca yeniden oynar.
  const ustPencereVar = menuAcik || ayarlarAcik || profilAcik || bildirimAcik || araAcik || mesajAcik || paylasAcik || !!tamFoto || !!onizGaleri || !!hikayeAcik || !!hikTaslak || hikSecimAcik || !!uyeSayfa || yardimciAcik || sehirAcik || !!araSecili || uyelikKartAcik || ayarHaritaAcik || !!sektorListe || arsivAcik || reelsAcik || !!sohbetKisi || !!aramaDurum || !!gelenArama;
  useEffect(() => {
    if (aktifKod !== "home") return;
    // PARLAMA ÖNLE: pencere açıkken SADECE feed değil, HİKÂYE ŞERİDİ (kart) videoları da durur (arka planda oynayıp parlamasın)
    const seritVids = Array.from(document.querySelectorAll(".hik-serit video, .reels-serit video"));
    const feedVids = Array.from(document.querySelectorAll(".ana-akis video")); // TÜM akış videoları (foto/kolaj/Makara şeridi dahil) — hiçbiri arkada oynayıp parlamasın
    if (ustPencereVar) { [...feedVids, ...seritVids].forEach((v) => { try { v.pause(); } catch (e) {} }); return; }
    // PENCERE KAPANDI → hikâye şeridi videoları TEKRAR CANLI oynasın (küçük kapak, hep görünür).
    // Kullanıcı: "menü/sayfa açıp kapatınca ana sayfaya dönünce hikâye ve videolar duruyor, canlı değil" — burada yeniden başlatılır.
    seritVids.forEach((v) => { try { const o = v.play(); if (o && o.catch) o.catch(() => {}); } catch (e) {} });
    if (!feedVids.length) return;
    const io = new IntersectionObserver((girisler) => {
      girisler.forEach((g) => {
        const v = g.target;
        if (g.isIntersecting && g.intersectionRatio >= 0.55) { v.play().catch(() => {}); }
        else { try { v.pause(); } catch (e) {} }
      });
    }, { threshold: [0, 0.55, 1] });
    feedVids.forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, [aktifKod, feedFiltre, gercekAkis, ustPencereVar, hikayeGruplar]);
  // EK GÜVENLİK — uygulamaya ARKA PLANDAN geri dönünce (odak/görünürlük), bir pencere AÇIKSA arka feed/şerit videoları
  // tekrar DURDUR (dönüşte kendiliğinden oynamaya başlayıp parlamasın). CSS zaten gizliyor; bu, ses/oynatmayı da keser.
  useEffect(() => {
    const tekrarDurdur = () => {
      if (document.hidden || !ustPencereVar) return;
      Array.from(document.querySelectorAll(".ana-akis video, .hik-serit video, .reels-serit video")).forEach((v) => { try { v.pause(); } catch (e) {} });
    };
    document.addEventListener("visibilitychange", tekrarDurdur);
    window.addEventListener("focus", tekrarDurdur);
    return () => { document.removeEventListener("visibilitychange", tekrarDurdur); window.removeEventListener("focus", tekrarDurdur); };
  }, [ustPencereVar]);
  // REELS: ekrandaki reel videosu KENDİ oynar (döngü), ötekiler durur; hangi reelde olduğumuzu izler.
  useEffect(() => {
    if (!reelsAcik) return;
    const vids = Array.from(document.querySelectorAll(".reel-video"));
    if (!vids.length) return;
    const io = new IntersectionObserver((girisler) => {
      girisler.forEach((g) => {
        const v = g.target;
        const bg = v.parentElement && v.parentElement.querySelector(".reel-video-bg"); // bulanık arka
        if (g.isIntersecting && g.intersectionRatio >= 0.6) {
          v.muted = !reelSesAcik; try { v.play().catch(() => { try { v.muted = true; v.play().catch(() => {}); } catch (x) {} }); } catch (e) {}
          if (bg) { try { bg.muted = true; bg.play().catch(() => {}); } catch (e) {} }
          const i = Number(v.getAttribute("data-i")) || 0; setReelAktif(i);
        } else { try { v.pause(); } catch (e) {} if (bg) { try { bg.pause(); } catch (e) {} } }
      });
    }, { threshold: [0, 0.6, 1] });
    vids.forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, [reelsAcik, reelListesi, reelSesAcik]);
  // AKIŞ SAYFALAMA: filtre değişince baştan (ilk 6)
  useEffect(() => { setFeedGoster(6); }, [feedFiltre]);
  // Aşağı kaydırınca DAHA FAZLA gönderi yükle — nöbetçi görününce +6 (tümünü birden yüklemez → ölçeklenir, donmaz)
  useEffect(() => {
    if (aktifKod !== "home") return;
    const el = feedSonRef.current; if (!el) return;
    const io = new IntersectionObserver((girisler) => { if (girisler.some((g) => g.isIntersecting)) setFeedGoster((n) => n + 6); }, { rootMargin: "700px" });
    io.observe(el);
    return () => io.disconnect();
  }, [aktifKod, feedGoster, feedFiltre, gercekAkis]);
  // MAKARA ŞERİDİ (akıştaki karusel): videolar EKRANA GELİNCE kendi oynar (sessiz, döngü), çıkınca durur; pencere açıkken durur
  useEffect(() => {
    if (aktifKod !== "home") return;
    const vids = Array.from(document.querySelectorAll(".reels-serit-vid"));
    if (!vids.length) return;
    if (ustPencereVar) { vids.forEach((v) => { try { v.pause(); } catch (e) {} }); return; }
    const io = new IntersectionObserver((girisler) => {
      girisler.forEach((g) => {
        const v = g.target;
        if (g.isIntersecting && g.intersectionRatio >= 0.5) { try { v.muted = true; v.play().catch(() => {}); } catch (e) {} }
        else { try { v.pause(); } catch (e) {} }
      });
    }, { threshold: [0, 0.5, 1] });
    vids.forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, [aktifKod, gercekAkis, ustPencereVar, feedGoster, feedFiltre]);
  // REELS açılınca, seçilen reele (karuselden dokunulan) KAYDIR (baştan değil, o videodan başlasın)
  useEffect(() => {
    if (!reelsAcik) return;
    const sar = reelSarRef.current; if (!sar) return;
    const el = sar.children && sar.children[reelAktif];
    if (el && el.scrollIntoView) { try { el.scrollIntoView({ block: "start" }); } catch (e) {} }
  }, [reelsAcik]); // eslint-disable-line react-hooks/exhaustive-deps
  const profilAcikRef = useRef(profilAcik);
  useEffect(() => { profilAcikRef.current = profilAcik; }, [profilAcik]);
  const bildirimAcikRef = useRef(bildirimAcik);
  useEffect(() => { bildirimAcikRef.current = bildirimAcik; }, [bildirimAcik]);
  const aktifKodRef = useRef(aktifKod);
  useEffect(() => { aktifKodRef.current = aktifKod; }, [aktifKod]);
  const duzenAcikRef = useRef(duzenAcik);
  useEffect(() => { duzenAcikRef.current = duzenAcik; }, [duzenAcik]);
  const araAcikRef = useRef(araAcik);
  useEffect(() => { araAcikRef.current = araAcik; }, [araAcik]);
  const araSeciliRef = useRef(araSecili); // arama detay penceresi — geri tuşu TANISIN (en üst katman)
  useEffect(() => { araSeciliRef.current = araSecili; }, [araSecili]);
  const mesajAcikRef = useRef(mesajAcik); useEffect(() => { mesajAcikRef.current = mesajAcik; }, [mesajAcik]);
  const paylasAcikRef = useRef(paylasAcik); useEffect(() => { paylasAcikRef.current = paylasAcik; }, [paylasAcik]);
  const tamFotoRef = useRef(tamFoto); useEffect(() => { tamFotoRef.current = tamFoto; }, [tamFoto]);
  const onizGaleriRef = useRef(onizGaleri); useEffect(() => { onizGaleriRef.current = onizGaleri; }, [onizGaleri]);
  const hikayeAcikRef = useRef(hikayeAcik); useEffect(() => { hikayeAcikRef.current = hikayeAcik; }, [hikayeAcik]);
  useEffect(() => { hikTaslakRef.current = hikTaslak; }, [hikTaslak]);
  useEffect(() => { hikSecimAcikRef.current = hikSecimAcik; }, [hikSecimAcik]);
  useEffect(() => { hikMenuAcikRef.current = hikMenuAcik; }, [hikMenuAcik]);
  // Tam ekran AÇIKKEN sayfa kaydırması KİLİTLİ → adres çubuğu çıkıp ✕'i oynatmaz (sabit kalır)
  useEffect(() => {
    if (!tamFoto) { setTfMini(false); return; }
    setTfMini(false); // her yeni açılışta TAM ekran (mini değil)
    setZoom({ s: 1, x: 0, y: 0 }); // her açılışta NORMAL (yakınlaştırılmamış); kullanıcı kendi büyütür
    setVidOyn(false); setVidT(0); setVidSure(0); setTfVidOran(null); // video oynatıcı sıfırla
  }, [tamFoto]);
  // KİLİT ayrı efekt: mini modda sayfa KAYSIN (kilit yok) → video köşede oynarken aşağı gezilebilir
  useEffect(() => {
    if (!tamFoto || tfMini) return;
    const onceki = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = onceki; };
  }, [tamFoto, tfMini]);
  // --- TAM EKRAN parmakla ZOOM jestleri ---
  const _mesafe = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  // HİKÂYE ŞERİT KARTI kapak yönü: YATAY görsel (GLOXORG gibi geniş) → .yatay sınıfı (CSS'te contain, yanlar kesilmez,
  // boşluk ALTIN). DİKEY/KARE (Hanna gibi portre) → sınıf yok = cover (kartı tam doldurur, kesik/yama yok).
  const hikKapakYon = (e) => {
    try {
      const el = e.target;
      const w = el.naturalWidth || el.videoWidth || 0;
      const h = el.naturalHeight || el.videoHeight || 0;
      const sar = el.closest && el.closest(".hik-kart-medyasar");
      if (sar && w && h) sar.classList.toggle("yatay", w > h * 1.08);
    } catch (x) {}
  };
  function fotoTouchStart(e) {
    if (e.touches.length === 2) {
      pinchRef.current = { tip: "pinch", d0: _mesafe(e.touches), s0: zoom.s };
    } else if (e.touches.length === 1 && zoom.s > 1) {
      pinchRef.current = { tip: "pan", x0: e.touches[0].clientX, y0: e.touches[0].clientY, ox: zoom.x, oy: zoom.y };
    } else if (e.touches.length === 1) {
      // Yakınlaştırılmamış: yatay kaydırma izle → sola çekince üye sayfası açılır
      pinchRef.current = { tip: "kaydir", x0: e.touches[0].clientX, y0: e.touches[0].clientY, dx: 0, dy: 0 };
    }
  }
  function fotoTouchMove(e) {
    const p = pinchRef.current; if (!p) return;
    if (p.tip === "pinch" && e.touches.length === 2) {
      e.preventDefault();
      const s = Math.min(5, Math.max(1, p.s0 * (_mesafe(e.touches) / p.d0)));
      setZoom((z) => ({ ...z, s, ...(s === 1 ? { x: 0, y: 0 } : {}) }));
    } else if (p.tip === "pan" && e.touches.length === 1) {
      e.preventDefault();
      setZoom((z) => ({ ...z, x: p.ox + (e.touches[0].clientX - p.x0), y: p.oy + (e.touches[0].clientY - p.y0) }));
    } else if (p.tip === "kaydir" && e.touches.length === 1) {
      p.dx = e.touches[0].clientX - p.x0; p.dy = e.touches[0].clientY - p.y0;
    }
  }
  function fotoTouchEnd(e) {
    const p = pinchRef.current;
    // Sola çekiş (yatay > 70px ve dikeyden baskın) → o üyenin paylaşım sayfası
    if (p && p.tip === "kaydir" && p.dx < -70 && Math.abs(p.dx) > Math.abs(p.dy) * 1.6) {
      if (tamFotoRef.current) uyeyiAc(tamFotoRef.current);
    }
    if (e.touches.length === 0) pinchRef.current = null;
  }
  function fotoCiftDokun() { setZoom((z) => (z.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 })); }
  function fotoTeker(e) {
    e.preventDefault();
    setZoom((z) => { const s = Math.min(5, Math.max(1, z.s + (e.deltaY < 0 ? 0.25 : -0.25))); return s === 1 ? { s: 1, x: 0, y: 0 } : { ...z, s }; });
  }
  const acikBolumRef = useRef(acikBolum); // Profilim ayar paneli — android geri TANISIN
  useEffect(() => { acikBolumRef.current = acikBolum; }, [acikBolum]);
  const uyeSayfaRef = useRef(uyeSayfa); // Üye paylaşım sayfası — android geri TANISIN
  useEffect(() => { uyeSayfaRef.current = uyeSayfa; }, [uyeSayfa]);
  const yardimciAcikRef = useRef(yardimciAcik); // GLOXORG Yardımcısı — android geri TANISIN
  useEffect(() => { yardimciAcikRef.current = yardimciAcik; }, [yardimciAcik]);
  // AI konuşmaları KALICI — sayfa yenilenince silinmesin (son 40 mesaj saklanır)
  // localStorage'a foto base64 YAZMA (quota şişmesin) — foto geçici, metin kalıcı
  // SOHBET KAYDET — kota dolsa bile metni KAYBETME: son 6 fotoğrafı tut (tıklayınca yüklenir), kota olursa fotosuz+daha az dene
  const aiSohbetKaydet = (anahtar, dizi) => {
    const son = dizi.slice(-150); const n = son.length;
    const ekHafif = (m) => { if (!m.ek) return m; const e = { tur: m.ek.tur, ad: m.ek.ad }; if (m.ek.url) e.url = m.ek.url; return { ...m, ek: e }; }; // ağır base64/dataURL KAYDETME; video URL'si (küçük) KALIR → yenilenince oynar
    const veri = son.map((m, i) => { let mm = ekHafif(m); if (mm.foto) { const tut = i >= n - 6 && mm.foto.dataURL; mm = { ...mm, foto: tut ? { dataURL: mm.foto.dataURL } : null }; } return mm; });
    try { localStorage.setItem(anahtar, JSON.stringify(veri)); return; } catch (e) {}
    try { localStorage.setItem(anahtar, JSON.stringify(son.map((m) => m.foto ? { ...m, foto: null } : m))); return; } catch (e) {}
    try { localStorage.setItem(anahtar, JSON.stringify(dizi.slice(-50).map((m) => m.foto ? { ...m, foto: null } : m))); } catch (e) {}
  };
  useEffect(() => { aiSohbetKaydet("groxSohbet", yardimciMesajlar); }, [yardimciMesajlar]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { aiSohbetKaydet("groxSiteSohbet", siteMesajlar); }, [siteMesajlar]); // eslint-disable-line react-hooks/exhaustive-deps
  // KALICI ARŞİV: her yeni mesajı (her iki sohbetten) arsivTum'a EKLE (zamanMs ile tekilleştir) → "yeni konuşma" temizlese bile geçmiş KALIR
  useEffect(() => {
    const gelen = [...yardimciMesajlar, ...siteMesajlar].filter((m) => m && m.zamanMs && m.metin);
    if (!gelen.length) return;
    setArsivTum((eski) => {
      const anahtar = new Set(eski.map((m) => m.zamanMs + "|" + m.rol));
      const yeni = gelen.filter((m) => !anahtar.has(m.zamanMs + "|" + m.rol)).map((m) => ({ rol: m.rol, metin: m.metin, zamanMs: m.zamanMs, konum: m.konum || "" }));
      if (!yeni.length) return eski;
      const birlesik = [...eski, ...yeni].sort((a, b) => a.zamanMs - b.zamanMs).slice(-500); // kota şişmesin (sohbet kaydı başarısız olmasın diye düşük)
      try { localStorage.setItem("groxArsivTum", JSON.stringify(birlesik)); } catch (e) { try { localStorage.setItem("groxArsivTum", JSON.stringify(birlesik.slice(-200))); } catch (e2) {} }
      return birlesik;
    });
  }, [yardimciMesajlar, siteMesajlar]);
  // HER AÇIK KATMAN için AYRI koruma kaydı (kademe). Katmanlar (üstten alta): foto düzenleyici,
  // ayar paneli, overlay (menü/profil/bildirim/arama), ana-sayfa-dışı pencere. Açık katman sayısı
  // kadar kayıt itilir → her geri basışı BİR katmanı kapatır; profil penceresi + ayar paneli = 2 kayıt
  // → 1.geri paneli, 2.geri pencereyi (ana sayfaya döner), 3.geri ana sayfada Chrome arka plan.
  const guardSayRef = useRef(0); // ittiğimiz koruma kaydı sayısı (geçmiş tepesinde)
  useEffect(() => {
    const acikKatman = (aktifKod !== "home" ? 1 : 0) + (duzenAcik ? 1 : 0) + (acikBolum ? 1 : 0)
      + ((menuAcik || profilAcik || bildirimAcik || araAcik || mesajAcik || ayarlarAcik) ? 1 : 0) + (ayarHaritaAcik ? 1 : 0) + (telHaritaAcik ? 1 : 0) + (sektorListe ? 1 : 0) + (uyelikKartAcik ? 1 : 0) + (araSecili ? 1 : 0) + (paylasAcik ? 1 : 0) + (tamFoto ? 1 : 0) + (onizGaleri ? 1 : 0) + (hikayeAcik ? 1 : 0) + (hikMenuAcik ? 1 : 0) + (hikTaslak ? 1 : 0) + (hikSecimAcik ? 1 : 0) + (uyeSayfa ? 1 : 0) + (yardimciAcik ? 1 : 0) + (sehirAcik ? 1 : 0) + (reelsAcik ? 1 : 0) + (sohbetKisi ? 1 : 0) + (aramaDurum ? 1 : 0) + (gelenArama ? 1 : 0);
    // Açık katman sayısı kadar koruma kaydı OLSUN — eksikse ekle (pushState, hash DEĞİŞMEZ).
    while (guardSayRef.current < acikKatman) {
      try { window.history.pushState(window.history.state, "", window.location.href); guardSayRef.current++; }
      catch (e) { break; }
    }
    // Katman DOKUNARAK kapandıysa kayıt fazla kalır — DOKUNMAYIZ (history.back YOK = sekme sıfırlanamaz);
    // o fazla kayıt sonraki geri basışta zararsızca (aynı sayfa) tükenir.
  }, [menuAcik, profilAcik, bildirimAcik, araAcik, acikBolum, duzenAcik, aktifKod, araSecili, mesajAcik, paylasAcik, tamFoto, onizGaleri, hikayeAcik, hikMenuAcik, hikTaslak, hikSecimAcik, uyeSayfa, yardimciAcik, sehirAcik, ayarlarAcik, ayarHaritaAcik, sektorListe, uyelikKartAcik, telHaritaAcik, reelsAcik, sohbetKisi, aramaDurum, gelenArama]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onPop = () => {
      // Bu geri basışı bir koruma kaydı tüketti. EN ÜST açık katmanı kapat, sayfada KAL.
      guardSayRef.current = Math.max(0, guardSayRef.current - 1);
      if (aramaDurumRef.current) { aramaKapat(); }
      else if (gelenAramaRef.current) { aramaReddet(); }
      else if (sohbetKisiRef.current) { sohbetKisiRef.current = null; setSohbetKisi(null); }
      else if (reelsAcikRef.current) { reelsAcikRef.current = false; setReelsAcik(false); }
      else if (telHaritaAcikRef.current) { telHaritaAcikRef.current = false; setTelHaritaAcik(false); }
      else if (uyelikKartAcikRef.current) { uyelikKartAcikRef.current = false; setUyelikKartAcik(false); }
      else if (sektorListeRef.current) { sektorListeRef.current = ""; setSektorListe(""); }
      else if (ayarHaritaAcikRef.current) { ayarHaritaAcikRef.current = false; setAyarHaritaAcik(false); }
      else if (sehirAcikRef.current) { sehirAcikRef.current = false; setSehirAcik(false); }
      else if (yardimciAcikRef.current) { yardimciAcikRef.current = false; setYardimciAcik(false); }
      else if (hikMenuAcikRef.current) { hikMenuAcikRef.current = false; setHikMenuAcik(false); hikDuraklaRef.current = false; setHikayeDurdu(false); }
      else if (hikSecimAcikRef.current) { hikSecimAcikRef.current = false; setHikSecimAcik(false); }
      else if (hikTaslakRef.current) { const tas = hikTaslakRef.current; if (tas.tip === "video" && tas.url) { try { URL.revokeObjectURL(tas.url); } catch (e) {} } hikTaslakRef.current = null; setHikTaslak(null); setHikAiOneriler([]); }
      else if (hikayeAcikRef.current) { hikayeAcikRef.current = null; setHikayeAcik(null); }
      else if (onizGaleriRef.current) { onizGaleriRef.current = null; setOnizGaleri(null); }
      else if (uyeSayfaRef.current) { uyeSayfaRef.current = null; setUyeSayfa(null); }
      else if (tamFotoRef.current) { tamFotoRef.current = ""; setTamFoto(""); }
      else if (paylasAcikRef.current) { paylasAcikRef.current = false; setPaylasAcik(false); }
      else if (araSeciliRef.current) { araSeciliRef.current = null; setAraSecili(null); }
      else if (duzenAcikRef.current) { duzenAcikRef.current = false; setDuzenAcik(false); }
      else if (acikBolumRef.current) { acikBolumRef.current = null; setAcikBolum(null); }
      else if (menuAcikRef.current || profilAcikRef.current || bildirimAcikRef.current || araAcikRef.current || mesajAcikRef.current || ayarlarAcikRef.current) {
        menuAcikRef.current = false; profilAcikRef.current = false; bildirimAcikRef.current = false; araAcikRef.current = false; mesajAcikRef.current = false; ayarlarAcikRef.current = false;
        setMenuAcik(false); setProfilAcik(false); setBildirimAcik(false); setAraAcik(false); setMesajAcik(false); setAyarlarAcik(false);
      }
      else if (aktifKodRef.current !== "home") { aktifKodRef.current = "home"; setAktifKod("home"); }
      // else: ANA SAYFA TABANI → HİÇBİR ŞEY YAPMA (geri tarayıcıya kalır = Chrome arka plan).
      // ⛔ Burada history.back()/go() ASLA YOK — sekme sıfırlanamaz.
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ───────── EKSPERT İLK-GİRİŞ ANLATIMI (#2) ─────────
  // Kullanıcı bir sayfaya/pencereye İLK kez girdiğinde Ekspert (🐻) O sayfanın ne işe yaradığını KONUŞARAK+YAZARAK
  // bir kez anlatır (kalıcı: gloxGezilenSayfa). Sonra istenirse üstteki Ekspert düğmesiyle tekrar dinlenir.
  // Otomatik anlatımda mikrofon ZORLA açılmaz (kullanıcıyı boğmaz). Başka konuşma/karşılama açıkken bekler.
  useEffect(() => {
    if (!u) return; // giriş yapmadan anlatma
    const ak = mevcutSayfaKodu();
    if (ak === "home" || ak === "paylas") return; // Ana sayfa: Gloxoo karşılaması anlatır. Paylaş: kendi Gloxoo yardımı var (bear kapatmasın). İkisi de Ekspert düğmesiyle istenince anlatır.
    if (gezilenSayfaRef.current.has(ak)) return;
    if (maskotTanit || maskotSelam || yardimciAcik || tamFoto || uyeSayfa) return; // başka konuşma/tam ekran varken bekle
    const zmn = setTimeout(() => {
      const ak2 = mevcutSayfaKodu();
      if (!ak2 || ak2 === "home" || gezilenSayfaRef.current.has(ak2)) return;
      if (maskotTanitRef.current || yardimciAcikRef.current) return; // arada bir konuşma başladıysa iptal
      setGezilenSayfa((s) => { const n = new Set(s); n.add(ak2); try { localStorage.setItem("gloxGezilenSayfa", JSON.stringify([...n])); } catch (e) {} return n; });
      try { eksperTanitYap(true); } catch (e) {}
    }, 850); // sayfa otursun + kullanıcı yerleşsin
    return () => clearTimeout(zmn);
  }, [u, aktifKod, ayarlarAcik, paylasAcik, mesajAcik, araAcik, bildirimAcik, maskotTanit, maskotSelam, yardimciAcik, tamFoto, uyeSayfa]); // eslint-disable-line react-hooks/exhaustive-deps

  // Parmak kaydırma takibi (pencere değiştirme) için başlangıç noktası
  const dokunRef = useRef(null);
  // ALT DÜĞMELER ekranda SABİT DEĞİL: aşağı kaydırınca kaybolur, yukarı kaydırınca geri gelir.
  const kokRef = useRef(null);
  const [tabGizli, setTabGizli] = useState(false);
  const [yukariOk, setYukariOk] = useState(false); // "başa dön" oku — kaydırınca belirir, durunca kaybolur
  const yukariOkZmnRef = useRef(null);
  useEffect(() => {
    const el = kokRef.current; if (!el) return;
    let son = el.scrollTop, birikim = 0;
    const onKaydir = () => {
      const y = el.scrollTop;
      const fark = y - son; son = y;
      birikim = (birikim > 0) === (fark > 0) ? birikim + fark : fark; // yön değişince sıfırdan say
      // BAŞA DÖN OKU: aşağıdayken kaydırma sırasında beliren, durunca kaybolan ok
      if (y > 500) {
        setYukariOk(true);
        clearTimeout(yukariOkZmnRef.current);
        yukariOkZmnRef.current = setTimeout(() => setYukariOk(false), 2200);
      } else setYukariOk(false);
      if (y < 50) { setTabGizli(false); birikim = 0; return; }        // en üstteyken hep görünür
      if (birikim > 26) setTabGizli(true);
      else if (birikim < -26) setTabGizli(false);
    };
    el.addEventListener("scroll", onKaydir, { passive: true });
    return () => { el.removeEventListener("scroll", onKaydir); clearTimeout(yukariOkZmnRef.current); };
  }, []);
  // Başa (en üste) tam hızla dön
  const basaDon = () => { const el = kokRef.current; if (el) el.scrollTo({ top: 0, behavior: "smooth" }); setYukariOk(false); };

  // Bulunduğum yerin piyasası (kendi para birimimde): USD, EUR, Altın, Gümüş, Bitcoin
  const piyasa = (() => {
    if (!kur || !kur.rates) return null;
    const r = kur.rates;
    const oran = r[myPara] || 1;                 // 1 USD = oran (myPara)
    const eurUsd = r["EUR"] ? 1 / r["EUR"] : 1.08; // 1 EUR kaç USD
    return {
      usd: paraBicim(oran, dil),
      eur: paraBicim(eurUsd * oran, dil),
      altin: paraBicim((ALTIN_ONS_USD / ONS_GRAM) * oran, dil),
      gumus: paraBicim((GUMUS_ONS_USD / ONS_GRAM) * oran, dil),
      btc: kur.btcUsd ? paraBicim(kur.btcUsd * oran, dil) : "—",
    };
  })();

  // O ülkenin kuru/parası. Her ülkenin para birimi BELLİ olsun:
  // • Farklı para → 1 (benim param) = X (o ülkenin parası)
  // • Aynı para (örn. Euro bölgesindeysem diğer Euro ülkeleri) → sadece para sembolü (€) göster
  const ulkeKur = (kod) => {
    const para = BOLGE_PARA[kod] || "USD";
    const sym = paraSembol(para);
    if (para === myPara || !kur || !kur.rates) return { ayni: true, sym };  // aynı para ya da kur yok → sembolü göster
    const deger = (kur.rates[para] || 0) / (kur.rates[myPara] || 1);
    if (!deger) return { ayni: true, sym };
    const yazi = deger >= 100 ? Math.round(deger).toLocaleString(dil || "tr")
               : deger >= 1 ? deger.toFixed(2)
               : deger >= 0.01 ? deger.toFixed(3)
               : Number(deger.toPrecision(2)).toString();  // çok küçük (zayıf para) → 0.00 yerine anlamlı basamak
    return { ayni: false, yazi, mySym: paraSembol(myPara), sym };  // semboller ayrı renklenebilsin
  };

  // Şerit öğeleri: her 5 ülkeden sonra "bulunduğum yer + piyasa" eklenir
  const seritOgeler = [];
  ULKELER_SERIT.forEach((c, i) => { seritOgeler.push({ tip: "ulke", ...c }); if ((i + 1) % 5 === 0) seritOgeler.push({ tip: "konum" }); });
  seritOgeler.push({ tip: "konum" });
  // Tek öğe çizimi — iki ÖZDEŞ grupta kullanılır (kusursuz döngü için)
  const seritOgeCiz = (s, i) => s.tip === "ulke" ? (
    <span className="serit-ulke" key={i}>
      <span className="serit-kod notranslate" translate="no">{s.kod}</span>
      <span className="serit-bayrak" style={{ backgroundImage: `url(https://flagcdn.com/w80/${s.kod.toLowerCase()}.png)` }} />
      <span className="serit-sehir" translate="yes" style={{ color: s.renk }}>{s.sehir}</span>
      <SeritSaat tz={s.tz} />
      {(() => { const k = ulkeKur(s.kod); return k ? (
        k.ayni ? (
          <span className="serit-kurfark"><b style={{ color: s.renk }}>{k.sym}</b></span>
        ) : (
          <span className="serit-kurfark">1 <b style={{ color: "#FFD700" }}>{k.mySym}</b> = {k.yazi} <b style={{ color: s.renk }}>{k.sym}</b></span>
        )
      ) : null; })()}
    </span>
  ) : (
    <span className="serit-konum" key={i}>
      <span className="serit-kod vurgu notranslate" translate="no">{myKod}</span>
      <span className="serit-bayrak vurgu" style={{ backgroundImage: `url(https://flagcdn.com/w80/${(myKod || "tr").toLowerCase()}.png)` }} />
      <SeritSaat tz={myTz} />
      {(piyasa || borsa) && (
        <span className="serit-piyasa">
          {piyasa && <>
            <span className="pz eur"><b>€</b><span className="pd">{piyasa.eur}</span><i className="yp">{myParaSym}</i></span>
            <span className="pz usd"><b>$</b><span className="pd">{piyasa.usd}</span><i className="yp">{myParaSym}</i></span>
            <span className="pz altin"><b>{t("piyasaAltin", "Altın")}</b><span className="pd">{piyasa.altin}</span><i className="yp">{myParaSym}</i></span>
            <span className="pz gumus"><b>{t("piyasaGumus", "Gümüş")}</b><span className="pd">{piyasa.gumus}</span><i className="yp">{myParaSym}</i></span>
            <span className="pz btc"><b>₿</b><span className="pd">{piyasa.btc}</span></span>
          </>}
          {borsa && (
            <span className="pz borsa">
              <b>{borsa.ad}</b><span className="pd">{borsa.deger}</span>
              <i className={"by " + borsa.yon}>{borsa.yuzde}</i>
            </span>
          )}
        </span>
      )}
    </span>
  );

  const navlar = [
    { k: "home", et: t("navAnaSayfa"), aktif: true },
    { k: "elite", et: t("navElite") },
    { k: "topluluk", et: t("navTopluluk") },
    { k: "video", et: t("navCanli", "Canlı Akış") },
    { k: "konum", et: t("navKonum") },
    { k: "akademi", et: t("navAkademi") },
    { k: "profil", et: t("navProfil") },
  ];

  // PENCERE TEMASI: marka pırlantası + W rengi + alt yazı O SAYFAYA göre (ANAYASA 6.15)
  const aktifEt = (navlar.find((n) => n.k === aktifKod) || navlar[0]).et;
  const temaRenk = ({
    home: pro ? "kirmizi" : "mavi",
    elite: "altin", topluluk: "yesil", video: "mor",
    konum: "turkuaz", akademi: "zeytin", profil: pro ? "kirmizi" : "beyaz",
  })[aktifKod] || "mavi";

  // PARMAKLA SOLA/SAĞA KAYDIRINCA PENCERE DEĞİŞİR (gerçek dokunma takibi).
  // Üst piyasa şeridindeki kaydırma HARİÇ (onun kendi sürüklemesi var).
  const kaydirBas = (e) => {
    // ARTIK her dokunuşta katman EKLENMEZ — eskiden ana sayfada SÜREKLİ tampon kalıyordu,
    // geri tuşu önce o tamponu (sekmeyi) görüyordu. Tampon SADECE pencere/panel açıkken eklenir
    // (aşağıdaki effect). Böylece ana sayfa tabanında HİÇ tampon yok → geri tuşu doğrudan Chrome'u
    // arka plana atar (sekmeyi/sayfayı görmez).
    // ⛔ PENCERE/PANEL AÇIKKEN sayfa kaydırma YOK: ayar/paylaş/arama/profil/üye penceresi açıkken
    // parmağı sağa-sola gezdirmek ALT sayfayı kaydırıp başka sekmeye atıyordu (ayar yapmayı engelliyordu).
    // Parmak ne yapıyorsa ORADA kalsın, alt sayfa görülmesin.
    if (menuAcik || profilAcik || bildirimAcik || araAcik || mesajAcik || araSecili || paylasAcik || tamFoto || uyeSayfa || acikBolum || duzenAcik || aktifKod === "profil") { dokunRef.current = null; return; }
    try {
      if (e.target && e.target.closest && e.target.closest(".ana-serit, .hik-serit, .reels-serit, input, textarea, select, .apf-ayar-panel, .uye-sayfa, .pyl-pencere, .msj-pencere, .apr-galeri, .tf-galeri")) { dokunRef.current = null; return; }
      const d = e.touches[0];
      dokunRef.current = { x: d.clientX, y: d.clientY };
    } catch (err) { dokunRef.current = null; }
  };
  const kaydirBit = (e) => {
    const b = dokunRef.current; dokunRef.current = null;
    if (!b) return;
    try {
      const d = e.changedTouches[0];
      const dx = d.clientX - b.x, dy = d.clientY - b.y;
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return; // yatay net olmalı
      const i = navlar.findIndex((n) => n.k === aktifKod);
      const yeni = dx < 0 ? Math.min(i + 1, navlar.length - 1) : Math.max(i - 1, 0);
      if (yeni !== i) setAktifKod(navlar[yeni].k);
    } catch (err) {}
  };

  // AKIŞ (feed) — tüm dünyadan, tüm mesleklerden; örnek veri (arka yüz sonra bağlanır)
  // meslek mc(...) ile seçili dile çevrilir (Japonca dahil). renk=avatar, medya=görsel yeri.
  // ÖRNEK/placeholder gönderiler KALDIRILDI (kullanıcı: sayfa ilk yüklenince çıkıp sonra gerçekler geliyordu — sil/at).
  // Artık SADECE gerçek gönderiler (gercekAkis) gösterilir.

  return (
    /* DİKKAT: köke "ana-pro" sınıfı VERME — CSS'te eski yatay kaydırma sınıfı (.ana-pro)
       ile çakışır, bütün sayfayı yana dizer (B108 siyah ekran hatasının sebebi buydu). */
    <div ref={kokRef} className={"ana-kok" + (pro ? " ana-kok-pro" : "") + " sayfa-" + aktifKod + (ustPencereVar ? " pencere-acik" : "")} onTouchStart={kaydirBas} onTouchEnd={kaydirBit}
      style={{ background: "#f3ead6" }}
      onContextMenu={(e) => { try { if (!(e.target.closest && e.target.closest('input, textarea, [contenteditable="true"]'))) e.preventDefault(); } catch (x) {} }}>
      {/* ARKA PLAN FOTO — ekrana SABİT (gerçek ekran yüksekliği); sayfa kaysa/adres çubuğu oynasa ZIPLAMAZ, alttan açıklık vermez */}
      <div className="ana-arka-foto" aria-hidden="true" style={{ backgroundImage: `linear-gradient(rgba(250,244,233,.5),rgba(235,222,196,.62)), url("${sehirGaleriUrl}")` }} />
      {/* DERİNLİK — renkli ufak pırlantalar, hafifçe süzülüp söner (her yere eşit) */}
      <div className="ana-derinlik" aria-hidden="true">
        {DERINLIK_PARCALAR.map((p, i) => (
          <span key={i} className="prc"
            style={{ left: p.sol + "%", bottom: p.bas + "%", width: p.boyut + "px", height: p.boyut + "px",
                     animationDuration: p.sure + "s", animationDelay: p.gecikme + "s", "--yuk": p.yuk, "--renk": p.renk }}>
            <GercekPirlanta c={p.renk} cerceve={false} />
          </span>
        ))}
      </div>
      {/* GÜNLÜK ŞEHİR etiketi — bugünkü arka plan şehri (her 24 saatte değişir) */}
      {aktifKod === "home" && (
        <button className="ana-sehir-rozet" onClick={() => { setSehirFotoNo(0); setSehirAcik(true); }} aria-label={buguninSehri.ad}>
          <img src={`https://flagcdn.com/w40/${buguninSehri.kod}.png`} alt="" loading="lazy" />
          <span>{buguninSehri.ad} · {ulkeAdiCevir(buguninSehri.kod, dil, buguninSehri.ulke)}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
        </button>
      )}
      {/* Canlı dünya DEĞERLER şeridi — SADECE ANA SAYFADA, HEP GÖRÜNÜR (gizleme YOK — kullanıcı kuralı) */}
      <div className={"ana-serit-sar" + (aktifKod === "home" ? "" : " serit-gizli")}>
      {/* SADECE ŞEHİR ADI çevrilir; gerisi (kod/saat/kur) HİÇ çevrilmez → genişlik sabit kalır,
          Çince/Korece'de takılma/geri atma olmaz (kullanıcı kuralı). */}
      <div className="ana-serit notranslate" translate="no" dir="ltr" ref={seritRef}>
        <div className="ana-serit-akis">
          {/* İKİ ÖZDEŞ GRUP — döngü genişliği = bir grubun TAM genişliği (sıçrama olmaz) */}
          <span className="serit-grup">{seritOgeler.map((s, i) => seritOgeCiz(s, "a" + i))}</span>
          <span className="serit-grup">{seritOgeler.map((s, i) => seritOgeCiz(s, "b" + i))}</span>
        </div>
      </div>
      </div>

      {/* Üst başlık — üyelik pırlantası alt zemin: Altın üye=YEŞİL, Profesyonel=YAKUT, Müşteri=MAVİ pırlanta (rengi sabit).
          Çerçeve/taşlar/GLOXORG(nakışlı görsel)/düğmeler/ayı/profil AYNEN. Sadece zemin+yazı görseli tema ile değişir. */}
      <header className={"ana-header ana-header-elmas ana-header-" + uyeTema}
        style={{
          backgroundImage: `url(${uyeZemin})`, backgroundSize: "cover", backgroundPosition: "center",
          borderStyle: "solid", borderColor: "transparent",
          ...uyeCerceveStyle,
        }}>
        {/* ÇERÇEVE artık border-image (işlemeli altın çerçeve); eski tek-taş şeridi kaldırıldı.
            SOL KOLON: bildirim (üstte) + menü (altta) — DİKEYde üst üste (kullanıcı: yer açılsın, orta yazı büyüsün); YATAY/geniş ekranda yan yana (row-reverse → menü|zil, eskisi gibi) */}
        <div className="ana-ikon-kol ana-kol-sol">
          <button className="ana-menu-btn ana-zil" onClick={() => { setBildirimAcik(true); bildirimleriOkunduYap(bildirimListe); setBildirimListe((l) => l.map((b) => ({ ...b, okundu: true }))); }} aria-label={t("bildirimBaslik")}
            style={{ backgroundImage: `url(${bildirimListe.some((b) => !b.okundu) ? zilCerceveKirmiziResim : zilCerceveResim})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>
            {Ikon.bildirim}
            {bildirimListe.some((b) => !b.okundu) && <span className="ana-zil-rozet">{Math.min(99, bildirimListe.filter((b) => !b.okundu).length)}</span>}
          </button>
          <button className="ana-menu-btn" onClick={() => setMenuAcik(true)} aria-label="Menü"
            style={{ backgroundImage: `url(${ikonCerceveResim})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}>{Ikon.menu}</button>
        </div>
        {/* DİL — SADECE geniş ekranda (bilgisayar/iPad/notebook) header'da görünür; telefonda menüdedir (yer dar). CSS: .header-dil telefonda display:none, >=760px görünür */}
        <span className="header-dil"><DilSecici /></span>
        {/* MARKA her pencerede O SAYFANIN renginde: pırlanta + GLOXORG + sayfanın adı (ANAYASA 6.15) */}
        <div className="ana-logo-sar">
          {/* Tüm üyeler: bannerdaki nakışlı-pırlantalı GLOXORG görseli (harfler orijinalden, kesilmedi).
              Pro=yakut zeminli, Müşteri/Altın=şeffaf (mavi/yeşil zemine oturur). Eski düz yazı + mavi elmas kaldırıldı. */}
          <span className="ana-logo-yazi ana-logo-yazi-pro"><img className={"ana-logo-img" + ((uyeTema === "pro" || uyeTema === "altin") ? " ana-logo-img-mavi" : "")} src={uyeWordmark} alt="GLOXORG" /></span>
          <span className="ana-alt-sar">
            <span className="ana-alt">{aktifKod === "home" ? t("anaSubtitle") : (aktifKod === "elite" ? t("navElitePazar", "Elite Pazar") : aktifEt)}</span>
            {aktifKod === "home" && <DunyaKure />}
          </span>
        </div>
        {/* SAĞ KOLON: profil (üstte) + ayı/Ekspert (altta) — DİKEYde üst üste (kullanıcı); YATAY/geniş ekranda yan yana (row-reverse → ayı|profil, eskisi gibi) */}
        <div className="ana-ikon-kol ana-kol-sag">
          {/* Google profil ikonu SADECE ANA SAYFADA; diğer pencerelerde O SAYFAYA AİT ikon */}
          {aktifKod === "home" ? (
            <div className="ana-profil ana-profil-yuvarlak" onClick={() => setProfilAcik((a) => !a)}
              style={{ backgroundImage: `url(${uyeProfilCerceve})`, backgroundSize: "cover", backgroundPosition: "center" }}>
              {googleFoto ? <img className="ana-profil-foto" src={googleFoto} alt="" referrerPolicy="no-referrer" /> : <span className="ana-profil-harf">{harf}</span>}
            </div>
          ) : (
            <button className="ana-ara-btn" aria-label={aktifEt}>{SayfaIkon[aktifKod] || Ikon.ara}</button>
          )}
          {/* GLOME — bize has mesaj + arama düğmesi (ayının yerine); okunmamış rozetli */}
          <button className="ana-ara-btn ana-mesaj-btn" onClick={() => setMesajAcik(true)} aria-label="Glome" title="Glome — Mesaj & Arama">
            {Ikon.gloxi}
            {okunmamisMesaj > 0 && <span className="ana-zil-rozet">{okunmamisMesaj > 99 ? "99+" : okunmamisMesaj}</span>}
          </button>
        </div>
      </header>

      {/* Profil penceresi (menüden AYRI) — foto + ad + e-posta + Çıkış */}
      {profilAcik && (
        <>
          <div className="ana-profil-fon" onClick={() => setProfilAcik(false)} />
          <div className="ana-profil-menu">
            <div className="apm-marka"><span className="apm-amblem"><span className="apm-elmas"><Elmas4 c="#bfe3ff" /></span><span className="apm-marka-yazi notranslate" translate="no">GLO<b>X</b>ORG</span></span></div>
            <div className="apm-bas">
              <div className="apm-foto">{googleFoto ? <img src={googleFoto} alt="" referrerPolicy="no-referrer" /> : harf}</div>
              <div className="apm-bilgi">
                {adDuzenle ? (
                  <div className="apm-ad-duzen">
                    <input className="apm-ad-input" value={yeniAd} autoFocus onChange={(e) => setYeniAd(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") adKaydet(); }} />
                    <button className="apm-ad-kaydet" onClick={adKaydet}>{t("profKaydet")}</button>
                  </div>
                ) : (
                  <span className="apm-ad">
                    {adTam}
                    <button className="apm-kalem" onClick={() => { setYeniAd((u && u.displayName) || ""); setAdDuzenle(true); }} aria-label="Düzenle">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                    </button>
                  </span>
                )}
                {u && u.email && <span className="apm-eposta">{u.email}</span>}
              </div>
            </div>
            <div className="apm-bilgi-liste">
              <div className="apm-satir">
                <span className="apm-eti"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-6 8-6s8 2 8 6" /></svg>{t("profHesapTuru")}</span>
                <span className="apm-deg">{hesapTip}</span>
              </div>
              <div className="apm-satir">
                <span className="apm-eti"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M21 3l-9 9" /><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></svg>{t("profGiris")}</span>
                <span className="apm-deg">{saglayiciAd}</span>
              </div>
              {uyelikTarih && (
                <div className="apm-satir">
                  <span className="apm-eti"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 3v4M16 3v4" /></svg>{t("profUyelik")}</span>
                  <span className="apm-deg">{uyelikTarih}</span>
                </div>
              )}
            </div>
            <div className="apm-eylemler">
              {/* Google'a özel kısayollar SADECE Google ile girene gösterilir (Hotmail/e-posta'da YOK) */}
              {saglayiciAd === "Google" && (<>
              <button className="apm-oge" onClick={() => googleAc("https://myaccount.google.com")}>
                <span className="apm-ik" style={{ color: "#4285F4" }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.4" /><path d="M5 20a7 7 0 0 1 14 0" /><circle cx="12" cy="12" r="10" /></svg></span>
                <span className="apm-et">{t("profGoogleHesap")}</span>
                <svg className="apm-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
              <button className="apm-oge" onClick={() => googleAc("https://calendar.google.com")}>
                <span className="apm-ik" style={{ color: "#34A853" }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 3v4M16 3v4M8 14h3v3H8z" /></svg></span>
                <span className="apm-et">{t("profGoogleTakvim")}</span>
                <svg className="apm-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
              </>)}
              <button className="apm-oge apm-kopyala" onClick={epKopyala}>
                <span className="apm-ik" style={{ color: "#FFD700" }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg></span>
                <span className="apm-et">{kopyalandi ? t("profKopyalandi") : t("profKopyala")}</span>
              </button>
            </div>
            <button className="apm-cikis" onClick={cikisYap}>{t("cikisYap")}</button>
          </div>
        </>
      )}

      {/* İkon sırası — SAYFAYA SIĞAR (yana kaymaz, sağa çekince sayfa geçilir);
          yazı SADECE aktif düğmede, sabit satırda (akışı oynatmaz);
          Profil = YUVARLAK, varsa fotoğraf görünür */}
      <nav className="ana-nav">
        {navlar.map((n) => (
          /* PROFİL = kendi PENCERESİ (diğer bölümler gibi: üstte ikonlar + sağ üstte kalem,
             içerik yakında dolacak) — kullanıcının istediği asıl profil sayfası budur */
          <button key={n.k} className={"ana-nav-oge" + (n.k === aktifKod ? " aktif" : "")} onClick={() => setAktifKod(n.k)}>
            <span className={"ana-nav-kutu" + (n.k === "profil" ? " nav-cerceveli" : "")}
              style={n.k === "profil" ? { borderStyle: "solid", borderWidth: "6px", borderColor: "transparent", borderImage: `url(${cerceveResim}) 91 85 96 86 / 6px / 0 stretch`, borderRadius: "8px" } : undefined}>
              {n.k === "profil" && foto ? <img src={foto} alt="" referrerPolicy="no-referrer" /> : Ikon[n.k]}
              {/* Köşe rozeti: SADE mini gömülü taş — kendi renginde, içten yanar, tam köşede.
                  Profil taşı KİMLİĞE göre: profesyonel=KIRMIZI, müşteri=BEYAZ (beyaz müşteri taşıdır) */}
              <span className="ana-nav-rozet"><MiniTas renk={n.k === "profil" ? benimTasAd : (NAV_RENK[n.k] || "mavi")} /></span>
            </span>
            <span className="ana-nav-ad">{n.et}</span>
          </button>
        ))}
      </nav>

      {/* "Profesyonel / Hoş geldin / Meslek Pasaportum" paneli SİLİNDİ (kullanıcı: her sayfada
          çıkıyordu, sil at). Profil ayarları büyük platformlardaki gibi MENÜ > AYARLAR'dan açılır. */}

      {/* PENCERELER — parmakla sola/sağa kaydırınca veya düğmeye basınca DEĞİŞİR */}
      {aktifKod === "home" ? (
        <div className="ana-pencere" key="home">
          {/* TEK HİZA: 2 çip + ORTADA ufak ARAMA düğmesi + 2 çip (çipler ÇERÇEVESİZ, ufak).
              Arama düğmesine basınca şerit AÇILIR (yazılır/aranır), ✕ ile kapanır. */}
          <div className="ana-ara-sar">
            {!araAcik ? (
              /* YAZILAR çevrilir; sadece RAKAMLAR (b) çevrilmez (translate=no) → sayı canlı kalır,
                 donmaz. Düzen: uzun çeviride yazı alt satıra sarar, arama üstüne BİNMEZ. */
              <div className="ana-istat">
                {/* sol grup: yan yana yakın; ortada GENİŞ arama düğmesi (içinde açıklama yazısı); sağ grup yakın */}
                <span className="ist-grup">
                  <span className="ist i1"><b translate="no" className="notranslate"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><circle cx="17" cy="9" r="2.3" /><path d="M16 14.5a4.6 4.6 0 0 1 4.5 4.5" /></svg>50K+</b><i>{t("istProf", "Profesyonel")}</i></span>
                  <span className="ist i2"><b translate="no" className="notranslate"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>195</b><i>{t("istUlke", "Ülke")}</i></span>
                </span>
                <button className="ara-mini" onClick={() => setAraAcik(true)} aria-label={t("anaAraPh")}>{Ikon.ara}<span>{t("tabAra", "Ara")}</span></button>
                <span className="ist-grup">
                  <span className="ist i3"><b translate="no" className="notranslate"><svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" /></svg>4.9</b><i>{t("istPuan", "Puan")}</i></span>
                  <span className="ist i4"><b translate="no" className="notranslate"><u className="ist-nokta" />{cevrim.toLocaleString(dil || "tr")}</b><i>{t("istCevrim", "Çevrimiçi")}</i></span>
                </span>
              </div>
            ) : (
              <>
                <div className="ana-ara">
                  {Ikon.ara}
                  <input className="ana-ara-input" autoFocus value={araQ} onChange={(e) => setAraQ(e.target.value)} placeholder={t("anaAraPh")} />
                  <button className="ara-kapat" onClick={() => { setAraAcik(false); setAraQ(""); }} aria-label="Kapat">✕</button>
                </div>
                {/* SONUÇLAR — yazdıkça kayıtlı profesyoneller (gerçek veri); BOŞken Keşfet önerileri */}
                <div className="ara-sonuc">
                  <div className="ara-baslik">
                    <span>{araYukleniyor ? t("araYukleniyor", "Aranıyor…")
                      : araQ.trim() ? (araSonuc.length + " " + t("araSonucEt", "sonuç"))
                      : t("tabKesfet", "Keşfet")}</span>
                  </div>
                  {!araYukleniyor && araSonuc.length === 0 && (
                    <div className="ara-bos">{araQ.trim() ? t("araYok", "Sonuç bulunamadı")
                      : t("araBosHavuz", "Henüz profesyonel yok — ilk sen ol!")}</div>
                  )}
                  {!araYukleniyor && araSonuc.map((p) => {
                    const ad = [p.isim, p.soyisim].filter(Boolean).join(" ") || "—";
                    const bas = (ad.trim()[0] || "?").toUpperCase();
                    const altbil = [mc(p.pro && p.pro.meslek, dil), p.konum && p.konum.sehir].filter(Boolean).join(" · ");
                    return (
                      <button className="ara-kart" key={p.uid} onClick={() => setAraSecili(p)}>
                        {/* İŞ amblemi/fotoğrafı; yoksa baş harf; Google fotosu (p.foto) ASLA */}
                        <span className={"ara-kart-foto" + (p.isFoto ? " amblem" : "")}>{p.isFoto ? <img src={p.isFoto} alt="" referrerPolicy="no-referrer" /> : p.avatarFoto ? <img src={p.avatarFoto} alt="" referrerPolicy="no-referrer" /> : bas}</span>
                        <span className="ara-kart-bil">
                          <b>{ad} <span className="ara-kart-rozet"><Elmas4 c={p.tip === "profesyonel" ? "#e0202c" : "#cfe8ff"} /></span></b>
                          <i>{altbil || t("uyeProfesyonel", "Profesyonel")}</i>
                        </span>
                        <span className="ara-kart-ok" aria-hidden="true">›</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ARAMA DETAY PENCERESİ — sonuçtan seçilen profesyonelin şık kartı (gerçek veri) */}
          {araSecili && (() => {
            const p = araSecili;
            const ad = [p.isim, p.soyisim].filter(Boolean).join(" ") || "—";
            const bas = (ad.trim()[0] || "?").toUpperCase();
            const meslekDizi = (p.pro && Array.isArray(p.pro.meslekler) && p.pro.meslekler.length) ? p.pro.meslekler : ((p.pro && p.pro.meslek) ? [p.pro.meslek] : []);
            const meslek = meslekDizi.map((m) => mc(m, dil)).join(" · ") || t("uyeProfesyonel", "Profesyonel");
            const sehir = p.konum && p.konum.sehir;
            const ulke = p.konum && p.konum.ulke ? ulkeAdiCevir(p.konum.ulke, dil) : "";
            const konum = [sehir, ulke].filter(Boolean).join(", ");
            const proRenk = uyeTasAd(p); // kişinin üyeliğine göre taş: müşteri=kırmızı, pro=mavi, altın=yeşil
            return (
              <div className="ara-detay-fon" onClick={(e) => { if (e.target === e.currentTarget) setAraSecili(null); }}>
                <div className="ara-detay">
                  <button className="ara-detay-kapat" onClick={() => setAraSecili(null)} aria-label="Kapat">✕</button>
                  {/* İŞ amblemi varsa KENDİ ŞEKLİNDE (dikdörtgen, tam görünür — yuvarlağa kırpılmaz);
                      yoksa profil avatarı yuvarlak; o da yoksa baş harf */}
                  <div className={"ara-detay-foto" + (p.isFoto ? " amblem" : "")}>
                    {p.isFoto ? <img src={p.isFoto} alt="" referrerPolicy="no-referrer" />
                      : p.avatarFoto ? <img src={p.avatarFoto} alt="" referrerPolicy="no-referrer" />
                      : <span>{bas}</span>}
                    <span className="ara-detay-tas"><MiniTas renk={proRenk} /></span>
                  </div>
                  <div className="ara-detay-ad notranslate" translate="no">{ad} <span className="ara-detay-rozet"><Elmas4 c={uyeTasHex(p)} /></span></div>
                  <div className="ara-detay-meslek">{meslek}</div>
                  {konum && (
                    <div className="ara-detay-konum">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5cff9a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
                      {konum}
                    </div>
                  )}
                  <div className="ara-detay-cipler">
                    <span className="adc-cip adc-puan"><svg width="13" height="13" viewBox="0 0 24 24" fill="#FFD700" stroke="none"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" /></svg> 5.0</span>
                    <span className="adc-cip adc-pro">{p.tip === "profesyonel" ? t("pirlantaProfesyonel", "KIRMIZI PIRLANTA · PROFESYONEL") : t("profUye", "ÜYE")}</span>
                  </div>
                  <div className="ara-detay-mesaj">
                    <button className="adm-gonder adm-sohbet" onClick={() => sohbetAc({ uid: p.uid, ad, foto: p.isFoto || p.avatarFoto })}>
                      💬 {t("sohbetiAc", "Sohbeti Aç")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* AKIŞ (feed) — aşağı indikçe dünyadan yeni paylaşımlar */}
          <div className="ana-akis">
            {/* HİKÂYELER — akış üstünde yatay KART şeridi (Facebook gibi). 24 saatte kaybolur. Medya/akış düzenine dokunmaz, ayrı modül. */}
            <div className="hik-serit">
              <input ref={hikFotoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={hikayeSecildi} />
              <input ref={hikVideoInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={hikayeSecildi} />
              <input ref={hikCanliInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={hikayeSecildi} />
              <input ref={hikCanliVidInputRef} type="file" accept="video/*" capture="environment" style={{ display: "none" }} onChange={hikayeSecildi} />
              <input ref={hikSesInputRef} type="file" accept="audio/*" style={{ display: "none" }} onChange={hikSesSecildi} />
              {/* HİKÂYE OLUŞTUR kartı — dokununca SEÇENEK ekranı açılır (Foto/Video/Yazı) */}
              <button className="hik-kart hik-olustur" onClick={() => { if (!hikayeYuk) setHikSecimAcik(true); }}>
                <span className="hik-kart-foto">{foto
                  ? <span className="hik-kart-medyasar"><img className="hik-kart-medya" src={foto} alt="" referrerPolicy="no-referrer" /></span>
                  : <span className="hik-kart-harf">{(benimHikayeKisi.ad[0] || "?").toUpperCase()}</span>}</span>
                <span className="hik-kart-serit">
                  <span className="hik-kart-arti-satir">
                    <span className="hik-parilti" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 1.4l2.4 7.3 7.4 2.3-7.4 2.3L12 20.6l-2.4-7.3L2.2 11l7.4-2.3z"/></svg></span>
                    <span className="hik-kart-arti">{hikayeYuk ? "…" : "+"}</span>
                    <span className="hik-parilti" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 1.4l2.4 7.3 7.4 2.3-7.4 2.3L12 20.6l-2.4-7.3L2.2 11l7.4-2.3z"/></svg></span>
                  </span>
                  <span className="hik-kart-ad notranslate" translate="no">{hikayeYuk ? t("hikayeYukleniyor", "Yükleniyor…") : HIKAYE_AD}</span>
                </span>
              </button>
              {/* HERKESİN hikaye kartı (kendisi dahil) — kapak = EN SON hikaye (görüntüleyicide de ilk o oynar) */}
              {hikayeGruplar.map((g) => {
                const gi = hikayeGruplar.indexOf(g);
                const kapak = g.ogeler[0];
                return (
                  <button className="hik-kart" key={g.uid} onClick={() => hikayeAc(gi)}>
                    <span className="hik-kart-medyasar">
                      {kapak.tip === "video"
                        ? (<video className="hik-kart-medya" src={videoSade(kapak.url)} muted loop autoPlay playsInline preload="metadata" poster={kapak.poster || undefined} tabIndex={-1} onLoadedMetadata={hikKapakYon} />)
                        : (<img className="hik-kart-medya" src={kapak.url} alt="" referrerPolicy="no-referrer" onLoad={hikKapakYon} />)}
                    </span>
                    {g.ogeler.length > 1 && <span className="hik-kart-sayac" aria-label={g.ogeler.length + " hikâye"}>🖼 {g.ogeler.length}</span>}
                    <span className={"hik-kart-av" + (g.yeni ? " yeni" : " gorulen") + (g.amblem ? " amblem" : "")}>{g.foto ? <img src={g.foto} alt="" referrerPolicy="no-referrer" /> : ((g.ad || "?")[0] || "?").toUpperCase()}</span>
                    <span className="hik-kart-isim"><KayanYazi>{((g.ad || "").split(" ")[0]) || "—"}</KayanYazi></span>
                  </button>
                );
              })}
            </div>
            {/* PAYLAŞ kutusu — kendi gönderini ekle (gerçek veri) */}
            <button className="ana-paylas-ac" onClick={() => { setDuzenlenen(null); setPaylasYazi(""); setPaylasBaslik(""); setPaylasTur(""); setPaylasGorsel(""); setPaylasEkFotolar([]); setPaylasVideo(""); setPaylasDurum(""); setPaylasAvatar("profil"); setUstYazi(""); setUstRenk("#ffffff"); setUstBoyut("orta"); setUstYer("alt"); setAiOneriler([]); setPaylasDuzen(null); setPaylasZemin(""); setPaylasYaziRenk(""); setPaylasKonum(null); setKonumDurum(""); setFiligranEkle(true); setGitLinki(false); setYaziMedyaUstunde(false); setAnketAcik(false); setAnketSecenekler(["", ""]); setPaylasAcik(true); }}>
              <span className="ana-paylas-art" aria-hidden="true">+</span>{t("paylasAc", "Bir şeyler paylaş…")}
            </button>
            {/* AKIŞ FİLTRESİ — Sana Özel (algoritma) / Hepsi (zaman) / Takip Ettiklerim */}
            <div className="ana-feed-filtre">
              <button className={"aff-chip aff-ozel" + (feedFiltre === "ozel" ? " aktif" : "")} onClick={() => setFeedFiltre("ozel")}>✨ {t("feedOzel", "Sana Özel")}</button>
              <button className={"aff-chip" + (feedFiltre === "hepsi" ? " aktif" : "")} onClick={() => setFeedFiltre("hepsi")}>{t("feedHepsi", "Hepsi")}</button>
              <button className={"aff-chip" + (feedFiltre === "takip" ? " aktif" : "")} onClick={() => setFeedFiltre("takip")}>{t("feedTakip", "Takip Ettiklerim")}</button>
            </div>
            {/* GERÇEK gönderiler önce, sonra örnek akış (platform boş kalmasın) */}
            {feedFiltre === "takip" && gercekAkis.filter((p) => { const h = p.uid || p.sahipUid; return h && takipSet.has(h); }).length === 0 && (
              <div className="ana-feed-bos">{t("feedTakipBos", "Henüz kimseyi takip etmiyorsun. Gönderilerdeki + Takip düğmesine bas; burada onların paylaşımları görünür.")}</div>
            )}
            {(() => { const feedTam = (feedFiltre === "takip" ? gercekAkis.filter((p) => { const h = p.uid || p.sahipUid; return h && takipSet.has(h); }) : feedFiltre === "ozel" ? kisiselAkis : gercekAkis); return feedTam.slice(0, feedGoster).map((p, i) => {
              const ad = p.ad || "—";
              const bas = (String(ad).trim()[0] || "?").toUpperCase();
              const zaman = p.zaman || zamanOnce(p.zamanMs);
              const anahtar = p.id || ("s" + i);
              const _amb = postAmblem(p); // gönderi türü amblemi + rengi
              const pc = _amb ? _amb.renk : POST_RENK[i % POST_RENK.length]; // KENAR rengi = türün rengi (gelişigüzel değil)
              // KATEGORİ ROZETİ — postun NEREDEN geldiği (Tavsiye/Duyuru/Video...) sağ-üst köşede yazı+ikon, kategori renginde.
              // Renk gelişigüzel DEĞİL → her kategori sabit renk (TUR_AMBLEM). Beyaz hap + kategori renkli ikon → her perdede okunur.
              const katAd = p.tur ? turGoster(p.tur) : ({ foto: "Fotoğraf", video: "Video", is: "İş İlanı", urun: "Ürün/Hizmet", tavsiye: "Tavsiye", etkinlik: "Etkinlik", duyuru: "Duyuru", soru: "Soru/Yardım", yazi: "Paylaşım" }[_amb.tip] || "Paylaşım");
              const katRozet = (
                <span className="apr-kategori notranslate" translate="no" title={katAd}>
                  <span className="apr-kategori-ik" style={{ color: pc }} aria-hidden="true"><TurAmblem tip={_amb.tip} /></span>
                  <span className="apr-kategori-ad">{katAd}</span>
                </span>
              );
              const uzun = p.yazi && p.yazi.length > 120;
              const acik = !!acikYazi[anahtar];
              const medyaVar = !!(p.gorsel || p.video);
              // PIRLANTA RENGİ = yazarın ÜYELİĞİ (kullanıcı: her yerde profiline göre). Müşteri=kırmızı, pro=mavi, altın=yeşil.
              // KENDİ gönderimde temam anında bilinir (benimTasHex); başkasında gönderide saklı pro/uyelik alanları.
              const kendiPost = p.uid && u && p.uid === u.uid;
              const rozRenk = kendiPost ? benimTasHex : uyeTasHex(p);
              // KENDİ gönderimde avatar HER ZAMAN GÜNCEL profil fotom (eski paylaşımda eski foto kalmasın); amblemli gönderi hariç
              const postFoto = (kendiPost && !p.amblem && foto) ? foto : p.foto;
              const meslekRenk = MESLEK_RENK[p.meslek] || "#FFD700"; // meslek kendi renginde
              const mesajAc = () => { if (p.uid && p.ad) sohbetAc({ uid: p.uid, ad: p.ad, foto: p.foto }); };
              // ÇOK MEDYALI gönderi → galeri (parmakla yana kaydır); tek medyalı → eski tekli görünüm
              const postMedyalar = (p.medyalar && p.medyalar.length > 1) ? p.medyalar : null;
              // CANLI KONUM ROZETİ — "nereden paylaşıldı" (üstte, renkli, belirgin)
              const konumRozet = (p.konum && p.konum.tam) ? (
                <div className="apr-konum notranslate" translate="no">
                  <span className="apr-konum-ik" aria-hidden="true">📍</span>
                  <span className="apr-konum-yer">{p.konum.yer || p.konum.tam}</span>
                  {p.konum.yer && (p.konum.sehir || p.konum.ulke) && <span className="apr-konum-alt">{[p.konum.sehir, p.konum.ulke].filter(Boolean).join(", ")}</span>}
                </div>
              ) : null;
              const yazan = (
                <span className="apr-yazan apr-yazan-ust">
                  <span className={"apr-av uye-ac" + (p.amblem ? " amblem" : "")} style={{ background: p.renk || ("linear-gradient(145deg," + pc + ",#0d1b3a)") }} onClick={(e) => { e.stopPropagation(); uyeyiAc(p); }}>{postFoto ? <img src={postFoto} alt="" referrerPolicy="no-referrer" /> : bas}</span>
                  <span className="apr-bil">
                    <b className="notranslate" translate="no">{ad} <span className="ana-post-rozet"><Elmas4 c={rozRenk} /></span></b>
                    <i><span className="apr-meslek" style={{ color: meslekRenk }}>{mc(p.meslek, dil)}</span>{(p.sehir || zaman) && <span className="apr-zaman"> · {[p.sehir, zaman].filter(Boolean).join(" · ")}</span>}</i>
                  </span>
                  {/* takip SOLDA, kategori rozeti TAM SAĞDA (kullanıcı: tam sağda ikon, solunda takip) */}
                  {p.uid && u && p.uid !== u.uid && (
                    <button className={"apr-takip takip-ik" + (takipSet.has(p.uid) ? " ediliyor" : "") + (takipBalon === p.uid ? " balon-gor" : "")} onClick={(e) => { e.stopPropagation(); takipToggle(p); }} aria-label={takipSet.has(p.uid) ? t("takipEdiliyor", "Takip ✓") : t("takipEt", "+ Takip")}>
                      {takipSet.has(p.uid)
                        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3.2 2.5-5 5.5-5s5.5 1.8 5.5 5" /><path d="M19 8v6M22 11h-6" /></svg>}
                      <span className="takip-balon">{takipSet.has(p.uid) ? t("takipEdiliyor", "Takip ✓") : t("takipEt", "+ Takip")}</span>
                    </button>
                  )}
                  {katRozet}
                </span>
              );
              if (medyaVar) {
                // İMMERSİF MEDYA KARTI — her şey fotoğrafın ÜZERİNDE (TikTok gibi), çerçeve yok
                // YAZI BLOĞU — varsayılan AYRI şerit (medyayı kapatmaz); p.yaziUstunde ise medyanın üzerinde.
                const yaziBlokIc = p.yazi ? (
                  <>
                    <div translate="no" className={"apr-altyazi notranslate" + (uzun ? " kisa" : "")} onClick={() => uzun && setTamFoto(p)}>{metniLinkle((ceviri[anahtar] && ceviri[anahtar].acik && ceviri[anahtar].metin) ? ceviri[anahtar].metin : p.yazi)}{uzun && <span className="ana-post-devam">{t("devamOku", " …devamını oku")}</span>}</div>
                    <span className="apr-alt-arac">
                      <button className="apr-cevir" onClick={(e) => { e.stopPropagation(); cevirToggle(p, anahtar); }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" /></svg>
                        {ceviri[anahtar] && ceviri[anahtar].yuk ? t("ceviriliyor", "Çevriliyor…") : (ceviri[anahtar] && ceviri[anahtar].acik ? t("orijinalGoster", "Orijinal") : t("cevir", "Çevir"))}
                      </button>
                      <button className="apr-cevir apr-ai" onClick={(e) => { e.stopPropagation(); yaziAISor(p); }} aria-label={t("yaziAiSor", "GLOXORG'a sor")}><span className="apr-ai-tas" aria-hidden="true"><Elmas4 c="#FFD700" /></span>{t("aiSor", "Sor")}</button>
                    </span>
                  </>
                ) : null;
                return (
                  <article className={"ana-post ana-post-im " + (p.video ? "post-video" : "post-foto")} key={anahtar} style={{ "--pc": pc, "--sep": p.video ? "#e0202c" : "#0d0a05" }}>
                    {/* PROFİL/İSİM/MESLEK — fotoğrafın DIŞINDA, ÜSTTE ayrı şerit (ANA SAYFADA HEP AYRI — bozma) */}
                    {yazan}
                    {konumRozet}
                    {p.baslik && (
                      <div className={"ana-post-baslik" + (baslikAcikSet.has(p.id) ? " acik" : "")} onClick={(e) => e.stopPropagation()}>
                        <span className="ana-post-baslik-metin">{p.baslik}</span>
                        {p.baslik.length > 70 && (
                          <button className="ana-post-baslik-dev" onClick={(e) => { e.stopPropagation(); setBaslikAcikSet((s) => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; }); }}>
                            {baslikAcikSet.has(p.id) ? t("gizle", "gizle") : t("devamOku", "…devamını oku")}
                          </button>
                        )}
                      </div>
                    )}
                    <div className={"apr-medya" + (p.video && !postMedyalar ? " video" : "") + (postMedyalar ? " kolaj-sar" : "")} onClick={() => { if (!postMedyalar) setTamFoto(p); }}>
                      {postMedyalar
                        ? (() => {
                            const liste = postMedyalar.map((x) => ({ tip: x.tip, src: x.tip === "video" ? videoSade(x.url) : (x.data || x.url), poster: x.poster }));
                            const ac = (idx) => setOnizGaleri({ liste, i: idx });
                            // PENCERE FOTOĞRAFA GÖRE AYARLANIR: her medyanın oranını ölç → kolaj kutusunun EN-BOY oranını ona göre kur
                            // (pencere büyür/kısalır, alt-üst SİYAH BANT olmaz, medya cover ile doldurur → net). Kullanıcı: "pencere fotoğraflara göre büyüsün kısalsın".
                            const n0 = postMedyalar.length;
                            // Kutu EN-BOY oranı = SADECE İLK (temel/büyük) medyanın oranına göre (kullanıcı: "dikeyi baz al, yataya göre kısaltma").
                            // Böylece ilk dikey video/foto TAM dik gelir; yanındaki yatay medya kendi yönünde (contain) + boşluk ALTIN TOZU.
                            const kolajGuncelle = (k) => {
                              try {
                                if (!k) return;
                                // Kullanıcı: "pencereyi VİDEOYA göre ayarla (fotoğrafı referans alma), yoksa video kesiliyor."
                                // Kolajda VİDEO varsa onun oranını referans al; yoksa ilk (temel) medya.
                                const vidFg = k.querySelector(".apr-kolaj-oge.vid .apr-kolaj-fg");
                                const ilk = vidFg || k.querySelector(".apr-kolaj-fg");
                                const a0 = ilk ? Number(ilk.dataset.oran) : 0;
                                if (!(a0 > 0)) return; // temel medya daha yüklenmedi → bekle (yüklenince tekrar çağrılır)
                                let R = (n0 === 2) ? (2 * a0) : (a0 * 1.645); // 2'li: ilk kare %50 → R=2*oran; 3+: büyük kare 1.55/2.55 → R=oran*1.645
                                R = Math.max(0.62, Math.min(1.4, R)); // kullanıcı: pencere UZUN olsun (kısa kalmasın) → geniş kolaj bile en fazla 1.4 oran (yani UZUN/dikeyimsi)
                                k.style.aspectRatio = R.toFixed(3);
                                // VİDEOLU kolaj → max-height SINIRINI KALDIR (yatay telefonda pencereyi kısaltıp videoyu küçültmesin) → pencere videoya göre açılır, video BÜYÜK+TAM
                                k.style.maxHeight = vidFg ? "none" : "";
                              } catch (x) {}
                            };
                            const yonAyarla = (e) => { try { const el = e.target; const w = el.naturalWidth || el.videoWidth || 0; const h = el.naturalHeight || el.videoHeight || 0; if (w && h) { el.dataset.oran = (w / h).toFixed(4); kolajGuncelle(el.closest(".apr-kolaj")); } } catch (x) {} };
                            const oge = (m, idx, fazla, ana) => {
                              const src = m.tip === "video" ? videoSade(m.url) : (m.data || m.url);
                              return (
                                // TEMEL (ilk/büyük) kare → cover (pencereyi doldurur, o zaten baz); YAN kareler → contain + ALTIN TOZU zemin (kendi yönünde tam, kesilmez)
                                <div className={"apr-kolaj-oge" + (m.tip === "video" ? " vid" : "") + (ana ? " temel" : " yan-oge")} key={idx} onClick={(e) => { e.stopPropagation(); ac(idx); }}>
                                  {m.tip === "video"
                                    ? <><video className="apr-kolaj-fg" src={src} poster={m.poster || undefined} preload="metadata" muted loop playsInline tabIndex={-1} onLoadedMetadata={yonAyarla} /><span className="apr-kolaj-oynat" aria-hidden="true">▶</span><span className="apr-kolaj-glox" aria-hidden="true">◈ GLOXORG</span></>
                                    : <img className="apr-kolaj-fg" src={src} alt="" referrerPolicy="no-referrer" onLoad={yonAyarla} />}
                                  {fazla > 0 && <span className="apr-kolaj-fazla">+{fazla}</span>}
                                </div>
                              );
                            };
                            const n = postMedyalar.length;
                            return (
                              <div className={"apr-kolaj n" + Math.min(n, 3)} onClick={(e) => e.stopPropagation()}>
                                {n === 2
                                  ? postMedyalar.map((m, i) => oge(m, i, 0, i === 0))
                                  : <>
                                      <div className="apr-kolaj-buyuk">{oge(postMedyalar[0], 0, 0, true)}</div>
                                      <div className="apr-kolaj-yan">
                                        {oge(postMedyalar[1], 1, 0)}
                                        {oge(postMedyalar[2], 2, n > 3 ? n - 3 : 0)}
                                      </div>
                                    </>}
                                <span className="apr-galeri-say" aria-hidden="true">🖼 {n}</span>
                              </div>
                            );
                          })()
                        : p.video
                        ? <video src={videoSade(p.video)} poster={p.videoPoster || undefined} preload="metadata" muted loop playsInline tabIndex={-1} />
                        : <img src={p.gorsel} alt="" referrerPolicy="no-referrer" onLoad={(e) => { if (e.target.naturalHeight > e.target.naturalWidth * 1.04) e.target.parentNode.classList.add("uzun"); else e.target.parentNode.classList.remove("uzun"); }} />}
                      {/* TÜR ikonu (apr-tipikon) KALDIRILDI — kategori artık üst şeritteki rozette (tek gösterge). */}
                      {p.ustYazi && p.ustYazi.metin && <span className={"apr-ustyazi yer-" + (p.ustYazi.yer || "alt") + " boy-" + (p.ustYazi.boyut || "orta")} style={{ color: p.ustYazi.renk || "#fff" }}>{p.ustYazi.metin}</span>}
                      {/* YAZI medyanın ÜZERİNDE — yalnız kullanıcı öyle istediyse (p.yaziUstunde) */}
                      {yaziBlokIc && p.yaziUstunde && (
                        <div className="apr-alt" onClick={(e) => e.stopPropagation()}>{yaziBlokIc}</div>
                      )}
                      {/* Sağ-ALT GLOXORG amblemi — SADECE VİDEO'da (fotoğrafa GLOXORG zaten gömülü/baked → ikinci rozet ÇİFT olmasın, kullanıcı isteği) */}
                      {p.video && !postMedyalar && <span className="ana-post-medya-rozet notranslate" translate="no"><Elmas4 c="#ffd700" /> GLOXORG</span>}
                    </div>
                    {/* YAZI AYRI ŞERİT (varsayılan) — medyanın ALTINDA, onu KAPATMAZ; 2 satır + devamını oku (tam ekranda hepsi) */}
                    {yaziBlokIc && !p.yaziUstunde && (
                      <div className="apr-yazi-serit" onClick={(e) => e.stopPropagation()}>{yaziBlokIc}</div>
                    )}
                    {anketBlok(p)}
                    {p.dosya && p.dosya.url && (
                      <a className="ana-post-dosya" href={p.dosya.url} target="_blank" rel="noreferrer">
                        <span className="ana-post-dosya-ik">📎</span>
                        <span className="ana-post-dosya-ad">{p.dosya.ad || t("dosya", "Dosya")}</span>
                        <span className="ana-post-dosya-in">{t("dosyaIndir", "İndir")}</span>
                      </a>
                    )}
                    {/* İKON ŞERİDİ — fotoğrafın/videonun ALTINDA, AYRI şerit (medyanın üzerinde DEĞİL) */}
                    <div className={"apr-rail" + (p.video ? " video" : "")} onClick={(e) => e.stopPropagation()}>
                      <button className={"apr-ic ape-kalp" + (begeniSet.has(p.id) ? " dolu" : "") + (kalpPatla === p.id ? " patla" : "")} onClick={() => begeniTik(p)} onPointerDown={() => begeniBas(p)} onPointerUp={begeniBirak} onPointerLeave={begeniBirak} onPointerCancel={begeniBirak}>{begeniIkon(p)}{tepkiCubugu(p)}{kalpPatla === p.id && <span className="kalp-patla" aria-hidden="true"><i/><i/><i/><i/><i/></span>}<span className="apr-sayi">{((gercekBegeni[p.id] != null ? gercekBegeni[p.id] : (p.begeni || 0))).toLocaleString()}</span></button>
                      <button className="apr-ic ape-yorum" onClick={() => yorumAc(p)}>{Ikon.yorum}<span>{p.yorumSayisi ? p.yorumSayisi : ""}</span></button>
                      <button className="apr-ic ape-paylas" onClick={() => paylasNative(p)}>{Ikon.paylas}</button>
                      <button className={"apr-ic apr-kaydet" + (kaydetSet.has(p.id) ? " dolu" : "")} onClick={() => kaydetToggle(p)}>{Ikon.kaydet}</button>
                      <button className="apr-ic ape-mesaj" onClick={mesajAc}>{Ikon.mesaj}</button>
                    </div>
                    {/* BEĞENENLER — beğeni ikonunun altında ufak profil resimleri */}
                    <span className="serit-grup"><BegenenlerSerit postId={p.id} sayi={p.begeni || 0} dil={dil} onAc={begenenlerAc} onSayi={begeniSayiBildir} /><YorumcuSerit postId={p.id} sayi={p.yorumSayisi || 0} onAc={() => yorumAc(p)} /></span>
                    {/* MARKA ŞERİDİ TAMAMEN KALDIRILDI (kullanıcı istedi): gloxorg.com artık paylaşımların altında HİÇ çıkmaz (eski gönderilerde de). Kullanıcı Ayarlar'dan kopyalayıp istediği yere koyacak. */}
                  </article>
                );
              }
              // METİN gönderi — klasik kart. KULLANICI KURALI (KESİN): ÇERÇEVE (profil+ikon) = KATEGORİ rengi (--pc, Duyuru=pembe...);
              // İÇ YAZI ZEMİNİ ise ÇERÇEVEDEN FARKLI (yazarın seçtiği p.zemin, yoksa koyu lacivert). İki ayrı renk; tek parça DEĞİL.
              const icZemin = p.zemin || "#16223e";
              return (
                <article className="ana-post ana-post-zemin" key={anahtar} style={{ "--pc": pc, "--sep": "#0d0a05" }}>
                  {/* Sağ-üst absolute tür amblemi KALDIRILDI — takip yeşil yuvarlağıyla ÜST ÜSTE biniyordu;
                      tür zaten ismin yanında "ana-post-tur" rozetinde yazılı (çakışma giderildi). */}
                  <div className="ana-post-bas">
                    <span className={"ana-post-avatar uye-ac" + (p.amblem ? " amblem" : "")} style={{ background: p.renk || ("linear-gradient(145deg," + pc + ",#0d1b3a)") }} onClick={(e) => { e.stopPropagation(); uyeyiAc(p); }}>
                      {postFoto ? <img className="ana-post-avatar-img" src={postFoto} alt="" referrerPolicy="no-referrer" /> : (p.h || bas)}
                    </span>
                    <div className="ana-post-kim">
                      <div className="ana-post-ad">{ad} <span className="ana-post-rozet"><Elmas4 c={rozRenk} /></span></div>
                      <div className="ana-post-alt"><span style={{ color: meslekRenk }}>{mc(p.meslek, dil)}</span>{(p.sehir || zaman) && <span className="apr-zaman"> · {[p.sehir, zaman].filter(Boolean).join(" · ")}</span>}</div>
                    </div>
                    {p.uid && u && p.uid !== u.uid && (
                      <button className={"apr-takip ana-takip takip-ik" + (takipSet.has(p.uid) ? " ediliyor" : "") + (takipBalon === p.uid ? " balon-gor" : "")} onClick={(e) => { e.stopPropagation(); takipToggle(p); }} aria-label={takipSet.has(p.uid) ? t("takipEdiliyor", "Takip ✓") : t("takipEt", "+ Takip")}>
                        {takipSet.has(p.uid)
                          ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                          : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3.2 2.5-5 5.5-5s5.5 1.8 5.5 5" /><path d="M19 8v6M22 11h-6" /></svg>}
                        <span className="takip-balon">{takipSet.has(p.uid) ? t("takipEdiliyor", "Takip ✓") : t("takipEt", "+ Takip")}</span>
                      </button>
                    )}
                    {katRozet}
                    {p.puan && <span className="ana-post-puan">★ {p.puan}</span>}
                  </div>
                  {konumRozet}
                  {p.baslik && (
                    <div className={"ana-post-baslik ust" + (baslikAcikSet.has(p.id) ? " acik" : "")} onClick={(e) => e.stopPropagation()}>
                      <span className="ana-post-baslik-metin">{p.baslik}</span>
                      {p.baslik.length > 70 && (
                        <button className="ana-post-baslik-dev" onClick={(e) => { e.stopPropagation(); setBaslikAcikSet((s) => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; }); }}>
                          {baslikAcikSet.has(p.id) ? t("gizle", "gizle") : t("devamOku", "…devamını oku")}
                        </button>
                      )}
                    </div>
                  )}
                  {p.yazi && (
                    /* UZUN yazıya basınca AYRI pencerede (tam ekran okuyucu) açılır — ana sayfada dev metin olarak açılıp kalmaz (✕ ile kapanır) */
                    <div ref={kesikOlc(anahtar)} translate="no" className="ana-post-yazi notranslate buyuk kisa" style={(() => { const _n = (p.yazi || "").length; const fs = _n > 1400 ? 11.5 : _n > 900 ? 12 : _n > 600 ? 12.5 : _n > 320 ? 13 : 13.5; return { background: icZemin, color: p.yaziRenk || "#fff", fontSize: fs + "px", lineHeight: 1.36 }; })()} onClick={() => setTamFoto(p)}>
                      {metniLinkle((ceviri[anahtar] && ceviri[anahtar].acik && ceviri[anahtar].metin) ? ceviri[anahtar].metin : p.yazi)}
                    </div>
                  )}
                  {p.yazi && (
                    /* ÇEVİR + "devamını oku" → yazının İÇİNDE, SAĞDA (yazının bittiği yerde); "devamını oku" SADECE yazı kesilince */
                    <div className="ana-post-altsatir" style={{ background: icZemin }}>
                      {kesik[anahtar] && <span className="ana-post-devam" onClick={() => setTamFoto(p)}>{t("devamOku", "… devamını oku")}</span>}
                      <button className="ana-post-cevir" onClick={(e) => { e.stopPropagation(); cevirToggle(p, anahtar); }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" /></svg>
                        {ceviri[anahtar] && ceviri[anahtar].yuk ? t("ceviriliyor", "Çevriliyor…") : (ceviri[anahtar] && ceviri[anahtar].acik ? t("orijinalGoster", "Orijinal") : t("cevir", "Çevir"))}
                      </button>
                    </div>
                  )}
                  {p.medya && (
                    <div className="ana-post-medya" style={{ background: p.medya }}>
                      <span className="ana-post-medya-rozet notranslate" translate="no"><Elmas4 c="#ffd700" /> GLOXORG</span>
                    </div>
                  )}
                  {anketBlok(p)}
                  {p.dosya && p.dosya.url && (
                    <a className="ana-post-dosya" href={p.dosya.url} target="_blank" rel="noreferrer">
                      <span className="ana-post-dosya-ik">📎</span>
                      <span className="ana-post-dosya-ad">{p.dosya.ad || t("dosya", "Dosya")}</span>
                      <span className="ana-post-dosya-in">{t("dosyaIndir", "İndir")}</span>
                    </a>
                  )}
                  <div className="ana-post-eylem">
                    <button className={"ana-post-btn ape-kalp" + (begeniSet.has(p.id) ? " dolu" : "") + (kalpPatla === p.id ? " patla" : "")} onClick={() => begeniTik(p)} onPointerDown={() => begeniBas(p)} onPointerUp={begeniBirak} onPointerLeave={begeniBirak} onPointerCancel={begeniBirak}>{begeniIkon(p)}{tepkiCubugu(p)}{kalpPatla === p.id && <span className="kalp-patla" aria-hidden="true"><i/><i/><i/><i/><i/></span>}<span>{(p.begeni || 0).toLocaleString()}</span></button>
                    <button className="ana-post-btn ape-yorum" onClick={() => yorumAc(p)}>{Ikon.yorum}<span>{p.yorumSayisi ? p.yorumSayisi : ""}</span></button>
                    <button className="ana-post-btn ape-paylas" onClick={() => paylasNative(p)}>{Ikon.paylas}<span></span></button>
                    <button className={"ana-post-btn apr-kaydet" + (kaydetSet.has(p.id) ? " dolu" : "")} onClick={() => kaydetToggle(p)}>{Ikon.kaydet}</button>
                    <button className="ana-post-btn ape-mesaj" onClick={mesajAc}>{Ikon.mesaj}</button>
                  </div>
                  {/* BEĞENENLER — ufak istiflenmiş profil resimleri (gerçek beğeni varsa) */}
                  <span className="serit-grup"><BegenenlerSerit postId={p.id} sayi={p.begeni || 0} dil={dil} onAc={begenenlerAc} onSayi={begeniSayiBildir} /><YorumcuSerit postId={p.id} sayi={p.yorumSayisi || 0} onAc={() => yorumAc(p)} /></span>
                  {/* MARKA ŞERİDİ TAMAMEN KALDIRILDI (kullanıcı istedi): gloxorg.com paylaşımların altında hiç çıkmaz. Ayarlar'dan kopyalanır. */}
                </article>
              );
            }).flatMap((node, idx, arr) => {
              /* Makara şeridi akışta SADECE BİR KERE geçer (3. gönderiden sonra; feed kısaysa son gönderiden sonra) — tekrarlanmaz (performans + kullanıcı isteği) */
              const sokIndex = Math.min(2, arr.length - 1);
              return (idx === sokIndex && reelListesi.length > 0) ? [node, reelsSeridi("reelserit")] : node;
            }).concat(feedTam.length > feedGoster ? <div key="feed-nob" ref={feedSonRef} className="feed-nobetci" aria-hidden="true" /> : []); })()}
          </div>
          {/* "Profesyonel misin? Üye ol" bandı KALDIRILDI (kullanıcı: ana sayfadan çıkar) — pro daveti menüde duruyor */}
        </div>
      ) : aktifKod === "profil" ? (
        /* PROFİLİM penceresi — kendi sayfasında açılır/kapanır, profilde kalınır (ANAYASA 6.15).
           Foto SADECE buradan yüklenir (Google fotosu değil) */
        <div className="ana-pencere apf-pencere" key="profil">
          {/* Dosya girişleri HER ZAMAN bağlı (unmount olmaz). accept KALDIRILDI — bilgisayarda
              "image/*" filtresi bazı dosyalarda "Aç" düğmesini kilitliyordu; tür JS'te kontrol edilir. */}
          <input ref={fotoInputRef} type="file" accept="image/*" onChange={fotoSec} style={{ display: "none" }} />
          <input ref={isInputRef} type="file" accept="image/*" onChange={isFotoSec} style={{ display: "none" }} />
          <input ref={galeriInputRef} type="file" accept="image/*" onChange={galeriSec} style={{ display: "none" }} />
          {/* Düzenleyici açıkken foto ekle/değiştir (yazı/ayar sıfırlanmaz) */}
          <input ref={editorFotoInputRef} type="file" accept="image/*" onChange={editorFotoEkle} style={{ display: "none" }} />
          {duzenAcik && duzenHedef !== "paylas" ? (
            /* DÜZENLEYİCİ — çok katmanlı: amblem DİK DÖRTGEN, profil yuvarlak. Önizleme üstte SABİT (yapışık),
               ayarlar altında kaydırılır; foto hep görünür. */
            <div className="apf-duzen">
              <div className="apf-oniz-sar">
                <canvas ref={onizRef} className={"apf-oniz " + sekil} width={ONIZ_W} height={ONIZ_H}
                  onPointerDown={duzenSurukBas} onPointerMove={duzenSurukHar} onPointerUp={duzenSurukBit} onPointerCancel={duzenSurukBit} />
                {/* Katman şeridi: foto/yazı seç-sil + YENİ foto / YENİ yazı ekle (sınırsız satır) */}
                <div className="apf-katmanlar">
                  {katmanlar.map((kat, i) => (
                    <div className={"apf-kat" + (i === secili ? " sec" : "") + (kat.tip === "yazi" ? " yazi" : "")} key={i} onClick={() => setSecili(i)}>
                      {kat.tip === "yazi"
                        ? <span className="apf-kat-yazi">{(kat.metin || "T").slice(0, 3)}</span>
                        : <canvas width="40" height="40" ref={(el) => { if (el && kat.img) { const cx = el.getContext("2d"); cx.clearRect(0, 0, 40, 40); const t2 = 40 / Math.min(kat.img.width, kat.img.height); cx.drawImage(kat.img, (40 - kat.img.width * t2) / 2, (40 - kat.img.height * t2) / 2, kat.img.width * t2, kat.img.height * t2); } }} />}
                      <button className="apf-kat-sil" onClick={(ev) => { ev.stopPropagation(); katmanSil(i); }} aria-label="sil">×</button>
                    </div>
                  ))}
                  <button className="apf-kat-ekle" onClick={() => editorFotoInputRef.current && editorFotoInputRef.current.click()} title={t("profFotoEkle", "Fotoğraf Ekle")}>+🖼</button>
                  <button className="apf-kat-ekle yazi" onClick={yaziEkle} title={t("profYaziEkle", "Yazı Ekle")}>+T</button>
                </div>
                <div className="apf-ipucu">{t("profSurukleTumu", "Bir öğeye dokun, parmağınla taşı · sil için ×")}</div>
              </div>

              <div className="apf-arac-akis" onPointerDown={klavyeKapatDokun}>
                {/* SEÇİLİ YAZI katmanı: metin + yazı tipi + boyut + renk + çevir */}
                {aktifK && aktifK.tip === "yazi" && (
                  <>
                    <textarea className="apf-yazi-input" value={aktifK.metin} onChange={(e) => kGuncelle({ metin: e.target.value })} placeholder={t("profUstYazi", "Yazını yaz (sınırsız — uzun yazı alt satıra kayar)")} maxLength={5000} rows={2} />
                    <div className="apf-renk-sar apf-font-sar"><span>{t("profYaziTipi", "Yazı tipi")}</span>
                      {YAZI_TIPLERI.map(([f, ad, ck]) => (
                        <button key={f} className={"apf-font" + (aktifK.font === f ? " sec" : "")} style={{ fontFamily: f }} onClick={() => yaziTipiSec(f)}>{t(ck, ad)}</button>
                      ))}
                    </div>
                    <label className="apf-zoom"><span>{t("profYaziBoy", "Yazı boyutu")} <b>%{Math.round(aktifK.boy * 100)}</b></span>
                      <input type="range" min="0.4" max="3" step="0.05" value={aktifK.boy} onChange={(e) => kGuncelle({ boy: parseFloat(e.target.value) })} />
                    </label>
                    <div className="apf-arac"><button className="apf-cevir" onClick={() => kGuncelle({ rot: (aktifK.rot || 0) + 15 })}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v4h-4" /></svg>{t("profCevir", "Çevir")}</button></div>
                    <div className="apf-renk-sar"><span>{t("profYaziRenk", "Yazı")}</span>
                      {YAZI_RENKLER.map((c) => (
                        <button key={c} className={"apf-renk" + (aktifK.renk === c ? " sec" : "")} style={{ background: c }} onClick={() => kGuncelle({ renk: c })} aria-label={c} />
                      ))}
                      <label className="apf-konsantrat" title={t("profKendiRenk", "Kendi rengin")}>
                        <input type="color" value={aktifK.renk} onChange={(e) => kGuncelle({ renk: e.target.value })} />
                      </label>
                    </div>
                  </>
                )}
                {/* SEÇİLİ FOTO katmanı: boyut + parlaklık + kontrast + S/B + çevir */}
                {aktifK && aktifK.tip === "foto" && (
                  <>
                    <div className="apf-arac">
                      <button className="apf-cevir" onClick={() => kGuncelle({ rot: (aktifK.rot || 0) + 90 })}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v4h-4" /></svg>
                        {t("profCevir", "Çevir")}
                      </button>
                      <button className={"apf-cevir" + (aktifK.gri ? " sec" : "")} onClick={() => kGuncelle({ gri: aktifK.gri ? 0 : 1 })}>{t("profSB", "Siyah-Beyaz")}</button>
                    </div>
                    <label className="apf-zoom"><span>{t("profYakin", "Boyut")} <b>%{Math.round(aktifK.scale * 100)}</b></span>
                      <input type="range" min="0.2" max="3" step="0.01" value={aktifK.scale} onChange={(e) => kGuncelle({ scale: parseFloat(e.target.value) })} />
                    </label>
                    <label className="apf-zoom"><span>{t("profParlak", "Parlaklık")} <b>%{Math.round(aktifK.parlak * 100)}</b></span>
                      <input type="range" min="0.4" max="1.8" step="0.01" value={aktifK.parlak} onChange={(e) => kGuncelle({ parlak: parseFloat(e.target.value) })} />
                    </label>
                    <label className="apf-zoom"><span>{t("profKontrast", "Kontrast")} <b>%{Math.round(aktifK.kontrast * 100)}</b></span>
                      <input type="range" min="0.4" max="1.8" step="0.01" value={aktifK.kontrast} onChange={(e) => kGuncelle({ kontrast: parseFloat(e.target.value) })} />
                    </label>
                  </>
                )}
                {/* ZEMİN rengi — her zaman (foto kenarları + amblem arkası). Bol renk + KONSANTRAT (kendin seç) */}
                <div className="apf-renk-sar"><span>{t("profZeminRenk", "Zemin")}</span>
                  {ZEMIN_RENKLER.map((c) => (
                    <button key={c} className={"apf-renk" + (zeminRenk === c ? " sec" : "")} style={{ background: c }} onClick={() => setZeminRenk(c)} aria-label={c} />
                  ))}
                  <label className="apf-konsantrat" title={t("profKendiRenk", "Kendi rengin")}>
                    <input type="color" value={zeminRenk} onChange={(e) => setZeminRenk(e.target.value)} />
                  </label>
                </div>
              </div>

              <div className="apf-duzen-dugme">
                <button className="apf-vazgec" onClick={() => setDuzenAcik(false)}>{t("profilVazgec", "Vazgeç")}</button>
                <button className="apf-kaydet" onClick={fotoKaydet}>{t("profKaydet", "Kaydet")}</button>
              </div>
            </div>
          ) : (
            <>
              {/* ÜÇ BÖLÜM YAN YANA: 1) foto+isim+email  2) amblem  3) meslek kartı.
                  Her bölüm KENDİ ayarını açar (bağımsız). Aynısına basınca kapanır; okey'leyince otomatik kapanır. */}
              <div className="apf-ust">
                <button className={"apf-bol apf-bol-foto" + (acikBolum === "foto" ? " acik" : "")} onClick={() => setAcikBolum((b) => (b === "foto" ? null : "foto"))}>
                  <span className="apf-bol-ayar"><AyarIkon /></span>
                  <div className="apf-foto">{foto ? <img src={foto} alt="" /> : harf}</div>
                  <span className={"apf-pro-rozet" + (proUye ? " pro" : "")}>
                    <span className="apf-pro-tas"><MiniTas renk={benimTasAd} /></span>
                    {proUye ? t("profProUye", "PRO ÜYE") : t("profUye", "ÜYE")}
                  </span>
                  <div className="apf-ad">{adTam}</div>
                  {u && u.email && <div className="apf-eposta">{u.email}</div>}
                </button>

                <button className={"apf-bol apf-bol-amblem" + (acikBolum === "amblem" ? " acik" : "")} onClick={() => setAcikBolum((b) => (b === "amblem" ? null : "amblem"))}>
                  <span className="apf-bol-ayar"><AyarIkon /></span>
                  <div className="apf-is-kare apf-kart-is">{isFoto ? <img src={isFoto} alt="" /> : <span className="apf-is-bos">{t("profIsBos", "Amblem")}</span>}</div>
                  <span className="apf-bol-et">{t("profAmblem", "Amblem")}</span>
                </button>

                <button className={"apf-bol apf-bol-meslek" + (acikBolum === "meslek" ? " acik" : "")} onClick={() => setAcikBolum((b) => (b === "meslek" ? null : "meslek"))}>
                  <span className="apf-bol-ayar"><AyarIkon /></span>
                  <div className="apf-meslek-kart">
                    <span className="apf-meslek-rol">{proUye ? t("pirlantaProfesyonel", "KIRMIZI PIRLANTA · PROFESYONEL") : t("profUye", "ÜYE")}</span>
                    <b>{meslekAd ? mc(meslekAd, dil) : t("profMeslekSec", "Meslek seç")}</b>
                    {konumYazi && <i>{konumYazi}</i>}
                  </div>
                </button>
              </div>

              {/* PAYLAŞIMLARIM — kendi gönderilerim (düzenle / sil); yayınladıkça otomatik gelir */}
              <div className="apf-paylasimlar">
                {/* Bir şeyler paylaş — Profilim'den de gönderi ekle */}
                <button className="ana-paylas-ac apf-paylas-ac" onClick={() => { setDuzenlenen(null); setPaylasYazi(""); setPaylasBaslik(""); setPaylasTur(""); setPaylasGorsel(""); setPaylasEkFotolar([]); setPaylasVideo(""); setPaylasDurum(""); setPaylasAvatar("profil"); setUstYazi(""); setUstRenk("#ffffff"); setUstBoyut("orta"); setUstYer("alt"); setAiOneriler([]); setPaylasDuzen(null); setPaylasZemin(""); setPaylasYaziRenk(""); setPaylasKonum(null); setKonumDurum(""); setFiligranEkle(true); setGitLinki(false); setYaziMedyaUstunde(false); setAnketAcik(false); setAnketSecenekler(["", ""]); setPaylasAcik(true); }}>
                  <span className="ana-paylas-art" aria-hidden="true">+</span>{t("paylasAc", "Bir şeyler paylaş…")}
                </button>
                {/* BÖLÜM FİLTRELERİ — her tür kendi amblemi+rengiyle */}
                <div className="apf-bolumler">
                  <button className={"apf-bolum" + (profilFiltre === "hepsi" ? " aktif" : "")} style={{ "--bc": "#FFD700" }} onClick={() => setProfilFiltre("hepsi")} title={t("feedHepsi", "Hepsi")} aria-label={t("feedHepsi", "Hepsi")}>
                    <span className="apf-bolum-ad">{t("feedHepsi", "Hepsi")}</span>
                    <span className="apf-bolum-ik"><TurAmblem tip="hepsi" /></span>
                  </button>
                  {PAYLAS_TURLER.map((s) => (
                    <button key={s.ad} className={"apf-bolum" + (profilFiltre === s.ad ? " aktif" : "")} style={{ "--bc": s.renk }} onClick={() => setProfilFiltre(s.ad)} title={t(s.cev, s.ad)} aria-label={t(s.cev, s.ad)}>
                      <span className="apf-bolum-ad">{t(s.cev, s.ad)}</span>
                      <span className="apf-bolum-ik"><TurAmblem tip={s.tip} /></span>
                    </button>
                  ))}
                </div>
                {(() => {
                  const liste = profilFiltre === "hepsi" ? gonderilerim : gonderilerim.filter((g) => (g.tur || (g.video ? "Video" : g.gorsel ? "Fotoğraf" : "")) === profilFiltre);
                  if (gonderilerim.length === 0) return <div className="apf-pay-bos">{t("profPaylasimYok", "Henüz paylaşımın yok. Yukarıdan bir şeyler paylaş.")}</div>;
                  if (liste.length === 0) return <div className="apf-pay-bos">{t("profBolumBos", "Bu bölümde paylaşımın yok.")}</div>;
                  return (<>
                    <div className="apf-pay-bas">{t("profPaylasimlarim", "Paylaşımlarım")} <span className="apf-pay-say">{liste.length}</span></div>
                    {liste.map((g, gi) => {
                      const ga = postAmblem(g); const gk = ga ? ga.renk : POST_RENK[gi % POST_RENK.length];
                      return (
                        <div className="apf-pay-kart" key={g.id} style={{ borderLeftColor: gk }}>
                          {g.gorsel
                            ? <img className="apf-pay-foto" src={g.gorsel} alt="" referrerPolicy="no-referrer" onClick={() => setTamFoto(g)} />
                            : g.video
                              ? <span className="apf-pay-foto apf-pay-vid" onClick={() => setTamFoto(g)}><video src={videoSade(g.video)} poster={g.videoPoster || undefined} preload="metadata" muted playsInline tabIndex={-1} /><span className="apf-pay-oynat" aria-hidden="true"><GercekPirlanta cerceve={false} c="#e0202c" /></span></span>
                              : null}
                          <div className="apf-pay-icerik">
                            {(g.tur || ga) && <span className="apf-pay-tur" style={{ background: gk }}>{ga && <span className="apf-pay-turik"><TurAmblem tip={ga.tip} /></span>}{g.tur ? turGoster(g.tur) : (g.video ? t("paylasVideoTur", "Video") : t("paylasFotoTur", "Fotoğraf"))}</span>}
                            {g.yazi && <div className="apf-pay-yazi">{g.yazi}</div>}
                            <div className="apf-pay-zaman">{zamanOnce(g.zamanMs)}</div>
                          </div>
                          <div className="apf-pay-islem">
                            <button className="apf-pay-duzen apf-islem-ik" onClick={() => gonderiDuzenle(g)} aria-label={t("profDuzenle", "Düzenle")}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                              <span className="apf-islem-balon">{t("profDuzenle", "Düzenle")}</span>
                            </button>
                            <button className="apf-pay-sil apf-islem-ik" onClick={() => gonderiSilEt(g.id)} aria-label={t("profSil", "Sil")}>
                              <span className="apf-sil-emoji" aria-hidden="true">🗑</span>
                              <span className="apf-islem-balon">{t("profSil", "Sil")}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>);
                })()}
              </div>

              {acikBolum && (
                /* ORTALANMIŞ MODAL: arka plan karartmalı, EN ÜSTTE (header'ın üstünde) → her yönde ×
                   tıklanır, içerik kaydırılır; dışına dokun veya × ile kapanır, android geri de kapatır */
                <div className="apf-panel-fon" onClick={() => setAcikBolum(null)}>
                <div className="apf-ayar-panel" onClick={(e) => e.stopPropagation()}>
                  {/* Bu PENCERE açıkken kapatma × (sağ üst, sabit) — android geri de bu paneli kapatır */}
                  <button className="apf-panel-kapat" onClick={() => setAcikBolum(null)} aria-label="kapat">×</button>
                  <div className="apf-panel-ic">
                  {acikBolum === "foto" && (
                    <>
                      <div className="apf-bolum-bas-sar">
                        <div className="apf-bolum-bas">{t("profFotom", "Profil Fotoğrafım")}</div>
                        <button className={"apf-yardim-ac" + (yardimGizli ? "" : " acik")} onClick={() => setYardimGizli((g) => !g)} aria-label="yardım">?</button>
                      </div>
                      {/* Eskiden olduğu gibi PROFİL FOTOĞRAFI burada görünür */}
                      <div className="apf-foto apf-foto-panel">{foto ? <img src={foto} alt="" /> : harf}</div>
                      {!yardimGizli && <div className="apf-yardim">{t("profYardimFoto", "Profil fotoğrafını yükle veya düzenle: yakınlaştır, çevir, üzerine yazı ekle. Birden fazla fotoğraf yükleyip galerine ekleyebilirsin; istediğini ana fotoğraf yaparsın.")}<button className="apf-yardim-kapat" onClick={() => setYardimGizli(true)} aria-label="kapat">×</button></div>}
                      <div className="apf-foto-dugmeler">
                        <button className="apf-foto-btn" onClick={() => fotoInputRef.current && fotoInputRef.current.click()}>
                          {foto ? t("profFotoDegistir", "Fotoğrafı Değiştir") : t("profFotoYukle", "Fotoğraf Yükle")}
                        </button>
                        {foto && <button className="apf-foto-btn ikincil" onClick={mevcutDuzenle}>{t("profFotoDuzenle", "Düzenle")}</button>}
                      </div>
                      <div className="apf-galeri-bas">{t("profGaleri", "Diğer Fotoğraflar")}</div>
                      <div className="apf-galeri">
                        {galeri.map((g, i) => (
                          <div className="apf-gk" key={i}>
                            <img src={g} alt="" onClick={() => galeriAnaYap(g)} title={t("profAnaYap", "Ana fotoğraf yap")} />
                            <button className="apf-gk-sil" onClick={() => galeriSil(i)} aria-label="sil">×</button>
                          </div>
                        ))}
                        {galeri.length < 6 && (
                          <button className="apf-gk-ekle" onClick={() => galeriInputRef.current && galeriInputRef.current.click()} aria-label={t("profFotoEkle", "Fotoğraf Ekle")}>+</button>
                        )}
                      </div>
                    </>
                  )}
                  {acikBolum === "amblem" && (
                    <>
                      <div className="apf-bolum-bas-sar">
                        <div className="apf-bolum-bas"><Elmas4 c="#ffd700" /> {t("profIsAmblem", "İş Amblemi / Fotoğrafı")}</div>
                        <button className={"apf-yardim-ac" + (yardimGizli ? "" : " acik")} onClick={() => setYardimGizli((g) => !g)} aria-label="yardım">?</button>
                      </div>
                      <div className="apf-is-kare apf-is-panel">{isFoto ? <img src={isFoto} alt="" /> : <span className="apf-is-bos">{t("profIsBos", "İş foto/amblem")}</span>}</div>
                      {!yardimGizli && <div className="apf-yardim">{t("profYardimAmblem", "İşine özel amblemini yap: fotoğraf yükle ya da 'Yazıdan Amblem Yap' ile sıfırdan oluştur. Zemin rengi, yazı tipi/boyut/renk seç; birden çok yazı ve fotoğraf ekleyip parmağınla istediğin yere diz.")}<button className="apf-yardim-kapat" onClick={() => setYardimGizli(true)} aria-label="kapat">×</button></div>}
                      <div className="apf-foto-dugmeler">
                        <button className="apf-foto-btn" onClick={() => isInputRef.current && isInputRef.current.click()}>
                          {isFoto ? t("profFotoDegistir", "Fotoğrafı Değiştir") : t("profFotoYukle", "Fotoğraf Yükle")}
                        </button>
                        {isFoto && <button className="apf-foto-btn ikincil" onClick={mevcutAmblemDuzenle}>{t("profFotoDuzenle", "Düzenle")}</button>}
                        <button className="apf-foto-btn ikincil" onClick={amblemBaslat}>{t("profAmblemYap", "Yazıdan Amblem Yap")}</button>
                      </div>
                    </>
                  )}
                  {acikBolum === "meslek" && (
                    <>
                      <div className="apf-bolum-bas-sar">
                        <div className="apf-bolum-bas">{t("profMeslegim", "Mesleğim")}</div>
                        <button className={"apf-yardim-ac" + (yardimGizli ? "" : " acik")} onClick={() => setYardimGizli((g) => !g)} aria-label="yardım">?</button>
                      </div>
                      {!yardimGizli && <div className="apf-yardim">{t("profYardimMeslek2", "Mesleğini seç ya da değiştir — profil kimliğinde görünür ve Keşfet/Arama'da bu meslekle bulunursun.")}<button className="apf-yardim-kapat" onClick={() => setYardimGizli(true)} aria-label="kapat">×</button></div>}
                      {meslekAd ? (
                        /* Profesyonel formdaki KİMLİK kartının aynısı — otomatik gelir */
                        <div className="apf-kimlik">
                          <div className="apf-kimlik-rol">{proUye ? t("pirlantaProfesyonel", "KIRMIZI PIRLANTA · PROFESYONEL") : t("profUye", "ÜYE")}</div>
                          <div className="apf-kimlik-meslek">{proMeslekDizi.map((m) => mc(m, dil)).join(" · ")}</div>
                          <div className="apf-kimlik-mesaj">{t("profKimlikHosgeldin", "Hoş geldin! GLOXORG ailesine katıldın. Profilin hazır, platformda yerini aldın.")}</div>
                          {(profilBilgi && profilBilgi.konum && profilBilgi.konum.yazi) ? <div className="apf-kimlik-konum">{profilBilgi.konum.yazi}</div> : (konumYazi && <div className="apf-kimlik-konum">{konumYazi}</div>)}
                        </div>
                      ) : (
                        <div className="apf-not">{t("profMeslekNote", "Henüz meslek seçilmedi.")}</div>
                      )}
                      <button className="apf-meslek-degis" onClick={() => setMeslekSecAcik((v) => !v)}>
                        {meslekSecAcik ? t("profMeslekKapat", "Listeyi kapat") : (proMeslekDizi.length ? t("profMeslekEkle", "Meslek ekle / değiştir") : t("profMeslekSec", "Meslek seç"))}
                      </button>
                      {meslekSecAcik && (
                        <div className="apf-meslek-sec">
                          <div className="apf-meslek-ipucu">{t("profMeslekCoklu", "Birden fazla seçebilirsin (en çok 5). Seçtiğin her meslekte aramada bulunursun.")}</div>
                          <input className="apf-meslek-ara" value={meslekFiltre} onChange={(e) => setMeslekFiltre(e.target.value)} placeholder={t("profMeslekAra", "Meslek / fabrika / işçi ara…")} />
                          <div className="apf-meslek-grid">
                            {MESLEK_LISTESI.filter((m) => { const q = sadelesAra(meslekFiltre); return !q || sadelesAra(m.ad + " " + meslekTumDiller(m.ad)).includes(q); }).map((m, i) => (
                              <button key={i} className={"apf-meslek-oge" + (proMeslekDizi.includes(m.ad) ? " secili" : "")} style={{ background: m.bg }} onClick={() => meslekToggle(m.ad)}>
                                <span className="apf-mo-ik" aria-hidden="true">{m.ik}</span>
                                <span className="apf-mo-ad">{mc(m.ad, dil)}</span>
                                {proMeslekDizi.includes(m.ad) && <span className="apf-mo-tik" aria-hidden="true">✓</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <button className="apf-ayar-kapat" onClick={() => setAcikBolum(null)}>{t("profTamam", "Tamam")}</button>
                  </div>
                </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* Diğer bölümlerin penceresi — kendi ikonu ve adıyla açılır (içerikler sırayla yapılacak) */
        <div className="ana-pencere ana-yakinda" key={aktifKod}>
          <span className="ana-yakinda-ik">{Ikon[aktifKod]}</span>
          <h3>{(navlar.find((n) => n.k === aktifKod) || {}).et}</h3>
          <p><Elmas4 c="#ffd700" /> {t("anaYakinda")} <Elmas4 c="#ffd700" /></p>
        </div>
      )}

      {/* GLOXI — Mesaj Merkezi: tüm sohbetler + kişi ara/yeni sohbet (altın, WhatsApp gibi) */}
      {mesajAcik && (
        <div className="msj-fon msj-merkez" onClick={(e) => { if (e.target === e.currentTarget) { setMesajAcik(false); setMmAra(""); } }}>
          <div className="msj-pencere">
            <div className="msj-bas">
              <span className="msj-baslik"><span className="mm-bas-ik">{Ikon.gloxi}</span> Glome</span>
              <button className="msj-kapat" onClick={() => { setMesajAcik(false); setMmAra(""); }} aria-label="Kapat">✕</button>
            </div>
            {/* KİŞİ ARAMA — kimi arayacağını buradan bul, dokun, sohbet başlat */}
            <div className="mm-ara-sar">
              <svg className="mm-ara-ik" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
              <input className="mm-ara-input" value={mmAra} onChange={(e) => setMmAra(e.target.value)} placeholder={t("mmKisiAra", "Kişi ara, yeni sohbet başlat…")} />
              {mmAra && <button className="mm-ara-temizle" onClick={() => setMmAra("")} aria-label="Temizle">✕</button>}
            </div>
            <div className="msj-liste">
              {mmAra.trim().length >= 2 ? (
                mmSonuc.length === 0 ? (
                  <div className="msj-bos">{t("mmBulunamadi", "Kişi bulunamadı. İsmini tam yazmayı dene.")}</div>
                ) : mmSonuc.map((k) => {
                  const id = k.id || k.uid;
                  const ad = [k.isim, k.soyisim].filter(Boolean).join(" ") || k.ad || "—";
                  const foto = k.foto || k.avatarFoto || k.isFoto || (k.pro && k.pro.foto) || "";
                  const meslek = k.pro && k.pro.meslek ? mc(k.pro.meslek, dil) : "";
                  return (
                    <button className="msj-kart" key={id} onClick={() => { sohbetAc({ uid: id, ad, foto }); setMmAra(""); }}>
                      <span className="msj-foto">{foto ? <img src={foto} alt="" referrerPolicy="no-referrer" /> : ((ad[0] || "?").toUpperCase())}</span>
                      <div className="msj-icerik">
                        <div className="msj-ust"><b className="notranslate" translate="no">{ad}</b></div>
                        <div className="msj-onizleme">{meslek || t("sohbetBaslat", "Sohbet başlat →")}</div>
                      </div>
                    </button>
                  );
                })
              ) : sohbetListesi.length === 0 ? (
                <div className="msj-bos">{t("mesajYok2", "Henüz sohbetin yok. Yukarıdan kişi ara, dokun ve ilk mesajını gönder 👆")}</div>
              ) : sohbetListesi.map((s) => {
                const bilgi = kisiBilgiHarita[s.uid] || {};
                const foto = s.foto || bilgi.foto || "";
                const ad = (s.ad && s.ad !== "—") ? s.ad : (bilgi.ad || "—");
                const bas = ((ad || "?").trim()[0] || "?").toUpperCase();
                const bugun = new Date(); const md = new Date(s.son.zamanMs || 0);
                const ayniGun = md.toDateString() === bugun.toDateString();
                const ne = s.son.zamanMs ? md.toLocaleString(dil || "tr", ayniGun ? { hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "2-digit" }) : "";
                const benSon = s.son.gonderenUid === benUid;
                const oniz = s.son.gorsel ? ("📷 " + (s.son.metin || t("mesajFoto", "Fotoğraf"))) : (s.son.metin || "");
                return (
                  <button className="msj-kart" key={s.uid} onClick={() => sohbetAc({ uid: s.uid, ad, foto })}>
                    <span className="msj-foto">{foto ? <img src={foto} alt="" referrerPolicy="no-referrer" /> : bas}</span>
                    <div className="msj-icerik">
                      <div className="msj-ust"><b className="notranslate" translate="no">{ad}</b><i>{ne}</i></div>
                      <div className="msj-metin-satir">
                        <div className={"msj-onizleme" + (s.okunmamis ? " okunmadi" : "")}>
                          {benSon && <span className="msj-tik">{s.son.okundu ? "✓✓" : "✓"}</span>}{oniz}
                        </div>
                        {s.okunmamis > 0 && <span className="msj-okunmamis">{s.okunmamis > 99 ? "99+" : s.okunmamis}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP GİBİ SOHBET EKRANI — baloncuklu, canlı; en üst katman */}
      {sohbetKisi && (
        <div className="sohbet-fon">
          <div className="sohbet-pencere">
            <div className="sohbet-bas">
              <button className="sohbet-geri" onClick={() => setSohbetKisi(null)} aria-label={t("geri", "Geri")}>‹</button>
              {(() => { const sf = sohbetKisi.foto || (kisiBilgiHarita[sohbetKisi.uid] && kisiBilgiHarita[sohbetKisi.uid].foto) || ""; return (
              <span className="sohbet-avatar">{sf ? <img src={sf} alt="" referrerPolicy="no-referrer" /> : ((sohbetKisi.ad || "?").trim()[0] || "?").toUpperCase()}</span>
              ); })()}
              <div className="sohbet-kim">
                <b className="notranslate" translate="no"><KayanYazi>{sohbetKisi.ad}</KayanYazi></b>
                <i>{t("cevrimici", "GLOXORG")}</i>
              </div>
              {/* İnternetten arama: sesli + görüntülü (WhatsApp gibi) */}
              <button className="sohbet-ara sohbet-ara-gor" onClick={() => aramaBaslat({ uid: sohbetKisi.uid, ad: sohbetKisi.ad, foto: sohbetKisi.foto || (kisiBilgiHarita[sohbetKisi.uid] && kisiBilgiHarita[sohbetKisi.uid].foto) }, "goruntulu")} aria-label={t("goruntuluAra", "Görüntülü ara")} title={t("goruntuluAra", "Görüntülü ara")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="6" width="13" height="12" rx="2.5" /><path d="M15.5 10l5-3v10l-5-3z" /></svg>
              </button>
              <button className="sohbet-ara sohbet-ara-sesli" onClick={() => aramaBaslat({ uid: sohbetKisi.uid, ad: sohbetKisi.ad, foto: sohbetKisi.foto || (kisiBilgiHarita[sohbetKisi.uid] && kisiBilgiHarita[sohbetKisi.uid].foto) }, "sesli")} aria-label={t("sesliAra", "Sesli ara")} title={t("sesliAra", "Sesli ara")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9z" /></svg>
              </button>
              {/* GLOME'a ait ayar: mesaj yanı tepki simgesini BURADAN seç (ana Ayarlar'a girmeden). Sadece kendi cihazında. */}
              <button className="sohbet-ara sohbet-simge-btn" onClick={(e) => { e.stopPropagation(); setTepkiSimgeAcik((v) => !v); }} aria-label={t("tepkiSimgeSec", "Tepki simgesi seç")} title={t("tepkiSimgeSec", "Mesaj yanı simgesini seç")}>
                <span className="sohbet-simge-goster" aria-hidden="true">{tepkiSimge === "yok" ? "🚫" : tepkiSimge}</span>
              </button>
            </div>
            {tepkiSimgeAcik && (
              <div className="sohbet-simge-panel" onClick={(e) => e.stopPropagation()}>
                <span className="sohbet-simge-baslik">{t("mesajYaniSimge", "Mesaj yanı simgesi (sadece sende)")}</span>
                <div className="sohbet-simge-liste">
                  {["🙂", "😊", "❤️", "👍", "🔥", "✨", "➕"].map((e) => (
                    <button key={e} type="button" className={"sohbet-simge-oge" + (tepkiSimge === e ? " secili" : "")} onClick={() => tepkiSimgeSec(e)}>{e}</button>
                  ))}
                  <button type="button" className={"sohbet-simge-oge sohbet-simge-yok" + (tepkiSimge === "yok" ? " secili" : "")} onClick={() => tepkiSimgeSec("yok")}>🚫</button>
                </div>
              </div>
            )}
            <div className="sohbet-akis" onClick={() => { if (tepkiMesaj) setTepkiMesaj(null); if (tepkiSimgeAcik) setTepkiSimgeAcik(false); }}>
              {aktifSohbetMesajlari.length === 0 ? (
                <div className="sohbet-bos">{t("sohbetBos", "Henüz mesaj yok. İlk mesajı sen yaz 👋")}</div>
              ) : aktifSohbetMesajlari.map((m, i) => {
                const benim = m.gonderenUid === benUid;
                const saat = m.zamanMs ? new Date(m.zamanMs).toLocaleTimeString(dil || "tr", { hour: "2-digit", minute: "2-digit" }) : "";
                const tepkiler = m.tepkiler ? Object.values(m.tepkiler).filter(Boolean) : [];
                return (
                  <div className={"sohbet-balon-sar " + (benim ? "benim" : "karsi")} key={m.id || i}>
                    <div className="sohbet-balon-cev">
                      <div className="sohbet-balon"
                        onPointerDown={(e) => tepkiBaslat(m.id, e.clientX, e.clientY)} onPointerUp={tepkiIptal} onPointerMove={tepkiIptal} onPointerLeave={tepkiIptal}
                        onContextMenu={(e) => { e.preventDefault(); tepkiAc(m.id, e.clientX, e.clientY); }}>
                        {m.silindi ? (
                          <span className="sohbet-balon-metin sohbet-silindi">🚫 {t("mesajSilindi", "Bu mesaj geri çekildi")}</span>
                        ) : (<>
                          {m.medyalar && m.medyalar.length > 0 && (
                            <div className="sohbet-kolaj" data-n={Math.min(m.medyalar.length, 6)}>
                              {m.medyalar.slice(0, 6).map((md, ki) => (
                                <div className="sk-oge" key={ki} onClick={(e) => { e.stopPropagation(); setOnizGaleri({ liste: m.medyalar.map((x) => ({ tip: x.tip === "video" ? "video" : "foto", src: x.url })), i: ki, mesajId: m.id }); }}>
                                  {md.tip === "video" ? <><video src={md.url} muted preload="metadata" /><span className="sk-rozet sk-video">▶</span></> : md.tip === "dosya" ? <span className="sk-dosya">📎</span> : <><img src={md.url} alt="" referrerPolicy="no-referrer" /><span className="sk-rozet sk-foto">📷</span></>}
                                </div>
                              ))}
                            </div>
                          )}
                          {m.gorsel && <img className="sohbet-balon-foto" src={m.gorsel} alt="" referrerPolicy="no-referrer" onClick={() => setOnizGaleri({ liste: [{ tip: "foto", src: m.gorsel }], i: 0, mesajId: m.id })} />}
                          {m.video && (
                            <div className="sohbet-balon-vid-sar" onClick={(e) => { e.stopPropagation(); setOnizGaleri({ liste: [{ tip: "video", src: m.video }], i: 0, mesajId: m.id }); }}>
                              <video className="sohbet-balon-video" src={m.video} muted playsInline preload="metadata" tabIndex={-1} />
                              <span className="sohbet-vid-oynat" aria-hidden="true">▶</span>
                            </div>
                          )}
                          {m.dosya && m.dosya.url && <a className="sohbet-balon-dosya" href={m.dosya.url} download target="_blank" rel="noreferrer"><span className="sbd-ik">📎</span><span className="sbd-ad notranslate" translate="no">{m.dosya.ad || t("dosya", "Dosya")}</span></a>}
                          {m.metin && <span className="sohbet-balon-metin">{m.metin}</span>}
                        </>)}
                        <span className="sohbet-balon-alt">{m.duzenlendi && !m.silindi && <span className="sohbet-duzenlendi">{t("duzenlendi", "düzenlendi")} · </span>}{saat}{benim && <span className="sohbet-tik">{m.okundu ? "✓✓" : "✓"}</span>}</span>
                        {tepkiler.length > 0 && <span className="sohbet-tepkiler">{tepkiler.slice(0, 3).map((e2, k) => <span key={k}>{e2}</span>)}{tepkiler.length > 3 ? <b>{tepkiler.length}</b> : null}</span>}
                      </div>
                      {tepkiSimge !== "yok" && <button className="sohbet-tepki-ac" onClick={(e) => { e.stopPropagation(); if (tepkiMesaj === m.id) { setTepkiMesaj(null); } else { tepkiAc(m.id, e.clientX, e.clientY); } }} aria-label={t("tepkiVer", "Tepki ver")} title={t("tepkiVer", "Tepki ver")}>{tepkiSimge}</button>}
                    </div>
                  </div>
                );
              })}
              <div ref={mesajSonRef} />
            </div>
            {/* DÜZENLEME MODU göstergesi */}
            {duzenlenenMesaj && (
              <div className="sohbet-duzenmod">
                <span>✏️ {t("mesajDuzenleniyor", "Mesajı düzenliyorsun — değiştir ve gönder")}</span>
                <button className="sohbet-duzeniptal" onClick={mesajDuzenIptal} aria-label={t("iptal", "İptal")}>✕</button>
              </div>
            )}
            {/* SEÇİLEN MEDYALAR ÖNİZLEME (çoklu) — yazı yazıp hepsini birlikte gönder */}
            {!duzenlenenMesaj && bekleyenMedyalar.length > 0 && (
              <div className="sohbet-bekleyen">
                <div className="sb-serit">
                  {bekleyenMedyalar.map((bm, bi) => (
                    <div className="sb-oge" key={bi}>
                      {bm.tip === "foto" && <img className="sb-onizleme" src={bm.url} alt="" referrerPolicy="no-referrer" />}
                      {bm.tip === "video" && <video className="sb-onizleme" src={bm.url} muted playsInline />}
                      {bm.tip === "dosya" && <span className="sb-onizleme sb-dosya">📎</span>}
                      <button className="sb-sil" onClick={() => setBekleyenMedyalar((a) => a.filter((_, k) => k !== bi))} aria-label={t("kaldir", "Kaldır")}>✕</button>
                    </div>
                  ))}
                  {bekleyenMedyalar.length < 6 && <button className="sb-ekle" onClick={() => setSohbetMedyaAcik(true)} aria-label={t("dahaEkle", "Daha ekle")}>＋</button>}
                </div>
                <span className="sb-not">{t("yaziEkleGonder", "İstersen yazı ekle, sonra Gönder ➤")}</span>
              </div>
            )}
            <div className="sohbet-yazar">
              {/* gizli dosya seçiciler: galeri foto/video, dosya, canlı foto/video (kamera) */}
              <input ref={sohbetFotoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={sohbetFotoSecildi} />
              <input ref={sohbetVideoInputRef} type="file" accept="video/*" style={{ display: "none" }} onChange={sohbetVideoSecildi} />
              <input ref={sohbetDosyaInputRef} type="file" style={{ display: "none" }} onChange={sohbetDosyaSecildi} />
              <input ref={sohbetCanliFotoRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={sohbetFotoSecildi} />
              <input ref={sohbetCanliVideoRef} type="file" accept="video/*" capture="environment" style={{ display: "none" }} onChange={sohbetVideoSecildi} />
              {sohbetMedyaAcik && (
                <>
                  <div className="sohbet-medya-fon" onClick={() => setSohbetMedyaAcik(false)} />
                  <div className="sohbet-medya-menu">
                    <button onClick={() => sohbetFotoInputRef.current && sohbetFotoInputRef.current.click()}><span className="smm-ik smm-foto">🖼️</span>{t("mmFoto", "Fotoğraf seç")}</button>
                    <button onClick={() => sohbetVideoInputRef.current && sohbetVideoInputRef.current.click()}><span className="smm-ik smm-video">🎬</span>{t("mmVideo", "Video seç")}</button>
                    <button onClick={() => sohbetDosyaInputRef.current && sohbetDosyaInputRef.current.click()}><span className="smm-ik smm-dosya">📄</span>{t("mmDosya", "Dosya seç")}</button>
                    <button onClick={() => sohbetCanliFotoRef.current && sohbetCanliFotoRef.current.click()}><span className="smm-ik smm-cfoto">📸</span>{t("mmCanliFoto", "Fotoğraf çek")}</button>
                    <button onClick={() => sohbetCanliVideoRef.current && sohbetCanliVideoRef.current.click()}><span className="smm-ik smm-cvideo">🎥</span>{t("mmCanliVideo", "Video çek")}</button>
                  </div>
                </>
              )}
              <button className={"sohbet-foto-btn" + (sohbetMedyaAcik ? " acik" : "")} onClick={() => setSohbetMedyaAcik((a) => !a)} disabled={sohbetGonderiliyor} aria-label={t("medyaEkle", "Ekle")}>
                {sohbetGonderiliyor ? "…" : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>}
              </button>
              <textarea ref={sohbetInputRef} className="sohbet-input" value={sohbetYazi}
                onChange={(e) => { setSohbetYazi(e.target.value); const el = e.target; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 138) + "px"; }}
                placeholder={t("mesajYaz", "Mesaj yaz…")} maxLength={2000} rows={1}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) { e.preventDefault(); sohbetMetinGonder(); } }} />
              <button className="sohbet-gonder-btn" onClick={sohbetMetinGonder} disabled={!sohbetYazi.trim() && !bekleyenMedyalar.length} aria-label={t("gonder", "Gönder")}>
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4l17.4-8.4L3.4 3.6 3.4 10l12 2-12 2z" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <AramaHataSiniri anahtar={(aktifArama && aktifArama.id) || (gelenArama && gelenArama.id) || ""} onHata={() => { try { aramaTemizle(); zilDurdur(); } catch (e) {} setAktifArama(null); setAramaDurum(""); setGelenArama(null); }}>
      {/* GELEN ÇAĞRI — biri seni arıyor (kabul / reddet). SADECE teklif (offer) hazırken göster → kabul edince hata olmaz */}
      {gelenArama && gelenArama.offer && gelenArama.offer.sdp && !aramaDurum && (
        <div className="arama-fon arama-geliyor">
          <div className="arama-kisi">
            <span className="arama-avatar">{gelenArama.arayanFoto ? <img src={gelenArama.arayanFoto} alt="" referrerPolicy="no-referrer" /> : ((gelenArama.arayanAd || "?").trim()[0] || "?").toUpperCase()}</span>
            <b className="notranslate" translate="no">{gelenArama.arayanAd || "—"}</b>
            <i>{gelenArama.tip === "goruntulu" ? t("goruntuluCagri", "📹 Görüntülü arıyor…") : t("sesliCagri", "📞 Sesli arıyor…")}</i>
          </div>
          <div className="arama-cagri-dugmeler">
            <button className="arama-btn arama-red" onClick={aramaReddet} aria-label={t("reddet", "Reddet")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9z" /></svg>
            </button>
            <button className="arama-btn arama-kabul" onClick={aramaKabulEt} aria-label={t("kabul", "Kabul et")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9z" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* AKTİF ARAMA — konuşma ekranı (sesli: avatar; görüntülü: video) */}
      {aramaDurum && aktifArama && (
        <div className={"arama-fon arama-aktif" + (aktifArama.tip === "goruntulu" ? " goruntulu" : " sesli")}>
          {aktifArama.tip === "goruntulu"
            ? <video ref={uzakVideoRef} className={"arama-video " + (videoBuyuk === "uzak" ? "arama-buyuk" : "arama-kucuk")} autoPlay playsInline
                style={videoBuyuk !== "uzak" && kucukYer ? { left: kucukYer.x + "px", top: kucukYer.y + "px", right: "auto", bottom: "auto" } : undefined}
                onPointerDown={videoBuyuk !== "uzak" ? kucukVideoBas : undefined} onPointerMove={videoBuyuk !== "uzak" ? kucukVideoGit : undefined} onPointerUp={videoBuyuk !== "uzak" ? kucukVideoBitir : undefined} />
            : <audio ref={uzakSesRef} autoPlay playsInline />}
          {(aktifArama.tip !== "goruntulu" || aramaDurum !== "konusuyor") && (
            <div className="arama-kisi arama-kisi-orta">
              <span className="arama-avatar">{aktifArama.karsiFoto ? <img src={aktifArama.karsiFoto} alt="" referrerPolicy="no-referrer" /> : ((aktifArama.karsiAd || "?").trim()[0] || "?").toUpperCase()}</span>
              <b className="notranslate" translate="no">{aktifArama.karsiAd}</b>
              <i>{aramaDurum === "ariyor" ? t("araniyor", "Aranıyor…") : t("baglandi", "Bağlandı")}</i>
            </div>
          )}
          {aktifArama.tip === "goruntulu" && <video ref={yerelVideoRef} className={"arama-video " + (videoBuyuk === "yerel" ? "arama-buyuk" : "arama-kucuk")} autoPlay playsInline muted
            style={videoBuyuk === "uzak" && kucukYer ? { left: kucukYer.x + "px", top: kucukYer.y + "px", right: "auto", bottom: "auto" } : undefined}
            onPointerDown={videoBuyuk === "uzak" ? kucukVideoBas : undefined} onPointerMove={videoBuyuk === "uzak" ? kucukVideoGit : undefined} onPointerUp={videoBuyuk === "uzak" ? kucukVideoBitir : undefined} />}
          {aktifArama.tip === "goruntulu" && aramaDurum === "konusuyor" && <span className="arama-kucuk-ipucu">{t("videoIpucu", "Küçük ekrana dokun: büyüt · sürükle: taşı")}</span>}
          <div className="arama-alt-dugmeler">
            <button className={"arama-kk-btn" + (mikKapali ? " kapali" : "")} onClick={mikToggle} aria-label={t("mikrofon", "Mikrofon")}>
              {mikKapali
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 9v3a3 3 0 0 0 5.1 2.1M15 9.3V5a3 3 0 0 0-5.9-.7M12 19v3M8 22h8M2 2l20 20" /></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" /></svg>}
            </button>
            {aktifArama.tip === "goruntulu" && (
              <button className={"arama-kk-btn" + (kamKapali ? " kapali" : "")} onClick={kamToggle} aria-label={t("kamera", "Kamera")}>
                {kamKapali
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 6h9v12h-9zM15.5 10l5-3v10l-5-3M2 2l20 20" /></svg>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="6" width="13" height="12" rx="2.5" /><path d="M15.5 10l5-3v10l-5-3z" /></svg>}
              </button>
            )}
            {aktifArama.tip === "goruntulu" && (
              <button className="arama-kk-btn" onClick={kameraCevir} aria-label={t("kameraCevir", "Ön/Arka kamera")} title={t("kameraCevir", "Ön/Arka kamera")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5h3.5A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9A2.5 2.5 0 0 1 5.5 5H9" /><circle cx="12" cy="12" r="2.6" /><path d="M8 5l2-2h4l2 2M16.5 9.5l1.8 1.8-1.8 1.8M7.5 14.5L5.7 12.7l1.8-1.8" /></svg>
              </button>
            )}
            <button className="arama-kk-btn arama-kapat" onClick={() => aramaKapat()} aria-label={t("aramaKapat", "Kapat")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9z" /></svg>
            </button>
          </div>
        </div>
      )}
      </AramaHataSiniri>

      {/* PAYLAŞ PENCERESİ — yeni gönderi */}
      {paylasAcik && (
        <div className="msj-fon" onClick={(e) => { if (e.target === e.currentTarget) setPaylasAcik(false); }}>
          <div className="msj-pencere paylas" onPointerDown={klavyeKapatDokun}>
            <div className="msj-bas">
              <span className="msj-baslik">{duzenlenen ? t("paylasDuzenle", "Paylaşımı Düzenle") : t("paylasBaslik", "Paylaş")}</span>
              <button className="msj-kapat" onClick={() => { setPaylasAcik(false); setDuzenlenen(null); setPaylasBaslik(""); setAiIstek(""); setAiOneriler([]); setPaylasGorsel(""); setPaylasEkFotolar([]); setPaylasVideo(""); setPaylasDosya(null); setMedyaMenu(""); setTurSecAcik(false); setPaylasDurum(""); }} aria-label="Kapat">✕</button>
            </div>
            <div className="pyl-ust">
              {/* 1) ÜST BAŞLIK ŞERİDİ — medyanın HEMEN ÜSTÜNDE, renkli/belirgin (kullanıcı: sırayla, yakın, müşteri anlasın) */}
              <div className="pyl-serit pyl-serit-baslik">
                <span className="pyl-serit-et">📌 {t("paylasBaslikEt", "Başlık")}</span>
                <input className="pyl-baslik" value={paylasBaslik} onChange={(e) => setPaylasBaslik(e.target.value)} placeholder={t("paylasBaslikPh", "Başlık (isteğe bağlı) — kısa ve dikkat çekici")} maxLength={200} />
              </div>
              {/* 2) MEDYA — FOTOĞRAF + VİDEO küçük KARE ızgara (hepsi TEK pencerede görünür; dokununca tek tek gezilir), + ile ekle.
                  Video de kare olarak görünür (▶ + yükleme %). İlk sıradaki (büyük olacak) "1" rozetli. */}
              {(paylasGorsel || paylasEkFotolar.length > 0 || paylasVideo) && (() => {
                const fotolar = [paylasGorsel, ...paylasEkFotolar].filter(Boolean);
                const toplam = fotolar.length + (paylasVideo ? 1 : 0);
                const videoKare = paylasVideo ? (
                  <span className={"pyl-gk pyl-gk-vid" + (videoBasta ? " ana" : "")} key="vid"
                    onClick={() => setOnizGaleri({ liste: [{ tip: "video", src: paylasVideo, poster: paylasVideoPoster }], i: 0 })}>
                    {paylasVideoPoster ? <img src={paylasVideoPoster} alt="" /> : <video src={paylasVideo} muted preload="metadata" playsInline tabIndex={-1} />}
                    <span className="pyl-gk-oynat" aria-hidden="true">▶</span>
                    {paylasDurum === "video" && <span className="pyl-gk-yuk">%{paylasYukleme}</span>}
                    {videoBasta && <span className="pyl-gk-rozet">{t("anaFoto", "1")}</span>}
                    <button className="pyl-gk-sil" onClick={(e) => { e.stopPropagation(); setPaylasVideo(""); setPaylasVideoFile(null); setPaylasVideoPoster(""); setVideoBasta(false); setPaylasYukleme(0); }} aria-label="Kaldır">✕</button>
                  </span>
                ) : null;
                const fotoKareleri = fotolar.map((f, i) => (
                  <span className={"pyl-gk" + (i === 0 && !videoBasta ? " ana" : "")} key={"f" + i}
                    onClick={() => setOnizGaleri({ liste: fotolar.map((x) => ({ tip: "foto", src: x })), i })}>
                    <img src={f} alt="" />
                    {i === 0 && !videoBasta && <span className="pyl-gk-rozet">{t("anaFoto", "1")}</span>}
                    <button className="pyl-gk-sil" onClick={(e) => { e.stopPropagation(); if (i === 0) { const ilk = paylasEkFotolar[0] || ""; setPaylasGorsel(ilk); setPaylasEkFotolar((a) => a.slice(1)); } else { setPaylasEkFotolar((a) => a.filter((_, j) => j !== i - 1)); } }} aria-label="Kaldır">✕</button>
                  </span>
                ));
                return (
                  <div className="pyl-foto-grid">
                    {videoBasta ? [videoKare, ...fotoKareleri] : [...fotoKareleri, videoKare]}
                    {toplam < 10 && (
                      <button className="pyl-gk-ekle" onClick={() => { setMedyaMenu(""); if (paylasFotoRef.current) paylasFotoRef.current.click(); }} aria-label={t("fotoEkle", "Fotoğraf ekle")}>＋</button>
                    )}
                  </div>
                );
              })()}
              {paylasDosya && (
                <div className="pyl-dosya-chip">
                  <span className="pyl-dosya-ik">📎</span>
                  <span className="pyl-dosya-ad">{paylasDosya.ad}</span>
                  <button className="pyl-dosya-sil" onClick={() => setPaylasDosya(null)} aria-label="Kaldır">✕</button>
                </div>
              )}
              {/* 3) ALT YAZI ŞERİDİ — medyanın HEMEN ALTINDA, bitişik, renkli */}
              <div className="pyl-serit pyl-serit-yazi">
                <span className="pyl-serit-et">✍️ {t("paylasYaziEt", "Yazı")}</span>
                <div className="pyl-ust-satir">
                  <span className={"pyl-avatar" + (paylasAvatar === "amblem" && isFoto ? " amblem" : "")}>
                    {paylasAvatar === "amblem" && isFoto ? <img src={isFoto} alt="" referrerPolicy="no-referrer" />
                      : foto ? <img src={foto} alt="" referrerPolicy="no-referrer" />
                      : ((adTam && adTam.trim()[0]) || "?").toUpperCase()}
                  </span>
                  <textarea ref={paylasYaziRef} className="pyl-yaz" value={paylasYazi} onChange={(e) => { setPaylasYazi(e.target.value); setPaylasDurum(""); }} placeholder={t("paylasYaz2", "Ne paylaşmak istersin? (uzun yazı serbest)")} maxLength={20000}
                    style={(!paylasGorsel && !paylasVideo && (paylasZemin || paylasYaziRenk)) ? { background: paylasZemin || undefined, color: paylasYaziRenk || undefined, borderColor: "transparent" } : undefined} />
                </div>
              </div>
            </div>
            {/* KAYAN AYARLAR — üstteki foto+yazı SABİT kalır, buradan aşağısı onun altından kayar */}
            <div className="pyl-kaydir">
            {/* ✨ GLOXOO — BÜYÜK şerit: üstte yüz + açıklama (uzun → parmakla yana kayar), altta yaz/konuş + küçük düğmeler */}
            <div className="pyl-ai">
              {/* ÜST: Gloxoo ikonu + KONUŞMA BALONU (açıklama uzun → parmakla YANA kayar, sabit değil) */}
              <div className="pyl-ai-ust">
                <span className="pyl-ai-yuz"><MaskotYuz tur="grox" boyut={34} arastir={aiYukleniyor || aiIstekDinliyor} konusuyor={false} dinliyor={aiIstekDinliyor} /></span>
                <div className="pyl-ai-balon"><div className="pyl-ai-aciklama">{t("gloxooAciklama", "Gloxoo senin için paylaşım yazısı yazar. Fotoğraf/videona bakar ya da aşağıya ne istediğini yaz veya 🎤 ile söyle — sana hazır bir metin önersin. Beğenmezsen tekrar Öner'e bas.")}</div></div>
              </div>
              {/* FOTO/VİDEO yüklüyse: yazmadan tek dokunuşla sorma DÜĞMELERİ */}
              {(paylasGorsel || paylasVideo) && (
                <div className="pyl-ai-hizli">
                  <button className="pyl-ai-hiz" onClick={() => { const s = t("gloxooHiz1", "Bu görselde ne görüyorsun? Buna uygun güzel bir paylaşım yazısı yaz."); setAiIstek(s); aiYaziOner(s); }} disabled={aiYukleniyor}>🔍 {t("gloxooHiz1e", "Ne görüyorsun?")}</button>
                  <button className="pyl-ai-hiz" onClick={() => { const s = t("gloxooHiz2", "Bu görsele uygun kısa, akılda kalıcı bir paylaşım yazısı öner."); setAiIstek(s); aiYaziOner(s); }} disabled={aiYukleniyor}>✍️ {t("gloxooHiz2e", "Yazı öner")}</button>
                  <button className="pyl-ai-hiz" onClick={() => { const s = t("gloxooHiz3", "Bu görsele uygun eğlenceli, samimi bir paylaşım yazısı yaz (emoji kullan)."); setAiIstek(s); aiYaziOner(s); }} disabled={aiYukleniyor}>😊 {t("gloxooHiz3e", "Eğlenceli yaz")}</button>
                </div>
              )}
              {/* ALT: çok satırlı yaz kutusu (ne yazdığını gör) + KÜÇÜK mikrofon + Öner */}
              <div className="pyl-ai-satir">
                <textarea className="pyl-ai-istek" value={aiIstek} rows={2} onChange={(e) => setAiIstek(e.target.value)}
                  placeholder={(paylasGorsel || paylasVideo) ? t("gloxooNe2", "Ne yazsın? (boş = görselden yazar)") : t("gloxooNe", "Gloxoo'ya ne yazayım de…")} />
                <button className={"pyl-ai-mik" + (aiIstekDinliyor ? " dinliyor" : "")} onClick={aiIstekDinle} aria-label={t("konus", "Konuş")}>🎤</button>
                <button className="pyl-ai-btn2" onClick={() => aiYaziOner()} disabled={aiYukleniyor}>{aiYukleniyor ? "…" : t("gloxooOner3", "Öner")}</button>
              </div>
              {aiOneriler.length > 0 && (
                <div className="pyl-ai-liste">
                  {aiOneriler.map((o, k) => {
                    const par = (o || "").split("\n\n"); const govde = par[0]; const imza = par.slice(1).join(" ");
                    return (
                      <div key={k} className={"pyl-ai-oneri-kart renk-" + (k % 3)}>
                        <button className="pyl-ai-oneri" onClick={() => { setPaylasYazi(o); setAiOneriler([]); setAiYorumAcik(-1); }}>
                          <span className="pyl-ai-oneri-elmas" aria-hidden="true"><Elmas4 c="#7fe0ff" /></span>
                          <span className="pyl-ai-oneri-metin">{govde}{imza && <span className="pyl-ai-imza">{imza}</span>}</span>
                        </button>
                        <div className="pyl-ai-geri">
                          <span className="pyl-ai-geri-et">{t("gloxooNasil", "Bu yazı nasıl?")}</span>
                          <button className="pyl-ai-geri-btn begen" onClick={() => aiBegen(o)} aria-label={t("begendim", "Beğendim")} title={t("begendim", "Beğendim")}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v11" /><path d="M7 10l4-7a2 2 0 0 1 3 1.7V9h4.5a2 2 0 0 1 2 2.4l-1.4 7A2 2 0 0 1 19 20H7" /></svg>
                          </button>
                          <button className={"pyl-ai-geri-btn begenme" + (aiYorumAcik === k ? " aktif" : "")} onClick={() => aiBegenmeAc(k)} aria-label={t("begenmedim", "Beğenmedim")} title={t("begenmedim", "Beğenmedim")}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V3" /><path d="M17 14l-4 7a2 2 0 0 1-3-1.7V15H5.5a2 2 0 0 1-2-2.4l1.4-7A2 2 0 0 1 7 4h10" /></svg>
                          </button>
                        </div>
                        {aiYorumAcik === k && (
                          <div className="pyl-ai-yorum">
                            <textarea className="pyl-ai-yorum-in" value={aiYorum} rows={2} onChange={(e) => setAiYorum(e.target.value)} placeholder={t("neyiBegenmedin", "Neyi beğenmedin? (isteğe bağlı) — düzeltelim")} maxLength={600} />
                            <div className="pyl-ai-yorum-alt">
                              <button className="pyl-ai-yorum-gonder" onClick={() => aiBegenmeGonder(o, true)}>{t("gonder", "Gönder")}</button>
                              <button className="pyl-ai-yorum-yeni" onClick={() => aiBegenmeGonder(o, false)}>{t("yeniOner", "Yeni öner")}</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* AVATAR SEÇİMİ — gönderi profil fotoğrafı VEYA şirket amblemi ile (sadece amblem varsa) */}
            {isFoto && (
              <div className="pyl-avsec">
                <button className={"pyl-avsec-btn" + (paylasAvatar === "profil" ? " secili" : "")} onClick={() => setPaylasAvatar("profil")}>
                  <span className="pyl-avsec-foto">{foto ? <img src={foto} alt="" referrerPolicy="no-referrer" /> : ((adTam && adTam.trim()[0]) || "?").toUpperCase()}</span>
                  {t("paylasAvProfil", "Profil fotoğrafım")}
                </button>
                <button className={"pyl-avsec-btn" + (paylasAvatar === "amblem" ? " secili" : "")} onClick={() => setPaylasAvatar("amblem")}>
                  <span className="pyl-avsec-foto amblem"><img src={isFoto} alt="" referrerPolicy="no-referrer" /></span>
                  {t("paylasAvAmblem", "Şirket amblemi")}
                </button>
              </div>
            )}
            {/* FOTOĞRAF EDİTÖRÜ — üzerine fotoğraf+yazı ekle, parmakla taşı (çok katmanlı) */}
            {paylasGorsel && (
              <button className="pyl-editor-ac" onClick={paylasEditorAc}>
                <span className="pyl-editor-pir" aria-hidden="true"><Elmas4 c="#FFD700" /></span>
                {t("fotoDuzenle", "Düzenle: üzerine yazı & fotoğraf ekle, parmakla taşı")}
              </button>
            )}
            {/* GLOXORG FİLİGRANI aç/kapa — fotoğrafta ZATEN GLOXORG varsa kapat (çift yazı olmasın) */}
            {paylasGorsel && (
              <button className={"pyl-filigran-tog" + (filigranEkle ? " acik" : "")} onClick={() => setFiligranEkle((v) => !v)}>
                <span className="pyl-filigran-kutu">{filigranEkle ? "✓" : ""}</span>
                <span>{filigranEkle ? t("filigranAcik", "◈ GLOXORG filigranı eklenecek") : t("filigranKapali", "Filigran KAPALI (fotoğrafta zaten GLOXORG varsa böyle kalsın)")}</span>
              </button>
            )}
            {/* YAZI KONUMU — varsayılan AYRI ŞERİT (medyayı kapatmaz); istersen medyanın ÜZERİNE koy */}
            {(paylasGorsel || paylasVideo) && paylasYazi.trim() && (
              <button className={"pyl-filigran-tog" + (yaziMedyaUstunde ? " acik" : "")} onClick={() => setYaziMedyaUstunde((v) => !v)}>
                <span className="pyl-filigran-kutu">{yaziMedyaUstunde ? "✓" : ""}</span>
                <span>{yaziMedyaUstunde ? t("yaziUstunde", "Yazı fotoğraf/videonun ÜZERİNDE") : t("yaziAyri", "Yazı AYRI şeritte (medyayı kapatmaz) — üstüne koymak için dokun")}</span>
              </button>
            )}
            {/* GLOXORG.COM'U YAZIYA EKLE — SADECE yöneticiye (sana) görünür; imlecin olduğu yere "gloxorg.com" koyar → yazıda tıklanabilir link olur, karşı taraf basınca sayfa açılır. Kendiliğinden çıkmaz, SEN koyarsın. */}
            {yoneticiMi() && (
            <button type="button" className="pyl-filigran-tog pyl-gloxekle acik" onClick={() => {
              const el = paylasYaziRef.current; const s = paylasYazi || ""; const ek = "gloxorg.com";
              const bas = el ? el.selectionStart : s.length; const bit = el ? el.selectionEnd : s.length;
              const araOnce = (bas > 0 && !/\s/.test(s[bas - 1])) ? " " : "";
              const eklenen = araOnce + ek + " ";
              const yeni = s.slice(0, bas) + eklenen + s.slice(bit);
              setPaylasYazi(yeni); setPaylasDurum("");
              setTimeout(() => { try { el.focus(); const p2 = bas + eklenen.length; el.setSelectionRange(p2, p2); } catch (e) {} }, 0);
              bilgiBalonu(t("gloxEklendi", "gloxorg.com eklendi ✓ — dokununca sayfa açılır (sadece sen bu düğmeyi görürsün)"));
            }}>
              <span className="pyl-filigran-kutu">🔗</span>
              <span>{t("gloxYaziyaEkle", "Yazıma “gloxorg.com” ekle (istediğin yere; dokununca sayfa açılır)")}</span>
            </button>
            )}
            <input ref={paylasFotoRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={paylasFotoSec} />
            <input ref={paylasVideoRef} type="file" accept="video/*" style={{ display: "none" }} onChange={paylasVideoSec} />
            <input ref={paylasFotoKamRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={paylasFotoSec} />
            <input ref={paylasVideoKamRef} type="file" accept="video/*" capture="environment" style={{ display: "none" }} onChange={paylasVideoSec} />
            <input ref={paylasDosyaRef} type="file" style={{ display: "none" }} onChange={paylasDosyaSec} />
            {paylasDurum === "buyuk" && <div className="adm-durum hata">{t("paylasVideoBuyuk4", "Bu video çok büyük (en fazla 200 MB). Daha kısa bir video seç.")}</div>}
            {paylasDurum === "video" && <div className="adm-durum">{t("paylasVideoYuk", "Video yükleniyor…")} %{paylasYukleme}</div>}
            {paylasDurum === "videohata" && <div className="adm-durum hata">{t("paylasVideoHata2", "Video yüklenemedi, tekrar dene (internet/dosya boyutu).")}{paylasHataDetay ? " — " + paylasHataDetay : ""}</div>}
            {/* MEDYA EKLE — Fotoğraf / Video (basınca Çek/Galeri seçtirir) / Dosya */}
            <div className="pyl-medya2">
              <button className={"pyl-medya2-btn" + (medyaMenu === "foto" ? " acik" : "") + (paylasGorsel ? " dolu" : "")} style={{ "--c": "#2ecc71" }} onClick={() => setMedyaMenu(medyaMenu === "foto" ? "" : "foto")}>
                <span className="pyl-ik" style={{ color: "#2ecc71" }} aria-hidden="true"><TurAmblem tip="foto" /></span>{t("turFoto", "Fotoğraf")}</button>
              <button className={"pyl-medya2-btn" + (medyaMenu === "video" ? " acik" : "") + ((paylasVideo || paylasVideoFile) ? " dolu" : "")} style={{ "--c": "#e74c3c" }} onClick={() => setMedyaMenu(medyaMenu === "video" ? "" : "video")}>
                <span className="pyl-ik" style={{ color: "#e74c3c" }} aria-hidden="true"><TurAmblem tip="video" /></span>{t("turVideo", "Video")}</button>
              <button className={"pyl-medya2-btn" + (paylasDosya ? " dolu" : "")} style={{ "--c": "#7fb0ff" }} onClick={() => { setMedyaMenu(""); if (paylasDosyaRef.current) paylasDosyaRef.current.click(); }}>
                <span className="pyl-ik" style={{ color: "#7fb0ff" }} aria-hidden="true"><TurAmblem tip="dosya" /></span>{t("dosya", "Dosya")}</button>
            </div>
            {(medyaMenu === "foto" || medyaMenu === "video") && (
              <div className="pyl-medya-menu">
                <button className="pyl-mm-btn" onClick={() => { const r = medyaMenu === "foto" ? paylasFotoKamRef : paylasVideoKamRef; setMedyaMenu(""); if (r.current) r.current.click(); }}>📷 {t("kamerayla", "Kamerayla çek")}</button>
                <button className="pyl-mm-btn" onClick={() => { const r = medyaMenu === "foto" ? paylasFotoRef : paylasVideoRef; setMedyaMenu(""); if (r.current) r.current.click(); }}>🖼️ {t("galeriden", "Galeriden seç")}</button>
              </div>
            )}
            {/* CANLI KONUM — foto/video/yazı hepsine: "nereden paylaşıldı" (hastane/havalimanı/otogar/şehir); Gloxoo o yere göre yazar */}
            <button className={"pyl-konum-btn" + (paylasKonum ? " acik" : "") + (konumDurum === "aliniyor" ? " yukleniyor" : "")} onClick={konumAl} disabled={konumDurum === "aliniyor"}>
              <span className="pyl-konum-ik" aria-hidden="true">📍</span>
              <span className="pyl-konum-metin">
                {konumDurum === "aliniyor" ? t("konumAliniyor", "Konum alınıyor…")
                  : paylasKonum ? (paylasKonum.tam || t("konumEklendi", "Konum eklendi"))
                  : konumDurum === "hata" ? t("konumHata", "Konum alınamadı — izni aç, tekrar dene")
                  : t("konumEkle", "📍 Konum ekle (nereden paylaşıyorsun?)")}
              </span>
              {paylasKonum && <span className="pyl-konum-sil" aria-hidden="true">✕</span>}
            </button>
            {/* ANKET EKLE — açınca 2-4 şık yazılır; gönderi bir anket olur (takipçiler oy verir) */}
            <button className={"pyl-konum-btn pyl-anket-btn" + (anketAcik ? " acik" : "")} onClick={() => setAnketAcik((v) => !v)}>
              <span className="pyl-konum-ik" aria-hidden="true">📊</span>
              <span className="pyl-konum-metin">{anketAcik ? t("anketKapat", "📊 Anket eklendi (kapatmak için dokun)") : t("anketEkle", "📊 Anket ekle (insanlar oy versin)")}</span>
              {anketAcik && <span className="pyl-konum-sil" aria-hidden="true">✕</span>}
            </button>
            {anketAcik && (
              <div className="pyl-anket">
                <div className="pyl-anket-baslik">{t("anketSoru", "Soru üstteki Başlık / Yazı kutusuna yazılır. Şıkları buraya gir:")}</div>
                {anketSecenekler.map((s, i) => (
                  <div className="pyl-anket-satir" key={i}>
                    <span className="pyl-anket-no">{i + 1}</span>
                    <input className="pyl-anket-in" value={s} maxLength={80} placeholder={t("anketSik", "Şık") + " " + (i + 1)}
                      onChange={(e) => setAnketSecenekler((a) => a.map((x, j) => (j === i ? e.target.value : x)))} />
                    {anketSecenekler.length > 2 && (
                      <button className="pyl-anket-sil" onClick={() => setAnketSecenekler((a) => a.filter((_, j) => j !== i))} aria-label="Şıkkı kaldır">✕</button>
                    )}
                  </div>
                ))}
                {anketSecenekler.length < 4 && (
                  <button className="pyl-anket-ekle" onClick={() => setAnketSecenekler((a) => [...a, ""])}>＋ {t("anketSikEkle", "Şık ekle")}</button>
                )}
              </div>
            )}
            {/* ZEMİN + YAZI RENGİ — yazılı gönderiye (medya yokken) renk şeridi (her türe) */}
            {!paylasGorsel && !paylasVideo && (
              <div className="pyl-zemin">
                {/* YAZI ŞERİDİ EDİTÖRÜ — fotoğraf editörü gibi: zemin + sınırsız yazı şeridi, parmakla taşı */}
                <button className="pyl-editor-ac pyl-yazi-editor" onClick={yaziEditorAc}>
                  <span className="pyl-editor-pir" aria-hidden="true"><Elmas4 c="#7fe0ff" /></span>
                  {t("yaziEditor", "Yazı şeridi editörü — sınırsız yazı, parmakla taşı")}
                </button>
                <div className="pyl-zemin-satir">
                  <span className="pyl-zemin-et">{t("zemin", "Zemin")}</span>
                  {ZEMIN_SECENEK.map((z, i) => (
                    <button key={i} className={"pyl-zsec" + (paylasZemin === z ? " sec" : "")} style={{ background: z || "rgba(255,255,255,.07)" }} onClick={() => setPaylasZemin(z)} aria-label="zemin">{z === "" && <span className="pyl-zyok">∅</span>}</button>
                  ))}
                  <label className="pyl-zsec pyl-zsec-ozel" title={t("kendiRenk", "Kendi rengin")}>
                    <input type="color" value={(paylasZemin && paylasZemin[0] === "#") ? paylasZemin : "#16223e"} onChange={(e) => setPaylasZemin(e.target.value)} />
                  </label>
                </div>
                <div className="pyl-zemin-satir">
                  <span className="pyl-zemin-et">{t("yaziRengi", "Yazı")}</span>
                  {YAZI_SECENEK.map((c, i) => (
                    <button key={i} className={"pyl-zsec" + (paylasYaziRenk === c ? " sec" : "")} style={{ background: c || "rgba(255,255,255,.07)" }} onClick={() => setPaylasYaziRenk(c)} aria-label="yazı rengi">{c === "" && <span className="pyl-zyok">∅</span>}</button>
                  ))}
                  <label className="pyl-zsec pyl-zsec-ozel" title={t("kendiRenk", "Kendi rengin")}>
                    <input type="color" value={paylasYaziRenk || "#ffffff"} onChange={(e) => setPaylasYaziRenk(e.target.value)} />
                  </label>
                </div>
              </div>
            )}
            </div>{/* /pyl-kaydir */}
            <button className="paylas-gonder" onClick={() => { if (duzenlenen && duzenlenen.id) { paylasGonder(); } else { setMedyaMenu(""); setTurSecAcik(true); } }} disabled={paylasDurum === "gonderiliyor" || paylasDurum === "video" || paylasDurum === "dosya" || (!paylasYazi.trim() && !paylasGorsel && !paylasVideoFile && !paylasDosya && !(anketAcik && anketSecenekler.filter((s) => s.trim()).length >= 2))}>
              {paylasDurum === "video" ? (t("paylasVideoYuk", "Video yükleniyor…") + " %" + paylasYukleme) : paylasDurum === "dosya" ? (t("dosyaYukleniyor", "Dosya yükleniyor…") + " %" + paylasYukleme) : paylasDurum === "gonderiliyor" ? t("araMesajGonderiliyor", "Gönderiliyor…") : (paylasDurum === "ok" ? t("paylasOk", "Paylaşıldı ✓") : t("paylasEt", "Paylaş"))}
            </button>
            {paylasDurum === "dosyahata" && <div className="adm-durum hata">{t("dosyaHata", "Dosya yüklenemedi, tekrar dene.")}</div>}
            {paylasDurum === "hata" && <div className="adm-durum hata">{t("araMesajHata", "Gönderilemedi, tekrar dene")}{paylasHataDetay ? " — " + paylasHataDetay : ""}</div>}
            {paylasDurum === "bosicerik" && <div className="adm-durum hata">{t("paylasBosIcerik", "Önce bir şeyler yaz ya da foto/video ekle 👇")}</div>}

            {/* PAYLAŞ'a basınca: NE OLARAK paylaşayım? (kategori) → seçince otomatik paylaşır */}
            {turSecAcik && (
              <div className="pyl-turfon" onClick={(e) => { if (e.target === e.currentTarget) setTurSecAcik(false); }}>
                <div className="pyl-tursec">
                  <div className="pyl-tursec-bas">{t("neOlarak", "Bunu ne olarak paylaşayım?")}<button className="pyl-tursec-kapat" onClick={() => setTurSecAcik(false)} aria-label="Kapat">✕</button></div>
                  <div className="pyl-tursec-liste">
                    <button className="pyl-tursec-btn" style={{ "--c": "#FFD700" }} onClick={() => paylasGonder("")}>
                      <span className="pyl-ik" style={{ color: "#FFD700" }} aria-hidden="true"><TurAmblem tip="yazi" /></span>{t("turNormal", "Normal paylaşım")}</button>
                    {PAYLAS_TURLER.filter((s) => !s.foto && !s.video && !s.dosya).map((s) => (
                      <button key={s.ad} className="pyl-tursec-btn" style={{ "--c": s.renk }} onClick={() => paylasGonder(s.ad)}>
                        <span className="pyl-ik" style={{ color: s.renk }} aria-hidden="true"><TurAmblem tip={s.tip} /></span>{t(s.cev, s.ad)}</button>
                    ))}
                  </div>
                  <div className="pyl-tursec-not">{t("secinceOtomatik", "Seçtiğin an otomatik paylaşılır.")}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAYLAŞIM FOTOĞRAF EDİTÖRÜ — çok katmanlı (foto+yazı, parmakla taşı); profil editöründen AYRI render (kilitliye dokunulmadı) */}
      {duzenAcik && duzenHedef === "paylas" && (
        <div className="apf-panel-fon paylas-editor-fon">
          <div className="ana-pencere apf-pencere paylas-editor-pencere">
            <input ref={editorFotoInputRef} type="file" accept="image/*" onChange={editorFotoEkle} style={{ display: "none" }} />
            <div className="apf-duzen">
              {/* ŞERİT DÜZENİ (composer ile aynı): ÜST BAŞLIK ŞERİDİ → FOTO(önizleme) → ALT YAZI ŞERİDİ → araçlar. İnsanlar sırayı bilsin. */}
              <div className="pyl-serit pyl-serit-baslik apf-serit">
                <span className="pyl-serit-et">📌 {t("paylasBaslikEt", "Başlık")}</span>
                <span className="apf-serit-metin">{paylasBaslik ? paylasBaslik : t("baslikBosEditor", "(başlık yok — Paylaş penceresinde yazabilirsin)")}</span>
              </div>
              <div className="apf-oniz-sar">
                <canvas ref={onizRef} className={"apf-oniz " + sekil} width={ONIZ_W} height={ONIZ_H}
                  onPointerDown={duzenSurukBas} onPointerMove={duzenSurukHar} onPointerUp={duzenSurukBit} onPointerCancel={duzenSurukBit} />
                <div className="apf-katmanlar">
                  {katmanlar.map((kat, i) => (
                    <div className={"apf-kat" + (i === secili ? " sec" : "") + (kat.tip === "yazi" ? " yazi" : "")} key={i} onClick={() => setSecili(i)}>
                      {kat.tip === "yazi"
                        ? <span className="apf-kat-yazi">{(kat.metin || "T").slice(0, 3)}</span>
                        : <canvas width="40" height="40" ref={(el) => { if (el && kat.img) { const cx = el.getContext("2d"); cx.clearRect(0, 0, 40, 40); const t2 = 40 / Math.min(kat.img.width, kat.img.height); cx.drawImage(kat.img, (40 - kat.img.width * t2) / 2, (40 - kat.img.height * t2) / 2, kat.img.width * t2, kat.img.height * t2); } }} />}
                      <button className="apf-kat-sil" onClick={(ev) => { ev.stopPropagation(); katmanSil(i); }} aria-label="sil">×</button>
                    </div>
                  ))}
                  <button className="apf-kat-ekle" onClick={() => editorFotoInputRef.current && editorFotoInputRef.current.click()} title={t("profFotoEkle", "Fotoğraf Ekle")}>+🖼</button>
                  <button className="apf-kat-ekle yazi" onClick={yaziEkle} title={t("profYaziEkle", "Yazı Ekle")}>+T</button>
                </div>
                <div className="apf-ipucu">{t("profSurukleTumu", "Bir öğeye dokun, parmağınla taşı · sil için ×")}</div>
              </div>
              <div className="pyl-serit pyl-serit-yazi apf-serit">
                <span className="pyl-serit-et">✍️ {t("paylasYaziEt", "Yazı")}</span>
                <span className="apf-serit-metin">{paylasYazi ? paylasYazi.slice(0, 70) : t("yaziAltEditor", "(paylaşımda fotoğrafın altına gelir)")}</span>
              </div>
              <div className="apf-arac-akis" onPointerDown={klavyeKapatDokun}>
                {aktifK && aktifK.tip === "yazi" && (
                  <>
                    <textarea className="apf-yazi-input" value={aktifK.metin} onChange={(e) => kGuncelle({ metin: e.target.value })} placeholder={t("profUstYazi", "Yazını yaz (sınırsız — uzun yazı alt satıra kayar)")} maxLength={5000} rows={2} />
                    <div className="apf-renk-sar apf-font-sar"><span>{t("profYaziTipi", "Yazı tipi")}</span>
                      {YAZI_TIPLERI.map(([f, ad, ck]) => (
                        <button key={f} className={"apf-font" + (aktifK.font === f ? " sec" : "")} style={{ fontFamily: f }} onClick={() => yaziTipiSec(f)}>{t(ck, ad)}</button>
                      ))}
                    </div>
                    <label className="apf-zoom"><span>{t("profYaziBoy", "Yazı boyutu")} <b>%{Math.round(aktifK.boy * 100)}</b></span>
                      <input type="range" min="0.4" max="3" step="0.05" value={aktifK.boy} onChange={(e) => kGuncelle({ boy: parseFloat(e.target.value) })} />
                    </label>
                    <div className="apf-arac"><button className="apf-cevir" onClick={() => kGuncelle({ rot: (aktifK.rot || 0) + 15 })}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v4h-4" /></svg>{t("profCevir", "Çevir")}</button></div>
                    <div className="apf-renk-sar"><span>{t("profYaziRenk", "Yazı")}</span>
                      {YAZI_RENKLER.map((c) => (
                        <button key={c} className={"apf-renk" + (aktifK.renk === c ? " sec" : "")} style={{ background: c }} onClick={() => kGuncelle({ renk: c })} aria-label={c} />
                      ))}
                      <label className="apf-konsantrat" title={t("profKendiRenk", "Kendi rengin")}>
                        <input type="color" value={aktifK.renk} onChange={(e) => kGuncelle({ renk: e.target.value })} />
                      </label>
                    </div>
                  </>
                )}
                {aktifK && aktifK.tip === "foto" && (
                  <>
                    <div className="apf-arac">
                      <button className="apf-cevir" onClick={() => kGuncelle({ rot: (aktifK.rot || 0) + 90 })}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v4h-4" /></svg>
                        {t("profCevir", "Çevir")}
                      </button>
                      <button className={"apf-cevir" + (aktifK.gri ? " sec" : "")} onClick={() => kGuncelle({ gri: aktifK.gri ? 0 : 1 })}>{t("profSB", "Siyah-Beyaz")}</button>
                    </div>
                    <label className="apf-zoom"><span>{t("profYakin", "Boyut")} <b>%{Math.round(aktifK.scale * 100)}</b></span>
                      <input type="range" min="0.2" max="3" step="0.01" value={aktifK.scale} onChange={(e) => kGuncelle({ scale: parseFloat(e.target.value) })} />
                    </label>
                    <label className="apf-zoom"><span>{t("profParlak", "Parlaklık")} <b>%{Math.round(aktifK.parlak * 100)}</b></span>
                      <input type="range" min="0.4" max="1.8" step="0.01" value={aktifK.parlak} onChange={(e) => kGuncelle({ parlak: parseFloat(e.target.value) })} />
                    </label>
                    <label className="apf-zoom"><span>{t("profKontrast", "Kontrast")} <b>%{Math.round(aktifK.kontrast * 100)}</b></span>
                      <input type="range" min="0.4" max="1.8" step="0.01" value={aktifK.kontrast} onChange={(e) => kGuncelle({ kontrast: parseFloat(e.target.value) })} />
                    </label>
                  </>
                )}
                <div className="apf-renk-sar"><span>{t("profZeminRenk", "Zemin")}</span>
                  {ZEMIN_RENKLER.map((c) => (
                    <button key={c} className={"apf-renk" + (zeminRenk === c ? " sec" : "")} style={{ background: c }} onClick={() => setZeminRenk(c)} aria-label={c} />
                  ))}
                  <label className="apf-konsantrat" title={t("profKendiRenk", "Kendi rengin")}>
                    <input type="color" value={zeminRenk} onChange={(e) => setZeminRenk(e.target.value)} />
                  </label>
                </div>
              </div>
              <div className="apf-duzen-dugme">
                <button className="apf-vazgec" onClick={() => setDuzenAcik(false)}>{t("profilVazgec", "Vazgeç")}</button>
                <button className="apf-kaydet" onClick={fotoKaydet}>{t("profKaydet", "Kaydet")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YORUM PENCERESİ — gönderiye yorum yaz/oku */}
      {yorumAcik && (
        <div className="msj-fon yorum-fon" onClick={(e) => { if (e.target === e.currentTarget) setYorumAcik(null); }}>
          <div className="msj-pencere">
            <div className="msj-bas">
              <span className="msj-baslik">{t("yorumlar", "Yorumlar")}</span>
              <button className="msj-kapat" onClick={() => setYorumAcik(null)} aria-label="Kapat">✕</button>
            </div>
            <div className="msj-liste">
              {yorumlar === null ? (
                <div className="msj-bos">{t("araYukleniyor", "Yükleniyor…")}</div>
              ) : yorumlar.length === 0 ? (
                <div className="msj-bos">{t("yorumYok", "Henüz yorum yok. İlk yorumu sen yaz.")}</div>
              ) : yorumlar.map((y) => {
                const yb = (String(y.ad || "?").trim()[0] || "?").toUpperCase();
                const ne = y.zamanMs ? new Date(y.zamanMs).toLocaleString(dil || "tr", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
                return (
                  <div className="msj-kart" key={y.id} style={{ cursor: "default" }}>
                    <span className="msj-foto">{y.foto ? <img src={y.foto} alt="" referrerPolicy="no-referrer" /> : yb}</span>
                    <div className="msj-icerik">
                      <div className="msj-ust"><b className="notranslate" translate="no">{y.ad || "—"}</b><i>{ne}</i></div>
                      <div className="msj-metin">{y.metin}</div>
                    </div>
                    {y.uid && u && y.uid !== u.uid && <span className="bgm-karsilik msj-karsilik">{kisiKarsilik(y)}</span>}
                  </div>
                );
              })}
            </div>
            <div className="ara-detay-mesaj">
              <textarea className="adm-yaz" value={yorumYazi} onChange={(e) => { setYorumYazi(e.target.value); setYorumDurum(""); }} placeholder={t("yorumYaz", "Yorum yaz…")} maxLength={500} />
              <button className="adm-gonder" onClick={yorumGonderEt} disabled={yorumDurum === "gonderiliyor" || !yorumYazi.trim()}>
                {yorumDurum === "gonderiliyor" ? t("araMesajGonderiliyor", "Gönderiliyor…") : t("yorumGonder", "Yorum Gönder")}
              </button>
              {yorumDurum === "hata" && <div className="adm-durum hata">{t("araMesajHata", "Gönderilemedi, tekrar dene")}</div>}
            </div>
          </div>
        </div>
      )}

      {/* GÜNÜN ŞEHRİ — tam ekran NET foto görüntüleyici (krem perde yok), indir + GLOXORG'a sor */}
      {/* AYLIK KONUŞMA ARŞİVİ — her AY tek dosya (renkli, ay+yıl), yıl grupları, oku */}
      {arsivAcik && (() => {
        const hepsi = arsivTum.filter((m) => m.zamanMs).sort((a, b) => a.zamanMs - b.zamanMs);
        const map = {};
        // GÜN bazlı: her GÜN ayrı dosya (ay içinde günler tek tek ayrı)
        for (const m of hepsi) { const d = new Date(m.zamanMs); const key = d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); if (!map[key]) map[key] = { key, ms: m.zamanMs, gun: d.getDate(), ay: d.getMonth(), yil: d.getFullYear(), d, konum: m.konum || "", mesajlar: [] }; map[key].mesajlar.push(m); if (m.konum && !map[key].konum) map[key].konum = m.konum; }
        const aylar = Object.values(map).sort((a, b) => b.ms - a.ms);
        const acikG = arsivGun ? map[arsivGun] : null;
        return (
          <div className="arsiv-fon" onClick={() => { if (arsivGun) setArsivGun(null); else setArsivAcik(false); }}>
            <div className="arsiv-pencere" onClick={(e) => e.stopPropagation()}>
              <div className="arsiv-bas">
                <button className="arsiv-geri" onClick={() => { if (arsivGun) setArsivGun(null); else setArsivAcik(false); }} aria-label="Geri"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg></button>
                <b>{acikG ? acikG.d.toLocaleDateString(dil || "tr", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : t("konusmaArsivi", "Konuşma Arşivi")}</b>
                <button className="arsiv-kapat" onClick={() => { setArsivAcik(false); setArsivGun(null); }} aria-label="Kapat">&#10005;</button>
              </div>
              {acikG ? (
                <div className="arsiv-oku">
                  {acikG.konum && <div className="arsiv-oku-konum" style={{ color: GUN_RENK[acikG.ay % GUN_RENK.length] }}>{acikG.konum}</div>}
                  {acikG.mesajlar.map((m, i) => (
                    <div key={i} className={"ai-msj " + (m.rol === "user" ? "ben" : "ai")}>{m.foto && m.foto.dataURL && <img className="ai-msj-foto" src={m.foto.dataURL} alt="" />}{m.metin}{m.zamanMs && <span className="ai-msj-saat">{new Date(m.zamanMs).toLocaleString(dil || "tr", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>}</div>
                  ))}
                </div>
              ) : aylar.length === 0 ? (
                <div className="arsiv-bos">{t("arsivBosGun", "Henüz konuşma yok. Asistanla konuştukça her GÜN burada ayrı bir dosya olur.")}</div>
              ) : (
                <div className="arsiv-liste">
                  {aylar.map((g, i) => {
                    const oncekiAy = i > 0 ? aylar[i - 1].yil + "-" + aylar[i - 1].ay : null;
                    const renk = GUN_RENK[g.gun % GUN_RENK.length];
                    const ilkUser = g.mesajlar.find((m) => m.rol === "user") || g.mesajlar[0];
                    const aciklama = ((ilkUser && ilkUser.metin) || "").slice(0, 46);
                    return (
                      <Fragment key={g.key}>
                        {oncekiAy !== (g.yil + "-" + g.ay) && <div className="arsiv-ay">{g.d.toLocaleDateString(dil || "tr", { month: "long", year: "numeric" })}</div>}
                        <button className="arsiv-kart" style={{ "--gr": renk }} onClick={() => setArsivGun(g.key)}>
                          <span className="arsiv-kart-nokta" style={{ background: renk }} />
                          <span className="arsiv-kart-ic">
                            <b style={{ color: renk }}>{g.d.toLocaleDateString(dil || "tr", { weekday: "long", day: "numeric", month: "long" })}</b>
                            <i>{g.konum ? g.konum + " · " : ""}{g.mesajlar.length} mesaj</i>
                            {aciklama && <u>{aciklama}…</u>}
                          </span>
                          <svg className="arsiv-kart-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}
      {/* KONUŞMALARIM — kayıtlı (yeni açılan) konuşmalar; dokununca o konuşma görünüme gelir */}
      {oturumAcik && (
        <div className="arsiv-fon" onClick={() => setOturumAcik(false)}>
          <div className="arsiv-pencere" onClick={(e) => e.stopPropagation()}>
            <div className="arsiv-bas">
              <button className="arsiv-geri" onClick={() => setOturumAcik(false)} aria-label="Geri"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg></button>
              <b>{t("konusmalarim", "Konuşmalarım")}</b>
              <button className="arsiv-kapat" onClick={() => setOturumAcik(false)} aria-label="Kapat">&#10005;</button>
            </div>
            {oturumlar.length === 0 ? (
              <div className="arsiv-bos">{t("oturumBos", "Henüz kayıtlı konuşma yok. Üstteki + (yeni konuşma) ile yeni bir konuşma başlatınca, eski konuşma buraya kaydedilir.")}</div>
            ) : (
              <div className="arsiv-liste">
                {oturumlar.map((o, i) => {
                  const renk = GUN_RENK[i % GUN_RENK.length];
                  const d = new Date(o.zamanMs);
                  return (
                    <div key={o.id} className="arsiv-kart-sar">
                      <button className="arsiv-kart" style={{ "--gr": renk }} onClick={() => oturumYukle(o)}>
                        <span className="arsiv-kart-nokta" style={{ background: renk }} />
                        <span className="arsiv-kart-ic">
                          <b style={{ color: renk }}>{o.baslik}</b>
                          <i>{d.toLocaleDateString(dil || "tr", { day: "numeric", month: "long", year: "numeric" })} · {(o.mesajlar || []).length} mesaj{o.mod === "site" ? " · site" : ""}</i>
                        </span>
                        <svg className="arsiv-kart-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
                      </button>
                      <button className="arsiv-kart-sil" onClick={(e) => { e.stopPropagation(); oturumSil(o.id); }} aria-label={t("sil", "Sil")} title={t("sil", "Sil")}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" /></svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {sehirAcik && (
        <div className="sehir-fon" onClick={() => setSehirAcik(false)}>
          <div className="sehir-pencere" onClick={(e) => e.stopPropagation()}>
            <button className="sehir-kapat" onClick={() => setSehirAcik(false)} aria-label="Kapat">&#10005;</button>
            <div className="sehir-foto-sar">
              <img className="sehir-foto" src={sehirGaleriUrl} alt={buguninSehri.ad} onClick={() => setSehirFotoNo((n) => n + 1)} />
              <button className="sehir-ok sehir-ok-sol" onClick={() => setSehirFotoNo((n) => Math.max(0, n - 1))} aria-label="Önceki" disabled={sehirFotoNo === 0}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
              </button>
              <button className="sehir-ok sehir-ok-sag" onClick={() => setSehirFotoNo((n) => n + 1)} aria-label="Sonraki">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
            <div className="sehir-bilgi">
              <img src={`https://flagcdn.com/w40/${buguninSehri.kod}.png`} alt="" />
              <b>{buguninSehri.ad}</b><span>{ulkeAdiCevir(buguninSehri.kod, dil, buguninSehri.ulke)}</span>
            </div>
            <div className="sehir-arac">
              <button className="sehir-btn" onClick={sehirIndir}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 11l5 5 5-5M5 21h14"/></svg>
                {t("sehirIndir", "İndir")}
              </button>
              <button className="sehir-btn sehir-ai" onClick={sehirAISor}>
                <span className="sehir-ai-pir" aria-hidden="true"><Elmas4 c="#FFD700" /></span>
                {t("sehirSor", "GLOXORG'a sor")}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* TAM EKRAN GÖNDERİ — foto tüm ekranı kaplar; her şey fotoğrafın İÇİNDE, ŞEFFAF (TikTok gibi) */}
      {tamFoto && (() => {
        const p = tamFoto;
        const ad = p.ad || "—"; const bas = (String(ad).trim()[0] || "?").toUpperCase();
        const altbil = [mc(p.meslek, dil), p.sehir, (p.zaman || zamanOnce(p.zamanMs))].filter(Boolean).join(" · ");
        const tfKendi = p.uid && u && p.uid === u.uid;
        const tfRoz = tfKendi ? benimTasHex : uyeTasHex(p); // isim yanı pırlanta = yazarın üyeliği (mavi/kırmızı/yeşil)
        const tfFoto = (tfKendi && !p.amblem && foto) ? foto : p.foto; // kendi gönderimde güncel avatar
        // TAM EKRAN kategori rozeti (feed'deki gibi: nereden geldiği — Duyuru/Foto/Video/Tavsiye...)
        const tfAmb = postAmblem(p);
        const tfKatAd = p.tur ? turGoster(p.tur) : ({ foto: "Fotoğraf", video: "Video", is: "İş İlanı", urun: "Ürün/Hizmet", tavsiye: "Tavsiye", etkinlik: "Etkinlik", duyuru: "Duyuru", soru: "Soru/Yardım", yazi: "Paylaşım" }[tfAmb.tip] || "Paylaşım");
        const metinPost = !p.video && !p.gorsel; // SADECE yazı gönderisi → altın foto görüntüleyici DEĞİL, okunur yazı sayfası
        const _yzn = (p.yazi || "").length;
        const metinFs = _yzn > 1400 ? 13 : _yzn > 800 ? 14 : _yzn > 400 ? 15.5 : _yzn > 150 ? 17 : 18; // TELEFON: eskiden çok büyüktü → küçültüldü (tablet/PC @760-1100 CSS ile ayrı/büyük)
        // Tam ekran okuyucu da ÇEVİRİYİ taşır: feed'de çevirdiysen burada da çevrili açılır (aynı anahtar = p.id)
        const tfKey = p.id || "tf";
        const tfCev = ceviri[tfKey];
        const tfMetin = (tfCev && tfCev.acik && tfCev.metin) ? tfCev.metin : p.yazi;
        const tfCevBtn = p.yazi ? (
          <span className="tf-cevir-arac">
            <button className="ana-post-cevir tf-cevir" onClick={(e) => { e.stopPropagation(); cevirToggle(p, tfKey); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" /></svg>
              {tfCev && tfCev.yuk ? t("ceviriliyor", "Çevriliyor…") : (tfCev && tfCev.acik ? t("orijinalGoster", "Orijinal") : t("cevir", "Çevir"))}
            </button>
            <button className="ana-post-cevir tf-cevir tf-ai" onClick={(e) => { e.stopPropagation(); yaziAISor(p); }} aria-label={t("yaziAiSor", "GLOXORG'a sor")}><span className="apr-ai-tas" aria-hidden="true"><Elmas4 c="#FFD700" /></span>{t("aiSor", "Sor")}</button>
          </span>
        ) : null;
        // OYNATMA/SEEK çubuğu — artık alt KOLON (.tf-dip) içinde (sabit konum yok → çakışmaz)
        const tfVidBar = p.video ? (
          <div className="tf-vid-bar" onClick={(e) => e.stopPropagation()}>
            <button className="tf-vid-dugme" onClick={vidTikla} aria-label={vidOyn ? "Duraklat" : "Oynat"}>
              {vidOyn
                ? <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                : <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
            </button>
            <span className="tf-vid-zaman">{vidSn(vidT)} / {vidSn(vidSure)}</span>
            <input className="tf-vid-seek" type="range" min="0" max={vidSure || 0} step="0.1" value={vidT}
              style={{ "--ilerle": (vidSure ? (vidT / vidSure) * 100 : 0) + "%" }}
              onChange={(e) => { if (tamVideoRef.current) { tamVideoRef.current.currentTime = Number(e.target.value); setVidT(Number(e.target.value)); } }} />
          </div>
        ) : null;
        return (
          <div className={"tamfoto-fon" + (metinPost ? " tf-metin-fon" : "") + (p.video ? " tf-video-fon" : "") + (tfMini ? " tf-mini" : "")} style={metinPost && p.zemin ? { background: p.zemin } : undefined} onClick={() => { if (!tfMini) setTamFoto(""); }}>
            {/* TAM AÇILIŞ = ORİJİNAL: video ise kontrollü oynat; fotoğraf ise galeri gibi tam + parmakla zoom */}
            {p.video
              ? <div className="tf-vid-sar" onClick={(e) => e.stopPropagation()} style={tfMini && tfVidOran ? { aspectRatio: tfVidOran.toFixed(3) } : undefined}>
                  <video ref={tamVideoRef} className="tamfoto-video" src={videoSade(p.video)} autoPlay muted playsInline preload="auto"
                    poster={p.videoPoster || undefined}
                    onClick={vidTikla}
                    onTimeUpdate={(e) => setVidT(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => { setVidSure(e.currentTarget.duration || 0); const w = e.currentTarget.videoWidth, h = e.currentTarget.videoHeight; if (w && h) setTfVidOran(w / h); }}
                    onPlay={() => setVidOyn(true)} onPause={() => setVidOyn(false)} />
                  {!vidOyn && (
                    <button className="tf-vid-buyuk" onClick={vidTikla} aria-label="Oynat"><GercekPirlanta cerceve={false} c="#ffd700" /></button>
                  )}
                  {/* KÜÇÜLT / BÜYÜT — video oynarken köşeye küçült, sayfada gez; tekrar büyüt */}
                  {!tfMini
                    ? <button className="tf-kucult" onClick={(e) => { e.stopPropagation(); setTfMini(true); }} aria-label="Küçült" title="Küçült">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4v5H4M20 9h-5V4M4 15h5v5M15 20v-5h5" /></svg>
                      </button>
                    : <button className="tf-buyut" onClick={(e) => { e.stopPropagation(); setTfMini(false); }} aria-label="Büyüt" title="Büyüt">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
                      </button>}
                  {tfMini && (
                    <button className="tf-mini-kapat" onClick={(e) => { e.stopPropagation(); setTamFoto(""); }} aria-label="Kapat">✕</button>
                  )}
                </div>
              : metinPost
              ? <div className="tf-metin-sar" onTouchStart={fotoTouchStart} onTouchMove={fotoTouchMove} onTouchEnd={fotoTouchEnd}>
                  <div translate="no" className="tf-metin-kart notranslate" onClick={(e) => e.stopPropagation()} style={{ fontSize: metinFs + "px", lineHeight: metinFs <= 18 ? 1.4 : 1.32, ...(p.yaziRenk ? { color: p.yaziRenk } : {}) }}>{tfMetin}</div>
                  <div className="tf-metin-cevir" onClick={(e) => e.stopPropagation()}>{tfCevBtn}</div>
                </div>
              : <>
                  {p.gorsel && <div className="tamfoto-blur" style={{ backgroundImage: `url(${p.gorsel})` }} aria-hidden="true" />}
                  <img className="tamfoto-img" src={p.gorsel} alt="" referrerPolicy="no-referrer"
                    style={{ transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})`, cursor: zoom.s > 1 ? "grab" : "zoom-in" }}
                    onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => { e.stopPropagation(); fotoCiftDokun(); }}
                    onTouchStart={fotoTouchStart} onTouchMove={fotoTouchMove} onTouchEnd={fotoTouchEnd} onWheel={fotoTeker} />
                </>}
            {p.ustYazi && p.ustYazi.metin && <span className={"tf-ustyazi yer-" + (p.ustYazi.yer || "alt") + " boy-" + (p.ustYazi.boyut || "orta")} style={{ color: p.ustYazi.renk || "#fff" }}>{p.ustYazi.metin}</span>}
            <button className="tamfoto-kapat" onClick={() => setTamFoto("")} aria-label="Kapat">✕</button>
            {/* ÜST — yazan (şeffaf) */}
            <div className="tf-ust" onClick={(e) => e.stopPropagation()}>
              <span className={"tf-avatar uye-ac" + (p.amblem ? " amblem" : "")} onClick={(e) => { e.stopPropagation(); uyeyiAc(p); }}>{tfFoto ? <img src={tfFoto} alt="" referrerPolicy="no-referrer" /> : bas}</span>
              <div className="tf-kim">
                <b className="notranslate" translate="no">{ad} <span className="ana-post-rozet"><Elmas4 c={tfRoz} /></span></b>
                {altbil && <i>{altbil}</i>}
              </div>
              {p.uid && u && p.uid !== u.uid && (
                <button className={"apr-takip tf-takip takip-ik" + (takipSet.has(p.uid) ? " ediliyor" : "") + (takipBalon === p.uid ? " balon-gor" : "")} onClick={(e) => { e.stopPropagation(); takipToggle(p); }} aria-label={takipSet.has(p.uid) ? t("takipEdiliyor", "Takip ✓") : t("takipEt", "+ Takip")}>
                  {takipSet.has(p.uid)
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3.2 2.5-5 5.5-5s5.5 1.8 5.5 5" /><path d="M19 8v6M22 11h-6" /></svg>}
                  <span className="takip-balon">{takipSet.has(p.uid) ? t("takipEdiliyor", "Takip ✓") : t("takipEt", "+ Takip")}</span>
                </button>
              )}
              {/* KATEGORİ ROZETİ (feed gibi) — takip SOLDA, kategori TAM SAĞDA; karışık tf-tip kaldırıldı */}
              <span className="apr-kategori notranslate" translate="no" title={tfKatAd}>
                <span className="apr-kategori-ik" style={{ color: tfAmb.renk }} aria-hidden="true"><TurAmblem tip={tfAmb.tip} /></span>
                <span className="apr-kategori-ad">{tfKatAd}</span>
              </span>
            </div>
            {/* ALT KOLON — yazı/Çevir/Sor → oynatma çubuğu → ikonlar TEK DİKEY kolonda STACK (asla üst üste binmez) */}
            <div className="tf-dip">
              {/* İNDİRME + 3 NOKTA — sağ üstte ayrı satır (foto/videoya ait) */}
              <div className="tf-ustarac" onClick={(e) => e.stopPropagation()}>
                <a className="tf-ic tf-indir" href={p.video || p.gorsel || "#"} download target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} aria-label={pl(aiDil, "indir")}>{Ikon.indir}</a>
                <button className="tf-ic tf-daha" aria-label={t("dahaFazla", "Daha fazla")} onClick={() => dahaAc(p)}><span className="daha-tas" aria-hidden="true"><Elmas4 c="#1a1a1a" /></span></button>
              </div>
              {/* YAZI + Çevir/Sor (foto/video açıklaması) */}
              {p.yazi && !metinPost && (
                <div className="tf-alt" onClick={(e) => e.stopPropagation()}>
                  <div translate="no" className="tf-yazi notranslate">{metniLinkle(tfMetin)}</div>
                  {tfCevBtn}
                </div>
              )}
              {/* OYNATMA / SEEK çubuğu (video) */}
              {tfVidBar}
              {/* İKON ŞERİDİ + BEĞENENLER — DİKEY: beğenenler altta (yer müsait). YATAY (kısa ekran): beğenen fotoğrafları
                  ikonların SAĞINA geçer (alt şerit YOK, pencereyi kapatmaz) — kullanıcı isteği. tf-rail-satir CSS ile yönlenir. */}
              <div className="tf-rail-satir">
                <div className="tf-rail" onClick={(e) => e.stopPropagation()}>
                  {/* BEĞENİ ikonu + hemen YANINDA beğenenlerin fotoğrafları (kullanıcı: geniş ekranda yer var) */}
                  <span className="tf-ic-cift">
                    <button className={"tf-ic ape-kalp" + (begeniSet.has(p.id) ? " dolu" : "") + (kalpPatla === p.id ? " patla" : "")} onClick={() => begeniTik(p)} onPointerDown={() => begeniBas(p)} onPointerUp={begeniBirak} onPointerLeave={begeniBirak} onPointerCancel={begeniBirak}>{begeniIkon(p)}{tepkiCubugu(p)}{kalpPatla === p.id && <span className="kalp-patla" aria-hidden="true"><i/><i/><i/><i/><i/></span>}<span className="tf-sayi">{((gercekBegeni[p.id] != null ? gercekBegeni[p.id] : (p.begeni || 0))).toLocaleString()}</span></button>
                    <BegenenlerSerit postId={p.id} sayi={p.begeni || 0} dil={dil} onAc={begenenlerAc} onSayi={begeniSayiBildir} />
                  </span>
                  {/* YORUM ikonu + hemen YANINDA yorum yapanların fotoğrafları */}
                  <span className="tf-ic-cift">
                    <button className="tf-ic ape-yorum" onClick={() => yorumAc(p)}>{Ikon.yorum}</button>
                    <YorumcuSerit postId={p.id} sayi={p.yorumSayisi || 0} onAc={() => yorumAc(p)} />
                  </span>
                  <button className="tf-ic ape-paylas" onClick={() => paylasNative(p)}>{Ikon.paylas}</button>
                  <button className={"tf-ic tf-kaydet" + (kaydetSet.has(p.id) ? " dolu" : "")} onClick={() => kaydetToggle(p)}>{Ikon.kaydet}</button>
                  <button className="tf-ic ape-mesaj" onClick={() => { setTamFoto(""); if (p.uid && p.ad) sohbetAc({ uid: p.uid, ad: p.ad, foto: p.foto }); }}>{Ikon.mesaj}</button>
                </div>
              </div>
            </div>
            {/* GLOXORG amblemi — SADECE VİDEO/YAZI gönderisinde (fotoğrafa GLOXORG zaten gömülü → ÇİFT olmasın, kullanıcı isteği) */}
            {(p.video || metinPost) && <span className="tf-amblem notranslate" translate="no"><Elmas4 c="#ffd700" /> GLOXORG</span>}
          </div>
        );
      })()}

      {/* ÜYE SAYFASI — başka birinin paylaşımları (profilden bağımsız, kendi sayfası).
          Avatara basınca / tam ekranda sola çekince açılır. Tür bölümleri + üst başlık + takip. */}
      {uyeSayfa && (() => {
        const us = uyeSayfa;
        const harf = (String(us.ad || "?").trim()[0] || "?").toUpperCase();
        const rozRenk = uyeTasHex(us); // kişinin üyeliğine göre: müşteri=kırmızı, pro=mavi, altın=yeşil
        const meslekRenk = MESLEK_RENK[us.meslek] || "#FFD700";
        const altbil = [mc(us.meslek, dil), us.sehir].filter(Boolean).join(" · ");
        const tumLer = uyePostlar || [];
        const liste = uyeFiltre === "hepsi" ? tumLer : tumLer.filter((g) => (g.tur || (g.video ? "Video" : g.gorsel ? "Fotoğraf" : "")) === uyeFiltre);
        const ediliyor = takipSet.has(us.uid);
        return (
          <div className="uye-fon" onClick={(e) => { if (e.target === e.currentTarget) setUyeSayfa(null); }}>
            <div className="uye-sayfa">
              <button className="uye-kapat" onClick={() => setUyeSayfa(null)} aria-label="Kapat">✕</button>
              {/* ÜST BAŞLIK — avatar, isim, meslek, takip */}
              <div className="uye-bas">
                <span className={"uye-av" + (us.amblem ? " amblem" : "")} style={{ background: us.renk || ("linear-gradient(145deg," + meslekRenk + ",#0d1b3a)") }}>
                  {us.foto ? <img src={us.foto} alt="" referrerPolicy="no-referrer" /> : harf}
                </span>
                <div className="uye-kim">
                  <b className="notranslate" translate="no">{us.ad} <span className="ana-post-rozet"><Elmas4 c={rozRenk} /></span></b>
                  {altbil && <i style={{ color: meslekRenk }}>{altbil}</i>}
                  <span className="uye-say">{tumLer.length} {t("profPaylasim", "paylaşım")}</span>
                </div>
                {auth.currentUser && us.uid !== auth.currentUser.uid && (
                  <button className={"apr-takip uye-takip" + (ediliyor ? " ediliyor" : "")} onClick={() => takipToggle(us)}>{ediliyor ? t("takipEdiliyor", "Takip ✓") : t("takipEt", "+ Takip")}</button>
                )}
              </div>
              {/* BÖLÜM FİLTRELERİ — her tür kendi amblemi+rengiyle (Profilim ile aynı) */}
              <div className="apf-bolumler uye-bolumler">
                <button className={"apf-bolum" + (uyeFiltre === "hepsi" ? " aktif" : "")} style={{ "--bc": "#FFD700" }} onClick={() => setUyeFiltre("hepsi")} title={t("feedHepsi", "Hepsi")} aria-label={t("feedHepsi", "Hepsi")}>
                  <span className="apf-bolum-ad">{t("feedHepsi", "Hepsi")}</span>
                  <span className="apf-bolum-ik"><TurAmblem tip="hepsi" /></span>
                </button>
                {PAYLAS_TURLER.map((s) => (
                  <button key={s.ad} className={"apf-bolum" + (uyeFiltre === s.ad ? " aktif" : "")} style={{ "--bc": s.renk }} onClick={() => setUyeFiltre(s.ad)} title={t(s.cev, s.ad)} aria-label={t(s.cev, s.ad)}>
                    <span className="apf-bolum-ad">{t(s.cev, s.ad)}</span>
                    <span className="apf-bolum-ik"><TurAmblem tip={s.tip} /></span>
                  </button>
                ))}
              </div>
              {/* GÖNDERİ IZGARASI — basınca tam ekran açılır */}
              <div className="uye-icerik">
                {uyePostlar === null ? (
                  <div className="apf-pay-bos">{t("araYukleniyor", "Yükleniyor…")}</div>
                ) : tumLer.length === 0 ? (
                  <div className="apf-pay-bos">{t("uyePaylasimYok", "Bu üyenin henüz paylaşımı yok.")}</div>
                ) : liste.length === 0 ? (
                  <div className="apf-pay-bos">{t("profBolumBos", "Bu bölümde paylaşım yok.")}</div>
                ) : (
                  /* Profilim ile AYNI kart düzeni: pencere fotoğrafa göre (dik/yatay) — sabit kare YOK */
                  <div className="uye-liste">
                    {liste.map((g, gi) => {
                      const ga = postAmblem(g); const gk = ga ? ga.renk : POST_RENK[gi % POST_RENK.length];
                      const ac = () => { setUyeSayfa(null); setTamFoto({ ...g, ad: g.ad || us.ad, foto: g.foto || us.foto, meslek: g.meslek || us.meslek, uid: g.uid || g.sahipUid || us.uid }); };
                      return (
                        <div className="apf-pay-kart" key={g.id} style={{ borderLeftColor: gk }}>
                          {g.gorsel
                            ? <img className="apf-pay-foto" src={g.gorsel} alt="" referrerPolicy="no-referrer" onClick={ac} />
                            : g.video
                              ? <span className="apf-pay-foto apf-pay-vid" onClick={ac}><video src={videoSade(g.video)} poster={g.videoPoster || undefined} preload="metadata" muted playsInline tabIndex={-1} /><span className="apf-pay-oynat" aria-hidden="true"><GercekPirlanta cerceve={false} c="#e0202c" /></span></span>
                              : null}
                          <div className="apf-pay-icerik" onClick={ac}>
                            {(g.tur || ga) && <span className="apf-pay-tur" style={{ background: gk }}>{ga && <span className="apf-pay-turik"><TurAmblem tip={ga.tip} /></span>}{g.tur ? turGoster(g.tur) : (g.video ? t("paylasVideoTur", "Video") : t("paylasFotoTur", "Fotoğraf"))}</span>}
                            {g.yazi && <div className="apf-pay-yazi">{g.yazi}</div>}
                            <div className="apf-pay-zaman">{zamanOnce(g.zamanMs)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* BAŞA DÖN OKU — ana sayfada aşağı inince ortada belirir, durunca kaybolur; basınca en üste tam hızla çıkar */}
      {aktifKod === "home" && !tamFoto && !uyeSayfa && (
        <button className={"ana-basa-ok" + (yukariOk ? " gor" : "")} onClick={basaDon} aria-label={t("basaDon", "Başa dön")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V6" /><path d="M6 12l6-6 6 6" /></svg>
        </button>
      )}

      {/* GLOXORG YARDIMCISI — sağ-alt yapay zeka sohbet balonu (gerçek Claude) */}
      {!uyeSayfa && !paylasAcik && !duzenAcik && !yardimciAcik && !maskotTanit && (
        <div ref={balonRef} className={"ai-balon-sar" + (tamFoto ? " ust" : "") + (maskotMini ? " mini-aktif" : "")} style={balonYer ? { left: balonYer.x, top: balonYer.y, right: "auto", bottom: "auto" } : undefined}
          onPointerDown={balonBas} onPointerMove={balonGit} onPointerUp={balonBitir} onPointerCancel={balonBitir}>
          {/* KÜÇÜKKEN KONUŞURKEN: üstte küçük konuşma balonu (istek: ufakken de konuşunca balon çıksın) */}
          {maskotMini && maskotMetni && (aiKonusuyor || aiDuraklat) && (
            <div className="ai-mini-balon">{kelimeBalon(maskotMetni, RC_KOYU, okunanKelime)}</div>
          )}
          {/* MASKOT — her yerde gezen GLOXORG karakteri (konuşurken şişer/canlanır) */}
          <button className={"ai-balon" + (aiKonusuyor ? " konusuyor" : "") + (dinliyor ? " dinliyor" : "") + (maskotKizgin ? " kizgin" : "")}
            onClick={balonTik} aria-label={t("yardimciAc", "GLOXORG Yardımcısı")}>
            <MaskotYuz konusuyor={aiKonusuyor} dinliyor={dinliyor} arastir={yardimciYukleniyor} tur="grox" boyut={52} rozet />
          </button>
          {/* Maskotun ALTINDA renkli İKON düğmeler — KAPALI/dinlenirken BİLE hep görünür (kullanıcı: hiç kaybolmasın).
              Yaz = metin paneli; Ses = AÇ/KAPA (büyütmeden konuş/sus — yeşil konuş, kırmızı sus). */}
          {(
            <div className="ai-mini-alt" onPointerDown={(e) => e.stopPropagation()}>
              {miniEtiket && <div className="ai-mini-etiket">{miniEtiket}</div>}
              <div className="ai-mini-btnlar">
                <button className="mini-ikon mi-yaz" onClick={(e) => { e.stopPropagation(); miniEtiketGoster(t("yaz", "Yaz")); maskotSohbetAc(); }} aria-label={t("yaz", "Yaz")}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                </button>
                <button className={"mini-ikon mi-ses" + (canliSohbet && !kameraAcik ? " acik" : "")} onClick={(e) => { e.stopPropagation(); miniSesToggle(); }} aria-label={canliSohbet ? t("kapat", "Kapat") : t("konus", "Konuş")}>
                  {canliSohbet
                    ? <span className="mi-canli" aria-hidden="true"><i /><i /><i /></span>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><path d="M12 19v3" /></svg>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {/* MASKOT DOKUNUNCA: BÜYÜK halde konuşur (ağzı oynar), bitince KÖŞESİNE çekilir (panel AÇMAZ). Dokun=sus. "Yaz" = sohbet paneli. */}
      {maskotTanit && !uyeSayfa && (
        <div className={"maskot-tanit" + (maskotKizgin ? " kizgin" : "") + (maskotTur === "ekspert" ? " ekspert-kose" : "")}
          ref={maskotTur === "ekspert" ? eksperPenRef : undefined}
          style={maskotTur === "ekspert" && eksperYer ? { left: eksperYer.x, top: eksperYer.y, right: "auto", bottom: "auto" } : undefined}>
          {maskotTur === "ekspert" && (
            <button className="maskot-tanit-kapat" onClick={(e) => { e.stopPropagation(); maskotKucult(); }} aria-label={t("kapat", "Kapat")}>&#10005;</button>
          )}
          {maskotMetni && <div className="maskot-tanit-balon" ref={maskotBalonRef} onClick={(e) => e.stopPropagation()} onTouchMove={maskotElleKaydir} onWheel={maskotElleKaydir}>{kelimeBalon(maskotMetni, RC_KOYU, okunanKelime)}</div>}
          {maskotTur === "ekspert" ? (
            /* EKSPERT ayı: yüz = TAŞIMA TUTAMACI (parmakla sürükle → istediğin yere). Taşınırken kapanmaz. */
            <div className={"maskot-tanit-yuz tasinir" + (aiKonusuyor ? " konus" : dinliyor ? " dinle" : "")}
              onPointerDown={eksperSurBas} onPointerMove={eksperSurGit} onPointerUp={eksperSurBitir} onPointerCancel={eksperSurBitir}
              onClick={() => { if (eksperSurRef.current.moved) { eksperSurRef.current.moved = false; return; } }}>
              <MaskotYuz konusuyor={aiKonusuyor} dinliyor={dinliyor} arastir={yardimciYukleniyor} tur={maskotTur} boyut={96} rozet />
              <span className="maskot-tasi-ipucu">✥</span>
            </div>
          ) : (
            <div className={"maskot-tanit-yuz" + (aiKonusuyor ? " konus" : dinliyor ? " dinle" : "")} onClick={maskotTanitTik} onTouchStart={maskotDokunBas} onTouchEnd={maskotDokunBit}>
              <MaskotYuz konusuyor={aiKonusuyor} dinliyor={dinliyor} arastir={yardimciYukleniyor} tur={maskotTur} boyut={96} rozet />
            </div>
          )}
          {/* Büyük maskot düğmeleri = KÜÇÜK maskotla AYNI ikonlar (Yaz kalem + ses aç/kapa) */}
          <div className="ai-mini-alt buyuk" onPointerDown={(e) => e.stopPropagation()}>
            {miniEtiket && <div className="ai-mini-etiket">{miniEtiket}</div>}
            <div className="ai-mini-btnlar">
              <button className="mini-ikon mi-yaz" onClick={(e) => { e.stopPropagation(); miniEtiketGoster(t("yaz", "Yaz")); maskotSohbetAc(); }} aria-label={t("yaz", "Yaz")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
              </button>
              <button className={"mini-ikon mi-ses" + (canliSohbet && !kameraAcik ? " acik" : "")} onClick={(e) => { e.stopPropagation(); miniSesToggle(); }} aria-label={canliSohbet ? t("kapat", "Kapat") : t("konus", "Konuş")}>
                {canliSohbet
                  ? <span className="mi-canli" aria-hidden="true"><i /><i /><i /></span>
                  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><path d="M12 19v3" /></svg>}
              </button>
              {/* AYARLAR — güncel/doğru bilgi için bilgilerini doldur (Gloxoo yönlendirir) */}
              <button className="mini-ikon mi-ayar" onClick={(e) => { e.stopPropagation(); miniEtiketGoster(t("ayarlar", "Ayarlar")); try { setAyarlarAcik(true); } catch (er) {} }} aria-label={t("ayarlar", "Ayarlar")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V15z" /></svg>
              </button>
            </div>
          </div>
          {dinliyor ? <div className="maskot-tanit-dinle"><span className="mtd-nokta" /><span className="mtd-nokta" /><span className="mtd-nokta" /> {t("maskotDinliyor", "Seni dinliyorum — buyur, söyle")}</div>
            : (canliSohbet && !aiKonusuyor && !yardimciYukleniyor) ? <div className="maskot-tanit-dinle bekle">⏳ {t("maskotBekle", "Seni bekliyorum, ne dersen söyle")}</div> : null}
          {(aiKonusuyor || aiDuraklat) && (
            <div className="maskot-tanit-dugmeler">
              <button className="maskot-tanit-btn mt-durakla" onClick={(e) => { e.stopPropagation(); sesDuraklaToggle(); }}>{aiDuraklat ? "▶" : "⏸"} {aiDuraklat ? pl(aiDil, "devam") : pl(aiDil, "durakla")}</button>
              <button className="maskot-tanit-btn mt-sus" onClick={(e) => { e.stopPropagation(); sesSus(); }}>🔇 {pl(aiDil, "sus")}</button>
            </div>
          )}
        </div>
      )}
      {/* MASKOT KARŞILAMA BALONU — yeni üye ilk girişte (ana sayfada) bir kez; dokununca asistan açılır, X ile susar/yerine çekilir */}
      {maskotSelam && aktifKod === "home" && !tamFoto && !uyeSayfa && !paylasAcik && !duzenAcik && !yardimciAcik && (
        <div className="ai-maskot-selam" onClick={() => { maskotSelamKapat(); setYardimciMod("sohbet"); setYardimciAcik(true); }}>
          <button className="ai-maskot-kapat" onClick={(e) => { e.stopPropagation(); maskotSelamKapat(); }} aria-label={t("kapat", "Kapat")}>×</button>
          <div className="ai-maskot-metin">
            <b>{t("maskotSelamBas", "Hoş geldin")}{adTam ? " " + adTam.split(" ")[0] : ""}! 👋</b>
            {renkliCumleler(t("maskotSelamGovde", " Ben Gloxoo, Gloxorg dünyasının akıllı kalbi 💎 — paylaşım yazar, yol tarifi veririm, her sayfada yanındayım ve bulunduğun sayfanın uzmanıyım. Bana dokun, konuşalım!"), RC_KOYU)}
          </div>
        </div>
      )}
      {/* GÖRÜNTÜLÜ SOHBET — KENDİ GÖRÜNTÜN (self-view): SÜRÜKLENEBİLİR küçük pencere; Gloxoo seni buradan görür. Ön/arka kamera değiştirilebilir. */}
      {kameraAcik && (
        <div className="kamera-self" ref={kameraPenRef}
          style={kameraYer ? { left: kameraYer.x, top: kameraYer.y, right: "auto", bottom: "auto" } : undefined}
          onPointerDown={kameraSurBas} onPointerMove={kameraSurGit} onPointerUp={kameraSurBitir} onPointerCancel={kameraSurBitir}>
          <video ref={kameraVideoRef} className={"kamera-self-vid" + (kameraYon === "user" ? " ayna" : "")} autoPlay playsInline muted />
          <span className="kamera-self-et">{aiKonusuyor ? t("kameraKonusuyor", "Gloxoo konuşuyor…") : dinliyor ? t("kameraDinliyor", "Dinliyorum…") : (kameraYon === "environment" ? t("kameraEtraf", "Etrafını görüyorum 🌿") : t("kameraGoruyor", "Seni görüyorum 👀"))}</span>
          <button className="kamera-self-cevir" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); kameraDegistir(); }} aria-label={t("kameraCevir", "Ön/arka kamera")} title={t("kameraCevir", "Ön/arka kamera")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 4h3a2 2 0 0 1 2 2v3M9 20H6a2 2 0 0 1-2-2v-3"/><path d="M20 9a8 8 0 0 0-14-3M4 15a8 8 0 0 0 14 3"/></svg>
          </button>
          <button className="kamera-self-kapat" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); kameraKapat(); }} aria-label={t("kapat", "Kapat")}>✕</button>
        </div>
      )}
      {yardimciAcik && (
        <div className="ai-fon" onClick={(e) => { if (e.target === e.currentTarget) setYardimciAcik(false); }}>
          <div className={"ai-pencere " + (proUye ? "ai-tema-pro" : "ai-tema-musteri")}>
            <div className="ai-bas">
              <span className="ai-bas-ad"><button type="button" className={"ai-bas-maskot" + (canliSohbet ? " canli" : "")} onClick={canliSohbetToggle} aria-label={t("canliSohbet", "Canlı Sohbet")} title={t("canliSohbet", "Canlı Sohbet")}><MaskotYuz konusuyor={aiKonusuyor} tur="grox" boyut={32} />{canliSohbet && <span className="ai-bas-canli-nokta" />}</button>{yardimciMod === "site" ? t("siteAsistan", "Site Asistanı") : t("yardimciBaslik", "GLOXORG Yardımcısı")}</span>
              {/* KONUM DURUM İKONU — panelin üstünde konumun AÇIK/KAPALI olduğunu gösterir; dokununca aç/kapa (hızlı). Açık=yeşil, kapalı=gri. */}
              <button type="button" className={"ai-bas-konum" + (tamKonumIzin ? " acik" : "")} onClick={tamKonumToggle}
                aria-label={tamKonumIzin ? t("konumAcik", "Konum açık") : t("konumKapali", "Konum kapalı")}
                title={tamKonumIzin ? ((anlikYer && (anlikYer.yer || anlikYer.adres)) ? (anlikYer.yer || (anlikYer.adres || "").split(",").slice(0, 2).join(",")) : t("konumAcik", "Konum açık — Gloxoo tam yerini biliyor")) : t("konumKapali", "Konum kapalı — açmak için dokun")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>
                <span className="ai-bas-konum-nokta" />
              </button>
              {/* KONUŞMALARIM — kayıtlı (yeni açılan) konuşmaların listesi */}
              <button className="ai-arsiv-btn ai-konusma-btn" onClick={() => setOturumAcik(true)} aria-label={t("konusmalarim", "Konuşmalarım")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></svg>
              </button>
              <button className="ai-arsiv-btn" onClick={() => { setArsivGun(null); setArsivAcik(true); }} aria-label={t("gunlukArsiv", "Aylık arşiv")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M7 13h4M7 17h7"/></svg>
              </button>
              <button className="ai-kapat" onClick={() => setYardimciAcik(false)} aria-label="Kapat">✕</button>
            </div>
            {(() => { const aktifMesajlar = yardimciMod === "site" ? siteMesajlar : yardimciMesajlar; return (
            <div className="ai-akis" ref={yardimciAkisRef}>
              {aktifMesajlar.length === 0 && (
                <div className="ai-karsilama">{yardimciMod === "site"
                  ? renkliCumleler(t("siteKarsilama", "Site asistanınım. \"Profilimi aç\", \"paylaşım penceresini aç\", \"aramayı aç\" de — senin için açayım. 🧭"), RC_ACIK)
                  : renkliCumleler(t("yardimciKarsilama", "Merhaba! Ben Gloxoo, Gloxorg dünyasının akıllı kalbi. Paylaşım yazma, meslek tanıtımı, müşteri bulma — ne istersen sor. 🤖"), RC_ACIK)}</div>
              )}
              {aktifMesajlar.map((m, i) => {
                const onceki = aktifMesajlar[i - 1];
                const gunFarkli = m.zamanMs && (!onceki || !onceki.zamanMs || new Date(m.zamanMs).toDateString() !== new Date(onceki.zamanMs).toDateString());
                let ayrac = null;
                if (gunFarkli) {
                  const d = new Date(m.zamanMs);
                  const renk = GUN_RENK[d.getDay()];
                  const bas = d.toLocaleDateString(dil || "tr", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
                  ayrac = (
                    <div className="ai-gun-ayrac" style={{ "--gr": renk }}>
                      <span style={{ background: renk }} />
                      <b style={{ color: renk }}>{bas}</b>
                      {m.konum && <i>· {m.konum}</i>}
                    </div>
                  );
                }
                return (
                  <Fragment key={i}>
                    {ayrac}
                    <div className={"ai-msj " + (m.rol === "user" ? "ben" : "ai")}>
                      {m.foto && m.foto.dataURL && <img className="ai-msj-foto" src={m.foto.dataURL} alt="" />}
                      {m.ek && m.ek.tur === "video" && (m.ek.url || m.ek.dataURL) && <video className="ai-msj-video" src={m.ek.url || m.ek.dataURL} controls playsInline />}
                      {m.ek && m.ek.tur !== "video" && <span className="ai-msj-dosya">{m.ek.tur === "pdf" ? "📄" : m.ek.tur === "metin" ? "📝" : "📎"} {m.ek.ad}</span>}
                      {m.rol === "user" ? m.metin : renkliCumleler(m.metin, RC_ACIK)}
                      {m.zamanMs && <span className="ai-msj-saat">{new Date(m.zamanMs).toLocaleTimeString(dil || "tr", { hour: "2-digit", minute: "2-digit" })}</span>}
                      {/* AI mesajını TEKRAR sesli okut (istediğin kadar) */}
                      {m.rol !== "user" && m.metin && (
                        <button className={"ai-oku-btn" + (konusanMesaj === i ? " okuyor" : "")} onClick={(e) => { e.stopPropagation(); okuToggle(m.metin, i); }} aria-label={konusanMesaj === i ? t("durdur", "Durdur") : t("tekrarOku", "Sesli oku")}>
                          {konusanMesaj === i
                            ? <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>
                            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4zM16 9a3 3 0 0 1 0 6M18.5 7a6 6 0 0 1 0 10"/></svg>}
                        </button>
                      )}
                    </div>
                    {/* HAZIRLANAN İÇERİK — SADECE burada (AI'nin sohbet baloncuğundan AYRI): ne kopyalayacağını görürsün; kopya/indir/paylaş YALNIZCA bu metni alır (sohbeti değil) */}
                    {m.rol !== "user" && m.paylasim && (
                      <div className="ai-paylasim-kart">
                        <div className="ai-paylasim-metin">{m.paylasim}</div>
                        <div className="ai-paylasim-arac">
                          <button className={"ai-paylasim-btn oku" + (konusanMesaj === "p" + i ? " okuyor" : "")} onClick={() => okuToggle(m.paylasim, "p" + i)}>
                            {konusanMesaj === "p" + i
                              ? <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>
                              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4zM16 9a3 3 0 0 1 0 6M18.5 7a6 6 0 0 1 0 10"/></svg>}
                            {konusanMesaj === "p" + i ? pl(aiDil, "durdur") : pl(aiDil, "oku")}
                          </button>
                          <button className="ai-paylasim-btn kopya" onClick={() => panoyaKopyala(m.paylasim)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>
                            {pl(aiDil, "kopyala")}
                          </button>
                          <button className="ai-paylasim-btn indir" onClick={() => metniIndir(m.paylasim)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>
                            {pl(aiDil, "indir")}
                          </button>
                          <button className="ai-paylasim-btn paylas" onClick={() => paylasimaTasi(m.paylasim)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>
                            {pl(aiDil, "paylas")}
                          </button>
                        </div>
                      </div>
                    )}
                    {/* MÜŞTERİ LİMİTİ DOLDU → Profesyonele yönlendirme düğmesi (açıklamalı) */}
                    {m.proButon && (
                      <div className="ai-pro-sar">
                        <button className="ai-pro-btn" onClick={proYukselt}>
                          <span className="ai-pro-pir" aria-hidden="true"><Elmas4 c="#ff5d6c" /></span>
                          {t("proGec", "Profesyonel üyeliğe geç")}
                        </button>
                      </div>
                    )}
                    {/* 20 LİMİTİ DOLDU → GLOXORG pırlanta üyelik kartlarını aç (canlı yönlendirme ikonlu düğme) */}
                    {m.uyelikTeklif && !uyelik && (
                      <div className="ai-uyelik-sar">
                        <button className="ai-uyelik-btn" onClick={() => setUyelikKartAcik(true)}>
                          <span className="ai-uyelik-pir" aria-hidden="true"><GercekPirlanta c="#e0202c" cerceve={false} /><GercekPirlanta c="#FFD700" cerceve={false} /></span>
                          <span className="ai-uyelik-yazi">{t("uyelikKartlariAc", "Üyelik kartlarını aç")}</span>
                          <span className="ai-uyelik-yon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg></span>
                        </button>
                      </div>
                    )}
                    {/* HER AI MESAJININ ALTINDA (sohbet baloncuğundan AYRI satır) Kopyala/İndir/Paylaş — [PAYLASIM] kartı yoksa da hep çıkar; o mesajı alır */}
                    {m.rol !== "user" && m.metin && !m.paylasim && !m.proButon && !m.uyelikTeklif && (
                      <div className="ai-msj-arac">
                        <button className="ai-msj-arac-btn kopya" onClick={() => panoyaKopyala(m.metin)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>{pl(aiDil, "kopyala")}
                        </button>
                        <button className="ai-msj-arac-btn indir" onClick={() => metniIndir(m.metin)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>{pl(aiDil, "indir")}
                        </button>
                        <button className="ai-msj-arac-btn paylas" onClick={() => paylasimaTasi(m.metin)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>{pl(aiDil, "paylas")}
                        </button>
                      </div>
                    )}
                    {/* HARİTA — yol tarifi düğmesi; dokununca Google Haritalar'da senin konumundan oraya yol tarifi açılır */}
                    {m.rol !== "user" && Array.isArray(m.harita) && m.harita.length > 0 && (
                      <div className="ai-harita-sar">
                        {m.harita.map((h, hi) => (
                          <a key={hi} className="ai-harita-btn" href={h.yer ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(h.yer)}` : (/^(konum|konumum|benim konum|buras[ıi]|nerede)/i.test((h.ad || "").trim()) ? `https://www.google.com/maps/@${h.lat},${h.lon},17z` : `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lon}`)} target="_blank" rel="noreferrer">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
                            <span>{h.ad} — {/^(konum|konumum|benim konum|buras[ıi]|nerede)/i.test((h.ad || "").trim()) ? t("haritadaGor", "Haritada gör") : t("yolTarifi", "Yol tarifi")}</span>
                          </a>
                        ))}
                      </div>
                    )}
                    {/* TIKLANABİLİR ÖNERİLER (AYRI, süslü, ikonlu) — "bunu sana yapayım mı" teklifleri; dokununca DİREKT ona gider */}
                    {m.rol !== "user" && Array.isArray(m.oneriler) && m.oneriler.length > 0 && (
                      <div className="ai-oneri-sar">
                        {m.oneriler.map((o, oi) => {
                          const renk = ONERI_RENK[oi % ONERI_RENK.length];
                          return (
                            <button key={oi} className="ai-oneri-cip" style={{ "--oc": renk }} onClick={() => yardimciGonder(o)} disabled={yardimciYukleniyor}>
                              <span className="ai-oneri-emoji" aria-hidden="true">{oneriIkon(o)}</span>
                              <span>{o}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </Fragment>
                );
              })}
              {yardimciYukleniyor && <div className="ai-msj ai ai-yaziyor"><i></i><i></i><i></i></div>}
              <div ref={yardimciAltRef} />
            </div>
            ); })()}
            {yardimciFoto && (
              <div className="ai-foto-onizle">
                <img src={yardimciFoto.dataURL} alt="" />
                <button onClick={() => setYardimciFoto(null)} aria-label={t("kaldir", "Kaldır")}>&#10005;</button>
              </div>
            )}
            {yardimciEk && (
              <div className="ai-ek-onizle">
                {yardimciEk.tur === "video"
                  ? (yardimciEk.yukleniyor
                      ? <span className="ai-ek-ik">🎥</span>
                      : <video src={yardimciEk.url} muted playsInline className="ai-ek-vid" />)
                  : <span className="ai-ek-ik">{yardimciEk.tur === "pdf" ? "📄" : yardimciEk.tur === "metin" ? "📝" : "📎"}</span>}
                <span className="ai-ek-ad">{yardimciEk.yukleniyor ? t("yukleniyor", "Yükleniyor") + " %" + (yardimciEk.yuzde || 0) : yardimciEk.ad}</span>
                <button className="ai-ek-kaldir" onClick={() => setYardimciEk(null)} aria-label={t("kaldir", "Kaldır")}>&#10005;</button>
              </div>
            )}
            <div className="ai-giris">
              <input ref={yardimciFotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={yardimciFotoSec} />
              <input ref={yardimciVideoRef} type="file" accept="video/*" style={{ display: "none" }} onChange={yardimciVideoSec} />
              <input ref={yardimciDosyaRef} type="file" accept="application/pdf,text/*,.pdf,.txt,.md,.csv,.json,.doc,.docx" style={{ display: "none" }} onChange={yardimciDosyaSec} />
              {/* ÜST: ikon araçları (foto/canlı/mikrofon/hoparlör) — AYRI satır */}
              <div className="ai-arac">
                {/* EKLE — tek düğme: Fotoğraf (vision) + Video + Dosya (PDF/metin); dokununca menü açılır */}
                <div className="ai-ekle-sar">
                  <button className="ai-ses ai-foto-ekle" onClick={() => setYardimciEkMenu((v) => !v)} aria-label={t("ekle", "Ekle")}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.4 11.05l-8.5 8.5a5 5 0 0 1-7.07-7.07l8.49-8.49a3 3 0 0 1 4.24 4.24l-8.49 8.49a1 1 0 0 1-1.41-1.41l7.78-7.78"/></svg>
                  </button>
                  {yardimciEkMenu && (
                    <div className="ai-ekle-menu">
                      <button className="ai-ekle-oge foto" onClick={() => { setYardimciEkMenu(false); yardimciFotoRef.current && yardimciFotoRef.current.click(); }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="8.5" cy="9" r="1.5"/></svg>
                        <span>{t("fotograf", "Fotoğraf")}</span>
                      </button>
                      <button className="ai-ekle-oge video" onClick={() => { setYardimciEkMenu(false); yardimciVideoRef.current && yardimciVideoRef.current.click(); }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="14" height="14" rx="2"/><path d="M16 9l6-3v12l-6-3"/></svg>
                        <span>{t("video", "Video")}</span>
                      </button>
                      <button className="ai-ekle-oge dosya" onClick={() => { setYardimciEkMenu(false); yardimciDosyaRef.current && yardimciDosyaRef.current.click(); }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3v5h5M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                        <span>{t("dosya", "Dosya")}</span>
                      </button>
                    </div>
                  )}
                </div>
                {/* CANLI SOHBET — DÜĞMESİZ: bir kez başlat, sonra konuş-dinle döngüsü (bas=başlat/dur) */}
                <button className={"ai-ses ai-canli" + (canliSohbet && !kameraAcik ? " aktif" : "")} onClick={canliSohbetToggle} aria-label={t("canliSohbet", "Canlı Sohbet")}>
                  {canliSohbet && !kameraAcik
                    ? <span className="mi-canli" aria-hidden="true"><i /><i /><i /></span>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><path d="M12 19v3" /></svg>}
                </button>
                {/* HOPARLÖR — sesli yanıtı aç/kapa (açıkken AI cevapları sesli okunur) */}
                <button className={"ai-ses ai-hoparlor" + (sesliMod ? " acik" : "")} onClick={sesliModToggle} aria-label={t("sesliYanit", "Sesli yanıt")}>
                  {sesliMod
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4zM16 9a3 3 0 0 1 0 6M18.5 7a6 6 0 0 1 0 10"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4zM22 9l-5 6M17 9l5 6"/></svg>}
                </button>
                {/* GÖRÜNTÜLÜ CANLI SOHBET — kamera aç: Gloxoo seni ve çevreni GÖRÜR, sesli konuşur. Açık=yeşil. */}
                <button className={"ai-ses ai-kamera" + (kameraAcik ? " acik" : "")} onClick={kameraToggle} aria-label={t("goruntuluSohbet", "Görüntülü sohbet")} title={t("goruntuluSohbet", "Görüntülü sohbet")}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                </button>
                {/* (TAM KONUM düğmesi buradan KALDIRILDI — artık AYARLAR > Konum'da AÇ/KAPAT anahtarı; Gloxoo sürekli bilir.) */}
                {/* AI DİL SEÇİCİ — düğmelerin yanında, YUKARI açılır; öğeler: ÜLKE KODU · ülke adı */}
                <div className="ai-dil-sar">
                  <button className="ai-ses ai-dil-btn" onClick={() => setAiDilAcik((v) => !v)} aria-label={t("aiDil", "AI dili")}>
                    <span className="ai-dil-kod">{(DILLER.find((d) => d.kod === aiDil)?.bayrak || "tr").toUpperCase()}</span>
                  </button>
                  {aiDilAcik && (
                    <div className="ai-dil-liste ai-dil-yukari">
                      {DILLER.map((d) => (
                        <button key={d.kod} className={"ai-dil-oge" + (d.kod === aiDil ? " sec" : "")} onClick={() => { setAiDil(d.kod); aiDilRef.current = d.kod; setAiDilAcik(false); }}>
                          <span className="ai-dil-oge-kod">{d.bayrak.toUpperCase()}</span>
                          <span className="ai-dil-oge-ad">{d.ad}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* YENİ KONUŞMA — görünümü temizler (geçmiş arşivde kalır) */}
                <button className="ai-ses ai-yeni" onClick={yeniKonusma} aria-label={t("yeniKonusma", "Yeni konuşma")}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                </button>
              </div>
              {/* KONUŞMA KONTROL — Gloxoo konuşurken çıkar: Duraklat/Devam + Sus (kullanıcı isteği) */}
              {(aiKonusuyor || aiDuraklat) && (
                <div className="ai-konus-kontrol">
                  <button className="ai-kk-btn durakla" onClick={sesDuraklaToggle}>
                    {aiDuraklat
                      ? <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                      : <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>}
                    <span>{aiDuraklat ? pl(aiDil, "devam") : pl(aiDil, "durakla")}</span>
                  </button>
                  <button className="ai-kk-btn sus" onClick={sesSus}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" /><path d="M17 9l5 6M22 9l-5 6" /></svg>
                    <span>{pl(aiDil, "sus")}</span>
                  </button>
                </div>
              )}
              {/* ALT: yazı dikte MİKROFONU + yazı şeridi + GÖNDER (mikrofon şeridin YANINDA — sesi metne çevirir, sen düzenle/gönder) */}
              <div className="ai-yaz-satir">
                <button className={"ai-ses ai-mik" + (dinliyor && !canliSohbet ? " dinliyor" : "")} onClick={sesleSor} aria-label={dinliyor && !canliSohbet ? t("durdur", "Durdur") : t("yaziDikte", "Sesle yaz (metne çevir)")}>
                  {dinliyor && !canliSohbet
                    ? <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>}
                </button>
                <textarea ref={yardimciInputRef} className="ai-input" value={yardimciYazi} onFocus={(e) => { if (canliSohbetRef.current) { canliSohbetToggle(); } try { const el = e.target; setTimeout(() => { try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (er) {} }, 320); } catch (er) {} }} onChange={(e) => { setYardimciYazi(e.target.value); try { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px"; } catch (er) {} }} placeholder={canliSohbet ? t("canliAcik", "Canlı sohbet açık — konuş, ben dinliyorum…") : (dinliyor ? t("dinleniyor", "Konuş… bitince mikrofona tekrar bas") : pl(aiDil, "yaz"))} rows={1}
                  maxLength={2000} />
                <button className="ai-gonder" onClick={() => yardimciGonder()} disabled={yardimciYukleniyor || !yardimciYazi.trim()} aria-label={t("gonder", "Gönder")}>
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 20l18-8L3 4l0 6 12 2-12 2z" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alt sabit sekme çubuğu */}
      <nav className={"ana-tab" + ((tabGizli || menuAcik) ? " gizli" : "")}>
        <button className={"ana-tab-oge" + (aktifKod === "home" ? " aktif" : "")} onClick={() => setAktifKod("home")}>{Ikon.home}<span>{t("tabKesfet")}</span></button>
        <button className="ana-tab-oge" onClick={() => setAraAcik(true)}>{Ikon.ara}<span>{t("tabAra")}</span></button>
        <button className={"ana-tab-oge ana-tab-reels" + (reelsAcik ? " aktif" : "")} onClick={() => { setReelAktif(0); setReelsAcik(true); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 4l2.5 5M14 4l2.5 5"/><path d="M10.5 12.5l4 2.2-4 2.3z" fill="currentColor"/></svg>
          <span className="notranslate" translate="no">{REELS_AD}</span></button>
        <button className="ana-tab-oge" onClick={() => setAktifKod("konum")}>{Ikon.konum}<span>{t("navKonum")}</span></button>
        <button className="ana-tab-oge ana-tab-glome" onClick={() => setMesajAcik(true)}>{Ikon.gloxi}<span>Glome</span>{okunmamisMesaj > 0 && <span className="ana-tab-rozet">{okunmamisMesaj > 99 ? "99+" : okunmamisMesaj}</span>}</button>
        <button className="ana-tab-oge" onClick={() => setAktifKod("profil")}>{Ikon.profil}<span>{t("navProfil")}</span></button>
      </nav>

      {/* KLASİK dar slayt menü — PORTAL ile body'ye. Arka KARARMAZ (şeffaf fon, dışına dokununca kapanır). Yükseklik = gerçek görünen ekran (--gercek-vh) → alt tuş çubuğu hesaba katılır, altta arka sızmaz. */}
      {menuAcik && createPortal((
        <>
          <div className="ana-menu-fon" onClick={() => setMenuAcik(false)} />
          <div className="ana-menu">
            <button className="ana-menu-kapat" onClick={() => setMenuAcik(false)} aria-label="Kapat">&#10005;</button>
            <h2 className="ana-menu-ad">{t("menuBaslik")}</h2>
            <p className="ana-menu-kul">{adTam}</p>
            {/* GLOXORG EYLEM PLANI (Hakkında + 7 Eksen) — kullanıcı isteği: menüde EN ÜSTTE */}
            <button className="ana-menu-oge c-mavi" onClick={() => { setMenuAcik(false); setHakkindaAcik(true); }}><span className="ana-menu-ik">💠</span>{(HAKKINDA_CEVIRI[dil] || HAKKINDA_CEVIRI.en).menu}</button>
            <button className="ana-menu-oge c-mavi" onClick={() => setMenuAcik(false)}><span className="ana-menu-ik">🏠</span>{t("navAnaSayfa")}</button>
            <button className="ana-menu-oge c-yesil" onClick={() => setMenuAcik(false)}><span className="ana-menu-ik">🌍</span>{t("navTopluluk")} · {t("anaYakinda")}</button>
            <button className="ana-menu-oge c-mor" onClick={() => setMenuAcik(false)}><span className="ana-menu-ik">🎓</span>{t("navAkademi")} · {t("anaYakinda")}</button>
            <button className="ana-menu-oge c-kirmizi" onClick={() => { setMenuAcik(false); setUyelikKartAcik(true); }}><span className="ana-menu-ik">💎</span>{t("proOlBaslik", "Profesyonel Ol")}</button>
            <button className="ana-menu-oge c-turuncu" onClick={() => { setMenuAcik(false); setAyarlarAcik(true); }}><span className="ana-menu-ik">⚙️</span>{t("menuAyarlar", "Ayarlar")}</button>
            {yoneticiMi() && <button className="ana-menu-oge c-mor" onClick={geriBildirimAc}><span className="ana-menu-ik">📊</span>{t("geriBildirimBaslik", "Geri Bildirimler")}</button>}
            <button className="ana-menu-oge c-yesil" onClick={() => { setMenuAcik(false); setDavetKopya(false); setDavetAcik(true); }}><span className="ana-menu-ik">🔗</span>{(DAVET_CEVIRI[dil] || DAVET_CEVIRI.en).menu}</button>
            {/* TELEFON BİLDİRİMLERİ — ayardan aç/durum göster */}
            <button className="ana-menu-oge ana-menu-bildirim c-pembe" onClick={bildirimIzniIste}>
              <span className="ana-menu-ik">🔔</span>{t("menuTelefonBildirim", "Telefon bildirimleri")}
              <span className={"ana-menu-durum" + (bildirimIzin === "granted" ? " acik" : "")}>{bildirimIzin === "granted" ? t("acik", "Açık") : (bildirimIzin === "denied" ? t("engelli", "Engelli") : t("kapali", "Kapalı"))}</span>
            </button>
            {/* DİL — menüde (header'ı sıkıştırmasın); satıra basınca dil penceresi açılır */}
            <div className="menu-dil"><DilSecici /></div>
            <button className="ana-menu-cikis" onClick={cikisYap}>{t("cikisYap")}</button>
          </div>
        </>
      ), document.body)}

      {/* YÖNETİCİ KONSOLU (sadece sahip): Geri bildirim · İstatistik · Kullanıcılar · Gönderiler */}
      {geriBildirimAcik && createPortal((
        <div className="msj-fon gb-fon" onClick={(e) => { if (e.target === e.currentTarget) setGeriBildirimAcik(false); }}>
          <div className="msj-pencere gb-pencere">
            <div className="msj-bas">
              <span className="msj-baslik">📊 {t("yoneticiKonsol", "Yönetim")}</span>
              <button className="gb-yenile" onClick={() => { if (!gbYukleniyor) yoneticiVeriYukle(); }} disabled={gbYukleniyor} aria-label={t("yenile", "Yenile")} title={t("yenile", "Yenile")}>🔄</button>
              <button className="msj-kapat" onClick={() => setGeriBildirimAcik(false)} aria-label="Kapat">✕</button>
            </div>
            <div className="gb-sekmeler">
              <button className={"gb-sekme" + (gbSekme === "geri" ? " aktif" : "")} onClick={() => setGbSekme("geri")}>💬 {t("gbSekGeri", "Geri Bildirim")}</button>
              <button className={"gb-sekme" + (gbSekme === "istatistik" ? " aktif" : "")} onClick={() => setGbSekme("istatistik")}>📈 {t("gbSekIst", "İstatistik")}</button>
              <button className={"gb-sekme" + (gbSekme === "kullanici" ? " aktif" : "")} onClick={() => setGbSekme("kullanici")}>👥 {t("gbSekKul", "Kullanıcılar")}</button>
              <button className={"gb-sekme" + (gbSekme === "gonderi" ? " aktif" : "")} onClick={() => setGbSekme("gonderi")}>🗂️ {t("gbSekGon", "Gönderiler")}</button>
            </div>
            <div className="gb-liste">
              {gbYukleniyor ? <div className="gb-bos">{t("yukleniyor", "Yükleniyor")}…</div>
                : gbSekme === "geri" ? (
                  geriBildirimListe.length === 0 ? <div className="gb-bos">{t("geriBildirimYok", "Henüz geri bildirim yok.")}</div>
                  : <>
                      <div className="gb-ozet">
                        <span className="gb-ozet-oge begen">👍 {geriBildirimListe.filter((g) => g.begendi).length}</span>
                        <span className="gb-ozet-oge begenme">👎 {geriBildirimListe.filter((g) => !g.begendi).length}</span>
                        <span className="gb-ozet-oge">Σ {geriBildirimListe.length}</span>
                      </div>
                      {geriBildirimListe.map((g) => (
                        <div key={g.id} className={"gb-kart" + (g.begendi ? " begen" : " begenme")}>
                          <div className="gb-kart-ust">
                            <span className="gb-kart-ik">{g.begendi ? "👍" : "👎"}</span>
                            <span className="gb-kart-ad">{g.ad || t("gbAnonim", "Kullanıcı")}</span>
                            <span className="gb-kart-tarih">{g.zamanMs ? new Date(g.zamanMs).toLocaleString(dil || "tr", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                          </div>
                          {g.oneri && <div className="gb-kart-oneri">"{g.oneri}"</div>}
                          {g.yorum && <div className="gb-kart-yorum">💬 {g.yorum}</div>}
                        </div>
                      ))}
                    </>
                ) : gbSekme === "istatistik" ? (
                  <div className="gb-ist-grid">
                    <div className="gb-ist-kutu"><b>{gbKullanicilar.length.toLocaleString(dil || "tr")}</b><span>{t("gbIstKullanici", "Kullanıcı")}</span></div>
                    <div className="gb-ist-kutu"><b>{gbGonderiler.length.toLocaleString(dil || "tr")}</b><span>{t("gbIstGonderi", "Gönderi")}</span></div>
                    <div className="gb-ist-kutu"><b>{gbGonderiler.reduce((s, g) => s + (g.begeni || 0), 0).toLocaleString(dil || "tr")}</b><span>{t("gbIstBegeni", "Beğeni")}</span></div>
                    <div className="gb-ist-kutu"><b>{gbGonderiler.reduce((s, g) => s + (g.yorumSayisi || 0), 0).toLocaleString(dil || "tr")}</b><span>{t("gbIstYorum", "Yorum")}</span></div>
                    <div className="gb-ist-kutu"><b>{geriBildirimListe.length.toLocaleString(dil || "tr")}</b><span>{t("gbSekGeri", "Geri Bildirim")}</span></div>
                    <div className="gb-ist-kutu"><b>{gbGonderiler.filter((g) => g.video).length.toLocaleString(dil || "tr")}</b><span>{t("gbIstVideo", "Video")}</span></div>
                  </div>
                ) : gbSekme === "kullanici" ? (
                  gbKullanicilar.length === 0 ? <div className="gb-bos">{t("gbYok", "Kayıt yok.")}</div>
                  : gbKullanicilar.map((k) => (
                    <div key={k.id} className="gb-kul">
                      <span className="gb-kul-av">{k.foto ? <img src={k.foto} alt="" referrerPolicy="no-referrer" /> : ((k.isim || k.ad || "?").trim()[0] || "?").toUpperCase()}</span>
                      <div className="gb-kul-bilgi">
                        <b>{[k.isim, k.soyisim].filter(Boolean).join(" ") || k.ad || t("gbAnonim", "Kullanıcı")}</b>
                        {(k.eposta || k.email) ? (
                          <span className="gb-kul-eposta-sar">
                            <span className="gb-kul-eposta" translate="no">✉️ {k.eposta || k.email}</span>
                            <button className="gb-eposta-kopya" onClick={() => gbEpostaKopyala(k)} aria-label={t("kopyala", "Kopyala")}>
                              {gbEpostaKopya === k.id ? "✓" : "📋"}
                            </button>
                          </span>
                        ) : (
                          <span className="gb-kul-eposta">✉️ {t("gbEpostaYok", "e-posta yok")}</span>
                        )}
                        <span>{[mc((k.pro && k.pro.meslek) || k.meslek, dil), (k.konum && k.konum.sehir) || k.sehir, (k.konum && k.konum.ulke) || k.ulke].filter(Boolean).join(" · ")}</span>
                      </div>
                      <button className="gb-gon-sil" onClick={() => { if (window.confirm(t("gbKulSilOnay", "Bu kullanıcıyı listeden silmek istediğine emin misin?"))) gbKullaniciSil(k.id); }} aria-label={t("sil", "Sil")}>🗑</button>
                    </div>
                  ))
                ) : (
                  gbGonderiler.length === 0 ? <div className="gb-bos">{t("gbYok", "Kayıt yok.")}</div>
                  : gbGonderiler.map((g) => (
                    <div key={g.id} className="gb-gon">
                      {g.gorsel ? <img className="gb-gon-mini" src={g.gorsel} alt="" referrerPolicy="no-referrer" /> : g.video ? <span className="gb-gon-mini gb-gon-vid">🎬</span> : <span className="gb-gon-mini gb-gon-yazi">✍️</span>}
                      <div className="gb-gon-bilgi">
                        <b>{g.ad || "—"}</b>
                        <span>{(g.baslik || g.yazi || "—").slice(0, 60)}</span>
                        <i>❤ {(g.begeni || 0)} · 💬 {(g.yorumSayisi || 0)}</i>
                      </div>
                      <button className="gb-gon-sil" onClick={() => { if (window.confirm(t("gbSilOnay", "Bu gönderiyi silmek istediğine emin misin?"))) gbGonderiSil(g.id); }} aria-label={t("sil", "Sil")}>🗑</button>
                    </div>
                  ))
                )}
            </div>
          </div>
        </div>
      ), document.body)}

      {/* BEĞENENLER listesi (kalp altındaki fotolara dokununca) — her kişiye TAKİP + MESAJ karşılık ikonları */}
      {begenenModal && createPortal((
        <div className="msj-fon bgm-fon" onClick={(e) => { if (e.target === e.currentTarget) setBegenenModal(null); }}>
          <div className="msj-pencere bgm-pencere">
            <div className="msj-bas">
              <span className="msj-baslik">❤ {t("begenenlerBolum", "Beğenenler")}{begenenModalListe.length ? " (" + begenenModalListe.length + ")" : ""}</span>
              <button className="msj-kapat" onClick={() => setBegenenModal(null)} aria-label="Kapat">✕</button>
            </div>
            <div className="bgm-liste">
              {begenenModalYuk ? <div className="gb-bos">{t("yukleniyor", "Yükleniyor")}…</div>
                : begenenModalListe.length === 0 ? <div className="bgm-bos-mini">{t("begenenYok", "Henüz beğenen yok.")}</div>
                : begenenModalListe.map((b) => (
                  <div className="bgm-kisi" key={"b" + (b.id || b.uid)}>
                    <span className="bgm-av" onClick={() => b.uid && uyeyiAc({ uid: b.uid, ad: b.ad, foto: b.foto })}>{b.foto ? <img src={b.foto} alt="" referrerPolicy="no-referrer" /> : ((b.ad || "?").trim()[0] || "?").toUpperCase()}</span>
                    <span className="bgm-ad">{b.ad || t("gbAnonim", "Kullanıcı")}</span>
                    {b.uid && u && b.uid !== u.uid && <span className="bgm-karsilik">{kisiKarsilik(b)}</span>}
                  </div>
                ))}
            </div>
          </div>
        </div>
      ), document.body)}

      {/* GLOXORG HAKKINDA + 7 EKSEN EYLEM PLANI — görünür "hakkımızda" sayfası */}
      {hakkindaAcik && createPortal((
        <div className="hakkinda-fon" onClick={(e) => { if (e.target === e.currentTarget) setHakkindaAcik(false); }}>
          <div className="hakkinda-pencere">
            <button className="hakkinda-kapat" onClick={() => setHakkindaAcik(false)} aria-label="Kapat">&#10005;</button>
            {(() => { const H = HAKKINDA_CEVIRI[dil] || HAKKINDA_CEVIRI.en; const EM = EKSEN_METIN[dil] || EKSEN_METIN.en; return (
            <div className="hakkinda-ic">
              <h1 className="hakkinda-baslik">💠 GLOXORG</h1>
              <p className="hakkinda-alt">{H.alt}</p>
              <section className="hakkinda-blok">
                <h2>{H.b1h}</h2>
                <p>{H.b1p}</p>
              </section>
              <section className="hakkinda-blok">
                <h2>{H.b2h}</h2>
                <p>{H.b2p}</p>
              </section>
              <section className="hakkinda-blok hakkinda-eksen-blok">
                <h2>{H.eh}</h2>
                <p className="hakkinda-eksen-alt">{H.ea}</p>
                {EM.map((e, i) => (
                  <div className="hakkinda-eksen-oge" key={i} style={{ "--er": EKSEN_RENK[i] }}>
                    <span className="hakkinda-eksen-no">{i + 1}</span>
                    <span className="hakkinda-eksen-ik">{EKSEN_IKON[i]}</span>
                    <div className="hakkinda-eksen-metin"><b>{e[0]}</b><span>{e[1]}</span></div>
                  </div>
                ))}
                <button className="hakkinda-plan-btn" onClick={() => { setHakkindaAcik(false); setYardimciMod("sohbet"); setYardimciAcik(true); setYardimciYazi(H.pb.replace(/^🚀\s*/, "")); }}>{H.pb}</button>
              </section>
            </div>
            ); })()}
          </div>
        </div>
      ), document.body)}

      {/* DAVET ET / PAYLAŞ — kopyalanır/gönderilir link (insanlar açınca GLOXORG'a girer) */}
      {davetAcik && createPortal((() => {
        const D = DAVET_CEVIRI[dil] || DAVET_CEVIRI.en;
        // Davet linki DAİMA güzel alan adı (gloxorg.com) — dünyaya görünen isim bu olsun.
        let link = "https://gloxorg.com/";
        try { const o = window.location.origin || ""; if (o && !/github\.io/i.test(o)) link = o + window.location.pathname; } catch (e) {}
        const kopyala = async () => {
          try { await navigator.clipboard.writeText(link); setDavetKopya(true); setTimeout(() => setDavetKopya(false), 2000); }
          catch (e) { try { const ta = document.createElement("textarea"); ta.value = link; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); setDavetKopya(true); setTimeout(() => setDavetKopya(false), 2000); } catch (e2) {} }
        };
        const gonder = async () => {
          try { if (navigator.share) { await navigator.share({ title: "GLOXORG", text: D.mesaj, url: link }); return; } } catch (e) {}
          try { const wa = "https://wa.me/?text=" + encodeURIComponent(D.mesaj + " " + link); window.open(wa, "_blank"); } catch (e) {}
        };
        // QR kod (GÖMÜLÜ, CDN yok): davet linkini karekoda çevir — telefon kamerasıyla okutup girsinler
        let qrSrc = "";
        try { const qr = qrOlustur(0, "M"); qr.addData(link); qr.make(); qrSrc = qr.createDataURL(5, 10); } catch (e) {}
        // Uygulamayı yükle (PWA "Ana ekrana ekle"): yerel sinyal (beforeinstallprompt) varsa ONU kullan;
        // yoksa cihaza göre ELLE yükleme ipucu göster (iPhone / Android) — her cihazda çalışır bir yol olsun.
        const uygulamaKur = async () => {
          const p = window.__groxKurPrompt;
          if (p && p.prompt) { try { await p.prompt(); await p.userChoice; } catch (e) {} window.__groxKurPrompt = null; setKurulabilir(false); setKurIpucu(""); return; }
          const ua = (navigator.userAgent || "");
          if (/iphone|ipad|ipod/i.test(ua) || (/Mac/i.test(ua) && "ontouchend" in document)) setKurIpucu(D.kurIos);
          else setKurIpucu(D.kurAndroid);
        };
        return (
          <div className="davet-fon" onClick={(e) => { if (e.target === e.currentTarget) setDavetAcik(false); }}>
            <div className="davet-pencere">
              <button className="davet-kapat" onClick={() => setDavetAcik(false)} aria-label="Kapat">&#10005;</button>
              <div className="davet-amblem">💎</div>
              <h2 className="davet-baslik">{D.baslik}</h2>
              <p className="davet-aciklama">{D.aciklama}</p>
              <div className="davet-link" onClick={kopyala} title={D.kopyala}>{link}</div>
              {qrSrc ? (
                <div className="davet-qr-sar">
                  <img className="davet-qr" src={qrSrc} alt="QR" />
                  <div className="davet-qr-yazi">{D.qr}</div>
                </div>
              ) : null}
              <button className="davet-btn davet-kopya" onClick={kopyala}>{davetKopya ? D.kopyalandi : "🔗 " + D.kopyala}</button>
              <button className="davet-btn davet-gonder" onClick={gonder}>📤 {D.gonder}</button>

              {/* MAĞAZA ROZETLERİ — şimdilik "Yakında" (soluk + etiket); yayına çıkınca tam renkli + linkli olur */}
              {(() => { const M = MAGAZA_CEVIRI[dil] || MAGAZA_CEVIRI.en; return (
                <div className="davet-magaza">
                  <div className="davet-magaza-bas">{M.baslik}</div>
                  <div className="davet-rozet yakinda" aria-disabled="true">
                    <span className="davet-rozet-yakinda">{M.yakinda}</span>
                    <svg width="24" height="26" viewBox="0 0 60 66" aria-hidden="true">
                      <polygon points="3,3 3,33 30,33" fill="#00A1F1"/><polygon points="3,33 3,63 30,33" fill="#00C853"/>
                      <polygon points="3,3 30,33 57,33" fill="#FF3D2E"/><polygon points="3,63 30,33 57,33" fill="#FFC400"/>
                    </svg>
                    <span className="davet-rozet-yazi"><span className="davet-rozet-ust">{M.ust}</span><span className="davet-rozet-alt">Google Play</span></span>
                  </div>
                  <div className="davet-rozet yakinda" aria-disabled="true">
                    <span className="davet-rozet-yakinda">{M.yakinda}</span>
                    <svg width="22" height="26" viewBox="0 0 24 24" aria-hidden="true" fill="#fff">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 8.72 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.2 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    <span className="davet-rozet-yazi"><span className="davet-rozet-ust">{M.ust}</span><span className="davet-rozet-alt">App Store</span></span>
                  </div>
                </div>
              ); })()}

              <button className="davet-btn davet-kur" onClick={uygulamaKur}>📲 {D.kur}</button>
              {kurIpucu ? <div className="davet-kur-ios">{kurIpucu}</div> : null}
            </div>
          </div>
        );
      })(), document.body)}

      {/* AYARLAR penceresi — X gibi tam ayarlar (Profilim/menüden) */}
      {ayarlarAcik && (() => {
        const aiBugun = (() => { try { const s = JSON.parse(localStorage.getItem("groxAiSayac") || "{}"); const bg = new Date().toLocaleDateString("en-CA"); return s.tarih === bg ? (s.sayi || 0) : 0; } catch (e) { return 0; } })();
        const sahibiMi = !!(u && u.email && (u.email.toLowerCase() === "abdulkadirciftsuren@gmail.com" || u.email.toLowerCase().endsWith("@gloxorg.com")));
        const limitsiz = proUye || sahibiMi;
        const tipSimdi = (profilBilgi && profilBilgi.tip) || "musteri";
        return (
          <div className="ayar-fon" onClick={(e) => { if (e.target === e.currentTarget) setAyarlarAcik(false); }}>
            <div className="ayar-pencere">
              <div className="ayar-bas">
                <span className="ayar-baslik">⚙ {t("menuAyarlar", "Ayarlar")}</span>
                <button className="ayar-kapat" onClick={() => setAyarlarAcik(false)} aria-label="Kapat">✕</button>
              </div>
              {ayarMsg && <div className="ayar-toast">{ayarMsg}</div>}
              <div className="ayar-akis">
                {ayarMsg && <div className="ayar-msg">{ayarMsg}</div>}

                <AyarBolum acik={ayarBolum==="hesap"} onTik={()=>setAyarBolum(b=>b==="hesap"?null:"hesap")} renk="#2f7fd6" ad={t("ayarHesabim", "Hesabım")} ikon="👤" onAcBilgi={setAciklama} bilgi={t("aciklamaHesabim", "Ana e-posta ve adın burada görünür. İstersen müşterilerin sana ulaşması için 2. bir iletişim e-postası ve telefon ekleyebilirsin. Telefon için ülke kodunu seç, numaranı yaz, Kaydet'e bas.")}>
                  <div className="ayar-bilgi"><b>{adTam}</b><span>{(u && u.email) || "—"}</span></div>
                  {/* AD / SOYAD — ilk girişte yazılanı buradan düzelt; Gloxoo yeni adı bilir */}
                  <label className="ayar-et">{t("ayarAdim", "Adın ve soyadın")} <BilgiBtn metin={t("aciklamaAdim", "Sayfaya ilk girerken yazdığın ad ve soyad burada. İstediğin zaman düzeltebilirsin. Gloxoo sana bu adla hitap eder; değiştirince yeni adını hemen bilir. Gönderilerinde ve hikâyelerinde de bu ad görünür.")} onAc={setAciklama} /></label>
                  <div className="ayar-tel-satir">
                    <input className="ayar-input" type="text" value={ayarIsim} onChange={(e) => setAyarIsim(e.target.value)} placeholder={t("ayarIsimPh", "Adın")} />
                    <input className="ayar-input" type="text" value={ayarSoyisim} onChange={(e) => setAyarSoyisim(e.target.value)} placeholder={t("ayarSoyisimPh", "Soyadın")} />
                  </div>
                  <button className="ayar-btn" onClick={ayarAdKaydet}>{t("ayarAdKaydet", "Adımı kaydet")}</button>
                  <label className="ayar-et">{t("ayar2Eposta", "2. e-posta (iletişim)")} <BilgiBtn metin={t("aciklama2Eposta", "Bu, İSTEĞE BAĞLI ikinci bir İLETİŞİM e-postasıdır — müşteriler sana ulaşsın diye profiline eklenir. Giriş/şifre kurtarma e-postan DEĞİLDİR (o, hesabını açtığın ana e-postandır). Boş bırakabilirsin; istersen ikinci bir e-posta yazıp Kaydet'e bas.")} onAc={setAciklama} /></label>
                  <input className="ayar-input" type="email" value={ek2Eposta} onChange={(e) => setEk2Eposta(e.target.value)} placeholder={t("epostaOrnek", "ornek@gloxorg.com")} />
                  <label className="ayar-et">{t("ayarTelefon", "Telefon")} <BilgiBtn metin={t("aciklamaTelefonNeden", "Telefon numaran müşterilerin sana ulaşması, hesabını kurtarman ve güvenlik için profiline eklenir — istersen boş bırakabilirsin. Önce ülke kodunu seç (soldaki kutuya yaz, ülke adı yaz ya da 'Konumumdan al'), sonra numaranı yaz. İkinci bir numaran varsa (iş / WhatsApp) onu da alttaki '2. numara' kutusuna ekleyebilirsin. Bitince Kaydet'e bas.")} onAc={setAciklama} /></label>
                  <div className="ayar-tel-satir">
                    <input className="ayar-input ayar-telkod-input" type="text" value={telKodu} onChange={(e) => setTelKodu(e.target.value)} placeholder="+90" aria-label={t("ayarTelKodu", "Ülke kodu")} />
                    <input className="ayar-input ayar-tel-input" type="tel" value={ekTelefon} onChange={(e) => setEkTelefon(e.target.value)} placeholder={t("ayarTelPh", "Numara")} />
                  </div>
                  <label className="ayar-et ayar-et-ikinci">{t("ayarTelefon2", "2. numara (isteğe bağlı)")} <BilgiBtn metin={t("aciklamaTelefon2", "İkinci bir telefon numarası ekleyebilirsin — örneğin iş numaran ya da WhatsApp hattın. İsteğe bağlıdır, boş bırakabilirsin.")} onAc={setAciklama} /></label>
                  <input className="ayar-input ayar-tel-input" type="tel" value={ekTelefon2} onChange={(e) => setEkTelefon2(e.target.value)} placeholder={t("ayarTel2Ph", "İkinci numara")} />
                  <button className="ayar-btn ayar-konumkod-btn" onClick={() => { const k = isoToTelKod[(myKod || "tr").toLowerCase()]; if (k) { ayarTelKodSec(k); setAyarMsg(t("ayarKodAlindi", "Konumundan kod alındı ✓")); setTimeout(() => setAyarMsg(""), 2000); } }}>📍 {t("ayarKonumdanKod", "Konumumdan otomatik al")}</button>
                  <div className="ayar-telkod-yollar">
                    <input className="ayar-input" type="text" value={telKodAra} onChange={(e) => setTelKodAra(e.target.value)} placeholder={t("ayarUlkeYaz", "Ülke adı yaz, kod gelsin...")} />
                    <button className="ayar-btn ayar-harita-btn" onClick={() => setTelHaritaAcik(true)}>🗺️ {t("ayarHaritadanSec", "Haritadan seç")}</button>
                  </div>
                  {telKodAra.trim() && (
                    <div className="ayar-meslek-liste">
                      {ULKE_KOD.filter((c) => { const q = telKodAra.trim().toLowerCase(); return c.ad.toLowerCase().includes(q) || c.k.includes(q); }).slice(0, 8).map((c) => (
                        <button key={c.ad + c.k} className={"ayar-meslek-oge" + (telKodu === c.k ? " sec" : "")} onClick={() => { ayarTelKodSec(c.k); setTelKodAra(""); }}>{c.ad} <b style={{ marginLeft: "auto", opacity: .85 }}>{c.k}</b></button>
                      ))}
                    </div>
                  )}
                  <button className="ayar-btn" onClick={ayarIletisimKaydet}>{t("kaydet", "Kaydet")}</button>
                  {/* CİNSİYET — Gloxoo hitabı (Bey/Hanım) buna göre olur */}
                  <label className="ayar-et">{t("ayarCinsiyet", "Cinsiyet")} <BilgiBtn metin={t("aciklamaCinsiyet", "Gloxoo sana DOĞRU hitap edebilsin diye (örn 'Bey' / 'Hanım') cinsiyetini seç. İstemiyorsan 'Belirtmek istemiyorum'a bas — o zaman Gloxoo nötr, ismiyle hitap eder. İstediğin zaman değiştirebilirsin, bu bilgi gizli kalır.")} onAc={setAciklama} /></label>
                  <div className="ayar-cinsiyet-grup">
                    <button className={"ayar-cins-btn" + (cinsiyet === "bayan" ? " sec" : "")} onClick={() => cinsiyetSec("bayan")}>👩 {t("ayarBayan", "Bayan")}</button>
                    <button className={"ayar-cins-btn" + (cinsiyet === "erkek" ? " sec" : "")} onClick={() => cinsiyetSec("erkek")}>👨 {t("ayarErkek", "Erkek")}</button>
                    <button className={"ayar-cins-btn geniş" + (cinsiyet === "belirtme" ? " sec" : "")} onClick={() => cinsiyetSec("belirtme")}>🚫 {t("ayarBelirtme", "Belirtmek istemiyorum")}</button>
                  </div>
                  {/* DOĞUM TARİHİ — Gloxoo yaşını bilir, doğum gününü kutlar */}
                  <label className="ayar-et">{t("ayarDogum", "Doğum tarihi")} <BilgiBtn metin={t("aciklamaDogum", "Gloxoo yaşını bilip sana uygun konuşabilsin ve doğum gününü kutlayabilsin diye doğum tarihini seç: gün, ay, yıl. Sonra 'Doğum tarihini kaydet'e bas. Bu bilgi gizli kalır.")} onAc={setAciklama} /></label>
                  <div className="ayar-dogum-satir">
                    <select className="ayar-input ayar-dogum-sec" value={dogumGun} onChange={(e) => setDogumGun(e.target.value)} aria-label={t("gun", "Gün")}>
                      <option value="">{t("gun", "Gün")}</option>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select className="ayar-input ayar-dogum-sec" value={dogumAy} onChange={(e) => setDogumAy(e.target.value)} aria-label={t("ay", "Ay")}>
                      <option value="">{t("ay", "Ay")}</option>
                      {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{new Date(2000, i, 1).toLocaleDateString(dil || "tr", { month: "long" })}</option>)}
                    </select>
                    <select className="ayar-input ayar-dogum-sec" value={dogumYil} onChange={(e) => setDogumYil(e.target.value)} aria-label={t("yil", "Yıl")}>
                      <option value="">{t("yil", "Yıl")}</option>
                      {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 6 - i).map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <button className="ayar-btn" onClick={dogumKaydet}>{t("ayarDogumKaydet", "Doğum tarihini kaydet")}</button>
                </AyarBolum>

                <AyarBolum acik={ayarBolum==="profil"} onTik={()=>setAyarBolum(b=>b==="profil"?null:"profil")} renk="#1ea64f" ad={t("ayarProfilFoto", "Profil / Amblem fotoğrafı")} ikon="🖼️" onAcBilgi={setAciklama} bilgi={t("aciklamaProfilAyar", "Burası GLOXORG profilin — Google hesabınla DEĞİL. Profil fotoğrafın ve şirket amblemin burada görünür. Paylaşım yaparken hangisinin (fotoğraf mı, amblem mi) kullanılacağını buradan seçersin. 'Düzenle / yükle' ile yeni görsel ekleyip ayarlayabilirsin.")}>
                  <p className="ayar-not">{t("ayarProfilNot2", "GLOXORG profilin (Google'ınla değil). Aşağıdan paylaşımlarda kullanılacak görseli seç; düzenlemek/yüklemek için alttaki düğmeye bas.")}</p>
                  <div className="ayar-et-sat"><span className="ayar-et">{t("ayarPaylasGorsel", "Paylaşımlarda kullanılacak görsel")}</span><BilgiBtn metin={t("aciklamaPaylasGorsel", "Gönderi paylaştığında profilinin yanında bu görsel görünür. Profil fotoğrafını mı yoksa şirket/iş amblemini mi kullanmak istediğini seç. İstediğin zaman değiştirebilirsin.")} onAc={setAciklama} /></div>
                  <div className="ayar-avatar-grup">
                    <button className={"ayar-avatar-kart" + (paylasAvatar === "profil" ? " sec" : "")} onClick={() => setPaylasAvatar("profil")}>
                      <span className="ayar-avatar-foto">{foto ? <img src={foto} alt="" referrerPolicy="no-referrer" /> : <span className="ayar-avatar-harf">{harf}</span>}</span>
                      <span className="ayar-avatar-et">{t("ayarKullanFoto", "Profil fotoğrafı")}</span>
                      {paylasAvatar === "profil" && <span className="ayar-avatar-tik">✓</span>}
                    </button>
                    <button className={"ayar-avatar-kart amblem" + (paylasAvatar === "amblem" ? " sec" : "")} onClick={() => setPaylasAvatar("amblem")}>
                      <span className="ayar-avatar-foto kare">{isFoto ? <img src={isFoto} alt="" referrerPolicy="no-referrer" /> : <span className="ayar-avatar-bos">{t("profIsBos", "Amblem")}</span>}</span>
                      <span className="ayar-avatar-et">{t("ayarKullanAmblem", "Şirket amblemi")}</span>
                      {paylasAvatar === "amblem" && <span className="ayar-avatar-tik">✓</span>}
                    </button>
                  </div>
                  <p className="ayar-secim-not">{paylasAvatar === "amblem" ? t("ayarSecimAmblem", "Paylaşımlarında şirket amblemin görünecek.") : t("ayarSecimFoto", "Paylaşımlarında profil fotoğrafın görünecek.")}</p>
                  <button className="ayar-btn" onClick={() => { setAyarlarAcik(false); setAktifKod("profil"); setAcikBolum("foto"); }}>{t("ayarFotoYukle", "Fotoğrafı / amblemi düzenle")}</button>
                </AyarBolum>

                <AyarBolum acik={ayarBolum==="sifre"} onTik={()=>setAyarBolum(b=>b==="sifre"?null:"sifre")} renk="#f2a900" ad={t("ayarSifre", "Şifre")} ikon="🔑" onAcBilgi={setAciklama} bilgi={t("aciklamaSifre", "Şifreni unuttuysan giriş e-postana bir sıfırlama bağlantısı göndeririz. Google ile girdiysen şifren Google tarafında yönetilir.")}>
                  <p className="ayar-not">{t("ayarSifreNot", "Şifre sıfırlama bağlantısını giriş e-postana göndeririz.")}</p>
                  <button className="ayar-btn" onClick={ayarSifreSifirla}>{t("ayarSifreGonder", "Sıfırlama bağlantısı gönder")}</button>
                </AyarBolum>

                <AyarBolum acik={ayarBolum==="tur"} onTik={()=>setAyarBolum(b=>b==="tur"?null:"tur")} renk="#9b59b6" ad={t("ayarHesapTuru", "Hesap türü")} ikon="🏷️" onAcBilgi={setAciklama} bilgi={t("aciklamaHesapTuru", "Müşteri: hizmet arayan (ücretsiz). Profesyonel: hizmet veren — kırmızı pırlanta profil. Kurumsal: banka, devlet, fabrika gibi kurumlar. İstediğin zaman değiştirebilirsin.")}>
                  <div className="ayar-tur-bas"><span className="ayar-et">{t("ayarHesapTuruSec", "Hesap türünü seç")}</span><BilgiBtn metin={t("aciklamaHesapTuru", "Müşteri: hizmet ARAYAN kişi (ücretsiz). Profesyonel: hizmet VEREN — kırmızı pırlanta profil, dünyadaki müşterilere ulaşır. Kurumsal: banka, devlet dairesi, belediye, fabrika gibi kurumlar — kendi sayfası, reklam ve işlem alanı yakında. İstediğin zaman değiştirebilirsin; seçtiğin tür profilinde görünür.")} onAc={setAciklama} /></div>
                  <div className="ayar-tur-grup">
                    <button className={"ayar-tur tur-musteri" + (tipSimdi === "musteri" ? " sec" : "")} onClick={() => ayarTurKaydet("musteri")}>
                      <svg className="ayar-tur-ik" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="8" r="3.4"/><path d="M5 19c0-3.3 2.7-5 6-5 1.4 0 2.7.3 3.7.9"/><circle cx="17.5" cy="16.5" r="2.6"/><path d="M19.6 18.6 22 21"/></svg>
                      <span>{t("ayarMusteri", "Müşteri")}</span>
                    </button>
                    <button className={"ayar-tur tur-profesyonel" + (tipSimdi === "profesyonel" ? " sec" : "")} onClick={() => ayarTurKaydet("profesyonel")}>
                      <svg className="ayar-tur-ik" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h14l3 5.4-10 12.6L2 8.4z" opacity=".9"/><path d="M2 8.4h20" stroke="rgba(0,0,0,.25)" strokeWidth="1"/><path d="M9 3 7 8.4 12 21M15 3l2 5.4L12 21" stroke="rgba(0,0,0,.22)" strokeWidth="1" fill="none"/></svg>
                      <span>{t("ayarProfesyonel", "Profesyonel")}</span>
                    </button>
                    <button className={"ayar-tur tur-kurumsal" + (tipSimdi === "kurumsal" ? " sec" : "")} onClick={() => setAyarBolum("tur")}>
                      <svg className="ayar-tur-ik" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M3 21V9l9-5 9 5v12"/><path d="M3 21h18"/><rect x="8" y="13" width="3" height="4"/><rect x="13" y="13" width="3" height="4"/><path d="M9.5 8.5h5"/></svg>
                      <span>{t("ayarKurumsal", "Kurumsal")}</span>
                    </button>
                  </div>
                  <div className="ayar-kurum">
                    <p className="ayar-not">{t("ayarKurumNot", "Kurumsal hesap (banka, devlet dairesi, belediye, savcılık, sosyal kurum, fabrika...) — kendi sayfan, reklam ve işlem alanı yakında.")}</p>
                    <label className="ayar-et">{t("ayarKurumTur", "Kurum türü")}</label>
                    <select className="ayar-input" value={kurumTur} onChange={(e) => setKurumTur(e.target.value)}>
                      <option value="">{t("ayarSec", "Seç...")}</option>
                      <option value="banka">{t("kurBanka", "Banka")}</option>
                      <option value="belediye">{t("kurBelediye", "Belediye")}</option>
                      <option value="devlet">{t("kurDevlet", "Devlet dairesi")}</option>
                      <option value="savcilik">{t("kurSavcilik", "Savcılık / Adliye")}</option>
                      <option value="sosyal">{t("kurSosyal", "Sosyal kurum")}</option>
                      <option value="fabrika">{t("kurFabrika", "Fabrika / Üretim")}</option>
                      <option value="tedarik">{t("kurTedarik", "Tedarik / Hizmet")}</option>
                      <option value="diger">{t("kurDiger", "Diğer")}</option>
                    </select>
                    <label className="ayar-et">{t("ayarKurumAd", "Kurum / firma adı")}</label>
                    <input className="ayar-input" type="text" value={kurumAd} onChange={(e) => setKurumAd(e.target.value)} placeholder={t("ayarKurumAdPh", "Örn. Ziraat Bankası")} />
                    <button className="ayar-btn" onClick={() => { if (!kurumTur || !kurumAd.trim()) { setAyarMsg(t("ayarKurumEksik", "Tür ve ad gir.")); return; } ayarTurKaydet("kurumsal", { tur: kurumTur, ad: kurumAd.trim() }); }}>{t("ayarKurumKaydet", "Kurumsal hesabı kaydet")}</button>
                  </div>
                </AyarBolum>

                <AyarBolum acik={ayarBolum==="meslek"} onTik={()=>setAyarBolum(b=>b==="meslek"?null:"meslek")} renk="#1fc2c2" ad={t("ayarBolumum", "Bölümüm / Sektör")} ikon="🏭" onAcBilgi={setAciklama} bilgi={t("aciklamaSektor", "Hangi alanda çalıştığını seç. Bir kategoriye dokun, içinden mesleğini ara ve seç — birden fazla seçebilirsin (aramalarda hepsi çıkar). Listede yoksa kendin yazıp ekle. Profilinde görünecek ANA mesleği yıldızla.")}>
                  {(() => { const secm = proMeslekDizi; if (!secm.length) return null; const ana = (profilBilgi && profilBilgi.pro && profilBilgi.pro.meslek) || (profilBilgi && profilBilgi.meslek) || secm[0]; return (
                    <div className="ayar-anameslek">
                      <div className="ayar-anameslek-bas"><span>{t("ayarProfildeGorunen", "Profilde / paylaşımda görünecek meslek")}</span><BilgiBtn metin={t("aciklamaAnaMeslek", "Aramada tüm mesleklerin çıkar. Ama profilinde ve paylaşımlarında SADECE BİR meslek görünür (pencereye hepsi sığmaz). Aşağıdan hangisinin görüneceğini seç — üzerine dokun, yıldızlı olan profilinde görünür.")} onAc={setAciklama} /></div>
                      <div className="ayar-anameslek-cipler">
                        {secm.map((x) => (
                          <span key={x} className={"ayar-anameslek-cip" + (x === ana ? " ana" : "")}>
                            <button className="ayar-anameslek-ad" onClick={() => ayarAnaMeslek(x)}>{x === ana ? "⭐ " : ""}{mc(x, dil)}</button>
                            <button className="ayar-anameslek-sil" onClick={() => meslekToggle(x)} aria-label={t("sil", "Sil")} title={t("meslekSil", "Bu mesleği kaldır")}>✕</button>
                          </span>
                        ))}
                      </div>
                      <div className="ayar-anameslek-ipucu">{t("meslekSilIpucu", "Bir mesleği kaldırmak için yanındaki ✕'e bas.")}</div>
                    </div>
                  ); })()}
                  <p className="ayar-not">{t("ayarSektorNot", "Hangi bölümdesin? Bir kategori seç, ara, dokun. Birden fazla seçebilirsin (aramalarda hepsi çıkar). Listede yoksa kendin yaz, ekle.")}</p>
                  <div className="ayar-sektor-grup">
                    <button className={"ayar-sektor-btn renk-meslek" + (sektorListe === "meslek" ? " sec" : "")} onClick={() => { setSektorListe(sektorListe === "meslek" ? "" : "meslek"); setMeslekAra(""); }}><span className="ayar-sk-ik">🧰</span><span className="ayar-sk-ad">{t("ayarMeslekler", "Meslekler")}</span></button>
                    <button className={"ayar-sektor-btn renk-fabrika" + (sektorListe === "fabrika" ? " sec" : "")} onClick={() => { setSektorListe(sektorListe === "fabrika" ? "" : "fabrika"); setMeslekAra(""); }}><span className="ayar-sk-ik">🏭</span><span className="ayar-sk-ad">{t("ayarFabrika", "Fabrika & İmalat")}</span></button>
                    <button className={"ayar-sektor-btn renk-tedarik" + (sektorListe === "tedarik" ? " sec" : "")} onClick={() => { setSektorListe(sektorListe === "tedarik" ? "" : "tedarik"); setMeslekAra(""); }}><span className="ayar-sk-ik">🚚</span><span className="ayar-sk-ad">{t("ayarTedarik", "Tedarik & Hizmet")}</span></button>
                    <button className={"ayar-sektor-btn renk-isci" + (sektorListe === "isci" ? " sec" : "")} onClick={() => { setSektorListe(sektorListe === "isci" ? "" : "isci"); setMeslekAra(""); }}><span className="ayar-sk-ik">👷</span><span className="ayar-sk-ad">{t("ayarIsci", "İşçi")}</span></button>
                    <button className={"ayar-sektor-btn renk-devlet" + (sektorListe === "devlet" ? " sec" : "")} onClick={() => { setSektorListe(sektorListe === "devlet" ? "" : "devlet"); setMeslekAra(""); }}><span className="ayar-sk-ik">🏛️</span><span className="ayar-sk-ad">{t("ayarDevlet", "Devlet Daireleri")}</span></button>
                  </div>
                  {sektorListe && createPortal((() => {
                    const liste = { meslek: MESLEK_LISTESI, fabrika: FABRIKA_LISTESI, tedarik: TEDARIK_LISTESI, isci: ISCI_LISTESI, devlet: DEVLET_LISTESI }[sektorListe] || [];
                    const baslik = { meslek: t("ayarMeslekler", "Meslekler"), fabrika: t("ayarFabrika", "Fabrika & İmalat"), tedarik: t("ayarTedarik", "Tedarik & Hizmet"), isci: t("ayarIsci", "İşçi"), devlet: t("ayarDevlet", "Devlet Daireleri") }[sektorListe] || "";
                    const q = meslekAra.trim().toLowerCase();
                    const filt = liste.filter((m) => !q || (mc(m.ad, dil) + " " + m.ad).toLowerCase().includes(q));
                    return (
                      <div className="ayar-meslek-tam">
                        <div className="ayar-mt-bar">
                          <span className="ayar-mt-baslik">{baslik}</span>
                          <span className="ayar-mt-say">{filt.length}</span>
                          <button className="ayar-mt-kapat" onClick={() => setSektorListe("")} aria-label="Kapat">✕</button>
                        </div>
                        <input className="ayar-mt-ara" type="text" value={meslekAra} onChange={(e) => setMeslekAra(e.target.value)} placeholder={t("ayarAraPh", "Ara... (yazarak filtrele)")} />
                        <div className="ayar-mt-kaydir">
                          <div className="ayar-mchip-grid">
                            {filt.map((m, mi) => { const secili = proMeslekDizi.includes(m.ad); return (
                              <button key={m.ad} className={"ayar-mchip" + (secili ? " sec" : "")} style={{ background: m.bg || POST_RENK[mi % POST_RENK.length] }} onClick={() => ayarMeslekSec(m.ad, sektorListe)}><span className="ayar-mchip-ik">{m.ik}</span><span className="ayar-mchip-ad">{mc(m.ad, dil)}</span></button>
                            ); })}
                            {filt.length === 0 && <div className="ayar-not" style={{ gridColumn: "1/-1" }}>{t("ayarListeBos", "Bu aramada sonuç yok — aşağıdan kendin ekle.")}</div>}
                          </div>
                          <label className="ayar-et" style={{ marginTop: "16px" }}>{t("ayarKendinEkle", "Listede yok mu? Kendin yaz, ekle:")}</label>
                          <div className="ayar-mt-ekle">
                            <input className="ayar-input" type="text" value={sektorEkle} onChange={(e) => setSektorEkle(e.target.value)} placeholder={t("ayarKendinPh", "İşini/mesleğini yaz")} />
                            <button className="ayar-btn" onClick={() => { if (sektorEkle.trim()) { ayarMeslekSec(sektorEkle.trim(), sektorListe); setSektorEkle(""); } }}>{t("ayarEkleSec", "Ekle ve seç")}</button>
                          </div>
                        </div>
                      </div>
                    );
                  })(), document.body)}
                </AyarBolum>

                <AyarBolum acik={ayarBolum==="konum"} onTik={()=>setAyarBolum(b=>b==="konum"?null:"konum")} renk="#e0202c" ad={t("ayarKonum", "Konum / Adres")} ikon="📍" onAcBilgi={setAciklama} bilgi={t("aciklamaKonum", "İşini nerede yaptığını ayarla. 'Konumumu bul' otomatik doldurur ya da 'Haritada bul' ile haritadan seçersin. Alanları kendin de yazabilirsin. Adres profilinde/aramada konumun olarak kullanılır.")}>
                  {/* GLOXOO TAM KONUM YETKİSİ — AÇ/KAPAT. Açıkken Gloxoo her an tam yerini bilir (şehir/ilçe + bina + içindeki mekân), hareket ettikçe tazelenir. */}
                  <div className="ayar-konum-yetki">
                    <div className="akyet-metin">
                      <b>📍 {t("ayarTamKonumBaslik", "Gloxoo tam konumumu bilsin")}</b>
                      <span>{t("ayarTamKonumAcik2", "Açıkken Gloxoo her an tam yerini bilir: şehir/ilçe + bina, hatta içinde bulunduğun mağaza/otel/kuaför/banka. Sorularına konumuna göre net cevap verir; başka şehre gidince otomatik günceller. İstediğin an kapatabilirsin.")}</span>
                    </div>
                    <button type="button" role="switch" aria-checked={tamKonumIzin} className={"akyet-switch" + (tamKonumIzin ? " acik" : "")} onClick={tamKonumToggle} aria-label={t("ayarTamKonumBaslik", "Gloxoo tam konumumu bilsin")}>
                      <span className="akyet-top" />
                    </button>
                  </div>
                  {tamKonumIzin && anlikYer && (anlikYer.yer || anlikYer.adres) && (
                    <div className="ayar-konum-anlik">📍 {anlikYer.yer ? anlikYer.yer + (anlikYer.tur ? " (" + anlikYer.tur + ")" : "") : (anlikYer.adres || "").split(",").slice(0, 3).join(",")}</div>
                  )}
                  <p className="ayar-not">{t("ayarKonumNot", "İşini nerede yapıyorsun? Haritada bir yere dokun → adres altta çıkar (kopyala ya da 'Şeritlere yaz'). 'Konumumu bul' alanları doldurur. Alanları kendin de yazabilirsin.")}</p>
                  <div className="ayar-konum-dugmeler">
                    <button className="ayar-btn ayar-btn-konum" onClick={ayarKonumBul}>📍 {t("ayarKonumBul", "Konumumu bul")}</button>
                    <button className="ayar-btn ayar-btn-harita" onClick={() => { setBulunan(null); setHaritaMsg(""); setAyarHaritaAcik(true); }}>🗺️ {t("ayarHaritadaBul", "Haritada bul / işaretle")}</button>
                  </div>
                  <label className="ayar-et">{t("ayarUlke", "Ülke")}</label>
                  <input className="ayar-input" type="text" value={srtUlke} onChange={(e) => setSrtUlke(e.target.value)} placeholder={t("ayarUlkePh", "Ülke")} />
                  <label className="ayar-et">{t("ayarSehir", "Şehir")}</label>
                  <input className="ayar-input" type="text" value={srtSehir} onChange={(e) => setSrtSehir(e.target.value)} placeholder={t("ayarSehirPh", "Şehir")} />
                  <label className="ayar-et">{t("ayarIlce", "İlçe")}</label>
                  <input className="ayar-input" type="text" value={srtIlce} onChange={(e) => setSrtIlce(e.target.value)} placeholder={t("ayarIlcePh", "İlçe")} />
                  <label className="ayar-et">{t("ayarSokak", "Mahalle / Sokak / Bina No")}</label>
                  <input className="ayar-input" type="text" value={srtSokak} onChange={(e) => setSrtSokak(e.target.value)} placeholder={t("ayarSokakPh", "Mahalle, sokak, bina numarası")} />
                  <label className="ayar-et">{t("ayarPosta", "Posta kodu")}</label>
                  <input className="ayar-input" type="text" value={srtPosta} onChange={(e) => setSrtPosta(e.target.value)} placeholder={t("ayarPostaPh", "Posta kodu")} />
                  {bulunan && (bulunan.en || bulunan.yerel) && (
                    <div className="ayar-bulunan-kutu">
                      <span className="ayar-bulunan-bas">📍 {t("ayarBulunanAdres", "Bulunan adres")}</span>
                      {bulunan.en && bulunan.en.adres && (
                        <div className="ayar-bulunan-satir"><span><b>🌐</b> {bulunan.en.adres}</span><button type="button" className="ayar-bulunan-kopya" onClick={() => adresKopyala(bulunan.en.adres)}>📋 {t("ayarKopyala", "Kopyala")}</button></div>
                      )}
                      {bulunan.yerel && bulunan.yerel.adres && bulunan.yerel.adres !== (bulunan.en && bulunan.en.adres) && (
                        <div className="ayar-bulunan-satir"><span><b>🏠</b> {bulunan.yerel.adres}</span><button type="button" className="ayar-bulunan-kopya" onClick={() => adresKopyala(bulunan.yerel.adres)}>📋 {t("ayarKopyala", "Kopyala")}</button></div>
                      )}
                    </div>
                  )}
                  <button className="ayar-btn" onClick={ayarKonumKaydet}>{t("kaydet", "Kaydet")}</button>
                </AyarBolum>

                {/* HABER / İLGİ KONUMLARI — ADRESTEN AYRI: Gloxoo bu yerlerin haber/spor/gündemini bilir */}
                <AyarBolum acik={ayarBolum==="haber"} onTik={()=>setAyarBolum(b=>b==="haber"?null:"haber")} renk="#1e9e6a" ad={t("ayarHaberKonum", "Haber & İlgi Konumları")} ikon="📰" onAcBilgi={setAciklama} bilgi={t("aciklamaHaberKonum", "Burası ADRESİNDEN AYRIDIR. Haberini/sporunu/gündemini takip etmek istediğin yerleri (ülke, şehir, ilçe) buraya yaz — en çok 3 yer. Gloxoo'ya 'şehrimde bugün ne haber var', 'takımım ne yaptı' diye sorduğunda BU yerleri baz alır. İstediğin zaman değiştirebilirsin.")}>
                  {haberYerler.map((y, i) => (
                    <div key={i} className="ayar-haber-yer">
                      <div className="ayar-haber-bas"><b>{t("ayarHaberYer", "Yer")} {i + 1}</b><button className="ayar-haber-sil" onClick={() => haberYerSil(i)} aria-label={t("sil", "Sil")}>✕</button></div>
                      <input className="ayar-input" type="text" value={y.ulke} onChange={(e) => haberYerGuncelle(i, "ulke", e.target.value)} placeholder={t("ayarUlkePh", "Ülke")} />
                      <input className="ayar-input" type="text" value={y.sehir} onChange={(e) => haberYerGuncelle(i, "sehir", e.target.value)} placeholder={t("ayarSehirPh", "Şehir")} />
                      <input className="ayar-input" type="text" value={y.ilce} onChange={(e) => haberYerGuncelle(i, "ilce", e.target.value)} placeholder={t("ayarIlcePh", "İlçe")} />
                    </div>
                  ))}
                  {haberYerler.length < 3 && <button className="ayar-btn ayar-haber-ekle" onClick={haberYerEkle}>＋ {t("ayarHaberYerEkle", "Yer ekle")}</button>}
                  <button className="ayar-btn" onClick={haberYerlerKaydet}>{t("kaydet", "Kaydet")}</button>
                </AyarBolum>

                <AyarBolum acik={ayarBolum==="bildirim"} onTik={()=>setAyarBolum(b=>b==="bildirim"?null:"bildirim")} renk="#ff7ab0" ad={t("ayarBildirimler", "Bildirimler")} ikon="🔔" onAcBilgi={setAciklama} bilgi={t("aciklamaBildirim", "Telefon bildirimlerini açarsan beğeni, yorum ve mesajları anında alırsın. İstediğin zaman kapatabilirsin.")}>
                  <button className="ayar-btn" onClick={bildirimIzniIste}>{bildirimIzin === "granted" ? t("ayarBildirimAcik", "Telefon bildirimleri AÇIK ✓") : t("ayarBildirimAc", "Telefon bildirimlerini aç")}</button>
                </AyarBolum>



                <AyarBolum acik={ayarBolum==="dil"} onTik={()=>setAyarBolum(b=>b==="dil"?null:"dil")} renk="#5aa6e0" ad={t("ayarDil", "Dil")} ikon="🌐" onAcBilgi={setAciklama} bilgi={t("aciklamaDil", "Uygulamanın dilini buradan seçersin. Menü, ayarlar ve harita arayüzü seçtiğin dile geçer.")}>
                  <div className="ayar-dil"><DilSecici /></div>
                </AyarBolum>

                <AyarBolum acik={ayarBolum==="uyelik"} onTik={()=>setAyarBolum(b=>b==="uyelik"?null:"uyelik")} renk="#FFD700" ad={t("ayarUyelikAI", "Üyelik & Yapay Zeka")} ikon="💎" onAcBilgi={setAciklama} bilgi={t("aciklamaUyelik", "Üyelik türün ve günlük yapay zeka hakkın burada görünür. Müşteri ücretsizdir; günde 20 AI hakkın gece yarısı yenilenir.")}>
                  <div className="ayar-bilgi"><b>{limitsiz ? t("ayarSinirsiz", "Sınırsız AI") : t("ayarMusteriUye", "Müşteri (ücretsiz)")}</b><span>{limitsiz ? (proUye ? "Pro/Max" : t("ayarSahip", "Sahip/Kurum")) : t("ayarGunlukHak", "Günlük AI hakkı: {a}/20").replace("{a}", aiBugun)}</span></div>
                  {!limitsiz && <p className="ayar-not">{t("ayarUyelikNot", "20 hakkın gece yarısı yenilenir. Daha fazlası için Pro/Max üyelik yakında.")}</p>}
                </AyarBolum>

                <AyarBolum acik={ayarBolum==="hakkinda"} onTik={()=>setAyarBolum(b=>b==="hakkinda"?null:"hakkinda")} renk="#b07cff" ad={t("ayarHakkinda", "Hakkında & Gizlilik")} ikon="ℹ️" onAcBilgi={setAciklama} bilgi={t("aciklamaHakkinda", "GLOXORG — küresel profesyonel sosyal platform. Üye olarak Kullanım Koşulları ve Gizlilik Politikası'nı kabul etmiş olursun.")}>
                  <p className="ayar-not">GLOXORG — {t("vizyon", "küresel profesyonel sosyal platform")}.</p>
                  <p className="ayar-not">{t("kvkk", "Üye olarak Kullanım Koşulları ve Gizlilik Politikası'nı kabul etmiş olursun.")}</p>
                </AyarBolum>

                <button className="ayar-cikis" onClick={cikisYap}>{t("cikisYap", "Çıkış Yap")}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAM EKRAN KONUM HARİTASI — portal ile body'ye (blur'lu ayar penceresinin DIŞINDA, yoksa Leaflet siyah/bozuk) */}
      {ayarHaritaAcik && createPortal((
        <div className="ayar-tamharita-fon">
          <div id="ayarTamHarita" className="ayar-tamharita"></div>
          <button className="ayar-tamharita-kapat" onClick={() => setAyarHaritaAcik(false)} aria-label="Kapat">✕</button>
          <button className="ayar-tamharita-soru" onClick={() => setHaritaBilgi(true)} aria-label="Nasıl çalışır">?</button>
          {haritaMsg && <div className="ayar-harita-toast">{haritaMsg}</div>}
          <div className="ayar-tamharita-alt">
            <button className="ayar-tamharita-bul2" onClick={ayarKonumBul}>📍 {t("ayarKonumBul", "Konumumu bul")}</button>
            {bulunan ? (
              <div className="ayar-adres-kutu">
                {bulunan.en && bulunan.en.adres && (
                  <div className="ayar-adres-blok ayar-adres-en">
                    <div className="ayar-adres-met"><b>🌐 İngilizce</b><br />{bulunan.en.adres}</div>
                    <div className="ayar-adres-aksiyon">
                      <button className="ayar-adres-kopya" onClick={() => adresKopyala(bulunan.en.adres)}>📋 {t("ayarKopyala", "Kopyala")}</button>
                      <button className="ayar-adres-yaz" onClick={() => seritlereYaz("en")}>✓ {t("ayarSeriteYaz", "Şeritlere yaz")}</button>
                    </div>
                  </div>
                )}
                {bulunan.yerel && bulunan.yerel.adres && bulunan.yerel.adres !== (bulunan.en && bulunan.en.adres) && (
                  <div className="ayar-adres-blok ayar-adres-yerel">
                    <div className="ayar-adres-met"><b>🏠 {t("ayarYerelDil", "Ülke dili")}</b><br />{bulunan.yerel.adres}</div>
                    <div className="ayar-adres-aksiyon">
                      <button className="ayar-adres-kopya" onClick={() => adresKopyala(bulunan.yerel.adres)}>📋 {t("ayarKopyala", "Kopyala")}</button>
                      <button className="ayar-adres-yaz" onClick={() => seritlereYaz("yerel")}>✓ {t("ayarSeriteYaz", "Şeritlere yaz")}</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span className="ayar-tamharita-adres">{t("ayarHaritaDokun", "Haritaya bir yere dokun → adres aşağıda çıkar")}</span>
            )}
            <button className="ayar-tamharita-tamam" onClick={() => setAyarHaritaAcik(false)}>{t("tamam", "Tamam")}</button>
          </div>
          {haritaBilgi && (
            <div className="ayar-harita-bilgi-fon" onClick={() => setHaritaBilgi(false)}>
              <div className="ayar-harita-bilgi" onClick={(e) => e.stopPropagation()}>
                <b>💡 {t("aciklamaBaslik", "Nasıl çalışır?")}</b>
                <p>{t("aciklamaKonumHarita", "Haritada işini yaptığın yere dokun. Adres aşağıda İKİ dilde çıkar: İngilizce (her zaman) ve o ülkenin dili. İstediğini 📋 Kopyala ile kopyalar ya da ✓ Şeritlere yaz ile adres alanlarına yazarsın. 'Konumumu bul' bulunduğun yeri otomatik alır. İki parmakla döndürebilir, parmakla kaydırabilirsin.")}</p>
                <button className="ayar-btn" onClick={() => setHaritaBilgi(false)}>{t("anladim", "Anladım")}</button>
              </div>
            </div>
          )}
        </div>
      ), document.body)}

      {/* TELEFON KODU HARİTASI — tam ekran, ülkeye dokun → kod (eski profesyonel formdaki gibi) */}
      {telHaritaAcik && createPortal((
        <div className="ayar-tamharita-fon">
          <div id="telKodHarita" className="ayar-tamharita"></div>
          <button className="ayar-tamharita-kapat" onClick={() => setTelHaritaAcik(false)} aria-label="Kapat">✕</button>
          <div className="tel-harita-baslik">{t("telHaritaBaslik", "Ülkene dokun — kod gelir")}</div>
          <div className="ayar-tamharita-alt">
            <span className="ayar-tamharita-adres">{telHaritaSec ? `✓ ${telHaritaSec.ad} ${telHaritaSec.kod} ${t("secildi", "seçildi")}` : t("telHaritaDokun", "Ülkene dokun · iki parmakla döndür")}</span>
            <button className="ayar-tamharita-tamam" onClick={() => setTelHaritaAcik(false)}>{t("tamam", "Tamam")}</button>
          </div>
        </div>
      ), document.body)}

      {/* AÇIKLAMA BALONCUĞU — (?) ikonlarına dokununca ne yapılacağını anlatır (ANAYASA: her yerde bilgilendir) */}
      {aciklama && createPortal((
        <div className="aciklama-fon" onClick={() => setAciklama("")}>
          <div className="aciklama-kutu" onClick={(e) => e.stopPropagation()}>
            <div className="aciklama-bas"><span>💡 {t("aciklamaBaslik", "Nasıl çalışır?")}</span><button className="aciklama-kapat" onClick={() => setAciklama("")} aria-label="Kapat">✕</button></div>
            <p className="aciklama-metin">{aciklama}</p>
            <button className={"aciklama-ses" + (sesliOkunan ? " calar" : "")} onClick={() => seslendir(aciklama)}>{sesliOkunan ? "⏸ " + t("sesDurdur", "Durdur") : "🔊 " + t("sesDinle", "Sesli dinle")}</button>
            <button className="ayar-btn aciklama-tamam" onClick={() => { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {} setSesliOkunan(false); setAciklama(""); }}>{t("anladim", "Anladım")}</button>
          </div>
        </div>
      ), document.body)}

      {/* TAM EKRAN FOTO/VİDEO GEZİCİ (lightbox) — çok fotoğraflı gönderide tek tek gez (‹ ›, kaydır, ✕) */}
      {/* HİKÂYE GÖRÜNTÜLEYİCİ — tam ekran, ilerleme çubuğu, sol/sağ dokun, otomatik ilerler */}
      {hikayeAcik && hikayeGruplar[hikayeAcik.gi] && (() => { const grup = hikayeGruplar[hikayeAcik.gi]; const oge = grup.ogeler[hikayeAcik.oi]; if (!oge) return null; const benimki = grup.uid === (u && u.uid); return createPortal((
        <div className="hik-fon" onClick={hikayeKapat}>
          <div className={"hik-pencere" + (hikayeDurdu ? " hik-durdu" : "")} onClick={(e) => e.stopPropagation()}>
            <div className="hik-ilerle-satir">
              {grup.ogeler.map((o, oi) => (<span className="hik-ilerle" key={o.id}><i style={{ width: oi < hikayeAcik.oi ? "100%" : (oi === hikayeAcik.oi ? hikayeIlerle + "%" : "0%") }} /></span>))}
            </div>
            <div className="hik-ust">
              <span className={"hik-ust-av" + (grup.amblem ? " amblem" : "")}>{grup.foto ? <img src={grup.foto} alt="" referrerPolicy="no-referrer" /> : ((grup.ad || "?")[0] || "?").toUpperCase()}</span>
              <b className="notranslate" translate="no">{grup.ad || "—"}</b>
              <i>{zamanOnce(oge.zamanMs)}{oge.yer ? " · 📍 " + oge.yer : ""}</i>
              <button className="hik-menu-ac" onClick={(e) => { e.stopPropagation(); hikDuraklaRef.current = true; setHikayeDurdu(true); hikMenuAcikRef.current = true; setHikMenuAcik(true); }} aria-label={t("secenekler", "Seçenekler")}>⋯</button>
              <button className="hik-kapat" onClick={(e) => { e.stopPropagation(); hikayeKapat(); }} aria-label="Kapat">✕</button>
            </div>
            {hikBildiri ? <div className="hik-toast">{hikBildiri}</div> : null}
            {oge.tip === "video"
              ? <><video className="hik-medya-bg" src={videoSade(oge.url)} muted loop autoPlay playsInline aria-hidden="true" tabIndex={-1} />
                  <video ref={hikVidRef} className="hik-medya" src={videoSade(oge.url)} autoPlay playsInline muted={!!oge.ses}
                    onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setHikayeIlerle(Math.min(100, (v.currentTime / v.duration) * 100)); }}
                    onEnded={() => hikayeGec(1)} /></>
              : <><img className="hik-medya-bg" src={oge.url} alt="" referrerPolicy="no-referrer" aria-hidden="true" /><img key={oge.id} className="hik-medya hik-foto-canli" src={oge.url} alt="" referrerPolicy="no-referrer" /></>}
            {/* HİKÂYENİN ÜSTÜNDEKİ YAZILAR (paylaşırken konmuş yer/renk ile) */}
            {Array.isArray(oge.yazilar) && oge.yazilar.map((y, i) => (
              <div key={i} className="hik-yazi-tas hik-yazi-goster" style={{ left: ((y.xr != null ? y.xr : 0.5) * 100) + "%", top: ((y.yr != null ? y.yr : 0.85) * 100) + "%", color: y.renk || "#ffd700" }}><span style={{ fontSize: Math.round(23 * (y.boyut || 1)) + "px", fontFamily: hikFontCss(y.font) }}>{y.metin}</span></div>
            ))}
            {/* HİKÂYEYE EKLENEN MÜZİK — gösterilirken çalar (döngülü) */}
            {oge.ses ? <audio key={oge.id + "_ses"} ref={hikSesRef} src={oge.ses} autoPlay loop /> : null}
            {oge.ses ? <div className="hik-ses-rozet" aria-hidden="true">🎵</div> : null}
            {/* Tüm yüzey: DOKUN = durdur/devam, KAYDIR = hikaye değiştir (sola=sonraki, sağa=önceki) */}
            <div className="hik-dok" onPointerDown={hikBas} onPointerUp={hikBit} />
            {/* ALT MESAJ + TEPKİ ÇUBUĞU (Facebook gibi) — başkasının hikâyesinde: mesaj yaz + hızlı tepki */}
            {!benimki && (
              <div className="hik-mesajbar" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                <input className="hik-mesaj-in" value={hikMesajYazi} maxLength={500}
                  onChange={(e) => setHikMesajYazi(e.target.value)}
                  onFocus={() => { hikDuraklaRef.current = true; setHikayeDurdu(true); }}
                  onKeyDown={(e) => { if (e.key === "Enter") hikMesajGonder(grup); }}
                  placeholder={t("hikMesajPh", "Mesaj gönder…")} />
                {hikMesajYazi.trim()
                  ? <button className="hik-mesaj-gonder" onClick={() => hikMesajGonder(grup)}>{t("gonder", "Gönder")}</button>
                  : <>{["kalp", "begen", "kahkaha", "saskin", "uzgun"].map((k) => (
                      <button key={k} className="hik-tepki-btn" onClick={() => hikTepkiGonder(grup, k)} aria-label={k}>{tepkiEmoji(k)}</button>
                    ))}</>}
              </div>
            )}
            {/* ⋯ MENÜ — Facebook gibi seçenekler */}
            {hikMenuAcik && (
              <div className="hik-menu-fon" onClick={(e) => { e.stopPropagation(); hikMenuKapat(true); }}>
                <div className="hik-menu-kutu" onClick={(e) => e.stopPropagation()}>
                  <button className="hik-menu-sat" onClick={() => { hikMenuKapat(true); hikToast(t("hikBenzerFazla", "Teşekkürler — buna benzer daha çok göstereceğiz.")); }}><span className="hmi">👍</span><span><b>{t("hikIlgiVar", "İlgimi Çekiyor")}</b><i>{t("hikIlgiVarAlt", "Buna benzer daha fazla hikâye görürsün.")}</i></span></button>
                  <button className="hik-menu-sat" onClick={() => { hikMenuKapat(false); setHikayeAcik(null); hikToast(t("hikBenzerAz", "Tamam — buna benzer daha az göstereceğiz.")); }}><span className="hmi">👎</span><span><b>{t("hikIlgiYok", "İlgimi Çekmiyor")}</b><i>{t("hikIlgiYokAlt", "Buna benzer daha az hikâye görürsün.")}</i></span></button>
                  {!benimki && <button className="hik-menu-sat" onClick={() => hikKisiGizle(grup.uid)}><span className="hmi">🚫</span><span><b>{(grup.ad || t("biri", "Kişi")).split(" ")[0] + " " + t("hikGorme", "kişisinin hikâyelerini görme")}</b><i>{t("hikGormeAlt", "Bu kişinin hikâyelerini artık gösterme.")}</i></span></button>}
                  <button className="hik-menu-sat" onClick={() => { hikMenuKapat(true); hikToast(t("bildirimAlindi", "Bildirimin alındı, teşekkürler — inceleyeceğiz.")); }}><span className="hmi">⚠️</span><span><b>{t("hikSikayet", "Şikâyet Et")}</b></span></button>
                  <button className="hik-menu-sat" onClick={hikBaglantiKopyala}><span className="hmi">🔗</span><span><b>{t("hikBaglanti", "Bağlantıyı kopyala")}</b></span></button>
                  <button className="hik-menu-sat" onClick={() => { hikMenuKapat(false); setHikayeAcik(null); setHikSecimAcik(true); }}><span className="hmi">＋</span><span><b>{t("hikayeOlustur", "Hikâye Oluştur")}</b></span></button>
                  {benimki && <button className="hik-menu-sat hms-sil" onClick={() => { hikMenuKapat(false); hikayemSil(oge.id); }}><span className="hmi">🗑</span><span><b>{t("sil", "Sil")}</b></span></button>}
                  <button className="hik-menu-vazgec" onClick={() => hikMenuKapat(true)}>{t("vazgec", "Vazgeç")}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      ), document.body); })()}

      {/* TEPKİ ÇUBUĞU ARKA KATMANI — dışarı dokununca kapanır */}
      {tepkiAcik && createPortal(<div className="tepki-fon" onClick={() => setTepkiAcik(null)} onPointerDown={() => setTepkiAcik(null)} />, document.body)}

      {/* REELS — tam ekran, yukarı-aşağı kayan kısa video akışı */}
      {reelsAcik && createPortal((
        <div className="reels-kok">
          <div className="reels-ust">
            <span className="reels-baslik notranslate" translate="no">🎬 {REELS_AD}</span>
            <button className="reels-kapat" onClick={() => setReelsAcik(false)} aria-label={t("kapat", "Kapat")}>✕</button>
          </div>
          {reelListesi.length === 0 ? (
            <div className="reels-bos">
              <div className="reels-bos-ik" aria-hidden="true">🎬</div>
              <div className="reels-bos-yazi">{t("reelsBos", "Henüz video yok. Bir video paylaş — burada Reels olarak tam ekran görünsün.")}</div>
              <button className="reels-bos-btn" onClick={() => { setReelsAcik(false); setDuzenlenen(null); setPaylasYazi(""); setPaylasBaslik(""); setPaylasGorsel(""); setPaylasVideo(""); setPaylasAcik(true); }}>{t("reelsVideoPaylas", "🎥 Video paylaş")}</button>
            </div>
          ) : (
            <div className="reels-sar" ref={reelSarRef}>
              {reelListesi.map((p, i) => (
                <div className="reel" key={p.id || i}>
                  {/* BULANIK ARKA (Facebook gibi): video ekranı doldurur, kenarda altın band yerine videonun bulanık hâli */}
                  <video className="reel-video-bg" src={videoSade(p._reelVideo)} poster={p._reelPoster || undefined} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} />
                  <video className="reel-video" data-i={i} src={videoSade(p._reelVideo)} poster={p._reelPoster || undefined}
                    muted={!reelSesAcik} loop playsInline preload="metadata" autoPlay={i === reelAktif}
                    onLoadedMetadata={(e) => { const v = e.currentTarget; const reel = v.closest(".reel"); if (reel && v.videoWidth) { reel.classList.toggle("reel-yatay", v.videoWidth > v.videoHeight * 1.15); reel.classList.add("reel-hazir"); } }}
                    onClick={(e) => { const v = e.currentTarget; try { if (v.paused) v.play(); else v.pause(); } catch (x) {} }} />
                  {/* SAĞ eylem şeridi (beğeni/tepki, yorum, paylaş, kaydet, ses) */}
                  <div className="reel-eylem" onClick={(e) => e.stopPropagation()}>
                    <button className={"reel-btn ape-kalp" + (begeniSet.has(p.id) ? " dolu" : "")} onClick={() => begeniTik(p)} onPointerDown={() => begeniBas(p)} onPointerUp={begeniBirak} onPointerLeave={begeniBirak} onPointerCancel={begeniBirak}>{begeniIkon(p)}{tepkiCubugu(p)}<span>{(p.begeni || 0).toLocaleString()}</span></button>
                    <button className="reel-btn" onClick={() => yorumAc(p)}>{Ikon.yorum}<span>{p.yorumSayisi ? p.yorumSayisi : ""}</span></button>
                    <button className="reel-btn" onClick={() => paylasNative(p)}>{Ikon.paylas}<span></span></button>
                    <button className={"reel-btn" + (kaydetSet.has(p.id) ? " dolu" : "")} onClick={() => kaydetToggle(p)}>{Ikon.kaydet}<span></span></button>
                    <button className="reel-btn reel-ses" onClick={() => setReelSesAcik((v) => !v)} aria-label={reelSesAcik ? t("sesKapat", "Sesi kapat") : t("sesAc", "Sesi aç")}><span className="reel-ses-ik">{reelSesAcik ? "🔊" : "🔇"}</span><span className="reel-ses-et">{reelSesAcik ? t("sesAcik", "Ses") : t("sesKapali", "Kapalı")}</span></button>
                  </div>
                  {/* ALT bilgi (yazar + açıklama) */}
                  <div className="reel-alt" onClick={(e) => e.stopPropagation()}>
                    <div className="reel-yazar" onClick={() => { setReelsAcik(false); uyeyiAc(p); }}>
                      <span className="reel-av">{p.foto ? <img src={p.foto} alt="" referrerPolicy="no-referrer" /> : ((p.ad && p.ad.trim()[0]) || "?").toUpperCase()}</span>
                      <b className="notranslate" translate="no">{p.ad || t("biri", "Biri")}</b>
                      {p.meslek && <span className="reel-meslek">· {p.meslek}</span>}
                    </div>
                    {p.yazi && <div className="reel-yazi">{p.yazi.length > 160 ? p.yazi.slice(0, 160) + "…" : p.yazi}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ), document.body)}

      {/* HİKÂYE OLUŞTUR — SEÇENEK EKRANI (Foto / Video / Yazı) */}
      {hikSecimAcik && createPortal((
        <div className="hik-secim-fon" onClick={() => setHikSecimAcik(false)}>
          <div className="hik-secim-kutu" onClick={(e) => e.stopPropagation()}>
            <div className="hik-secim-bas"><b>{t("hikayeOlustur", "Hikâye Oluştur")}</b><button className="hik-duzen-kapat" onClick={() => setHikSecimAcik(false)} aria-label={t("vazgec", "Vazgeç")}>✕</button></div>
            <div className="hik-secim-grid">
              <button className="hik-secim-kart hsk-foto" onClick={() => { setHikSecimAcik(false); if (hikFotoInputRef.current) hikFotoInputRef.current.click(); }}>
                <span className="hik-secim-ik" aria-hidden="true">🖼️</span><span>{t("hikSecFoto", "Fotoğraf")}</span>
              </button>
              <button className="hik-secim-kart hsk-video" onClick={() => { setHikSecimAcik(false); if (hikVideoInputRef.current) hikVideoInputRef.current.click(); }}>
                <span className="hik-secim-ik" aria-hidden="true">🎬</span><span>{t("hikSecVideo", "Video")}</span>
              </button>
              <button className="hik-secim-kart hsk-canli" onClick={() => { setHikSecimAcik(false); hikCanliRef.current = true; if (hikCanliInputRef.current) hikCanliInputRef.current.click(); }}>
                <span className="hik-secim-ik" aria-hidden="true">📷</span><span>{t("hikSecCanliFoto", "Canlı Foto")}</span>
              </button>
              <button className="hik-secim-kart hsk-canlivid" onClick={() => { setHikSecimAcik(false); hikCanliRef.current = true; if (hikCanliVidInputRef.current) hikCanliVidInputRef.current.click(); }}>
                <span className="hik-secim-ik" aria-hidden="true">🎥</span><span>{t("hikSecCanliVideo", "Canlı Video")}</span>
              </button>
              <button className="hik-secim-kart hsk-yazi" onClick={yaziHikayesiBaslat}>
                <span className="hik-secim-ik" aria-hidden="true">Aa</span><span>{t("hikSecYazi", "Yazı")}</span>
              </button>
            </div>
            <p className="hik-secim-not">{t("hikSecNot", "Video seçince yalnızca videolar, fotoğraf seçince yalnızca fotoğraflar açılır.")}</p>
          </div>
        </div>
      ), document.body)}

      {/* HİKÂYE DÜZENLEYİCİ — paylaşmadan önce: önizleme + üstüne YAZI + Gloxoo AI yardım */}
      {hikTaslak && createPortal((
        <div className="hik-duzen-fon">
          <div className="hik-duzen-pencere">
            {/* Üst bar */}
            <div className="hik-duzen-ust">
              <b>{t("hikayeDuzenle", "Hikâyeni hazırla")}</b>
              <button className="hik-duzen-kapat" onClick={hikTaslakKapat} aria-label={t("vazgec", "Vazgeç")}>✕</button>
            </div>
            {/* Medya önizleme + ÜSTÜNE SÜRÜKLENEBİLİR YAZILAR (istediğin yere koy) */}
            <div className="hik-duzen-medya" ref={hikMedyaRef} onPointerMove={hikYaziSurukleHareket} onPointerUp={hikYaziSurukleBit} onPointerLeave={hikYaziSurukleBit}>
              {hikTaslak.tip === "video"
                ? <><video className="hik-medya-bg" src={hikTaslak.url} muted loop autoPlay playsInline aria-hidden="true" tabIndex={-1} /><video ref={hikOnizVidRef} className="hik-medya" src={hikTaslak.url} muted loop autoPlay playsInline crossOrigin="anonymous" /></>
                : hikTaslak.tip === "yazi"
                ? <div className="hik-yazi-zemin" style={{ background: "linear-gradient(160deg," + (hikTaslak.bg1 || "#7b3ff2") + "," + (hikTaslak.bg2 || "#b14bd8") + ")" }} />
                : <><img className="hik-medya-bg" src={hikTaslak.url} alt="" aria-hidden="true" /><img className="hik-medya" src={hikTaslak.url} alt="" /></>}
              {hikYazilar.map((y) => (
                <div key={y.id} className={"hik-yazi-tas" + (hikSeciliYazi === y.id ? " secili" : "")}
                  style={{ left: (y.xr * 100) + "%", top: (y.yr * 100) + "%", color: y.renk }}
                  onPointerDown={(e) => hikYaziSurukleBas(e, y.id)}>
                  <span style={{ fontSize: Math.round(23 * (y.boyut || 1)) + "px", fontFamily: hikFontCss(y.font) }}>{y.metin}</span>
                  {hikSeciliYazi === y.id && <button className="hik-yazi-sil" onPointerDown={(e) => { e.stopPropagation(); }} onClick={(e) => { e.stopPropagation(); hikYaziSil(y.id); }} aria-label={t("sil", "Sil")}>×</button>}
                </div>
              ))}
              {hikYazilar.length === 0 && <div className="hik-duzen-ipucu">{t("hikYaziIpucu", "“+ Yazı Ekle”ye bas, sonra yazıyı parmağınla istediğin yere taşı")}</div>}
            </div>
            {/* Kontroller */}
            <div className="hik-duzen-alt">
              {/* Gloxoo'ya NE YAZSIN — İSTEDİĞİN KADAR yaz veya 🎤 konuş; sonra "sor" */}
              <div className="hik-ai-istek-satir">
                <textarea className="hik-duzen-input hik-istek-alan" rows={2} value={hikAiIstek} onChange={(e) => setHikAiIstek(e.target.value.slice(0, 1500))} placeholder={t("hikAiIstek", "Hikâyeni Gloxoo'ya anlat — istediğin kadar yaz veya 🎤 ile söyle; sana buna göre güzel yazı hazırlar")} />
                <button className={"hik-mik" + (hikMikDinliyor ? " dinliyor" : "")} onClick={hikMikToggle} aria-label={t("sesleSoyle", "Sesle söyle")}>🎤</button>
              </div>
              <button className="hik-ai-btn" onClick={aiHikayeOner} disabled={hikAiYuk}>
                <span className="hik-ai-ik" aria-hidden="true">✨</span>{hikAiYuk ? t("hikayeAiYuk", "Gloxoo bakıyor…") : (hikAiIstek.trim() ? t("hikayeAiGonder", "Gloxoo'ya gönder · yazı hazırla") : t("hikayeAiSor", "Gloxoo'ya sor · yazı öner"))}
              </button>
              {hikAiOneriler.length > 0 && (
                <div className="hik-ai-oneriler">
                  {hikAiOneriler.map((o, i) => (<button key={i} className="hik-ai-oneri" onClick={() => hikYaziEkle(o)}>{o}</button>))}
                  <button className="hik-ai-baska" onClick={aiHikayeOner} disabled={hikAiYuk}>🔄 {t("hikayeAiBaska", "Beğenmedim, başkasını yaz")}</button>
                </div>
              )}
              {/* Yazı ekle + seçili yazıyı düzenle */}
              <div className="hik-yazi-satir">
                <button className="hik-yazi-ekle" onClick={() => hikYaziEkle("")}>＋ {t("hikYaziEkle", "Yazı Ekle")}</button>
                {hikSeciliYazi && (() => { const sy = hikYazilar.find((y) => y.id === hikSeciliYazi); if (!sy) return null; return (
                  <input className="hik-duzen-input" autoFocus value={sy.metin} onChange={(e) => hikYaziMetin(sy.id, e.target.value.slice(0, 300))} placeholder={t("hikayeYaziYaz", "Yazını yaz…")} maxLength={300} />
                ); })()}
              </div>
              {/* YAZI STİLİ (font) — seçili yazıya uygulanır (Facebook gibi) */}
              {hikSeciliYazi && (() => { const sy = hikYazilar.find((y) => y.id === hikSeciliYazi); if (!sy) return null; return (
                <div className="hik-font-satir">
                  {HIK_FONTLAR.map((f) => (
                    <button key={f.k} className={"hik-font-btn" + ((sy.font || "sade") === f.k ? " aktif" : "")} style={{ fontFamily: f.css }} onClick={() => hikYaziFont(sy.id, f.k)}>Aa<i>{f.ad}</i></button>
                  ))}
                </div>
              ); })()}
              {/* Renk + BOYUT (seçili yazıya uygulanır) */}
              <div className="hik-renk-satir">
                <div className="hik-renk-grup">
                  {["#ffd700", "#ffffff", "#ff5da2", "#37b6ff", "#2fe08a", "#ff4d4d", "#111111"].map((c) => (
                    <button key={c} className={"hik-renk-btn" + (hikYaziRenk === c ? " aktif" : "")} style={{ background: c }} onClick={() => { if (hikSeciliYazi) hikYaziRenkVer(hikSeciliYazi, c); else setHikYaziRenk(c); }} aria-label={t("hikRenk", "Yazı rengi")} />
                  ))}
                </div>
                {hikSeciliYazi && (
                  <div className="hik-boyut-grup">
                    <button className="hik-boyut-btn" onClick={() => hikYaziBoyut(hikSeciliYazi, -0.15)} aria-label={t("kucult", "Küçült")}>A−</button>
                    <button className="hik-boyut-btn" onClick={() => hikYaziBoyut(hikSeciliYazi, 0.15)} aria-label={t("buyut", "Büyüt")}>A+</button>
                  </div>
                )}
              </div>
              {/* Müzik / Ses ekle (kendi cihazından) */}
              <button className={"hik-konum-btn hik-ses-btn" + (hikSes ? " aktif" : "")} onClick={() => { if (hikSes) hikSesKaldir(); else if (hikSesInputRef.current) hikSesInputRef.current.click(); }}>
                🎵 {hikSes ? hikSes.ad : t("hikSesEkle", "Müzik / Ses ekle")}
                {hikSes ? <span className="hik-konum-kaldir" aria-hidden="true"> ✕</span> : null}
              </button>
              {/* Konum (canlı) — nereden paylaşıldığı görünsün */}
              <button className={"hik-konum-btn" + (hikKonum ? " aktif" : "")} onClick={hikKonumAl}>
                📍 {hikKonumDurum === "aliniyor" ? t("konumAliniyor", "Konum alınıyor…") : (hikKonum ? hikKonum.tam : (hikKonumDurum === "hata" ? t("konumHata", "Konum alınamadı — tekrar dene") : t("hikKonumEkle", "Konum ekle")))}
                {hikKonum ? <span className="hik-konum-kaldir" aria-hidden="true"> ✕</span> : null}
              </button>
              {/* Paylaş */}
              <button className="hik-duzen-paylas" onClick={hikayeGonder} disabled={hikPaylasYuk}>
                {hikPaylasYuk ? (t("hikayeYukleniyor", "Yükleniyor…") + (hikPaylasYuzde > 0 ? " %" + hikPaylasYuzde : "")) : t("hikayePaylas", "Hikâyeni Paylaş")}
              </button>
              {hikPaylasYuk && <div className="hik-yuzde-cubuk"><i style={{ width: (hikPaylasYuzde || 2) + "%" }} /></div>}
            </div>
          </div>
        </div>
      ), document.body)}

      {onizGaleri && onizGaleri.liste && onizGaleri.liste.length > 0 && createPortal((
        <div className="oniz-fon" onClick={() => setOnizGaleri(null)}
          onTouchStart={(e) => { onizGaleri._x = (e.touches[0] || {}).clientX; }}
          onTouchEnd={(e) => {
            const x0 = onizGaleri._x, x1 = (e.changedTouches[0] || {}).clientX;
            if (typeof x0 === "number" && typeof x1 === "number") {
              const dx = x1 - x0;
              if (Math.abs(dx) > 45) { e.stopPropagation(); setOnizGaleri((g) => { if (!g) return g; const n = g.liste.length; const yeni = dx < 0 ? Math.min(g.i + 1, n - 1) : Math.max(g.i - 1, 0); return { ...g, i: yeni }; }); }
            }
          }}>
          {(() => { const it = onizGaleri.liste[onizGaleri.i] || {}; return (
            <div className="oniz-govde" onClick={(e) => e.stopPropagation()}>
              {it.tip === "video"
                ? <video src={it.src} poster={it.poster || undefined} controls autoPlay playsInline className="oniz-medya" />
                : <img src={it.src} alt="" referrerPolicy="no-referrer" className="oniz-medya" />}
            </div>
          ); })()}
          <button className="oniz-kapat" onClick={(e) => { e.stopPropagation(); setOnizGaleri(null); }} aria-label="Kapat">✕</button>
          {(() => { const it = onizGaleri.liste[onizGaleri.i] || {}; return (
            <button className="oniz-paylas" onClick={(e) => { e.stopPropagation(); paylasNative(it.tip === "video" ? { video: it.src } : { gorsel: it.src }); }} aria-label={t("paylas", "Paylaş")} title={t("paylas", "Paylaş")}>{Ikon.paylas}</button>
          ); })()}
          {onizGaleri.liste.length > 1 && <>
            <span className="oniz-say">{onizGaleri.i + 1} / {onizGaleri.liste.length}</span>
            {onizGaleri.i > 0 && <button className="oniz-ok oniz-sol" onClick={(e) => { e.stopPropagation(); setOnizGaleri((g) => ({ ...g, i: Math.max(g.i - 1, 0) })); }} aria-label="Önceki">‹</button>}
            {onizGaleri.i < onizGaleri.liste.length - 1 && <button className="oniz-ok oniz-sag" onClick={(e) => { e.stopPropagation(); setOnizGaleri((g) => ({ ...g, i: Math.min(g.i + 1, g.liste.length - 1) })); }} aria-label="Sonraki">›</button>}
            <span className="oniz-noktalar">{onizGaleri.liste.map((_, di) => <i key={di} className={di === onizGaleri.i ? "on" : ""} />)}</span>
          </>}
          {onizGaleri.mesajId && (() => {
            const om = aktifSohbetMesajlari.find((x) => x.id === onizGaleri.mesajId);
            const benimTepki = om && om.tepkiler && auth.currentUser ? om.tepkiler[auth.currentUser.uid] : "";
            return (
              <div className="oniz-tepki" onClick={(e) => e.stopPropagation()}>
                {GLOME_TEPKI.map((emo) => (
                  <button key={emo} className={"oniz-tepki-btn" + (benimTepki === emo ? " secili" : "")}
                    onClick={(e) => { e.stopPropagation(); tepkiSec(onizGaleri.mesajId, emo); }}>{emo}</button>
                ))}
              </div>
            );
          })()}
        </div>
      ), document.body)}

      {/* MESAJ TEPKİ SEÇİCİ — BASTIĞIN yerin tam üstünde açılır (portal + fixed → köşeye kaçmaz, ekrandan taşmaz) */}
      {tepkiMesaj && tepkiYer && (() => {
        const tm = aktifSohbetMesajlari.find((x) => x.id === tepkiMesaj);
        if (!tm) return null;
        const benimMsj = tm.gonderenUid === benUid;
        return createPortal((
          <div className="sohbet-tepki-fon" onClick={() => setTepkiMesaj(null)}>
            <div className={"sohbet-tepki-secici" + (tepkiYer.alt ? " alt" : "")} style={{ left: tepkiYer.x, top: tepkiYer.y }} onClick={(e) => e.stopPropagation()}>
              {!tm.silindi && GLOME_TEPKI.map((emo) => (
                <button key={emo} className="sts-emo" onClick={() => tepkiSec(tm.id, emo)}>{emo}</button>
              ))}
              {benimMsj && !tm.silindi && tm.metin && <button className="sts-islem" onClick={() => mesajDuzenleBaslat(tm)} title={t("duzenle", "Düzenle")}>✏️</button>}
              {benimMsj && !tm.silindi && <button className="sts-islem sts-sil" onClick={() => mesajSilEt(tm.id)} title={t("sil", "Geri çek / Sil")}>🗑️</button>}
            </div>
          </div>
        ), document.body);
      })()}

      {/* GLOXORG PIRLANTA ÜYELİK KARTLARI — 20 limit dolunca AI buraya yönlendirir; şimdilik ücretsiz seç-devam et */}
      {uyelikKartAcik && createPortal((
        <div className="uyelik-fon" onClick={(e) => { if (e.target === e.currentTarget) setUyelikKartAcik(false); }}>
          <div className="uyelik-pencere">
            <div className="uyelik-bas">
              <span className="uyelik-baslik">{t("uyelikBaslik", "GLOXORG Pırlanta Üyelik")}</span>
              <button className="uyelik-kapat" onClick={() => setUyelikKartAcik(false)} aria-label="Kapat">✕</button>
            </div>
            <p className="uyelik-not">{t("uyelikNot", "Günlük 20 sınırını kaldır, GLOXORG yapay zekâsıyla kesintisiz çalış. Sana uygun pırlantayı seç.")}</p>
            <div className="uyelik-kartlar">
              {/* KIRMIZI PIRLANTA */}
              <div className="uyelik-kart kart-kirmizi">
                <div className="uyelik-taslar">
                  <GercekPirlanta c="#e0202c" cerceve={false} /><GercekPirlanta c="#e0202c" cerceve={false} /><GercekPirlanta c="#e0202c" cerceve={false} />
                </div>
                <div className="uyelik-ad">{t("uyelikKirmizi", "GLOXORG Kırmızı Pırlanta")}</div>
                <div className="uyelik-fiyat">15 <span>€</span><i>/{t("ay", "ay")}</i></div>
                <ul className="uyelik-ozellik">
                  <li>♦ {t("uyelikOz1", "Günlük AI sınırı YOK")}</li>
                  <li>♦ {t("uyelikOz2", "Öncelikli yanıt")}</li>
                  <li>♦ {t("uyelikOz3", "Profilin öne çıkar")}</li>
                </ul>
                <button className="uyelik-sec-btn kirmizi" onClick={() => uyelikSec("kirmizi")}>{t("uyelikSecBtn", "Bu üyeliği seç")}</button>
              </div>
              {/* ALTIN PIRLANTA */}
              <div className="uyelik-kart kart-altin">
                <div className="uyelik-rozet">{t("uyelikEnIyi", "EN AVANTAJLI")}</div>
                <div className="uyelik-taslar">
                  <GercekPirlanta c="#FFD700" cerceve={false} /><GercekPirlanta c="#FFD700" cerceve={false} /><GercekPirlanta c="#FFD700" cerceve={false} /><GercekPirlanta c="#FFD700" cerceve={false} /><GercekPirlanta c="#FFD700" cerceve={false} />
                </div>
                <div className="uyelik-ad">{t("uyelikAltin", "GLOXORG Altın Pırlanta")}</div>
                <div className="uyelik-fiyat">50 <span>€</span><i>/{t("ay", "ay")}</i></div>
                <ul className="uyelik-ozellik">
                  <li>♦ {t("uyelikOzA1", "Sınırsız AI + tüm araçlar")}</li>
                  <li>♦ {t("uyelikOzA2", "En üst öncelik")}</li>
                  <li>♦ {t("uyelikOzA3", "Altın profil rozeti")}</li>
                  <li>♦ {t("uyelikOzA4", "Gelişmiş içerik araçları")}</li>
                </ul>
                <button className="uyelik-sec-btn altin" onClick={() => uyelikSec("altin")}>{t("uyelikSecBtn", "Bu üyeliği seç")}</button>
              </div>
            </div>
            <p className="uyelik-tanitim">{t("uyelikTanitim", "Tanıtım dönemi: kartı seç, şimdilik ücretsiz devam et. Ödeme ileride açılacak.")}</p>
          </div>
        </div>
      ), document.body)}

      {/* Bildirim penceresi (sol üst zil) — kapatma: dışına dokun + ✕ (ANAYASA pencere kapatma) */}
      {bildirimAcik && (
        <>
          <div className="ana-bildirim-fon" onClick={() => setBildirimAcik(false)} />
          <div className="ana-bildirim-menu">
            <div className="abm-bas">
              <span className="abm-baslik">{t("bildirimBaslik")}</span>
              <button className="abm-kapat" onClick={() => setBildirimAcik(false)} aria-label="Kapat">✕</button>
            </div>
            {bildirimListe.length === 0 ? (
              <>
                <div className="abm-bos">{t("bildirimYok")}</div>
                <div className="abm-aciklama">{t("bildirimAciklama", "Biri gönderini beğenince, yorum yapınca veya sana mesaj atınca burada görünecek.")}</div>
              </>
            ) : (
              <div className="abm-liste">
                {bildirimListe.map((b) => {
                  const bb = (String(b.gonderenAd || "?").trim()[0] || "?").toUpperCase();
                  const ne = b.zamanMs ? new Date(b.zamanMs).toLocaleString(dil || "tr", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
                  const gp = b.gonderiId ? (gercekAkis.find((g) => g.id === b.gonderiId) || gonderilerim.find((g) => g.id === b.gonderiId)) : null;
                  const bildirimAc = () => { if (gp) { setBildirimAcik(false); setTamFoto(gp); } };
                  const onResim = b.gonderiResim || (gp && gp.gorsel) || "";
                  const onVideo = b.gonderiVideo || (gp && gp.video) || "";
                  const onZemin = b.gonderiZemin || (gp && gp.zemin) || "";
                  const onMetin = b.metin || (gp && gp.yazi) || "";
                  return (
                    <div className={"abm-oge" + (gp ? " tikla" : "")} key={b.id} onClick={bildirimAc}>
                      <span className="abm-foto">{b.gonderenFoto ? <img src={b.gonderenFoto} alt="" referrerPolicy="no-referrer" /> : bb}</span>
                      <div className="abm-icerik">
                        <div className="abm-metin">{bildirimMetni(b)}</div>
                        <i className="abm-zaman">{ne}</i>
                        {/* Seni BEĞENEN kişiye teşekkür et (o senin teşekkürünü görür) */}
                        {b.tip === "begeni" && b.gonderenUid && u && b.gonderenUid !== u.uid && (
                          <button className={"abm-tesekkur" + (tesekkurEdilen.has(b.id) ? " edildi" : "")} onClick={(e) => { e.stopPropagation(); tesekkurEt(b); }} disabled={tesekkurEdilen.has(b.id)}>
                            {tesekkurEdilen.has(b.id) ? t("tesekkurEdildi", "🙏 Teşekkür edildi") : t("tesekkurEt", "🙏 Teşekkür et")}
                          </button>
                        )}
                      </div>
                      {(onResim || onVideo || onZemin || onMetin) && (
                        <span className="abm-gonderi" style={onZemin && !onResim && !onVideo ? { background: onZemin } : undefined}>
                          {onResim ? <img src={onResim} alt="" referrerPolicy="no-referrer" />
                            : onVideo ? <video src={onVideo} preload="metadata" muted playsInline tabIndex={-1} />
                            : <span className="abm-gonderi-yazi">{(onMetin || "").slice(0, 24)}</span>}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ÜÇ NOKTA (daha fazla) menüsü — paylaştan FARKLI seçenekler */}
      {dahaMenu && (
        <div className="daha-fon" onClick={(e) => { if (e.target === e.currentTarget) setDahaMenu(null); }}>
          <div className="daha-sayfa">
            <button className="daha-oge" onClick={baglantiKopyala}>{t("baglantiKopyala", "Bağlantıyı kopyala")}</button>
            <button className="daha-oge" onClick={() => ilgilenmiyorum(dahaMenu)}>{t("ilgilenmiyorum", "İlgilenmiyorum")}</button>
            <button className="daha-oge daha-bildir" onClick={gonderiBildir}>{t("gonderiBildir", "Gönderiyi bildir")}</button>
            <button className="daha-oge daha-iptal" onClick={() => setDahaMenu(null)}>{t("iptal", "İptal")}</button>
          </div>
        </div>
      )}

      {/* KİM BEĞENDİ — kalbe uzun basınca açılır */}
      {begeniListeAcik && (
        <div className="msj-fon yorum-fon" onClick={(e) => { if (e.target === e.currentTarget) setBegeniListeAcik(null); }}>
          <div className="msj-pencere">
            <div className="msj-bas">
              <span className="msj-baslik">{t("begenenler", "Beğenenler")} {begeniListe ? begeniListe.length : ""}</span>
              <button className="msj-kapat" onClick={() => setBegeniListeAcik(null)} aria-label="Kapat">✕</button>
            </div>
            <div className="msj-liste">
              {begeniListe === null ? (
                <div className="msj-bos">{t("araYukleniyor", "Yükleniyor…")}</div>
              ) : begeniListe.length === 0 ? (
                <div className="msj-bos">{t("begeniYok", "Henüz beğenen yok.")}</div>
              ) : begeniListe.map((b) => {
                const bb = (String(b.ad || "?").trim()[0] || "?").toUpperCase();
                return (
                  <div className="msj-kart" key={b.id} style={{ cursor: "default" }}>
                    <span className="msj-foto">{b.foto ? <img src={b.foto} alt="" referrerPolicy="no-referrer" /> : bb}</span>
                    <div className="msj-icerik"><div className="msj-ust"><b className="notranslate" translate="no">{b.ad || "—"}</b></div></div>
                    <span className="begeni-kalp" aria-hidden="true">{Ikon.kalp}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Kısa bilgi balonu (toast) — kaydet/paylaş açıklaması */}
      {kucukMesaj && <div className="grox-toast" role="status">{kucukMesaj}</div>}

      <SurumRozeti />
    </div>
  );
}
