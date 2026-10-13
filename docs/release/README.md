# Wydanie Google Play

Ten katalog zawiera roboczy pakiet wydawniczy aplikacji Super Spedytor
Kierowca. Dokumenty nie są dowodem publikacji ani gotowości produkcyjnej.

## Aktualny stan

- aplikacja działa lokalnie na telefonie jako wariant debug,
- osobny wariant Preview działa całkowicie offline na danych syntetycznych,
- dane i przebieg pozostają demonstracyjne,
- wariant połączony używa produkcyjnego logowania i odczytu TMS, ale pozostaje
  wyłącznie do odczytu,
- produkcyjny build jest automatycznie blokowany,
- osobny, ręczny workflow GitHub przygotowuje podpisany AAB do Internal Testing,
- własny interfejs Android Auto nie jest deklarowany,
- wariant 1 przekazuje cel do Google Maps.

## Dokumenty

- [`play-store-readiness.md`](play-store-readiness.md) — bramki techniczne,
  produktowe i zgodności,
- [`store-listing-pl-PL.md`](store-listing-pl-PL.md) — polska karta sklepu,
- [`privacy-policy-draft-pl.md`](privacy-policy-draft-pl.md) — szkic polityki
  prywatności z oznaczonymi brakami,
- [`data-safety-draft.md`](data-safety-draft.md) — arkusz do finalnej deklaracji
  Google Play,
- [`app-access-draft.md`](app-access-draft.md) — wymagania konta recenzenta,
- [`internal-testing-release-notes.md`](internal-testing-release-notes.md) —
  notatki dla pierwszej ścieżki testowej,
- [`upload-key-record.md`](upload-key-record.md) — publiczny odcisk certyfikatu
  uploadowego i zasady przechowywania prywatnego klucza,
- [`offline-preview.md`](offline-preview.md) — instalowalny pakiet pokazowy bez
  backendu i bez uprawnienia sieciowego.

## GitHub i klucz uploadowy

Kod, workflow, dokumentacja, raporty oraz wygenerowane artefakty APK/AAB mają być
utrzymywane w repozytorium organizacji GitHub. Plik klucza uploadowego i jego
hasła nie mogą być commitowane. Workflow oczekuje ich jako zaszyfrowanych
sekretów repozytorium:

- `SS_UPLOAD_KEYSTORE_BASE64`,
- `SS_UPLOAD_STORE_PASSWORD`,
- `SS_UPLOAD_KEY_ALIAS`,
- `SS_UPLOAD_KEY_PASSWORD`.

Po ręcznym uruchomieniu workflow `Zbuduj AAB do Google Play Internal Testing`
GitHub przechowuje podpisany AAB, raport lint i metadane SHA-256 jako artefakt
konkretnego przebiegu.

Na macOS klucz można jednorazowo utworzyć poleceniem
`android-app/scripts/create-upload-key-macos.sh`. Skrypt odmawia nadpisania
istniejącego pliku, zapisuje klucz poza repozytorium oraz umieszcza hasło w Pęku
kluczy. Lokalną paczkę kontrolną buduje
`android-app/scripts/build-internal-from-keychain-macos.sh`.

Nie wolno usuwać oznaczeń `SZKIC`, wpisywać odpowiedzi do Play Console ani
publikować polityki jako finalnej przed odbiorem stagingu i weryfikacją danych.
