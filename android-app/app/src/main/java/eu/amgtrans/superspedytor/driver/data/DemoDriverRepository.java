package eu.amgtrans.superspedytor.driver.data;

import android.content.Context;
import android.content.SharedPreferences;

import java.util.List;

import eu.amgtrans.superspedytor.driver.model.DriverAssignment;
import eu.amgtrans.superspedytor.driver.model.RouteStop;
import eu.amgtrans.superspedytor.driver.model.StopSyncState;
import eu.amgtrans.superspedytor.driver.model.StopType;
import eu.amgtrans.superspedytor.driver.sync.DriverEventOutbox;
import eu.amgtrans.superspedytor.driver.sync.DriverEventType;
import eu.amgtrans.superspedytor.driver.sync.PendingDriverEvent;
import eu.amgtrans.superspedytor.driver.sync.SharedPreferencesDriverEventOutbox;

public final class DemoDriverRepository implements DriverRepository {
    private static final String PREFS = "driver_demo_progress";

    private final SharedPreferences preferences;
    private final DriverEventOutbox outbox;

    public DemoDriverRepository(Context context) {
        preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        outbox = new SharedPreferencesDriverEventOutbox(preferences);
    }

    @Override
    public DriverAssignment activeAssignment() {
        return new DriverAssignment(
                "DEMO/0001",
                "KIEROWCA-DEMO",
                "POJAZD-DEMO",
                List.of(
                        stop("demo-loading-1", StopType.LOADING, "Magazyn demonstracyjny Alfa",
                                "Punkt demonstracyjny A · Warszawa", "PL",
                                52.22970, 21.01220, "Dziś · 08:00–10:00",
                                "Dane syntetyczne. Zgłoś się do kontaktu testowego."),
                        stop("demo-parking-1", StopType.PARKING, "Parking demonstracyjny",
                                "Punkt demonstracyjny P · Łódź", "PL",
                                51.75920, 19.45600, "Dziś · do 18:00",
                                "Rezerwacja testowa · miejsce P-01."),
                        stop("demo-fueling-1", StopType.FUELING, "Stacja demonstracyjna",
                                "Punkt demonstracyjny T · Łódź", "PL",
                                51.76020, 19.45800, "Po odpoczynku",
                                "Tankowanie testowe. Dokumentację wykonaj po zatrzymaniu."),
                        stop("demo-unloading-1", StopType.UNLOADING, "Centrum demonstracyjne Beta",
                                "Punkt demonstracyjny B · Poznań", "PL",
                                52.40640, 16.92520, "Jutro · 09:00–12:00",
                                "Wjazd bramą B, magazyn testowy, rampa 4.")
                )
        );
    }

    private RouteStop stop(
            String id,
            StopType type,
            String title,
            String address,
            String countryCode,
            double latitude,
            double longitude,
            String timeWindow,
            String note
    ) {
        return new RouteStop(
                id, type, title, address, countryCode, latitude, longitude,
                timeWindow,
                note,
                hasPendingArrival(id)
                        ? StopSyncState.PENDING_SYNC
                        : StopSyncState.NOT_REACHED
        );
    }

    private boolean hasPendingArrival(String stopId) {
        for (PendingDriverEvent event : outbox.pendingEvents()) {
            if (event.routePointId().equals(stopId)
                    && event.type() == DriverEventType.ARRIVAL_CONFIRMED) {
                return true;
            }
        }
        return false;
    }

    @Override
    public void markNavigationStarted(String stopId) {
        outbox.enqueueIfAbsent(PendingDriverEvent.create(stopId, DriverEventType.NAVIGATION_STARTED));
    }

    @Override
    public void markArrived(String stopId) {
        outbox.enqueueIfAbsent(PendingDriverEvent.create(stopId, DriverEventType.ARRIVAL_CONFIRMED));
    }

    @Override
    public int pendingEventCount() {
        return outbox.pendingEvents().size();
    }

    @Override
    public void resetDemo() {
        if (!preferences.edit().clear().commit()) {
            throw new IllegalStateException("Could not reset the demo event outbox");
        }
    }
}
