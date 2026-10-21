package com.gloxorg.webtest

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.os.SystemClock
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

/**
 * GLOXORG — native WebView kabuğu (DENEME).
 *
 * SARI PERDE ÇÖZÜMÜ: Telefon arka planda WebView'in render sürecini öldürürse (sabah bomboş sarı ekranın
 * gerçek sebebi buydu), onRenderProcessGone devreye girer → ölü WebView'i atar, YENİSİNİ kurar, sayfayı
 * yeniden yükler → kullanıcı bomboş ekran görmez, sayfa gelir. TWA bunu yapamıyordu; native kabuk yapar.
 * Ayrıca uzun süre arka planda kalıp dönünce de tazeler.
 */
class MainActivity : Activity() {

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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        yeniWebViewKur(ilk = true)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun yeniWebViewKur(ilk: Boolean) {
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

        // (Geliştirme için; zararsız) uzaktan hata ayıklama açık
        try { WebView.setWebContentsDebuggingEnabled(true) } catch (e: Exception) {}

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

            // *** SARI PERDE ÇÖZÜMÜ ***
            override fun onRenderProcessGone(view: WebView?, detail: RenderProcessGoneDetail?): Boolean {
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

        setContentView(w, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
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
        yeniWebViewKur(ilk = false)
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
