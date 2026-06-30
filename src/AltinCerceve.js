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
    let raf = 0, sonVh = -1, sonUst = -1;
    // Adres cubugu kayinca / haritadan geri donunce visualViewport ARKA ARKAYA onlarca olay firlatir;
    // her olayda --gercek-vh yazmak paneli yanip sondururdu. COZUM: kare basina TEK guncelleme (rAF) +
    // deger DEGISMEDIYSE hic yazma -> titreme/yanip sonme biter, panel sakin oturur.
    function uygula() {
      raf = 0;
      const h = vv ? vv.height : window.innerHeight;
      const ust = vv ? vv.offsetTop : 0;
      const yeniVh = Math.ceil(h) + 1;        // +1px tampon: alt cerceve tam otursun
      const yeniUst = Math.floor(ust);
      if (yeniVh !== sonVh) { sonVh = yeniVh; document.documentElement.style.setProperty("--gercek-vh", yeniVh + "px"); }
      if (yeniUst !== sonUst) { sonUst = yeniUst; document.documentElement.style.setProperty("--gercek-ust", yeniUst + "px"); }
    }
    function olc() { if (!raf) raf = requestAnimationFrame(uygula); }
    olc();
    if (vv) {
      vv.addEventListener("resize", olc);
      vv.addEventListener("scroll", olc);
    }
    window.addEventListener("resize", olc);
    window.addEventListener("orientationchange", olc);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (vv) {
        vv.removeEventListener("resize", olc);
        vv.removeEventListener("scroll", olc);
      }
      window.removeEventListener("resize", olc);
      window.removeEventListener("orientationchange", olc);
    };
  }, []);

  // ALTIN ÇERÇEVE KALDIRILDI (kullanıcı: çerçeve sayfa uzayınca/kayınca sorun yaratıyor,
  // bu yüzden sayfaları sabit-kısa yapmak zorunda kalıyorduk). Görünür çerçeve YOK; ama
  // --gercek-vh / --gercek-ust ölçümü (yukarıdaki useEffect) menü/ayarlar/tüm pencereler için ŞART → kaldı.
  return null;
}
