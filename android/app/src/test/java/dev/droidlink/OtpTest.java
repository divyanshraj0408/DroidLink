package dev.droidlink;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

public class OtpTest {
    @Test
    public void findsCodes() {
        assertEquals("482913", Otp.find("482913 is your OTP for txn of Rs 5000 at Amazon. Do not share. -HDFC Bank"));
        assertEquals("4829", Otp.find("Rs. 1,250.00 debited. OTP 4829 valid for 10 mins"));
        assertEquals("553120", Otp.find("Your verification code is 553120. Ref 24/10/2026"));
        assertEquals("1234", Otp.find("OTP for login: 1234. Call 1800200123456 for help"));
        assertEquals("907761", Otp.find("Use 907761 as your one-time password for Swiggy"));
        assertEquals("77881", Otp.find("G-77881 is your Google verification code."));
        assertEquals("6543", Otp.find("Your Uber code: 6543"));
    }

    @Test
    public void ignoresOrdinaryTexts() {
        assertNull(Otp.find("Your order of Rs 5000 has shipped, arriving 2026-10-26"));
        assertNull(Otp.find("Hey, are we meeting at 1830?"));
    }

    @Test
    public void skipsAmounts() {
        assertEquals("3141", Otp.find("Pay ₹5000 using OTP 3141"));
    }
}
