package eu.amgtrans.superspedytor.driver.sync;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public final class PendingDriverEventTest {
    @Test
    public void exposesStableWireValuesAndUtcTimestamp() {
        PendingDriverEvent event = new PendingDriverEvent(
                "event-123",
                "point-45",
                DriverEventType.ARRIVAL_CONFIRMED,
                1_767_225_600_000L
        );

        assertEquals("event-123", event.idempotencyKey());
        assertEquals("point-45", event.routePointId());
        assertEquals("arrival_confirmed", event.type().wireValue());
        assertEquals("2026-01-01T00:00:00Z", event.occurredAtIso8601());
    }

    @Test(expected = IllegalArgumentException.class)
    public void rejectsBlankRoutePointId() {
        new PendingDriverEvent("event-123", " ", DriverEventType.NAVIGATION_STARTED, 1L);
    }
}
