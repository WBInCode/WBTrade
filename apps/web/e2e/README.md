# 🎭 Playwright E2E Tests - Dokumentacja

## 📁 Struktura projektu

```
apps/web/
├── e2e/
│   ├── auth/                          # Testy autentykacji
│   │   ├── login-positive.spec.ts     # TC-LOG-001, TC-LOG-002
│   │   ├── login-negative.spec.ts     # TC-LOG-003, TC-LOG-004, TC-LOG-005
│   │   ├── login-validation.spec.ts   # TC-LOG-006, TC-LOG-007, TC-LOG-008, TC-LOG-009
│   │   ├── login-security.spec.ts     # TC-LOG-010, TC-LOG-011, TC-LOG-012, TC-LOG-013
│   │   ├── login-ui.spec.ts           # TC-LOG-017, TC-LOG-018, TC-LOG-019, TC-LOG-020
│   │   └── login-edge-cases.spec.ts   # TC-LOG-021, TC-LOG-022, TC-LOG-023
│   ├── fixtures/
│   │   └── auth.fixture.ts            # Fixtures i Page Objects
│   └── helpers/
│       ├── test-data.ts               # Dane testowe
│       └── db-helpers.ts              # Pomocnicze funkcje bazy danych
├── playwright.config.ts               # Konfiguracja Playwright
└── package.json                       # Zaktualizowane skrypty
```

## 🚀 Instalacja

```powershell
# W folderze apps/web
cd apps/web

# Zainstaluj zależności
pnpm install

# Zainstaluj przeglądarki Playwright
pnpm exec playwright install
```

## ▶️ Uruchomienie testów

### Wszystkie testy
```powershell
pnpm test:e2e
```

### UI Mode (interaktywny)
```powershell
pnpm test:e2e:ui
```

### Z widoczną przeglądarką
```powershell
pnpm test:e2e:headed
```

### Debug mode (krok po kroku)
```powershell
pnpm test:e2e:debug
```

### Konkretny plik testowy
```powershell
pnpm exec playwright test login-positive
```

### Tylko jeden test
```powershell
pnpm exec playwright test -g "TC-LOG-001"
```

### Raport HTML
```powershell
pnpm test:e2e:report
```

## 🎬 Codegen - generowanie testów

```powershell
# Uruchom aplikację
pnpm dev

# W drugim terminalu:
pnpm test:e2e:codegen
```

To otworzy przeglądarkę z narzędziem do nagrywania testów - klikasz w aplikacji, a Playwright generuje kod!

## 📝 Przykład użycia

```typescript
import { test, expect } from '../fixtures/auth.fixture';

test('mój test logowania', async ({ loginPage, testUser, page }) => {
  // Przejdź do strony logowania
  await loginPage.goto();
  
  // Zaloguj się
  await loginPage.login(testUser.email, testUser.password);
  
  // Sprawdź przekierowanie
  await expect(page).toHaveURL(/\/dashboard/);
});
```

## 🔧 Konfiguracja

### Zmień base URL
Edytuj `playwright.config.ts`:
```typescript
baseURL: 'http://localhost:3000',
```

### Wybierz przeglądarki
Zakomentuj niepotrzebne w `playwright.config.ts`:
```typescript
projects: [
  { name: 'chromium', ... },  // Chrome
  // { name: 'firefox', ... }, // Firefox (wyłączony)
  // { name: 'webkit', ... },  // Safari (wyłączony)
],
```

## 📊 Raporty

Po każdym teście generowane są:
- **HTML Report** - `playwright-report/index.html`
- **JSON Results** - `test-results.json`
- **Screenshots** - dla failujących testów
- **Videos** - dla failujących testów
- **Traces** - do debug'owania

## ✅ Pokrycie testów

Aktualnie zaimplementowane:
- ✅ TC-LOG-001 - Logowanie z poprawnymi danymi
- ✅ TC-LOG-002 - Email z mixed case
- ✅ TC-LOG-003 - Nieprawidłowe hasło
- ✅ TC-LOG-004 - Nieistniejący email
- ✅ TC-LOG-005 - Błędny email i hasło
- ✅ TC-LOG-006 - Puste pole email
- ✅ TC-LOG-007 - Puste pole hasło
- ✅ TC-LOG-008 - Oba pola puste
- ✅ TC-LOG-009 - Nieprawidłowy format email
- ✅ TC-LOG-010 - SQL Injection
- ✅ TC-LOG-011 - XSS
- ✅ TC-LOG-012 - Wielokrotne próby
- ✅ TC-LOG-013 - Długie wartości
- ✅ TC-LOG-017 - Toggle hasła
- ✅ TC-LOG-018 - Enter w polu
- ✅ TC-LOG-019 - Komunikaty błędów
- ✅ TC-LOG-020 - Loading state
- ✅ TC-LOG-021 - Spacje w emailu
- ✅ TC-LOG-022 - Specjalne znaki w haśle
- ✅ TC-LOG-023 - Emoji w haśle

## 🎯 Następne kroki

Możesz podobnie zrobić testy dla:
- Rejestracji (TC-REG-001 ... TC-REG-055)
- Resetu hasła (TC-PWD-001 ... TC-PWD-054)

## 💡 Tips & Tricks

### Debug konkretnego testu
```powershell
pnpm exec playwright test --debug -g "TC-LOG-001"
```

### Tylko failed testy
```powershell
pnpm exec playwright test --only-failed
```

### Parallel execution
```powershell
pnpm exec playwright test --workers=4
```

### Trace viewer
```powershell
pnpm exec playwright show-trace trace.zip
```

## 📚 Dodatkowe materiały

- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
