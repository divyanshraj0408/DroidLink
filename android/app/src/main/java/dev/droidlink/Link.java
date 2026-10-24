package dev.droidlink;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import android.net.LinkAddress;
import android.net.LinkProperties;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.net.Inet4Address;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.ArrayDeque;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * Encrypted TCP link to the Mac. Each frame is a 4-byte big-endian length followed by
 * AES-GCM(nonce | ciphertext | tag) of a JSON object. We connect to the Mac and keep reconnecting.
 */
final class Link {
    static final int PORT = 47821;
    static final int MAX_FILE = 50 << 20;
    private static final int MAX_FRAME = 80 << 20;
    private static final String TAG = "DroidLink";
    private static Link instance;

    static synchronized Link get(Context c) {
        if (instance == null) instance = new Link(c.getApplicationContext());
        return instance;
    }

    static JSONObject msg(String type, Object... kv) {
        JSONObject o = new JSONObject();
        try {
            o.put("t", type);
            for (int i = 0; i < kv.length; i += 2) o.put((String) kv[i], kv[i + 1]);
        } catch (JSONException e) {
            throw new IllegalArgumentException(e);
        }
        return o;
    }

    final SharedPreferences prefs;
    volatile boolean connected;
    volatile Runnable onState;

    private final Context ctx;
    private final Handler main = new Handler(Looper.getMainLooper());
    // Every write, and the pending queue, lives on this one thread.
    private final ScheduledExecutorService out = Executors.newSingleThreadScheduledExecutor();
    private final ArrayDeque<JSONObject> pending = new ArrayDeque<>();
    private final SecureRandom random = new SecureRandom();
    private final Object wake = new Object();
    private volatile Socket socket;
    private volatile DataOutputStream os;
    private boolean started;

    private Link(Context ctx) {
        this.ctx = ctx;
        prefs = ctx.getSharedPreferences("link", Context.MODE_PRIVATE);
        out.scheduleWithFixedDelay(() -> { if (os != null) write(msg("ping")); }, 30, 30, TimeUnit.SECONDS);
    }

    synchronized void start() {
        if (started) return;
        started = true;
        new Thread(this::run, "link").start();
    }

    void pair(String key, String host) {
        prefs.edit().putString("key", key).putString("host", host).apply();
        out.execute(this::closeSocket);
        synchronized (wake) { wake.notifyAll(); }
        start();
    }

    /** Sends now, or queues until the Mac is reachable. */
    void send(JSONObject m) {
        out.execute(() -> write(m));
    }

    private void write(JSONObject m) {
        DataOutputStream o = os;
        if (o != null) {
            try {
                m.put("ts", System.currentTimeMillis());
                byte[] nonce = new byte[12];
                random.nextBytes(nonce);
                Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
                c.init(Cipher.ENCRYPT_MODE, key(), new GCMParameterSpec(128, nonce));
                byte[] body = c.doFinal(m.toString().getBytes(StandardCharsets.UTF_8));
                o.writeInt(nonce.length + body.length);
                o.write(nonce);
                o.write(body);
                o.flush();
                return;
            } catch (Exception e) {
                Log.w(TAG, "send failed: " + e);
                closeSocket();
            }
        }
        if (m.optString("t").equals("ping")) return;
        if (pending.size() >= 50) pending.removeFirst();
        pending.addLast(m);
    }

    private void run() {
        long backoff = 1000;
        while (true) {
            String host = prefs.getString("host", null);
            SecretKeySpec key = key();
            if (host != null && key != null) {
                try (Socket s = new Socket()) {
                    s.connect(new InetSocketAddress(host, PORT), 5000);
                    s.setSoTimeout(75_000); // the Mac answers our 30 s pings
                    socket = s;
                    DataInputStream in = new DataInputStream(new BufferedInputStream(s.getInputStream()));
                    DataOutputStream o = new DataOutputStream(new BufferedOutputStream(s.getOutputStream()));
                    out.execute(() -> {
                        if (socket != s) return;
                        os = o;
                        write(msg("hello", "name", deviceName()));
                        while (os != null && !pending.isEmpty()) write(pending.removeFirst());
                    });
                    setConnected(true);
                    backoff = 1000;
                    while (true) handle(read(in, key));
                } catch (Exception e) {
                    Log.i(TAG, "link down: " + e);
                } finally {
                    out.execute(this::closeSocket);
                    setConnected(false);
                }
                discover();
            }
            synchronized (wake) {
                try { wake.wait(backoff); } catch (InterruptedException ignored) { }
            }
            backoff = Math.min(backoff * 2, 30_000);
        }
    }

    private static JSONObject read(DataInputStream in, SecretKeySpec key) throws Exception {
        int n = in.readInt();
        if (n <= 28 || n > MAX_FRAME) throw new IOException("bad frame " + n);
        byte[] f = new byte[n];
        in.readFully(f);
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, f, 0, 12));
        JSONObject m = new JSONObject(new String(c.doFinal(f, 12, n - 12), StandardCharsets.UTF_8));
        if (Math.abs(System.currentTimeMillis() - m.optLong("ts")) > 120_000) throw new IOException("stale frame");
        return m;
    }

    private void handle(JSONObject m) {
        switch (m.optString("t")) {
            case "clip" -> main.post(() -> ctx.getSystemService(ClipboardManager.class)
                    .setPrimaryClip(ClipData.newPlainText("Mac", m.optString("text"))));
            case "reply" -> Listener.reply(m.optString("id"), m.optString("text"));
            case "file" -> saveFile(m.optString("name"), Base64.decode(m.optString("data"), Base64.DEFAULT));
            case "sms_threads" -> send(Sms.threads(ctx));
            case "sms_thread" -> send(Sms.thread(ctx, m.optLong("thread")));
            case "contacts" -> send(Sms.contacts(ctx));
            case "sms_send" -> send(Sms.send(ctx, m.optString("to"), m.optString("text")));
            case "call_answer" -> CallReceiver.answer(ctx);
            case "call_end" -> CallReceiver.end(ctx);
            case "call_dial" -> CallReceiver.dial(ctx, m.optString("number"));
            default -> { }
        }
    }

    private void saveFile(String name, byte[] data) {
        name = new File(name).getName();
        ContentResolver r = ctx.getContentResolver();
        ContentValues v = new ContentValues();
        v.put(MediaStore.Downloads.DISPLAY_NAME, name.isEmpty() ? "file" : name);
        Uri uri = r.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
        if (uri == null) return;
        try (OutputStream o = r.openOutputStream(uri)) {
            o.write(data);
        } catch (IOException | NullPointerException e) {
            Log.w(TAG, "save failed", e);
            return;
        }
        Intent view = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, r.getType(uri))
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel("files", "Files from Mac", NotificationManager.IMPORTANCE_DEFAULT));
        nm.notify(uri.hashCode(), new Notification.Builder(ctx, "files")
                .setSmallIcon(android.R.drawable.stat_sys_download_done)
                .setContentTitle("Received " + name)
                .setContentIntent(PendingIntent.getActivity(ctx, uri.hashCode(), view, PendingIntent.FLAG_IMMUTABLE))
                .setAutoCancel(true)
                .build());
    }

    /** The Mac's IP can change; look it up over Bonjour and remember the new one. */
    @SuppressWarnings("deprecation") // resolveService/getHost: fine for one service at a time
    private void discover() {
        NsdManager nsd = ctx.getSystemService(NsdManager.class);
        CountDownLatch found = new CountDownLatch(1);
        NsdManager.DiscoveryListener dl = new NsdManager.DiscoveryListener() {
            @Override public void onServiceFound(NsdServiceInfo s) {
                nsd.resolveService(s, new NsdManager.ResolveListener() {
                    @Override public void onServiceResolved(NsdServiceInfo r) {
                        prefs.edit().putString("host", r.getHost().getHostAddress()).apply();
                        found.countDown();
                    }
                    @Override public void onResolveFailed(NsdServiceInfo r, int err) { }
                });
            }
            @Override public void onDiscoveryStarted(String type) { }
            @Override public void onDiscoveryStopped(String type) { }
            @Override public void onServiceLost(NsdServiceInfo s) { }
            @Override public void onStartDiscoveryFailed(String type, int err) { found.countDown(); }
            @Override public void onStopDiscoveryFailed(String type, int err) { }
        };
        try {
            nsd.discoverServices("_droidlink._tcp", NsdManager.PROTOCOL_DNS_SD, dl);
            if (!found.await(4, TimeUnit.SECONDS)) sweep();
            nsd.stopServiceDiscovery(dl);
        } catch (Exception ignored) { }
    }

    /**
     * Fallback for routers that drop multicast (Bonjour): try our port on every address in the Wi-Fi /24.
     * The first host with it open wins; a wrong host can't decrypt anything, it just fails to connect.
     */
    // ponytail: /24 only; larger home subnets would need the real prefix length.
    private void sweep() throws InterruptedException {
        ConnectivityManager cm = ctx.getSystemService(ConnectivityManager.class);
        Network net = cm.getActiveNetwork();
        NetworkCapabilities caps = cm.getNetworkCapabilities(net);
        LinkProperties lp = cm.getLinkProperties(net);
        if (caps == null || lp == null || !caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) return;
        byte[] self = null;
        for (LinkAddress a : lp.getLinkAddresses()) {
            if (a.getAddress() instanceof Inet4Address) self = a.getAddress().getAddress();
        }
        if (self == null) return;
        String prefix = (self[0] & 255) + "." + (self[1] & 255) + "." + (self[2] & 255) + ".";
        AtomicReference<String> hit = new AtomicReference<>();
        ExecutorService pool = Executors.newFixedThreadPool(32);
        for (int i = 1; i < 255; i++) {
            String ip = prefix + i;
            if (i == (self[3] & 255)) continue;
            pool.execute(() -> {
                if (hit.get() != null) return;
                try (Socket s = new Socket()) {
                    s.connect(new InetSocketAddress(ip, PORT), 400);
                    hit.compareAndSet(null, ip);
                } catch (IOException ignored) { }
            });
        }
        pool.shutdown();
        pool.awaitTermination(10, TimeUnit.SECONDS);
        if (hit.get() != null) prefs.edit().putString("host", hit.get()).apply();
    }

    private void closeSocket() {
        os = null;
        Socket s = socket;
        socket = null;
        if (s != null) {
            try { s.close(); } catch (IOException ignored) { }
        }
    }

    private void setConnected(boolean up) {
        connected = up;
        Runnable r = onState;
        if (r != null) main.post(r);
    }

    private SecretKeySpec key() {
        String k = prefs.getString("key", null);
        return k == null ? null : new SecretKeySpec(Base64.decode(k, Base64.DEFAULT), "AES");
    }

    private String deviceName() {
        String n = Settings.Global.getString(ctx.getContentResolver(), Settings.Global.DEVICE_NAME);
        return n != null ? n : Build.MODEL;
    }
}
