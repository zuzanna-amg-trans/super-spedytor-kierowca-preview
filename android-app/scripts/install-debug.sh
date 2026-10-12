#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
SDK_ROOT=${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/Users/zuzannasarapata/Library/Android/sdk}}
ADB="$SDK_ROOT/platform-tools/adb"
APK="$PROJECT_DIR/app/build/outputs/apk/debug/app-debug.apk"
PACKAGE="eu.amgtrans.superspedytor.driver.debug"
ACTIVITY="eu.amgtrans.superspedytor.driver.MainActivity"

if [ ! -x "$ADB" ]; then
    echo "Brak ADB: $ADB" >&2
    exit 1
fi

if [ ! -f "$APK" ]; then
    echo "Brak APK. Najpierw uruchom ./gradlew assembleDebug." >&2
    exit 1
fi

DEVICE_COUNT=$(
    "$ADB" devices |
        awk 'NR > 1 && $2 == "device" { count++ } END { print count + 0 }'
)

if [ "$DEVICE_COUNT" -ne 1 ]; then
    echo "Wymagane jest dokładnie jedno gotowe urządzenie ADB; znaleziono: $DEVICE_COUNT" >&2
    "$ADB" devices -l >&2
    exit 1
fi

"$ADB" install -r "$APK"
"$ADB" shell am start -n "$PACKAGE/$ACTIVITY"
