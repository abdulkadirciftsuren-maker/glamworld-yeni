// GLOXORG — BELGE TARAYICI (Foto → PDF için). Kullanıcı 20 Kas: "belge çekilecekse ekranda A4 kâğıdını köşelerden alacak;
//   sayfalar karışıyor, yarısı bir sayfada yarısı öbüründe".
// 1) koseBul: fotoğrafta beyaz kâğıdı bulur, 4 köşesini tahmin eder (kütüphanesiz, hızlı).
// 2) KoseAyar: tam ekran, 4 KARE tutamaçla köşeler parmakla düzeltilir (sürüklerken büyüteç).
// 3) duzlestir: kâğıdı eğik/perspektif fotoğraftan düz A4 sayfaya çevirir.
// 4) fotoPdfBlob: HER FOTOĞRAF KENDİ A4 SAYFASI (asla ikiye bölünmez), sayfaya sığdırılır ve ortalanır.
// Kurallar: siyah zemin YOK (altın), kare tutamaç/düğme, Türkçe yorum.
import { useState, useRef, useEffect, useCallback } from "react";

export const A4_ORAN = 297 / 210;

export function resimYukle(src) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
}

// Dosyayı oku, en uzun kenarı max'a küçült → JPEG dataURL
export function dosyadanResim(f, max = 2000) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = rej;
    r.onload = async () => {
      try {
        const im = await resimYukle(String(r.result));
        let w = im.naturalWidth || 800, h = im.naturalHeight || 800;
        if (w > max || h > max) { if (w >= h) { h = Math.round(h * max / w); w = max; } else { w = Math.round(w * max / h); h = max; } }
        const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
        const c = cv.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, w, h); c.drawImage(im, 0, 0, w, h);
        res(cv.toDataURL("image/jpeg", 0.9));
      } catch (e) { res(String(r.result)); }
    };
    r.readAsDataURL(f);
  });
}

// ---- 1) KÖŞE BUL: küçült → gri → Otsu eşiği → en büyük AÇIK renkli bölge → uç noktalar = köşeler
export function koseBul(im) {
  const W0 = im.naturalWidth, H0 = im.naturalHeight;
  const varsayilan = () => { const dx = W0 * 0.06, dy = H0 * 0.06; return [{ x: dx, y: dy }, { x: W0 - dx, y: dy }, { x: W0 - dx, y: H0 - dy }, { x: dx, y: H0 - dy }]; };
  try {
    const olc = Math.min(1, 360 / Math.max(W0, H0));
    const w = Math.max(8, Math.round(W0 * olc)), h = Math.max(8, Math.round(H0 * olc));
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const c = cv.getContext("2d"); c.drawImage(im, 0, 0, w, h);
    const px = c.getImageData(0, 0, w, h).data;
    const n = w * h, gri = new Uint8Array(n), his = new Array(256).fill(0);
    for (let i = 0; i < n; i++) { const g = (px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114) | 0; gri[i] = g; his[g]++; }
    // Otsu eşiği (kâğıt = açık, arka plan = koyu)
    let top = 0; for (let i = 0; i < 256; i++) top += i * his[i];
    let sB = 0, wB = 0, enIyi = 0, esik = 160;
    for (let i = 0; i < 256; i++) {
      wB += his[i]; if (!wB) continue; const wF = n - wB; if (!wF) break;
      sB += i * his[i]; const mB = sB / wB, mF = (top - sB) / wF, ara = wB * wF * (mB - mF) * (mB - mF);
      if (ara > enIyi) { enIyi = ara; esik = i; }
    }
    // En büyük açık bölge (4 komşulu taşma)
    const etiket = new Int32Array(n).fill(0), kuyruk = new Int32Array(n);
    let enBuyuk = 0, enEt = 0, et = 0;
    for (let s = 0; s < n; s++) {
      if (etiket[s] || gri[s] <= esik) continue;
      et++; let bas = 0, son = 0, say = 0; kuyruk[son++] = s; etiket[s] = et;
      while (bas < son) {
        const p = kuyruk[bas++]; say++; const x = p % w, y = (p / w) | 0;
        if (x > 0 && !etiket[p - 1] && gri[p - 1] > esik) { etiket[p - 1] = et; kuyruk[son++] = p - 1; }
        if (x < w - 1 && !etiket[p + 1] && gri[p + 1] > esik) { etiket[p + 1] = et; kuyruk[son++] = p + 1; }
        if (y > 0 && !etiket[p - w] && gri[p - w] > esik) { etiket[p - w] = et; kuyruk[son++] = p - w; }
        if (y < h - 1 && !etiket[p + w] && gri[p + w] > esik) { etiket[p + w] = et; kuyruk[son++] = p + w; }
      }
      if (say > enBuyuk) { enBuyuk = say; enEt = et; }
    }
    if (!enEt || enBuyuk < n * 0.12 || enBuyuk > n * 0.97) return varsayilan();
    let tl = null, tr = null, br = null, bl = null, a = Infinity, b = -Infinity, cc = -Infinity, d = Infinity;
    for (let p = 0; p < n; p++) {
      if (etiket[p] !== enEt) continue; const x = p % w, y = (p / w) | 0;
      if (x + y < a) { a = x + y; tl = { x, y }; } if (x + y > b) { b = x + y; br = { x, y }; }
      if (x - y > cc) { cc = x - y; tr = { x, y }; } if (x - y < d) { d = x - y; bl = { x, y }; }
    }
    const k = [tl, tr, br, bl].map((q) => ({ x: Math.min(W0, Math.max(0, (q.x + 0.5) / olc)), y: Math.min(H0, Math.max(0, (q.y + 0.5) / olc)) }));
    // Dörtgen alanı çok küçükse (yanlış bulduysa) varsayılan
    const alan = Math.abs((k[0].x * k[1].y - k[1].x * k[0].y) + (k[1].x * k[2].y - k[2].x * k[1].y) + (k[2].x * k[3].y - k[3].x * k[2].y) + (k[3].x * k[0].y - k[0].x * k[3].y)) / 2;
    if (alan < W0 * H0 * 0.12) return varsayilan();
    return k;
  } catch (e) { return varsayilan(); }
}

// ---- 3) DÜZLEŞTİR: hedef dikdörtgenden kaynak dörtgene perspektif eşleme (8 bilinmeyenli denklem), çift doğrusal örnekleme
function homografi(kaynak, W, H) {
  const hedef = [{ x: 0, y: 0 }, { x: W, y: 0 }, { x: W, y: H }, { x: 0, y: H }];
  const A = [], B = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = hedef[i], { x: u, y: v } = kaynak[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); B.push(v);
  }
  for (let c = 0; c < 8; c++) { // Gauss yok etme
    let m = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[m][c])) m = r;
    [A[c], A[m]] = [A[m], A[c]]; [B[c], B[m]] = [B[m], B[c]];
    for (let r = c + 1; r < 8; r++) { const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; B[r] -= f * B[c]; }
  }
  const h = new Array(8);
  for (let r = 7; r >= 0; r--) { let s = B[r]; for (let k = r + 1; k < 8; k++) s -= A[r][k] * h[k]; h[r] = s / A[r][r]; }
  return h;
}
const uzak = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

export function duzlestir(im, k) {
  const gen = (uzak(k[0], k[1]) + uzak(k[3], k[2])) / 2, yuk = (uzak(k[0], k[3]) + uzak(k[1], k[2])) / 2;
  let oran = yuk / Math.max(1, gen);
  // A4'e yakınsa tam A4 oranına oturt (dikey ya da yatay); değilse (fiş, kart) kendi oranı kalır
  if (Math.abs(oran - A4_ORAN) / A4_ORAN < 0.22) oran = A4_ORAN; else if (Math.abs(oran - 1 / A4_ORAN) * A4_ORAN < 0.22) oran = 1 / A4_ORAN;
  const uzun = 1754; let W, H;
  if (oran >= 1) { H = uzun; W = Math.round(uzun / oran); } else { W = uzun; H = Math.round(uzun * oran); }
  const sw = im.naturalWidth, sh = im.naturalHeight;
  const sc = document.createElement("canvas"); sc.width = sw; sc.height = sh; const sctx = sc.getContext("2d"); sctx.drawImage(im, 0, 0);
  const kaynak = sctx.getImageData(0, 0, sw, sh).data;
  const out = document.createElement("canvas"); out.width = W; out.height = H; const octx = out.getContext("2d");
  const hedef = octx.createImageData(W, H), d = hedef.data;
  const [a, b, c, e, f, g, p, q] = homografi(k, W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const z = p * x + q * y + 1, u = (a * x + b * y + c) / z, v = (e * x + f * y + g) / z;
      const o = (y * W + x) * 4;
      if (u < 0 || v < 0 || u > sw - 1 || v > sh - 1) { d[o] = d[o + 1] = d[o + 2] = 255; d[o + 3] = 255; continue; }
      const x0 = u | 0, y0 = v | 0, x1 = Math.min(sw - 1, x0 + 1), y1 = Math.min(sh - 1, y0 + 1), fx = u - x0, fy = v - y0;
      const i00 = (y0 * sw + x0) * 4, i10 = (y0 * sw + x1) * 4, i01 = (y1 * sw + x0) * 4, i11 = (y1 * sw + x1) * 4;
      for (let ch = 0; ch < 3; ch++) {
        const ust = kaynak[i00 + ch] * (1 - fx) + kaynak[i10 + ch] * fx, alt = kaynak[i01 + ch] * (1 - fx) + kaynak[i11 + ch] * fx;
        d[o + ch] = ust * (1 - fy) + alt * fy;
      }
      d[o + 3] = 255;
    }
  }
  octx.putImageData(hedef, 0, 0);
  return out.toDataURL("image/jpeg", 0.9);
}

// ---- 4) PDF: her fotoğraf AYRI A4 sayfa (yatay fotoğraf → yatay sayfa), sayfaya sığdır + ortala
export async function fotoPdfBlob(fotolar, baslik) {
  const { jsPDF } = await import("jspdf");
  let pdf = null;
  for (const f of fotolar) {
    const im = await resimYukle(f.d);
    const yon = im.naturalWidth > im.naturalHeight ? "landscape" : "portrait";
    if (!pdf) pdf = new jsPDF({ unit: "pt", format: "a4", orientation: yon }); else pdf.addPage("a4", yon);
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight(), kenar = 14;
    const olc = Math.min((pw - kenar * 2) / im.naturalWidth, (ph - kenar * 2) / im.naturalHeight);
    const w = im.naturalWidth * olc, h = im.naturalHeight * olc;
    pdf.addImage(f.d, "JPEG", (pw - w) / 2, (ph - h) / 2, w, h);
  }
  try { pdf.setProperties({ title: baslik || "GLOXORG" }); } catch (e) {}
  return pdf.output("blob");
}

// ---- 2) KÖŞE AYAR EKRANI (tam ekran, altın zemin, 4 kare tutamaç + büyüteç)
export function KoseAyar({ t, src, ilkKoseler, onTamam, onOlduguGibi, onIptal }) {
  const [im, setIm] = useState(null);
  const [k, setK] = useState(null);
  const [kutu, setKutu] = useState(null); // resmin ekrandaki yeri {x,y,w,h,olc}
  const [suruk, setSuruk] = useState(-1);
  const [isliyor, setIsliyor] = useState(false);
  const alanRef = useRef(null);

  useEffect(() => { let iptal = false; resimYukle(src).then((r) => { if (iptal) return; setIm(r); setK(ilkKoseler || koseBul(r)); }).catch(() => onIptal && onIptal()); return () => { iptal = true; }; }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  const olcu = useCallback(() => {
    const a = alanRef.current; if (!a || !im) return;
    const r = a.getBoundingClientRect(), olc = Math.min(r.width / im.naturalWidth, r.height / im.naturalHeight);
    const w = im.naturalWidth * olc, h = im.naturalHeight * olc;
    setKutu({ x: (r.width - w) / 2, y: (r.height - h) / 2, w, h, olc });
  }, [im]);
  useEffect(() => { olcu(); window.addEventListener("resize", olcu); return () => window.removeEventListener("resize", olcu); }, [olcu]);

  const ekranda = (p) => ({ x: kutu.x + p.x * kutu.olc, y: kutu.y + p.y * kutu.olc });
  const tasi = (e) => {
    if (suruk < 0 || !kutu || !alanRef.current) return;
    const r = alanRef.current.getBoundingClientRect();
    const x = Math.min(im.naturalWidth, Math.max(0, (e.clientX - r.left - kutu.x) / kutu.olc));
    const y = Math.min(im.naturalHeight, Math.max(0, (e.clientY - r.top - kutu.y) / kutu.olc));
    setK((eski) => eski.map((p, i) => (i === suruk ? { x, y } : p)));
  };
  const tamam = async () => {
    if (!im || !k) return; setIsliyor(true);
    await new Promise((r) => setTimeout(r, 30)); // "hazırlanıyor" yazısı görünsün
    try { onTamam(duzlestir(im, k), k); } catch (e) { onOlduguGibi && onOlduguGibi(); }
    setIsliyor(false);
  };

  const noktalar = kutu && k ? k.map(ekranda) : null;
  const buyutec = suruk >= 0 && noktalar && kutu ? (() => {
    const p = noktalar[suruk], B = 120, Z = 2.4;
    const bx = (p.x - kutu.x) * Z, by = (p.y - kutu.y) * Z;
    const sagda = p.x < (alanRef.current ? alanRef.current.clientWidth / 2 : 200); // büyüteç parmağın altında kalmasın → karşı tarafa
    return <div className="bt-buyutec" style={{ left: sagda ? "auto" : 10, right: sagda ? 10 : "auto", backgroundImage: `url(${src})`, backgroundSize: `${kutu.w * Z}px ${kutu.h * Z}px`, backgroundPosition: `${B / 2 - bx}px ${B / 2 - by}px` }}><span /></div>;
  })() : null;

  return (
    <div className="bt-ekran">
      <div className="bt-ust">{t("belKoseBaslik", "Kare tutamaçları kâğıdın 4 köşesine sürükle")}</div>
      <div className="bt-alan" ref={alanRef} onPointerMove={tasi} onPointerUp={() => setSuruk(-1)} onPointerCancel={() => setSuruk(-1)}>
        {kutu ? <img src={src} alt="" className="bt-resim" style={{ left: kutu.x, top: kutu.y, width: kutu.w, height: kutu.h }} onLoad={olcu} /> : null}
        {noktalar ? (
          <svg className="bt-cizgi" width="100%" height="100%">
            <polygon points={noktalar.map((p) => p.x + "," + p.y).join(" ")} fill="rgba(255,215,0,.18)" stroke="#FFD700" strokeWidth="3" />
          </svg>
        ) : null}
        {noktalar ? noktalar.map((p, i) => (
          <div key={i} className={"bt-tutamac" + (suruk === i ? " aktif" : "")} style={{ left: p.x - 20, top: p.y - 20 }}
            onPointerDown={(e) => { e.preventDefault(); try { alanRef.current.setPointerCapture(e.pointerId); } catch (x) {} setSuruk(i); }} />
        )) : null}
        {buyutec}
      </div>
      <div className="bt-alt">
        <button className="bt-btn iptal" onClick={onIptal}>✕ {t("belIptal", "İptal")}</button>
        <button className="bt-btn oldugu" onClick={onOlduguGibi}>{t("belOlduguGibi", "Olduğu gibi")}</button>
        <button className="bt-btn tamam" disabled={isliyor || !k} onClick={tamam}>{isliyor ? "⏳" : "✓"} {t("belKirpKaydet", "Kırp ve kaydet")}</button>
      </div>
    </div>
  );
}
