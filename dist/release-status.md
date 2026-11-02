# Kontrola wydań Android / Apple

Pakiet zmian: **MOBILE-2026-11-01-01**. Odczyt raportu: 2026-11-02T18:01:37.112Z.

| Platforma | Wersja docelowa | Ostatnio wysłana | Potrzebna nowa paczka | Etap |
|---|---|---|---|---|
| Android | 0.1.46 (51) | 0.1.46 (51) | NIE | Wysłane do sklepu |
| Apple iOS | 0.4.22 (32) | 0.4.22 (32) | NIE | Wysłane do sklepu |

Wysłanie nowej paczki i publiczna publikacja są oddzielnymi krokami. Wspólna gotowość: **NIE**.

## Android

Następny krok: Android 0.1.46 (51) jest dostępny w Google Play Internal Testing. Otwórz https://play.google.com/apps/internaltest/4700901819468753868 na dotychczasowym koncie testera i uaktualnij główną aplikację. Paczka łączy się z tms.amg.eco i zachowuje Android Auto POI/Tacho. Sprawdź listę zapisanych kont po wylogowaniu, aparat i zapis dwustronicowego PDF do wybranego folderu. Nie trzeba wysyłać kolejnej paczki dla bieżących źródeł. Wymagane pozostają odbiory telefonu, auta, Tacho/DEV, pełnego zakresu i deklaracji publicznego wydania. Publiczne zgłoszenie 48 pozostaje w dotychczasowej ocenie. Bez nowego publicznego zgłoszenia i publikacji; lista testerów bez zmian.

Stan sklepu: świeży odczyt.
- Pozostają wymagane rzeczywiste odbiory Android Auto i zakresu produkcyjnego; kompilacja nie potwierdza odbioru auta.
- Publiczny profil pełnego wydania zachowuje wymagane rzeczywiste odbiory Android Auto POI/Tacho, TMS PROD i Data Safety. Podpisana paczka 51 do testów wewnętrznych nie potwierdza tych odbiorów.
- Tacho: bieżące zasoby są w wysłanym Androidzie 51; pozostaje odbiór własnej historii z API DEV przed promocją backendu.
- Nowe publiczne zgłoszenia i publikacja w Google Play/App Store pozostają wstrzymane na polecenie użytkowniczki.
- B935/AA39: bieżące widoki mycia są w Androidzie 51, dostępnym wewnętrznie. Wymagany rzeczywisty odbiór przepływu i deklaracji Data Safety przed publicznym wydaniem.
- Ponowny test syntetycznego zestawu w nowej sesji DEV jest otwarty: odczyt bazy potwierdził brak ankiety testowej. Wcześniejszy zaakceptowany odbiór B939 i jego wdrożenie produkcyjne pozostają osobnymi dowodami. Szczegóły: docs/release/evidence/dev-tms-session-2026-11-02.json
- Konta/skaner: wymagany rzeczywisty odbiór zapisu PDF w wybranym folderze i aparatu na Androidzie oraz zapisanych kont po wylogowaniu i ponownym otwarciu.
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
- Brakuje potwierdzenia: pola publicznego zgłoszenia w sklepie, odbiór backendu.

## Apple iOS

Następny krok: Otwórz TestFlight i zaktualizuj Super Spedytora do 0.4.22 (32). Potwierdzono Testing w istniejącej grupie AMG - testy wewnetrzne, bez nowych zaproszeń ani zewnętrznej Beta Review. Paczka korzysta z dotychczasowego tms.amg.eco. Sprawdź aparat, dwustronicowy PDF, zapis do Plików i anulowanie zapisu. Wybór kont Keychain zachowany. Wysłany i podpisany build obejmuje bieżące źródła; ponowny upload nie jest potrzebny dla tego zakresu. Przed publicznym zgłoszeniem pozostają odbiory fizycznego CarPlay, historii Tacho na DEV, pełnego zakresu i materiałów sklepowych. B939 pozostaje zaakceptowany i wdrożony. Bez nowego publicznego zgłoszenia ani publikacji.

Stan sklepu: świeży odczyt.
- Tacho: bieżące zasoby są w wysłanym iOS 32; pozostaje odbiór własnej historii z API DEV przed promocją backendu.
- Nowe publiczne zgłoszenia i publikacja w Google Play/App Store pozostają wstrzymane na polecenie użytkowniczki.
- Ponowny test syntetycznego zestawu w nowej sesji DEV jest otwarty: odczyt bazy potwierdził brak ankiety testowej. Wcześniejszy zaakceptowany odbiór B939 i jego wdrożenie produkcyjne pozostają osobnymi dowodami. Szczegóły: docs/release/evidence/dev-tms-session-2026-11-02.json
- Konta/skaner: wymagany rzeczywisty odbiór zapisu PDF w wybranym folderze i aparatu na iPhonie; testy rdzenia i kompilacja nie zastępują tego odbioru.
- iOS 32 jest podpisany i dostępny w wewnętrznym TestFlight. Wymagane pozostają rzeczywiste odbiory mycia, skanera/zapisu PDF i pełnego zakresu na iPhonie oraz CarPlay w aucie; status Testing ich nie zastępuje.
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
- Brakuje potwierdzenia: pola publicznego zgłoszenia w sklepie, odbiór backendu.
