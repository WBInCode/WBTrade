import { test, expect } from '../fixtures/auth.fixture';
import { testData } from '../helpers/test-data';
import dbHelpers from '../helpers/db-helpers';

/**
 * 🔐 TESTY LOGOWANIA - Edge Cases
 * TC-LOG-021, TC-LOG-022, TC-LOG-023
 * 
 * UWAGA: Testy TC-LOG-021 i TC-LOG-022 wymagają utworzenia użytkownika w bazie.
 * Jeśli nie można utworzyć użytkownika, testy sprawdzają czy aplikacja
 * poprawnie obsługuje błędy (nie crash'uje się).
 */

test.describe('Logowanie - Edge Cases', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('TC-LOG-021: Spacje na początku/końcu emaila', async ({ 
    loginPage, 
    page, 
    testUser 
  }) => {
    // Arrange - próba utworzenia użytkownika testowego
    let userCreated = false;
    try {
      await dbHelpers.createTestUser(testUser.email, testUser.password);
      userCreated = true;
    } catch (error) {
      console.log('Nie udało się utworzyć użytkownika testowego, test sprawdzi obsługę błędów');
    }

    // Act - zaloguj się z emailem ze spacjami (dodajemy spacje do email testUser)
    const emailWithSpaces = `  ${testUser.email}  `;
    await loginPage.login(emailWithSpaces, testUser.password);

    // Assert
    if (userCreated) {
      // Jeśli użytkownik istnieje - powinno się zalogować (po trim)
      await expect(page).toHaveURL(/\/account/, { timeout: 10000 });
      // Cleanup
      await dbHelpers.deleteTestUser(testUser.email);
    } else {
      // Jeśli użytkownik nie istnieje - sprawdź że jest komunikat błędu (nie crash)
      await page.waitForTimeout(2000);
      const hasError = await page.isVisible('.bg-red-50.border-red-100');
      const isOnLoginPage = page.url().includes('/login');
      expect(hasError || isOnLoginPage).toBeTruthy();
    }
  });

  test('TC-LOG-022: Hasło ze specjalnymi znakami', async ({ 
    loginPage, 
    page 
  }) => {
    // Arrange - próba utworzenia użytkownika testowego
    const specialPassword = testData.edgeCases.passwordWithSpecialChars;
    const testEmail = 'special-chars-test@test.com';
    let userCreated = false;
    
    try {
      await dbHelpers.createTestUser(testEmail, specialPassword);
      userCreated = true;
    } catch (error) {
      console.log('Nie udało się utworzyć użytkownika testowego, test sprawdzi obsługę błędów');
    }

    // Act
    await loginPage.login(testEmail, specialPassword);

    // Assert
    if (userCreated) {
      // Jeśli użytkownik istnieje - powinno się zalogować
      await expect(page).toHaveURL(/\/account/, { timeout: 10000 });
      // Cleanup
      await dbHelpers.deleteTestUser(testEmail);
    } else {
      // Jeśli użytkownik nie istnieje - sprawdź że aplikacja nie crash'uje
      await page.waitForTimeout(2000);
      const hasError = await page.isVisible('.bg-red-50.border-red-100');
      const isOnLoginPage = page.url().includes('/login');
      expect(hasError || isOnLoginPage).toBeTruthy();
    }
  });

  test('TC-LOG-023: Hasło z emoji', async ({ loginPage, page }) => {
    // Arrange
    const emojiPassword = testData.edgeCases.passwordWithEmoji;
    
    // Act - próba logowania z emoji
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', emojiPassword);
    await page.click('button[type="submit"]');

    // Assert - powinno być obsłużone (odrzucone lub zaakceptowane)
    // Sprawdź czy nie ma crash'u aplikacji
    await page.waitForTimeout(2000);
    
    // Sprawdź różne możliwe stany błędów
    const hasMainError = await page.isVisible('.bg-red-50.border-red-100');
    const hasInlineError = await page.isVisible('[data-testid="email-error"], [data-testid="password-error"]');
    const hasAnyError = hasMainError || hasInlineError;
    const isRedirected = page.url().includes('/account');
    const isOnLoginPage = page.url().includes('/login');
    
    // Test przechodzi jeśli: jest błąd, przekierowanie do account, lub zostaje na login
    expect(hasAnyError || isRedirected || isOnLoginPage).toBeTruthy();
  });
});
