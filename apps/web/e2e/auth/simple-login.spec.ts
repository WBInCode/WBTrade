import { test, expect } from '@playwright/test';

/**
 * 🔐 PROSTY TEST LOGOWANIA - bez bazy danych
 * Sprawdza tylko interfejs użytkownika
 */

test.describe('Logowanie - Prosty test UI', () => {
  test('Sprawdzenie czy strona logowania się ładuje', async ({ page }) => {
    // Przejdź do strony logowania
    await page.goto('/login');

    // Sprawdź czy formularz logowania istnieje
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

    // Assert - pola powinny być widoczne
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('Walidacja pustych pól', async ({ page }) => {
    // Przejdź do strony logowania
    await page.goto('/login');

    // Znajdź przycisk submit
    const submitButton = page.locator('button[type="submit"]').first();

    // Kliknij submit bez wypełnienia pól
    await submitButton.click();

    // Poczekaj chwilę na walidację
    await page.waitForTimeout(500);

    // Sprawdź czy URL nie zmienił się (nie zalogowano)
    expect(page.url()).toContain('/login');
  });

  test('Wypełnienie formularza i wysłanie', async ({ page }) => {
    // Przejdź do strony logowania
    await page.goto('/login');

    // Wypełnij formularz
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    
    await emailInput.fill('test@example.com');
    await passwordInput.fill('TestPassword123!');

    // Kliknij submit
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Poczekaj na response
    await page.waitForTimeout(2000);

    // Test zakończony - zobaczymy co się stanie
    console.log('Aktualne URL:', page.url());
  });
});
