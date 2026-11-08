package com.gloxorg.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Person
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build

/**
 * 📞 KAPALIYKEN ARAMA ZİLİ (WhatsApp gibi).
 * Sunucu (functions/index.js aramaZili) arama başlayınca "arama-gelen" haberi yollar → uygulama ekranda DEĞİLSE
 * telefon ZİL SESİYLE çalar (durmadan, en çok 45 sn), "Cevapla / Reddet" düğmeli arama bildirimi çıkar; telefon kilitliyse
 * tam ekran açılır. Arama açılınca/reddedilince/arayan vazgeçince "arama-bitti" gelir → zil susar.
 *  - CEVAPLA → uygulama açılır, sayfa aramayı KENDİLİĞİNDEN açar (window.gloxAramaCevapla).
 *  - REDDET  → uygulama arka planda kısaca açılır, sayfa aramayı "red" yapar (arayan "reddetti" görür), uygulama arkaya çekilir.
 *  - Bildirime dokunma / kilit ekranında tam ekran → uygulama açılır, sayfanın kendi arama ekranı (Cevapla/Reddet) görünür.
 */
object AramaZili {
    const val KANAL = "glox_arama_zili"
    const val BILDIRIM_ID = 4242
    const val EK_CEVAPLA = "glox_cevapla"
    const val EK_ARAMA = "glox_arama"
    const val EK_REDDET = "glox_reddet"
    @Volatile private var aktifId: String? = null

    private fun kanalKur(nm: NotificationManager) {
        if (Build.VERSION.SDK_INT < 26 || nm.getNotificationChannel(KANAL) != null) return
        val k = NotificationChannel(KANAL, "GLOXORG aramaları", NotificationManager.IMPORTANCE_HIGH)
        k.description = "Biri seni Glome'den aradığında telefon çalar"
        k.enableVibration(true)
        k.vibrationPattern = longArrayOf(0, 800, 600, 800, 600)
        k.lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        k.setSound(
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
        )
        nm.createNotificationChannel(k)
    }

    private fun acIntent(c: Context, aramaId: String, cevapla: Boolean, istek: Int, reddet: Boolean = false): PendingIntent {
        val i = Intent(c, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra(EK_ARAMA, aramaId)
        if (cevapla) i.putExtra(EK_CEVAPLA, aramaId)
        if (reddet) i.putExtra(EK_REDDET, aramaId)
        return PendingIntent.getActivity(c, istek, i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun goster(c: Context, v: Map<String, String>) {
        try {
            val aramaId = v["aramaId"] ?: return
            // Eski bir arama geç ulaştıysa (telefon internetsiz kalmış) ÇALMA
            val zaman = v["zamanMs"]?.toLongOrNull() ?: 0L
            if (zaman > 0 && Math.abs(System.currentTimeMillis() - zaman) > 60000) return
            val nm = c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            kanalKur(nm)
            val ad = v["arayanAd"] ?: v["baslik"] ?: "GLOXORG"
            val govde = v["govde"] ?: "📞 Arıyor…"
            val foto = GloxMesajServisi.fotoIndir(v["foto"])

            val ac = acIntent(c, aramaId, false, 7101)
            val cevapla = acIntent(c, aramaId, true, 7102)
            // REDDET (8 Kas — kullanıcı: "reddettiğim zaman karşı taraf hâlâ arıyor"): eskiden sadece zili susturuyordu.
            // Artık uygulamayı açar → sayfa aramayı veritabanında "red" yapar → arayan "reddetti" görür.
            val reddet = acIntent(c, aramaId, false, 7103, reddet = true)

            val b = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(c, KANAL) else {
                @Suppress("DEPRECATION")
                Notification.Builder(c).setPriority(Notification.PRIORITY_MAX)
                    .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE))
                    .setVibrate(longArrayOf(0, 800, 600, 800, 600))
            }
            b.setSmallIcon(R.drawable.ic_bildirim)
                .setContentTitle(ad)
                .setContentText(govde)
                .setColor(0xFFB8860B.toInt())
                .setCategory(Notification.CATEGORY_CALL)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(true)
                .setContentIntent(ac)
                .setFullScreenIntent(ac, true) // kilitli/ekran kapalıyken tam ekran açılır
            if (Build.VERSION.SDK_INT >= 26) b.setTimeoutAfter(45000) // en çok 45 sn çalar
            foto?.let { b.setLargeIcon(it) }

            var cagriStili = false
            if (Build.VERSION.SDK_INT >= 31) {
                try {
                    val kisi = Person.Builder().setName(ad).setImportant(true)
                    foto?.let { kisi.setIcon(Icon.createWithBitmap(it)) }
                    b.setStyle(Notification.CallStyle.forIncomingCall(kisi.build(), reddet, cevapla))
                    cagriStili = true
                } catch (e: Exception) {}
            }
            if (!cagriStili) {
                b.addAction(Notification.Action.Builder(null as Icon?, "Reddet", reddet).build())
                b.addAction(Notification.Action.Builder(null as Icon?, "Cevapla", cevapla).build())
            }
            val n = b.build()
            n.flags = n.flags or Notification.FLAG_INSISTENT // zil SÜREKLİ çalsın (tek "dıt" değil)
            aktifId = aramaId
            nm.notify(BILDIRIM_ID, n)
        } catch (e: Exception) {}
    }

    /** Zili sustur. aramaId verilirse sadece O arama çalıyorsa susturur (başka yeni arama çalıyorsa dokunmaz). */
    fun kapat(c: Context, aramaId: String?) {
        try {
            if (aramaId != null && aktifId != null && aktifId != aramaId) return
            (c.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(BILDIRIM_ID)
            aktifId = null
        } catch (e: Exception) {}
    }
}
