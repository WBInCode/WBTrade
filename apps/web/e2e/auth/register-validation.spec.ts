/**
 * Testy walidacji pól rejestracji - TC-REG-007 do TC-REG-012
 * Testy używają HTML5 walidacji natywnej (required) lub JavaScript walidacji po submit
 */
import { test, expect } from '../fixtures/register.fixture';

test.describe('Rejestracja - Walidacja pól', () => {

  test('TC-REG-007: Puste pole email', async ({ registerPage, page }) => {
    // Arrange - wypełnij inne pola, ale zostaw email pusty
    await registerPage.fillForm({
      firstName: 'Test',
      lastName: 'User',
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      acceptTerms: true,
    });
    
    // Assert - sprawdź czy pole email jest wymagane (HTML5 validation)
    const emailInput = page.locator('#email');
    const isRequired = await emailInput.getAttribute('required');
    expect(isRequired !== null || isRequired === '').toBeTruthy();
    
    // Sprawdź czy pole jest invalid gdy puste
    const isInvalid = await emailInput.evaluate((el) => !(el as HTMLInputElement).validity.valid);
    expect(isInvalid).toBeTruthy();
  });

  test('TC-REG-008: Puste pole hasło', async ({ registerPage, page, uniqueEmail }) => {
    // Arrange - wypełnij inne pola, ale zostaw hasło puste
    await registerPage.fillForm({
      firstName: 'Test',
      lastName: 'User',
      email: uniqueEmail,
      acceptTerms: true,
    });
    
    // Assert - sprawdź czy pole hasła jest wymagane (HTML5 validation)
    const passwordInput = page.locator('#password');
    const isRequired = await passwordInput.getAttribute('required');
    expect(isRequired !== null || isRequired === '').toBeTruthy();
    
    // Sprawdź czy pole jest invalid gdy puste
    const isInvalid = await passwordInput.evaluate((el) => !(el as HTMLInputElement).validity.valid);
    expect(isInvalid).toBeTruthy();
  });

  test('TC-REG-009: Puste pole potwierdzenia hasła', async ({ registerPage, page, uniqueEmail }) => {
    // Arrange - wypełnij inne pola z hasłem, ale bez potwierdzenia
    await registerPage.fillForm({
      firstName: 'Test',
      lastName: 'User',
      email: uniqueEmail,
      password: 'Test1234!',
      acceptTerms: true,
    });
    
    // Assert - sprawdź czy pole potwierdzenia jest wymagane
    const confirmInput = page.locator('#confirmPassword');
    const isRequired = await confirmInput.getAttribute('required');
    expect(isRequired !== null || isRequired === '').toBeTruthy();
    
    // Sprawdź czy pole jest invalid gdy puste
    const isInvalid = await confirmInput.evaluate((el) => !(el as HTMLInputElement).validity.valid);
    expect(isInvalid).toBeTruthy();
  });

  test('TC-REG-010: Wszystkie wymagane pola puste', async ({ registerPage, page }) => {
    // Assert - sprawdź czy formularz wymaga pól (HTML5 validation)
    const requiredFields = ['#firstName', '#lastName', '#email', '#password', '#confirmPassword'];
    
    for (const selector of requiredFields) {
      const input = page.locator(selector);
      const isRequired = await input.getAttribute('required');
      expect(isRequired !== null || isRequired === '').toBeTruthy();
    }
    
    // Próba submit bez danych - powinno być zablokowane przez przeglądarkę
    await registerPage.submit();
    await page.waitForTimeout(300);
    
    // Sprawdź że nie przeszło do następnej strony
    expect(page.url()).toContain('/register');
  });

  test('TC-REG-011: Nieprawidłowy format emaila', async ({ registerPage, page }) => {
    const invalidEmails = ['test', 'test@', '@test.com'];

    for (const invalidEmail of invalidEmails) {
      await registerPage.goto();
      
      // Wypełnij wszystkie pola włącznie z nieprawidłowym email
      await registerPage.fillForm({
        firstName: 'Test',
        lastName: 'User',
        email: invalidEmail,
        password: 'Test1234!',
        confirmPassword: 'Test1234!',
        acceptTerms: true,
      });
      
      // Sprawdź walidację HTML5 - pole email powinno być invalid dla nieprawidłowych formatów
      const emailInput = page.locator('#email');
      const isInvalid = await emailInput.evaluate((el) => !(el as HTMLInputElement).validity.valid);
      
      // Pole email z typem "email" powinno oznaczać nieprawidłowe formaty jako invalid
      expect(isInvalid).toBeTruthy();
    }
  });

  test('TC-REG-012: Puste imię/nazwisko', async ({ registerPage, page, uniqueEmail }) => {
    // Usuń required żeby obejść HTML5 i sprawdzić JS walidację
    await page.locator('#firstName').evaluate((el) => el.removeAttribute('required'));
    await page.locator('#lastName').evaluate((el) => el.removeAttribute('required'));
    
    // Test bez imienia
    await registerPage.fillForm({
      lastName: 'User',
      email: uniqueEmail,
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      acceptTerms: true,
    });
    await registerPage.submit();
    
    await page.waitForTimeout(500);
    let errorMessage = await registerPage.getErrorMessage();
    expect(errorMessage.toLowerCase()).toContain('imię');

    // Test bez nazwiska
    await registerPage.goto();
    // Usuń required ponownie
    await page.locator('#firstName').evaluate((el) => el.removeAttribute('required'));
    await page.locator('#lastName').evaluate((el) => el.removeAttribute('required'));
    
    await registerPage.fillForm({
      firstName: 'Test',
      email: uniqueEmail,
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      acceptTerms: true,
    });
    await registerPage.submit();
    
    await page.waitForTimeout(500);
    errorMessage = await registerPage.getErrorMessage();
    expect(errorMessage.toLowerCase()).toContain('nazwisko');
  });
});
