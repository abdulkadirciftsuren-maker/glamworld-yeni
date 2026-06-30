import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./UyeOl.css";

// Gomulu, icerden isik sacan, sabit pirlanta tasi.
// renk: "mavi" | "beyaz" | "kirmizi" | "sari"
function Tas({ renk = "mavi", boyut = 78 }) {
  const id = useRef("t" + Math.random().toString(36).slice(2, 8)).current;
  const paletler = {
    mavi:    { d:["#ffffff","#bfe3ff","#5aa6e0","#2f6fa8"], m:"rgba(200,235,255,.95)", m2:"rgba(120,190,255,0)",
               yuz:["#ffffff","#dff1ff","#9fd0ff","#5aa6e0","#3a86c9","#4f9bd8","#7fc0f5"], masa:"#eaf7ff", par:"#ffffff" },
    beyaz:   { d:["#ffffff","#eef3f8","#c0cdda","#8090a0"], m:"rgba(255,255,255,.98)", m2:"rgba(220,230,240,0)",
               yuz:["#ffffff","#f4f8fc","#d5dee8","#aebccb","#90a0b0","#a0aebc","#d5dee8"], masa:"#ffffff", par:"#ffffff" },
    kirmizi: { d:["#fff0f0","#ffb0b0","#e0353f","#8a1018"], m:"rgba(255,200,200,.95)", m2:"rgba(255,90,90,0)",
               yuz:["#fff0f0","#ffd0d0","#ff9a9a","#e0353f","#a01820","#c02028","#ff7a7a"], masa:"#ffe0e0", par:"#fff0f0" },
    sari:    { d:["#fffbe0","#ffe79a","#e0a020","#8a6010"], m:"rgba(255,240,180,.95)", m2:"rgba(255,210,80,0)",
               yuz:["#fffbe0","#fff0c0","#ffe79a","#e0a020","#a07818","#c08a18","#ffe79a"], masa:"#fff6d0", par:"#fffbe0" },
  };
  const p = paletler[renk] || paletler.mavi;
  return (
    <svg className="gw-tas" viewBox="0 0 120 120" style={{ width: boyut, height: boyut }}>
      <defs>
        <radialGradient id={id + "yv"} cx="50%" cy="42%" r="62%">
          <stop offset="0" stopColor="#2a2418" /><stop offset="60%" stopColor="#120f09" /><stop offset="100%" stopColor="#050403" />
        </radialGradient>
        <radialGradient id={id + "t"} cx="50%" cy="40%" r="62%">
          <stop offset="0" stopColor={p.d[0]} /><stop offset="35%" stopColor={p.d[1]} /><stop offset="70%" stopColor={p.d[2]} /><stop offset="100%" stopColor={p.d[3]} />
        </radialGradient>
        <radialGradient id={id + "m"} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={p.m} /><stop offset="100%" stopColor={p.m2} />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="60" rx="50" ry="50" fill={`url(#${id}yv)`} stroke="#C9A227" strokeWidth="2.5" />
      <ellipse cx="60" cy="60" rx="41" ry="41" fill="#0a0805" stroke="rgba(201,162,39,.3)" strokeWidth="1.2" />
      <circle cx="60" cy="60" r="32" fill={`url(#${id}t)`} />
      <polygon points="60,60 40,46 60,38" fill={p.yuz[0]} opacity=".55" />
      <polygon points="60,60 60,38 80,46" fill={p.yuz[1]} opacity=".5" />
      <polygon points="60,60 80,46 86,64" fill={p.yuz[2]} opacity=".45" />
      <polygon points="60,60 86,64 74,82" fill={p.yuz[3]} opacity=".5" />
      <polygon points="60,60 74,82 46,82" fill={p.yuz[4]} opacity=".5" />
      <polygon points="60,60 46,82 34,64" fill={p.yuz[5]} opacity=".5" />
      <polygon points="60,60 34,64 40,46" fill={p.yuz[6]} opacity=".45" />
      <polygon points="52,52 68,52 72,60 68,68 52,68 48,60" fill={p.masa} opacity=".7" />
      <circle className="gw-merkez" cx="60" cy="58" r="14" fill={`url(#${id}m)`} />
      <g className="gw-parilti gw-p1" transform="translate(46,46)"><path d="M0,-7 L1.4,-1.4 L7,0 L1.4,1.4 L0,7 L-1.4,1.4 L-7,0 L-1.4,-1.4 Z" fill={p.par} /></g>
      <g className="gw-parilti gw-p2" transform="translate(76,66)"><path d="M0,-6 L1.2,-1.2 L6,0 L1.2,1.2 L0,6 L-1.2,1.2 L-6,0 L-1.2,-1.2 Z" fill="#ffffff" /></g>
      <g className="gw-parilti gw-p3" transform="translate(58,78)"><path d="M0,-5 L1,-1 L5,0 L1,1 L0,5 L-1,1 L-5,0 L-1,-1 Z" fill="#ffffff" /></g>
      <circle cx="60" cy="29" r="5.5" fill="#FFE9A8" stroke="#8a6010" strokeWidth="1.2" />
      <circle cx="89" cy="48" r="5.5" fill="#FFD700" stroke="#8a6010" strokeWidth="1.2" />
      <circle cx="78" cy="86" r="5" fill="#C9A227" stroke="#6a4d0a" strokeWidth="1.2" />
      <circle cx="42" cy="86" r="5" fill="#C9A227" stroke="#6a4d0a" strokeWidth="1.2" />
      <circle cx="31" cy="48" r="5.5" fill="#FFD700" stroke="#8a6010" strokeWidth="1.2" />
    </svg>
  );
}

export default function UyeOl() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const kokRef = useRef(null);
  const [aciklama, setAciklama] = useState(null);
  const [parla, setParla] = useState(null);

  useEffect(() => {
    const kok = kokRef.current;
    if (!kok) return;
    const zerreler = [];
    for (let i = 0; i < 16; i++) {
      const z = document.createElement("div");
      z.className = "zerre";
      z.style.left = Math.random() * 100 + "%";
      z.style.top = Math.random() * 100 + "%";
      z.style.animationDuration = 4 + Math.random() * 5 + "s";
      z.style.animationDelay = Math.random() * 5 + "s";
      kok.appendChild(z);
      zerreler.push(z);
    }
    return () => zerreler.forEach((z) => z.remove());
  }, []);

  const metinler = {
    musteri: { isim: t('musteri'), metin: t('musteriAciklamaUzun') },
    pro: { isim: t('profesyonel'), metin: t('proAciklamaUzun') },
  };

  function bas(tip) {
    setParla(tip);
    setTimeout(() => setParla(null), 700);
    setTimeout(() => setAciklama(tip), 400);
  }
  function devamEt() {
    // Açıklama katmanını KAPATMA — açık kalsın ki kart seçme ekranı
    // bir an görünüp kaybolmasın (çakışma/titreme olmaz). Sayfa değişince zaten kalkar.
    const tip = aciklama;
    if (tip === "musteri") navigate('/musteri');
    else if (tip === "pro") navigate('/profesyonel');
  }

  return (
    <div className="uye-kok" ref={kokRef}>
      <div className="uye-ic">
        <div className="kart">
          <div className="logo-sat">
            <Tas renk="mavi" boyut={46} />
            <span className="logo">GROXORG</span>
          </div>
          <div className="uye-baslik">{t('uyeolBaslik')}</div>
          <div className="alt-slogan">{t('nasilKatil')}</div>
          <div className="tur-baslik">{t('hesapTuru')}</div>

          <div className="turler">
            <div className={"tur musteri" + (parla === "musteri" ? " parla" : "")} onClick={() => bas("musteri")}>
              <Tas renk="beyaz" boyut={78} />
              <div className="bilgi">
                <div className="ad">{t('musteri')}</div>
                <div className="acik">{t('musteriAcik')}</div>
                <div className="fiyat">✓ {t('tamUcretsiz')}</div>
              </div>
              <div className="ok">›</div>
            </div>

            <div className={"tur pro" + (parla === "pro" ? " parla" : "")} onClick={() => bas("pro")}>
              <div className="pirlanta-rozet">{t('pirlantaUye')}</div>
              <Tas renk="kirmizi" boyut={78} />
              <div className="bilgi">
                <div className="ad">{t('profesyonel')}</div>
                <div className="acik">{t('proAcik')}</div>
                <div className="fiyat">👑 {t('proFiyat')}</div>
              </div>
              <div className="ok">›</div>
            </div>
          </div>

          <button className="geri" onClick={() => navigate(-1)}>← {t('geriDon')}</button>
          <div className="alt-not">{t('zatenHesap')} <b onClick={() => navigate('/')}>{t('girisYapLink')}</b></div>
        </div>
      </div>

      {aciklama && (
        <div className="aciklama-katman acik" onClick={devamEt}>
          <div className="aciklama-kutu">
            <div className="aciklama-isim">{metinler[aciklama].isim}</div>
            <div className="aciklama-metin">{metinler[aciklama].metin}</div>
            <div className="aciklama-ipucu">{t('devamDokun')}</div>
          </div>
        </div>
      )}
    </div>
  );
}
