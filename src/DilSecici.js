import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DILLER } from "./i18n";
import "./DilSecici.css";

// GLAMWORLD'e özel altın küre ikonu (hazır emoji DEĞİL — anayasa kuralı)
function KureIkon({ boyut = 23 }) {
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9.2" stroke="#FFD700" strokeWidth="1.6" />
      <ellipse cx="12" cy="12" rx="4.2" ry="9.2" stroke="#FFD700" strokeWidth="1.3" />
      <path d="M3 9.5h18M3 14.5h18M2.8 12h18.4" stroke="#FFD700" strokeWidth="1.1" />
    </svg>
  );
}

export default function DilSecici() {
  const { i18n, t } = useTranslation();
  const [acik, setAcik] = useState(false);
  const aktif = (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];
  const aktifDil = DILLER.find((d) => d.kod === aktif) || DILLER[1];

  function sec(kod) {
    i18n.changeLanguage(kod);
    setAcik(false);
  }

  return (
    <>
      {/* Yüzer altın küre + altında ışık saçan, çerçevesiz açıklama (aktif dil) */}
      <div className="dil-kose" onClick={() => setAcik(true)}>
        <button className="dil-dugme" aria-label="Dil / Language"><KureIkon /></button>
        <span className="dil-etiket">{aktifDil.ad}</span>
      </div>

      {/* Ortada, zarif, contained pencere */}
      {acik && (
        <div className="dil-katman" onClick={(e) => { if (e.target === e.currentTarget) setAcik(false); }}>
          <div className="dil-panel">
            <button className="dil-kapat" onClick={() => setAcik(false)} aria-label="Kapat">&#10005;</button>
            <div className="dil-bilek">
              <KureIkon boyut={30} />
              <h2 className="dil-baslik">{t("dilSec")}</h2>
            </div>
            <div className="dil-liste">
              {DILLER.map((d) => (
                <button key={d.kod} className={"dil-sat" + (aktif === d.kod ? " sec" : "")} onClick={() => sec(d.kod)}>
                  <img className="dil-bayrak" src={`https://flagcdn.com/w80/${d.bayrak}.png`} alt="" loading="lazy" />
                  <span className="dil-ad">{d.ad}</span>
                  {aktif === d.kod && <span className="dil-tik">&#10003;</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
