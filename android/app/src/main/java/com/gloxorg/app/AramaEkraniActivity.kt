package com.gloxorg.app

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Outline
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewOutlineProvider
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import java.lang.ref.WeakReference

/**
 * 📞 ANINDA AÇILAN ARAMA EKRANI (10 Kas 2026 — kullanıcı: "pencere açıldı ama önce sayfayı açıyor, sonra arama ikonu çıkıyor").
 * Eskiden kilit ekranında bildirim, uygulamanın KENDİSİNİ açıyordu → sayfa yüklenene kadar (birkaç sn) cevaplanamıyordu.
 * Artık arama gelince bu hafif ekran ANINDA açılır (WhatsApp gibi): altın zemin, arayanın KARE fotoğrafı ve adı (sığmazsa
 * KAYAR), büyük KARE "Reddet" / "Cevapla" düğmeleri.
 *  - CEVAPLA → uygulama açılır, sayfa yüklenince görüşme KENDİLİĞİNDEN başlar (EK_CEVAPLA → window.gloxAramaCevapla).
 *  - REDDET  → uygulama arka planda açılıp aramayı "red" yapar, arayan "reddetti" görür (EK_REDDET → window.gloxAramaReddet).
 *  - Arayan vazgeçerse / arama bitince (arama-bitti haberi → AramaZili.kapat) bu ekran kendiliğinden kapanır; en çok 45 sn.
 */
class AramaEkraniActivity : Activity() {
    companion object {
        const val EK_AD = "glox_arama_ad"
        const val EK_GOVDE = "glox_arama_govde"
        const val EK_FOTO = "glox_arama_foto"
        private const val ALTIN_ACIK = 0xFFFBF0C9.toInt()
        private const val ALTIN = 0xFFF2DF9F.toInt()
        private const val ALTIN_KOYU = 0xFFC9A227.toInt()
        private const val YAZI = 0xFF3A2A00.toInt()
        @Volatile private var acik: WeakReference<AramaEkraniActivity>? = null
        @Volatile var acikAramaId: String? = null

        /** Arama bitti/reddedildi → açık arama ekranını kapat (aramaId verilirse sadece o aramaysa). */
        fun kapat(aramaId: String?) {
            val a = acik?.get() ?: return
            if (aramaId != null && acikAramaId != null && acikAramaId != aramaId) return
            a.runOnUiThread { try { a.finish() } catch (e: Exception) {} }
        }
    }

    private var aramaId: String = ""
    private val zamanAsimi = Handler(Looper.getMainLooper())

    private fun dp(v: Int): Int = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics).toInt()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Kilitli / ekran kapalıyken de görünsün ve ekranı yaksın
        if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true) }
        else {
            @Suppress("DEPRECATION")
            window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        try { window.statusBarColor = ALTIN_ACIK; window.navigationBarColor = ALTIN } catch (e: Exception) {}

        aramaId = intent.getStringExtra(AramaZili.EK_ARAMA) ?: ""
        if (aramaId.isEmpty()) { finish(); return }
        acik = WeakReference(this)
        acikAramaId = aramaId
        val ad = intent.getStringExtra(EK_AD) ?: "GLOXORG"
        val govde = intent.getStringExtra(EK_GOVDE) ?: "📞 Arıyor…"
        val fotoUrl = intent.getStringExtra(EK_FOTO)

        // ZEMİN: parlak ALTIN (siyah YOK)
        val kok = FrameLayout(this)
        kok.background = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, intArrayOf(ALTIN_ACIK, ALTIN, 0xFFE8C86A.toInt()))

        val sutun = LinearLayout(this)
        sutun.orientation = LinearLayout.VERTICAL
        sutun.gravity = Gravity.CENTER_HORIZONTAL
        sutun.setPadding(dp(24), dp(80), dp(24), dp(48))

        // KARE fotoğraf (hafif yuvarlatılmış köşe, tam daire DEĞİL); yoksa baş harf
        val fotoKutu = FrameLayout(this)
        val fotoBoy = dp(150)
        val cerceve = GradientDrawable(); cerceve.cornerRadius = dp(24).toFloat(); cerceve.setColor(0xFFFFF7D6.toInt()); cerceve.setStroke(dp(4), ALTIN_KOYU)
        fotoKutu.background = cerceve
        fotoKutu.setPadding(dp(4), dp(4), dp(4), dp(4))
        val harf = TextView(this)
        harf.text = (ad.trim().firstOrNull() ?: 'G').uppercaseChar().toString()
        harf.setTextColor(YAZI); harf.setTextSize(TypedValue.COMPLEX_UNIT_SP, 64f); harf.typeface = Typeface.DEFAULT_BOLD; harf.gravity = Gravity.CENTER
        fotoKutu.addView(harf, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        val foto = ImageView(this)
        foto.scaleType = ImageView.ScaleType.CENTER_CROP
        foto.outlineProvider = object : ViewOutlineProvider() {
            override fun getOutline(v: View, o: Outline) { o.setRoundRect(0, 0, v.width, v.height, dp(20).toFloat()) }
        }
        foto.clipToOutline = true
        fotoKutu.addView(foto, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        sutun.addView(fotoKutu, LinearLayout.LayoutParams(fotoBoy, fotoBoy))

        // AD — sığmazsa KESİLMEZ, kayar (marquee)
        val adYazi = TextView(this)
        adYazi.text = ad
        adYazi.setTextColor(YAZI); adYazi.setTextSize(TypedValue.COMPLEX_UNIT_SP, 28f); adYazi.typeface = Typeface.create(Typeface.SERIF, Typeface.BOLD)
        adYazi.isSingleLine = true; adYazi.ellipsize = TextUtils.TruncateAt.MARQUEE; adYazi.marqueeRepeatLimit = 3; adYazi.isSelected = true
        adYazi.gravity = Gravity.CENTER
        val adLp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT); adLp.topMargin = dp(24)
        sutun.addView(adYazi, adLp)

        val altYazi = TextView(this)
        altYazi.text = govde
        altYazi.setTextColor(0xFF6B5417.toInt()); altYazi.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f); altYazi.gravity = Gravity.CENTER
        val altLp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT); altLp.topMargin = dp(8)
        sutun.addView(altYazi, altLp)

        val bosluk = View(this)
        sutun.addView(bosluk, LinearLayout.LayoutParams(1, 0, 1f))

        // DÜĞMELER — KARE (yuvarlatılmış köşe), büyük, yazılı
        val dugmeler = LinearLayout(this)
        dugmeler.orientation = LinearLayout.HORIZONTAL
        dugmeler.gravity = Gravity.CENTER
        dugmeler.addView(dugme("✕  Reddet", 0xFFE0202C.toInt()) { reddet() }, dugmeLp())
        dugmeler.addView(View(this), LinearLayout.LayoutParams(dp(28), 1))
        dugmeler.addView(dugme("✓  Cevapla", 0xFF1EA64F.toInt()) { cevapla() }, dugmeLp())
        sutun.addView(dugmeler, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT))

        kok.addView(sutun, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        setContentView(kok)

        // Fotoğrafı arka planda indir (ağ işi ana iş parçacığında yapılmaz)
        if (!fotoUrl.isNullOrEmpty()) {
            Thread {
                val bmp = GloxMesajServisi.fotoIndir(fotoUrl)
                if (bmp != null) runOnUiThread { try { foto.setImageBitmap(bmp); harf.visibility = View.GONE } catch (e: Exception) {} }
            }.start()
        }
        // Güvenlik: en çok 45 sn açık kalır (zil de 45 sn sonra susar)
        zamanAsimi.postDelayed({ try { finish() } catch (e: Exception) {} }, 45000)
    }

    private fun dugmeLp(): LinearLayout.LayoutParams = LinearLayout.LayoutParams(0, dp(76), 1f)

    private fun dugme(yazi: String, renk: Int, tik: () -> Unit): TextView {
        val b = TextView(this)
        b.text = yazi
        b.setTextColor(Color.WHITE); b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20f); b.typeface = Typeface.DEFAULT_BOLD
        b.gravity = Gravity.CENTER
        b.isSingleLine = true; b.ellipsize = TextUtils.TruncateAt.MARQUEE; b.isSelected = true
        val z = GradientDrawable(); z.cornerRadius = dp(18).toFloat(); z.setColor(renk); z.setStroke(dp(3), 0xFFFFE9A8.toInt())
        b.background = z
        b.elevation = dp(6).toFloat()
        b.isClickable = true
        b.setOnClickListener { tik() }
        return b
    }

    private fun uygulamayaGit(cevapla: Boolean) {
        AramaZili.kapat(this, aramaId)
        val i = Intent(this, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra(AramaZili.EK_ARAMA, aramaId)
        if (cevapla) i.putExtra(AramaZili.EK_CEVAPLA, aramaId) else i.putExtra(AramaZili.EK_REDDET, aramaId)
        try { startActivity(i) } catch (e: Exception) {}
        finish()
    }

    private fun cevapla() = uygulamayaGit(true)
    private fun reddet() = uygulamayaGit(false)

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() { /* geri tuşu aramayı kapatmasın; Reddet/Cevapla seçilmeli */ }

    override fun onDestroy() {
        zamanAsimi.removeCallbacksAndMessages(null)
        if (acik?.get() === this) { acik = null; acikAramaId = null }
        super.onDestroy()
    }
}
