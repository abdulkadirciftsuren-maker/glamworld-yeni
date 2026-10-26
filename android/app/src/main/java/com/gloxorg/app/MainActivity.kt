package com.gloxorg.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.os.CancellationSignal
import android.os.Environment
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.RenderProcessGoneDetail
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import androidx.credentials.CredentialManager
import androidx.credentials.CredentialManagerCallback
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import java.util.concurrent.Executor

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
    private var bekleyenIzinIstegi: PermissionRequest? = null
    private var bekleyenKonum: Pair<String?, GeolocationPermissions.Callback?>? = null
    // Google girişi Chrome'dan dönünce sayfaya verilecek komut (sayfa henüz hazır değilse burada bekler)
    private var bekleyenGirisJs: String? = null
    private var sayfaHazir = false
    // Ana sayfa yüklenemezse (internet o an yok) hata sayfası GÖSTERİLMEZ; logolu ekran kalır, kendiliğinden tekrar denenir
    private var sayfaHatali = false
    // Chrome penceresinde Google girişi açıkken true: pencere anahtar vermeden kapanırsa (çarpı) sayfaya "vazgeçildi" denir
    private var chromeGirisBekliyor = false
    private var hataSayisi = 0

    private val BASLANGIC_URL = "https://gloxorg.com"
    private val DOSYA_SEC = 1001
    private val IZIN_KAMERA_MIC = 2001
    private val IZIN_KONUM = 2002
    private val ALTIN = 0xFFF2DF9F.toInt()
    // Firebase projesinin (glamworld2) Google "Web client ID"si — telefondan alınan Google anahtarı bu kimlik için üretilir
    private val WEB_CLIENT_ID = "656498925104-45kvtat6gar0b57ei9jbs88c4oplrv6v.apps.googleusercontent.com"

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
        girisDonusu(intent) // uygulama kapalıyken Chrome'dan anahtarla açıldıysa
    }

    // Chrome'daki Google girişinden dönüş (gloxorg://giris?t=ANAHTAR veya ?iptal=1)
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        if (intent != null) setIntent(intent)
        girisDonusu(intent)
    }

    private fun girisDonusu(intent: Intent?) {
        val veri = intent?.data ?: return
        if (veri.scheme != "gloxorg" || veri.host != "giris") return
        chromeGirisBekliyor = false
        sayfayaGoogleVer(veri.getQueryParameter("t"))
        // Aynı dönüş ikinci kez işlenmesin
        intent?.data = null
    }

    /** Google anahtarını sayfaya verir (anahtar yoksa/geçersizse "vazgeçildi" bildirir). */
    private fun sayfayaGoogleVer(anahtar: String?) {
        val cagri = if (anahtar != null && Regex("^[A-Za-z0-9._\\-]+$").matches(anahtar)) {
            "window.gloxNativeGoogle('" + anahtar + "')"
        } else {
            "window.gloxNativeGoogleIptal && window.gloxNativeGoogleIptal()"
        }
        // Sayfanın işlevi hazır olana kadar kısa aralıklarla dene (sayfa yeniden yüklenmiş olabilir)
        val js = "(function f(n){if(window.gloxNativeGoogle){" + cagri + "}else if(n>0){setTimeout(function(){f(n-1)},300)}})(60);"
        val w = web
        if (w != null && sayfaHazir) {
            w.evaluateJavascript(js, null)
        } else {
            bekleyenGirisJs = js
        }
    }

    /**
     * GOOGLE GİRİŞİ — telefonda KAYITLI Google hesabıyla (Facebook/Instagram gibi): alttan "... olarak devam et"
     * penceresi çıkar, şifre/onay/sayfa gidip gelmesi YOK. Chrome yolu (missing initial state, otomatik dönememe)
     * yerine bu kullanılır. Firebase'de uygulamanın parmak izi (SHA-1) kayıtlı değilse ya da başka bir sorun olursa
     * ESKİ Chrome yoluna düşer (hiçbir şey bozulmaz).
     */
    private fun googleNativeGiris() {
        try {
            val cm = CredentialManager.create(this)
            val secenek = GetSignInWithGoogleOption.Builder(WEB_CLIENT_ID).build()
            val istek = GetCredentialRequest.Builder().addCredentialOption(secenek).build()
            cm.getCredentialAsync(this, istek, CancellationSignal(), Executor { r -> runOnUiThread(r) },
                object : CredentialManagerCallback<GetCredentialResponse, GetCredentialException> {
                    override fun onResult(result: GetCredentialResponse) {
                        val c = result.credential
                        if (c is CustomCredential && c.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                            try {
                                sayfayaGoogleVer(GoogleIdTokenCredential.createFrom(c.data).idToken)
                                return
                            } catch (e: Exception) {}
                        }
                        chromeIleGiris("kimlik-turu")
                    }

                    override fun onError(e: GetCredentialException) {
                        if (e is GetCredentialCancellationException) {
                            sayfayaGoogleVer(null) // kullanıcı vazgeçti → giriş ekranı eski haline döner
                            return
                        }
                        chromeIleGiris(e.javaClass.simpleName + " " + (e.errorMessage ?: ""))
                    }
                })
        } catch (e: Exception) {
            chromeIleGiris(e.javaClass.simpleName)
        }
    }

    /**
     * Yedek yol: Google girişi Chrome penceresinde. TEST AŞAMASI: telefon hesabıyla girişin NEDEN olmadığı
     * "Tamam" düğmeli pencerede gösterilir (kullanıcı fotoğrafını çekip gönderebilsin). Sebep çözülünce bu pencere
     * kaldırılıp yedeğe sessizce geçilecek.
     */
    private fun chromeIleGiris(sebep: String) {
        try {
            android.app.AlertDialog.Builder(this)
                .setTitle("Google girişi")
                .setMessage("Telefondaki Google hesabıyla giriş olmadı:\n\n" + sebep.take(300) + "\n\nTamam'a basınca Chrome ile denenecek.")
                .setPositiveButton("Tamam") { _, _ ->
                    chromeGirisBekliyor = true
                    ozelSekmeAc("https://gloxorg.com/glox-google.html")
                }
                .setOnCancelListener { sayfayaGoogleVer(null) }
                .show()
        } catch (e: Exception) {
            chromeGirisBekliyor = true
            ozelSekmeAc("https://gloxorg.com/glox-google.html")
        }
    }

    /** Sayfa (gloxorg.com) buradan "Google ile giriş" ister → giriş Chrome penceresinde yapılır. */
    inner class GloxKopru {
        @JavascriptInterface
        fun googleGiris() {
            runOnUiThread { googleNativeGiris() }
        }
    }

    // Chrome Custom Tab (uygulama içinde açılan Chrome penceresi). Paketi AÇIKÇA seçiyoruz ki
    // gloxorg.com bağlantısını eski Play uygulaması (com.gloxorg.twa) kapmasın.
    private fun ozelSekmeAc(url: String) {
        val i = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        val ek = Bundle()
        ek.putBinder("android.support.customtabs.extra.SESSION", null)
        i.putExtras(ek)
        i.putExtra("android.support.customtabs.extra.TOOLBAR_COLOR", ALTIN)
        val tarayicilar = listOf("com.android.chrome", "com.chrome.beta", "com.sec.android.app.sbrowser", "com.microsoft.emmx", "org.mozilla.firefox")
        for (p in tarayicilar) {
            try {
                i.setPackage(p)
                startActivity(i)
                return
            } catch (e: ActivityNotFoundException) {
            } catch (e: Exception) {
            }
        }
        try {
            i.setPackage(null)
            startActivity(i)
        } catch (e: Exception) {}
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
        // AYRICA "GloxorgApp" ekle → site, uygulama içinde olduğumuzu anlar ve Google girişinde POPUP
        // yerine REDIRECT kullanır (popup WebView'de geri konuşamaz → sarı ekran oluyordu). "wv" olmadığı
        // için Google yine izin verir, "GloxorgApp" ise Google'ı engellemez (sadece site bizi tanır).
        try {
            val ua = s.userAgentString ?: ""
            val temiz = ua.replace("; wv)", ")").replace("; wv", "").replace(" wv", "")
            s.userAgentString = "$temiz GloxorgApp/1.0"
        } catch (e: Exception) {}

        w.setBackgroundColor(ALTIN) // yüklenirken WebView'in kendi zemini de altın (beyaz/siyah flaş yok)
        w.addJavascriptInterface(GloxKopru(), "AndroidGlox") // sayfa → uygulama: Google girişi
        sayfaHazir = false

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

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                sayfaHatali = false
            }

            // Ana sayfa yüklenemedi (internet uyanmamış / kesik) → çirkin hata sayfası yerine logolu ekran + otomatik tekrar
            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                if (request == null || !request.isForMainFrame) return
                sayfaHatali = true
                ortuGoster(true)
                val bekle = minOf(1500L * (hataSayisi + 1), 8000L)
                hataSayisi++
                view?.postDelayed({
                    try { view.loadUrl(BASLANGIC_URL) } catch (e: Exception) {}
                }, bekle)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                if (sayfaHatali) return // hata sayfası: örtü kalsın, tekrar deneme sürüyor
                hataSayisi = 0
                // Sayfa geldi → markalı açılış örtüsünü kaldır (kısa gecikme: ilk boyama otursun)
                view?.postDelayed({ ortuGoster(false) }, 350)
                sayfaHazir = true
                // Chrome'dan dönen Google anahtarı bekliyorsa şimdi ver
                val js = bekleyenGirisJs
                if (js != null) {
                    bekleyenGirisJs = null
                    view?.evaluateJavascript(js, null)
                }
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
        try { web?.onPause() } catch (e: Exception) {}
    }

    override fun onResume() {
        super.onResume()
        try { web?.onResume() } catch (e: Exception) {}
        // Arka plandan dönüşte sayfa YENİLENMEZ (Facebook gibi: kaldığın yerden ANINDA devam).
        // Sadece telefon sayfanın motorunu öldürdüyse onRenderProcessGone yeniden kurar.
        // Chrome giriş penceresi anahtar getirmeden kapandıysa (çarpı/geri) → sayfadaki "giriş yapılıyor" beklemesi biter.
        // (Anahtarla dönüşte onNewIntent, onResume'dan ÖNCE çalışır ve bayrağı indirir.)
        if (chromeGirisBekliyor) {
            chromeGirisBekliyor = false
            sayfayaGoogleVer(null)
        }
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
