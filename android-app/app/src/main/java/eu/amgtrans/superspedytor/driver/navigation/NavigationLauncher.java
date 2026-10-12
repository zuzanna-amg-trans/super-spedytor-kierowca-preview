package eu.amgtrans.superspedytor.driver.navigation;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;

import eu.amgtrans.superspedytor.driver.model.RouteStop;

public final class NavigationLauncher {
    private static final String GOOGLE_MAPS_PACKAGE = "com.google.android.apps.maps";

    private NavigationLauncher() {}

    public static boolean showLocation(Context context, RouteStop stop) {
        Intent googleMaps = new Intent(
                Intent.ACTION_VIEW,
                Uri.parse(NavigationRequest.geoUri(stop.latitude(), stop.longitude()))
        );
        googleMaps.setPackage(GOOGLE_MAPS_PACKAGE);

        try {
            context.startActivity(googleMaps);
            return true;
        } catch (ActivityNotFoundException missingGoogleMaps) {
            Intent fallback = new Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse(NavigationRequest.geoUri(stop.latitude(), stop.longitude()))
            );
            try {
                context.startActivity(fallback);
                return true;
            } catch (ActivityNotFoundException missingMapApp) {
                return false;
            }
        }
    }

    public static boolean launch(Context context, RouteStop stop) {
        Intent googleMaps = new Intent(
                Intent.ACTION_VIEW,
                Uri.parse(NavigationRequest.googleNavigationUri(stop.latitude(), stop.longitude()))
        );
        googleMaps.setPackage(GOOGLE_MAPS_PACKAGE);

        try {
            context.startActivity(googleMaps);
            return true;
        } catch (ActivityNotFoundException missingGoogleMaps) {
            Intent fallback = new Intent(
                    Intent.ACTION_VIEW,
                    Uri.parse(NavigationRequest.geoUri(stop.latitude(), stop.longitude()))
            );
            try {
                context.startActivity(fallback);
                return true;
            } catch (ActivityNotFoundException missingNavigationApp) {
                return false;
            }
        }
    }
}
