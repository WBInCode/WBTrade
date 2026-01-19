import { test, expect } from '../fixtures/auth.fixture';
import dbHelpers from '../helpers/db-helpers';

/**
 * 🔐 TESTY LOGOWANIA - UI/UX
 * TC-LOG-017, TC-LOG-018, TC-LOG-019, TC-LOG-020
 */

test.describe('Logowanie - Testy UI/UX', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('TC-LOG-017: Widoczność hasła (toggle)', async ({ loginPage, page }) => {
    // Arrange
    await page.fill('#password', 'Test123!@#');

    // Act - kliknij ikonę oka
    await loginPage.togglePasswordVisibility();

    // Assert - hasło powinno być widoczne
    expect(await loginPage.isPasswordVisible()).toBe(true);

    // Act - kliknij ponownie
    await loginPage.togglePasswordVisibility();

    // Assert - hasło powinno być ukryte
    expect(await loginPage.isPasswordVisible()).toBe(false);
  });

  test('TC-LOG-018: Enter w polu hasła', async ({ loginPage, page, testUser }) => {
    // Arrange
    const uniqueEmail = `enter-test-${Date.now()}@wbtrade.test`;
    await dbHelpers.createTestUser(uniqueEmail, testUser.password);
    await page.fill('#email', uniqueEmail);
    await page.fill('#password', testUser.password);

    // Act - naciśnij Enter
    await loginPage.pressEnterInPasswordField();

    // Assert - formularz powinien się wysłać
    await expect(page).toHaveURL(/\/account/, { timeout: 5000 });

    // Cleanup
    await dbHelpers.deleteTestUser(uniqueEmail);
  });

  test('TC-LOG-019: Komunikaty błędów', async ({ loginPage, page }) => {
    // Act - wywołaj różne błędy
    await loginPage.login('niepoprawny@email.com', 'wrongPass');

    // Assert - sprawdź czy komunikat jest czytelny
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
    expect(errorMessage!.length).toBeGreaterThan(5); // nie jest pusty
    
    // Sprawdź czy komunikat jest po polsku lub angielsku
    const isPolishOrEnglish = 
      errorMessage!.match(/[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]+/) !== null;
    expect(isPolishOrEnglish).toBe(true);
  });

  test('TC-LOG-020: Loading state podczas logowania', async ({ 
    loginPage, 
    page, 
    testUser 
  }) => {
    // Arrange
    await dbHelpers.createTestUser(testUser.email, testUser.password);
    await page.fill('#email', testUser.email);
    await page.fill('#password', testUser.password);

    // Act - kliknij login i szybko sprawdź loading state
    const loginPromise = page.click('button[type="submit"]');
    
    // Assert - przycisk powinien być zablokowany
    await page.waitForTimeout(100); // krótkie opóźnienie
    const isDisabled = await loginPage.isLoginButtonDisabled();
    expect(isDisabled).toBe(true);

    // Sprawdź czy loader jest widoczny
    const isLoading = await loginPage.isLoadingVisible();
    expect(isLoading).toBe(true);

    await loginPromise;

    // Cleanup
    await dbHelpers.deleteTestUser(testUser.email);
  });
});
