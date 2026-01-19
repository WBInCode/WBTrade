/**
 * Testy negatywne rejestracji - TC-REG-003 do TC-REG-006
 */
import { test, expect, dbHelpers } from '../fixtures/register.fixture';

test.describe('Rejestracja - Testy negatywne', () => {

  test('TC-REG-003: Rejestracja z istniejącym emailem', async ({ 
    registerPage, 
    page 
  }) => {
    // Arrange - utwórz użytkownika
    const existingEmail = `existing-${Date.now()}@example.com`;
    const password = 'Test1234!';
    
    try {
      await dbHelpers.createTestUser(existingEmail, password);
    } catch (e) {
      console.log('Nie udało się utworzyć użytkownika testowego');
    }

    // Act - spróbuj zarejestrować z tym samym emailem
    await registerPage.register({
      firstName: 'Test',
      lastName: 'User',
      email: existingEmail,
      password: password,
    });

    // Assert - powinien być komunikat o istniejącym emailu
    await page.waitForTimeout(2000);
    
    const errorMessage = await registerPage.getErrorMessage();
    const hasEmailExistsError = errorMessage.toLowerCase().includes('istnieje') || 
                                 errorMessage.toLowerCase().includes('zajęty') ||
                                 errorMessage.toLowerCase().includes('zarejestrowany') ||
                                 errorMessage.toLowerCase().includes('exists') ||
                                 errorMessage.toLowerCase().includes('already');
    
    const isStillOnRegisterPage = page.url().includes('/register');
    
    expect(hasEmailExistsError || isStillOnRegisterPage).toBeTruthy();

    // Cleanup
    try {
      await dbHelpers.deleteTestUser(existingEmail);
    } catch (e) {
      // Ignoruj
    }
  });

  test('TC-REG-004: Niezgodne hasła (hasło vs potwierdzenie)', async ({ 
    registerPage, 
    page,
    uniqueEmail 
  }) => {
    // Arrange & Act
    await registerPage.fillForm({
      firstName: 'Test',
      lastName: 'User',
      email: uniqueEmail,
      password: 'Test1234!',
      confirmPassword: 'DifferentPass123!',
      acceptTerms: true,
    });
    await registerPage.submit();

    // Assert
    await page.waitForTimeout(1000);
    
    const errorMessage = await registerPage.getErrorMessage();
    const hasPasswordMismatchError = errorMessage.toLowerCase().includes('identyczne') ||
                                      errorMessage.toLowerCase().includes('nie zgadza') ||
                                      errorMessage.toLowerCase().includes('match') ||
                                      errorMessage.toLowerCase().includes('zgodne');
    
    expect(hasPasswordMismatchError).toBeTruthy();
  });

  test('TC-REG-005: Hasło nie spełnia wymagań (za krótkie)', async ({ 
    registerPage, 
    page,
    uniqueEmail 
  }) => {
    // Arrange & Act
    await registerPage.fillForm({
      firstName: 'Test',
      lastName: 'User',
      email: uniqueEmail,
      password: 'Short1!',
      confirmPassword: 'Short1!',
      acceptTerms: true,
    });
    await registerPage.submit();

    // Assert
    await page.waitForTimeout(1000);
    
    const errorMessage = await registerPage.getErrorMessage();
    const hasLengthError = errorMessage.toLowerCase().includes('8') ||
                           errorMessage.toLowerCase().includes('znaków') ||
                           errorMessage.toLowerCase().includes('krótkie') ||
                           errorMessage.toLowerCase().includes('minimum');
    
    expect(hasLengthError).toBeTruthy();
  });

  test('TC-REG-006: Hasło bez wymaganych znaków', async ({ 
    registerPage, 
    page,
    uniqueEmail 
  }) => {
    const invalidPasswords = [
      { password: 'testtest1!', error: 'wielk' }, // brak wielkiej litery
      { password: 'TESTTEST1!', error: 'mał' },   // brak małej litery
      { password: 'TestTest!!', error: 'cyfr' },  // brak cyfry
      { password: 'TestTest12', error: 'specjaln' }, // brak znaku specjalnego
    ];

    for (const { password, error } of invalidPasswords) {
      await registerPage.goto();
      await registerPage.fillForm({
        firstName: 'Test',
        lastName: 'User',
        email: uniqueEmail,
        password: password,
        confirmPassword: password,
        acceptTerms: true,
      });
      await registerPage.submit();

      await page.waitForTimeout(500);
      
      const errorMessage = await registerPage.getErrorMessage();
      expect(errorMessage.toLowerCase()).toContain(error.toLowerCase());
    }
  });
});
