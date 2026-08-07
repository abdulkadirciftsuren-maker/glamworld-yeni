// GLOXORG MUHASEBE — muhasebeci sayfası (Adım 1): müşteri hesapları (borç/tahsilat + bakiye) + Excel/PDF indir & paylaş.
// Kurallar: TÜRKÇE, altın/canlı zemin (⛔ siyah yok), kare düğmeler, hiçbir şey KULLANICI silmeden silinmez (Firebase'de durur).
// Ağır kütüphaneler (xlsx/jspdf/html2canvas) SADECE indirirken dinamik yüklenir → sayfa yavaşlamaz.
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { muhasebeMusterileriDinle, muhasebeMusteriEkle, muhasebeMusteriGuncelle, muhasebeMusteriSil } from "./veri";

const bugunStr = () => { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); };
const trTarih = (s) => { try { const [y, a, g] = (s || "").split("-"); return g && a && y ? `${g}.${a}.${y}` : (s || ""); } catch (e) { return s || ""; } };
const paraYaz = (n, sym) => { const v = Number(n) || 0; return v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + (sym || "₺"); };

export default function Muhasebe({ onKapat, uid, paraSym = "₺", benAd = "", onKatman }) {
  const { t } = useTranslation();
  const [musteriler, setMusteriler] = useState(null); // null=yükleniyor
  const [seciliId, setSeciliId] = useState(null);
  const [yeniMusteriAcik, setYeniMusteriAcik] = useState(false);
  const [mAd, setMAd] = useState(""); const [mTel, setMTel] = useState(""); const [mNot, setMNot] = useState("");
  // kayıt (borç/tahsilat) ekleme formu
  const [kTur, setKTur] = useState("borc"); const [kTutar, setKTutar] = useState(""); const [kAcik, setKAcik] = useState(""); const [kTarih, setKTarih] = useState(bugunStr());
  const [mesaj, setMesaj] = useState("");
  const [islemYok, setIslemYok] = useState(false); // indirme sırasında
  const yazdirRef = useRef(null);

  useEffect(() => {
    if (!uid) { setMusteriler([]); return; }
    const unsub = muhasebeMusterileriDinle(uid, (liste) => setMusteriler(liste));
    return unsub;
  }, [uid]);

  // ANDROID GERİ TUŞU: müşteri açıkken geri → listeye dön (sayfada kal); listedeyken geri → sayfayı kapat (ana sayfa)
  useEffect(() => {
    if (!onKatman) return;
    const derinlik = seciliId ? 2 : 1;
    const geri = () => { if (seciliId) setSeciliId(null); else if (onKapat) onKapat(); };
    onKatman(derinlik, geri);
  }, [seciliId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (onKatman) onKatman(0, null); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const secili = (musteriler || []).find((m) => m.id === seciliId) || null;
  const kayitlar = (secili && Array.isArray(secili.kayitlar)) ? secili.kayitlar : [];
  const toplamBorc = kayitlar.filter((k) => k.tur === "borc").reduce((s, k) => s + (Number(k.tutar) || 0), 0);
  const toplamTahsilat = kayitlar.filter((k) => k.tur === "tahsilat").reduce((s, k) => s + (Number(k.tutar) || 0), 0);
  const kalan = toplamBorc - toplamTahsilat; // >0: müşteri borçlu, <0: fazla ödeme
  const musteriKalan = (m) => { const ks = (m && Array.isArray(m.kayitlar)) ? m.kayitlar : []; return ks.reduce((s, k) => s + (k.tur === "borc" ? 1 : -1) * (Number(k.tutar) || 0), 0); };

  const bilgi = (m) => { setMesaj(m); setTimeout(() => setMesaj(""), 2600); };

  async function musteriEkle() {
    const ad = (mAd || "").trim(); if (!ad) { bilgi(t("muhAdGir", "Müşteri adı yaz")); return; }
    const id = await muhasebeMusteriEkle(uid, { ad, telefon: (mTel || "").trim(), not: (mNot || "").trim() });
    if (id) { setMAd(""); setMTel(""); setMNot(""); setYeniMusteriAcik(false); setSeciliId(id); bilgi(t("muhEklendi", "Müşteri eklendi ✓")); }
    else bilgi(t("muhOlmadi", "Kaydedilemedi, tekrar dener misin?"));
  }
  async function kayitEkle() {
    if (!secili) return;
    const tutar = parseFloat(String(kTutar).replace(",", ".")); if (!tutar || tutar <= 0) { bilgi(t("muhTutarGir", "Tutar yaz")); return; }
    const yeni = { id: "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), tarih: kTarih || bugunStr(), aciklama: (kAcik || "").trim(), tur: kTur, tutar, zamanMs: Date.now() };
    const guncel = [...kayitlar, yeni].sort((a, b) => (a.tarih || "").localeCompare(b.tarih || "") || (a.zamanMs || 0) - (b.zamanMs || 0));
    const ok = await muhasebeMusteriGuncelle(uid, secili.id, { kayitlar: guncel });
    if (ok) { setKTutar(""); setKAcik(""); setKTarih(bugunStr()); bilgi(t("muhKayitEklendi", "Kayıt eklendi ✓")); }
    else bilgi(t("muhOlmadi", "Kaydedilemedi, tekrar dener misin?"));
  }
  async function kayitSil(kid) {
    if (!secili) return;
    if (!window.confirm(t("muhKayitSilSor", "Bu kaydı silmek istediğine emin misin?"))) return;
    const guncel = kayitlar.filter((k) => k.id !== kid);
    await muhasebeMusteriGuncelle(uid, secili.id, { kayitlar: guncel });
    bilgi(t("muhKayitSilindi", "Kayıt silindi"));
  }
  async function musteriSil() {
    if (!secili) return;
    if (!window.confirm(t("muhMusteriSilSor", "Bu müşteriyi ve TÜM kayıtlarını silmek istediğine emin misin? Geri alınamaz."))) return;
    await muhasebeMusteriSil(uid, secili.id); setSeciliId(null); bilgi(t("muhMusteriSilindi", "Müşteri silindi"));
  }

  const dosyaAdi = (uzanti) => "GLOXORG-" + ((secili && secili.ad) || "hesap").replace(/[^\wğüşıöçĞÜŞİÖÇ ]/gi, "").replace(/\s+/g, "-").slice(0, 32) + "-hesap." + uzanti;

  async function excelIndir() {
    if (!secili) return; setIslemYok(true);
    try {
      const XLSX = await import("xlsx");
      const satirlar = [["GLOXORG Muhasebe — " + (secili.ad || "")], [t("muhTel", "Telefon") + ": " + (secili.telefon || "-")], [],
        [t("muhTarih", "Tarih"), t("muhAciklama", "Açıklama"), t("muhBorc", "Borç"), t("muhTahsilat", "Tahsilat")]];
      kayitlar.forEach((k) => satirlar.push([trTarih(k.tarih), k.aciklama || "", k.tur === "borc" ? (Number(k.tutar) || 0) : "", k.tur === "tahsilat" ? (Number(k.tutar) || 0) : ""]));
      satirlar.push([]);
      satirlar.push(["", t("muhToplamBorc", "Toplam Borç"), toplamBorc, ""]);
      satirlar.push(["", t("muhToplamTahsilat", "Toplam Tahsilat"), "", toplamTahsilat]);
      satirlar.push(["", t("muhKalan", "Kalan Bakiye"), "", kalan]);
      const ws = XLSX.utils.aoa_to_sheet(satirlar);
      ws["!cols"] = [{ wch: 12 }, { wch: 34 }, { wch: 14 }, { wch: 14 }];
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Hesap");
      XLSX.writeFile(wb, dosyaAdi("xlsx"));
      bilgi(t("muhExcelIndi", "Excel indirildi 📊"));
    } catch (e) { bilgi(t("muhOlmadi", "Olmadı, tekrar dener misin?")); }
    setIslemYok(false);
  }

  async function pdfYap() {
    const el = yazdirRef.current; if (!el) return null;
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
    const kenar = 24, iw = pw - kenar * 2, ih = canvas.height * iw / canvas.width;
    if (ih <= ph - kenar * 2) { pdf.addImage(img, "PNG", kenar, kenar, iw, ih); }
    else { let hLeft = ih, pos = kenar; pdf.addImage(img, "PNG", kenar, pos, iw, ih); hLeft -= (ph - kenar * 2);
      while (hLeft > 0) { pos = pos - (ph - kenar * 2); pdf.addPage(); pdf.addImage(img, "PNG", kenar, pos, iw, ih); hLeft -= (ph - kenar * 2); } }
    return pdf;
  }
  async function pdfIndir() {
    if (!secili) return; setIslemYok(true);
    try { const pdf = await pdfYap(); if (pdf) { pdf.save(dosyaAdi("pdf")); bilgi(t("muhPdfIndi", "PDF indirildi 📄")); } }
    catch (e) { bilgi(t("muhOlmadi", "Olmadı, tekrar dener misin?")); }
    setIslemYok(false);
  }
  async function pdfPaylas() {
    if (!secili) return; setIslemYok(true);
    try {
      const pdf = await pdfYap(); if (!pdf) { setIslemYok(false); return; }
      const blob = pdf.output("blob"); const dosya = new File([blob], dosyaAdi("pdf"), { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [dosya] })) { await navigator.share({ files: [dosya], title: "GLOXORG Muhasebe" }); }
      else { pdf.save(dosyaAdi("pdf")); bilgi(t("muhPaylasimYok", "Paylaşım yok, indirildi 📄")); }
    } catch (e) { bilgi(t("muhOlmadi", "Olmadı, tekrar dener misin?")); }
    setIslemYok(false);
  }

  // ---------- GÖRÜNÜM ----------
  return (
    <div className="muh-sayfa">
      <div className="muh-ic">
        <div className="muh-bas">📊 <b>{t("muhBaslik", "Muhasebe")}</b></div>

        {!secili ? (
          <>
            <div className="muh-alt">{t("muhAlt", "Müşterilerinin hesabını tut: borç, tahsilat, kalan bakiye. Excel ve PDF olarak indir, paylaş. Hiçbir şey sen silmeden silinmez.")}</div>
            <button className="muh-btn muh-ekle" onClick={() => setYeniMusteriAcik((a) => !a)}>＋ {t("muhYeniMusteri", "Yeni müşteri")}</button>
            {yeniMusteriAcik && (
              <div className="muh-form">
                <input className="muh-inp" value={mAd} onChange={(e) => setMAd(e.target.value)} placeholder={t("muhAd", "Müşteri adı")} />
                <input className="muh-inp" value={mTel} onChange={(e) => setMTel(e.target.value)} placeholder={t("muhTel", "Telefon") + " (" + t("istege", "isteğe bağlı") + ")"} />
                <input className="muh-inp" value={mNot} onChange={(e) => setMNot(e.target.value)} placeholder={t("muhNot", "Not") + " (" + t("istege", "isteğe bağlı") + ")"} />
                <div className="muh-form-dugmeler">
                  <button className="muh-btn muh-kaydet" onClick={musteriEkle}>{t("muhKaydet", "Kaydet")}</button>
                  <button className="muh-btn muh-vazgec" onClick={() => setYeniMusteriAcik(false)}>{t("muhVazgec", "Vazgeç")}</button>
                </div>
              </div>
            )}
            <div className="muh-liste">
              {musteriler === null ? (<div className="muh-bos">⏳ {t("muhYukleniyor", "Yükleniyor…")}</div>)
                : musteriler.length === 0 ? (<div className="muh-bos">💛 {t("muhHicYok", "Henüz müşteri yok. Yukarıdan ekle.")}</div>)
                : musteriler.map((m) => { const k = musteriKalan(m); return (
                  <button key={m.id} className="muh-musteri" onClick={() => setSeciliId(m.id)}>
                    <span className="muh-m-ad notranslate">{m.ad}</span>
                    <span className={"muh-m-bakiye " + (k > 0 ? "borclu" : k < 0 ? "fazla" : "sifir")}>{paraYaz(k, paraSym)}</span>
                    <span className="muh-m-ok">›</span>
                  </button>
                ); })}
            </div>
          </>
        ) : (
          <>
            <button className="muh-geri" onClick={() => setSeciliId(null)}>‹ {t("muhListe", "Müşteriler")}</button>
            <div className="muh-m-bas">
              <div className="muh-m-baslik notranslate">{secili.ad}</div>
              {secili.telefon ? <a className="muh-m-tel" href={"tel:" + secili.telefon}>📞 {secili.telefon}</a> : null}
              {secili.not ? <div className="muh-m-not">📝 {secili.not}</div> : null}
            </div>
            <div className="muh-ozet">
              <div className="muh-ozet-kutu borc"><span>{t("muhToplamBorc", "Toplam Borç")}</span><b>{paraYaz(toplamBorc, paraSym)}</b></div>
              <div className="muh-ozet-kutu tahsilat"><span>{t("muhToplamTahsilat", "Toplam Tahsilat")}</span><b>{paraYaz(toplamTahsilat, paraSym)}</b></div>
              <div className={"muh-ozet-kutu kalan " + (kalan > 0 ? "borclu" : kalan < 0 ? "fazla" : "sifir")}><span>{t("muhKalan", "Kalan Bakiye")}</span><b>{paraYaz(kalan, paraSym)}</b></div>
            </div>

            {/* KAYIT EKLE */}
            <div className="muh-form muh-kayit-form">
              <div className="muh-tur-sec">
                <button className={"muh-tur-btn borc" + (kTur === "borc" ? " aktif" : "")} onClick={() => setKTur("borc")}>➕ {t("muhBorc", "Borç")}</button>
                <button className={"muh-tur-btn tahsilat" + (kTur === "tahsilat" ? " aktif" : "")} onClick={() => setKTur("tahsilat")}>➖ {t("muhTahsilat", "Tahsilat")}</button>
              </div>
              <input className="muh-inp" type="number" inputMode="decimal" value={kTutar} onChange={(e) => setKTutar(e.target.value)} placeholder={t("muhTutar", "Tutar") + " (" + paraSym + ")"} />
              <input className="muh-inp" value={kAcik} onChange={(e) => setKAcik(e.target.value)} placeholder={t("muhAciklama", "Açıklama") + " (" + t("istege", "isteğe bağlı") + ")"} />
              <input className="muh-inp" type="date" value={kTarih} onChange={(e) => setKTarih(e.target.value)} />
              <button className="muh-btn muh-kaydet" onClick={kayitEkle}>{t("muhKayitEkle", "Kaydı ekle")}</button>
            </div>

            {/* KAYIT LİSTESİ */}
            <div className="muh-kayit-liste">
              {kayitlar.length === 0 ? (<div className="muh-bos">💛 {t("muhKayitYok", "Henüz kayıt yok. Yukarıdan borç ya da tahsilat ekle.")}</div>)
                : [...kayitlar].reverse().map((k) => (
                  <div key={k.id} className={"muh-kayit " + k.tur}>
                    <span className="muh-k-tarih">{trTarih(k.tarih)}</span>
                    <span className="muh-k-acik">{k.aciklama || (k.tur === "borc" ? t("muhBorc", "Borç") : t("muhTahsilat", "Tahsilat"))}</span>
                    <span className={"muh-k-tutar " + k.tur}>{k.tur === "borc" ? "+" : "−"}{paraYaz(k.tutar, paraSym)}</span>
                    <button className="muh-k-sil" onClick={() => kayitSil(k.id)} aria-label={t("sil", "Sil")}>🗑️</button>
                  </div>
                ))}
            </div>

            {/* İNDİR / PAYLAŞ */}
            <div className="muh-indir-satir">
              <button className="muh-btn muh-excel" disabled={islemYok} onClick={excelIndir}>📊 {t("muhExcel", "Excel indir")}</button>
              <button className="muh-btn muh-pdf" disabled={islemYok} onClick={pdfIndir}>📄 {t("muhPdf", "PDF indir")}</button>
              <button className="muh-btn muh-paylas" disabled={islemYok} onClick={pdfPaylas}>↗ {t("muhPaylas", "Paylaş")}</button>
            </div>
            {islemYok && <div className="muh-bos">⏳ {t("muhHazirlaniyor", "Hazırlanıyor…")}</div>}
            <button className="muh-btn muh-musteri-sil" onClick={musteriSil}>🗑️ {t("muhMusteriSil", "Bu müşteriyi sil")}</button>
          </>
        )}

        {mesaj && <div className="muh-toast">{mesaj}</div>}
      </div>

      {/* GİZLİ YAZDIRILACAK ALAN (PDF için — Türkçe harfler tarayıcı çizdiği için DOĞRU çıkar) */}
      {secili && (
        <div ref={yazdirRef} className="muh-yazdir" aria-hidden="true">
          <div className="muy-bas">GLOXORG — {t("muhBaslik", "Muhasebe")}</div>
          <div className="muy-musteri"><b>{secili.ad}</b>{secili.telefon ? " · " + secili.telefon : ""}</div>
          {secili.not ? <div className="muy-not">{secili.not}</div> : null}
          <table className="muy-tablo">
            <thead><tr><th>{t("muhTarih", "Tarih")}</th><th>{t("muhAciklama", "Açıklama")}</th><th>{t("muhBorc", "Borç")}</th><th>{t("muhTahsilat", "Tahsilat")}</th></tr></thead>
            <tbody>
              {kayitlar.map((k) => (
                <tr key={k.id}>
                  <td>{trTarih(k.tarih)}</td>
                  <td>{k.aciklama || ""}</td>
                  <td className="say">{k.tur === "borc" ? paraYaz(k.tutar, paraSym) : ""}</td>
                  <td className="say">{k.tur === "tahsilat" ? paraYaz(k.tutar, paraSym) : ""}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan="2">{t("muhToplamBorc", "Toplam Borç")}</td><td className="say">{paraYaz(toplamBorc, paraSym)}</td><td></td></tr>
              <tr><td colSpan="2">{t("muhToplamTahsilat", "Toplam Tahsilat")}</td><td></td><td className="say">{paraYaz(toplamTahsilat, paraSym)}</td></tr>
              <tr className="muy-kalan"><td colSpan="2">{t("muhKalan", "Kalan Bakiye")}</td><td colSpan="2" className="say">{paraYaz(kalan, paraSym)}</td></tr>
            </tfoot>
          </table>
          <div className="muy-dip">GLOXORG · {benAd || ""} · {trTarih(bugunStr())}</div>
        </div>
      )}
    </div>
  );
}
