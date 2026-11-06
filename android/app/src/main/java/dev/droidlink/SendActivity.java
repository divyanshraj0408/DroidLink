package dev.droidlink;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.IOException;
import java.util.ArrayList;

/**
 * Invisible activity behind "Share → Send to Mac" and the Quick Settings tile.
 * The tile path waits for window focus because Android only lets the focused app read the clipboard.
 */
public class SendActivity extends Activity {
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        Intent i = getIntent();
        if (Intent.ACTION_SEND_MULTIPLE.equals(i.getAction())) {
            ArrayList<Uri> files = i.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri.class);
            if (files != null) files.forEach(this::sendFile);
            finish();
            return;
        }
        if (!Intent.ACTION_SEND.equals(i.getAction())) return;
        Uri file = i.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class);
        String text = i.getStringExtra(Intent.EXTRA_TEXT);
        if (file != null) sendFile(file);
        else if (text != null) send(this, Link.msg("clip", "text", text));
        finish();
    }

    @Override
    public void onWindowFocusChanged(boolean focus) {
        String action = getIntent().getAction();
        if (focus && !Intent.ACTION_SEND.equals(action) && !Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            sendClipboard(this);
            finish();
        }
    }

    static void sendClipboard(Activity a) {
        ClipData c = a.getSystemService(ClipboardManager.class).getPrimaryClip();
        CharSequence t = c == null || c.getItemCount() == 0 ? null : c.getItemAt(0).coerceToText(a);
        if (t == null || t.length() == 0) {
            Toast.makeText(a, "Clipboard is empty", Toast.LENGTH_SHORT).show();
            return;
        }
        send(a, Link.msg("clip", "text", t.toString()));
    }

    static void send(Context c, JSONObject m) {
        Link link = Link.get(c);
        link.start();
        link.send(m);
        Toast.makeText(c, link.connected ? "Sent to Mac" : "Mac not connected, will send when it is",
                Toast.LENGTH_SHORT).show();
    }

    /** Streams in the background (Transfers); the notification shows progress and has Cancel. */
    private void sendFile(Uri uri) {
        try {
            Transfers.offer(this, uri);
        } catch (IOException | SecurityException e) {
            android.util.Log.w("DroidLink", "can't read shared file " + uri, e);
            Toast.makeText(this, "Couldn't read file", Toast.LENGTH_SHORT).show();
        }
    }
}
