# Super Spedytor Preview — artefakt pokazowy

Plik: `Super-Spedytor-Preview-offline-v0.1.9.apk`

- pakiet: `eu.amgtrans.superspedytor.driver.preview`
- nazwa: `Super Spedytor Preview`
- wersja: `0.1.9-internal-preview` (`versionCode 10`)
- SHA-256: `9c1f8a171212381475f94e7a6efa32cf383bfce6621ebca628b229e46c4ff7c3`
- minimalny Android: 9 (`minSdk 28`)
- docelowy Android SDK: 36
- podpis: lokalny Android Debug, tylko do instalacji pokazowej
- sieć: brak uprawnienia `INTERNET`
- dane: wyłącznie syntetyczne, bez odczytu z backendu Super Spedytora
- interfejs: bazowy interfejs był wcześniej zweryfikowany na Samsungu SM-F966B;
  w tej wersji dodatkowo powiększono elementy ankiety serwisowej, ale instalacja
  wersji `0.1.9` na telefonie pozostaje do ponownej weryfikacji po podłączeniu ADB
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
- backend serwisu: zapis ankiety w tym APK pozostaje lokalny i demonstracyjny;
  przypomnienie działa po otwarciu lub wznowieniu aplikacji, a systemowe
  powiadomienia i wysyłka będą możliwe dopiero po dostarczeniu Driver API oraz
  wdrożeniu natywnego harmonogramu Android

Ten APK jest gotowy do instalacji i prezentacji, lecz nie jest produkcyjnym
pakietem do Google Play. Produkcyjny wariant `release` pozostaje zablokowany do
czasu integracji Driver API, konfiguracji podpisu i zatwierdzenia danych Play.
