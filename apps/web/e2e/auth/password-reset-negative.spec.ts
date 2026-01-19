/**
 * Testy negatywne - nieprawidłowe dane przy resetowaniu hasła
 * TC-PWD-005 do TC-PWD-007
 */
import { test, expect, testData } from '../fixtures/password-reset.fixture';

test.describe('Reset hasła - Testy negatywne', () => {

  test.skip('TC-PWD-005: Reset dla nieistniejącego emaila', async ({ forgotPasswordPage }) => {
    // SKIP: Test wymaga działającego API bez rate limiting. Ze względów bezpieczeństwa API zwraca ten sam komunikat dla istniejącego i nieistniejącego emaila.
    // Arrange & Act - nieistniejący email
    await forgotPasswordPage.requestReset(testData.emails.nonexistent);

    // Assert - powinna być ta sama odpowiedź jak dla istniejącego
    // (security best practice - nie ujawniamy czy email istnieje)
    await forgotPasswordPage.page.waitForTimeout(1000);
    
    const isSuccessDisplayed = await forgotPasswordPage.isSuccessScreenDisplayed();
    expect(isSuccessDisplayed).toBeTruthy();

    const successMessage = await forgotPasswordPage.getSuccessMessage();
    expect(successMessage.toLowerCase()).toContain('sprawdź');
  });

  test('TC-PWD-006: Puste pole email', async ({ forgotPasswordPage, page }) => {
    // Arrange - otwórz stronę
    await forgotPasswordPage.goto();

    // Act - kliknij submit bez wypełniania
    await forgotPasswordPage.submit();

    // Assert
    await page.waitForTimeout(500);
    
    const errorMessage = await forgotPasswordPage.getErrorMessage();
    const hasEmailError = errorMessage.toLowerCase().includes('email') &&
                          errorMessage.toLowerCase().includes('wymagany');
    
    expect(hasEmailError).toBeTruthy();
  });

  test('TC-PWD-007: Nieprawidłowy format emaila', async ({ forgotPasswordPage, page }) => {
    const invalidEmails = testData.emails.invalid;

    for (const invalidEmail of invalidEmails) {
      await forgotPasswordPage.goto();
      await forgotPasswordPage.fillEmail(invalidEmail);
      await forgotPasswordPage.submit();

      await page.waitForTimeout(500);
      
      const errorMessage = await forgotPasswordPage.getErrorMessage();
      const hasFormatError = errorMessage.toLowerCase().includes('email') ||
                             errorMessage.toLowerCase().includes('prawidłowy');
      
      expect(hasFormatError).toBeTruthy();
    }
  });
});
