import { useState, useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import Acilis from "./Acilis";
import Giris from "./Giris";
import UyeOl from "./UyeOl";
import MusteriForm from "./MusteriForm";
import ProfesyonelForm from "./ProfesyonelForm";
import AltinCerceve from "./AltinCerceve";
import KayitTamam from "./KayitTamam";
import GirisYap from "./GirisYap";
import Anasayfa from "./Anasayfa";

// HashRouter: geri tuşu açık PENCEREYİ kapatır (siteyi değil) — güvenilir, özel kod yok.
// ÖNEMLİ: Adres çubuğunda ekran adı görünür ama bu YENİDEN YÜKLEME DEĞİL ve Google'a
// veri gitmez — sadece etiket. Sayfa TEK SEFER yüklenir (no-store kaldırıldı, reload yok).
// Geri tuşuna özel kod YOK (GeriKopru/trap/popstate YOK).

function App() {
  const [acilisBitti, setAcilisBitti] = useState(false);
  // Firebase oturumu: giriş yapan kullanıcı tarayıcıda kalıcı saklanır.
  // undefined = henüz bilinmiyor, null = giriş yok, obje = giriş var.
  const [kullanici, setKullanici] = useState(undefined);

  useEffect(() => onAuthStateChanged(auth, (u) => setKullanici(u)), []);

  if (!acilisBitti) {
    return (
      <>
        <Acilis baslik="GLAMWORLD" onBitti={() => setAcilisBitti(true)} />
        <AltinCerceve />
      </>
    );
  }

  return (
    <HashRouter>
      <AltinCerceve />
      <Routes>
        <Route path="/" element={kullanici ? <Navigate to="/anasayfa" replace /> : <Giris />} />
        <Route path="/uyeol" element={<UyeOl />} />
        <Route path="/musteri" element={<MusteriForm />} />
        <Route path="/profesyonel" element={<ProfesyonelForm />} />
        <Route path="/kayit-tamam" element={<KayitTamam />} />
        <Route path="/giris-yap" element={<GirisYap />} />
        <Route path="/anasayfa" element={<Anasayfa />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
