// GLOXORG — DİLLERİ AYIR (B451). src/dilKaynaklari.js'teki 13 dilin çevirisini okur, her dili AYRI dosyaya yazar:
//   public/diller/<dil>.<özet>.json  +  src/dilSurum.js (hangi dilin hangi dosyada olduğu).
// Telefon açılışta SADECE kendi dilini indirir. ÇEVİRİ DEĞİŞİNCE derlemeden önce çalıştır:  node scripts/dilleriAyir.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const babel = require("@babel/core");
const Module = require("module");

const KOK = path.join(__dirname, "..");
const SRC = path.join(KOK, "src");
// src içindeki ES modül dosyalarını (import/export) Node'un anlayacağı biçime çevirerek yükle
const eski = Module._extensions[".js"];
Module._extensions[".js"] = function (mod, dosya) {
  if (!dosya.startsWith(SRC)) return eski(mod, dosya);
  const kod = fs.readFileSync(dosya, "utf8");
  const { code } = babel.transformSync(kod, { filename: dosya, babelrc: false, configFile: false, plugins: ["@babel/plugin-transform-modules-commonjs"] });
  mod._compile(code, dosya);
};
const kaynak = require(path.join(SRC, "dilKaynaklari.js")).default;

const HEDEF = path.join(KOK, "public", "diller");
fs.mkdirSync(HEDEF, { recursive: true });
for (const f of fs.readdirSync(HEDEF)) if (f.endsWith(".json")) fs.unlinkSync(path.join(HEDEF, f)); // eskileri sil
const surum = {};
let toplam = 0;
for (const dil of Object.keys(kaynak).sort()) {
  const metin = JSON.stringify((kaynak[dil] && kaynak[dil].translation) || {});
  const ozet = crypto.createHash("md5").update(metin).digest("hex").slice(0, 8);
  fs.writeFileSync(path.join(HEDEF, `${dil}.${ozet}.json`), metin);
  surum[dil] = ozet; toplam += metin.length;
  console.log(`${dil}: ${(metin.length / 1024).toFixed(0)} KB`);
}
fs.writeFileSync(path.join(SRC, "dilSurum.js"),
  "// OTOMATİK ÜRETİLDİ (scripts/dilleriAyir.js) — ELLE DEĞİŞTİRME. Her dilin çeviri dosyasının özeti.\n" +
  "export const DIL_SURUM = " + JSON.stringify(surum, null, 1) + ";\n");
console.log(`TOPLAM ${(toplam / 1024).toFixed(0)} KB → ${Object.keys(surum).length} dosya`);
