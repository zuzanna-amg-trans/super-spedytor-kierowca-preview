# Wydanie Google Play

Ten katalog zawiera roboczy pakiet wydawniczy aplikacji Super Spedytor
Kierowca. Dokumenty nie są dowodem publikacji ani gotowości produkcyjnej.

## Aktualny stan

- aplikacja działa lokalnie na telefonie jako wariant debug,
- osobny wariant Preview działa całkowicie offline na danych syntetycznych,
- dane i przebieg pozostają demonstracyjne,
- backend produkcyjny nie jest podłączony,
- produkcyjny build jest automatycznie blokowany,
- własny interfejs Android Auto nie jest deklarowany,
- wariant 1 przekazuje cel do Google Maps.

## Dokumenty

- [`play-store-readiness.md`](play-store-readiness.md) — bramki techniczne,
  produktowe i zgodności,
- [`store-listing-pl-PL.md`](store-listing-pl-PL.md) — polska karta sklepu,
- [`privacy-policy-draft-pl.md`](privacy-policy-draft-pl.md) — szkic polityki
  prywatności z oznaczonymi brakami,
- [`data-safety-draft.md`](data-safety-draft.md) — arkusz do finalnej deklaracji
  Google Play,
- [`app-access-draft.md`](app-access-draft.md) — wymagania konta recenzenta,
- [`internal-testing-release-notes.md`](internal-testing-release-notes.md) —
  notatki dla pierwszej ścieżki testowej,
- [`offline-preview.md`](offline-preview.md) — instalowalny pakiet pokazowy bez
  backendu i bez uprawnienia sieciowego.

Nie wolno usuwać oznaczeń `SZKIC`, wpisywać odpowiedzi do Play Console ani
publikować polityki jako finalnej przed odbiorem stagingu i weryfikacją danych.
