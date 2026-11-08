// 🩺 TEŞHİS KUTUSU (B454) — Oppo gibi telefonlarda "veriler gelmiyor / oturum düşüyor" sorununu GERÇEK uygulamanın içinde ölçer.
// AÇMAK: ekranın SOL ÜST köşesine (GLOXORG yazısının olduğu yer) 3 sn içinde 5 kez dokun, ya da adrese ?tani=1 ekle.
// Gösterir: oturum (giriş + anahtar yenileme), internet durumu, veritabanına DOĞRUDAN sorgu, normal sorgu (önbellekten mi geldi).
// Müşteriye zarar vermez; açılmadıkça hiçbir şey çalıştırmaz. Kullanıcı ekran görüntüsü atar.
import { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { collection, query, where, limit, getDocs, getDocsFromServer, doc, getDocFromServer } from "firebase/firestore";
import { livekitYukle } from "./agirKutuphaneler";
import { sonBuild } from "./buildGecmisi";

const zamanAsimi = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error("ZAMAN AŞIMI " + ms / 1000 + " sn")), ms))]);
const hataYaz = (e) => String((e && (e.code || e.message)) || e).slice(0, 140);

export default function TaniKutusu() {
  const [acik, setAcik] = useState(() => { try { return /[?&]tani=1/.test(window.location.search) || sessionStorage.getItem("gwTani") === "1"; } catch (e) { return false; } });
  const [satirlar, setSatirlar] = useState([]);
  const [izinDugmesi, setIzinDugmesi] = useState(false); // kilit ekranı arama izni yoksa "İzin ver" düğmesi

  // Sol üst köşeye 5 hızlı dokunuş → aç
  useEffect(() => {
    let dokunuslar = [];
    const bas = (e) => {
      const t = e.touches ? e.touches[0] : e;
      if (!t || t.clientX > 160 || t.clientY > 120) return;
      const simdi = Date.now();
      dokunuslar = dokunuslar.filter((z) => simdi - z < 3000); dokunuslar.push(simdi);
      if (dokunuslar.length >= 5) { dokunuslar = []; try { sessionStorage.setItem("gwTani", "1"); } catch (x) {} setAcik(true); }
    };
    window.addEventListener("pointerdown", bas, true);
    return () => window.removeEventListener("pointerdown", bas, true);
  }, []);

  useEffect(() => {
    if (!acik) return undefined;
    let iptal = false;
    const ekle = (ad, sonuc, iyi) => { if (!iptal) setSatirlar((l) => [...l.filter((x) => x.ad !== ad), { ad, sonuc, iyi }]); };
    (async () => {
      ekle("Sürüm", `${sonBuild.surum}.B${sonBuild.build} · ${navigator.userAgent.includes("GloxorgApp") ? "UYGULAMA" : "TARAYICI"} · internet: ${navigator.onLine ? "var" : "YOK"}`, true);
      let onar = ""; try { onar = localStorage.getItem("gwFsOnar") || "-"; } catch (e) {}
      ekle("Önbellek onarımı", onar, true);
      // KAYITLI OTURUM (B455): oturum telefonda nereye yazılıyor, şu an orada var mı? (arka plandan dönünce giriş istiyor sorunu)
      try {
        const kalici = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : "?";
        let lsOturum = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i) || ""; if (k.indexOf("firebase:authUser:") === 0) lsOturum++; }
        let idbOturum = "?";
        try {
          idbOturum = await zamanAsimi(new Promise((ok) => {
            const r = indexedDB.open("firebaseLocalStorageDb");
            r.onsuccess = () => { try { const d = r.result; if (!d.objectStoreNames.contains("firebaseLocalStorage")) { d.close(); ok("depo yok"); return; } const c = d.transaction("firebaseLocalStorage", "readonly").objectStore("firebaseLocalStorage").count(); c.onsuccess = () => { ok(String(c.result)); d.close(); }; c.onerror = () => { ok("okunamadı"); d.close(); }; } catch (x) { ok("hata " + hataYaz(x)); } };
            r.onerror = () => ok("açılamadı " + hataYaz(r.error));
          }), 8000);
        } catch (e) { idbOturum = hataYaz(e); }
        let tur = "?"; try { tur = (auth._persistenceManager && auth._persistenceManager.persistence && auth._persistenceManager.persistence.type) || "?"; } catch (e) {}
        let bayrak = ""; try { bayrak = "gw_oturum=" + (localStorage.getItem("gw_oturum") || "-") + " gw_cikis=" + (localStorage.getItem("gw_cikis") || "-"); } catch (e) {}
        ekle("Kayıtlı oturum", "tür: " + tur + " · IndexedDB: " + idbOturum + " · localStorage: " + lsOturum + " · silinmez izni: " + kalici + " · " + bayrak, idbOturum !== "0" || lsOturum > 0);
      } catch (e) { ekle("Kayıtlı oturum", "OLMADI: " + hataYaz(e), false); }
      const u = auth.currentUser;
      ekle("Giriş", u ? ("var · " + (u.email || u.uid).slice(0, 40)) : "YOK (giriş yapılmamış)", !!u);
      if (u) {
        try { const t = Date.now(); await zamanAsimi(u.getIdToken(true), 15000); ekle("Oturum anahtarı yenileme", "oldu (" + (Date.now() - t) + " ms)", true); }
        catch (e) { ekle("Oturum anahtarı yenileme", "OLMADI: " + hataYaz(e), false); }
      }
      const q = query(collection(db, "pazarUrunleri"), where("reklam", "==", true), limit(3));
      try { const t = Date.now(); const s = await zamanAsimi(getDocsFromServer(q), 20000); ekle("Veritabanı — doğrudan", s.size + " kayıt (" + (Date.now() - t) + " ms)", s.size > 0); }
      catch (e) { ekle("Veritabanı — doğrudan", "OLMADI: " + hataYaz(e), false); }
      try { const t = Date.now(); const s = await zamanAsimi(getDocs(q), 20000); ekle("Veritabanı — normal", s.size + " kayıt · " + (s.metadata.fromCache ? "ÖNBELLEKTEN (sunucuya ulaşamadı)" : "sunucudan") + " (" + (Date.now() - t) + " ms)", s.size > 0 && !s.metadata.fromCache); }
      catch (e) { ekle("Veritabanı — normal", "OLMADI: " + hataYaz(e), false); }
      try {
        const t = Date.now();
        const r = await zamanAsimi(fetch("https://firestore.googleapis.com/v1/projects/glamworld2/databases/(default)/documents/pazarUrunleri?pageSize=2&mask.fieldPaths=baslik&key=AIzaSyBMMMMcHl5IGsUc7k6n5vLvSn_vNruKspw"), 15000);
        ekle("Veritabanı — düz istek", "HTTP " + r.status + " (" + (Date.now() - t) + " ms)", r.ok);
      } catch (e) { ekle("Veritabanı — düz istek", "OLMADI: " + hataYaz(e), false); }
      // 📞 ARAMA TESTİ (B461 — kullanıcı: "hiçbir arama yapamıyorum, bildirimler de bozuldu"). Sunucu tarafı GitHub'dan
      //   kontrol edildi (sunucu + bilet + bilet kabulü SAĞLAM). Burada aynı zincir TELEFONUN İÇİNDEN, kullanıcının kendi
      //   hesabıyla denenir; hangi satır kırmızıysa bozuk halka orası. Kimseyi aramaz, kayıt oluşturmaz.
      try {
        const nat = window.AndroidGlox || null;
        let izin = typeof Notification !== "undefined" ? Notification.permission : "yok";
        try { if (nat && typeof nat.bildirimIzniVar === "function") izin = "telefon: " + (nat.bildirimIzniVar() ? "VAR" : "YOK"); } catch (x) {}
        ekle("📞 Bildirim izni", String(izin), /VAR|granted/.test(String(izin)));
        if (nat && typeof nat.tamEkranIzniVar === "function") {
          const te = !!nat.tamEkranIzniVar();
          ekle("📞 Kilit ekranında arama izni", te ? "VAR" : "YOK → ekran kapalıyken arama açılamaz. Aşağıdaki düğmeye bas, GLOXORG'u AÇ", te);
          if (!te) setIzinDugmesi(true);
        } else if (nat) ekle("📞 Kilit ekranında arama izni", "bu uygulama sürümü bilmiyor (yeni uygulama gerekli)", false);
      } catch (e) { ekle("📞 Bildirim izni", "OLMADI: " + hataYaz(e), false); }
      if (u) {
        try {
          const d = await zamanAsimi(getDocFromServer(doc(db, "kullanicilar", u.uid)), 15000); const x = d.data() || {};
          const n1 = (x.fcmTokens || []).length, n2 = (x.fcmTokensArama || []).length;
          ekle("📞 Kayıtlı bildirim anahtarı", "bildirim: " + n1 + " · arama zili: " + n2, n1 > 0);
        } catch (e) { ekle("📞 Kayıtlı bildirim anahtarı", "OLMADI: " + hataYaz(e), false); }
        try {
          const t = Date.now();
          const s = await zamanAsimi(getDocsFromServer(query(collection(db, "aramalar"), where("arananUid", "==", u.uid), where("durum", "==", "calliyor"), limit(50))), 15000);
          ekle("📞 Gelen arama dinleyicisi", "çalışıyor · şu an çalan: " + s.size + " (" + (Date.now() - t) + " ms)", true);
        } catch (e) { ekle("📞 Gelen arama dinleyicisi", "OLMADI: " + hataYaz(e), false); }
        const sonlar = async (alan, ad) => {
          try {
            const s = await zamanAsimi(getDocsFromServer(query(collection(db, "aramalar"), where(alan, "==", u.uid), limit(40))), 15000);
            const l = s.docs.map((d) => d.data()).sort((a, b) => (b.zamanMs || 0) - (a.zamanMs || 0)).slice(0, 4)
              .map((a) => { const dk = Math.round((Date.now() - (a.zamanMs || 0)) / 60000); return (a.durum || "?") + " (" + (dk < 120 ? dk + " dk" : Math.round(dk / 60) + " sa") + " önce)"; });
            ekle(ad, s.size + " kayıt · son: " + (l.join(", ") || "yok"), true);
          } catch (e) { ekle(ad, "OLMADI: " + hataYaz(e), false); }
        };
        await sonlar("arayanUid", "📞 Benim aradıklarım");
        await sonlar("arananUid", "📞 Beni arayanlar");
      }
      let lk = null;
      try { const t = Date.now(); lk = await zamanAsimi(livekitYukle(), 20000); ekle("📞 Arama motoru", "yüklendi (" + (Date.now() - t) + " ms)", true); }
      catch (e) { ekle("📞 Arama motoru", "OLMADI: " + hataYaz(e), false); }
      let bilet = null;
      try {
        const t = Date.now();
        const r = await zamanAsimi(fetch("https://gloxorg-ai.abdulkadirciftsuren.workers.dev", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ livekitOda: "tani-" + ((u && u.uid) || "x"), kimlik: "tani-" + ((u && u.uid) || Math.random().toString(36).slice(2, 8)), ad: "teshis" }) }), 15000);
        const j = await r.json().catch(() => null);
        if (j && j.token && j.url) { bilet = j; ekle("📞 Arama bileti", "alındı (" + (Date.now() - t) + " ms)", true); }
        else ekle("📞 Arama bileti", "GELMEDİ · HTTP " + r.status, false);
      } catch (e) { ekle("📞 Arama bileti", "OLMADI: " + hataYaz(e), false); }
      if (lk && bilet) {
        let oda = null;
        try { const t = Date.now(); oda = new lk.Room(); await zamanAsimi(oda.connect(bilet.url, bilet.token), 20000); ekle("📞 Arama sunucusuna bağlantı", "BAĞLANDI (" + (Date.now() - t) + " ms)", true); }
        catch (e) { ekle("📞 Arama sunucusuna bağlantı", "OLMADI: " + hataYaz(e), false); }
        try { if (oda) oda.disconnect(); } catch (x) {}
      }
      try {
        const m = navigator.permissions && navigator.permissions.query ? await navigator.permissions.query({ name: "microphone" }) : null;
        ekle("📞 Mikrofon izni", m ? m.state : "sorulamıyor", !m || m.state !== "denied");
      } catch (e) { ekle("📞 Mikrofon izni", "sorulamıyor", true); }
      ekle("✔", "Bitti — bu kutunun fotoğrafını gönder 📸", true);
    })();
    return () => { iptal = true; };
  }, [acik]);

  if (!acik) return null;
  return (
    <div style={{ position: "fixed", left: 8, right: 8, top: 60, zIndex: 2147483600, background: "#fffbe9", border: "3px solid #c9a227", borderRadius: 14, padding: 12, boxShadow: "0 10px 30px rgba(90,60,10,.45)", fontFamily: "Georgia,serif", color: "#3a2a00", maxHeight: "80vh", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <b style={{ fontSize: 17 }}>🩺 GLOXORG Teşhis</b>
        <button onClick={() => { try { sessionStorage.removeItem("gwTani"); } catch (e) {} setAcik(false); setSatirlar([]); }} style={{ border: "2px solid #a9781f", background: "#ffd700", borderRadius: 8, fontWeight: 900, padding: "4px 10px" }}>✕</button>
      </div>
      {satirlar.length === 0 && <div>⏳ deneniyor…</div>}
      {izinDugmesi && (
        <button onClick={() => { try { window.AndroidGlox.tamEkranIzniAc(); } catch (e) {} }} style={{ width: "100%", margin: "6px 0", border: "2px solid #a9781f", background: "#ffd700", borderRadius: 10, fontWeight: 900, fontSize: 16, padding: "10px 8px", color: "#3a2a00" }}>📞 Kilit ekranında arama için İZİN VER</button>
      )}
      {satirlar.map((s) => (
        <div key={s.ad} style={{ padding: "6px 0", borderTop: "1px solid #ead9a0", fontSize: 15 }}>
          <b>{s.ad}:</b> <span style={{ color: s.iyi ? "#147a2e" : "#b3141d", fontWeight: 800 }}>{s.sonuc}</span>
        </div>
      ))}
    </div>
  );
}
