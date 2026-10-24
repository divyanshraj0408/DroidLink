package dev.droidlink;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.RemoteInput;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.ContentObserver;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Telephony;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Mirrors notifications to the Mac and sends replies typed there. The system keeps this service
 * bound while notification access is on, which also keeps the link alive.
 * Android 15+ hides OTP text from listeners like this one, so OTPs come from {@link SmsReceiver}.
 */
public class Listener extends NotificationListenerService {
    private static final Map<String, Notification.Action> replies = new ConcurrentHashMap<>();
    private static volatile Listener self;

    @Override
    public void onListenerConnected() {
        self = this;
        Link.get(this).start();
        try {
            getContentResolver().registerContentObserver(Telephony.Sms.CONTENT_URI, true, smsChanged);
        } catch (SecurityException ignored) { } // SMS permission not granted yet
    }

    @Override
    public void onListenerDisconnected() {
        self = null;
        getContentResolver().unregisterContentObserver(smsChanged);
    }

    /** Any SMS sent or received: the Mac re-fetches if its Messages window is open. */
    private final ContentObserver smsChanged = new ContentObserver(new Handler(Looper.getMainLooper())) {
        @Override
        public void onChange(boolean self) {
            Link.get(Listener.this).send(Link.msg("sms_changed"));
        }
    };

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        Notification n = sbn.getNotification();
        // Calls get their own card on the Mac (CallReceiver), not a banner.
        if (sbn.getPackageName().equals(getPackageName()) || sbn.isOngoing()
                || (n.flags & Notification.FLAG_GROUP_SUMMARY) != 0 || Notification.CATEGORY_CALL.equals(n.category)) return;
        Bundle e = n.extras;
        CharSequence title = e.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence text = e.getCharSequence(Notification.EXTRA_BIG_TEXT);
        if (text == null) text = e.getCharSequence(Notification.EXTRA_TEXT);
        if (title == null && text == null) return;

        Notification.Action reply = replyAction(n);
        if (reply != null) replies.put(sbn.getKey(), reply);
        Link.get(this).send(Link.msg("notif",
                "id", sbn.getKey(),
                "app", appName(sbn.getPackageName()),
                "title", title == null ? "" : title.toString(),
                "text", text == null ? "" : text.toString(),
                "reply", reply != null));
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        if (sbn.getPackageName().equals(getPackageName())) return;
        replies.remove(sbn.getKey());
        Link.get(this).send(Link.msg("notif_rm", "id", sbn.getKey()));
    }

    static void reply(String id, String text) {
        Notification.Action a = replies.get(id);
        Listener l = self;
        if (a == null || l == null) return;
        Bundle results = new Bundle();
        for (RemoteInput r : a.getRemoteInputs()) results.putCharSequence(r.getResultKey(), text);
        Intent i = new Intent();
        RemoteInput.addResultsToIntent(a.getRemoteInputs(), i, results);
        try {
            a.actionIntent.send(l, 0, i);
        } catch (PendingIntent.CanceledException ignored) { }
    }

    private static Notification.Action replyAction(Notification n) {
        if (n.actions == null) return null;
        for (Notification.Action a : n.actions) {
            if (a.getRemoteInputs() != null && a.getRemoteInputs().length > 0) return a;
        }
        return null;
    }

    private String appName(String pkg) {
        PackageManager pm = getPackageManager();
        try {
            return pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString();
        } catch (PackageManager.NameNotFoundException e) {
            return pkg;
        }
    }
}
