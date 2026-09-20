/*
 * GLOXORG AI — Cloudflare Worker (Gloxoo'nun beyni)  —  DAYANIKLI SÜRÜM
 * ---------------------------------------------------------------------
 * Bu worker 6 şeyi yapar:
 *   1) SOHBET   : { sistem, mesajlar }  → Claude + CANLI WEB ARAMA → { metin }
 *   2) TEK ISTEK: { prompt, sistem }    → Claude + CANLI WEB ARAMA → { metin }
 *   3) SES→YAZI : { ses, dil }          → OpenAI (ses→yazı)         → { metin }
 *   4) YAZI→SES : { seslendir, dil }    → OpenAI (GERÇEK insan sesi)→ { ses }  (base64 mp3)
 *   5) YAZI→GÖRSEL : { gorsel }         → OpenAI (örnek fotoğraf)    → { gorsel } (base64 png)
 *   6) LIVEKIT BILET : { livekitOda, kimlik, ad } → imzalı JWT bilet → { token, url } (kendi görüşme sunucumuz)
 *
 * ✅ EN ÖNEMLİ YENİLİK — "kendi kendini kurtarma":
 *    Yeni/güçlü model senin anahtarında KAPALIYSA worker BOŞ dönmez; otomatik
 *    olarak ÇALIŞAN eski modele düşer. Böylece Gloxoo HER ZAMAN cevap verir.
 *
 * CLOUDFLARE GİZLİ DEĞİŞKENLER (Settings > Variables and Secrets):
 *   ANTHROPIC_API_KEY  → Anthropic (Claude) API anahtarın   [ZORUNLU]
 *   OPENAI_API_KEY     → OpenAI API anahtarın (ses + görsel için)
 *   LIVEKIT_API_KEY / LIVEKIT_API_SECRET / LIVEKIT_URL → kendi canlı görüşme sunucumuz (LiveKit) bileti için
 */

// Cevap (sohbet) modelleri — SIRAYLA denenir; ilki çalışmazsa alttakine düşer.
const SOHBET_MODELLERI = [
  "claude-haiku-4-5-20251001",
  "claude-opus-4-8",
  "claude-3-5-sonnet-latest",
];
// Ses→yazı modelleri — SIRAYLA denenir.
const SES_MODELLERI = [
  "gpt-4o-transcribe",
  "whisper-1",
];
// Yazı→ses (GERÇEK insan sesi) modelleri — SIRAYLA denenir.
const SES_URET_MODELLERI = [
  "gpt-4o-mini-tts",
  "tts-1",
];
// Varsayılan ses: sıcak, kadın, canlı.
const VARSAYILAN_SES = "shimmer";
// Görsel (örnek/model fotoğrafı) üretme modelleri — SIRAYLA denenir.
const GORSEL_MODELLERI = [
  "gpt-image-1",
  "dall-e-3",
];
const MAX_ARAMA = 6;

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

    // ================= 6) LIVEKIT KİMLİK BİLETİ (token) =================
    // Site { livekitOda, kimlik, ad } gönderir; biz imzalı bileti + sunucu adresini döneriz.
    // Gizli anahtar (LIVEKIT_API_SECRET) Cloudflare kasasındadır; siteye/telefona ASLA gitmez.
    if (body.livekitOda) {
      const anahtar = env.LIVEKIT_API_KEY;
      const gizli = env.LIVEKIT_API_SECRET;
      const adres = env.LIVEKIT_URL || "wss://canli.gloxorg.com";
      if (!anahtar || !gizli) return json({ hata: "LiveKit ayarlari eksik (Cloudflare secret ekli mi?)" }, cors, 500);
      const oda = String(body.livekitOda).slice(0, 120).trim();
      if (!oda) return json({ hata: "Oda adi bos" }, cors, 400);
      const kimlik = (body.kimlik ? String(body.kimlik).slice(0, 120).trim() : "") || ("kul-" + Math.random().toString(36).slice(2, 10));
      const ad = body.ad ? String(body.ad).slice(0, 80) : "";
      try {
        const token = await livekitBilet(anahtar, gizli, oda, kimlik, ad);
        return json({ token, url: adres, kimlik }, cors);
      } catch (e) { return json({ hata: "Token uretilemedi" }, cors, 500); }
    }

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
            sonHata = (wj.error && (wj.error.message || wj.error.code)) || ("HTTP " + wr.status);
          } catch (e) { sonHata = String(e); }
        }
        return json({ metin: "", hata: sonHata || "ses cozulemedi" }, cors);
      }

      // ================= 4) YAZI → SES (GERÇEK insan sesi) =================
      if (body.seslendir) {
        if (!env.OPENAI_API_KEY) return json({ ses: "", hata: "OPENAI_API_KEY yok" }, cors);
        const metin = String(body.seslendir).slice(0, 3000);
        if (!metin.trim()) return json({ ses: "" }, cors);
        const secilenSes = (body.ses && String(body.ses).slice(0, 20)) || VARSAYILAN_SES;
        let sonHata = "";
        for (const model of SES_URET_MODELLERI) {
          try {
            const govde = { model, voice: secilenSes, input: metin, response_format: "mp3" };
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

      // ================= 5) YAZI → GÖRSEL (örnek/model fotoğrafı üret) =================
      if (body.gorsel) {
        if (!env.OPENAI_API_KEY) return json({ gorsel: "", hata: "OPENAI_API_KEY yok" }, cors);
        const istem = String(body.gorsel).slice(0, 1500);
        if (!istem.trim()) return json({ gorsel: "" }, cors);
        const boyut = (body.boyut && String(body.boyut).slice(0, 12)) || "1024x1024";
        let sonHata = "";
        for (const model of GORSEL_MODELLERI) {
          try {
            const govde = { model, prompt: istem, n: 1, size: boyut };
            if (model !== "gpt-image-1") govde.response_format = "b64_json";
            const ir = await fetch("https://api.openai.com/v1/images/generations", {
              method: "POST",
              headers: { Authorization: "Bearer " + env.OPENAI_API_KEY, "Content-Type": "application/json" },
              body: JSON.stringify(govde),
            });
            const ij = await ir.json().catch(() => ({}));
            const b64 = ij && ij.data && ij.data[0] && ij.data[0].b64_json;
            if (b64) return json({ gorsel: b64 }, cors);
            sonHata = (ij.error && (ij.error.message || ij.error.code)) || ("HTTP " + ir.status);
          } catch (e) { sonHata = String(e); }
        }
        return json({ gorsel: "", hata: sonHata || "gorsel uretilemedi" }, cors);
      }

      // ================= 2/3) SOHBET / TEK ISTEK (Claude) =================
      if (!env.ANTHROPIC_API_KEY) return json({ metin: "", hata: "ANTHROPIC_API_KEY yok" }, cors);

      const sistem = body.sistem || "Sen Gloxoo'sun, GLOXORG'un yardımcı yapay zekasısın. Kısa, sıcak ve doğru konuş.";
      let mesajlar = Array.isArray(body.mesajlar) ? body.mesajlar : null;
      if (!mesajlar) mesajlar = [{ role: "user", content: String(body.prompt || "Merhaba") }];

      let sonHata = "";
      for (const model of SOHBET_MODELLERI) {
        const r1 = await claudeCagir(env, model, sistem, mesajlar, true);
        if (r1.metin) return json({ metin: r1.metin }, cors);
        if (r1.hata) sonHata = r1.hata;
        const r2 = await claudeCagir(env, model, sistem, mesajlar, false);
        if (r2.metin) return json({ metin: r2.metin }, cors);
        if (r2.hata) sonHata = r2.hata;
      }
      return json({ metin: "", hata: sonHata || "cevap alinamadi" }, cors);
    } catch (e) {
      return json({ metin: "", hata: String(e) }, cors);
    }
  },
};

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

function bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const yigin = 0x8000;
  for (let i = 0; i < bytes.length; i += yigin) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + yigin));
  }
  return btoa(bin);
}

// ---- LiveKit KİMLİK BİLETİ (JWT token) ----
// LiveKit odaya girerken imzalı bir "bilet" ister. Bileti burada (sunucu tarafında) üretiriz;
// gizli anahtar (secret) ASLA siteye/telefona gitmez. Bilet HS256 ile secret kullanılarak imzalanır.
function base64url(girdi) {
  let ham;
  if (typeof girdi === "string") { ham = btoa(unescape(encodeURIComponent(girdi))); }
  else { let s = ""; for (let i = 0; i < girdi.length; i++) s += String.fromCharCode(girdi[i]); ham = btoa(s); }
  return ham.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function livekitBilet(anahtar, gizli, oda, kimlik, ad) {
  const simdi = Math.floor(Date.now() / 1000);
  const baslik = { alg: "HS256", typ: "JWT" };
  const govde = {
    iss: anahtar,
    sub: kimlik,
    nbf: simdi - 10,
    exp: simdi + 6 * 60 * 60,
    name: ad || kimlik,
    video: {
      room: oda,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  };
  const veri = base64url(JSON.stringify(baslik)) + "." + base64url(JSON.stringify(govde));
  const kripto = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(gizli),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const imza = await crypto.subtle.sign("HMAC", kripto, new TextEncoder().encode(veri));
  return veri + "." + base64url(new Uint8Array(imza));
}
