# Przekazanie i odbiór oryginałów CMR na trasie

## Cel

Funkcja obsługuje spotkanie kierowców na trasie. Kierowca przekazujący oddaje
oryginały CMR dotyczące zakończonych rozładunków, a kierowca zjeżdżający do bazy
odbiera je, porównuje z dokumentacją cyfrową i zabezpiecza fizyczne dokumenty.

## Nienaruszalna reguła operacyjna

**Jeden kierowca przekazujący = jedna osobna koperta.**

Koperta nie może zawierać dokumentów od więcej niż jednego kierowcy. Sesja
odbioru może obejmować wiele osób, ale każda z nich tworzy oddzielną grupę
przekazania z własną listą CMR-ów i kopertą. Plomba nie jest przydzielana z góry:
jej numer zostaje przypisany do koperty dopiero podczas fizycznego zamknięcia,
po naklejeniu nieużytej plomby i zeskanowaniu jej QR.

## Zadanie ustalane przez system

Interfejs nie pokazuje przełącznika „przekazuję / odbieram” i nie wymaga od
kierowcy wyboru roli. Rodzaj zadania wynika z zalogowanego konta, trasy oraz
przydziału w TMS:

- osoba mająca przekazać swoje dokumenty widzi zadanie przygotowania własnej
  otwartej koperty;
- osoba wyznaczona do odbioru widzi zadanie skanowania CMR-ów na spotkaniu.

Jeśli ten sam kierowca ma oba obowiązki, są one pokazane jako dwa jednoznaczne
zadania operacyjne, a nie jako ręczny wybór roli. Widok demonstracyjny może być
uruchamiany w określonym kontekście konta, ale przełącznik nie może występować w
produkcyjnym ekranie kierowcy.

## Zadanie przekazania własnych dokumentów

Kierowca przekazujący nie wybiera siebie z listy. Aplikacja zna zalogowanego
kierowcę i pokazuje mu wyłącznie:

- jego pojazd,
- listę oryginałów CMR do przekazania,
- nasz numer każdego zlecenia,
- potwierdzenie, że rozładunek został zakończony.

Przygotowanie przebiega następująco:

1. Kierowca porównuje fizyczne CMR-y z listą w aplikacji.
2. Wkłada wszystkie wymienione dokumenty do jednej koperty przeznaczonej tylko
   dla niego.
3. Nie zamyka, nie zakleja i nie plombuje koperty.
4. Przekazuje odbierającemu otwartą kopertę.
5. Może oznaczyć stan `PREPARED_OPEN`. Na tym etapie koperta nie ma numeru
   plomby.

## Zadanie odbioru dokumentów

Dla każdej spotkanej osoby odbierający wykonuje pełny, osobny przebieg:

1. Widzi przydzieloną listę kierowców oraz numery CMR-ów/zleceń oczekiwanych od
   każdej osoby.
2. Wybiera duży przycisk „Odbieram dokumenty od tego kierowcy”. Od tego momentu
   ekran pokazuje wyłącznie wybraną osobę i jej oddzielną kopertę.
3. Wyjmuje pierwszy papierowy CMR i skanuje znajdujący się na nim kod QR.
4. QR identyfikuje dokument i zlecenie oraz sprawdza zgodność z wcześniej
   wybranym kierowcą.
5. Aplikacja nie wykonuje nowego zdjęcia,
   lecz pobiera i pokazuje właściwy skan CMR zapisany wcześniej w systemie.
6. Najnowszy zeskanowany CMR pojawia się na samej górze listy dokumentów.
7. Odbierający porównuje papierowy oryginał z wyświetlonym skanem i potwierdza
   zgodność.
8. Zaakceptowany oryginał wkłada z powrotem do koperty tej samej osoby.
9. Powtarza odczyt QR i porównanie dla wszystkich oczekiwanych dokumentów.
10. Potwierdza fizyczną zawartość koperty.
11. Bierze dowolną nieużytą plombę, nakleja ją na zamknięcie koperty i dopiero
   wtedy skanuje jej QR.
12. Pierwszy odczyt tej plomby przypisuje jej numer do koperty i blokuje listę
   dokumentów. Wcześniej system nie oczekuje konkretnego numeru.
13. Dopóki bieżąca koperta nie jest zaplombowana, aplikacja blokuje rozpoczęcie
    dokumentów innego kierowcy.
14. Po zamknięciu koperty odbierający wraca do listy i wybiera kolejnego
    kierowcę.

## Zabezpieczenia przed błędem użytkownika

- brak ręcznego wyboru roli;
- kierowcę można wybrać wyłącznie z listy przydzielonej przez TMS;
- po wyborze cały ekran pokazuje wyłącznie jedną aktywną osobę;
- jednocześnie może istnieć tylko jedna otwarta koperta;
- QR dokumentu innej osoby jest odrzucany względem wybranego kierowcy;
- najnowszy zeskanowany dokument zawsze pojawia się na górze listy;
- przejście do plomby jest zablokowane, dopóki nie sprawdzono wszystkich
  oczekiwanych CMR-ów;
- następna koperta może rozpocząć się dopiero po zeskanowaniu plomby poprzedniej;
- każdy kierowca ma duży, jednoznaczny przycisk „Odbieram dokumenty od tego
  kierowcy” wraz z listą oczekiwanych CMR-ów;
- po zeskanowaniu plomby zawartość koperty staje się niemutowalna.

## Dwa różne rodzaje QR

- **QR dokumentu CMR** — identyfikuje dokument i otwiera właściwy skan CMR z
  systemu; nie przypisuje plomby i nie tworzy nowego zdjęcia.
- **QR plomby koperty** — jest skanowany dopiero po naklejeniu plomby; pierwszy
  odczyt przypisuje nieużyty numer do zamykanej koperty.

## Stany pojedynczej grupy przekazania

- `PREPARATION_PENDING` — przekazujący nie potwierdził przygotowania.
- `PREPARED_OPEN` — dokumenty są w otwartej kopercie, bez plomby.
- `DOCUMENT_QR_SCANNING` — odbierający odczytuje QR-y dokumentów.
- `DOCUMENTS_MATCHED` — wszystkie papierowe oryginały porównano ze skanami z
  systemu.
- `CONTENTS_CONFIRMED` — fizyczna zawartość koperty została potwierdzona.
- `SEALED_LOCAL` — naklejoną plombę zeskanowano i przypisano do koperty; lista
  dokumentów jest niemutowalna.
- `PENDING_SYNC` — rekord koperty znajduje się w trwałej kolejce offline.
- `CONFIRMED_BY_TMS` — TMS potwierdził kopertę, plombę i dokładną listę
  dokumentów.
- `CONFLICT` — dokument, kierowca, zlecenie albo plomba nie zgadza się ze stanem
  właścicielskim.

## Minimalny rekord

```json
{
  "collection_id": "local-collection-uuid",
  "collector_driver_id": "receiver-driver-id",
  "device_id": "device-id",
  "started_at": "2026-10-12T12:00:00Z",
  "handover_groups": [
    {
      "handover_id": "local-handover-uuid",
      "source_driver_id": "source-driver-id",
      "source_vehicle_id": "source-vehicle-id",
      "prepared_open_at": "2026-10-12T11:55:00Z",
      "expected_orders": ["order-id-1", "order-id-2"],
      "matched_documents": [
        {
          "document_id": "tms-document-id",
          "order_id": "order-id-1",
          "document_qr_code": "cmr-qr-value",
          "stored_scan_id": "tms-scan-id",
          "original_matches_scan": true,
          "matched_at": "2026-10-12T12:03:00Z"
        }
      ],
      "envelope": {
        "source_driver_id": "source-driver-id",
        "seal_code": "newly-scanned-seal-value",
        "seal_assigned_at": "2026-10-12T12:08:00Z",
        "document_ids": ["tms-document-id"],
        "contents_confirmed_at": "2026-10-12T12:07:00Z",
        "sealed_at": "2026-10-12T12:08:00Z"
      },
      "idempotency_key": "stable-handover-uuid",
      "expected_owner_version": 17
    }
  ]
}
```

## Walidacje backendu

Backend musi odrzucić zapis, gdy:

- QR dokumentu nie istnieje albo nie wskazuje dokumentu CMR;
- dokument wskazany przez QR należy do innego kierowcy lub innej grupy;
- zlecenie nie ma potwierdzonego zakończenia rozładunku;
- brakuje choć jednego oczekiwanego dokumentu;
- ten sam dokument występuje w dwóch grupach lub kopertach;
- koperta obejmuje więcej niż jeden `source_driver_id`;
- kierowca nie potwierdził zgodności papierowego oryginału ze skanem z systemu;
- zeskanowany kod plomby jest już przypisany do innej koperty;
- zestaw `document_ids` koperty różni się od listy porównanych dokumentów;
- klient próbuje zmienić zawartość po `SEALED_LOCAL`.

Backend nie może wymagać oczekiwanego numeru plomby przed zamknięciem koperty.
Musi natomiast atomowo sprawdzić unikalność zeskanowanego kodu i przypisać go do
koperty w momencie zdarzenia zamknięcia.

## Wyjątki operacyjne

- QR dokumentu nie został rozpoznany — blokada przyjęcia i kontakt ze
  spedytorem;
- QR wskazuje dokument innego kierowcy — blokada dodania do bieżącej koperty;
- skan z systemu nie zgadza się z papierowym oryginałem — brak potwierdzenia,
  zgłoszenie rozbieżności i brak możliwości zamknięcia koperty;
- brakujący CMR — nie wolno plombować koperty;
- zeskanowana plomba została wcześniej użyta — należy nakleić nową, nieużytą
  plombę i zeskanować jej QR;
- dokument znaleziony po zaplombowaniu — unieważnienie plomby dotyczy tylko
  koperty tej jednej osoby; kopert innych kierowców nie otwiera się ponownie;
- brak sieci — identyfikatory QR, potwierdzenia i stabilne klucze idempotencji
  pozostają w zaszyfrowanej kolejce urządzenia do właścicielskiego readbacku.

## Granica obecnego prototypu

Makieta pokazuje zadanie wynikające z kontekstu konta, bez przełącznika roli.
Odbierający wybiera osobę z przydzielonej listy, a następnie widzi wyłącznie jej
kopertę i CMR-y. Każdy nowy skan trafia na górę listy, a QR innej osoby jest
odrzucany. Pokazywane są także podgląd właściwego skanu z systemu, porównanie z
oryginałem oraz przypisanie nieużytej plomby dopiero przy zamknięciu. Dane są
demonstracyjne. Nie ma jeszcze produkcyjnego Driver API, magazynu offline ani
readbacku Super Spedytora.
