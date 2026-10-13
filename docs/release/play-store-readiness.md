# Google Play — bramka gotowości wydania

## Aktualna decyzja

Wariant Preview pozostaje wersją demonstracyjną do testów lokalnych. Wariant
produkcyjny uruchamia `LiveDriverRepository`, ale integracja jest obecnie
wyłącznie odczytowa: `markNavigationStarted` i `markArrived` nie zapisują
zdarzeń do backendu. Nie wolno publikować aplikacji na ścieżce produkcyjnej,
dopóki nie ma zatwierdzonych, idempotentnych zapisów i właścicielskiego
readbacku z Super Spedytora.

Najbliższy dopuszczalny etap to Google Play Internal Testing z jednoznacznie
oznaczoną wersją testową. Produkcja wymaga zamknięcia wszystkich bramek poniżej.

## Automatyczna blokada Gradle

Zadania `assembleRelease` i `bundleRelease` zależą od
`verifyReleaseReadiness`. Kontrola celowo zatrzymuje wydanie, jeśli:

- finalny `applicationId` nie został jawnie zatwierdzony,
- kod nadal tworzy `DemoDriverRepository`,
- integracja stagingowa nie została odebrana,
- deklaracja Data safety nie została zatwierdzona,
- nie podano publicznego adresu HTTPS polityki prywatności,
- brakuje któregokolwiek elementu konfiguracji klucza uploadowego,
- ścieżka klucza uploadowego nie wskazuje istniejącego pliku.

Kontrolę można uruchomić bez próby budowania paczki:

```bash
cd android-app
./gradlew verifyReleaseReadiness
```

Po rzeczywistym zamknięciu bramek budowanie AAB będzie wymagało właściwości:

```text
-Pss.packageApproved=true
-Pss.backendIntegrated=true
-Pss.dataSafetyApproved=true
-Pss.privacyPolicyUrl=https://...
```

oraz zmiennych środowiskowych:

```text
SS_UPLOAD_KEYSTORE_PATH
SS_UPLOAD_STORE_PASSWORD
SS_UPLOAD_KEY_ALIAS
SS_UPLOAD_KEY_PASSWORD
```

Haseł ani kluczy nie wolno dopisywać do repozytorium, `gradle.properties`,
poleceń zapisanych w historii ani dokumentacji. Pliki `*.jks` i `*.keystore`
są ignorowane przez Git.

## Bramka produktu

- [ ] aplikacja pobiera zlecenie zalogowanego kierowcy ze stagingu,
- [ ] dane demonstracyjne nie są dostępne w wariancie produkcyjnym,
- [ ] kierowca może aktywować i unieważnić urządzenie,
- [ ] dotarcie, załadunek i rozładunek mają idempotentne zapisy,
- [ ] aplikacja odróżnia zapis lokalny od potwierdzenia właścicielskiego TMS,
- [ ] konflikt wersji, odebrana trasa i zamknięty punkt mają jawne komunikaty,
- [ ] zdjęcia, CMR i plomby mają identyfikatory oraz readback z TMS,
- [ ] utrata internetu nie usuwa kolejki ani nie dubluje operacji,
- [ ] wylogowanie unieważnia token i usuwa lokalne dane operacyjne zgodnie z
  zatwierdzoną polityką.

## Bramka Androida

- [x] `compileSdk` i `targetSdk` ustawione na 36,
- [x] ruch nieszyfrowanym HTTP zablokowany,
- [x] backup danych aplikacji wyłączony,
- [x] debug ma osobny identyfikator pakietu,
- [x] debug ma nazwę `Super Spedytor DEV`,
- [x] pliki webowe są pakowane lokalnie i obce żądania WebView są blokowane,
- [x] finalny `applicationId` `eu.amgtrans.superspedytor.driver` utworzony w
  Play Console 2026-10-13,
- [ ] ikony launcher/adaptive sprawdzone na Androidzie 9–16,
- [ ] wydanie release przetestowane bez włączonego debugowania WebView,
- [ ] podpisany AAB sprawdzony przez `bundletool`,
- [ ] brak sekretów i danych klientów w paczce.

## Bramka Google Play

- [x] konto organizacji AMG Trans zweryfikowane w Play Console,
- [x] nazwa pakietu utworzona na właściwym koncie,
- [ ] Play App Signing włączony,
- [ ] klucz uploadowy utworzony, zaszyfrowany i objęty kopią awaryjną,
- [ ] publiczna polityka prywatności działa pod
  `https://amg.eco/polityka-prywatnosci`; przed produkcją pozostaje potwierdzenie,
  że jej zakres jest zgodny z finalnym zachowaniem aplikacji,
- [ ] formularz Data safety zgodny z finalnym backendem i bibliotekami,
- [ ] App access zawiera działające konto recenzenta albo procedurę aktywacji,
- [ ] grupa odbiorców, reklamy i klasyfikacja treści uzupełnione,
- [ ] nazwa, opis, ikona 512×512, grafika 1024×500 i zrzuty gotowe,
- [ ] dane kontaktowe pomocy technicznej gotowe,
- [ ] wymagany okres testów konta deweloperskiego zakończony,
- [ ] wydanie Internal Testing zainstalowane z Google Play na urządzeniu testowym,
- [ ] pre-launch report bez krytycznych błędów.

### Stan Play Console z 2026-10-13

- konto dewelopera: `AMG Trans`, developer ID `7791373765509880689`,
- aplikacja: `Super Spedytor Kierowca`, app ID `4973607422769920448`,
- pakiet: `eu.amgtrans.superspedytor.driver`,
- rekord aplikacji utworzony, ale żadne wydanie ani AAB nie zostały przesłane,
- konfiguracja początkowa: `0 z 11` zadań ukończonych.

### Tor Internal Testing

- wariant `internal` używa finalnego pakietu bez sufiksu i zachowuje jawny tryb
  `0.1.11-internal`,
- ręczny workflow `.github/workflows/android-internal-testing.yml` buduje
  podpisany AAB dopiero po skonfigurowaniu czterech sekretów repozytorium,
- workflow weryfikuje paczkę oficjalnym `bundletool 1.18.3` przypiętym przez
  SHA-256,
- artefakt GitHub zawiera AAB, wynik lint i metadane z SHA-256,
- ten tor potwierdza testową dystrybucję wersji tylko do odczytu i nie otwiera
  produkcyjnej bramki `bundleRelease`.

## Bramka Android Auto — wariant 1

Super Spedytor nie deklaruje własnego interfejsu Android Auto. Aplikacja telefonu
przekazuje współrzędne do Google Maps, a Google Maps odpowiada za ekran
samochodu i prowadzenie. W opisie sklepu nie wolno przedstawiać tego jako
własnego interfejsu Super Spedytora na Android Auto.

- [ ] dokładny cel otwiera się w Google Maps,
- [ ] Google Maps pokazuje trasę na prawdziwym zestawie Android Auto,
- [ ] powrót do aplikacji nie gubi bieżącej operacji,
- [ ] dotarcie i dokumentację wykonuje się na telefonie po zatrzymaniu,
- [ ] aplikacja nie deklaruje metadanych Android Auto bez osobnej implementacji i
  przeglądu jakości samochodowej.

## Dowody decyzji produkcyjnej

Decyzja `GO` wymaga zapisania:

- numeru wersji i `versionCode`,
- SHA-256 podpisanego AAB,
- identyfikatora wydania Play Console,
- wyników testów i Android Lint,
- modeli telefonów i wersji Androida,
- wyniku pilota Android Auto,
- wersji kontraktu API i środowiska stagingowego,
- zatwierdzonych wersji polityki prywatności oraz Data safety,
- osoby zatwierdzającej wydanie po stronie AMG Trans.
