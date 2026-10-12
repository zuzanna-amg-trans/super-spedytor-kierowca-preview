package eu.amgtrans.superspedytor.driver.model;

import java.util.Objects;

public final class RouteStop {
    private final String id;
    private final StopType type;
    private final String title;
    private final String address;
    private final String countryCode;
    private final double latitude;
    private final double longitude;
    private final String timeWindow;
    private final String note;
    private final StopSyncState syncState;

    public RouteStop(
            String id,
            StopType type,
            String title,
            String address,
            String countryCode,
            double latitude,
            double longitude,
            String timeWindow,
            String note,
            boolean completed
    ) {
        this(
                id, type, title, address, countryCode, latitude, longitude,
                timeWindow, note, completed ? StopSyncState.CONFIRMED_BY_TMS : StopSyncState.NOT_REACHED
        );
    }

    public RouteStop(
            String id,
            StopType type,
            String title,
            String address,
            String countryCode,
            double latitude,
            double longitude,
            String timeWindow,
            String note,
            StopSyncState syncState
    ) {
        this.id = Objects.requireNonNull(id);
        this.type = Objects.requireNonNull(type);
        this.title = Objects.requireNonNull(title);
        this.address = Objects.requireNonNull(address);
        this.countryCode = Objects.requireNonNull(countryCode);
        this.latitude = latitude;
        this.longitude = longitude;
        this.timeWindow = Objects.requireNonNull(timeWindow);
        this.note = Objects.requireNonNull(note);
        this.syncState = Objects.requireNonNull(syncState);
    }

    public String id() { return id; }
    public StopType type() { return type; }
    public String title() { return title; }
    public String address() { return address; }
    public String countryCode() { return countryCode; }
    public double latitude() { return latitude; }
    public double longitude() { return longitude; }
    public String timeWindow() { return timeWindow; }
    public String note() { return note; }
    public StopSyncState syncState() { return syncState; }
    public boolean completed() { return syncState != StopSyncState.NOT_REACHED; }
}
