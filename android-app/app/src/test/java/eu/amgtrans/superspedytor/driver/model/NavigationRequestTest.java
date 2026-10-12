package eu.amgtrans.superspedytor.driver.model;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

import eu.amgtrans.superspedytor.driver.navigation.NavigationRequest;

public final class NavigationRequestTest {
    @Test
    public void createsDrivingNavigationUriWithStableDecimalSeparator() {
        assertEquals(
                "google.navigation:q=52.229676,21.012229&mode=d",
                NavigationRequest.googleNavigationUri(52.229676, 21.012229)
        );
    }

    @Test
    public void createsPointOnlyUriWithStableDecimalSeparator() {
        assertEquals(
                "geo:52.229676,21.012229?q=52.229676,21.012229",
                NavigationRequest.geoUri(52.229676, 21.012229)
        );
    }
}
