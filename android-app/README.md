# Super Spedytor Driver — Android

Natywna obudowa Androida dla interfejsu z `../dist/`. Warstwa wizualna ma jedno
źródło: Gradle pakuje pliki `../dist/` do zasobów APK, a bezpieczny lokalny
WebView uruchamia je bez ładowania z Internetu. Kod Androida odpowiada za paski
systemowe, wybór zdjęć i dokumentów, uruchamianie Map, kolejkę offline oraz
oddzielone od WebView połączenie HTTPS z backendem.

## Pierwszy pionowy wycinek

- ekran „W drodze” renderowany z tych samych plików co projekt „Koncepcja 07”,
- czytelny panel bieżącej i następnej operacji z miejscem, czasem oraz towarem,
- przyjazd 15 minut przed pierwszą operacją i ruchome ETA następnych punktów,
- licznik czasu na miejscu z progami 20/40/60 minut i wymaganą reakcją po 40,
- karta miejsca, schemat dojazdu i podsumowanie dwóch sztuk ładunku,
- uruchomienie nawigacji przez schemat `google.navigation:`,
- pięciosekundowe, odwracalne potwierdzenie „Dotarłem”,
- ekran po dotarciu z danymi załadowcy, listą sztuk, celem ładunku i fizycznym
  potwierdzeniem załadunku,
- stała akcja oraz dolna nawigacja `Operacja / Czat / Pomoc`,
- trwała kolejka zdarzeń offline z kluczami idempotencji,
- osobne stany „wykonane lokalnie” i „potwierdzone przez TMS”,
- granica synchronizacji, która usuwa zdarzenie dopiero po właścicielskim readbacku,
- jasna informacja, że backend produkcyjny nie jest jeszcze zmieniany.
- demonstracyjny panel protokołu przekazania auta, w którym pojazd, obie osoby i
  wyposażenie są traktowane jako jeden zrzut API, a nie ręczne pola formularza.

## Połączenie z Super Spedytorem

Warianty `debug` i `release` otwierają natywny panel logowania do
`https://tms.amg.eco/api/`. Po zalogowaniu kontem kierowcy klient pobiera:

- `GET /users/me/` — profil i potwierdzenie roli kierowcy,
- `GET /users/me/current-vehicle/` — pojazd z aktywnej trasy,
- `GET /routes/driver/status/` — własne aktywne trasy, postęp oraz bieżący i
  następny punkt.

Panel jest tylko do odczytu. Nie korzysta z szerokiego szczegółu trasy i nie
wysyła zdarzeń operacyjnych. Login, hasło, access token i refresh cookie nie są
przekazywane do WebView. Tokeny są przechowywane wyłącznie w pamięci procesu;
po restarcie aplikacja wymaga ponownego logowania.

Istniejący `GET /users/me/current-vehicle/` nie wystarcza do protokołu
przekazania: pojazd wynika tam z aktywnej trasy i odpowiedź nie obejmuje
przekazującego, przejmującego, wersji przypisania ani wyposażenia. Produkcyjne
przekazanie pozostaje zablokowane do czasu dostarczenia endpointów opisanych w
`../docs/api/driver-api-contract.md` i zweryfikowania właścicielskiego readbacku.

Po podłączeniu telefonu do Android Auto prowadzenie jest wyświetlane przez Google
Maps. Własny ekran Super Spedytora na jednostce samochodu nie jest częścią tego
etapu.

## Uruchomienie

Projekt wymaga JDK 17, Android SDK Platform 36 i Android SDK Build Tools 36.0.0.

```bash
cd android-app
ANDROID_HOME="$HOME/Library/Android/sdk" ./gradlew testDebugUnitTest assembleDebug
```

Debug APK powstaje w `app/build/outputs/apk/debug/`.

Po podłączeniu dokładnie jednego telefonu z włączonym debugowaniem USB można
zainstalować i uruchomić aplikację poleceniem:

```bash
./scripts/install-debug.sh
```

Do prezentacji bez backendu użyj osobnego, niedebugowalnego wariantu Preview:

```bash
./gradlew testDebugUnitTest lintPreview assemblePreview
./scripts/install-preview.sh
```

Preview ma osobny pakiet `.preview`, nazwę `Super Spedytor Preview`, nie zawiera
uprawnienia `INTERNET` i pokazuje wyłącznie dane syntetyczne. Szczegóły:
`../docs/release/offline-preview.md`.

Pełna checklista pilota znajduje się w
`../docs/testing/android-auto-pilot-checklist.md`.

## Ważne przed publikacją

- `applicationId` jest tymczasowo ustawione na `eu.amgtrans.superspedytor.driver`.
  Należy zatwierdzić je przed pierwszą publikacją w Google Play.
- Wariant `preview` korzysta z `DemoDriverRepository`; `debug`/`release` używa
  `LiveDriverRepository` z wąskiego, driver-scoped odczytu backendu.
- Interfejs `DriverRepository` nadal stanowi granicę pod docelowe Driver API.
- `DriverApi` i `DriverEventSynchronizer` stanowią granicę zapisu do przyszłego
  Driver API.
- Lokalny stan „Dotarłem” jest oznaczany jako `PENDING_SYNC` i nie może być
  interpretowany jako zapis w TMS.
- Po `PENDING_SYNC` aplikacja pozostaje w tej samej operacji i pokazuje ekran
  załadunku; nie przechodzi przedwcześnie do kolejnego punktu trasy.
- Funkcji zapisu demonstratora nie wolno uznawać za wysłane do TMS. Połączony
  panel nie udostępnia ich do czasu zatwierdzenia osobnego kontraktu zapisu.

## Bezpieczny build release

`assembleRelease` i `bundleRelease` uruchamiają bramkę
`verifyReleaseReadiness`. Wersja produkcyjna jest blokowana, gdy aplikacja nadal
korzysta z danych demo albo brakuje zatwierdzonej konfiguracji Play Console,
polityki danych i klucza uploadowego. Pełna lista oraz nazwy wymaganych
właściwości i zmiennych znajdują się w
`../docs/release/play-store-readiness.md`.

Debug ma osobny pakiet `.debug` i nazwę `Super Spedytor DEV`. Preview ma pakiet
`.preview` i jest lokalnie podpisany kluczem debugowym wyłącznie do instalacji
pokazowej. Kluczy ani haseł do podpisu produkcyjnego nie wolno zapisywać w
repozytorium.
