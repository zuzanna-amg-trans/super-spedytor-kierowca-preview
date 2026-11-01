# Kontrola wydań Android / Apple

Pakiet zmian: **MOBILE-2026-11-01-01**. Odczyt raportu: 2026-11-01T20:30:49.964Z.

| Platforma | Wersja docelowa | Ostatnio wysłana | Potrzebna nowa paczka | Etap |
|---|---|---|---|---|
| Android | 0.1.45 (50) | 0.1.45 (50) | TAK | Do przygotowania |
| Apple iOS | 0.4.20 (30) | 0.4.20 (30) | NIE | Wysłane do sklepu |

Wysłanie nowej paczki i publiczna publikacja są oddzielnymi krokami. Wspólna gotowość: **NIE**.

## Android

Następny krok: Przygotować kolejny kandydat po aktualnym kodzie 50 z poprawką kliknięcia powiadomienia. Nie oznaczać starej paczki 50 jako zawierającej nową poprawkę.

Stan sklepu: świeży odczyt.
- Przed publicznym wydaniem nadal potrzebny jest odbiór biznesowy inwentaryzacji B939.
- Kod 50 jest już w Play; poprawka otwierania powiadomień wymaga nowej paczki i ponownego doboru numeru co najmniej 51. Istniejące odbiory publiczne pozostają osobne.
- Workflow podpisywania kandydata jest przypięty do zajętego kodu 50; kolejna paczka wymaga wolnego numeru co najmniej 51.
- Pozostają wymagane rzeczywiste odbiory Android Auto i zakresu produkcyjnego; kompilacja nie potwierdza odbioru auta.
- Odbiór integracji inwentaryzacji B939 pozostaje otwarty. Zgodność źródeł i testów technicznych nie jest odbiorem telefonu ani auta.
- Nowa wersja iOS 0.4.20 (30) jest w TestFlight Testing; odbiór kliknięcia na fizycznym telefonie pozostaje otwarty.
- Android: kod poprawki i testy są gotowe, lecz dotychczasowy podpisany build Play 50 jej nie zawiera; potrzebny nowy podpisany kandydat z wolnym numerem i zachowaniem istniejących bramek odbioru.
- Fizyczny CarPlay nie jest podłączony.
- Paczka kandydata nie obejmuje bieżących źródeł; trzeba ją zbudować ponownie.

## Apple iOS

Następny krok: Zainstalować 0.4.20 (30) w TestFlight, zalogować własne konto, przejść do Tacho, odebrać test push w tle i sprawdzić przejście do aktualnej operacji po dotknięciu. Fizyczny CarPlay oraz publiczne App Review pozostają osobne.

Stan sklepu: świeży odczyt.
- Odbiór integracji inwentaryzacji B939 pozostaje otwarty. Zgodność źródeł i testów technicznych nie jest odbiorem telefonu ani auta.
- Nowa wersja iOS 0.4.20 (30) jest w TestFlight Testing; odbiór kliknięcia na fizycznym telefonie pozostaje otwarty.
- Android: kod poprawki i testy są gotowe, lecz dotychczasowy podpisany build Play 50 jej nie zawiera; potrzebny nowy podpisany kandydat z wolnym numerem i zachowaniem istniejących bramek odbioru.
- Fizyczny CarPlay nie jest podłączony.
- Brakuje kompletu dowodów: testy, podpis, zawartość paczki, materiały sklepu lub odbiór backendu.
