/**
 * Testy walidacji emaila - TC-REG-024 do TC-REG-027
 */
import { test, expect, dbHelpers } from '../fixtures/register.fixture';

test.describe('Rejestracja - Walidacja emaila', () => {

  test('TC-REG-024: Email z subdomeną', async ({ registerPage, page }) => {
    const email = `test-${Date.now()}@mail.example.com`;

    await registerPage.fillForm({
      firstName: 'Test',
      lastName: 'User',
      email: email,
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      acceptTerms: true,
    });
    await registerPage.submit();

    await page.waitForTimeout(1000);

    // Assert - email z subdomeną powinien być zaakceptowany
    const errorMessage = await registerPage.getErrorMessage();
    const hasEmailFormatError = errorMessage.toLowerCase().includes('email') &&
                                 (errorMessage.toLowerCase().includes('format') ||
                                  errorMessage.toLowerCase().includes('nieprawidłowy'));
    
    // Nie powinno być błędu formatu
    expect(!hasEmailFormatError).toBeTruthy();

    // Cleanup
    try {
      await dbHelpers.deleteTestUser(email);
    } catch (e) {}
  });

  test('TC-REG-025: Email z plusem', async ({ registerPage, page }) => {
    const email = `test+tag-${Date.now()}@example.com`;

    await registerPage.fillForm({
      firstName: 'Test',
      lastName: 'User',
      email: email,
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      acceptTerms: true,
    });
    await registerPage.submit();

    await page.waitForTimeout(1000);

    // Assert - email z + powinien być zaakceptowany
    const errorMessage = await registerPage.getErrorMessage();
    const hasEmailFormatError = errorMessage.toLowerCase().includes('email') &&
                                 errorMessage.toLowerCase().includes('format');
    
    expect(!hasEmailFormatError).toBeTruthy();

    // Cleanup
    try {
      await dbHelpers.deleteTestUser(email);
    } catch (e) {}
  });

  test('TC-REG-026: Email z myślnikiem', async ({ registerPage, page }) => {
    const email = `test-user-${Date.now()}@example.com`;

    await registerPage.fillForm({
      firstName: 'Test',
      lastName: 'User',
      email: email,
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      acceptTerms: true,
    });
    await registerPage.submit();

    await page.waitForTimeout(1000);

    // Assert
    const errorMessage = await registerPage.getErrorMessage();
    const hasEmailFormatError = errorMessage.toLowerCase().includes('email') &&
                                 errorMessage.toLowerCase().includes('format');
    
    expect(!hasEmailFormatError).toBeTruthy();

    // Cleanup
    try {
      await dbHelpers.deleteTestUser(email);
    } catch (e) {}
  });

  test('TC-REG-027: Email z cyframi', async ({ registerPage, page }) => {
    const email = `test123user${Date.now()}@example.com`;

    await registerPage.fillForm({
      firstName: 'Test',
      lastName: 'User',
      email: email,
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      acceptTerms: true,
    });
    await registerPage.submit();

    await page.waitForTimeout(1000);

    // Assert
    const errorMessage = await registerPage.getErrorMessage();
    const hasEmailFormatError = errorMessage.toLowerCase().includes('email') &&
                                 errorMessage.toLowerCase().includes('format');
    
    expect(!hasEmailFormatError).toBeTruthy();

    // Cleanup
    try {
      await dbHelpers.deleteTestUser(email);
    } catch (e) {}
  });
});
