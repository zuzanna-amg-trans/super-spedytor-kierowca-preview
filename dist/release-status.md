# Kontrola wydań Android / Apple

Pakiet zmian: **MOBILE-2026-11-01-01**. Odczyt raportu: 2026-11-01T21:48:56.028Z.

| Platforma | Wersja docelowa | Ostatnio wysłana | Potrzebna nowa paczka | Etap |
|---|---|---|---|---|
| Android | 0.1.46 (51) | 0.1.45 (50) | TAK | Do przygotowania |
| Apple iOS | 0.4.22 (32) | 0.4.21 (31) | TAK | Do przygotowania |

Wysłanie nowej paczki i publiczna publikacja są oddzielnymi krokami. Wspólna gotowość: **NIE**.

## Android

Następny krok: Zgodnie z decyzją właścicielki pozostawić poprawkę zdjęć we wspólnej wersji 51. Zachować wymagane odbiory Android Auto, zakresu produkcyjnego i historii Tacho przed dalszą dystrybucją. W Play ostatni potwierdzony kod to 50.

Stan sklepu: świeży odczyt.
- Przed publicznym wydaniem nadal potrzebny jest odbiór biznesowy inwentaryzacji B939.
- Pozostają wymagane rzeczywiste odbiory Android Auto i zakresu produkcyjnego; kompilacja nie potwierdza odbioru auta.
- Kandydat 51 zachowuje sześć wymaganych rzeczywistych odbiorów zakresu; brak potwierdzonego odbioru Android Auto POI/Tacho nie pozwala uruchomić podpisywania.
- Tacho: nowe zasoby wymagają nowej paczki oraz odbioru własnej historii z API DEV przed promocją backendu.
- Wersja paczki kandydata różni się od planowanego numeru wydania.
- Odbiór integracji inwentaryzacji B939 pozostaje otwarty. Zgodność źródeł i testów technicznych nie jest odbiorem telefonu ani auta.
- Android: kandydat 0.1.46 (51) ma aktualną alokację i przetestowane niezmienione bramki; brak rzeczywistych wymaganych odbiorów Android Auto/produkcji blokuje podpisywanie.
- Fizyczny CarPlay nie jest podłączony.
- Nowe pola API wymagają wdrożenia i odbioru backendu na DEV przed promocją do produkcji.
- Zmiana wspólnych zasobów wymaga nowych zweryfikowanych paczek Android i iOS oraz odbioru konta kierowcy; dotychczasowe paczki nie zawierają tej poprawki.
- Paczka kandydata nie obejmuje bieżących źródeł; trzeba ją zbudować ponownie.

## Apple iOS

Następny krok: Odbiór powiadomień trasy na fizycznym iPhonie potwierdzony 01.11.2026: automatyczny push po zmianie punktu w TMS i otwarcie nowego celu po kliknięciu; CarPlay w aucie pozostaje do odbioru. Poprawkę zdjęć można sprawdzić w wewnętrznym TestFlight 31; zewnętrzna grupa czeka na ocenę Apple. Następna paczka pełnej integracji ma numer 32, po odrębnym odbiorze historii Tacho na DEV.

Stan sklepu: świeży odczyt.
- Tacho: nowe zasoby wymagają nowej paczki oraz odbioru własnej historii z API DEV przed promocją backendu.
- Wersja paczki kandydata różni się od planowanego numeru wydania.
- Odbiór integracji inwentaryzacji B939 pozostaje otwarty. Zgodność źródeł i testów technicznych nie jest odbiorem telefonu ani auta.
- Android: kandydat 0.1.46 (51) ma aktualną alokację i przetestowane niezmienione bramki; brak rzeczywistych wymaganych odbiorów Android Auto/produkcji blokuje podpisywanie.
- Fizyczny CarPlay nie jest podłączony.
- Nowe pola API wymagają wdrożenia i odbioru backendu na DEV przed promocją do produkcji.
- Zmiana wspólnych zasobów wymaga nowych zweryfikowanych paczek Android i iOS oraz odbioru konta kierowcy; dotychczasowe paczki nie zawierają tej poprawki.
- Paczka kandydata nie obejmuje bieżących źródeł; trzeba ją zbudować ponownie.
