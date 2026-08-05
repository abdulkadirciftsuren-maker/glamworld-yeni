// GLOXORG — VİTRİN / REKLAM: ana sayfada soldan-sağa akan reklam şeridi. Firmalar ürün (elbise/ayakkabı/çanta/
// aksesuar/makyaj) reklamı verir; müşteri reklama basınca ürünü Gloxoo ile KENDİ üstünde dener + satıcıya yazar/sipariş verir.
// Altyapı: Elite Pazar'ın "pazarUrunleri" koleksiyonu (reklam:true işaretli) → yeni Firestore kuralı GEREKMEZ.
import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { pazarUrunEkle, pazarUrunleriOku, gorselYukle } from "./veri";

const KATEGORILER = [
  { k: "elbise", ik: "👕", ck: "saElbise", ad: "Kıyafet" },
  { k: "ayakkabi", ik: "👟", ck: "saAyakkabi", ad: "Ayakkabı" },
  { k: "canta", ik: "👜", ck: "saCanta", ad: "Çanta" },
  { k: "aksesuar", ik: "⌚", ck: "saAksesuar", ad: "Aksesuar" },
  { k: "makyaj", ik: "💄", ck: "saMakyaj", ad: "Makyaj" },
];
const KISILER = [
  { k: "bayan", ik: "👩", ck: "saKisiBayan", ad: "Bayan" }, { k: "erkek", ik: "👨", ck: "saKisiErkek", ad: "Erkek" },
  { k: "kiz", ik: "👧", ck: "saKisiKiz", ad: "Kız" }, { k: "erkekcocuk", ik: "👦", ck: "saKisiErkekCocuk", ad: "Erkek Çocuk" },
  { k: "bebek", ik: "👶", ck: "saKisiBebek", ad: "Bebek" },
];
function dosyaOku(file) { return new Promise((res) => { try { const r = new FileReader(); r.onload = () => res(String(r.result || "")); r.onerror = () => res(""); r.readAsDataURL(file); } catch (e) { res(""); } }); }
// Fotoğrafı küçült (küçük base64) → "üstümde dene"de GERÇEK ürünü giydirmek için doğrudan görsel yollanır (CORS derdi olmaz)
function kucultB64(dataUrl, max = 720) {
  return new Promise((res) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          let w = img.width, h = img.height;
          if (w >= h && w > max) { h = Math.round(h * max / w); w = max; } else if (h > max) { w = Math.round(w * max / h); h = max; }
          const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h);
          res(c.toDataURL("image/jpeg", 0.82));
        } catch (e) { res(dataUrl); }
      };
      img.onerror = () => res(dataUrl); img.src = dataUrl;
    } catch (e) { res(dataUrl); }
  });
}

export default function Reklam({ uid, benAd, benFoto, dil, paraSym, onDene, saticiyaYaz }) {
  const { t } = useTranslation();
  const [reklamlar, setReklamlar] = useState([]);
  const [detay, setDetay] = useState(null);       // açık reklam (detay penceresi)
  const [verAcik, setVerAcik] = useState(false);   // "Reklam Ver" formu

  // Form durumları
  const [foto, setFoto] = useState("");
  const [ad, setAd] = useState("");
  const [kategori, setKategori] = useState("elbise");
  const [kisi, setKisi] = useState("bayan");
  const [beden, setBeden] = useState("");
  const [renk, setRenk] = useState("");
  const [kumas, setKumas] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [fiyat, setFiyat] = useState("");
  const [paraSimge, setParaSimge] = useState(paraSym || "₺"); // ülkeye göre otomatik para birimi
  const [kaydet, setKaydet] = useState(false);
  const [hata, setHata] = useState("");
  const inpRef = useRef(null);

  async function yukle() {
    try { const hepsi = await pazarUrunleriOku(200); setReklamlar((hepsi || []).filter((p) => p.reklam)); } catch (e) {}
  }
  useEffect(() => { yukle(); }, []);

  function formSifirla() { setFoto(""); setAd(""); setKategori("elbise"); setKisi("bayan"); setBeden(""); setRenk(""); setKumas(""); setAciklama(""); setFiyat(""); setParaSimge(paraSym || "₺"); setHata(""); }
  async function fotoSec(e) { const f = e.target.files && e.target.files[0]; if (!f) return; const d = await dosyaOku(f); if (d) { setFoto(d); setHata(""); } }
  async function yayinla() {
    if (kaydet) return;
    if (!foto) { setHata(t("rkFotoOnce", "Önce ürün fotoğrafı ekle.")); return; }
    if (!ad.trim()) { setHata(t("rkAdOnce", "Ürün adı yaz.")); return; }
    setKaydet(true); setHata("");
    try {
      let kapak = ""; try { kapak = await gorselYukle(foto, uid || "reklam"); } catch (e) {}
      if (!kapak) kapak = foto; // yüklenemezse data URL
      let refB64 = ""; try { refB64 = await kucultB64(foto, 720); } catch (e) {} // "üstümde dene" için küçük referans (gerçek ürün)
      await pazarUrunEkle({
        reklam: true, tur: "reklam", kapak, refB64, baslik: ad.trim(), kategori, kimIcin: kisi,
        beden: beden.trim(), renk: renk.trim(), kumas: kumas.trim(), aciklama: aciklama.trim(),
        fiyat: (fiyat || "").toString().trim(), paraSimge, uid: uid || "", satici: benAd || "", saticiFoto: benFoto || "",
      });
      formSifirla(); setVerAcik(false); yukle();
    } catch (e) { setHata(t("rkOlmadi", "Yayınlanamadı, tekrar dene.")); }
    setKaydet(false);
  }

  const kAd = (kkey) => { const k = KATEGORILER.find((x) => x.k === kkey); return k ? t(k.ck, k.ad) : kkey; };

  return (
    <>
      {/* ŞERİT — ana sayfada soldan-sağa akar */}
      <div className="reklam-serit">
        <div className="reklam-serit-bas">
          <span className="reklam-serit-ad">🛍️ {t("rkBaslik", "Vitrin — Reklam")}</span>
          <button className="reklam-ver-mini" onClick={() => { formSifirla(); setVerAcik(true); }}>＋ {t("rkVer", "Reklam Ver")}</button>
        </div>
        {reklamlar.length === 0 ? (
          <button className="reklam-bos" onClick={() => { formSifirla(); setVerAcik(true); }}>＋ {t("rkIlk", "İlk reklamı sen ver — ürününü buradan tanıt")}</button>
        ) : (
          <div className="reklam-akis">
            <div className="reklam-track">
              {reklamlar.map((r, i) => (
                <button className="reklam-kart" key={r.id + "-" + i} onClick={() => setDetay(r)}>
                  <span className="reklam-kart-foto" style={r.kapak ? { backgroundImage: `url(${r.kapak})` } : {}}>{!r.kapak && "🛍️"}</span>
                  <span className="reklam-kart-ad">{r.baslik || ""}</span>
                  {r.fiyat ? <span className="reklam-kart-fiyat">{r.fiyat} {r.paraSimge || "₺"}</span> : null}
                  <span className="reklam-kart-dene">🪞 {t("rkDene", "Üstümde dene")}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DETAY penceresi */}
      {detay && (
        <div className="reklam-fon" onClick={(e) => { if (e.target === e.currentTarget) setDetay(null); }}>
          <div className="reklam-detay">
            <div className="reklam-detay-ust">
              <span className="reklam-detay-bas">{detay.baslik || ""}</span>
              <button className="reklam-kapat" onClick={() => setDetay(null)} aria-label={t("kapat", "Kapat")}>✕</button>
            </div>
            <div className="reklam-detay-kaydir">
              {detay.kapak && <img className="reklam-detay-foto" src={detay.kapak} alt="" referrerPolicy="no-referrer" />}
              {detay.fiyat ? <div className="reklam-detay-fiyat">{detay.fiyat} {detay.paraSimge || "₺"}</div> : null}
              <div className="reklam-detay-satici">🏪 {detay.satici || t("rkSatici", "Satıcı")}</div>
              <div className="reklam-detay-ozet">
                <span className="reklam-oz"><b>{t("rkKimIcin", "Kim için")}:</b> {(KISILER.find((x) => x.k === detay.kimIcin) || {}).ad ? t((KISILER.find((x) => x.k === detay.kimIcin) || {}).ck, "") : "—"}</span>
                <span className="reklam-oz"><b>{kAd(detay.kategori)}</b></span>
                {detay.beden && <span className="reklam-oz"><b>{t("rkBeden", "Beden")}:</b> {detay.beden}</span>}
                {detay.renk && <span className="reklam-oz"><b>{t("saRenk", "Renk")}:</b> {detay.renk}</span>}
                {detay.kumas && <span className="reklam-oz"><b>{t("rkKumas", "Kumaş")}:</b> {detay.kumas}</span>}
              </div>
              {detay.aciklama && <div className="reklam-detay-aciklama">{detay.aciklama}</div>}
              <div className="reklam-detay-dugmeler">
                <button className="reklam-dene-btn" onClick={() => {
                  const urun = { kategori: detay.kategori || "elbise", kisi: detay.kimIcin || "bayan", model: [detay.baslik, detay.renk, detay.kumas].filter(Boolean).join(", "), ad: detay.baslik || "", refFotoUrl: detay.kapak || "", refB64: detay.refB64 || "" };
                  setDetay(null); onDene && onDene(urun);
                }}>🪞 {t("rkDene", "Üstümde dene")}</button>
                <button className="reklam-yaz-btn" onClick={() => {
                  const m = `"${detay.baslik}" reklamınız için yazıyorum. ${detay.fiyat ? "(" + detay.fiyat + " " + (detay.paraSimge || "₺") + ") " : ""}Bilgi/sipariş almak istiyorum.`;
                  setDetay(null); saticiyaYaz && saticiyaYaz({ uid: detay.sahipUid || detay.uid, ad: detay.satici, foto: detay.saticiFoto }, m);
                }}>💬 {t("rkYaz", "Satıcıya Yaz")}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REKLAM VER formu */}
      {verAcik && (
        <div className="reklam-fon" onClick={(e) => { if (e.target === e.currentTarget) setVerAcik(false); }}>
          <div className="reklam-detay">
            <div className="reklam-detay-ust">
              <span className="reklam-detay-bas">🛍️ {t("rkYeni", "Yeni Reklam")}</span>
              <button className="reklam-kapat" onClick={() => setVerAcik(false)} aria-label={t("kapat", "Kapat")}>✕</button>
            </div>
            <div className="reklam-detay-kaydir">
              <div className="reklam-not">{t("rkUcretsizNot", "Şimdilik ÜCRETSİZ. İleride reklam yayını ücretli olacak.")}</div>
              <div className="reklam-foto-kutu" onClick={() => inpRef.current && inpRef.current.click()}>
                {foto ? <img src={foto} alt="" /> : <span className="reklam-foto-bos">📷<br />{t("rkFotoEkle", "Ürün fotoğrafı ekle")}</span>}
              </div>
              <input ref={inpRef} type="file" accept="image/*" style={{ display: "none" }} onChange={fotoSec} />
              <input className="reklam-inp" type="text" value={ad} onChange={(e) => setAd(e.target.value)} placeholder={t("rkAd", "Ürün adı")} />
              <div className="reklam-kim-bas">{t("rkKategori", "Kategori")}</div>
              <div className="reklam-cip-satir">{KATEGORILER.map((kt) => <button key={kt.k} className={"reklam-cip" + (kategori === kt.k ? " sec" : "")} onClick={() => setKategori(kt.k)}>{kt.ik} {t(kt.ck, kt.ad)}</button>)}</div>
              <div className="reklam-kim-bas">{t("saKimIcin", "Kim için?")}</div>
              <div className="reklam-cip-satir">{KISILER.map((ks) => <button key={ks.k} className={"reklam-cip" + (kisi === ks.k ? " sec" : "")} onClick={() => setKisi(ks.k)}>{ks.ik} {t(ks.ck, ks.ad)}</button>)}</div>
              <div className="reklam-ikili">
                <input className="reklam-inp" type="text" value={beden} onChange={(e) => setBeden(e.target.value)} placeholder={t("rkBeden", "Beden")} />
                <input className="reklam-inp" type="text" value={renk} onChange={(e) => setRenk(e.target.value)} placeholder={t("saRenk", "Renk")} />
              </div>
              <input className="reklam-inp" type="text" value={kumas} onChange={(e) => setKumas(e.target.value)} placeholder={t("rkKumas", "Kumaş / malzeme")} />
              <textarea className="reklam-inp reklam-alan" value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder={t("rkAciklama", "Açıklama (detay, kullanım, kargo…)")} rows={3} />
              <div className="reklam-ikili">
                <input className="reklam-inp" type="number" inputMode="decimal" value={fiyat} onChange={(e) => setFiyat(e.target.value)} placeholder={t("rkFiyat", "Fiyat")} />
                <select className="reklam-inp" value={paraSimge} onChange={(e) => setParaSimge(e.target.value)}>
                  <option value="₺">₺ TL</option><option value="$">$ USD</option><option value="€">€ EUR</option><option value="₴">₴ UAH</option><option value="£">£ GBP</option>
                </select>
              </div>
              {hata && <div className="reklam-hata">⚠️ {hata}</div>}
              <button className="reklam-yayinla" disabled={kaydet} onClick={yayinla}>{kaydet ? "⏳ " + t("rkYayinlaniyor", "Yayınlanıyor…") : "✅ " + t("rkYayinla", "Yayınla")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
