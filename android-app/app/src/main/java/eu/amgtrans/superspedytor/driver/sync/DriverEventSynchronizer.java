package eu.amgtrans.superspedytor.driver.sync;

import java.io.IOException;

public final class DriverEventSynchronizer {
    private final DriverEventOutbox outbox;
    private final DriverApi api;

    public DriverEventSynchronizer(DriverEventOutbox outbox, DriverApi api) {
        this.outbox = outbox;
        this.api = api;
    }

    public SyncResult synchronize() {
        int confirmed = 0;
        int retained = 0;
        int failed = 0;

        for (PendingDriverEvent event : outbox.pendingEvents()) {
            try {
                DriverEventReceipt receipt = api.sendEvent(event);
                if (receipt.ownerConfirmed()) {
                    outbox.remove(event.idempotencyKey());
                    confirmed++;
                } else {
                    retained++;
                }
            } catch (IOException exception) {
                failed++;
            }
        }
        return new SyncResult(confirmed, retained, failed);
    }
}
