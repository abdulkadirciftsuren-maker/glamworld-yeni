// 6 KÖŞE GERÇEK PIRLANTA — marka/giriş kartı için küçük fasetli altın taş.
// AYRI DOSYA (önemli): Giriş ekranı bunu buradan alır; böylece Giris.js artık dev Anasayfa.js'i
// İÇE ÇEKMEZ → Anasayfa geç (lazy) yüklenebilir, ilk açılış çok hafifler. (ANAYASA: düz ◆ yok, gerçek taş.)
import { useRef } from "react";

// Kutupsal nokta (merkez 50,50): r yarıçap, a açı(derece) → [x,y]
const _PR = (r, a) => { const t = (a - 90) * Math.PI / 180; return [50 + r * Math.cos(t), 50 + r * Math.sin(t)]; };
const _fmt = (pts) => pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");

export function Elmas6Kose({ c = "#e0202c" }) {
  const uid = useRef("e6" + Math.random().toString(36).slice(2, 7)).current;
  const v = [], tb = [], fr = [];
  for (let i = 0; i < 6; i++) { v.push(_PR(39, i * 60)); tb.push(_PR(15, i * 60)); fr.push(_PR(46, i * 60)); }
  const fac = [];
  for (let i = 0; i < 6; i++) fac.push([v[i], v[(i + 1) % 6], tb[(i + 1) % 6], tb[i]]);
  return (
    <svg className="gercek-pir" viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id={uid + "g"} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff3c4" /><stop offset="35%" stopColor="#e8c254" /><stop offset="70%" stopColor="#9c7414" /><stop offset="100%" stopColor="#ffe9a8" />
        </linearGradient>
      </defs>
      {/* altın altıgen çerçeve (ince yüzük) */}
      <polygon points={_fmt(fr)} fill={`url(#${uid}g)`} stroke="#6a4d0a" strokeWidth="1.1" strokeLinejoin="round" />
      {/* taş gövdesi — ALTI KÖŞE */}
      <polygon points={_fmt(v)} fill={c} />
      {/* kenar fasetleri (ton dağıtık — ortada leke yok) */}
      {fac.map((p, i) => <polygon key={"f" + i} points={_fmt(p)} fill={i % 2 ? "#000" : "#fff"} fillOpacity={i % 2 ? ".16" : ".12"} />)}
      <polygon points={_fmt(tb)} fill="#fff" fillOpacity=".12" />
      {/* tek köşe parıltısı (üst) */}
      <polygon points={_fmt(fac[4])} fill="#fff" fillOpacity=".26" />
      {/* BELİRGİN çizgiler — dış altıgen + masa + ışınlar */}
      <g fill="none" strokeLinejoin="round">
        <polygon points={_fmt(v)} stroke="rgba(255,255,255,.5)" strokeWidth=".7" />
        <polygon points={_fmt(tb)} stroke="rgba(255,255,255,.5)" strokeWidth=".6" />
        {v.map((p, i) => <line key={"s" + i} x1={p[0]} y1={p[1]} x2={tb[i][0]} y2={tb[i][1]} stroke="rgba(0,0,0,.28)" strokeWidth=".5" />)}
      </g>
      <polygon points={_fmt(v)} fill="none" stroke="#6a4d0a" strokeWidth=".6" strokeLinejoin="round" />
      {/* TIRNAKLAR — çerçeveden elmasın ÜZERİNE biner (kavrar), 6 köşede */}
      {[0, 60, 120, 180, 240, 300].map((a, i) => {
        const o = _PR(44, a), inn = _PR(29, a);
        return (
          <g key={"pr" + i}>
            <line x1={o[0]} y1={o[1]} x2={inn[0]} y2={inn[1]} stroke="#caa12a" strokeWidth="3" strokeLinecap="round" />
            <circle cx={inn[0]} cy={inn[1]} r="2" fill="#ffe9a8" stroke="#7a5a0e" strokeWidth=".5" />
          </g>
        );
      })}
    </svg>
  );
}
