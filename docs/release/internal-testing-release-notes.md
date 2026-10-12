# Notatki wydania — Internal Testing

## `0.1.9-internal-preview` — ankieta serwisowa raz dziennie

- duże przypomnienie o ankiecie przy wejściu do aplikacji rano i wieczorem,
- możliwość rozpoczęcia od razu albo odłożenia przypomnienia,
- stała pomarańczowa kropka przy zakładce `Serwis` do czasu zapisu ankiety,
- lokalne zapamiętanie wykonania dla bieżącego dnia i nowa ankieta kolejnego dnia,
- większe przyciski zdjęć, pola liczbowe, podpisy i przycisk zapisu,
- pionowy układ zdjęcie–wartość, czytelniejszy na małym ekranie i w rękawicach.

Przypomnienie tej wersji działa po uruchomieniu lub wznowieniu aplikacji.
Systemowe powiadomienie działające przy zamkniętej aplikacji pozostaje osobnym
zadaniem natywnym; właścicielski harmonogram i status wymagają Driver API.

## `0.1.0-internal` — wersja robocza

- pierwszy przepływ aplikacji kierowcy na Androidzie,
- ekran bieżącej operacji, punktu trasy i danych ładunku,
- przekazanie celu do zgodnej aplikacji mapowej,
- odwracalne potwierdzenie dotarcia,
- dokumentowanie każdej sztuki: plomba, QR i zdjęcia,
- oddzielna plomba oraz dokument CMR,
- lokalna kolejka zdarzeń odporna na restart aplikacji,
- czytelne rozróżnienie stanu lokalnego i potwierdzenia TMS,
- wspólny interfejs projektu przeglądarkowego i aplikacji Android.

## Ograniczenia tej wersji

- wersja demonstracyjna — nie używa produkcyjnego Super Spedytora,
- brak logowania i stagingowego Driver API,
- dane, czat, QR i załączniki są demonstracyjne lub pozostają lokalnie,
- aplikacja nie zapisuje zmian w rzeczywistych zleceniach,
- Android Auto wyświetla wyłącznie prowadzenie z zewnętrznej aplikacji mapowej,
- nie jest to kandydat do publikacji produkcyjnej.

Te ograniczenia muszą pozostać widoczne testerom. Po podłączeniu stagingu należy
utworzyć nowe notatki opisujące tylko funkcje rzeczywiście odebrane.
