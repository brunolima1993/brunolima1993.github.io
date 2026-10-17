package br.com.tmycar.app;

import android.app.Activity;
import android.content.ComponentName;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import androidx.browser.customtabs.CustomTabsCallback;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsService;
import androidx.browser.customtabs.CustomTabsServiceConnection;
import androidx.browser.customtabs.CustomTabsSession;
import org.json.JSONObject;

/** Uses the actual TWA session; only the exact DAL-verified HTTPS origin can talk to it. */
final class TwaAdChannel extends CustomTabsCallback {
    private static final Uri ORIGIN = Uri.parse("https://www.tmycar.com.br");
    private final Activity activity;
    private final CustomTabsCallback delegate;
    private final AdCoordinator ads;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final AdNavigationState navigation = new AdNavigationState();
    private CustomTabsSession session;
    private CustomTabsServiceConnection warmConnection;
    private boolean useOrigin, handleUrls, navigated, requested, ready, bound, closed;

    TwaAdChannel(Activity activity, CustomTabsCallback delegate) {
        this.activity = activity; this.delegate = delegate;
        ads = new AdCoordinator(activity, this::send);
    }
    void connect(CustomTabsSession session, String provider) {
        this.session = session;
        // ABH may skip warmup in recent Chrome; DAL postMessage validation still needs it.
        warmConnection = new CustomTabsServiceConnection() {
            @Override public void onCustomTabsServiceConnected(ComponentName name, CustomTabsClient client) {
                if (closed) return;
                client.warmup(0L);
                session.validateRelationship(CustomTabsService.RELATION_USE_AS_ORIGIN, ORIGIN, null);
                session.validateRelationship(CustomTabsService.RELATION_HANDLE_ALL_URLS, ORIGIN, null);
            }
            @Override public void onServiceDisconnected(ComponentName name) {
                resetNavigation();
            }
        };
        try { bound = CustomTabsClient.bindCustomTabsService(activity, provider, warmConnection); }
        catch (RuntimeException ignored) { bound = false; }
    }
    private void requestChannel() {
        if (closed || session == null || !useOrigin || !handleUrls || !navigated || requested) return;
        requested = session.requestPostMessageChannel(ORIGIN, ORIGIN, new Bundle());
    }
    @Override public void onRelationshipValidationResult(int relation, Uri origin, boolean result, Bundle extras) {
        delegate.onRelationshipValidationResult(relation, origin, result, extras);
        if (!ORIGIN.equals(origin)) return;
        if (relation == CustomTabsService.RELATION_USE_AS_ORIGIN) useOrigin = result;
        if (relation == CustomTabsService.RELATION_HANDLE_ALL_URLS) handleUrls = result;
        requestChannel();
    }
    @Override public void onNavigationEvent(int event, Bundle extras) {
        delegate.onNavigationEvent(event, extras);
        if (closed) return;
        if (event == NAVIGATION_STARTED) {
            // Chrome also emits STARTED for the intent that opens AdActivity.
            // Callback extras do not reliably identify its URL: defer only one
            // start with a live capability, then require a successful native claim.
            int attempt = navigation.start(ready && ads.hasPendingPresentation(), ads.presentationClaims());
            if (attempt != 0) {
                main.postDelayed(() -> {
                    if (!closed && navigation.expire(attempt, ads.presentationClaims())) resetNavigation();
                }, 1501L);
                return;
            }
            resetNavigation();
        }
        if (event == NAVIGATION_FINISHED) {
            // A real document load must always establish a new verified channel.
            if (navigation.pending()) resetNavigation();
            navigated = true; requestChannel();
        }
    }
    private void resetNavigation() {
        navigation.reset();
        navigated = requested = ready = false;
        ads.disconnected();
    }
    @Override public void onMessageChannelReady(Bundle extras) {
        if (closed || !useOrigin || !handleUrls || session == null) return;
        ready = true;
        try { send(new JSONObject().put("type", "hello").put("adMode", "production")); }
        catch (Exception ignored) { }
    }
    @Override public void onPostMessage(String raw, Bundle extras) {
        if (!ready || closed || raw == null || raw.length() > 1024) return;
        try {
            JSONObject message = new JSONObject(raw);
            if (message.optInt("tmycarAds") != 1) return;
            String epoch = message.optString("epoch");
            if (!epoch.matches("[a-f0-9-]{36}")) return;
            switch (message.optString("type")) {
                case "state": ads.state(epoch, message.optBoolean("free", false), message.optBoolean("safe", false)); break;
                case "saved":
                    String request = message.optString("request");
                    if (request.matches("[a-f0-9-]{36}")) ads.saved(request, epoch);
                    break;
                default: break;
            }
        } catch (Exception ignored) { /* Malformed/unexpected messages have no effect. */ }
    }
    private void send(JSONObject message) {
        if (!ready || closed || session == null) return;
        try { session.postMessage(message.put("tmycarAds", 1).toString(), null); }
        catch (Exception ignored) { ready = false; }
    }
    @Override public void extraCallback(String name, Bundle args) { delegate.extraCallback(name, args); }
    @Override public Bundle extraCallbackWithResult(String name, Bundle args) { return delegate.extraCallbackWithResult(name, args); }
    void close() {
        navigation.reset(); main.removeCallbacksAndMessages(null);
        closed = true; ready = false; ads.close(); session = null;
        if (bound) {
            try { activity.unbindService(warmConnection); } catch (IllegalArgumentException ignored) { }
            bound = false;
        }
    }
}
