package dev.droidlink;

import android.content.ContentResolver;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;
import android.provider.Telephony;
import android.telephony.SmsManager;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * SMS history and sending for the Mac's Messages window. Reads the system SMS store, so RCS chats
 * (which Google Messages keeps to itself) don't show up here; reply to those from the notification.
 */
final class Sms {
    private static final int MAX_THREADS = 100;
    private static final int MAX_MESSAGES = 300;

    /** Latest message of each conversation, newest first. */
    static JSONObject threads(Context ctx) {
        JSONArray out = new JSONArray();
        Set<Long> seen = new HashSet<>();
        Map<String, String> names = new HashMap<>();
        try (Cursor c = ctx.getContentResolver().query(Telephony.Sms.CONTENT_URI,
                new String[]{Telephony.Sms.THREAD_ID, Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE, Telephony.Sms.TYPE},
                null, null, Telephony.Sms.DATE + " DESC")) {
            while (c != null && c.moveToNext() && out.length() < MAX_THREADS) {
                if (!seen.add(c.getLong(0))) continue;
                String address = c.getString(1) == null ? "" : c.getString(1);
                out.put(Link.msg("thread", "id", c.getLong(0), "address", address, "name", name(ctx, address, names),
                        "snippet", c.getString(2), "date", c.getLong(3), "out", c.getInt(4) != Telephony.Sms.MESSAGE_TYPE_INBOX));
            }
        }
        return Link.msg("sms_threads", "threads", out);
    }

    /** Messages in one conversation, oldest first. */
    static JSONObject thread(Context ctx, long id) {
        JSONArray out = new JSONArray();
        try (Cursor c = ctx.getContentResolver().query(Telephony.Sms.CONTENT_URI,
                new String[]{Telephony.Sms._ID, Telephony.Sms.BODY, Telephony.Sms.DATE, Telephony.Sms.TYPE},
                Telephony.Sms.THREAD_ID + " = ?", new String[]{String.valueOf(id)}, Telephony.Sms.DATE + " DESC")) {
            while (c != null && c.moveToNext() && out.length() < MAX_MESSAGES) {
                int type = c.getInt(3);
                out.put(Link.msg("m", "id", c.getLong(0), "body", c.getString(1), "date", c.getLong(2),
                        "out", type != Telephony.Sms.MESSAGE_TYPE_INBOX,
                        "failed", type == Telephony.Sms.MESSAGE_TYPE_FAILED));
            }
        }
        JSONArray oldestFirst = new JSONArray();
        for (int i = out.length() - 1; i >= 0; i--) oldestFirst.put(out.opt(i));
        return Link.msg("sms_thread", "thread", id, "messages", oldestFirst);
    }

    /** Everyone with a phone number, for the "To:" field. */
    static JSONObject contacts(Context ctx) {
        JSONArray out = new JSONArray();
        try (Cursor c = ctx.getContentResolver().query(ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                new String[]{ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME, ContactsContract.CommonDataKinds.Phone.NUMBER},
                null, null, ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC")) {
            while (c != null && c.moveToNext()) {
                out.put(Link.msg("c", "name", c.getString(0), "number", c.getString(1)));
            }
        } catch (SecurityException ignored) { } // contacts permission not granted: numbers only
        return Link.msg("contacts", "contacts", out);
    }

    /**
     * Sends through the default SMS SIM. Android writes it to the SMS store itself, which fires the
     * observer and refreshes the Mac.
     */
    // ponytail: reports only immediate failures; add a sent-status PendingIntent if carrier rejections matter.
    static JSONObject send(Context ctx, String to, String text) {
        try {
            SmsManager sms = ctx.getSystemService(SmsManager.class);
            sms.sendMultipartTextMessage(to, null, sms.divideMessage(text), null, null);
            return Link.msg("sms_sent", "to", to, "ok", true);
        } catch (RuntimeException e) {
            return Link.msg("sms_sent", "to", to, "ok", false, "error", String.valueOf(e.getMessage()));
        }
    }

    /** Contact name for a number, or the number itself. */
    static String name(Context ctx, String address) {
        return name(ctx, address, new HashMap<>());
    }

    private static String name(Context ctx, String address, Map<String, String> cache) {
        if (address.isEmpty()) return "";
        String cached = cache.get(address);
        if (cached != null) return cached;
        String name = address;
        ContentResolver r = ctx.getContentResolver();
        Uri uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(address));
        try (Cursor c = r.query(uri, new String[]{ContactsContract.PhoneLookup.DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst() && c.getString(0) != null) name = c.getString(0);
        } catch (RuntimeException ignored) { } // no contacts permission, or a sender ID like "AX-HDFCBK"
        cache.put(address, name);
        return name;
    }

    private Sms() { }
}
