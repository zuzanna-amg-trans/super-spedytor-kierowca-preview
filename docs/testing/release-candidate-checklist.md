# Super Spedytor Kierowca — checklista release candidate

## Identyfikacja paczki

- [ ] commit lub niezmienny snapshot źródeł,
- [ ] finalny `applicationId`,
- [ ] `versionCode` większy niż w poprzednim uploadzie,
- [ ] czytelny `versionName`,
- [ ] wariant `release`, nie `debug`,
- [ ] SHA-256 AAB i certyfikatu uploadowego zapisane w protokole wydania.

## Automatyczne kontrole

- [ ] `node --check dist/demo-assets.js`,
- [ ] `node --check dist/flow.js`,
- [ ] `./gradlew testDebugUnitTest`,
- [ ] `./gradlew lintDebug`,
- [ ] `./gradlew verifyReleaseReadiness`,
- [ ] `./gradlew bundleRelease`,
- [ ] kontrola zawartości AAB przez `bundletool`,
- [ ] brak sekretów i danych klientów w źródłach oraz paczce.

## Logowanie i sesja

- [ ] pierwsza aktywacja urządzenia,
- [ ] błędny i wygasły kod aktywacyjny,
- [ ] odświeżenie tokenu,
- [ ] cofnięcie uprawnień urządzenia przez biuro,
- [ ] wylogowanie i usunięcie lokalnej sesji,
- [ ] konto recenzenta Play Console działa bez pomocy deva.

## Trasa i synchronizacja

- [ ] brak aktywnego zlecenia,
- [ ] jedno i kilka zleceń przypisanych kierowcy,
- [ ] zmiana albo odebranie trasy podczas pracy,
- [ ] nawigacja do dokładnych współrzędnych,
- [ ] odwracalne potwierdzenie dotarcia,
- [ ] utrata internetu przed i po potwierdzeniu,
- [ ] restart aplikacji i telefonu z oczekującą kolejką,
- [ ] ponowienie nie tworzy duplikatu,
- [ ] konflikt wersji rekordu nie jest nadpisywany,
- [ ] stan „potwierdzone przez TMS” pojawia się dopiero po readbacku właściciela.

## Dokumentacja ładunku

- [ ] faktyczna liczba sztuk mniejsza, zgodna i większa od zlecenia,
- [ ] plomba każdej sztuki i plomba CMR,
- [ ] błędny, powtórzony i nieoczekiwany QR,
- [ ] zdjęcie z aparatu oraz wybór istniejącego pliku,
- [ ] odrzucony typ, uszkodzony plik i przekroczony rozmiar,
- [ ] duplikat zdjęcia/CMR wykryty po checksumie,
- [ ] przerwany upload można bezpiecznie ponowić,
- [ ] dokument jest widoczny w Super Spedytorze po readbacku,
- [ ] brak materiałów nie pozwala zakończyć operacji.

## Przekazanie auta i wyposażenia

- [ ] brak aktywnego zadania przekazania nie pokazuje ostatniego auta lokalnego,
- [ ] pojazdu, przekazującego i przejmującego nie da się zmienić ręcznie,
- [ ] lista wyposażenia jest zgodna z wersjonowanym zrzutem Driver API,
- [ ] brak albo uszkodzenie wymaga zdjęcia i opisu,
- [ ] przebieg i poziom paliwa są wymagane,
- [ ] tylko właściwy odbiorca może potwierdzić odbiór,
- [ ] konflikt wersji po potwierdzeniu przekazującego wymaga świeżego odczytu,
- [ ] ponowienie z tym samym `idempotency_key` nie tworzy drugiego protokołu,
- [ ] odbiór z zastrzeżeniami tworzy powiązane sprawy dokładnie raz,
- [ ] stan `Przekazano` pojawia się dopiero po readbacku nowego przypisania,
- [ ] częściowy zapis nie pozostawia auta bez jednoznacznego odpowiedzialnego,
- [ ] konto trzeciego kierowcy nie widzi protokołu ani wyposażenia.

## Telefony i dostępność

- [ ] Android 9 — minimalna wersja,
- [ ] co najmniej jeden Android 12/13,
- [ ] Android 15/16,
- [ ] Samsung z obecnego pilota,
- [ ] drugi producent telefonu,
- [ ] mały ekran, duży ekran i urządzenie składane,
- [ ] jasny i ciemny tryb systemowy,
- [ ] powiększona czcionka oraz powiększenie ekranu,
- [ ] obrót i zmiana rozmiaru bez utraty danych,
- [ ] czytnik ekranu dla kluczowych przycisków i komunikatów.

## Android Auto — wariant 1

- [ ] telefon połączony z prawdziwym zestawem Android Auto,
- [ ] Google Maps otrzymuje właściwy cel,
- [ ] prowadzenie pojawia się na ekranie samochodu,
- [ ] po powrocie Super Spedytor zachowuje operację,
- [ ] brak Google Maps daje bezpieczny komunikat lub wybór innej mapy,
- [ ] aplikacja nie udaje własnego interfejsu Android Auto.

## Play Console

- [ ] Internal Testing zainstalowany bez ADB,
- [ ] pre-launch report przejrzany,
- [ ] wszystkie deklaracje App content uzupełnione,
- [ ] Data safety zgodne z ruchem sieciowym,
- [ ] polityka prywatności dostępna bez logowania,
- [ ] materiały sklepu nie zawierają danych klientów,
- [ ] notatki do wydania opisują faktyczne zmiany,
- [ ] plan wycofania wersji i kontakt alarmowy są znane.
