// GLOXORG — SANAL AYNA: müşteri KENDİ fotoğrafında saç / tırnak / makyaj modeli dener.
// Google/Gemini görsel yolu (gloxooResimUret) fotoğraf GİRDİSİ alır → kişinin yüzünü koruyup istenen modeli uygular.
import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { gloxooResimUret } from "./firebase";

// KİM İÇİN — bayan/erkek/kız/erkek çocuk/bebek (saç kesimi + kıyafet önerileri buna göre değişir)
const KISILER = [
  { k: "bayan", ik: "👩", ck: "saKisiBayan", ad: "Bayan", ing: "woman" },
  { k: "erkek", ik: "👨", ck: "saKisiErkek", ad: "Erkek", ing: "man" },
  { k: "kiz", ik: "👧", ck: "saKisiKiz", ad: "Kız", ing: "young girl" },
  { k: "erkekcocuk", ik: "👦", ck: "saKisiErkekCocuk", ad: "Erkek Çocuk", ing: "young boy" },
  { k: "bebek", ik: "👶", ck: "saKisiBebek", ad: "Bebek", ing: "baby" },
];
// Kişiye göre SAÇ ve KIYAFET önerileri (çok model)
const SAC_KISI = {
  bayan: ["Ombre", "Balyaj", "Uzun Dalgalı", "Düz Uzun", "Kare Kesim (Bob)", "Katlı Kesim", "Topuz", "At Kuyruğu", "Röfle", "Perma", "Fönlü", "Küt Kesim", "Örgü"],
  erkek: ["Fade", "Undercut", "Pompadour", "Uzun Saç", "Perma", "Ondüle", "Topuz (Man Bun)", "Klasik Kesim", "Yandan Ayrık", "Asker Tıraşı", "Sakal Şekli", "Uzun Sakal", "Kirli Sakal", "Keçi Sakal"],
  kiz: ["Örgü", "At Kuyruğu", "Kısa Kesim", "Topuz", "Dalgalı", "Renkli Toka", "İki Örgü"],
  erkekcocuk: ["Fade", "Kısa Kesim", "Kirpi Model", "Yandan Ayrık", "Uzun Saç"],
  bebek: ["Yumuşak Kesim", "Kısa Bebek Kesimi", "İlk Tıraş"],
};
// RENK seçenekleri (isteğe bağlı) — saç için saç renkleri, kıyafet/tırnak vb. için genel renkler
const SAC_RENK = ["Siyah", "Koyu Kahve", "Kahve", "Kumral", "Sarı", "Bal Köpüğü", "Kızıl", "Bakır", "Platin Sarı", "Gri / Gümüş", "Mavi", "Pembe"];
const GENEL_RENK = ["Siyah", "Beyaz", "Kırmızı", "Mavi", "Lacivert", "Yeşil", "Pembe", "Mor", "Sarı", "Turuncu", "Kahve", "Bej", "Gri", "Altın", "Gümüş"];
function renkGetir(kategori) { if (kategori === "sac") return SAC_RENK; if (kategori === "makyaj") return []; return GENEL_RENK; }
const ELBISE_KISI = {
  bayan: ["Abiye Elbise", "Yazlık Elbise", "Takım", "Kot & Bluz", "Kışlık Mont"],
  erkek: ["Takım Elbise", "Gömlek", "Ceket", "Kot Pantolon", "Spor Giyim"],
  kiz: ["Prenses Elbise", "Etek & Bluz", "Tulum", "Kışlık Mont"],
  erkekcocuk: ["Takım", "Gömlek", "Şort & Tişört", "Kışlık Mont"],
  bebek: ["Bebek Tulumu", "Bebek Elbisesi", "Body Zıbın", "Kışlık Tulum"],
};
// Diğer kategoriler (kişiden bağımsız genel öneriler)
const ONERILER = {
  makyaj: ["Doğal Makyaj", "Smokey Göz", "Gündüz Makyajı", "Gece Makyajı", "Gelin Makyajı", "Işıltılı Ten"],
  tirnak: ["Fransız Tırnak", "Ombre Tırnak", "Kırmızı Oje", "Nude Ton", "Gliter", "Kedi Gözü", "Mat Siyah", "Çiçek Desen"],
  ayakkabi: ["Spor Ayakkabı", "Klasik Ayakkabı", "Topuklu", "Bot", "Sandalet", "Loafer"],
  canta: ["El Çantası", "Sırt Çantası", "Omuz Çantası", "Cüzdan", "Spor Çanta"],
  aksesuar: ["Kolye", "Küpe", "Kol Saati", "Güneş Gözlüğü", "Şapka", "Kravat"],
};
function oneriGetir(kategori, kisi) {
  if (kategori === "sac") return SAC_KISI[kisi] || SAC_KISI.bayan;
  if (kategori === "elbise") return ELBISE_KISI[kisi] || ELBISE_KISI.bayan;
  return ONERILER[kategori] || [];
}
// Her kategori için görsel yapay zekâsına verilecek İngilizce talimat (yüzü koru / üstüne giydir).
const KATEGORI_ISTEM = {
  sac: { ne: "hairstyle", koru: "Keep the SAME person, SAME face and identity; change ONLY the hairstyle/beard. Do not change the face." },
  makyaj: { ne: "makeup look", koru: "Keep the SAME person and face; change ONLY the makeup." },
  tirnak: { ne: "nail design", koru: "Keep the SAME person and hands; change ONLY the nails." },
  elbise: { ne: "outfit / clothing", koru: "Dress the SAME person in this outfit; keep their face and identity; show them fully wearing it." },
  ayakkabi: { ne: "pair of shoes", koru: "Show the SAME person wearing these shoes; keep their face and body." },
  canta: { ne: "bag", koru: "Show the SAME person holding/carrying this bag; keep their face and body." },
  aksesuar: { ne: "accessory", koru: "Add this accessory to the SAME person; keep their face and identity." },
};
const KATEGORILER = [
  { k: "sac", ik: "💇", ck: "saSac", ad: "Saç" }, { k: "makyaj", ik: "💄", ck: "saMakyaj", ad: "Makyaj" },
  { k: "tirnak", ik: "💅", ck: "saTirnak", ad: "Tırnak" }, { k: "elbise", ik: "👕", ck: "saElbise", ad: "Kıyafet" },
  { k: "ayakkabi", ik: "👟", ck: "saAyakkabi", ad: "Ayakkabı" }, { k: "canta", ik: "👜", ck: "saCanta", ad: "Çanta" },
  { k: "aksesuar", ik: "⌚", ck: "saAksesuar", ad: "Aksesuar" },
];

export default function SanalAyna({ onKapat, baslangic }) {
  const { t } = useTranslation();
  const [foto, setFoto] = useState("");            // kullanıcı fotoğrafı (dataURL)
  const [fotoMime, setFotoMime] = useState("image/jpeg");
  const [kisi, setKisi] = useState((baslangic && baslangic.kisi) || "bayan");       // bayan | erkek | kiz | erkekcocuk | bebek
  const [kategori, setKategori] = useState((baslangic && baslangic.kategori) || "sac"); // sac | makyaj | tirnak | elbise | ayakkabi | canta | aksesuar
  const [model, setModel] = useState((baslangic && baslangic.model) || "");          // denenecek model adı
  const [renk, setRenk] = useState("");            // isteğe bağlı renk
  // REKLAMDAN gelen ÜRÜN referans fotoğrafı (o EXACT elbiseyi/ürünü üstünde göster) — varsa 2. görsel olarak verilir
  const [refFoto, setRefFoto] = useState("");
  const [refMime, setRefMime] = useState("image/jpeg");
  const [sonuc, setSonuc] = useState("");          // üretilen sonuç (dataURL)
  const [yuk, setYuk] = useState(false);
  const [hata, setHata] = useState("");
  const [indirildi, setIndirildi] = useState(false); // "İndirildi" geri bildirimi
  const inpRef = useRef(null);
  const sonucRef = useRef(null); // sonuç gelince oraya kaydır
  // Sonuç hazır olunca OTOMATİK sonuca kaydır (aşağıda kalıp görünmesin)
  useEffect(() => { if (sonuc && sonucRef.current) { try { sonucRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {} } }, [sonuc]);
  // Reklamdan açıldıysa ürün fotoğrafını (referans) base64'e yükle → "o elbiseyi üstünde" gösterebilelim
  useEffect(() => {
    const u = baslangic && baslangic.refFotoUrl; if (!u) return;
    (async () => {
      try {
        const blob = await (await fetch(u, { mode: "cors" })).blob();
        const dataUrl = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result || "")); r.onerror = () => res(""); r.readAsDataURL(blob); });
        if (dataUrl) { setRefFoto(dataUrl); setRefMime(blob.type || "image/jpeg"); }
      } catch (e) {} // olmazsa (CORS) sadece metinle dener — yine çalışır
    })();
  }, [baslangic]);

  function fotoSec(e) {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { setFoto(String(r.result || "")); setFotoMime(f.type || "image/jpeg"); setSonuc(""); setHata(""); };
    r.onerror = () => setHata(t("saOlmadi", "Şu an yapılamadı, tekrar dene."));
    r.readAsDataURL(f);
  }
  async function dene() {
    if (yuk) return;
    if (!foto) { setHata(t("saFotoOnce", "Önce fotoğrafını ekle.")); return; }
    if (!model.trim()) { setHata(t("saModelOnce", "Bir model yaz ya da yukarıdan seç.")); return; }
    setYuk(true); setHata(""); setSonuc("");
    try {
      const base64 = foto.split(",")[1] || "";
      const cfg = KATEGORI_ISTEM[kategori] || KATEGORI_ISTEM.sac;
      const kisiIng = (KISILER.find((x) => x.k === kisi) || {}).ing || "person";
      const renkKismi = renk ? ` Color: ${renk}.` : "";
      let istem, ref2 = null;
      if (refFoto) {
        // İKİ görsel: 1. kişi, 2. ürün → o ÜRÜNÜ kişinin üstünde göster (reklamdan "üstümde dene")
        ref2 = { base64: refFoto.split(",")[1] || "", mediaType: refMime };
        istem = `The FIRST image is a ${kisiIng}. The SECOND image is a product ("${model.trim()}"). Realistically show the person from the FIRST image wearing/using the EXACT product from the SECOND image.${renkKismi} Keep the SAME person, same face and identity and body. Photorealistic, natural, high quality, no text, no watermark, no logo.`;
      } else {
        istem = `The person in this photo is a ${kisiIng}. Realistically apply/show this ${cfg.ne} suitable for a ${kisiIng}: "${model.trim()}".${renkKismi} ${cfg.koru} Photorealistic, natural, high quality, no text, no watermark, no logo.`;
      }
      const res = await gloxooResimUret(istem, { base64, mediaType: fotoMime }, ref2);
      if (res && res.dataUrl) setSonuc(res.dataUrl);
      else setHata(t("saOlmadi", "Şu an yapılamadı, tekrar dene."));
    } catch (e) { setHata((e && e.message) ? String(e.message) : t("saOlmadi", "Şu an yapılamadı, tekrar dene.")); }
    setYuk(false);
  }
  function indir() {
    if (!sonuc) return;
    try {
      const a = document.createElement("a");
      // Her indirmeye BENZERSİZ isim → tarayıcı "aynı dosyayı tekrar mı indireyim?" diye sormaz.
      const etiket = (model || kategori || "model").toString().toLocaleLowerCase("tr").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
      a.href = sonuc; a.download = "gloxorg-" + (etiket || "sanal-ayna") + "-" + Date.now().toString(36) + ".png";
      document.body.appendChild(a); a.click(); a.remove();
      setIndirildi(true); setTimeout(() => setIndirildi(false), 2500); // düğmede "İndirildi" göster
    } catch (e) {}
  }
  async function paylas() {
    if (!sonuc) return;
    try {
      if (navigator.share && navigator.canShare) {
        const bl = await (await fetch(sonuc)).blob();
        const dosya = new File([bl], "gloxorg-sanal-ayna.png", { type: "image/png" });
        if (navigator.canShare({ files: [dosya] })) { await navigator.share({ files: [dosya], title: "GLOXORG Sanal Ayna" }); return; }
      }
      indir();
    } catch (e) {}
  }

  const oneri = oneriGetir(kategori, kisi);
  const renkler = renkGetir(kategori);
  return (
    <div className="sa-fon" onClick={(e) => { if (e.target === e.currentTarget) onKapat(); }}>
      <div className="sa-pencere">
        <div className="sa-ust">
          <span className="sa-baslik">🪞 {t("saBaslik", "Sanal Ayna")}</span>
          <button className="sa-kapat" onClick={onKapat} aria-label={t("kapat", "Kapat")}>✕</button>
        </div>
        <div className="sa-kaydir">
          <div className="sa-alt">{t("saAlt", "Kendi fotoğrafında saç, tırnak veya makyaj modeli dene. Fotoğrafını yükle, modeli yaz ya da seç; Gloxoo senin üstünde göstersin.")}</div>

          {/* Reklamdan gelindiyse: DENENEN ÜRÜN önizlemesi */}
          {baslangic && baslangic.refFotoUrl && (
            <div className="sa-urun-serit">
              <img src={baslangic.refFotoUrl} alt="" referrerPolicy="no-referrer" />
              <div className="sa-urun-bil"><b>{baslangic.ad || t("saDenenenUrun", "Denenen ürün")}</b><span>{t("saUrunDene", "Bu ürünü fotoğrafına giydirmek için fotoğrafını ekle ve 'Fotoğrafımda dene'ye bas.")}</span></div>
            </div>
          )}

          {/* 1) FOTOĞRAF */}
          <div className="sa-foto-kutu" onClick={() => inpRef.current && inpRef.current.click()}>
            {foto ? <img src={foto} alt="" /> : <span className="sa-foto-bos">📷<br />{t("saFotoEkle", "Fotoğrafını ekle")}</span>}
            {foto && <span className="sa-foto-degis">🔄 {t("saFotoDegis", "Değiştir")}</span>}
          </div>
          <input ref={inpRef} type="file" accept="image/*" style={{ display: "none" }} onChange={fotoSec} />

          {/* 1b) KİM İÇİN — bayan/erkek/kız/erkek çocuk/bebek (saç+kıyafet önerileri buna göre) */}
          <div className="sa-kim-bas">{t("saKimIcin", "Kim için?")}</div>
          <div className="sa-kisi-satir">
            {KISILER.map((ks) => (
              <button key={ks.k} className={"sa-kisi" + (kisi === ks.k ? " sec" : "")} onClick={() => { setKisi(ks.k); setModel(""); }}>{ks.ik} {t(ks.ck, ks.ad)}</button>
            ))}
          </div>

          {/* 2) KATEGORİ — saç/makyaj/tırnak + kıyafet/ayakkabı/çanta/aksesuar (erkek+bayan) */}
          <div className="sa-kat-satir">
            {KATEGORILER.map((kt) => (
              <button key={kt.k} className={"sa-kat" + (kategori === kt.k ? " sec" : "")} onClick={() => { setKategori(kt.k); setModel(""); setRenk(""); }}>{kt.ik} {t(kt.ck, kt.ad)}</button>
            ))}
          </div>

          {/* 3) MODEL — öneri çipleri + yaz */}
          <div className="sa-oneri">
            {oneri.map((o) => (
              <button key={o} className={"sa-cip" + (model === o ? " sec" : "")} onClick={() => setModel(o)}>{o}</button>
            ))}
          </div>
          <input className="sa-model-input" type="text" value={model} onChange={(e) => setModel(e.target.value)}
            placeholder={t("saModelYaz", "Model yaz (örn. Ombre saç) ya da yukarıdan seç")} />

          {/* 3b) RENK (isteğe bağlı) — saç renkleri ya da genel renkler; tekrar dokununca kaldırılır */}
          {renkler.length > 0 && (
            <>
              <div className="sa-kim-bas" style={{ marginTop: 12 }}>🎨 {t("saRenk", "Renk (isteğe bağlı)")}</div>
              <div className="sa-oneri">
                {renkler.map((r) => (
                  <button key={r} className={"sa-cip sa-renk-cip" + (renk === r ? " sec" : "")} onClick={() => setRenk(renk === r ? "" : r)}>{r}</button>
                ))}
              </div>
            </>
          )}

          {/* 4) DENE */}
          <button className="sa-dene" disabled={yuk} onClick={dene}>{yuk ? "⏳ " + t("saHazir", "Gloxoo hazırlıyor…") : "✨ " + t("saDene", "Fotoğrafımda dene")}</button>
          {hata && <div className="sa-hata">⚠️ {hata}</div>}

          {/* 5) SONUÇ — hazır olunca buraya OTOMATİK kaydırılır */}
          {sonuc && (
            <div className="sa-sonuc" ref={sonucRef}>
              <div className="sa-sonuc-bas">✅ {t("saSonuc", "Sonuç")}</div>
              <img src={sonuc} alt="" />
              <div className="sa-sonuc-dugmeler">
                <button className={"sa-indir" + (indirildi ? " indi" : "")} onClick={indir}>{indirildi ? "✓ " + t("saIndirildi", "İndirildi") : "⬇️ " + t("saIndir", "İndir")}</button>
                <button className="sa-paylas" onClick={paylas}>📤 {t("saPaylas", "Paylaş")}</button>
                <button className="sa-tekrar" onClick={() => { setSonuc(""); }}>🔁 {t("saTekrar", "Başka model dene")}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
