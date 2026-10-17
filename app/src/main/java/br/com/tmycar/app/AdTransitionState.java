package br.com.tmycar.app;

/** Only delays launcher cleanup during a foreground handoff. Never authorizes an ad. */
final class AdTransitionState {
    private int visibleNativeScreens;
    private long pendingUntil;
    void pending(long now) { pendingUntil = now + 1500L; }
    void nativeStarted() { visibleNativeScreens++; }
    void nativeStopped() { visibleNativeScreens = Math.max(0, visibleNativeScreens - 1); }
    boolean holdLauncher(long now) { return visibleNativeScreens > 0 || now < pendingUntil; }
}
