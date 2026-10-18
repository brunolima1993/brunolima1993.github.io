package br.com.tmycar.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import androidx.core.content.ContextCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.splashscreen.SplashScreen;
import androidx.webkit.*;
import org.json.*;
import java.util.*;

/** Dedicated native banner row between app content and bottom navigation. */
public final class NativeActivity extends Activity {
    private static final String ORIGIN="https://www.tmycar.com.br";
    private WebView web;
    private LinearLayout root, navigation;
    private FrameLayout bannerSlot;
    private BannerController banner;
    private NativeBilling billing;
    private NativeGoogleLogin login;
    private AdCoordinator interstitial;
    private JavaScriptReplyProxy channel;
    private final Handler main=new Handler(Looper.getMainLooper());
    private final List<TextView> tabs=new ArrayList<>();
    private final List<ImageView> tabIcons=new ArrayList<>();
    private final List<LinearLayout> tabContainers=new ArrayList<>();
    private boolean foreground, keyboard, free, safe, navVisible, destroyed;
    private String account="", epoch="";
    private int documentGeneration;
    private long stateAt;
    private ValueCallback<Uri[]> fileCallback;
    private GeolocationPermissions.Callback locationCallback;
    private String locationOrigin;
    private NativeBilling.Reply notificationReply;
    private long lastTouch;

    @Override protected void onCreate(Bundle state) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(state);
        if(Build.VERSION.SDK_INT>=33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
            android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,this::handleBack);
        getWindow().setNavigationBarColor(Color.rgb(2,5,12));
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            TextView message=new TextView(this); message.setText("Atualize o Android System WebView pela Google Play para abrir o TMy Car.");
            message.setPadding(24,80,24,24); setContentView(message); return;
        }
        root=new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setBackgroundColor(Color.rgb(2,7,15));
        root.setAccessibilityDelegate(new View.AccessibilityDelegate() {
            @Override public boolean onRequestSendAccessibilityEvent(ViewGroup host,View child,android.view.accessibility.AccessibilityEvent event) {
                if(event.getEventType()==android.view.accessibility.AccessibilityEvent.TYPE_VIEW_CLICKED) lastTouch=SystemClock.elapsedRealtime();
                return super.onRequestSendAccessibilityEvent(host,child,event);
            }
        });
        web=new WebView(this); web.setBackgroundColor(Color.rgb(4,7,14));
        web.setOnTouchListener((view,event) -> { if(event.getAction()==MotionEvent.ACTION_UP) lastTouch=SystemClock.elapsedRealtime(); return false; });
        web.setOnKeyListener((view,key,event) -> { if(event.getAction()==KeyEvent.ACTION_UP) lastTouch=SystemClock.elapsedRealtime(); return false; });
        root.addView(web,new LinearLayout.LayoutParams(-1,0,1));
        bannerSlot=new FrameLayout(this); bannerSlot.setPadding(0,dp(8),0,dp(8));
        root.addView(bannerSlot,new LinearLayout.LayoutParams(-1,-2));
        navigation=new LinearLayout(this); navigation.setPadding(dp(8),dp(6),dp(8),dp(6));
        String[] names={"Garagem","Gastos","Ajustes"}, screens={"garagem","gastos","config"};
        int[] icons={R.drawable.nav_garagem,R.drawable.nav_gastos,R.drawable.nav_config};
        for(int i=0;i<3;i++) {
            LinearLayout item=new LinearLayout(this); item.setOrientation(LinearLayout.VERTICAL); item.setGravity(Gravity.CENTER);
            item.setMinimumHeight(dp(60)); item.setContentDescription(names[i]);
            ImageView icon=new ImageView(this); icon.setImageResource(icons[i]); icon.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
            item.addView(icon,new LinearLayout.LayoutParams(dp(25),dp(25))); tabIcons.add(icon);
            TextView tab=new TextView(this); tab.setText(names[i]); tab.setGravity(Gravity.CENTER); tab.setTextSize(11); tab.setPadding(0,dp(3),0,0);
            item.addView(tab,new LinearLayout.LayoutParams(-1,-2));
            final String screen=screens[i];
            item.setOnClickListener(v -> { banner.hide(); safe=false; web.evaluateJavascript("window.TMyNative && TMyNative.navigate('"+screen+"')",null); });
            tabs.add(tab); tabContainers.add(item); navigation.addView(item,new LinearLayout.LayoutParams(0,-2,1));
        }
        root.addView(navigation,new LinearLayout.LayoutParams(-1,-2)); navigation.setVisibility(View.GONE);
        setContentView(root);
        ViewCompat.setOnApplyWindowInsetsListener(root,(view,insets) -> {
            androidx.core.graphics.Insets bars=insets.getInsets(WindowInsetsCompat.Type.systemBars());
            androidx.core.graphics.Insets ime=insets.getInsets(WindowInsetsCompat.Type.ime());
            keyboard=insets.isVisible(WindowInsetsCompat.Type.ime());
            root.setPadding(bars.left,bars.top,bars.right,Math.max(bars.bottom,ime.bottom));
            updateBanner(); return WindowInsetsCompat.CONSUMED;
        });
        banner=new BannerController(this,bannerSlot,BuildConfig.PRODUCTION_ADS);
        billing=new NativeBilling(this); login=new NativeGoogleLogin(this);
        interstitial=new AdCoordinator(this,message -> {
            try { message.put("tmycarAds",1); emit("ads",message); } catch(Exception ignored) { }
            updateBanner();
        });
        WebSettings settings=web.getSettings(); settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(true); // User-selected SAF files.
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setUserAgentString(settings.getUserAgentString()+" TMyCarNative/1.6.5");
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        WebViewAssetLoader.AssetsPathHandler assets=new WebViewAssetLoader.AssetsPathHandler(this);
        WebViewAssetLoader loader=new WebViewAssetLoader.Builder().setDomain("www.tmycar.com.br")
            .addPathHandler("/",path -> assets.handle("site/"+(path.isEmpty()?"index.html":path))).build();
        WebViewCompat.addWebMessageListener(web,"TMyAndroid",Collections.singleton(ORIGIN),(view,message,origin,isMainFrame,replyProxy) -> {
            if (destroyed || !isMainFrame || !ORIGIN.equals(origin.toString()) || !trusted(web.getUrl())) return;
            String data=message.getData();
            if (data==null || data.length()>15_000_000) return;
            channel=replyProxy;
            try { receive(new JSONObject(data),replyProxy,documentGeneration); }
            catch(Exception ignored) { /* Malformed messages cannot invoke native actions. */ }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request) {
                return loader.shouldInterceptRequest(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request) {
                Uri uri=request.getUrl();
                if (!request.isForMainFrame()) return false;
                if (trusted(uri.toString())) return false;
                if (request.hasGesture()) external(uri);
                return true;
            }
            @Override public void onPageStarted(WebView view,String url,android.graphics.Bitmap icon) {
                documentGeneration++; channel=null; free=safe=navVisible=false; account=epoch="";
                banner.hide(); navigation.setVisibility(View.GONE); billing.reset(); login.reset(); interstitial.disconnected();
            }
            @Override public void onReceivedSslError(WebView view,SslErrorHandler handler,android.net.http.SslError error) { handler.cancel(); }
            @Override public boolean onRenderProcessGone(WebView view,RenderProcessGoneDetail detail) {
                banner.hide(); recreate(); return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params) {
                if (!trusted(web.getUrl()) || !foreground) return false;
                if (fileCallback!=null) fileCallback.onReceiveValue(null);
                fileCallback=callback;
                Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE);
                try { startActivityForResult(pick,41); return true; }
                catch(Exception error) { fileCallback=null; callback.onReceiveValue(null); return true; }
            }
            @Override public void onGeolocationPermissionsShowPrompt(String origin,GeolocationPermissions.Callback callback) {
                if (!ORIGIN.equals(origin.replaceAll("/$","")) || !foreground) { callback.invoke(origin,false,false); return; }
                if (ContextCompat.checkSelfPermission(NativeActivity.this,Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED) {
                    callback.invoke(origin,true,false); return;
                }
                locationCallback=callback; locationOrigin=origin;
                requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION},42);
            }
        });
        web.setDownloadListener((url,agent,disposition,mime,length) -> {
            if (url.startsWith("blob:")) {
                web.evaluateJavascript("window.TMyNative && TMyNative.download("+JSONObject.quote(url)+","+JSONObject.quote(URLUtil.guessFileName(url,disposition,mime))+")",null);
            } else external(Uri.parse(url));
        });
        String initial=trusted(getIntent().getDataString())?getIntent().getDataString():ORIGIN+"/";
        if(isNotice(getIntent())) initial=ORIGIN+"/?abrir=avisos";
        web.loadUrl(initial);
        main.postDelayed(watchdog,2000);
    }
    private final Runnable watchdog=new Runnable() {
        @Override public void run() {
            if (destroyed) return;
            if (SystemClock.elapsedRealtime()-stateAt>5000) { safe=false; banner.hide(); }
            updateBanner(); main.postDelayed(this,2000);
        }
    };
    private void receive(JSONObject request,JavaScriptReplyProxy proxy,int doc) throws Exception {
        String op=request.optString("op"), id=request.optString("id");
        if (!id.matches("[a-zA-Z0-9-]{1,80}")) return;
        JSONObject args=request.optJSONObject("args"); if (args==null) args=new JSONObject();
        NativeBilling.Reply reply=(result,error) -> {
            if (destroyed || doc!=documentGeneration || !trusted(web.getUrl())) return;
            try { proxy.postMessage(new JSONObject().put("id",id).put("result",result==null?JSONObject.NULL:result)
                .put("error",error==null?JSONObject.NULL:error).toString()); } catch(Exception ignored) { }
        };
        if (Arrays.asList("google","buy","adOpen","share","save","pushPermission").contains(op)
                && (!foreground || SystemClock.elapsedRealtime()-lastTouch>5000)) {
            reply.done(null,"Toque novamente no botão para continuar."); return;
        }
        switch(op) {
            case "hello": reply.done(new JSONObject().put("version","1.6.8").put("testAds",!BuildConfig.PRODUCTION_ADS)
                .put("pushConfigured",NativePush.configured(this)).put("notificationPermission",NativePush.permission(this)),null); break;
            case "pushPermission":
                if(Build.VERSION.SDK_INT>=33 && !"granted".equals(NativePush.permission(this))) {
                    if(notificationReply!=null) { reply.done(null,"Já existe um pedido em andamento."); break; }
                    notificationReply=reply; requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},44);
                } else reply.done(NativePush.permission(this),null);
                break;
            case "pushToken": NativePush.token(this,reply); break;
            case "pushDelete": NativePush.remove(this,reply); break;
            case "notify": NativePush.show(this,args.optString("title","TMy Car"),args.optString("body"),args.optString("tag","maintenance")); reply.done(true,null); break;
            case "ui":
                String next=args.optString("account");
                if (!account.equals(next)) { billing.reset(); if (!account.isEmpty() && next.isEmpty()) login.signOut(); }
                account=next; free=args.optBoolean("free"); safe=args.optBoolean("safe"); navVisible=args.optBoolean("nav");
                stateAt=SystemClock.elapsedRealtime(); navigation.setVisibility(navVisible && !keyboard ? View.VISIBLE : View.GONE);
                String current=args.optString("screen"); String[] screens={"garagem","gastos","config"};
                for(int i=0;i<tabs.size();i++) {
                    boolean active=current.equals(screens[i]);
                    tabs.get(i).setTextColor(active?Color.rgb(42,185,255):Color.rgb(213,229,248)); tabIcons.get(i).setAlpha(active?1f:.65f);
                    android.graphics.drawable.GradientDrawable background=new android.graphics.drawable.GradientDrawable();
                    background.setColor(active?Color.rgb(4,22,37):Color.TRANSPARENT); background.setCornerRadius(dp(12));
                    background.setStroke(dp(1),active?Color.rgb(0,80,128):Color.TRANSPARENT); tabContainers.get(i).setBackground(background);
                }
                updateBanner(); reply.done(true,null); break;
            case "google": if (foreground) login.signIn(reply); else reply.done(null,"Abra o app para entrar."); break;
            case "products": billing.details(args.optJSONArray("ids")==null?new JSONArray():args.optJSONArray("ids"),reply); break;
            case "purchases": billing.purchases(reply); break;
            case "buy":
                if (!foreground || account.isEmpty()) { reply.done(null,"Entre na sua conta antes de assinar."); break; }
                safe=false; banner.hide(); billing.buy(args,reply); break;
            case "ads":
                if (args.optInt("tmycarAds")!=1) break;
                String type=args.optString("type");
                if ("state".equals(type)) {
                    epoch=args.optString("epoch");
                    interstitial.state(epoch,args.optBoolean("free"),foreground && args.optBoolean("safe"));
                } else if ("saved".equals(type) && foreground) interstitial.saved(args.optString("request"),args.optString("epoch"));
                reply.done(true,null); break;
            case "adOpen":
                String host=args.optString("host"),token=args.optString("token");
                if (!foreground || !("maintenance".equals(host)||"privacy".equals(host)) || !token.matches("[a-f0-9-]{36}")) break;
                banner.hide(); safe=false;
                startActivity(new Intent(this,AdActivity.class).setData(Uri.parse("tmycar-ads://"+host+"?token="+token)));
                reply.done(true,null); break;
            case "share": case "save":
                if (!foreground) { reply.done(null,"Abra o app para compartilhar."); break; }
                NativeFiles.export(this,args,"share".equals(op),reply); break;
            default: reply.done(null,"Operação não disponível.");
        }
    }
    private void emit(String type,JSONObject data) {
        if (channel==null || destroyed) return;
        try { channel.postMessage(new JSONObject().put("event",type).put("data",data).toString()); } catch(Exception ignored) { }
    }
    private void updateBanner() {
        if (banner==null || root==null) return;
        navigation.setVisibility(navVisible && !keyboard && foreground ? View.VISIBLE : View.GONE);
        banner.update(account,free,foreground,safe && navVisible && !keyboard,
            interstitial!=null && interstitial.bannerAllowed(),root.getWidth()-root.getPaddingLeft()-root.getPaddingRight());
    }
    private static boolean trusted(String url) {
        if (url==null) return false;
        Uri uri=Uri.parse(url);
        return "https".equals(uri.getScheme()) && "www.tmycar.com.br".equals(uri.getHost())
            && (uri.getPort()==-1 || uri.getPort()==443) && uri.getUserInfo()==null;
    }
    private void external(Uri uri) {
        if (!Arrays.asList("https","http","mailto","tel","geo").contains(uri.getScheme())) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW,uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch(Exception ignored) { Toast.makeText(this,"Não foi possível abrir este link.",Toast.LENGTH_SHORT).show(); }
    }
    private int dp(int value) { return Math.round(value*getResources().getDisplayMetrics().density); }
    private boolean isNotice(Intent intent) { return intent.getBooleanExtra("openNotices",false) || intent.hasExtra("google.message_id"); }
    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent); setIntent(intent);
        if(web!=null && isNotice(intent)) web.evaluateJavascript("if(typeof ONBOARD!=='undefined' && ONBOARD) go('avisos')",null);
    }
    @Override protected void onResume() { super.onResume(); foreground=true; if (web!=null) web.onResume(); updateBanner(); }
    @Override protected void onPause() { foreground=false; if (banner!=null) banner.hide(); if(web!=null) web.onPause(); super.onPause(); }
    @Override public void onBackPressed() { handleBack(); }
    private void handleBack() {
        if (web!=null) web.evaluateJavascript("window.TMyNative && TMyNative.back()",value -> { if(!"true".equals(value)) finish(); });
        else finish();
    }
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if (request==43) NativeFiles.result(this,result,data);
        if (request==41 && fileCallback!=null) {
            fileCallback.onReceiveValue(result==RESULT_OK && data!=null && data.getData()!=null ? new Uri[]{data.getData()}:null); fileCallback=null;
        }
    }
    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] grants) {
        super.onRequestPermissionsResult(request,permissions,grants);
        if (request==44 && notificationReply!=null) { notificationReply.done(NativePush.permission(this),null); notificationReply=null; }
        if (request==42 && locationCallback!=null) {
            locationCallback.invoke(locationOrigin,grants.length>0 && grants[0]==PackageManager.PERMISSION_GRANTED,false); locationCallback=null;
        }
    }
    @Override protected void onDestroy() {
        destroyed=true; main.removeCallbacksAndMessages(null); NativeFiles.close(this);
        if(fileCallback!=null) fileCallback.onReceiveValue(null);
        notificationReply=null;
        if(locationCallback!=null) locationCallback.invoke(locationOrigin,false,false);
        if(banner!=null) banner.close(); if(interstitial!=null) interstitial.close(); if(billing!=null) billing.close(); if(login!=null) login.reset();
        if(web!=null) { web.stopLoading(); root.removeView(web); web.destroy(); }
        super.onDestroy();
    }
}

