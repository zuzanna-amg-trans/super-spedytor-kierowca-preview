# Kontrola wydań Android / Apple

Pakiet zmian: **MOBILE-2026-11-01-01**. Odczyt raportu: 2026-11-01T21:03:15.790Z.

| Platforma | Wersja docelowa | Ostatnio wysłana | Potrzebna nowa paczka | Etap |
|---|---|---|---|---|
| Android | 0.1.46 (51) | 0.1.45 (50) | TAK | Do przygotowania |
| Apple iOS | 0.4.21 (31) | 0.4.20 (30) | TAK | Do przygotowania |

Wysłanie nowej paczki i publiczna publikacja są oddzielnymi krokami. Wspólna gotowość: **NIE**.

## Android

Następny krok: Po rzeczywistych wymaganych odbiorach zakresu odświeżyć maksimum Play i uruchomić istniejący workflow build-only dla 0.1.46 (51), bez publicznego zgłoszenia. Pełna historia Tacho ma osobny odbiór własnych danych z API DEV przed dystrybucją pakietu zawierającego ten zakres.

Stan sklepu: świeży odczyt.
- Przed publicznym wydaniem nadal potrzebny jest odbiór biznesowy inwentaryzacji B939.
- Pozostają wymagane rzeczywiste odbiory Android Auto i zakresu produkcyjnego; kompilacja nie potwierdza odbioru auta.
- Kandydat 51 zachowuje sześć wymaganych rzeczywistych odbiorów zakresu; brak potwierdzonego odbioru Android Auto POI/Tacho nie pozwala uruchomić podpisywania.
- Tacho: nowe zasoby wymagają nowej paczki oraz odbioru własnej historii z API DEV przed promocją backendu.
- Wersja paczki kandydata różni się od planowanego numeru wydania.
- Odbiór integracji inwentaryzacji B939 pozostaje otwarty. Zgodność źródeł i testów technicznych nie jest odbiorem telefonu ani auta.
- Kliknięcie push w iOS 0.4.20 (30) potwierdzone na fizycznym iPhonie: z Tacho do Operacji z komunikatem o braku aktywnej trasy. Rzeczywista zmiana celu pozostaje nieprzetestowana.
- Android: kandydat 0.1.46 (51) ma aktualną alokację i przetestowane niezmienione bramki; brak rzeczywistych wymaganych odbiorów Android Auto/produkcji blokuje podpisywanie.
- Fizyczny CarPlay nie jest podłączony.
- Nowe pola API wymagają wdrożenia i odbioru backendu na DEV przed promocją do produkcji.
- Zmiana wspólnych zasobów wymaga nowych zweryfikowanych paczek Android i iOS oraz odbioru konta kierowcy; dotychczasowe paczki nie zawierają tej poprawki.
- Paczka kandydata nie obejmuje bieżących źródeł; trzeba ją zbudować ponownie.

## Apple iOS

Następny krok: Sprawdzić podpisaną paczkę 31 z galerią zdjęć z przeładunku i przekazać istniejącym grupom TestFlight. Pełna historia Tacho ma osobny odbiór własnych danych z API DEV przed dystrybucją pakietu zawierającego ten zakres.

Stan sklepu: świeży odczyt.
- Tacho: nowe zasoby wymagają nowej paczki oraz odbioru własnej historii z API DEV przed promocją backendu.
- Wersja paczki kandydata różni się od planowanego numeru wydania.
- Odbiór integracji inwentaryzacji B939 pozostaje otwarty. Zgodność źródeł i testów technicznych nie jest odbiorem telefonu ani auta.
- Kliknięcie push w iOS 0.4.20 (30) potwierdzone na fizycznym iPhonie: z Tacho do Operacji z komunikatem o braku aktywnej trasy. Rzeczywista zmiana celu pozostaje nieprzetestowana.
- Android: kandydat 0.1.46 (51) ma aktualną alokację i przetestowane niezmienione bramki; brak rzeczywistych wymaganych odbiorów Android Auto/produkcji blokuje podpisywanie.
- Fizyczny CarPlay nie jest podłączony.
- Nowe pola API wymagają wdrożenia i odbioru backendu na DEV przed promocją do produkcji.
- Zmiana wspólnych zasobów wymaga nowych zweryfikowanych paczek Android i iOS oraz odbioru konta kierowcy; dotychczasowe paczki nie zawierają tej poprawki.
- Paczka kandydata nie obejmuje bieżących źródeł; trzeba ją zbudować ponownie.
