# Polityka prywatności aplikacji Super Spedytor Kierowca — SZKIC

> Ten dokument nie jest jeszcze gotowy do publikacji. Pola w nawiasach
> kwadratowych oraz okresy retencji wymagają zatwierdzenia przez AMG Trans i
> głównego deva po ustaleniu finalnego backendu.

Data wejścia w życie: `[DO UZUPEŁNIENIA]`

## 1. Administrator danych

Administratorem danych przetwarzanych w związku z aplikacją Super Spedytor
Kierowca jest `[PEŁNA NAZWA PRAWNA AMG TRANS]`, z siedzibą
`[ADRES]`, kontakt: `[E-MAIL PRYWATNOŚĆ]`.

## 2. Zakres i cel aplikacji

Aplikacja jest narzędziem służbowym przeznaczonym dla uprawnionych kierowców.
Umożliwia dostęp do przypisanych operacji transportowych i przekazywanie
dokumentacji realizacji zleceń do systemu Super Spedytor.

## 3. Planowane kategorie danych

Finalna lista zależy od zatwierdzonego API. Aplikacja może przetwarzać:

- dane konta i identyfikator kierowcy,
- identyfikator służbowego urządzenia i aktywnej sesji,
- dane przypisanego pojazdu, trasy, zlecenia i punktów operacyjnych,
- czas wykonania czynności oraz status synchronizacji,
- przybliżoną lub dokładną lokalizację wyłącznie wtedy, gdy funkcja zostanie
  wdrożona, uzasadniona i zaakceptowana przez użytkownika,
- zdjęcia ładunku, plomb, dokumentów CMR, paragonów i innych materiałów
  wymaganych do realizacji zlecenia,
- kody QR i numery plomb,
- wiadomości kierowcy związane ze zleceniem,
- dane diagnostyczne niezbędne do zapewnienia bezpieczeństwa i niezawodności.

Aplikacja nie powinna pobierać książki adresowej, wiadomości prywatnych,
historii połączeń ani innych danych niezwiązanych z wykonywaną pracą.

## 4. Cele i podstawy przetwarzania

Dane mogą być przetwarzane w celu:

- wykonania i udokumentowania operacji transportowej,
- zapewnienia komunikacji pomiędzy kierowcą i uprawnionym personelem,
- ochrony bezpieczeństwa ładunku, kierowcy oraz systemu,
- obsługi obowiązków prawnych i rozliczeniowych,
- diagnozowania błędów oraz zapobiegania nadużyciom.

Podstawy prawne i zakres monitorowania pracownika wymagają zatwierdzenia przez
osobę odpowiedzialną za ochronę danych i prawo pracy w AMG Trans.

## 5. Odbiorcy i podmioty przetwarzające

Do uzupełnienia po zatwierdzeniu architektury:

- operator systemu Super Spedytor,
- dostawca hostingu i magazynu plików,
- dostawca monitoringu błędów, jeżeli zostanie użyty,
- Google Play jako kanał dystrybucji,
- aplikacja mapowa wybrana przez kierowcę po użyciu funkcji nawigacji.

Przekazanie celu do zewnętrznej aplikacji mapowej podlega również polityce
prywatności jej dostawcy.

## 6. Przechowywanie i usuwanie danych

Okresy przechowywania muszą wynikać z rodzaju dokumentu, obowiązków prawnych i
zasad systemu Super Spedytor. `[TABELA RETENCJI — DO UZUPEŁNIENIA]`.

Aplikacja powinna usuwać lokalne tokeny i dane operacyjne po unieważnieniu
urządzenia, wylogowaniu albo upływie zatwierdzonego okresu retencji. Zdarzenia
oczekujące na synchronizację nie mogą być usuwane bez jawnej decyzji i śladu
audytowego.

## 7. Bezpieczeństwo

Planowane zabezpieczenia obejmują szyfrowaną transmisję HTTPS, krótkotrwałe
tokeny dostępu, odwoływalną aktywację urządzenia, kontrolę dostępu po stronie
serwera, idempotentne zapisy i rejestr audytowy. Nie należy publikować tej
sekcji jako stanu faktycznego przed testem stagingowym.

## 8. Uprawnienia użytkownika

Zakres praw, sposób zgłaszania żądań oraz ograniczenia wynikające z obowiązków
prawnych i relacji pracowniczej: `[DO UZUPEŁNIENIA PRZEZ AMG TRANS]`.

Kontakt dotyczący prywatności: `[E-MAIL]`.

## 9. Zmiany polityki

Aktualna wersja polityki będzie publikowana pod stałym publicznym adresem HTTPS,
a istotne zmiany będą komunikowane uprawnionym użytkownikom.
