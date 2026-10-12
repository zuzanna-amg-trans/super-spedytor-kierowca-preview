package eu.amgtrans.superspedytor.driver.model;

import java.util.Collections;
import java.util.List;
import java.util.Objects;

public final class DriverAssignment {
    private final String orderNumber;
    private final String driverCode;
    private final String vehicleRegistration;
    private final List<RouteStop> stops;

    public DriverAssignment(
            String orderNumber,
            String driverCode,
            String vehicleRegistration,
            List<RouteStop> stops
    ) {
        this.orderNumber = Objects.requireNonNull(orderNumber);
        this.driverCode = Objects.requireNonNull(driverCode);
        this.vehicleRegistration = Objects.requireNonNull(vehicleRegistration);
        this.stops = Collections.unmodifiableList(List.copyOf(stops));
    }

    public String orderNumber() { return orderNumber; }
    public String driverCode() { return driverCode; }
    public String vehicleRegistration() { return vehicleRegistration; }
    public List<RouteStop> stops() { return stops; }
}
