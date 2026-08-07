// GLOXORG MUHASEBE — çok bölümlü muhasebeci sayfası: Müşteriler(cari) · Stok(depo) · Alış-Satış · Kasa · Çöp kutusu.
// Kurallar: TÜRKÇE, altın/canlı zemin (⛔ siyah yok), kare düğmeler. SİLME ⋮ (üç nokta) menüsünde (yanlış basılmasın);
// silinen ÇÖP KUTUSUNA gider, ~30 gün saklanır, geri yüklenebilir, sonra kalıcı silinir. Hiçbir şey KULLANICI silmeden gitmez.
// Ağır kütüphaneler (xlsx/jspdf/html2canvas) SADECE indirirken dinamik yüklenir → sayfa yavaşlamaz. Firebase'de saklanır.
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { muhasebeDinle, muhasebeEkle, muhasebeGuncelle, muhasebeCopeAt, muhasebeGeriYukle, muhasebeKaliciSil, MUH_COP_GUN } from "./veri";

const bugunStr = () => { const d = new Date(); const p = (n) => String(n).padStart(2, "0"); return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); };
const trTarih = (s) => { try { const [y, a, g] = (s || "").split("-"); return g && a && y ? `${g}.${a}.${y}` : (s || ""); } catch (e) { return s || ""; } };
const sayi = (n) => Number(String(n).replace(",", ".")) || 0;
const para = (n, sym) => (Number(n) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + (sym || "₺");
const mik = (n, birim) => (Number(n) || 0).toLocaleString("tr-TR", { maximumFractionDigits: 3 }) + (birim ? " " + birim : "");

export default function Muhasebe({ onKapat, uid, paraSym = "₺", benAd = "", onKatman }) {
  const { t } = useTranslation();
  const [kayitlar, setKayitlar] = useState(null); // TÜM muhasebe dokümanları (null=yükleniyor)
  const [sekme, setSekme] = useState("cari"); // cari | stok | islem | kasa | cop
  const [seciliId, setSeciliId] = useState(null); // açık cari/stok detay id
  const [menuId, setMenuId] = useState(null); // ⋮ menüsü açık olan kart id
  const [form, setForm] = useState(null); // açık form: {tur:...}
  const [mesaj, setMesaj] = useState(""); const [islemYok, setIslemYok] = useState(false);
  const yazdirRef = useRef(null); const [yazdirData, setYazdirData] = useState(null);

  useEffect(() => {
    if (!uid) { setKayitlar([]); return; }
    const unsub = muhasebeDinle(uid, (liste) => setKayitlar(liste));
    return unsub;
  }, [uid]);

  // ÇÖP KUTUSU otomatik temizlik: 30 günü geçmiş silinenleri KALICI sil (kullanıcı zaten silmişti, süre doldu)
  useEffect(() => {
    if (!kayitlar || !uid) return;
    const sinir = Date.now() - MUH_COP_GUN * 24 * 60 * 60 * 1000;
    kayitlar.forEach((k) => { if (k.silindi && k.silinmeMs && k.silinmeMs < sinir) { muhasebeKaliciSil(uid, k.id); } });
  }, [kayitlar, uid]);

  // Geri tuşu: detay açıksa → listeye dön; değilse → sayfayı kapat (ana sayfa)
  useEffect(() => {
    if (!onKatman) return;
    const geri = () => { if (menuId) setMenuId(null); else if (form) setForm(null); else if (seciliId) setSeciliId(null); else if (onKapat) onKapat(); };
    onKatman((menuId || form || seciliId) ? 2 : 1, geri);
  }, [seciliId, form, menuId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (onKatman) onKatman(0, null); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const bilgi = (m) => { setMesaj(m); setTimeout(() => setMesaj(""), 2600); };
  const hepsi = kayitlar || [];
  const aktif = (tip) => hepsi.filter((k) => k.tip === tip && !k.silindi);
  const cariler = aktif("cari"), stoklar = aktif("stok"), islemler = aktif("islem"), kasalar = aktif("kasa");
  const cop = hepsi.filter((k) => k.silindi).sort((a, b) => (b.silinmeMs || 0) - (a.silinmeMs || 0));

  // Cari bakiye = borç/satış toplamı − tahsilat toplamı (o cariye bağlı işlemler)
  const cariBakiye = (cid) => islemler.filter((i) => i.cariId === cid).reduce((s, i) =>
    s + ((i.islemTuru === "borc" || i.islemTuru === "satis") ? sayi(i.tutar) : (i.islemTuru === "tahsilat") ? -sayi(i.tutar) : 0), 0);
  // Stok miktarı = giriş/alış − çıkış/satış
  const stokMiktar = (sid) => islemler.filter((i) => i.stokId === sid).reduce((s, i) =>
    s + ((i.islemTuru === "giris" || i.islemTuru === "alis") ? sayi(i.miktar) : (i.islemTuru === "cikis" || i.islemTuru === "satis") ? -sayi(i.miktar) : 0), 0);
  const kasaBakiye = kasalar.reduce((s, k) => s + (k.kasaTuru === "gelir" ? sayi(k.tutar) : -sayi(k.tutar)), 0);

  // ---- EKLE / SİL yardımcıları ----
  async function ekle(veri) { const id = await muhasebeEkle(uid, veri); if (!id) bilgi(t("muhOlmadi", "Olmadı, tekrar dener misin?")); return id; }
  async function copeAt(id) { setMenuId(null); await muhasebeCopeAt(uid, id); if (seciliId === id) setSeciliId(null); bilgi(t("muhCopeGitti", "Çöp kutusuna gönderildi 🗑️")); }
  async function geriYukle(id) { await muhasebeGeriYukle(uid, id); bilgi(t("muhGeriYuklendi", "Geri yüklendi ✓")); }
  async function kaliciSil(id) { if (!window.confirm(t("muhKaliciSor", "KALICI silinsin mi? Bu geri alınamaz."))) return; await muhasebeKaliciSil(uid, id); bilgi(t("muhKaliciSilindi", "Kalıcı silindi")); }

  // ---- DIŞA AKTAR (Excel / PDF) ----
  async function excelYaz(baslik, basliklar, satirlar, altToplam) {
    setIslemYok(true);
    try {
      const XLSX = await import("xlsx");
      const aoa = [[baslik], [], basliklar, ...satirlar];
      if (altToplam) { aoa.push([]); altToplam.forEach((r) => aoa.push(r)); }
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = basliklar.map(() => ({ wch: 18 }));
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Muhasebe");
      XLSX.writeFile(wb, ("GLOXORG-" + baslik).replace(/[^\wğüşıöçĞÜŞİÖÇ ]/gi, "").replace(/\s+/g, "-").slice(0, 40) + ".xlsx");
      bilgi(t("muhExcelIndi", "Excel indirildi 📊"));
    } catch (e) { bilgi(t("muhOlmadi", "Olmadı, tekrar dener misin?")); }
    setIslemYok(false);
  }
  async function pdfYaz(data) {
    setYazdirData(data);
    setIslemYok(true);
    await new Promise((r) => setTimeout(r, 60)); // yazdır alanı render olsun
    try {
      const el = yazdirRef.current; if (!el) throw new Error("no el");
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
      const ad = ("GLOXORG-" + (data.baslik || "muhasebe")).replace(/[^\wğüşıöçĞÜŞİÖÇ ]/gi, "").replace(/\s+/g, "-").slice(0, 40) + ".pdf";
      const blob = pdf.output("blob"); const dosya = new File([blob], ad, { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [dosya] })) { try { await navigator.share({ files: [dosya], title: "GLOXORG Muhasebe" }); } catch (e) { pdf.save(ad); } }
      else pdf.save(ad);
      bilgi(t("muhPdfHazir", "PDF hazır 📄"));
    } catch (e) { bilgi(t("muhOlmadi", "Olmadı, tekrar dener misin?")); }
    setYazdirData(null); setIslemYok(false);
  }

  // ⋮ MENÜ bileşeni (Sil)
  const UcNokta = ({ id }) => (
    <span className="muh-uc-sar">
      <button className="muh-uc" onClick={(e) => { e.stopPropagation(); setMenuId(menuId === id ? null : id); }} aria-label={t("muhMenu", "Menü")}>⋮</button>
      {menuId === id && (
        <span className="muh-uc-menu" onClick={(e) => e.stopPropagation()}>
          <button className="muh-uc-sil" onClick={() => copeAt(id)}>🗑️ {t("sil", "Sil")}</button>
        </span>
      )}
    </span>
  );

  const kalanGun = (silinmeMs) => Math.max(0, MUH_COP_GUN - Math.floor((Date.now() - (silinmeMs || Date.now())) / (24 * 60 * 60 * 1000)));
  const tipAd = (k) => k.tip === "cari" ? t("muhMusteri", "Müşteri") : k.tip === "stok" ? t("muhUrun", "Ürün") : k.tip === "islem" ? t("muhIslemK", "İşlem") : t("muhKasaK", "Kasa");
  const copOzet = (k) => k.tip === "cari" ? k.ad : k.tip === "stok" ? k.ad : k.tip === "islem" ? ((k.islemTuru || "") + " · " + para(k.tutar, paraSym)) : ((k.kasaTuru || "") + " · " + para(k.tutar, paraSym));

  // ================= GÖRÜNÜM =================
  const sekmeler = [["cari", "👥", t("muhMusteriler", "Müşteriler")], ["stok", "📦", t("muhStok", "Stok")], ["islem", "🔄", t("muhAlisSatis", "Alış-Satış")], ["kasa", "💰", t("muhKasa", "Kasa")], ["cop", "🗑️", t("muhCop", "Çöp")]];
  const seciliCari = cariler.find((c) => c.id === seciliId) || null;
  const seciliStok = stoklar.find((s) => s.id === seciliId) || null;

  return (
    <div className="muh-sayfa" onClick={() => menuId && setMenuId(null)}>
      <div className="muh-ic">
        <div className="muh-bas">📊 <b>{t("muhBaslik", "Muhasebe")}</b></div>

        {/* SEKME ŞERİDİ */}
        <div className="muh-sekmeler">
          {sekmeler.map(([k, ik, et]) => (
            <button key={k} className={"muh-sekme" + (sekme === k ? " aktif" : "")} onClick={() => { setSekme(k); setSeciliId(null); setForm(null); }}>
              <span className="muh-sekme-ik">{ik}</span><span className="muh-sekme-ad">{et}</span>
              {k === "cop" && cop.length > 0 && <span className="muh-sekme-rozet">{cop.length}</span>}
            </button>
          ))}
        </div>

        {kayitlar === null ? <div className="muh-bos">⏳ {t("muhYukleniyor", "Yükleniyor…")}</div> : (
          <>
            {/* ============ MÜŞTERİLER (CARİ) ============ */}
            {sekme === "cari" && !seciliCari && (<>
              <button className="muh-btn muh-ekle" onClick={() => setForm(form === "cari" ? null : "cari")}>＋ {t("muhYeniMusteri", "Yeni müşteri / tedarikçi")}</button>
              {form === "cari" && <CariForm t={t} onKaydet={async (v) => { const id = await ekle({ tip: "cari", ...v }); if (id) { setForm(null); setSeciliId(id); bilgi(t("muhEklendi", "Eklendi ✓")); } }} onVazgec={() => setForm(null)} />}
              <div className="muh-liste">
                {cariler.length === 0 ? <div className="muh-bos">💛 {t("muhHicMusteri", "Henüz müşteri yok. Yukarıdan ekle.")}</div>
                  : cariler.map((c) => { const b = cariBakiye(c.id); return (
                    <div key={c.id} className="muh-satir" onClick={() => setSeciliId(c.id)}>
                      <span className="muh-s-ad notranslate">{c.ad}{c.rol === "tedarikci" ? " · " + t("muhTedarikci", "Tedarikçi") : ""}</span>
                      <span className={"muh-s-tutar " + (b > 0 ? "kirmizi" : b < 0 ? "yesil" : "gri")}>{para(b, paraSym)}</span>
                      <UcNokta id={c.id} /><span className="muh-s-ok">›</span>
                    </div>
                  ); })}
              </div>
            </>)}

            {/* CARİ DETAY */}
            {sekme === "cari" && seciliCari && (() => {
              const kayit = islemler.filter((i) => i.cariId === seciliCari.id).sort((a, b) => (a.tarih || "").localeCompare(b.tarih || "") || (a.zamanMs || 0) - (b.zamanMs || 0));
              const tBorc = kayit.filter((i) => i.islemTuru === "borc" || i.islemTuru === "satis").reduce((s, i) => s + sayi(i.tutar), 0);
              const tTah = kayit.filter((i) => i.islemTuru === "tahsilat").reduce((s, i) => s + sayi(i.tutar), 0);
              const bak = tBorc - tTah;
              return (<>
                <button className="muh-geri" onClick={() => setSeciliId(null)}>‹ {t("muhMusteriler", "Müşteriler")}</button>
                <div className="muh-m-baslik notranslate">{seciliCari.ad}</div>
                {seciliCari.tel ? <a className="muh-m-tel" href={"tel:" + seciliCari.tel}>📞 {seciliCari.tel}</a> : null}
                {seciliCari.not ? <div className="muh-m-not">📝 {seciliCari.not}</div> : null}
                <div className="muh-ozet">
                  <div className="muh-ozet-kutu borc"><span>{t("muhToplamBorc", "Toplam Borç")}</span><b>{para(tBorc, paraSym)}</b></div>
                  <div className="muh-ozet-kutu tahsilat"><span>{t("muhToplamTahsilat", "Tahsilat")}</span><b>{para(tTah, paraSym)}</b></div>
                  <div className={"muh-ozet-kutu kalan " + (bak > 0 ? "borclu" : bak < 0 ? "fazla" : "sifir")}><span>{t("muhKalan", "Kalan")}</span><b>{para(bak, paraSym)}</b></div>
                </div>
                <KayitForm t={t} paraSym={paraSym} onKaydet={async (v) => { await ekle({ tip: "islem", cariId: seciliCari.id, ...v }); bilgi(t("muhKayitEklendi", "Eklendi ✓")); }} />
                <div className="muh-kayit-liste">
                  {kayit.length === 0 ? <div className="muh-bos">💛 {t("muhKayitYok", "Kayıt yok. Borç ya da tahsilat ekle.")}</div>
                    : [...kayit].reverse().map((i) => { const borc = i.islemTuru === "borc" || i.islemTuru === "satis"; return (
                      <div key={i.id} className={"muh-kayit " + (borc ? "borc" : "tahsilat")}>
                        <span className="muh-k-tarih">{trTarih(i.tarih)}</span>
                        <span className="muh-k-acik">{i.aciklama || (borc ? t("muhBorc", "Borç") : t("muhTahsilat", "Tahsilat"))}</span>
                        <span className={"muh-k-tutar " + (borc ? "borc" : "tahsilat")}>{borc ? "+" : "−"}{para(i.tutar, paraSym)}</span>
                        <UcNokta id={i.id} />
                      </div>
                    ); })}
                </div>
                <div className="muh-indir-satir">
                  <button className="muh-btn muh-excel" disabled={islemYok} onClick={() => excelYaz(seciliCari.ad + " hesap", [t("muhTarih", "Tarih"), t("muhAciklama", "Açıklama"), t("muhBorc", "Borç"), t("muhTahsilat", "Tahsilat")],
                    kayit.map((i) => [trTarih(i.tarih), i.aciklama || "", (i.islemTuru === "tahsilat" ? "" : sayi(i.tutar)), (i.islemTuru === "tahsilat" ? sayi(i.tutar) : "")]),
                    [["", t("muhKalan", "Kalan"), "", bak]])}>📊 {t("muhExcel", "Excel")}</button>
                  <button className="muh-btn muh-pdf" disabled={islemYok} onClick={() => pdfYaz({ baslik: seciliCari.ad + " hesap", cari: seciliCari, satirlar: kayit, tBorc, tTah, bak })}>📄 {t("muhPdfPaylas", "PDF / Paylaş")}</button>
                </div>
              </>);
            })()}

            {/* ============ STOK (DEPO) ============ */}
            {sekme === "stok" && !seciliStok && (<>
              <button className="muh-btn muh-ekle" onClick={() => setForm(form === "stok" ? null : "stok")}>＋ {t("muhYeniUrun", "Yeni ürün")}</button>
              {form === "stok" && <StokForm t={t} paraSym={paraSym} onKaydet={async (v) => { const id = await ekle({ tip: "stok", ...v }); if (id) { setForm(null); setSeciliId(id); bilgi(t("muhEklendi", "Eklendi ✓")); } }} onVazgec={() => setForm(null)} />}
              <div className="muh-liste">
                {stoklar.length === 0 ? <div className="muh-bos">💛 {t("muhHicUrun", "Henüz ürün yok. Yukarıdan ekle.")}</div>
                  : stoklar.map((s) => { const m = stokMiktar(s.id); return (
                    <div key={s.id} className="muh-satir" onClick={() => setSeciliId(s.id)}>
                      <span className="muh-s-ad notranslate">{s.ad}</span>
                      <span className={"muh-s-tutar " + (m > 0 ? "yesil" : m < 0 ? "kirmizi" : "gri")}>{mik(m, s.birim)}</span>
                      <UcNokta id={s.id} /><span className="muh-s-ok">›</span>
                    </div>
                  ); })}
              </div>
            </>)}

            {/* STOK DETAY */}
            {sekme === "stok" && seciliStok && (() => {
              const har = islemler.filter((i) => i.stokId === seciliStok.id).sort((a, b) => (a.tarih || "").localeCompare(b.tarih || "") || (a.zamanMs || 0) - (b.zamanMs || 0));
              const m = stokMiktar(seciliStok.id);
              return (<>
                <button className="muh-geri" onClick={() => setSeciliId(null)}>‹ {t("muhStok", "Stok")}</button>
                <div className="muh-m-baslik notranslate">{seciliStok.ad}</div>
                <div className="muh-m-not">{t("muhAlisF", "Alış")}: {para(seciliStok.alisF, paraSym)} · {t("muhSatisF", "Satış")}: {para(seciliStok.satisF, paraSym)}</div>
                <div className="muh-ozet">
                  <div className={"muh-ozet-kutu kalan " + (m > 0 ? "fazla" : m < 0 ? "borclu" : "sifir")}><span>{t("muhKalanStok", "Kalan Stok")}</span><b>{mik(m, seciliStok.birim)}</b></div>
                </div>
                <HareketForm t={t} birim={seciliStok.birim} onKaydet={async (v) => { await ekle({ tip: "islem", stokId: seciliStok.id, ...v }); bilgi(t("muhKayitEklendi", "Eklendi ✓")); }} />
                <div className="muh-kayit-liste">
                  {har.length === 0 ? <div className="muh-bos">💛 {t("muhHareketYok", "Hareket yok. Giriş ya da çıkış ekle.")}</div>
                    : [...har].reverse().map((i) => { const giris = i.islemTuru === "giris" || i.islemTuru === "alis"; return (
                      <div key={i.id} className={"muh-kayit " + (giris ? "tahsilat" : "borc")}>
                        <span className="muh-k-tarih">{trTarih(i.tarih)}</span>
                        <span className="muh-k-acik">{i.aciklama || (giris ? t("muhGiris", "Giriş") : t("muhCikis", "Çıkış"))}</span>
                        <span className={"muh-k-tutar " + (giris ? "tahsilat" : "borc")}>{giris ? "+" : "−"}{mik(i.miktar, seciliStok.birim)}</span>
                        <UcNokta id={i.id} />
                      </div>
                    ); })}
                </div>
                <div className="muh-indir-satir">
                  <button className="muh-btn muh-excel" disabled={islemYok} onClick={() => excelYaz(seciliStok.ad + " stok", [t("muhTarih", "Tarih"), t("muhAciklama", "Açıklama"), t("muhGiris", "Giriş"), t("muhCikis", "Çıkış")],
                    har.map((i) => { const g = i.islemTuru === "giris" || i.islemTuru === "alis"; return [trTarih(i.tarih), i.aciklama || "", g ? sayi(i.miktar) : "", g ? "" : sayi(i.miktar)]; }),
                    [["", t("muhKalanStok", "Kalan Stok"), "", m]])}>📊 {t("muhExcel", "Excel")}</button>
                </div>
              </>);
            })()}

            {/* ============ ALIŞ-SATIŞ ============ */}
            {sekme === "islem" && (<>
              <button className="muh-btn muh-ekle" onClick={() => setForm(form === "islem" ? null : "islem")}>＋ {t("muhYeniIslem", "Yeni alış / satış")}</button>
              {form === "islem" && <IslemForm t={t} paraSym={paraSym} cariler={cariler} stoklar={stoklar} onKaydet={async (v) => { await ekle({ tip: "islem", ...v }); setForm(null); bilgi(t("muhKayitEklendi", "İşlem eklendi ✓")); }} onVazgec={() => setForm(null)} />}
              <div className="muh-kayit-liste">
                {islemler.filter((i) => i.islemTuru === "alis" || i.islemTuru === "satis").length === 0 ? <div className="muh-bos">💛 {t("muhIslemYok", "Henüz alış-satış yok.")}</div>
                  : [...islemler.filter((i) => i.islemTuru === "alis" || i.islemTuru === "satis")].sort((a, b) => (b.tarih || "").localeCompare(a.tarih || "")).map((i) => { const satis = i.islemTuru === "satis"; const c = cariler.find((x) => x.id === i.cariId); const s = stoklar.find((x) => x.id === i.stokId); return (
                    <div key={i.id} className={"muh-kayit " + (satis ? "tahsilat" : "borc")}>
                      <span className="muh-k-tarih">{trTarih(i.tarih)}</span>
                      <span className="muh-k-acik">{(satis ? "🔺 " + t("muhSatis", "Satış") : "🔻 " + t("muhAlis", "Alış")) + (s ? " · " + s.ad + (i.miktar ? " ×" + mik(i.miktar) : "") : "") + (c ? " · " + c.ad : "")}</span>
                      <span className={"muh-k-tutar " + (satis ? "tahsilat" : "borc")}>{para(i.tutar, paraSym)}</span>
                      <UcNokta id={i.id} />
                    </div>
                  ); })}
              </div>
            </>)}

            {/* ============ KASA (GELİR-GİDER) ============ */}
            {sekme === "kasa" && (<>
              <div className="muh-ozet">
                <div className="muh-ozet-kutu tahsilat"><span>{t("muhGelir", "Gelir")}</span><b>{para(kasalar.filter((k) => k.kasaTuru === "gelir").reduce((s, k) => s + sayi(k.tutar), 0), paraSym)}</b></div>
                <div className="muh-ozet-kutu borc"><span>{t("muhGider", "Gider")}</span><b>{para(kasalar.filter((k) => k.kasaTuru === "gider").reduce((s, k) => s + sayi(k.tutar), 0), paraSym)}</b></div>
                <div className={"muh-ozet-kutu kalan " + (kasaBakiye >= 0 ? "fazla" : "borclu")}><span>{t("muhKasaBakiye", "Kasa")}</span><b>{para(kasaBakiye, paraSym)}</b></div>
              </div>
              <button className="muh-btn muh-ekle" onClick={() => setForm(form === "kasa" ? null : "kasa")}>＋ {t("muhYeniKasa", "Gelir / gider ekle")}</button>
              {form === "kasa" && <KasaForm t={t} paraSym={paraSym} onKaydet={async (v) => { await ekle({ tip: "kasa", ...v }); setForm(null); bilgi(t("muhKayitEklendi", "Eklendi ✓")); }} onVazgec={() => setForm(null)} />}
              <div className="muh-kayit-liste">
                {kasalar.length === 0 ? <div className="muh-bos">💛 {t("muhKasaYok", "Henüz kasa hareketi yok.")}</div>
                  : [...kasalar].sort((a, b) => (b.tarih || "").localeCompare(a.tarih || "")).map((k) => { const gelir = k.kasaTuru === "gelir"; return (
                    <div key={k.id} className={"muh-kayit " + (gelir ? "tahsilat" : "borc")}>
                      <span className="muh-k-tarih">{trTarih(k.tarih)}</span>
                      <span className="muh-k-acik">{(k.aciklama || (gelir ? t("muhGelir", "Gelir") : t("muhGider", "Gider"))) + (k.yontem ? " · " + (k.yontem === "banka" ? t("muhBanka", "Banka") : t("muhNakit", "Nakit")) : "")}</span>
                      <span className={"muh-k-tutar " + (gelir ? "tahsilat" : "borc")}>{gelir ? "+" : "−"}{para(k.tutar, paraSym)}</span>
                      <UcNokta id={k.id} />
                    </div>
                  ); })}
              </div>
              {kasalar.length > 0 && <div className="muh-indir-satir"><button className="muh-btn muh-excel" disabled={islemYok} onClick={() => excelYaz("Kasa", [t("muhTarih", "Tarih"), t("muhAciklama", "Açıklama"), t("muhGelir", "Gelir"), t("muhGider", "Gider")],
                [...kasalar].sort((a, b) => (a.tarih || "").localeCompare(b.tarih || "")).map((k) => [trTarih(k.tarih), k.aciklama || "", k.kasaTuru === "gelir" ? sayi(k.tutar) : "", k.kasaTuru === "gider" ? sayi(k.tutar) : ""]),
                [["", t("muhKasaBakiye", "Kasa"), "", kasaBakiye]])}>📊 {t("muhExcel", "Excel")}</button></div>}
            </>)}

            {/* ============ ÇÖP KUTUSU ============ */}
            {sekme === "cop" && (<>
              <div className="muh-alt">{t("muhCopAlt", "Sildiklerin burada ~30 gün saklanır. Geri yükleyebilir ya da hemen kalıcı silebilirsin. Süre dolunca kendiliğinden silinir.")}</div>
              <div className="muh-kayit-liste">
                {cop.length === 0 ? <div className="muh-bos">💛 {t("muhCopBos", "Çöp kutusu boş.")}</div>
                  : cop.map((k) => (
                    <div key={k.id} className="muh-cop-satir">
                      <span className="muh-cop-tip">{tipAd(k)}</span>
                      <span className="muh-cop-ozet notranslate">{copOzet(k)}</span>
                      <span className="muh-cop-gun">{kalanGun(k.silinmeMs)} {t("muhGun", "gün")}</span>
                      <button className="muh-cop-geri" onClick={() => geriYukle(k.id)}>↩ {t("muhGeriYukle", "Geri")}</button>
                      <button className="muh-cop-sil" onClick={() => kaliciSil(k.id)}>✕</button>
                    </div>
                  ))}
              </div>
            </>)}
          </>
        )}

        {mesaj && <div className="muh-toast">{mesaj}</div>}
        {islemYok && <div className="muh-toast">⏳ {t("muhHazirlaniyor", "Hazırlanıyor…")}</div>}
      </div>

      {/* GİZLİ PDF YAZDIRMA ALANI (Türkçe harfler doğru çıksın diye tarayıcı çizer) */}
      {yazdirData && (
        <div ref={yazdirRef} className="muh-yazdir" aria-hidden="true">
          <div className="muy-bas">GLOXORG — {t("muhBaslik", "Muhasebe")}</div>
          {yazdirData.cari && (<>
            <div className="muy-musteri"><b>{yazdirData.cari.ad}</b>{yazdirData.cari.tel ? " · " + yazdirData.cari.tel : ""}</div>
            <table className="muy-tablo"><thead><tr><th>{t("muhTarih", "Tarih")}</th><th>{t("muhAciklama", "Açıklama")}</th><th>{t("muhBorc", "Borç")}</th><th>{t("muhTahsilat", "Tahsilat")}</th></tr></thead>
              <tbody>{yazdirData.satirlar.map((i) => { const borc = i.islemTuru === "borc" || i.islemTuru === "satis"; return (
                <tr key={i.id}><td>{trTarih(i.tarih)}</td><td>{i.aciklama || ""}</td><td className="say">{borc ? para(i.tutar, paraSym) : ""}</td><td className="say">{borc ? "" : para(i.tutar, paraSym)}</td></tr>); })}</tbody>
              <tfoot>
                <tr><td colSpan="2">{t("muhToplamBorc", "Toplam Borç")}</td><td className="say">{para(yazdirData.tBorc, paraSym)}</td><td></td></tr>
                <tr><td colSpan="2">{t("muhToplamTahsilat", "Tahsilat")}</td><td></td><td className="say">{para(yazdirData.tTah, paraSym)}</td></tr>
                <tr className="muy-kalan"><td colSpan="2">{t("muhKalan", "Kalan")}</td><td colSpan="2" className="say">{para(yazdirData.bak, paraSym)}</td></tr>
              </tfoot>
            </table>
          </>)}
          <div className="muy-dip">GLOXORG · {benAd || ""} · {trTarih(bugunStr())}</div>
        </div>
      )}
    </div>
  );
}

// ---------- FORMLAR ----------
function CariForm({ t, onKaydet, onVazgec }) {
  const [ad, setAd] = useState(""); const [tel, setTel] = useState(""); const [not, setNot] = useState(""); const [rol, setRol] = useState("musteri");
  return (
    <div className="muh-form">
      <input className="muh-inp" value={ad} onChange={(e) => setAd(e.target.value)} placeholder={t("muhAd", "Ad")} />
      <div className="muh-tur-sec">
        <button className={"muh-tur-btn" + (rol === "musteri" ? " aktif tahsilat" : "")} onClick={() => setRol("musteri")}>👤 {t("muhMusteri", "Müşteri")}</button>
        <button className={"muh-tur-btn" + (rol === "tedarikci" ? " aktif borc" : "")} onClick={() => setRol("tedarikci")}>🏭 {t("muhTedarikci", "Tedarikçi")}</button>
      </div>
      <input className="muh-inp" value={tel} onChange={(e) => setTel(e.target.value)} placeholder={t("muhTel", "Telefon") + " (" + t("istege", "isteğe bağlı") + ")"} />
      <input className="muh-inp" value={not} onChange={(e) => setNot(e.target.value)} placeholder={t("muhNot", "Not") + " (" + t("istege", "isteğe bağlı") + ")"} />
      <div className="muh-form-dugmeler">
        <button className="muh-btn muh-kaydet" onClick={() => { if (!ad.trim()) return; onKaydet({ ad: ad.trim(), tel: tel.trim(), not: not.trim(), rol }); }}>{t("muhKaydet", "Kaydet")}</button>
        <button className="muh-btn muh-vazgec" onClick={onVazgec}>{t("muhVazgec", "Vazgeç")}</button>
      </div>
    </div>
  );
}
function KayitForm({ t, paraSym, onKaydet }) {
  const [tur, setTur] = useState("borc"); const [tutar, setTutar] = useState(""); const [acik, setAcik] = useState(""); const [tarih, setTarih] = useState(bugunStr());
  return (
    <div className="muh-form muh-kayit-form">
      <div className="muh-tur-sec">
        <button className={"muh-tur-btn borc" + (tur === "borc" ? " aktif" : "")} onClick={() => setTur("borc")}>➕ {t("muhBorc", "Borç")}</button>
        <button className={"muh-tur-btn tahsilat" + (tur === "tahsilat" ? " aktif" : "")} onClick={() => setTur("tahsilat")}>➖ {t("muhTahsilat", "Tahsilat")}</button>
      </div>
      <input className="muh-inp" type="number" inputMode="decimal" value={tutar} onChange={(e) => setTutar(e.target.value)} placeholder={t("muhTutar", "Tutar") + " (" + paraSym + ")"} />
      <input className="muh-inp" value={acik} onChange={(e) => setAcik(e.target.value)} placeholder={t("muhAciklama", "Açıklama") + " (" + t("istege", "isteğe bağlı") + ")"} />
      <input className="muh-inp" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
      <button className="muh-btn muh-kaydet" onClick={() => { const v = Number(String(tutar).replace(",", ".")); if (!v || v <= 0) return; onKaydet({ islemTuru: tur, tutar: v, aciklama: acik.trim(), tarih: tarih || bugunStr() }); setTutar(""); setAcik(""); setTarih(bugunStr()); }}>{t("muhKayitEkle", "Ekle")}</button>
    </div>
  );
}
function StokForm({ t, paraSym, onKaydet, onVazgec }) {
  const [ad, setAd] = useState(""); const [birim, setBirim] = useState("adet"); const [alisF, setAlisF] = useState(""); const [satisF, setSatisF] = useState("");
  return (
    <div className="muh-form">
      <input className="muh-inp" value={ad} onChange={(e) => setAd(e.target.value)} placeholder={t("muhUrunAd", "Ürün adı")} />
      <input className="muh-inp" value={birim} onChange={(e) => setBirim(e.target.value)} placeholder={t("muhBirim", "Birim (adet, kg, m…)")} />
      <input className="muh-inp" type="number" inputMode="decimal" value={alisF} onChange={(e) => setAlisF(e.target.value)} placeholder={t("muhAlisF", "Alış fiyatı") + " (" + paraSym + ")"} />
      <input className="muh-inp" type="number" inputMode="decimal" value={satisF} onChange={(e) => setSatisF(e.target.value)} placeholder={t("muhSatisF", "Satış fiyatı") + " (" + paraSym + ")"} />
      <div className="muh-form-dugmeler">
        <button className="muh-btn muh-kaydet" onClick={() => { if (!ad.trim()) return; onKaydet({ ad: ad.trim(), birim: birim.trim() || "adet", alisF: Number(String(alisF).replace(",", ".")) || 0, satisF: Number(String(satisF).replace(",", ".")) || 0 }); }}>{t("muhKaydet", "Kaydet")}</button>
        <button className="muh-btn muh-vazgec" onClick={onVazgec}>{t("muhVazgec", "Vazgeç")}</button>
      </div>
    </div>
  );
}
function HareketForm({ t, birim, onKaydet }) {
  const [tur, setTur] = useState("giris"); const [miktar, setMiktar] = useState(""); const [acik, setAcik] = useState(""); const [tarih, setTarih] = useState(bugunStr());
  return (
    <div className="muh-form muh-kayit-form">
      <div className="muh-tur-sec">
        <button className={"muh-tur-btn tahsilat" + (tur === "giris" ? " aktif" : "")} onClick={() => setTur("giris")}>⬇ {t("muhGiris", "Giriş")}</button>
        <button className={"muh-tur-btn borc" + (tur === "cikis" ? " aktif" : "")} onClick={() => setTur("cikis")}>⬆ {t("muhCikis", "Çıkış")}</button>
      </div>
      <input className="muh-inp" type="number" inputMode="decimal" value={miktar} onChange={(e) => setMiktar(e.target.value)} placeholder={t("muhMiktar", "Miktar") + (birim ? " (" + birim + ")" : "")} />
      <input className="muh-inp" value={acik} onChange={(e) => setAcik(e.target.value)} placeholder={t("muhAciklama", "Açıklama") + " (" + t("istege", "isteğe bağlı") + ")"} />
      <input className="muh-inp" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
      <button className="muh-btn muh-kaydet" onClick={() => { const v = Number(String(miktar).replace(",", ".")); if (!v || v <= 0) return; onKaydet({ islemTuru: tur, miktar: v, aciklama: acik.trim(), tarih: tarih || bugunStr() }); setMiktar(""); setAcik(""); setTarih(bugunStr()); }}>{t("muhKayitEkle", "Ekle")}</button>
    </div>
  );
}
function IslemForm({ t, paraSym, cariler, stoklar, onKaydet, onVazgec }) {
  const [tur, setTur] = useState("satis"); const [cariId, setCariId] = useState(""); const [stokId, setStokId] = useState(""); const [miktar, setMiktar] = useState("1"); const [tutar, setTutar] = useState(""); const [tarih, setTarih] = useState(bugunStr()); const [acik, setAcik] = useState("");
  const stok = stoklar.find((s) => s.id === stokId);
  // Ürün + miktar seçilince tutarı otomatik öner (satış fiyatı × miktar / alış fiyatı × miktar)
  const otoTutar = () => { if (!stok) return; const f = tur === "satis" ? stok.satisF : stok.alisF; const m = Number(String(miktar).replace(",", ".")) || 0; if (f) setTutar(String((f * m) || "")); };
  return (
    <div className="muh-form">
      <div className="muh-tur-sec">
        <button className={"muh-tur-btn tahsilat" + (tur === "satis" ? " aktif" : "")} onClick={() => setTur("satis")}>🔺 {t("muhSatis", "Satış")}</button>
        <button className={"muh-tur-btn borc" + (tur === "alis" ? " aktif" : "")} onClick={() => setTur("alis")}>🔻 {t("muhAlis", "Alış")}</button>
      </div>
      <select className="muh-inp" value={cariId} onChange={(e) => setCariId(e.target.value)}>
        <option value="">{t("muhCariSec", "Müşteri/Tedarikçi seç (isteğe bağlı)")}</option>
        {cariler.map((c) => <option key={c.id} value={c.id}>{c.ad}</option>)}
      </select>
      <select className="muh-inp" value={stokId} onChange={(e) => { setStokId(e.target.value); }} onBlur={otoTutar}>
        <option value="">{t("muhUrunSec", "Ürün seç (isteğe bağlı)")}</option>
        {stoklar.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
      </select>
      {stokId ? <input className="muh-inp" type="number" inputMode="decimal" value={miktar} onChange={(e) => setMiktar(e.target.value)} onBlur={otoTutar} placeholder={t("muhMiktar", "Miktar")} /> : null}
      <input className="muh-inp" type="number" inputMode="decimal" value={tutar} onChange={(e) => setTutar(e.target.value)} placeholder={t("muhTutar", "Tutar") + " (" + paraSym + ")"} />
      <input className="muh-inp" value={acik} onChange={(e) => setAcik(e.target.value)} placeholder={t("muhAciklama", "Açıklama") + " (" + t("istege", "isteğe bağlı") + ")"} />
      <input className="muh-inp" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
      <div className="muh-form-dugmeler">
        <button className="muh-btn muh-kaydet" onClick={() => {
          const v = Number(String(tutar).replace(",", ".")) || 0; const m = Number(String(miktar).replace(",", ".")) || 0;
          if (!v && !m) return;
          onKaydet({ islemTuru: tur, cariId: cariId || "", stokId: stokId || "", miktar: stokId ? m : 0, tutar: v, aciklama: acik.trim(), tarih: tarih || bugunStr() });
        }}>{t("muhKaydet", "Kaydet")}</button>
        <button className="muh-btn muh-vazgec" onClick={onVazgec}>{t("muhVazgec", "Vazgeç")}</button>
      </div>
    </div>
  );
}
function KasaForm({ t, paraSym, onKaydet, onVazgec }) {
  const [tur, setTur] = useState("gelir"); const [tutar, setTutar] = useState(""); const [acik, setAcik] = useState(""); const [yontem, setYontem] = useState("nakit"); const [tarih, setTarih] = useState(bugunStr());
  return (
    <div className="muh-form">
      <div className="muh-tur-sec">
        <button className={"muh-tur-btn tahsilat" + (tur === "gelir" ? " aktif" : "")} onClick={() => setTur("gelir")}>➕ {t("muhGelir", "Gelir")}</button>
        <button className={"muh-tur-btn borc" + (tur === "gider" ? " aktif" : "")} onClick={() => setTur("gider")}>➖ {t("muhGider", "Gider")}</button>
      </div>
      <input className="muh-inp" type="number" inputMode="decimal" value={tutar} onChange={(e) => setTutar(e.target.value)} placeholder={t("muhTutar", "Tutar") + " (" + paraSym + ")"} />
      <input className="muh-inp" value={acik} onChange={(e) => setAcik(e.target.value)} placeholder={t("muhAciklama", "Açıklama") + " (" + t("istege", "isteğe bağlı") + ")"} />
      <div className="muh-tur-sec">
        <button className={"muh-tur-btn" + (yontem === "nakit" ? " aktif tahsilat" : "")} onClick={() => setYontem("nakit")}>💵 {t("muhNakit", "Nakit")}</button>
        <button className={"muh-tur-btn" + (yontem === "banka" ? " aktif tahsilat" : "")} onClick={() => setYontem("banka")}>🏦 {t("muhBanka", "Banka")}</button>
      </div>
      <input className="muh-inp" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} />
      <div className="muh-form-dugmeler">
        <button className="muh-btn muh-kaydet" onClick={() => { const v = Number(String(tutar).replace(",", ".")); if (!v || v <= 0) return; onKaydet({ kasaTuru: tur, tutar: v, aciklama: acik.trim(), yontem, tarih: tarih || bugunStr() }); }}>{t("muhKaydet", "Kaydet")}</button>
        <button className="muh-btn muh-vazgec" onClick={onVazgec}>{t("muhVazgec", "Vazgeç")}</button>
      </div>
    </div>
  );
}
