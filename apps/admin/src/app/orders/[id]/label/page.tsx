'use client';

import { useState, useEffect, use, useRef } from 'react';
import { ArrowLeft, Printer, Download, Package, Truck, QrCode } from 'lucide-react';
import Link from 'next/link';
import { getAuthToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface Order {
  id: string;
  orderNumber: string;
  shippingMethod: string;
  trackingNumber?: string;
  user?: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  shippingAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  items: {
    productName: string;
    quantity: number;
  }[];
}

const shippingMethods: Record<string, { name: string; logo: string }> = {
  INPOST: { name: 'InPost Paczkomat', logo: '/inpost.png' },
  COURIER: { name: 'Kurier DPD', logo: '/dpd.png' },
  PICKUP: { name: 'Odbiór osobisty', logo: '' },
};

export default function ShippingLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadOrder();
  }, [id]);

  async function loadOrder() {
    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await fetch(`${API_URL}/orders/${id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) throw new Error('Order not found');
      const data = await response.json();
      setOrder(data);
    } catch (error) {
      console.error('Failed to load order:', error);
    } finally {
      setLoading(false);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const generateTrackingNumber = () => {
    return `WB${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-slate-700 rounded animate-pulse"></div>
        <div className="h-[600px] bg-slate-700 rounded-xl animate-pulse"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <Package className="w-16 h-16 mx-auto mb-4 text-red-400" />
        <h2 className="text-xl font-bold text-white mb-2">Zamówienie nie znalezione</h2>
        <Link href="/orders" className="text-orange-400 hover:text-orange-300">
          Wróć do listy zamówień
        </Link>
      </div>
    );
  }

  const trackingNumber = order.trackingNumber || generateTrackingNumber();
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Header - hide on print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link 
            href={`/orders/${id}`} 
            className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Etykieta kurierska</h1>
            <p className="text-gray-400">Zamówienie {order.orderNumber}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 rounded-lg text-white hover:bg-orange-600 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Drukuj
          </button>
        </div>
      </div>

      {/* Label Preview */}
      <div className="flex justify-center print:block">
        <div 
          ref={labelRef}
          className="bg-white text-black p-8 rounded-xl shadow-2xl w-full max-w-[400px] print:max-w-none print:rounded-none print:shadow-none"
          style={{ aspectRatio: '1/1.4' }}
        >
          {/* Header */}
          <div className="border-b-2 border-black pb-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-8 h-8" />
                <div>
                  <p className="font-bold text-xl">WBTrade</p>
                  <p className="text-xs text-gray-600">
                    {shippingMethods[order.shippingMethod]?.name || order.shippingMethod}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Data</p>
                <p className="font-medium">{new Date().toLocaleDateString('pl-PL')}</p>
              </div>
            </div>
          </div>

          {/* Tracking Number */}
          <div className="bg-gray-100 p-4 rounded-lg mb-4 text-center">
            <p className="text-xs text-gray-500 mb-1">NUMER PRZESYŁKI</p>
            <p className="font-mono text-2xl font-bold tracking-wider">{trackingNumber}</p>
          </div>

          {/* QR Code placeholder */}
          <div className="flex justify-center mb-4">
            <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-400">
              <QrCode className="w-20 h-20 text-gray-400" />
            </div>
          </div>

          {/* Recipient */}
          <div className="border-2 border-black p-4 rounded-lg mb-4">
            <p className="text-xs text-gray-500 font-bold mb-2">ODBIORCA</p>
            {order.shippingAddress ? (
              <div className="space-y-1">
                <p className="font-bold text-lg">
                  {order.user?.firstName} {order.user?.lastName}
                </p>
                <p>{order.shippingAddress.street}</p>
                <p className="font-bold">
                  {order.shippingAddress.postalCode} {order.shippingAddress.city}
                </p>
                {(order.shippingAddress.phone || order.user?.phone) && (
                  <p className="text-sm text-gray-600">
                    Tel: {order.shippingAddress.phone || order.user?.phone}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Brak adresu dostawy</p>
            )}
          </div>

          {/* Sender */}
          <div className="border border-gray-300 p-3 rounded-lg mb-4">
            <p className="text-xs text-gray-500 font-bold mb-1">NADAWCA</p>
            <p className="font-medium">WBTrade Sp. z o.o.</p>
            <p className="text-sm">ul. Magazynowa 1</p>
            <p className="text-sm">00-001 Warszawa</p>
          </div>

          {/* Order Info */}
          <div className="flex justify-between text-sm border-t border-gray-200 pt-3">
            <div>
              <p className="text-gray-500">Zamówienie</p>
              <p className="font-bold">{order.orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500">Ilość szt.</p>
              <p className="font-bold">{totalItems}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions - hide on print */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 print:hidden">
        <h3 className="font-semibold text-white mb-4">Instrukcje</h3>
        <ul className="space-y-2 text-gray-400 text-sm">
          <li>• Wydrukuj etykietę na papierze A6 (105x148mm) lub A5</li>
          <li>• Naklej etykietę na widocznym miejscu paczki</li>
          <li>• Upewnij się, że kod QR i numer przesyłki są czytelne</li>
          <li>• Zamów odbiór kuriera lub nadaj paczkę w punkcie</li>
        </ul>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #__next {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
