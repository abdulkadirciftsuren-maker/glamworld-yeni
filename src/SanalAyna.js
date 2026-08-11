// GLOXORG — SANAL AYNA: müşteri KENDİ fotoğrafında saç / tırnak / makyaj modeli dener.
// Google/Gemini görsel yolu (gloxooResimUret) fotoğraf GİRDİSİ alır → kişinin yüzünü koruyup istenen modeli uygular.
import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { gloxooResimUret } from "./firebase";
import { medyaYaz, medyaOku } from "./medyaDepo"; // üretilen modelleri KALICI sakla (IndexedDB) → "Modellerim" galerisi
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
// Renk çipini İSİM yerine GERÇEK RENK göstermek için (kullanıcı: "renk isimlerini kaldır, renk yap"). Kare kutu (yuvarlak YOK).
const RENK_HEX = { "Siyah": "#141414", "Koyu Kahve": "#3b2416", "Kahve": "#6b4423", "Kumral": "#a86a3d", "Sarı": "#e6c15a", "Bal Köpüğü": "#e2b878", "Kızıl": "#b5462a", "Bakır": "#b87333", "Platin Sarı": "#ece2c0", "Gri / Gümüş": "#bcc0c4", "Mavi": "#3a6fd0", "Pembe": "#e58bb0", "Beyaz": "#fafafa", "Kırmızı": "#d63333", "Lacivert": "#1f2a55", "Yeşil": "#2e9e5b", "Mor": "#7a4fd0", "Turuncu": "#e8792a", "Bej": "#e3d1a8", "Gri": "#9aa0a6", "Altın": "#d4af37", "Gümüş": "#c8ccd0" };
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

// KAYAN ŞERİT — tek satırlık yatay şerit: HEM kendiliğinden yavaşça yürür HEM parmakla sağa-sola çekilir.
// Parmakla dokununca yürüme durur, bırakınca 2.5 sn sonra tekrar başlar. (Sayfayı kısaltır: çipler alt alta değil, tek şeritte.)
// Not: dış kapsayıcıda .sa-serit swipe-ile-kapatmadan MUAF (SanalAyna onTouchStart listesinde), o yüzden çekince sayfa DEĞİŞMEZ.
function KayanSerit({ className, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let raf = 0, duraklat = 0, yon = 1;
    const dur = () => { duraklat = Date.now() + 2500; };
    const adim = () => {
      try {
        if (el && Date.now() > duraklat && el.scrollWidth > el.clientWidth + 4) {
          el.scrollLeft += 0.4 * yon;
          if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 1) yon = -1;
          else if (el.scrollLeft <= 0) yon = 1;
        }
      } catch (e) {}
      raf = requestAnimationFrame(adim);
    };
    el.addEventListener("touchstart", dur, { passive: true });
    el.addEventListener("pointerdown", dur, { passive: true });
    el.addEventListener("wheel", dur, { passive: true });
    el.addEventListener("mouseenter", dur, { passive: true });
    raf = requestAnimationFrame(adim);
    return () => { try { cancelAnimationFrame(raf); el.removeEventListener("touchstart", dur); el.removeEventListener("pointerdown", dur); el.removeEventListener("wheel", dur); el.removeEventListener("mouseenter", dur); } catch (e) {} };
  }, []);
  return <div ref={ref} className={"sa-serit" + (className ? " " + className : "")}>{children}</div>;
}
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

export default function SanalAyna({ onKapat, baslangic, onKatman, sayfaModu, onGloxorgPaylas, onGloxorgVideoPaylas }) {
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
  // CANLI MANKEN — aynı kişi+aynı kıyafet birçok AÇIDAN üretilip art arda oynatılır → dönen/yürüyen manken (video gibi)
  const [kareler, setKareler] = useState([]);     // manken kareleri (dataURL dizisi)
  const [kareYuk, setKareYuk] = useState(false);  // kareler hazırlanıyor mu
  const [kareIlerleme, setKareIlerleme] = useState(0); // kaç kare hazır (ilerleme göstergesi)
  const [kareIdx, setKareIdx] = useState(0);      // oynatmada gösterilen kare
  const [oynat, setOynat] = useState(false);      // oynatılıyor mu
  const [mankenTamEkran, setMankenTamEkran] = useState(false); // manken animasyonu TAM EKRAN oynasın (ekran videosu almak için)
  const [klipYuk, setKlipYuk] = useState(false); // canlı manken → hareketli VİDEO klip hazırlanıyor mu (paylaşım için)
  // MODELLERİM GALERİSİ — ürettiğin her sonucu kalıcı sakla (görsel IndexedDB'de, liste localStorage'da); sonra görüntüle/paylaş/sil.
  const [modeller, setModeller] = useState(() => { try { return JSON.parse(localStorage.getItem("gw_ayna_modeller") || "[]"); } catch (e) { return []; } });
  const [galeriAcik, setGaleriAcik] = useState(false);
  const [galeriResim, setGaleriResim] = useState({}); // id -> dataURL (IndexedDB'den yüklenir)
  const [kaydedildi, setKaydedildi] = useState(false);
  // Galeri açılınca kayıtlı modellerin görsellerini IndexedDB'den yükle
  useEffect(() => {
    if (!galeriAcik) return; let iptal = false;
    (async () => { for (const o of modeller) { if (galeriResim[o.id]) continue; try { const d = await medyaOku("ayna_" + o.id); if (!iptal && d) setGaleriResim((m) => ({ ...m, [o.id]: d })); } catch (e) {} } })();
    return () => { iptal = true; };
  }, [galeriAcik, modeller]); // eslint-disable-line react-hooks/exhaustive-deps
  const inpRef = useRef(null);
  const kamRef = useRef(null); // YÜZ FOTOĞRAFINI ORACIKTA KAMERAYLA ÇEK (kullanıcı: "yüz fotoğraf çekme yeri yok")
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
    setYuk(true); setHata(""); setSonuc(""); setKareler([]); setOynat(false); setKareIdx(0);
    try {
      const base64 = foto.split(",")[1] || "";
      const cfg = KATEGORI_ISTEM[kategori] || KATEGORI_ISTEM.sac;
      const kisiIng = (KISILER.find((x) => x.k === kisi) || {}).ing || "person";
      const renkKismi = renk ? ` Color: ${renk}.` : "";
      // CİNSİYETE GÖRE ayakkabı/stil (kullanıcı: bazen erkeğe bayan ayakkabısı giydiriyordu)
      const erkekMi = (kisi === "erkek" || kisi === "erkekcocuk");
      const O = erkekMi ? "him" : "her";      // nesne (him/her)
      const OO = erkekMi ? "he" : "she";      // özne (he/she)
      const IYE = erkekMi ? "his" : "her";    // iyelik (his/her)
      const ayakkabiIng = erkekMi
        ? "appropriate MEN'S shoes (dress shoes, loafers, boots or clean sneakers) — NEVER women's heels, sandals or women's shoes"
        : "elegant WOMEN'S shoes that suit the outfit (heels, flats or sandals) — NEVER men's shoes or boots";
      const cinsNot = ` VERY IMPORTANT: this person is a ${kisiIng}; the clothing, SHOES and styling MUST match this gender — never put women's shoes/heels on a man, never put men's shoes on a woman.`;
      // PROFESYONEL STÜDYO KALİTESİ (kullanıcı: sonuç reklamlardaki gibi kaliteli olsun, sönük/dandik değil).
      const KALITE = "Ultra photorealistic, professional studio photography, soft cinematic flattering lighting, sharp focus, ultra-high resolution, fashion-magazine quality, clean elegant background, natural skin texture. It must stay the SAME real person — do NOT beautify, slim, age or change the face. Exactly ONE person, no duplicate or extra face. No text, no watermark, no logo.";
      const boyKategori = (kategori === "elbise" || kategori === "ayakkabi");
      let istem, ref2 = null;
      if (refFoto) {
        // İKİ görsel: 1. kişi (müşteri), 2. ürün → o EXACT ÜRÜNÜ kişinin üstünde, BOYDAN göster (reklamdan "üstümde dene")
        ref2 = { base64: refFoto.split(",")[1] || "", mediaType: refMime };
        const urunTip = { elbise: "the outfit/garment", ayakkabi: "the pair of shoes", canta: "the bag", aksesuar: "the accessory", makyaj: "the makeup look", sac: "the hairstyle", tirnak: "the nails" }[kategori] || "the product";
        const tarifKismi = (baslangic && baslangic.tarif) ? ` Product details — ${baslangic.tarif}.` : "";
        istem = `Take the ${kisiIng} from the FIRST image and show ${O} actually WEARING the ${urunTip} from the SECOND image.
MUST DO — dress ${O} in that exact product: copy its exact print, pattern, colors, neckline, sleeves, fabric and full length from image 2.${tarifKismi} COMPLETELY remove and replace ${IYE} current clothes (jacket, vest, top, everything) — no old clothing left on any part of ${O}; both arms and both shoulders wear the new product.
KEEP ${IYE.toUpperCase()} REAL FACE (most important): ${IYE} face, head and hair must stay EXACTLY as the ${kisiIng} in image 1 — identical eyes, nose, mouth, eyebrows, face shape, age, skin tone and hair. Do NOT beautify ${O}, do NOT make ${O} younger, slimmer or prettier, do NOT turn ${O} into a fashion model or a different person. It must be recognizably the SAME real person from image 1. Only ${IYE} CLOTHES change; ${IYE} face does NOT. Keep a similar natural background.
SHOW ${IYE} FULL BODY from head to feet, standing naturally, wearing ${ayakkabiIng}. If it is a long/maxi dress, show it FULL-LENGTH to the floor with ALL its tiers. Put the face near the TOP and extend the picture DOWNWARD to the feet — do NOT stop at the waist, do NOT add empty sky above the head, nothing cut off at the bottom.${renkKismi}
Present it like a high-end fashion studio photo: elegant pose, soft cinematic lighting, clean background.${renkKismi}${cinsNot}
${KALITE}
IMPORTANT: the result MUST look different from image 1 — ${OO} is now wearing the new product, NOT ${IYE} original clothes.`;
      } else if (boyKategori) {
        // KIYAFET / AYAKKABI → TAM BOY profesyonel moda çekimi (reklamdaki kırmızı elbise gibi)
        istem = `The person in this photo is a ${kisiIng}. Show the SAME person wearing this ${cfg.ne}: "${model.trim()}".${renkKismi} ${cfg.koru} Show a FULL-BODY shot from head to feet, standing in an elegant natural pose like a professional fashion studio / runway photo, wearing ${ayakkabiIng}. Put the face near the TOP and extend downward to the feet — nothing cut off at waist or bottom, no empty space above the head.${cinsNot} ${KALITE}`;
      } else {
        // SAÇ / MAKYAJ / TIRNAK / AKSESUAR → net, iyi ışıklı yakın çekim (o özellik iyi görünsün)
        istem = `The person in this photo is a ${kisiIng}. Realistically apply this ${cfg.ne} suitable for a ${kisiIng}: "${model.trim()}".${renkKismi} ${cfg.koru} Clean, well-lit portrait so the new ${cfg.ne} is clearly and beautifully visible. ${KALITE}`;
      }
      // TEK AŞAMA: gövde + elbise + yüzü koru (2 aşamalı yüz yerleştirme yüzü BULANIKLAŞTIRIYORDU → kaldırıldı)
      const res = await gloxooResimUret(istem, { base64, mediaType: fotoMime }, ref2);
      if (res && res.dataUrl) setSonuc(res.dataUrl);
      else setHata(t("saOlmadi", "Şu an yapılamadı, tekrar dene."));
    } catch (e) { setHata((e && e.message) ? String(e.message) : t("saOlmadi", "Şu an yapılamadı, tekrar dene.")); }
    setYuk(false);
  }
  // GENEL indir/paylaş (hem güncel sonuç hem galerideki model için)
  function indirVer(dataUrl, etiket) {
    if (!dataUrl) return;
    try {
      const et = (etiket || "model").toString().toLocaleLowerCase("tr").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);
      const a = document.createElement("a");
      a.href = dataUrl; a.download = "gloxorg-" + (et || "sanal-ayna") + "-" + Date.now().toString(36) + ".png";
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) {}
  }
  async function paylasVer(dataUrl, etiket) {
    if (!dataUrl) return;
    try {
      if (navigator.share && navigator.canShare) {
        const bl = await (await fetch(dataUrl)).blob();
        const dosya = new File([bl], "gloxorg-sanal-ayna.png", { type: "image/png" });
        if (navigator.canShare({ files: [dosya] })) { await navigator.share({ files: [dosya], title: "GLOXORG Sanal Ayna" }); return; }
      }
      indirVer(dataUrl, etiket);
    } catch (e) {}
  }
  function indir() { if (!sonuc) return; indirVer(sonuc, model || kategori); setIndirildi(true); setTimeout(() => setIndirildi(false), 2500); }
  function paylas() { paylasVer(sonuc, model || kategori); }
  // CANLI MANKEN — kareleri belli aralıkla döndürerek oynat (flipbook → dönen manken hissi)
  useEffect(() => {
    if (!oynat || kareler.length < 2) return;
    // Daha SAKİN geçiş (kullanıcı: "çabuk/hızlı geçiyor") — her kare ~1.5 sn dursun, yumuşak dönsün
    const id = setInterval(() => setKareIdx((i) => (i + 1) % kareler.length), 1500);
    return () => clearInterval(id);
  }, [oynat, kareler.length]); // eslint-disable-line react-hooks/exhaustive-deps
  // CANLI MANKEN ÜRET — mevcut sonucu (önden görünüş) 1. kare al, aynı kişi+kıyafeti başka açılardan üret, sonra döndür.
  async function canliMankenYap() {
    if (!sonuc || kareYuk) return;
    setKareYuk(true); setHata(""); setKareler([]); setKareIdx(0); setOynat(false);
    // YÜRÜYEN MANKEN (kullanıcı: "sadece dönmesin; arkadan gelsin, dönsün, yürüyerek gitsin"). Kare0 = mevcut ÖNDEN (varış).
    // Döngü: önden(varış) → dönmeye başla → yandan yürü → arkadan uzaklaşarak yürü → uzakta arkadan → dönüp ÖNE doğru yürümeye başla → (başa döner)
    const acilar = [
      "starting to turn to walk away: turned about 45 degrees (three-quarter view), one foot stepping forward, mid-stride, FULL BODY on the runway",
      "turned to the SIDE profile (about 90 degrees), in a natural mid-stride WALKING pose, moving across the runway, FULL BODY head to feet",
      "seen from the BACK (about 180 degrees, turned away), clearly showing the BACK of the same outfit, WALKING AWAY from the camera, mid-stride, FULL BODY",
      "seen from the BACK, now FARTHER AWAY, walking away into the distance on the runway (the person looks smaller, more floor/background visible), FULL BODY",
      "in the distance, now TURNING AROUND to face the camera again and beginning to WALK BACK TOWARD the camera, the front becoming visible, mid-stride, FULL BODY",
    ];
    const yeni = [sonuc]; // 1. kare = mevcut önden görünüş
    const base64 = sonuc.split(",")[1] || "";
    setKareIlerleme(1);
    for (let i = 0; i < acilar.length; i++) {
      const istem = `This image shows a person wearing an outfit. Generate the EXACT SAME real person wearing the EXACT SAME outfit as in this image — identical face, hair, body shape, garment, print, colors, fabric, shoes and the same clean background — but now ${acilar[i]}. Show the FULL BODY from head to feet. Elegant natural pose like a professional fashion studio / runway photo. Ultra photorealistic, soft cinematic flattering lighting, sharp focus, ultra-high resolution. It must stay the SAME real person — do NOT change, beautify, slim or age the face. Exactly ONE person, no duplicate. No text, no watermark, no logo.`;
      try {
        const r = await gloxooResimUret(istem, { base64, mediaType: "image/png" });
        if (r && r.dataUrl) yeni.push(r.dataUrl);
      } catch (e) {}
      setKareIlerleme(yeni.length);
    }
    setKareler(yeni);
    setKareYuk(false);
    if (yeni.length >= 2) { setKareIdx(0); setOynat(true); }
    else setHata(t("saMankenOlmadi", "Şu an canlı manken yapılamadı, tekrar dene."));
  }
  // CANLI MANKEN → HAREKETLİ VİDEO KLİP: kareleri bir canvas'a sırayla çizip MediaRecorder ile kısa bir webm videoya kaydeder.
  // Böylece "GLOXORG'da paylaş" tek KARE değil, YÜRÜYEN mankenin HAREKETLİ klibini paylaşır (kullanıcı isteği). Olmazsa null döner → tek kareye düşülür.
  async function mankenKlipYap() {
    try {
      if (!kareler || kareler.length < 2 || typeof MediaRecorder === "undefined") return null;
      const imgs = await Promise.all(kareler.map((src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); try { im.src = src; } catch (e) { res(null); } })));
      const valid = imgs.filter(Boolean);
      if (valid.length < 2) return null;
      let w = valid[0].naturalWidth || 720, h = valid[0].naturalHeight || 1280;
      if (w > 720) { h = Math.round(h * 720 / w); w = 720; } // boyutu makul tut (dosya şişmesin)
      if (w < 2 || h < 2) { w = 720; h = 1280; }
      const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx || !canvas.captureStream) return null;
      const stream = canvas.captureStream(30);
      let mime = "video/webm";
      try { if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) mime = "video/webm;codecs=vp8"; } catch (e) {}
      let rec; try { rec = new MediaRecorder(stream, { mimeType: mime }); } catch (e) { try { rec = new MediaRecorder(stream); } catch (e2) { return null; } }
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      const bitti = new Promise((res) => { rec.onstop = res; });
      rec.start(120);
      const ciz = (im) => { try { ctx.fillStyle = "#efe6cf"; ctx.fillRect(0, 0, w, h); ctx.drawImage(im, 0, 0, w, h); } catch (e) {} };
      const KARE_MS = 750, DONGU = 2; // her kare ~0.75 sn, sıra 2 kez → yürüyüş döngüsü
      for (let d = 0; d < DONGU; d++) { for (const im of valid) { ciz(im); await new Promise((r) => setTimeout(r, KARE_MS)); } }
      ciz(valid[0]); await new Promise((r) => setTimeout(r, 200));
      try { rec.stop(); } catch (e) {}
      await bitti;
      if (!chunks.length) return null;
      return new Blob(chunks, { type: "video/webm" });
    } catch (e) { return null; }
  }
  // MODELLERİME KAYDET — görseli IndexedDB'ye, kaydı listeye + localStorage'a
  async function kaydetModel() {
    if (!sonuc) return;
    const id = "m" + Date.now().toString(36) + Math.floor(Math.random() * 1e5).toString(36);
    try { await medyaYaz("ayna_" + id, sonuc); } catch (e) {}
    const oge = { id, ad: (model || kategori || "model"), kategori, ms: Date.now() };
    setModeller((L) => { const y = [oge, ...L].slice(0, 80); try { localStorage.setItem("gw_ayna_modeller", JSON.stringify(y)); } catch (e) {} return y; });
    setGaleriResim((m) => ({ ...m, [id]: sonuc }));
    setKaydedildi(true); setTimeout(() => setKaydedildi(false), 2500);
  }
  function modelSil(id) {
    try { if (!window.confirm(t("saModelSilOnay", "Bu modeli silmek istiyor musun?"))) return; } catch (e) {}
    setModeller((L) => { const y = L.filter((x) => x.id !== id); try { localStorage.setItem("gw_ayna_modeller", JSON.stringify(y)); } catch (e) {} return y; });
  }

  const oneri = oneriGetir(kategori, kisi);
  const renkler = renkGetir(kategori);
  const reklamdan = !!(baslangic && baslangic.refFotoUrl); // reklamdan gelindi → ürün SABİT, seçicileri gizle
  return (
    <div className={sayfaModu ? "sa-sayfa" : "sa-fon"} onClick={(e) => { if (!sayfaModu && e.target === e.currentTarget) onKapat(); }}>
      {/* ⛔ PARMAKLA SOLA ÇEKİNCE SAYFA KAPANMASI KALDIRILDI (kullanıcı: "yaptıklarım kayboluyor").
          Sanal Ayna artık SADECE düğmeyle/geri tuşuyla kapanır; içeride parmakla serit kaydırmak sayfayı kapatmaz. */}
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

          {/* ÜST İKİLİ — SOLDA fotoğraf, SAĞDA Modellerim yan yana (sayfa kısa dursun) */}
          <div className="sa-ust-ikili">
            <div className="sa-foto-kutu" onClick={() => inpRef.current && inpRef.current.click()}>
              {foto ? <img src={foto} alt="" /> : <span className="sa-foto-bos">📷<br />{t("saFotoEkle", "Fotoğrafını ekle")}</span>}
              {foto && <span className="sa-foto-degis">🔄 {t("saFotoDegis", "Değiştir")}</span>}
            </div>
            <button className={"sa-modellerim-yan" + (galeriAcik ? " acik" : "")} onClick={() => setGaleriAcik((a) => !a)}>
              <span className="sa-my-ik">🖼️</span>
              <span className="sa-my-ad">{t("saModellerim", "Modellerim")}</span>
              {modeller.length ? <span className="sa-my-say">{modeller.length}</span> : null}
              <span className="sa-my-ok">{galeriAcik ? "▲" : "▼"}</span>
            </button>
          </div>
          {/* YÜZÜNÜ ORACIKTA ÇEK ya da GALERİDEN seç */}
          <div className="sa-foto-dugmeler">
            <button className="sa-foto-btn" onClick={() => kamRef.current && kamRef.current.click()}>📷 {t("saCek", "Fotoğraf çek")}</button>
            <button className="sa-foto-btn" onClick={() => inpRef.current && inpRef.current.click()}>🖼️ {t("saGaleri", "Galeriden seç")}</button>
          </div>
          <input ref={inpRef} type="file" accept="image/*" style={{ display: "none" }} onChange={fotoSec} />
          <input ref={kamRef} type="file" accept="image/*" capture="user" style={{ display: "none" }} onChange={fotoSec} />

          {/* MODELLERİM galerisi — açılınca: kaydettiğin modeller (görüntüle / kuaföre gönder / sil) */}
          {galeriAcik && (
            <div className="sa-galeri">
              {modeller.length === 0 ? (
                <div className="sa-galeri-bos">💛 {t("saGaleriBos", "Henüz kayıtlı modelin yok. Bir model üret, aşağıda 'Modellerime kaydet'e bas.")}</div>
              ) : (
                <div className="sa-galeri-izgara">
                  {modeller.map((o) => (
                    <div key={o.id} className="sa-galeri-oge">
                      {galeriResim[o.id] ? <img src={galeriResim[o.id]} alt="" onClick={() => setBuyuk(galeriResim[o.id])} /> : <div className="sa-galeri-yuk">⏳</div>}
                      <div className="sa-galeri-ad notranslate">{ac(o.ad)}</div>
                      <div className="sa-galeri-dug">
                        <button onClick={() => galeriResim[o.id] && paylasVer(galeriResim[o.id], o.ad)} title={t("saPaylas", "Paylaş")}>📤</button>
                        <button onClick={() => modelSil(o.id)} title={t("sil", "Sil")}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* İPUCU: kıyafet/ayakkabı denemede en iyi sonuç için BOYU görünen fotoğraf */}
          {(kategori === "elbise" || kategori === "ayakkabi" || reklamdan) && (
            <div className="sa-boy-ipucu">{t("saBoyIpucu", "💡 En iyi sonuç için BOYUN görünen (dizden yukarı ya da tam boy) bir fotoğraf yükle. Sadece yüz/omuz olursa elbise tam oturmayabilir.")}</div>
          )}

          {/* Reklamdan gelindiyse ürün SABİT → seçicileri gizle, DENE düğmesini hemen fotoğrafın altına koy (kullanıcı: düğme çok aşağıda) */}
          {reklamdan ? (
            <button className="sa-dene sa-dene-buyuk" disabled={yuk} onClick={dene}>{yuk ? "⏳ " + t("saHazir", "Gloxoo hazırlıyor…") : "✨ " + t("saDene", "Fotoğrafımda dene")}</button>
          ) : (
            <>
              {/* 1b) KİM İÇİN — TEK ŞERİT (hem yürür hem parmakla çekilir; çekince sayfa DEĞİŞMEZ) */}
              <div className="sa-kim-bas">{t("saKimIcin", "Kim için?")}</div>
              <KayanSerit className="sa-kisi-serit">
                {KISILER.map((ks) => (
                  <button key={ks.k} className={"sa-kisi" + (kisi === ks.k ? " sec" : "")} onClick={() => { setKisi(ks.k); setModel(""); }}>{ks.ik} {t(ks.ck, ks.ad)}</button>
                ))}
              </KayanSerit>

              {/* 2) KATEGORİ — TEK ŞERİT */}
              <div className="sa-kim-bas" style={{ marginTop: 8 }}>{t("saNeDenensin", "Ne denensin?")}</div>
              <KayanSerit className="sa-kat-serit">
                {KATEGORILER.map((kt) => (
                  <button key={kt.k} className={"sa-kat" + (kategori === kt.k ? " sec" : "")} onClick={() => { setKategori(kt.k); setModel(""); setRenk(""); }}>{kt.ik} {t(kt.ck, kt.ad)}</button>
                ))}
              </KayanSerit>

              {/* 3) MODEL — öneri çipleri TEK ŞERİT + yaz */}
              {oneri.length > 0 && (
                <KayanSerit className="sa-oneri-serit">
                  {oneri.map((o) => (
                    <button key={o} className={"sa-cip" + (model === o ? " sec" : "")} onClick={() => setModel(o)}>{ac(o)}</button>
                  ))}
                </KayanSerit>
              )}
              <input className="sa-model-input" type="text" value={model} onChange={(e) => setModel(e.target.value)}
                placeholder={t("saModelYaz", "Model yaz (örn. Ombre saç) ya da yukarıdan seç")} />

              {/* 3b) RENK — üstte açıklama, küçük renk kareleri TEK ŞERİT (İSİM YOK); tekrar dokununca kaldırılır */}
              {renkler.length > 0 && (
                <>
                  <div className="sa-kim-bas" style={{ marginTop: 8 }}>🎨 {t("saRenk", "Renk (isteğe bağlı)")} — {t("saRenkDokun", "dokun ve seç")}</div>
                  <KayanSerit className="sa-renk-serit">
                    {renkler.map((r) => (
                      <button key={r} className={"sa-renk-kutu2" + (renk === r ? " sec" : "")} onClick={() => setRenk(renk === r ? "" : r)} title={ac(r)} aria-label={ac(r)}>
                        <span className="sa-renk-ornek2" style={{ background: RENK_HEX[r] || "#ccc" }} />
                      </button>
                    ))}
                  </KayanSerit>
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
                <button className={"sa-kaydet-model" + (kaydedildi ? " indi" : "")} onClick={kaydetModel}>{kaydedildi ? "✓ " + t("saKaydedildi", "Modellerime eklendi") : "💾 " + t("saKaydet", "Modellerime kaydet")}</button>
                <button className={"sa-indir" + (indirildi ? " indi" : "")} onClick={indir}>{indirildi ? "✓ " + t("saIndirildi", "İndirildi") : "⬇️ " + t("saIndir", "İndir")}</button>
                <button className="sa-tekrar" onClick={() => { setSonuc(""); setKareler([]); setOynat(false); setKareIdx(0); }}>🔁 {t("saTekrar", "Başka model dene")}</button>
              </div>
              {/* PAYLAŞ — hem GLOXORG'da (kendi feed'in) hem diğer platformlar (WhatsApp/Instagram vb.) */}
              <div className="sa-paylas-satir">
                {onGloxorgPaylas && <button className="sa-paylas-glox" onClick={() => onGloxorgPaylas(sonuc)}>💎 {t("saGloxordaPaylas", "GLOXORG'da paylaş")}</button>}
                <button className="sa-paylas-diger" onClick={paylas}>📤 {t("saDigerPaylas", "Diğer platformlar")}</button>
              </div>

              {/* 🎬 CANLI MANKEN — aynı kişi+aynı kıyafet birçok açıdan üretilip döndürülür (reklamdaki gibi dönen manken) */}
              <button className="sa-manken-btn" disabled={kareYuk} onClick={canliMankenYap}>
                {kareYuk
                  ? "⏳ " + t("saMankenYap", "Canlı manken hazırlanıyor…") + " (" + kareIlerleme + "/5)"
                  : "🎬 " + t("saManken", "Canlı manken yap (döndür)")}
              </button>
              {kareler.length >= 2 && (
                <div className="sa-manken">
                  <img key={kareIdx} src={kareler[kareIdx]} alt="" onClick={() => setBuyuk(kareler[kareIdx])} style={{ cursor: "zoom-in" }} />
                  <div className="sa-manken-dug">
                    <button onClick={() => setOynat((o) => !o)}>{oynat ? "⏸ " + t("saDurdur", "Durdur") : "▶️ " + t("saOynat", "Oynat")}</button>
                    <button onClick={() => { setOynat(true); setMankenTamEkran(true); }}>🔳 {t("saTamEkran", "Tam ekran")}</button>
                  </div>
                  <div className="sa-manken-dug">
                    {(onGloxorgVideoPaylas || onGloxorgPaylas) && <button disabled={klipYuk} onClick={async () => {
                      if (onGloxorgVideoPaylas) {
                        setKlipYuk(true);
                        let blob = null; try { blob = await mankenKlipYap(); } catch (e) {}
                        setKlipYuk(false);
                        if (blob) { onGloxorgVideoPaylas(blob, kareler[0]); return; }
                      }
                      if (onGloxorgPaylas) onGloxorgPaylas(kareler[kareIdx]); // klip olmazsa: tek kare (yine de paylaşılır)
                    }}>{klipYuk ? "⏳ " + t("saKlipHaz", "Canlı klip hazırlanıyor…") : "💎 " + t("saGloxordaPaylasCanli", "GLOXORG'da paylaş (canlı)")}</button>}
                    <button onClick={() => paylasVer(kareler[kareIdx], model || kategori)}>📤 {t("saDigerPaylas", "Diğer platformlar")}</button>
                    <button onClick={() => indirVer(kareler[kareIdx], model || kategori)}>⬇️ {t("saIndir", "İndir")}</button>
                  </div>
                  <div className="sa-manken-not">💡 {t("saMankenNot3", "'💎 GLOXORG'da paylaş (canlı)' → yürüyen mankenin HAREKETLİ klibini akışta paylaşır (tek kare değil). İstersen '🔳 Tam ekran' ile oynatıp telefonun EKRAN KAYDIYLA da çekebilirsin.")}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {buyuk && <Buyut url={buyuk} onKapat={() => setBuyuk("")} />}
      {/* CANLI MANKEN — TAM EKRAN oynatıcı: manken tam sayfa döner → kullanıcı EKRAN KAYDI ile videosunu alır. Zemin ALTIN (siyah yok). */}
      {mankenTamEkran && kareler.length >= 2 && (
        <div className="sa-manken-tam" onClick={() => setMankenTamEkran(false)}>
          <img key={kareIdx} src={kareler[kareIdx]} alt="" />
          <button className="sa-manken-tam-kapat" onClick={(e) => { e.stopPropagation(); setMankenTamEkran(false); }} aria-label={t("kapat", "Kapat")}>✕</button>
          <div className="sa-manken-tam-not">🎥 {t("saTamEkranNot", "Telefonun EKRAN KAYDINI başlat — manken dönüyor. Bitince ✕ ile kapat.")}</div>
        </div>
      )}
    </div>
  );
}
