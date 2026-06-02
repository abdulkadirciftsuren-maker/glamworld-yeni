import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import { mc, ulkeAdiCevir } from "./i18n";
import SurumRozeti from "./SurumRozeti";
import "./Anasayfa.css";

/* GLAMWORLD'e özel ince-çizgi ikonlar (hazır emoji DEĞİL — ANAYASA kuralı) */
const Ikon = {
  home: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>,
  elite: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M5 8h14l-7 12L5 8z" /><path d="M5 8l3-4h8l3 4" /><path d="M9.5 8L12 20 14.5 8" /></svg>,
  topluluk: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><circle cx="17" cy="9" r="2.3" /><path d="M16 14.5a4.6 4.6 0 0 1 4.5 4.5" /></svg>,
  video: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="13" height="12" rx="2.5" /><path d="M16 10l5-3v10l-5-3" /></svg>,
  konum: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>,
  akademi: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-4 9 4-9 4-9-4z" /><path d="M7 11v4.5c0 1.4 2.7 2.5 5 2.5s5-1.1 5-2.5V11" /><path d="M21 9v5" /></svg>,
  profil: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" /></svg>,
  ara: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>,
  menu: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>,
  mesaj: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z" /></svg>,
  kalp: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.5-9.5-9A5.2 5.2 0 0 1 12 6a5.2 5.2 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" /></svg>,
  yorum: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8 8 0 0 1-11.5 7.2L4 20l1.3-4.5A8 8 0 1 1 21 11.5z" /></svg>,
  paylas: <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="2.6" /><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="19" r="2.6" /><path d="M8.3 10.8l7.4-4.3M8.3 13.2l7.4 4.3" /></svg>,
};

// Şeritteki ülkeler (bayrak YOK; yuvarlak altın daire içinde KOD + ad + canlı saat)
const ULKELER_SERIT = [
  { kod: "TR", ad: "Türkiye", tz: "Europe/Istanbul" },
  { kod: "DE", ad: "Almanya", tz: "Europe/Berlin" },
  { kod: "US", ad: "ABD", tz: "America/New_York" },
  { kod: "GB", ad: "İngiltere", tz: "Europe/London" },
  { kod: "AE", ad: "BAE", tz: "Asia/Dubai" },
  { kod: "JP", ad: "Japonya", tz: "Asia/Tokyo" },
  { kod: "UA", ad: "Ukrayna", tz: "Europe/Kyiv" },
  { kod: "FR", ad: "Fransa", tz: "Europe/Paris" },
  { kod: "RU", ad: "Rusya", tz: "Europe/Moscow" },
  { kod: "CN", ad: "Çin", tz: "Asia/Shanghai" },
  { kod: "SA", ad: "S. Arabistan", tz: "Asia/Riyadh" },
  { kod: "BR", ad: "Brezilya", tz: "America/Sao_Paulo" },
];
// Bölge → para birimi (konumdaki para birimini bulmak için)
const BOLGE_PARA = { TR:"TRY", DE:"EUR", US:"USD", GB:"GBP", AE:"AED", JP:"JPY", UA:"UAH", FR:"EUR", RU:"RUB", CN:"CNY", SA:"SAR", BR:"BRL", IT:"EUR", ES:"EUR", NL:"EUR", BE:"EUR", AT:"EUR", CA:"CAD", AU:"AUD", IN:"INR", CH:"CHF", SE:"SEK", NO:"NOK", PL:"PLN", JP_:"JPY" };
const ALTIN_ONS_USD = 2400, GUMUS_ONS_USD = 30, ONS_GRAM = 31.1035; // metaller yaklaşık (gerçek piyasa API'si sonra)

function seritSaat(tz, now) {
  try { return new Intl.DateTimeFormat("tr-TR", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now); }
  catch (e) { return "--:--:--"; }
}
function paraBicim(deger, para, dil) {
  try { return new Intl.NumberFormat(dil || "tr", { style: "currency", currency: para, maximumFractionDigits: deger >= 1000 ? 0 : 2 }).format(deger); }
  catch (e) { return Math.round(deger).toLocaleString(); }
}

export default function Anasayfa() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const dil = i18n.language;
  const [menuAcik, setMenuAcik] = useState(false);
  const [aktifKod, setAktifKod] = useState("home");

  const u = auth.currentUser;
  const adTam = (u && (u.displayName || u.email)) || "GLAMWORLD";
  const harf = (adTam || "G").trim().charAt(0).toUpperCase();

  async function cikisYap() { try { await signOut(auth); } catch (e) {} navigate("/", { replace: true }); }

  // --- Canlı dünya şeridi: saat her saniye, kur internetten (yoksa şerit yine çalışır) ---
  const [now, setNow] = useState(new Date());
  const [kur, setKur] = useState(null);
  const myKod = (() => { try { return (new Intl.Locale(navigator.language).region || "TR").toUpperCase(); } catch (e) { return "TR"; } })();
  const myTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Istanbul"; } catch (e) { return "Europe/Istanbul"; } })();
  const myPara = BOLGE_PARA[myKod] || "USD";
  const myAd = ulkeAdiCevir(myKod, dil, myKod);

  useEffect(() => { const z = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(z); }, []);
  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const r = await fetch("https://open.er-api.com/v6/latest/USD");
        const d = await r.json();
        let btcUsd = 0;
        try { const rb = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"); const db = await rb.json(); btcUsd = (db && db.bitcoin && db.bitcoin.usd) || 0; } catch (e) {}
        if (!iptal && d && d.rates) setKur({ rates: d.rates, btcUsd });
      } catch (e) {}
    })();
    return () => { iptal = true; };
  }, []);

  // Bulunduğum yerin piyasası (kendi para birimimde): USD, EUR, Altın, Gümüş, Bitcoin
  const piyasa = (() => {
    if (!kur || !kur.rates) return null;
    const r = kur.rates;
    const oran = r[myPara] || 1;                 // 1 USD = oran (myPara)
    const eurUsd = r["EUR"] ? 1 / r["EUR"] : 1.08; // 1 EUR kaç USD
    return {
      usd: paraBicim(oran, myPara, dil),
      eur: paraBicim(eurUsd * oran, myPara, dil),
      altin: paraBicim((ALTIN_ONS_USD / ONS_GRAM) * oran, myPara, dil),
      gumus: paraBicim((GUMUS_ONS_USD / ONS_GRAM) * oran, myPara, dil),
      btc: kur.btcUsd ? paraBicim(kur.btcUsd * oran, myPara, dil) : "—",
    };
  })();

  // Şerit öğeleri: her 5 ülkeden sonra "bulunduğum yer + piyasa" eklenir
  const seritOgeler = [];
  ULKELER_SERIT.forEach((c, i) => { seritOgeler.push({ tip: "ulke", ...c }); if ((i + 1) % 5 === 0) seritOgeler.push({ tip: "konum" }); });
  seritOgeler.push({ tip: "konum" });

  const navlar = [
    { k: "home", et: t("navAnaSayfa"), aktif: true },
    { k: "elite", et: t("navElite") },
    { k: "topluluk", et: t("navTopluluk") },
    { k: "video", et: t("navVideo") },
    { k: "konum", et: t("navKonum") },
    { k: "akademi", et: t("navAkademi") },
    { k: "profil", et: t("navProfil") },
  ];

  // AKIŞ (feed) — tüm dünyadan, tüm mesleklerden; örnek veri (arka yüz sonra bağlanır)
  // meslek mc(...) ile seçili dile çevrilir (Japonca dahil). renk=avatar, medya=görsel yeri.
  const akis = [
    { h: "A", ad: "Aylin Kaya", meslek: "İç Mimar", sehir: "Berlin", zaman: "2 sa", puan: "5.0", renk: "linear-gradient(145deg,#00897b,#26a69a)", medya: "linear-gradient(135deg,#0f2027,#203a43,#2c5364)", yazi: "Yeni tamamladığım salon projesinden kareler ✨", begeni: 248 },
    { h: "K", ad: "Kenji Tanaka", meslek: "Mimar", sehir: "Tokyo", zaman: "4 sa", puan: "4.9", renk: "linear-gradient(145deg,#ef6c00,#ffb300)", medya: "linear-gradient(135deg,#42275a,#734b6d)", yazi: "Şehrin kalbinde yeni bir tasarım.", begeni: 512 },
    { h: "S", ad: "Sofia Marino", meslek: "Fotoğrafçı", sehir: "Roma", zaman: "6 sa", puan: "4.8", renk: "linear-gradient(145deg,#c62828,#ef5350)", medya: "linear-gradient(135deg,#603813,#b29f94)", yazi: "Bugünün altın saat çekimi 🌅", begeni: 1340 },
    { h: "D", ad: "Diamond Atelier", meslek: "Kuyumcu", sehir: "Dubai", zaman: "1 gün", puan: "5.0", renk: "linear-gradient(145deg,#b8860b,#ffd700)", medya: "linear-gradient(135deg,#1f1c2c,#928dab)", yazi: "Yeni pırlanta koleksiyonu sergide.", begeni: 2890 },
    { h: "İ", ad: "İstanbul Tekstil", meslek: "Tekstil / Konfeksiyon", sehir: "İstanbul", zaman: "1 gün", puan: "4.7", renk: "linear-gradient(145deg,#ad1457,#ec407a)", medya: "linear-gradient(135deg,#16222a,#3a6073)", yazi: "Yeni sezon üretimimiz başladı 🧵", begeni: 760 },
    { h: "O", ad: "Olena Koval", meslek: "Diş Hekimi", sehir: "Kyiv", zaman: "2 gün", puan: "4.9", renk: "linear-gradient(145deg,#8e24aa,#ba68c8)", medya: "linear-gradient(135deg,#2c3e50,#4ca1af)", yazi: "Gülüşünüz en değerli yatırımınız 🦷", begeni: 430 },
  ];

  return (
    <div className="ana-kok">
      {/* Canlı dünya şeridi — yuvarlak altın kod + ülke + canlı saat; her 5'te konum+piyasa */}
      <div className="ana-serit">
        <div className="ana-serit-akis">
          {[...seritOgeler, ...seritOgeler].map((s, i) => s.tip === "ulke" ? (
            <span className="serit-ulke" key={i}>
              <span className="serit-kod">{s.kod}</span>
              <span className="serit-ad">{ulkeAdiCevir(s.kod, dil, s.ad)}</span>
              <span className="serit-saat">{seritSaat(s.tz, now)}</span>
            </span>
          ) : (
            <span className="serit-konum" key={i}>
              <span className="serit-kod vurgu">{myKod}</span>
              <span className="serit-ad vurgu">{myAd}</span>
              <span className="serit-saat">{seritSaat(myTz, now)}</span>
              {piyasa && (
                <span className="serit-piyasa">
                  <em>$</em>{piyasa.usd}<em>€</em>{piyasa.eur}<em>Altın</em>{piyasa.altin}<em>Gümüş</em>{piyasa.gumus}<em>₿</em>{piyasa.btc}
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Üst başlık */}
      <header className="ana-header">
        <button className="ana-menu-btn" onClick={() => setMenuAcik(true)} aria-label="Menü">{Ikon.menu}</button>
        <div className="ana-logo-sar">
          <span className="ana-logo">GLAM<b>W</b>ORLD</span>
          <span className="ana-alt">{t("anaSubtitle")}</span>
        </div>
        <button className="ana-ara-btn" aria-label="Ara">{Ikon.ara}</button>
        <div className="ana-profil" onClick={() => setMenuAcik(true)}>{harf}</div>
      </header>

      {/* Yatay kayan ikon şeridi — yazı YOK; basınca adı ALTTA çıkar */}
      <nav className="ana-nav">
        {navlar.map((n) => (
          <button key={n.k} className={"ana-nav-oge" + (n.k === aktifKod ? " aktif" : "")} onClick={() => setAktifKod(n.k)}>
            <span className="ana-nav-kutu">{Ikon[n.k]}<span className="ana-nav-rozet">◆</span></span>
          </button>
        ))}
      </nav>
      <div className="ana-nav-altetiket">{(navlar.find((n) => n.k === aktifKod) || navlar[0]).et} •</div>

      {/* Arama */}
      <div className="ana-ara-sar">
        <div className="ana-ara">{Ikon.ara}<span>{t("anaAraPh")}</span></div>
      </div>

      {/* AKIŞ (feed) — aşağı indikçe dünyadan yeni paylaşımlar */}
      <div className="ana-akis">
        {akis.map((p, i) => (
          <article className="ana-post" key={i}>
            <div className="ana-post-bas">
              <span className="ana-post-avatar" style={{ background: p.renk }}>{p.h}</span>
              <div className="ana-post-kim">
                <div className="ana-post-ad">{p.ad} <span className="ana-post-rozet">◆</span></div>
                <div className="ana-post-alt">{mc(p.meslek, dil)} · {p.sehir} · {p.zaman}</div>
              </div>
              <span className="ana-post-puan">★ {p.puan}</span>
            </div>
            <div className="ana-post-yazi">{p.yazi}</div>
            <div className="ana-post-medya" style={{ background: p.medya }}>
              <span className="ana-post-medya-rozet">◆ GLAMWORLD</span>
            </div>
            <div className="ana-post-eylem">
              <button className="ana-post-btn">{Ikon.kalp}<span>{p.begeni.toLocaleString()}</span></button>
              <button className="ana-post-btn">{Ikon.yorum}<span></span></button>
              <button className="ana-post-btn">{Ikon.paylas}<span></span></button>
              <button className="ana-post-btn vurgu" onClick={() => navigate("/profesyonel")}>{Ikon.mesaj}</button>
            </div>
          </article>
        ))}
      </div>

      {/* Profesyonel ol çağrısı */}
      <div className="ana-cta">
        <div className="ana-cta-yazi">
          <h3>{t("anaProMisin")}</h3>
          <p>{t("anaProMisinAlt")}</p>
        </div>
        <button className="ana-cta-btn" onClick={() => navigate("/profesyonel")}>{t("uyeol")}</button>
      </div>

      {/* Alt sabit sekme çubuğu */}
      <nav className="ana-tab">
        <button className="ana-tab-oge aktif">{Ikon.home}<span>{t("tabKesfet")}</span></button>
        <button className="ana-tab-oge">{Ikon.ara}<span>{t("tabAra")}</span></button>
        <button className="ana-tab-oge">{Ikon.konum}<span>{t("navKonum")}</span></button>
        <button className="ana-tab-oge">{Ikon.mesaj}<span>{t("tabMesaj")}</span></button>
        <button className="ana-tab-oge">{Ikon.profil}<span>{t("navProfil")}</span></button>
      </nav>

      {/* Slayt menü */}
      {menuAcik && (
        <>
          <div className="ana-menu-fon" onClick={() => setMenuAcik(false)} />
          <div className="ana-menu">
            <h2 className="ana-menu-ad">{t("menuBaslik")}</h2>
            <p className="ana-menu-kul">{adTam}</p>
            <button className="ana-menu-oge" onClick={() => setMenuAcik(false)}>{t("navAnaSayfa")}</button>
            <button className="ana-menu-oge" onClick={() => setMenuAcik(false)}>{t("navTopluluk")} · {t("anaYakinda")}</button>
            <button className="ana-menu-oge" onClick={() => setMenuAcik(false)}>{t("navAkademi")} · {t("anaYakinda")}</button>
            <button className="ana-menu-oge" onClick={() => { setMenuAcik(false); navigate("/profesyonel"); }}>{t("anaProMisin")}</button>
            <button className="ana-menu-cikis" onClick={cikisYap}>{t("cikisYap")}</button>
          </div>
        </>
      )}

      <SurumRozeti />
    </div>
  );
}
