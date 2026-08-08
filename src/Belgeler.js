// GLOXORG MUHASEBE — BELGELER modülü: KENDİ Excel tablonu oluştur-doldur, Word belgesi yaz, KDV'li Fatura kes.
// Hepsi .xlsx / .docx(.doc) / PDF indirilir & paylaşılır, Firebase'de saklanır (⋮ menü + çöp kutusu ile silinir).
// Ağır kütüphaneler (xlsx/jspdf/html2canvas) SADECE indirirken dinamik yüklenir.
import { useState, useRef, useEffect } from "react";

const bugunStr = () => { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); };
const trTarih = (s) => { try { const [y, a, g] = (s || "").split("-"); return g ? `${g}.${a}.${y}` : (s || ""); } catch (e) { return s || ""; } };
const sayi = (n) => Number(String(n == null ? "" : n).replace(/\./g, "").replace(",", ".")) || 0;
const para2 = (n) => (Number(n) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dosyaAd = (ad, uz) => ("GLOXORG-" + (ad || "belge")).replace(/[^\wğüşıöçĞÜŞİÖÇ ]/gi, "").replace(/\s+/g, "-").slice(0, 40) + "." + uz;

// ---- ortak: bir HTML öğesini PDF yap (Türkçe doğru çıkar) ve indir/paylaş
async function elemPdf(el, ad) {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
  const img = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
  const kenar = 24, iw = pw - kenar * 2, ih = canvas.height * iw / canvas.width;
  if (ih <= ph - kenar * 2) pdf.addImage(img, "PNG", kenar, kenar, iw, ih);
  else { let hLeft = ih, pos = kenar; pdf.addImage(img, "PNG", kenar, pos, iw, ih); hLeft -= (ph - kenar * 2);
    while (hLeft > 0) { pos -= (ph - kenar * 2); pdf.addPage(); pdf.addImage(img, "PNG", kenar, pos, iw, ih); hLeft -= (ph - kenar * 2); } }
  const blob = pdf.output("blob"); const dosya = new File([blob], dosyaAd(ad, "pdf"), { type: "application/pdf" });
  if (navigator.canShare && navigator.canShare({ files: [dosya] })) { try { await navigator.share({ files: [dosya], title: "GLOXORG" }); return; } catch (e) {} }
  pdf.save(dosyaAd(ad, "pdf"));
}
// ---- YAZDIR (printer): ANA SAYFAYI yazdırır (Android yazıcı servisi bunu RICOH vb. yazıcılara sorunsuz gönderir).
// ⛔ ESKİ HATA: açılır-pencere / gizli iframe (about:blank) içeriğini Android yazıcı servisi BASAMIYOR →
//   "Bu yazı şu anda kullanılamıyor" çıkıyordu. ÇÖZÜM: sayfanın NET resmini (html2canvas, PDF ile aynı) alıp
//   ana sayfaya gizli bir "yazdır alanı"na koyarız; @media print ile SADECE o resim basılır (gerisi gizlenir),
//   sonra window.print() ana pencerede çağrılır → gerçek yazıcıya bağlanır, dolu ve doğru çıkar.
async function yazdirElem(el, baslik) {
  if (!el) return;
  try {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    const img = canvas.toDataURL("image/png");
    let stil = document.getElementById("gw-yazdir-stil");
    if (!stil) {
      stil = document.createElement("style"); stil.id = "gw-yazdir-stil";
      // Ekranda GİZLİ; yazdırırken SADECE #gw-yazdir-alan görünür (diğer her şey gizli). ID+!important en üstte kalır.
      stil.textContent = "#gw-yazdir-alan{display:none}@media print{body>*{display:none !important}#gw-yazdir-alan{display:block !important;position:static !important}#gw-yazdir-alan img{width:100%;height:auto;display:block}@page{margin:10mm}}";
      document.head.appendChild(stil);
    }
    let alan = document.getElementById("gw-yazdir-alan");
    if (!alan) { alan = document.createElement("div"); alan.id = "gw-yazdir-alan"; document.body.appendChild(alan); }
    alan.innerHTML = "";
    const im = new Image(); im.src = img; im.alt = baslik || "GLOXORG"; alan.appendChild(im);
    const bas = () => { try { window.focus(); } catch (e) {} try { window.print(); } catch (e) {} };
    const temizle = () => { try { alan.innerHTML = ""; } catch (e) {} try { window.removeEventListener("afterprint", temizle); } catch (e) {} };
    try { window.addEventListener("afterprint", temizle); } catch (e) {}
    if (im.complete) setTimeout(bas, 150); else { im.onload = () => setTimeout(bas, 120); im.onerror = () => setTimeout(bas, 120); }
  } catch (e) {}
}
// ---- Word (.doc) indir: HTML'i Word'ün açtığı .doc olarak kaydet (Türkçe UTF-8 + BOM → harfler doğru)
function wordIndir(ad, htmlIc) {
  const html = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body>" + htmlIc + "</body></html>";
  const blob = new Blob(["﻿", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = dosyaAd(ad, "doc");
  document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 1500);
}
// ---- Excel (.xlsx) indir: 2B diziden
async function excelIndirAoa(ad, aoa) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const enUzun = aoa.reduce((m, r) => Math.max(m, r.length), 0);
  ws["!cols"] = Array.from({ length: enUzun }, () => ({ wch: 18 }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Sayfa1");
  XLSX.writeFile(wb, dosyaAd(ad, "xlsx"));
}

// Belge tarih arşiv grubu (Bugün / Bu Ay / Bu Yıl / Daha Eski)
function _arsivGrup(ms) {
  try { const d = new Date(ms || 0); const n = new Date();
    if (d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()) return "bugun";
    if (d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth()) return "buay";
    if (d.getFullYear() === n.getFullYear()) return "buyil";
  } catch (e) {}
  return "eski";
}

// ===================== BELGELER LİSTESİ + ARŞİV + YÖNLENDİRME =====================
export default function Belgeler({ t, uid, belgeler, ekle, guncelle, copeAt, UcNokta, bilgi, paraSym = "₺", benAd = "", onGloxordaPaylas, onBelgeKatman }) {
  const [acik, setAcik] = useState(null); // {mod, belge?, on?}
  const [sablonAcik, setSablonAcik] = useState(false);
  const [ara, setAra] = useState("");
  // GERİ TUŞU: bir editör/şablon penceresi açıkken Android geri → o pencereyi kapat, MUHASEBEDE KAL (ana sayfaya atma).
  // Muhasebe'ye "içeride pencere açık" haberini ver; kapatma işlevini de ver. Kapanınca haber sıfırlanır.
  useEffect(() => {
    if (!onBelgeKatman) return;
    const acikMi = !!(acik || sablonAcik);
    const kapat = () => { if (acik) setAcik(null); else if (sablonAcik) setSablonAcik(false); };
    onBelgeKatman(acikMi, acikMi ? kapat : null);
  }, [acik, sablonAcik]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (onBelgeKatman) onBelgeKatman(false, null); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const ikon = (bt) => bt === "tablo" ? "📊" : bt === "fatura" ? "🧾" : bt === "meslek" ? "🌐" : "📝";
  const turAd = (bt) => bt === "tablo" ? t("belTablo", "Excel tablosu") : bt === "fatura" ? t("belFatura", "Fatura") : bt === "meslek" ? t("belMeslek", "Meslek sayfası") : t("belYazi", "Word belgesi");

  if (acik) {
    const ortak = { t, paraSym, benAd, bilgi,
      onKapat: () => setAcik(null),
      onKaydet: async (veri) => { if (acik.belge) { await guncelle(acik.belge.id, veri); bilgi(t("belKaydedildi", "Kaydedildi ✓")); } else { const id = await ekle({ tip: "belge", ...veri }); if (id) { setAcik({ mod: acik.mod, belge: { id, ...veri } }); bilgi(t("belKaydedildi", "Kaydedildi ✓")); } } } };
    if (acik.mod === "tablo") return <TabloEditor {...ortak} belge={acik.belge} />;
    if (acik.mod === "fatura") return <FaturaEditor {...ortak} belge={acik.belge} />;
    if (acik.mod === "fotopdf") return <FotoPdfEditor {...ortak} />;
    if (acik.mod === "meslek") return <MeslekSayfa {...ortak} belge={acik.belge} onGloxordaPaylas={onGloxordaPaylas} />;
    return <YaziEditor {...ortak} belge={acik.belge} />;
  }
  if (sablonAcik) return <SablonSecici t={t} onKapat={() => setSablonAcik(false)} onSec={(s) => { setSablonAcik(false); setAcik({ mod: s.tur, belge: { belgeTuru: s.tur, ad: s.ad, grid: s.grid, html: s.html } }); }} />;

  // arama + arşiv gruplama
  const q = ara.trim().toLowerCase();
  const suzulmus = [...belgeler].filter((b) => !q || (b.ad || "").toLowerCase().includes(q)).sort((a, b) => (b.zamanMs || 0) - (a.zamanMs || 0));
  const gruplar = [["bugun", "📅 " + t("belBugun", "Bugün")], ["buay", "🗓️ " + t("belBuAy", "Bu Ay")], ["buyil", "📆 " + t("belBuYil", "Bu Yıl")], ["eski", "🗄️ " + t("belEski", "Daha Eski")]];

  return (<>
    <div className="muh-alt">{t("belAlt2", "Kendi Excel/Word/Fatura belgeni oluştur, foto→PDF yap, mesleğine göre hazır sayfa seç ya da kendi meslek sayfanı yapıp paylaş. Her şey arşivlenir, sen silmeden gitmez.")}</div>
    <div className="bel-yeni">
      <button className="bel-yeni-btn tablo" onClick={() => setAcik({ mod: "tablo" })}>📊<span>{t("belTablo", "Excel tablosu")}</span></button>
      <button className="bel-yeni-btn yazi" onClick={() => setAcik({ mod: "yazi" })}>📝<span>{t("belYazi", "Word belgesi")}</span></button>
      <button className="bel-yeni-btn fatura" onClick={() => setAcik({ mod: "fatura" })}>🧾<span>{t("belFatura", "Fatura")}</span></button>
      <button className="bel-yeni-btn fotopdf" onClick={() => setAcik({ mod: "fotopdf" })}>📷<span>{t("belFotoPdf", "Foto → PDF")}</span></button>
      <button className="bel-yeni-btn sablon" onClick={() => setSablonAcik(true)}>🧑‍🔧<span>{t("belSablon", "Hazır şablon")}</span></button>
      <button className="bel-yeni-btn meslek" onClick={() => setAcik({ mod: "meslek" })}>🌐<span>{t("belMeslekSayfam", "Meslek sayfam")}</span></button>
    </div>
    {belgeler.length > 4 && <input className="muh-inp bel-ara" value={ara} onChange={(e) => setAra(e.target.value)} placeholder={"🔍 " + t("belAraPh", "Belgelerinde ara")} />}
    {suzulmus.length === 0 ? <div className="muh-bos">💛 {q ? t("belAraBos", "Aramana uygun belge yok.") : t("belYok", "Henüz belge yok. Yukarıdan oluştur.")}</div>
      : gruplar.map(([gk, gad]) => {
        const grubun = suzulmus.filter((b) => _arsivGrup(b.zamanMs) === gk);
        if (!grubun.length) return null;
        return (<div key={gk} className="bel-arsiv-grup">
          <div className="bel-arsiv-bas">{gad} <span className="bel-arsiv-say">{grubun.length}</span></div>
          <div className="muh-kayit-liste">
            {grubun.map((b) => (
              <div key={b.id} className="muh-kayit" onClick={() => setAcik({ mod: b.belgeTuru || "yazi", belge: b })} style={{ cursor: "pointer" }}>
                <span className="muh-k-tarih">{ikon(b.belgeTuru)} {turAd(b.belgeTuru)}</span>
                <span className="muh-k-acik notranslate">{b.ad || t("belAdsiz", "Adsız belge")}</span>
                <UcNokta id={b.id} />
              </div>
            ))}
          </div>
        </div>);
      })}
  </>);
}

// ---- HESAP TABLOSU FORMÜL MOTORU: =A1+B1 (topla), =B1-C1 (kalan), =A2*B2 (çarp), =TOPLA(A1:A5) ----
function _colHarf(c) { let s = ""; c++; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; }
function _harfIdx(h) { let n = 0; for (const ch of String(h).toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64); return n - 1; }
function _trSayi(s) { const x = String(s == null ? "" : s).trim().replace(/\s/g, ""); if (x === "") return NaN; if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(x)) return parseFloat(x.replace(/\./g, "").replace(",", ".")); return parseFloat(x.replace(",", ".")); }
function _hesapHucre(grid, r, c, yol) {
  if (r < 0 || c < 0 || r >= grid.length || !grid[r] || c >= grid[r].length) return 0;
  const key = r + "," + c; if (yol.has(key)) return "#DÖNGÜ";
  const ham = String(grid[r][c] == null ? "" : grid[r][c]).trim();
  if (!ham.startsWith("=")) { const n = _trSayi(ham); return isNaN(n) ? ham : n; }
  yol.add(key); const v = _hesapIfade(grid, ham.slice(1), yol); yol.delete(key); return v;
}
function _refSayi(grid, ref, yol) { const m = String(ref).match(/^([A-Za-z]+)(\d+)$/); if (!m) return 0; const v = _hesapHucre(grid, parseInt(m[2], 10) - 1, _harfIdx(m[1]), yol); return typeof v === "number" ? v : (_trSayi(v) || 0); }
function _aralik(grid, arg, yol) {
  const m = String(arg).match(/^\s*([A-Za-z]+)(\d+)\s*:\s*([A-Za-z]+)(\d+)\s*$/);
  if (!m) return String(arg).split(",").reduce((s, x) => s + _refSayi(grid, x.trim(), yol), 0);
  const c1 = _harfIdx(m[1]), r1 = +m[2] - 1, c2 = _harfIdx(m[3]), r2 = +m[4] - 1; let s = 0;
  for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) s += _refSayi(grid, _colHarf(c) + (r + 1), yol);
  return s;
}
function _hesapIfade(grid, expr, yol) {
  try {
    let e = String(expr);
    e = e.replace(/(TOPLA|SUM)\s*\(([^()]*)\)/gi, (mm, fn, args) => _aralik(grid, args, yol));
    e = e.replace(/[A-Za-z]+\d+/g, (ref) => _refSayi(grid, ref, yol));
    if (!/^[-+*/().\s0-9]*$/.test(e)) return "#HATA";
    if (e.trim() === "") return 0;
    // eslint-disable-next-line no-new-func
    const r = Function('"use strict";return(' + e + ")")();
    return (typeof r === "number" && isFinite(r)) ? r : "#HATA";
  } catch (x) { return "#HATA"; }
}
function _goster(grid, r, c) { const v = _hesapHucre(grid, r, c, new Set()); return (typeof v === "number") ? v.toLocaleString("tr-TR", { maximumFractionDigits: 2 }) : v; }

// ===================== EXCEL TABLOSU EDİTÖRÜ (Yazı / Hesap düğmeli + genişlik) =====================
function TabloEditor({ t, belge, onKapat, onKaydet, bilgi }) {
  const bosGrid = () => Array.from({ length: 8 }, () => Array.from({ length: 4 }, () => ""));
  const [ad, setAd] = useState((belge && belge.ad) || "");
  const [grid, setGrid] = useState((belge && Array.isArray(belge.grid) && belge.grid.length) ? belge.grid.map((r) => [...r]) : bosGrid());
  const _sut = (belge && belge.grid && belge.grid[0]) ? belge.grid[0].length : 4;
  const [gen, setGen] = useState((belge && Array.isArray(belge.gen) && belge.gen.length === _sut) ? [...belge.gen] : Array.from({ length: _sut }, () => 96));
  const _satSay = (belge && belge.grid && belge.grid.length) ? belge.grid.length : 8;
  const [satirYuk, setSatirYuk] = useState((belge && Array.isArray(belge.satirYuk) && belge.satirYuk.length === _satSay) ? [...belge.satirYuk] : Array.from({ length: _satSay }, () => 40)); // satır yükseklikleri (yatay şerit)
  const [dikey, setDikey] = useState((belge && Array.isArray(belge.dikey) && belge.dikey.length === _sut) ? [...belge.dikey] : Array.from({ length: _sut }, () => false)); // sütun DİKEY yazı (aşağıdan yukarı) mı
  const [odak, setOdak] = useState(null);
  const [sira, setSira] = useState(null);
  const [mod, setMod] = useState("yazi"); // yazi (yazı/rakam gir) | hesap (düğmeyle hesapla)
  const [islem, setIslem] = useState(null); // "+" "-" "*" "/"
  const [secili, setSecili] = useState([]); // ["r,c"]
  const [sonucBekle, setSonucBekle] = useState(false);
  const [genMod, setGenMod] = useState(false); // sütun genişlik ayarı açık mı
  const yazdirRef = useRef(null);
  const sutunSay = grid[0] ? grid[0].length : 0;
  const hucre = (r, c, v) => setGrid((g) => g.map((row, i) => i === r ? row.map((x, j) => j === c ? v : x) : row));
  const satirEkle = () => { setGrid((g) => [...g, Array.from({ length: g[0] ? g[0].length : 4 }, () => "")]); setSatirYuk((h) => [...h, 40]); };
  const sutunEkle = () => { setGrid((g) => g.map((r) => [...r, ""])); setGen((w) => [...w, 96]); setDikey((d) => [...d, false]); };
  const satirSil = () => { setGrid((g) => g.length > 1 ? g.slice(0, -1) : g); setSatirYuk((h) => h.length > 1 ? h.slice(0, -1) : h); };
  const sutunSil = () => { setGrid((g) => (g[0] && g[0].length > 1) ? g.map((r) => r.slice(0, -1)) : g); setGen((w) => w.length > 1 ? w.slice(0, -1) : w); setDikey((d) => d.length > 1 ? d.slice(0, -1) : d); };
  const toplamSatir = () => { setGrid((g) => { const n = g.length; const cols = g[0] ? g[0].length : 0; return [...g, Array.from({ length: cols }, (_, c) => "=TOPLA(" + _colHarf(c) + "1:" + _colHarf(c) + n + ")")]; }); setSatirYuk((h) => [...h, 40]); };
  const sirala = (c) => { const yon = (sira && sira.c === c && sira.yon === "art") ? "azal" : "art"; setSira({ c, yon }); setGrid((g) => { const k = g.map((row) => [...row]); k.sort((a, b) => { const va = _hesapHucre([a], 0, c, new Set()), vb = _hesapHucre([b], 0, c, new Set()); const r = (typeof va === "number" && typeof vb === "number") ? (va - vb) : String(va).localeCompare(String(vb), "tr"); return yon === "art" ? r : -r; }); return k; }); };
  const genDegis = (c, d) => setGen((w) => w.map((x, i) => i === c ? Math.max(34, Math.min(300, (x || 96) + d)) : x)); // sütun genişliği: 34px'e kadar İNCE (A4'e sığsın)
  const satirDegis = (r, d) => setSatirYuk((h) => h.map((x, i) => i === r ? Math.max(26, Math.min(200, (x || 40) + d)) : x)); // satır yüksekliği ayarı (yatay şerit)
  const dikeyDegis = (c) => setDikey((w) => w.map((x, i) => i === c ? !x : x)); // sütunu dikey yazıya çevir/geri al
  const kaydet = () => onKaydet({ belgeTuru: "tablo", ad: ad.trim() || t("belAdsiz", "Adsız tablo"), grid, gen, satirYuk, dikey, zamanMs: Date.now() });

  // HESAP modu: işlem seç → hücrelere dokun (seçilir) → "＝ Sonuç" → boş hücreye dokun (formül yazılır, düğmeyle hesap)
  const hucreTikla = (r, c) => {
    const key = r + "," + c;
    if (sonucBekle) {
      const refs = secili.map((k) => { const [rr, cc] = k.split(",").map(Number); return _colHarf(cc) + (rr + 1); });
      if (refs.length < 2) { bilgi(t("belEnAz2", "En az 2 hücre seç")); return; }
      hucre(r, c, "=" + refs.join(islem)); setSecili([]); setSonucBekle(false); setIslem(null);
      bilgi(t("belHesaplandi", "Hesaplandı ✓ sonuç hücreye yazıldı"));
      return;
    }
    if (!islem) { bilgi(t("belOnceIslem", "Önce işlem seç: ＋ － × ÷")); return; }
    setSecili((s) => s.includes(key) ? s.filter((x) => x !== key) : [...s, key]);
  };
  const secRefler = secili.map((k) => { const [rr, cc] = k.split(",").map(Number); return _colHarf(cc) + (rr + 1); });
  const secOnizle = secRefler.join(" " + (islem === "*" ? "×" : islem === "/" ? "÷" : islem || "") + " ");
  const canli = (islem && secRefler.length >= 2) ? _hesapIfade(grid, secRefler.join(islem), new Set()) : null;
  const canliYazi = (typeof canli === "number") ? canli.toLocaleString("tr-TR", { maximumFractionDigits: 2 }) : (canli || "");
  const oplar = [["+", "➕ " + t("belTopla2", "Topla")], ["-", "➖ " + t("belCikar", "Çıkar")], ["*", "✖️ " + t("belCarp", "Çarp")], ["/", "➗ " + t("belBol", "Böl")]];

  return (
    <div className="bel-editor">
      <div className="bel-ust">
        <button className="muh-geri" onClick={onKapat}>‹ {t("belGeri", "Belgeler")}</button>
        <input className="bel-ad-inp" value={ad} onChange={(e) => setAd(e.target.value)} placeholder={t("belTabloAd", "Tablo adı")} />
      </div>
      {/* YAZI / HESAP bölümü AYRI (kullanıcı isteği) */}
      <div className="bel-mod-sec">
        <button className={"bel-mod-btn" + (mod === "yazi" ? " aktif" : "")} onClick={() => { setMod("yazi"); setIslem(null); setSecili([]); setSonucBekle(false); }}>✍️ {t("belYaziMod", "Yazı / Rakam gir")}</button>
        <button className={"bel-mod-btn" + (mod === "hesap" ? " aktif" : "")} onClick={() => { setMod("hesap"); setGenMod(false); setOdak(null); }}>🔢 {t("belHesapMod", "Düğmeyle hesapla")}</button>
      </div>
      <div className="bel-arac">
        <button onClick={satirEkle}>＋ {t("belSatir", "Satır")}</button>
        <button onClick={sutunEkle}>＋ {t("belSutun", "Sütun")}</button>
        <button onClick={satirSil}>－ {t("belSatir", "Satır")}</button>
        <button onClick={sutunSil}>－ {t("belSutun", "Sütun")}</button>
        <button onClick={toplamSatir}>∑ {t("belToplam", "Toplam")}</button>
        <button className={genMod ? "bel-arac-aktif" : ""} onClick={() => setGenMod((a) => !a)}>⇔ {t("belBoyut", "Boyut / Dikey")}</button>
      </div>
      {genMod && (
        <div className="bel-boyut-panel">
          <div className="bel-boyut-satir">
            <span className="bel-boyut-et">↔ {t("belSutun", "Sütun")}</span>
            <div className="bel-boyut-kaydir">
              {Array.from({ length: sutunSay }, (_, c) => (
                <span key={c} className="bel-boyut-oge">
                  <b>{_colHarf(c)}</b>
                  <button onClick={() => genDegis(c, -14)}>－</button>
                  <button onClick={() => genDegis(c, 14)}>＋</button>
                  <button className={"bel-dikey-btn" + (dikey[c] ? " sec" : "")} onClick={() => dikeyDegis(c)} title={t("belDikeyYazi", "Dikey yazı")}>⇅</button>
                </span>
              ))}
            </div>
          </div>
          <div className="bel-boyut-satir">
            <span className="bel-boyut-et">↕ {t("belSatir", "Satır")}</span>
            <div className="bel-boyut-kaydir">
              {grid.map((_, r) => (
                <span key={r} className="bel-boyut-oge">
                  <b>{r + 1}</b>
                  <button onClick={() => satirDegis(r, -8)}>－</button>
                  <button onClick={() => satirDegis(r, 8)}>＋</button>
                </span>
              ))}
            </div>
          </div>
          <div className="bel-formul-ipucu">{t("belBoyutIpucu", "Sütun başlığındaki － ＋ ile GENİŞLİK, sol rakamdaki － ＋ ile YÜKSEKLİK ayarlanır. ⇅ düğmesi o sütunu DİKEY yazıya çevirir (aşağıdan yukarı). A4'e sığsın diye sütunları inceltebilirsin.")}</div>
        </div>
      )}
      {mod === "hesap" ? (
        <div className="bel-hesap-bar">
          <div className="bel-op-satir">{oplar.map(([o, et]) => (
            <button key={o} className={"bel-op-btn" + (islem === o ? " sec" : "")} onClick={() => { setIslem(o); setSonucBekle(false); }}>{et}</button>
          ))}</div>
          <div className="bel-hesap-ipucu">{sonucBekle ? ("👉 " + t("belSonucDokun", "Sonucun çıkacağı BOŞ hücreye dokun")) : islem ? ("👉 " + t("belHucreleriSec", "Hesaplanacak sayı hücrelerine dokun (seçilir)")) : ("👉 " + t("belIslemSec", "Önce işlem seç: Topla / Çıkar / Çarp / Böl"))}</div>
          {secili.length > 0 && <div className="bel-onizle">{secOnizle}{canli != null ? " = " + canliYazi : ""}</div>}
          <div className="bel-hesap-dug">
            <button className="bel-sonuc-btn" disabled={!islem || secili.length < 2} onClick={() => { setSonucBekle(true); bilgi(t("belSonucDokun2", "Şimdi sonucun çıkacağı boş hücreye dokun")); }}>＝ {t("belSonucYaz", "Sonucu yaz")}</button>
            <button className="bel-vazgec-btn" onClick={() => { setSecili([]); setIslem(null); setSonucBekle(false); }}>✕ {t("belTemizle", "Temizle")}</button>
          </div>
        </div>
      ) : (
        <div className="bel-formul-ipucu">{t("belYaziIpucu", "✍️ Hücrelere yazı ya da rakam yaz. Hesap yapmak için üstten 🔢 Düğmeyle hesapla'ya geç. (İstersen elle formül de yazabilirsin: =A1+B1) Üstteki harfe dokun → sırala.")}</div>
      )}
      <div className="bel-tablo-sar">
        <table className="bel-tablo bel-tablo-sabit" style={{ width: 40 + gen.reduce((s, x) => s + (x || 96), 0) }}>
          <colgroup>
            <col style={{ width: 40 }} />
            {gen.map((w, c) => <col key={c} style={{ width: w }} />)}
          </colgroup>
          <tbody>
            <tr>
              <td className="bel-th bel-kose"></td>
              {Array.from({ length: sutunSay }, (_, c) => (
                <td key={c} className="bel-th bel-colbas">
                  <span onClick={() => mod !== "hesap" && !genMod && sirala(c)}>{_colHarf(c)}{sira && sira.c === c ? (sira.yon === "art" ? " ▲" : " ▼") : ""}</span>
                </td>
              ))}
            </tr>
            {grid.map((row, r) => (
              <tr key={r} style={{ height: satirYuk[r] }}>
                <td className="bel-th bel-rowbas" style={{ height: satirYuk[r] }}>{r + 1}</td>
                {row.map((v, c) => {
                  const odakli = odak && odak.r === r && odak.c === c;
                  const formul = String(v || "").trim().startsWith("=");
                  const sec = mod === "hesap" && secili.includes(r + "," + c);
                  const dik = dikey[c] && !odakli; // düzenlerken yatay göster (yazması kolay), düzenlemiyorken dikey göster
                  return (
                    <td key={c} style={{ height: satirYuk[r] }}
                      className={"bel-veri-hucre" + (formul ? " bel-hucre-formul" : "") + (sec ? " bel-hucre-secili" : "")}
                      onClick={mod === "hesap" ? () => hucreTikla(r, c) : undefined}>
                      <input className={"bel-hucre" + (dik ? " bel-hucre-dikey" : "")} readOnly={mod === "hesap"}
                        style={dik ? { writingMode: "vertical-rl", transform: "rotate(180deg)" } : undefined}
                        value={(odakli && mod !== "hesap") ? v : _goster(grid, r, c)}
                        onFocus={() => mod !== "hesap" && setOdak({ r, c })} onBlur={() => setOdak(null)} onChange={(e) => hucre(r, c, e.target.value)} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <table className="bel-tablo bel-yazdir-tablo bel-tablo-sabit" ref={yazdirRef} aria-hidden="true" style={{ width: gen.reduce((s, x) => s + (x || 96), 0) }}>
        <colgroup>{gen.map((w, c) => <col key={c} style={{ width: w }} />)}</colgroup>
        <tbody>{grid.map((row, r) => (<tr key={r} style={{ height: satirYuk[r] }}>{row.map((v, c) => <td key={c} style={{ height: satirYuk[r], ...(dikey[c] ? { writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap" } : {}) }}>{_goster(grid, r, c)}</td>)}</tr>))}</tbody>
      </table>
      <div className="bel-alt-dugmeler">
        <button className="muh-btn muh-kaydet" onClick={kaydet}>💾 {t("belKaydet", "Kaydet")}</button>
        <button className="muh-btn muh-excel" onClick={() => excelIndirAoa(ad || "tablo", grid.map((row, r) => row.map((v, c) => { const d = _hesapHucre(grid, r, c, new Set()); return typeof d === "number" ? d : String(d); }))).then(() => bilgi(t("belExcelIndi", "Excel indirildi 📊"))).catch(() => bilgi(t("belOlmadi", "Olmadı")))}>📊 Excel</button>
        <button className="muh-btn muh-pdf" onClick={() => elemPdf(yazdirRef.current, ad || "tablo").then(() => bilgi(t("belPdfHazir", "PDF hazır 📄"))).catch(() => bilgi(t("belOlmadi", "Olmadı")))}>📄 PDF</button>
        <button className="muh-btn muh-yazdir-btn" onClick={() => yazdirElem(yazdirRef.current, ad || "tablo")}>🖨️ {t("belYazdir", "Yazdır")}</button>
      </div>
    </div>
  );
}

// ===================== WORD (yazı) EDİTÖRÜ =====================
function YaziEditor({ t, belge, onKapat, onKaydet, bilgi }) {
  const [ad, setAd] = useState((belge && belge.ad) || "");
  const icRef = useRef(null);
  const ilkHtml = useRef((belge && belge.html) || "");
  // İçeriği SADECE BİR KEZ (mount) yükle → her render'da yeniden basılıp YAZDIĞIN SİLİNMEZ (eski hata: dangerouslySetInnerHTML her render'da sıfırlıyordu).
  useEffect(() => { if (icRef.current) icRef.current.innerHTML = ilkHtml.current; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // ⛔ ESKİ HATA: düğmeye basınca yazı alanının SEÇİMİ (odak) kaybolduğu için komutlar İŞLEMİYORDU.
  // ÇÖZÜM: seçimi sürekli kaydet (secimKaydet), komuttan önce GERİ YÜKLE (secimGeri) → düğmeler + yazı tipi/boyut/renk ÇALIŞIR.
  const secimRef = useRef(null);
  const secimKaydet = () => { try { const s = window.getSelection(); if (s && s.rangeCount) { const r = s.getRangeAt(0); if (icRef.current && icRef.current.contains(r.commonAncestorContainer)) secimRef.current = r.cloneRange(); } } catch (e) {} };
  const secimGeri = () => { try { if (icRef.current) icRef.current.focus(); const r = secimRef.current; if (r) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } } catch (e) {} };
  const komut = (c, v) => { secimGeri(); try { document.execCommand("styleWithCSS", false, true); } catch (e) {} try { document.execCommand(c, false, v); } catch (e) {} secimKaydet(); };
  const durdur = (e) => { try { e.preventDefault(); } catch (x) {} }; // düğmeye basınca yazı alanı odağını KAYBETME
  const htmlAl = () => (icRef.current ? icRef.current.innerHTML : "");
  const kaydet = () => onKaydet({ belgeTuru: "yazi", ad: ad.trim() || t("belAdsiz", "Adsız belge"), html: htmlAl(), zamanMs: Date.now() });
  const fontlar = ["Arial", "Georgia", "Times New Roman", "Verdana", "Trebuchet MS", "Courier New", "Comic Sans MS"];
  const boylar = [["3", t("belNormal", "Normal")], ["1", "XS"], ["2", "S"], ["4", "L"], ["5", "XL"], ["6", "XXL"], ["7", "XXXL"]];
  return (
    <div className="bel-editor">
      <div className="bel-ust">
        <button className="muh-geri" onClick={onKapat}>‹ {t("belGeri", "Belgeler")}</button>
        <input className="bel-ad-inp" value={ad} onChange={(e) => setAd(e.target.value)} placeholder={t("belYaziAd", "Belge adı")} />
      </div>
      <div className="bel-arac">
        <button onMouseDown={durdur} onClick={() => komut("bold")}><b>B</b></button>
        <button onMouseDown={durdur} onClick={() => komut("italic")}><i>I</i></button>
        <button onMouseDown={durdur} onClick={() => komut("underline")}><u>U</u></button>
        <button onMouseDown={durdur} onClick={() => komut("formatBlock", "<h2>")}>{t("belBaslik", "Başlık")}</button>
        <button onMouseDown={durdur} onClick={() => komut("insertUnorderedList")}>• {t("belListe", "Liste")}</button>
        <button onMouseDown={durdur} onClick={() => komut("justifyLeft")}>◧</button>
        <button onMouseDown={durdur} onClick={() => komut("justifyCenter")}>▣</button>
        <button onMouseDown={durdur} onClick={() => komut("justifyRight")}>◨</button>
        <select className="bel-arac-sec" value="" onMouseDown={secimKaydet} onChange={(e) => { if (e.target.value) komut("fontName", e.target.value); }}>
          <option value="">🖋 {t("belYaziTipi", "Yazı tipi")}</option>
          {fontlar.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
        </select>
        <select className="bel-arac-sec" value="" onMouseDown={secimKaydet} onChange={(e) => { if (e.target.value) komut("fontSize", e.target.value); }}>
          <option value="">🔠 {t("belYaziBoyut", "Boyut")}</option>
          {boylar.map(([v, et]) => <option key={v} value={v}>{et}</option>)}
        </select>
        <label className="bel-renk-btn" onMouseDown={secimKaydet} title={t("belRenk", "Renk")}>🎨<input type="color" onChange={(e) => komut("foreColor", e.target.value)} /></label>
      </div>
      <div className="bel-yazi-alan" ref={icRef} contentEditable suppressContentEditableWarning onMouseUp={secimKaydet} onKeyUp={secimKaydet} onBlur={secimKaydet} />
      <div className="bel-alt-dugmeler">
        <button className="muh-btn muh-kaydet" onClick={kaydet}>💾 {t("belKaydet", "Kaydet")}</button>
        <button className="muh-btn muh-pdf" style={{ background: "linear-gradient(90deg,#3f6fd0,#274ea0)" }} onClick={() => { wordIndir(ad || "belge", htmlAl()); bilgi(t("belWordIndi", "Word indirildi 📘")); }}>📘 Word</button>
        <button className="muh-btn muh-pdf" onClick={() => elemPdf(icRef.current, ad || "belge").then(() => bilgi(t("belPdfHazir", "PDF hazır 📄"))).catch(() => bilgi(t("belOlmadi", "Olmadı")))}>📄 PDF</button>
        <button className="muh-btn muh-yazdir-btn" onClick={() => yazdirElem(icRef.current, ad || "belge")}>🖨️ {t("belYazdir", "Yazdır")}</button>
      </div>
    </div>
  );
}

// ===================== FOTO → PDF ÇEVİRİCİ =====================
function FotoPdfEditor({ t, onKapat, bilgi }) {
  const [fotolar, setFotolar] = useState([]); // {d:dataURL}
  const [baslik, setBaslik] = useState("");
  const [yuk, setYuk] = useState(false);
  const inpRef = useRef(null); const yazdirRef = useRef(null);
  const dosyaSec = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => {
      const r = new FileReader();
      r.onload = () => { const im = new Image(); im.onload = () => {
        let w = im.naturalWidth || 800, h = im.naturalHeight || 800; const max = 1500;
        if (w > max || h > max) { if (w >= h) { h = Math.round(h * max / w); w = max; } else { w = Math.round(w * max / h); h = max; } }
        const cv = document.createElement("canvas"); cv.width = w; cv.height = h; cv.getContext("2d").drawImage(im, 0, 0, w, h);
        try { setFotolar((a) => [...a, { d: cv.toDataURL("image/jpeg", 0.85) }]); } catch (x) { setFotolar((a) => [...a, { d: String(r.result) }]); }
      }; im.src = String(r.result); };
      r.readAsDataURL(f);
    });
    e.target.value = "";
  };
  const sil = (i) => setFotolar((a) => a.filter((_, j) => j !== i));
  const tasi = (i, y) => setFotolar((a) => { const j = i + y; if (j < 0 || j >= a.length) return a; const b = [...a]; const tmp = b[i]; b[i] = b[j]; b[j] = tmp; return b; });
  const pdfYap = async () => {
    if (!fotolar.length) { bilgi(t("belFotoYok", "Önce fotoğraf ekle")); return; }
    setYuk(true);
    try { await elemPdf(yazdirRef.current, baslik || "foto"); bilgi(t("belPdfHazir", "PDF hazır 📄")); }
    catch (e) { bilgi(t("belOlmadi", "Olmadı")); }
    setYuk(false);
  };
  return (
    <div className="bel-editor">
      <div className="bel-ust">
        <button className="muh-geri" onClick={onKapat}>‹ {t("belGeri", "Belgeler")}</button>
        <input className="bel-ad-inp" value={baslik} onChange={(e) => setBaslik(e.target.value)} placeholder={t("belFotoBaslik", "Başlık (isteğe bağlı)")} />
      </div>
      <button className="muh-btn muh-ekle" onClick={() => inpRef.current && inpRef.current.click()}>📷 {t("belFotoEkle", "Fotoğraf ekle")}</button>
      <input ref={inpRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={dosyaSec} />
      <div className="bel-foto-liste">
        {fotolar.length === 0 ? <div className="muh-bos">💛 {t("belFotoAlt", "Fotoğraf ekle (birden çok olabilir). Sıralayıp tek PDF yap, indir/paylaş.")}</div>
          : fotolar.map((f, i) => (
            <div className="bel-foto-oge" key={i}>
              <img src={f.d} alt="" />
              <div className="bel-foto-dug">
                <button onClick={() => tasi(i, -1)} aria-label="Yukarı">↑</button>
                <button onClick={() => tasi(i, 1)} aria-label="Aşağı">↓</button>
                <button onClick={() => sil(i)} aria-label="Sil">🗑️</button>
              </div>
            </div>
          ))}
      </div>
      <div className="bel-alt-dugmeler">
        <button className="muh-btn muh-pdf" disabled={yuk} onClick={pdfYap}>📄 {t("belPdfYapPaylas", "PDF yap — indir / paylaş")}</button>
        <button className="muh-btn muh-yazdir-btn" disabled={yuk} onClick={() => { if (!fotolar.length) { bilgi(t("belFotoYok", "Önce fotoğraf ekle")); return; } yazdirElem(yazdirRef.current, baslik || "foto"); }}>🖨️ {t("belYazdir", "Yazdır")}</button>
      </div>
      {/* YAZDIRILACAK (ekran dışında) — Türkçe başlık + fotoğraflar tek PDF */}
      <div ref={yazdirRef} className="bel-fotopdf-yazdir" aria-hidden="true">
        {baslik.trim() ? <div className="fp-baslik">{baslik}</div> : null}
        {fotolar.map((f, i) => <img key={i} src={f.d} className="fp-img" alt="" />)}
      </div>
    </div>
  );
}

// ===================== FATURA EDİTÖRÜ =====================
function FaturaEditor({ t, belge, onKapat, onKaydet, bilgi, paraSym, benAd }) {
  const f0 = (belge && belge.fatura) || {};
  const [ad, setAd] = useState((belge && belge.ad) || "");
  const [firma, setFirma] = useState(f0.firma != null ? f0.firma : (benAd || ""));
  const [musteri, setMusteri] = useState(f0.musteri || "");
  const [no, setNo] = useState(f0.no || ("FT" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000)));
  const [tarih, setTarih] = useState(f0.tarih || bugunStr());
  const [kdvOran, setKdvOran] = useState(f0.kdvOran != null ? f0.kdvOran : 20);
  const [satirlar, setSatirlar] = useState(Array.isArray(f0.satirlar) && f0.satirlar.length ? f0.satirlar : [{ ad: "", miktar: "1", fiyat: "" }]);
  const yazdirRef = useRef(null);
  const setSat = (i, alan, v) => setSatirlar((s) => s.map((x, j) => j === i ? { ...x, [alan]: v } : x));
  const satEkle = () => setSatirlar((s) => [...s, { ad: "", miktar: "1", fiyat: "" }]);
  const satSil = (i) => setSatirlar((s) => s.length > 1 ? s.filter((_, j) => j !== i) : s);
  const araToplam = satirlar.reduce((a, x) => a + sayi(x.miktar) * sayi(x.fiyat), 0);
  const kdv = araToplam * (Number(kdvOran) || 0) / 100;
  const genelToplam = araToplam + kdv;
  const veri = () => ({ belgeTuru: "fatura", ad: ad.trim() || ("Fatura " + no), fatura: { firma, musteri, no, tarih, kdvOran: Number(kdvOran) || 0, satirlar }, zamanMs: Date.now() });
  const aoa = () => {
    const rows = [["FATURA", "", "", ""], ["No: " + no, "", "Tarih: " + trTarih(tarih), ""], ["Satıcı: " + firma, "", "Alıcı: " + musteri, ""], [], [t("belUrun", "Ürün/Hizmet"), t("belMiktar", "Miktar"), t("belFiyat", "Birim Fiyat"), t("belTutar", "Tutar")]];
    satirlar.forEach((x) => rows.push([x.ad || "", sayi(x.miktar), sayi(x.fiyat), sayi(x.miktar) * sayi(x.fiyat)]));
    rows.push([], ["", "", t("belAraToplam", "Ara Toplam"), araToplam], ["", "", "KDV %" + (Number(kdvOran) || 0), kdv], ["", "", t("belGenelToplam", "GENEL TOPLAM"), genelToplam]);
    return rows;
  };
  const faturaHtml = () => yazdirRef.current ? yazdirRef.current.innerHTML : "";

  return (
    <div className="bel-editor">
      <div className="bel-ust">
        <button className="muh-geri" onClick={onKapat}>‹ {t("belGeri", "Belgeler")}</button>
        <input className="bel-ad-inp" value={ad} onChange={(e) => setAd(e.target.value)} placeholder={t("belFaturaAd", "Fatura adı")} />
      </div>
      <div className="muh-form">
        <input className="muh-inp" value={firma} onChange={(e) => setFirma(e.target.value)} placeholder={t("belSatici", "Satıcı (senin firman)")} />
        <input className="muh-inp" value={musteri} onChange={(e) => setMusteri(e.target.value)} placeholder={t("belAlici", "Alıcı (müşteri)")} />
        <div className="bel-ikili">
          <input className="muh-inp" value={no} onChange={(e) => setNo(e.target.value)} placeholder={t("belFaturaNo", "Fatura No")} />
          <input className="muh-inp" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
        </div>
      </div>
      <div className="bel-fat-satirlar">
        {satirlar.map((x, i) => (
          <div className="bel-fat-satir" key={i}>
            <input className="muh-inp" value={x.ad} onChange={(e) => setSat(i, "ad", e.target.value)} placeholder={t("belUrun", "Ürün/Hizmet")} />
            <input className="muh-inp bel-kucuk" type="number" inputMode="decimal" value={x.miktar} onChange={(e) => setSat(i, "miktar", e.target.value)} placeholder={t("belMiktar", "Adet")} />
            <input className="muh-inp bel-kucuk" type="number" inputMode="decimal" value={x.fiyat} onChange={(e) => setSat(i, "fiyat", e.target.value)} placeholder={t("belFiyat", "Fiyat")} />
            <button className="bel-fat-sil" onClick={() => satSil(i)}>✕</button>
          </div>
        ))}
        <div className="bel-fat-alt">
          <button className="bel-fat-ekle" onClick={satEkle}>＋ {t("belSatirEkle", "Satır ekle")}</button>
          <span className="bel-kdv">KDV %<input className="muh-inp bel-kucuk" type="number" inputMode="decimal" value={kdvOran} onChange={(e) => setKdvOran(e.target.value)} /></span>
        </div>
      </div>
      <div className="bel-fat-ozet">
        <div><span>{t("belAraToplam", "Ara Toplam")}</span><b>{para2(araToplam)} {paraSym}</b></div>
        <div><span>KDV (%{Number(kdvOran) || 0})</span><b>{para2(kdv)} {paraSym}</b></div>
        <div className="genel"><span>{t("belGenelToplam", "GENEL TOPLAM")}</span><b>{para2(genelToplam)} {paraSym}</b></div>
      </div>
      <div className="bel-alt-dugmeler">
        <button className="muh-btn muh-kaydet" onClick={() => onKaydet(veri())}>💾 {t("belKaydet", "Kaydet")}</button>
        <button className="muh-btn muh-excel" onClick={() => excelIndirAoa(ad || no, aoa()).then(() => bilgi(t("belExcelIndi", "Excel indirildi 📊"))).catch(() => bilgi(t("belOlmadi", "Olmadı")))}>📊 Excel</button>
        <button className="muh-btn muh-pdf" style={{ background: "linear-gradient(90deg,#3f6fd0,#274ea0)" }} onClick={() => { wordIndir(ad || no, faturaHtml()); bilgi(t("belWordIndi", "Word indirildi 📘")); }}>📘 Word</button>
        <button className="muh-btn muh-pdf" onClick={() => elemPdf(yazdirRef.current, ad || no).then(() => bilgi(t("belPdfHazir", "PDF hazır 📄"))).catch(() => bilgi(t("belOlmadi", "Olmadı")))}>📄 PDF</button>
        <button className="muh-btn muh-yazdir-btn" onClick={() => yazdirElem(yazdirRef.current, ad || no)}>🖨️ {t("belYazdir", "Yazdır")}</button>
      </div>

      {/* YAZDIRILACAK FATURA (PDF/Word bundan alınır) */}
      <div className="bel-fat-yazdir" ref={yazdirRef}>
        <h2 style={{ margin: "0 0 4px", color: "#7a5a00" }}>FATURA</h2>
        <div style={{ fontSize: 13, color: "#333" }}>No: {no} &nbsp;·&nbsp; Tarih: {trTarih(tarih)}</div>
        <table style={{ width: "100%", marginTop: 8, fontSize: 13 }}><tbody>
          <tr><td style={{ width: "50%", verticalAlign: "top" }}><b>Satıcı:</b><br />{firma}</td><td style={{ verticalAlign: "top" }}><b>Alıcı:</b><br />{musteri}</td></tr>
        </tbody></table>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: 13 }}>
          <thead><tr>{[t("belUrun", "Ürün/Hizmet"), t("belMiktar", "Miktar"), t("belFiyat", "Birim Fiyat"), t("belTutar", "Tutar")].map((h, i) => <th key={i} style={{ border: "1px solid #999", padding: "6px 8px", background: "#f2e4b8", textAlign: i ? "right" : "left" }}>{h}</th>)}</tr></thead>
          <tbody>{satirlar.map((x, i) => (
            <tr key={i}><td style={{ border: "1px solid #bbb", padding: "6px 8px" }}>{x.ad}</td><td style={{ border: "1px solid #bbb", padding: "6px 8px", textAlign: "right" }}>{sayi(x.miktar)}</td><td style={{ border: "1px solid #bbb", padding: "6px 8px", textAlign: "right" }}>{para2(sayi(x.fiyat))}</td><td style={{ border: "1px solid #bbb", padding: "6px 8px", textAlign: "right" }}>{para2(sayi(x.miktar) * sayi(x.fiyat))}</td></tr>
          ))}</tbody>
          <tfoot>
            <tr><td colSpan="3" style={{ border: "1px solid #bbb", padding: "6px 8px", textAlign: "right" }}>{t("belAraToplam", "Ara Toplam")}</td><td style={{ border: "1px solid #bbb", padding: "6px 8px", textAlign: "right" }}>{para2(araToplam)}</td></tr>
            <tr><td colSpan="3" style={{ border: "1px solid #bbb", padding: "6px 8px", textAlign: "right" }}>KDV %{Number(kdvOran) || 0}</td><td style={{ border: "1px solid #bbb", padding: "6px 8px", textAlign: "right" }}>{para2(kdv)}</td></tr>
            <tr><td colSpan="3" style={{ border: "1px solid #999", padding: "6px 8px", textAlign: "right", fontWeight: 900, background: "#fff2cc" }}>{t("belGenelToplam", "GENEL TOPLAM")}</td><td style={{ border: "1px solid #999", padding: "6px 8px", textAlign: "right", fontWeight: 900, background: "#fff2cc" }}>{para2(genelToplam)} {paraSym}</td></tr>
          </tfoot>
        </table>
        <div style={{ marginTop: 14, fontSize: 11, color: "#666" }}>GLOXORG · {benAd || ""}</div>
      </div>
    </div>
  );
}

// ---- bir HTML öğesini FOTOĞRAF (PNG) yapıp paylaş/indir (meslek sayfası paylaşımı) ----
async function elemFotoPaylas(el, ad) {
  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: true });
  const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
  const dosya = new File([blob], dosyaAd(ad, "png"), { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [dosya] })) { try { await navigator.share({ files: [dosya], title: "GLOXORG" }); return; } catch (e) {} }
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = dosyaAd(ad, "png");
  document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// ===================== HAZIR ŞABLONLAR (mesleğe göre) =====================
const SABLONLAR = [
  { meslek: "Restoran / Kafe", ikon: "🍽️", liste: [
    { ad: "Günlük Kasa", tur: "tablo", grid: [["Tarih", "Gelir", "Gider", "Kalan"], ["", "", "", "=B2-C2"], ["", "", "", "=B3-C3"], ["Toplam", "=TOPLA(B2:B3)", "=TOPLA(C2:C3)", "=B4-C4"]] },
    { ad: "Stok / Depo", tur: "tablo", grid: [["Ürün", "Giriş", "Çıkış", "Kalan"], ["", "", "", "=B2-C2"], ["", "", "", "=B3-C3"]] },
    { ad: "Adisyon / Fatura", tur: "fatura" },
  ] },
  { meslek: "Kuaför / Güzellik", ikon: "💇", liste: [
    { ad: "Randevu Defteri", tur: "tablo", grid: [["Tarih", "Saat", "Müşteri", "Hizmet", "Ücret"], ["", "", "", "", ""], ["", "", "", "", ""]] },
    { ad: "Gelir-Gider", tur: "tablo", grid: [["Tarih", "Gelir", "Gider", "Kalan"], ["", "", "", "=B2-C2"]] },
  ] },
  { meslek: "Terzi / Tekstil", ikon: "🧵", liste: [
    { ad: "Sipariş Takip", tur: "tablo", grid: [["Müşteri", "Ürün", "Adet", "Fiyat", "Tutar", "Teslim"], ["", "", "", "", "=C2*D2", ""], ["", "", "", "", "=C3*D3", ""]] },
    { ad: "Fatura", tur: "fatura" },
  ] },
  { meslek: "Market / Bakkal", ikon: "🛒", liste: [
    { ad: "Stok Sayımı", tur: "tablo", grid: [["Ürün", "Miktar", "Alış", "Satış", "Kâr"], ["", "", "", "", "=D2-C2"], ["", "", "", "", "=D3-C3"]] },
    { ad: "Veresiye Defteri", tur: "tablo", grid: [["Müşteri", "Borç", "Ödeme", "Kalan"], ["", "", "", "=B2-C2"], ["", "", "", "=B3-C3"]] },
  ] },
  { meslek: "Nakliye / Lojistik", ikon: "🚚", liste: [
    { ad: "Sefer Defteri", tur: "tablo", grid: [["Tarih", "Nereden", "Nereye", "Ücret", "Yakıt", "Net"], ["", "", "", "", "", "=D2-E2"], ["", "", "", "", "", "=D3-E3"]] },
  ] },
  { meslek: "İnşaat / Usta", ikon: "🔨", liste: [
    { ad: "Malzeme Listesi", tur: "tablo", grid: [["Malzeme", "Adet", "Birim Fiyat", "Tutar"], ["", "", "", "=B2*C2"], ["", "", "", "=B3*C3"], ["Toplam", "", "", "=TOPLA(D2:D3)"]] },
    { ad: "İşçilik / Hakediş", tur: "tablo", grid: [["Tarih", "İşçi", "Gün", "Yevmiye", "Tutar"], ["", "", "", "", "=C2*D2"]] },
  ] },
  { meslek: "Genel / Serbest", ikon: "📋", liste: [
    { ad: "Gelir-Gider Defteri", tur: "tablo", grid: [["Tarih", "Açıklama", "Gelir", "Gider", "Kalan"], ["", "", "", "", "=C2-D2"], ["", "", "", "", "=C3-D3"], ["Toplam", "", "=TOPLA(C2:C3)", "=TOPLA(D2:D3)", "=C4-D4"]] },
    { ad: "Müşteri Borç Takip", tur: "tablo", grid: [["Müşteri", "Borç", "Tahsilat", "Kalan"], ["", "", "", "=B2-C2"]] },
    { ad: "Sözleşme (Word)", tur: "yazi", html: "<h2>SÖZLEŞME</h2><p><b>Taraflar:</b> ......</p><p><b>Konu:</b> ......</p><p><b>Bedel:</b> ......</p><p><b>Tarih:</b> ......</p><p>İmza</p>" },
    { ad: "Teklif Mektubu (Word)", tur: "yazi", html: "<h2>FİYAT TEKLİFİ</h2><p>Sayın .......,</p><p>Talebiniz üzerine hazırladığımız teklifimiz aşağıdadır:</p><ul><li>Hizmet: ......</li><li>Bedel: ......</li><li>Süre: ......</li></ul><p>Saygılarımızla.</p>" },
  ] },
];
function SablonSecici({ t, onKapat, onSec }) {
  return (
    <div className="bel-editor">
      <div className="bel-ust"><button className="muh-geri" onClick={onKapat}>‹ {t("belGeri", "Belgeler")}</button><span className="bel-baslik">🧑‍🔧 {t("belSablonSec", "Mesleğine göre hazır şablon seç")}</span></div>
      <div className="muh-alt">{t("belSablonAlt", "Mesleğini seç, hazır sayfa açılsın; içini kendine göre doldur, sonra Excel/Word/PDF indir.")}</div>
      {SABLONLAR.map((m) => (
        <div key={m.meslek} className="bel-sablon-grup">
          <div className="bel-sablon-meslek">{m.ikon} {m.meslek}</div>
          <div className="bel-sablon-liste">
            {m.liste.map((s, i) => (
              <button key={i} className="bel-sablon-kart" onClick={() => onSec(s)}>
                <span className="bss-ik">{s.tur === "tablo" ? "📊" : s.tur === "fatura" ? "🧾" : "📝"}</span>
                <span className="bss-ad">{s.ad}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ===================== MESLEK SAYFASI (kendi tanıtım sayfanı yap + paylaş) =====================
function MeslekSayfa({ t, belge, onKapat, onKaydet, bilgi, onGloxordaPaylas }) {
  const m0 = (belge && belge.meslekSayfa) || {};
  const [ad, setAd] = useState((belge && belge.ad) || "");
  const [firma, setFirma] = useState(m0.firma || "");
  const [meslek, setMeslek] = useState(m0.meslek || "");
  const [slogan, setSlogan] = useState(m0.slogan || "");
  const [aciklama, setAciklama] = useState(m0.aciklama || "");
  const [hizmetler, setHizmetler] = useState(m0.hizmetler || "");
  const [tel, setTel] = useState(m0.tel || "");
  const [adres, setAdres] = useState(m0.adres || "");
  const [foto, setFoto] = useState(m0.foto || "");
  const [renk, setRenk] = useState(m0.renk || "altin");
  const [yuk, setYuk] = useState(false);
  const inpRef = useRef(null); const kartRef = useRef(null);
  const fotoSec = (e) => { const f = (e.target.files || [])[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { let w = im.naturalWidth, h = im.naturalHeight; const max = 900; if (w > max || h > max) { if (w >= h) { h = Math.round(h * max / w); w = max; } else { w = Math.round(w * max / h); h = max; } } const cv = document.createElement("canvas"); cv.width = w; cv.height = h; cv.getContext("2d").drawImage(im, 0, 0, w, h); try { setFoto(cv.toDataURL("image/jpeg", 0.85)); } catch (x) { setFoto(String(r.result)); } }; im.src = String(r.result); }; r.readAsDataURL(f); e.target.value = ""; };
  const hizmetDizi = hizmetler.split("\n").map((s) => s.trim()).filter(Boolean);
  const veri = () => ({ belgeTuru: "meslek", ad: ad.trim() || firma || t("belMeslek", "Meslek sayfası"), meslekSayfa: { firma, meslek, slogan, aciklama, hizmetler, tel, adres, foto, renk }, zamanMs: Date.now() });
  const pdf = async () => { setYuk(true); try { await elemPdf(kartRef.current, ad || firma || "meslek-sayfam"); bilgi(t("belPdfHazir", "PDF hazır 📄")); } catch (e) { bilgi(t("belOlmadi", "Olmadı")); } setYuk(false); };
  const paylas = async () => { setYuk(true); try { await elemFotoPaylas(kartRef.current, ad || firma || "meslek-sayfam"); bilgi(t("belPaylasildi", "Paylaşıldı ✓")); } catch (e) { bilgi(t("belOlmadi", "Olmadı")); } setYuk(false); };
  const gloxorda = async () => {
    if (!onGloxordaPaylas) return; setYuk(true);
    try { const html2canvas = (await import("html2canvas")).default; const canvas = await html2canvas(kartRef.current, { scale: 2, backgroundColor: null, useCORS: true }); onGloxordaPaylas(canvas.toDataURL("image/png"), (firma ? firma + " — " : "") + (slogan || meslek || "")); }
    catch (e) { bilgi(t("belOlmadi", "Olmadı")); }
    setYuk(false);
  };
  return (
    <div className="bel-editor">
      <div className="bel-ust"><button className="muh-geri" onClick={onKapat}>‹ {t("belGeri", "Belgeler")}</button><input className="bel-ad-inp" value={ad} onChange={(e) => setAd(e.target.value)} placeholder={t("belMeslekAd", "Sayfa adı")} /></div>
      <div className="muh-alt">{t("belMeslekAlt", "Mesleğine göre kendi tanıtım sayfanı yap: firma adı, ne iş yaptığın, hizmetler, telefon, adres, fotoğraf. Sonra PDF/foto indir, paylaş ya da GLOXORG'da yayınla.")}</div>
      <div className="muh-form">
        <input className="muh-inp" value={firma} onChange={(e) => setFirma(e.target.value)} placeholder={t("belFirma", "Firma / İşletme adı")} />
        <input className="muh-inp" value={meslek} onChange={(e) => setMeslek(e.target.value)} placeholder={t("belMeslekTur", "Meslek (ör. Kuaför, Terzi, Restoran)")} />
        <input className="muh-inp" value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder={t("belSlogan", "Slogan (kısa tanıtım)")} />
        <textarea className="muh-inp" rows={2} value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder={t("belMeslekAciklama", "Kendini / işini anlat")} />
        <textarea className="muh-inp" rows={3} value={hizmetler} onChange={(e) => setHizmetler(e.target.value)} placeholder={t("belHizmetler", "Hizmetler (her satıra bir tane)")} />
        <input className="muh-inp" value={tel} onChange={(e) => setTel(e.target.value)} placeholder={t("belTelefon", "Telefon")} />
        <input className="muh-inp" value={adres} onChange={(e) => setAdres(e.target.value)} placeholder={t("belAdres", "Adres / Konum")} />
        <button className="muh-btn muh-ekle" onClick={() => inpRef.current && inpRef.current.click()}>🖼️ {foto ? t("belFotoDegis", "Fotoğrafı değiştir") : t("belFotoEkleBtn", "Fotoğraf / logo ekle")}</button>
        <input ref={inpRef} type="file" accept="image/*" style={{ display: "none" }} onChange={fotoSec} />
        <div className="bel-renk-sec">
          {[["altin", "#f2c94c"], ["mavi", "#4a7fe0"], ["yesil", "#34c878"], ["mor", "#a86fe0"], ["kirmizi", "#e0574a"]].map(([k, c]) => (
            <button key={k} className={"bel-renk" + (renk === k ? " sec" : "")} style={{ background: c }} onClick={() => setRenk(k)} aria-label={k} />
          ))}
        </div>
      </div>
      <div className={"bel-meslek-kart tema-" + renk} ref={kartRef}>
        {foto ? <img className="bmk-foto" src={foto} alt="" /> : null}
        <div className="bmk-firma notranslate">{firma || t("belFirmaOrnek", "Firma Adı")}</div>
        {meslek ? <div className="bmk-meslek">{meslek}</div> : null}
        {slogan ? <div className="bmk-slogan">{slogan}</div> : null}
        {aciklama ? <div className="bmk-aciklama">{aciklama}</div> : null}
        {hizmetDizi.length ? <div className="bmk-hizmetler">{hizmetDizi.map((h, i) => <span key={i}>✓ {h}</span>)}</div> : null}
        <div className="bmk-iletisim">{tel ? <div>📞 {tel}</div> : null}{adres ? <div>📍 {adres}</div> : null}</div>
        <div className="bmk-dip notranslate">GLOXORG</div>
      </div>
      <div className="bel-alt-dugmeler">
        <button className="muh-btn muh-kaydet" onClick={() => onKaydet(veri())}>💾 {t("belKaydet", "Kaydet")}</button>
        <button className="muh-btn muh-pdf" disabled={yuk} onClick={pdf}>📄 PDF</button>
        <button className="muh-btn muh-yazdir-btn" disabled={yuk} onClick={() => yazdirElem(kartRef.current, ad || firma || "meslek-sayfam")}>🖨️ {t("belYazdir", "Yazdır")}</button>
        <button className="muh-btn muh-paylas" disabled={yuk} onClick={paylas}>↗ {t("belPaylas", "Paylaş")}</button>
        {onGloxordaPaylas ? <button className="muh-btn bel-gloxorda" disabled={yuk} onClick={gloxorda}>🌐 {t("belGloxorda", "GLOXORG'da paylaş")}</button> : null}
      </div>
    </div>
  );
}
