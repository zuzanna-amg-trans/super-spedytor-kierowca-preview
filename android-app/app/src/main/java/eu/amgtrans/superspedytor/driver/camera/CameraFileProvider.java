package eu.amgtrans.superspedytor.driver.camera;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.Objects;
import java.util.UUID;

/**
 * Minimal, private content provider for photos captured by an external camera.
 *
 * The provider exposes only one randomly named JPEG from the app cache and is
 * never exported. The camera receives a temporary URI permission from the
 * launch intent; the photo remains local to the application afterwards.
 */
public final class CameraFileProvider extends ContentProvider {
    private static final String DIRECTORY_NAME = "camera";
    private static final String MIME_TYPE_JPEG = "image/jpeg";

    public static Uri createImageUri(Context context) throws IOException {
        File directory = cameraDirectory(context);
        if (!directory.exists() && !directory.mkdirs()) {
            throw new IOException("Could not create camera cache directory");
        }
        String fileName = "ss-preview-" + UUID.randomUUID() + ".jpg";
        File image = new File(directory, fileName);
        if (!image.createNewFile()) {
            throw new IOException("Could not create camera image file");
        }
        return new Uri.Builder()
                .scheme("content")
                .authority(context.getPackageName() + ".camera")
                .appendPath(fileName)
                .build();
    }

    public static boolean hasContent(Context context, Uri uri) {
        if (uri == null) return false;
        try {
            return resolveFile(context, uri).length() > 0;
        } catch (FileNotFoundException exception) {
            return false;
        }
    }

    public static void delete(Context context, Uri uri) {
        if (uri == null) return;
        try {
            File file = resolveFile(context, uri);
            if (file.exists()) file.delete();
        } catch (FileNotFoundException ignored) {
            // The temporary file is already gone.
        }
    }

    @Override
    public boolean onCreate() {
        Context context = getContext();
        if (context == null) return false;
        File directory = cameraDirectory(context);
        return directory.exists() || directory.mkdirs();
    }

    @Override
    public String getType(Uri uri) {
        return MIME_TYPE_JPEG;
    }

    @Override
    public Cursor query(
            Uri uri,
            String[] projection,
            String selection,
            String[] selectionArgs,
            String sortOrder
    ) {
        Context context = Objects.requireNonNull(getContext());
        File file;
        try {
            file = resolveFile(context, uri);
        } catch (FileNotFoundException exception) {
            return new MatrixCursor(projection == null
                    ? new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE}
                    : projection);
        }
        String[] columns = projection == null
                ? new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE}
                : projection;
        MatrixCursor cursor = new MatrixCursor(columns, 1);
        MatrixCursor.RowBuilder row = cursor.newRow();
        for (String column : columns) {
            if (OpenableColumns.DISPLAY_NAME.equals(column)) row.add(file.getName());
            else if (OpenableColumns.SIZE.equals(column)) row.add(file.length());
            else row.add(null);
        }
        return cursor;
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        Context context = Objects.requireNonNull(getContext());
        File file = resolveFile(context, uri);
        return ParcelFileDescriptor.open(file, ParcelFileDescriptor.parseMode(mode));
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        throw new UnsupportedOperationException("Insert is not supported");
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        throw new UnsupportedOperationException("Update is not supported");
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        Context context = Objects.requireNonNull(getContext());
        try {
            return resolveFile(context, uri).delete() ? 1 : 0;
        } catch (FileNotFoundException exception) {
            return 0;
        }
    }

    private static File cameraDirectory(Context context) {
        return new File(context.getCacheDir(), DIRECTORY_NAME);
    }

    private static File resolveFile(Context context, Uri uri) throws FileNotFoundException {
        if (!"content".equals(uri.getScheme())
                || !(context.getPackageName() + ".camera").equals(uri.getAuthority())
                || uri.getPathSegments().size() != 1) {
            throw new FileNotFoundException("Unknown camera URI");
        }
        String fileName = uri.getLastPathSegment();
        if (fileName == null || fileName.contains("/") || fileName.contains("\\")) {
            throw new FileNotFoundException("Invalid camera file name");
        }
        File directory = cameraDirectory(context);
        File file = new File(directory, fileName);
        try {
            String directoryPath = directory.getCanonicalPath() + File.separator;
            if (!file.getCanonicalPath().startsWith(directoryPath)) {
                throw new FileNotFoundException("Camera URI escaped cache directory");
            }
        } catch (IOException exception) {
            throw new FileNotFoundException("Could not resolve camera file");
        }
        return file;
    }
}
