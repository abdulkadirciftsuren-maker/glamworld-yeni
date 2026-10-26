import React from "react";

// AÇILIŞ EKRANI — index.html'deki ilk ekranın (#gw-arka) ve native uygulamanın açılış örtüsünün BİREBİR AYNISI
// (altın zemin + GLOXORG logosu + GLOXORG yazısı + dönen halka). Hem App.js "Yükleniyor" hem Anasayfa'nın
// "ilk açılış perdesi" bunu kullanır → açılıştan sayfaya kadar TEK ekran gibi görünür (kullanıcı: "bir sürü farklı
// ekran, parça parça açılıyor, Facebook'ta tek seferde açılıyor"). KURAL: zemin ALTIN, parlama YOK.
export default function AcilisEkrani({ soluyor = false }) {
  return (
    <div className="ana-ilk-perde" aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 99990, display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse at 50% 22%, #fbf0c9 0%, #f2df9f 42%, #e8c86a 72%, #d9b84a 100%)", opacity: soluyor ? 0 : 1, transition: "opacity .25s ease", pointerEvents: soluyor ? "none" : "auto" }}>
      <style>{"@keyframes gwDon{to{transform:rotate(360deg)}}"}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <img src={(process.env.PUBLIC_URL || "") + "/logo192-b213.png"} alt="" style={{ width: "94px", height: "94px", borderRadius: "20px", boxShadow: "0 10px 30px rgba(120,90,0,.28)" }} />
        <div className="notranslate" translate="no" style={{ fontFamily: "Georgia,'Times New Roman',serif", fontWeight: 800, fontSize: "26px", letterSpacing: ".16em", color: "#6a4e00" }}>GLOXORG</div>
        <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "4px solid rgba(120,90,0,.2)", borderTopColor: "#8a6a00", animation: "gwDon .85s linear infinite" }} />
      </div>
    </div>
  );
}
