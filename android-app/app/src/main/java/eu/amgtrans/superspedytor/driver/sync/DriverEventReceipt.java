package eu.amgtrans.superspedytor.driver.sync;

import java.util.Objects;

public final class DriverEventReceipt {
    private final boolean ownerConfirmed;
    private final String ownerState;
    private final long ownerVersion;

    public DriverEventReceipt(boolean ownerConfirmed, String ownerState, long ownerVersion) {
        this.ownerConfirmed = ownerConfirmed;
        this.ownerState = Objects.requireNonNull(ownerState);
        this.ownerVersion = ownerVersion;
        if (ownerConfirmed && (ownerState.isBlank() || ownerVersion <= 0)) {
            throw new IllegalArgumentException(
                    "Owner-confirmed receipts require a non-blank state and positive version"
            );
        }
    }

    public boolean ownerConfirmed() { return ownerConfirmed; }
    public String ownerState() { return ownerState; }
    public long ownerVersion() { return ownerVersion; }
}
