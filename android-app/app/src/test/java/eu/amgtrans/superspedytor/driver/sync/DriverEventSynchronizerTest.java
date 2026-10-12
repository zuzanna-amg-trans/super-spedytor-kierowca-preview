package eu.amgtrans.superspedytor.driver.sync;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public final class DriverEventSynchronizerTest {
    @Test
    public void removesEventOnlyAfterOwnerConfirmedReadback() {
        TestOutbox outbox = outboxWithOneEvent();
        DriverApi api = event -> new DriverEventReceipt(true, "arrived", 12L);

        SyncResult result = new DriverEventSynchronizer(outbox, api).synchronize();

        assertEquals(1, result.confirmed());
        assertEquals(0, result.retained());
        assertEquals(0, result.failed());
        assertEquals(0, outbox.pendingEvents().size());
    }

    @Test
    public void keepsEventWhenServerDoesNotReturnOwnerConfirmation() {
        TestOutbox outbox = outboxWithOneEvent();
        DriverApi api = event -> new DriverEventReceipt(false, "accepted", 0L);

        SyncResult result = new DriverEventSynchronizer(outbox, api).synchronize();

        assertEquals(0, result.confirmed());
        assertEquals(1, result.retained());
        assertEquals(0, result.failed());
        assertEquals(1, outbox.pendingEvents().size());
    }

    @Test
    public void keepsEventWhenTransportFails() {
        TestOutbox outbox = outboxWithOneEvent();
        DriverApi api = event -> {
            throw new IOException("offline");
        };

        SyncResult result = new DriverEventSynchronizer(outbox, api).synchronize();

        assertEquals(0, result.confirmed());
        assertEquals(0, result.retained());
        assertEquals(1, result.failed());
        assertEquals(1, outbox.pendingEvents().size());
    }

    @Test(expected = IllegalArgumentException.class)
    public void rejectsOwnerConfirmationWithoutVersionedReadback() {
        new DriverEventReceipt(true, "arrived", 0L);
    }

    private static TestOutbox outboxWithOneEvent() {
        TestOutbox outbox = new TestOutbox();
        outbox.enqueueIfAbsent(new PendingDriverEvent(
                "event-1",
                "point-1",
                DriverEventType.ARRIVAL_CONFIRMED,
                1L
        ));
        return outbox;
    }

    private static final class TestOutbox implements DriverEventOutbox {
        private final List<PendingDriverEvent> events = new ArrayList<>();

        @Override
        public boolean enqueueIfAbsent(PendingDriverEvent event) {
            for (PendingDriverEvent pending : events) {
                if (pending.routePointId().equals(event.routePointId()) && pending.type() == event.type()) {
                    return false;
                }
            }
            events.add(event);
            return true;
        }

        @Override
        public List<PendingDriverEvent> pendingEvents() {
            return List.copyOf(events);
        }

        @Override
        public void remove(String idempotencyKey) {
            events.removeIf(event -> event.idempotencyKey().equals(idempotencyKey));
        }

        @Override
        public void clear() {
            events.clear();
        }
    }
}
