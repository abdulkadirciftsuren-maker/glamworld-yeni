/*
 * GLOXORG AI — Cloudflare Worker (Gloxoo'nun beyni)  —  DAYANIKLI SÜRÜM
 * ---------------------------------------------------------------------
 * Bu worker 4 şeyi yapar:
 *   1) SOHBET   : { sistem, mesajlar }  → Claude + CANLI WEB ARAMA → { metin }
 *   2) TEK ISTEK: { prompt, sistem }    → Claude + CANLI WEB ARAMA → { metin }
 *   3) SES→YAZI : { ses, dil }          → OpenAI (ses→yazı)         → { metin }
 *   4) YAZI→SES : { seslendir, dil }    → OpenAI (GERÇEK insan sesi)→ { ses }  (base64 mp3)
 *
 * ✅ EN ÖNEMLİ YENİLİK — "kendi kendini kurtarma":
 *    Yeni/güçlü model (claude-sonnet-5, gpt-4o-transcribe) senin anahtarında
 *    KAPALIYSA worker BOŞ dönmez; otomatik olarak ÇALIŞAN eski modele düşer
 *    (whisper-1 / claude-3-5-sonnet). Böylece Gloxoo HER ZAMAN cevap verir,
 *    bir daha "dinliyor ama susuyor" olmaz.
 *
 * CLOUDFLARE GİZLİ DEĞİŞKENLER (Settings > Variables and Secrets):
 *   ANTHROPIC_API_KEY  → Anthropic (Claude) API anahtarın   [ZORUNLU]
 *   OPENAI_API_KEY     → OpenAI API anahtarın (ses→yazı için) [ses kullanıyorsan]
 */

// Cevap (sohbet) modelleri — SIRAYLA denenir; ilki çalışmazsa alttakine düşer.
// En üstteki EN SON/EN GÜÇLÜ; alttakiler "her ihtimale karşı çalışan" yedekler.
const SOHBET_MODELLERI = [
  "claude-sonnet-5",            // EN SON (hızlı + akıllı + web arama)
  "claude-opus-4-8",           // daha güçlü yedek
  "claude-3-5-sonnet-latest",  // her hesapta neredeyse kesin çalışan güvenli yedek
];
// Ses→yazı modelleri — SIRAYLA denenir.
const SES_MODELLERI = [
  "gpt-4o-transcribe",  // EN SON
  "whisper-1",          // her hesapta çalışan güvenli yedek
];
// Yazı→ses (GERÇEK insan sesi) modelleri — SIRAYLA denenir; ilki olmazsa alttakine düşer.
const SES_URET_MODELLERI = [
  "gpt-4o-mini-tts",  // EN SON (sıcak, doğal, tonu ayarlanabilir)
  "tts-1",            // her hesapta çalışan güvenli yedek
];
// Varsayılan ses: sıcak, kadın, canlı. (OpenAI sesleri: shimmer/nova/coral/sage/alloy...)
const VARSAYILAN_SES = "shimmer";
const MAX_ARAMA = 6;    // bir cevapta en fazla kaç web araması

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return json({ metin: "", hata: "Sadece POST" }, cors, 405);

    let body = {};
    try { body = await request.json(); } catch (e) {}

    try {
      // ================= 1) SES → YAZI =================
      if (body.ses) {
        if (!env.OPENAI_API_KEY) return json({ metin: "", hata: "OPENAI_API_KEY yok" }, cors);
        const bin = Uint8Array.from(atob(body.ses), (c) => c.charCodeAt(0));
        const dil = body.dil ? String(body.dil).slice(0, 5) : "";
        let sonHata = "";
        for (const model of SES_MODELLERI) {
          try {
            const fd = new FormData();
            fd.append("file", new Blob([bin], { type: "audio/webm" }), "ses.webm");
            fd.append("model", model);
            if (dil) fd.append("language", dil);
            const wr = await fetch("https://api.openai.com/v1/audio/transcriptions", {
              method: "POST",
              headers: { Authorization: "Bearer " + env.OPENAI_API_KEY },
              body: fd,
            });
            const wj = await wr.json().catch(() => ({}));
            const metin = (wj.text || "").trim();
            if (metin) return json({ metin }, cors);
            // Model erişilemiyor/boş döndü → sonraki modele düş
            sonHata = (wj.error && (wj.error.message || wj.error.code)) || ("HTTP " + wr.status);
          } catch (e) { sonHata = String(e); }
        }
        // Hiçbir ses modeli metin veremedi (gerçekten sessizlik de olabilir) → boş metin + iz için hata
        return json({ metin: "", hata: sonHata || "ses cozulemedi" }, cors);
      }

      // ================= 4) YAZI → SES (GERÇEK insan sesi) =================
      // { seslendir: "okunacak metin", dil: "tr", ses?: "shimmer" } → { ses: base64mp3 }
      if (body.seslendir) {
        if (!env.OPENAI_API_KEY) return json({ ses: "", hata: "OPENAI_API_KEY yok" }, cors);
        const metin = String(body.seslendir).slice(0, 3000); // güvenlik için üst sınır
        if (!metin.trim()) return json({ ses: "" }, cors);
        const secilenSes = (body.ses && String(body.ses).slice(0, 20)) || VARSAYILAN_SES;
        let sonHata = "";
        for (const model of SES_URET_MODELLERI) {
          try {
            const govde = { model, voice: secilenSes, input: metin, response_format: "mp3" };
            // Yeni model tonu ayarlayabilir → sıcak, samimi, canlı okusun (eski tts-1'de bu alan yok sayılır)
            if (model === "gpt-4o-mini-tts") govde.instructions = "Sıcak, samimi, canlı ve doğal bir tonla; bir arkadaş gibi konuş.";
            const tr = await fetch("https://api.openai.com/v1/audio/speech", {
              method: "POST",
              headers: { Authorization: "Bearer " + env.OPENAI_API_KEY, "Content-Type": "application/json" },
              body: JSON.stringify(govde),
            });
            if (tr.ok) {
              const buf = await tr.arrayBuffer();
              const b64 = bufToB64(buf);
              if (b64) return json({ ses: b64 }, cors);
              sonHata = "bos ses";
            } else {
              const ej = await tr.json().catch(() => ({}));
              sonHata = (ej.error && (ej.error.message || ej.error.code)) || ("HTTP " + tr.status);
            }
          } catch (e) { sonHata = String(e); }
        }
        return json({ ses: "", hata: sonHata || "ses uretilemedi" }, cors);
      }

      // ================= 2/3) SOHBET / TEK ISTEK (Claude) =================
      if (!env.ANTHROPIC_API_KEY) return json({ metin: "", hata: "ANTHROPIC_API_KEY yok" }, cors);

      const sistem = body.sistem || "Sen Gloxoo'sun, GLOXORG'un yardımcı yapay zekasısın. Kısa, sıcak ve doğru konuş.";
      let mesajlar = Array.isArray(body.mesajlar) ? body.mesajlar : null;
      if (!mesajlar) mesajlar = [{ role: "user", content: String(body.prompt || "Merhaba") }];

      let sonHata = "";
      // Her modeli SIRAYLA dene. Her model için ÖNCE web aramalı, olmazsa aramasız dene.
      for (const model of SOHBET_MODELLERI) {
        // a) web aramalı dene
        const r1 = await claudeCagir(env, model, sistem, mesajlar, true);
        if (r1.metin) return json({ metin: r1.metin }, cors);
        if (r1.hata) sonHata = r1.hata;
        // b) aynı modelle aramasız dene (web arama kapalı/desteklenmiyor olabilir)
        const r2 = await claudeCagir(env, model, sistem, mesajlar, false);
        if (r2.metin) return json({ metin: r2.metin }, cors);
        if (r2.hata) sonHata = r2.hata;
        // → sonraki modele düş
      }
      // Hiçbir model cevap veremedi → hatayı geri ver (kullanıcı "susmuş" sanmasın, sebebi görünsün)
      return json({ metin: "", hata: sonHata || "cevap alinamadi" }, cors);
    } catch (e) {
      return json({ metin: "", hata: String(e) }, cors);
    }
  },
};

// Tek bir Claude çağrısı — webArama true ise web_search aracını ekler.
// Dönüş: { metin, hata }
async function claudeCagir(env, model, sistem, mesajlar, webArama) {
  try {
    const payload = { model, max_tokens: 1600, system: sistem, messages: mesajlar };
    if (webArama) payload.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: MAX_ARAMA }];
    const ar = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });
    const aj = await ar.json().catch(() => ({}));
    let metin = "";
    if (aj && Array.isArray(aj.content)) {
      metin = aj.content.filter((b) => b && b.type === "text").map((b) => b.text || "").join("").trim();
    }
    const hata = (aj && aj.error && (aj.error.message || aj.error.type)) || (metin ? "" : "HTTP " + ar.status);
    return { metin, hata };
  } catch (e) {
    return { metin: "", hata: String(e) };
  }
}

function json(obj, cors, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { "content-type": "application/json", ...cors } });
}

// İkili (mp3) veriyi base64 metne çevir — parça parça (büyük seste yığın taşmasın)
function bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const yigin = 0x8000;
  for (let i = 0; i < bytes.length; i += yigin) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + yigin));
  }
  return btoa(bin);
}
