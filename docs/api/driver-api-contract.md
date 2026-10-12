# Super Spedytor Driver API — wymagania do uzgodnienia z głównym devem

## Cel

Natywna aplikacja kierowcy nie może używać poświadczeń administracyjnych, tokenu
MCP ani bezpośrednio odpytywać wewnętrznych modeli panelu. Potrzebuje
wersjonowanego Driver API ograniczonego do zalogowanego kierowcy i jego tras.

## Stan przejściowy — odczyt istniejącego API

Android korzysta obecnie wyłącznie z `POST /api/token/`, `GET /api/users/me/`,
`GET /api/users/me/current-vehicle/` i `GET /api/routes/driver/status/`.
Poświadczenia oraz tokeny pozostają w natywnej warstwie Androida i nie są
udostępniane lokalnemu WebView. Ten adapter nie wysyła żadnych zmian do TMS i
nie zastępuje poniższego kontraktu dla zdarzeń, dokumentów, czatu ani wydatków.

## Czego potrzebujemy od głównego deva teraz

1. Wskazania repozytorium backendu i środowiska staging albo potwierdzenia, że
   poniższy kontrakt wdraża po swojej stronie.
2. Wybór sposobu aktywacji urządzenia: kod jednorazowy z panelu, login kierowcy
   czy firmowy SSO.
3. Potwierdzenie identyfikatorów: kierowca, pojazd, trasa, punkt trasy, zlecenie,
   dokument, wiadomość i wydatek.
4. Potwierdzenie, które zdarzenie w TMS jest właścicielem stanu „Dotarłem” oraz
   czy dotarcie można cofnąć po przyjęciu przez serwer.
5. Stagingowy adres API, konto testowego kierowcy i nieszkodliwe zlecenie testowe.

## Minimalny kontrakt pilota

Wersję OpenAPI należy dostarczyć przed implementacją klienta sieciowego.
Wszystkie przykłady muszą obejmować odpowiedź poprawną, konflikt wersji, brak
uprawnień, odebraną trasę, zamknięty punkt i błąd walidacji.

### Sesja

- `POST /driver/v1/device-activations/exchange`
- `POST /driver/v1/session/refresh`
- `POST /driver/v1/session/revoke`
- `GET /driver/v1/me`

Token aplikacji musi być krótkotrwały, a refresh token odwoływalny per urządzenie.

### Trasy i operacje

- `GET /driver/v1/assignments/active`
- `GET /driver/v1/routes/{routeId}`
- `GET /driver/v1/route-points/{pointId}`
- `POST /driver/v1/route-points/{pointId}/events`

Zdarzenia pilota:

- `navigation_started`,
- `arrival_confirmed`,
- `arrival_cancelled`.

Docelowe zdarzenia operacji do potwierdzenia:

- `loading_started`,
- `loading_completed`,
- `unloading_started`,
- `unloading_completed`,
- `operation_status_reported`,
- `cargo_count_changed`,
- `cargo_seal_scanned`,
- `cmr_seal_scanned`,
- `document_attached`,
- `document_collection_started`,
- `document_handover_prepared`,
- `cmr_original_qr_scanned`,
- `cmr_original_verified`,
- `driver_document_envelope_sealed`,
- `expense_submitted`.

Każdy zapis musi przyjmować `idempotency_key`, `occurred_at`, `device_id` i
oczekiwaną wersję rekordu. Odpowiedź musi zwracać właścicielski stan TMS po
zapisie, a nie tylko `202 Accepted`.

Przykładowe żądanie aplikacji:

```json
{
  "type": "arrival_confirmed",
  "idempotency_key": "9a37fd4e-f102-451a-a2a8-7c5e2266ccf5",
  "occurred_at": "2026-10-11T18:30:00Z",
  "device_id": "driver-device-id",
  "expected_route_point_version": 17
}
```

Minimalna odpowiedź właścicielska:

```json
{
  "event_id": "tms-event-id",
  "route_point_id": "262-4",
  "owner_state": "arrived",
  "owner_version": 18,
  "confirmed_at": "2026-10-11T18:30:02Z"
}
```

Aplikacja usuwa zdarzenie z kolejki offline dopiero po otrzymaniu takiego
readbacku. Sam kod HTTP `200`, `201` lub `202` bez potwierdzonego stanu
właścicielskiego nie może zmienić etykiety na „potwierdzone przez TMS”.

### Plan następnych operacji i ETA

`GET /driver/v1/assignments/active` powinien zwracać wszystkie nieukończone
operacje kierowcy w kolejności wykonania, a nie tylko bieżący i następny punkt.
Każda pozycja planu musi zawierać co najmniej:

- `route_point_id`, `sequence`, `operation_type`, `owner_status` i
  `owner_version`,
- miejsce: nazwa firmy, pełny adres, kraj, współrzędne i dane wjazdu, jeśli są
  faktycznie zapisane,
- `schedule_kind`: `fixed_appointment`, `time_window` albo `rolling_eta`,
- `appointment_at` lub kompletne `time_windows`,
- `required_arrival_at` i zastosowaną politykę
  `first_operation_lead_minutes`; dla pierwszej operacji dnia wartość wynosi
  obecnie 15 minut,
- `live_eta_at`, `eta_computed_at` i przyczynę ostatniej zmiany ETA dla każdej
  kolejnej operacji,
- przypisane zlecenie oraz dostarczone przez TMS dane ładunku: nazwa/towar,
  liczba opakowań, jednostka, masa i wymiary. Brak pola nie może być zastępowany
  tekstem „brak danych” ani wartością wymyśloną przez aplikację.

ETA następnego punktu jest przeliczane po każdym potwierdzonym przyjeździe i
zakończeniu operacji oraz po świeżej pozycji pojazdu. Klient wyświetla czas
wyliczony przez backend razem z `eta_computed_at`; nie dodaje samodzielnie
stałych minut do poprzedniej operacji.

### Licznik 20 / 40 / 60 minut na miejscu

Dla załadunku i rozładunku licznik zaczyna się od właścicielsko potwierdzonego
`arrival_confirmed`, aby obejmował zarówno oczekiwanie na rampę, jak i właściwą
obsługę. Readback punktu powinien zwracać:

- `operation_timer.started_at`, `elapsed_seconds` i `state`,
- `check_in_due_at` po 20 minutach,
- `urgent_due_at` po 40 minutach,
- `limit_due_at` po 60 minutach,
- `active_escalation_id`, wymagany poziom odpowiedzi i ostatnią potwierdzoną
  odpowiedź kierowcy,
- `server_now`, aby klient nie opierał eskalacji wyłącznie na zegarze telefonu.

Po 20 minutach backend tworzy pytanie o status. Kierowca odpowiada zdarzeniem
`operation_status_reported` z jedną z zatwierdzonych wartości, np.
`waiting_for_ramp`, `operation_in_progress`, `cargo_problem`, oraz opcjonalną
notatką. Po 40 minutach odpowiedź jest obowiązkowa: aplikacja pokazuje alarm,
uruchamia dedykowany dźwięk/wibrację i blokuje dalsze zakończenie operacji do
czasu potwierdzonego readbacku odpowiedzi. Po 60 minutach backend utrwala
naruszenie limitu i tworzy eskalację dla biura nawet wtedy, gdy kierowca
odpowiedział wcześniej.

Powiadomienie 40-minutowe wymaga push/systemowego kanału o wysokim priorytecie,
ponieważ sam timer JavaScript nie działa niezawodnie przy wygaszonej aplikacji.
Klient może odliczać czas lokalnie dla płynnego interfejsu, ale po wznowieniu
zawsze koryguje go względem `server_now` i właścicielskiego stanu TMS.

`loading_completed` albo `unloading_completed` zatrzymuje licznik dopiero po
readbacku z `completed_at`, czasem całkowitym i zamkniętym stanem eskalacji.
Samo naciśnięcie przycisku w telefonie nie może usuwać aktywnego alarmu.

## Stan po stronie aplikacji

- `NOT_REACHED` — brak lokalnego zdarzenia dotarcia,
- `PENDING_SYNC` — kierowca potwierdził operację, ale TMS jej nie potwierdził,
- `CONFIRMED_BY_TMS` — backend zwrócił stan właścicielski i wersję rekordu.

Kolejka zachowuje stabilny `idempotency_key` także po restarcie aplikacji.
Ponowienie transmisji nie może tworzyć drugiego zdarzenia w TMS.

### Późniejsza dokumentacja operacji

- utworzenie sesji uploadu,
- upload zdjęcia/CMR do magazynu obiektowego,
- potwierdzenie checksumy i typu pliku,
- przypięcie dokumentu do zlecenia oraz punktu,
- readback dokumentu z identyfikatorem TMS,
- chat, QR/plomby, rzeczywista liczba sztuk i wydatki.

Proponowany bezpieczny upload:

1. `POST /driver/v1/uploads` z typem dokumentu, rozmiarem, MIME i SHA-256,
2. backend zwraca krótkotrwały adres uploadu oraz `upload_id`,
3. aplikacja wysyła bajty bezpośrednio do wskazanego magazynu,
4. `POST /driver/v1/uploads/{uploadId}/complete` potwierdza checksumę,
5. osobne idempotentne zdarzenie przypina zweryfikowany dokument do punktu,
6. `GET /driver/v1/route-points/{pointId}` zwraca dokument z identyfikatorem TMS.

Aplikacja nie uznaje samego zakończenia transferu pliku za przypięcie dokumentu
do zlecenia.

### Czat operacji

- `GET /driver/v1/orders/{orderId}/messages?cursor=...`
- `POST /driver/v1/orders/{orderId}/messages`

Zapis wiadomości przyjmuje `idempotency_key`, tekst, identyfikator urządzenia i
opcjonalną listę już potwierdzonych `document_id`. Readback musi zawierać
`message_id`, autora, czas serwera, identyfikator zlecenia i identyczny zestaw
załączników. Klient nie może przesyłać pliku drugi raz tylko po to, aby pokazać
go w czacie.

### Parking, tankowanie i wydatki

- `GET /driver/v1/route-points/{pointId}` zwraca typ postoju, miejsce,
  rezerwację, instrukcje oraz — dla tankowania — identyfikator przypisanej karty;
- `POST /driver/v1/route-points/{pointId}/events` obsługuje
  `parking_arrived`, `parking_completed`, `fueling_started` i
  `fueling_completed`;
- `POST /driver/v1/expenses` zapisuje wydatek i odwołuje się do potwierdzonych
  `document_id` paragonu oraz zdjęć operacji.

Wydatek paliwowy musi przyjąć co najmniej: `order_id` lub `route_point_id`, kraj,
walutę, litry i kwotę diesla, opcjonalne litry i kwotę AdBlue, czas transakcji,
`idempotency_key` i oczekiwaną wersję. Pełnego numeru karty ani PIN-u nie wolno
zwracać w logach, analityce ani komunikatach błędów.

### Ankieta serwisowa pojazdu

- `GET /driver/v1/vehicle-surveys/active`
- `GET /driver/v1/vehicle-surveys/{surveyId}`
- `POST /driver/v1/vehicle-surveys/{surveyId}/submit`

Odczyt zwraca `survey_id`, `schema_version`, pojazd, termin, lokalną datę i strefę
czasową obowiązku, listę kroków, wymagalność pola/zdjęcia, sugerowane okna
przypomnienia rano i wieczorem oraz aktualny stan właścicielski. Zapis zawiera
odpowiedzi, odwołania do potwierdzonych uploadów, notatkę, `idempotency_key` oraz
oczekiwaną wersję ankiety. Readback musi potwierdzić identyczną wersję formularza,
datę dziennej kontroli i komplet przyjętych odpowiedzi; aplikacja nie zgaduje
wymaganych pól na podstawie samego tekstu etykiety. Ponowne otwarcie aplikacji
nie może tworzyć drugiej ankiety dla tego samego pojazdu i dnia, a zmiana strefy
czasowej musi mieć jawnie określone zachowanie.

Po właścicielskim readbacku aplikacja może przechowywać kompletną ankietę wraz
ze zdjęciami lokalnie wyłącznie do następnego dnia do `00:01` w strefie ankiety.
Po tym terminie lokalna kopia ma zostać usunięta, a aplikacja pokazuje nowy
obowiązek dzienny. Nie oznacza to usunięcia rekordu właścicielskiego z backendu;
jego retencja pozostaje zgodna z polityką TMS. API powinno zwracać jednoznaczne
`local_date`, `timezone` i `local_cache_valid_until`.

### Protokół przekazania pojazdu i wyposażenia

- `GET /driver/v1/vehicle-handovers/active`
- `GET /driver/v1/vehicle-handovers/{handoverId}`
- `POST /driver/v1/uploads` — zdjęcia rozbieżności przed potwierdzeniem,
- `POST /driver/v1/vehicle-handovers/{handoverId}/transferor-confirmations`
- `POST /driver/v1/vehicle-handovers/{handoverId}/receiver-confirmations`

Protokół jest właścicielskim zadaniem TMS, a nie formularzem, w którym aplikacja
samodzielnie dobiera samochód lub kierowców. Odczyt jednego zadania musi zwracać
co najmniej:

- `handover_id`, `owner_state`, `owner_version`, `created_at`, termin i miejsce,
- pojazd: stabilne `vehicle_id`, rejestrację, nazwę/model i wersję przypisania,
- przekazującego oraz przejmującego przez stabilne identyfikatory i kody
  kierowców; dane muszą być ograniczone do uczestników tego przekazania,
- osobne potwierdzenie przekazującego wraz z właścicielskim czasem przyjęcia,
- zamrożony `equipment_snapshot` z `snapshot_id`, `snapshot_version` oraz
  pozycjami zawierającymi `equipment_item_id`, nazwę, kategorię, wymaganą liczbę,
  jednostkę i — jeśli istnieje — numer seryjny,
- odwołanie do ostatniej właścicielskiej inwentaryzacji, z której powstał zrzut,
  bez automatycznego uznawania jej za aktualny stan faktyczny,
- dozwolone stany oraz decyzję, czy dany użytkownik ma teraz potwierdzać
  przekazanie, odbiór czy tylko widzieć zakończony protokół.

Lista wyposażenia nie może być hardkodowana w aplikacji produkcyjnej. Brak
zadania, uczestnika, pojazdu, wersji albo kompletnej listy wyposażenia blokuje
potwierdzenie. Klient pokazuje wtedy błąd danych właścicielskich i możliwość
kontaktu ze spedytorem; nie zastępuje braku pustą listą, ostatnim lokalnym autem
ani ręcznym wyborem.

Potwierdzenie odbiorcy zawiera co najmniej:

- `idempotency_key`, `occurred_at`, `device_id` i `expected_owner_version`,
- identyfikatory zadania, pojazdu, przekazującego i przejmującego dokładnie ze
  zrzutu API,
- przebieg i poziom paliwa w chwili odbioru,
- dla każdej pozycji wyposażenia: oczekiwaną liczbę oraz stan `matching`,
  `missing` albo `damaged`,
- opis i `upload_id` potwierdzonego zdjęcia dla każdej pozycji `missing` lub
  `damaged`,
- jawne potwierdzenie zalogowanego odbiorcy. Tożsamość wynika z sesji i nie może
  być zastąpiona ręcznie wpisanym nazwiskiem ani odręcznym podpisem bez
  powiązania z kontem.

Stan docelowy ma przebieg:

`awaiting_transferor` → `awaiting_receiver` → `completed` albo
`completed_with_issues`.

Jeżeli polityka TMS dopuszcza odbiór z zastrzeżeniami, jeden atomowy zapis musi
jednocześnie: zachować niezmienny protokół, utworzyć powiązane zgłoszenia braków
lub uszkodzeń, zamknąć poprzednie przypisanie i przypisać pojazd kierowcy
przejmującemu. Częściowe powodzenie jest błędem serwera, a nie stanem, który
klient próbuje sam naprawiać. Jeżeli firma wymaga zatwierdzenia floty przed
zmianą przypisania, API musi zamiast tego zwrócić jednoznaczny stan
`awaiting_fleet_review` i nie może deklarować zakończenia.

Minimalny readback zakończenia:

```json
{
  "handover_id": "tms-handover-id",
  "owner_state": "completed_with_issues",
  "owner_version": 8,
  "confirmed_at": "2026-10-13T08:42:10Z",
  "assignment": {
    "vehicle_id": "vehicle-id",
    "driver_id": "receiver-driver-id",
    "assignment_version": 13
  },
  "equipment_snapshot": {
    "snapshot_id": "equipment-snapshot-id",
    "snapshot_version": 4
  },
  "issue_ids": ["vehicle-issue-id"]
}
```

Aplikacja pokazuje „Przekazano” dopiero wtedy, gdy readback zawiera ten sam
`handover_id` i `vehicle_id`, wyższą `owner_version` oraz nowe przypisanie do
`receiver_driver_id`. Sam kod HTTP `200`, `201` lub `202`, lokalna kolejka
`PENDING_SYNC`, potwierdzenie tylko jednej osoby albo ponowny odczyt starej trasy
nie są dowodem zakończenia przekazania.

### Czas pracy i zgłoszenia przerw

- `GET /driver/v1/work-time/current`
- `POST /driver/v1/work-time/reports`
- `POST /driver/v1/work-time/reports/{reportId}/finish`

Odczyt musi zawierać `source`, `computed_at`, strefę czasową i informację o
świeżości danych, bieżący rodzaj aktywności, okresy dzisiejszej aktywności,
czas jazdy od pełnej przerwy, czas do następnej wymaganej przerwy, dzienny limit
i wykorzystane wydłużenia, początek dnia, graniczny czas odpoczynku dobowego,
wykorzystane odpoczynki 9-godzinne oraz bilans 56 h i 90 h.

Dla sugestii przy tankowaniu odczyt musi udostępniać stabilne pola maszynowe:
`driving_since_full_break_seconds`, `seconds_to_required_break`,
`split_break_15_completed` oraz `active_report`. Pole
`split_break_15_completed` pochodzi z potwierdzonego stanu właścicielskiego;
sama deklaracja kierowcy w aplikacji nie może go ustawić. Brak pola, nieświeży
snapshot albo konflikt źródeł blokuje komunikat „możesz jechać dalej” i daje
wyłącznie polecenie sprawdzenia tachografu.

Pilotażowy klient stosuje wersjonowany model `fuel-break-v1`: od 1:00 do
dokładnie 2:00 jazdy sugeruje 15 min, po przekroczeniu 2:00 bez potwierdzonej
piętnastki sugeruje 45 min, a po potwierdzonej piętnastce od 3:30 jazdy lub przy
nie więcej niż 1:00 do wymaganej przerwy sugeruje 30 min. Backend docelowo może
zwracać gotowe `break_recommendation` z `ruleset_version`, `reason_code`,
`duration_seconds`, `computed_at` i `valid_until`; klient nie może prezentować
rekomendacji po upływie `valid_until`.

Po właścicielskim potwierdzeniu zdarzenia `arrival_confirmed` dla parkingu
aplikacja powinna ponownie pobrać aktualny stan czasu pracy i od razu pokazać
wybór faktycznie rozpoczynanej przerwy. Sugestia musi odróżniać niekwalifikowany
krótki postój (np. 5 min), pierwszą część 15 min wymagającą następnie minimum
30 min, zbliżenie do 4:30 jazdy oraz zbliżenie do granicy odpoczynku dobowego.
Dla propozycji 9 h potrzebne jest jawne pole właścicielskie określające, czy
skrócony odpoczynek jest jeszcze dostępny; brak tego pola pozwala sugerować
regularne 11 h, ale nie 9 h. Druga przerwa 15 min po wcześniejszej 15 min ma
wywołać ostrzeżenie, lecz klient nadal zapisuje deklarację kierowcy zgodnie z
faktycznie wybranym rodzajem — nie zamienia jej automatycznie na 30 min.

Zgłoszenie rozpoczęcia/zmiany/zakończenia przerwy jest informacją operacyjną dla
spedytora. Nie może edytować, uzupełniać ani „zatwierdzać” prawnego zapisu
tachografu. Odpowiedź powinna jawnie rozróżnić `reported_state` od
`tachograph_state`.

Tankowanie nigdy nie rozpoczyna zgłoszenia przerwy automatycznie. Po zakończeniu
tankowania aplikacja ponownie ocenia najświeższy snapshot i wymaga jawnego wyboru
kierowcy: rozpoczęcie sugerowanej przerwy albo dalsza jazda. Zapis rozpoczęcia
przerwy wymaga `recommendation_id` lub lokalnego `ruleset_version` i
`reason_code`, `idempotency_key` oraz właścicielskiego readbacku.

### Odbiór oryginałów CMR od innych kierowców

Driver API powinno wystawić dla każdego kierowcy przekazującego osobną grupę
dokumentów, ograniczoną do zleceń, których właścicielski stan TMS potwierdza
zakończony rozładunek. Grupa musi zawierać identyfikator kierowcy i pojazdu,
listę zleceń, identyfikatory dokumentów i oczekiwaną wersję. Przed zamknięciem
koperta nie ma przypisanego numeru plomby.

API zadania musi jednoznacznie określać, czy zalogowany kierowca przygotowuje
własne dokumenty, czy odbiera dokumenty na trasie. Klient nie może wymagać
ręcznego wyboru roli. Dla zadania odbioru API zwraca przydzieloną listę
kierowców, pojazdów oraz oczekiwanych dokumentów; użytkownik wybiera z tej listy
osobę, z którą właśnie się spotkał.

Przekazujący może utworzyć `document_handover_prepared`, które oznacza wyłącznie
przygotowanie otwartej koperty. Nie potwierdza ono odbioru, zamknięcia ani użycia
plomby.

Odczyt QR z papierowego CMR-u tworzy `cmr_original_qr_scanned`. Backend rozwiązuje
kod do konkretnego `document_id`, zlecenia, kierowcy oraz istniejącego
`stored_scan_id` albo bezpiecznego adresu podglądu. Aplikacja pokazuje właśnie ten
skan; nie tworzy nowego uploadu. To zdarzenie nie oznacza jeszcze przyjęcia
dokumentu i nie może dodać go do `matched_documents`. Klient blokuje następny
odczyt QR do czasu rozstrzygnięcia bieżącego podglądu. Po porównaniu papierowego
oryginału z podglądem i jawnej decyzji „przejmuję CMR” klient zapisuje
`cmr_original_verified`; dopiero potwierdzony readback tego zdarzenia oznacza
przejęcie dokumentu. Odrzucenie podglądu nie tworzy wpisu w kopercie. Żądanie
odczytu zawiera wcześniej wybrany `source_driver_id`; backend musi odrzucić QR
przypisany do innej osoby. Klient utrzymuje tylko jedną aktywną kopertę, a w
interfejsie sortuje potwierdzone przejęcia malejąco po `verified_at`, aby
najnowszy zaakceptowany CMR był zawsze na górze.

Zamknięcie każdej koperty tworzy osobne zdarzenie
`driver_document_envelope_sealed`. Odbierający przekazuje `source_driver_id`,
nowo zeskanowany `seal_code` i dokładną, uporządkowaną listę identyfikatorów
dokumentów. Backend musi w jednej transakcji sprawdzić, czy plomba nie była
wcześniej użyta, przypisać ją do koperty i zablokować jej zawartość. Nie wolno
wymagać numeru plomby przypisanego przed tym zdarzeniem.

Minimalny readback koperty:

```json
{
  "collection_id": "tms-collection-id",
  "handover_id": "tms-handover-id",
  "source_driver_id": "source-driver-id",
  "owner_state": "sealed",
  "owner_version": 18,
  "envelope_id": "tms-envelope-id",
  "seal_code": "newly-scanned-seal-value",
  "seal_assigned_at": "2026-10-12T12:08:02Z",
  "document_ids": ["tms-document-id-1"],
  "confirmed_at": "2026-10-12T12:08:02Z"
}
```

Odpowiedź bez identycznego `source_driver_id`, nowo przypisanego `seal_code` i
zestawu `document_ids` nie potwierdza odbioru. Backend musi odrzucić kopertę
zawierającą dokumenty przypisane do więcej niż jednego kierowcy. Pełny model
produktu i wyjątki opisuje
`../cmr-document-collection-model.md`.

## Model błędu

Każdy błąd powinien zwracać stabilny kod maszynowy i bezpieczny komunikat:

```json
{
  "code": "route_point_version_conflict",
  "message": "Punkt trasy zmienił się od ostatniego odczytu.",
  "request_id": "req-01J...",
  "owner_version": 19,
  "retryable": false
}
```

Minimalne kody do uzgodnienia:

- `authentication_required`,
- `device_revoked`,
- `assignment_not_found`,
- `assignment_revoked`,
- `route_point_closed`,
- `route_point_version_conflict`,
- `idempotency_conflict`,
- `invalid_transition`,
- `file_type_not_allowed`,
- `file_too_large`,
- `checksum_mismatch`,
- `order_not_unloaded`,
- `document_qr_not_found`,
- `document_qr_wrong_driver`,
- `another_envelope_open`,
- `unexpected_document_for_handover`,
- `document_already_received`,
- `mixed_source_drivers`,
- `envelope_seal_already_used`,
- `envelope_contents_mismatch`,
- `survey_schema_changed`,
- `survey_already_submitted`,
- `expense_duplicate`,
- `expense_document_missing`,
- `work_time_source_stale`,
- `work_time_report_conflict`,
- `rate_limited`,
- `temporarily_unavailable`.

## Parametry potrzebne klientowi Android

- bazowy adres staging i produkcji,
- maksymalny rozmiar zdjęcia i dokumentu,
- dozwolone MIME,
- timeouty i zasady ponawiania,
- czas ważności access tokenu, refresh tokenu i adresu uploadu,
- tolerancja zegara urządzenia,
- wersja schematu API,
- wymagane nagłówki korelacji i identyfikacji aplikacji,
- lista stanów właścicielskich dla każdej operacji.

## Wymagania niefunkcjonalne

- ograniczenie danych do bieżącego kierowcy i przypisanego pojazdu,
- staging bez danych produkcyjnych klientów,
- pełny audyt zapisów,
- bezpieczne ponawianie po utracie zasięgu,
- jednoznaczne kody błędów dla konfliktu, odebrania trasy i zamkniętej operacji,
- OpenAPI 3.x oraz przykładowe odpowiedzi JSON,
- możliwość unieważnienia urządzenia przez biuro.

## Dane, które już potwierdziliśmy w istniejącym backendzie

Obecna powierzchnia odczytowa udostępnia trasy, punkty, okna czasowe, statusy,
powiązane zlecenia, `cargo_on_board`, dokumenty, czat, pozycje pojazdów i wydatki.
Nie potwierdziliśmy produkcyjnych endpointów zapisu dla aplikacji kierowcy.
Dokładne nazwy zweryfikowanych pól i braki względem klienta mobilnego są w
`current-read-surface-mapping.md`.
