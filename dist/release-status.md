# Kontrola wydań Android / Apple

Pakiet zmian: **MOBILE-2026-11-01-01**. Odczyt raportu: 2026-11-02T23:32:39.357Z.

| Platforma | Wersja docelowa | Ostatnio wysłana | Potrzebna nowa paczka | Etap |
|---|---|---|---|---|
| Android | 0.1.47 (52) | 0.1.47 (52) | TAK | Do przygotowania |
| Apple iOS | 0.4.23 (33) | 0.4.23 (33) | TAK | Do przygotowania |

Wysłanie nowej paczki i publiczna publikacja są oddzielnymi krokami. Wspólna gotowość: **NIE**.

## Android

Następny krok: Zaktualizować aplikację do 0.1.47 (52) w Google Play Internal Testing. Po zalogowaniu wybrać Moje sprawy w prawym górnym rogu → Skaner. Odebrać widoczność menu po odświeżeniu i ponownym uruchomieniu, aparat, dwustronicowy PDF zapisany w wybranym folderze oraz zapamiętane konta. Bieżąca paczka jest wysłana; pełne odbiory publicznego wydania pozostają otwarte.

Stan sklepu: świeży odczyt.
- Pozostają wymagane rzeczywiste odbiory Android Auto i zakresu produkcyjnego; kompilacja nie potwierdza odbioru auta.
- Publiczny profil pełnego wydania zachowuje wymagane rzeczywiste odbiory Android Auto POI/Tacho, TMS PROD i Data Safety. Podpisana paczka 52 do testów wewnętrznych nie potwierdza tych odbiorów.
- Tacho: bieżące zasoby są w wysłanym Androidzie 52; pozostaje odbiór własnej historii z API DEV przed promocją backendu.
- Nowe publiczne zgłoszenia i publikacja w Google Play/App Store pozostają wstrzymane na polecenie użytkowniczki.
- B935/AA39: bieżące widoki mycia są w Androidzie 52, dostępnym wewnętrznie. Wymagany rzeczywisty odbiór przepływu i deklaracji Data Safety przed publicznym wydaniem.
- Ponowny test syntetycznego zestawu w nowej sesji DEV jest otwarty: odczyt bazy potwierdził brak ankiety testowej. Wcześniejszy zaakceptowany odbiór B939 i jego wdrożenie produkcyjne pozostają osobnymi dowodami. Szczegóły: docs/release/evidence/dev-tms-session-2026-11-02.json
- Konta/skaner: wymagany rzeczywisty odbiór zapisu PDF w wybranym folderze i aparatu na Androidzie oraz zapisanych kont po wylogowaniu i ponownym otwarciu.
- Poprawka menu jest dostępna wewnętrznie. Pozostaje rzeczywisty odbiór na telefonie: Moje sprawy w prawym górnym rogu po logowaniu, odświeżeniu i ponownym uruchomieniu; Skaner, aparat i zapis PDF w wybranym folderze.
- Android 52 jest podpisany i dostępny w testach wewnętrznych. Wymagane rzeczywiste odbiory Android Auto/produkcji pozostają otwarte dla publicznego wydania.
- Fizyczny CarPlay nie jest podłączony.
- Nowe pola API wymagają wdrożenia i odbioru backendu na DEV przed promocją do produkcji.
- Android 52 i iOS 33 obejmują bieżące wspólne zasoby i są dostępne wewnętrznie. Wymagany odrębny odbiór własnej historii Tacho z API DEV na bieżącym koncie kierowcy.
- Android 52 i iOS 33 podpisane i dostępne wewnętrznie. Wymagany odbiór nowego przepływu mycia; poprzedni test DEV AA39 nie zastępuje odbioru bieżących paczek.
- Przed publicznym wydaniem pozostają rzeczywiste odbiory pełnego zakresu i deklaracji Data Safety, w tym Android Auto POI/Tacho. Udostępnienie testowe nie zastępuje odbioru produkcyjnego.
- Ponowny odbiór inwentaryzacji w nowej sesji DEV pozostaje otwarty: serwer nie zwraca syntetycznej ankiety. Wcześniejszy zaakceptowany odbiór jest zachowany jako osobny dowód.
- Android 52: zachowane wymagane odbiory pakietu, TMS PROD, zakresu zapisów, Android Auto POI/Tacho i Data Safety; brak odbioru nie jest zastępowany testem ani kompilacją.
- iOS 33: podpisany IPA dostępny w wewnętrznym TestFlight; wymagane rzeczywiste odbiory bieżącego zakresu pozostają jawne.
- Android 52: Google Play Internal Testing, dostępny. iOS 33: wewnętrzny TestFlight, Testing. Wymagany rzeczywisty odbiór kont/aparatu/zapisu PDF na telefonach oraz pozostałe odbiory pełnego publicznego wydania.
- Android 52 i iOS 33 są podpisane i dostępne wewnętrznie. Wymagany rzeczywisty odbiór przycisku Moje sprawy, aparatu, zapisu PDF oraz kont na telefonach; pozostałe odbiory pełnego publicznego wydania pozostają otwarte.
- Paczka kandydata nie obejmuje bieżących źródeł; trzeba ją zbudować ponownie.

## Apple iOS

Następny krok: Zaktualizować aplikację do 0.4.23 (33) w wewnętrznym TestFlight. Po zalogowaniu wybrać Moje sprawy w prawym górnym rogu → Skaner. Odebrać widoczność menu po odświeżeniu i ponownym uruchomieniu, aparat, dwustronicowy PDF zapisany w wybranym folderze oraz zapamiętane konta. Bieżąca paczka jest wysłana; pełne odbiory publicznego wydania pozostają otwarte.

Stan sklepu: świeży odczyt.
- Tacho: bieżące zasoby są w wysłanym iOS 33; pozostaje odbiór własnej historii z API DEV przed promocją backendu.
- Nowe publiczne zgłoszenia i publikacja w Google Play/App Store pozostają wstrzymane na polecenie użytkowniczki.
- Ponowny test syntetycznego zestawu w nowej sesji DEV jest otwarty: odczyt bazy potwierdził brak ankiety testowej. Wcześniejszy zaakceptowany odbiór B939 i jego wdrożenie produkcyjne pozostają osobnymi dowodami. Szczegóły: docs/release/evidence/dev-tms-session-2026-11-02.json
- Konta/skaner: wymagany rzeczywisty odbiór zapisu PDF w wybranym folderze i aparatu na iPhonie; testy rdzenia i kompilacja nie zastępują tego odbioru.
- iOS 33 jest podpisany i dostępny w wewnętrznym TestFlight. Wymagane pozostają rzeczywiste odbiory mycia, skanera/zapisu PDF i pełnego zakresu na iPhonie oraz CarPlay w aucie; status Testing ich nie zastępuje.
- Poprawka menu jest dostępna wewnętrznie. Pozostaje rzeczywisty odbiór na telefonie: Moje sprawy w prawym górnym rogu po logowaniu, odświeżeniu i ponownym uruchomieniu; Skaner, aparat i zapis PDF w wybranym folderze.
- Android 52 jest podpisany i dostępny w testach wewnętrznych. Wymagane rzeczywiste odbiory Android Auto/produkcji pozostają otwarte dla publicznego wydania.
- Fizyczny CarPlay nie jest podłączony.
- Nowe pola API wymagają wdrożenia i odbioru backendu na DEV przed promocją do produkcji.
- Android 52 i iOS 33 obejmują bieżące wspólne zasoby i są dostępne wewnętrznie. Wymagany odrębny odbiór własnej historii Tacho z API DEV na bieżącym koncie kierowcy.
- Android 52 i iOS 33 podpisane i dostępne wewnętrznie. Wymagany odbiór nowego przepływu mycia; poprzedni test DEV AA39 nie zastępuje odbioru bieżących paczek.
- Przed publicznym wydaniem pozostają rzeczywiste odbiory pełnego zakresu i deklaracji Data Safety, w tym Android Auto POI/Tacho. Udostępnienie testowe nie zastępuje odbioru produkcyjnego.
- Ponowny odbiór inwentaryzacji w nowej sesji DEV pozostaje otwarty: serwer nie zwraca syntetycznej ankiety. Wcześniejszy zaakceptowany odbiór jest zachowany jako osobny dowód.
- Android 52: zachowane wymagane odbiory pakietu, TMS PROD, zakresu zapisów, Android Auto POI/Tacho i Data Safety; brak odbioru nie jest zastępowany testem ani kompilacją.
- iOS 33: podpisany IPA dostępny w wewnętrznym TestFlight; wymagane rzeczywiste odbiory bieżącego zakresu pozostają jawne.
- Android 52: Google Play Internal Testing, dostępny. iOS 33: wewnętrzny TestFlight, Testing. Wymagany rzeczywisty odbiór kont/aparatu/zapisu PDF na telefonach oraz pozostałe odbiory pełnego publicznego wydania.
- Android 52 i iOS 33 są podpisane i dostępne wewnętrznie. Wymagany rzeczywisty odbiór przycisku Moje sprawy, aparatu, zapisu PDF oraz kont na telefonach; pozostałe odbiory pełnego publicznego wydania pozostają otwarte.
- Paczka kandydata nie obejmuje bieżących źródeł; trzeba ją zbudować ponownie.
