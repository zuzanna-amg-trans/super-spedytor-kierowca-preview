# Driver API — komplet odbiorowy od głównego dewelopera

Ten dokument jest listą rzeczy, które musimy realnie otrzymać i przetestować.
Nie wystarczy informacja „endpoint działa” ani dostęp do panelu administracyjnego.

## 1. Paczka techniczna

- [ ] właściciel techniczny API i kontakt awaryjny,
- [ ] OpenAPI 3.x z numerem wersji i historią zmian,
- [ ] bazowe adresy staging i produkcji,
- [ ] opis aktywacji urządzenia oraz rotacji i unieważniania tokenów,
- [ ] konto testowego kierowcy, pojazd i nieszkodliwe zlecenie,
- [ ] przykłady JSON dla sukcesu i każdego istotnego błędu,
- [ ] limity ruchu, timeouty, reguły retry i tolerancja zegara urządzenia,
- [ ] polityka retencji, usuwania i audytu danych,
- [ ] potwierdzenie TLS oraz brak sekretu administracyjnego w aplikacji.

## 2. P0 — pierwszy pilot Android

### Sesja i urządzenie

- [ ] wymiana jednorazowego kodu aktywacyjnego na sesję urządzenia,
- [ ] odświeżenie krótkotrwałego tokenu,
- [ ] wylogowanie i unieważnienie sesji,
- [ ] unieważnienie pojedynczego urządzenia przez biuro,
- [ ] `GET /me` zwraca kierowcę i przypisany pojazd bez nadmiarowych danych.

### Trasa i operacja

- [ ] aktywny przydział zalogowanego kierowcy,
- [ ] trasa, punkty, kolejność, okna czasowe i aktualna wersja właścicielska,
- [ ] komplet nieukończonych operacji kierowcy, nie tylko bieżący i następny punkt,
- [ ] `required_arrival_at` pierwszej operacji zgodny z regułą 15 minut,
- [ ] serwerowe ETA kolejnych operacji przeliczane po faktycznym zakończeniu punktu,
- [ ] dane miejsca: firma, pełny adres, kraj, współrzędne, kontakt, instrukcje,
- [ ] zlecenia i sztuki ładunku z trwałymi identyfikatorami,
- [ ] licznik czasu od potwierdzonego dotarcia i serwerowe progi 20/40/60 minut,
- [ ] pytanie o status po 20 min, wymagana odpowiedź i alarm push po 40 min,
- [ ] trwała eskalacja do biura po 60 min oraz readback odpowiedzi kierowcy,
- [ ] jawna odpowiedź „brak aktywnego przydziału”,
- [ ] idempotentne zdarzenia dojazdu, dotarcia, załadunku i rozładunku,
- [ ] bezpieczny konflikt wersji i odebranie/zmiana trasy podczas pracy,
- [ ] właścicielski readback po każdym zapisie.

### QR, zdjęcia, CMR i czat

- [ ] walidacja unikalności i przeznaczenia kodu QR plomby,
- [ ] osobna plomba każdej sztuki i plomba ostatniej strony CMR,
- [ ] sesja uploadu z MIME, rozmiarem, SHA-256 i krótkim terminem ważności,
- [ ] potwierdzenie checksumy po uploadzie,
- [ ] przypięcie dokumentu do punktu i zlecenia,
- [ ] readback `document_id` z TMS,
- [ ] odczyt i zapis wiadomości czatu,
- [ ] przypięcie już przesłanego dokumentu do czatu bez ponownego uploadu.

## 3. P1 — pełny zakres gotowego interfejsu

- [ ] zadania odbioru oryginałów CMR od innych kierowców,
- [ ] rozwiązanie QR do właściwego dokumentu, zlecenia i kierowcy,
- [ ] transakcyjne zamknięcie jednej koperty nową, nieużytą plombą,
- [ ] parking: rezerwacja, miejsce, instrukcje i zakończenie postoju,
- [ ] tankowanie: operacja, zdjęcia, paragon i wydatek diesel/AdBlue,
- [ ] ankieta serwisowa sterowana wersjonowanym schematem z backendu,
- [ ] jeden właścicielski obowiązek ankiety na pojazd i lokalny dzień,
- [ ] termin, strefa czasowa oraz sugerowane okna przypomnienia rano i wieczorem,
- [ ] idempotentny zapis i readback potwierdzający datę oraz komplet odpowiedzi,
- [ ] `local_cache_valid_until` ustawione na następny dzień `00:01` w jawnej strefie,
- [ ] aktywne zadanie przekazania auta ograniczone do obu uczestników,
- [ ] pojazd, przekazujący i przejmujący wynikają z zadania i nie są polami
  wybieranymi ręcznie,
- [ ] wersjonowany, zamrożony zrzut wyposażenia z trwałymi identyfikatorami,
- [ ] osobne potwierdzenie przekazującego i przejmującego z tożsamością sesji,
- [ ] zdjęcie i opis wymagane dla braku albo uszkodzenia wyposażenia,
- [ ] atomowy zapis protokołu, rozbieżności i nowego przypisania pojazdu,
- [ ] readback zawiera nowe przypisanie auta do kierowcy przejmującego oraz
  wyższą wersję właścicielską,
- [ ] odczyt czasu pracy z oznaczeniem źródła i świeżości,
- [ ] operacyjne zgłoszenie przerwy bez zmiany danych tachografu.

## 4. Minimalne testy akceptacyjne

- [ ] ponowienie tego samego `idempotency_key` zwraca ten sam rezultat,
- [ ] utrata internetu nie usuwa lokalnego zdarzenia,
- [ ] odpowiedź bez readbacku nie zmienia stanu na „potwierdzone przez TMS”,
- [ ] konflikt wersji nie nadpisuje nowszego stanu serwera,
- [ ] odebrana trasa blokuje dalsze zapisy do starego punktu,
- [ ] upload z błędną checksumą i niedozwolonym MIME jest odrzucany,
- [ ] QR innego kierowcy lub innej sztuki jest odrzucany stabilnym kodem,
- [ ] dokument staje się widoczny w Super Spedytorze po readbacku,
- [ ] unieważniony telefon nie może odświeżyć sesji,
- [ ] dane jednego kierowcy nie są dostępne dla innego konta testowego,
- [ ] odbiorca nie może potwierdzić przekazania innego auta ani zastąpić listy
  wyposażenia własną listą lokalną,
- [ ] potwierdzenie bez nowego przypisania w readbacku pozostaje `PENDING_SYNC`,
- [ ] logi i błędy nie zawierają tokenów, PIN-u karty ani treści dokumentów.

## 5. Kryterium „API odebrane”

API uznajemy za odebrane dopiero wtedy, gdy aplikacja Android przejdzie testy na
stagingu, a zmiana wykonana w telefonie będzie widoczna po ponownym odczycie z
systemu właścicielskiego. Samo OpenAPI, odpowiedź HTTP lub demonstracja w innym
kliencie nie kończą integracji.
