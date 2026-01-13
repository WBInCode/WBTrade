#!/bin/bash

# Skrypt startowy dla produkcji na Render

echo "🚀 Uruchamianie WBTrade API w trybie produkcyjnym..."

# Sprawdzenie czy wszystkie wymagane zmienne są ustawione
required_vars=("DATABASE_URL" "JWT_SECRET" "NODE_ENV")

for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo "❌ Błąd: Zmienna środowiskowa $var nie jest ustawiona"
        exit 1
    fi
done

echo "✅ Wszystkie wymagane zmienne środowiskowe są ustawione"

# Migracja bazy danych (jeśli potrzeba)
echo "🔄 Sprawdzanie migracji bazy danych..."
npx prisma migrate deploy

# Generowanie klienta Prisma (na wszelki wypadek)
echo "🔄 Generowanie klienta Prisma..."
npx prisma generate

# Uruchomienie aplikacji
echo "🎯 Uruchamianie aplikacji..."
exec node dist/app.js