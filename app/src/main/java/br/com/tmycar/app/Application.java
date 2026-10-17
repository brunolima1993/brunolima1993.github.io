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



public class Application extends android.app.Application {
  static final AdTransitionState adTransition = new AdTransitionState();

  @Override
  public void onCreate() {
      super.onCreate();
      registerActivityLifecycleCallbacks(new ActivityLifecycleCallbacks() {
          @Override public void onActivityStarted(android.app.Activity activity) {
              if (!(activity instanceof LauncherActivity)) adTransition.nativeStarted();
          }
          @Override public void onActivityStopped(android.app.Activity activity) {
              if (!(activity instanceof LauncherActivity)) adTransition.nativeStopped();
          }
          @Override public void onActivityCreated(android.app.Activity a, android.os.Bundle b) { }
          @Override public void onActivityResumed(android.app.Activity a) { }
          @Override public void onActivityPaused(android.app.Activity a) { }
          @Override public void onActivitySaveInstanceState(android.app.Activity a, android.os.Bundle b) { }
          @Override public void onActivityDestroyed(android.app.Activity a) { }
      });
  }
}
