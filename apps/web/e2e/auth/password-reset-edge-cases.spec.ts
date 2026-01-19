/**
 * Testy edge cases dla resetowania hasła
 * TC-PWD-037 do TC-PWD-041
 */
import { test, expect } from '../fixtures/password-reset.fixture';

test.describe('Reset hasła - Edge Cases', () => {

  const mockToken = 'test-token-12345';

  test.skip('TC-PWD-037: Email ze spacjami na początku/końcu', async ({ forgotPasswordPage }) => {
    // SKIP: Test wymaga działającego API bez rate limiting.
    // Arrange & Act
    const emailWithSpaces = '  test@example.com  ';
    await forgotPasswordPage.requestReset(emailWithSpaces);

    // Assert - aplikacja powinna zrobić trim i przetworzyć
    await forgotPasswordPage.page.waitForTimeout(1000);
    
    const isSuccessDisplayed = await forgotPasswordPage.isSuccessScreenDisplayed();
    expect(isSuccessDisplayed).toBeTruthy();
  });

  test.skip('TC-PWD-038: Email w różnych case\'ach', async ({ forgotPasswordPage }) => {
    // SKIP: Test wymaga działającego API bez rate limiting.
    // Arrange & Act
    const mixedCaseEmail = 'TeSt@ExAmPlE.cOm';
    await forgotPasswordPage.requestReset(mixedCaseEmail);

    // Assert - email powinien być znormalizowany
    await forgotPasswordPage.page.waitForTimeout(1000);
    
    const isSuccessDisplayed = await forgotPasswordPage.isSuccessScreenDisplayed();
    expect(isSuccessDisplayed).toBeTruthy();
  });

  test('TC-PWD-039: Nowe hasło ze spacjami', async ({ resetPasswordPage, page }) => {
    // Arrange
    await resetPasswordPage.goto(mockToken);

    // Act - hasło ze spacjami
    const passwordWithSpaces = 'Test 1234!';
    await resetPasswordPage.fillPassword(passwordWithSpaces);
    await resetPasswordPage.fillConfirmPassword(passwordWithSpaces);
    await resetPasswordPage.submit();

    // Assert - zależy od policy, ale aplikacja nie powinna crashować
    await page.waitForTimeout(1000);
    
    // Sprawdź czy aplikacja obsłużyła (sukces lub błąd walidacji)
    const url = page.url();
    expect(url).toContain('reset-password');
  });

  test.skip('TC-PWD-040: Wielokrotna zmiana hasła', async ({ forgotPasswordPage, testUser, page }) => {
    // SKIP: Test wymaga działającego API bez rate limiting. Wielokrotne żądania są blokowane przez rate limiter.
    // Arrange & Act - 3x reset hasła pod rząd
    for (let i = 0; i < 3; i++) {
      await forgotPasswordPage.goto();
      await forgotPasswordPage.fillEmail(testUser.email);
      await forgotPasswordPage.submit();
      await page.waitForTimeout(1000);
      
      // Sprawdź sukces
      const isSuccessDisplayed = await forgotPasswordPage.isSuccessScreenDisplayed();
      expect(isSuccessDisplayed).toBeTruthy();
    }
  });
});
