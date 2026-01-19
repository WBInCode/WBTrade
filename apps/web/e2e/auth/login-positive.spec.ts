import { test, expect } from '../fixtures/auth.fixture';
import { testData, errorMessages } from '../helpers/test-data';
import dbHelpers from '../helpers/db-helpers';

/**
 * 🔐 TESTY LOGOWANIA - Pozytywne (Happy Path)
 * TC-LOG-001, TC-LOG-002
 */

test.describe('Logowanie - Testy pozytywne', () => {
  test.beforeEach(async ({ loginPage }) => {
    // Przejdź do strony logowania przed każdym testem
    await loginPage.goto();
  });

  test.afterAll(async () => {
    // Cleanup po wszystkich testach
    await dbHelpers.cleanupTestUsers();
    await dbHelpers.disconnect();
  });

  test('TC-LOG-001: Logowanie z poprawnymi danymi (email + hasło)', async ({ 
    loginPage, 
    testUser, 
    page 
  }) => {
    // Arrange - upewnij się że użytkownik istnieje w bazie
    await dbHelpers.createTestUser(testUser.email, testUser.password);

    // Act - zaloguj się
    await loginPage.login(testUser.email, testUser.password);

    // Assert - sprawdź przekierowanie do konta
    await expect(page).toHaveURL(/\/account/, { timeout: 10000 });
    
    // Cleanup
    await dbHelpers.deleteTestUser(testUser.email);
  });

  test('TC-LOG-002: Logowanie z małymi/wielkimi literami w emailu', async ({ 
    loginPage, 
    testUser, 
    page 
  }) => {
    // Arrange - utwórz użytkownika z lowercase email
    const lowercaseEmail = testUser.email.toLowerCase();
    await dbHelpers.createTestUser(lowercaseEmail, testUser.password);

    // Act - zaloguj się z mixed case wersją tego samego emaila
    const mixedCaseEmail = 'Playwright-Test@WBTrade.Test';
    await loginPage.login(mixedCaseEmail, testUser.password);

    // Assert - logowanie powinno zadziałać (email case-insensitive)
    await expect(page).toHaveURL(/\/account/, { timeout: 10000 });

    // Cleanup
    await dbHelpers.deleteTestUser(lowercaseEmail);
  });
});
