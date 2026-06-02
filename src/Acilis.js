import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./Acilis.css";

const PIRLANTA_SVG = `
  <polygon points="35,38 65,38 60,26 40,26" fill="#fffef6"/>
  <polygon points="18,38 35,38 40,26 28,26" fill="url(#kron)"/>
  <polygon points="28,26 40,26 34,20" fill="#fff"/>
  <polygon points="65,38 82,38 72,26 60,26" fill="#ffe487"/>
  <polygon points="60,26 72,26 66,20" fill="#fff7d8"/>
  <polygon points="34,20 66,20 60,26 40,26" fill="#ffffff"/>
  <polygon points="34,20 40,26 28,26" fill="#fff8df"/>
  <polygon points="66,20 72,26 60,26" fill="#fff1c0"/>
  <polygon points="18,38 50,38 50,86" fill="url(#pavL)"/>
  <polygon points="50,38 82,38 50,86" fill="url(#pavR)"/>
  <polygon points="35,38 50,38 50,86" fill="#fff0b8" opacity=".55"/>
  <polygon points="50,38 65,38 50,86" fill="#FFD700" opacity=".4"/>
  <line x1="18" y1="38" x2="82" y2="38" stroke="#fff" stroke-width="1.2" opacity=".85"/>
  <line x1="35" y1="38" x2="50" y2="86" stroke="rgba(255,255,255,.4)" stroke-width="0.6"/>
  <line x1="65" y1="38" x2="50" y2="86" stroke="rgba(0,0,0,.18)" stroke-width="0.6"/>
  <line x1="50" y1="38" x2="50" y2="86" stroke="rgba(255,255,255,.3)" stroke-width="0.5"/>
`;

export default function Acilis({ baslik = "GLAMWORLD", onBitti }) {
  const { t } = useTranslation();
  const kokRef = useRef(null);

  useEffect(() => {
    const kok = kokRef.current;
    if (!kok) return;

    const $ = (id) => kok.querySelector("#" + id);
    const giris = $("giris");
    const parlama = $("parlama");
    const blok = $("blok");
    const logo = $("logo");
    if (logo) logo.style.setProperty("--logo-metin", JSON.stringify(baslik));
    const eSol = $("elmasSol");
    const eSag = $("elmasSag");
    const cizgi = $("cizgi");
    const altyazi = $("altyazi");
    const sahne = $("sahne");
    const sesBtn = $("sesBtn");
    const gecBtn = $("gecBtn");

    let sesAcik = true;
    let AC = null;
    let anaGain = null;
    let zamanlar = [];

    function sesBaslat() {
      if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
      if (!anaGain) {
        anaGain = AC.createGain();
        anaGain.gain.value = 1;
        anaGain.connect(AC.destination);
      }
    }
    function can(freq, gecikme, tepe, sure) {
      if (!sesAcik || !AC || !anaGain) return;
      const t = AC.currentTime + gecikme;
      const harmonikler = [
        { oran: 1, g: 1.0 },
        { oran: 2.0, g: 0.5 },
        { oran: 3.01, g: 0.28 },
        { oran: 4.2, g: 0.14 },
      ];
      harmonikler.forEach((h) => {
        const o = AC.createOscillator(), g = AC.createGain();
        o.type = "sine"; o.frequency.value = freq * h.oran;
        o.connect(g); g.connect(anaGain);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(tepe * h.g, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
        o.start(t); o.stop(t + sure + 0.1);
      });
    }
    function sinematikGiris() {
      if (!sesAcik || !AC) return;
      if (!anaGain) { anaGain = AC.createGain(); anaGain.gain.value = 1; anaGain.connect(AC.destination); }
      anaGain.gain.value = 1;
      can(196.0, 0.0, 0.32, 3.2);
      can(392.0, 0.05, 0.22, 3.0);
      can(523.3, 0.5, 0.26, 2.6);
      can(659.3, 0.9, 0.26, 2.6);
      can(784.0, 1.3, 0.26, 2.8);
      can(1046.5, 1.8, 0.30, 3.4);
      can(784.0, 4.0, 0.15, 3.0);
      can(1046.5, 5.2, 0.13, 3.0);
      can(1318.5, 6.4, 0.12, 3.2);
    }
    function cinSesi() {
      if (!sesAcik || !AC) return;
      can(1568, 0, 0.22, 1.8);
      can(2349, 0.04, 0.14, 1.6);
    }
    function sesiBitir() {
      if (!AC) return;
      try {
        if (anaGain) {
          const t = AC.currentTime;
          anaGain.gain.cancelScheduledValues(t);
          anaGain.gain.setValueAtTime(Math.max(anaGain.gain.value, 0.0001), t);
          anaGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        }
      } catch (e) {}
    }
    function sesiTamKapat() {
      try { if (AC && AC.state !== "closed") { AC.close(); AC = null; anaGain = null; } } catch (e) {}
    }

    function serpmeYap() {
      const kap = $("serpme");
      kap.innerHTML = "";
      const yerler = [
        [8, 18], [22, 6], [40, 14], [58, 8], [74, 16], [90, 22],
        [6, 82], [24, 90], [44, 84], [62, 92], [80, 86], [94, 78],
      ];
      yerler.forEach((p, i) => {
        const m = document.createElement("div");
        m.className = "mini";
        m.style.left = p[0] + "%";
        m.style.top = p[1] + "%";
        const s = Math.random() * 8 + 10;
        m.style.width = m.style.height = s + "px";
        m.innerHTML = '<svg viewBox="0 0 100 100"><use href="#pirlantaSekil"/></svg>';
        kap.appendChild(m);
        const id = setTimeout(() => m.classList.add("cik"), 3000 + i * 55);
        zamanlar.push(id);
      });
    }

    function zerreler(n) {
      for (let i = 0; i < n; i++) {
        const z = document.createElement("div");
        z.className = "zerre";
        const s = Math.random() * 3 + 1.5;
        z.style.width = z.style.height = s + "px";
        z.style.left = Math.random() * 100 + "%";
        z.style.top = Math.random() * 100 + "%";
        sahne.appendChild(z);
        const d = Math.random() * 0.8;
        z.animate(
          [
            { opacity: 0, transform: "translateY(20px) scale(.4)" },
            { opacity: Math.random() * 0.7 + 0.3, transform: "translateY(0) scale(1)" },
            { opacity: 0, transform: "translateY(-40px) scale(.3)" },
          ],
          { duration: 3500 + Math.random() * 2500, delay: d * 1000, iterations: Infinity, easing: "ease-in-out" }
        );
      }
    }

    function sov() {
      parlama.classList.add("patla");
      blok.classList.add("gor");
      zamanlar.push(setTimeout(() => { logo.classList.add("gel"); }, 700));
      zamanlar.push(setTimeout(() => { logo.classList.add("shimmer"); }, 1700));
      zamanlar.push(setTimeout(() => { eSol.classList.add("yapis"); eSag.classList.add("yapis"); }, 2100));
      zamanlar.push(setTimeout(() => {
        eSol.classList.add("cak"); eSag.classList.add("cak");
        cinSesi();
        eSol.classList.add("isilda"); eSag.classList.add("isilda");
      }, 3000));
      zamanlar.push(setTimeout(() => { cizgi.classList.add("ac"); serpmeYap(); }, 3200));
      zamanlar.push(setTimeout(() => { altyazi.classList.add("gor"); }, 3800));
      zamanlar.push(setTimeout(() => { if (onBitti) { sesiBitir(); onBitti(); } }, 8000));
    }

    function basla() {
      sesBaslat();
      sinematikGiris();
      giris.classList.add("kapan");
      zerreler(46);
      const id = setTimeout(sov, 400);
      zamanlar.push(id);
    }

    const onGiris = () => basla();
    const onGec = (e) => { e.stopPropagation(); sesiBitir(); if (onBitti) onBitti(); };
    const onSes = (e) => {
      e.stopPropagation(); sesAcik = !sesAcik;
      sesBtn.textContent = sesAcik ? "🔊 " + t("sesAcik") : "🔇 " + t("sesKapali");
      sesBtn.style.opacity = sesAcik ? "1" : ".6";
      if (anaGain) anaGain.gain.value = sesAcik ? 1 : 0;
    };
    const onGizle = () => { if (document.hidden) sesiTamKapat(); };

    giris.addEventListener("click", onGiris);
    gecBtn.addEventListener("click", onGec);
    sesBtn.addEventListener("click", onSes);
    window.addEventListener("pagehide", sesiTamKapat);
    document.addEventListener("visibilitychange", onGizle);

    return () => {
      zamanlar.forEach(clearTimeout);
      giris.removeEventListener("click", onGiris);
      gecBtn.removeEventListener("click", onGec);
      sesBtn.removeEventListener("click", onSes);
      window.removeEventListener("pagehide", sesiTamKapat);
      document.removeEventListener("visibilitychange", onGizle);
      sesiTamKapat();
    };
  }, [baslik, onBitti, t]);

  return (
    <div ref={kokRef} className="acilis-kok">
      <div id="sahne">
        <div id="parlama"></div>

        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <defs>
            <linearGradient id="kron" x1="0" y1="0" x2="1" y2="0.4">
              <stop offset="0" stopColor="#fffef8" /><stop offset=".5" stopColor="#fff1bf" /><stop offset="1" stopColor="#FFD24A" />
            </linearGradient>
            <linearGradient id="pavL" x1="0" y1="0" x2="0.5" y2="1">
              <stop offset="0" stopColor="#FFE9A8" /><stop offset="1" stopColor="#caa01e" />
            </linearGradient>
            <linearGradient id="pavR" x1="1" y1="0" x2="0.5" y2="1">
              <stop offset="0" stopColor="#FFD700" /><stop offset="1" stopColor="#9c7409" />
            </linearGradient>
            <g id="pirlantaSekil" dangerouslySetInnerHTML={{ __html: PIRLANTA_SVG }} />
          </defs>
        </svg>

        <div id="blok">
          <div id="serpme"></div>
          <div className="satir">
            <span className="elmas sol" id="elmasSol">
              <span className="tas"><svg viewBox="0 0 100 100" width="100%" height="100%"><use href="#pirlantaSekil" /></svg></span>
              <span className="yildiz"></span><span className="parilti"></span>
            </span>
            <span id="logo">{baslik}</span>
            <span className="elmas sag" id="elmasSag">
              <span className="tas"><svg viewBox="0 0 100 100" width="100%" height="100%"><use href="#pirlantaSekil" /></svg></span>
              <span className="yildiz"></span><span className="parilti"></span>
            </span>
          </div>
          <div id="cizgi"></div>
          <div id="altyazi">
            <div className="alt-platform">{t("acilisPlatform")}</div>
            <div className="alt-aciklama">{t("acilisAciklama")}</div>
          </div>
        </div>
      </div>

      <div className="ust">
        <button className="btn" id="gecBtn">{t("acilisGec")} →</button>
      </div>

      <button className="btn" id="sesBtn" title="ses">🔊 {t("sesAcik")}</button>

      <div id="giris">
        <div className="giris-halka"><div className="giris-elmas"></div></div>
        <div className="giris-yazi">{t("acilisDokun")}</div>
      </div>
    </div>
  );
}
