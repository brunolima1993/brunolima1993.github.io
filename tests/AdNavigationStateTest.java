package br.com.tmycar.app;

public final class AdNavigationStateTest {
    private static void check(boolean value, String reason) {
        if (!value) throw new AssertionError(reason);
    }
    public static void main(String[] args) {
        AdNavigationState nav = new AdNavigationState();
        check(nav.start(false, 0) == 0, "ordinary navigation resets immediately");
        int attempt = nav.start(true, 0);
        check(attempt != 0 && nav.pending(), "armed intent keeps loaded ad and channel");
        check(!nav.expire(attempt, 1), "native claim completes handoff without disconnect");
        check(!nav.pending(), "handoff cannot remain pending indefinitely");
        check(nav.start(false, 1) == 0, "navigation after consumed ticket resets");

        attempt = nav.start(true, 1);
        check(nav.expire(attempt, 1), "no native claim resets after bounded timeout");
        check(!nav.expire(attempt, 1), "timeout executes once");

        attempt = nav.start(true, 1);
        check(nav.start(true, 1) == 0, "second navigation cannot reuse exception");
        check(!nav.expire(attempt, 1), "old timer cannot affect newer navigation");

        attempt = nav.start(true, 1);
        nav.reset();
        check(!nav.expire(attempt, 1), "close or real document load invalidates timer");
        int next = nav.start(true, 1);
        check(!nav.expire(attempt, 1) && nav.pending(), "old timer cannot cancel new handoff");
        check(!nav.expire(next, 2), "next legitimate native claim succeeds");
        System.out.println("AdNavigationState: PASS (intent, ordinary navigation, expiry, replay, stale callbacks)");
    }
}
