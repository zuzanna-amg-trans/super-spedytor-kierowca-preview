package eu.amgtrans.superspedytor.driver.sync;

import java.util.List;

public interface DriverEventOutbox {
    boolean enqueueIfAbsent(PendingDriverEvent event);
    List<PendingDriverEvent> pendingEvents();
    void remove(String idempotencyKey);
    void clear();
}
