package eu.amgtrans.superspedytor.driver.backend;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

import java.util.List;
import java.util.Map;

public final class CookieHeaderParserTest {
    @Test
    public void extractsRefreshCookieWithoutAttributes() {
        String value = CookieHeaderParser.valueFromSetCookie(
                "refresh_token=abc.def; Path=/api/; HttpOnly; Secure; SameSite=Lax",
                "refresh_token"
        );

        assertEquals("abc.def", value);
    }

    @Test
    public void findsSetCookieCaseInsensitively() {
        String value = CookieHeaderParser.findCookie(
                Map.of("Set-Cookie", List.of("refresh_token=rotated; Path=/api/")),
                "refresh_token"
        );

        assertEquals("rotated", value);
    }

    @Test
    public void doesNotReturnDifferentCookie() {
        assertNull(CookieHeaderParser.valueFromSetCookie(
                "sessionid=secret; Path=/",
                "refresh_token"
        ));
    }
}
