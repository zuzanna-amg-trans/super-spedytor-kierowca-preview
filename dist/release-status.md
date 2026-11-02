# Kontrola wydań Android / Apple

Pakiet zmian: **MOBILE-2026-11-01-01**. Odczyt raportu: 2026-11-02T17:50:48.608Z.

| Platforma | Wersja docelowa | Ostatnio wysłana | Potrzebna nowa paczka | Etap |
|---|---|---|---|---|
| Android | 0.1.46 (51) | 0.1.45 (50) | TAK | Do przygotowania |
| Apple iOS | 0.4.22 (32) | 0.4.22 (32) | NIE | Wysłane do sklepu |

Wysłanie nowej paczki i publiczna publikacja są oddzielnymi krokami. Wspólna gotowość: **NIE**.

## Android

Następny krok: Paczka testowa kont/skanera jest dostępna jako osobny prywatny APK DEV 0.1.30-full-dev-qa (33), instalowany obok zwykłej aplikacji. Pobierz: https://github.com/AMG-Trans/super-spedytor-kierowca-android/releases/download/qa-konta-skaner-2026-11-02-70b1293/Super-Spedytor-DEV-QA-konta-skaner-33.apk. Użyj własnego konta DEV, sprawdź zapamiętanie/wybór konta i zapis PDF z aparatu w wybranym folderze. Google Play nadal ma wewnętrzny kod 50. Pełny 0.1.46 (51) wymaga podpisania po rzeczywistych odbiorach Android Auto POI/Tacho, zakresu produkcyjnego i Data Safety. Zachowano wymagane odbiory historii Tacho i ponownego zestawu DEV; zaakceptowany B939 pozostaje wdrożony. Bez nowego publicznego zgłoszenia ani publikacji.

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
- Bieżący iOS 32 obejmuje wspólne zasoby i jest dostępny wewnętrznie w TestFlight; Android 51 nadal wymaga nowej zweryfikowanej paczki. Wymagany odrębny odbiór własnej historii Tacho z API DEV na bieżącym koncie kierowcy.
- Bieżący iOS 32 podpisany i dostępny wewnętrznie w TestFlight; Android 51 nadal wymaga podpisania po rzeczywistych odbiorach. Wymagany odbiór nowego przepływu mycia; poprzedni test DEV AA39 nie zastępuje odbioru bieżących paczek.
- Przed podpisaniem Androida 51 pozostają wymagane rzeczywiste odbiory zakresu produkcyjnego i deklaracji Data Safety, w tym Android Auto POI/Tacho. Udostępnienie QA nie zastępuje odbioru produkcyjnego iOS.
- Ponowny odbiór inwentaryzacji w nowej sesji DEV pozostaje otwarty: serwer nie zwraca syntetycznej ankiety. Wcześniejszy zaakceptowany odbiór jest zachowany jako osobny dowód.
- Android 51: zachowane wymagane odbiory pakietu, TMS PROD, zakresu zapisów, Android Auto POI/Tacho i Data Safety; brak odbioru nie jest zastępowany testem ani kompilacją.
- iOS 32: podpisany IPA dostępny w wewnętrznym TestFlight; wymagane rzeczywiste odbiory bieżącego zakresu pozostają jawne.
- Dystrybucja Androida 51 wymaga podpisanego AAB, inspekcji i odczytu dostępności Google Play. Odbiory fizycznych telefonów, auta, backendu i deklaracji publicznego wydania pozostają otwarte.
- Udostępnione: osobny Android DEV QA 33 oraz podpisany iOS 32 w wewnętrznym TestFlight (Testing). Wymagany rzeczywisty odbiór kont, aparatu i zapisu PDF na obu urządzeniach. Android 51 i pozostałe odbiory pełnego wydania pozostają otwarte.
- Paczka kandydata nie obejmuje bieżących źródeł; trzeba ją zbudować ponownie.

## Apple iOS

Następny krok: Otwórz TestFlight i zaktualizuj Super Spedytora do 0.4.22 (32). Potwierdzono Testing w istniejącej grupie AMG - testy wewnetrzne, bez nowych zaproszeń ani zewnętrznej Beta Review. Paczka korzysta z dotychczasowego tms.amg.eco. Sprawdź aparat, dwustronicowy PDF, zapis do Plików i anulowanie zapisu. Wybór kont Keychain zachowany. Wysłany i podpisany build obejmuje bieżące źródła; ponowny upload nie jest potrzebny dla tego zakresu. Przed publicznym zgłoszeniem pozostają odbiory fizycznego CarPlay, historii Tacho na DEV, pełnego zakresu i materiałów sklepowych. B939 pozostaje zaakceptowany i wdrożony. Bez nowego publicznego zgłoszenia ani publikacji.

Stan sklepu: świeży odczyt.
- Tacho: bieżące zasoby są w wysłanym iOS 32; pozostaje odbiór własnej historii z API DEV przed promocją backendu.
- Nowe publiczne zgłoszenia i publikacja w Google Play/App Store pozostają wstrzymane na polecenie użytkowniczki.
- Ponowny test syntetycznego zestawu w nowej sesji DEV jest otwarty: odczyt bazy potwierdził brak ankiety testowej. Wcześniejszy zaakceptowany odbiór B939 i jego wdrożenie produkcyjne pozostają osobnymi dowodami. Szczegóły: docs/release/evidence/dev-tms-session-2026-11-02.json
- Konta/skaner: wymagany rzeczywisty odbiór zapisu PDF w wybranym folderze i aparatu na iPhonie; testy rdzenia i kompilacja nie zastępują tego odbioru.
- iOS 32 jest podpisany i dostępny w wewnętrznym TestFlight. Wymagane pozostają rzeczywiste odbiory mycia, skanera/zapisu PDF i pełnego zakresu na iPhonie oraz CarPlay w aucie; status Testing ich nie zastępuje.
- Android: kandydat 0.1.46 (51) ma aktualną alokację i przetestowane niezmienione bramki; brak rzeczywistych wymaganych odbiorów Android Auto/produkcji blokuje podpisywanie.
- Fizyczny CarPlay nie jest podłączony.
- Nowe pola API wymagają wdrożenia i odbioru backendu na DEV przed promocją do produkcji.
- Bieżący iOS 32 obejmuje wspólne zasoby i jest dostępny wewnętrznie w TestFlight; Android 51 nadal wymaga nowej zweryfikowanej paczki. Wymagany odrębny odbiór własnej historii Tacho z API DEV na bieżącym koncie kierowcy.
- Bieżący iOS 32 podpisany i dostępny wewnętrznie w TestFlight; Android 51 nadal wymaga podpisania po rzeczywistych odbiorach. Wymagany odbiór nowego przepływu mycia; poprzedni test DEV AA39 nie zastępuje odbioru bieżących paczek.
- Przed podpisaniem Androida 51 pozostają wymagane rzeczywiste odbiory zakresu produkcyjnego i deklaracji Data Safety, w tym Android Auto POI/Tacho. Udostępnienie QA nie zastępuje odbioru produkcyjnego iOS.
- Ponowny odbiór inwentaryzacji w nowej sesji DEV pozostaje otwarty: serwer nie zwraca syntetycznej ankiety. Wcześniejszy zaakceptowany odbiór jest zachowany jako osobny dowód.
- Android 51: zachowane wymagane odbiory pakietu, TMS PROD, zakresu zapisów, Android Auto POI/Tacho i Data Safety; brak odbioru nie jest zastępowany testem ani kompilacją.
- iOS 32: podpisany IPA dostępny w wewnętrznym TestFlight; wymagane rzeczywiste odbiory bieżącego zakresu pozostają jawne.
- Udostępnione: osobny Android DEV QA 33 oraz podpisany iOS 32 w wewnętrznym TestFlight (Testing). Wymagany rzeczywisty odbiór kont, aparatu i zapisu PDF na obu urządzeniach. Android 51 i pozostałe odbiory pełnego wydania pozostają otwarte.
- Brakuje potwierdzenia: pola publicznego zgłoszenia w sklepie, odbiór backendu.
