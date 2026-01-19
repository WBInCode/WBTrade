import { test, expect } from '../fixtures/auth.fixture';
import { testData, errorMessages } from '../helpers/test-data';

/**
 * 🔐 TESTY LOGOWANIA - Negatywne (Nieprawidłowe dane)
 * TC-LOG-003, TC-LOG-004, TC-LOG-005
 */

test.describe('Logowanie - Testy negatywne', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('TC-LOG-003: Logowanie z nieprawidłowym hasłem', async ({ 
    loginPage, 
    testUser 
  }) => {
    // Act
    await loginPage.login(testUser.email, 'wrongPassword123!');

    // Assert - sprawdź komunikat błędu
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('Login failed');
    
    // Sprawdź że nie ma przekierowania
    expect(await loginPage.page.url()).toContain('/login');
  });

  test('TC-LOG-004: Logowanie z nieistniejącym emailem', async ({ loginPage }) => {
    // Act
    await loginPage.login('nieistniejacy@example.com', 'anyPassword123!');

    // Assert
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('Login failed');
  });

  test('TC-LOG-005: Logowanie z błędnym emailem i hasłem', async ({ loginPage }) => {
    // Act
    await loginPage.login('niepoprawny@test.com', 'wrongPass123!');

    // Assert
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toContain('Login failed');
  });
});
