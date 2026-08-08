// GLOXORG — SANAL AYNA: müşteri KENDİ fotoğrafında saç / tırnak / makyaj modeli dener.
// Google/Gemini görsel yolu (gloxooResimUret) fotoğraf GİRDİSİ alır → kişinin yüzünü koruyup istenen modeli uygular.
import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { gloxooResimUret } from "./firebase";
import { AYNA_CEV } from "./ceviriAyna"; // saç modeli/renk/kıyafet çiplerini kullanıcının diline çevir (değer Türkçe kalır, sadece görünüm çevrilir)

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

// TAM EKRAN + ZOOM göstericisi (sonuç fotoğrafına dokununca) — iki parmak zoom, tek parmak her yöne kaydır, çift dokunuş.
function Buyut({ url, onKapat }) {
  const { t } = useTranslation();
  const [tr, setTr] = useState({ s: 1, x: 0, y: 0 });
  const trRef = useRef(tr); trRef.current = tr;
  const c = useRef({ d0: 0, s0: 1, ox0: 0, oy0: 0, x0: 0, y0: 0, panSx: 0, panSy: 0, panX0: 0, panY0: 0, panAktif: false, sonDokun: 0 });
  const mes = (tt) => Math.hypot(tt[0].clientX - tt[1].clientX, tt[0].clientY - tt[1].clientY);
  const orta = (tt) => ({ x: (tt[0].clientX + tt[1].clientX) / 2, y: (tt[0].clientY + tt[1].clientY) / 2 });
  function panBasla(px, py) { const cur = trRef.current; c.current.panSx = px; c.current.panSy = py; c.current.panX0 = cur.x; c.current.panY0 = cur.y; c.current.panAktif = true; }
  function bas(e) { e.stopPropagation(); const tt = e.touches, cur = trRef.current; if (tt.length === 2) { const o = orta(tt); c.current.d0 = mes(tt) || 1; c.current.s0 = cur.s; c.current.ox0 = o.x; c.current.oy0 = o.y; c.current.x0 = cur.x; c.current.y0 = cur.y; c.current.panAktif = false; } else if (tt.length === 1) panBasla(tt[0].clientX, tt[0].clientY); }
  function har(e) {
    e.stopPropagation(); e.preventDefault(); // her hareket bende kalsın → arka sayfa ASLA kaymaz
    const tt = e.touches, cur = trRef.current;
    if (tt.length === 2) { const s = Math.max(1, Math.min(5, c.current.s0 * (mes(tt) / (c.current.d0 || 1)))); const o = orta(tt); setTr({ s, x: c.current.x0 + (o.x - c.current.ox0), y: c.current.y0 + (o.y - c.current.oy0) }); }
    else if (tt.length === 1) { if (!c.current.panAktif) panBasla(tt[0].clientX, tt[0].clientY); setTr({ s: cur.s, x: c.current.panX0 + (tt[0].clientX - c.current.panSx), y: c.current.panY0 + (tt[0].clientY - c.current.panSy) }); } // TEK parmakla da kaydır (zoom şart değil)
  }
  function bit(e) { e.stopPropagation(); const now = Date.now(); if (e.touches && e.touches.length === 1) panBasla(e.touches[0].clientX, e.touches[0].clientY); else if (!e.touches || e.touches.length === 0) { c.current.panAktif = false; if (now - c.current.sonDokun < 300) setTr((p) => (p.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 })); else setTr((p) => (p.s <= 1 ? { s: 1, x: 0, y: 0 } : p)); c.current.sonDokun = now; } } // yakın değilken bırakınca ortala
  return (
    <div className="sa-buyut" onClick={(e) => { if (e.target === e.currentTarget) onKapat(); }}
      onTouchStart={bas} onTouchMove={har} onTouchEnd={bit}>
      <button className="sa-buyut-kapat" onClick={(e) => { e.stopPropagation(); onKapat(); }} aria-label={t("kapat", "Kapat")}>✕</button>
      <img src={url} alt="" referrerPolicy="no-referrer" draggable={false} style={{ transform: `translate(${tr.x}px,${tr.y}px) scale(${tr.s})` }}
        onDoubleClick={() => setTr((p) => (p.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 }))} />
    </div>
  );
}

export default function SanalAyna({ onKapat, baslangic, onKatman, sayfaModu }) {
  const { t, i18n } = useTranslation();
  // Çip yazısını kullanıcının diline çevir; değer (state) Türkçe kalır ki yapay zekâ istemi bozulmasın.
  const ac = (etiket) => { const d = (i18n && i18n.language ? String(i18n.language).slice(0, 2) : "tr"); return (AYNA_CEV[etiket] && AYNA_CEV[etiket][d]) || etiket; };
  const [buyuk, setBuyuk] = useState(""); // tam ekran açılan sonuç fotoğrafı
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
  const dokunRef = useRef(null); // parmakla SOLA kaydırınca aynayı kapat (ana sayfaya dön) — kullanıcı isteği
  // Sonuç hazır olunca OTOMATİK sonuca kaydır (aşağıda kalıp görünmesin)
  useEffect(() => { if (sonuc && sonucRef.current) { try { sonucRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {} } }, [sonuc]);
  // ANDROID GERİ TUŞU / GEÇMİŞ: derinliği ana ekrana bildir → geri tuşuna basınca ÖNCE tam ekran fotoğrafı,
  // sonra Sanal Ayna'yı kapatır; YÜKLENEN FOTO/SONUÇ KAYBOLMAZ (eskiden geri tuşu ana sayfaya sıfırlayıp her şeyi siliyordu).
  useEffect(() => {
    if (!onKatman) return;
    const derinlik = buyuk ? 2 : 1; // 2: tam ekran foto açık, 1: Sanal Ayna açık
    const geri = () => { if (buyuk) setBuyuk(""); else if (onKapat) onKapat(); };
    onKatman(derinlik, geri);
  }, [buyuk]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (onKatman) onKatman(0, null); }, []); // kapanınca derinlik 0 // eslint-disable-line react-hooks/exhaustive-deps
  // Reklamdan açıldıysa ürün fotoğrafını (referans) al → "o EXACT elbiseyi üstünde" gösterebilelim.
  // Önce reklamla saklanan küçük refB64 (CORS derdi YOK); yoksa kapak URL'sini indirmeyi dener.
  useEffect(() => {
    if (!baslangic) return;
    if (baslangic.refB64) { setRefFoto(baslangic.refB64); setRefMime("image/jpeg"); return; }
    const u = baslangic.refFotoUrl; if (!u) return;
    let iptal = false;
    // fetch yedeği (blob → base64)
    const fetchile = async () => {
      try {
        const blob = await (await fetch(u, { mode: "cors" })).blob();
        const dataUrl = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result || "")); r.onerror = () => res(""); r.readAsDataURL(blob); });
        if (!iptal && dataUrl) { setRefFoto(dataUrl); setRefMime(blob.type || "image/jpeg"); }
      } catch (e) {} // hiç olmazsa sadece metinle dener
    };
    // 1) crossOrigin resim → canvas → base64 (eski reklamlarda refB64 yoksa da ürün fotoğrafını yapay zekâya verebilelim)
    try {
      const im = new Image(); im.crossOrigin = "anonymous";
      im.onload = () => {
        try {
          let w = im.naturalWidth || im.width, h = im.naturalHeight || im.height; const max = 768;
          if (w >= h && w > max) { h = Math.round(h * max / w); w = max; } else if (h > max) { w = Math.round(w * max / h); h = max; }
          const cv = document.createElement("canvas"); cv.width = w || 512; cv.height = h || 512;
          cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
          const d = cv.toDataURL("image/jpeg", 0.85);
          if (!iptal && d && d.length > 200) { setRefFoto(d); setRefMime("image/jpeg"); return; }
          fetchile();
        } catch (e) { fetchile(); } // canvas kirlenirse (CORS yoksa) fetch dene
      };
      im.onerror = () => fetchile();
      im.src = u;
    } catch (e) { fetchile(); }
    return () => { iptal = true; };
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
        // İKİ görsel: 1. kişi (müşteri), 2. ürün → o EXACT ÜRÜNÜ kişinin üstünde, BOYDAN göster (reklamdan "üstümde dene")
        ref2 = { base64: refFoto.split(",")[1] || "", mediaType: refMime };
        const urunTip = { elbise: "the outfit/garment", ayakkabi: "the pair of shoes", canta: "the bag", aksesuar: "the accessory", makyaj: "the makeup look", sac: "the hairstyle", tirnak: "the nails" }[kategori] || "the product";
        const tarifKismi = (baslangic && baslangic.tarif) ? ` Product details — ${baslangic.tarif}.` : "";
        istem = `Take the ${kisiIng} from the FIRST image and show her actually WEARING the ${urunTip} from the SECOND image.
MUST DO — dress her in that exact product: copy its exact print, pattern, colors, neckline, sleeves, fabric and full length from image 2.${tarifKismi} COMPLETELY remove and replace her current clothes (jacket, vest, top, everything) — no old clothing left on any part of her; BOTH arms and both shoulders wear the new product.
KEEP HER REAL FACE (most important): her face, head and hair must stay EXACTLY as the woman in image 1 — identical eyes, nose, mouth, eyebrows, face shape, age, skin tone and hair. Do NOT beautify her, do NOT make her younger, slimmer or prettier, do NOT turn her into a fashion model or a different woman. It must be recognizably the SAME real person from image 1. Only her CLOTHES change; her face does NOT. Keep a similar natural background.
SHOW her FULL BODY from head to feet, standing naturally, wearing elegant WOMEN'S shoes that suit the dress (heels/flats/sandals — NEVER men's shoes, boots or sneakers). If it is a long/maxi dress, show it FULL-LENGTH to the floor with ALL its tiers. Put her face near the TOP and extend the picture DOWNWARD to her feet — do NOT stop at the waist, do NOT add empty sky above her head, nothing cut off at the bottom.${renkKismi}
EXACTLY ONE person — no duplicate, ghost or extra face. Photorealistic, high quality, no text, no watermark, no logo.
IMPORTANT: the result MUST look different from image 1 — she is now wearing the new product, NOT her original clothes. If she still wears her old jacket/vest, it is WRONG.`;
      } else {
        istem = `The person in this photo is a ${kisiIng}. Realistically apply/show this ${cfg.ne} suitable for a ${kisiIng}: "${model.trim()}".${renkKismi} ${cfg.koru} If it is clothing/shoes and the photo shows only the face/upper body, generate a FULL-BODY photo of the same person wearing it. Photorealistic, natural, high quality, no text, no watermark, no logo.`;
      }
      // TEK AŞAMA: gövde + elbise + yüzü koru (2 aşamalı yüz yerleştirme yüzü BULANIKLAŞTIRIYORDU → kaldırıldı)
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
  const reklamdan = !!(baslangic && baslangic.refFotoUrl); // reklamdan gelindi → ürün SABİT, seçicileri gizle
  return (
    <div className={sayfaModu ? "sa-sayfa" : "sa-fon"} onClick={(e) => { if (!sayfaModu && e.target === e.currentTarget) onKapat(); }}
      onTouchStart={(e) => { try { if (e.target.closest && e.target.closest("input, textarea, select, .sa-urun-serit, .sa-renk-serit, .sa-serit, .sa-kats, .sa-foto-buyut, .say-serit")) { dokunRef.current = null; return; } const d = e.touches[0]; dokunRef.current = { x: d.clientX, y: d.clientY }; } catch (x) { dokunRef.current = null; } }}
      onTouchEnd={(e) => { const b = dokunRef.current; dokunRef.current = null; if (!b || buyuk) return; try { const d = e.changedTouches[0]; const dx = d.clientX - b.x, dy = d.clientY - b.y; if (dx < -70 && Math.abs(dx) > Math.abs(dy) * 2 && onKapat) onKapat(); } catch (x) {} }}>
      <div className="sa-pencere">
        {/* SAYFA MODUNDA: üst şerit + ikonlar zaten yukarıda (diğer sayfalar gibi) → buradaki başlık/X gösterme (X ana sayfaya atıyordu).
            PENCERE modunda (eski): kendi başlığı + X. */}
        {!sayfaModu && (
          <div className="sa-ust">
            <span className="sa-baslik">🪞 {t("saBaslik", "Sanal Ayna")}</span>
            <button className="sa-kapat" onClick={onKapat} aria-label={t("kapat", "Kapat")}>✕</button>
          </div>
        )}
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
          {/* İPUCU: kıyafet denemede en iyi sonuç için BOYU görünen fotoğraf (kullanıcı hep bel-üstü selfie yüklüyordu) */}
          {(kategori === "elbise" || kategori === "ayakkabi" || reklamdan) && (
            <div className="sa-boy-ipucu">{t("saBoyIpucu", "💡 En iyi sonuç için BOYUN görünen (dizden yukarı ya da tam boy) bir fotoğraf yükle. Sadece yüz/omuz olursa elbise tam oturmayabilir.")}</div>
          )}

          {/* Reklamdan gelindiyse ürün SABİT → seçicileri gizle, DENE düğmesini hemen fotoğrafın altına koy (kullanıcı: düğme çok aşağıda) */}
          {reklamdan ? (
            <button className="sa-dene sa-dene-buyuk" disabled={yuk} onClick={dene}>{yuk ? "⏳ " + t("saHazir", "Gloxoo hazırlıyor…") : "✨ " + t("saDene", "Fotoğrafımda dene")}</button>
          ) : (
            <>
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
                  <button key={o} className={"sa-cip" + (model === o ? " sec" : "")} onClick={() => setModel(o)}>{ac(o)}</button>
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
                      <button key={r} className={"sa-cip sa-renk-cip" + (renk === r ? " sec" : "")} onClick={() => setRenk(renk === r ? "" : r)}>{ac(r)}</button>
                    ))}
                  </div>
                </>
              )}

              {/* 4) DENE */}
              <button className="sa-dene" disabled={yuk} onClick={dene}>{yuk ? "⏳ " + t("saHazir", "Gloxoo hazırlıyor…") : "✨ " + t("saDene", "Fotoğrafımda dene")}</button>
            </>
          )}
          {hata && <div className="sa-hata">⚠️ {hata}</div>}

          {/* 5) SONUÇ — hazır olunca buraya OTOMATİK kaydırılır. Fotoğrafa dokununca TAM EKRAN + zoom açılır */}
          {sonuc && (
            <div className="sa-sonuc" ref={sonucRef}>
              <div className="sa-sonuc-bas">✅ {t("saSonuc", "Sonuç")}</div>
              <img src={sonuc} alt="" onClick={() => setBuyuk(sonuc)} style={{ cursor: "zoom-in" }} />
              <div className="sa-buyut-ipucu">🔍 {t("saBuyutIpucu", "Fotoğrafa dokun: tam ekran aç, iki parmakla yakınlaştır.")}</div>
              <div className="sa-sonuc-dugmeler">
                <button className={"sa-indir" + (indirildi ? " indi" : "")} onClick={indir}>{indirildi ? "✓ " + t("saIndirildi", "İndirildi") : "⬇️ " + t("saIndir", "İndir")}</button>
                <button className="sa-paylas" onClick={paylas}>📤 {t("saPaylas", "Paylaş")}</button>
                <button className="sa-tekrar" onClick={() => { setSonuc(""); }}>🔁 {t("saTekrar", "Başka model dene")}</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {buyuk && <Buyut url={buyuk} onKapat={() => setBuyuk("")} />}
    </div>
  );
}
