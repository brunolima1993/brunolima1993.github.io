package br.com.tmycar.app;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;
import org.json.JSONObject;
import java.lang.ref.WeakReference;
import java.util.UUID;

/** Main-thread only. The website receives capabilities, never auth or purchase tokens. */
final class AdCoordinator {
    // Build-selected placement; the website cannot change ad unit IDs.
    static final String AD_UNIT = BuildConfig.PRODUCTION_ADS ? "ca-app-pub-7049820367239374/1029575780" : "ca-app-pub-3940256099942544/1033173712";
    static AdCoordinator current;
    interface Sender { void send(JSONObject message); }
    private final Context context;
    private final WeakReference<Activity> launcher;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ConsentInformation consent;
    private final SharedPreferences preferences;
    private final AdPolicy policy;
    private final Sender sender;
    private String epoch = "", ticket = "", privacyTicket = UUID.randomUUID().toString();
    private boolean free, safe, closed, consentRequested, consentUpdated, initialized, initializing, loading;
    private long stateAt, armedAt, loadedAt, nextLoadAt;
    private int generation, presentationClaims;
    private InterstitialAd ad;

    AdCoordinator(Activity activity, Sender sender) {
        if (current != null) current.close();
        current = this;
        launcher = new WeakReference<>(activity);
        context = activity.getApplicationContext();
        this.sender = sender;
        consent = UserMessagingPlatform.getConsentInformation(context);
        preferences = context.getSharedPreferences("ad_frequency", Context.MODE_PRIVATE);
        policy = new AdPolicy(preferences.getLong("last_attempt", 0), System.currentTimeMillis());
    }
    void close() {
        closed = true; generation++; ad = null; ticket = "";
        if (current == this) current = null;
    }
    void disconnected() {
        state("", false, false);
    }
    void state(String newEpoch, boolean eligible, boolean safeToShow) {
        if (closed) return;
        if (!epoch.equals(newEpoch) || !eligible) {
            generation++; ad = null; loading = false; ticket = "";
        }
        epoch = newEpoch; free = eligible; safe = safeToShow;
        stateAt = SystemClock.elapsedRealtime();
        if (!safe) ticket = "";
        policy.state(epoch, free);
        if (free) prepare();
        status();
    }
    private void prepare() {
        if (!free || closed) return;
        if (!consentRequested) {
            Activity activity = launcher.get();
            if (activity == null || activity.isFinishing() || activity.isDestroyed()) return;
            consentRequested = true;
            consent.requestConsentInfoUpdate(activity, new ConsentRequestParameters.Builder().build(),
                () -> { consentUpdated = true; prepare(); status(); },
                error -> { Log.i("TMyCarAds", "Consent unavailable; skipping ads."); status(); });
            return;
        }
        // No cached consent fallback on an error. Required forms are opened only by the privacy button.
        if (!consentUpdated || !consent.canRequestAds()) return;
        if (!initialized) {
            if (initializing) return;
            initializing = true;
            new Thread(() -> {
                try {
                    MobileAds.initialize(context, result -> main.post(() -> {
                        initialized = true; initializing = false; prepare();
                    }));
                } catch (RuntimeException error) {
                    main.post(() -> { initializing = false; nextLoadAt = SystemClock.elapsedRealtime()+60_000L; });
                }
            }, "tmycar-ads-init").start();
            return;
        }
        long now = SystemClock.elapsedRealtime();
        if (ad != null && now - loadedAt >= 50 * 60_000L) ad = null;
        if (ad != null || loading || now < nextLoadAt) return;
        loading = true;
        final int requestGeneration = generation;
        try { InterstitialAd.load(context, AD_UNIT, new AdRequest.Builder().build(), new InterstitialAdLoadCallback() {
            @Override public void onAdLoaded(InterstitialAd loaded) {
                if (closed || requestGeneration != generation) return;
                loading = false;
                if (!free || !consent.canRequestAds()) return;
                ad = loaded; loadedAt = SystemClock.elapsedRealtime(); status();
            }
            @Override public void onAdFailedToLoad(LoadAdError error) {
                if (closed || requestGeneration != generation) return;
                loading = false; ad = null;
                nextLoadAt = SystemClock.elapsedRealtime() + 60_000L;
                Log.i("TMyCarAds", "Ad unavailable; maintenance remains saved.");
                status();
            }
        }); } catch (RuntimeException error) {
            loading = false; ad = null; nextLoadAt = SystemClock.elapsedRealtime()+60_000L; status();
        }
    }
    boolean bannerAllowed() { return !closed && free && consentUpdated && consent.canRequestAds() && initialized; }
    boolean ready() {
        return !closed && free && consentUpdated && consent.canRequestAds() && ad != null
            && SystemClock.elapsedRealtime() - loadedAt < 50 * 60_000L;
    }
    void saved(String requestId, String requestEpoch) {
        if (closed || !epoch.equals(requestEpoch) || !free) return;
        policy.saved();
        ticket = "";
        if (ready() && safe && policy.allowed(System.currentTimeMillis())
                && SystemClock.elapsedRealtime() - stateAt <= 3000) {
            ticket = UUID.randomUUID().toString(); armedAt = SystemClock.elapsedRealtime();
            Application.adTransition.pending(armedAt);
        }
        send("armed", requestId, ticket);
    }
    boolean hasPendingPresentation() {
        long age = SystemClock.elapsedRealtime() - armedAt;
        return !ticket.isEmpty() && age >= 0 && age <= 1500 && ready() && safe;
    }
    int presentationClaims() { return presentationClaims; }
    InterstitialAd claim(String capability) {
        boolean valid = hasPendingPresentation() && ticket.equals(capability);
        ticket = ""; // One attempt, including failed foreground/expired invocations.
        if (!valid || !policy.claim(System.currentTimeMillis())) return null;
        preferences.edit().putLong("last_attempt", System.currentTimeMillis()).apply();
        InterstitialAd result = ad; ad = null; presentationClaims++;
        status();
        return result;
    }
    boolean claimPrivacy(String capability) {
        if (closed || !privacyTicket.equals(capability)) return false;
        privacyTicket = UUID.randomUUID().toString(); ad = null; generation++; loading = false; ticket = "";
        status(); return true;
    }
    void privacy(Activity activity, Runnable finished) {
        consent.requestConsentInfoUpdate(activity, new ConsentRequestParameters.Builder().build(), () -> {
            consentUpdated = true;
            if (activity.isFinishing() || activity.isDestroyed()) return;
            if (consent.getConsentStatus() == ConsentInformation.ConsentStatus.REQUIRED) {
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity, error -> { status(); finished.run(); });
            } else if (consent.getPrivacyOptionsRequirementStatus() == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED) {
                UserMessagingPlatform.showPrivacyOptionsForm(activity, error -> { status(); finished.run(); });
            } else { status(); finished.run(); }
        }, error -> finished.run());
    }
    void status() {
        if (closed) return;
        try {
            JSONObject message = new JSONObject().put("type", "status").put("ready", ready())
                .put("adMode", "production").put("privacyToken", privacyTicket)
                .put("privacyRequired", consent.getPrivacyOptionsRequirementStatus() == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED
                    || (free && consentUpdated && !consent.canRequestAds()));
            sender.send(message);
        } catch (Exception ignored) { /* Optional ads must not crash the app. */ }
    }
    private void send(String type, String requestId, String token) {
        try { sender.send(new JSONObject().put("type", type).put("request", requestId).put("token", token)); }
        catch (Exception ignored) { }
    }
}

