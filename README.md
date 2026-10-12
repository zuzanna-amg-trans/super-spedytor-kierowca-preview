# SuperSpedytor — tryb kierowcy

Repozytorium zawiera dwa wydania tego samego interfejsu:

- `dist/` — interaktywny, demonstracyjny prototyp procesu kierowcy,
- `android-app/` — natywną obudowę Androida, która pakuje dokładnie ten sam
  interfejs z `dist/` i dodaje integracje telefonu.

Podgląd obejmuje informacje o zleceniu, dokumentację każdej sztuki ładunku,
plomby QR, zdjęcia z bliska i z daleka, plombę ostatniej strony CMR, skan CMR,
odbiór oryginałów CMR od innych kierowców oraz wspólną dokumentację w
symulowanym czacie.

W obszarze „Serwis” są trzy powiązane, ale rozdzielone procesy: codzienna
ankieta serwisowa, inwentaryzacja stanu wyposażenia oraz protokół przekazania
samochodu. Przekazanie nie pozwala ręcznie wybrać auta ani uczestników. Docelowo
jedno wersjonowane zadanie Driver API ma zwracać pojazd, kierowcę przekazującego,
kierowcę przejmującego i zamrożony zrzut wyposażenia. Aplikacja może pokazać
stan „przekazano” dopiero po readbacku Super Spedytora potwierdzającym nowe
przypisanie pojazdu. Obecny widok używa wyłącznie danych syntetycznych i
przygotowuje protokół lokalnie bez zmiany właścicielskiego stanu TMS.

Widok „W drodze” zawiera panel najbliższych operacji: pierwsza operacja pokazuje
obowiązek przyjazdu 15 minut przed ustaloną godziną, a kolejne używają ruchomego
ETA. Po potwierdzeniu dotarcia do załadunku lub rozładunku uruchamia się licznik
czasu z pytaniem o status po 20 minutach, obowiązkową reakcją i alarmem po
40 minutach oraz eskalacją limitu po 60 minutach. W wariancie Preview progi i
odpowiedzi są wyłącznie symulacją lokalną.

Model dokumentów CMR nie wymaga od kierowcy wyboru modułu ani roli. Zadanie
wynika z konta i przydziału w TMS. Osoba przekazująca widzi własne CMR-y i
przygotowuje otwartą kopertę bez plomby. Osoba odbierająca widzi przydzieloną
listę kierowców wraz z oczekiwanymi CMR-ami i wybiera jednoznaczny przycisk
„Odbieram dokumenty od tego kierowcy”. Następnie ekran skupia się wyłącznie na
tej osobie. Skan QR najpierw tylko otwiera dopasowany podgląd CMR. Kierowca musi
porównać go z papierowym oryginałem i wybrać „Tak, to ten dokument — przejmuję
CMR”. Dopiero wtedy dokument zostaje przejęty i trafia na górę listy. Do czasu
zatwierdzenia albo odrzucenia podglądu nie można skanować kolejnego CMR-u. QR
dokumentu innej osoby jest odrzucany. Do czasu zaplombowania aplikacja blokuje
rozpoczęcie nowej koperty. Numer nieużytej plomby zostaje przypisany dopiero
podczas jej skanowania. Szczegółowy model znajduje się w
`docs/cmr-document-collection-model.md`.

## Ważne

- `dist/` i wariant Android `preview` pozostają prototypem demonstracyjnym bez
  połączenia z produkcyjnym SuperSpedytorem.
- Android `debug`/`release` ma natywne logowanie do istniejącego backendu TMS i
  pobiera tylko profil kierowcy, aktualny pojazd oraz status jego własnej trasy.
- Połączony panel jest jawnie oznaczony jako „tylko odczyt”: nie zapisuje
  przyjazdów, zdjęć, CMR-ów, czatu, wydatków ani statusów operacji.
- Bieżący odczyt potrafi wskazać aktualny pojazd wynikający z aktywnej trasy,
  ale nie dostarcza jeszcze zadania przekazania ani wersjonowanej listy
  wyposażenia. Nie wolno na tej podstawie lokalnie przepisywać auta na kierowcę.
- Odczyty QR, zdjęcia, dokumenty i czat w publicznym prototypie są nadal
  symulowane lokalnie w przeglądarce.
- Publikowany podgląd ma wyłączone indeksowanie przez wyszukiwarki, ale pozostaje
  publicznie dostępny dla osób znających link.

## Publikacja

Każdy push do gałęzi `main` uruchamia kontrolę plików i publikuje zawartość
folderu `dist/` przez GitHub Pages.

## Aplikacja Android

Pierwszy pionowy wycinek Androida znajduje się w `android-app/`. Nie ma osobnej,
ręcznie odwzorowanej wersji wizualnej: podczas budowania pliki z `dist/` są
pakowane bezpośrednio do APK. Zmiana fontu, odstępów, ikon, kolorów lub widoków
w projekcie trafia dzięki temu także do aplikacji.

Aplikacja zawiera ekran dojazdu do bieżącej operacji, lokalne potwierdzenie
dotarcia oraz ekran informacji o załadunku i sztukach.
Przycisk „Nawiguj” otwiera prowadzenie w Google Maps; po podłączeniu telefonu
Google Maps może wyświetlić wskazówki na Android Auto.

Wariant `preview` używa jawnie oznaczonych danych demonstracyjnych. Wariant
`debug`/`release` otwiera osobny panel połączenia z backendem
`https://tms.amg.eco/api/`. Dane logowania i tokeny pozostają w warstwie
natywnej, nie trafiają do WebView i nie są zapisywane na dysku telefonu.
Po ponownym uruchomieniu aplikacji kierowca loguje się ponownie.

Pełne operacje kierowcy pozostają zablokowane do czasu dostarczenia i odbioru
idempotentnych endpointów zapisu oraz właścicielskiego readbacku.

## Przygotowanie wydania

- bramka Google Play i stan prac: `docs/release/play-store-readiness.md`,
- robocze materiały Play Console: `docs/release/`,
- kontrakt Driver API: `docs/api/driver-api-contract.md`,
- zweryfikowane pola istniejącego odczytu TMS:
  `docs/api/current-read-surface-mapping.md`,
- gotowa prośba do głównego deva: `docs/api/main-developer-request.md`,
- odbiorowa lista dostaw Driver API:
  `docs/api/main-developer-delivery-checklist.md`,
- test release candidate: `docs/testing/release-candidate-checklist.md`.

Zadania `assembleRelease` i `bundleRelease` są celowo blokowane, dopóki brakuje
zatwierdzonego pakietu, polityk, pełnego odbioru integracji stagingowej i klucza
uploadowego. Sam działający odczyt z TMS nie oznacza gotowości do produkcyjnej
dystrybucji.
