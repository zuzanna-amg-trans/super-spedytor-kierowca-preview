package eu.amgtrans.superspedytor.driver.model;

import java.util.List;

public final class RouteProgress {
    private RouteProgress() {}

    public static int completedCount(List<RouteStop> stops) {
        int completed = 0;
        for (RouteStop stop : stops) {
            if (stop.completed()) completed++;
        }
        return completed;
    }

    public static int nextStopIndex(List<RouteStop> stops) {
        for (int index = 0; index < stops.size(); index++) {
            if (!stops.get(index).completed()) return index;
        }
        return -1;
    }

    public static int progressPercent(List<RouteStop> stops) {
        if (stops.isEmpty()) return 0;
        return Math.round((completedCount(stops) * 100f) / stops.size());
    }
}
