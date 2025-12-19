import { prisma } from '../db';
import { UserRole, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { validatePassword } from '../lib/validation';

// ============================================
// TYPES
// ============================================

interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
}

interface UpdateUserInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  role?: UserRole;
  isActive?: boolean;
}

interface UserStats {
  totalUsers: number;
  admins: number;
  warehouse: number;
  customers: number;
  activeUsers: number;
  blockedUsers: number;
  newThisMonth: number;
}

// ============================================
// SALT ROUNDS FOR PASSWORD HASHING
// ============================================
const SALT_ROUNDS = 12;

// ============================================
// SERVICE
// ============================================

export const usersService = {
  /**
   * Get paginated list of users with filters
   */
  async getAll(params: GetUsersParams) {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    // Build orderBy
    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute query
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          emailVerified: true,
          lastLoginAt: true,
          lockedUntil: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
              addresses: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get single user by ID
   */
  async getById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        lastLoginIp: true,
        lockedUntil: true,
        failedLoginAttempts: true,
        passwordChangedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            addresses: true,
          },
        },
        addresses: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            street: true,
            city: true,
            postalCode: true,
            country: true,
            phone: true,
            isDefault: true,
          },
        },
        orders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  },

  /**
   * Create new user (admin creating user)
   */
  async create(input: CreateUserInput) {
    const { email, password, firstName, lastName, phone, role = 'CUSTOMER' } = input;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error('Email already in use');
    }

    // Simple password validation for admin-created users (just min 8 chars)
    if (password.length < 8) {
      throw new Error('Invalid password: Password must be at least 8 characters');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role,
        emailVerified: true, // Admin-created users are pre-verified
        emailVerifiedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    return user;
  },

  /**
   * Update user
   */
  async update(userId: string, input: UpdateUserInput) {
    // Check user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    // If email is being changed, check it's not taken
    if (input.email && input.email.toLowerCase() !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });

      if (emailTaken) {
        throw new Error('Email already in use');
      }
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.email && { email: input.email.toLowerCase() }),
        ...(input.firstName && { firstName: input.firstName }),
        ...(input.lastName && { lastName: input.lastName }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.role && { role: input.role }),
        ...(typeof input.isActive === 'boolean' && { isActive: input.isActive }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  },

  /**
   * Change user role
   */
  async changeRole(userId: string, newRole: UserRole) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Prevent changing own role (handled in controller)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    return updatedUser;
  },

  /**
   * Block user (set isActive to false)
   */
  async blockUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('User is already blocked');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        isActive: false,
        // Also lock the account to prevent login
        lockedUntil: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000), // 100 years
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    return updatedUser;
  },

  /**
   * Unblock user (set isActive to true)
   */
  async unblockUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.isActive) {
      throw new Error('User is not blocked');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        isActive: true,
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    return updatedUser;
  },

  /**
   * Delete user (soft delete by deactivating)
   */
  async delete(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has orders
    const orderCount = await prisma.order.count({
      where: { userId },
    });

    if (orderCount > 0) {
      // Soft delete - just deactivate and anonymize
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          email: `deleted_${userId}@deleted.local`,
          firstName: 'Deleted',
          lastName: 'User',
          phone: null,
          lockedUntil: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000),
        },
      });
      return { deleted: true, type: 'soft' };
    }

    // Hard delete if no orders
    await prisma.user.delete({
      where: { id: userId },
    });

    return { deleted: true, type: 'hard' };
  },

  /**
   * Reset user password (admin action)
   */
  async resetPassword(userId: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Validate password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(`Invalid password: ${passwordValidation.errors.join(', ')}`);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordChangedAt: new Date(),
        // Clear any account locks
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    return { success: true };
  },

  /**
   * Get user statistics
   */
  async getStats(): Promise<UserStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      admins,
      warehouse,
      customers,
      activeUsers,
      blockedUsers,
      newThisMonth,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'WAREHOUSE' } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    ]);

    return {
      totalUsers,
      admins,
      warehouse,
      customers,
      activeUsers,
      blockedUsers,
      newThisMonth,
    };
  },

  /**
   * Unlock account (clear failed login attempts)
   */
  async unlockAccount(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    return { success: true };
  },
};
