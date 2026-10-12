# SuperSpedytor — tryb kierowcy

Repozytorium zawiera dwa wydania tego samego interfejsu:

- `dist/` — interaktywny, demonstracyjny prototyp procesu kierowcy,
- `android-app/` — natywną obudowę Androida, która pakuje dokładnie ten sam
  interfejs z `dist/` i dodaje integracje telefonu.

Podgląd obejmuje informacje o zleceniu, dokumentację każdej sztuki ładunku,
plomby QR, zdjęcia z bliska i z daleka, plombę ostatniej strony CMR, skan CMR,
odbiór oryginałów CMR od innych kierowców oraz wspólną dokumentację w
symulowanym czacie.

Model dokumentów CMR nie wymaga od kierowcy wyboru modułu ani roli. Zadanie
wynika z konta i przydziału w TMS. Osoba przekazująca widzi własne CMR-y i
przygotowuje otwartą kopertę bez plomby. Osoba odbierająca widzi przydzieloną
listę kierowców wraz z oczekiwanymi CMR-ami i wybiera jednoznaczny przycisk
„Odbieram dokumenty od tego kierowcy”. Następnie ekran skupia się wyłącznie na
tej osobie. Każdy nowo zeskanowany CMR trafia na górę listy, a QR dokumentu innej
osoby jest odrzucany. Do czasu zaplombowania aplikacja blokuje rozpoczęcie nowej
koperty. Numer nieużytej plomby zostaje przypisany dopiero podczas jej
skanowania. Szczegółowy model znajduje się w
`docs/cmr-document-collection-model.md`.

## Ważne

- To jest prototyp demonstracyjny bez połączenia z produkcyjnym SuperSpedytorem.
- Odczyty QR, zdjęcia, dokumenty i czat są symulowane lokalnie w przeglądarce.
- Dane widoczne w prototypie służą wyłącznie do prezentacji procesu.
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

Do chwili podłączenia Driver API aplikacja używa jawnie oznaczonych danych
demonstracyjnych i nie zapisuje operacji w produkcyjnym Super Spedytorze.

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

Zadania `assembleRelease` i `bundleRelease` są celowo blokowane, dopóki kod
korzysta z `DemoDriverRepository` albo brakuje zatwierdzonego pakietu, polityk,
integracji stagingowej i klucza uploadowego.
