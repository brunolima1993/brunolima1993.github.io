package br.com.tmycar.app;
public class AdPolicyTest {
    private static void check(boolean condition) { if (!condition) throw new AssertionError(); }
    public static void main(String[] args) {
        long now=1000000;
        AdPolicy policy=new AdPolicy(0,now);
        policy.saved(); check(!policy.allowed(now));
        policy.state("one",true); policy.saved(); check(!policy.allowed(now));
        policy.saved(); check(policy.claim(now)); check(!policy.claim(now));
        policy.saved(); policy.saved(); check(!policy.allowed(now+299999));
        check(policy.claim(now+300000));
        policy.saved(); policy.saved(); policy.state("two",true); check(!policy.allowed(now+600000));
        policy.saved(); policy.saved(); policy.state("two",false); check(!policy.allowed(now+600000));
        AdPolicy restored=new AdPolicy(now,now+1000);restored.state("one",true);
        restored.saved();restored.saved();check(!restored.allowed(now+299999));check(restored.allowed(now+300000));
        AdPolicy future=new AdPolicy(now+900000,now);future.state("one",true);future.saved();future.saved();
        check(!future.allowed(now));check(future.allowed(now+300000));
        System.out.println("AdPolicy: PASS (frequency, account isolation, premium, restart, clock rollback)");
    }
}
