// This file exports TypeScript types used throughout the API.

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl: string;
    stock: number;
}

export interface Order {
    id: string;
    userId: string;
    productIds: string[];
    totalAmount: number;
    orderDate: string;
    status: 'pending' | 'shipped' | 'delivered' | 'canceled';
}

export interface User {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    createdAt: string;
}

export interface SearchQuery {
    term: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
}