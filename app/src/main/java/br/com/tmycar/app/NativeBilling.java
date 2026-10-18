package br.com.tmycar.app;

import android.app.Activity;
import com.android.billingclient.api.*;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.*;
import java.math.BigDecimal;

/** Store results are returned to the existing server verifier; this class never grants Premium. */
final class NativeBilling implements PurchasesUpdatedListener {
    interface Reply { void done(Object result, String error); }
    private final Activity activity;
    private final BillingClient client;
    private final Map<String, ProductDetails> products = new HashMap<>();
    private final Map<String, String> offers = new HashMap<>();
    private final List<Runnable> waiting = new ArrayList<>();
    private final List<Reply> failures = new ArrayList<>();
    private boolean connecting, closed;
    private Reply purchaseReply;
    private String expectedProduct;
    private int generation;
    static boolean allowed(String id) {
        return "tmycar_premium".equals(id) || "tmycar_premium_anual".equals(id);
    }
    NativeBilling(Activity activity) {
        this.activity = activity;
        client = BillingClient.newBuilder(activity).setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection().build();
    }
    private void connect(Runnable action, Reply reply) {
        if (closed) { reply.done(null, "Conexão encerrada."); return; }
        if (client.isReady()) { action.run(); return; }
        waiting.add(action); failures.add(reply);
        if (connecting) return;
        connecting = true;
        client.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult result) {
                connecting = false;
                List<Runnable> actions = new ArrayList<>(waiting);
                List<Reply> replies = new ArrayList<>(failures);
                waiting.clear(); failures.clear();
                if (closed) return;
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    for (Runnable run : actions) run.run();
                } else for (Reply failure : replies) failure.done(null, error(result));
            }
            @Override public void onBillingServiceDisconnected() { connecting = false; }
        });
    }
    void details(JSONArray ids, Reply reply) {
        List<QueryProductDetailsParams.Product> requested = new ArrayList<>();
        if (ids.length() == 0 || ids.length() > 2) { reply.done(null,"Produtos inválidos."); return; }
        for (int i=0;i<ids.length();i++) {
            String id = ids.optString(i);
            if (!allowed(id)) { reply.done(null,"Produto inválido."); return; }
            requested.add(QueryProductDetailsParams.Product.newBuilder().setProductId(id)
                .setProductType(BillingClient.ProductType.SUBS).build());
        }
        final int requestGeneration = generation;
        connect(() -> client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder()
            .setProductList(requested).build(), (result, query) -> activity.runOnUiThread(() -> {
                if (closed || generation != requestGeneration) return;
                if (result.getResponseCode()!=BillingClient.BillingResponseCode.OK) {
                    reply.done(null,error(result)); return;
                }
                JSONArray response = new JSONArray();
                for (ProductDetails product : query.getProductDetailsList()) {
                    if (!allowed(product.getProductId()) || product.getSubscriptionOfferDetails()==null) continue;
                    String period = product.getProductId().endsWith("_anual") ? "P1Y" : "P1M";
                    ProductDetails.SubscriptionOfferDetails selected = null;
                    ProductDetails.PricingPhase price = null;
                    for (ProductDetails.SubscriptionOfferDetails offer : product.getSubscriptionOfferDetails()) {
                        if (offer.getOfferId()!=null) continue; // The app's trial is managed by its server.
                        List<ProductDetails.PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
                        if (phases.size()!=1 || !period.equals(phases.get(0).getBillingPeriod())) continue;
                        if (selected!=null) { selected=null; price=null; break; } // Ambiguous catalog: do not guess.
                        selected=offer; price=phases.get(0);
                    }
                    if (selected==null || price==null) continue;
                    products.put(product.getProductId(),product);
                    offers.put(product.getProductId(),selected.getOfferToken());
                    try {
                        response.put(new JSONObject().put("itemId",product.getProductId()).put("title",product.getTitle())
                            .put("price",new JSONObject().put("currency",price.getPriceCurrencyCode())
                                .put("value",BigDecimal.valueOf(price.getPriceAmountMicros(),6).toPlainString())));
                    } catch (Exception ignored) { }
                }
                reply.done(response,null);
            })), reply);
    }
    void purchases(Reply reply) {
        final int requestGeneration = generation;
        connect(() -> client.queryPurchasesAsync(QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.SUBS).build(), (result, purchases) -> activity.runOnUiThread(() -> {
                if (closed || generation != requestGeneration) return;
                if (result.getResponseCode()!=BillingClient.BillingResponseCode.OK) { reply.done(null,error(result)); return; }
                JSONArray response = new JSONArray();
                for (Purchase purchase : purchases) {
                    if (purchase.getPurchaseState()!=Purchase.PurchaseState.PURCHASED) continue;
                    for (String product : purchase.getProducts()) if (allowed(product)) response.put(receipt(purchase,product));
                }
                reply.done(response,null);
            })), reply);
    }
    void buy(JSONObject args, Reply reply) {
        String sku = args.optString("sku");
        if (closed || purchaseReply!=null) { reply.done(null,"Já existe uma compra em andamento."); return; }
        ProductDetails product = products.get(sku);
        String offer = offers.get(sku);
        if (!allowed(sku) || product==null || offer==null || !client.isReady()) {
            reply.done(null,"Consulte os planos novamente antes de comprar."); return;
        }
        BillingFlowParams.Builder params = BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(
            BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product).setOfferToken(offer).build()));
        String old = args.optString("oldSku");
        if (!old.isEmpty()) {
            if (!allowed(old) || sku.equals(old) || args.optString("purchaseToken").isEmpty()) {
                reply.done(null,"Assinatura anterior inválida."); return;
            }
            params.setSubscriptionUpdateParams(BillingFlowParams.SubscriptionUpdateParams.newBuilder()
                .setOldPurchaseToken(args.optString("purchaseToken"))
                .setSubscriptionReplacementMode(BillingFlowParams.SubscriptionUpdateParams.ReplacementMode.WITH_TIME_PRORATION).build());
        }
        purchaseReply=reply; expectedProduct=sku;
        BillingResult result=client.launchBillingFlow(activity,params.build());
        if (result.getResponseCode()!=BillingClient.BillingResponseCode.OK) finish(null,error(result));
    }
    @Override public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        activity.runOnUiThread(() -> {
            if (closed || purchaseReply==null) return;
            if (result.getResponseCode()!=BillingClient.BillingResponseCode.OK) { finish(null,error(result)); return; }
            if (purchases!=null) for (Purchase purchase : purchases) {
                if (!purchase.getProducts().contains(expectedProduct)) continue;
                if (purchase.getPurchaseState()==Purchase.PurchaseState.PURCHASED) {
                    finish(receipt(purchase,expectedProduct),null); return;
                }
                if (purchase.getPurchaseState()==Purchase.PurchaseState.PENDING) {
                    finish(null,"Pagamento pendente. O Premium será liberado após a confirmação."); return;
                }
            }
            finish(null,"Não foi possível confirmar a compra. Consulte seus planos novamente.");
        });
    }
    private JSONObject receipt(Purchase purchase, String product) {
        try { return new JSONObject().put("itemId",product).put("productId",product).put("purchaseToken",purchase.getPurchaseToken()); }
        catch(Exception ignored) { return new JSONObject(); }
    }
    private void finish(Object result, String error) {
        Reply reply=purchaseReply; purchaseReply=null; expectedProduct=null;
        if (reply!=null) reply.done(result,error);
    }
    private static String error(BillingResult result) {
        return result.getResponseCode()==BillingClient.BillingResponseCode.USER_CANCELED ? "AbortError" :
            "Google Play indisponível ("+result.getResponseCode()+"). Tente novamente.";
    }
    void reset() { generation++; products.clear(); offers.clear(); waiting.clear(); failures.clear(); finish(null,"Página alterada. Consulte seus planos novamente."); }
    void close() { closed=true; reset(); client.endConnection(); }
}
