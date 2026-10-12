package eu.amgtrans.superspedytor.driver.sync;

import java.io.IOException;

public interface DriverApi {
    DriverEventReceipt sendEvent(PendingDriverEvent event) throws IOException;
}
