package br.com.tmycar.app;

/** Bounded deferral of one navigation event; never grants permission to show an ad. */
final class AdNavigationState {
    private int revision, claimsBefore;
    private boolean pending;

    int start(boolean authorized, int claims) {
        boolean defer = authorized && !pending;
        revision++;
        pending = defer;
        claimsBefore = claims;
        return defer ? revision : 0;
    }
    boolean pending() { return pending; }
    boolean expire(int attempt, int claims) {
        if (!pending || attempt != revision) return false;
        pending = false;
        return claims == claimsBefore;
    }
    void reset() { revision++; pending = false; }
}
