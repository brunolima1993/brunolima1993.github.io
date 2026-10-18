package br.com.tmycar.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.core.content.FileProvider;
import org.json.JSONObject;
import java.io.*;
import java.util.*;

final class NativeFiles {
    private static final Map<Activity,Pending> pending=new WeakHashMap<>();
    private static final class Pending {
        final byte[] bytes; final NativeBilling.Reply reply;
        Pending(byte[] bytes,NativeBilling.Reply reply) { this.bytes=bytes; this.reply=reply; }
    }
    static void export(Activity activity,JSONObject args,boolean share,NativeBilling.Reply reply) {
        try {
            String mime=args.optString("mime");
            if (!Arrays.asList("application/pdf","application/json","text/csv","image/png","image/jpeg","text/plain").contains(mime))
                throw new IOException("Formato não permitido");
            String name=args.optString("name","tmycar").replaceAll("[^a-zA-Z0-9._-]","_");
            if(name.length()>100) name=name.substring(name.length()-100);
            byte[] bytes=Base64.decode(args.optString("base64"),Base64.DEFAULT);
            if(bytes.length==0 || bytes.length>10*1024*1024) throw new IOException("Arquivo muito grande");
            if(!share) {
                if(pending.containsKey(activity)) { reply.done(null,"Já existe um arquivo aguardando destino."); return; }
                pending.put(activity,new Pending(bytes,reply));
                activity.startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                    .setType(mime).putExtra(Intent.EXTRA_TITLE,name),43);
                return;
            }
            File directory=new File(activity.getCacheDir(),"exports");
            if(!directory.isDirectory() && !directory.mkdirs()) throw new IOException("Storage unavailable");
            File[] old=directory.listFiles();
            if(old!=null) for(File item:old) if(item.isFile() && System.currentTimeMillis()-item.lastModified()>86_400_000L) item.delete();
            File file=new File(directory,UUID.randomUUID()+"-"+name);
            try(FileOutputStream out=new FileOutputStream(file)) { out.write(bytes); }
            Uri uri=FileProvider.getUriForFile(activity,activity.getPackageName()+".fileprovider",file);
            Intent intent=new Intent(Intent.ACTION_SEND).setType(mime).putExtra(Intent.EXTRA_STREAM,uri)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            activity.startActivity(Intent.createChooser(intent,"Compartilhar arquivo")); reply.done(true,null);
        } catch(Exception error) { pending.remove(activity); reply.done(null,"Não foi possível exportar o arquivo."); }
    }
    static void result(Activity activity,int result,Intent data) {
        Pending item=pending.remove(activity); if(item==null) return;
        if(result!=Activity.RESULT_OK || data==null || data.getData()==null) { item.reply.done(null,"AbortError"); return; }
        try(OutputStream out=activity.getContentResolver().openOutputStream(data.getData(),"wt")) {
            if(out==null) throw new IOException("No destination");
            out.write(item.bytes); item.reply.done(true,null);
        } catch(Exception error) { item.reply.done(null,"Não foi possível salvar o arquivo."); }
    }
    static void close(Activity activity) { pending.remove(activity); }
}
