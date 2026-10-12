# Google Play Data safety — arkusz roboczy

> Nie przepisywać odpowiedzi do Play Console przed podłączeniem finalnego API i
> wykonaniem audytu bibliotek. Formularz ma opisywać zachowanie wersji faktycznie
> dystrybuowanej, nie plan projektu.

## Stan obecnej wersji demonstracyjnej

- interfejs i dane przykładowe są spakowane lokalnie,
- `DemoDriverRepository` przechowuje postęp i kolejkę w pamięci aplikacji,
- wybrane przez użytkownika pliki pozostają lokalnie w bieżącej sesji WebView,
- aplikacja nie ma implementacji wysyłającej dane do backendu,
- przycisk nawigacji przekazuje cel do zewnętrznej aplikacji mapowej.

Obecnego wariantu nie publikujemy produkcyjnie, dlatego poniższa tabela opisuje
planowaną aplikację po integracji.

## Dane do potwierdzenia przed wypełnieniem formularza

| Kategoria Google Play | Planowane użycie | Zbieranie | Udostępnianie | Co musi potwierdzić backend |
|---|---|---:|---:|---|
| Dane osobowe / identyfikator użytkownika | konto kierowcy i audyt | prawdopodobnie tak | do ustalenia | identyfikatory i odbiorcy |
| Lokalizacja | punkt trasy lub dowód dotarcia | do decyzji | do ustalenia | czy serwer przyjmuje GPS i z jaką dokładnością |
| Zdjęcia | ładunek, plomby, CMR, paragon | tak | do ustalenia | storage, odbiorcy, retencja |
| Pliki i dokumenty | CMR/PDF | tak | do ustalenia | typy, skan antywirusowy, retencja |
| Wiadomości w aplikacji | czat operacji | prawdopodobnie tak | do ustalenia | uczestnicy i retencja |
| Aktywność w aplikacji | statusy operacji i zdarzenia | tak | do ustalenia | log audytowy i cele |
| Identyfikatory urządzenia | aktywacja i bezpieczeństwo | prawdopodobnie tak | do ustalenia | rodzaj identyfikatora |
| Informacje o awariach | diagnostyka | zależy od SDK | zależy od SDK | wybrane narzędzie telemetryczne |
| Informacje finansowe | wydatek paliwowy/paragon | możliwe | do ustalenia | dokładny zakres pól |

## Pytania obowiązkowe do głównego deva

1. Które dane aplikacja wysyła poza telefon, w tym w tle?
2. Które podmioty poza AMG Trans otrzymują dane i w jakim celu?
3. Czy wszystkie dane są szyfrowane podczas transmisji?
4. Jak użytkownik lub administrator inicjuje usunięcie danych?
5. Jakie są okresy retencji dla zdjęć, CMR, czatu, lokalizacji i logów?
6. Czy monitoring błędów lub analityka zawiera identyfikatory, treść dokumentów
   albo adresy punktów?
7. Czy lokalizacja jest wymagana, opcjonalna, przetwarzana w tle albo tylko
   przekazywana do aplikacji mapowej?
8. Czy konto tworzy użytkownik, czy aktywuje je administrator firmy?
9. Czy aplikacja pozwala utworzyć konto — a jeżeli tak, gdzie znajduje się
   mechanizm żądania jego usunięcia?

## Kontrola przed zatwierdzeniem

- [ ] audyt manifestu i wszystkich uprawnień,
- [ ] audyt zależności i SDK pod kątem transmisji danych,
- [ ] odczyt rzeczywistych żądań sieciowych wersji release,
- [ ] zgodność z polityką prywatności i regulaminem pracowniczym,
- [ ] zatwierdzenie przez właściciela produktu i osobę odpowiedzialną za RODO,
- [ ] ponowna kontrola po każdej zmianie SDK, API lub zakresu danych.
