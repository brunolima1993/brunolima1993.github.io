package br.com.tmycar.app;

import android.app.Activity;
import android.net.Uri;
import android.os.Bundle;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.interstitial.InterstitialAd;

/** Foreground comes from a user-gesture Chrome intent, never a background callback. */
public final class AdActivity extends Activity {
    private boolean started;
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        if (state != null) {
            finish();
        } // Do not replay an ad on process recreation/rotation.
    }
    @Override protected void onPostResume() {
        super.onPostResume();
        if (started || isFinishing()) return;
        started = true;
        Uri uri = getIntent().getData();
        AdCoordinator coordinator = AdCoordinator.current;
        if (coordinator == null) { finish(); return; }
        if (uri == null || !"tmycar-ads".equals(uri.getScheme())) { finish(); return; }
        String token = uri.getQueryParameter("token");
        if ("privacy".equals(uri.getHost())) {
            if (!coordinator.claimPrivacy(token)) { finish(); return; }
            coordinator.privacy(this, this::finish);
            return;
        }
        if (!"maintenance".equals(uri.getHost())) { finish(); return; }
        InterstitialAd ad = coordinator.claim(token);
        if (ad == null) { finish(); return; } // No loading/spinner/delayed show here.
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override public void onAdDismissedFullScreenContent() { finish(); }
            @Override public void onAdFailedToShowFullScreenContent(AdError error) { finish(); }
        });
        try { ad.show(this); } catch (RuntimeException ignored) { finish(); }
    }
}
