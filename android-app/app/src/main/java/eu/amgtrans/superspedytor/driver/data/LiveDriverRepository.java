package eu.amgtrans.superspedytor.driver.data;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicReference;

import eu.amgtrans.superspedytor.driver.model.DriverAssignment;
import eu.amgtrans.superspedytor.driver.model.RouteStop;
import eu.amgtrans.superspedytor.driver.model.StopSyncState;
import eu.amgtrans.superspedytor.driver.model.StopType;

/** Read-only projection of the authenticated driver's current backend state. */
public final class LiveDriverRepository implements DriverRepository {
    private static final DriverAssignment EMPTY = new DriverAssignment(
            "", "", "", Collections.emptyList()
    );

    private final AtomicReference<DriverAssignment> assignment = new AtomicReference<>(EMPTY);

    public void updateFromBackendState(String stateJson) {
        try {
            JSONObject state = new JSONObject(stateJson);
            if (!"connected".equals(state.optString("status"))) return;

            JSONObject profile = state.optJSONObject("profile");
            JSONObject vehicle = state.optJSONObject("vehicle");
            JSONObject routeStatus = state.optJSONObject("route_status");
            JSONArray routes = routeStatus == null
                    ? null
                    : routeStatus.optJSONArray("active_routes");
            JSONObject route = routes == null || routes.length() == 0
                    ? null
                    : routes.optJSONObject(0);

            String driverName = routeStatus == null ? "" : routeStatus.optString("driver_name", "");
            if (driverName.trim().isEmpty() && profile != null) {
                driverName = (profile.optString("first_name", "") + " "
                        + profile.optString("last_name", "")).trim();
            }
            String vehicleRegistration = vehicle == null
                    ? ""
                    : vehicle.optString("registration_number", "");
            String routeName = route == null
                    ? ""
                    : route.optString("route_name", String.valueOf(route.opt("route_id")));

            List<RouteStop> stops = new ArrayList<>();
            if (route != null) {
                addPoint(stops, route.optJSONObject("current_point"));
                addPoint(stops, route.optJSONObject("next_point"));
            }
            assignment.set(new DriverAssignment(
                    routeName == null ? "" : routeName,
                    driverName,
                    vehicleRegistration,
                    stops
            ));
        } catch (Exception ignored) {
            // Keep the last verified snapshot when a malformed update arrives.
        }
    }

    private static void addPoint(List<RouteStop> stops, JSONObject point) {
        if (point == null) return;
        JSONObject location = point.optJSONObject("location_details");
        String id = String.valueOf(point.opt("id"));
        String operation = point.optString("operation_type", "");
        String title = firstNonBlank(
                point.optString("location_name", ""),
                location == null ? "" : location.optString("label", ""),
                point.optString("operation_type_display", "Punkt trasy")
        );
        String address = firstNonBlank(
                point.optString("location_address", ""),
                location == null ? "" : location.optString("full_address", ""),
                title
        );
        String country = location == null ? "" : location.optString("country", "");
        double latitude = location == null ? 0.0 : location.optDouble("latitude", 0.0);
        double longitude = location == null ? 0.0 : location.optDouble("longitude", 0.0);
        String time = firstNonBlank(
                point.optString("live_eta_datetime", ""),
                point.optString("eta_datetime", ""),
                point.optString("time_window_start", "")
        );
        String note = firstNonBlank(
                point.optString("notes", ""),
                point.optString("location_notes", ""),
                ""
        );
        boolean completed = "completed".equalsIgnoreCase(point.optString("status", ""));

        stops.add(new RouteStop(
                id,
                stopType(operation),
                title,
                address,
                country,
                latitude,
                longitude,
                time,
                note,
                completed ? StopSyncState.CONFIRMED_BY_TMS : StopSyncState.NOT_REACHED
        ));
    }

    private static StopType stopType(String operation) {
        String normalized = operation == null ? "" : operation.toLowerCase(Locale.ROOT);
        if (normalized.contains("unload") || normalized.contains("delivery")) {
            return StopType.UNLOADING;
        }
        if (normalized.contains("park")) return StopType.PARKING;
        if (normalized.contains("fuel")) return StopType.FUELING;
        return StopType.LOADING;
    }

    private static String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isEmpty() && !"null".equals(value)) return value;
        }
        return "";
    }

    @Override
    public DriverAssignment activeAssignment() {
        return assignment.get();
    }

    @Override
    public void markNavigationStarted(String stopId) {
        // Read-only integration: do not report synthetic navigation events.
    }

    @Override
    public void markArrived(String stopId) {
        // Read-only integration: arrival needs an approved, idempotent endpoint.
    }

    @Override
    public int pendingEventCount() {
        return 0;
    }

    @Override
    public void resetDemo() {
        assignment.set(EMPTY);
    }
}
