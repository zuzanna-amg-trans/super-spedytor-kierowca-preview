package eu.amgtrans.superspedytor.driver.sync;

import android.content.SharedPreferences;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public final class SharedPreferencesDriverEventOutbox implements DriverEventOutbox {
    private static final String IDS = "outbox.event_ids";
    private static final String PREFIX = "outbox.event.";

    private final SharedPreferences preferences;

    public SharedPreferencesDriverEventOutbox(SharedPreferences preferences) {
        this.preferences = preferences;
    }

    @Override
    public synchronized boolean enqueueIfAbsent(PendingDriverEvent event) {
        for (PendingDriverEvent pending : pendingEvents()) {
            if (pending.routePointId().equals(event.routePointId()) && pending.type() == event.type()) {
                return false;
            }
        }

        Set<String> ids = mutableIds();
        ids.add(event.idempotencyKey());
        String eventPrefix = eventPrefix(event.idempotencyKey());
        SharedPreferences.Editor editor = preferences.edit()
                .putStringSet(IDS, ids)
                .putString(eventPrefix + "route_point_id", event.routePointId())
                .putString(eventPrefix + "type", event.type().wireValue())
                .putLong(eventPrefix + "occurred_at", event.occurredAtEpochMillis());
        commitOrThrow(editor);
        return true;
    }

    @Override
    public synchronized List<PendingDriverEvent> pendingEvents() {
        List<PendingDriverEvent> result = new ArrayList<>();
        for (String id : mutableIds()) {
            String eventPrefix = eventPrefix(id);
            String pointId = preferences.getString(eventPrefix + "route_point_id", null);
            String typeValue = preferences.getString(eventPrefix + "type", null);
            long occurredAt = preferences.getLong(eventPrefix + "occurred_at", 0L);
            if (pointId == null || typeValue == null || occurredAt <= 0) continue;
            try {
                result.add(new PendingDriverEvent(
                        id,
                        pointId,
                        DriverEventType.fromWireValue(typeValue),
                        occurredAt
                ));
            } catch (IllegalArgumentException ignored) {
                // Keep an unreadable record in preferences for forensic inspection.
            }
        }
        result.sort(Comparator.comparingLong(PendingDriverEvent::occurredAtEpochMillis));
        return List.copyOf(result);
    }

    @Override
    public synchronized void remove(String idempotencyKey) {
        Set<String> ids = mutableIds();
        ids.remove(idempotencyKey);
        String eventPrefix = eventPrefix(idempotencyKey);
        SharedPreferences.Editor editor = preferences.edit()
                .putStringSet(IDS, ids)
                .remove(eventPrefix + "route_point_id")
                .remove(eventPrefix + "type")
                .remove(eventPrefix + "occurred_at");
        commitOrThrow(editor);
    }

    @Override
    public synchronized void clear() {
        SharedPreferences.Editor editor = preferences.edit();
        for (String id : mutableIds()) {
            String eventPrefix = eventPrefix(id);
            editor.remove(eventPrefix + "route_point_id")
                    .remove(eventPrefix + "type")
                    .remove(eventPrefix + "occurred_at");
        }
        editor.remove(IDS);
        commitOrThrow(editor);
    }

    private Set<String> mutableIds() {
        Set<String> stored = preferences.getStringSet(IDS, Set.of());
        return new HashSet<>(stored == null ? Set.of() : stored);
    }

    private static String eventPrefix(String idempotencyKey) {
        return PREFIX + idempotencyKey + ".";
    }

    private static void commitOrThrow(SharedPreferences.Editor editor) {
        if (!editor.commit()) {
            throw new IllegalStateException("Could not persist the driver event outbox");
        }
    }
}
