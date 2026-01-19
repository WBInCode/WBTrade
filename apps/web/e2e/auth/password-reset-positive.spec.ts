/**
 * Testy pozytywne (Happy Path) - resetowanie hasła
 * TC-PWD-001 do TC-PWD-004
 */
import { test, expect } from '../fixtures/password-reset.fixture';

test.describe('Reset hasła - Testy pozytywne', () => {

  test.skip('TC-PWD-001: Reset hasła z prawidłowym emailem', async ({ forgotPasswordPage, testUser }) => {
    // SKIP: Test wymaga działającego API bez rate limiting. W środowisku testowym rate limit może blokować żądania.
    // Arrange & Act
    await forgotPasswordPage.requestReset(testUser.email);

    // Assert
    await forgotPasswordPage.page.waitForTimeout(1000);
    
    const isSuccessDisplayed = await forgotPasswordPage.isSuccessScreenDisplayed();
    expect(isSuccessDisplayed).toBeTruthy();

    const successMessage = await forgotPasswordPage.getSuccessMessage();
    expect(successMessage.toLowerCase()).toContain('sprawdź');
  });

  test('TC-PWD-004: Logowanie po resecie hasła', async ({ 
    forgotPasswordPage, 
    resetPasswordPage,
    testUser,
    page 
  }) => {
    // Step 1: Zresetuj hasło
    // W prawdziwym scenariuszu potrzebowalibyśmy tokenu z emaila
    // Dla uproszczenia testów, załóżmy że dostajemy token bezpośrednio
    // Tutaj musimy użyć API żeby wygenerować token lub mock
    
    // Najpierw wyślij request o reset
    await forgotPasswordPage.requestReset(testUser.email);
    await forgotPasswordPage.page.waitForTimeout(500);

    // TODO: W rzeczywistym scenariuszu:
    // 1. Pobierz token z bazy danych lub z mock emaila
    // 2. Użyj tego tokenu do resetu hasła
    // 3. Zaloguj się nowym hasłem
    
    // Na razie pomijamy ten test - wymaga integracji z API token generation
    test.skip();
  });
});
