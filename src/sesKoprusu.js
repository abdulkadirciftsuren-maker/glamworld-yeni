// GLOXOO SESİ — TELEFON UYGULAMASI UYARLAYICISI
// Android uygulamasında (WebView) tarayıcının ses motoru (speechSynthesis) ÇALIŞMAZ → Gloxoo telefonda konuşamıyor,
//   konuşma balonu bitmeyi beklediği için ortada TAKILI kalıyordu (bilgisayarda/Chrome'da sorun yok).
// ÇÖZÜM: uygulama köprüsü (window.AndroidGlox.konus) varsa, window.speechSynthesis + SpeechSynthesisUtterance yerine
//   telefonun KENDİ ses motorunu kullanan aynı arayüz konur. Böylece Gloxoo/Akademi okuma kodu HİÇ değişmeden çalışır:
//   speak() → telefon okur; bitince uygulama window.__gloxTts('bitti', id) der → onend tetiklenir → sıradaki cümle.
// Köprü yoksa (tarayıcı, eski uygulama sürümü) hiçbir şey değişmez.
(function sesKoprusuKur() {
  try {
    const K = typeof window !== "undefined" ? window.AndroidGlox : null;
    if (!K || typeof K.konus !== "function") return;

    let sira = 0;
    const bekleyen = new Map(); // id → utterance (sırada ya da okunuyor)

    function Soz(metin) {
      this.text = metin || ""; this.lang = ""; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null;
      this.onstart = null; this.onend = null; this.onerror = null; this.onboundary = null; this.onpause = null; this.onresume = null; this.onmark = null;
      this._dinleyici = {};
    }
    Soz.prototype.addEventListener = function (tur, f) { (this._dinleyici[tur] = this._dinleyici[tur] || []).push(f); };
    Soz.prototype.removeEventListener = function (tur, f) { this._dinleyici[tur] = (this._dinleyici[tur] || []).filter((x) => x !== f); };

    const ates = (u, tur, ek) => {
      const olay = Object.assign({ type: tur, utterance: u, charIndex: 0, elapsedTime: 0, name: "" }, ek || {});
      try { if (typeof u["on" + tur] === "function") u["on" + tur](olay); } catch (e) {}
      (u._dinleyici[tur] || []).forEach((f) => { try { f(olay); } catch (e) {} });
    };

    const motor = {
      speaking: false, pending: false, paused: false, onvoiceschanged: null,
      getVoices() { return []; },
      addEventListener() {}, removeEventListener() {},
      speak(u) {
        if (!u) return;
        // İçinde harf/rakam yoksa ("." gibi) okunmaz — telefon motoru "nokta" diyordu; hemen bitti say.
        if (!/[\p{L}\p{N}]/u.test(String(u.text || ""))) { setTimeout(() => { ates(u, "start"); ates(u, "end"); }, 0); return; }
        const id = "g" + (++sira);
        bekleyen.set(id, u);
        motor.pending = true;
        let tamam = false;
        try { tamam = K.konus(String(u.text || ""), String(u.lang || "tr-TR"), Number(u.rate) || 1, Number(u.pitch) || 1, id); } catch (e) { tamam = false; }
        if (!tamam) { bekleyen.delete(id); motor.pending = bekleyen.size > 0; setTimeout(() => ates(u, "error", { error: "synthesis-unavailable" }), 0); }
      },
      cancel() {
        bekleyen.clear();
        motor.speaking = false; motor.pending = false;
        try { K.sustur(); } catch (e) {}
      },
      pause() {}, resume() {},
    };

    // Uygulamadan gelen haber: basladi | bitti | hata | durdu
    window.__gloxTts = (olay, id) => {
      const u = bekleyen.get(id);
      if (!u) return;
      if (olay === "basladi") { motor.speaking = true; ates(u, "start"); return; }
      bekleyen.delete(id);
      motor.pending = bekleyen.size > 0;
      motor.speaking = bekleyen.size > 0;
      if (olay === "hata") ates(u, "error", { error: "synthesis-failed" });
      else ates(u, "end");
    };

    try { Object.defineProperty(window, "speechSynthesis", { value: motor, configurable: true, writable: true }); } catch (e) { try { window.speechSynthesis = motor; } catch (x) {} }
    try { window.SpeechSynthesisUtterance = Soz; } catch (e) {}
  } catch (e) {}
})();
