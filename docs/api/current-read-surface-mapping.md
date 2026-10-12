# Obecna powierzchnia odczytowa Super Spedytora — mapowanie dla aplikacji

Data weryfikacji: 2026-10-11

## Zakres potwierdzenia

Połączenie MCP do Super Spedytora odpowiada i pozwala odczytać listę tras oraz
szczegóły wybranej trasy. Weryfikacja była wyłącznie odczytowa; nie zmieniono
żadnej trasy, zlecenia, punktu, dokumentu ani statusu.

Ta powierzchnia jest przeznaczona dla uprawnionego operatora/asystenta i nie
jest bezpośrednim API mobilnym. Nie wolno umieszczać tokenu MCP ani poświadczeń
panelu w aplikacji kierowcy.

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

## Potwierdzone braki względem Driver API

- brak driver-scoped logowania lub aktywacji urządzenia dla aplikacji,
- brak udokumentowanego endpointu aktywnego zlecenia konkretnego kierowcy,
- brak idempotentnego zapisu zdarzeń punktu,
- brak właścicielskiego readbacku po zapisie mobilnym,
- brak bezpiecznego uploadu zdjęć i CMR,
- brak kontraktu QR/plomb dla każdej sztuki,
- brak kontraktu zapisu czatu i wydatków z aplikacji,
- brak jawnej wersji rekordu wymaganej do ochrony przed konfliktem,
- brak polityki błędów, limitów i retencji dla klienta mobilnego.

## Wniosek

Możemy już implementować modele odczytowe i testowe adaptery na podstawie
potwierdzonych nazw pól. Nie możemy bezpiecznie podłączyć telefonu bez osobnego
Driver API i sposobu logowania. Dostęp MCP potwierdza, że dane istnieją po
stronie TMS; nie jest zamiennikiem backendu mobilnego.
