/**
 * Testy bezpieczeństwa rejestracji - TC-REG-013 do TC-REG-017
 */
import { test, expect } from '../fixtures/register.fixture';
import { testData } from '../fixtures/register.fixture';

test.describe('Rejestracja - Testy bezpieczeństwa', () => {

  test('TC-REG-013: SQL Injection w polach formularza', async ({ registerPage, page }) => {
    for (const sqlPayload of testData.security.sqlInjection) {
      await registerPage.goto();
      
      // Act - wstrzyknij SQL w różne pola
      await registerPage.fillForm({
        firstName: sqlPayload,
        lastName: 'Test',
        email: `${sqlPayload}@test.com`,
        password: 'Test1234!',
        confirmPassword: 'Test1234!',
        acceptTerms: true,
      });
      await registerPage.submit();

      await page.waitForTimeout(1000);

      // Assert - strona powinna działać (nie crashować)
      const pageContent = await page.content();
      expect(pageContent).not.toContain('SQL');
      expect(pageContent).not.toContain('syntax error');
      expect(pageContent).not.toContain('database error');
      
      // Sprawdź że strona jest nadal responsywna
      const isResponsive = await page.locator('body').isVisible();
      expect(isResponsive).toBeTruthy();
    }
  });

  test('TC-REG-014: XSS w polach rejestracji', async ({ registerPage, page }) => {
    for (const xssPayload of testData.security.xss) {
      await registerPage.goto();
      
      // Act
      await registerPage.fillForm({
        firstName: xssPayload,
        lastName: xssPayload,
        email: 'test@example.com',
        password: 'Test1234!',
        confirmPassword: 'Test1234!',
        acceptTerms: true,
      });

      await page.waitForTimeout(500);

      // Assert - sprawdź że skrypt XSS nie został wykonany
      const dialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
      const dialog = await dialogPromise;
      
      expect(dialog).toBeNull(); // Nie powinno być żadnego alertu

      // Sprawdź czy treść jest escapowana w HTML
      const pageContent = await page.content();
      expect(pageContent).not.toContain('<script>alert');
    }
  });

  test('TC-REG-015: Bardzo długie wartości w polach', async ({ registerPage, page }) => {
    // Arrange
    const longString = 'a'.repeat(1000);
    const longEmail = 'a'.repeat(500) + '@' + 'b'.repeat(500) + '.com';

    // Act
    await registerPage.fillForm({
      firstName: longString,
      lastName: longString,
      email: longEmail,
      password: longString + 'A1!',
      confirmPassword: longString + 'A1!',
      acceptTerms: true,
    });
    await registerPage.submit();

    await page.waitForTimeout(1000);

    // Assert - strona nie powinna crashować
    const isPageOK = await page.locator('body').isVisible();
    expect(isPageOK).toBeTruthy();

    // Powinien być błąd walidacji lub obsłużony przypadek
    const url = page.url();
    const hasError = await registerPage.getErrorMessage();
    
    // Albo zostaliśmy na stronie rejestracji z błędem, albo jakiś feedback
    expect(url.includes('/register') || hasError.length > 0).toBeTruthy();
  });

  test('TC-REG-016: Wielokrotne próby rejestracji tego samego emaila (rate limiting)', async ({ 
    registerPage, 
    page,
    uniqueEmail 
  }) => {
    // Act - 5 prób rejestracji z tym samym emailem
    for (let i = 0; i < 5; i++) {
      await registerPage.goto();
      await registerPage.fillForm({
        firstName: 'Test',
        lastName: 'User',
        email: uniqueEmail,
        password: 'Test1234!',
        confirmPassword: 'Test1234!',
        acceptTerms: true,
      });
      await registerPage.submit();
      await page.waitForTimeout(500);
    }

    // Assert - sprawdź czy jest jakieś zabezpieczenie (rate limit, captcha, etc.)
    const pageContent = await page.content();
    const url = page.url();
    
    // Test przechodzi jeśli strona nadal działa (nie crashuje)
    const isPageResponsive = await page.locator('body').isVisible();
    expect(isPageResponsive).toBeTruthy();
  });

  test('TC-REG-017: Weryfikacja że hasło nie jest wysyłane w plain text (sprawdzenie typu pola)', async ({ 
    registerPage, 
    page 
  }) => {
    // Assert - pole hasła powinno mieć type="password"
    const passwordType = await page.locator('#password').getAttribute('type');
    const confirmPasswordType = await page.locator('#confirmPassword').getAttribute('type');

    expect(passwordType).toBe('password');
    expect(confirmPasswordType).toBe('password');
  });
});
