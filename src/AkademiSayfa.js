// ═══════════════════════════════════════════════════════════════════════════
// AKADEMİ — İKİ KATMANLI EĞİTİM + Gloxoo CİDDİ SINAV + "işini göster" + GLOXORG SERTİFİKASI
// ─────────────────────────────────────────────────────────────────────────────
// Akış: (1) Meslek seç →
//   (2) TEMEL EĞİTİM — Gloxoo meslek hakkında genel eğitim verir (tamamlanır, kesilmez) →
//   (3) ÇEŞİTLER/KONULAR — her tür/ürün TEK TEK: ölçüsü + yapılışı (hamurcu: her hamur; kuaför: her kesim;
//       tırnak: her model). Kullanıcı çeşide dokunur, Gloxoo o çeşidi ölçü/adım ile eksiksiz anlatır →
//   (4) CİDDİ SINAV — profesyonel, zor, anlatılan içerikten (geçme ≥%70) →
//   (5) İşini foto/video ile göster →
//   (6) doğrulanabilir GLOXORG sertifikası (kod + QR).
// DÜRÜST: Bu GLOXORG belgesidir; "uluslararası resmî" DEĞİL (o ancak resmî akreditasyonla olur).
// GÖRSELLİ/VİDEOLU gösterim + "kendi fotoğrafında dene" görsel yapay zekâ ister (paralı) → SIRADA.
// ═══════════════════════════════════════════════════════════════════════════
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MESLEK_LISTESI } from "./meslekler";
import qrOlustur from "qrcode-generator";
import { akademiKayitEkle, akademiKayitlarimOku, gorselYukle, videoYukle, akademiGorselOku, akademiGorselYaz } from "./veri";

// Dosyayı base64'e oku (foto yüklemek için)
function dosyaOku(file) { return new Promise((res) => { try { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(""); r.readAsDataURL(file); } catch (e) { res(""); } }); }
// Benzersiz sertifika kodu (GLX-...)
function kodUret() { return "GLX-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase(); }
// Dil koduna göre AI'ya "hangi dilde yaz" talimatı
const DIL_AD = { tr: "Türkçe", en: "English", de: "Almanca (Deutsch)", fr: "Fransızca", es: "İspanyolca", it: "İtalyanca", pt: "Portekizce", ru: "Rusça", uk: "Ukraynaca", ar: "Arapça", zh: "Çince", ja: "Japonca", hi: "Hintçe" };

export default function AkademiSayfa({ uid, benAd, benFoto, dil, aiKopru, ulke, sehir }) {
  const { t } = useTranslation();
  const [gorunum, setGorunum] = useState("liste"); // liste | kurs | sertifikalarim
  const [ara, setAra] = useState("");
  const [meslek, setMeslek] = useState(null);
  // TEMEL EĞİTİM
  const [ders, setDers] = useState(""); const [dersYuk, setDersYuk] = useState(false);
  // ÇEŞİTLER / KONULAR (her tür tek tek anlatım)
  const [konular, setKonular] = useState(null); const [konularYuk, setKonularYuk] = useState(false);
  const [aktifKonu, setAktifKonu] = useState(""); const [konuDers, setKonuDers] = useState(""); const [konuYuk, setKonuYuk] = useState(false);
  // GÖRSEL (yapay zekâ ile üretilen örnek/model fotoğrafı — bir kez üretilir, saklanır)
  const [kapakGorsel, setKapakGorsel] = useState(""); // mesleğe göre kapak
  const [konuGorsel, setKonuGorsel] = useState(""); const [konuGorselYuk, setKonuGorselYuk] = useState(false);
  const istekNoRef = useRef(0); // çeşitler arası yarış (race) koruması
  // SINAV
  const [sorular, setSorular] = useState(null); const [sinavYuk, setSinavYuk] = useState(false);
  const [cevaplar, setCevaplar] = useState({}); const [sonuc, setSonuc] = useState(null); // {dogru, toplam, gecti}
  // İŞİNİ GÖSTER
  const [isFoto, setIsFoto] = useState(""); const [isVideo, setIsVideo] = useState("");
  const [yukDurum, setYukDurum] = useState(""); // "foto" | "video" | ""
  const [videoYuzde, setVideoYuzde] = useState(0);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [kayitlarim, setKayitlarim] = useState([]);
  const [aktifSertifika, setAktifSertifika] = useState(null);
  const fotoInpRef = useRef(null); const videoInpRef = useRef(null);
  const dilAd = DIL_AD[dil] || "English";
  const GECME = 0.7; // sertifika için geçme oranı (%70) — ciddi sınav

  useEffect(() => { if (uid) akademiKayitlarimOku(uid).then((l) => setKayitlarim(l || [])).catch(() => {}); }, [uid]);

  async function gloxSor(prompt, sistem) {
    try {
      const r = await fetch(aiKopru, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, sistem }) });
      const j = await r.json().catch(() => ({}));
      return (j && j.metin) || "";
    } catch (e) { return ""; }
  }

  // GÖRSEL üret (ÖNCE paylaşımlı önbellek → yoksa yapay zekâ ile üret → Storage'a yükle → önbelleğe yaz).
  // Böylece her model/çeşit fotoğrafı DÜNYADA BİR KEZ üretilir; sonra herkes hazırdan görür (ücret 1 kez).
  async function gorselUret(anahtar, istem) {
    try {
      const eski = await akademiGorselOku(anahtar);
      if (eski) return eski; // hazır — üretme
      const r = await fetch(aiKopru, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ gorsel: istem }) });
      const j = await r.json().catch(() => ({}));
      const b64 = j && j.gorsel;
      if (!b64) return "";
      const url = await gorselYukle("data:image/png;base64," + b64, uid || "akademi");
      if (url) { akademiGorselYaz(anahtar, url).catch(() => {}); return url; }
    } catch (e) {}
    return "";
  }

  // Mesleğe girince o mesleğe uygun KAPAK fotoğrafı (bir kez üretilir, saklanır)
  useEffect(() => {
    if (gorunum !== "kurs" || !meslek) return;
    let iptal = false; setKapakGorsel("");
    const istem = `Professional realistic cover photo representing the profession "${meslek.ad}": a person skillfully working at their craft in a beautiful, tidy workspace. Warm inviting lighting, photorealistic, high quality, no text, no watermark, no logo.`;
    gorselUret("kapak|" + meslek.ad, istem).then((u) => { if (!iptal) setKapakGorsel(u); }).catch(() => {});
    return () => { iptal = true; };
  }, [gorunum, meslek]); // eslint-disable-line react-hooks/exhaustive-deps

  function kursAc(m) {
    setMeslek(m); setGorunum("kurs");
    setDers(""); setKonular(null); setAktifKonu(""); setKonuDers(""); setKonuGorsel(""); setKapakGorsel("");
    setSorular(null); setCevaplar({}); setSonuc(null); setIsFoto(""); setIsVideo(""); setAktifSertifika(null);
  }

  // (2) TEMEL EĞİTİM — genel; TAMAMLANIR (yarım kesilmez), sınırlı uzunluk → tek çağrıya sığar
  async function egitimAl() {
    if (dersYuk || !meslek) return; setDersYuk(true); setDers("");
    const sistem = "Sen Gloxoo'sun — GLOXORG Akademi'nin USTA eğitmeni. Doğru, ölçülü, uygulanabilir bilgi verirsin. Yazını MUTLAKA tamamlarsın, cümleyi yarıda BIRAKMAZSIN.";
    const p = `${dilAd} dilinde, "${meslek.ad}" mesleğine yeni başlayan birine TEMEL eğitim ver (genel tanıtım). Şu başlıkları kullan (her başlık BÜYÜK harf + iki nokta, altına maddeler • ile):
1) BU MESLEK NEDİR — ne iş yapılır, neyi bilmek şart.
2) GEREKLİ MALZEME VE ARAÇLAR — isim isim.
3) TEMEL KURALLAR VE HİJYEN / GÜVENLİK.
4) GENEL ÇALIŞMA AKIŞI — işin baştan sona genel sırası.
5) USTA İPUÇLARI — yeni başlayana altın öğütler.
ÖNEMLİ: En fazla ~14 madde yaz, KISA-ÖZ tut ve MUTLAKA tamamla (yarım cümle bırakma). Çeşitlerin ölçülü-detaylı anlatımını YAPMA (o ayrı bölümde) — burada sadece genel temel.`;
    const c = await gloxSor(p, sistem);
    setDers(c || t("akDersOlmadi", "Eğitim şu an alınamadı, tekrar dene.")); setDersYuk(false);
  }

  // (3a) ÇEŞİTLERİ getir — bu meslekteki tüm tür/ürün/konu listesi (JSON)
  async function konulariYukle() {
    if (konularYuk || !meslek) return; setKonularYuk(true); setKonular(null); setAktifKonu(""); setKonuDers("");
    const sistem = "Sen Gloxoo'sun. SADECE geçerli JSON döndür, başka hiçbir şey yazma.";
    const p = `"${meslek.ad}" mesleğinde öğrenilmesi gereken TÜM tür/ürün/konu başlıklarını listele (örn. fırıncı: her ekmek türü, her poğaça, börek, simit, tatlı…; kuaför: her saç kesimi/modeli; tırnak: her tırnak modeli). ${dilAd} dilinde YAZ. SADECE şu JSON'u döndür: {"konular":["başlık1","başlık2","başlık3"]} — en az 8, en çok 20 başlık, her biri kısa (1-4 kelime). Başka açıklama yazma.`;
    const c = await gloxSor(p, sistem);
    let arr = null;
    try { const temiz = c.replace(/```json|```/g, "").trim(); const o = JSON.parse(temiz.slice(temiz.indexOf("{"), temiz.lastIndexOf("}") + 1)); if (o && Array.isArray(o.konular)) arr = o.konular.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()).slice(0, 20); } catch (e) {}
    setKonular(arr && arr.length ? arr : []); setKonularYuk(false);
  }

  // (3b) Bir çeşidi AÇ — o türün ölçü + adım adım YAPILIŞI (tam, kesilmez) + ÖRNEK FOTOĞRAF (önden/yandan)
  async function konuAc(k) {
    if (aktifKonu === k) { setAktifKonu(""); setKonuDers(""); setKonuGorsel(""); return; } // aynısına dokununca kapat
    const no = ++istekNoRef.current;
    setAktifKonu(k); setKonuDers(""); setKonuGorsel(""); setKonuYuk(true); setKonuGorselYuk(true);
    // GÖRSEL (paralel — metni bekletmesin): o modelin önden/yandan örnek fotoğrafı
    const gIstem = `Professional realistic reference photo of the "${k}" style/product in the profession "${meslek.ad}". Show a clear front view and a side view side by side of the same result. Clean neutral studio background, natural lighting, photorealistic, high detail, no text, no watermark, no logo.`;
    gorselUret(meslek.ad + "|" + k, gIstem).then((u) => { if (istekNoRef.current === no) setKonuGorsel(u); }).catch(() => {}).finally(() => { if (istekNoRef.current === no) setKonuGorselYuk(false); });
    // METİN
    const sistem = "Sen Gloxoo'sun — usta eğitmen. Bir tek konuyu, ölçüleri ve adımlarıyla GERÇEK ve DOĞRU anlatırsın. Yazını MUTLAKA tamamlarsın, yarıda kesmezsin.";
    const p = `${dilAd} dilinde, "${meslek.ad}" mesleğinde "${k}" nasıl yapılır — TEK TEK, adım adım, EKSİKSİZ anlat. Şu başlıklarla (her başlık BÜYÜK harf + iki nokta, altına maddeler • ile):
1) MALZEME / ÖLÇÜLER — KESİN rakamlarla (örn. hamur ise: kaç gr un, kaç ml su, kaç gr tuz, kaç gr maya, kaç gr şeker/yağ; kaç derece, kaç dakika, kaç saat mayalanır). "Biraz/az" DEME, hep RAKAM ver. Konu ölçü içermiyorsa (örn. saç kesimi) bu başlığı "GEREKENLER" yap.
2) ADIM ADIM YAPILIŞ — baştan sona (hazırlık → uygulama → şekil verme → bitirme).
3) PÜF NOKTASI — bu türe özel ustalık sırrı ve sık hata.
En fazla ~16 madde, net ve MUTLAKA tamamla (yarım cümle bırakma).`;
    const c = await gloxSor(p, sistem);
    if (istekNoRef.current === no) { setKonuDers(c || t("akKonuOlmadi", "Şu an alınamadı, tekrar dene.")); setKonuYuk(false); }
  }

  // (4) CİDDİ SINAV — profesyonel, zor; anlatılan içerikten; 8 soru
  async function sinavaGir() {
    if (sinavYuk || !meslek) return; setSinavYuk(true); setSonuc(null); setCevaplar({}); setSorular(null);
    const sistem = "Sen Gloxoo'sun — ciddi bir sınav hazırlayıcısın. SADECE geçerli JSON döndür, başka hiçbir şey yazma. Sorular kolay/çocukça DEĞİL; mesleğin gerçek bilgisini ölçen PROFESYONEL sorular olsun (ölçü, teknik, malzeme, sıra, hata).";
    const p = `${dilAd} dilinde, "${meslek.ad}" mesleği için 8 adet CİDDİ çoktan seçmeli sınav sorusu hazırla. Sorular gerçek mesleki bilgi ölçsün (ölçüler/oranlar, doğru teknik, malzeme, işlem sırası, güvenlik/hijyen, sık yapılan hata). Kolay/genel-kültür DEĞİL. Her sorunun 4 şıkkı olsun, biri doğru. SADECE şu JSON'u döndür: {"sorular":[{"s":"soru","c":["şık1","şık2","şık3","şık4"],"d":0}]} — "d" doğru şıkkın indeksi (0-3). Başka açıklama yazma.`;
    const c = await gloxSor(p, sistem);
    let arr = null;
    try { const temiz = c.replace(/```json|```/g, "").trim(); const o = JSON.parse(temiz.slice(temiz.indexOf("{"), temiz.lastIndexOf("}") + 1)); if (o && Array.isArray(o.sorular)) arr = o.sorular.filter((x) => x && x.s && Array.isArray(x.c) && x.c.length >= 2).slice(0, 8); } catch (e) {}
    setSorular(arr && arr.length ? arr : []); setSinavYuk(false);
  }

  function sinaviBitir() {
    if (!sorular || !sorular.length) return;
    let dogru = 0; sorular.forEach((s, i) => { if (cevaplar[i] === s.d) dogru++; });
    const gecti = dogru >= Math.ceil(sorular.length * GECME);
    setSonuc({ dogru, toplam: sorular.length, gecti });
  }

  async function fotoSec(e) {
    const f = e.target && e.target.files && e.target.files[0]; if (!f || !uid) return;
    setYukDurum("foto"); try { const d = await dosyaOku(f); const url = await gorselYukle(d, uid); if (url) setIsFoto(url); } catch (x) {} setYukDurum("");
    if (fotoInpRef.current) fotoInpRef.current.value = "";
  }
  async function videoSec(e) {
    const f = e.target && e.target.files && e.target.files[0]; if (!f || !uid) return;
    setYukDurum("video"); setVideoYuzde(0);
    try { const url = await videoYukle(f, uid, (p) => setVideoYuzde(p)); if (url) setIsVideo(url); } catch (x) {}
    setYukDurum(""); if (videoInpRef.current) videoInpRef.current.value = "";
  }

  async function sertifikaAl() {
    if (!uid || !meslek || kaydediyor) return;
    if (!sonuc || !sonuc.gecti) { alert(t("akOnceSinav", "Önce sınavı geç.")); return; }
    if (!isFoto && !isVideo) { alert(t("akOnceIs", "Önce yaptığın işi foto ya da video ile göster.")); return; }
    setKaydediyor(true);
    const kod = kodUret();
    const tarih = new Date();
    const tarihMetin = tarih.getDate() + "." + (tarih.getMonth() + 1) + "." + tarih.getFullYear();
    try {
      const id = await akademiKayitEkle({
        uid, ad: benAd || "", foto: benFoto || isFoto || "", meslek: meslek.ad, meslekIk: meslek.ik || "🎓",
        sertifikaKod: kod, puan: sonuc.dogru, puanToplam: sonuc.toplam, durum: "onaylandi",
        isFoto: isFoto || "", isVideo: isVideo || "", ulke: ulke || "", sehir: sehir || "", tarihMetin,
      });
      const yeni = { id, uid, ad: benAd || "", foto: benFoto || isFoto || "", meslek: meslek.ad, meslekIk: meslek.ik || "🎓", sertifikaKod: kod, puan: sonuc.dogru, puanToplam: sonuc.toplam, durum: "onaylandi", isFoto, isVideo, ulke, sehir, tarihMetin, zamanMs: Date.now() };
      setKayitlarim((a) => [yeni, ...a]);
      setAktifSertifika(yeni);
    } catch (e) { alert(t("akKaydOlmadi", "Sertifika oluşturulamadı, tekrar dene.")); }
    setKaydediyor(false);
  }

  // QR üret (sertifika kodunu doğrulama metniyle)
  function qrKaynak(kod) {
    try { const qr = qrOlustur(0, "M"); qr.addData("GLOXORG Akademi Sertifikasi | Kod: " + kod + " | gloxorg.com"); qr.make(); return qr.createDataURL(5, 12); } catch (e) { return ""; }
  }

  // ── SERTİFİKA GÖRÜNÜMÜ ──
  if (aktifSertifika) {
    const s = aktifSertifika;
    return (
      <div className="ana-pencere ak-pencere" key="ak-sertifika">
        <button className="ak-geri" onClick={() => setAktifSertifika(null)}>‹ {t("geri", "Geri")}</button>
        <div className="ak-sertifika">
          <div className="ak-srt-ust"><span className="ak-srt-marka notranslate" translate="no">GLOXORG</span><span className="ak-srt-akademi">🎓 {t("akAkademi", "AKADEMİ")}</span></div>
          <div className="ak-srt-baslik">{t("akSertifika", "SERTİFİKA")}</div>
          <div className="ak-srt-foto">{(s.foto || s.isFoto) ? <img src={s.foto || s.isFoto} alt="" referrerPolicy="no-referrer" /> : <span>{(s.ad || "?").trim()[0]}</span>}</div>
          <div className="ak-srt-ad">{s.ad || "—"}</div>
          <div className="ak-srt-metin">{s.meslekIk} <b>{s.meslek}</b> {t("akTamamladi", "eğitimini başarıyla tamamladı")}</div>
          <div className="ak-srt-puan">✓ {t("akPuan", "Sınav")}: {s.puan}/{s.puanToplam} · {s.tarihMetin}</div>
          <div className="ak-srt-alt">
            <div className="ak-srt-kod"><span>{t("akKod", "Doğrulama kodu")}</span><b>{s.sertifikaKod}</b></div>
            {qrKaynak(s.sertifikaKod) && <img className="ak-srt-qr" src={qrKaynak(s.sertifikaKod)} alt="QR" />}
          </div>
          <div className="ak-srt-not">{t("akSrtNot", "Bu bir GLOXORG Akademi belgesidir. Kod ile doğrulanabilir.")}</div>
        </div>
        {s.isVideo && <video className="ak-is-video" src={s.isVideo} controls playsInline />}
      </div>
    );
  }

  // ── SERTİFİKALARIM ──
  if (gorunum === "sertifikalarim") {
    return (
      <div className="ana-pencere ak-pencere" key="ak-sertlerim">
        <div className="ak-ust"><button className="ak-geri" onClick={() => setGorunum("liste")}>‹ {t("geri", "Geri")}</button><div className="ak-ust-bas">🏅 {t("akSertifikalarim", "Sertifikalarım")}</div></div>
        {kayitlarim.length === 0 ? (
          <div className="ak-bos"><span className="ak-bos-ik">🎓</span><div>{t("akHenuzYok", "Henüz sertifikan yok. Bir eğitim al, sınavı geç, işini göster!")}</div></div>
        ) : (
          <div className="ak-sert-liste">
            {kayitlarim.map((s) => (
              <button className="ak-sert-kart" key={s.id} onClick={() => setAktifSertifika(s)}>
                <span className="ak-sert-ik">{s.meslekIk || "🎓"}</span>
                <span className="ak-sert-bilgi"><b>{s.meslek}</b><span>{s.tarihMetin} · {s.puan}/{s.puanToplam} ✓</span><span className="ak-sert-kod2">{s.sertifikaKod}</span></span>
                <span className="ak-sert-ok">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── KURS (temel eğitim + çeşitler + sınav + işini göster) ──
  if (gorunum === "kurs" && meslek) {
    return (
      <div className="ana-pencere ak-pencere" key="ak-kurs">
        <div className="ak-ust"><button className="ak-geri" onClick={() => setGorunum("liste")}>‹ {t("geri", "Geri")}</button><div className="ak-ust-bas" style={{ background: meslek.bg }}>{meslek.ik} {meslek.ad}</div></div>

        {/* MESLEK KAPAK FOTOĞRAFI (yapay zekâ, bir kez üretilir) */}
        <div className="ak-kapak" style={{ background: meslek.bg }}>
          {kapakGorsel ? <img src={kapakGorsel} alt="" referrerPolicy="no-referrer" /> : <span className="ak-kapak-ik">{meslek.ik}</span>}
        </div>

        {/* 1) TEMEL EĞİTİM */}
        <div className="ak-adim">
          <div className="ak-adim-bas"><span className="ak-adim-no">1</span> 📚 {t("akTemelEgitim", "Temel Eğitim")}</div>
          <div className="ak-adim-alt">{t("akTemelAlt", "Gloxoo bu meslek hakkında genel bilgiyi öğretir.")}</div>
          {!ders && !dersYuk && <button className="ak-btn" onClick={egitimAl}>{t("akEgitimAl", "Eğitimi başlat")}</button>}
          {dersYuk && <div className="ak-yuk">⏳ {t("akHazirliyor", "Gloxoo eğitimi hazırlıyor…")}</div>}
          {ders && <div className="ak-ders">{ders}</div>}
        </div>

        {/* 2) ÇEŞİTLER — her tür tek tek ölçü + yapılışıyla */}
        {ders && (
          <div className="ak-adim">
            <div className="ak-adim-bas"><span className="ak-adim-no">2</span> 🧩 {t("akCesitler", "Çeşitler — hepsi tek tek")}</div>
            <div className="ak-adim-alt">{t("akCesitAlt", "Bir çeşide dokun; Gloxoo onu ölçüsü ve adım adım yapılışıyla anlatır.")}</div>
            {!konular && !konularYuk && <button className="ak-btn" onClick={konulariYukle}>{t("akCesitGetir", "Çeşitleri getir")}</button>}
            {konularYuk && <div className="ak-yuk">⏳ {t("akCesitYuk", "Çeşitler getiriliyor…")}</div>}
            {konular && konular.length === 0 && <div className="ak-yuk">{t("akCesitOlmadi", "Alınamadı.")} <button className="ak-btn kucuk" onClick={konulariYukle}>{t("tekrar", "Tekrar")}</button></div>}
            {konular && konular.length > 0 && (
              <div className="ak-konu-cipler">
                {konular.map((k, i) => (
                  <button key={k + i} className={"ak-konu-cip" + (aktifKonu === k ? " aktif" : "")} onClick={() => konuAc(k)}>{k}</button>
                ))}
              </div>
            )}
            {aktifKonu && (
              <div className="ak-konu-detay">
                <div className="ak-konu-bas">📌 {aktifKonu}</div>
                {/* ÖRNEK FOTOĞRAF (önden/yandan) — yapay zekâ, bir kez üretilir */}
                {konuGorselYuk && !konuGorsel ? (
                  <div className="ak-gorsel-yuk">🖼️ {t("akGorselHazir", "Örnek fotoğraf hazırlanıyor…")}</div>
                ) : konuGorsel ? (
                  <img className="ak-konu-gorsel" src={konuGorsel} alt={aktifKonu} referrerPolicy="no-referrer" />
                ) : null}
                {konuYuk ? <div className="ak-yuk">⏳ {t("akKonuYuk", "Gloxoo anlatıyor…")}</div> : <div className="ak-ders">{konuDers}</div>}
              </div>
            )}
          </div>
        )}

        {/* 3) CİDDİ SINAV */}
        {ders && (
          <div className="ak-adim">
            <div className="ak-adim-bas"><span className="ak-adim-no">3</span> 📝 {t("akSinav", "Sınav (ciddi)")}</div>
            <div className="ak-adim-alt">{t("akSinavAlt", "Gerçek mesleki sorular. Sertifika için en az %70 gerekir.")}</div>
            {!sorular && !sinavYuk && <button className="ak-btn" onClick={sinavaGir}>{t("akSinavaGir", "Sınava gir")}</button>}
            {sinavYuk && <div className="ak-yuk">⏳ {t("akSorular", "Sorular hazırlanıyor…")}</div>}
            {sorular && sorular.length === 0 && <div className="ak-yuk">{t("akSinavOlmadi", "Sınav alınamadı, tekrar dene.")} <button className="ak-btn kucuk" onClick={sinavaGir}>{t("tekrar", "Tekrar")}</button></div>}
            {sorular && sorular.length > 0 && (
              <div className="ak-sinav">
                {sorular.map((s, i) => (
                  <div className="ak-soru" key={i}>
                    <div className="ak-soru-m"><b>{i + 1}.</b> {s.s}</div>
                    <div className="ak-secenekler">
                      {s.c.map((c, j) => (
                        <button key={j} className={"ak-secenek" + (cevaplar[i] === j ? " sec" : "") + (sonuc ? (j === s.d ? " dogru" : (cevaplar[i] === j ? " yanlis" : "")) : "")} disabled={!!sonuc} onClick={() => setCevaplar((o) => ({ ...o, [i]: j }))}>{c}</button>
                      ))}
                    </div>
                  </div>
                ))}
                {!sonuc ? (
                  <button className="ak-btn" disabled={Object.keys(cevaplar).length < sorular.length} onClick={sinaviBitir}>{t("akBitir", "Sınavı bitir")}</button>
                ) : (
                  <div className={"ak-sonuc" + (sonuc.gecti ? " gecti" : " kaldi")}>
                    {sonuc.gecti ? "🎉 " + t("akGecti", "Geçtin!") : "😔 " + t("akKaldi", "Geçemedin")} — {sonuc.dogru}/{sonuc.toplam}
                    {!sonuc.gecti && <button className="ak-btn kucuk" onClick={sinavaGir}>{t("akTekrarSinav", "Tekrar dene")}</button>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4) İŞİNİ GÖSTER */}
        {sonuc && sonuc.gecti && (
          <div className="ak-adim">
            <div className="ak-adim-bas"><span className="ak-adim-no">4</span> 🎥 {t("akIsGoster", "Yaptığın işi göster")}</div>
            <div className="ak-adim-alt">{t("akIsAlt", "Kendi yaptığın işi foto ve/veya video ile yükle — sertifikanda kanıt olarak kalır.")}</div>
            <div className="ak-yukle-satir">
              <button className="ak-yukle-btn" onClick={() => fotoInpRef.current && fotoInpRef.current.click()} disabled={yukDurum === "foto"}>{yukDurum === "foto" ? "…" : (isFoto ? "✓ 📷 " + t("akFoto", "Foto") : "📷 " + t("akFotoEkle", "Foto ekle"))}</button>
              <button className="ak-yukle-btn" onClick={() => videoInpRef.current && videoInpRef.current.click()} disabled={yukDurum === "video"}>{yukDurum === "video" ? ("… %" + videoYuzde) : (isVideo ? "✓ 🎥 " + t("akVideo", "Video") : "🎥 " + t("akVideoEkle", "Video ekle"))}</button>
              <input ref={fotoInpRef} type="file" accept="image/*" style={{ display: "none" }} onChange={fotoSec} />
              <input ref={videoInpRef} type="file" accept="video/*" style={{ display: "none" }} onChange={videoSec} />
            </div>
            {isFoto && <img className="ak-onizleme" src={isFoto} alt="" referrerPolicy="no-referrer" />}
            {isVideo && <video className="ak-onizleme" src={isVideo} controls playsInline />}
            <button className="ak-btn ak-sertifika-al" disabled={(!isFoto && !isVideo) || kaydediyor} onClick={sertifikaAl}>{kaydediyor ? "…" : "🏅 " + t("akSertifikamiAl", "Sertifikamı al")}</button>
          </div>
        )}
      </div>
    );
  }

  // ── MESLEK LİSTESİ (ana) ──
  const q = ara.trim().toLocaleLowerCase("tr");
  const liste = q ? MESLEK_LISTESI.filter((m) => (m.ad || "").toLocaleLowerCase("tr").indexOf(q) !== -1) : MESLEK_LISTESI;
  return (
    <div className="ana-pencere ak-pencere" key="ak-liste">
      <div className="ak-hero">
        <div className="ak-hero-bas">🎓 {t("akBaslik", "GLOXORG Akademi")}</div>
        <div className="ak-hero-alt">{t("akHeroAlt", "Her meslek için eğitim al, çeşitleri tek tek öğren, Gloxoo sınavını geç, işini göster — doğrulanabilir sertifikanı kazan.")}</div>
        <button className="ak-sertlerim-btn" onClick={() => setGorunum("sertifikalarim")}>🏅 {t("akSertifikalarim", "Sertifikalarım")}{kayitlarim.length ? " (" + kayitlarim.length + ")" : ""}</button>
      </div>
      <div className="ak-ara-sar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
        <input value={ara} onChange={(e) => setAra(e.target.value)} placeholder={t("akAra", "Meslek ara…")} />
        {ara && <button onClick={() => setAra("")}>✕</button>}
      </div>
      <div className="ak-kurs-izgara">
        {liste.map((m, i) => {
          const alindi = kayitlarim.some((s) => s.meslek === m.ad);
          return (
            <button className="ak-kurs-kart" key={m.ad + i} style={{ background: m.bg }} onClick={() => kursAc(m)}>
              <span className="ak-kurs-ik">{m.ik}</span>
              <span className="ak-kurs-ad">{m.ad}</span>
              {alindi && <span className="ak-kurs-rozet">🏅</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
