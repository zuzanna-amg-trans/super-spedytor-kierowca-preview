# Sugestia przerwy przy tankowaniu

## Cel pilota

Tankowanie jest okazją do odpoczynku, ale samo tankowanie nie jest automatycznie
zaliczaną przerwą. Aplikacja pokazuje sugestię przed rozpoczęciem tankowania i
ponownie ocenia sytuację po zapisaniu wydatku. Licznik zgłoszonej przerwy startuje
dopiero po jawnej decyzji kierowcy.

Źródłem nadrzędnym pozostaje tachograf. Zgłoszenie w aplikacji jest informacją
operacyjną dla spedytora i nie zmienia zapisu tachografu.

Prawny punkt odniesienia dla zwykłego drogowego transportu rzeczy stanowi art. 7
[rozporządzenia (WE) nr 561/2006](https://eur-lex.europa.eu/eli/reg/2006/561/2024-12-31/eng/):
po okresie 4,5 godziny jazdy wymagana jest przerwa co najmniej 45 minut, którą
można rozdzielić w kolejności co najmniej 15 minut, a następnie co najmniej
30 minut. Progi 1:00, 2:00 i 3:30 poniżej są wcześniejszymi sugestiami
operacyjnymi, a nie nowymi progami prawnymi.

## Wybrany model pilotażowy: progi `fuel-break-v1`

| Aktualny stan | Sugestia przy tankowaniu |
| --- | --- |
| Brak świeżego odczytu czasu jazdy | Bez długości; „sprawdź tachograf” |
| Inna przerwa jest już zgłoszona | Pokaż aktywne zgłoszenie, nie twórz drugiego |
| Mniej niż 1:00 jazdy od pełnej przerwy | Po tankowaniu można kontynuować jazdę |
| Od 1:00 do dokładnie 2:00, bez potwierdzonej piętnastki | 15 min |
| Powyżej 2:00, bez potwierdzonej piętnastki | 45 min |
| Potwierdzona piętnastka, mniej niż 3:30 i więcej niż 1:00 do wymaganej przerwy | Bez nowej sugestii |
| Potwierdzona piętnastka i co najmniej 3:30 jazdy albo nie więcej niż 1:00 do wymaganej przerwy | 30 min |
| Brak piętnastki i nie więcej niż 1:00 do wymaganej przerwy | 45 min |

Granica dwóch godzin jest celowo jednoznaczna: dokładnie przy `2:00` aplikacja
proponuje jeszcze `15 min`, a od `2:01` bez potwierdzonej piętnastki proponuje
pełne `45 min`.

## Przebieg interfejsu

1. Po dotarciu na stację kierowca widzi kartę „Sugerowana przerwa” obok danych
   stacji, karty paliwowej i pojazdu.
2. Sugestia nie zmienia stanu tachografu i nie rozpoczyna licznika.
3. Po zakończeniu tankowania, dodaniu paragonu i uzupełnieniu wydatku algorytm
   jest liczony ponownie z najświeższego odczytu.
4. Jeżeli nadal zaleca przerwę, aplikacja pyta: „Zacząć przerwę X min?”. Kierowca
   wybiera „Zacznij przerwę” albo „Nie, jadę dalej”.
5. Jeżeli danych brakuje lub są nieświeże, aplikacja nie pokazuje komunikatu
   „możesz jechać dalej”.

## Dane wejściowe

- czas jazdy od ostatniej pełnej przerwy,
- czas do następnej wymaganej przerwy wyliczony przez system właścicielski,
- potwierdzenie, że pierwsza część przerwy dzielonej trwała co najmniej 15 minut,
- bieżące zgłoszenie przerwy lub odpoczynku,
- źródło, czas wyliczenia i świeżość danych.

Sama deklaracja „zgłosiłem 15 minut” nie może ustawić
`split_break_15_completed=true`. Wersja docelowa otrzymuje to potwierdzenie z
systemu właścicielskiego na podstawie danych tachografu.

## Rozważane modele dalszego rozwoju

### Model progowy

Wybrany do pilota. Jest prosty, przewidywalny i łatwy do wyjaśnienia kierowcy.
Każda rekomendacja ma kod powodu i wersję reguł.

### Model punktowy okazji

Może w przyszłości uwzględniać czas do limitu, przewidywany czas tankowania,
odległość do kolejnego bezpiecznego parkingu, ETA, kolejkę na stacji i historię
przerw. Nadaje się dopiero po zebraniu wiarygodnych danych; bez nich byłby mniej
czytelny od prostych progów.

### Rekomendacja właścicielska z backendu

Docelowo najbezpieczniejszy wariant. Driver API zwraca wersjonowaną rekomendację
wraz z kodem powodu, czasem wyliczenia i terminem ważności, a aplikacja tylko ją
prezentuje. Lokalny model progowy może pozostać kontrolowanym fallbackiem, ale
wyłącznie dla świeżego, kompletnego snapshotu.
