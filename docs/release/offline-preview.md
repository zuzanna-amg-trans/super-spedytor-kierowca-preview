# Super Spedytor Preview — pakiet pokazowy offline

Ten wariant służy do prezentacji interfejsu i przejścia całego procesu na
telefonie przed podłączeniem Driver API.

## Gwarancje wariantu Preview

- osobny pakiet: `eu.amgtrans.superspedytor.driver.preview`,
- osobna nazwa na telefonie: `Super Spedytor Preview`,
- brak uprawnienia `INTERNET` w wynikowym manifeście,
- brak połączenia z backendem Super Spedytora,
- wyłącznie syntetyczne firmy, punkty, kontakty, zlecenie i numery plomb,
- pliki, zdjęcia i postęp pozostają lokalnie w aplikacji,
- widoczne oznaczenie `PREVIEW · OFFLINE`,
- WebView nie jest debuggowalny.

Przycisk nawigacji przekazuje syntetyczne współrzędne do zewnętrznej aplikacji
mapowej. Nie jest to komunikacja z backendem Super Spedytora.

## Budowanie i instalacja

```bash
cd android-app
./gradlew testDebugUnitTest lintPreview assemblePreview
./scripts/install-preview.sh
```

APK powstaje jako `app/build/outputs/apk/preview/app-preview.apk`. Jest podpisany
lokalnym kluczem debugowym wyłącznie po to, aby można go było bezpiecznie
zainstalować i pokazać na urządzeniu. Nie jest to artefakt do Google Play.

Aktualna paczka odbiorowa: `artifacts/Super-Spedytor-Preview-offline-v0.1.9.apk`
(`versionCode 10`). Jej SHA-256 i wynik kontroli manifestu są zapisane w
`artifacts/README.md`.

Produkcja pozostaje osobnym wariantem `release` i nadal podlega bramce
`verifyReleaseReadiness`.
