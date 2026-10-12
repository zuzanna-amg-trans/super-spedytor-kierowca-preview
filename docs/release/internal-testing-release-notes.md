# Notatki wydania — Internal Testing

## Projekt następnej wersji — przekazanie auta i wyposażenia

- trzeci panel w obszarze `Serwis`, obok kontroli dziennej i inwentaryzacji,
- samochód, przekazujący, przejmujący i lista wyposażenia są jednym,
  nieedytowalnym zrzutem zadania Super Spedytora,
- obowiązkowy przebieg, poziom paliwa i ocena każdej pozycji wyposażenia,
- brak albo uszkodzenie wymagają zdjęcia i opisu,
- przejmujący potwierdza własną tożsamością sesji, bez ręcznego wpisywania osób,
- widok Preview tylko przygotowuje protokół lokalnie i jawnie informuje, że nie
  zmienił przypisania auta,
- stan `Przekazano` wymaga docelowo właścicielskiego readbacku TMS z nowym
  przypisaniem pojazdu oraz wyższą wersją rekordu.

Ten zakres nie jest jeszcze wydaniem produkcyjnym. W obecnym API mobilnym brakuje
zadania przekazania, wersjonowanej listy wyposażenia i zapisu/readbacku nowego
przypisania.

## `0.1.11-internal-preview` — plan operacji i eskalacja czasu

- panel bieżącej i następnej operacji z miejscem, godziną oraz towarem,
- pierwsza operacja pokazuje godzinę, o której kierowca ma być na miejscu:
  15 minut przed ustalonym terminem,
- ETA kolejnych operacji jest jawnie oznaczone jako ruchome i zależne od
  rzeczywistego zakończenia poprzedniego punktu,
- licznik załadunku i rozładunku uruchamia się po potwierdzeniu dotarcia,
- po 20 minutach pojawia się pytanie o status, po 40 minutach alarm i blokada
  dalszej akcji do czasu reakcji kierowcy, a po 60 minutach stan przekroczenia,
- w Preview przyciski `0 / 20 / 40 / 60 min` pozwalają sprawdzić każdy próg bez
  czekania; odpowiedzi pozostają lokalne i nie są wysyłane do backendu,
- wariant połączony pokazuje wyłącznie dane zwrócone przez istniejący odczyt
  bieżącego i następnego punktu oraz jawnie wskazuje brak pełnego Driver API.

## `0.1.10-internal-debug` — pierwszy odczyt z backendu

- natywne logowanie kontem kierowcy do `https://tms.amg.eco/api/`,
- odczyt profilu, aktualnego pojazdu i statusu własnej aktywnej trasy,
- osobne karty bieżącego i następnego punktu z nawigacją,
- jawny tryb „tylko odczyt” bez wysyłania przyjazdów, zdjęć, CMR-ów lub wydatków,
- tokeny pozostają w pamięci warstwy natywnej i nie są przekazywane do WebView,
- po restarcie aplikacji wymagane jest ponowne logowanie.

## `0.1.10-internal-preview` — dzienny zapis do 00:01

- cały formularz jest utrwalany dopiero przez ostatnią akcję `Zapisz ankietę`,
- zapis obejmuje wartości, notatkę, znacznik `Po przeglądzie` i wszystkie zdjęcia,
- po ponownym uruchomieniu aplikacji ankieta nadal ma dzisiejszy zapis,
- lokalna ważność kończy się następnego dnia o `00:01`,
- po przekroczeniu terminu aplikacja usuwa lokalne wartości i zdjęcia oraz
  przygotowuje pustą ankietę na nowy dzień.

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

## Ograniczenia wariantu Preview

- wersja demonstracyjna — nie używa produkcyjnego Super Spedytora,
- brak logowania i połączenia z backendem,
- dane, czat, QR i załączniki są demonstracyjne lub pozostają lokalnie,
- aplikacja nie zapisuje zmian w rzeczywistych zleceniach,
- Android Auto wyświetla wyłącznie prowadzenie z zewnętrznej aplikacji mapowej,
- nie jest to kandydat do publikacji produkcyjnej.

Te ograniczenia muszą pozostać widoczne testerom. Wariant debug ma obecnie tylko
odczyt istniejącego API i również nie jest kandydatem do publikacji produkcyjnej.
