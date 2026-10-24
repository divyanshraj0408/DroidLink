package dev.droidlink;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Pulls a one-time code out of an SMS. */
final class Otp {
    private static final Pattern KEYWORD = Pattern.compile(
            "(?i)\\b(otp|code|verification|verify|one[ -]?time|passcode|password|pin)\\b");
    // 4-8 digits that aren't part of a longer number, a decimal or a grouped amount.
    private static final Pattern NUMBER = Pattern.compile("(?<![\\d.,])\\d{4,8}(?!\\d|[.,]\\d)");
    private static final Pattern MONEY = Pattern.compile("(?i)(rs\\.?|inr|₹|\\$)\\s*$");

    /** The code, or null when the SMS doesn't look like an OTP. Prefers the first number after the keyword. */
    static String find(String sms) {
        Matcher k = KEYWORD.matcher(sms);
        if (!k.find()) return null;
        String before = null;
        Matcher m = NUMBER.matcher(sms);
        while (m.find()) {
            if (MONEY.matcher(sms.substring(Math.max(0, m.start() - 5), m.start())).find()) continue;
            if (m.start() >= k.end()) return m.group();
            if (before == null) before = m.group();
        }
        return before;
    }

    private Otp() { }
}
