// GLOXORG — Giriş bildirim e-postası (EmailJS ile, gerçek gönderim)
import emailjs from "@emailjs/browser";

// EmailJS anahtarları (kullanıcının hesabı)
const SERVICE_ID = "service_0eu4g6l";
const TEMPLATE_ID = "template_d53ghsn";
const PUBLIC_KEY = "9zdAzQA4UzGjH0C8e";

// EmailJS başlat (publicKey'i sabitle) — gönderim güvenilir olsun.
try { emailjs.init({ publicKey: PUBLIC_KEY }); } catch (e) {}

// Giriş yapılınca kullanıcının e-postasına bildirim gönder.
// Şablon değişkenleri: {{email}}/{{to_email}} (alıcı), {{name}}, {{isim}}, {{zaman}}, {{mesaj}}
export function girisEpostasiGonder(eposta, isim) {
  if (!eposta) return Promise.resolve();
  const params = {
    email: eposta,
    to_email: eposta,
    name: isim || eposta,
    isim: isim || eposta,
    mesaj: "GLOXORG hesabınıza giriş yapıldı. Bu siz değilseniz lütfen dikkate alın.",
    zaman: new Date().toLocaleString("tr-TR"),
  };
  try {
    return emailjs.send(SERVICE_ID, TEMPLATE_ID, params).catch(() => {});
  } catch (e) { return Promise.resolve(); }
}
