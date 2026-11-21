// Site yayınından (gh-pages) ÖNCE çalıştır: sitedeki telefon uygulaması dosyalarını (APK/AAB) build/ içine kopyalar.
// Sebep (21 Kas): "npx gh-pages -d build" siteyi build/ ile DEĞİŞTİRİR → APK siliniyordu (gloxorg.com/GLOXORG-kurulum.apk gidiyordu).
const { execSync } = require("child_process");
const fs = require("fs");
execSync("git fetch -q origin gh-pages", { stdio: "inherit" });
for (const ad of ["GLOXORG-kurulum.apk", "GLOXORG.aab", "GLOXORG-play.aab"]) {
  try {
    const veri = execSync("git show origin/gh-pages:" + ad, { maxBuffer: 200 * 1024 * 1024 });
    fs.writeFileSync("build/" + ad, veri);
    console.log("korundu:", ad, Math.round(veri.length / 1024) + " KB");
  } catch (e) { console.log("yok (atlandı):", ad); }
}
