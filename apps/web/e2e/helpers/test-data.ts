/**
 * Dane testowe dla różnych scenariuszy
 */

export const testData = {
  validUsers: [
    {
      email: 'test@example.com',
      password: 'Test123!@#',
    },
    {
      email: 'user@domain.com',
      password: 'SecurePass123!',
    },
  ],

  invalidEmails: [
    'testtest.com',       // brak @
    'test@',              // brak domeny
    '@test.com',          // brak użytkownika
    'test test@test.com', // spacja
  ],

  invalidPasswords: [
    'short',              // za krótkie
    '12345678',           // tylko cyfry
    'abcdefgh',           // tylko litery
    'Abcdefgh',           // brak cyfr i znaków specjalnych
  ],

  sqlInjectionAttempts: [
    "admin'--",
    "' OR '1'='1",
    "'; DROP TABLE users;--",
    "1' OR '1' = '1",
  ],

  xssAttempts: [
    "<script>alert('xss')</script>",
    "<img src=x onerror=alert('xss')>",
    "javascript:alert('xss')",
    "<svg/onload=alert('xss')>",
  ],

  edgeCases: {
    veryLongString: 'a'.repeat(1001),
    emailWithSpaces: '  test@example.com  ',
    emailMixedCase: 'TeSt@ExAmPlE.COM',
    passwordWithSpecialChars: 'P@ssw0rd!#$%^&*()',
    passwordWithEmoji: 'Test123!😀',
  },
};

export const errorMessages = {
  pl: {
    emailRequired: 'Email jest wymagany',
    passwordRequired: 'Hasło jest wymagane',
    invalidEmail: 'Nieprawidłowy format email',
    invalidCredentials: 'Nieprawidłowe dane logowania',
    accountLocked: 'Konto zostało zablokowane',
    tooManyAttempts: 'Za dużo prób logowania',
  },
  en: {
    emailRequired: 'Email is required',
    passwordRequired: 'Password is required',
    invalidEmail: 'Invalid email format',
    invalidCredentials: 'Invalid credentials',
    accountLocked: 'Account has been locked',
    tooManyAttempts: 'Too many login attempts',
  },
  // Rzeczywiste komunikaty z aplikacji
  actual: {
    loginFailed: 'Login failed', // Faktyczny komunikat zwracany przez aplikację
    invalidCredentials: /Login failed|Invalid credentials|Nieprawidłowe dane logowania/i,
  },
};
