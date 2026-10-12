# Obecna powierzchnia odczytowa Super Spedytora — mapowanie dla aplikacji

Data weryfikacji: 2026-10-13

## Zakres potwierdzenia

Połączenie MCP do Super Spedytora odpowiada i pozwala odczytać listę tras oraz
szczegóły wybranej trasy. Weryfikacja była wyłącznie odczytowa; nie zmieniono
żadnej trasy, zlecenia, punktu, dokumentu ani statusu.

13 października 2026 odczyt `list_vehicle_assignments` potwierdził dodatkowo, że
powierzchnia operatorska potrafi powiązać każdy aktywny pojazd z aktywną trasą i
kodem przypisanego kierowcy. To jest bieżąca mapa floty dla uprawnionego
operatora, a nie wersjonowane zadanie przekazania dla telefonu. Odpowiedź nie
zawiera wyposażenia pojazdu ani możliwości zmiany przypisania.

Token MCP jest przeznaczony dla uprawnionego operatora/asystenta i nie jest API
mobilnym. Nie wolno umieszczać tokenu MCP ani poświadczeń panelu w aplikacji
kierowcy.

Istniejący backend udostępnia równolegle wąski, driver-scoped odczyt JWT:

- `POST /api/token/` — logowanie; access token w odpowiedzi, refresh cookie
  `HttpOnly`,
- `POST /api/token/refresh/` — odświeżenie access tokenu przez refresh cookie,
- `POST /api/logout/` — zakończenie sesji cookie,
- `GET /api/users/me/` — profil zalogowanego użytkownika,
- `GET /api/users/me/current-vehicle/` — pojazd wynikający z aktywnej trasy,
- `GET /api/routes/driver/status/` — tylko aktywne trasy przypisane do
  `request.user.driver`, wraz z postępem, bieżącym i następnym punktem.

`GET /api/health/` zwrócił 12 października 2026 HTTP 200 i
`database_connection: true`. Te trzy chronione odczyty bez tokenu zwracają HTTP
401, zgodnie z oczekiwaniem. Kod Androida obsługuje tę powierzchnię, ale pełne
logowanie rzeczywistym kontem kierowcy na urządzeniu wymaga jeszcze odbioru.

## Pola dostępne na liście tras

Potwierdzono pola:

- `id`, `name`, `status`, `status_display`, `is_active`,
- `vehicle`, `vehicle_registration`,
- `driver`, `driver_code`,
- `planned_start_datetime`, `planned_end_datetime`,
- `actual_start_datetime`, `actual_end_datetime`,
- `total_distance_km`, `total_duration_hr`,
- `total_points`, `completed_points`, `progress_percentage`,
- `order_numbers`, `created_at`, `updated_at`,
- paginację `total_count`, `limit`, `offset`.

## Pola szczegółu trasy

Szczegół trasy zawiera dane listy oraz:

- `points`,
- `segments`,
- `cargo_on_board`,
- `points_total`, `points_completed_hidden`, `points_truncated`.

Punkt trasy udostępnia:

- `id`, `sequence`, `operation_type`, `status`,
- `location.label`, `location.company_name`, `location.city`,
  `location.country`, `location.latitude`, `location.longitude`,
- `planned_stay_minutes`,
- `time_window_start`, `time_window_end`, `time_windows`,
- `eta_datetime`, `eta_computed_at`,
- `live_eta_datetime`, `live_eta_computed_at`,
- `actual_arrival_datetime`, `actual_start_datetime`, `actual_end_datetime`,
- `geo_arrival_datetime`, `geo_departure_datetime`,
- `distance_from_previous_m`, `duration_from_previous_s`,
- `order_number`,
- `free_weight_after_kg`, `free_ldm_after_cm`,
- `is_transshipment_point`.

`cargo_on_board` udostępnia m.in. listę i liczbę zleceń, wagę, metry ładunkowe,
pojemność pojazdu, procent wykorzystania, braki danych oraz oczekujące
przeładunki.

## Wstępne mapowanie na model telefonu

| Pole TMS | Model Android | Uwagi |
|---|---|---|
| `route.id` | `routeId` | stabilny identyfikator właścicielski |
| `driver_code` | `driverCode` | nie używać jako sekretu logowania |
| `vehicle_registration` | `vehicleDisplayName` | pole prezentacyjne |
| `point.id` | `routePointId` | klucz dla idempotentnych zdarzeń |
| `sequence` | `sequence` | kolejność może zmienić się na serwerze |
| `operation_type` | `StopType` | rozszerzyć o przeładunek i pozostałe typy |
| `point.status` | `ownerStatus` | nie utożsamiać ze stanem lokalnym |
| `location.latitude/longitude` | `NavigationRequest` | nie rekonstruować z tekstu adresu |
| `time_windows` | `List<TimeWindow>` | lista, nie pojedyncza para dat |
| `updated_at` albo wersja API | `ownerVersion` | potrzebna jawna wersja do zapisów |
| `cargo_on_board` | `CargoSummary` | odczyt, nie źródło dokumentacji sztuk |

## Potwierdzone braki względem docelowego Driver API

- brak osobnej aktywacji i odwoływania sesji per urządzenie mobilne; obecny
  klient korzysta z istniejącego logowania JWT,
- obecny `/routes/driver/status/` zwraca tylko bieżący i następny punkt, nie
  kompletny kontrakt aktywnego zadania mobilnego,
- brak kompletnej listy kolejnych operacji z towarem, serwerowym
  `required_arrival_at` dla reguły 15 minut oraz przeliczanym ETA każdego
  następnego punktu,
- brak właścicielskiego licznika czasu na miejscu, progów 20/40/60 minut,
  odpowiedzi kierowcy, alarmu push i readbacku eskalacji dla biura,
- brak idempotentnego zapisu zdarzeń punktu,
- brak właścicielskiego readbacku po zapisie mobilnym,
- brak bezpiecznego uploadu zdjęć i CMR,
- brak kontraktu QR/plomb dla każdej sztuki,
- brak kontraktu zapisu czatu i wydatków z aplikacji,
- brak jawnej wersji rekordu wymaganej do ochrony przed konfliktem,
- brak driver-scoped zadania przekazania pojazdu z osobnym przekazującym i
  przejmującym, zamrożonym zrzutem wyposażenia oraz stanem obu potwierdzeń,
- brak atomowego zapisu protokołu, rozbieżności wyposażenia i nowego przypisania
  samochodu oraz readbacku potwierdzającego tę zmianę,
- brak polityki błędów, limitów i retencji dla klienta mobilnego.

## Wniosek

Telefon można bezpiecznie podłączyć do ograniczonego odczytu istniejącym kontem
kierowcy. Nie można jeszcze podłączyć zapisów operacyjnych. Dostęp MCP nadal
służy wyłącznie do kontroli operatorskiej i nie jest zamiennikiem sesji mobilnej.
Mapa pojazd → trasa → kierowca oraz `current-vehicle` są dowodem odczytu
przypisania, ale nie wystarczają do sporządzenia ani zakończenia protokołu
przekazania samochodu.
