package dev.droidlink;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.telecom.TelecomManager;
import android.telephony.TelephonyManager;

/**
 * Mirrors call state to the Mac (ringing with the caller, active, ended) and runs the Mac's
 * answer / end / dial requests. Call audio stays on the phone: Android doesn't let apps carry it.
 */
public class CallReceiver extends BroadcastReceiver {
    private static String number = "";
    private static boolean incoming;

    @Override
    @SuppressWarnings("deprecation") // EXTRA_INCOMING_NUMBER: still filled in when READ_CALL_LOG is granted
    public void onReceive(Context c, Intent i) {
        String state = i.getStringExtra(TelephonyManager.EXTRA_STATE);
        String n = i.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER);
        if (n != null && !n.isEmpty()) number = n;
        String out;
        if (TelephonyManager.EXTRA_STATE_RINGING.equals(state)) {
            incoming = true;
            out = "ringing"; // Android sends this twice; only the second carries the number
        } else if (TelephonyManager.EXTRA_STATE_OFFHOOK.equals(state)) {
            out = "active";
        } else if (TelephonyManager.EXTRA_STATE_IDLE.equals(state)) {
            out = "ended";
        } else {
            return;
        }
        Link link = Link.get(c);
        link.start();
        link.send(Link.msg("call", "state", out, "number", number, "name", Sms.name(c, number), "incoming", incoming));
        if (out.equals("ended")) {
            number = "";
            incoming = false;
        }
    }

    @SuppressWarnings({"deprecation", "MissingPermission"}) // no non-deprecated way for a companion app
    static void answer(Context c) {
        run(c, () -> c.getSystemService(TelecomManager.class).acceptRingingCall());
    }

    @SuppressWarnings({"deprecation", "MissingPermission"})
    static void end(Context c) {
        run(c, () -> c.getSystemService(TelecomManager.class).endCall());
    }

    @SuppressWarnings("MissingPermission")
    static void dial(Context c, String to) {
        number = to;
        incoming = false;
        run(c, () -> c.getSystemService(TelecomManager.class).placeCall(Uri.fromParts("tel", to, null), new Bundle()));
    }

    private static void run(Context c, Runnable r) {
        try {
            r.run();
        } catch (SecurityException e) {
            Link.get(c).send(Link.msg("call_error", "error", "Allow phone permissions in DroidLink on the phone"));
        }
    }
}
