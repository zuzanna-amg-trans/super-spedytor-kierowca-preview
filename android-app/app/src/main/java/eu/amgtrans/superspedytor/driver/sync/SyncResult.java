package eu.amgtrans.superspedytor.driver.sync;

public final class SyncResult {
    private final int confirmed;
    private final int retained;
    private final int failed;

    public SyncResult(int confirmed, int retained, int failed) {
        this.confirmed = confirmed;
        this.retained = retained;
        this.failed = failed;
    }

    public int confirmed() { return confirmed; }
    public int retained() { return retained; }
    public int failed() { return failed; }
}
