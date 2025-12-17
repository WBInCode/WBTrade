import prisma from '../db';

interface CreateAddressData {
  userId: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country?: string;
  phone?: string;
  isDefault?: boolean;
}

interface UpdateAddressData {
  firstName?: string;
  lastName?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  isDefault?: boolean;
}

export const addressesService = {
  /**
   * Get all addresses for a user
   */
  async getUserAddresses(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ],
    });
  },

  /**
   * Get a single address by ID
   */
  async getById(id: string, userId: string) {
    return prisma.address.findFirst({
      where: { id, userId },
    });
  },

  /**
   * Get default address for a user
   */
  async getDefaultAddress(userId: string) {
    return prisma.address.findFirst({
      where: { userId, isDefault: true },
    });
  },

  /**
   * Create a new address
   */
  async create(data: CreateAddressData) {
    // If this is the first address or marked as default, handle default logic
    if (data.isDefault) {
      // Remove default from other addresses
      await prisma.address.updateMany({
        where: { userId: data.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Check if this is the first address for the user
    const addressCount = await prisma.address.count({
      where: { userId: data.userId },
    });

    return prisma.address.create({
      data: {
        ...data,
        country: data.country || 'PL',
        // First address is always default
        isDefault: addressCount === 0 ? true : data.isDefault || false,
      },
    });
  },

  /**
   * Update an address
   */
  async update(id: string, userId: string, data: UpdateAddressData) {
    // Verify the address belongs to the user
    const address = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new Error('Address not found');
    }

    // If setting as default, remove default from other addresses
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return prisma.address.update({
      where: { id },
      data,
    });
  },

  /**
   * Delete an address
   */
  async delete(id: string, userId: string) {
    // Verify the address belongs to the user
    const address = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new Error('Address not found');
    }

    await prisma.address.delete({
      where: { id },
    });

    // If deleted address was default, set another as default
    if (address.isDefault) {
      const firstAddress = await prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      if (firstAddress) {
        await prisma.address.update({
          where: { id: firstAddress.id },
          data: { isDefault: true },
        });
      }
    }

    return { success: true };
  },

  /**
   * Set an address as default
   */
  async setDefault(id: string, userId: string) {
    // Verify the address belongs to the user
    const address = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new Error('Address not found');
    }

    // Remove default from all other addresses
    await prisma.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    // Set this address as default
    return prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });
  },
};
