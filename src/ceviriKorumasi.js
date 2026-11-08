// 🛡️ OTOMATİK ÇEVİRİ KORUMASI (B457): Chrome/Google Çeviri sayfadaki yazıları kendi kutularına sarınca React, kaldırmak
//   istediği öğeyi yerinde bulamayıp ÇÖKÜYORDU ("Kaldırılacak düğüm, bu düğümün alt öğesi değil"). Bilinen güvenli çözüm:
//   öğe gerçekten o kutunun içinde değilse işlem sessizce atlanır (sayfa çökmez, çeviri de çalışmaya devam eder).
try {
  if (typeof Node === "function" && Node.prototype) {
    const eskiCikar = Node.prototype.removeChild;
    Node.prototype.removeChild = function (cocuk) {
      if (cocuk && cocuk.parentNode !== this) return cocuk;
      return eskiCikar.apply(this, arguments);
    };
    const eskiEkle = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function (yeni, referans) {
      if (referans && referans.parentNode !== this) return eskiEkle.call(this, yeni, null);
      return eskiEkle.apply(this, arguments);
    };
  }
} catch (e) {}
