package com.gloxorg.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.os.SystemClock
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.RenderProcessGoneDetail
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar

/**
 * GLOXORG — native uygulama (üretim).
 *
 * ⭐ SARI PERDE ÇÖZÜMÜ (asıl sebep buydu): Telefon arka planda WebView'in render sürecini öldürünce
 *    (sabah açınca bomboş sarı ekranın gerçek sebebi), onRenderProcessGone devreye girer → ölü
 *    WebView'i atar, YENİSİNİ kurar, sayfayı yeniden yükler → kullanıcı bomboş ekran görmez. Bu,
 *    TWA'nın (eski Play sürümü) YAPAMADIĞI şey; native kabuk yapar. Ayrıca uzun süre arka planda
 *    kalıp dönünce de tazeler.
 *
 * ⭐ MARKALI AÇILIŞ: WebView daha hiç boyanmadan önce bile (ve yeniden kurulurken) altın zemin +
 *    GLOXORG logosu + dönen halka gösterilir (native görünüm, her zaman boyanır) → sayfa gelene
 *    kadar bomboş ekran OLMAZ, düzgün bir "yükleniyor" görünür.
 */
class MainActivity : Activity() {

    private var kok: FrameLayout? = null
    private var ortu: View? = null
    private var web: WebView? = null
    private var dosyaCallback: ValueCallback<Array<Uri>>? = null
    private var arkaPlanZamani: Long = 0L
    private var bekleyenIzinIstegi: PermissionRequest? = null
    private var bekleyenKonum: Pair<String?, GeolocationPermissions.Callback?>? = null

    private val BASLANGIC_URL = "https://gloxorg.com"
    private val DOSYA_SEC = 1001
    private val IZIN_KAMERA_MIC = 2001
    private val IZIN_KONUM = 2002
    // Bu kadar milisaniyeden uzun arka planda kaldıysa, dönüşte tazele (içerik bayatlamasın)
    private val UZUN_ARKA_PLAN = 30 * 60 * 1000L // 30 dakika
    private val ALTIN = 0xFFF2DF9F.toInt()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Kök: altta WebView, üstte markalı açılış örtüsü
        val root = FrameLayout(this)
        root.setBackgroundColor(ALTIN)
        setContentView(root, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        kok = root
        ortu = acilisOrtusuYap()
        yeniWebViewKur()
        root.addView(ortu) // örtü en üstte kalsın
    }

    /** Altın zemin + GLOXORG logosu + dönen halka — sayfa gelene kadar görünür (bomboş ekran olmaz). */
    private fun acilisOrtusuYap(): View {
        val fon = FrameLayout(this)
        fon.setBackgroundColor(ALTIN)
        fon.isClickable = true // alttaki sayfaya dokunma geçmesin

        val kutu = LinearLayout(this)
        kutu.orientation = LinearLayout.VERTICAL
        kutu.gravity = Gravity.CENTER

        val logo = ImageView(this)
        logo.setImageResource(R.drawable.gloxorg_logo)
        val lp = LinearLayout.LayoutParams(dp(96), dp(96))
        lp.gravity = Gravity.CENTER
        logo.layoutParams = lp
        kutu.addView(logo)

        val halka = ProgressBar(this)
        val hp = LinearLayout.LayoutParams(dp(36), dp(36))
        hp.gravity = Gravity.CENTER
        hp.topMargin = dp(22)
        halka.layoutParams = hp
        kutu.addView(halka)

        val klp = FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER
        )
        fon.addView(kutu, klp)
        return fon
    }

    private fun ortuGoster(goster: Boolean) {
        ortu?.visibility = if (goster) View.VISIBLE else View.GONE
    }

    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()

    @SuppressLint("SetJavaScriptEnabled")
    private fun yeniWebViewKur() {
        val w = WebView(this)

        val s = w.settings
        s.javaScriptEnabled = true
        s.domStorageEnabled = true          // localStorage / oturum / ayarlar
        s.databaseEnabled = true            // IndexedDB (Firebase giriş kalıcılığı)
        s.mediaPlaybackRequiresUserGesture = false
        s.allowFileAccess = true
        s.allowContentAccess = true
        s.loadWithOverviewMode = true
        s.useWideViewPort = true
        s.javaScriptCanOpenWindowsAutomatically = true
        s.setSupportMultipleWindows(false)
        s.setGeolocationEnabled(true)
        s.cacheMode = WebSettings.LOAD_DEFAULT
        s.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(w, true)

        // GOOGLE GİRİŞİ: WebView kimliğindeki "wv" (sarmalanmış tarayıcı) işaretini kaldır → Google
        // "disallowed_useragent" ile girişi engellemesin, normal Chrome gibi görüp izin versin.
        try {
            val ua = s.userAgentString ?: ""
            s.userAgentString = ua.replace("; wv)", ")").replace("; wv", "").replace(" wv", "")
        } catch (e: Exception) {}

        w.setBackgroundColor(ALTIN) // yüklenirken WebView'in kendi zemini de altın (beyaz/siyah flaş yok)

        w.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url.toString()
                // Site + Google/Firebase giriş akışı AYNI pencerede kalsın; http(s) dış linkler de WebView içinde açılsın
                if (url.startsWith("http://") || url.startsWith("https://")) return false
                // mailto:, tel:, whatsapp:, intent: vb. → sistem uygulaması
                return try {
                    startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    true
                } catch (e: Exception) {
                    true
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                // Sayfa geldi → markalı açılış örtüsünü kaldır (kısa gecikme: ilk boyama otursun)
                view?.postDelayed({ ortuGoster(false) }, 350)
            }

            // *** SARI PERDE ÇÖZÜMÜ ***
            override fun onRenderProcessGone(view: WebView?, detail: RenderProcessGoneDetail?): Boolean {
                // Render süreci öldü → markalı örtüyü göster, ölü WebView'i at, yenisini kur
                ortuGoster(true)
                yenidenKur()
                return true // ele aldık → uygulama ÇÖKMEZ, sayfa yeniden gelir
            }
        }

        w.webChromeClient = object : WebChromeClient() {
            // Fotoğraf/dosya YÜKLEME (paylaşım, profil foto vb.)
            override fun onShowFileChooser(
                webView: WebView?,
                callback: ValueCallback<Array<Uri>>?,
                params: FileChooserParams?
            ): Boolean {
                dosyaCallback?.onReceiveValue(null)
                dosyaCallback = callback
                val intent = params?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "*/*"
                }
                return try {
                    startActivityForResult(Intent.createChooser(intent, "Seç"), DOSYA_SEC)
                    true
                } catch (e: Exception) {
                    dosyaCallback = null
                    false
                }
            }

            // Konum izni (yakındaki profesyoneller / harita)
            override fun onGeolocationPermissionsShowPrompt(origin: String?, callback: GeolocationPermissions.Callback?) {
                if (izinVar(Manifest.permission.ACCESS_FINE_LOCATION) || izinVar(Manifest.permission.ACCESS_COARSE_LOCATION)) {
                    callback?.invoke(origin, true, false)
                } else {
                    bekleyenKonum = Pair(origin, callback)
                    requestPermissions(
                        arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
                        IZIN_KONUM
                    )
                }
            }

            // Kamera + mikrofon (Glome görüntülü/sesli arama)
            override fun onPermissionRequest(request: PermissionRequest?) {
                request ?: return
                val res = request.resources
                val gerekli = ArrayList<String>()
                if (res.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE) && !izinVar(Manifest.permission.CAMERA)) {
                    gerekli.add(Manifest.permission.CAMERA)
                }
                if (res.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE) && !izinVar(Manifest.permission.RECORD_AUDIO)) {
                    gerekli.add(Manifest.permission.RECORD_AUDIO)
                }
                if (gerekli.isEmpty()) {
                    try { request.grant(res) } catch (e: Exception) {}
                } else {
                    bekleyenIzinIstegi = request
                    requestPermissions(gerekli.toTypedArray(), IZIN_KAMERA_MIC)
                }
            }
        }

        // İNDİRME (paylaşılan foto/video indir) → sistem indirme yöneticisi
        w.setDownloadListener { url, _, _, _, _ ->
            try {
                val req = DownloadManager.Request(Uri.parse(url))
                req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                req.setDestinationInExternalPublicDir(
                    Environment.DIRECTORY_DOWNLOADS,
                    "gloxorg_" + System.currentTimeMillis()
                )
                (getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(req)
            } catch (e: Exception) {}
        }

        // WebView'i örtünün ALTINA ekle (örtü varsa index 0)
        val root = kok
        if (root != null) {
            root.addView(w, 0, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        }
        web = w
        w.loadUrl(BASLANGIC_URL)
    }

    // Render süreci öldü → ölü WebView'i at, yenisini kur (bomboş sarı ekran OLMAZ)
    private fun yenidenKur() {
        try {
            val eski = web
            (eski?.parent as? ViewGroup)?.removeView(eski)
            eski?.destroy()
        } catch (e: Exception) {}
        web = null
        yeniWebViewKur()
    }

    private fun izinVar(izin: String): Boolean =
        checkSelfPermission(izin) == PackageManager.PERMISSION_GRANTED

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        when (requestCode) {
            IZIN_KAMERA_MIC -> {
                val istek = bekleyenIzinIstegi
                bekleyenIzinIstegi = null
                if (istek != null) {
                    val hepsiVerildi = grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }
                    try {
                        if (hepsiVerildi) istek.grant(istek.resources) else istek.deny()
                    } catch (e: Exception) {}
                }
            }
            IZIN_KONUM -> {
                val (origin, cb) = bekleyenKonum ?: Pair(null, null)
                bekleyenKonum = null
                val verildi = grantResults.isNotEmpty() && grantResults.any { it == PackageManager.PERMISSION_GRANTED }
                cb?.invoke(origin, verildi, false)
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == DOSYA_SEC) {
            val cb = dosyaCallback
            dosyaCallback = null
            if (cb == null) return
            val sonuc: Array<Uri>? = if (resultCode == Activity.RESULT_OK && data != null) {
                val clip = data.clipData
                when {
                    clip != null -> Array(clip.itemCount) { i -> clip.getItemAt(i).uri }
                    data.data != null -> arrayOf(data.data!!)
                    else -> null
                }
            } else null
            cb.onReceiveValue(sonuc)
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        val w = web
        if (w != null && w.canGoBack()) {
            w.goBack() // açık pencereyi/önceki ekranı kapat (uygulamadan çıkma)
        } else {
            super.onBackPressed()
        }
    }

    override fun onPause() {
        super.onPause()
        arkaPlanZamani = SystemClock.elapsedRealtime()
        try { web?.onPause() } catch (e: Exception) {}
    }

    override fun onResume() {
        super.onResume()
        try { web?.onResume() } catch (e: Exception) {}
        // Uzun süre arka planda kaldıysa dönüşte tazele (içerik bayatlamasın / boş kalmasın)
        val w = web
        if (w != null && arkaPlanZamani > 0L && (SystemClock.elapsedRealtime() - arkaPlanZamani) > UZUN_ARKA_PLAN) {
            ortuGoster(true)
            w.reload()
        }
        arkaPlanZamani = 0L
    }

    override fun onDestroy() {
        try {
            val w = web
            (w?.parent as? ViewGroup)?.removeView(w)
            w?.destroy()
        } catch (e: Exception) {}
        web = null
        super.onDestroy()
    }
}
