// KAYAN YAZI (anayasa) — sığmayan yazı KESİLMEZ; şeritte sola doğru CANLI yürür, 3 kez gidip başa döner,
// sonra başta durur. Parmakla da kaydırılıp tam yazı okunur. .kayan-dis/.kayan-ic CSS'i Anasayfa.css'te (global).
import { useRef, useState, useEffect } from "react";

export default function KayanYazi({ children, className }) {
  const disRef = useRef(null);
  const icRef = useRef(null);
  const [tasar, setTasar] = useState(false);
  const otoRef = useRef({ calisti: false, zamanlar: [] });
  useEffect(() => {
    const dis = disRef.current, ic = icRef.current;
    if (!dis || !ic) return;
    const olc = () => setTasar(Math.ceil(ic.scrollWidth - dis.clientWidth) > 2);
    olc();
    let ro; try { ro = new ResizeObserver(olc); ro.observe(dis); ro.observe(ic); } catch (e) {}
    return () => { try { ro && ro.disconnect(); } catch (e) {} };
  }, [children]);
  const otoGez = () => {
    const dis = disRef.current; if (!dis) return;
    const max = dis.scrollWidth - dis.clientWidth; if (max <= 2) return;
    otoRef.current.zamanlar.forEach((z) => clearTimeout(z)); otoRef.current.zamanlar = [];
    const kaydir = (hedef) => { try { dis.scrollTo({ left: hedef, behavior: "smooth" }); } catch (e) { dis.scrollLeft = hedef; } };
    let adim = 0;
    const surdur = () => {
      if (adim >= 6) { kaydir(0); return; }
      kaydir(adim % 2 === 0 ? max : 0); adim++;
      otoRef.current.zamanlar.push(setTimeout(surdur, 1500));
    };
    surdur();
  };
  useEffect(() => {
    if (!tasar) return;
    const z = setTimeout(() => { if (!otoRef.current.calisti) { otoRef.current.calisti = true; otoGez(); } }, 700);
    return () => { clearTimeout(z); otoRef.current.zamanlar.forEach((zz) => clearTimeout(zz)); };
  }, [tasar]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span ref={disRef} className={"kayan-dis" + (tasar ? " kayabilir" : "") + (className ? " " + className : "")}
      onClick={tasar ? otoGez : undefined} title={tasar ? "Kaydır / dokun" : undefined}>
      <span ref={icRef} className="kayan-ic">{children}</span>
    </span>
  );
}
