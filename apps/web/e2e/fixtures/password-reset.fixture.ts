import { test as base, expect, Page } from '@playwright/test';
import { dbHelpers } from '../helpers/db-helpers';

// Test data for password reset tests
export const testData = {
  validUser: {
    email: 'password-reset-test@example.com',
    password: 'OldPass123!',
    newPassword: 'NewPass456!',
  },
  passwords: {
    weak: 'test',
    noUppercase: 'test1234!',
    noLowercase: 'TEST1234!',
    noDigit: 'TestTest!',
    noSpecial: 'Test1234',
    tooShort: 'Test1!',
    valid: 'Test1234!',
    strong: 'VeryStr0ng!Pass#2024',
  },
  emails: {
    invalid: ['test', 'test@', '@test.com', 'test test@test.com'],
    nonexistent: 'nonexistent-user-999@example.com',
  },
  security: {
    sqlInjection: ["admin'--", "'; DROP TABLE users;--", "' OR '1'='1"],
    xss: ['<script>alert("xss")</script>', '<img src=x onerror=alert(1)>'],
  },
};

// Page Object for Forgot Password page
export class ForgotPasswordPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/forgot-password');
  }

  async fillEmail(email: string) {
    await this.page.fill('#email', email);
  }

  async submit() {
    await this.page.click('button[type="submit"]');
  }

  async requestReset(email: string) {
    await this.goto();
    await this.fillEmail(email);
    await this.submit();
    // Poczekaj aż API odpowie i success state się ustawi
    await this.page.waitForTimeout(2000);
  }

  async getErrorMessage(): Promise<string> {
    // Sprawdź najpierw górny komunikat błędu
    const topErrorDiv = this.page.locator('.bg-red-50.border-red-100').first();
    if (await topErrorDiv.isVisible()) {
      return await topErrorDiv.textContent() || '';
    }
    
    // Jeśli nie ma górnego błędu, sprawdź inline błędy
    const inlineError = this.page.locator('.text-red-600').first();
    if (await inlineError.isVisible()) {
      return await inlineError.textContent() || '';
    }
    
    return '';
  }

  async getSuccessMessage(): Promise<string> {
    // Po sukcesie jest przekierowanie do success screen
    const heading = this.page.locator('h1');
    if (await heading.isVisible()) {
      return await heading.textContent() || '';
    }
    return '';
  }

  async isSuccessScreenDisplayed(): Promise<boolean> {
    // Sprawdź czy jest ikona sukcesu (email envelope) lub tekst "Sprawdź"
    const successIcon = this.page.locator('.bg-green-100 svg.text-green-600');
    const heading = this.page.locator('h1:has-text("Sprawdź")');
    return (await successIcon.isVisible()) || (await heading.isVisible());
  }

  async isLoading(): Promise<boolean> {
    const button = this.page.locator('button[type="submit"]');
    const isDisabled = await button.isDisabled();
    const hasSpinner = await button.locator('svg.animate-spin').isVisible().catch(() => false);
    return isDisabled || hasSpinner;
  }

  async hasBackToLoginLink(): Promise<boolean> {
    const link = this.page.locator('a[href="/login"]').first();
    return await link.isVisible();
  }
}

// Page Object for Reset Password page (with token)
export class ResetPasswordPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(token?: string) {
    if (token) {
      await this.page.goto(`/reset-password?token=${token}`);
    } else {
      await this.page.goto('/reset-password');
    }
  }

  async fillPassword(password: string) {
    await this.page.fill('#password', password);
  }

  async fillConfirmPassword(password: string) {
    await this.page.fill('#confirmPassword', password);
  }

  async submit() {
    await this.page.click('button[type="submit"]');
  }

  async resetPassword(token: string, password: string, confirmPassword?: string) {
    await this.goto(token);
    await this.fillPassword(password);
    await this.fillConfirmPassword(confirmPassword || password);
    await this.submit();
  }

  async getErrorMessage(): Promise<string> {
    // Sprawdź najpierw górny komunikat błędu
    const topErrorDiv = this.page.locator('.bg-red-50.border-red-100').first();
    if (await topErrorDiv.isVisible()) {
      return await topErrorDiv.textContent() || '';
    }
    
    // Jeśli nie ma górnego błędu, sprawdź inline błędy
    const inlineError = this.page.locator('.text-red-600').first();
    if (await inlineError.isVisible()) {
      return await inlineError.textContent() || '';
    }
    
    return '';
  }

  async getPasswordStrength(): Promise<string | null> {
    // Szuka labela siły hasła (Słabe/Średnie/Dobre/Silne)
    const strengthLabels = ['Słabe', 'Średnie', 'Dobre', 'Silne'];
    for (const label of strengthLabels) {
      const element = this.page.locator(`text="${label}"`);
      if (await element.isVisible()) {
        return label;
      }
    }
    return null;
  }

  async togglePasswordVisibility() {
    await this.page.locator('#password').locator('..').locator('button').first().click();
  }

  async isPasswordVisible(): Promise<boolean> {
    const type = await this.page.locator('#password').getAttribute('type');
    return type === 'text';
  }

  async isSuccessScreenDisplayed(): Promise<boolean> {
    // Sprawdź czy jest ikona sukcesu (checkmark)
    const successIcon = this.page.locator('svg.text-green-600').first();
    return await successIcon.isVisible();
  }

  async isLoading(): Promise<boolean> {
    const button = this.page.locator('button[type="submit"]');
    const isDisabled = await button.isDisabled();
    const hasSpinner = await button.locator('svg.animate-spin').isVisible().catch(() => false);
    return isDisabled || hasSpinner;
  }
}

// Extended test with fixtures
type PasswordResetFixtures = {
  forgotPasswordPage: ForgotPasswordPage;
  resetPasswordPage: ResetPasswordPage;
  testUser: typeof testData.validUser;
};

export const test = base.extend<PasswordResetFixtures>({
  forgotPasswordPage: async ({ page }, use) => {
    const forgotPasswordPage = new ForgotPasswordPage(page);
    await use(forgotPasswordPage);
  },
  resetPasswordPage: async ({ page }, use) => {
    const resetPasswordPage = new ResetPasswordPage(page);
    await use(resetPasswordPage);
  },
  testUser: async ({}, use) => {
    // Tworzymy użytkownika testowego
    const user = {
      email: `pwd-reset-${Date.now()}@example.com`,
      password: 'OldPass123!',
      newPassword: 'NewPass456!',
    };
    
    // Rejestrujemy użytkownika przed testem
    await dbHelpers.createTestUser(user.email, user.password);

    await use(user);

    // Cleanup - usuń użytkownika po teście
    await dbHelpers.deleteTestUser(user.email);
  },
});

export { expect, dbHelpers };
