/*
 * Copyright 2020 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package br.com.tmycar.app;

import android.net.Uri;
import android.os.Bundle;
import android.widget.ImageView;

import androidx.core.splashscreen.SplashScreen;
import androidx.browser.customtabs.CustomTabsCallback;
import androidx.browser.customtabs.CustomTabsSession;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;
import com.google.androidbrowserhelper.trusted.LauncherActivityMetadata;
import com.google.androidbrowserhelper.trusted.SessionStore;
import com.google.androidbrowserhelper.trusted.SharedPreferencesTokenStore;
import com.google.androidbrowserhelper.trusted.TwaLauncher;
import com.google.androidbrowserhelper.trusted.splashscreens.SplashScreenStrategy;



public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    private TwaAdChannel adChannel;
    private boolean browserLaunched;
    

    

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Instala a janela inicial antes de qualquer desenho da Activity, evitando o quadro branco.
        SplashScreen.installSplashScreen(this);
        // A LauncherActivity do Android Browser Helper 2.7.3 habilita edge-to-edge
        // no super.onCreate(), inclusive nas versões anteriores ao Android 15.
        super.onCreate(savedInstanceState);
    }

    @Override
    protected ImageView.ScaleType getSplashImageScaleType() {
        // A arte vertical acompanha a tela, sem deformar o nome TMyCar.
        return ImageView.ScaleType.FIT_CENTER;
    }

    @Override protected CustomTabsCallback getCustomTabsCallback() {
        if (adChannel == null) adChannel = new TwaAdChannel(this, super.getCustomTabsCallback());
        return adChannel;
    }

    @Override protected TwaLauncher createTwaLauncher() {
        LauncherActivityMetadata metadata = LauncherActivityMetadata.parse(this);
        return new TwaLauncher(this, metadata.launchingBrowser, SessionStore.makeSessionId(getTaskId()),
                new SharedPreferencesTokenStore(this)) {
            @Override public void launch(TrustedWebActivityIntentBuilder builder, CustomTabsCallback callback,
                    SplashScreenStrategy splash, Runnable completion, FallbackStrategy fallback) {
                // The public splash hook exposes the SAME session used by ABH, without reflection
                // or changing its provider selection, verification or Play Billing delegation.
                SplashScreenStrategy capture = new SplashScreenStrategy() {
                    @Override public void onTwaLaunchInitiated(String provider, TrustedWebActivityIntentBuilder intent) {
                        if (splash != null) splash.onTwaLaunchInitiated(provider, intent);
                    }
                    @Override public void configureTwaBuilder(TrustedWebActivityIntentBuilder intent,
                            CustomTabsSession session, Runnable done) {
                        if (adChannel != null) adChannel.connect(session, getProviderPackage());
                        if (splash != null) splash.configureTwaBuilder(intent, session, done); else done.run();
                    }
                };
                super.launch(builder, callback, capture, () -> {
                    // Retain this stopped Activity/service binding while Chrome is on top.
                    // ABH's default completion finishes it and would destroy the message channel.
                    browserLaunched = true;
                }, fallback);
            }
        };
    }

    @Override protected void onRestart() {
        super.onRestart();
        if (browserLaunched) finish(); // Back from Chrome ends the retained launcher.
    }
    @Override protected void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        state.putBoolean("android.support.customtabs.trusted.BROWSER_WAS_LAUNCHED_KEY", browserLaunched);
    }
    @Override protected void onDestroy() {
        if (adChannel != null) adChannel.close();
        super.onDestroy();
    }

    @Override
    protected Uri getLaunchingUrl() {
        // Get the original launch Url.
        Uri uri = super.getLaunchingUrl();

        

        return uri;
    }
}
