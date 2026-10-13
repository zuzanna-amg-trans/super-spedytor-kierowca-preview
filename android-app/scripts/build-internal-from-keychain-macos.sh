#!/bin/sh
set -eu

key_path="${1:-$HOME/Library/Application Support/AMG Trans/Android Signing/super-spedytor-upload.jks}"
keychain_service="eu.amgtrans.superspedytor.driver.upload"

if [ ! -f "$key_path" ]; then
  printf 'Nie znaleziono klucza uploadowego: %s\n' "$key_path" >&2
  exit 1
fi

export SS_UPLOAD_KEYSTORE_PATH="$key_path"
export SS_UPLOAD_STORE_PASSWORD
SS_UPLOAD_STORE_PASSWORD=$(security find-generic-password \
  -s "$keychain_service" -a "store-password" -w)
export SS_UPLOAD_KEY_PASSWORD
SS_UPLOAD_KEY_PASSWORD=$(security find-generic-password \
  -s "$keychain_service" -a "key-password" -w)
export SS_UPLOAD_KEY_ALIAS
SS_UPLOAD_KEY_ALIAS=$(security find-generic-password \
  -s "$keychain_service" -a "key-alias" -w)

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$script_dir/.."

./gradlew \
  testDebugUnitTest \
  lintInternal \
  bundleInternal \
  --no-daemon \
  -Pss.packageApproved=true \
  -Pss.internalReadOnlyAcknowledged=true \
  -Pss.privacyPolicyUrl=https://amg.eco/polityka-prywatnosci

aab="app/build/outputs/bundle/internal/app-internal.aab"
test -f "$aab"
printf 'Podpisany AAB:\n%s\n' "$PWD/$aab"
shasum -a 256 "$aab"
