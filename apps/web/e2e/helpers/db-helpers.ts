import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

/**
 * Helper functions do zarządzania danymi testowymi w bazie
 */

export const dbHelpers = {
  /**
   * Tworzy użytkownika testowego z zahashowanym hasłem
   */
  async createTestUser(email: string, password: string) {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Usuń użytkownika jeśli już istnieje
    await this.deleteTestUser(email);
    
    // Użyj upsert zamiast create - bezpieczniejsze
    return await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
      create: {
        email,
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
  },

  /**
   * Usuwa użytkownika testowego
   */
  async deleteTestUser(email: string) {
    try {
      await prisma.user.deleteMany({
        where: { email },
      });
      // Poczekaj chwilę żeby transakcja się zakończyła
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      // Ignoruj błędy - użytkownik może nie istnieć
    }
  },

  /**
   * Czyści sesje użytkownika
   */
  async clearUserSessions(userId: string) {
    // Jeśli masz model Session, odkomentuj:
    // await prisma.session.deleteMany({
    //   where: { userId },
    // });
  },

  /**
   * Cleanup - usuwa wszystkich użytkowników testowych
   */
  async cleanupTestUsers() {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: '@test' } },
          { email: { contains: '@example.com' } },
        ],
      },
    });
  },

  /**
   * Sprawdza czy użytkownik istnieje
   */
  async userExists(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    return !!user;
  },

  /**
   * Pobiera użytkownika po emailu
   */
  async getUserByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email },
    });
  },

  /**
   * Zamyka połączenie z bazą
   */
  async disconnect() {
    await prisma.$disconnect();
  },
};

export default dbHelpers;
