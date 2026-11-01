# Kontrola wydań Android / Apple

Pakiet zmian: **MOBILE-2026-11-01-01**. Odczyt raportu: 2026-11-01T22:27:50.561Z.

| Platforma | Wersja docelowa | Ostatnio wysłana | Potrzebna nowa paczka | Etap |
|---|---|---|---|---|
| Android | 0.1.46 (51) | 0.1.45 (50) | TAK | Do przygotowania |
| Apple iOS | 0.4.22 (32) | 0.4.21 (31) | TAK | Do przygotowania |

Wysłanie nowej paczki i publiczna publikacja są oddzielnymi krokami. Wspólna gotowość: **NIE**.

## Android

Następny krok: Zgodnie z decyzją właścicielki pozostawić poprawkę zdjęć we wspólnej wersji 51. Zachować wymagane odbiory Android Auto, zakresu produkcyjnego i historii Tacho przed dalszą dystrybucją. W Play ostatni potwierdzony kod to 50. B939: dokończyć odbiór DEV, następnie autoryzowane wdrożenie produkcyjne i odczyt. Sklepów jeszcze nie publikować.

Stan sklepu: świeży odczyt.
- Pozostają wymagane rzeczywiste odbiory Android Auto i zakresu produkcyjnego; kompilacja nie potwierdza odbioru auta.
- Kandydat 51 zachowuje sześć wymaganych rzeczywistych odbiorów zakresu; brak potwierdzonego odbioru Android Auto POI/Tacho nie pozwala uruchomić podpisywania.
- Tacho: nowe zasoby wymagają nowej paczki oraz odbioru własnej historii z API DEV przed promocją backendu.
- B939: produkcja jest autoryzowana po odbiorze DEV. Zaktualizowano zatwierdzony podgląd oraz włączono ankietę tylko na DEV; aktualny TESTB939 to 4455. Pozostaje odczyt po ręcznym zalogowaniu do ramki aplikacji oraz wdrożenie i weryfikacja produkcji.
- Nowe publiczne zgłoszenia i publikacja w Google Play/App Store pozostają wstrzymane na polecenie użytkowniczki.
- Wersja paczki kandydata różni się od planowanego numeru wydania.
- B939: odbiór zatwierdzonego widoku DEV musi potwierdzić dane i zdjęcia z ankiety 4455. Produkcja jest autoryzowana dopiero po udanym odbiorze; sklepy nadal wstrzymane.
- B939 działa na DEV. Wdrożenie produkcyjne jest autoryzowane; pozostają odbiór funkcjonalny DEV i wdrożenie z weryfikacją produkcji.
- Android: kandydat 0.1.46 (51) ma aktualną alokację i przetestowane niezmienione bramki; brak rzeczywistych wymaganych odbiorów Android Auto/produkcji blokuje podpisywanie.
- Fizyczny CarPlay nie jest podłączony.
- Nowe pola API wymagają wdrożenia i odbioru backendu na DEV przed promocją do produkcji.
- Zmiana wspólnych zasobów wymaga nowych zweryfikowanych paczek Android i iOS oraz odbioru konta kierowcy; dotychczasowe paczki nie zawierają tej poprawki.
- Paczka kandydata nie obejmuje bieżących źródeł; trzeba ją zbudować ponownie.

## Apple iOS

Następny krok: Odbiór powiadomień trasy na fizycznym iPhonie potwierdzony 01.11.2026: automatyczny push po zmianie punktu w TMS i otwarcie nowego celu po kliknięciu; CarPlay w aucie pozostaje do odbioru. Poprawkę zdjęć można sprawdzić w wewnętrznym TestFlight 31; zewnętrzna grupa czeka na ocenę Apple. Następna paczka pełnej integracji ma numer 32, po odrębnym odbiorze historii Tacho na DEV. B939: dokończyć odbiór DEV, następnie autoryzowane wdrożenie produkcyjne i odczyt. Sklepów jeszcze nie publikować.

Stan sklepu: świeży odczyt.
- Tacho: nowe zasoby wymagają nowej paczki oraz odbioru własnej historii z API DEV przed promocją backendu.
- B939: produkcja jest autoryzowana po odbiorze DEV. Zaktualizowano zatwierdzony podgląd oraz włączono ankietę tylko na DEV; aktualny TESTB939 to 4455. Pozostaje odczyt po ręcznym zalogowaniu do ramki aplikacji oraz wdrożenie i weryfikacja produkcji.
- Nowe publiczne zgłoszenia i publikacja w Google Play/App Store pozostają wstrzymane na polecenie użytkowniczki.
- Wersja paczki kandydata różni się od planowanego numeru wydania.
- B939: odbiór zatwierdzonego widoku DEV musi potwierdzić dane i zdjęcia z ankiety 4455. Produkcja jest autoryzowana dopiero po udanym odbiorze; sklepy nadal wstrzymane.
- B939 działa na DEV. Wdrożenie produkcyjne jest autoryzowane; pozostają odbiór funkcjonalny DEV i wdrożenie z weryfikacją produkcji.
- Android: kandydat 0.1.46 (51) ma aktualną alokację i przetestowane niezmienione bramki; brak rzeczywistych wymaganych odbiorów Android Auto/produkcji blokuje podpisywanie.
- Fizyczny CarPlay nie jest podłączony.
- Nowe pola API wymagają wdrożenia i odbioru backendu na DEV przed promocją do produkcji.
- Zmiana wspólnych zasobów wymaga nowych zweryfikowanych paczek Android i iOS oraz odbioru konta kierowcy; dotychczasowe paczki nie zawierają tej poprawki.
- Paczka kandydata nie obejmuje bieżących źródeł; trzeba ją zbudować ponownie.
