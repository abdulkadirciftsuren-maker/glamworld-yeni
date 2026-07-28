// GLOXORG — ELİTE PAZAR (ürün ilanları: al, sat, kazan). Gloxoo baştan sona içinde.
// Ayrı bileşen → dev Anasayfa dosyasını bozmadan, temiz ve modüler. Firestore: pazarUrunleri.
import React, { useState, useEffect, useRef, useMemo } from "react";
import { pazarUrunEkle, pazarUrunleriOku, pazarUrunSil, pazarFavGuncelle, gorselYukle, videoYukle } from "./veri";
import KayanYazi from "./KayanYazi";
import "./ElitePazar.css";

const AI_KOPRU = "https://gloxorg-ai.abdulkadirciftsuren.workers.dev";

// RENKLİ + İKONLU KATEGORİLER — her birine ayrı renk ve ikon (yazı da yanında)
export const KATEGORILER = [
  { id: "tumu", ad: "Tümü", renk: "#FFD700", ik: "✦" },
  { id: "moda", ad: "Moda", renk: "#e0348b", ik: "👗" },
  { id: "ayakkabi", ad: "Ayakkabı & Çanta", renk: "#c0398b", ik: "👜" },
  { id: "elektronik", ad: "Elektronik", renk: "#2f7fd8", ik: "💻" },
  { id: "telefon", ad: "Telefon", renk: "#00a6a6", ik: "📱" },
  { id: "ev", ad: "Ev & Yaşam", renk: "#2ca85a", ik: "🛋️" },
  { id: "arac", ad: "Araç", renk: "#e0492f", ik: "🚗" },
  { id: "moto", ad: "Motosiklet", renk: "#d13a3a", ik: "🏍️" },
  { id: "yedek", ad: "Yedek Parça", renk: "#6b7280", ik: "🔧" },
  { id: "emlak", ad: "Emlak", renk: "#7a5cd0", ik: "🏠" },
  { id: "bebek", ad: "Bebek", renk: "#ff7aa8", ik: "🍼" },
  { id: "spor", ad: "Spor", renk: "#ff8c1a", ik: "⚽" },
  { id: "hayvan", ad: "Hayvan", renk: "#b5651d", ik: "🐾" },
  { id: "kozmetik", ad: "Kozmetik", renk: "#e84ea8", ik: "💄" },
  { id: "saglik", ad: "Sağlık", renk: "#d6336c", ik: "💊" },
  { id: "kitap", ad: "Kitap & Hobi", renk: "#3a7d44", ik: "📚" },
  { id: "oyun", ad: "Oyun & Konsol", renk: "#5a4fd0", ik: "🎮" },
  { id: "muzik", ad: "Müzik", renk: "#b5417a", ik: "🎸" },
  { id: "bahce", ad: "Bahçe & Yapı", renk: "#4a8c2a", ik: "🌿" },
  { id: "antika", ad: "Antika", renk: "#a0722e", ik: "🏺" },
  { id: "hizmet", ad: "İş / Hizmet", renk: "#1f9e8c", ik: "🧰" },
  { id: "luks", ad: "Lüks", renk: "#d4a017", ik: "💎" },
  { id: "diger", ad: "Diğer", renk: "#8a8a8a", ik: "📦" },
];
const KAT = (id) => KATEGORILER.find((k) => k.id === id) || KATEGORILER[0];

// ETİKETLER
const ETIKETLER = [
  { id: "pazarlik", ad: "🟢 Pazarlık", sinif: "pz" },
  { id: "kargo", ad: "📦 Kargo", sinif: "kg" },
  { id: "elden", ad: "🤝 Elden", sinif: "el" },
  { id: "acil", ad: "🔥 Acil", sinif: "ac" },
  { id: "takas", ad: "🔄 Takas", sinif: "tk" },
  { id: "ucretsiz", ad: "🎁 Ücretsiz", sinif: "uc" },
];

// Fotoğrafı küçült → dataURL (yükleme hızlı + AI görsün)
function fotoKucult(file, max = 1200) {
  return new Promise((cz) => {
    try {
      const rd = new FileReader();
      rd.onload = () => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > max || h > max) { const o = Math.min(max / w, max / h); w = Math.round(w * o); h = Math.round(h * o); }
          const c = document.createElement("canvas"); c.width = w; c.height = h;
          c.getContext("2d").drawImage(img, 0, 0, w, h);
          cz(c.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => cz("");
        img.src = rd.result;
      };
      rd.onerror = () => cz("");
      rd.readAsDataURL(file);
    } catch (e) { cz(""); }
  });
}

export default function ElitePazar({ uid, benAd, benFoto, konum, dil, saticiyaYaz, onPencere, kapatRef }) {
  const [urunler, setUrunler] = useState([]);
  const [yuk, setYuk] = useState(true);
  const [kat, setKat] = useState("tumu");
  const [ara, setAra] = useState("");
  const [detay, setDetay] = useState(null);       // detay için seçilen ürün
  const [satAcik, setSatAcik] = useState(false);   // ilan verme formu
  const [favSet, setFavSet] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem("gw_pazarFav") || "[]")); } catch (e) { return new Set(); } });

  // Ürünleri yükle
  const yukle = async () => { setYuk(true); const l = await pazarUrunleriOku(200); setUrunler(l); setYuk(false); };
  useEffect(() => { yukle(); }, []);

  // ANDROID GERİ DÜĞMESİ: detay/ilan formu açıkken geri basınca onu KAPAT, Elite'de KAL (ana sayfaya atma).
  // Parent'a (Anasayfa) pencere açık mı bildir + kapatma fonksiyonunu ver.
  useEffect(() => {
    const acik = !!(detay || satAcik);
    if (onPencere) onPencere(acik);
    if (kapatRef) kapatRef.current = acik ? () => { setSatAcik(false); setDetay(null); } : null;
  }, [detay, satAcik]); // eslint-disable-line react-hooks/exhaustive-deps
  // Elite'den çıkınca (bileşen kalkınca) temizle
  useEffect(() => () => { if (onPencere) onPencere(false); if (kapatRef) kapatRef.current = null; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtreli = useMemo(() => {
    const a = (ara || "").trim().toLowerCase();
    return urunler.filter((u) => {
      if (kat !== "tumu" && u.kategori !== kat) return false;
      if (a && !((u.urunAd || "").toLowerCase().includes(a) || (u.aciklama || "").toLowerCase().includes(a))) return false;
      return true;
    });
  }, [urunler, kat, ara]);

  const favToggle = (u) => {
    setFavSet((prev) => {
      const s = new Set(prev); const vardi = s.has(u.id);
      if (vardi) s.delete(u.id); else s.add(u.id);
      try { localStorage.setItem("gw_pazarFav", JSON.stringify([...s])); } catch (e) {}
      try { pazarFavGuncelle(u.id, vardi ? -1 : 1); } catch (e) {}
      // ekrandaki sayıyı da anında güncelle
      setUrunler((liste) => liste.map((x) => x.id === u.id ? { ...x, favSayi: Math.max(0, (x.favSayi || 0) + (vardi ? -1 : 1)) } : x));
      return s;
    });
  };

  return (
    <div className="ep-sar">
      {/* SLİM BAŞLIK — üst barda zaten "Elite Pazar" yazıyor, tekrar etme; sadece kısa tanıtım */}
      <div className="ep-ust"><span className="ep-elmas">💎</span><span className="ep-tag">Seçkin ürünler · <b>al, sat, kazan</b></span></div>

      {/* ARAMA */}
      <div className="ep-ara">
        <span className="ep-lup">🔍</span>
        <input value={ara} onChange={(e) => setAra(e.target.value)} placeholder="Ara: telefon, araba, kolye…" />
        {ara && <button className="ep-ara-x" onClick={() => setAra("")}>✕</button>}
      </div>

      {/* RENKLİ + İKONLU KATEGORİLER (yana kayan; yazı sığmazsa kesilmez → yürür) */}
      <div className="ep-kats">
        {KATEGORILER.map((k) => (
          <button key={k.id} className={"ep-chip" + (kat === k.id ? " sec" : "") + (k.id === "tumu" ? " tumu" : "")}
            style={{ "--c": k.renk }} onClick={() => setKat(k.id)}>
            <span className="ep-chip-ik" aria-hidden="true">{k.ik}</span>
            <span className="ep-chip-ad"><KayanYazi>{k.ad}</KayanYazi></span>
          </button>
        ))}
      </div>

      {/* SAT DÜĞMESİ */}
      <button className="ep-sat" onClick={() => setSatAcik(true)}><span className="ep-arti">＋</span> Ürününü Sat · İlan Ver</button>

      <div className="ep-bolum">✦ {kat === "tumu" ? "Öne Çıkan İlanlar" : KAT(kat).ad}</div>

      {/* IZGARA */}
      {yuk ? (
        <div className="ep-durum">İlanlar yükleniyor…</div>
      ) : filtreli.length === 0 ? (
        <div className="ep-durum">
          {urunler.length === 0 ? "Henüz ilan yok — ilk satan sen ol! 🎉" : "Bu aramaya uygun ilan yok."}
          <button className="ep-durum-btn" onClick={() => setSatAcik(true)}>＋ İlk ilanı ver</button>
        </div>
      ) : (
        <div className="ep-izgara">
          {filtreli.map((u) => {
            const k = KAT(u.kategori); const etk = u.etiketler || [];
            const foto = (u.kapak) || (u.medyalar && u.medyalar[0] && u.medyalar[0].url) || "";
            const videoVar = (u.medyalar || []).some((m) => m.tip === "video");
            const favli = favSet.has(u.id);
            const ucretsiz = etk.includes("ucretsiz");
            return (
              <div className="ep-kart" key={u.id} onClick={() => setDetay(u)}>
                <div className="ep-kfoto" style={foto ? { backgroundImage: `url(${foto})` } : {}}>
                  {!foto && <span className="ep-kfoto-ik">{k.ik}</span>}
                  {etk.includes("acil") && <span className="ep-acil">🔥 Acil</span>}
                  <button className={"ep-fav" + (favli ? " dolu" : "")} onClick={(e) => { e.stopPropagation(); favToggle(u); }}>
                    <span className="ep-kalp">{favli ? "❤️" : "🤍"}</span><b>{u.favSayi || 0}</b>
                  </button>
                  <span className="ep-kkat" style={{ background: k.renk }}><span className="ep-kkat-ik">{k.ik}</span><KayanYazi>{k.ad}</KayanYazi></span>
                  {videoVar && <span className="ep-vid">▶</span>}
                </div>
                <div className="ep-kbil">
                  <div className="ep-kad"><KayanYazi>{u.urunAd || "İlan"}</KayanYazi></div>
                  {etk.length > 0 && (
                    <div className="ep-etks">
                      {etk.slice(0, 2).map((eid) => { const et = ETIKETLER.find((x) => x.id === eid); return et ? <span key={eid} className={"ep-et " + et.sinif}>{et.ad}</span> : null; })}
                    </div>
                  )}
                  <div className={"ep-kfiyat" + (ucretsiz ? " bedava" : "")}>{ucretsiz ? "Ücretsiz" : ("₺" + (u.fiyat || "—"))}</div>
                  <div className="ep-ksat">
                    <span className="ep-kavatar">{(u.saticiFoto) ? <img src={u.saticiFoto} alt="" /> : (u.satici || "?").slice(0, 1).toUpperCase()}</span>
                    <span className="ep-kyer"><KayanYazi>{u.konum || ""}</KayanYazi></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAY */}
      {detay && <PazarDetay urun={detay} benim={detay.sahipUid === uid} favli={favSet.has(detay.id)}
        onKapat={() => setDetay(null)} onFav={() => favToggle(detay)}
        onYaz={() => { setDetay(null); saticiyaYaz && saticiyaYaz({ uid: detay.sahipUid, ad: detay.satici, foto: detay.saticiFoto }, detay); }}
        onSil={async () => { if (window.confirm("Bu ilanı silmek istiyor musun?")) { await pazarUrunSil(detay.id); setDetay(null); yukle(); } }} />}

      {/* İLAN VER FORMU */}
      {satAcik && <SatForm uid={uid} benAd={benAd} benFoto={benFoto} konum={konum} dil={dil}
        onKapat={() => setSatAcik(false)} onYayin={() => { setSatAcik(false); yukle(); }} />}
    </div>
  );
}

// ---------- ÜRÜN DETAYI ----------
function PazarDetay({ urun, benim, favli, onKapat, onFav, onYaz, onSil }) {
  const k = KAT(urun.kategori); const etk = urun.etiketler || [];
  const medyalar = urun.medyalar && urun.medyalar.length ? urun.medyalar : (urun.kapak ? [{ tip: "foto", url: urun.kapak }] : []);
  const [aktif, setAktif] = useState(0);
  const ucretsiz = etk.includes("ucretsiz");
  const m = medyalar[aktif] || medyalar[0];
  return (
    <div className="ep-fon" onClick={(e) => { if (e.target === e.currentTarget) onKapat(); }}>
      <div className="ep-detay">
        <button className="ep-detay-x" onClick={onKapat}>✕</button>
        <div className="ep-dmedya">
          {m ? (m.tip === "video"
            ? <video src={m.url} controls playsInline />
            : <img src={m.url} alt="" />)
            : <span className="ep-dmedya-ik">{k.ik}</span>}
        </div>
        {medyalar.length > 1 && (
          <div className="ep-dkucuk">
            {medyalar.map((mm, i) => (
              <button key={i} className={"ep-dk" + (i === aktif ? " sec" : "")} onClick={() => setAktif(i)}
                style={mm.tip !== "video" ? { backgroundImage: `url(${mm.url})` } : {}}>{mm.tip === "video" ? "▶" : ""}</button>
            ))}
          </div>
        )}
        <div className="ep-dbil">
          <span className="ep-dkat" style={{ background: k.renk }}>{k.ad}</span>
          <h2 className="ep-dad">{urun.urunAd}</h2>
          <div className={"ep-dfiyat" + (ucretsiz ? " bedava" : "")}>{ucretsiz ? "Ücretsiz 🎁" : ("₺" + (urun.fiyat || "—"))}</div>
          {etk.length > 0 && (
            <div className="ep-etks">
              {etk.map((eid) => { const et = ETIKETLER.find((x) => x.id === eid); return et ? <span key={eid} className={"ep-et " + et.sinif}>{et.ad}</span> : null; })}
              {urun.durum && <span className="ep-et dr">{urun.durum === "yeni" ? "✨ Yeni" : "İkinci el"}</span>}
            </div>
          )}
          {urun.aciklama && <p className="ep-daciklama">{urun.aciklama}</p>}
          <div className="ep-dsatici">
            <span className="ep-kavatar buyuk">{urun.saticiFoto ? <img src={urun.saticiFoto} alt="" /> : (urun.satici || "?").slice(0, 1).toUpperCase()}</span>
            <div><div className="ep-dsatici-ad">{urun.satici || "Satıcı"}</div><div className="ep-dsatici-yer">{urun.konum || ""}</div></div>
          </div>
          <div className="ep-dbtnlar">
            <button className={"ep-dfav" + (favli ? " dolu" : "")} onClick={onFav}>{favli ? "❤️ Favorimde" : "🤍 Favori"}</button>
            {benim
              ? <button className="ep-dsil" onClick={onSil}>🗑️ İlanı Sil</button>
              : <button className="ep-dyaz" onClick={onYaz}>💬 Satıcıya Yaz</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- İLAN VER FORMU (Gloxoo yardımıyla) ----------
function SatForm({ uid, benAd, benFoto, konum, dil, onKapat, onYayin }) {
  const [medyalar, setMedyalar] = useState([]);   // [{tip, url, b64?}]
  const [medyaYuk, setMedyaYuk] = useState(false);
  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [fiyat, setFiyat] = useState("");
  const [kategori, setKategori] = useState("");
  const [durum, setDurum] = useState("ikinci");
  const [konumYazi, setKonumYazi] = useState(konum || ""); // NEREDEN satılıyor (profilden gelir, düzenlenebilir)
  const [etiketler, setEtiketler] = useState(new Set());
  const [gloxDurum, setGloxDurum] = useState(""); // "yaziyor" | "fiyat" | ""
  const [gloxFiyat, setGloxFiyat] = useState("");
  const [hata, setHata] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const fotoRef = useRef(null), videoRef = useRef(null);

  const kapakB64 = (medyalar.find((m) => m.tip === "foto" && m.b64) || {}).b64 || "";

  const fotoSecildi = async (e) => {
    const dosyalar = Array.from(e.target.files || []); e.target.value = "";
    if (!dosyalar.length) return;
    setMedyaYuk(true); setHata("");
    for (const f of dosyalar.slice(0, 6)) {
      try {
        const durl = await fotoKucult(f);
        if (!durl) continue;
        const url = await gorselYukle(durl, uid);
        if (url) setMedyalar((a) => [...a, { tip: "foto", url, b64: durl.split(",")[1] }].slice(0, 8));
      } catch (x) {}
    }
    setMedyaYuk(false);
  };
  const videoSecildi = async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = "";
    if (!f) return;
    if (f.size > 60 * 1024 * 1024) { setHata("Video çok büyük (en fazla 60MB)"); return; }
    setMedyaYuk(true); setHata("");
    try { const url = await videoYukle(f, uid); if (url) setMedyalar((a) => [...a, { tip: "video", url }].slice(0, 8)); } catch (x) { setHata("Video yüklenemedi"); }
    setMedyaYuk(false);
  };
  const medyaSil = (i) => setMedyalar((a) => a.filter((_, j) => j !== i));

  // Gloxoo'yu çağır (görsel + talimat)
  const gloxCagir = async (talimat, b64) => {
    const parcalar = [];
    if (b64) parcalar.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } });
    parcalar.push({ type: "text", text: talimat });
    const mesajlar = [{ role: "user", content: parcalar.length > 1 ? parcalar : talimat }];
    try {
      const r = await fetch(AI_KOPRU, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mesajlar, sistem: "Sen Gloxoo'sun — GLOXORG Elite Pazar satış asistanı. Kısa, net, dürüst ve Türkçe yanıt ver. Ekte ürün fotoğrafı varsa DİKKATLİCE bak ve SADECE gördüğün ürüne göre yaz." }) });
      const j = await r.json().catch(() => ({}));
      return (j && j.metin) || "";
    } catch (e) { return ""; }
  };
  const gloxYaz = async () => {
    if (gloxDurum) return;
    if (!kapakB64 && !baslik) { setHata("Önce bir fotoğraf ekle (Gloxoo ona baksın) ya da başlığa birkaç kelime yaz."); return; }
    setGloxDurum("yaziyor"); setHata("");
    const talimat = `Bu bir Elite Pazar ürün ilanı. ${kapakB64 ? "Ekteki fotoğrafa dikkatlice bak" : ("Ürün: " + baslik)} ve satışa uygun, çekici ama DÜRÜST (abartısız) bir ilan yaz. Kısa bir BAŞLIK (en fazla 8 kelime) ve 2-3 cümlelik bir AÇIKLAMA ver. Türkçe. Yanıtı SADECE şu biçimde ver, başka bir şey yazma:\nBASLIK: ...\nACIKLAMA: ...`;
    const cevap = await gloxCagir(talimat, kapakB64);
    const bm = cevap.match(/BASLIK\s*:\s*(.+)/i);
    const am = cevap.match(/ACIKLAMA\s*:\s*([\s\S]+)/i);
    if (bm) setBaslik(bm[1].trim().replace(/^["']|["']$/g, ""));
    if (am) setAciklama(am[1].trim());
    if (!bm && !am && cevap) setAciklama(cevap.trim());
    setGloxDurum("");
  };
  const gloxFiyatOner = async () => {
    if (gloxDurum) return;
    if (!kapakB64 && !baslik) { setHata("Önce fotoğraf ekle ya da başlık yaz — Gloxoo ona göre fiyat önersin."); return; }
    setGloxDurum("fiyat"); setHata("");
    const talimat = `Bu ürünün Türkiye'deki güncel ikinci el / piyasa değerini TAHMİN et. Ürün: "${baslik || "(fotoğraftaki ürün)"}".${aciklama ? (" Açıklama: " + aciklama) : ""} Makul bir fiyat ARALIĞI ver. Yanıtı SADECE şu biçimde ver: FIYAT: <alt sayı> - <üst sayı> TL. Emin değilsen bile en iyi tahminini ver, "bilmiyorum" DEME.`;
    const cevap = await gloxCagir(talimat, kapakB64);
    const fm = cevap.match(/FIYAT\s*:\s*(.+)/i);
    setGloxFiyat((fm ? fm[1] : cevap).trim());
    setGloxDurum("");
  };
  const fiyatKullan = () => {
    const say = (gloxFiyat.match(/[\d.\s]{2,}/g) || []).map((s) => s.replace(/[^\d]/g, "")).filter(Boolean);
    if (say.length) setFiyat(say[0]);
  };
  const etkToggle = (id) => setEtiketler((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const yayinla = async () => {
    if (gonderiliyor) return;
    const ucretsiz = etiketler.has("ucretsiz");
    if (!baslik.trim()) { setHata("Bir başlık yaz (Gloxoo da yazabilir)."); return; }
    if (!ucretsiz && !String(fiyat).trim()) { setHata("Fiyat yaz (ya da 'Ücretsiz' etiketini seç)."); return; }
    if (!kategori) { setHata("Bir kategori seç."); return; }
    if (medyalar.length === 0) { setHata("En az bir fotoğraf ekle."); return; }
    setGonderiliyor(true); setHata("");
    try {
      const temizMedya = medyalar.map((m) => ({ tip: m.tip, url: m.url }));
      const kapak = (medyalar.find((m) => m.tip === "foto") || {}).url || "";
      await pazarUrunEkle({
        uid, satici: benAd || "Satıcı", saticiFoto: benFoto || "",
        urunAd: baslik.trim(), aciklama: aciklama.trim(),
        fiyat: ucretsiz ? "" : String(fiyat).replace(/[^\d]/g, ""), paraBirimi: "TL",
        kategori: kategori, durum, etiketler: [...etiketler], medyalar: temizMedya, kapak, konum: (konumYazi || konum || "").trim(),
      });
      onYayin();
    } catch (e) {
      setHata("İlan yayınlanamadı: " + ((e && (e.message || e.code)) || "hata") + " (giriş yaptığından ve kuralların yayınlandığından emin ol)");
      setGonderiliyor(false);
    }
  };

  return (
    <div className="ep-fon" onClick={(e) => { if (e.target === e.currentTarget) onKapat(); }}>
      <div className="ep-sat-form">
        <div className="ep-sat-bas"><button className="ep-detay-x" onClick={onKapat}>‹</button><h2>Ürününü Sat</h2></div>
        <div className="ep-sat-icerik">
          {/* FOTO/VİDEO */}
          <div className="ep-kutu">
            <div className="ep-etk">📸 FOTOĞRAF &amp; VİDEO</div>
            <div className="ep-fotolar">
              {medyalar.map((m, i) => (
                <div className="ep-fbox" key={i} style={m.tip === "foto" ? { backgroundImage: `url(${m.url})` } : {}}>
                  {m.tip === "video" && <span className="ep-fbox-vd">▶</span>}
                  <button className="ep-fbox-x" onClick={() => medyaSil(i)}>✕</button>
                </div>
              ))}
              {medyalar.length < 8 && <button className="ep-fekle" onClick={() => fotoRef.current && fotoRef.current.click()}><span className="ep-fp">＋</span>Foto</button>}
              {medyalar.length < 8 && <button className="ep-fekle vid" onClick={() => videoRef.current && videoRef.current.click()}><span className="ep-fp">🎥</span>Video</button>}
            </div>
            {medyaYuk && <div className="ep-yuk-not">Yükleniyor… ⏳</div>}
            <input ref={fotoRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={fotoSecildi} />
            <input ref={videoRef} type="file" accept="video/*" style={{ display: "none" }} onChange={videoSecildi} />
          </div>

          {/* GLOXOO YARDIMCI */}
          <div className="ep-glox">
            <div className="ep-glox-bas"><span className="ep-glox-rozet">💎</span> Gloxoo yardımcın</div>
            <div className="ep-glox-alt">Fotoğrafa bakıp ilanını yazar, fiyat önerir.</div>
            <div className="ep-glox-btnlar">
              <button className="ep-gb" onClick={gloxYaz} disabled={!!gloxDurum}>{gloxDurum === "yaziyor" ? "✍️ Yazıyor…" : "✍️ İlanı Gloxoo yazsın"}</button>
              <button className="ep-gb" onClick={gloxFiyatOner} disabled={!!gloxDurum}>{gloxDurum === "fiyat" ? "💰 Bakıyor…" : "💰 Fiyat öner"}</button>
            </div>
          </div>

          {/* BAŞLIK + AÇIKLAMA */}
          <div className="ep-kutu">
            <div className="ep-etk">📝 BAŞLIK</div>
            <input className="ep-inp" value={baslik} onChange={(e) => setBaslik(e.target.value)} placeholder="Örn: iPhone 15 Pro — temiz, kutulu" />
            <div className="ep-etk" style={{ marginTop: 11 }}>AÇIKLAMA</div>
            <textarea className="ep-inp ep-ta" value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Ürünü anlat: durumu, özellikleri…" rows={3} />
          </div>

          {/* FİYAT + GLOXOO ÖNERİSİ */}
          <div className="ep-kutu">
            <div className="ep-etk">💰 FİYAT (₺)</div>
            <div className="ep-fiyat-in"><span className="ep-tl">₺</span>
              <input className="ep-fiyat-val" inputMode="numeric" value={fiyat} onChange={(e) => setFiyat(e.target.value.replace(/[^\d]/g, ""))} placeholder="0" /></div>
            {gloxFiyat && (
              <div className="ep-glox-fiyat">
                <div className="ep-gf-bas">💎 Gloxoo fiyat önerisi</div>
                <div className="ep-gf-ara">{gloxFiyat}</div>
                <button className="ep-gf-kul" onClick={fiyatKullan}>✓ Öneriyi kullan</button>
              </div>
            )}

            <div className="ep-etk" style={{ marginTop: 13 }}>🏷️ KATEGORİ</div>
            <div className="ep-katsec">
              {KATEGORILER.filter((k) => k.id !== "tumu").map((k) => (
                <button key={k.id} className={"ep-kc" + (kategori === k.id ? " sec" : "")} style={{ "--c": k.renk }} onClick={() => setKategori(k.id)}>{k.ad}</button>
              ))}
            </div>

            <div className="ep-etk" style={{ marginTop: 13 }}>DURUM</div>
            <div className="ep-durum-sec">
              <button className={"ep-dc" + (durum === "ikinci" ? " sec" : "")} onClick={() => setDurum("ikinci")}>İkinci el</button>
              <button className={"ep-dc" + (durum === "yeni" ? " sec" : "")} onClick={() => setDurum("yeni")}>Yeni</button>
            </div>

            <div className="ep-etk" style={{ marginTop: 13 }}>📍 KONUM (nereden satıyorsun)</div>
            <input className="ep-inp" value={konumYazi} onChange={(e) => setKonumYazi(e.target.value)} placeholder="Şehir / İlçe (örn: İstanbul, Kadıköy)" />
            <div className="ep-ipucu">Alıcı nereden aldığını görür. <b>Kargo</b> = her yere gönderirim · <b>Elden</b> = yüz yüze teslim.</div>

            <div className="ep-etk" style={{ marginTop: 13 }}>🏷️ ETİKETLER (nereye/nasıl)</div>
            <div className="ep-etsec">
              {ETIKETLER.map((et) => (
                <button key={et.id} className={"ep-es " + et.sinif + (etiketler.has(et.id) ? " sec" : "")} onClick={() => etkToggle(et.id)}>{et.ad}{etiketler.has(et.id) ? " ✓" : ""}</button>
              ))}
            </div>
          </div>

          {hata && <div className="ep-hata">{hata}</div>}
          <button className="ep-yayinla" onClick={yayinla} disabled={gonderiliyor || medyaYuk}>{gonderiliyor ? "Yayınlanıyor…" : "✦ İlanı Yayınla"}</button>
        </div>
      </div>
    </div>
  );
}
