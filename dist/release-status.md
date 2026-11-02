# Kontrola wydań Android / Apple

Pakiet zmian: **MOBILE-2026-11-01-01**. Odczyt raportu: 2026-11-02T10:50:01.726Z.

| Platforma | Wersja docelowa | Ostatnio wysłana | Potrzebna nowa paczka | Etap |
|---|---|---|---|---|
| Android | 0.1.46 (51) | 0.1.45 (50) | TAK | Do przygotowania |
| Apple iOS | 0.4.22 (32) | 0.4.21 (31) | TAK | Do przygotowania |

Wysłanie nowej paczki i publiczna publikacja są oddzielnymi krokami. Wspólna gotowość: **NIE**.

## Android

Następny krok: Zgodnie z decyzją właścicielki pozostawić poprawkę zdjęć we wspólnej wersji 51. Zachować wymagane odbiory Android Auto, zakresu produkcyjnego i historii Tacho przed dalszą dystrybucją. W Play ostatni potwierdzony kod to 50. B939: zapisany wpis DEV odrzucony (HTTP 401); po skutecznym logowaniu dokończyć rzeczywisty odczyt i wymagany odbiór, następnie autoryzowane wdrożenie produkcyjne i odczyt. Sklepów jeszcze nie publikować. B935/AA39: backend b95ab985 wdrożony 02.11.2026 o 11:23 Europe/Warsaw, z pełnym zweryfikowanym backupem i bez zaległych migracji. Właściciel potwierdził brak odbiorów Android Auto POI/Tacho. Po rzeczywistych wymaganych odbiorach i zatwierdzeniu Data Safety przygotować podpisaną paczkę 51. Nie zgłaszać nowego wydania publicznego.

Stan sklepu: świeży odczyt.
- Pozostają wymagane rzeczywiste odbiory Android Auto i zakresu produkcyjnego; kompilacja nie potwierdza odbioru auta.
- Kandydat 51 zachowuje sześć wymaganych rzeczywistych odbiorów zakresu; brak potwierdzonego odbioru Android Auto POI/Tacho nie pozwala uruchomić podpisywania.
- Tacho: nowe zasoby wymagają nowej paczki oraz odbioru własnej historii z API DEV przed promocją backendu.
- B939: produkcja jest autoryzowana po odbiorze DEV. Aktualny podgląd a4cc3c55 działa; zatwierdzony zapisany wpis został odrzucony przez API (HTTP 401). Konto DEV jest aktywne. Potrzebne skuteczne logowanie aktualnym hasłem i odczyt szczegółów ankiety, następnie wymagany odbiór, wdrożenie i weryfikacja produkcji.
- Nowe publiczne zgłoszenia i publikacja w Google Play/App Store pozostają wstrzymane na polecenie użytkowniczki.
- B935/AA39: mycie dodano do aktualnych źródeł linii 51. Ostatnią potwierdzoną paczką Play pozostaje 50; nowa paczka mycia nie została jeszcze podpisana. Wymagany odbiór nowego przepływu i potwierdzenie deklaracji Data Safety.
- Wersja paczki kandydata różni się od planowanego numeru wydania.
- B939: rzeczywisty odbiór szczegółów DEV nie jest zakończony. W aktualnym podglądzie a4cc3c55 zatwierdzony zapisany wpis jest odrzucany (HTTP 401); potrzebne skuteczne logowanie aktualnym hasłem. Produkcja jest autoryzowana po wymaganym odbiorze; nowe zgłoszenia i publikacja sklepowa nadal wstrzymane. Aktualny dowód: docs/release/evidence/b939-dev-production-2026-11-02.json
- B939 działa na DEV. Wdrożenie produkcyjne jest autoryzowane; pozostają odbiór funkcjonalny DEV i wdrożenie z weryfikacją produkcji.
- Android: kandydat 0.1.46 (51) ma aktualną alokację i przetestowane niezmienione bramki; brak rzeczywistych wymaganych odbiorów Android Auto/produkcji blokuje podpisywanie.
- Fizyczny CarPlay nie jest podłączony.
- Nowe pola API wymagają wdrożenia i odbioru backendu na DEV przed promocją do produkcji.
- Zmiana wspólnych zasobów wymaga nowych zweryfikowanych paczek Android i iOS oraz odbioru konta kierowcy; dotychczasowe paczki nie zawierają tej poprawki.
- Nowa integracja w aktualnej linii aplikacji wymaga podpisanych paczek oraz odbioru ich rzeczywistego przepływu; test DEV poprzedniej paczki AA39 nie jest podpisanym kandydatem 51/32.
- Przed podpisaniem pozostają wymagane rzeczywiste odbiory zakresu produkcyjnego i deklaracji Data Safety; pełny profil Android dodatkowo wymaga Android Auto POI/Tacho.
- Paczka kandydata nie obejmuje bieżących źródeł; trzeba ją zbudować ponownie.

## Apple iOS

Następny krok: Odbiór powiadomień trasy na fizycznym iPhonie potwierdzony 01.11.2026: automatyczny push po zmianie punktu w TMS i otwarcie nowego celu po kliknięciu; CarPlay w aucie pozostaje do odbioru. Poprawkę zdjęć można sprawdzić w wewnętrznym TestFlight 31; zewnętrzna grupa czeka na ocenę Apple. Następna paczka pełnej integracji ma numer 32, po odrębnym odbiorze historii Tacho na DEV. B939: zapisany wpis DEV odrzucony (HTTP 401); po skutecznym logowaniu dokończyć rzeczywisty odczyt i wymagany odbiór, następnie autoryzowane wdrożenie produkcyjne i odczyt. Sklepów jeszcze nie publikować.

Stan sklepu: świeży odczyt.
- Tacho: nowe zasoby wymagają nowej paczki oraz odbioru własnej historii z API DEV przed promocją backendu.
- B939: produkcja jest autoryzowana po odbiorze DEV. Aktualny podgląd a4cc3c55 działa; zatwierdzony zapisany wpis został odrzucony przez API (HTTP 401). Konto DEV jest aktywne. Potrzebne skuteczne logowanie aktualnym hasłem i odczyt szczegółów ankiety, następnie wymagany odbiór, wdrożenie i weryfikacja produkcji.
- Nowe publiczne zgłoszenia i publikacja w Google Play/App Store pozostają wstrzymane na polecenie użytkowniczki.
- B935/AA39: wspólny interfejs oraz natywna polityka mycia są w kodzie; wymagają nowej paczki 32, kompilacji i odbioru na iPhonie. To zadanie zatwierdza wydanie Androida; brak nowego odbioru ani podpisania iOS.
- Wersja paczki kandydata różni się od planowanego numeru wydania.
- B939: rzeczywisty odbiór szczegółów DEV nie jest zakończony. W aktualnym podglądzie a4cc3c55 zatwierdzony zapisany wpis jest odrzucany (HTTP 401); potrzebne skuteczne logowanie aktualnym hasłem. Produkcja jest autoryzowana po wymaganym odbiorze; nowe zgłoszenia i publikacja sklepowa nadal wstrzymane. Aktualny dowód: docs/release/evidence/b939-dev-production-2026-11-02.json
- B939 działa na DEV. Wdrożenie produkcyjne jest autoryzowane; pozostają odbiór funkcjonalny DEV i wdrożenie z weryfikacją produkcji.
- Android: kandydat 0.1.46 (51) ma aktualną alokację i przetestowane niezmienione bramki; brak rzeczywistych wymaganych odbiorów Android Auto/produkcji blokuje podpisywanie.
- Fizyczny CarPlay nie jest podłączony.
- Nowe pola API wymagają wdrożenia i odbioru backendu na DEV przed promocją do produkcji.
- Zmiana wspólnych zasobów wymaga nowych zweryfikowanych paczek Android i iOS oraz odbioru konta kierowcy; dotychczasowe paczki nie zawierają tej poprawki.
- Nowa integracja w aktualnej linii aplikacji wymaga podpisanych paczek oraz odbioru ich rzeczywistego przepływu; test DEV poprzedniej paczki AA39 nie jest podpisanym kandydatem 51/32.
- Przed podpisaniem pozostają wymagane rzeczywiste odbiory zakresu produkcyjnego i deklaracji Data Safety; pełny profil Android dodatkowo wymaga Android Auto POI/Tacho.
- Paczka kandydata nie obejmuje bieżących źródeł; trzeba ją zbudować ponownie.
