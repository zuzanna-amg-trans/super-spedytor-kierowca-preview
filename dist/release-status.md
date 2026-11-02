# Kontrola wydań Android / Apple

Pakiet zmian: **MOBILE-2026-11-01-01**. Odczyt raportu: 2026-11-02T15:31:55.939Z.

| Platforma | Wersja docelowa | Ostatnio wysłana | Potrzebna nowa paczka | Etap |
|---|---|---|---|---|
| Android | 0.1.46 (51) | 0.1.45 (50) | TAK | Do przygotowania |
| Apple iOS | 0.4.22 (32) | 0.4.21 (31) | TAK | Do przygotowania |

Wysłanie nowej paczki i publiczna publikacja są oddzielnymi krokami. Wspólna gotowość: **NIE**.

## Android

Następny krok: Zgodnie z decyzją właścicielki pozostawić poprawkę zdjęć we wspólnej wersji 51. Zachować wymagane odbiory Android Auto, zakresu produkcyjnego i historii Tacho przed dalszą dystrybucją. W Play ostatni potwierdzony kod to 50. B939: odbiór DEV zaakceptowany, produkcja 4d27b0f9 wdrożona i zweryfikowana. Sklepów jeszcze nie publikować. B935/AA39: backend b95ab985 wdrożony 02.11.2026 o 11:23 Europe/Warsaw, z pełnym zweryfikowanym backupem i bez zaległych migracji. Właściciel potwierdził brak odbiorów Android Auto POI/Tacho. Po rzeczywistych wymaganych odbiorach i zatwierdzeniu Data Safety przygotować podpisaną paczkę 51. Nie zgłaszać nowego wydania publicznego. Nowe połączenie z aktywną sesją TMS zostało sprawdzone online. Dokończyć ponowny test zestawu DEV po osobno zatwierdzonym odtworzeniu; stan przygotowania 51/32 opisuje docs/release/evidence/dev-tms-session-2026-11-02.json. Konta i skaner: nowe źródła obejmują samodzielny zapis PDF do wybranego miejsca na obu platformach oraz wybór zapisanych kont na Androidzie. Wymagany odbiór aparatu/zapisu na urządzeniach; na Androidzie także ponownego logowania po wyborze zapisanego konta. Bez nowych zgłoszeń i publikacji sklepowej.

Stan sklepu: świeży odczyt.
- Pozostają wymagane rzeczywiste odbiory Android Auto i zakresu produkcyjnego; kompilacja nie potwierdza odbioru auta.
- Kandydat 51 zachowuje sześć wymaganych rzeczywistych odbiorów zakresu; brak potwierdzonego odbioru Android Auto POI/Tacho nie pozwala uruchomić podpisywania.
- Tacho: nowe zasoby wymagają nowej paczki oraz odbioru własnej historii z API DEV przed promocją backendu.
- Nowe publiczne zgłoszenia i publikacja w Google Play/App Store pozostają wstrzymane na polecenie użytkowniczki.
- B935/AA39: mycie dodano do aktualnych źródeł linii 51. Ostatnią potwierdzoną paczką Play pozostaje 50; nowa paczka mycia nie została jeszcze podpisana. Wymagany odbiór nowego przepływu i potwierdzenie deklaracji Data Safety.
- Ponowny test syntetycznego zestawu w nowej sesji DEV jest otwarty: odczyt bazy potwierdził brak ankiety testowej. Wcześniejszy zaakceptowany odbiór B939 i jego wdrożenie produkcyjne pozostają osobnymi dowodami. Szczegóły: docs/release/evidence/dev-tms-session-2026-11-02.json
- Konta/skaner: wymagany rzeczywisty odbiór zapisu PDF w wybranym folderze i aparatu na Androidzie oraz zapisanych kont po wylogowaniu i ponownym otwarciu.
- Wersja paczki kandydata różni się od planowanego numeru wydania.
- Android: kandydat 0.1.46 (51) ma aktualną alokację i przetestowane niezmienione bramki; brak rzeczywistych wymaganych odbiorów Android Auto/produkcji blokuje podpisywanie.
- Fizyczny CarPlay nie jest podłączony.
- Nowe pola API wymagają wdrożenia i odbioru backendu na DEV przed promocją do produkcji.
- Zmiana wspólnych zasobów wymaga nowych zweryfikowanych paczek Android i iOS oraz odbioru konta kierowcy; dotychczasowe paczki nie zawierają tej poprawki.
- Nowa integracja w aktualnej linii aplikacji wymaga podpisanych paczek oraz odbioru ich rzeczywistego przepływu; test DEV poprzedniej paczki AA39 nie jest podpisanym kandydatem 51/32.
- Przed podpisaniem pozostają wymagane rzeczywiste odbiory zakresu produkcyjnego i deklaracji Data Safety; pełny profil Android dodatkowo wymaga Android Auto POI/Tacho.
- Ponowny odbiór inwentaryzacji w nowej sesji DEV pozostaje otwarty: serwer nie zwraca syntetycznej ankiety. Wcześniejszy zaakceptowany odbiór jest zachowany jako osobny dowód.
- Android 51: zachowane wymagane odbiory pakietu, TMS PROD, zakresu zapisów, Android Auto POI/Tacho i Data Safety; brak odbioru nie jest zastępowany testem ani kompilacją.
- iOS 32: istnieje archiwum bez podpisu; brak nowego podpisanego IPA i wysyłki TestFlight. Wymagane odbiory bieżącego zakresu pozostają jawne.
- Wymagane nowe podpisane 51/32 oraz rzeczywisty odbiór kont/skanera i zapisu plików na odpowiednich urządzeniach. Zachowano pozostałe bramki pełnego wydania.
- Paczka kandydata nie obejmuje bieżących źródeł; trzeba ją zbudować ponownie.

## Apple iOS

Następny krok: Odbiór powiadomień trasy na fizycznym iPhonie potwierdzony 01.11.2026: automatyczny push po zmianie punktu w TMS i otwarcie nowego celu po kliknięciu; CarPlay w aucie pozostaje do odbioru. Poprawkę zdjęć można sprawdzić w TestFlight 31, wewnętrznie i zewnętrznie (Testing). Następna paczka pełnej integracji ma numer 32, po odrębnym odbiorze historii Tacho na DEV. B939: odbiór DEV zaakceptowany, produkcja 4d27b0f9 wdrożona i zweryfikowana. Sklepów jeszcze nie publikować. Nowe połączenie z aktywną sesją TMS zostało sprawdzone online. Dokończyć ponowny test zestawu DEV po osobno zatwierdzonym odtworzeniu; stan przygotowania 51/32 opisuje docs/release/evidence/dev-tms-session-2026-11-02.json. Konta i skaner: nowe źródła obejmują samodzielny zapis PDF do wybranego miejsca na obu platformach oraz wybór zapisanych kont na Androidzie. Wymagany odbiór aparatu/zapisu na urządzeniach; na Androidzie także ponownego logowania po wyborze zapisanego konta. Bez nowych zgłoszeń i publikacji sklepowej.

Stan sklepu: świeży odczyt.
- Tacho: nowe zasoby wymagają nowej paczki oraz odbioru własnej historii z API DEV przed promocją backendu.
- Nowe publiczne zgłoszenia i publikacja w Google Play/App Store pozostają wstrzymane na polecenie użytkowniczki.
- B935/AA39: wspólny interfejs oraz natywna polityka mycia są w kodzie; mają skompilowane archiwum 32 bez podpisu; wymagają podpisu, eksportu i odbioru na iPhonie. To zadanie zatwierdza wydanie Androida; brak nowego odbioru ani podpisania iOS.
- Ponowny test syntetycznego zestawu w nowej sesji DEV jest otwarty: odczyt bazy potwierdził brak ankiety testowej. Wcześniejszy zaakceptowany odbiór B939 i jego wdrożenie produkcyjne pozostają osobnymi dowodami. Szczegóły: docs/release/evidence/dev-tms-session-2026-11-02.json
- Konta/skaner: wymagany rzeczywisty odbiór zapisu PDF w wybranym folderze i aparatu na iPhonie; testy rdzenia i kompilacja nie zastępują tego odbioru.
- Wersja paczki kandydata różni się od planowanego numeru wydania.
- Android: kandydat 0.1.46 (51) ma aktualną alokację i przetestowane niezmienione bramki; brak rzeczywistych wymaganych odbiorów Android Auto/produkcji blokuje podpisywanie.
- Fizyczny CarPlay nie jest podłączony.
- Nowe pola API wymagają wdrożenia i odbioru backendu na DEV przed promocją do produkcji.
- Zmiana wspólnych zasobów wymaga nowych zweryfikowanych paczek Android i iOS oraz odbioru konta kierowcy; dotychczasowe paczki nie zawierają tej poprawki.
- Nowa integracja w aktualnej linii aplikacji wymaga podpisanych paczek oraz odbioru ich rzeczywistego przepływu; test DEV poprzedniej paczki AA39 nie jest podpisanym kandydatem 51/32.
- Przed podpisaniem pozostają wymagane rzeczywiste odbiory zakresu produkcyjnego i deklaracji Data Safety; pełny profil Android dodatkowo wymaga Android Auto POI/Tacho.
- Ponowny odbiór inwentaryzacji w nowej sesji DEV pozostaje otwarty: serwer nie zwraca syntetycznej ankiety. Wcześniejszy zaakceptowany odbiór jest zachowany jako osobny dowód.
- Android 51: zachowane wymagane odbiory pakietu, TMS PROD, zakresu zapisów, Android Auto POI/Tacho i Data Safety; brak odbioru nie jest zastępowany testem ani kompilacją.
- iOS 32: istnieje archiwum bez podpisu; brak nowego podpisanego IPA i wysyłki TestFlight. Wymagane odbiory bieżącego zakresu pozostają jawne.
- Wymagane nowe podpisane 51/32 oraz rzeczywisty odbiór kont/skanera i zapisu plików na odpowiednich urządzeniach. Zachowano pozostałe bramki pełnego wydania.
- Paczka kandydata nie obejmuje bieżących źródeł; trzeba ją zbudować ponownie.
