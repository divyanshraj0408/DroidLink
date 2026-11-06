package dev.droidlink;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Environment;
import android.os.ParcelFileDescriptor;
import android.os.StatFs;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.text.format.Formatter;
import android.util.Log;

import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/**
 * Streaming file transfer modelled on LocalSend; the wire format is described in
 * mac/Sources/Transfers.swift. We always dial the Mac's data port, both to upload and to download,
 * and files go from disk to socket (and back) in 1 MiB encrypted chunks, so any size works.
 */
final class Transfers {
    static final int PORT = 47822;
    private static final int CHUNK = 1 << 20;
    private static final String TAG = "DroidLink";
    private static final String CHANNEL = "transfers";

    /** Files offered to the Mac, held open: a share's read grant can end when its activity does. */
    private static final Map<String, ParcelFileDescriptor> outgoing = new ConcurrentHashMap<>();
    private static final Map<String, String> names = new ConcurrentHashMap<>();
    private static final Map<String, Socket> active = new ConcurrentHashMap<>();
    /** Stopped on purpose: the thread's socket error then reads as this reason, not a failure. */
    private static final Map<String, String> stopped = new ConcurrentHashMap<>();
    private static final SecureRandom random = new SecureRandom();

    /** Offers a shared file to the Mac; the upload starts when the Mac accepts. */
    static void offer(Context c, Uri uri) throws IOException {
        ParcelFileDescriptor pfd = c.getContentResolver().openFileDescriptor(uri, "r");
        if (pfd == null) throw new IOException("no file");
        String name = uri.getLastPathSegment() != null ? uri.getLastPathSegment() : "file"; // file:// has no display name
        long size = pfd.getStatSize();
        try (Cursor q = c.getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE}, null, null, null)) {
            if (q != null && q.moveToFirst()) {
                if (q.getString(0) != null) name = q.getString(0);
                if (size < 0 && !q.isNull(1)) size = q.getLong(1);
            }
        }
        String id = UUID.randomUUID().toString();
        outgoing.put(id, pfd);
        names.put(id, name);
        Link link = Link.get(c);
        link.start();
        link.send(Link.msg("xfer_offer", "id", id, "name", name, "size", size));
        progress(c, id, name, false, 0, size, link.connected ? "Waiting for Mac…" : "Waiting for Mac to connect…");
    }

    static void handle(Context c, JSONObject m) {
        String id = m.optString("id");
        switch (m.optString("t")) {
            case "xfer_accept" -> {
                ParcelFileDescriptor pfd = outgoing.remove(id);
                if (pfd != null) new Thread(() -> upload(c, id, names.getOrDefault(id, "file"), pfd), "upload").start();
            }
            case "xfer_offer" -> {
                String name = new File(m.optString("name", "file")).getName();
                long size = m.optLong("size");
                long free = new StatFs(Environment.getExternalStorageDirectory().getPath()).getAvailableBytes();
                if (size >= free) {
                    Link.get(c).send(Link.msg("xfer_reject", "id", id, "error", "Not enough space on the phone"));
                    return;
                }
                names.put(id, name);
                new Thread(() -> download(c, id, name, size), "download").start();
            }
            case "xfer_reject", "xfer_cancel" -> stop(c, id, m.optString("error", "Cancelled on the Mac"));
            default -> { }
        }
    }

    /** The Cancel button on a progress notification. */
    public static class CancelReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context c, Intent i) {
            String id = i.getStringExtra("id");
            if (id == null) return;
            Link.get(c).send(Link.msg("xfer_cancel", "id", id, "error", "Cancelled on the phone"));
            stop(c, id, "Cancelled");
        }
    }

    private static void stop(Context c, String id, String why) {
        ParcelFileDescriptor pfd = outgoing.remove(id);
        if (pfd != null) {
            try { pfd.close(); } catch (IOException ignored) { }
        }
        Socket s = active.remove(id);
        if (s != null) {
            stopped.put(id, why);
            try { s.close(); } catch (IOException ignored) { } // the transfer thread reports it
        } else {
            done(c, id, names.getOrDefault(id, "File"), false, why, null);
        }
    }

    // MARK: Upload (phone → Mac)

    private static void upload(Context c, String id, String name, ParcelFileDescriptor pfd) {
        long size = pfd.getStatSize();
        try (pfd; Socket s = connect(c, id); InputStream in = new FileInputStream(pfd.getFileDescriptor())) {
            DataOutputStream out = new DataOutputStream(new BufferedOutputStream(s.getOutputStream(), 1 << 16));
            SecretKeySpec key = key(c);
            write(out, key, 0, Link.msg("x", "id", id, "dir", "up").toString().getBytes(StandardCharsets.UTF_8), -1);
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            byte[] buf = new byte[CHUNK];
            long sent = 0, shown = 0;
            int n;
            while ((n = in.readNBytes(buf, 0, CHUNK)) > 0) {
                sha.update(buf, 0, n);
                write(out, key, 1, buf, n);
                sent += n;
                if (System.currentTimeMillis() - shown > 500) {
                    shown = System.currentTimeMillis();
                    progress(c, id, name, false, sent, size, null);
                }
            }
            write(out, key, 2, Link.msg("x", "sha256", HexFormat.of().formatHex(sha.digest())).toString()
                    .getBytes(StandardCharsets.UTF_8), -1);
            out.flush();
            s.shutdownOutput();
            // The Mac closes once it has checked the hash; a mismatch arrives as xfer_cancel.
            while (s.getInputStream().read() != -1) { }
            done(c, id, name, false, null, null);
        } catch (Exception e) {
            String why = stopped.remove(id);
            if (why == null) Log.w(TAG, "upload failed", e);
            done(c, id, name, false, why != null ? why : "Couldn't send: " + e.getMessage(), null);
        } finally {
            active.remove(id);
        }
    }

    // MARK: Download (Mac → phone)

    private static void download(Context c, String id, String name, long size) {
        ContentResolver r = c.getContentResolver();
        ContentValues v = new ContentValues();
        v.put(MediaStore.Downloads.DISPLAY_NAME, name.isEmpty() ? "file" : name);
        v.put(MediaStore.Downloads.IS_PENDING, 1); // hidden from other apps until complete
        Uri uri = r.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
        if (uri == null) {
            Link.get(c).send(Link.msg("xfer_cancel", "id", id, "error", "The phone couldn't save it"));
            done(c, id, name, true, "Couldn't save to Downloads", null);
            return;
        }
        boolean ok = false;
        String error = null;
        try (Socket s = connect(c, id); OutputStream file = r.openOutputStream(uri)) {
            if (file == null) throw new IOException("no output");
            DataOutputStream out = new DataOutputStream(new BufferedOutputStream(s.getOutputStream()));
            DataInputStream in = new DataInputStream(new BufferedInputStream(s.getInputStream(), 1 << 16));
            SecretKeySpec key = key(c);
            write(out, key, 0, Link.msg("x", "id", id, "dir", "down").toString().getBytes(StandardCharsets.UTF_8), -1);
            out.flush();
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            long got = 0, shown = 0;
            while (true) {
                byte[] plain = read(in, key);
                if (plain[0] == 1) {
                    file.write(plain, 1, plain.length - 1);
                    sha.update(plain, 1, plain.length - 1);
                    got += plain.length - 1;
                    if (System.currentTimeMillis() - shown > 500) {
                        shown = System.currentTimeMillis();
                        progress(c, id, name, true, got, size, null);
                    }
                } else if (plain[0] == 2) {
                    String sent = new JSONObject(new String(plain, 1, plain.length - 1, StandardCharsets.UTF_8)).optString("sha256");
                    ok = sent.equals(HexFormat.of().formatHex(sha.digest()));
                    if (!ok) {
                        error = "Checksum mismatch";
                        Link.get(c).send(Link.msg("xfer_cancel", "id", id, "error", "Checksum mismatch on the phone"));
                    }
                    break;
                } else {
                    throw new IOException("bad frame");
                }
            }
        } catch (Exception e) {
            String why = stopped.remove(id);
            if (why == null) Log.w(TAG, "download failed", e);
            error = why != null ? why : "Couldn't receive: " + e.getMessage();
        } finally {
            active.remove(id);
        }
        if (ok) {
            ContentValues done = new ContentValues();
            done.put(MediaStore.Downloads.IS_PENDING, 0);
            r.update(uri, done, null, null);
            done(c, id, name, true, null, uri);
        } else {
            r.delete(uri, null, null);
            done(c, id, name, true, error, null);
        }
    }

    // MARK: Wire

    private static Socket connect(Context c, String id) throws IOException {
        String host = Link.get(c).prefs.getString("host", null);
        if (host == null) throw new IOException("not paired");
        Socket s = new Socket();
        active.put(id, s); // before connecting, so Cancel can interrupt a slow connect too
        s.connect(new InetSocketAddress(host, PORT), 5000);
        s.setSoTimeout(60_000);
        return s;
    }

    private static SecretKeySpec key(Context c) throws IOException {
        SecretKeySpec k = Link.get(c).key();
        if (k == null) throw new IOException("not paired");
        return k;
    }

    /** One frame: type byte + payload (len bytes, or all of it when len is -1), sealed like the Link's. */
    private static void write(DataOutputStream out, SecretKeySpec key, int type, byte[] payload, int len) throws Exception {
        int n = len < 0 ? payload.length : len;
        byte[] plain = new byte[n + 1];
        plain[0] = (byte) type;
        System.arraycopy(payload, 0, plain, 1, n);
        byte[] nonce = new byte[12];
        random.nextBytes(nonce);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, nonce));
        byte[] body = cipher.doFinal(plain);
        out.writeInt(nonce.length + body.length);
        out.write(nonce);
        out.write(body);
    }

    private static byte[] read(DataInputStream in, SecretKeySpec key) throws Exception {
        int n = in.readInt();
        if (n <= 28 || n > CHUNK + 64) throw new IOException("bad frame " + n);
        byte[] f = new byte[n];
        in.readFully(f);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, f, 0, 12));
        byte[] plain = cipher.doFinal(f, 12, n - 12);
        if (plain.length == 0) throw new IOException("empty frame");
        return plain;
    }

    // MARK: Notifications

    private static void progress(Context c, String id, String name, boolean incoming, long bytes, long size, String text) {
        int pct = size > 0 ? (int) (bytes * 100 / size) : 0;
        Intent cancel = new Intent(c, CancelReceiver.class).putExtra("id", id);
        Notification n = builder(c, name)
                .setSmallIcon(incoming ? android.R.drawable.stat_sys_download : android.R.drawable.stat_sys_upload)
                .setContentText(text != null ? text : (incoming ? "From Mac · " : "To Mac · ") + pct + "% of " + Formatter.formatShortFileSize(c, size))
                .setProgress(100, pct, text != null)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .addAction(new Notification.Action.Builder(null, "Cancel",
                        PendingIntent.getBroadcast(c, id.hashCode(), cancel, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT)).build())
                .build();
        c.getSystemService(NotificationManager.class).notify(id.hashCode(), n);
    }

    private static void done(Context c, String id, String name, boolean incoming, String error, Uri saved) {
        names.remove(id);
        Notification.Builder b = builder(c, error == null ? (incoming ? "Received " : "Sent ") + name : name)
                .setSmallIcon(incoming ? android.R.drawable.stat_sys_download_done : android.R.drawable.stat_sys_upload_done)
                .setContentText(error == null ? (incoming ? "Saved to Downloads" : "Sent to your Mac") : error)
                .setAutoCancel(true);
        if (saved != null) {
            Intent view = new Intent(Intent.ACTION_VIEW).setDataAndType(saved, c.getContentResolver().getType(saved))
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            b.setContentIntent(PendingIntent.getActivity(c, id.hashCode(), view, PendingIntent.FLAG_IMMUTABLE));
        }
        c.getSystemService(NotificationManager.class).notify(id.hashCode(), b.build());
    }

    private static Notification.Builder builder(Context c, String title) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel(CHANNEL, "File transfers", NotificationManager.IMPORTANCE_LOW));
        return new Notification.Builder(c, CHANNEL).setContentTitle(title);
    }

    private Transfers() { }
}
