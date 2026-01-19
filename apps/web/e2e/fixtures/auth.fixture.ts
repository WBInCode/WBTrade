import { test as base } from '@playwright/test';

/**
 * Fixture do testów autentykacji
 * Dostarcza pomocnicze funkcje i dane testowe
 */

export type TestUser = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

type AuthFixtures = {
  testUser: TestUser;
  loginPage: LoginPage;
};

class LoginPage {
  constructor(public page: any) {}

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('#email', email);
    await this.page.fill('#password', password);
    await this.page.click('button[type="submit"]');
  }

  async getErrorMessage() {
    return await this.page.textContent('.bg-red-50.border-red-100');
  }

  async getEmailError() {
    // Najpierw czekamy chwilę na pojawienie się błędów
    await this.page.waitForTimeout(500);
    
    // Szukamy błędu email - nowy element data-testid
    const emailError = this.page.locator('[data-testid="email-error"]');
    if (await emailError.isVisible()) {
      return await emailError.textContent();
    }
    // Fallback do starego selektora (komunikat ogólny)
    const generalError = this.page.locator('.bg-red-50.border-red-100');
    if (await generalError.isVisible()) {
      return await generalError.textContent();
    }
    return null;
  }

  async getPasswordError() {
    // Najpierw czekamy chwilę na pojawienie się błędów
    await this.page.waitForTimeout(500);
    
    // Szukamy błędu hasła - nowy element data-testid
    const passwordError = this.page.locator('[data-testid="password-error"]');
    if (await passwordError.isVisible()) {
      return await passwordError.textContent();
    }
    // Fallback do starego selektora (komunikat ogólny)
    const generalError = this.page.locator('.bg-red-50.border-red-100');
    if (await generalError.isVisible()) {
      return await generalError.textContent();
    }
    return null;
  }

  async isLoggedIn() {
    await this.page.waitForURL('/account', { timeout: 5000 });
    return this.page.url().includes('/account');
  }

  async togglePasswordVisibility() {
    await this.page.click('button[type="button"]');
  }

  async isPasswordVisible() {
    const type = await this.page.getAttribute('#password', 'type');
    return type === 'text';
  }

  async isLoginButtonDisabled() {
    return await this.page.isDisabled('button[type="submit"]');
  }

  async isLoadingVisible() {
    return await this.page.isVisible('.animate-spin');
  }

  async pressEnterInPasswordField() {
    await this.page.press('#password', 'Enter');
  }
}

export const test = base.extend<AuthFixtures>({
  // Fixture: użytkownik testowy
  testUser: async ({}, use) => {
    const user: TestUser = {
      email: 'playwright-test@wbtrade.test',
      password: 'Test123!@#',
      firstName: 'Jan',
      lastName: 'Kowalski',
    };
    await use(user);
  },

  // Fixture: strona logowania
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
});

export { expect } from '@playwright/test';
