package br.com.tmycar.app;

import android.app.Activity;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.LoadAdError;

/** Main-thread only. Requires a dedicated native slot, never an overlay on web controls. */
final class BannerController {
    static final String PRODUCTION_UNIT = "ca-app-pub-7049820367239374/4477612615";
    static final String TEST_UNIT = "ca-app-pub-3940256099942544/9214589741";
    private static final long RETRY_MS = 60_000L;

    private final Activity activity;
    private final FrameLayout slot;
    private final String unit;
    private AdView ad;
    private String account = "";
    private int generation, widthDp;
    private long retryAt;
    private boolean closed;

    /** The build selects production; JavaScript must not choose ad unit IDs. */
    BannerController(Activity activity, FrameLayout slot, boolean production) {
        this.activity = activity;
        this.slot = slot;
        unit = production ? PRODUCTION_UNIT : TEST_UNIT;
        slot.setVisibility(View.GONE);
    }

    /**
     * free must come from the resolved subscription state, excluding trials and local accounts.
     * consentAndSdkReady is true only after a successful UMP update, canRequestAds and SDK init.
     * safe is false on forms, dialogs, checkout, onboarding and while the keyboard is open.
     */
    void update(String accountKey, boolean free, boolean foreground, boolean safe,
                boolean consentAndSdkReady, int availableWidthPx) {
        if (closed) return;
        String nextAccount = accountKey == null ? "" : accountKey;
        if (!account.equals(nextAccount)) {
            clear();
            account = nextAccount;
            retryAt = 0;
        }
        if (account.isEmpty() || !free || !foreground || !safe || !consentAndSdkReady
                || activity.isFinishing() || activity.isDestroyed()) {
            clear();
            return;
        }
        int nextWidth = (int) (availableWidthPx / activity.getResources().getDisplayMetrics().density);
        if (nextWidth < 250) { clear(); return; }
        if (ad != null && nextWidth != widthDp) clear();
        if (ad != null || SystemClock.elapsedRealtime() < retryAt) return;

        widthDp = nextWidth;
        final int requestGeneration = ++generation;
        final AdView requested = new AdView(activity);
        ad = requested;
        AdSize size = AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity, widthDp);
        requested.setAdUnitId(unit);
        requested.setAdSize(size);
        requested.setAdListener(new AdListener() {
            @Override public void onAdLoaded() {
                if (closed || requestGeneration != generation || ad != requested) return;
                // Only the dedicated slot expands. The host lays content and navigation around it.
                slot.setVisibility(View.VISIBLE);
            }
            @Override public void onAdFailedToLoad(LoadAdError error) {
                if (closed || requestGeneration != generation || ad != requested) return;
                clear();
                retryAt = SystemClock.elapsedRealtime() + RETRY_MS;
            }
        });
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                size.getWidthInPixels(activity), size.getHeightInPixels(activity), Gravity.CENTER);
        slot.addView(requested, params);
        // No blank advertising rectangle while loading or on a no-fill response.
        try { requested.loadAd(new AdRequest.Builder().build()); }
        catch (RuntimeException error) {
            clear();
            retryAt = SystemClock.elapsedRealtime() + RETRY_MS;
        }
    }

    /** Call synchronously on pause, logout and any change that makes the slot unsafe. */
    void hide() { clear(); }

    void close() {
        closed = true;
        clear();
    }

    private void clear() {
        generation++;
        slot.setVisibility(View.GONE);
        AdView previous = ad;
        ad = null;
        slot.removeAllViews();
        if (previous != null) {
            previous.setAdListener(null);
            previous.destroy();
        }
    }
}
