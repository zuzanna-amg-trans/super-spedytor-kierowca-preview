package eu.amgtrans.superspedytor.driver;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.SafeBrowsingResponse;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.IOException;
import java.util.Locale;

import org.json.JSONObject;

import eu.amgtrans.superspedytor.driver.backend.BackendSession;
import eu.amgtrans.superspedytor.driver.camera.CameraFileProvider;
import eu.amgtrans.superspedytor.driver.data.DemoDriverRepository;
import eu.amgtrans.superspedytor.driver.data.DriverRepository;
import eu.amgtrans.superspedytor.driver.data.LiveDriverRepository;
import eu.amgtrans.superspedytor.driver.model.DriverAssignment;
import eu.amgtrans.superspedytor.driver.model.RouteStop;
import eu.amgtrans.superspedytor.driver.model.StopSyncState;
import eu.amgtrans.superspedytor.driver.navigation.NavigationLauncher;

/**
 * Native Android shell for the shared Super Spedytor driver interface.
 *
 * The visual layer comes from the same dist/ files as the reviewed browser
 * prototype. Android owns only safe-area insets, file selection, external
 * navigation and the durable offline event outbox.
 */
public final class MainActivity extends Activity {
    private static final String APP_URL =
            "file:///android_asset/index.html?" + BuildConfig.APP_QUERY;
    private static final String BRIDGE_NAME = "SuperSpedytorNative";
    private static final int FILE_CHOOSER_REQUEST = 2601;

    private DriverRepository repository;
    private BackendSession backendSession;
    private WebView webView;
    private ValueCallback<Uri[]> pendingFileSelection;
    private Uri pendingCameraUri;

    @Override
    @SuppressWarnings("deprecation")
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.WHITE);
        getWindow().setNavigationBarColor(Color.WHITE);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        setContentView(R.layout.activity_main);

        if (BuildConfig.DEMO_MODE) {
            repository = new DemoDriverRepository(this);
        } else {
            LiveDriverRepository liveRepository = new LiveDriverRepository();
            repository = liveRepository;
            backendSession = new BackendSession(
                    BuildConfig.BACKEND_BASE_URL,
                    stateJson -> {
                        liveRepository.updateFromBackendState(stateJson);
                        publishBackendState(stateJson);
                    }
            );
        }
        webView = findViewById(R.id.driverWebView);
        applySystemBarInsets();
        configureWebView();
        webView.loadUrl(APP_URL);
    }

    @SuppressWarnings({"SetJavaScriptEnabled", "deprecation"})
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setTextZoom(100);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        // This build packages the reviewed UI in android_asset. Never keep an
        // older flow.js after an in-place APK update on a driver's device.
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            settings.setForceDark(WebSettings.FORCE_DARK_OFF);
        }

        webView.setBackgroundColor(Color.rgb(245, 245, 243));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.addJavascriptInterface(new NativeBridge(), BRIDGE_NAME);
        boolean debuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(debuggable);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return openOutsideApp(request.getUrl());
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return openOutsideApp(Uri.parse(url));
            }

            @Override
            public void onSafeBrowsingHit(
                    WebView view,
                    WebResourceRequest request,
                    int threatType,
                    SafeBrowsingResponse callback
            ) {
                callback.backToSafety(true);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (backendSession != null) {
                    publishBackendState(backendSession.currentStateJson());
                }
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(
                    WebView view,
                    WebResourceRequest request
            ) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                if (scheme != null
                        && !scheme.equals("file")
                        && !scheme.equals("data")
                        && !scheme.equals("blob")) {
                    return new WebResourceResponse("text/plain", "UTF-8", null);
                }
                return super.shouldInterceptRequest(view, request);
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView source,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams parameters
            ) {
                cancelPendingFileSelection();
                pendingFileSelection = callback;
                try {
                    launchFileChooser(parameters);
                    return true;
                } catch (ActivityNotFoundException | IOException exception) {
                    cancelPendingFileSelection();
                    Toast.makeText(MainActivity.this, R.string.file_picker_unavailable,
                            Toast.LENGTH_LONG).show();
                    return false;
                }
            }
        });
    }

    private void launchFileChooser(WebChromeClient.FileChooserParams parameters)
            throws IOException {
        Intent pickerIntent = parameters.createIntent();
        Intent cameraIntent = acceptsImages(parameters) ? createCameraIntent() : null;

        Intent launchIntent;
        if (cameraIntent == null) {
            launchIntent = pickerIntent;
        } else {
            launchIntent = Intent.createChooser(
                    pickerIntent,
                    getString(R.string.file_chooser_title)
            );
            launchIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{cameraIntent});
        }
        startActivityForResult(launchIntent, FILE_CHOOSER_REQUEST);
    }

    private boolean acceptsImages(WebChromeClient.FileChooserParams parameters) {
        if (parameters.isCaptureEnabled()) return true;
        String[] acceptTypes = parameters.getAcceptTypes();
        if (acceptTypes == null) return false;
        for (String acceptType : acceptTypes) {
            if (acceptType == null || acceptType.trim().isEmpty()) continue;
            if (acceptType.toLowerCase(Locale.ROOT).contains("image")) return true;
        }
        return false;
    }

    private Intent createCameraIntent() throws IOException {
        Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        if (intent.resolveActivity(getPackageManager()) == null) return null;

        pendingCameraUri = CameraFileProvider.createImageUri(this);
        intent.putExtra(MediaStore.EXTRA_OUTPUT, pendingCameraUri);
        intent.setClipData(ClipData.newRawUri("Super Spedytor photo", pendingCameraUri));
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        return intent;
    }

    @SuppressWarnings("deprecation")
    private void applySystemBarInsets() {
        View root = findViewById(R.id.rootLayout);
        int initialStart = root.getPaddingStart();
        int initialTop = root.getPaddingTop();
        int initialEnd = root.getPaddingEnd();
        int initialBottom = root.getPaddingBottom();

        root.setOnApplyWindowInsetsListener((view, insets) -> {
            int top;
            int bottom;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                android.graphics.Insets systemBars = insets.getInsets(WindowInsets.Type.systemBars());
                top = systemBars.top;
                bottom = systemBars.bottom;
            } else {
                top = insets.getSystemWindowInsetTop();
                bottom = insets.getSystemWindowInsetBottom();
            }
            view.setPaddingRelative(initialStart, initialTop + top,
                    initialEnd, initialBottom + bottom);
            return insets;
        });
        // requestApplyInsets() can be ignored before the view is attached on
        // recent edge-to-edge Android releases. Posting it guarantees that the
        // root container receives the real status/navigation bar dimensions.
        root.post(root::requestApplyInsets);
    }

    private boolean openOutsideApp(Uri uri) {
        String scheme = uri.getScheme();
        if (scheme == null || scheme.equals("file") || scheme.equals("about")) return false;

        RouteStop mapStop = stopForMapUri(uri);
        if (mapStop != null && isDirectionsUri(uri)) {
            if (NavigationLauncher.launch(this, mapStop)) {
                repository.markNavigationStarted(mapStop.id());
            } else {
                Toast.makeText(this, R.string.no_navigation_app, Toast.LENGTH_LONG).show();
            }
            return true;
        }
        if (mapStop != null && isLocationUri(uri)) {
            if (!NavigationLauncher.showLocation(this, mapStop)) {
                Toast.makeText(this, R.string.external_app_unavailable, Toast.LENGTH_LONG).show();
            }
            return true;
        }

        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        if (scheme.equals("tel")) intent.setAction(Intent.ACTION_DIAL);
        try {
            startActivity(intent);
        } catch (ActivityNotFoundException exception) {
            Toast.makeText(this, R.string.external_app_unavailable, Toast.LENGTH_LONG).show();
        }
        return true;
    }

    private boolean isDirectionsUri(Uri uri) {
        String host = uri.getHost();
        String path = uri.getPath();
        return host != null
                && host.toLowerCase(Locale.ROOT).contains("google.com")
                && path != null
                && path.startsWith("/maps/dir");
    }

    private boolean isLocationUri(Uri uri) {
        String host = uri.getHost();
        String path = uri.getPath();
        return host != null
                && host.toLowerCase(Locale.ROOT).contains("google.com")
                && path != null
                && path.startsWith("/maps/search");
    }

    private RouteStop stopForMapUri(Uri uri) {
        String target = uri.getQueryParameter("destination");
        if (target == null) target = uri.getQueryParameter("query");
        if (target == null) return null;
        String normalizedTarget = target.toLowerCase(Locale.ROOT);
        double[] coordinates = parseCoordinates(target);
        for (RouteStop stop : repository.activeAssignment().stops()) {
            String address = stop.address().toLowerCase(Locale.ROOT);
            boolean addressMatches = normalizedTarget.contains(address)
                    || address.contains(normalizedTarget);
            boolean coordinatesMatch = coordinates != null
                    && Math.abs(stop.latitude() - coordinates[0]) < 0.00001
                    && Math.abs(stop.longitude() - coordinates[1]) < 0.00001;
            if (addressMatches || coordinatesMatch) {
                return stop;
            }
        }
        return null;
    }

    private double[] parseCoordinates(String value) {
        String[] parts = value.split(",", 2);
        if (parts.length != 2) return null;
        try {
            return new double[]{
                    Double.parseDouble(parts[0].trim()),
                    Double.parseDouble(parts[1].trim())
            };
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private void publishBackendState(String stateJson) {
        WebView currentWebView = webView;
        if (currentWebView == null) return;
        String quoted = JSONObject.quote(stateJson);
        runOnUiThread(() -> {
            if (webView == null) return;
            webView.evaluateJavascript(
                    "window.SuperSpedytorBackend?.receive(" + quoted + ")",
                    null
            );
        });
    }

    private RouteStop findStop(String stopId) {
        if (stopId == null) return null;
        DriverAssignment assignment = repository.activeAssignment();
        for (RouteStop stop : assignment.stops()) {
            if (stop.id().equals(stopId)) return stop;
        }
        return null;
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || pendingFileSelection == null) return;

        boolean cameraHasPhoto = resultCode == RESULT_OK
                && CameraFileProvider.hasContent(this, pendingCameraUri)
                && (data == null || (data.getData() == null && data.getClipData() == null));
        Uri[] result = cameraHasPhoto
                ? new Uri[]{pendingCameraUri}
                : WebChromeClient.FileChooserParams.parseResult(resultCode, data);

        if (!cameraHasPhoto) CameraFileProvider.delete(this, pendingCameraUri);
        revokeCameraPermission();
        pendingFileSelection.onReceiveValue(result);
        pendingFileSelection = null;
        pendingCameraUri = null;
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        cancelPendingFileSelection();
        if (backendSession != null) {
            backendSession.close();
            backendSession = null;
        }
        if (webView != null) {
            webView.removeJavascriptInterface(BRIDGE_NAME);
            webView.stopLoading();
            webView.loadUrl("about:blank");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private void cancelPendingFileSelection() {
        if (pendingFileSelection != null) {
            pendingFileSelection.onReceiveValue(null);
            pendingFileSelection = null;
        }
        CameraFileProvider.delete(this, pendingCameraUri);
        revokeCameraPermission();
        pendingCameraUri = null;
    }

    private void revokeCameraPermission() {
        if (pendingCameraUri == null) return;
        revokeUriPermission(
                pendingCameraUri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
        );
    }

    private final class NativeBridge {
        @JavascriptInterface
        public boolean hasArrival(String stopId) {
            RouteStop stop = findStop(stopId);
            return stop != null && stop.syncState() == StopSyncState.PENDING_SYNC;
        }

        @JavascriptInterface
        public void markArrivalConfirmed(String stopId) {
            if (findStop(stopId) != null) repository.markArrived(stopId);
        }

        @JavascriptInterface
        public int pendingEventCount() {
            return repository.pendingEventCount();
        }

        @JavascriptInterface
        public void openExternal(String url) {
            if (url == null) return;
            Uri uri = Uri.parse(url);
            runOnUiThread(() -> openOutsideApp(uri));
        }

        @JavascriptInterface
        public void resetDemo() {
            repository.resetDemo();
        }

        @JavascriptInterface
        public boolean backendEnabled() {
            return backendSession != null;
        }

        @JavascriptInterface
        public String backendState() {
            return backendSession == null
                    ? "{\"status\":\"preview\",\"message\":\"Tryb demonstracyjny\"}"
                    : backendSession.currentStateJson();
        }

        @JavascriptInterface
        public void backendLogin(String username, String password) {
            if (backendSession != null) backendSession.login(username, password);
        }

        @JavascriptInterface
        public void backendRefresh() {
            if (backendSession != null) backendSession.refresh();
        }

        @JavascriptInterface
        public void backendLogout() {
            if (backendSession != null) backendSession.logout();
        }
    }
}
