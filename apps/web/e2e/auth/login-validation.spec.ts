import { test, expect } from '../fixtures/auth.fixture';
import { testData, errorMessages } from '../helpers/test-data';

/**
 * 🔐 TESTY LOGOWANIA - Walidacja pól
 * TC-LOG-006, TC-LOG-007, TC-LOG-008, TC-LOG-009
 */

test.describe('Logowanie - Walidacja pól', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('TC-LOG-006: Puste pole email', async ({ loginPage, page }) => {
    // Act - wypełnij tylko hasło
    await page.fill('#password', 'Test123!@#');
    await page.click('button[type="submit"]');

    // Assert
    const emailError = await loginPage.getEmailError();
    expect(emailError).toContain(errorMessages.pl.emailRequired);
  });

  test('TC-LOG-007: Puste pole hasło', async ({ loginPage, page }) => {
    // Act - wypełnij tylko email
    await page.fill('#email', 'test@example.com');
    await page.click('button[type="submit"]');

    // Assert
    const passwordError = await loginPage.getPasswordError();
    expect(passwordError).toContain(errorMessages.pl.passwordRequired);
  });

  test('TC-LOG-008: Oba pola puste', async ({ loginPage, page }) => {
    // Act - kliknij submit bez wypełniania
    await page.click('button[type="submit"]');

    // Assert - oba błędy powinny się pojawić
    const emailError = await loginPage.getEmailError();
    const passwordError = await loginPage.getPasswordError();
    
    expect(emailError).toContain(errorMessages.pl.emailRequired);
    expect(passwordError).toContain(errorMessages.pl.passwordRequired);
  });

  test('TC-LOG-009: Nieprawidłowy format emaila', async ({ loginPage, page }) => {
    // Test dla każdego nieprawidłowego formatu
    for (const invalidEmail of testData.invalidEmails) {
      // Act
      await page.fill('#email', invalidEmail);
      await page.fill('#password', 'Test123!@#');
      await page.click('button[type="submit"]');

      // Assert
      const emailError = await loginPage.getEmailError();
      expect(emailError).toContain(errorMessages.pl.invalidEmail);

      // Wyczyść pole przed następną iteracją
      await page.fill('#email', '');
    }
  });
});
