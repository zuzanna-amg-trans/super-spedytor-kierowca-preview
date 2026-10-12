package eu.amgtrans.superspedytor.driver.backend;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Minimal native client for the existing Super Spedytor driver read surface.
 *
 * Credentials are used only for the login request. Access and refresh tokens
 * stay in process memory and are never exposed to the WebView or written to
 * disk. A later release can add Android Keystore-backed persistence after the
 * mobile-session policy is agreed with the backend owner.
 */
public final class BackendSession implements AutoCloseable {
    public interface Listener {
        void onStateChanged(String stateJson);
    }

    private static final int CONNECT_TIMEOUT_MS = 15_000;
    private static final int READ_TIMEOUT_MS = 25_000;
    private static final int MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
    private static final String REFRESH_COOKIE_NAME = "refresh_token";

    private final String baseUrl;
    private final Listener listener;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private volatile String accessToken;
    private volatile String refreshCookie;
    private volatile String stateJson;

    public BackendSession(String baseUrl, Listener listener) {
        if (baseUrl == null || !baseUrl.startsWith("https://")) {
            throw new IllegalArgumentException("Backend URL must use HTTPS");
        }
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
        this.listener = listener;
        stateJson = state("disconnected", "Zaloguj się kontem kierowcy Super Spedytora")
                .toString();
    }

    public String currentStateJson() {
        return stateJson;
    }

    public void login(String username, String password) {
        String safeUsername = username == null ? "" : username.trim();
        String safePassword = password == null ? "" : password;
        if (safeUsername.isEmpty() || safePassword.isEmpty()) {
            publish(state("error", "Podaj login i hasło"));
            return;
        }

        publish(state("connecting", "Łączenie z Super Spedytorem…"));
        executor.execute(() -> {
            try {
                JSONObject credentials = new JSONObject()
                        .put("username", safeUsername)
                        .put("password", safePassword)
                        .put("remember_me", false);
                HttpResult result = request("POST", "token/", credentials, false, false);
                requireSuccess(result, "Nie udało się zalogować");

                JSONObject body = jsonObject(result.body);
                String receivedAccessToken = body.optString("access", "");
                String receivedRefreshCookie = CookieHeaderParser.findCookie(
                        result.headers, REFRESH_COOKIE_NAME
                );
                if (receivedAccessToken.isEmpty()) {
                    throw new BackendException("Backend nie zwrócił tokenu dostępu");
                }

                accessToken = receivedAccessToken;
                refreshCookie = receivedRefreshCookie;
                fetchAndPublishSnapshot();
            } catch (Exception exception) {
                clearTokens();
                publish(state("error", userMessage(exception)));
            }
        });
    }

    public void refresh() {
        if (accessToken == null || accessToken.isEmpty()) {
            publish(state("disconnected", "Sesja wygasła — zaloguj się ponownie"));
            return;
        }
        publish(state("connecting", "Odświeżanie danych kierowcy…"));
        executor.execute(() -> {
            try {
                fetchAndPublishSnapshot();
            } catch (Exception exception) {
                publish(state("error", userMessage(exception)));
            }
        });
    }

    public void logout() {
        executor.execute(() -> {
            try {
                if (refreshCookie != null && !refreshCookie.isEmpty()) {
                    request("POST", "logout/", new JSONObject(), false, true);
                }
            } catch (Exception ignored) {
                // Local token deletion is authoritative for the Android session.
            } finally {
                clearTokens();
                publish(state("disconnected", "Wylogowano z Super Spedytora"));
            }
        });
    }

    private void fetchAndPublishSnapshot() throws IOException, JSONException, BackendException {
        JSONObject profile = authenticatedGet("users/me/");
        if (!profile.optBoolean("has_driver", false)) {
            throw new BackendException("To konto nie ma profilu kierowcy");
        }

        JSONObject vehicleResponse = authenticatedGet("users/me/current-vehicle/");
        JSONObject routeStatus = authenticatedGet("routes/driver/status/");

        JSONObject connected = state("connected", "Połączono z Super Spedytorem")
                .put("read_only", true)
                .put("synced_at", Instant.now().toString())
                .put("profile", profile)
                .put("vehicle", vehicleResponse.opt("vehicle"))
                .put("route_status", routeStatus);
        publish(connected);
    }

    private JSONObject authenticatedGet(String path)
            throws IOException, JSONException, BackendException {
        HttpResult result = request("GET", path, null, true, false);
        if (result.status == HttpURLConnection.HTTP_UNAUTHORIZED && refreshAccessToken()) {
            result = request("GET", path, null, true, false);
        }
        requireSuccess(result, "Nie udało się pobrać danych kierowcy");
        return jsonObject(result.body);
    }

    private boolean refreshAccessToken() throws IOException, JSONException {
        if (refreshCookie == null || refreshCookie.isEmpty()) return false;
        HttpResult result = request("POST", "token/refresh/", new JSONObject(), false, true);
        if (result.status < 200 || result.status >= 300) return false;

        JSONObject body = jsonObject(result.body);
        String refreshedAccess = body.optString("access", "");
        if (refreshedAccess.isEmpty()) return false;
        accessToken = refreshedAccess;

        String rotatedCookie = CookieHeaderParser.findCookie(result.headers, REFRESH_COOKIE_NAME);
        if (rotatedCookie != null && !rotatedCookie.isEmpty()) refreshCookie = rotatedCookie;
        return true;
    }

    private HttpResult request(
            String method,
            String path,
            JSONObject jsonBody,
            boolean authenticated,
            boolean withRefreshCookie
    ) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) new URL(resolve(path)).openConnection();
        connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
        connection.setReadTimeout(READ_TIMEOUT_MS);
        connection.setRequestMethod(method);
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("Cache-Control", "no-store");
        connection.setUseCaches(false);

        if (authenticated && accessToken != null && !accessToken.isEmpty()) {
            connection.setRequestProperty("Authorization", "Bearer " + accessToken);
        }
        if (withRefreshCookie && refreshCookie != null && !refreshCookie.isEmpty()) {
            connection.setRequestProperty(
                    "Cookie",
                    REFRESH_COOKIE_NAME + "=" + refreshCookie
            );
        }
        if (jsonBody != null) {
            byte[] bytes = jsonBody.toString().getBytes(StandardCharsets.UTF_8);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            connection.setFixedLengthStreamingMode(bytes.length);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(bytes);
            }
        }

        try {
            int status = connection.getResponseCode();
            InputStream stream = status >= 400
                    ? connection.getErrorStream()
                    : connection.getInputStream();
            String body = stream == null ? "" : readLimited(stream);
            return new HttpResult(status, body, connection.getHeaderFields());
        } finally {
            connection.disconnect();
        }
    }

    private String resolve(String path) {
        String relative = path == null ? "" : path;
        while (relative.startsWith("/")) relative = relative.substring(1);
        return baseUrl + relative;
    }

    private static String readLimited(InputStream input) throws IOException {
        try (BufferedInputStream buffered = new BufferedInputStream(input);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] chunk = new byte[8192];
            int total = 0;
            int count;
            while ((count = buffered.read(chunk)) != -1) {
                total += count;
                if (total > MAX_RESPONSE_BYTES) {
                    throw new IOException("Backend response is too large");
                }
                output.write(chunk, 0, count);
            }
            return output.toString(StandardCharsets.UTF_8.name());
        }
    }

    private static JSONObject jsonObject(String body) throws JSONException {
        return new JSONObject(body == null || body.trim().isEmpty() ? "{}" : body);
    }

    private static void requireSuccess(HttpResult result, String fallback)
            throws BackendException {
        if (result.status >= 200 && result.status < 300) return;
        String message = fallback;
        try {
            JSONObject error = jsonObject(result.body);
            String detail = error.optString("detail", error.optString("error", ""));
            if (!detail.trim().isEmpty()) message = detail;
        } catch (JSONException ignored) {
            // The fallback is intentionally user-safe and contains no response body.
        }
        throw new BackendException(message + " (HTTP " + result.status + ")");
    }

    private static JSONObject state(String status, String message) {
        try {
            return new JSONObject()
                    .put("status", status)
                    .put("message", message);
        } catch (JSONException impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    private void publish(JSONObject state) {
        String next = state.toString();
        stateJson = next;
        listener.onStateChanged(next);
    }

    private void clearTokens() {
        accessToken = null;
        refreshCookie = null;
    }

    private static String userMessage(Exception exception) {
        if (exception instanceof BackendException) return exception.getMessage();
        if (exception instanceof IOException) {
            return "Nie można połączyć się z backendem Super Spedytora";
        }
        return "Backend zwrócił nieprawidłowe dane";
    }

    @Override
    public void close() {
        clearTokens();
        executor.shutdownNow();
    }

    private static final class HttpResult {
        private final int status;
        private final String body;
        private final Map<String, List<String>> headers;

        private HttpResult(int status, String body, Map<String, List<String>> headers) {
            this.status = status;
            this.body = body;
            this.headers = headers;
        }
    }

    private static final class BackendException extends Exception {
        private BackendException(String message) {
            super(message);
        }
    }
}
