Plan Działania - Backend & Infrastructure
Neon PostgreSQL
[ ] Załóż konto na neon.tech
[ ] Stwórz nową bazę danych PostgreSQL
[ ] Skopiuj connection string z panelu Neon
[ ] Przetestuj połączenie z bazą danych
[ ] Zapisz connection string w bezpiecznym miejscu

Upstash Redis
[ ] Załóż konto na upstash.com
[ ] Stwórz nową instancję Redis
[ ] Skopiuj Redis URL
[ ] Skopiuj Redis password
[ ] Przetestuj połączenie z Redis
[ ] Zapisz credentials w bezpiecznym miejscu

Migracje Prisma
[ ] Zaktualizuj DATABASE_URL w pliku .env na connection string z Neon
[ ] Uruchom npx prisma migrate deploy na produkcyjnej bazie Neon
[ ] Zweryfikuj czy wszystkie tabele zostały utworzone
[ ] Sprawdź czy migracje przeszły bez błędów
[ ] Uruchom npx prisma generate aby zaktualizować Prisma Client

Dockerfile dla API
[ ] Stwórz Dockerfile w projekcie API
[ ] Skonfiguruj base image (np. Node.js)
[ ] Dodaj instrukcje kopiowania plików
[ ] Skonfiguruj instalację dependencies
[ ] Dodaj instrukcję uruchomienia aplikacji
[ ] Dodaj .dockerignore z wykluczeniem node_modules, .env itp.
[ ] Przetestuj build lokalnie: docker build -t api .
[ ] Przetestuj uruchomienie lokalnie: docker run -p 3000:3000 api

Deploy API
[ ] Wybierz platformę: Fly.io lub Render
[ ] Załóż konto na wybranej platformie
[ ] Zainstaluj CLI wybranej platformy
[ ] Stwórz nową aplikację/projekt
[ ] Skonfiguruj region deployu
[ ] Uruchom pierwszy deploy
[ ] Zapisz URL API po deploymencie

Zmienne Środowiskowe Produkcyjne
[ ] Ustaw DATABASE_URL (Neon connection string)
[ ] Ustaw REDIS_URL (Upstash URL)
[ ] Ustaw REDIS_PASSWORD (Upstash password)
[ ] Ustaw JWT_SECRET (wygeneruj bezpieczny klucz)
[ ] Ustaw NODE_ENV=production
[ ] Ustaw PORT (jeśli wymagane przez platformę)
[ ] Ustaw pozostałe wymagane zmienne ENV
[ ] Zweryfikuj czy wszystkie zmienne są poprawnie ustawione

CORS Configuration
[ ] Dodaj domenę wbtrade.pl do FRONTEND_URL
[ ] Dodaj domenę admin.wbtrade.pl do FRONTEND_URL
[ ] Zaktualizuj konfigurację CORS w API
[ ] Dodaj localhost dla środowiska dev (jeśli potrzeba)
[ ] Przetestuj czy CORS działa poprawnie
[ ] Zweryfikuj czy preflighted requests (OPTIONS) działają

Meilisearch Production
[ ] Załóż konto na meilisearch (cloud) lub setup własnej instancji
[ ] Skopiuj Meilisearch URL
[ ] Skopiuj Meilisearch Master Key
[ ] Ustaw MEILISEARCH_HOST w zmiennych ENV API
[ ] Ustaw MEILISEARCH_API_KEY w zmiennych ENV API
[ ] Uruchom synchronizację danych: script sync produktów do Meilisearch
[ ] Zweryfikuj czy produkty są widoczne w Meilisearch
[ ] Przetestuj wyszukiwanie przez API

Health Checks & Monitoring
[ ] Stwórz endpoint /health w API
[ ] Dodaj sprawdzanie połączenia z bazą danych
[ ] Dodaj sprawdzanie połączenia z Redis
[ ] Dodaj sprawdzanie połączenia z Meilisearch
[ ] Przetestuj endpoint /health
[ ] Skonfiguruj monitoring na platformie (Fly.io/Render)
[ ] Dodaj alerty przy downtime (opcjonalnie)

PayU Production
[ ] Zaloguj się do panelu PayU
[ ] Zmień credentials na produkcyjne (prod keys)
[ ] Ustaw PAYU_POS_ID (production)
[ ] Ustaw PAYU_CLIENT_ID (production)
[ ] Ustaw PAYU_CLIENT_SECRET (production)
[ ] Ustaw PAYU_SECOND_KEY dla weryfikacji webhooków
[ ] Zarejestruj webhook URL w panelu PayU
[ ] Przetestuj płatność testową (małą kwotą)
[ ] Zweryfikuj czy webhook działa poprawnie
[ ] Sprawdź logi transakcji w panelu PayU

Testy Integracyjne
[ ] Przetestuj połączenie API z bazą danych
[ ] Przetestuj połączenie API z Redis
[ ] Przetestuj wyszukiwanie przez Meilisearch
[ ] Przetestuj autoryzację JWT
[ ] Przetestuj główne endpointy API
[ ] Przetestuj webhooks PayU
[ ] Zweryfikuj logi błędów

Deliverables - Podsumowanie
[ ] API działa na produkcji (Fly.io/Render)
[ ] Baza danych PostgreSQL działa na Neon
[ ] Redis działa na Upstash
[ ] Wszystkie migracje Prisma są wykonane
[ ] Meilisearch jest zsynchronizowany z produktami
[ ] CORS jest poprawnie skonfigurowany
[ ] PayU jest gotowe do przyjmowania płatności produkcyjnych
[ ] Health checks działają poprawnie
[ ] Wszystkie zmienne ENV są poprawnie ustawione