// GLOXORG MUHASEBE — BELGELER modülü: KENDİ Excel tablonu oluştur-doldur, Word belgesi yaz, KDV'li Fatura kes.
// Hepsi .xlsx / .docx(.doc) / PDF indirilir & paylaşılır, Firebase'de saklanır (⋮ menü + çöp kutusu ile silinir).
// Ağır kütüphaneler (xlsx/jspdf/html2canvas) SADECE indirirken dinamik yüklenir.
import { useState, useRef } from "react";

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

// ===================== BELGELER LİSTESİ + YÖNLENDİRME =====================
export default function Belgeler({ t, uid, belgeler, ekle, guncelle, copeAt, UcNokta, bilgi, paraSym = "₺", benAd = "" }) {
  const [acik, setAcik] = useState(null); // {mod:"tablo"|"yazi"|"fatura", belge?}
  const ikon = (bt) => bt === "tablo" ? "📊" : bt === "fatura" ? "🧾" : "📝";
  const turAd = (bt) => bt === "tablo" ? t("belTablo", "Excel tablosu") : bt === "fatura" ? t("belFatura", "Fatura") : t("belYazi", "Word belgesi");

  if (acik) {
    const ortak = { t, paraSym, benAd, bilgi,
      onKapat: () => setAcik(null),
      onKaydet: async (veri) => { if (acik.belge) { await guncelle(acik.belge.id, veri); bilgi(t("belKaydedildi", "Kaydedildi ✓")); } else { const id = await ekle({ tip: "belge", ...veri }); if (id) { setAcik({ mod: acik.mod, belge: { id, ...veri } }); bilgi(t("belKaydedildi", "Kaydedildi ✓")); } } } };
    if (acik.mod === "tablo") return <TabloEditor {...ortak} belge={acik.belge} />;
    if (acik.mod === "fatura") return <FaturaEditor {...ortak} belge={acik.belge} />;
    if (acik.mod === "fotopdf") return <FotoPdfEditor {...ortak} />;
    return <YaziEditor {...ortak} belge={acik.belge} />;
  }

  return (<>
    <div className="muh-alt">{t("belAlt", "Kendi Excel tablonu oluştur, Word belgesi yaz ya da fatura kes. Excel/Word/PDF indir, paylaş. Her şey saklanır, sen silmeden gitmez.")}</div>
    <div className="bel-yeni">
      <button className="bel-yeni-btn tablo" onClick={() => setAcik({ mod: "tablo" })}>📊<span>{t("belTablo", "Excel tablosu")}</span></button>
      <button className="bel-yeni-btn yazi" onClick={() => setAcik({ mod: "yazi" })}>📝<span>{t("belYazi", "Word belgesi")}</span></button>
      <button className="bel-yeni-btn fatura" onClick={() => setAcik({ mod: "fatura" })}>🧾<span>{t("belFatura", "Fatura")}</span></button>
      <button className="bel-yeni-btn fotopdf" onClick={() => setAcik({ mod: "fotopdf" })}>📷<span>{t("belFotoPdf", "Foto → PDF")}</span></button>
    </div>
    <div className="muh-kayit-liste">
      {belgeler.length === 0 ? <div className="muh-bos">💛 {t("belYok", "Henüz belge yok. Yukarıdan oluştur.")}</div>
        : [...belgeler].sort((a, b) => (b.zamanMs || 0) - (a.zamanMs || 0)).map((b) => (
          <div key={b.id} className="muh-kayit" onClick={() => setAcik({ mod: b.belgeTuru || "yazi", belge: b })} style={{ cursor: "pointer" }}>
            <span className="muh-k-tarih">{ikon(b.belgeTuru)} {turAd(b.belgeTuru)}</span>
            <span className="muh-k-acik notranslate">{b.ad || t("belAdsiz", "Adsız belge")}</span>
            <UcNokta id={b.id} />
          </div>
        ))}
    </div>
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

// ===================== EXCEL TABLOSU EDİTÖRÜ (formüllü) =====================
function TabloEditor({ t, belge, onKapat, onKaydet, bilgi }) {
  const bosGrid = () => Array.from({ length: 8 }, () => Array.from({ length: 4 }, () => ""));
  const [ad, setAd] = useState((belge && belge.ad) || "");
  const [grid, setGrid] = useState((belge && Array.isArray(belge.grid) && belge.grid.length) ? belge.grid.map((r) => [...r]) : bosGrid());
  const [odak, setOdak] = useState(null); // düzenlenen hücre {r,c} → HAM göster (formülü)
  const [sira, setSira] = useState(null); // {c,yon}
  const yazdirRef = useRef(null);
  const hucre = (r, c, v) => setGrid((g) => g.map((row, i) => i === r ? row.map((x, j) => j === c ? v : x) : row));
  const satirEkle = () => setGrid((g) => [...g, Array.from({ length: g[0] ? g[0].length : 4 }, () => "")]);
  const sutunEkle = () => setGrid((g) => g.map((r) => [...r, ""]));
  const satirSil = () => setGrid((g) => g.length > 1 ? g.slice(0, -1) : g);
  const sutunSil = () => setGrid((g) => (g[0] && g[0].length > 1) ? g.map((r) => r.slice(0, -1)) : g);
  const sutunSay = grid[0] ? grid[0].length : 0;
  // ∑ Toplam: her sütuna CANLI toplam formülü (=TOPLA(A1:A{n})) ekle → sayı değişince kendi güncellenir
  const toplamSatir = () => setGrid((g) => { const n = g.length; const cols = g[0] ? g[0].length : 0; return [...g, Array.from({ length: cols }, (_, c) => "=TOPLA(" + _colHarf(c) + "1:" + _colHarf(c) + n + ")")]; });
  // Harf başlığına dokununca o sütuna göre sırala (artan/azalan)
  const sirala = (c) => { const yon = (sira && sira.c === c && sira.yon === "art") ? "azal" : "art"; setSira({ c, yon }); setGrid((g) => { const k = g.map((row) => [...row]); k.sort((a, b) => { const va = _hesapHucre([a], 0, c, new Set()), vb = _hesapHucre([b], 0, c, new Set()); const r = (typeof va === "number" && typeof vb === "number") ? (va - vb) : String(va).localeCompare(String(vb), "tr"); return yon === "art" ? r : -r; }); return k; }); };
  const kaydet = () => onKaydet({ belgeTuru: "tablo", ad: ad.trim() || t("belAdsiz", "Adsız tablo"), grid, zamanMs: Date.now() });

  return (
    <div className="bel-editor">
      <div className="bel-ust">
        <button className="muh-geri" onClick={onKapat}>‹ {t("belGeri", "Belgeler")}</button>
        <input className="bel-ad-inp" value={ad} onChange={(e) => setAd(e.target.value)} placeholder={t("belTabloAd", "Tablo adı")} />
      </div>
      <div className="bel-arac">
        <button onClick={satirEkle}>＋ {t("belSatir", "Satır")}</button>
        <button onClick={sutunEkle}>＋ {t("belSutun", "Sütun")}</button>
        <button onClick={satirSil}>－ {t("belSatir", "Satır")}</button>
        <button onClick={sutunSil}>－ {t("belSutun", "Sütun")}</button>
        <button onClick={toplamSatir}>∑ {t("belToplam", "Toplam")}</button>
      </div>
      <div className="bel-formul-ipucu">{t("belFormulIpucu", "🧮 Otomatik hesap: hücreye = ile başla → =A1+B1 (topla), =B1-C1 (kalan), =A2*B2 (çarp), =TOPLA(A1:A5). Üstteki harfe dokun → sırala.")}</div>
      <div className="bel-tablo-sar">
        <table className="bel-tablo">
          <tbody>
            <tr>
              <td className="bel-th bel-kose"></td>
              {Array.from({ length: sutunSay }, (_, c) => (
                <td key={c} className="bel-th bel-colbas" onClick={() => sirala(c)}>{_colHarf(c)}{sira && sira.c === c ? (sira.yon === "art" ? " ▲" : " ▼") : ""}</td>
              ))}
            </tr>
            {grid.map((row, r) => (
              <tr key={r}>
                <td className="bel-th">{r + 1}</td>
                {row.map((v, c) => {
                  const odakli = odak && odak.r === r && odak.c === c;
                  const formul = String(v || "").trim().startsWith("=");
                  return (
                    <td key={c} className={formul ? "bel-hucre-formul" : ""}>
                      <input className="bel-hucre" value={odakli ? v : _goster(grid, r, c)}
                        onFocus={() => setOdak({ r, c })} onBlur={() => setOdak(null)} onChange={(e) => hucre(r, c, e.target.value)} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* DIŞA AKTARMA için HESAPLANMIŞ değerli tablo (ekran dışında) — PDF/Excel formül sonucunu alır */}
      <table className="bel-tablo bel-yazdir-tablo" ref={yazdirRef} aria-hidden="true">
        <tbody>{grid.map((row, r) => (<tr key={r}>{row.map((v, c) => <td key={c}>{_goster(grid, r, c)}</td>)}</tr>))}</tbody>
      </table>
      <div className="bel-alt-dugmeler">
        <button className="muh-btn muh-kaydet" onClick={kaydet}>💾 {t("belKaydet", "Kaydet")}</button>
        <button className="muh-btn muh-excel" onClick={() => excelIndirAoa(ad || "tablo", grid.map((row, r) => row.map((v, c) => { const d = _hesapHucre(grid, r, c, new Set()); return typeof d === "number" ? d : String(d); }))).then(() => bilgi(t("belExcelIndi", "Excel indirildi 📊"))).catch(() => bilgi(t("belOlmadi", "Olmadı")))}>📊 Excel</button>
        <button className="muh-btn muh-pdf" onClick={() => elemPdf(yazdirRef.current, ad || "tablo").then(() => bilgi(t("belPdfHazir", "PDF hazır 📄"))).catch(() => bilgi(t("belOlmadi", "Olmadı")))}>📄 PDF</button>
      </div>
    </div>
  );
}

// ===================== WORD (yazı) EDİTÖRÜ =====================
function YaziEditor({ t, belge, onKapat, onKaydet, bilgi }) {
  const [ad, setAd] = useState((belge && belge.ad) || "");
  const icRef = useRef(null);
  const komut = (c, v) => { try { document.execCommand(c, false, v); icRef.current && icRef.current.focus(); } catch (e) {} };
  const htmlAl = () => (icRef.current ? icRef.current.innerHTML : "");
  const kaydet = () => onKaydet({ belgeTuru: "yazi", ad: ad.trim() || t("belAdsiz", "Adsız belge"), html: htmlAl(), zamanMs: Date.now() });
  return (
    <div className="bel-editor">
      <div className="bel-ust">
        <button className="muh-geri" onClick={onKapat}>‹ {t("belGeri", "Belgeler")}</button>
        <input className="bel-ad-inp" value={ad} onChange={(e) => setAd(e.target.value)} placeholder={t("belYaziAd", "Belge adı")} />
      </div>
      <div className="bel-arac">
        <button onClick={() => komut("bold")}><b>B</b></button>
        <button onClick={() => komut("italic")}><i>I</i></button>
        <button onClick={() => komut("underline")}><u>U</u></button>
        <button onClick={() => komut("formatBlock", "H2")}>{t("belBaslik", "Başlık")}</button>
        <button onClick={() => komut("insertUnorderedList")}>• {t("belListe", "Liste")}</button>
        <button onClick={() => komut("justifyLeft")}>◧</button>
        <button onClick={() => komut("justifyCenter")}>▣</button>
      </div>
      <div className="bel-yazi-alan" ref={icRef} contentEditable suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: (belge && belge.html) || "" }} />
      <div className="bel-alt-dugmeler">
        <button className="muh-btn muh-kaydet" onClick={kaydet}>💾 {t("belKaydet", "Kaydet")}</button>
        <button className="muh-btn muh-pdf" style={{ background: "linear-gradient(90deg,#3f6fd0,#274ea0)" }} onClick={() => { wordIndir(ad || "belge", htmlAl()); bilgi(t("belWordIndi", "Word indirildi 📘")); }}>📘 Word</button>
        <button className="muh-btn muh-pdf" onClick={() => elemPdf(icRef.current, ad || "belge").then(() => bilgi(t("belPdfHazir", "PDF hazır 📄"))).catch(() => bilgi(t("belOlmadi", "Olmadı")))}>📄 PDF</button>
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
