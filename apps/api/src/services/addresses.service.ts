import prisma from '../db';
import { AddressType } from '@prisma/client';

interface CreateAddressData {
  userId: string;
  label?: string;
  type?: AddressType;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country?: string;
  phone?: string;
  isDefault?: boolean;
}

/**
 * Normalize address field for comparison
 * - Trims whitespace
 * - Converts to lowercase
 * - Normalizes multiple spaces to single space
 */
function normalizeField(value: string | null | undefined): string {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Check if two addresses are the same (ignoring case and extra whitespace)
 */
function areAddressesEqual(
  addr1: { firstName: string; lastName: string; street: string; city: string; postalCode: string; country: string },
  addr2: { firstName: string; lastName: string; street: string; city: string; postalCode: string; country: string }
): boolean {
  return (
    normalizeField(addr1.firstName) === normalizeField(addr2.firstName) &&
    normalizeField(addr1.lastName) === normalizeField(addr2.lastName) &&
    normalizeField(addr1.street) === normalizeField(addr2.street) &&
    normalizeField(addr1.city) === normalizeField(addr2.city) &&
    normalizeField(addr1.postalCode) === normalizeField(addr2.postalCode) &&
    normalizeField(addr1.country) === normalizeField(addr2.country)
  );
}

interface UpdateAddressData {
  label?: string;
  type?: AddressType;
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
  async getUserAddresses(userId: string, type?: AddressType) {
    return prisma.address.findMany({
      where: { 
        userId,
        ...(type && { type }),
      },
      orderBy: [
        { type: 'asc' },
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
   * Get default address for a user by type
   */
  async getDefaultAddress(userId: string, type: AddressType = 'SHIPPING') {
    return prisma.address.findFirst({
      where: { userId, isDefault: true, type },
    });
  },

  /**
   * Create a new address
   */
  async create(data: CreateAddressData) {
    const addressType = data.type || 'SHIPPING';
    const country = data.country || 'PL';
    
    // Get all existing addresses of this type for the user
    const existingAddresses = await prisma.address.findMany({
      where: {
        userId: data.userId,
        type: addressType,
      },
    });

    // Check if identical address already exists (with normalization)
    const existingAddress = existingAddresses.find(addr => 
      areAddressesEqual(
        { firstName: data.firstName, lastName: data.lastName, street: data.street, city: data.city, postalCode: data.postalCode, country },
        { firstName: addr.firstName, lastName: addr.lastName, street: addr.street, city: addr.city, postalCode: addr.postalCode, country: addr.country }
      )
    );

    // If identical address exists, return it instead of creating duplicate
    if (existingAddress) {
      // Update phone if provided and different
      const updateData: { isDefault?: boolean; label?: string; phone?: string } = {};
      
      if (data.isDefault && !existingAddress.isDefault) {
        await prisma.address.updateMany({
          where: { userId: data.userId, type: addressType, isDefault: true },
          data: { isDefault: false },
        });
        updateData.isDefault = true;
      }
      
      if (data.label && data.label !== existingAddress.label) {
        updateData.label = data.label;
      }
      
      if (data.phone && data.phone !== existingAddress.phone) {
        updateData.phone = data.phone;
      }
      
      if (Object.keys(updateData).length > 0) {
        return prisma.address.update({
          where: { id: existingAddress.id },
          data: updateData,
        });
      }
      
      return existingAddress;
    }

    // If this is the first address of this type or marked as default, handle default logic
    if (data.isDefault) {
      // Remove default from other addresses of same type
      await prisma.address.updateMany({
        where: { userId: data.userId, type: addressType, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Use already fetched addresses count to determine if this is the first
    const addressCount = existingAddresses.length;

    return prisma.address.create({
      data: {
        userId: data.userId,
        label: data.label,
        type: addressType,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        street: data.street.trim(),
        city: data.city.trim(),
        postalCode: data.postalCode.trim(),
        country: country,
        phone: data.phone?.trim(),
        // First address of this type is always default
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

    const addressType = data.type || address.type;

    // If setting as default, remove default from other addresses of same type
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId, type: addressType, isDefault: true, id: { not: id } },
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

    // If deleted address was default, set another of same type as default
    if (address.isDefault) {
      const firstAddress = await prisma.address.findFirst({
        where: { userId, type: address.type },
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

    // Remove default from all other addresses of same type
    await prisma.address.updateMany({
      where: { userId, type: address.type, isDefault: true },
      data: { isDefault: false },
    });

    // Set this address as default
    return prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });
  },
};
