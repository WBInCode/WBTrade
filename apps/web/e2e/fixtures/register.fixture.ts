import { test as base, expect, Page } from '@playwright/test';
import { dbHelpers } from '../helpers/db-helpers';

// Test data for registration tests
export const testData = {
  validUser: {
    email: `test-${Date.now()}@example.com`,
    password: 'Test1234!',
    firstName: 'Jan',
    lastName: 'Kowalski',
  },
  passwords: {
    weak: 'test',
    noUppercase: 'test1234!',
    noLowercase: 'TEST1234!',
    noDigit: 'TestTest!',
    noSpecial: 'Test1234',
    valid: 'Test1234!',
    strong: 'VeryStr0ng!Pass#2024',
  },
  emails: {
    invalid: ['test', 'test@', '@test.com', 'test test@test.com', 'test@.com'],
    valid: ['test@example.com', 'test+tag@example.com', 'test-user@example.com', 'test123@mail.example.com'],
  },
  security: {
    sqlInjection: ["admin'--", "'; DROP TABLE users;--", "' OR '1'='1"],
    xss: ['<script>alert("xss")</script>', '<img src=x onerror=alert(1)>'],
  },
};

// Page Object for Register page
export class RegisterPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/register');
  }

  async fillFirstName(firstName: string) {
    await this.page.fill('#firstName', firstName);
  }

  async fillLastName(lastName: string) {
    await this.page.fill('#lastName', lastName);
  }

  async fillEmail(email: string) {
    await this.page.fill('#email', email);
  }

  async fillPassword(password: string) {
    await this.page.fill('#password', password);
  }

  async fillConfirmPassword(password: string) {
    await this.page.fill('#confirmPassword', password);
  }

  async acceptTerms() {
    await this.page.click('#acceptTerms');
  }

  async submit() {
    await this.page.click('button[type="submit"]');
  }

  async fillForm(data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    acceptTerms?: boolean;
  }) {
    if (data.firstName) await this.fillFirstName(data.firstName);
    if (data.lastName) await this.fillLastName(data.lastName);
    if (data.email) await this.fillEmail(data.email);
    if (data.password) await this.fillPassword(data.password);
    if (data.confirmPassword) await this.fillConfirmPassword(data.confirmPassword);
    if (data.acceptTerms) await this.acceptTerms();
  }

  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword?: string;
    acceptTerms?: boolean;
  }) {
    await this.goto();
    await this.fillForm({
      ...data,
      confirmPassword: data.confirmPassword || data.password,
      acceptTerms: data.acceptTerms ?? true,
    });
    await this.submit();
  }

  async getErrorMessage(): Promise<string> {
    const errorDiv = this.page.locator('.bg-red-50.border-red-100');
    if (await errorDiv.isVisible()) {
      return await errorDiv.textContent() || '';
    }
    return '';
  }

  async getPasswordStrength(): Promise<string | null> {
    const strengthLabel = this.page.locator('.text-xs.font-medium');
    if (await strengthLabel.isVisible()) {
      return await strengthLabel.textContent();
    }
    return null;
  }

  async isPasswordRequirementMet(requirement: string): Promise<boolean> {
    const reqElement = this.page.locator(`text="${requirement}"`).first();
    if (await reqElement.isVisible()) {
      const classes = await reqElement.getAttribute('class');
      return classes?.includes('text-green') || classes?.includes('bg-green') || false;
    }
    return false;
  }

  async togglePasswordVisibility() {
    await this.page.locator('#password').locator('..').locator('button').click();
  }

  async isPasswordVisible(): Promise<boolean> {
    const type = await this.page.locator('#password').getAttribute('type');
    return type === 'text';
  }

  async isSubmitButtonDisabled(): Promise<boolean> {
    return await this.page.locator('button[type="submit"]').isDisabled();
  }

  async isLoading(): Promise<boolean> {
    const button = this.page.locator('button[type="submit"]');
    const isDisabled = await button.isDisabled();
    const hasSpinner = await button.locator('svg.animate-spin').isVisible().catch(() => false);
    return isDisabled || hasSpinner;
  }
}

// Extended test with fixtures
type RegisterFixtures = {
  registerPage: RegisterPage;
  uniqueEmail: string;
};

export const test = base.extend<RegisterFixtures>({
  registerPage: async ({ page }, use) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await use(registerPage);
  },
  uniqueEmail: async ({}, use) => {
    const email = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
    await use(email);
  },
});

export { expect, dbHelpers };
