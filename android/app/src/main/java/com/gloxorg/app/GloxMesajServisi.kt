package com.gloxorg.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import java.net.HttpURLConnection
import java.net.URL

/**
 * BİLDİRİMLER (uygulama KAPALI ya da ARKA PLANDAYKEN) — mesaj, beğeni, yorum, takip, tepki, cevapsız arama.
 * Sunucu (functions/index.js pushGonder) "sadece veri" (data-only, yüksek öncelik) gönderir; bildirimi burada biz çizeriz.
 * Uygulama ÖNDEYKEN göstermeyiz (sayfa kendi içinde gösteriyor, çift olmasın).
 * Eski Play uygulamasında (TWA) bildirimi Chrome getiriyordu; native uygulamada bu servis getirir.
 */
class GloxMesajServisi : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        // Telefonun bildirim anahtarı değişti → sakla; uygulama açıksa siteye hemen ver (Firestore'a kaydetsin)
        tokenSakla(this, token)
        MainActivity.tokenDegisti(token)
    }

    override fun onMessageReceived(mesaj: RemoteMessage) {
        val v = mesaj.data
        if (MainActivity.onPlanda) return // uygulama açık → sayfa zaten gösteriyor
        val baslik = v["baslik"] ?: mesaj.notification?.title ?: "GLOXORG"
        val govde = v["govde"] ?: mesaj.notification?.body ?: ""
        bildirimGoster(baslik, govde, v["foto"])
    }

    private fun bildirimGoster(baslik: String, govde: String, foto: String?) {
        try {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(KANAL) == null) {
                val k = NotificationChannel(KANAL, "GLOXORG bildirimleri", NotificationManager.IMPORTANCE_HIGH)
                k.description = "Mesaj, beğeni, yorum ve arama bildirimleri"
                k.enableVibration(true)
                nm.createNotificationChannel(k)
            }
            val ac = Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            val pi = PendingIntent.getActivity(this, 0, ac, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            val b = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, KANAL) else {
                @Suppress("DEPRECATION") Notification.Builder(this).setPriority(Notification.PRIORITY_HIGH).setDefaults(Notification.DEFAULT_ALL)
            }
            b.setSmallIcon(R.drawable.ic_bildirim)
                .setContentTitle(baslik)
                .setContentText(govde)
                .setStyle(Notification.BigTextStyle().bigText(govde))
                .setColor(0xFFB8860B.toInt())
                .setAutoCancel(true)
                .setContentIntent(pi)
            // Gönderenin fotoğrafı (WhatsApp gibi) — sadece http adresi; gelmezse fotoğrafsız gösterilir
            fotoIndir(foto)?.let { b.setLargeIcon(it) }
            nm.notify((System.currentTimeMillis() % Int.MAX_VALUE).toInt(), b.build())
        } catch (e: Exception) {}
    }

    private fun fotoIndir(adres: String?): Bitmap? {
        if (adres == null || !adres.startsWith("http")) return null
        return try {
            val c = URL(adres).openConnection() as HttpURLConnection
            c.connectTimeout = 4000; c.readTimeout = 4000
            c.inputStream.use { BitmapFactory.decodeStream(it) }?.let { Bitmap.createScaledBitmap(it, 128, 128, true) }
        } catch (e: Exception) { null }
    }

    companion object {
        const val KANAL = "glox_bildirim"
        fun tokenSakla(c: Context, token: String) {
            try { c.getSharedPreferences("glox", Context.MODE_PRIVATE).edit().putString("fcmToken", token).apply() } catch (e: Exception) {}
        }
        fun tokenOku(c: Context): String =
            try { c.getSharedPreferences("glox", Context.MODE_PRIVATE).getString("fcmToken", "") ?: "" } catch (e: Exception) { "" }
    }
}
