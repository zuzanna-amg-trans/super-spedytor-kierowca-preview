package eu.amgtrans.superspedytor.driver.model;

public enum StopType {
    LOADING("Załadunek"),
    PARKING("Parking"),
    FUELING("Tankowanie"),
    UNLOADING("Rozładunek");

    private final String displayName;

    StopType(String displayName) {
        this.displayName = displayName;
    }

    public String displayName() {
        return displayName;
    }
}
