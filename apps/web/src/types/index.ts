// This file exports TypeScript types used throughout the web application.

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl: string;
    rating: number;
    stock: number;
}

export interface CartItem {
    productId: string;
    quantity: number;
}

export interface User {
    id: string;
    name: string;
    email: string;
    password: string;
}

export interface Order {
    id: string;
    userId: string;
    items: CartItem[];
    totalAmount: number;
    orderDate: string;
    status: 'pending' | 'shipped' | 'delivered' | 'canceled';
}