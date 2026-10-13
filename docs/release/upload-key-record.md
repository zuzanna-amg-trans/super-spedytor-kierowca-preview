# Klucz uploadowy Google Play — rekord publiczny

Ten dokument zawiera wyłącznie publiczny odcisk certyfikatu. Prywatny klucz i
hasła nie są częścią repozytorium.

## Tożsamość

- alias: `super-spedytor-upload`,
- właściciel: `CN=AMG Poland Sp. z o.o., OU=Mobile, O=AMG Poland Sp. z o.o., L=Krakow, C=PL`,
- algorytm klucza: RSA 4096 bitów,
- algorytm podpisu: SHA384withRSA,
- ważny od 2026-10-13 do 2054-02-28.

## Odciski certyfikatu

- SHA-1: `00:A1:84:46:D0:5C:EF:EE:E5:31:AD:CC:14:4E:B7:7D:56:15:C8:2A`,
- SHA-256: `6B:82:6A:33:27:8A:27:2E:A0:45:1C:71:57:43:98:C9:52:5C:B4:87:B8:B7:F8:47:88:8B:90:BB:9E:10:5E:C8`.

## Przechowywanie

- lokalny plik roboczy: `$HOME/Library/Application Support/AMG Trans/Android Signing/super-spedytor-upload.jks`,
- hasło i alias: Pęk kluczy macOS, usługa
  `eu.amgtrans.superspedytor.driver.upload`,
- szyfrowana kopia w GitHub ma zostać zapisana wyłącznie jako repozytoryjny
  Actions Secret `SS_UPLOAD_KEYSTORE_BASE64`, razem z trzema sekretami
  konfiguracyjnymi wymienionymi w `docs/release/README.md`.

Klucza nie wolno commitować, dołączać do artefaktów workflow ani przesyłać w
wiadomościach. Odciski należy porównać z certyfikatem widocznym w Play Console po
pierwszym przyjętym AAB.
