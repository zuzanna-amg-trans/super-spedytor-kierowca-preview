#!/bin/sh
set -eu

umask 077

key_dir="${1:-$HOME/Library/Application Support/AMG Trans/Android Signing}"
key_path="$key_dir/super-spedytor-upload.jks"
key_alias="super-spedytor-upload"
keychain_service="eu.amgtrans.superspedytor.driver.upload"

if [ -e "$key_path" ]; then
  printf 'Odmowa nadpisania istniejącego klucza: %s\n' "$key_path" >&2
  exit 1
fi

command -v keytool >/dev/null 2>&1 || {
  printf 'Brak keytool w PATH.\n' >&2
  exit 1
}
command -v openssl >/dev/null 2>&1 || {
  printf 'Brak openssl w PATH.\n' >&2
  exit 1
}
command -v security >/dev/null 2>&1 || {
  printf 'Skrypt wymaga Pęku kluczy macOS (polecenie security).\n' >&2
  exit 1
}

mkdir -p "$key_dir"
store_password=$(openssl rand -base64 36 | tr -d '\n')

cleanup_incomplete_key() {
  if [ "${completed:-false}" != "true" ]; then
    rm -f "$key_path"
  fi
}
trap cleanup_incomplete_key EXIT HUP INT TERM

keytool -genkeypair \
  -keystore "$key_path" \
  -storetype PKCS12 \
  -storepass "$store_password" \
  -keypass "$store_password" \
  -alias "$key_alias" \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -dname "CN=AMG Poland Sp. z o.o., OU=Mobile, O=AMG Poland Sp. z o.o., L=Krakow, C=PL"

security add-generic-password -U \
  -s "$keychain_service" \
  -a "store-password" \
  -w "$store_password" >/dev/null
security add-generic-password -U \
  -s "$keychain_service" \
  -a "key-password" \
  -w "$store_password" >/dev/null
security add-generic-password -U \
  -s "$keychain_service" \
  -a "key-alias" \
  -w "$key_alias" >/dev/null

completed=true
trap - EXIT HUP INT TERM

printf 'Utworzono klucz uploadowy poza repozytorium:\n%s\n' "$key_path"
printf 'Alias: %s\n' "$key_alias"
printf 'Hasło zapisano w Pęku kluczy jako usługa: %s\n' "$keychain_service"
keytool -list -v \
  -keystore "$key_path" \
  -storepass "$store_password" \
  -alias "$key_alias" \
  | sed -n '/SHA256:/p'
