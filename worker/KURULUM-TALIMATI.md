# Gloxoo'yu "her şeyi bilir" yapmak — Cloudflare Worker kurulumu

Bu dosya, Gloxoo'ya **canlı internet araması** kazandırır. Kurunca Gloxoo;
haberi, futbol skorunu, senin/müşterinin şehir-ilçe olaylarını, devlet
dairelerini, bankaları, meslekleri, "fabrika nasıl kurulur"u **güncel** bilir.

## Ne yapacaksın (5 dakika)

1. **cloudflare.com**'a gir → hesabına gir (worker'ın hangi hesaptaysa o).
2. Sol menü: **Workers & Pages** → mevcut **gloxorg-ai** worker'ına tıkla.
3. Sağ üstte **Edit code** (Kodu düzenle) düğmesine bas.
4. Açılan kod editöründeki **TÜM eski kodu SİL**.
5. Bu klasördeki **`gloxorg-ai.js`** dosyasının içindeki kodun **tamamını**
   kopyala, editöre **yapıştır**.
6. Sağ üstte **Deploy** (Yayınla) düğmesine bas. Bitti.

## Gizli anahtarlar (Secrets) — zaten varsa dokunma

Worker'ın çalışması için 2 anahtar gerekir. Mevcut worker'ın çalışıyorsa
bunlar **zaten ekli**dir, tekrar eklemene gerek yok. Yeni ekleyeceksen:

- Worker sayfası → **Settings** → **Variables and Secrets** → **Add**:
  - İsim: `ANTHROPIC_API_KEY`  → Değer: Anthropic (Claude) API anahtarın  **(zorunlu)**
  - İsim: `OPENAI_API_KEY`     → Değer: OpenAI API anahtarın (sesli konuşma için)
- Ekledikten sonra tekrar **Deploy**.

> Anahtar isimleri MUTLAKA yukarıdaki gibi olmalı: `ANTHROPIC_API_KEY` ve
> `OPENAI_API_KEY`. Mevcut worker'ında farklı isim kullanıyorsan, ya isimleri
> bunlara çevir ya da `gloxorg-ai.js` içindeki `env.ANTHROPIC_API_KEY` /
> `env.OPENAI_API_KEY` yazan yerleri kendi isimlerinle değiştir.

## Model

Kodun başında `const MODEL = "claude-3-5-sonnet-latest";` yazıyor. Bu, web
aramayı destekleyen bir Claude modelidir. Anthropic hesabında daha yeni bir
model varsa oradan değiştirebilirsin; ama bu haliyle de çalışır.

## Ücret uyarısı (önemli)

Canlı web araması Anthropic tarafında **ücretlidir** (her arama için küçük bir
tutar). Kod, bir cevapta en fazla **5 arama** yapacak şekilde sınırlı
(`MAX_ARAMA = 5`). Maliyeti düşürmek istersen bu sayıyı azaltabilirsin.

## Test

Kurduktan sonra siteyi aç, Gloxoo'ya sor:
- "Bugün dünyada / şehrimde ne oldu?"
- "Bu haftaki futbol sonuçları?"
- "Fabrika nasıl kurulur, malzeme nereden alınır?"

Artık gerçek ve güncel cevap vermeli. Sorun olursa Cloudflare worker
sayfasındaki **Logs** (Kayıtlar) bölümüne bakıp bana yaz.
