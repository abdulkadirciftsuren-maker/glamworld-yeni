import { useState, useEffect, useRef, Fragment } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail } from "firebase/auth";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import maplibregl from "maplibre-gl"; // GERÇEK döndürülebilir harita (Google Haritalar gibi: WebGL, iki parmakla döner)
import "maplibre-gl/dist/maplibre-gl.css";
import { feature as topoFeature } from "topojson-client"; // ülke sınırları (GÖMÜLÜ — CDN değil; telefon haritası siyah çıkmasın)
import { auth } from "./firebase";
import { profilOku, profilKaydet, profesyonelAra, mesajGonder, mesajlariOku, gonderiEkle, gonderileriOku, gonderilerimOku, gonderiSil, gonderiGuncelle, videoYukle, yorumEkle, yorumlariOku, bildirimEkle, bildirimleriDinle, bildirimleriOkunduYap, takipEt, takiptenCik, takipEttiklerimOku, sayacDegistir, begeniYaz, begeniSilDoc, begenenleriOku } from "./veri";
import { MESLEK_LISTESI } from "./meslekler";
import { FABRIKA_LISTESI, TEDARIK_LISTESI, ISCI_LISTESI, DEVLET_LISTESI, ULKE_KOD } from "./sektorler";
import { mc, ulkeAdiCevir, meslekCevir, DILLER } from "./i18n";
import { isoToTelKod, NUM_TO_ISO2 } from "./ulkeKodlari";
import { KKTC_RING, KIRIM_RING } from "./ozelBolgeler";
import SurumRozeti from "./SurumRozeti";
import DilSecici from "./DilSecici";
import "./Anasayfa.css";

// Ayarlar konum haritası için altın damla pin (resim gerektirmez)
const ayarPinIkon = () => L.divIcon({ className: "", html: '<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#FFD700;border:2px solid #fff;box-shadow:0 2px 7px rgba(0,0,0,.55)"></div>', iconSize: [20, 20], iconAnchor: [10, 20] });
// AYARLAR akordeon bölümü — MODÜL seviyesinde (render içinde tanımlanırsa her tuşta remount olup TİTRER + odak kaybeder).
// AÇIKLAMA (?) İKONU — her yerde müşteriyi bilgilendir (ANAYASA). Dokununca ne yapılacağını anlatan baloncuk açar.
function BilgiBtn({ metin, onAc, className }) {
  return <button type="button" className={"bilgi-btn" + (className ? " " + className : "")} onClick={(e) => { e.stopPropagation(); e.preventDefault(); onAc(metin); }} aria-label="Açıklama">?</button>;
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
function renkliCumleler(metin, palet) {
  if (!metin) return null;
  const p = palet || RC_ACIK;
  const parcalar = String(metin).match(/[^.!?…\n]+[.!?…]*/g) || [String(metin)];
  return parcalar.map((c, i) => {
    const s = c.trim();
    if (!s) return null;
    const renk = p[i % p.length];
    return (
      <span key={i} data-ci={i} className="rc-cumle" style={{ color: renk }}>
        <span className="rc-ik" style={{ color: renk }} aria-hidden="true">◆</span>{s}{" "}
      </span>
    );
  }).filter(Boolean);
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

// CANLI MASKOT YÜZÜ — konuşurken (konusuyor=true) ağzı açılıp kapanır + hafif zıplar. tur: "grox" (elmas) | "ekspert" (ayı).
function MaskotYuz({ konusuyor = false, tur = "grox", boyut = 30 }) {
  return (
    <span className={"maskot-yuz" + (konusuyor ? " konusuyor" : "")} style={{ width: boyut, height: boyut }} aria-hidden="true">
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
          <path d="M40 6 l1.2 3.1 3.1 1.2 -3.1 1.2 -1.2 3.1 -1.2-3.1 -3.1-1.2 3.1-1.2z" fill="#FFE9A8" />
        </svg>
      )}
    </span>
  );
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
  const [ayarBolum, setAyarBolum] = useState(null); // açık akordeon bölümü
  const [ekTelefon, setEkTelefon] = useState("");
  const [ek2Eposta, setEk2Eposta] = useState("");
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
  const [mesajAcik, setMesajAcik] = useState(false);   // gelen kutusu penceresi
  const [mesajlar, setMesajlar] = useState(null);      // null=okunmadı, []=boş
  // GERÇEK AKIŞ (gönderiler)
  const [gercekAkis, setGercekAkis] = useState(() => {  // Firestore'dan gelen gönderiler — açılışta ÖNBELLEKTEN anında göster, arkada tazele
    try { return JSON.parse(localStorage.getItem("gw_feedCache") || "[]"); } catch (e) { return []; }
  });
  // BEĞENİ / KAYDET (kullanıcı başına, localStorage) + YORUM penceresi
  const [begeniSet, setBegeniSet] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem("groxBegeni") || "[]")); } catch (e) { return new Set(); } });
  const [kaydetSet, setKaydetSet] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem("groxKaydet") || "[]")); } catch (e) { return new Set(); } });
  const [yorumAcik, setYorumAcik] = useState(null);    // yorum penceresi açık gönderi
  const [yorumlar, setYorumlar] = useState(null);      // null=yükleniyor
  const [yorumYazi, setYorumYazi] = useState("");
  const [yorumDurum, setYorumDurum] = useState("");
  const [takipSet, setTakipSet] = useState(new Set());  // takip ettiğim uid'ler
  const [takipBalon, setTakipBalon] = useState(null);   // takip düğmesi yanında kısa etiket (uid; 1.6sn sonra kaybolur)
  const takipBalonZmnRef = useRef(null);
  const [feedFiltre, setFeedFiltre] = useState("hepsi"); // "hepsi" | "takip" — akış filtresi
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
  const [paylasDurum, setPaylasDurum] = useState("");
  const [paylasTur, setPaylasTur] = useState("");     // Fotoğraf | Video | İş İlanı | Ürün/Hizmet | Tavsiye | Duyuru
  const [paylasGorsel, setPaylasGorsel] = useState(""); // eklenen fotoğraf (dataURL)
  const [paylasVideo, setPaylasVideo] = useState("");   // video ÖNİZLEME linki (yerel) veya kaydedilen URL
  const [paylasVideoFile, setPaylasVideoFile] = useState(null); // yüklenecek gerçek video dosyası (Storage'a)
  const [paylasYukleme, setPaylasYukleme] = useState(0);        // video yükleme ilerlemesi %
  // FOTO/VİDEO ÜZERİNE YAZI — metin + renk + boyut + konum (üst/orta/alt). Görselin üstünde katman olarak gösterilir.
  const [ustYazi, setUstYazi] = useState("");
  const [ustRenk, setUstRenk] = useState("#ffffff");
  const [ustBoyut, setUstBoyut] = useState("orta"); // kucuk | orta | buyuk
  const [ustYer, setUstYer] = useState("alt");      // ust | orta | alt
  const [aiKonusuyor, setAiKonusuyor] = useState(false); // TTS çalıyor mu — maskot ağzını oynatır
  const [aiDuraklat, setAiDuraklat] = useState(false); // konuşma DURAKLATILDI mı (Durdur/Devam)
  const maskotBosRef = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      let s = false; try { s = !!(window.speechSynthesis && window.speechSynthesis.speaking); } catch (e) {}
      if (s) { maskotBosRef.current = 0; setAiKonusuyor((p) => (p ? p : true)); }
      else { maskotBosRef.current++; if (maskotBosRef.current >= 2) setAiKonusuyor((p) => (p ? false : p)); } // 2 boş ölçüm (~400ms) → cümle arası boşlukta titremesin
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
  const recognitionRef = useRef(null);     // CANLI DİKTE (tarayıcı SpeechRecognition) — konuştukça şeride yazar
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
    if (maskotTanit) { maskotTanitGec(); return; } // konuşurken tekrar dokun = geç
    maskotTanitYap();
  }
  // MASKOT KARŞILAMA — yeni üye ilk girişte ana sayfada maskot "hoş geldin" der (tek sefer). Kapatınca/dokununca yerine çekilir.
  const [maskotSelam, setMaskotSelam] = useState(false);
  const maskotSelamKapat = () => { setMaskotSelam(false); try { localStorage.setItem("groxMaskotSelam", "1"); } catch (e) {} };
  const [maskotTanit, setMaskotTanit] = useState(false); // maskot BÜYÜK halde konuşuyor mu
  const [maskotMetni, setMaskotMetni] = useState("");
  const maskotBalonRef = useRef(null); // BÜYÜK maskot balonu — okurken teleprompter gibi kaydırma
  // Gloxoo konuşurken o cümleyi görünür alana kaydır (yazı konuşmayla beraber yukarı yürüsün, canlı ilerlesin)
  const maskotKaydir = (idx) => {
    const b = maskotBalonRef.current; if (!b) return;
    const el = b.querySelector('[data-ci="' + idx + '"]'); if (!el) return;
    const hedef = el.offsetTop - b.clientHeight / 2 + el.offsetHeight / 2;
    try { b.scrollTo({ top: Math.max(0, hedef), behavior: "smooth" }); } catch (e) { b.scrollTop = Math.max(0, hedef); }
  };
  // Yeni metin gelince (karşılama/AI cevabı) balonu EN BAŞA sar (üstten başlasın, kesik gelmesin)
  useEffect(() => { const b = maskotBalonRef.current; if (b) b.scrollTop = 0; }, [maskotMetni]);
  const [maskotTur, setMaskotTur] = useState("grox"); // "grox" (yardımcı) | "ekspert" (ayı)
  const [maskotKizgin, setMaskotKizgin] = useState(false); // kötü/hata olunca KIRMIZILAŞIR
  const maskotTanitRef = useRef(false); // büyük maskot açık mı (async cevapta okumak için)
  useEffect(() => { maskotTanitRef.current = maskotTanit; }, [maskotTanit]);
  const maskotTanitYap = () => {
    setMaskotTur("grox");
    const ad = ((profilBilgi && profilBilgi.isim) || adTam || "").split(" ")[0] || "dostum";
    let ilk = false; try { ilk = !localStorage.getItem("groxMaskotTanitildi"); } catch (e) {}
    // KARŞILAMA SAYFA DİLİNE GÖRE (aiDil = ses dili). Türkçe metni Rusça sesle okuma karışması biter.
    void ilk;
    const _ad = ad && ad !== "dostum" ? " " + ad : "";
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
    const selam = G[aiDilRef.current] || G.en;
    try { localStorage.setItem("groxMaskotTanitildi", "1"); } catch (e) {}
    setMaskotMetni(selam); setMaskotTanit(true); setYardimciMod("sohbet");
    // KARŞILAMA sayfaya/transkripte YAZILMAZ (sadece sesli söyler). KENDİ KENDİNE KAPANMAZ — açık/hazır kalır,
    // KAPATMAYI KULLANICI yapar (boşluğa dokun / ✕). (Kullanıcı: konuşunca kapatmasın, ben kapatacağım, beni beklesin.)
    try { sesliOku(selam, undefined, maskotKaydir); } catch (e) {}
    maskotCanliBaslat(); // karşılama bitince mikrofonu aç, SABIRLA bekle → kullanıcı konuşunca cevap ver, sohbet devam etsin
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
    setMaskotTanit(false);
  };
  const maskotSohbetAc = () => { setMaskotTanit(false); setYardimciMod(maskotTur === "ekspert" ? "site" : "sohbet"); setYardimciAcik(true); }; // "Yaz" → tam panel (Ekspert=site, GLOXORG=sohbet). KONUŞMAYI KESME: kullanıcı yazıları görmek için açtı, karşılama sesli devam etsin (B-AI: "yazıyı açtım, o konuşma devam edecek")
  // EKSPERT (ayı) maskotuna dokun → büyür + sayfa uzmanı gibi konuşur, bitince çekilir
  const eksperTanitYap = () => {
    const sayfaAd = { home: "Ana sayfa / Keşfet", elite: "Elite", topluluk: "Topluluk", video: "Canlı Akış", konum: "Konum", akademi: "Akademi", profil: "Profil" }[aktifKodRef.current] || "Ana sayfa";
    const ad = ((profilBilgi && profilBilgi.isim) || adTam || "").split(" ")[0] || "dostum";
    setYardimciBaglam(`Kullanıcı şu an GLOXORG "${sayfaAd}" sayfasında; bu sayfanın eksperti gibi yardım et.`);
    const havuz = [
      `Selam ${ad}! Ben Ekspert ayı, bu sayfanın uzmanıyım. Şu an ${sayfaAd} sayfasındasın; burayla ilgili ne istersen sor!`,
      `Hey ${ad}! Ekspert burada 🐻 ${sayfaAd} sayfasındayız, sana yardıma hazırım. Yazmak için kalem düğmesine dokun.`,
      `Buyur ${ad}, ben sayfa ekspertin. ${sayfaAd} hakkında ne merak ediyorsan söyle, hallederiz!`,
    ];
    const selam = havuz[Math.floor(Math.random() * havuz.length)];
    setMaskotTur("ekspert"); setMaskotMetni(selam); setMaskotTanit(true); setYardimciMod("site");
    // KENDİ KENDİNE KAPANMAZ — açık/hazır kalır; kapatmayı KULLANICI yapar (boşluğa dokun / ✕).
    try { sesliOku(selam, undefined, maskotKaydir); } catch (e) {}
    maskotCanliBaslat(); // ekspert de karşılamadan sonra mikrofonu açıp seni bekler, sohbete devam eder
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
  // İlk açılışta maskot ana sayfada bir kez "hoş geldin" der (giriş yapılmış olsun ya da olmasın görünür)
  useEffect(() => { try { if (!localStorage.getItem("groxMaskotSelam")) setMaskotSelam(true); } catch (e) {} }, []);
  // Servis çalışanını kaydet (telefon bildirimi gösterebilmek için — Android uyumlu)
  useEffect(() => { if ("serviceWorker" in navigator) navigator.serviceWorker.register((process.env.PUBLIC_URL || "") + "/sw.js").catch(() => {}); }, []);
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
  const proUye = !!(profilBilgi && profilBilgi.tip === "profesyonel"); // kırmızı pırlanta + PRO ÜYE
  const uyelik = (profilBilgi && profilBilgi.uyelik) || ""; // "" | "kirmizi" (GLOXORG Kırmızı Pırlanta) | "altin" (GLOXORG Altın Pırlanta) — günlük AI sınırını kaldırır
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
      ctx.arc(bw / 2, bh / 2, Math.min(bw, bh) / 2, 0, Math.PI * 2);
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
      setPaylasGorsel(data); setPaylasVideo(""); setPaylasVideoFile(null);
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
    }
    setDuzenAcik(false); setAcikBolum(null); // okey/kaydet sonrası ayarlar OTOMATİK kapanır
  };
  // Galeri: bir fotoğrafı ANA avatar yap / sil
  function galeriAnaYap(d) { setProfilBilgi((p) => ({ ...(p || {}), avatarFoto: d })); const uu = auth.currentUser; if (uu) profilKaydet(uu.uid, { avatarFoto: d }).catch(() => {}); }
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
      gonderen: { uid: uu.uid, ad: benimAd, foto: isFoto || foto || "" },
    }).then((ok) => { setMesajDurum(ok ? "ok" : "hata"); if (ok) setMesajYazi(""); })
      .catch(() => setMesajDurum("hata"));
  }
  // Gelen kutusu açılınca mesajları oku
  useEffect(() => {
    if (!mesajAcik) return;
    const uu = auth.currentUser; if (!uu) { setMesajlar([]); return; }
    setMesajlar(null);
    mesajlariOku(uu.uid).then((l) => setMesajlar(l || [])).catch(() => setMesajlar([]));
  }, [mesajAcik]);
  // GERÇEK AKIŞ — açılışta kayıtlı gönderileri oku (varsa örnek akışın ÜSTÜNE eklenir)
  useEffect(() => {
    gonderileriOku({}, 40).then((l) => { const arr = l || []; setGercekAkis(arr); try { localStorage.setItem("gw_feedCache", JSON.stringify(arr.slice(0, 40))); } catch (e) {} }).catch(() => {});
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
    setDuzenlenen(g); setPaylasYazi(g.yazi || ""); setPaylasTur(g.tur || ""); setPaylasGorsel(g.gorsel || ""); setPaylasDurum("");
    const uy = g.ustYazi || {}; setUstYazi(uy.metin || ""); setUstRenk(uy.renk || "#ffffff"); setUstBoyut(uy.boyut || "orta"); setUstYer(uy.yer || "alt"); setAiOneriler([]); setPaylasDuzen(g.duzen || null); setPaylasZemin(g.zemin || ""); setPaylasYaziRenk(g.yaziRenk || "");
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
  // KALBE UZUN BAS → kim beğendi listesi; KISA tık → beğen/geri al
  function begeniBas(p) { uzunBasildiRef.current = false; begeniBasRef.current = setTimeout(() => { uzunBasildiRef.current = true; begenenleriAc(p); }, 450); }
  function begeniBirak() { if (begeniBasRef.current) { clearTimeout(begeniBasRef.current); begeniBasRef.current = null; } }
  function begeniTik(p) { if (uzunBasildiRef.current) { uzunBasildiRef.current = false; return; } begenToggle(p); }
  function begenenleriAc(p) { if (!p || !p.id) return; setBegeniListeAcik(p); setBegeniListe(null); begenenleriOku(p.id).then(setBegeniListe).catch(() => setBegeniListe([])); }
  // Bildirimlerde gösterilecek kendi adım/fotoğrafım
  function benimAdGetir() { return (profilBilgi && [profilBilgi.isim, profilBilgi.soyisim].filter(Boolean).join(" ")) || adTam || t("biri", "Biri"); }
  function benimFotoGetir() { return foto || isFoto || ""; }
  // Bildirim metni (zilde + telefon bildiriminde) — çoklu dil için defaultValue interpolasyonu
  function bildirimMetni(b) {
    const ad = b.gonderenAd || t("biri", "Biri");
    if (b.tip === "begeni") return t("bildBegeni", { ad, defaultValue: "{{ad}} gönderini beğendi" });
    if (b.tip === "yorum") return t("bildYorum", { ad, metin: b.metin || "", defaultValue: "{{ad}} yorum yaptı: {{metin}}" });
    if (b.tip === "mesaj") return t("bildMesaj", { ad, defaultValue: "{{ad}} sana mesaj gönderdi" });
    if (b.tip === "takip") return t("bildTakip", { ad, defaultValue: "{{ad}} seni takip etmeye başladı" });
    return ad;
  }
  // Telefon/tarayıcı bildirimi göster (servis çalışanı üzerinden — Android uyumlu)
  async function telefonBildirimGoster(metin, foto2) {
    try {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const reg = (navigator.serviceWorker && (await navigator.serviceWorker.getRegistration() || await navigator.serviceWorker.ready)) || null;
      if (reg && reg.showNotification) reg.showNotification("GLOXORG", { body: metin, icon: foto2 || "/glamworld-yeni/logo192.png", badge: "/glamworld-yeni/logo192.png", tag: "grox-bildirim" });
      else if (typeof Notification === "function") new Notification("GLOXORG", { body: metin, icon: foto2 || undefined });
    } catch (e) {}
  }
  // Yazı alanı DIŞINDA bir kontrole (kaydırıcı/renk/düğme) dokununca klavyeyi KAPAT
  // (kullanıcı: ayarlarda konsantrasyon vb. ayarlarken klavye çıkmasın — sadece yazı şeridine basınca çıksın)
  function klavyeKapatDokun(e) {
    try {
      if (e.target && e.target.closest && e.target.closest('textarea, input[type="text"], input[type="search"]')) return;
      const a = document.activeElement;
      if (a && (a.tagName === "TEXTAREA" || (a.tagName === "INPUT" && /^(text|search|)$/.test(a.type || "")))) a.blur();
    } catch (x) {}
  }
  // AYARLAR açılınca formu profilden doldur
  useEffect(() => {
    if (!ayarlarAcik) return;
    const b = profilBilgi || {};
    setEkTelefon(b.telefon || ""); setEk2Eposta(b.eposta2 || "");
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
      ulke: a.country || "", sehir: a.province || a.state || a.city || a.town || "",
      ilce: a.county || a.district || a.city_district || a.town || a.suburb || "",
      sokak: [a.neighbourhood || a.quarter || a.suburb, a.road, a.house_number].filter(Boolean).join(" "),
      posta: a.postcode || "", adres: d.display_name || "",
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
    const veri = { telefon: (ekTelefon || "").trim(), eposta2: (ek2Eposta || "").trim(), telefonKodu: (telKodu || "").trim() };
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
    sendPasswordResetEmail(auth, eposta).then(() => { setAyarMsg(t("ayarSifreGonderildi", "Şifre sıfırlama bağlantısı e-postana gönderildi ✓")); setTimeout(() => setAyarMsg(""), 4000); }).catch(() => setAyarMsg(t("ayarHata", "Gönderilemedi")));
  }
  // Ayarlardan telefon bildirimi izni iste
  async function bildirimIzniIste() {
    try {
      if (typeof Notification === "undefined") { bilgiBalonu(t("bildDesteklenmiyor", "Bu cihaz/tarayıcı bildirimi desteklemiyor")); return; }
      const izin = await Notification.requestPermission();
      setBildirimIzin(izin); try { localStorage.setItem("groxBildirimIzin", izin); } catch (e) {}
      if (izin === "granted") { bilgiBalonu(t("bildAcildi", "Telefon bildirimleri açıldı")); telefonBildirimGoster(t("bildHosgeldin", "Bildirimler açık — beğeni, yorum ve mesajları buradan alacaksın"), ""); }
      else bilgiBalonu(t("bildVerilmedi", "Bildirim izni verilmedi (telefon ayarlarından da açabilirsin)"));
    } catch (e) {}
  }
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
    setUyeSayfa({ uid: hedef, ad: p.ad || "—", foto: p.foto || "", meslek: p.meslek || "", sehir: p.sehir || "", ulke: p.ulke || "", pro: !!p.pro, amblem: p.amblem, renk: p.renk });
    gonderilerimOku(hedef).then((l) => setUyePostlar(l || [])).catch(() => setUyePostlar([]));
  }
  // PAYLAŞ — telefonun yerel paylaş menüsü (yoksa bağlantıyı kopyala)
  function paylasNative(p) {
    try {
      if (navigator.share) navigator.share({ title: "GLOXORG", text: (p && (p.yazi || p.ad)) || "", url: window.location.href }).catch(() => {});
      else if (navigator.clipboard) { navigator.clipboard.writeText(window.location.href); bilgiBalonu(t("baglantiKopyalandi", "Bağlantı kopyalandı")); }
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
  async function aiYaziOner() {
    if (aiYukleniyor) return;
    setAiYukleniyor(true); setAiOneriler([]);
    const meslek = meslekAd || (profilBilgi && profilBilgi.pro && profilBilgi.pro.meslek) || t("aiUzman", "uzman");
    const sehir = (profilBilgi && profilBilgi.konum && profilBilgi.konum.sehir) || "";
    const tur = paylasTur || "";
    const dilAd = { tr: "Türkçe", en: "İngilizce", de: "Almanca", fr: "Fransızca", es: "İspanyolca", ru: "Rusça", ar: "Arapça" }[dil] || "Türkçe";
    const istek = `Meslek: ${meslek}. ${sehir ? "Şehir: " + sehir + ". " : ""}${tur ? "Gönderi türü: " + tur + ". " : ""}Bu kişi için sosyal medyada paylaşacağı, kısa, şık, zarif 3 farklı gönderi yazısı öner. ${dilAd} dilinde yaz. SADECE 3 satır ver, her satır bir öneri; numara/işaret/tırnak koyma.`;
    try {
      const r = await fetch(AI_KOPRU, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: istek, sistem: "Sen GLOXORG adli luks bir profesyonel sosyal platform icin yazi asistanisin. Kisa, sik, zarif ve samimi yaz." }),
      });
      if (r.ok) {
        const veri = await r.json();
        const txt = (veri && veri.metin) || "";
        const satirlar = (txt || "").split("\n").map((s) => s.replace(/^["'\d.)\-•*\s]+/, "").replace(/["']+$/, "").trim()).filter((s) => s.length > 4).slice(0, 3);
        if (satirlar.length) { setAiOneriler(satirlar); setAiYukleniyor(false); return; }
      }
    } catch (e) {}
    setAiOneriler(yerelAiOneriler()); setAiYukleniyor(false);
  }
  // SİTE ASİSTANI KOMUTU → pencere aç (asistanı kapat ki açılan görünsün)
  function komutAc(k) {
    setYardimciAcik(false);
    if (k === "profil") setAktifKod("profil");
    else if (k === "anasayfa" || k === "kesfet") setAktifKod("home");
    else if (k === "konum") setAktifKod("konum");
    else if (k === "ara" || k === "arama") setAraAcik(true);
    else if (k === "bildirim" || k === "bildirimler") setBildirimAcik(true);
    else if (k === "mesaj" || k === "mesajlar") setMesajAcik(true);
    else if (k === "paylas" || k === "paylasim") { setDuzenlenen(null); setPaylasYazi(""); setPaylasGorsel(""); setPaylasVideo(""); setPaylasDurum(""); setPaylasAcik(true); }
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
    const dilAd = { tr: "Türkçe", en: "İngilizce (English)", de: "Almanca (Deutsch)", fr: "Fransızca (Français)", es: "İspanyolca (Español)", ru: "Rusça (Русский)", ar: "Arapça (العربية)", it: "İtalyanca (Italiano)", pt: "Portekizce (Português)", zh: "Çince (中文)", ja: "Japonca (日本語)", hi: "Hintçe (हिन्दी)", uk: "Ukraynaca (Українська)" }[aiDilRef.current] || "Türkçe";
    // Zaman + ad ÖNCEDEN hesaplanır ve promptun BAŞINA konur (köprü 2000'de kesse bile AI saati/tarihi BİLİR)
    const aiAd = (profilBilgi && [profilBilgi.isim, profilBilgi.soyisim].filter(Boolean).join(" ")) || adTam || "";
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
    let sistem = `ÇOK ÖNEMLİ DİL KURALI: Kullanıcı SANA HANGİ DİLDE yazarsa/konuşursa, yanıtını TAM O DİLDE ver. Kullanıcı Rusça yazdıysa tamamen Rusça, Türkçe yazdıysa Türkçe, Arapça ise Arapça, İngilizce ise İngilizce yanıtla — kullanıcının diline UY. "Seni anlamadım", "ben şu dilde konuşurum" gibi şeyler ASLA deme; her dili anlarsın ve o dilde akıcı yanıt verirsin. Dili net anlaşılmıyorsa ${dilAd} kullan. Tek yanıt içinde dilleri KARIŞTIRMA. `;
    // ZAMAN/TARİH (erken — kesilmez): AI saati bilsin
    sistem += `ŞU ANKİ GERÇEK TARİH VE SAAT: ${simdiStr}${tzAd ? " (" + tzAd + ")" : ""}${myAd ? ", " + myAd + " yerel saati" : ""}.${saatNet ? " Saat tam olarak " + saatNet + " (24 saat biçimi)." : ""} Bu, YAZ/KIŞ saati farkı ZATEN uygulanmış kesin yerel saattir; üstüne ASLA saat ekleme/çıkarma yapma, "kış saati/yaz saati/tarife/şu an aslında saat şu" diye DÜZELTME yapma, başka saat dilimine çevirme, kendi kafandan saat HESAPLAMA — sadece yukarıda yazan saati birebir söyle. Saat kaç, bugün ne, hangi gün gibi sorulursa MUTLAKA tam bunu söyle; ASLA "bilmiyorum" deme, asla eski/yanlış tarih uydurma.${zamanBilgi} Kullanıcının adı: ${aiAd || "değerli üye"}; ismini HER cümlede DEĞİL, ara sıra (uygun olunca "${(aiAd || "").split(" ")[0] || "değerli üye"} Bey/Hanım" gibi) kullan; tonunu/üslubunu konuşmanın havasına göre ayarla (samimi, ciddi, neşeli). `;
    // KONUM + YAKIN ÇEVRE (başa alındı — kesilmez): AI gerçek yeri ve etrafı bilsin
    if (konum.lat != null && konum.lon != null) sistem += `KULLANICININ GERÇEK KONUMU (haritadan/GPS): ${myTamKonum || konum.kod}. Dahili koordinat ${konum.lat.toFixed(5)},${konum.lon.toFixed(5)} — bu SADECE harita linki içindir; kullanıcıya ASLA rakamla koordinat SÖYLEME, konumu normal kelimelerle anlat (mahalle/şehir/ülke). Konum burada ne yazıyorsa ODUR; başka şehir/ülke UYDURMA. ÖNEMLİ: Kullanıcı "konumumu aç/göster", "haritada göster", "neredeyim haritada" derse SAYFA AÇMA komutu KULLANMA; bunun yerine kısa bir cümle + [HARITA: Konumum | ${konum.lat.toFixed(5)},${konum.lon.toFixed(5)}] etiketi koy (bu, haritada konumunu açan düğmeye dönüşür). `;
    if (etraf) sistem += `KULLANICININ YAKIN ÇEVRESİ (SADECE "yakınımda ne var / en yakın X / X'e ne kadar var" gibi sorular için; gerçek konumdan, OpenStreetMap): ${etraf} Bu listeyi yalnızca YAKIN sorularda kullan; kaç tane varsa HEPSİNİ mesafesiyle say (uydurma). `;
    else if (konum.lat != null) sistem += `Yakın çevre listesi henüz gelmedi; "yakınımda" sorulursa kısaca konum iznini açmasını iste. `;
    // DÜNYA ÇAPINDA — kısıtlama YOK (kullanıcı her yerden, her şeyi sorabilir)
    sistem += `SEN DÜNYA ÇAPINDA SINIRSIZ BİLGİLİ BİR ASİSTANSIN — sen (Claude) ne biliyorsan KULLANICI için de o kadar bilirsin. Dünyanın HER ülkesi, şehri, ilçesi, kasabası; oteller, bankalar, postaneler, marketler, restoranlar, hastaneler, fabrikalar, üreticiler, markalar, üniversiteler, müzeler, tarihî yerler, güzergâhlar — bildiğin HER ŞEYİ söyle ve yardım et. "Bunu bilmiyorum", "veremiyorum", "yapamıyorum", "sadece yakını biliyorum", "elimde sadece şu şehirler var" gibi şeyleri ASLA deme; bilginle gerçek isimler ver. Kullanıcı bir güzergâh/yolculuk anlatırsa (örn "Vilnius'tan Mykolaiv/Nikolayev'e gideceğim, yolda otel"), o güzergâh ve VARIŞ şehri için GERÇEK otel/yer isimleri öner ve her biri için [HARITA: Yer adı | Şehir, Ülke] etiketi koy (UZAK/dünya yerlerinde koordinat yerine YER ADINI yaz, örn [HARITA: Hotel Reikartz Mykolaiv | Mykolaiv, Ukrayna]; yakın yerlerde yukarıdaki listenin koordinatını kullan). Birden çok yer için birden çok [HARITA:] koy. Bu platform TÜM DÜNYAYA hizmet eder, kimseye özel kısıt YOKTUR. SADECE gerçek zamanlı/bugünkü anlık haber-fiyat gibi şeyleri canlı bilemezsin; onun dışında her şeyi bilir ve yardım edersin. `;
    // 1) HAZIRLANAN METİN AYRI BLOK (en kritik — kopyala/paylaş bunu alır)
    sistem += `EN ÖNEMLİ KURAL — HAZIRLANAN METİN AYRI: Kullanıcı için bir paylaşım, gönderi, mesaj, şiir, kutlama, ilan, slogan, biyografi veya kopyalanabilir/paylaşılabilir HERHANGİ bir metin hazırladığında (kısa ya da uzun, KAÇINCI kez olursa olsun HER SEFERİNDE), o metni MUTLAKA ve SADECE şu etiketlerin arasına koy: [PAYLASIM]...sadece paylaşılacak metin...[/PAYLASIM]. Bu etiketlerin İÇİNE kendi sohbetini/açıklamanı ASLA yazma; etiket DIŞINDAki sözün en fazla TEK kısa cümle olsun. Hazırladığın metin ŞIK, canlı, SÜSLÜ olsun: bol emoji + çiçek/yıldız süsleri (🌸✨🌟💫🎉), sönük/düz değil. ÖRNEK: kullanıcı "bana doğum günü paylaşımı yaz" derse yanıtın TAM şöyle: Hazır! 🎉 [PAYLASIM]🎂✨ Nice mutlu yıllara! Bugün senin günün! 🥳🌸[/PAYLASIM]. UNUTMA: paylaşılacak/kopyalanacak metin SADECE [PAYLASIM][/PAYLASIM] arasında olur; etiketi koymayı ASLA unutma yoksa kullanıcı kopyalayamaz. `;
    // 2) TIKLANABİLİR ÖNERİLER (ayrı)
    sistem += `Uygunsa yanıtının EN SONUNA, kullanıcının tek dokunuşla seçebileceği 2-3 KISA sonraki adım önerisini SADECE şu formatta tek satır ekle: [ONERILER: birinci | ikinci | üçüncü]. Her öneri ${dilAd} dilinde, en fazla 5-6 kelime, kullanıcının ağzından istek gibi (örnek: "Bana paylaşım yazısı yaz"). Uygun değilse bu satırı HİÇ koyma. `;
    // 3) KISA + biçimlendirme yasağı
    sistem += `KISA ve net konuş, laf kalabalığı yapma (açıklaman 1-2 cümle). Yıldız (*), çift yıldız (**kalın**), kare (#), tire-liste, markdown ASLA kullanma — düz metin yaz; sesli konuşur gibi akıcı cümleler; ara sıra emoji serbest. SADECE kullanıcının sorduğu/istediği şeye cevap ver; kullanıcı istemeden kendiliğinden konu açma, ekstra bilgi/öneri YAĞDIRMA, "şunu da yapayım mı" diye üstüne gitme — kullanıcının ne isteyeceğini BEKLE. Resim/görsel ÇİZME, çizemezsin; istenirse kibarca metinle yardım et. KİŞİLİK: sıcak, samimi, neşeli ve CANLI bir dost gibi konuş; yeri gelince hafif şaka yap, espri yap, gül (😄😊); robot gibi soğuk olma — ama yine de KISA kal ve kullanıcı istemeden konuyu uzatma. `;
    // === ROL + BAĞLAM (daha az kritik — köprü kısaltırsa buradan kısalır) ===
    sistem += site
      ? `Sen Gloxoo'sun, GLOXORG sitesinin akıllı asistanı (lüks küresel profesyonel sosyal platform; bölümler: Ana sayfa/Keşfet, Profil, Paylaşım, Arama, Bildirimler, Mesajlar, Konum, Ayarlar). SADECE kullanıcı AÇIK şekilde bir bölümü AÇMANI isterse (örn "profili aç") yanıtının EN BAŞINA şu komutlardan SADECE BİRİNİ yaz: [AC:anasayfa] [AC:profil] [AC:paylas] [AC:ara] [AC:bildirim] [AC:mesaj] [AC:konum] [AC:ayar]. Soru/sohbet/yardım ise veya EMİN DEĞİLSEN komut KOYMA.`
      : `Sen Gloxoo'sun — GLOXORG adlı lüks, küresel profesyonel sosyal platformun akıllı kalbi ve yardımcı asistanı. Adın Gloxoo; kendini tanıtırken "Gloxorg dünyasının akıllı kalbi Gloxoo" dersin. Paylaşım yazma, meslek tanıtımı, müşteri bulma gibi konularda yardım et.`;
    if (yardimciBaglam) sistem += ` KULLANICININ ŞU AN BULUNDUĞU YER/KONU: ${yardimciBaglam} Soruları büyük olasılıkla bununla ilgili.`;
    sistem += ` KULLANICI BİLGİSİ: ${proUye ? "Profesyonel (kırmızı pırlanta) üye" : "Müşteri (beyaz pırlanta) üye"}${meslekAd ? ", meslek " + meslekAd : ""}, konum ${myTamKonum || konum.kod}${u && u.email ? ", e-posta " + u.email : ""}. Nerede olduğu sorulursa konumu kullan.`;
    const mesajlar = yeniListe.map((m) => {
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
      if (maskotTanitRef.current && metin) setMaskotMetni(metin); // BÜYÜK maskot açıksa: balonunda da cevabı göster (sadece karşılama kalmasın, konuşmaya devam ediyormuş gibi)
      // OTOMATİK SESLİ OKUMA: yeni cevabın BALON düğmesinde × göster (konuşurken), bitince kendiliğinden kapansın → balon düğmesi = konuşma göstergesi/kontrolü
      if (sesliMod && metin) { const yi = yeniListe.length; setKonusanMesaj(yi); konusanMesajRef.current = yi; sesliOku(metin, okuTemizle, maskotTanitRef.current ? maskotKaydir : undefined); }
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
  const sesliOku = (metin, onBitti, onCumle) => {
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
        parcalar.forEach((p, idx) => {
          const u = new SpeechSynthesisUtterance(p);
          u.lang = sesDilKodu; u.rate = 1; u.pitch = 1; if (ses) u.voice = ses;
          // HER cümle okunmaya başlayınca haber ver → balon o cümleye kaysın (teleprompter)
          u.onstart = () => { if (typeof onCumle === "function") { try { onCumle(idx); } catch (e) {} } };
          // SON parça bitince haber ver (oku düğmesi × → tekrar normale dönsün)
          if (idx === parcalar.length - 1 && typeof onBitti === "function") u.onend = () => { try { onBitti(); } catch (e) {} };
          window.speechSynthesis.speak(u);
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
  const sesleSor = async () => {
    if (dikteAcikRef.current) { try { dikteDurdur(); } catch (e) {} } // eski canlı dikte kapalı kalsın
    // 2. basış: kaydı DURDUR → çevrilir
    if (dinliyor && mediaRecorderRef.current) { try { mediaRecorderRef.current.stop(); } catch (e) {} return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { setKucukMesaj(t("sesYok", "Bu tarayıcı sesli konuşmayı desteklemiyor")); return; }
    if (canliSohbetRef.current) { try { canliSohbetToggle(); } catch (e) {} await new Promise((r) => setTimeout(r, 200)); }
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
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
          const r = await fetch(AI_KOPRU, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ses: b64 }) });
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
    if (!navigator.mediaDevices || !window.MediaRecorder) { setKucukMesaj(t("sesYok", "Bu tarayıcı sesli konuşmayı desteklemiyor")); return; }
    try {
      // UZAK/DERİN SESLERİ ELE: gürültü engelleme + yankı iptali + oto-kazanç KAPALI (uzak sesler yükseltilmesin)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr; sesParcaRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size) sesParcaRef.current.push(e.data); };
      let ac, raf, konustu = false, sessizBas = 0, yuksek = 0; const basT = Date.now();
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        const src = ac.createMediaStreamSource(stream); const an = ac.createAnalyser(); an.fftSize = 1024; src.connect(an);
        const veri = new Uint8Array(an.fftSize);
        const izle = () => {
          if (!mr || mr.state !== "recording") return;
          an.getByteTimeDomainData(veri);
          let rms = 0; for (let i = 0; i < veri.length; i++) { const v = (veri[i] - 128) / 128; rms += v * v; } rms = Math.sqrt(rms / veri.length);
          const simdi = Date.now();
          // KONUŞMA ALGILA: eşik makul (0.05) + 2 kare → normal/hafif ses de yakalanır (kullanıcı: konuştuğumda cevap vermiyordu). noiseSuppression arka gürültüyü baskılar.
          if (rms > 0.05) { yuksek++; if (yuksek >= 2) { konustu = true; sessizBas = 0; } }
          else { yuksek = 0; if (konustu && !sessizBas) sessizBas = simdi; else if (konustu && sessizBas && simdi - sessizBas > 1200) { try { mr.stop(); } catch (e) {} return; } } // 1.2sn SESSİZLİK → bitti (hızlı cevap), yarıda kesme yok
          if (simdi - basT > 30000) { try { mr.stop(); } catch (e) {} return; } // en fazla 30sn (uzun konuşmaya izin)
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
        if (!konustu || !blob.size) { if (canliSohbetRef.current) { setKucukMesaj(t("duyamadim", "Seni duyamadım — biraz daha yüksek konuş 🎤")); canliDinle(); } return; }
        const b64 = await new Promise((res) => { const fr = new FileReader(); fr.onloadend = () => res(((fr.result || "") + "").split(",")[1] || ""); fr.readAsDataURL(blob); });
        if (!b64) { if (canliSohbetRef.current) canliDinle(); return; }
        setYardimciYukleniyor(true);
        try {
          const r = await fetch(AI_KOPRU, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ses: b64 }) });
          const veri2 = await r.json(); setYardimciYukleniyor(false);
          const metin = ((veri2 && veri2.metin) || "").trim();
          if (metin) yardimciGonder(metin, { canli: true }); // cevap sesli okunur → bitince (onend) tekrar dinler
          else if (canliSohbetRef.current) canliDinle();
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
  const canliSohbetToggle = () => {
    if (canliSohbetRef.current) { // KAPAT
      canliSohbetRef.current = false; setCanliSohbet(false); setDinliyor(false);
      aiKarsiladiRef.current = false;
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
      try { mediaRecorderRef.current && mediaRecorderRef.current.stop(); } catch (e) {}
      return;
    }
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
    setAiDuraklat(false);
    try { okuTemizle(); } catch (e) {}
    if (canliSohbetRef.current) { try { canliDevam(); } catch (e) {} } // sustuktan sonra SENİ dinle
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
    setPaylasYazi(metin); setPaylasGorsel(""); setPaylasVideo(""); setPaylasDurum("");
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
  // YENİ KONUŞMA — mevcut konuşmayı KAYDEDER (Konuşmalarım'a), sonra görünümü temizler; canlı varsa kapatır (geçmiş silinmez)
  const yeniKonusma = () => {
    setAiDilAcik(false);
    if (canliSohbetRef.current) { try { canliSohbetToggle(); } catch (e) {} }
    oturumKaydet();
    if (yardimciMod === "site") setSiteMesajlar([]); else setYardimciMesajlar([]);
    setYardimciYazi("");
    aiKarsiladiRef.current = false; // tekrar karşılayabilsin
  };
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
      if (canliSohbetRef.current) { canliSohbetRef.current = false; setCanliSohbet(false); setDinliyor(false); }
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
      try { mediaRecorderRef.current && mediaRecorderRef.current.stop(); } catch (e) {}
      if (dikteAcikRef.current) { try { dikteDurdur(); } catch (e) {} }
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
      `Ekibime yetenekli bir ${meslek} arıyorum. Detaylar için yazın${se}.`,
      `${meslek} alanında birlikte çalışacağım kişiyi arıyorum — sen olabilir misin?${se}`,
      `Yeni bir fırsat: ${meslek} pozisyonu açık. İlgilenenler mesaj atsın${se}.`,
    ];
    else if (tur === "Ürün / Hizmet") havuz = [
      `${meslek} hizmetimle tanışın — kalite ve zarafet bir arada${se}.`,
      `Sizin için özenle hazırladım. ${meslek}${se}.`,
      `Yeni hizmetim yayında ✦ ${meslek}. Detay için mesaj${se}.`,
    ];
    else if (tur === "Tavsiye") havuz = [
      `Bugünün önerisi: işini sevenden hizmet al. ${meslek}${se}.`,
      `Küçük bir tavsiye, büyük fark yaratır ✦ ${meslek}${se}.`,
      `Deneyimle gelen öneri: ${meslek}${se}.`,
    ];
    else if (tur === "Duyuru") havuz = [
      `Önemli duyuru ✦ ${meslek}${se}. Takipte kalın.`,
      `Sizinle güzel bir haber paylaşmak istiyorum${se}.`,
      `Yeni bir başlangıç! ${meslek}${se}.`,
    ];
    else havuz = [
      `${meslek} tutkusuyla, her detay özenle işlendi${se}.`,
      `Yeni çalışmamı sizinle paylaşıyorum ✦ ${meslek}${se}.`,
      `Kalite, emek ve zarafet bir arada. ${meslek}${se}.`,
      `İşimi seviyorum, bu da sonucu ✦${se}.`,
    ];
    // karıştır, 3 tane al
    return havuz.sort(() => Math.random() - 0.5).slice(0, 3);
  }
  async function paylasGonder() {
    const uu = auth.currentUser;
    if (!uu || (!paylasYazi.trim() && !paylasGorsel && !paylasVideoFile)) return;
    setPaylasDurum("gonderiliyor");
    // VİDEO varsa ÖNCE Storage'a yükle, linkini al (büyük video Firestore'a sığmaz)
    let videoURL = "";
    if (paylasVideoFile) {
      try {
        setPaylasDurum("video"); setPaylasYukleme(0);
        videoURL = await videoYukle(paylasVideoFile, uu.uid, (y) => setPaylasYukleme(y));
        setPaylasDurum("gonderiliyor");
      } catch (e) { setPaylasDurum("videohata"); return; }
    }
    const benimAd = (profilBilgi && [profilBilgi.isim, profilBilgi.soyisim].filter(Boolean).join(" ")) || adTam || "";
    const yeni = {
      uid: uu.uid, ad: benimAd, meslek: meslekAd || "", tur: paylasTur || "", pro: proUye,
      sehir: (profilBilgi && profilBilgi.konum && profilBilgi.konum.sehir) || "",
      ulke: (profilBilgi && profilBilgi.konum && profilBilgi.konum.ulke) || "",
      foto: (paylasAvatar === "amblem" && isFoto) ? isFoto : (foto || isFoto || ""), amblem: !!(paylasAvatar === "amblem" && isFoto),
      gorsel: paylasGorsel || "", video: videoURL || "", yazi: paylasYazi.trim().slice(0, 20000), zamanMs: Date.now(),
      ustYazi: (ustYazi.trim() && (paylasGorsel || videoURL)) ? { metin: ustYazi.trim().slice(0, 120), renk: ustRenk, boyut: ustBoyut, yer: ustYer } : null,
      duzen: paylasDuzen || null,
      zemin: (!paylasGorsel && !videoURL) ? (paylasZemin || "") : "", yaziRenk: (!paylasGorsel && !videoURL) ? (paylasYaziRenk || "") : "",
    };
    if (duzenlenen && duzenlenen.id) {
      // DÜZENLEME → mevcut gönderiyi güncelle
      gonderiGuncelle(duzenlenen.id, { yazi: yeni.yazi, tur: yeni.tur, gorsel: yeni.gorsel, ustYazi: yeni.ustYazi, duzen: yeni.duzen, zemin: yeni.zemin, yaziRenk: yeni.yaziRenk }).then((ok) => {
        if (ok) {
          const guncel = (g) => g.id === duzenlenen.id ? { ...g, yazi: yeni.yazi, tur: yeni.tur, gorsel: yeni.gorsel, ustYazi: yeni.ustYazi, duzen: yeni.duzen, zemin: yeni.zemin, yaziRenk: yeni.yaziRenk } : g;
          setGercekAkis((a) => a.map(guncel)); setGonderilerim((a) => a.map(guncel));
          setPaylasYazi(""); setPaylasTur(""); setPaylasGorsel(""); setPaylasVideo(""); setPaylasVideoFile(null); setPaylasYukleme(0); setDuzenlenen(null); setPaylasDurum("ok");
          setTimeout(() => { setPaylasAcik(false); setPaylasDurum(""); }, 800);
        } else setPaylasDurum("hata");
      }).catch(() => setPaylasDurum("hata"));
      return;
    }
    gonderiEkle(yeni).then((id) => {
      if (id) { const yk = { id, begeni: 0, ...yeni }; setGercekAkis((a) => [yk, ...a]); setGonderilerim((a) => [yk, ...a]); setPaylasYazi(""); setPaylasTur(""); setPaylasGorsel(""); setPaylasVideo(""); setPaylasVideoFile(null); setPaylasYukleme(0); setPaylasDurum("ok"); setTimeout(() => { setPaylasAcik(false); setPaylasDurum(""); }, 800); }
      else setPaylasDurum("hata");
    }).catch(() => setPaylasDurum("hata"));
  }
  // Paylaş fotoğraf seç → küçült → ekle
  function paylasFotoSec(e) {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => { const img = new Image(); img.onload = () => { setPaylasGorsel(imgKucult(img, 1000)); setPaylasVideo(""); }; img.src = ev.target.result; };
    r.readAsDataURL(f); e.target.value = "";
  }
  // Paylaş VİDEO seç (albümden/Google'dan) — Firebase Storage'a yüklenir (Paylaş'a basınca).
  // Burada SADECE dosyayı tutar + yerel önizleme gösterir (yükleme gönderide olur). Sınır ~80MB.
  function paylasVideoSec(e) {
    const f = e.target.files && e.target.files[0]; if (!f) { return; }
    if (f.size > 80 * 1024 * 1024) { setPaylasDurum("buyuk"); e.target.value = ""; return; }
    setPaylasVideoFile(f);
    setPaylasVideo(URL.createObjectURL(f)); // yerel önizleme (yüklemeden de görünür)
    setPaylasGorsel(""); setPaylasDurum(""); setPaylasYukleme(0);
    e.target.value = "";
  }
  // ad = KAYITLI değer (DEĞİŞMEZ — eski gönderiler bununla eşleşir); cev = ekranda gösterilen çeviri anahtarı
  const PAYLAS_TURLER = [
    { ad: "Fotoğraf", cev: "turFoto", tip: "foto", renk: "#2ecc71", foto: true },
    { ad: "Video", cev: "turVideo", tip: "video", renk: "#e74c3c", video: true },
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
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude, lon = pos.coords.longitude;
      setKonum((k) => ({ ...k, lat, lon })); // koordinat hemen (etraf taraması bununla başlar)
      // 1) NOMINATIM (zengin, doğru adres) — şehir/ülkeyi GPS'ten KESİNLEŞTİR (IP'nin yanlış şehir/ülkesini EZER; "Kyiv/Ukrayna" hatası buradandı)
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14&accept-language=tr`, { headers: { Accept: "application/json" } });
        const d = await r.json();
        const a = d && d.address;
        if (a && a.country_code) {
          setKonum((k) => ({
            ...k,
            kod: (a.country_code || "").toUpperCase(),
            sehir: a.city || a.town || a.village || a.municipality || a.county || a.state || "",
            ilce: a.city_district || a.suburb || a.borough || a.district || a.county || "",
            mahalle: a.neighbourhood || a.quarter || a.suburb || a.hamlet || "",
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
    }, () => {}, { enableHighAccuracy: true, timeout: 9000, maximumAge: 300000 });
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
      "waterway=river": "nehir", "waterway=stream": "dere", "waterway=canal": "kanal",
      "leisure=park": "park",
    };
    (async () => {
      try {
        // Market/dükkanlar 1500m (daha çok market yakalanır), su/doğa 3000m. node+way (bazı marketler bina=way).
        const q = `[out:json][timeout:25];(nwr(around:1500,${lat},${lon})[shop~"^(supermarket|convenience|mall|bakery|greengrocer|butcher|kiosk|department_store)$"];nwr(around:1500,${lat},${lon})[amenity~"^(marketplace|post_office|pharmacy|bank|atm|hospital|clinic|doctors|cafe|restaurant|fast_food|fuel|school|kindergarten|place_of_worship|police|fire_station)$"];nwr(around:1500,${lat},${lon})[leisure~"^(park|playground|sports_centre)$"];way(around:3000,${lat},${lon})[natural~"^(water|beach|coastline|peak)$"];way(around:3000,${lat},${lon})[waterway~"^(river|stream|canal)$"];);out center 200;`;
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
  const ustPencereVar = menuAcik || ayarlarAcik || profilAcik || bildirimAcik || araAcik || mesajAcik || paylasAcik || !!tamFoto || !!uyeSayfa || yardimciAcik || sehirAcik || !!araSecili || uyelikKartAcik || ayarHaritaAcik || !!sektorListe || arsivAcik;
  useEffect(() => {
    if (aktifKod !== "home") return;
    const vids = Array.from(document.querySelectorAll(".ana-akis .apr-medya.video video"));
    if (!vids.length) return;
    if (ustPencereVar) { vids.forEach((v) => { try { v.pause(); } catch (e) {} }); return; } // pencere açıkken oynatma (parlama önlenir)
    const io = new IntersectionObserver((girisler) => {
      girisler.forEach((g) => {
        const v = g.target;
        if (g.isIntersecting && g.intersectionRatio >= 0.55) { v.play().catch(() => {}); }
        else { try { v.pause(); } catch (e) {} }
      });
    }, { threshold: [0, 0.55, 1] });
    vids.forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, [aktifKod, feedFiltre, gercekAkis, ustPencereVar]);
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
  // Tam ekran AÇIKKEN sayfa kaydırması KİLİTLİ → adres çubuğu çıkıp ✕'i oynatmaz (sabit kalır)
  useEffect(() => {
    if (!tamFoto) return;
    const onceki = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setZoom({ s: 1, x: 0, y: 0 }); // her açılışta NORMAL (yakınlaştırılmamış); kullanıcı kendi büyütür
    setVidOyn(false); setVidT(0); setVidSure(0); // video oynatıcı sıfırla
    return () => { document.body.style.overflow = onceki; };
  }, [tamFoto]);
  // --- TAM EKRAN parmakla ZOOM jestleri ---
  const _mesafe = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
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
      + ((menuAcik || profilAcik || bildirimAcik || araAcik || mesajAcik || ayarlarAcik) ? 1 : 0) + (ayarHaritaAcik ? 1 : 0) + (telHaritaAcik ? 1 : 0) + (sektorListe ? 1 : 0) + (uyelikKartAcik ? 1 : 0) + (araSecili ? 1 : 0) + (paylasAcik ? 1 : 0) + (tamFoto ? 1 : 0) + (uyeSayfa ? 1 : 0) + (yardimciAcik ? 1 : 0) + (sehirAcik ? 1 : 0);
    // Açık katman sayısı kadar koruma kaydı OLSUN — eksikse ekle (pushState, hash DEĞİŞMEZ).
    while (guardSayRef.current < acikKatman) {
      try { window.history.pushState(window.history.state, "", window.location.href); guardSayRef.current++; }
      catch (e) { break; }
    }
    // Katman DOKUNARAK kapandıysa kayıt fazla kalır — DOKUNMAYIZ (history.back YOK = sekme sıfırlanamaz);
    // o fazla kayıt sonraki geri basışta zararsızca (aynı sayfa) tükenir.
  }, [menuAcik, profilAcik, bildirimAcik, araAcik, acikBolum, duzenAcik, aktifKod, araSecili, mesajAcik, paylasAcik, tamFoto, uyeSayfa, yardimciAcik, sehirAcik, ayarlarAcik, ayarHaritaAcik, sektorListe, uyelikKartAcik, telHaritaAcik]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onPop = () => {
      // Bu geri basışı bir koruma kaydı tüketti. EN ÜST açık katmanı kapat, sayfada KAL.
      guardSayRef.current = Math.max(0, guardSayRef.current - 1);
      if (telHaritaAcikRef.current) { telHaritaAcikRef.current = false; setTelHaritaAcik(false); }
      else if (uyelikKartAcikRef.current) { uyelikKartAcikRef.current = false; setUyelikKartAcik(false); }
      else if (sektorListeRef.current) { sektorListeRef.current = ""; setSektorListe(""); }
      else if (ayarHaritaAcikRef.current) { ayarHaritaAcikRef.current = false; setAyarHaritaAcik(false); }
      else if (sehirAcikRef.current) { sehirAcikRef.current = false; setSehirAcik(false); }
      else if (yardimciAcikRef.current) { yardimciAcikRef.current = false; setYardimciAcik(false); }
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
      if (e.target && e.target.closest && e.target.closest(".ana-serit, input, textarea, select, .apf-ayar-panel, .uye-sayfa, .pyl-pencere, .msj-pencere")) { dokunRef.current = null; return; }
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
    <div ref={kokRef} className={"ana-kok" + (pro ? " ana-kok-pro" : "") + " sayfa-" + aktifKod} onTouchStart={kaydirBas} onTouchEnd={kaydirBit}
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

      {/* Üst başlık */}
      <header className="ana-header">
        {/* ÇERÇEVE = GERÇEK pırlanta taşları (renk renk, yüzük gibi), altın bant üzerinde */}
        <span className="hdr-cerceve" aria-hidden="true">
          <span className="hdr-tas-row hdr-ust"><CerceveTas n={9} /></span>
          <span className="hdr-tas-row hdr-alt"><CerceveTas n={9} /></span>
          <span className="hdr-tas-col hdr-sol"><CerceveTas n={3} /></span>
          <span className="hdr-tas-col hdr-sag"><CerceveTas n={3} /></span>
        </span>
        <button className="ana-menu-btn" onClick={() => setMenuAcik(true)} aria-label="Menü">{Ikon.menu}</button>
        <button className="ana-menu-btn ana-zil" onClick={() => { setBildirimAcik(true); bildirimleriOkunduYap(bildirimListe); setBildirimListe((l) => l.map((b) => ({ ...b, okundu: true }))); }} aria-label={t("bildirimBaslik")}>
          {Ikon.bildirim}
          {bildirimListe.some((b) => !b.okundu) && <span className="ana-zil-rozet">{Math.min(99, bildirimListe.filter((b) => !b.okundu).length)}</span>}
        </button>
        {/* DİL — SADECE geniş ekranda (bilgisayar/iPad/notebook) header'da görünür; telefonda menüdedir (yer dar). CSS: .header-dil telefonda display:none, >=760px görünür */}
        <span className="header-dil"><DilSecici /></span>
        {/* MARKA her pencerede O SAYFANIN renginde: pırlanta + GLOXORG + sayfanın adı (ANAYASA 6.15) */}
        <div className="ana-logo-sar">
          <span className="ana-logo-yazi">
            <MarkaCizgi konum="sol" />
            <AmblemMavi konum="sol" renk={temaRenk} />
            <span className="ana-logo notranslate" translate="no">GLO<b>X</b>ORG</span>
            <AmblemMavi konum="sag" renk={temaRenk} />
            <MarkaCizgi konum="sag" />
          </span>
          <span className="ana-alt-sar">
            <span className="ana-alt">{aktifKod === "home" ? t("anaSubtitle") : (aktifKod === "elite" ? t("navElitePazar", "Elite Pazar") : aktifEt)}</span>
            {aktifKod === "home" && <DunyaKure />}
          </span>
        </div>
        {/* SİTE ASİSTANI — Google profilinin yanında; komutla pencere açar (balondan ayrı) */}
        <button className="ana-ara-btn ana-site-ai" onClick={() => { if (maskotTanit) { maskotTanitGec(); return; } eksperTanitYap(); }} aria-label={t("siteAsistan", "Site Asistanı")}>
          {/* MASKOT 2 — Ekspert: bilge AYI (altın çerçeve marka olarak korunur) */}
          <svg className="ana-site-ai-pusula" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9.7" fill="#0c1730" stroke="#FFD700" strokeWidth="1.2" />
            <circle cx="7.7" cy="7.8" r="2.1" fill="#a9743f" /><circle cx="16.3" cy="7.8" r="2.1" fill="#a9743f" />
            <circle cx="7.7" cy="7.8" r="0.95" fill="#5b3a1c" /><circle cx="16.3" cy="7.8" r="0.95" fill="#5b3a1c" />
            <circle cx="12" cy="12.4" r="5.1" fill="#c08a4e" />
            <ellipse cx="12" cy="13.9" rx="2.5" ry="1.9" fill="#ecd6b0" />
            <circle cx="10.1" cy="11.2" r="0.78" fill="#241608" /><circle cx="13.9" cy="11.2" r="0.78" fill="#241608" />
            <ellipse cx="12" cy="13.1" rx="0.95" ry="0.68" fill="#33210f" />
            <path d="M12 13.8 V14.8 M12 14.8 Q11 15.3 10.3 14.8 M12 14.8 Q13 15.3 13.7 14.8" stroke="#33210f" strokeWidth="0.45" fill="none" strokeLinecap="round" />
            <path d="M18.6 4 l.55 1.5 1.5.55 -1.5.55 -.55 1.5 -.55-1.5 -1.5-.55 1.5-.55z" fill="#7fe0ff" />
          </svg>
        </button>
        {/* Google profil ikonu SADECE ANA SAYFADA; diğer pencerelerde O SAYFAYA AİT ikon */}
        {aktifKod === "home" ? (
          <div className="ana-profil" onClick={() => setProfilAcik((a) => !a)}>
            {googleFoto ? <img className="ana-profil-foto" src={googleFoto} alt="" referrerPolicy="no-referrer" /> : harf}
          </div>
        ) : (
          <button className="ana-ara-btn" aria-label={aktifEt}>{SayfaIkon[aktifKod] || Ikon.ara}</button>
        )}
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
            <span className={"ana-nav-kutu" + (n.k === "profil" ? " yuv" : "")}>
              {n.k === "profil" && foto ? <img src={foto} alt="" referrerPolicy="no-referrer" /> : Ikon[n.k]}
              {/* Köşe rozeti: SADE mini gömülü taş — kendi renginde, içten yanar, tam köşede.
                  Profil taşı KİMLİĞE göre: profesyonel=KIRMIZI, müşteri=BEYAZ (beyaz müşteri taşıdır) */}
              <span className="ana-nav-rozet"><MiniTas renk={n.k === "profil" ? (pro ? "kirmizi" : "beyaz") : (NAV_RENK[n.k] || "mavi")} /></span>
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
            const proRenk = p.tip === "profesyonel" ? "kirmizi" : "beyaz";
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
                  <div className="ara-detay-ad notranslate" translate="no">{ad} <span className="ara-detay-rozet"><Elmas4 c={p.tip === "profesyonel" ? "#e0202c" : "#cfe8ff"} /></span></div>
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
                    <textarea className="adm-yaz" value={mesajYazi} onChange={(e) => { setMesajYazi(e.target.value); setMesajDurum(""); }} placeholder={t("araMesajYaz", "Mesajını yaz…")} maxLength={1000} />
                    <button className="adm-gonder" onClick={mesajGonderEt} disabled={mesajDurum === "gonderiliyor" || !mesajYazi.trim()}>
                      {mesajDurum === "gonderiliyor" ? t("araMesajGonderiliyor", "Gönderiliyor…") : t("araMesajGonder", "Mesaj Gönder")}
                    </button>
                    {mesajDurum === "ok" && <div className="adm-durum ok">{t("araMesajOk", "Mesajın gönderildi ✓")}</div>}
                    {mesajDurum === "hata" && <div className="adm-durum hata">{t("araMesajHata", "Gönderilemedi, tekrar dene")}</div>}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* AKIŞ (feed) — aşağı indikçe dünyadan yeni paylaşımlar */}
          <div className="ana-akis">
            {/* PAYLAŞ kutusu — kendi gönderini ekle (gerçek veri) */}
            <button className="ana-paylas-ac" onClick={() => { setDuzenlenen(null); setPaylasYazi(""); setPaylasTur(""); setPaylasGorsel(""); setPaylasVideo(""); setPaylasDurum(""); setPaylasAvatar("profil"); setUstYazi(""); setUstRenk("#ffffff"); setUstBoyut("orta"); setUstYer("alt"); setAiOneriler([]); setPaylasDuzen(null); setPaylasZemin(""); setPaylasYaziRenk(""); setPaylasAcik(true); }}>
              <span className="ana-paylas-art" aria-hidden="true">+</span>{t("paylasAc", "Bir şeyler paylaş…")}
            </button>
            {/* AKIŞ FİLTRESİ — Hepsi / Takip Ettiklerim (kişiselleşmiş akış) */}
            <div className="ana-feed-filtre">
              <button className={"aff-chip" + (feedFiltre === "hepsi" ? " aktif" : "")} onClick={() => setFeedFiltre("hepsi")}>{t("feedHepsi", "Hepsi")}</button>
              <button className={"aff-chip" + (feedFiltre === "takip" ? " aktif" : "")} onClick={() => setFeedFiltre("takip")}>{t("feedTakip", "Takip Ettiklerim")}</button>
            </div>
            {/* GERÇEK gönderiler önce, sonra örnek akış (platform boş kalmasın) */}
            {feedFiltre === "takip" && gercekAkis.filter((p) => { const h = p.uid || p.sahipUid; return h && takipSet.has(h); }).length === 0 && (
              <div className="ana-feed-bos">{t("feedTakipBos", "Henüz kimseyi takip etmiyorsun. Gönderilerdeki + Takip düğmesine bas; burada onların paylaşımları görünür.")}</div>
            )}
            {(feedFiltre === "takip" ? gercekAkis.filter((p) => { const h = p.uid || p.sahipUid; return h && takipSet.has(h); }) : gercekAkis).map((p, i) => {
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
              // profesyonel = KIRMIZI pırlanta; kendi pro gönderim eski olsa da kırmızı görünsün
              const proPost = p.pro || (p.uid && u && p.uid === u.uid && proUye);
              const rozRenk = proPost ? "#e0202c" : "#cfe8ff";
              const meslekRenk = MESLEK_RENK[p.meslek] || "#FFD700"; // meslek kendi renginde
              const mesajAc = () => { if (p.uid && p.ad) setAraSecili({ uid: p.uid, isim: p.ad, pro: { meslek: p.meslek }, konum: { sehir: p.sehir, ulke: p.ulke }, isFoto: p.foto }); };
              const yazan = (
                <span className="apr-yazan apr-yazan-ust">
                  <span className={"apr-av uye-ac" + (p.amblem ? " amblem" : "")} style={{ background: p.renk || ("linear-gradient(145deg," + pc + ",#0d1b3a)") }} onClick={(e) => { e.stopPropagation(); uyeyiAc(p); }}>{p.foto ? <img src={p.foto} alt="" referrerPolicy="no-referrer" /> : bas}</span>
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
                return (
                  <article className={"ana-post ana-post-im " + (p.video ? "post-video" : "post-foto")} key={anahtar} style={{ "--pc": pc, "--sep": p.video ? "#e0202c" : "#0d0a05" }}>
                    {/* PROFİL/İSİM/MESLEK — fotoğrafın DIŞINDA, ÜSTTE ayrı şerit (ANA SAYFADA HEP AYRI — bozma) */}
                    {yazan}
                    <div className={"apr-medya" + (p.video ? " video" : "")} onClick={() => setTamFoto(p)}>
                      {p.video
                        ? <video src={p.video} preload="metadata" muted loop playsInline tabIndex={-1} />
                        : <img src={p.gorsel} alt="" referrerPolicy="no-referrer" onLoad={(e) => { if (e.target.naturalHeight > e.target.naturalWidth * 1.04) e.target.parentNode.classList.add("uzun"); else e.target.parentNode.classList.remove("uzun"); }} />}
                      {/* TÜR ikonu (apr-tipikon) KALDIRILDI — kategori artık üst şeritteki rozette (tek gösterge). */}
                      {p.ustYazi && p.ustYazi.metin && <span className={"apr-ustyazi yer-" + (p.ustYazi.yer || "alt") + " boy-" + (p.ustYazi.boyut || "orta")} style={{ color: p.ustYazi.renk || "#fff" }}>{p.ustYazi.metin}</span>}
                      {p.yazi && (
                        <div className="apr-alt" onClick={(e) => e.stopPropagation()}>
                          <div translate="no" className={"apr-altyazi notranslate" + (uzun ? " kisa" : "")} onClick={() => uzun && setTamFoto(p)}>{(ceviri[anahtar] && ceviri[anahtar].acik && ceviri[anahtar].metin) ? ceviri[anahtar].metin : p.yazi}{uzun && <span className="ana-post-devam">{t("devamOku", " …devamını oku")}</span>}</div>
                          <span className="apr-alt-arac">
                            <button className="apr-cevir" onClick={(e) => { e.stopPropagation(); cevirToggle(p, anahtar); }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" /></svg>
                              {ceviri[anahtar] && ceviri[anahtar].yuk ? t("ceviriliyor", "Çevriliyor…") : (ceviri[anahtar] && ceviri[anahtar].acik ? t("orijinalGoster", "Orijinal") : t("cevir", "Çevir"))}
                            </button>
                            <button className="apr-cevir apr-ai" onClick={(e) => { e.stopPropagation(); yaziAISor(p); }} aria-label={t("yaziAiSor", "GLOXORG'a sor")}><span className="apr-ai-tas" aria-hidden="true"><Elmas4 c="#FFD700" /></span>{t("aiSor", "Sor")}</button>
                          </span>
                        </div>
                      )}
                      {/* Tür amblemi artık YAZARIN yanında (isim hizasında) — sağ raile binmiyor */}
                      {/* Sağ-ALT: GLOXORG amblemi (şeffaf) */}
                      <span className="ana-post-medya-rozet notranslate" translate="no"><Elmas4 c="#ffd700" /> GLOXORG</span>
                    </div>
                    {/* İKON ŞERİDİ — fotoğrafın/videonun ALTINDA, AYRI şerit (medyanın üzerinde DEĞİL) */}
                    <div className={"apr-rail" + (p.video ? " video" : "")} onClick={(e) => e.stopPropagation()}>
                      <button className={"apr-ic ape-kalp" + (begeniSet.has(p.id) ? " dolu" : "") + (kalpPatla === p.id ? " patla" : "")} onClick={() => begeniTik(p)} onPointerDown={() => begeniBas(p)} onPointerUp={begeniBirak} onPointerLeave={begeniBirak} onPointerCancel={begeniBirak}>{Ikon.kalp}{kalpPatla === p.id && <span className="kalp-patla" aria-hidden="true"><i/><i/><i/><i/><i/></span>}<span className="apr-sayi">{(p.begeni || 0).toLocaleString()}</span></button>
                      <button className="apr-ic ape-yorum" onClick={() => yorumAc(p)}>{Ikon.yorum}<span>{p.yorumSayisi ? p.yorumSayisi : ""}</span></button>
                      <button className="apr-ic ape-paylas" onClick={() => paylasNative(p)}>{Ikon.paylas}</button>
                      <button className={"apr-ic apr-kaydet" + (kaydetSet.has(p.id) ? " dolu" : "")} onClick={() => kaydetToggle(p)}>{Ikon.kaydet}</button>
                      <button className="apr-ic ape-mesaj" onClick={mesajAc}>{Ikon.mesaj}</button>
                    </div>
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
                      {p.foto ? <img className="ana-post-avatar-img" src={p.foto} alt="" referrerPolicy="no-referrer" /> : (p.h || bas)}
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
                  {p.yazi && (
                    /* UZUN yazıya basınca AYRI pencerede (tam ekran okuyucu) açılır — ana sayfada dev metin olarak açılıp kalmaz (✕ ile kapanır) */
                    <div ref={kesikOlc(anahtar)} translate="no" className="ana-post-yazi notranslate buyuk kisa" style={(() => { const _n = (p.yazi || "").length; const fs = _n > 1400 ? 11.5 : _n > 900 ? 12 : _n > 600 ? 12.5 : _n > 320 ? 13 : 13.5; return { background: icZemin, color: p.yaziRenk || "#fff", fontSize: fs + "px", lineHeight: 1.36 }; })()} onClick={() => setTamFoto(p)}>
                      {(ceviri[anahtar] && ceviri[anahtar].acik && ceviri[anahtar].metin) ? ceviri[anahtar].metin : p.yazi}
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
                  <div className="ana-post-eylem">
                    <button className={"ana-post-btn ape-kalp" + (begeniSet.has(p.id) ? " dolu" : "") + (kalpPatla === p.id ? " patla" : "")} onClick={() => begeniTik(p)} onPointerDown={() => begeniBas(p)} onPointerUp={begeniBirak} onPointerLeave={begeniBirak} onPointerCancel={begeniBirak}>{Ikon.kalp}{kalpPatla === p.id && <span className="kalp-patla" aria-hidden="true"><i/><i/><i/><i/><i/></span>}<span>{(p.begeni || 0).toLocaleString()}</span></button>
                    <button className="ana-post-btn ape-yorum" onClick={() => yorumAc(p)}>{Ikon.yorum}<span>{p.yorumSayisi ? p.yorumSayisi : ""}</span></button>
                    <button className="ana-post-btn ape-paylas" onClick={() => paylasNative(p)}>{Ikon.paylas}<span></span></button>
                    <button className={"ana-post-btn apr-kaydet" + (kaydetSet.has(p.id) ? " dolu" : "")} onClick={() => kaydetToggle(p)}>{Ikon.kaydet}</button>
                    <button className="ana-post-btn ape-mesaj" onClick={mesajAc}>{Ikon.mesaj}</button>
                  </div>
                </article>
              );
            })}
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
                    <span className="apf-pro-tas"><MiniTas renk={proUye ? "kirmizi" : "beyaz"} /></span>
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
                <button className="ana-paylas-ac apf-paylas-ac" onClick={() => { setDuzenlenen(null); setPaylasYazi(""); setPaylasTur(""); setPaylasGorsel(""); setPaylasVideo(""); setPaylasDurum(""); setPaylasAvatar("profil"); setUstYazi(""); setUstRenk("#ffffff"); setUstBoyut("orta"); setUstYer("alt"); setAiOneriler([]); setPaylasDuzen(null); setPaylasZemin(""); setPaylasYaziRenk(""); setPaylasAcik(true); }}>
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
                              ? <span className="apf-pay-foto apf-pay-vid" onClick={() => setTamFoto(g)}><video src={g.video} preload="metadata" muted playsInline tabIndex={-1} /><span className="apf-pay-oynat" aria-hidden="true"><GercekPirlanta cerceve={false} c="#e0202c" /></span></span>
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

      {/* MESAJ PENCERESİ (gelen kutusu) — alt menü Mesaj'a basınca */}
      {mesajAcik && (
        <div className="msj-fon" onClick={(e) => { if (e.target === e.currentTarget) setMesajAcik(false); }}>
          <div className="msj-pencere">
            <div className="msj-bas">
              <span className="msj-baslik">{t("tabMesaj", "Mesajlar")}</span>
              <button className="msj-kapat" onClick={() => setMesajAcik(false)} aria-label="Kapat">✕</button>
            </div>
            <div className="msj-liste">
              {mesajlar === null ? (
                <div className="msj-bos">{t("araYukleniyor", "Yükleniyor…")}</div>
              ) : mesajlar.length === 0 ? (
                <div className="msj-bos">{t("mesajYok", "Henüz mesajın yok. Birine Ara'dan ulaşıp mesaj gönderebilirsin.")}</div>
              ) : mesajlar.map((m) => {
                const g = m.gonderenAd || "—"; const bas = (g.trim()[0] || "?").toUpperCase();
                const ne = m.zamanMs ? new Date(m.zamanMs).toLocaleString(dil || "tr", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
                return (
                  <button className="msj-kart" key={m.id} onClick={() => { setMesajAcik(false); setAraSecili({ uid: m.gonderenUid, isim: m.gonderenAd, isFoto: m.gonderenFoto, pro: {}, konum: {} }); }}>
                    <span className="msj-foto">{m.gonderenFoto ? <img src={m.gonderenFoto} alt="" referrerPolicy="no-referrer" /> : bas}</span>
                    <div className="msj-icerik">
                      <div className="msj-ust"><b className="notranslate" translate="no">{g}</b><i>{ne}</i></div>
                      <div className="msj-metin">{m.metin}</div>
                      <div className="msj-yanitla">↩ {t("mesajYanitla", "Yanıtla")}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PAYLAŞ PENCERESİ — yeni gönderi */}
      {paylasAcik && (
        <div className="msj-fon" onClick={(e) => { if (e.target === e.currentTarget) setPaylasAcik(false); }}>
          <div className="msj-pencere paylas" onPointerDown={klavyeKapatDokun}>
            <div className="msj-bas">
              <span className="msj-baslik">{duzenlenen ? t("paylasDuzenle", "Paylaşımı Düzenle") : t("paylasBaslik", "Paylaş")}</span>
              <button className="msj-kapat" onClick={() => { setPaylasAcik(false); setDuzenlenen(null); setPaylasGorsel(""); setPaylasVideo(""); setPaylasDurum(""); }} aria-label="Kapat">✕</button>
            </div>
            <div className="pyl-ust">
              <span className={"pyl-avatar" + (paylasAvatar === "amblem" && isFoto ? " amblem" : "")}>
                {paylasAvatar === "amblem" && isFoto ? <img src={isFoto} alt="" referrerPolicy="no-referrer" />
                  : foto ? <img src={foto} alt="" referrerPolicy="no-referrer" />
                  : ((adTam && adTam.trim()[0]) || "?").toUpperCase()}
              </span>
              <textarea className="pyl-yaz" value={paylasYazi} onChange={(e) => { setPaylasYazi(e.target.value); setPaylasDurum(""); }} placeholder={t("paylasYaz2", "Ne paylaşmak istersin? (uzun yazı serbest)")} maxLength={20000}
                style={(!paylasGorsel && !paylasVideo && (paylasZemin || paylasYaziRenk)) ? { background: paylasZemin || undefined, color: paylasYaziRenk || undefined, borderColor: "transparent" } : undefined} />
            </div>
            {/* ✨ YAPAY ZEKA — yazı önerisi */}
            <div className="pyl-ai">
              <button className="pyl-ai-btn" onClick={aiYaziOner} disabled={aiYukleniyor}><span className="pyl-ai-pir" aria-hidden="true"><Elmas4 c="#7fe0ff" /></span>{aiYukleniyor ? t("aiDusunuyor", "Yapay zeka düşünüyor…") : t("aiOner", "Yapay zeka ile yazı öner")}</button>
              {aiOneriler.length > 0 && (
                <div className="pyl-ai-liste">
                  {aiOneriler.map((o, k) => (
                    <button key={k} className="pyl-ai-oneri" onClick={() => { setPaylasYazi(o); setAiOneriler([]); }}>{o}</button>
                  ))}
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
            {paylasGorsel && (
              <div className="pyl-gorsel">
                <img src={paylasGorsel} alt="" />
                {ustYazi.trim() && <span className={"pyl-ustyazi yer-" + ustYer + " boy-" + ustBoyut} style={{ color: ustRenk }}>{ustYazi}</span>}
                <button className="pyl-gorsel-sil" onClick={() => setPaylasGorsel("")} aria-label="Kaldır">✕</button>
              </div>
            )}
            {paylasVideo && (
              <div className="pyl-gorsel">
                <video src={paylasVideo} controls playsInline style={{ width: "100%", maxHeight: "240px", display: "block" }} />
                {ustYazi.trim() && <span className={"pyl-ustyazi yer-" + ustYer + " boy-" + ustBoyut} style={{ color: ustRenk }}>{ustYazi}</span>}
                <button className="pyl-gorsel-sil" onClick={() => { setPaylasVideo(""); setPaylasVideoFile(null); setPaylasYukleme(0); }} aria-label="Kaldır">✕</button>
              </div>
            )}
            {/* FOTOĞRAF EDİTÖRÜ — üzerine fotoğraf+yazı ekle, parmakla taşı (çok katmanlı) */}
            {paylasGorsel && (
              <button className="pyl-editor-ac" onClick={paylasEditorAc}>
                <span className="pyl-editor-pir" aria-hidden="true"><Elmas4 c="#FFD700" /></span>
                {t("fotoDuzenle", "Düzenle: üzerine yazı & fotoğraf ekle, parmakla taşı")}
              </button>
            )}
            <input ref={paylasFotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={paylasFotoSec} />
            <input ref={paylasVideoRef} type="file" accept="video/*" style={{ display: "none" }} onChange={paylasVideoSec} />
            {paylasDurum === "buyuk" && <div className="adm-durum hata">{t("paylasVideoBuyuk3", "Bu video çok büyük (en fazla 80 MB). Daha kısa bir video seç.")}</div>}
            {paylasDurum === "video" && <div className="adm-durum">{t("paylasVideoYuk", "Video yükleniyor…")} %{paylasYukleme}</div>}
            {paylasDurum === "videohata" && <div className="adm-durum hata">{t("paylasVideoHata2", "Video yüklenemedi, tekrar dene (internet/dosya boyutu).")}</div>}
            <div className="pyl-secenek">
              {PAYLAS_TURLER.map((s) => (
                <button key={s.ad} className={"pyl-chip" + (((s.foto && paylasGorsel) || (s.video && (paylasVideo || paylasVideoFile)) || (!s.foto && !s.video && paylasTur === s.ad)) ? " secili" : "")} style={{ "--c": s.renk }}
                  onClick={() => {
                    if (s.foto) { if (paylasFotoRef.current) paylasFotoRef.current.click(); }       /* FOTOĞRAF/VİDEO sadece medya EKLER, türü DEĞİŞTİRMEZ (Etkinlik vb. korunur) */
                    else if (s.video) { if (paylasVideoRef.current) paylasVideoRef.current.click(); }
                    else { setPaylasTur(s.ad); }                                                    /* diğerleri TÜRÜ seçer */
                  }}>
                  <span className="pyl-ik" style={{ color: s.renk }} aria-hidden="true"><TurAmblem tip={s.tip} /></span>{t(s.cev, s.ad)}
                </button>
              ))}
            </div>
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
            <button className="paylas-gonder" onClick={paylasGonder} disabled={paylasDurum === "gonderiliyor" || paylasDurum === "video" || (!paylasYazi.trim() && !paylasGorsel && !paylasVideoFile)}>
              {paylasDurum === "video" ? (t("paylasVideoYuk", "Video yükleniyor…") + " %" + paylasYukleme) : paylasDurum === "gonderiliyor" ? t("araMesajGonderiliyor", "Gönderiliyor…") : (paylasDurum === "ok" ? t("paylasOk", "Paylaşıldı ✓") : t("paylasEt", "Paylaş"))}
            </button>
            {paylasDurum === "hata" && <div className="adm-durum hata">{t("araMesajHata", "Gönderilemedi, tekrar dene")}</div>}
          </div>
        </div>
      )}

      {/* PAYLAŞIM FOTOĞRAF EDİTÖRÜ — çok katmanlı (foto+yazı, parmakla taşı); profil editöründen AYRI render (kilitliye dokunulmadı) */}
      {duzenAcik && duzenHedef === "paylas" && (
        <div className="apf-panel-fon paylas-editor-fon">
          <div className="ana-pencere apf-pencere paylas-editor-pencere">
            <input ref={editorFotoInputRef} type="file" accept="image/*" onChange={editorFotoEkle} style={{ display: "none" }} />
            <div className="apf-duzen">
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
                    <button key={o.id} className="arsiv-kart" style={{ "--gr": renk }} onClick={() => oturumYukle(o)}>
                      <span className="arsiv-kart-nokta" style={{ background: renk }} />
                      <span className="arsiv-kart-ic">
                        <b style={{ color: renk }}>{o.baslik}</b>
                        <i>{d.toLocaleDateString(dil || "tr", { day: "numeric", month: "long", year: "numeric" })} · {(o.mesajlar || []).length} mesaj{o.mod === "site" ? " · site" : ""}</i>
                      </span>
                      <svg className="arsiv-kart-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>
                    </button>
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
        const tfProPost = p.pro || (p.uid && u && p.uid === u.uid && proUye); // profesyonel = KIRMIZI pırlanta
        const tfRoz = tfProPost ? "#e0202c" : "#cfe8ff";
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
          <div className={"tamfoto-fon" + (metinPost ? " tf-metin-fon" : "") + (p.video ? " tf-video-fon" : "")} style={metinPost && p.zemin ? { background: p.zemin } : undefined} onClick={() => setTamFoto("")}>
            {/* TAM AÇILIŞ = ORİJİNAL: video ise kontrollü oynat; fotoğraf ise galeri gibi tam + parmakla zoom */}
            {p.video
              ? <div className="tf-vid-sar" onClick={(e) => e.stopPropagation()}>
                  <video ref={tamVideoRef} className="tamfoto-video" src={p.video} autoPlay muted playsInline preload="auto"
                    poster={p.video && /\.(mp4|webm|mov|m4v)$/i.test(p.video) ? p.video.replace(/\.(mp4|webm|mov|m4v)$/i, ".jpg") : undefined}
                    onClick={vidTikla}
                    onTimeUpdate={(e) => setVidT(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => setVidSure(e.currentTarget.duration || 0)}
                    onPlay={() => setVidOyn(true)} onPause={() => setVidOyn(false)} />
                  {!vidOyn && (
                    <button className="tf-vid-buyuk" onClick={vidTikla} aria-label="Oynat"><GercekPirlanta cerceve={false} c={tfRoz} /></button>
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
              <span className={"tf-avatar uye-ac" + (p.amblem ? " amblem" : "")} onClick={(e) => { e.stopPropagation(); uyeyiAc(p); }}>{p.foto ? <img src={p.foto} alt="" referrerPolicy="no-referrer" /> : bas}</span>
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
                  <div translate="no" className="tf-yazi notranslate">{tfMetin}</div>
                  {tfCevBtn}
                </div>
              )}
              {/* OYNATMA / SEEK çubuğu (video) */}
              {tfVidBar}
              {/* İKON ŞERİDİ (kalp/yorum/paylaş/kaydet/mesaj) — en altta */}
              <div className="tf-rail" onClick={(e) => e.stopPropagation()}>
                <button className={"tf-ic ape-kalp" + (begeniSet.has(p.id) ? " dolu" : "") + (kalpPatla === p.id ? " patla" : "")} onClick={() => begeniTik(p)} onPointerDown={() => begeniBas(p)} onPointerUp={begeniBirak} onPointerLeave={begeniBirak} onPointerCancel={begeniBirak}>{Ikon.kalp}{kalpPatla === p.id && <span className="kalp-patla" aria-hidden="true"><i/><i/><i/><i/><i/></span>}<span className="tf-sayi">{(p.begeni || 0).toLocaleString()}</span></button>
                <button className="tf-ic ape-yorum" onClick={() => yorumAc(p)}>{Ikon.yorum}</button>
                <button className="tf-ic ape-paylas" onClick={() => paylasNative(p)}>{Ikon.paylas}</button>
                <button className={"tf-ic tf-kaydet" + (kaydetSet.has(p.id) ? " dolu" : "")} onClick={() => kaydetToggle(p)}>{Ikon.kaydet}</button>
                <button className="tf-ic ape-mesaj" onClick={() => { setTamFoto(""); if (p.uid && p.ad) setAraSecili({ uid: p.uid, isim: p.ad, pro: { meslek: p.meslek }, konum: { sehir: p.sehir, ulke: p.ulke }, isFoto: p.foto }); }}>{Ikon.mesaj}</button>
              </div>
            </div>
            {/* SAĞ-ALT — GLOXORG amblemi (şeffaf) — dip'in ÜSTÜNDE */}
            <span className="tf-amblem notranslate" translate="no"><Elmas4 c="#ffd700" /> GLOXORG</span>
          </div>
        );
      })()}

      {/* ÜYE SAYFASI — başka birinin paylaşımları (profilden bağımsız, kendi sayfası).
          Avatara basınca / tam ekranda sola çekince açılır. Tür bölümleri + üst başlık + takip. */}
      {uyeSayfa && (() => {
        const us = uyeSayfa;
        const harf = (String(us.ad || "?").trim()[0] || "?").toUpperCase();
        const rozRenk = us.pro ? "#e0202c" : "#cfe8ff";
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
                              ? <span className="apf-pay-foto apf-pay-vid" onClick={ac}><video src={g.video} preload="metadata" muted playsInline tabIndex={-1} /><span className="apf-pay-oynat" aria-hidden="true"><GercekPirlanta cerceve={false} c="#e0202c" /></span></span>
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
        <button ref={balonRef} className={"ai-balon" + (tamFoto ? " ust" : "") + (aiKonusuyor ? " konusuyor" : "") + (maskotKizgin ? " kizgin" : "")} style={balonYer ? { left: balonYer.x, top: balonYer.y, right: "auto", bottom: "auto" } : undefined}
          onPointerDown={balonBas} onPointerMove={balonGit} onPointerUp={balonBitir} onPointerCancel={balonBitir} onClick={balonTik}
          aria-label={t("yardimciAc", "GLOXORG Yardımcısı")}>
          {/* MASKOT — her yerde gezen GLOXORG karakteri (konuşurken şişer/canlanır) */}
          <MaskotYuz konusuyor={aiKonusuyor} tur="grox" boyut={52} />
        </button>
      )}
      {/* MASKOT DOKUNUNCA: BÜYÜK halde konuşur (ağzı oynar), bitince KÖŞESİNE çekilir (panel AÇMAZ). Dokun=sus. "Yaz" = sohbet paneli. */}
      {maskotTanit && !uyeSayfa && (
        <div className={"maskot-tanit" + (maskotKizgin ? " kizgin" : "")} onClick={maskotTanitGec}>
          {maskotMetni && <div className="maskot-tanit-balon" ref={maskotBalonRef} onClick={(e) => e.stopPropagation()}>{renkliCumleler(maskotMetni, RC_KOYU)}</div>}
          <div className="maskot-tanit-yuz"><MaskotYuz konusuyor={aiKonusuyor} tur={maskotTur} boyut={160} /></div>
          {dinliyor ? <div className="maskot-tanit-dinle"><span className="mtd-nokta" /><span className="mtd-nokta" /><span className="mtd-nokta" /> {t("maskotDinliyor", "Seni dinliyorum — buyur, söyle")}</div>
            : (canliSohbet && !aiKonusuyor && !yardimciYukleniyor) ? <div className="maskot-tanit-dinle bekle">⏳ {t("maskotBekle", "Seni bekliyorum, ne dersen söyle")}</div> : null}
          <div className="maskot-tanit-dugmeler">
            <button className="maskot-tanit-btn yaz" onClick={(e) => { e.stopPropagation(); maskotSohbetAc(); }}>✍️ {t("yaz", "Yaz")}</button>
            <button className="maskot-tanit-btn kapat" onClick={(e) => { e.stopPropagation(); maskotTanitGec(); }}>✕ {t("kapat", "Kapat")}</button>
          </div>
        </div>
      )}
      {/* MASKOT KARŞILAMA BALONU — yeni üye ilk girişte (ana sayfada) bir kez; dokununca asistan açılır, X ile susar/yerine çekilir */}
      {maskotSelam && aktifKod === "home" && !tamFoto && !uyeSayfa && !paylasAcik && !duzenAcik && !yardimciAcik && (
        <div className="ai-maskot-selam" onClick={() => { maskotSelamKapat(); setYardimciMod("sohbet"); setYardimciAcik(true); }}>
          <button className="ai-maskot-kapat" onClick={(e) => { e.stopPropagation(); maskotSelamKapat(); }} aria-label={t("kapat", "Kapat")}>×</button>
          <div className="ai-maskot-metin">
            <b>{t("maskotSelamBas", "Hoş geldin")}{adTam ? " " + adTam.split(" ")[0] : ""}! 👋</b>
            {renkliCumleler(t("maskotSelamGovde", " Ben Gloxoo, Gloxorg dünyasının akıllı kalbi 💎 — paylaşım yazar, yol tarifi veririm, her sayfada yanındayım. Üstteki 🐻 Ekspert de bulunduğun sayfanın uzmanı. Bana dokun, konuşalım!"), RC_KOYU)}
          </div>
        </div>
      )}
      {yardimciAcik && (
        <div className="ai-fon" onClick={(e) => { if (e.target === e.currentTarget) setYardimciAcik(false); }}>
          <div className={"ai-pencere " + (proUye ? "ai-tema-pro" : "ai-tema-musteri")}>
            <div className="ai-bas">
              <span className="ai-bas-ad"><MaskotYuz konusuyor={aiKonusuyor} tur={yardimciMod === "site" ? "ekspert" : "grox"} boyut={32} />{yardimciMod === "site" ? t("siteAsistan", "Site Asistanı") : t("yardimciBaslik", "GLOXORG Yardımcısı")}</span>
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
                <button className={"ai-ses ai-canli" + (canliSohbet ? " aktif" : "")} onClick={canliSohbetToggle} aria-label={t("canliSohbet", "Canlı Sohbet")}>
                  {canliSohbet
                    ? <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10v4M8 6v12M12 3v18M16 6v12M20 10v4"/></svg>}
                </button>
                {/* HOPARLÖR — sesli yanıtı aç/kapa (açıkken AI cevapları sesli okunur) */}
                <button className={"ai-ses ai-hoparlor" + (sesliMod ? " acik" : "")} onClick={sesliModToggle} aria-label={t("sesliYanit", "Sesli yanıt")}>
                  {sesliMod
                    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4zM16 9a3 3 0 0 1 0 6M18.5 7a6 6 0 0 1 0 10"/></svg>
                    : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9H4zM22 9l-5 6M17 9l5 6"/></svg>}
                </button>
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
        <button className="ana-tab-oge" onClick={() => setAktifKod("konum")}>{Ikon.konum}<span>{t("navKonum")}</span></button>
        <button className="ana-tab-oge" onClick={() => setMesajAcik(true)}>{Ikon.mesaj}<span>{t("tabMesaj")}</span></button>
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
            <button className="ana-menu-oge c-mavi" onClick={() => setMenuAcik(false)}><span className="ana-menu-ik">🏠</span>{t("navAnaSayfa")}</button>
            <button className="ana-menu-oge c-yesil" onClick={() => setMenuAcik(false)}><span className="ana-menu-ik">🌍</span>{t("navTopluluk")} · {t("anaYakinda")}</button>
            <button className="ana-menu-oge c-mor" onClick={() => setMenuAcik(false)}><span className="ana-menu-ik">🎓</span>{t("navAkademi")} · {t("anaYakinda")}</button>
            <button className="ana-menu-oge c-kirmizi" onClick={() => { setMenuAcik(false); navigate("/profesyonel"); }}><span className="ana-menu-ik">💎</span>{t("anaProMisin")}</button>
            <button className="ana-menu-oge c-turuncu" onClick={() => { setMenuAcik(false); setAyarlarAcik(true); }}><span className="ana-menu-ik">⚙️</span>{t("menuAyarlar", "Ayarlar")}</button>
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
                  <label className="ayar-et">{t("ayar2Eposta", "2. e-posta (iletişim)")} <BilgiBtn metin={t("aciklama2Eposta", "Bu, İSTEĞE BAĞLI ikinci bir İLETİŞİM e-postasıdır — müşteriler sana ulaşsın diye profiline eklenir. Giriş/şifre kurtarma e-postan DEĞİLDİR (o, hesabını açtığın ana e-postandır). Boş bırakabilirsin; istersen ikinci bir e-posta yazıp Kaydet'e bas.")} onAc={setAciklama} /></label>
                  <input className="ayar-input" type="email" value={ek2Eposta} onChange={(e) => setEk2Eposta(e.target.value)} placeholder={t("epostaOrnek", "ornek@gloxorg.com")} />
                  <label className="ayar-et">{t("ayarTelefon", "Telefon")} <BilgiBtn metin={t("aciklamaTelKod", "Ülke kodunu 3 yolla ayarlayabilirsin: (1) soldaki kutuya kendin yaz (örn +90), (2) ülke adı yazınca kod gelir, (3) 'Konumumdan otomatik al' bulunduğun ülkenin kodunu koyar, ya da haritadan ülkene dokun. Sonra numaranı yaz ve Kaydet.")} onAc={setAciklama} /></label>
                  <div className="ayar-tel-satir">
                    <input className="ayar-input ayar-telkod-input" type="text" value={telKodu} onChange={(e) => setTelKodu(e.target.value)} placeholder="+90" aria-label={t("ayarTelKodu", "Ülke kodu")} />
                    <input className="ayar-input ayar-tel-input" type="tel" value={ekTelefon} onChange={(e) => setEkTelefon(e.target.value)} placeholder={t("ayarTelPh", "Numara")} />
                  </div>
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
                          <button key={x} className={"ayar-anameslek-cip" + (x === ana ? " ana" : "")} onClick={() => ayarAnaMeslek(x)}>{x === ana ? "⭐ " : ""}{mc(x, dil)}</button>
                        ))}
                      </div>
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
                      <div className="abm-icerik"><div className="abm-metin">{bildirimMetni(b)}</div><i className="abm-zaman">{ne}</i></div>
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
