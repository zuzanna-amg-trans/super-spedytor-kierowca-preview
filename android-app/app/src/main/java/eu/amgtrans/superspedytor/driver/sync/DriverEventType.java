package eu.amgtrans.superspedytor.driver.sync;

public enum DriverEventType {
    NAVIGATION_STARTED("navigation_started"),
    ARRIVAL_CONFIRMED("arrival_confirmed"),
    ARRIVAL_CANCELLED("arrival_cancelled");

    private final String wireValue;

    DriverEventType(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }

    public static DriverEventType fromWireValue(String value) {
        for (DriverEventType type : values()) {
            if (type.wireValue.equals(value)) return type;
        }
        throw new IllegalArgumentException("Unknown driver event type: " + value);
    }
}
