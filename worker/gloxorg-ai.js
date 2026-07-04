/*
 * GLOXORG AI — Cloudflare Worker (Gloxoo'nun beyni)
 * ---------------------------------------------------
 * Bu worker 3 şeyi yapar:
 *   1) SOHBET  : { sistem, mesajlar }  → Claude + CANLI WEB ARAMA → { metin }
 *   2) TEK ISTEK: { prompt, sistem }   → Claude + CANLI WEB ARAMA → { metin }
 *   3) SES→YAZI: { ses, dil }          → OpenAI Whisper           → { metin }
 *
 * WEB ARAMA sayesinde Gloxoo artık GÜNCEL her şeyi bilir: haber, futbol skoru,
 * senin/müşterinin bulunduğu şehir-ilçe olayları, devlet daireleri, bankalar,
 * meslekler, "fabrika nasıl kurulur / malzeme nereden alınır" gibi araştırmalar.
 *
 * CLOUDFLARE'DE AYARLANACAK GİZLİ DEĞİŞKENLER (Settings > Variables > Secrets):
 *   ANTHROPIC_API_KEY  → Anthropic (Claude) API anahtarın   [ZORUNLU]
 *   OPENAI_API_KEY     → OpenAI API anahtarın (ses→yazı için) [ses kullanıyorsan]
 *
 * NOT: Web arama, Anthropic tarafında ÜCRETLİ bir özelliktir (arama başına küçük
 * bir ücret). Sınırı MAX_ARAMA ile tutuyoruz (varsayılan 5 arama/cevap).
 */

const MODEL = "claude-sonnet-5";          // EN SON Claude modeli (hızlı + akıllı + web arama). Daha da güçlü istersen: "claude-opus-4-8"
const SES_MODEL = "gpt-4o-transcribe";    // EN SON OpenAI ses→yazı modeli (eski "whisper-1" yerine)
const MAX_ARAMA = 6;                       // bir cevapta en fazla kaç web araması

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
      // ---- 1) SES → YAZI (OpenAI Whisper) ----
      if (body.ses) {
        if (!env.OPENAI_API_KEY) return json({ metin: "", hata: "OPENAI_API_KEY yok" }, cors);
        const bin = Uint8Array.from(atob(body.ses), (c) => c.charCodeAt(0));
        const fd = new FormData();
        fd.append("file", new Blob([bin], { type: "audio/webm" }), "ses.webm");
        fd.append("model", SES_MODEL);
        if (body.dil) fd.append("language", String(body.dil).slice(0, 5));
        const wr = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: "Bearer " + env.OPENAI_API_KEY },
          body: fd,
        });
        const wj = await wr.json().catch(() => ({}));
        return json({ metin: (wj.text || "").trim() }, cors);
      }

      // ---- 2/3) SOHBET / TEK ISTEK (Claude + web arama) ----
      if (!env.ANTHROPIC_API_KEY) return json({ metin: "", hata: "ANTHROPIC_API_KEY yok" }, cors);

      const sistem = body.sistem || "Sen Gloxoo'sun, GLOXORG'un yardımcı yapay zekasısın. Kısa, sıcak ve doğru konuş.";
      let mesajlar = Array.isArray(body.mesajlar) ? body.mesajlar : null;
      if (!mesajlar) mesajlar = [{ role: "user", content: String(body.prompt || "Merhaba") }];

      const payload = {
        model: MODEL,
        max_tokens: 1600,
        system: sistem,
        messages: mesajlar,
        // CANLI WEB ARAMA aracı — Claude gerektiğinde kendisi internette arar (haber/futbol/güncel her şey)
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: MAX_ARAMA }],
      };

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

      // Cevap metnini topla (web arama sonucu araya girse bile sadece text blokları)
      let metin = "";
      if (aj && Array.isArray(aj.content)) {
        metin = aj.content.filter((b) => b && b.type === "text").map((b) => b.text || "").join("").trim();
      }
      // Model web aramayı desteklemiyorsa (tools hatası) → aramasız TEKRAR dene (yine de cevap gelsin)
      if (!metin && aj && aj.error) {
        const p2 = { model: MODEL, max_tokens: 1600, system: sistem, messages: mesajlar };
        const ar2 = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
          body: JSON.stringify(p2),
        });
        const aj2 = await ar2.json().catch(() => ({}));
        if (aj2 && Array.isArray(aj2.content)) metin = aj2.content.filter((b) => b && b.type === "text").map((b) => b.text || "").join("").trim();
        return json({ metin: metin || "", hata: metin ? undefined : (aj.error && aj.error.message) }, cors);
      }
      return json({ metin: metin || "" }, cors);
    } catch (e) {
      return json({ metin: "", hata: String(e) }, cors);
    }
  },
};

function json(obj, cors, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { "content-type": "application/json", ...cors } });
}
