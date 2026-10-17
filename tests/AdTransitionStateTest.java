package br.com.tmycar.app;

public class AdTransitionStateTest {
    private static void check(boolean value) { if (!value) throw new AssertionError(); }
    public static void main(String[] args) {
        AdTransitionState state = new AdTransitionState();
        check(!state.holdLauncher(1000));
        state.pending(1000); check(state.holdLauncher(2499)); check(!state.holdLauncher(2500));
        state.nativeStarted(); state.nativeStarted(); check(state.holdLauncher(9000));
        state.nativeStopped(); check(state.holdLauncher(9000));
        state.nativeStopped(); check(!state.holdLauncher(9000));
        state.nativeStopped(); state.nativeStarted(); check(state.holdLauncher(9000));
        state.nativeStopped(); check(!state.holdLauncher(9000));
        System.out.println("AdTransitionState: PASS (expiry, nested native screens, balanced cleanup)");
    }
}
