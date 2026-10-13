# Google Play — robocza karta aplikacji `pl-PL`

> Status: szkic do zatwierdzenia po podłączeniu backendu. Nie publikować treści,
> które sugerują działającą funkcję, dopóki nie zostanie odebrana na stagingu.

## Nazwa aplikacji

`Super Spedytor Kierowca`

## Krótki opis

`Trasa, dokumenty i obsługa zleceń kierowcy AMG Trans w jednym miejscu.`

## Pełny opis

Super Spedytor Kierowca wspiera kierowców AMG Trans podczas realizacji
przypisanych tras i operacji transportowych.

W aplikacji kierowca może sprawdzić bieżący punkt trasy, dane miejsca,
informacje o ładunku i wymagane czynności. Aplikacja prowadzi krok po kroku przez
potwierdzenie dotarcia, dokumentowanie każdej sztuki ładunku, plomby, zdjęcia
oraz dokument CMR.

Najważniejsze funkcje:

- bieżące zlecenie i kolejny punkt trasy,
- dokładne dane załadunku i rozładunku,
- uruchamianie prowadzenia do punktu w aplikacji mapowej,
- dokumentowanie każdej sztuki ładunku,
- obsługa plomb i kodów QR,
- zdjęcia oraz dokumenty CMR,
- kolejka operacji odporna na chwilowy brak internetu,
- czytelne rozróżnienie działań zapisanych lokalnie i potwierdzonych przez
  Super Spedytora,
- kontakt ze spedytorem przypisanym do operacji.

Aplikacja jest przeznaczona wyłącznie dla uprawnionych kierowców AMG Trans.
Dostęp do rzeczywistych zleceń wymaga aktywacji urządzenia i przypisania
kierowcy w systemie firmy.

Po wybraniu nawigacji aplikacja przekazuje cel do zgodnej aplikacji mapowej.
Jeżeli telefon jest połączony z Android Auto, sposób wyświetlenia prowadzenia
zależy od używanej aplikacji mapowej i wyposażenia pojazdu.

## Treści, których nie wolno dodać przed odbiorem

- „działa offline” — dopóki nie przejdzie pełny test ponawiania i konfliktów,
- „automatycznie synchronizuje” — dopóki nie ma właścicielskiego readbacku TMS,
- „aplikacja Android Auto” — wariant 1 korzysta z Google Maps, nie ma własnego
  interfejsu samochodowego,
- „bezpieczne szyfrowanie end-to-end” — takiej funkcji nie potwierdzono,
- nazw klientów, numerów zleceń, dokumentów ani pojazdów z produkcji.

## Proponowana kategoria

`Biznes`

Do ponownej oceny w Play Console po sprawdzeniu dostępnych kategorii i sposobu
dystrybucji. Nie wybierać kategorii `Mapy i nawigacja`, ponieważ aplikacja nie
jest samodzielnym dostawcą nawigacji.

## Kontakt i odnośniki — do uzupełnienia

- e-mail pomocy: `[DO UZUPEŁNIENIA]`,
- strona pomocy: `[PUBLICZNY HTTPS — DO UZUPEŁNIENIA]`,
- polityka prywatności: `https://amg.eco/polityka-prywatnosci`.

## Wymagane materiały graficzne

- ikona sklepu PNG 512×512,
- grafika funkcji PNG/JPG 1024×500,
- co najmniej dwa zrzuty z telefonu bez danych produkcyjnych,
- rekomendowany komplet: W drodze, Informacje o załadunku, Każda sztuka osobno,
  Plomba CMR, Dokument CMR i Podsumowanie,
- grafiki bez paska debugowania, danych demonstracyjnych udających rzeczywiste
  zlecenie i bez obietnicy własnego interfejsu Android Auto.
