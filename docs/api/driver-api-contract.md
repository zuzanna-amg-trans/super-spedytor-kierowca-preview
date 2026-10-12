# Super Spedytor Driver API — wymagania do uzgodnienia z głównym devem

## Cel

Natywna aplikacja kierowcy nie może używać poświadczeń administracyjnych, tokenu
MCP ani bezpośrednio odpytywać wewnętrznych modeli panelu. Potrzebuje
wersjonowanego Driver API ograniczonego do zalogowanego kierowcy i jego tras.

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

### Czas pracy i zgłoszenia przerw

- `GET /driver/v1/work-time/current`
- `POST /driver/v1/work-time/reports`
- `POST /driver/v1/work-time/reports/{reportId}/finish`

Odczyt musi zawierać `source`, `computed_at`, strefę czasową i informację o
świeżości danych, bieżący rodzaj aktywności, okresy dzisiejszej aktywności,
czas jazdy od pełnej przerwy, czas do następnej wymaganej przerwy, dzienny limit
i wykorzystane wydłużenia, początek dnia, graniczny czas odpoczynku dobowego,
wykorzystane odpoczynki 9-godzinne oraz bilans 56 h i 90 h.

Zgłoszenie rozpoczęcia/zmiany/zakończenia przerwy jest informacją operacyjną dla
spedytora. Nie może edytować, uzupełniać ani „zatwierdzać” prawnego zapisu
tachografu. Odpowiedź powinna jawnie rozróżnić `reported_state` od
`tachograph_state`.

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
skan; nie tworzy nowego uploadu. Po porównaniu papierowego oryginału z podglądem
klient zapisuje `cmr_original_verified`. Żądanie odczytu zawiera wcześniej
wybrany `source_driver_id`; backend musi odrzucić QR przypisany do innej osoby.
Klient utrzymuje tylko jedną aktywną kopertę, a w interfejsie sortuje potwierdzone
odczyty malejąco po `scanned_at`, aby najnowszy CMR był zawsze na górze.

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
