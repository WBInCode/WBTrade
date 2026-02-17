'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Header from '../../../../../components/Header';
import Footer from '../../../../../components/Footer';
import { useAuth } from '../../../../../contexts/AuthContext';
import { ordersApi, Order } from '../../../../../lib/api';

interface OrderItem {
  id: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

const paymentMethods: Record<string, string> = {
  card: 'Karta płatnicza',
  blik: 'BLIK',
  transfer: 'Przelew bankowy',
  cod: 'Gotówka przy odbiorze',
};

export default function CustomerInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && id) {
      loadOrder();
    }
  }, [id, isAuthenticated, authLoading, router]);

  async function loadOrder() {
    try {
      setLoading(true);
      const data = await ordersApi.getById(id);
      
      // Check if user requested invoice
      if (!data.wantInvoice) {
        setError('Faktura nie jest dostępna dla tego zamówienia');
        return;
      }
      
      // Check if order is paid
      if (data.paymentStatus !== 'PAID') {
        setError('Faktura będzie dostępna po opłaceniu zamówienia');
        return;
      }
      
      setOrder(data);
    } catch (err) {
      console.error('Failed to load order:', err);
      setError('Nie udało się załadować danych zamówienia');
    } finally {
      setLoading(false);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const formatPrice = (price: number | string | null | undefined) => {
    const num = Number(price) || 0;
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(num);
  };

  const formatDate = (dateStr: string) => 
    new Date(dateStr).toLocaleDateString('pl-PL', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric'
    });

  const generateInvoiceNumber = () => {
    const date = new Date(order?.createdAt || new Date());
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `FV/${year}/${month}/${order?.orderNumber?.replace('WB-', '') || '000'}`;
  };

  if (authLoading || loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 dark:bg-secondary-950 pt-6 pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="h-8 w-48 bg-gray-200 dark:bg-secondary-700 rounded mb-6"></div>
              <div className="h-[600px] bg-gray-200 dark:bg-secondary-700 rounded"></div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 dark:bg-secondary-950 pt-6 pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-16">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{error}</h2>
            <Link href={`/account/orders/${id}`} className="text-orange-500 hover:text-orange-600">
              Wróć do szczegółów zamówienia
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!order) {
    return null;
  }

  const invoiceNumber = generateInvoiceNumber();
  const invoiceDate = formatDate(order.createdAt);
  const dueDate = formatDate(new Date(new Date(order.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString());
  const billingAddress = order.billingAddress || order.shippingAddress;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-secondary-950 pt-6 pb-16 print:bg-white print:pt-0 print:pb-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header - hide on print */}
          <div className="flex items-center justify-between mb-6 print:hidden">
            <div className="flex items-center gap-4">
              <Link 
                href={`/account/orders/${id}`}
                className="p-2 bg-white dark:bg-secondary-800 border border-gray-200 dark:border-secondary-700 rounded-lg hover:bg-gray-50 dark:hover:bg-secondary-700 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Faktura VAT</h1>
                <p className="text-gray-500 dark:text-gray-400">Zamówienie {order.orderNumber}</p>
              </div>
            </div>
            
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 rounded-lg text-white hover:bg-orange-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Drukuj / PDF
            </button>
          </div>

          {/* Invoice */}
          <div className="bg-white text-black p-8 rounded-xl shadow-sm border border-gray-200 print:rounded-none print:shadow-none print:border-0 print:p-0">
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">FAKTURA VAT</h1>
                <p className="text-gray-500 text-lg">{invoiceNumber}</p>
              </div>
              <div className="text-right">
                <Image 
                  src="/images/WB-TRADE-logo.webp" 
                  alt="WB Trade" 
                  width={150}
                  height={48}
                  className="h-12 w-auto ml-auto mb-1"
                />
                <p className="text-gray-600 text-sm">Sp. z o.o.</p>
              </div>
            </div>

            {/* Dates & Info */}
            <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-gray-500">Data wystawienia</p>
                <p className="font-semibold">{invoiceDate}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-gray-500">Termin płatności</p>
                <p className="font-semibold">{dueDate}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-gray-500">Metoda płatności</p>
                <p className="font-semibold">{paymentMethods[order.paymentMethod] || order.paymentMethod}</p>
              </div>
            </div>

            {/* Parties */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* Seller */}
              <div>
                <p className="text-xs text-gray-500 font-bold mb-2 uppercase tracking-wider">Sprzedawca</p>
                <div className="border-l-4 border-orange-500 pl-4">
                  <p className="font-bold text-lg">WB PARTNERS Sp. z o.o.</p>
                  <p className="text-gray-600">ul. Juliusza Słowackiego 24/11</p>
                  <p className="text-gray-600">35-060 Rzeszów</p>
                  <p className="text-gray-600 mt-2">NIP: 5170455185</p>
                  <p className="text-gray-600">REGON: 540735769</p>
                  <p className="text-gray-600">KRS: 0001151642</p>
                </div>
              </div>
              
              {/* Buyer */}
              <div>
                <p className="text-xs text-gray-500 font-bold mb-2 uppercase tracking-wider">Nabywca</p>
                <div className="border-l-4 border-gray-300 pl-4">
                  {billingAddress && (
                    <>
                      <p className="font-bold text-lg">
                        {billingAddress.firstName} {billingAddress.lastName}
                      </p>
                      <p className="text-gray-600">{billingAddress.street}</p>
                      <p className="text-gray-600">
                        {billingAddress.postalCode} {billingAddress.city}
                      </p>
                      <p className="text-gray-600">{billingAddress.country}</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-8 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-800 text-white text-sm">
                    <th className="py-3 px-4 text-left rounded-tl">Lp.</th>
                    <th className="py-3 px-4 text-left">Nazwa produktu</th>
                    <th className="py-3 px-4 text-center">Ilość</th>
                    <th className="py-3 px-4 text-right">Cena netto</th>
                    <th className="py-3 px-4 text-center">VAT</th>
                    <th className="py-3 px-4 text-right">Wartość netto</th>
                    <th className="py-3 px-4 text-right rounded-tr">Wartość brutto</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {order.items.map((item, index) => {
                    const netPrice = (item.unitPrice || 0) / 1.23;
                    const netTotal = (item.total || 0) / 1.23;
                    
                    return (
                      <tr key={item.id} className="border-b border-gray-200">
                        <td className="py-3 px-4">{index + 1}</td>
                        <td className="py-3 px-4">
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-xs text-gray-500">{item.variantName} • SKU: {item.sku}</p>
                        </td>
                        <td className="py-3 px-4 text-center">{item.quantity}</td>
                        <td className="py-3 px-4 text-right">{formatPrice(netPrice)}</td>
                        <td className="py-3 px-4 text-center">23%</td>
                        <td className="py-3 px-4 text-right">{formatPrice(netTotal)}</td>
                        <td className="py-3 px-4 text-right font-medium">{formatPrice(item.total || 0)}</td>
                      </tr>
                    );
                  })}
                  
                  {/* Shipping row */}
                  {(order.shipping || 0) > 0 && (
                    <tr className="border-b border-gray-200">
                      <td className="py-3 px-4">{order.items.length + 1}</td>
                      <td className="py-3 px-4">
                        <p className="font-medium">Dostawa</p>
                      </td>
                      <td className="py-3 px-4 text-center">1</td>
                      <td className="py-3 px-4 text-right">{formatPrice((order.shipping || 0) / 1.23)}</td>
                      <td className="py-3 px-4 text-center">23%</td>
                      <td className="py-3 px-4 text-right">{formatPrice((order.shipping || 0) / 1.23)}</td>
                      <td className="py-3 px-4 text-right font-medium">{formatPrice(order.shipping || 0)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="flex justify-end mb-8">
              <div className="w-80">
                <div className="space-y-2 text-sm">
                  {(() => {
                    const subtotal = Number(order.subtotal) || 0;
                    const shipping = Number(order.shipping) || 0;
                    const discount = Number(order.discount) || 0;
                    const total = Number(order.total) || 0;
                    const grossTotal = subtotal + shipping;
                    const netTotal = grossTotal / 1.23;
                    const vatAmount = grossTotal - netTotal;
                    
                    return (
                      <>
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">Wartość netto</span>
                          <span className="font-medium">{formatPrice(netTotal)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-200">
                          <span className="text-gray-600">VAT (23%)</span>
                          <span className="font-medium">{formatPrice(vatAmount)}</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex justify-between py-2 border-b border-gray-200 text-green-600">
                            <span>Rabat</span>
                            <span className="font-medium">-{formatPrice(discount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between py-3 bg-gray-800 text-white rounded px-3 mt-2">
                          <span className="font-bold">DO ZAPŁATY</span>
                          <span className="font-bold text-lg">{formatPrice(total)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-gray-50 p-4 rounded mb-8">
              <p className="font-semibold text-gray-800 mb-2">Dane do przelewu:</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Nazwa banku</p>
                  <p className="font-medium">ING</p>
                </div>
                <div>
                  <p className="text-gray-500">Numer konta</p>
                  <p className="font-medium font-mono">19 1050 1445 1000 0090 8466 1967</p>
                </div>
                <div>
                  <p className="text-gray-500">Tytuł przelewu</p>
                  <p className="font-medium">{invoiceNumber}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 pt-4 text-xs text-gray-500">
              <div className="flex justify-between">
                <div>
                  <p>Dokument wygenerowany elektronicznie</p>
                  <p>Nie wymaga podpisu</p>
                </div>
                <div className="text-right">
                  <p>WBTrade Sp. z o.o.</p>
                  <p>www.wbtrade.pl | kontakt@wbtrade.pl</p>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions - hide on print */}
          <div className="mt-6 bg-gray-100 dark:bg-secondary-800 rounded-xl border border-gray-200 dark:border-secondary-700 p-6 print:hidden">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">💡 Jak zapisać jako PDF?</h3>
            <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li>Kliknij przycisk &quot;Drukuj / PDF&quot; powyżej</li>
              <li>W oknie drukowania wybierz &quot;Zapisz jako PDF&quot; jako drukarkę</li>
              <li><strong>Wyłącz &quot;Nagłówki i stopki&quot;</strong> w opcjach drukowania</li>
              <li>Kliknij &quot;Zapisz&quot; i wybierz lokalizację pliku</li>
            </ol>
          </div>
        </div>
      </main>
      <Footer />

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4;
            margin: 15mm 15mm 15mm 15mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, footer, nav {
            display: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          table {
            page-break-inside: avoid;
          }
          tr {
            page-break-inside: avoid;
          }
          .bg-white {
            page-break-inside: avoid;
          }
          .w-80 {
            page-break-inside: avoid;
          }
          .bg-gray-50 {
            page-break-inside: avoid;
          }
        }
      `}} />
    </>
  );
}
