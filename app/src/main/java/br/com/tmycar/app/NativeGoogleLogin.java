package br.com.tmycar.app;

import android.app.Activity;
import android.os.CancellationSignal;
import androidx.core.content.ContextCompat;
import androidx.credentials.*;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.ClearCredentialException;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import java.util.UUID;
import org.json.JSONObject;
import android.util.Base64;
import java.nio.charset.StandardCharsets;

final class NativeGoogleLogin {
    private final Activity activity;
    private final CredentialManager manager;
    private CancellationSignal pending;
    NativeGoogleLogin(Activity activity) { this.activity=activity; manager=CredentialManager.create(activity); }
    void signIn(NativeBilling.Reply reply) {
        if (pending!=null) { reply.done(null,"O login já está em andamento."); return; }
        final String nonce=UUID.randomUUID().toString();
        final CancellationSignal signal=new CancellationSignal(); pending=signal;
        GetCredentialRequest request=new GetCredentialRequest.Builder().addCredentialOption(
            new GetSignInWithGoogleOption.Builder(activity.getString(R.string.google_web_client_id)).setNonce(nonce).build()).build();
        manager.getCredentialAsync(activity,request,signal,ContextCompat.getMainExecutor(activity),
            new CredentialManagerCallback<GetCredentialResponse,GetCredentialException>() {
                @Override public void onResult(GetCredentialResponse response) {
                    if (pending!=signal) return; pending=null;
                    try {
                        Credential credential=response.getCredential();
                        if (!(credential instanceof CustomCredential)
                            || !GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType()))
                            throw new IllegalArgumentException("Unexpected credential");
                        String token=GoogleIdTokenCredential.createFrom(credential.getData()).getIdToken();
                        String[] parts=token.split("\\.");
                        JSONObject payload=new JSONObject(new String(Base64.decode(parts[1],Base64.URL_SAFE),StandardCharsets.UTF_8));
                        if (!nonce.equals(payload.optString("nonce"))) throw new IllegalArgumentException("Nonce mismatch");
                        // Firebase validates signature, audience and expiry before establishing a session.
                        reply.done(new JSONObject().put("idToken",token),null);
                    } catch(Exception error) { reply.done(null,"Não foi possível validar o retorno do login Google."); }
                }
                @Override public void onError(GetCredentialException error) {
                    if (pending!=signal) return; pending=null;
                    String type=error.getType();
                    reply.done(null,type.contains("CANCELED") ? "AbortError" :
                        "Não foi possível entrar com Google. Confira o cadastro Android e o certificado no Firebase.");
                }
            });
    }
    void reset() { if (pending!=null) pending.cancel(); pending=null; }
    void signOut() {
        reset();
        manager.clearCredentialStateAsync(new ClearCredentialStateRequest(),null,ContextCompat.getMainExecutor(activity),
            new CredentialManagerCallback<Void,ClearCredentialException>() {
                @Override public void onResult(Void ignored) { }
                @Override public void onError(ClearCredentialException ignored) { }
            });
    }
}
