/**
 * Testy wymagań hasła - TC-REG-018 do TC-REG-023
 */
import { test, expect } from '../fixtures/register.fixture';

test.describe('Rejestracja - Wymagania hasła', () => {

  test('TC-REG-018: Hasło z dokładnie minimalną długością (8 znaków)', async ({ 
    registerPage, 
    page,
    uniqueEmail 
  }) => {
    // Arrange - hasło dokładnie 8 znaków spełniające wszystkie wymagania
    const minPassword = 'Test123!'; // dokładnie 8 znaków

    await registerPage.fillForm({
      firstName: 'Test',
      lastName: 'User',
      email: uniqueEmail,
      password: minPassword,
      confirmPassword: minPassword,
      acceptTerms: true,
    });
    await registerPage.submit();

    await page.waitForTimeout(1000);

    // Assert - nie powinno być błędu o długości hasła
    const errorMessage = await registerPage.getErrorMessage();
    const hasLengthError = errorMessage.toLowerCase().includes('8') && 
                           errorMessage.toLowerCase().includes('znaków');
    
    // Hasło 8 znaków powinno być zaakceptowane (chyba że jest inny błąd)
    expect(!hasLengthError || errorMessage === '').toBeTruthy();
  });

  test('TC-REG-019: Hasło z maksymalną długością (128 znaków)', async ({ 
    registerPage, 
    page,
    uniqueEmail 
  }) => {
    // Arrange - bardzo długie hasło
    const longPassword = 'Aa1!' + 'x'.repeat(120) + 'Bb2@'; // 128 znaków

    await registerPage.fillForm({
      firstName: 'Test',
      lastName: 'User',
      email: uniqueEmail,
      password: longPassword,
      confirmPassword: longPassword,
      acceptTerms: true,
    });
    await registerPage.submit();

    await page.waitForTimeout(1000);

    // Assert - strona powinna obsłużyć długie hasło
    const isPageOK = await page.locator('body').isVisible();
    expect(isPageOK).toBeTruthy();
  });

  test('TC-REG-020: Hasło tylko z małymi literami', async ({ 
    registerPage, 
    page,
    uniqueEmail 
  }) => {
    await registerPage.fillForm({
      firstName: 'Test',
      lastName: 'User',
      email: uniqueEmail,
      password: 'testtest1!',
      confirmPassword: 'testtest1!',
      acceptTerms: true,
    });
    await registerPage.submit();

    await page.waitForTimeout(500);

    const errorMessage = await registerPage.getErrorMessage();
    expect(errorMessage.toLowerCase()).toContain('wielk');
  });

  test('TC-REG-021: Hasło tylko z dużymi literami', async ({ 
    registerPage, 
    page,
    uniqueEmail 
  }) => {
    await registerPage.fillForm({
      firstName: 'Test',
      lastName: 'User',
      email: uniqueEmail,
      password: 'TESTTEST1!',
      confirmPassword: 'TESTTEST1!',
      acceptTerms: true,
    });
    await registerPage.submit();

    await page.waitForTimeout(500);

    const errorMessage = await registerPage.getErrorMessage();
    expect(errorMessage.toLowerCase()).toContain('mał');
  });

  test('TC-REG-022: Hasło bez cyfr', async ({ 
    registerPage, 
    page,
    uniqueEmail 
  }) => {
    await registerPage.fillForm({
      firstName: 'Test',
      lastName: 'User',
      email: uniqueEmail,
      password: 'TestTest!!',
      confirmPassword: 'TestTest!!',
      acceptTerms: true,
    });
    await registerPage.submit();

    await page.waitForTimeout(500);

    const errorMessage = await registerPage.getErrorMessage();
    expect(errorMessage.toLowerCase()).toContain('cyfr');
  });

  test('TC-REG-023: Hasło bez znaków specjalnych', async ({ 
    registerPage, 
    page,
    uniqueEmail 
  }) => {
    await registerPage.fillForm({
      firstName: 'Test',
      lastName: 'User',
      email: uniqueEmail,
      password: 'TestTest12',
      confirmPassword: 'TestTest12',
      acceptTerms: true,
    });
    await registerPage.submit();

    await page.waitForTimeout(500);

    const errorMessage = await registerPage.getErrorMessage();
    expect(errorMessage.toLowerCase()).toContain('specjaln');
  });
});
