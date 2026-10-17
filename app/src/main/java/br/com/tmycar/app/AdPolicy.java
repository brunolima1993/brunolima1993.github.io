package br.com.tmycar.app;

/** Pure policy: no network, identifiers, SDK calls or Android dependencies. */
final class AdPolicy {
    static final long COOLDOWN_MS = 5 * 60_000L;
    private long lastAttempt;
    private int saves;
    private boolean eligible;
    private String epoch = "";

    AdPolicy(long lastAttempt, long now) {
        this.lastAttempt = Math.min(lastAttempt, now);
    }
    void state(String epoch, boolean eligible) {
        if (!this.epoch.equals(epoch) || !eligible) saves = 0;
        this.epoch = epoch;
        this.eligible = eligible;
    }
    void saved() { if (eligible) saves = Math.min(2, saves + 1); }
    boolean allowed(long now) {
        return eligible && saves >= 2 && (lastAttempt == 0 || now - lastAttempt >= COOLDOWN_MS);
    }
    boolean claim(long now) {
        if (!allowed(now)) return false;
        lastAttempt = now;
        saves = 0;
        return true;
    }
}
