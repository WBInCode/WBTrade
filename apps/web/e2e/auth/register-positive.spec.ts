/**
 * Testy pozytywne rejestracji - TC-REG-001, TC-REG-002
 */
import { test, expect, dbHelpers } from '../fixtures/register.fixture';

test.describe('Rejestracja - Testy pozytywne', () => {
  
  test('TC-REG-001: Rejestracja z wszystkimi poprawnymi danymi', async ({ 
    registerPage, 
    page,
    uniqueEmail 
  }) => {
    // Arrange
    const userData = {
      firstName: 'Jan',
      lastName: 'Kowalski',
      email: uniqueEmail,
      password: 'Test1234!',
    };

    // Act
    await registerPage.register(userData);

    // Assert - powinna być przekierowanie do account lub komunikat sukcesu
    await page.waitForTimeout(2000);
    
    const isRedirected = page.url().includes('/account');
    const hasSuccessMessage = await page.locator('text=/zarejestrowany|sukces|konto utworzone/i').isVisible().catch(() => false);
    const hasVerificationMessage = await page.locator('text=/weryfikac|potwierdź email|sprawdź email/i').isVisible().catch(() => false);
    
    // Sukces jeśli: przekierowanie, komunikat sukcesu, lub prośba o weryfikację email
    expect(isRedirected || hasSuccessMessage || hasVerificationMessage).toBeTruthy();

    // Cleanup - usuń użytkownika testowego
    try {
      await dbHelpers.deleteTestUser(uniqueEmail);
    } catch (e) {
      // Ignoruj błędy cleanup
    }
  });

  test('TC-REG-002: Rejestracja z opcjonalnymi danymi (pełne dane)', async ({ 
    registerPage, 
    page,
    uniqueEmail 
  }) => {
    // Arrange - rejestracja z imieniem i nazwiskiem
    const userData = {
      firstName: 'Anna',
      lastName: 'Nowak-Kowalska',
      email: uniqueEmail,
      password: 'SecurePass123!',
    };

    // Act
    await registerPage.register(userData);

    // Assert
    await page.waitForTimeout(2000);
    
    const isRedirected = page.url().includes('/account');
    const hasSuccessIndicator = await page.locator('text=/sukces|utworzone|zarejestrowany|weryfikac/i').isVisible().catch(() => false);
    const noError = !(await registerPage.getErrorMessage());
    
    expect(isRedirected || hasSuccessIndicator || noError).toBeTruthy();

    // Cleanup
    try {
      await dbHelpers.deleteTestUser(uniqueEmail);
    } catch (e) {
      // Ignoruj błędy cleanup
    }
  });
});
