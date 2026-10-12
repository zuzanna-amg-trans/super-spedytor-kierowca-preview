package eu.amgtrans.superspedytor.driver.model;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

import java.util.List;

public final class RouteProgressTest {
    private RouteStop stop(String id, boolean completed) {
        return new RouteStop(id, StopType.LOADING, id, "address", "PL", 1, 2, "window", "note", completed);
    }

    @Test
    public void findsFirstIncompleteStop() {
        List<RouteStop> stops = List.of(stop("one", true), stop("two", false), stop("three", false));

        assertEquals(1, RouteProgress.nextStopIndex(stops));
        assertEquals(1, RouteProgress.completedCount(stops));
        assertEquals(33, RouteProgress.progressPercent(stops));
    }

    @Test
    public void returnsCompleteWhenAllStopsFinished() {
        List<RouteStop> stops = List.of(stop("one", true), stop("two", true));

        assertEquals(-1, RouteProgress.nextStopIndex(stops));
        assertEquals(100, RouteProgress.progressPercent(stops));
    }
}
