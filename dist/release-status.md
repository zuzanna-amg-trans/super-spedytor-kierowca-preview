# Kontrola wydań Android / Apple

Pakiet zmian: **MOBILE-2026-11-01-01**. Odczyt raportu: 2026-11-01T20:16:32.515Z.

| Platforma | Wersja docelowa | Ostatnio wysłana | Potrzebna nowa paczka | Etap |
|---|---|---|---|---|
| Android | 0.1.45 (50) | 0.1.45 (50) | TAK | Do przygotowania |
| Apple iOS | 0.4.20 (30) | 0.4.19 (29) | TAK | Do przygotowania |

Wysłanie nowej paczki i publiczna publikacja są oddzielnymi krokami. Wspólna gotowość: **NIE**.

## Android

Następny krok: Przygotować kolejny kandydat po aktualnym kodzie 50 z poprawką kliknięcia powiadomienia. Nie oznaczać starej paczki 50 jako zawierającej nową poprawkę.

Stan sklepu: świeży odczyt.
- Przed publicznym wydaniem nadal potrzebny jest odbiór biznesowy inwentaryzacji B939.
- Kod 50 jest już w Play; poprawka otwierania powiadomień wymaga nowej paczki i ponownego doboru numeru co najmniej 51. Istniejące odbiory publiczne pozostają osobne.
- Odbiór integracji inwentaryzacji B939 pozostaje otwarty. Zgodność źródeł i testów technicznych nie jest odbiorem telefonu ani auta.
- Nowe wykonania natywne wymagają nowych paczek oraz osobnego odbioru telefonu; potwierdzony odbiór APNs w iOS 0.4.16 (26) nie potwierdza poprawki kliknięcia. Fizyczny CarPlay nie jest podłączony.
- Paczka kandydata nie obejmuje bieżących źródeł; trzeba ją zbudować ponownie.

## Apple iOS

Następny krok: Nowa poprawka otwierania aktualnej operacji po kliknięciu push: przygotowany kandydat 0.4.20 (30); wymaga uploadu i odbioru kliknięcia na telefonie. Nie zmieniać trwającego publicznego zgłoszenia 0.4.15 (25).

Stan sklepu: świeży odczyt.
- Wersja paczki kandydata różni się od planowanego numeru wydania.
- Odbiór integracji inwentaryzacji B939 pozostaje otwarty. Zgodność źródeł i testów technicznych nie jest odbiorem telefonu ani auta.
- Nowe wykonania natywne wymagają nowych paczek oraz osobnego odbioru telefonu; potwierdzony odbiór APNs w iOS 0.4.16 (26) nie potwierdza poprawki kliknięcia. Fizyczny CarPlay nie jest podłączony.
- Paczka kandydata nie obejmuje bieżących źródeł; trzeba ją zbudować ponownie.
