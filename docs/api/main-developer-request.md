# Wiadomość do głównego deva — Driver API dla Androida

Poniższy tekst można wysłać głównemu devowi po zatwierdzeniu kanału komunikacji.
Nie należy przesyłać haseł ani długotrwałych tokenów zwykłą wiadomością.

---

Cześć,

przygotowujemy aplikację Android „Super Spedytor Kierowca”. Interfejs oraz
lokalna kolejka zdarzeń są gotowe, ale produkcyjne wydanie jest celowo
zablokowane do czasu podłączenia wersjonowanego Driver API.

Potrzebujemy:

### P0 — niezbędne do pierwszego pilota

1. Właściciela technicznego Driver API i osoby podejmującej decyzje o mapowaniu
   stanów Super Spedytora.
2. Bazowego adresu izolowanego środowiska stagingowego oraz wersjonowanego
   OpenAPI 3.x. Staging nie może zawierać danych rzeczywistych klientów.
3. Aktywacji urządzenia kierowcy, krótkotrwałego access tokenu, odwoływalnego
   refresh tokenu i możliwości unieważnienia jednego telefonu przez biuro.
4. Konta testowego kierowcy, pojazdu i nieszkodliwego zlecenia obejmującego
   załadunek oraz rozładunek.
5. Odczytu zalogowanego kierowcy, aktywnego przydziału, trasy, punktów, danych
   miejsca, okien czasowych, sztuk ładunku, kontaktów i instrukcji.
6. Jednego idempotentnego endpointu zdarzeń operacji z obsługą co najmniej:
   `navigation_started`, `arrival_confirmed`, `arrival_cancelled`,
   `loading_started`, `loading_completed`, `unloading_started` i
   `unloading_completed`.
7. `idempotency_key`, `device_id`, `occurred_at` i oczekiwanej wersji rekordu w
   każdym zapisie; bezpieczne ponowienie po utracie zasięgu nie może tworzyć
   duplikatu.
8. Właścicielskiego readbacku stanu Super Spedytora po każdym zapisie. Sam kod
   `200`, `201` lub `202` nie wystarczy do oznaczenia operacji jako
   zsynchronizowanej.
9. Bezpiecznego uploadu zdjęć i CMR: sesji uploadu, dozwolonych MIME i rozmiarów,
   SHA-256, krótko ważnego adresu wysyłki, potwierdzenia zakończenia oraz
   readbacku dokumentu przypiętego do punktu/zlecenia.
10. Rozwiązywania i walidacji QR plomb z kontrolą duplikatu, oczekiwanej sztuki,
    plomby CMR i konfliktu wersji.
11. Odczytu oraz zapisu czatu zlecenia, w tym automatycznego przypięcia
    materiałów dokumentacyjnych do właściwego wątku.
12. Stabilnego modelu błędów z `code`, `message`, `request_id`, `retryable` i —
    przy konflikcie — aktualną wersją rekordu.

### P1 — wymagane przed wdrożeniem wszystkich gotowych ekranów

13. Odbioru oryginałów CMR od innych kierowców: zadań przekazania, rozwiązania
    QR dokumentu, weryfikacji zgodności, jednej aktywnej koperty i transakcyjnego
    przypisania nowej plomby koperty.
14. Parkingu i tankowania: szczegółów postoju, karty przypisanej do operacji bez
    ujawniania pełnych danych w logach, zdjęć tankowania, paragonu i zapisu
    wydatku z walutą oraz pozycją AdBlue.
15. Ankiety serwisowej pojazdu: jednego aktywnego zadania na pojazd i lokalny
    dzień, strefy czasowej, sugerowanych okien przypomnienia rano i wieczorem,
    wymaganych kroków, odpowiedzi, zdjęć, wersji formularza oraz właścicielskiego
    readbacku kompletnego zgłoszenia.
16. Panelu czasu pracy: aktualnego, oznaczonego czasem i źródłem odczytu okresów
    jazdy/pracy/przerw oraz limitów. Osobne zgłoszenie przerwy do spedytora nie
    może zmieniać prawnego zapisu tachografu.
17. Polityki retencji, usuwania i odbiorców danych dla zdjęć, CMR, czatu,
    lokalizacji, wydatków, ankiet serwisowych, telemetrii i logów.
18. Parametrów operacyjnych: timeoutów, limitów ruchu, zasad ponawiania,
    tolerancji zegara, czasu ważności tokenów i adresów uploadu oraz wymaganych
    nagłówków korelacyjnych.

Proponowany kontrakt i model błędów są opisane w
`docs/api/driver-api-contract.md`, a komplet odbiorowy w
`docs/api/main-developer-delivery-checklist.md`. Możemy dostosować klienta Android do
istniejącego, bezpiecznego API, jeżeli spełnia rozdzielenie kierowców,
idempotencję, audyt i readback właścicielski.

Prosimy nie przekazywać poświadczeń administracyjnych, tokenu MCP ani dostępu do
wewnętrznych modeli panelu. Aplikacja potrzebuje ograniczonego Driver API dla
zalogowanego kierowcy i przypisanego urządzenia.

---

Po odpowiedzi trzeba zapisać: wersję kontraktu, środowisko, właściciela API,
datę ważności konta testowego i nierozstrzygnięte punkty. Sama wiadomość albo
widoczny endpoint nie oznaczają jeszcze udanej integracji.
