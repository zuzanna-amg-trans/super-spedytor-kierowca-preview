# Kontrola wydań Android / Apple

Pakiet zmian: **MOBILE-2026-11-01-01**. Odczyt raportu: 2026-11-02T18:52:06.583Z.

| Platforma | Wersja docelowa | Ostatnio wysłana | Potrzebna nowa paczka | Etap |
|---|---|---|---|---|
| Android | 0.1.47 (52) | 0.1.46 (51) | TAK | Do przygotowania |
| Apple iOS | 0.4.23 (33) | 0.4.22 (32) | TAK | Do przygotowania |

Wysłanie nowej paczki i publiczna publikacja są oddzielnymi krokami. Wspólna gotowość: **NIE**.

## Android

Następny krok: Przygotować i udostępnić 0.1.47 (52) do istniejących testów wewnętrznych. W Androidzie 51 potwierdzono brak aktywacji menu; poprawka wspólnego interfejsu przywraca przycisk Moje sprawy w prawym górnym rogu i wejście Skaner po zalogowaniu oraz odświeżeniu. Równoległa regresja iOS przeszła. Po instalacji wykonać rzeczywisty odbiór telefonu. Bez nowego publicznego zgłoszenia ani publikacji.

Stan sklepu: świeży odczyt.
- Pozostają wymagane rzeczywiste odbiory Android Auto i zakresu produkcyjnego; kompilacja nie potwierdza odbioru auta.
- Publiczny profil pełnego wydania zachowuje wymagane rzeczywiste odbiory Android Auto POI/Tacho, TMS PROD i Data Safety. Podpisana paczka 51 do testów wewnętrznych nie potwierdza tych odbiorów.
- Tacho: bieżące zasoby są w wysłanym Androidzie 51; pozostaje odbiór własnej historii z API DEV przed promocją backendu.
- Nowe publiczne zgłoszenia i publikacja w Google Play/App Store pozostają wstrzymane na polecenie użytkowniczki.
- B935/AA39: bieżące widoki mycia są w Androidzie 51, dostępnym wewnętrznie. Wymagany rzeczywisty odbiór przepływu i deklaracji Data Safety przed publicznym wydaniem.
- Ponowny test syntetycznego zestawu w nowej sesji DEV jest otwarty: odczyt bazy potwierdził brak ankiety testowej. Wcześniejszy zaakceptowany odbiór B939 i jego wdrożenie produkcyjne pozostają osobnymi dowodami. Szczegóły: docs/release/evidence/dev-tms-session-2026-11-02.json
- Konta/skaner: wymagany rzeczywisty odbiór zapisu PDF w wybranym folderze i aparatu na Androidzie oraz zapisanych kont po wylogowaniu i ponownym otwarciu.
- Poprawka menu skanera wymaga nowej podpisanej paczki 0.1.47 (52) oraz odczytu dostępności w testach wewnętrznych. Odbiór kont/skanera na telefonach pozostaje otwarty.
- Wersja paczki kandydata różni się od planowanego numeru wydania.
- Android 51 jest podpisany i dostępny w testach wewnętrznych. Wymagane rzeczywiste odbiory Android Auto/produkcji pozostają otwarte dla publicznego wydania.
- Fizyczny CarPlay nie jest podłączony.
- Nowe pola API wymagają wdrożenia i odbioru backendu na DEV przed promocją do produkcji.
- Android 51 i iOS 32 obejmują bieżące wspólne zasoby i są dostępne wewnętrznie. Wymagany odrębny odbiór własnej historii Tacho z API DEV na bieżącym koncie kierowcy.
- Android 51 i iOS 32 podpisane i dostępne wewnętrznie. Wymagany odbiór nowego przepływu mycia; poprzedni test DEV AA39 nie zastępuje odbioru bieżących paczek.
- Przed publicznym wydaniem pozostają rzeczywiste odbiory pełnego zakresu i deklaracji Data Safety, w tym Android Auto POI/Tacho. Udostępnienie testowe nie zastępuje odbioru produkcyjnego.
- Ponowny odbiór inwentaryzacji w nowej sesji DEV pozostaje otwarty: serwer nie zwraca syntetycznej ankiety. Wcześniejszy zaakceptowany odbiór jest zachowany jako osobny dowód.
- Android 51: zachowane wymagane odbiory pakietu, TMS PROD, zakresu zapisów, Android Auto POI/Tacho i Data Safety; brak odbioru nie jest zastępowany testem ani kompilacją.
- iOS 32: podpisany IPA dostępny w wewnętrznym TestFlight; wymagane rzeczywiste odbiory bieżącego zakresu pozostają jawne.
- Android 51: Google Play Internal Testing, dostępny. iOS 32: wewnętrzny TestFlight, Testing. Wymagany rzeczywisty odbiór kont/aparatu/zapisu PDF na telefonach oraz pozostałe odbiory pełnego publicznego wydania.
- Nowe podpisane Android 52 i iOS 33 muszą zostać udostępnione wewnętrznie i odebrane na fizycznych telefonach. Pozostałe odbiory publicznego wydania pozostają otwarte.
- Paczka kandydata nie obejmuje bieżących źródeł; trzeba ją zbudować ponownie.

## Apple iOS

Następny krok: Przygotować i udostępnić 0.4.23 (33) do istniejących testów wewnętrznych. W Androidzie 51 potwierdzono brak aktywacji menu; poprawka wspólnego interfejsu przywraca przycisk Moje sprawy w prawym górnym rogu i wejście Skaner po zalogowaniu oraz odświeżeniu. Równoległa regresja iOS przeszła. Po instalacji wykonać rzeczywisty odbiór telefonu. Bez nowego publicznego zgłoszenia ani publikacji.

Stan sklepu: świeży odczyt.
- Tacho: bieżące zasoby są w wysłanym iOS 32; pozostaje odbiór własnej historii z API DEV przed promocją backendu.
- Nowe publiczne zgłoszenia i publikacja w Google Play/App Store pozostają wstrzymane na polecenie użytkowniczki.
- Ponowny test syntetycznego zestawu w nowej sesji DEV jest otwarty: odczyt bazy potwierdził brak ankiety testowej. Wcześniejszy zaakceptowany odbiór B939 i jego wdrożenie produkcyjne pozostają osobnymi dowodami. Szczegóły: docs/release/evidence/dev-tms-session-2026-11-02.json
- Konta/skaner: wymagany rzeczywisty odbiór zapisu PDF w wybranym folderze i aparatu na iPhonie; testy rdzenia i kompilacja nie zastępują tego odbioru.
- iOS 32 jest podpisany i dostępny w wewnętrznym TestFlight. Wymagane pozostają rzeczywiste odbiory mycia, skanera/zapisu PDF i pełnego zakresu na iPhonie oraz CarPlay w aucie; status Testing ich nie zastępuje.
- Poprawka menu skanera wymaga nowej podpisanej paczki 0.4.23 (33) oraz odczytu dostępności w testach wewnętrznych. Odbiór kont/skanera na telefonach pozostaje otwarty.
- Wersja paczki kandydata różni się od planowanego numeru wydania.
- Android 51 jest podpisany i dostępny w testach wewnętrznych. Wymagane rzeczywiste odbiory Android Auto/produkcji pozostają otwarte dla publicznego wydania.
- Fizyczny CarPlay nie jest podłączony.
- Nowe pola API wymagają wdrożenia i odbioru backendu na DEV przed promocją do produkcji.
- Android 51 i iOS 32 obejmują bieżące wspólne zasoby i są dostępne wewnętrznie. Wymagany odrębny odbiór własnej historii Tacho z API DEV na bieżącym koncie kierowcy.
- Android 51 i iOS 32 podpisane i dostępne wewnętrznie. Wymagany odbiór nowego przepływu mycia; poprzedni test DEV AA39 nie zastępuje odbioru bieżących paczek.
- Przed publicznym wydaniem pozostają rzeczywiste odbiory pełnego zakresu i deklaracji Data Safety, w tym Android Auto POI/Tacho. Udostępnienie testowe nie zastępuje odbioru produkcyjnego.
- Ponowny odbiór inwentaryzacji w nowej sesji DEV pozostaje otwarty: serwer nie zwraca syntetycznej ankiety. Wcześniejszy zaakceptowany odbiór jest zachowany jako osobny dowód.
- Android 51: zachowane wymagane odbiory pakietu, TMS PROD, zakresu zapisów, Android Auto POI/Tacho i Data Safety; brak odbioru nie jest zastępowany testem ani kompilacją.
- iOS 32: podpisany IPA dostępny w wewnętrznym TestFlight; wymagane rzeczywiste odbiory bieżącego zakresu pozostają jawne.
- Android 51: Google Play Internal Testing, dostępny. iOS 32: wewnętrzny TestFlight, Testing. Wymagany rzeczywisty odbiór kont/aparatu/zapisu PDF na telefonach oraz pozostałe odbiory pełnego publicznego wydania.
- Nowe podpisane Android 52 i iOS 33 muszą zostać udostępnione wewnętrznie i odebrane na fizycznych telefonach. Pozostałe odbiory publicznego wydania pozostają otwarte.
- Paczka kandydata nie obejmuje bieżących źródeł; trzeba ją zbudować ponownie.
