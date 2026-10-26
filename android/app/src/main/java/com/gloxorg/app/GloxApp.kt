package com.gloxorg.app

import android.app.Application
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions

/**
 * Uygulama başlarken Firebase'i (bildirimler için) başlatır. google-services.json dosyası KULLANILMIYOR;
 * bilgiler burada elle verilir. Hangi paket olarak derlendiyse (test: com.gloxorg.app, Play: com.gloxorg.twa)
 * Firebase'deki o Android kaydının kimliği kullanılır (ikisi de Google'a sorularak doğrulandı).
 */
class GloxApp : Application() {
    override fun onCreate() {
        super.onCreate()
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                val uygulamaKimligi = if (packageName == "com.gloxorg.twa")
                    "1:656498925104:android:dacfb0d101089af27b57f5"   // GLOXORG Play
                else
                    "1:656498925104:android:a7b19b3bf21c1c067b57f5"   // GLOXORG (test)
                val ayar = FirebaseOptions.Builder()
                    .setApplicationId(uygulamaKimligi)
                    .setApiKey("AIzaSyBMMMMcHl5IGsUc7k6n5vLvSn_vNruKspw")
                    .setProjectId("glamworld2")
                    .setGcmSenderId("656498925104")
                    .setStorageBucket("glamworld2.firebasestorage.app")
                    .build()
                FirebaseApp.initializeApp(this, ayar)
            }
        } catch (e: Exception) {}
    }
}
