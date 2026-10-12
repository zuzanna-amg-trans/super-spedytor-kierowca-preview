package eu.amgtrans.superspedytor.driver.data;

import eu.amgtrans.superspedytor.driver.model.DriverAssignment;

public interface DriverRepository {
    DriverAssignment activeAssignment();
    void markNavigationStarted(String stopId);
    void markArrived(String stopId);
    int pendingEventCount();
    void resetDemo();
}
