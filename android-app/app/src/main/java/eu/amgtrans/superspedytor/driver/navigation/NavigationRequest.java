package eu.amgtrans.superspedytor.driver.navigation;

import java.util.Locale;

public final class NavigationRequest {
    private NavigationRequest() {}

    public static String googleNavigationUri(double latitude, double longitude) {
        return String.format(Locale.US, "google.navigation:q=%.6f,%.6f&mode=d", latitude, longitude);
    }

    public static String geoUri(double latitude, double longitude) {
        return String.format(Locale.US, "geo:%.6f,%.6f?q=%.6f,%.6f", latitude, longitude, latitude, longitude);
    }
}
