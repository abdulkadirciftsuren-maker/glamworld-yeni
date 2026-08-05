// GLOXORG — SANAL AYNA: müşteri KENDİ fotoğrafında saç / tırnak / makyaj modeli dener.
// Google/Gemini görsel yolu (gloxooResimUret) fotoğraf GİRDİSİ alır → kişinin yüzünü koruyup istenen modeli uygular.
import React, { useState, useRef } from "react";
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
// Kişiye göre SAÇ ve KIYAFET önerileri
const SAC_KISI = {
  bayan: ["Ombre", "Balyaj", "Uzun Dalgalı", "Kare Kesim", "Topuz", "Röfle"],
  erkek: ["Fade", "Undercut", "Pompadour", "Sakal Şekli", "Klasik Kesim", "Asker Tıraşı"],
  kiz: ["Örgü", "At Kuyruğu", "Kısa Kesim", "Topuz", "Renkli Toka"],
  erkekcocuk: ["Fade", "Kısa Kesim", "Kirpi Model", "Yandan Ayrık"],
  bebek: ["Yumuşak Kesim", "Kısa Bebek Kesimi"],
};
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
  { k: "tirnak", ik: "💅", ck: "saTirnak", ad: "Tırnak" }, { k: "elbise", ik: "👗", ck: "saElbise", ad: "Kıyafet" },
  { k: "ayakkabi", ik: "👟", ck: "saAyakkabi", ad: "Ayakkabı" }, { k: "canta", ik: "👜", ck: "saCanta", ad: "Çanta" },
  { k: "aksesuar", ik: "🕶️", ck: "saAksesuar", ad: "Aksesuar" },
];

export default function SanalAyna({ onKapat }) {
  const { t } = useTranslation();
  const [foto, setFoto] = useState("");            // kullanıcı fotoğrafı (dataURL)
  const [fotoMime, setFotoMime] = useState("image/jpeg");
  const [kisi, setKisi] = useState("bayan");       // bayan | erkek | kiz | erkekcocuk | bebek
  const [kategori, setKategori] = useState("sac"); // sac | makyaj | tirnak | elbise | ayakkabi | canta | aksesuar
  const [model, setModel] = useState("");          // denenecek model adı
  const [sonuc, setSonuc] = useState("");          // üretilen sonuç (dataURL)
  const [yuk, setYuk] = useState(false);
  const [hata, setHata] = useState("");
  const inpRef = useRef(null);

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
      const istem = `The person in this photo is a ${kisiIng}. Realistically apply/show this ${cfg.ne} suitable for a ${kisiIng}: "${model.trim()}". ${cfg.koru} Photorealistic, natural, high quality, no text, no watermark, no logo.`;
      const res = await gloxooResimUret(istem, { base64, mediaType: fotoMime });
      if (res && res.dataUrl) setSonuc(res.dataUrl);
      else setHata(t("saOlmadi", "Şu an yapılamadı, tekrar dene."));
    } catch (e) { setHata((e && e.message) ? String(e.message) : t("saOlmadi", "Şu an yapılamadı, tekrar dene.")); }
    setYuk(false);
  }
  function indir() {
    if (!sonuc) return;
    try {
      const a = document.createElement("a");
      a.href = sonuc; a.download = "gloxorg-sanal-ayna.png";
      document.body.appendChild(a); a.click(); a.remove();
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
  return (
    <div className="sa-fon" onClick={(e) => { if (e.target === e.currentTarget) onKapat(); }}>
      <div className="sa-pencere">
        <div className="sa-ust">
          <span className="sa-baslik">🪞 {t("saBaslik", "Sanal Ayna")}</span>
          <button className="sa-kapat" onClick={onKapat} aria-label={t("kapat", "Kapat")}>✕</button>
        </div>
        <div className="sa-kaydir">
          <div className="sa-alt">{t("saAlt", "Kendi fotoğrafında saç, tırnak veya makyaj modeli dene. Fotoğrafını yükle, modeli yaz ya da seç; Gloxoo senin üstünde göstersin.")}</div>

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
              <button key={kt.k} className={"sa-kat" + (kategori === kt.k ? " sec" : "")} onClick={() => { setKategori(kt.k); setModel(""); }}>{kt.ik} {t(kt.ck, kt.ad)}</button>
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

          {/* 4) DENE */}
          <button className="sa-dene" disabled={yuk} onClick={dene}>{yuk ? "⏳ " + t("saHazir", "Gloxoo hazırlıyor…") : "✨ " + t("saDene", "Fotoğrafımda dene")}</button>
          {hata && <div className="sa-hata">⚠️ {hata}</div>}

          {/* 5) SONUÇ */}
          {sonuc && (
            <div className="sa-sonuc">
              <div className="sa-sonuc-bas">✅ {t("saSonuc", "Sonuç")}</div>
              <img src={sonuc} alt="" />
              <div className="sa-sonuc-dugmeler">
                <button className="sa-indir" onClick={indir}>⬇️ {t("saIndir", "İndir")}</button>
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
