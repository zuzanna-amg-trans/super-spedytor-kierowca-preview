package eu.amgtrans.superspedytor.driver.backend;

import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;

final class CookieHeaderParser {
    private CookieHeaderParser() {}

    static String findCookie(Map<String, List<String>> headers, String cookieName) {
        if (headers == null || cookieName == null || cookieName.isEmpty()) return null;
        for (Map.Entry<String, List<String>> entry : headers.entrySet()) {
            String headerName = entry.getKey();
            if (headerName == null
                    || !"set-cookie".equals(headerName.toLowerCase(Locale.ROOT))) {
                continue;
            }
            for (String headerValue : entry.getValue() == null
                    ? Collections.<String>emptyList()
                    : entry.getValue()) {
                String value = valueFromSetCookie(headerValue, cookieName);
                if (value != null) return value;
            }
        }
        return null;
    }

    static String valueFromSetCookie(String header, String cookieName) {
        if (header == null) return null;
        String prefix = cookieName + "=";
        for (String part : header.split(";")) {
            String trimmed = part.trim();
            if (trimmed.regionMatches(true, 0, prefix, 0, prefix.length())) {
                String value = trimmed.substring(prefix.length());
                return value.isEmpty() ? null : value;
            }
        }
        return null;
    }
}
