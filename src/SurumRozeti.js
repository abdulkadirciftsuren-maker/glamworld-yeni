import { useEffect, useRef, useState } from "react";
import { buildGecmisi, sonBuild } from "./buildGecmisi";
import "./SurumRozeti.css";

export default function SurumRozeti() {
  const rozetRef = useRef(null);
  const [acik, setAcik] = useState(false);
  const [kucuk, setKucuk] = useState(false);

  useEffect(() => {
    const rozet = rozetRef.current;
    if (!rozet) return;

    let suruk = false, basX = 0, basY = 0, rozX = 0, rozY = 0, hareket = false;

    const konumla = (x, y) => {
      const r = rozet.getBoundingClientRect();
      const maxX = window.innerWidth - r.width - 6;
      const maxY = window.innerHeight - r.height - 6;
      x = Math.max(6, Math.min(x, maxX));
      y = Math.max(6, Math.min(y, maxY));
      rozet.style.left = x + "px";
      rozet.style.top = y + "px";
      rozet.style.transform = "none";
    };

    const basla = (e) => {
      if (e.target.closest(".rozet-btn") || e.target.closest(".gc-dosya")) return;
      suruk = true; hareket = false;
      rozet.classList.add("suruklenirken");
      const p = e.touches ? e.touches[0] : e;
      basX = p.clientX; basY = p.clientY;
      const r = rozet.getBoundingClientRect();
      rozX = r.left; rozY = r.top;
    };
    const hareketEt = (e) => {
      if (!suruk) return;
      const p = e.touches ? e.touches[0] : e;
      const dx = p.clientX - basX;
      const dy = p.clientY - basY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hareket = true;
      konumla(rozX + dx, rozY + dy);
      if (e.cancelable) e.preventDefault();
    };
    const bitir = () => {
      suruk = false;
      rozet.classList.remove("suruklenirken");
      rozet.dataset.hareket = hareket ? "1" : "0";
    };

    rozet.addEventListener("mousedown", basla);
    window.addEventListener("mousemove", hareketEt);
    window.addEventListener("mouseup", bitir);
    rozet.addEventListener("touchstart", basla, { passive: false });
    window.addEventListener("touchmove", hareketEt, { passive: false });
    window.addEventListener("touchend", bitir);

    return () => {
      rozet.removeEventListener("mousedown", basla);
      window.removeEventListener("mousemove", hareketEt);
      window.removeEventListener("mouseup", bitir);
      rozet.removeEventListener("touchstart", basla);
      window.removeEventListener("touchmove", hareketEt);
      window.removeEventListener("touchend", bitir);
    };
  }, []);

  // Otomatik gezinme: sayaç sayfada yer değiştirir ki arkası görünsün.
  // Panel açıkken veya sürüklenirken durur (kullanıcı isteği).
  useEffect(() => {
    if (acik) return;
    const rozet = rozetRef.current; if (!rozet) return;
    let idx = 0;
    const id = setInterval(() => {
      if (rozet.classList.contains("suruklenirken")) return;
      const r = rozet.getBoundingClientRect();
      const mx = Math.max(10, window.innerWidth - r.width - 10);
      const my = Math.max(10, window.innerHeight - r.height - 10);
      const noktalar = [[mx / 2, 10], [10, my * 0.4], [mx, my * 0.4], [mx / 2, my], [10, 10], [mx, 10]];
      idx = (idx + 1) % noktalar.length;
      rozet.style.transform = "none";
      rozet.style.left = noktalar[idx][0] + "px";
      rozet.style.top = noktalar[idx][1] + "px";
    }, 6000);
    return () => clearInterval(id);
  }, [acik]);

  const surumYazi = `${sonBuild.surum}.B${sonBuild.build}`;

  return (
    <div
      className={"yuzen-rozet" + (kucuk ? " kucuk" : "") + (acik ? " acik-panel" : "")}
      ref={rozetRef}
    >
      {/* KÜÇÜK HAL */}
      <div
        className="mini"
        onClick={() => {
          if (rozetRef.current && rozetRef.current.dataset.hareket !== "1") setKucuk(false);
        }}
      >
        <span className="nokta"></span>
        <span className="mini-yazi">{surumYazi}</span>
      </div>

      {/* NORMAL GÖRÜNÜM */}
      <div className="govde">
        <div className="rozet-ust">
          <div className="rozet-sol">
            <span className="rozet-no">{surumYazi}</span>
            <span
              className="rozet-dosya rozet-btn"
              title="Geçmişi göster"
              onClick={(e) => { e.stopPropagation(); setAcik(v => !v); }}
            >
              {sonBuild.dosya}
            </span>
          </div>
          <div className="rozet-saglar">
            <div
              className="kucult-btn rozet-btn"
              title="Geçmiş"
              onClick={(e) => { e.stopPropagation(); setAcik(v => !v); }}
            >≡</div>
            <div
              className="kucult-btn rozet-btn"
              title="Küçült"
              onClick={(e) => { e.stopPropagation(); setKucuk(true); }}
            >–</div>
          </div>
        </div>
        <div className="rozet-tarih">
          {sonBuild.tarih} · {sonBuild.saat}
        </div>

        {/* GEÇMİŞ PANELİ */}
        {acik && (
          <div className="gecmis-panel">
            <div className="gc-baslik">Build Geçmişi</div>
            {buildGecmisi.map((b, i) => (
              <div key={i} className={"gc-sat" + (i === 0 ? " gc-son" : "")}>
                <div className="gc-ust">
                  <span className="gc-surum">{b.surum}.{b.build}</span>
                  <span className="gc-zaman">{b.tarih} {b.saat}</span>
                </div>
                <div className="gc-dosya-sat">
                  <span className="gc-dosya">{b.dosya}</span>
                </div>
                <div className="gc-aciklama">{b.aciklama}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
