import { test, expect } from '@playwright/test';
import dbHelpers from '../helpers/db-helpers';

/**
 * Test prostej integracji z bazą danych
 */

test.describe('Test bazy danych', () => {
  test.afterAll(async () => {
    await dbHelpers.cleanupTestUsers();
    await dbHelpers.disconnect();
  });

  test('Tworzenie i usuwanie użytkownika testowego', async () => {
    const testEmail = 'db-test@wbtrade.test';
    const testPassword = 'Test123!@#';

    // Act - Utwórz użytkownika
    const user = await dbHelpers.createTestUser(testEmail, testPassword);
    
    // Assert - Użytkownik został utworzony
    expect(user).toBeDefined();
    expect(user.email).toBe(testEmail);
    expect(user.firstName).toBe('Test');
    expect(user.lastName).toBe('User');
    expect(user.emailVerified).toBe(true);
    
    // Sprawdź czy user istnieje w bazie
    const exists = await dbHelpers.userExists(testEmail);
    expect(exists).toBe(true);
    
    // Cleanup
    await dbHelpers.deleteTestUser(testEmail);
    
    // Sprawdź czy został usunięty
    const stillExists = await dbHelpers.userExists(testEmail);
    expect(stillExists).toBe(false);
    
    console.log('✅ Test bazy danych zakończony pomyślnie!');
  });
});
