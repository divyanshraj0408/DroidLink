package dev.droidlink;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;

/**
 * Invisible activity behind "Share → Send to Mac" and the Quick Settings tile.
 * The tile path waits for window focus because Android only lets the focused app read the clipboard.
 */
public class SendActivity extends Activity {
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        Intent i = getIntent();
        if (!Intent.ACTION_SEND.equals(i.getAction())) return;
        Uri file = i.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class);
        String text = i.getStringExtra(Intent.EXTRA_TEXT);
        if (file != null) sendFile(file);
        else if (text != null) send(this, Link.msg("clip", "text", text));
        finish();
    }

    @Override
    public void onWindowFocusChanged(boolean focus) {
        if (focus && !Intent.ACTION_SEND.equals(getIntent().getAction())) {
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

    // ponytail: reads the whole file on the main thread; move to a background thread if 50 MB shares stutter.
    private void sendFile(Uri uri) {
        String name = "file";
        try (Cursor c = getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst() && c.getString(0) != null) name = c.getString(0);
        }
        try (InputStream in = getContentResolver().openInputStream(uri)) {
            if (in == null) throw new IOException("no stream");
            byte[] data = in.readNBytes(Link.MAX_FILE + 1);
            if (data.length > Link.MAX_FILE) {
                Toast.makeText(this, "File too big (50 MB max)", Toast.LENGTH_SHORT).show();
                return;
            }
            send(this, Link.msg("file", "name", name, "data", Base64.encodeToString(data, Base64.NO_WRAP)));
        } catch (IOException | SecurityException e) {
            Toast.makeText(this, "Couldn't read file", Toast.LENGTH_SHORT).show();
        }
    }
}
