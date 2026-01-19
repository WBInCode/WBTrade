/**
 * Testy walidacji nowego hasła przy resetowaniu
 * TC-PWD-008 do TC-PWD-012
 */
import { test, expect, testData } from '../fixtures/password-reset.fixture';

test.describe('Reset hasła - Walidacja nowego hasła', () => {

  const mockToken = 'test-token-12345';

  test('TC-PWD-009: Nowe hasło nie spełnia wymagań (za krótkie)', async ({ resetPasswordPage, page }) => {
    // Arrange
    await resetPasswordPage.goto(mockToken);

    // Act - hasło za krótkie
    await resetPasswordPage.fillPassword(testData.passwords.tooShort);
    await resetPasswordPage.fillConfirmPassword(testData.passwords.tooShort);
    await resetPasswordPage.submit();

    // Assert
    await page.waitForTimeout(500);
    
    const errorMessage = await resetPasswordPage.getErrorMessage();
    expect(errorMessage.toLowerCase()).toContain('8');
  });

  test('TC-PWD-010: Niezgodne hasła (hasło vs potwierdzenie)', async ({ resetPasswordPage, page }) => {
    // Arrange
    await resetPasswordPage.goto(mockToken);

    // Act
    await resetPasswordPage.fillPassword('Test1234!');
    await resetPasswordPage.fillConfirmPassword('Different1234!');
    await resetPasswordPage.submit();

    // Assert
    await page.waitForTimeout(500);
    
    const errorMessage = await resetPasswordPage.getErrorMessage();
    const hasMatchError = errorMessage.toLowerCase().includes('identyczne') ||
                          errorMessage.toLowerCase().includes('match') ||
                          errorMessage.toLowerCase().includes('zgodne');
    
    expect(hasMatchError).toBeTruthy();
  });

  test('TC-PWD-011: Puste pola nowego hasła', async ({ resetPasswordPage, page }) => {
    // Arrange
    await resetPasswordPage.goto(mockToken);

    // Act - kliknij submit bez wypełniania
    await resetPasswordPage.submit();

    // Assert
    await page.waitForTimeout(500);
    
    const errorMessage = await resetPasswordPage.getErrorMessage();
    expect(errorMessage.length).toBeGreaterThan(0);
  });

  test('TC-PWD-012: Hasło bez wymaganych znaków', async ({ resetPasswordPage, page }) => {
    const invalidPasswords = [
      { pwd: testData.passwords.noUppercase, expectedError: 'wielk' },
      { pwd: testData.passwords.noLowercase, expectedError: 'mał' },
      { pwd: testData.passwords.noDigit, expectedError: 'cyfr' },
      { pwd: testData.passwords.noSpecial, expectedError: 'specjaln' },
    ];

    for (const { pwd, expectedError } of invalidPasswords) {
      await resetPasswordPage.goto(mockToken);
      await resetPasswordPage.fillPassword(pwd);
      await resetPasswordPage.fillConfirmPassword(pwd);
      await resetPasswordPage.submit();

      await page.waitForTimeout(500);
      
      const errorMessage = await resetPasswordPage.getErrorMessage();
      expect(errorMessage.toLowerCase()).toContain(expectedError);
    }
  });
});
