package dev.droidlink;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.provider.Telephony;
import android.telephony.SmsMessage;

/** Sends OTPs from incoming SMS to the Mac, which copies them to the clipboard. */
public class SmsReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        StringBuilder body = new StringBuilder();
        String from = "";
        for (SmsMessage m : Telephony.Sms.Intents.getMessagesFromIntent(i)) {
            from = m.getDisplayOriginatingAddress();
            body.append(m.getMessageBody());
        }
        String code = Otp.find(body.toString());
        if (code == null) return;
        Link link = Link.get(c);
        link.start();
        link.send(Link.msg("otp", "code", code, "from", from, "text", body.toString()));
    }
}
