// This file exports shared TypeScript types used across the project.

export type Product = {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl: string;
    stock: number;
    rating: number;
    reviewsCount: number;
};

export type User = {
    id: string;
    name: string;
    email: string;
    password: string;
    address: string;
    phoneNumber: string;
};

export type Order = {
    id: string;
    userId: string;
    productIds: string[];
    totalAmount: number;
    orderDate: string;
    status: 'pending' | 'shipped' | 'delivered' | 'canceled';
};

export type CartItem = {
    productId: string;
    quantity: number;
};