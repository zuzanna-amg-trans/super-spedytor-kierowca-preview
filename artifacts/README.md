# Super Spedytor Preview — artefakt pokazowy

Plik: `Super-Spedytor-Preview-offline-v0.1.11.apk`

- pakiet: `eu.amgtrans.superspedytor.driver.preview`
- nazwa: `Super Spedytor Preview`
- wersja: `0.1.11-internal-preview` (`versionCode 12`)
- SHA-256: `b48f55f329e239a76bc29160a25400c128f39cd710a3023920bb70f2f10eeddf`
- minimalny Android: 9 (`minSdk 28`)
- docelowy Android SDK: 36
- podpis: lokalny Android Debug, tylko do instalacji pokazowej
- sieć: brak uprawnienia `INTERNET`
- dane: wyłącznie syntetyczne, bez odczytu z backendu Super Spedytora
- interfejs: bazowy interfejs był wcześniej zweryfikowany na Samsungu SM-F966B;
  panel operacji i licznik `0.1.11` sprawdzono w lokalnym widoku telefonu
  390 × 844 px, ale instalacja tej wersji na urządzeniu pozostaje do ponownej
  weryfikacji po podłączeniu ADB
- plan operacji: pierwsza pozycja pokazuje obowiązkowy przyjazd 15 minut przed
  godziną operacji, a następna ruchome ETA zależne od przebiegu trasy; każda
  karta zawiera miejsce i dostarczone dane towaru
- licznik operacji: po dotarciu odlicza czas załadunku lub rozładunku, pyta o
  status po 20 minutach, po 40 minutach uruchamia alarm i blokuje dalszą akcję
  do czasu reakcji kierowcy, a po 60 minutach pokazuje przekroczenie limitu
- podgląd progów: przyciski `0 / 20 / 40 / 60 min` są dostępne tylko jako
  demonstracja stanów; wybrana odpowiedź pozostaje lokalna i nie jest wysyłana
  do Super Spedytora
- zdjęcia: systemowy wybór `Aparat` lub `Pliki`; uruchomienie aparatu zweryfikowane
  na Samsungu SM-F966B bez wykonywania zdjęcia
- rozładunek: numery plomb ładunku i CMR są widoczne już podczas dojazdu;
  dostępne zdjęcia miejsca rozładunku można otworzyć przed przyjazdem, a po
  rozładunku aplikacja wymaga osobnego zdjęcia każdej sztuki
- lokalizacja: `Pinezka` i `Nawiguj` są w wierszu adresu bieżącego punktu
  zarówno podczas dojazdu, jak i po potwierdzeniu przyjazdu; mają większe
  ikony, mocniejszy kontrast i większy obszar dotyku
- działanie mapy: `Pinezka` pokazuje sam punkt w Google Maps bez uruchamiania
  trasy przez natywny adres `geo:`, natomiast `Nawiguj` używa osobnego adresu
  `google.navigation:` i uruchamia nawigację; pamięć podręczna WebView jest
  wyłączona, aby aktualizacja APK nie zachowywała starszego zachowania
- panel tacho: jednoznacznie pokazuje start dnia i najpóźniejszy koniec dla
  pełnych 11 godzin odpoczynku, najbliższą przerwę, jazdę do limitu 10 godzin,
  wykorzystane odpoczynki 9-godzinne oraz bilans tygodniowy i dwutygodniowy;
  dzisiejsza aktywność jest rozpisana chronologicznie na okresy jazdy, innej
  pracy i przerw wraz z godzinami od–do
- zgłaszanie przerwy: kierowca może wskazać 15, 30 lub 45 minut, odpoczynek
  dobowy 9 lub 11 godzin albo odpoczynek tygodniowy regularny lub skrócony;
  aktywne zgłoszenie ma licznik, zmianę rodzaju i jawne zakończenie
- symulacja przerwy dzielonej pokazuje prawidłową sekwencję 15 + 30 minut,
  stan po pierwszej części oraz wyzerowanie okresu jazdy dopiero po ukończeniu
  obu części; kolejność 30 + 15 jest jawnie oznaczona jako nieprawidłowa
- źródło danych tacho: wartości są syntetyczne; zgłoszenia pozostają lokalne,
  nie zmieniają zapisu tachografu i nie są wysyłane do spedytora
- ankieta serwisowa: osobna zakładka `Serwis` zawiera opcjonalne komunikaty
  z deski rozdzielczej oraz cztery wymagane pozycje: poziom oleju, poziom
  AdBlue, dystans do przeglądu i zdjęcie DPF
- walidacja serwisu: zapis odblokowuje się dopiero po dodaniu czterech zdjęć
  oraz wartości dla oleju, AdBlue i dystansu; znacznik `Po przeglądzie` jest
  opcjonalny, a stan 0/4–4/4 jest stale widoczny
- przypomnienie serwisowe: przy pierwszym uruchomieniu w porze porannej i
  wieczornej aplikacja pokazuje duże przypomnienie z opcją rozpoczęcia ankiety
  albo odłożenia; dopóki dzisiejsza ankieta nie zostanie zapisana, przy zakładce
  `Serwis` pozostaje pomarańczowa kropka
- czytelność serwisu: przyciski zdjęć mają co najmniej 90–106 px wysokości,
  pola liczbowe 62 px, większe podpisy i pionowy układ zdjęcie–wartość; przycisk
  zapisu ma 62 px wysokości
- zapis dzienny: wartości, notatka, znacznik `Po przeglądzie` oraz wszystkie
  zdjęcia są utrwalane razem dopiero po ostatniej akcji `Zapisz ankietę`;
  wcześniejsze zmiany pozostają robocze i nie zastępują ostatniego zapisu
- ważność danych: lokalny zapis jest dostępny do następnego dnia do `00:01`;
  po przekroczeniu tej granicy znika z interfejsu, a przy działającej lub ponownie
  uruchomionej aplikacji usuwane są także lokalne metadane i zdjęcia
- backend serwisu: zapis ankiety w tym APK pozostaje lokalny i demonstracyjny;
  przypomnienie działa po otwarciu lub wznowieniu aplikacji, a systemowe
  powiadomienia i wysyłka będą możliwe dopiero po dostarczeniu Driver API oraz
  wdrożeniu natywnego harmonogramu Android

Ten APK jest gotowy do instalacji i prezentacji, lecz nie jest produkcyjnym
pakietem do Google Play. Produkcyjny wariant `release` pozostaje zablokowany do
czasu integracji Driver API, konfiguracji podpisu i zatwierdzenia danych Play.
