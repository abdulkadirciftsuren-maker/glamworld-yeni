// GLOXORG CANLI — "Canlı Akış" sekmesinin yerine (10 Kas 2026, kullanıcı: "Canlı ders ve danışmanlık olsun ... sayfayı güzel
// yapalım, dandik olmasın; istediğin rengi kullan, sadece sarı olmasın, siyah da olabilir"). Plan: CANLI-DERS-PLAN.md (Aşama 1).
//  - Profesyoneller (profilinde meslek olanlar) CANLI YAYIN açar: ön/arka kamera, mikrofon, izleyici sayısı, canlı yorum, kalp.
//  - Herkes izler, yorum yazar, kalp atar; yayıncı yorumu silebilir / kişiyi yayından çıkarabilir; izleyici şikâyet edebilir.
//  - Görüntü kendi sunucumuzdan (Hetzner + LiveKit, Glome aramalarıyla aynı). Oda adı: "canli_<yayinId>".
//  - Veritabanı: canliYayinlar/{id} (durum "canli"/"bitti", sonNabiz her 20 sn) + canliYayinlar/{id}/yorumlar.
//  - Takipçilere "X canlı yayında" bildirimi sunucudan gider (functions/index.js canliYayinBildirim).
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { collection, doc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, getDocs, query, where, orderBy, limit, serverTimestamp, increment, arrayUnion } from "firebase/firestore";
import { db } from "./firebase";
import { livekitYukle, livekitHemen } from "./agirKutuphaneler";
import KayanYazi from "./KayanYazi";
import { mc } from "./i18n";
import "./CanliDers.css";

const NABIZ_MS = 20000;      // yayıncı her 20 sn "buradayım" der
const OLU_MS = 75000;        // 75 sn nabız gelmeyen yayın listede gösterilmez (telefon kapandı / internet gitti)
const ONE_CIKAN = ["Kuaför", "Makyaj Sanatçısı", "Berber", "Aşçı", "Öğretmen", "Müzisyen", "Fotoğrafçı", "Dansçı", "Avukat", "Doktor", "Psikolog", "Diyetisyen"];

const zamanMs = (z) => { try { return z && z.toMillis ? z.toMillis() : (typeof z === "number" ? z : 0); } catch (e) { return 0; } };
const fotoIyi = (f) => (f && typeof f === "string" && f.slice(0, 5) !== "data:" ? f : (f && f.length < 60000 ? f : ""));
// GİZLİLİK (11 Kas, kullanıcı testinde yorumda e-posta adresi göründü): profilinde adı olmayan hesapta ad yerine e-posta
// geliyordu. Canlı yayın herkese açık → e-posta ASLA gösterilmez/kaydedilmez; yerine "Üye" yazılır (eski kayıtlarda da).
const epostaMi = (a) => /@/.test(String(a || ""));
const adTemiz = (d) => (d && epostaMi(d.ad) ? { ...d, ad: "" } : d);
const tarihYaz = (z, dil) => { const ms = zamanMs(z); if (!ms) return ""; try { return new Date(ms).toLocaleString(dil || "tr", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }); } catch (e) { return new Date(ms).toLocaleString(); } };
const saatYaz = (z, dil) => { const ms = zamanMs(z); if (!ms) return ""; try { return new Date(ms).toLocaleTimeString(dil || "tr", { hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } };
// Yayın süresi: bitiş − başlangıç (bitiş yoksa son nabız; telefon kapanmış olabilir)
const yayinSuresi = (y) => Math.max(0, (zamanMs(y.bitis) || zamanMs(y.sonNabiz)) - zamanMs(y.baslangic));
const enCokIzl = (y) => Math.max(y.enCokIzleyici || 0, y.izleyici || 0);
const sureYaz = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); const d = Math.floor(s / 60), h = Math.floor(d / 60); return h ? h + ":" + String(d % 60).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0") : d + ":" + String(s % 60).padStart(2, "0"); };

function KareAvatar({ foto, ad, boy }) {
  const [bozuk, setBozuk] = useState(false); // fotoğraf inmezse baş harf göster (kırık resim simgesi OLMASIN)
  const f = bozuk ? "" : fotoIyi(foto);
  return (
    <span className="cd-avatar" style={boy ? { width: boy, height: boy, fontSize: Math.round(boy * 0.42) } : undefined}>
      {f ? <img src={f} alt="" referrerPolicy="no-referrer" onError={() => setBozuk(true)} /> : <b>{String(ad || "?").trim().slice(0, 1).toUpperCase()}</b>}
    </span>
  );
}

export default function CanliDers({ uid, benAd, benFoto, meslekler, dil, tokenAl, uyeyiAc, profilimeGit, onPencere, kapatRef, bilgi }) {
  const { t } = useTranslation();
  const [yayinlar, setYayinlar] = useState([]);
  const [simdi, setSimdi] = useState(Date.now());
  const [filtre, setFiltre] = useState("");
  const [hazirlik, setHazirlik] = useState(false); // "Canlı yayın başlat" penceresi
  const [izlenen, setIzlenen] = useState(null);    // { id, yayinci: bool }
  const [bilgiAcik, setBilgiAcik] = useState("");  // "meslek" → meslek gerekli uyarısı
  // GEÇMİŞ YAYINLARIM (11 Kas, kullanıcı: "canlı yayınım hiçbir yerde gözükmüyor; kim yazmış, kim kalp atmış değerlendirmem lazım")
  const [gecmis, setGecmis] = useState([]);
  const [gecmisSecili, setGecmisSecili] = useState(null);

  // ŞU AN CANLI olan yayınları dinle (tek alan sorgusu → ek dizin gerekmez)
  useEffect(() => {
    const q = query(collection(db, "canliYayinlar"), where("durum", "==", "canli"), limit(60));
    const un = onSnapshot(q, (s) => setYayinlar(s.docs.map((d) => adTemiz({ id: d.id, ...d.data() }))), () => {});
    const z = setInterval(() => setSimdi(Date.now()), 15000);
    return () => { un(); clearInterval(z); };
  }, []);

  // Benim (yayıncı olarak) açtığım yayınlar — biten ya da nabzı kesilmiş olanlar geçmişte listelenir
  useEffect(() => {
    if (!uid) { setGecmis([]); return undefined; }
    const q = query(collection(db, "canliYayinlar"), where("yayinciUid", "==", uid), limit(60));
    return onSnapshot(q, (s) => setGecmis(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => {});
  }, [uid]);

  // Geri tuşu: açık pencereyi/yayını kapatsın (sayfadan atmasın) — Elite Pazar ile aynı düzen
  useEffect(() => {
    const acik = hazirlik || !!izlenen || !!bilgiAcik || !!gecmisSecili;
    if (onPencere) onPencere(acik);
    if (kapatRef) kapatRef.current = acik ? () => { if (izlenen && izlenen.kapat) izlenen.kapat(); else { setHazirlik(false); setIzlenen(null); setBilgiAcik(""); setGecmisSecili(null); } } : null;
  }, [hazirlik, izlenen, bilgiAcik, gecmisSecili]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (onPencere) onPencere(false); if (kapatRef) kapatRef.current = null; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canli = yayinlar
    .filter((y) => { const n = zamanMs(y.sonNabiz) || zamanMs(y.baslangic); return !n || simdi - n < OLU_MS; })
    .sort((a, b) => (b.izleyici || 0) - (a.izleyici || 0) || zamanMs(b.baslangic) - zamanMs(a.baslangic));
  const gorunen = filtre ? canli.filter((y) => y.meslek === filtre) : canli;
  const proMu = Array.isArray(meslekler) && meslekler.length > 0;
  const bitmisMi = (y) => y.durum === "bitti" || (simdi - (zamanMs(y.sonNabiz) || zamanMs(y.baslangic))) >= OLU_MS;
  const gecmisListe = gecmis.filter(bitmisMi).sort((a, b) => zamanMs(b.baslangic) - zamanMs(a.baslangic));

  const baslatTik = () => {
    if (!uid) { if (bilgi) bilgi(t("cdGirisGerek", "Canlı yayın için giriş yapmalısın.")); return; }
    if (!proMu) { setBilgiAcik("meslek"); return; }
    setHazirlik(true);
  };

  return (
    <div className="cd-sayfa">
      {/* ÜST VİTRİN */}
      <div className="cd-vitrin">
        <div className="cd-aurora" aria-hidden="true"><i /><i /><i /></div>
        <div className="cd-vitrin-ic">
          <div className="cd-etiket"><span className="cd-nabiz" aria-hidden="true" />{t("cdEtiket", "CANLI DERS · CANLI DANIŞMANLIK")}</div>
          <h2 className="cd-baslik"><span className="notranslate" translate="no">GLOXORG</span> {t("cdCanli", "Canlı")}</h2>
          <p className="cd-alt">{t("cdAlt", "Uzmanlar şu an canlı: işini gösteriyor, ders veriyor, sorularını cevaplıyor. İzle, sor, öğren.")}</p>
          <div className="cd-vitrin-satir">
            <button className="cd-baslat" onClick={baslatTik}>
              <span className="cd-baslat-ik" aria-hidden="true">●</span>
              <KayanYazi>{t("cdBaslat", "Canlı yayın başlat")}</KayanYazi>
            </button>
            <div className="cd-sayac"><b>{canli.length}</b><KayanYazi>{t("cdSuAnCanli", "şu an canlı")}</KayanYazi></div>
          </div>
        </div>
      </div>

      {/* MESLEK FİLTRESİ */}
      <div className="cd-filtre" role="tablist">
        <button className={"cd-cip" + (!filtre ? " secili" : "")} onClick={() => setFiltre("")}><KayanYazi>{t("cdTumu", "Tümü")}</KayanYazi></button>
        {Array.from(new Set([...canli.map((y) => y.meslek).filter(Boolean), ...ONE_CIKAN])).map((m) => (
          <button key={m} className={"cd-cip" + (filtre === m ? " secili" : "")} onClick={() => setFiltre(filtre === m ? "" : m)}><KayanYazi>{mc(m, dil)}</KayanYazi></button>
        ))}
      </div>

      {/* ŞU AN CANLI */}
      <div className="cd-bolum-bas"><span className="cd-kirmizi-nokta" aria-hidden="true" /><KayanYazi>{t("cdSuAnCanliBas", "Şu an canlı")}</KayanYazi></div>
      {gorunen.length === 0 ? (
        <div className="cd-bos">
          <div className="cd-bos-ik" aria-hidden="true">🎥</div>
          <b>{filtre ? t("cdBosFiltre", "Bu alanda şu an canlı yayın yok.") : t("cdBos", "Şu an canlı yayın yok.")}</b>
          <p>{t("cdBosAlt", "İlk canlı dersi sen aç: işini göster, soruları cevapla, yeni müşteriler kazan.")}</p>
          <button className="cd-bos-btn" onClick={baslatTik}><KayanYazi>{t("cdBaslat", "Canlı yayın başlat")}</KayanYazi></button>
        </div>
      ) : (
        <div className="cd-izgara">
          {gorunen.map((y) => (
            <button key={y.id} className="cd-kart" onClick={() => setIzlenen({ id: y.id, yayinci: y.yayinciUid === uid })}>
              <span className="cd-kart-fon" style={fotoIyi(y.foto) ? { backgroundImage: 'url("' + fotoIyi(y.foto).replace(/"/g, "%22") + '")' } : undefined} aria-hidden="true" />
              <span className="cd-kart-ust">
                <span className="cd-rozet-canli">● {t("cdCanliRozet", "CANLI")}</span>
                <span className="cd-rozet-izl">👁 {y.izleyici || 0}</span>
              </span>
              <span className="cd-kart-orta"><KareAvatar foto={y.foto} ad={y.ad} boy={64} /></span>
              <span className="cd-kart-alt">
                <b className="cd-kart-baslik"><KayanYazi>{y.baslik || t("cdCanliDers", "Canlı ders")}</KayanYazi></b>
                <span className="cd-kart-kim"><KayanYazi>{(y.ad || t("cdUye", "Üye")) + (y.meslek ? " · " + mc(y.meslek, dil) : "")}</KayanYazi></span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* GEÇMİŞ YAYINLARIM — sadece kendi yayınlarım (yorumlar, kalp, izleyici, süre) */}
      {gecmisListe.length > 0 && (
        <>
          <div className="cd-bolum-bas"><span aria-hidden="true">🗂️</span><KayanYazi>{t("cdGecmis", "Geçmiş yayınlarım")}</KayanYazi></div>
          <div className="cd-gecmis-liste">
            {gecmisListe.map((y) => (
              <button key={y.id} className="cd-gecmis-kart" onClick={() => setGecmisSecili(y)}>
                <span className="cd-gecmis-ust">
                  <b><KayanYazi>{y.baslik || (y.meslek ? mc(y.meslek, dil) : t("cdCanliDers", "Canlı ders"))}</KayanYazi></b>
                  <i>{tarihYaz(y.baslangic, dil)}</i>
                </span>
                <span className="cd-gecmis-sayilar">
                  <span title={t("cdSure", "Süre")}>⏱️ {sureYaz(yayinSuresi(y))}</span>
                  <span title={t("cdEnCok", "En çok izleyici")}>👁 {enCokIzl(y)}</span>
                  <span title={t("cdKalp", "Kalp gönder")}>♥ {y.kalp || 0}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* NASIL ÇALIŞIR / NELER GELİYOR */}
      <div className="cd-bolum-bas"><KayanYazi>{t("cdNeler", "Burada neler var?")}</KayanYazi></div>
      <div className="cd-ozellik">
        <div className="cd-oz" style={{ "--r": "#ff2d55" }}><span aria-hidden="true">🎓</span><b><KayanYazi>{t("cdOz1", "Canlı ders")}</KayanYazi></b><p>{t("cdOz1a", "Uzman işini canlı gösterir; sen izlerken sorunu yazarsın.")}</p></div>
        <div className="cd-oz" style={{ "--r": "#22d3ee" }}><span aria-hidden="true">💬</span><b><KayanYazi>{t("cdOz2", "Canlı soru-cevap")}</KayanYazi></b><p>{t("cdOz2a", "Yorumlar anında akar; yayıncı cevaplar, kalp atarsın.")}</p></div>
        <div className="cd-oz yakinda" style={{ "--r": "#a78bfa" }}><span aria-hidden="true">🤝</span><b><KayanYazi>{t("cdOz3", "Birebir danışmanlık")}</KayanYazi></b><p>{t("cdOz3a", "Uzmandan randevu al, görüntülü görüş.")}</p><i>{t("cdYakinda", "Yakında")}</i></div>
        <div className="cd-oz yakinda" style={{ "--r": "#34d399" }}><span aria-hidden="true">🌍</span><b><KayanYazi>{t("cdOz4", "Canlı çeviri altyazı")}</KayanYazi></b><p>{t("cdOz4a", "Yayıncı kendi dilinde konuşur, sen kendi dilinde okursun.")}</p><i>{t("cdYakinda", "Yakında")}</i></div>
      </div>
      <div className="cd-ofis">
        <span className="cd-ofis-ik" aria-hidden="true">📄</span>
        <div><b><KayanYazi>{t("cdOfis", "AI Danışma Ofisi")}</KayanYazi></b><p>{t("cdOfisAlt", "Resmî formları bul, yapay zekâ senin yerine doldursun. Çok yakında.")}</p></div>
      </div>

      {/* MESLEK GEREKLİ UYARISI */}
      {bilgiAcik === "meslek" && (
        <div className="cd-perde" onClick={(e) => { if (e.target === e.currentTarget) setBilgiAcik(""); }}>
          <div className="cd-pencere">
            <div className="cd-pencere-ik" aria-hidden="true">🎓</div>
            <b>{t("cdMeslekGerek", "Canlı yayını meslek sahipleri açar")}</b>
            <p>{t("cdMeslekGerekAlt", "Profilinde mesleğini seç; sonra buradan tek dokunuşla canlı ders açabilirsin.")}</p>
            <div className="cd-pencere-dugmeler">
              <button className="cd-ikincil" onClick={() => setBilgiAcik("")}><KayanYazi>{t("cdVazgec", "Vazgeç")}</KayanYazi></button>
              <button className="cd-birincil" onClick={() => { setBilgiAcik(""); if (profilimeGit) profilimeGit(); }}><KayanYazi>{t("cdMeslekSec", "Meslek seç")}</KayanYazi></button>
            </div>
          </div>
        </div>
      )}

      {hazirlik && (
        <YayinHazirlik t={t} dil={dil} uid={uid} benAd={benAd} benFoto={benFoto} meslekler={meslekler} tokenAl={tokenAl} bilgi={bilgi}
          kapat={() => setHazirlik(false)}
          basladi={(id, oturum) => { setHazirlik(false); setIzlenen({ id, yayinci: true, oturum }); }} />
      )}
      {gecmisSecili && (
        <GecmisDetay t={t} dil={dil} y={gecmisSecili} uyeyiAc={uyeyiAc} bilgi={bilgi} kapat={() => setGecmisSecili(null)} />
      )}
      {izlenen && (
        <YayinEkrani key={izlenen.id} t={t} dil={dil} uid={uid} benAd={benAd} benFoto={benFoto} yayinId={izlenen.id} yayinci={izlenen.yayinci}
          oturum={izlenen.oturum} tokenAl={tokenAl} bilgi={bilgi} uyeyiAc={uyeyiAc}
          kapatKaydet={(f) => setIzlenen((o) => (o && o.id === izlenen.id && o.kapat !== f ? { ...o, kapat: f } : o))}
          kapat={() => setIzlenen(null)} />
      )}
    </div>
  );
}

// ───────────── YAYIN HAZIRLIK: başlık + meslek + kamera önizleme → "Yayını başlat" ─────────────
function YayinHazirlik({ t, dil, uid, benAd, benFoto, meslekler, tokenAl, bilgi, kapat, basladi }) {
  const [baslik, setBaslik] = useState("");
  const [meslek, setMeslek] = useState((meslekler && meslekler[0]) || "");
  const [durum, setDurum] = useState("kamera"); // kamera | hazir | baglaniyor | hata
  const [hata, setHata] = useState("");
  const vidRef = useRef(null);
  const izlerRef = useRef([]);
  const devredildi = useRef(false);

  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const lk = livekitHemen() || (await livekitYukle());
        const izler = await lk.createLocalTracks({ audio: { echoCancellation: true, noiseSuppression: true }, video: { facingMode: "user", resolution: { width: 960, height: 540, frameRate: 24 } } });
        if (iptal) { izler.forEach((x) => { try { x.stop(); } catch (e) {} }); return; }
        izlerRef.current = izler;
        const v = izler.find((x) => x.kind === "video");
        if (v && vidRef.current) v.attach(vidRef.current);
        setDurum("hazir");
      } catch (e) {
        if (!iptal) { setDurum("hata"); setHata(t("cdKameraYok", "Kameraya / mikrofona izin verilmedi. Telefon ayarlarından izin verip tekrar dene.")); }
      }
    })();
    return () => { iptal = true; if (!devredildi.current) izlerRef.current.forEach((x) => { try { x.stop(); } catch (e) {} }); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const baslat = async () => {
    if (durum !== "hazir") return;
    setDurum("baglaniyor");
    const ref = doc(collection(db, "canliYayinlar"));
    try {
      const lk = livekitHemen() || (await livekitYukle());
      const { token, url } = await tokenAl("canli_" + ref.id);
      const room = new lk.Room({ adaptiveStream: false, dynacast: false, publishDefaults: { simulcast: true, videoEncoding: { maxBitrate: 1200000, maxFramerate: 24 } } });
      await room.connect(url, token);
      for (const iz of izlerRef.current) { try { await room.localParticipant.publishTrack(iz); } catch (e) {} }
      const foto = fotoIyi(benFoto);
      await setDoc(ref, {
        yayinciUid: uid, ad: epostaMi(benAd) ? "" : (benAd || ""), foto: foto && foto.length < 2000 ? foto : "", baslik: baslik.trim().slice(0, 80),
        meslek: meslek || "", durum: "canli", izleyici: 0, enCokIzleyici: 0, kalp: 0, engelliler: [],
        baslangic: serverTimestamp(), sonNabiz: serverTimestamp(),
      });
      devredildi.current = true;
      basladi(ref.id, { room, izler: izlerRef.current, lk });
    } catch (e) {
      setDurum("hazir");
      if (bilgi) bilgi(t("cdBaglanamadi", "Canlı yayın sunucusuna bağlanılamadı. İnterneti kontrol edip tekrar dene."));
    }
  };

  return (
    <div className="cd-tam cd-hazirlik">
      <video ref={vidRef} className="cd-onizleme" muted playsInline autoPlay />
      {durum === "kamera" && <div className="cd-yukleniyor"><span className="cd-donen" /><KayanYazi>{t("cdKameraAciliyor", "Kamera açılıyor…")}</KayanYazi></div>}
      <div className="cd-ust-serit">
        <button className="cd-kapat" onClick={kapat} aria-label={t("cdKapat", "Kapat")} title={t("cdKapat", "Kapat")}>✕</button>
        <span className="cd-ust-yazi"><KayanYazi>{t("cdHazirlik", "Canlı yayına hazırlan")}</KayanYazi></span>
      </div>
      <div className="cd-hazirlik-kutu">
        {durum === "hata" ? (
          <div className="cd-hata">{hata}</div>
        ) : (
          <>
            <label className="cd-etiket2">{t("cdKonu", "Bugün ne anlatacaksın?")}</label>
            <input className="cd-girdi" value={baslik} maxLength={80} onChange={(e) => setBaslik(e.target.value)} placeholder={t("cdKonuOrnek", "Örn: 5 dakikada kolay topuz")} />
            {meslekler && meslekler.length > 1 && (
              <div className="cd-meslek-sec">
                {meslekler.map((m) => <button key={m} className={"cd-cip" + (meslek === m ? " secili" : "")} onClick={() => setMeslek(m)}><KayanYazi>{mc(m, dil)}</KayanYazi></button>)}
              </div>
            )}
            <button className="cd-yayina-gec" disabled={durum !== "hazir"} onClick={baslat}>
              {durum === "baglaniyor" ? <><span className="cd-donen kucuk" /><KayanYazi>{t("cdBaglaniyor", "Bağlanıyor…")}</KayanYazi></> : <><span className="cd-baslat-ik" aria-hidden="true">●</span><KayanYazi>{t("cdYayinaBasla", "Yayını başlat")}</KayanYazi></>}
            </button>
            <div className="cd-not">{t("cdNot", "Takipçilerine canlı yayında olduğun bildirilir. Kurallara aykırı yayınlar kapatılır.")}</div>
          </>
        )}
      </div>
    </div>
  );
}

// ───────────── YAYIN EKRANI (yayıncı ve izleyici aynı ekran; düğmeler role göre) ─────────────
function YayinEkrani({ t, dil, uid, benAd, benFoto, yayinId, yayinci, oturum, tokenAl, bilgi, uyeyiAc, kapatKaydet, kapat }) {
  const [y, setY] = useState(null);
  const [yorumlar, setYorumlar] = useState([]);
  const [yazi, setYazi] = useState("");
  const [baglanti, setBaglanti] = useState(yayinci ? "tamam" : "baglaniyor"); // baglaniyor | tamam | hata
  const [goruntuVar, setGoruntuVar] = useState(!!yayinci);
  // TEŞHİS (11 Kas, telefonda "bağlanıyor"da kalıyordu; sunucu testi GitHub'da sorunsuz): hangi adımda kaldığı ekranda yazar
  const [asama, setAsama] = useState("bilet"); // bilet | sunucu | bekle
  const [teshis, setTeshis] = useState({ yayinci: false, goruntuIzi: false, sesIzi: false, goruntuYayini: false, abonelikHata: false });
  const [beklemeSn, setBeklemeSn] = useState(0);
  const [deneme, setDeneme] = useState(0); // "Yeniden dene" → bağlantı baştan kurulur
  const [mikAcik, setMikAcik] = useState(true);
  const [onKamera, setOnKamera] = useState(true);
  const [kalpler, setKalpler] = useState([]);
  const [secili, setSecili] = useState(null); // dokunulan yorum (menü)
  const [bitirSor, setBitirSor] = useState(false);
  const [yayinSikayetSor, setYayinSikayetSor] = useState(false);
  const [goruntuGitmiyor, setGoruntuGitmiyor] = useState(false); // yayıncı: görüntü sunucuya gitmiyorsa uyarı
  const [sesKilit, setSesKilit] = useState(false);
  const [simdi, setSimdi] = useState(Date.now());
  const vidRef = useRef(null);
  const sesKutuRef = useRef(null);
  const roomRef = useRef(oturum ? oturum.room : null);
  const izlerRef = useRef(oturum ? oturum.izler : []);
  const kalpBirikRef = useRef(0);
  const enCokRef = useRef(0);
  const yoklamaRef = useRef(null);
  const kapandiRef = useRef(false);
  const akisRef = useRef(null);

  // ── KALP KAYDI: yayının toplam sayacı + KİM KAÇ KALP ATTI (kalpler/{uid}; 11 Kas, kullanıcı: "kalp atanları isim isim görelim")
  const kalpKaydet = (n) => {
    updateDoc(doc(db, "canliYayinlar", yayinId), { kalp: increment(n) }).catch(() => {});
    if (!uid) return;
    const f = fotoIyi(benFoto) || "";
    setDoc(doc(db, "canliYayinlar", yayinId, "kalpler", uid), { uid, ad: epostaMi(benAd) ? "" : (benAd || ""), foto: f.length < 2000 ? f : "", n: increment(n), son: serverTimestamp() }, { merge: true }).catch(() => {});
  };
  // ── ÇIKIŞ (yayıncı: yayını BİTİRİR; izleyici: sadece ayrılır)
  const cik = async () => {
    if (kapandiRef.current) return; kapandiRef.current = true;
    try { if (kalpBirikRef.current > 0) { const n = kalpBirikRef.current; kalpBirikRef.current = 0; kalpKaydet(n); } } catch (e) {}
    if (yayinci) { try { await updateDoc(doc(db, "canliYayinlar", yayinId), { durum: "bitti", bitis: serverTimestamp() }); } catch (e) {} }
    try { roomRef.current && roomRef.current.disconnect(); } catch (e) {}
    try { izlerRef.current.forEach((x) => { try { x.stop(); } catch (e) {} }); } catch (e) {}
    kapat();
  };
  const geriTus = () => { if (yayinci) setBitirSor(true); else cik(); };
  useEffect(() => { kapatKaydet(geriTus); }); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Yayın kaydını + yorumları dinle
  useEffect(() => {
    const un1 = onSnapshot(doc(db, "canliYayinlar", yayinId), (s) => setY(s.exists() ? adTemiz({ id: s.id, ...s.data() }) : { durum: "bitti" }), () => {});
    const un2 = onSnapshot(query(collection(db, "canliYayinlar", yayinId, "yorumlar"), orderBy("zaman", "desc"), limit(40)),
      (s) => setYorumlar(s.docs.map((d) => adTemiz({ id: d.id, ...d.data() })).reverse()), () => {});
    const z = setInterval(() => setSimdi(Date.now()), 1000);
    return () => { un1(); un2(); clearInterval(z); };
  }, [yayinId]);

  // Yeni yorum gelince akışı en alta kaydır
  useEffect(() => { const a = akisRef.current; if (a) a.scrollTop = a.scrollHeight; }, [yorumlar.length]);

  // ── Kalp uçur (ekranda)
  const kalpUcur = (renk) => {
    const k = { id: Math.random().toString(36).slice(2), x: Math.round(Math.random() * 40), r: renk || ["#ff2d55", "#ff6bd6", "#a78bfa", "#22d3ee", "#34d399"][Math.floor(Math.random() * 5)] };
    setKalpler((l) => [...l.slice(-24), k]);
    setTimeout(() => setKalpler((l) => l.filter((x) => x.id !== k.id)), 2600);
  };

  // ── Görüntü sunucusuna bağlan (izleyici) / yayıncıda olayları bağla
  useEffect(() => {
    let iptal = false;
    const coz = new TextDecoder();
    const veriGeldi = (veri) => { try { const m = JSON.parse(coz.decode(veri)); if (m && m.k === "kalp") kalpUcur(); } catch (e) {} };
    const izleyiciYaz = () => {
      if (!yayinci || !roomRef.current) return;
      const n = (roomRef.current.remoteParticipants || new Map()).size;
      const guncel = { izleyici: n, sonNabiz: serverTimestamp() };
      if (n > enCokRef.current) { enCokRef.current = n; guncel.enCokIzleyici = n; } // geçmişte "en çok izleyici" olarak görünür
      updateDoc(doc(db, "canliYayinlar", yayinId), guncel).catch(() => {});
    };
    if (yayinci) {
      const room = roomRef.current;
      const lk = oturum && oturum.lk;
      if (room && lk) {
        room.on(lk.RoomEvent.ParticipantConnected, izleyiciYaz);
        room.on(lk.RoomEvent.ParticipantDisconnected, izleyiciYaz);
        room.on(lk.RoomEvent.DataReceived, veriGeldi);
        room.on(lk.RoomEvent.Disconnected, () => { if (!kapandiRef.current) setBaglanti("hata"); });
      }
      const v = (izlerRef.current || []).find((x) => x.kind === "video");
      const bagla = () => { if (v && vidRef.current) v.attach(vidRef.current); else if (!iptal) setTimeout(bagla, 150); };
      bagla();
      // ⚠️ 11 Kas (telefon izleyicide teşhis: Yayıncı ✓ · Ses ✓ · Görüntü ✗ — bilgisayardan yayında görüntü gitmiyordu). Glome'da da
      //   "ilk görüntü yayını sessizce başarısız" sorunu yaşanmıştı (B440). Görüntü sunucuya gerçekten gitti mi 1.5/4/8 sn'de bak;
      //   gitmediyse yeniden gönder (2. denemeden itibaren simulcast'siz — bazı bilgisayar kodlayıcıları katmanlı yayında takılıyor).
      if (room) {
        const izGidiyorMu = (tur) => { let var_ = false; try { room.localParticipant.trackPublications.forEach((pub) => { if (pub.kind === tur && pub.track) var_ = true; }); } catch (e) {} return var_; };
        const kontrol = async (n) => {
          if (iptal || kapandiRef.current) return;
          for (const iz of (izlerRef.current || [])) {
            if (izGidiyorMu(iz.kind)) continue;
            try { await room.localParticipant.publishTrack(iz, n >= 1 ? { simulcast: false } : undefined); } catch (e) {}
          }
          setGoruntuGitmiyor(!izGidiyorMu("video"));
        };
        [1500, 4000, 8000].forEach((ms, n) => setTimeout(() => kontrol(n), ms));
      }
      const nabiz = setInterval(izleyiciYaz, NABIZ_MS);
      const sayfaKapan = () => { try { updateDoc(doc(db, "canliYayinlar", yayinId), { durum: "bitti", bitis: serverTimestamp() }); } catch (e) {} };
      window.addEventListener("pagehide", sayfaKapan);
      return () => { iptal = true; clearInterval(nabiz); window.removeEventListener("pagehide", sayfaKapan); };
    }
    (async () => {
      try {
        setAsama("bilet"); setBeklemeSn(0); setBaglanti("baglaniyor");
        const lk = livekitHemen() || (await livekitYukle());
        const { token, url } = await tokenAl("canli_" + yayinId);
        if (iptal) return;
        setAsama("sunucu");
        // ⚠️ 11 Kas (kullanıcı: "bilgisayardan canlı yayın açtım, telefondan açılmıyor" — "bağlanıyor…"da kaldı): telefondaki uygulama
        //   tarayıcısında adaptiveStream açıkken LiveKit görüntü kutusunu "görünmüyor" sayıp görüntüyü HİÇ göndermiyordu (Glome 1'e1
        //   aramalarda da aynı sorun vardı, orada da kapalı). İzleyicide ve yayıncıda adaptiveStream/dynacast KAPALI → görüntü hep gelir.
        const room = new lk.Room({ adaptiveStream: false, dynacast: false });
        roomRef.current = room;
        const bagliIzler = new Set(); // aynı iz iki kez bağlanmasın (ses iki kez çalıp yankı yapmasın)
        const izBagla = (track) => {
          if (!track) return;
          const kimlik = track.sid || track.mediaStreamTrack;
          if (bagliIzler.has(kimlik)) return; bagliIzler.add(kimlik);
          if (track.kind === "video") {
            setTeshis((d) => ({ ...d, goruntuIzi: true }));
            // Glome aramasındaki gibi: kütüphanenin attach'i olmazsa görüntüyü YENİ bir MediaStream ile elle bağla
            const bagla = (n) => {
              const el = vidRef.current;
              if (!el) { if (n < 20) setTimeout(() => bagla(n + 1), 150); return; }
              try { track.attach(el); } catch (e) {}
              try { if (!el.srcObject && track.mediaStreamTrack) el.srcObject = new MediaStream([track.mediaStreamTrack]); } catch (e) {}
              try { const pr = el.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {}
              setGoruntuVar(true);
            };
            bagla(0);
          } else if (track.kind === "audio") {
            setTeshis((d) => ({ ...d, sesIzi: true }));
            let el = null;
            try { el = track.attach(); } catch (e) { try { el = document.createElement("audio"); el.autoplay = true; el.srcObject = new MediaStream([track.mediaStreamTrack]); } catch (x) {} }
            if (el) { el.className = "cd-gizli-ses"; if (sesKutuRef.current) sesKutuRef.current.appendChild(el); }
          }
        };
        room.on(lk.RoomEvent.TrackSubscribed, izBagla);
        room.on(lk.RoomEvent.TrackUnsubscribed, (track) => { try { bagliIzler.delete(track.sid || track.mediaStreamTrack); } catch (e) {} try { track.detach().forEach((el) => { if (el.className === "cd-gizli-ses") el.remove(); }); } catch (e) {} });
        room.on(lk.RoomEvent.DataReceived, veriGeldi);
        room.on(lk.RoomEvent.AudioPlaybackStatusChanged, () => setSesKilit(!room.canPlaybackAudio));
        room.on(lk.RoomEvent.Disconnected, () => { if (!kapandiRef.current && !iptal) setBaglanti("hata"); });
        const yayinciVarMi = () => setTeshis((d) => ({ ...d, yayinci: (room.remoteParticipants || new Map()).size > 0 }));
        room.on(lk.RoomEvent.ParticipantConnected, yayinciVarMi);
        room.on(lk.RoomEvent.ParticipantDisconnected, yayinciVarMi);
        try { room.on(lk.RoomEvent.TrackSubscriptionFailed, () => setTeshis((d) => ({ ...d, abonelikHata: true }))); } catch (e) {}
        await room.connect(url, token, { autoSubscribe: true });
        if (iptal) { room.disconnect(); return; }
        setBaglanti("tamam"); setAsama("bekle"); yayinciVarMi();
        // Görüntü gelmediyse her 2 sn: sunucuda yayıncının görüntü yayını var mı bak; varsa ama abone olunmamışsa kendimiz iste
        const yoklama = setInterval(() => {
          if (iptal) { clearInterval(yoklama); return; }
          try {
            let goruntuYayini = false;
            (room.remoteParticipants || new Map()).forEach((rp) => (rp.trackPublications || new Map()).forEach((pub) => {
              if (pub.kind !== "video") return;
              goruntuYayini = true;
              if (pub.track) izBagla(pub.track);
              else if (!pub.isSubscribed && pub.setSubscribed) { try { pub.setSubscribed(true); } catch (e) {} }
            }));
            setTeshis((d) => (d.goruntuYayini === goruntuYayini ? d : { ...d, goruntuYayini }));
            if (bagliIzler.size >= 2) clearInterval(yoklama);
          } catch (e) {}
        }, 2000);
        yoklamaRef.current = yoklama;
        // Bağlanmadan ÖNCE yayına eklenmiş izler olay kaçmışsa yine bağla (güvenlik)
        try { (room.remoteParticipants || new Map()).forEach((rp) => { (rp.trackPublications || new Map()).forEach((pub) => { if (pub && pub.track) izBagla(pub.track); }); }); } catch (e) {}
        try { await room.startAudio(); } catch (e) {}
        setSesKilit(!room.canPlaybackAudio);
      } catch (e) { if (!iptal) setBaglanti("hata"); }
    })();
    const kalpYaz = setInterval(() => {
      const n = kalpBirikRef.current; if (!n) return; kalpBirikRef.current = 0;
      kalpKaydet(n);
    }, 4000);
    return () => { iptal = true; clearInterval(kalpYaz); clearInterval(yoklamaRef.current); try { roomRef.current && roomRef.current.disconnect(); } catch (e) {} };
  }, [deneme]); // eslint-disable-line react-hooks/exhaustive-deps
  // Bekleme süresini say (15 sn'de görüntü gelmezse "Yeniden dene" görünür)
  useEffect(() => {
    if (yayinci || goruntuVar) return undefined;
    const z = setInterval(() => setBeklemeSn((n) => n + 1), 1000);
    return () => clearInterval(z);
  }, [yayinci, goruntuVar, deneme]);

  // Kalp gönder: ekranda uçar + herkese (veri kanalı) + sayaç (birikip 4 sn'de bir yazılır)
  const kalpAt = () => {
    kalpUcur("#ff2d55");
    kalpBirikRef.current++;
    try { const r = roomRef.current; if (r && r.localParticipant) r.localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ k: "kalp" })), { reliable: false }); } catch (e) {}
  };

  const yorumGonder = async () => {
    const m = yazi.trim(); if (!m || !uid) return;
    setYazi("");
    try { await addDoc(collection(db, "canliYayinlar", yayinId, "yorumlar"), { uid, ad: epostaMi(benAd) ? "" : (benAd || ""), foto: (fotoIyi(benFoto) || "").length < 2000 ? fotoIyi(benFoto) || "" : "", metin: m.slice(0, 300), zaman: serverTimestamp() }); }
    catch (e) { if (bilgi) bilgi(t("cdYorumOlmadi", "Yorum gönderilemedi.")); }
  };

  const mikDegis = async () => {
    const a = (izlerRef.current || []).find((x) => x.kind === "audio"); if (!a) return;
    try { if (mikAcik) await a.mute(); else await a.unmute(); setMikAcik(!mikAcik); } catch (e) {}
  };
  const kameraCevir = async () => {
    const v = (izlerRef.current || []).find((x) => x.kind === "video"); if (!v) return;
    try { await v.restartTrack({ facingMode: onKamera ? "environment" : "user", resolution: { width: 960, height: 540, frameRate: 24 } }); setOnKamera(!onKamera); } catch (e) { if (bilgi) bilgi(t("cdKameraCevrilmedi", "Kamera çevrilemedi.")); }
  };

  const yorumSil = async (yr) => { setSecili(null); try { await deleteDoc(doc(db, "canliYayinlar", yayinId, "yorumlar", yr.id)); } catch (e) {} };
  const kisiCikar = async (yr) => {
    setSecili(null);
    try { await updateDoc(doc(db, "canliYayinlar", yayinId), { engelliler: arrayUnion(yr.uid) }); } catch (e) {}
    if (bilgi) bilgi(t("cdCikarildi", "Kişi yayından çıkarıldı."));
  };
  const sikayet = async (yr) => {
    setSecili(null);
    try { await addDoc(collection(db, "geriBildirim"), { tip: "canli-sikayet", yayinId, yorumId: yr ? yr.id : "", sikayetEdilenUid: yr ? yr.uid : (y && y.yayinciUid) || "", metin: yr ? String(yr.metin || "").slice(0, 300) : "yayin", gonderenUid: uid || "", zaman: serverTimestamp() }); } catch (e) {}
    if (bilgi) bilgi(t("cdSikayetAlindi", "Şikâyetin alındı, teşekkürler. İnceleyeceğiz."));
  };

  const bitti = y && y.durum === "bitti" && !yayinci;
  const engellendim = !yayinci && y && Array.isArray(y.engelliler) && uid && y.engelliler.includes(uid);
  useEffect(() => { if (engellendim) { try { roomRef.current && roomRef.current.disconnect(); } catch (e) {} } }, [engellendim]);
  const sure = y && zamanMs(y.baslangic) ? sureYaz(simdi - zamanMs(y.baslangic)) : "0:00";

  return (
    <div className="cd-tam cd-yayin">
      <video ref={vidRef} className={"cd-yayin-vid" + (yayinci && onKamera ? " ayna" : "")} muted playsInline autoPlay />
      <div ref={sesKutuRef} className="cd-gizli" aria-hidden="true" />
      {!goruntuVar && !bitti && !engellendim && (
        <div className="cd-yukleniyor">
          {y && <KareAvatar foto={y.foto} ad={y.ad} boy={96} />}
          {baglanti === "hata" ? <b>{t("cdBaglantiKoptu", "Bağlantı kurulamadı.")}</b> : <><span className="cd-donen" /><KayanYazi>{t("cdYayinaBaglaniyor", "Canlı yayına bağlanıyor…")}</KayanYazi></>}
          {!yayinci && (
            <div className="cd-teshis">
              <span>{asama === "bilet" ? t("cdAsamaBilet", "1/3 Bilet alınıyor") : asama === "sunucu" ? t("cdAsamaSunucu", "2/3 Sunucuya bağlanıyor") : t("cdAsamaBekle", "3/3 Bağlandı, görüntü bekleniyor")} · {beklemeSn} sn</span>
              {asama === "bekle" && <span>{t("cdTeshisYayinci", "Yayıncı")}: {teshis.yayinci ? "✓" : "✗"} · {t("cdTeshisGoruntuYayini", "Görüntü yayını")}: {teshis.goruntuYayini ? "✓" : "✗"} · {t("cdTeshisGoruntu", "Görüntü")}: {teshis.goruntuIzi ? "✓" : "✗"} · {t("cdTeshisSes", "Ses")}: {teshis.sesIzi ? "✓" : "✗"}</span>}
              {teshis.abonelikHata && <span>⚠️ {t("cdTeshisAbonelik", "Görüntü bu cihaza açılamadı")}</span>}
            </div>
          )}
          {!yayinci && (baglanti === "hata" || beklemeSn >= 15) && (
            <button className="cd-yeniden" onClick={() => { setTeshis({ yayinci: false, goruntuIzi: false, sesIzi: false }); setDeneme((n) => n + 1); }}>🔄 <KayanYazi>{t("cdYenidenDene", "Yeniden dene")}</KayanYazi></button>
          )}
        </div>
      )}
      <div className="cd-golge-ust" aria-hidden="true" /><div className="cd-golge-alt" aria-hidden="true" />

      {/* ÜST: yayıncı kimliği + canlı + süre + izleyici + kapat */}
      <div className="cd-ust-serit">
        <button className="cd-kimlik" onClick={() => { if (!yayinci && y && y.yayinciUid && uyeyiAc) { cik(); uyeyiAc({ uid: y.yayinciUid, ad: y.ad, foto: y.foto, meslek: y.meslek }); } }}>
          <KareAvatar foto={y && y.foto} ad={y && y.ad} boy={40} />
          <span className="cd-kimlik-yazi">
            <b><KayanYazi>{(y && y.ad) || t("cdUye", "Üye")}</KayanYazi></b>
            <i><KayanYazi>{(y && y.baslik) || (y && y.meslek ? mc(y.meslek, dil) : t("cdCanliDers", "Canlı ders"))}</KayanYazi></i>
          </span>
        </button>
        <span className="cd-rozet-canli">● {t("cdCanliRozet", "CANLI")} {sure}</span>
        <span className="cd-rozet-izl" title={t("cdIzleyici", "İzleyici")}>👁 {(y && y.izleyici) || 0}</span>
        <button className="cd-kapat" onClick={geriTus} aria-label={yayinci ? t("cdBitir", "Yayını bitir") : t("cdKapat", "Kapat")} title={yayinci ? t("cdBitir", "Yayını bitir") : t("cdKapat", "Kapat")}>✕</button>
      </div>

      {yayinci && goruntuGitmiyor && (
        <div className="cd-uyari-serit">⚠️ {t("cdGoruntuGitmiyor", "Görüntün izleyicilere gitmiyor. Yayını bitirip yeniden başlatmayı dene.")}</div>
      )}
      {sesKilit && !yayinci && (
        <button className="cd-ses-ac" onClick={async () => { try { await roomRef.current.startAudio(); setSesKilit(false); } catch (e) {} }}>🔊 <KayanYazi>{t("cdSesAc", "Sesi açmak için dokun")}</KayanYazi></button>
      )}

      {/* KALPLER */}
      <div className="cd-kalp-alani" aria-hidden="true">
        {kalpler.map((k) => <span key={k.id} className="cd-kalp" style={{ right: k.x, color: k.r }}>♥</span>)}
      </div>

      {/* YORUM AKIŞI */}
      <div className="cd-akis" ref={akisRef}>
        <div className="cd-akis-bilgi">🛡️ {t("cdKural", "Saygılı ol. Hakaret, spam ve uygunsuz içerik kaldırılır.")}</div>
        {yorumlar.map((yr) => (
          <button key={yr.id} className="cd-yorum" onClick={() => setSecili(yr)}>
            <KareAvatar foto={yr.foto} ad={yr.ad || t("cdUye", "Üye")} boy={28} />
            <span><b>{yr.ad || t("cdUye", "Üye")}{y && yr.uid === y.yayinciUid ? <em> · {t("cdYayinciEtiket", "yayıncı")}</em> : null}</b> {yr.metin}</span>
          </button>
        ))}
      </div>

      {/* ALT ÇUBUK */}
      <div className="cd-alt-cubuk">
        <input className="cd-yorum-gir" value={yazi} maxLength={300} onChange={(e) => setYazi(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") yorumGonder(); }}
          placeholder={uid ? t("cdYorumYaz", "Bir şey sor ya da yaz…") : t("cdGirisYorum", "Yorum için giriş yap")} disabled={!uid || bitti || engellendim} />
        <button className="cd-ikon" onClick={yorumGonder} disabled={!yazi.trim()} aria-label={t("cdGonder", "Gönder")} title={t("cdGonder", "Gönder")}>➤</button>
        {yayinci ? (
          <>
            <button className={"cd-ikon" + (mikAcik ? "" : " kapali")} onClick={mikDegis} aria-label={mikAcik ? t("cdMikKapat", "Mikrofonu kapat") : t("cdMikAc", "Mikrofonu aç")} title={mikAcik ? t("cdMikKapat", "Mikrofonu kapat") : t("cdMikAc", "Mikrofonu aç")}>{mikAcik ? "🎙️" : "🔇"}</button>
            <button className="cd-ikon" onClick={kameraCevir} aria-label={t("cdKameraCevir", "Kamerayı çevir")} title={t("cdKameraCevir", "Kamerayı çevir")}>🔄</button>
          </>
        ) : (
          <button className="cd-ikon cd-kalp-btn" onClick={kalpAt} disabled={bitti || engellendim} aria-label={t("cdKalp", "Kalp gönder")} title={t("cdKalp", "Kalp gönder")}>♥</button>
        )}
      </div>

      {/* YORUM MENÜSÜ */}
      {secili && (
        <div className="cd-perde" onClick={(e) => { if (e.target === e.currentTarget) setSecili(null); }}>
          <div className="cd-pencere cd-menu">
            <div className="cd-menu-kim"><KareAvatar foto={secili.foto} ad={secili.ad || t("cdUye", "Üye")} boy={36} /><b><KayanYazi>{secili.ad || t("cdUye", "Üye")}</KayanYazi></b></div>
            <p className="cd-menu-metin">{secili.metin}</p>
            {yayinci ? (
              <>
                <button className="cd-menu-btn" onClick={() => yorumSil(secili)}>🗑️ <KayanYazi>{t("cdYorumSil", "Yorumu sil")}</KayanYazi></button>
                {secili.uid !== uid && <button className="cd-menu-btn tehlike" onClick={() => kisiCikar(secili)}>🚫 <KayanYazi>{t("cdKisiCikar", "Kişiyi yayından çıkar")}</KayanYazi></button>}
              </>
            ) : (
              <>
                {secili.uid === uid && <button className="cd-menu-btn" onClick={() => yorumSil(secili)}>🗑️ <KayanYazi>{t("cdYorumSil", "Yorumu sil")}</KayanYazi></button>}
                {secili.uid !== uid && <button className="cd-menu-btn tehlike" onClick={() => sikayet(secili)}>⚠️ <KayanYazi>{t("cdSikayet", "Şikâyet et")}</KayanYazi></button>}
              </>
            )}
            <button className="cd-menu-btn ikincil" onClick={() => setSecili(null)}><KayanYazi>{t("cdVazgec", "Vazgeç")}</KayanYazi></button>
          </div>
        </div>
      )}

      {/* YAYINI BİTİR? (yayıncı) */}
      {bitirSor && (
        <div className="cd-perde" onClick={(e) => { if (e.target === e.currentTarget) setBitirSor(false); }}>
          <div className="cd-pencere">
            <div className="cd-pencere-ik" aria-hidden="true">⏹️</div>
            <b>{t("cdBitirSor", "Canlı yayını bitirmek istiyor musun?")}</b>
            <p>{t("cdBitirOzet", "İzleyici")}: {(y && y.izleyici) || 0} · ♥ {(y && y.kalp) || 0} · {sure}</p>
            <div className="cd-pencere-dugmeler">
              <button className="cd-ikincil" onClick={() => setBitirSor(false)}><KayanYazi>{t("cdDevam", "Devam et")}</KayanYazi></button>
              <button className="cd-birincil kirmizi" onClick={cik}><KayanYazi>{t("cdBitir", "Yayını bitir")}</KayanYazi></button>
            </div>
          </div>
        </div>
      )}

      {/* YAYIN BİTTİ / ÇIKARILDIN (izleyici) */}
      {(bitti || engellendim) && (
        <div className="cd-perde">
          <div className="cd-pencere">
            {y && <div className="cd-pencere-ik"><KareAvatar foto={y.foto} ad={y.ad} boy={72} /></div>}
            <b>{engellendim ? t("cdCikarildin", "Yayıncı seni bu yayından çıkardı.") : t("cdBitti", "Canlı yayın sona erdi")}</b>
            {!engellendim && y && <p>♥ {y.kalp || 0} · 👁 {y.izleyici || 0}</p>}
            <div className="cd-pencere-dugmeler">
              {!engellendim && y && y.yayinciUid && uyeyiAc && <button className="cd-ikincil" onClick={() => { const yy = y; cik(); uyeyiAc({ uid: yy.yayinciUid, ad: yy.ad, foto: yy.foto, meslek: yy.meslek }); }}><KayanYazi>{t("cdProfil", "Profiline git")}</KayanYazi></button>}
              <button className="cd-birincil" onClick={cik}><KayanYazi>{t("cdKapat", "Kapat")}</KayanYazi></button>
            </div>
          </div>
        </div>
      )}
      {!yayinci && !bitti && !engellendim && (
        // 11 Kas (kullanıcı: "sağ üstteki üçgen ikon ne demek?") → yazılı düğme + yanlışlıkla basılmasın diye onay
        <button className="cd-yayin-sikayet" onClick={() => setYayinSikayetSor(true)} aria-label={t("cdYayiniBildir", "Yayını bildir")} title={t("cdYayiniBildir", "Yayını bildir")}>⚠️ <KayanYazi>{t("cdBildir", "Bildir")}</KayanYazi></button>
      )}
      {yayinSikayetSor && (
        <div className="cd-perde" onClick={(e) => { if (e.target === e.currentTarget) setYayinSikayetSor(false); }}>
          <div className="cd-pencere">
            <div className="cd-pencere-ik" aria-hidden="true">⚠️</div>
            <b>{t("cdYayiniBildirSor", "Bu yayını uygunsuz olarak bildirmek istiyor musun?")}</b>
            <p>{t("cdYayiniBildirAlt", "Hakaret, şiddet, çıplaklık ya da dolandırıcılık varsa bildir; inceleyip gerekirse yayını kapatırız.")}</p>
            <div className="cd-pencere-dugmeler">
              <button className="cd-ikincil" onClick={() => setYayinSikayetSor(false)}><KayanYazi>{t("cdVazgec", "Vazgeç")}</KayanYazi></button>
              <button className="cd-birincil kirmizi" onClick={() => { setYayinSikayetSor(false); sikayet(null); }}><KayanYazi>{t("cdBildir", "Bildir")}</KayanYazi></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────── GEÇMİŞ YAYIN AYRINTISI: özet + tüm yorumlar (kim ne yazdı) + kaydı silme ─────────────
function GecmisDetay({ t, dil, y, uyeyiAc, bilgi, kapat }) {
  const [yorumlar, setYorumlar] = useState(null);
  const [kalpciler, setKalpciler] = useState(null);
  const [silSor, setSilSor] = useState(false);
  const [siliniyor, setSiliniyor] = useState(false);
  useEffect(() => {
    let iptal = false;
    getDocs(query(collection(db, "canliYayinlar", y.id, "yorumlar"), orderBy("zaman", "asc"), limit(500)))
      .then((s) => { if (!iptal) setYorumlar(s.docs.map((d) => adTemiz({ id: d.id, ...d.data() }))); })
      .catch(() => { if (!iptal) setYorumlar([]); });
    getDocs(query(collection(db, "canliYayinlar", y.id, "kalpler"), limit(500)))
      .then((s) => { if (!iptal) setKalpciler(s.docs.map((d) => adTemiz({ id: d.id, ...d.data() })).sort((a, b) => (b.n || 0) - (a.n || 0))); })
      .catch(() => { if (!iptal) setKalpciler([]); });
    return () => { iptal = true; };
  }, [y.id]);
  const sil = async () => {
    setSiliniyor(true);
    try {
      for (const yr of (yorumlar || [])) { try { await deleteDoc(doc(db, "canliYayinlar", y.id, "yorumlar", yr.id)); } catch (e) {} }
      for (const k of (kalpciler || [])) { try { await deleteDoc(doc(db, "canliYayinlar", y.id, "kalpler", k.id)); } catch (e) {} }
      await deleteDoc(doc(db, "canliYayinlar", y.id));
      if (bilgi) bilgi(t("cdSilindi", "Kayıt silindi."));
      kapat();
    } catch (e) { setSiliniyor(false); setSilSor(false); if (bilgi) bilgi(t("cdSilinemedi", "Silinemedi, tekrar dene.")); }
  };
  return (
    <div className="cd-perde" onClick={(e) => { if (e.target === e.currentTarget) kapat(); }}>
      <div className="cd-pencere cd-gecmis-detay">
        <div className="cd-gd-bas">
          <b><KayanYazi>{y.baslik || (y.meslek ? mc(y.meslek, dil) : t("cdCanliDers", "Canlı ders"))}</KayanYazi></b>
          <button className="cd-kapat" onClick={kapat} aria-label={t("cdKapat", "Kapat")} title={t("cdKapat", "Kapat")}>✕</button>
        </div>
        <div className="cd-gd-tarih">{tarihYaz(y.baslangic, dil)}</div>
        <div className="cd-gd-ozet">
          <span><i>⏱️</i><b>{sureYaz(yayinSuresi(y))}</b><em>{t("cdSure", "Süre")}</em></span>
          <span><i>👁</i><b>{enCokIzl(y)}</b><em>{t("cdEnCok", "En çok izleyici")}</em></span>
          <span><i>♥</i><b>{y.kalp || 0}</b><em>{t("cdKalpSayisi", "Kalp")}</em></span>
          <span><i>💬</i><b>{yorumlar ? yorumlar.length : "…"}</b><em>{t("cdYorumlar", "Yorumlar")}</em></span>
        </div>
        <div className="cd-gd-not">ℹ️ {t("cdVideoYok", "Görüntü (video) kaydı şimdilik saklanmıyor; yorumlar ve sayılar burada kalır.")}</div>
        {/* KALP ATANLAR — en çok kalp atan en üstte (ada/fotoğrafa dokununca profili) */}
        <div className="cd-gd-alt-bas">♥ <KayanYazi>{t("cdKalpAtanlar", "Kalp atanlar")}</KayanYazi></div>
        <div className="cd-gd-kalpciler">
          {kalpciler === null ? <span className="cd-donen kucuk" />
            : kalpciler.length === 0 ? <div className="cd-gd-bos kucuk">{t("cdKalpAtanYok", "Kalp atanların adı bu özellik eklendikten sonraki yayınlarda görünür.")}</div>
            : kalpciler.map((k) => (
              <button key={k.id} className="cd-gd-kalpci" onClick={() => { if (uyeyiAc && k.uid) { kapat(); uyeyiAc({ uid: k.uid, ad: k.ad, foto: k.foto }); } }}>
                <KareAvatar foto={k.foto} ad={k.ad || t("cdUye", "Üye")} boy={30} />
                <b><KayanYazi>{k.ad || t("cdUye", "Üye")}</KayanYazi></b>
                <span>♥ {k.n || 0}</span>
              </button>
            ))}
        </div>
        <div className="cd-gd-alt-bas">💬 <KayanYazi>{t("cdYorumlar", "Yorumlar")}</KayanYazi></div>
        <div className="cd-gd-liste">
          {yorumlar === null ? <div className="cd-gd-bos"><span className="cd-donen kucuk" /></div>
            : yorumlar.length === 0 ? <div className="cd-gd-bos">{t("cdYorumYok", "Bu yayına yorum yazılmadı.")}</div>
            : yorumlar.map((yr) => (
              <div key={yr.id} className="cd-gd-yorum">
                <button className="cd-gd-kim" onClick={() => { if (uyeyiAc && yr.uid && yr.uid !== y.yayinciUid) { kapat(); uyeyiAc({ uid: yr.uid, ad: yr.ad, foto: yr.foto }); } }}>
                  <KareAvatar foto={yr.foto} ad={yr.ad || t("cdUye", "Üye")} boy={34} />
                </button>
                <div className="cd-gd-yazi">
                  <b>{yr.ad || t("cdUye", "Üye")}{yr.uid === y.yayinciUid ? <em> · {t("cdYayinciEtiket", "yayıncı")}</em> : null}<small>{saatYaz(yr.zaman, dil)}</small></b>
                  <p>{yr.metin}</p>
                </div>
              </div>
            ))}
        </div>
        {!silSor ? (
          <button className="cd-menu-btn tehlike" onClick={() => setSilSor(true)}>🗑️ <KayanYazi>{t("cdKayitSil", "Bu yayının kaydını sil")}</KayanYazi></button>
        ) : (
          <div className="cd-gd-silsor">
            <p>{t("cdKayitSilSor", "Bu yayının kaydı ve tüm yorumları silinsin mi? Geri alınamaz.")}</p>
            <div className="cd-pencere-dugmeler">
              <button className="cd-ikincil" onClick={() => setSilSor(false)} disabled={siliniyor}><KayanYazi>{t("cdVazgec", "Vazgeç")}</KayanYazi></button>
              <button className="cd-birincil kirmizi" onClick={sil} disabled={siliniyor}>{siliniyor ? <span className="cd-donen kucuk" /> : <KayanYazi>{t("cdSil", "Sil")}</KayanYazi>}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
