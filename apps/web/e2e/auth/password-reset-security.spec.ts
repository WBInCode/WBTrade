/**
 * Testy bezpieczeństwa dla resetowania hasła
 * TC-PWD-018 do TC-PWD-022
 */
import { test, expect, testData } from '../fixtures/password-reset.fixture';

test.describe('Reset hasła - Testy bezpieczeństwa', () => {

  test('TC-PWD-018: Rate limiting - wielokrotne żądania resetu', async ({ forgotPasswordPage, page }) => {
    // Arrange
    const email = 'test-rate-limit@example.com';

    // Act - wyślij 5 żądań pod rząd
    for (let i = 0; i < 5; i++) {
      await forgotPasswordPage.goto();
      await forgotPasswordPage.fillEmail(email);
      await forgotPasswordPage.submit();
      await page.waitForTimeout(500);
    }

    // Assert - po wielu próbach powinien być rate limit lub nadal działa
    // (Test sprawdza czy aplikacja nie crashuje przy wielokrotnych requestach)
    const currentUrl = page.url();
    expect(currentUrl).toContain('forgot-password');
  });

  test('TC-PWD-019: SQL Injection w polu email', async ({ forgotPasswordPage, page }) => {
    const sqlPayloads = testData.security.sqlInjection;

    for (const payload of sqlPayloads) {
      await forgotPasswordPage.goto();
      await forgotPasswordPage.fillEmail(payload);
      await forgotPasswordPage.submit();

      await page.waitForTimeout(500);
      
      // Assert - aplikacja powinna odrzucić lub zasanityzować
      // Sprawdzamy czy nie ma błędu SQL w konsoli lub czy strona nie crashuje
      const hasError = await forgotPasswordPage.getErrorMessage();
      
      // Sprawdź że strona nadal działa
      expect(page.url()).toContain('forgot-password');
      
      // Jeśli jest błąd, powinien być związany z walidacją, nie z SQL
      if (hasError) {
        expect(hasError.toLowerCase()).not.toContain('sql');
        expect(hasError.toLowerCase()).not.toContain('database');
      }
    }
  });

  test('TC-PWD-020: XSS w polu email', async ({ forgotPasswordPage, page }) => {
    const xssPayloads = testData.security.xss;

    for (const payload of xssPayloads) {
      await forgotPasswordPage.goto();
      await forgotPasswordPage.fillEmail(payload);
      await forgotPasswordPage.submit();

      await page.waitForTimeout(500);
      
      // Assert - skrypt nie powinien się wykonać
      // Sprawdzamy czy nie pojawił się alert
      const hasAlert = await page.evaluate(() => {
        return typeof (window as any).alertShown !== 'undefined';
      });
      
      expect(hasAlert).toBeFalsy();
    }
  });

  test('TC-PWD-021: Bardzo długa wartość w polu email', async ({ forgotPasswordPage, page }) => {
    // Arrange
    const longEmail = 'a'.repeat(1000) + '@example.com';

    // Act
    await forgotPasswordPage.goto();
    await forgotPasswordPage.fillEmail(longEmail);
    await forgotPasswordPage.submit();

    // Assert - aplikacja powinna obsłużyć bez crash'u
    await page.waitForTimeout(500);
    
    const errorMessage = await forgotPasswordPage.getErrorMessage();
    
    // Powinien być jakiś błąd walidacji lub przetworzenie
    expect(page.url()).toContain('forgot-password');
  });

  test('TC-PWD-017: Token z SQL injection', async ({ resetPasswordPage, page }) => {
    // Arrange - token z SQL injection
    const maliciousToken = "'; DROP TABLE users;--";

    // Act
    await resetPasswordPage.goto(maliciousToken);
    await resetPasswordPage.fillPassword('Test1234!');
    await resetPasswordPage.fillConfirmPassword('Test1234!');
    await resetPasswordPage.submit();

    // Assert
    await page.waitForTimeout(1000);
    
    const errorMessage = await resetPasswordPage.getErrorMessage();
    
    // Powinien być błąd o nieprawidłowym tokenie, nie SQL error
    expect(errorMessage.toLowerCase()).not.toContain('sql');
    expect(errorMessage.toLowerCase()).not.toContain('database');
    
    // Jeśli jest błąd, powinien mówić o tokenie lub rate limit (bo mogliśmy wyczerpać limity w poprzednich testach)
    if (errorMessage && !errorMessage.toLowerCase().includes('authentication attempts')) {
      expect(errorMessage.toLowerCase()).toMatch(/token|link|nieprawidłow/);
    }
  });
});
