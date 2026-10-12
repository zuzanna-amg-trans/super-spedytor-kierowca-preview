package eu.amgtrans.superspedytor.driver.sync;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public final class PendingDriverEvent {
    private final String idempotencyKey;
    private final String routePointId;
    private final DriverEventType type;
    private final long occurredAtEpochMillis;

    public PendingDriverEvent(
            String idempotencyKey,
            String routePointId,
            DriverEventType type,
            long occurredAtEpochMillis
    ) {
        this.idempotencyKey = requireText(idempotencyKey, "idempotencyKey");
        this.routePointId = requireText(routePointId, "routePointId");
        this.type = Objects.requireNonNull(type);
        if (occurredAtEpochMillis <= 0) {
            throw new IllegalArgumentException("occurredAtEpochMillis must be positive");
        }
        this.occurredAtEpochMillis = occurredAtEpochMillis;
    }

    public static PendingDriverEvent create(String routePointId, DriverEventType type) {
        return new PendingDriverEvent(
                UUID.randomUUID().toString(),
                routePointId,
                type,
                System.currentTimeMillis()
        );
    }

    private static String requireText(String value, String fieldName) {
        Objects.requireNonNull(value);
        if (value.isBlank()) throw new IllegalArgumentException(fieldName + " must not be blank");
        return value;
    }

    public String idempotencyKey() { return idempotencyKey; }
    public String routePointId() { return routePointId; }
    public DriverEventType type() { return type; }
    public long occurredAtEpochMillis() { return occurredAtEpochMillis; }
    public String occurredAtIso8601() { return Instant.ofEpochMilli(occurredAtEpochMillis).toString(); }
}
