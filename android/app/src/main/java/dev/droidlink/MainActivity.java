package dev.droidlink;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationManager;
import android.app.StatusBarManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.Icon;
import android.graphics.drawable.StateListDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.service.notification.NotificationListenerService;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsetsController;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import com.google.mlkit.vision.codescanner.GmsBarcodeScanning;

import java.util.ArrayList;
import java.util.List;
import java.util.function.BooleanSupplier;

/** Status and setup, laid out like iOS Settings: large title, inset grouped lists, colored icon tiles. */
public class MainActivity extends Activity {
    // iOS system colors.
    private static final int BLUE = 0xFF007AFF, GREEN = 0xFF34C759, RED = 0xFFFF3B30, ORANGE = 0xFFFF9500,
            INDIGO = 0xFF5856D6, GRAY = 0xFF8E8E93, TEAL = 0xFF30B0C7;
    private static final String[] SMS = {Manifest.permission.RECEIVE_SMS};
    private static final String[] MESSAGES = {Manifest.permission.READ_SMS, Manifest.permission.SEND_SMS};
    private static final String[] CALLS = {Manifest.permission.READ_PHONE_STATE, Manifest.permission.READ_CALL_LOG,
            Manifest.permission.ANSWER_PHONE_CALLS, Manifest.permission.CALL_PHONE};
    private static final String[] CONTACTS = {Manifest.permission.READ_CONTACTS};

    private final List<Runnable> refreshers = new ArrayList<>();
    private boolean dark;
    private int bg, card, label, secondary, separator, pressed;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        if (getActionBar() != null) getActionBar().hide();
        dark = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        bg = dark ? 0xFF000000 : 0xFFF2F2F7;
        card = dark ? 0xFF1C1C1E : 0xFFFFFFFF;
        label = dark ? 0xFFFFFFFF : 0xFF000000;
        secondary = dark ? 0xFF98989F : 0xFF8A8A8E;
        separator = dark ? 0xFF38383A : 0xFFC6C6C8;
        pressed = dark ? 0xFF2C2C2E : 0xFFD1D1D6;
        getWindow().setBackgroundDrawable(new ColorDrawable(bg));
        if (!dark) {
            int light = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
            getWindow().getInsetsController().setSystemBarsAppearance(light, light);
        }

        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(dp(16), dp(8), dp(16), dp(40));

        TextView title = text("DroidLink", 34, label, Typeface.BOLD);
        title.setPadding(0, dp(12), 0, dp(14));
        col.addView(title);
        col.addView(hero());

        LinearLayout mac = section(col, "ON YOUR MAC", null);
        row(mac, R.drawable.ic_bell, RED, "Notifications", () -> listenerOn(),
                () -> startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)));
        row(mac, R.drawable.ic_key, GRAY, "OTP Autofill", () -> granted(SMS), () -> ask(SMS));
        row(mac, R.drawable.ic_chat, GREEN, "Messages", () -> granted(MESSAGES), () -> ask(MESSAGES));
        row(mac, R.drawable.ic_phone, GREEN, "Calls", () -> granted(CALLS), () -> ask(CALLS));
        row(mac, R.drawable.ic_person, ORANGE, "Contact Names", () -> granted(CONTACTS), () -> ask(CONTACTS));

        LinearLayout shortcuts = section(col, "CLIPBOARD", "Android only lets apps read the clipboard while they're open, "
                + "so send it with the tile, this button, or Share → Send to Mac.");
        action(shortcuts, R.drawable.ic_clipboard, BLUE, "Send Clipboard to Mac", () -> SendActivity.sendClipboard(this));
        action(shortcuts, R.drawable.ic_add_box, INDIGO, "Add Quick Settings Tile", () ->
                getSystemService(StatusBarManager.class).requestAddTileService(
                        new ComponentName(this, ClipTile.class), "Send clipboard",
                        Icon.createWithResource(this, R.drawable.ic_clipboard), getMainExecutor(), r -> { }));

        LinearLayout system = section(col, "SYSTEM", "Keeps DroidLink connected while the screen is off.");
        row(system, R.drawable.ic_battery, TEAL, "Run in Background",
                () -> getSystemService(PowerManager.class).isIgnoringBatteryOptimizations(getPackageName()),
                () -> startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                        Uri.parse("package:" + getPackageName()))));
        action(system, R.drawable.ic_laptop, BLUE, "Pair with a Mac", this::scan);

        TextView footer = text("Everything stays on your Wi‑Fi, encrypted end to end.", 13, secondary, Typeface.NORMAL);
        footer.setGravity(Gravity.CENTER);
        footer.setPadding(dp(16), dp(28), dp(16), 0);
        col.addView(footer);

        ScrollView root = new ScrollView(this);
        root.setFitsSystemWindows(true);
        root.addView(col);
        setContentView(root);

        // First launch asks for everything at once; the rows let people grant what they skipped.
        if (b == null) requestPermissions(concat(SMS, MESSAGES, CALLS, CONTACTS, new String[]{Manifest.permission.POST_NOTIFICATIONS}), 1);
        // A force-stop unbinds the listener and Android doesn't rebind it on its own.
        NotificationListenerService.requestRebind(new ComponentName(this, Listener.class));
        Link.get(this).start();
    }

    @Override
    protected void onResume() {
        super.onResume();
        Link.get(this).onState = this::refresh;
        refresh();
    }

    @Override
    protected void onPause() {
        super.onPause();
        Link.get(this).onState = null;
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        refresh();
        // Android stops showing the dialog after two denials; send people to Settings instead.
        if (code == 2 && !granted(perms)) {
            startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName())));
        }
    }

    private void refresh() {
        for (Runnable r : refreshers) r.run();
    }

    // MARK: Hero card

    /** App icon, connection state with a colored dot, and the Mac's address. */
    private View hero() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.HORIZONTAL);
        box.setGravity(Gravity.CENTER_VERTICAL);
        box.setPadding(dp(16), dp(16), dp(16), dp(16));
        box.setBackground(rounded(card, 12));

        ImageView icon = new ImageView(this);
        icon.setImageResource(R.drawable.ic_launcher);
        icon.setBackground(rounded(dark ? 0xFF2C2C2E : 0xFFF2F2F7, 14));
        icon.setClipToOutline(true);
        icon.setPadding(dp(8), dp(8), dp(8), dp(8));
        box.addView(icon, new LinearLayout.LayoutParams(dp(60), dp(60)));

        LinearLayout texts = new LinearLayout(this);
        texts.setOrientation(LinearLayout.VERTICAL);
        texts.setPadding(dp(14), 0, 0, 0);
        TextView state = text("", 20, label, Typeface.BOLD);
        TextView detail = text("", 15, secondary, Typeface.NORMAL);
        // Wrap the width so the status dot sits right after the word, not at the card's edge.
        texts.addView(state, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT));
        texts.addView(detail);
        box.addView(texts, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));

        refreshers.add(() -> {
            Link link = Link.get(this);
            String host = link.prefs.getString("host", null);
            int dot = host == null ? GRAY : link.connected ? GREEN : ORANGE;
            state.setText(host == null ? "Not Paired" : link.connected ? "Connected" : "Looking for Mac…");
            state.setCompoundDrawablesRelativeWithIntrinsicBounds(null, null, circle(dot, 9), null);
            state.setCompoundDrawablePadding(dp(8));
            detail.setText(host == null ? "Tap to scan the code on your Mac" : "Mac at " + host);
        });
        box.setOnClickListener(v -> { if (Link.get(this).prefs.getString("host", null) == null) scan(); });
        return box;
    }

    // MARK: Inset grouped list

    private LinearLayout section(LinearLayout col, String header, String footer) {
        TextView h = text(header, 13, secondary, Typeface.NORMAL);
        h.setPadding(dp(16), dp(30), dp(16), dp(7));
        col.addView(h);
        LinearLayout list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        list.setBackground(rounded(card, 12));
        list.setClipToOutline(true);
        col.addView(list);
        if (footer != null) {
            TextView f = text(footer, 13, secondary, Typeface.NORMAL);
            f.setPadding(dp(16), dp(7), dp(16), 0);
            col.addView(f);
        }
        return list;
    }

    /** A feature row: "On" in grey when ready, "Allow ›" in blue when it needs something. */
    private void row(LinearLayout list, int icon, int tint, String title, BooleanSupplier ready, Runnable fix) {
        TextView value = text("", 17, secondary, Typeface.NORMAL);
        ImageView chevron = chevron();
        LinearLayout r = baseRow(list, icon, tint, title, value, chevron);
        refreshers.add(() -> {
            boolean on = ready.getAsBoolean();
            value.setText(on ? "On" : "Allow");
            value.setTextColor(on ? secondary : BLUE);
            chevron.setVisibility(on ? View.GONE : View.VISIBLE);
            r.setOnClickListener(on ? null : v -> fix.run());
            r.setClickable(!on);
        });
    }

    /** A tappable action row with a chevron. */
    private void action(LinearLayout list, int icon, int tint, String title, Runnable run) {
        baseRow(list, icon, tint, title, null, chevron()).setOnClickListener(v -> run.run());
    }

    private LinearLayout baseRow(LinearLayout list, int icon, int tint, String title, View value, View trailing) {
        if (list.getChildCount() > 0) {
            View line = new View(this);
            line.setBackgroundColor(separator);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, Math.max(1, dp(0.33f)));
            lp.setMarginStart(dp(59));
            list.addView(line, lp);
        }
        LinearLayout r = new LinearLayout(this);
        r.setGravity(Gravity.CENTER_VERTICAL);
        r.setMinimumHeight(dp(48));
        r.setPadding(dp(16), dp(6), dp(14), dp(6));
        StateListDrawable states = new StateListDrawable();
        states.addState(new int[]{android.R.attr.state_pressed}, new ColorDrawable(pressed));
        states.addState(new int[]{}, new ColorDrawable(Color.TRANSPARENT));
        r.setBackground(states);

        ImageView tile = new ImageView(this);
        tile.setImageResource(icon);
        tile.setBackground(rounded(tint, 7));
        tile.setPadding(dp(5), dp(5), dp(5), dp(5));
        r.addView(tile, new LinearLayout.LayoutParams(dp(29), dp(29)));

        TextView t = text(title, 17, label, Typeface.NORMAL);
        t.setSingleLine();
        t.setEllipsize(TextUtils.TruncateAt.END);
        t.setPadding(dp(14), 0, dp(8), 0);
        r.addView(t, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1));
        if (value != null) r.addView(value);
        r.addView(trailing);
        list.addView(r);
        return r;
    }

    private ImageView chevron() {
        ImageView c = new ImageView(this);
        c.setImageResource(R.drawable.ic_chevron);
        c.setColorFilter(dark ? 0xFF5A5A5E : 0xFFC4C4C7);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(20), dp(20));
        lp.setMarginStart(dp(2));
        c.setLayoutParams(lp);
        return c;
    }

    // MARK: Permissions and pairing

    private boolean listenerOn() {
        return getSystemService(NotificationManager.class)
                .isNotificationListenerAccessGranted(new ComponentName(this, Listener.class));
    }

    private boolean granted(String... permissions) {
        for (String p : permissions) {
            if (checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) return false;
        }
        return true;
    }

    /** From a row tap: if Android won't show the dialog any more, the result handler opens Settings. */
    private void ask(String... permissions) {
        requestPermissions(permissions, 2);
    }

    private static String[] concat(String[]... groups) {
        List<String> all = new ArrayList<>();
        for (String[] g : groups) all.addAll(List.of(g));
        return all.toArray(new String[0]);
    }

    private void scan() {
        GmsBarcodeScanning.getClient(this).startScan()
                .addOnSuccessListener(code -> {
                    String v = code.getRawValue();
                    int at = v == null ? -1 : v.lastIndexOf('@');
                    if (v == null || !v.startsWith("droidlink:") || at < 0) {
                        Toast.makeText(this, "Not a DroidLink code", Toast.LENGTH_SHORT).show();
                        return;
                    }
                    Link.get(this).pair(v.substring("droidlink:".length(), at), v.substring(at + 1));
                    refresh();
                })
                .addOnFailureListener(e -> Toast.makeText(this, "Scan failed: " + e.getMessage(), Toast.LENGTH_LONG).show());
    }

    // MARK: Drawing helpers

    private TextView text(String s, float sp, int color, int style) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(sp);
        t.setTextColor(color);
        t.setTypeface(Typeface.create(Typeface.DEFAULT, style));
        return t;
    }

    private GradientDrawable rounded(int color, float radiusDp) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(radiusDp));
        return d;
    }

    private GradientDrawable circle(int color, int sizeDp) {
        GradientDrawable d = new GradientDrawable();
        d.setShape(GradientDrawable.OVAL);
        d.setColor(color);
        d.setSize(dp(sizeDp), dp(sizeDp));
        return d;
    }

    private int dp(float v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }
}
