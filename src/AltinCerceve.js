import { useEffect } from "react";
import "./AltinCerceve.css";

/*
  ALTIN CERCEVE - tum platformda sabit ekran cercevesi.
  - position: fixed -> ekrana sabit
  - pointer-events: none -> altindaki butonlara basilir
  - ZIPLAMA KESIN COZUM: visualViewport API ile gercek gorunen alani olcuyoruz.
    Adres cubugu (ust ya da alt) kaysa bile cerceve dogru yerde kalir, ziplamaz.
*/
export default function AltinCerceve() {
  useEffect(() => {
    const vv = window.visualViewport;
    function olc() {
      // visualViewport varsa onu kullan (adres cubugunu dogru hesaplar),
      // yoksa innerHeight'a dus
      const h = vv ? vv.height : window.innerHeight;
      const ust = vv ? vv.offsetTop : 0;
      // YUKARI yuvarla (Math.ceil) + 1px tampon: alt cerceve cizgisi
      // ekranin tam altina otursun, 1px beyaz/bosluk kalmasin
      document.documentElement.style.setProperty("--gercek-vh", Math.ceil(h) + 1 + "px");
      document.documentElement.style.setProperty("--gercek-ust", Math.floor(ust) + "px");
    }
    olc();
    if (vv) {
      vv.addEventListener("resize", olc);
      vv.addEventListener("scroll", olc);
    }
    window.addEventListener("resize", olc);
    window.addEventListener("orientationchange", olc);
    return () => {
      if (vv) {
        vv.removeEventListener("resize", olc);
        vv.removeEventListener("scroll", olc);
      }
      window.removeEventListener("resize", olc);
      window.removeEventListener("orientationchange", olc);
    };
  }, []);

  return <div className="altin-cerceve" aria-hidden="true"></div>;
}
