// GROXORG — Claude yapay zeka KÖPRÜSÜ (Cloudflare Worker)
// Anahtar (ANTHROPIC_API_KEY) BURADA gizli durur; siteye/GitHub'a ASLA yazılmaz.
// Site bu köprüye sorar, köprü Claude'a sorup yanıtı döner.
// Maliyet kontrolü: ucuz/hızlı model (Haiku) + kısa istek sınırı; gerçek tavan = Anthropic'teki kredi.

const IZIN_ORIGIN = [
  "https://abdulkadirciftsuren-maker.github.io",
];
const MODEL = "claude-sonnet-4-6"; // talimatlari GUVENILIR tutar ([PAYLASIM]/oneri ayrimi); maliyet kucuk, $20 tavan korur. (ucuz icin claude-haiku-4-5, en akilli icin claude-opus-4-8)

function corsBasliklar(origin) {
  const izinli = IZIN_ORIGIN.includes(origin) ? origin : IZIN_ORIGIN[0];
  return {
    "Access-Control-Allow-Origin": izinli,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function cevap(obj, durum, origin) {
  return new Response(JSON.stringify(obj), {
    status: durum,
    headers: { "Content-Type": "application/json", ...corsBasliklar(origin) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { headers: corsBasliklar(origin) });
    if (request.method !== "POST") return cevap({ hata: "Sadece POST" }, 405, origin);
    // SADECE kendi sitemizden gelen isteklere izin (başkası anahtarı harcamasın)
    if (origin && !IZIN_ORIGIN.includes(origin)) return cevap({ hata: "Izin yok" }, 403, origin);

    let govde;
    try { govde = await request.json(); } catch (e) { return cevap({ hata: "Gecersiz istek" }, 400, origin); }

    // SES → METİN (Cloudflare Workers AI / Whisper). Ön yüz {ses: base64} gönderir, biz metni döneriz.
    if (govde.ses) {
      try {
        const sonuc = await env.AI.run("@cf/openai/whisper-large-v3-turbo", { audio: govde.ses.toString() });
        return cevap({ metin: (sonuc && (sonuc.text || sonuc.transcription) || "").toString().trim() }, 200, origin);
      } catch (e) { return cevap({ hata: "Ses cozulemedi" }, 502, origin); }
    }

    const sistem = (govde.sistem || "Sen GROXORG icin yardimci bir asistansin. Kisa, net ve nazik yanit ver.").toString().slice(0, 9000);
    // İki kullanım: (1) tek istek {prompt}, (2) çok turlu sohbet {mesajlar:[{role,content}]}
    let mesajlar;
    if (Array.isArray(govde.mesajlar) && govde.mesajlar.length) {
      mesajlar = govde.mesajlar.slice(-20)
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
        .map((m) => {
          // VISION: content bir DİZİ ise resim+yazı blokları (base64 görsel) — güvenli geçir
          if (Array.isArray(m.content)) {
            const bloklar = m.content.slice(0, 6).map((b) => {
              if (b && b.type === "text") return { type: "text", text: (b.text || "").toString().slice(0, 8000) };
              if (b && b.type === "image" && b.source && b.source.type === "base64" && b.source.data)
                return { type: "image", source: { type: "base64", media_type: b.source.media_type || "image/jpeg", data: b.source.data.toString().slice(0, 7000000) } };
              // PDF/belge — Claude document blogu olarak gecir (sonnet PDF okur)
              if (b && b.type === "document" && b.source && b.source.type === "base64" && b.source.data)
                return { type: "document", source: { type: "base64", media_type: b.source.media_type || "application/pdf", data: b.source.data.toString().slice(0, 12000000) } };
              return null;
            }).filter(Boolean);
            return { role: m.role, content: bloklar.length ? bloklar : "(boş)" };
          }
          return { role: m.role, content: m.content.toString().slice(0, 4000) };
        });
    } else {
      const prompt = (govde.prompt || "").toString().slice(0, 4000);
      if (!prompt.trim()) return cevap({ hata: "Bos istek" }, 400, origin);
      mesajlar = [{ role: "user", content: prompt }];
    }
    if (!mesajlar.length) return cevap({ hata: "Bos istek" }, 400, origin);

    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1500,
          system: sistem,
          messages: mesajlar,
        }),
      });
      const veri = await r.json();
      if (!r.ok) return cevap({ hata: (veri && veri.error && veri.error.message) || "Yapay zeka hatasi" }, 502, origin);
      const metin = (veri.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      return cevap({ metin }, 200, origin);
    } catch (e) {
      return cevap({ hata: "Baglanti hatasi" }, 502, origin);
    }
  },
};
