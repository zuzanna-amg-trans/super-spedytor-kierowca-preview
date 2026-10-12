# Super Spedytor Driver — checklista pilota Android i Android Auto

## Zakres testu

Ten test potwierdza aplikację na telefonie oraz przekazanie celu do Google Maps.
Nie potwierdza jeszcze synchronizacji z produkcyjnym Super Spedytorem. Wariant 1
nie wyświetla własnego interfejsu aplikacji na ekranie samochodu — na Android
Auto wyświetla się prowadzenie Google Maps.

## Przygotowanie

- telefon z Androidem 9 lub nowszym,
- aktualne Google Maps,
- sparowane i działające Android Auto,
- włączone debugowanie USB na czas instalacji wewnętrznego APK,
- dokładnie jedno urządzenie widoczne w `adb devices -l`.

## Instalacja

Z katalogu `android-app/`:

```bash
./scripts/install-debug.sh
```

Skrypt celowo zatrzymuje się, jeśli ADB nie widzi dokładnie jednego gotowego
urządzenia. Nie wybiera telefonu na podstawie zgadywania.

## Kryteria akceptacji na telefonie

1. Aplikacja uruchamia się bez błędu i bez żądania niepotrzebnych uprawnień.
2. Widoczny jest ekran „W drodze” bieżącej operacji: numer zlecenia, punkt 1/2,
   miejsce, adres, schemat dojazdu i dwie sztuki ładunku.
3. Etykieta synchronizacji początkowo informuje, że kolejka offline jest pusta.
4. „Nawiguj” otwiera dokładny punkt, nie tylko wpisany tekst adresu.
5. Po powrocie do aplikacji kolejka pokazuje zdarzenie oczekujące, bez komunikatu
   sugerującego potwierdzenie przez TMS.
6. Pierwsze naciśnięcie „Dotarłem” rozpoczyna odliczanie pięciu sekund.
7. Drugie naciśnięcie podczas odliczania cofa operację i nie zmienia punktu.
8. Po pełnych pięciu sekundach zdarzenie ma stan oczekujący, a aplikacja pozostaje
   w załadunku i pokazuje dane załadowcy, dwie sztuki oraz fizyczne potwierdzenie.
9. Przycisk „Załadunek wykonany · dalej” pozostaje widoczny i aktywny. Jeżeli
   fizyczne potwierdzenie nie jest zaznaczone, przewija dokładnie do tego pola,
   podświetla je i nie przechodzi do dokumentacji.
10. Po zaznaczeniu fizycznego potwierdzenia przycisk przechodzi do ekranu
    dokumentowania każdej sztuki.
11. Po wymuszonym zamknięciu i ponownym uruchomieniu stan kolejki i ekran operacji
    zostają zachowane.
12. Długie przytrzymanie „Pomoc” czyści lokalny stan pilota i kolejkę.

## Kryteria akceptacji w samochodzie

1. Telefon łączy się z Android Auto przed uruchomieniem nawigacji.
2. Przycisk na telefonie uruchamia Google Maps z prawidłowym celem.
3. Prowadzenie, następny manewr i komunikaty głosowe pojawiają się w Android Auto.
4. Odłączenie i ponowne podłączenie telefonu nie gubi celu w Google Maps.
5. Operacje „Dotarłem” wykonuje się na zatrzymanym pojeździe w aplikacji telefonu.

## Testy negatywne

- brak internetu: zdarzenie zostaje w kolejce i nie jest oznaczone jako wysłane;
- brak Google Maps: system proponuje inną aplikację mapową albo aplikacja pokazuje
  komunikat o braku obsługi nawigacji;
- brak połączenia z Android Auto: nawigacja nadal działa na telefonie;
- wielokrotne naciśnięcie nawigacji dla tego samego punktu nie tworzy duplikatu
  oczekującego zdarzenia `navigation_started`;
- restart telefonu nie usuwa kolejki oczekującej.

## Dowody z pilota

Do decyzji o kolejnym etapie zapisujemy:

- model telefonu i wersję Androida,
- markę/model samochodu albo jednostki Android Auto,
- godzinę testu,
- wynik każdego punktu checklisty,
- zrzut ekranu kolejki po potwierdzeniu „Dotarłem”,
- informację, czy dokładna lokalizacja została otwarta prawidłowo.
