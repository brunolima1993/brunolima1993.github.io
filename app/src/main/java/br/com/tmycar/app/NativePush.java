package br.com.tmycar.app;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public final class NativePush extends FirebaseMessagingService {
    static final String CHANNEL="maintenance";
    static boolean configured(Context context) { return !FirebaseApp.getApps(context).isEmpty(); }
    static String permission(Context context) {
        if(Build.VERSION.SDK_INT>=33 && ContextCompat.checkSelfPermission(context,Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)
            return "default";
        return NotificationManagerCompat.from(context).areNotificationsEnabled()?"granted":"denied";
    }
    static void token(Context context,NativeBilling.Reply reply) {
        if(!configured(context)) { reply.done(null,"Cadastre o app Android no Firebase para ativar os avisos com o app fechado."); return; }
        FirebaseMessaging.getInstance().getToken().addOnSuccessListener(value -> reply.done(value,null))
            .addOnFailureListener(error -> reply.done(null,"Não foi possível registrar as notificações."));
    }
    static void remove(Context context,NativeBilling.Reply reply) {
        if(!configured(context)) { reply.done(true,null); return; }
        FirebaseMessaging.getInstance().setAutoInitEnabled(false);
        FirebaseMessaging.getInstance().deleteToken().addOnSuccessListener(value -> reply.done(true,null))
            .addOnFailureListener(error -> reply.done(null,"Não foi possível cancelar o registro de notificações agora."));
    }
    static void show(Context context,String title,String body,String tag) {
        if(!"granted".equals(permission(context))) return;
        NotificationManager manager=(NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
        if(Build.VERSION.SDK_INT>=26) manager.createNotificationChannel(new NotificationChannel(CHANNEL,"Manutenções",NotificationManager.IMPORTANCE_DEFAULT));
        Intent open=new Intent(context,NativeActivity.class).putExtra("openNotices",true).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending=PendingIntent.getActivity(context,0,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder notification=new NotificationCompat.Builder(context,CHANNEL).setSmallIcon(R.drawable.ic_notification_icon)
            .setContentTitle(title).setContentText(body).setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(pending).setAutoCancel(true);
        try { manager.notify(tag.hashCode(),notification.build()); } catch(SecurityException ignored) { }
    }
    @Override public void onMessageReceived(RemoteMessage message) {
        RemoteMessage.Notification notification=message.getNotification();
        if(notification!=null) show(this,notification.getTitle()==null?"TMy Car":notification.getTitle(),
            notification.getBody()==null?"Confira suas manutenções.":notification.getBody(),message.getData().getOrDefault("tag","maintenance"));
    }
}
