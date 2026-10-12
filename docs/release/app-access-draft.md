# Google Play App access — szkic instrukcji recenzenta

> Status: niegotowe. Nie ma jeszcze stagingowego konta ani produkcyjnej
> aktywacji urządzenia.

Jeżeli wszystkie funkcje aplikacji są dostępne dopiero po zalogowaniu, Google
Play musi otrzymać instrukcję pozwalającą przejść pełny proces bez kontaktu z
zespołem w czasie recenzji.

## Preferowany wariant

Dedykowany użytkownik recenzencki w środowisku odizolowanym od produkcji:

- konto: `[DO UZUPEŁNIENIA W PLAY CONSOLE, NIE W REPOZYTORIUM]`,
- hasło albo kod aktywacyjny: `[DO UZUPEŁNIENIA W PLAY CONSOLE]`,
- przypisane nieszkodliwe zlecenie demonstracyjne,
- wszystkie wymagane punkty trasy i materiały testowe,
- możliwość wielokrotnego resetu procesu,
- brak dostępu do danych rzeczywistych klientów i kierowców,
- ważność przez cały okres recenzji oraz kilka dni po planowanym wydaniu.

## Robocza instrukcja dla recenzenta

1. Uruchom aplikację.
2. Wybierz „Aktywuj urządzenie”.
3. Wprowadź przekazany kod recenzencki.
4. Otwórz przypisane zlecenie demonstracyjne.
5. Sprawdź ekran trasy, informacje o punkcie i uruchomienie map.
6. Potwierdź dotarcie; po pięciu sekundach sprawdź status synchronizacji.
7. Potwierdź wykonanie załadunku.
8. Przejdź przez jedną sztukę, przykładowy QR, zdjęcia i dokument CMR.
9. Zakończ operację i sprawdź ekran potwierdzenia.
10. W Pomocy wybierz „Resetuj zlecenie recenzenckie”, aby rozpocząć ponownie.

## Warunki akceptacji

- konto nie wymaga SMS-a ani pomocy człowieka,
- kod nie wygasa przed zakończeniem recenzji,
- zlecenie jest zawsze dostępne po resecie,
- nawigacja może być oceniona bez fizycznego przebywania w punkcie,
- funkcje zależne od lokalizacji mają tryb recenzencki lub nie blokują procesu,
- instrukcja jest w języku angielskim, jeśli wymaga tego Play Console,
- dane dostępu są przekazane wyłącznie w chronionym polu App access.
