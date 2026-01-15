'use client';

import { useState, useEffect, use } from 'react';
import { 
  ArrowLeft, Package, Truck, CreditCard, MapPin, User, Calendar,
  Clock, FileText, Printer, CheckCircle, XCircle, AlertCircle,
  ChevronRight, Edit2, Save, X
} from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface OrderItem {
  id: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface StatusHistory {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
  createdBy: string | null;
}

interface Address {
  id: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
}

interface PackageShippingData {
  packageId: string;
  method: string;
  price: number;
  paczkomatCode?: string;
  paczkomatAddress?: string;
  useCustomAddress?: boolean;
  customAddress?: {
    firstName: string;
    lastName: string;
    phone: string;
    street: string;
    apartment?: string;
    postalCode: string;
    city: string;
  };
  items?: {
    productId: string;
    productName: string;
    variantId: string;
    variantName: string;
    quantity: number;
    image?: string;
  }[];
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  shippingMethod: string;
  paymentMethod: string;
  paymentStatus: string;
  trackingNumber?: string;
  customerNotes?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
  paczkomatCode?: string;
  paczkomatAddress?: string;
  packageShipping?: PackageShippingData[];
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  shippingAddress?: Address;
  billingAddress?: Address;
  items: OrderItem[];
  statusHistory: StatusHistory[];
}

const statusColors: Record<string, string> = {
  OPEN: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  CONFIRMED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PROCESSING: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  SHIPPED: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  DELIVERED: 'bg-green-500/20 text-green-400 border-green-500/30',
  CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
  REFUNDED: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const statusLabels: Record<string, string> = {
  OPEN: 'Otwarte',
  PENDING: 'Oczekujące',
  CONFIRMED: 'Opłacone',
  PROCESSING: 'W realizacji',
  SHIPPED: 'Wysłane',
  DELIVERED: 'Dostarczone',
  CANCELLED: 'Anulowane',
  REFUNDED: 'Zwrócone',
};

const statusFlow = ['OPEN', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const paymentMethods: Record<string, string> = {
  CARD: 'Karta płatnicza',
  BLIK: 'BLIK',
  TRANSFER: 'Przelew bankowy',
  CASH: 'Gotówka przy odbiorze',
};

const shippingMethods: Record<string, string> = {
  INPOST: 'InPost Paczkomat',
  COURIER: 'Kurier DPD',
  PICKUP: 'Odbiór osobisty',
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOrder();
  }, [id]);

  async function loadOrder() {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/orders/${id}`);
      if (!response.ok) throw new Error('Order not found');
      const data = await response.json();
      setOrder(data);
      setNewStatus(data.status);
    } catch (error) {
      console.error('Failed to load order:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(price);

  const formatDate = (dateStr: string) => 
    new Date(dateStr).toLocaleDateString('pl-PL', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  const handleStatusChange = async () => {
    if (!order || newStatus === order.status) return;
    
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, note: statusNote }),
      });
      
      if (response.ok) {
        await loadOrder();
        setShowStatusModal(false);
        setStatusNote('');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!confirm('Czy na pewno chcesz anulować to zamówienie? Ta operacja zwolni zarezerwowany towar.')) return;
    
    try {
      await fetch(`${API_URL}/orders/${id}`, {
        method: 'DELETE',
      });
      await loadOrder();
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }
  };

  const handleRefundOrder = async () => {
    const reason = prompt('Podaj powód zwrotu (opcjonalnie):');
    if (reason === null) return; // User cancelled
    
    try {
      const response = await fetch(`${API_URL}/orders/${id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Zwrot na życzenie klienta' }),
      });
      
      if (response.ok) {
        await loadOrder();
      } else {
        const error = await response.json();
        alert(error.message || 'Błąd podczas przetwarzania zwrotu');
      }
    } catch (error) {
      console.error('Failed to refund order:', error);
    }
  };

  const handleRestoreOrder = async () => {
    if (!confirm('Czy na pewno chcesz przywrócić to zamówienie? Towar zostanie ponownie zarezerwowany.')) return;
    
    try {
      const response = await fetch(`${API_URL}/orders/${id}/restore`, {
        method: 'POST',
      });
      
      if (response.ok) {
        await loadOrder();
      } else {
        const error = await response.json();
        alert(error.message || 'Błąd podczas przywracania zamówienia');
      }
    } catch (error) {
      console.error('Failed to restore order:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'CANCELLED':
      case 'REFUNDED':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-blue-400" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-slate-700 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-slate-700 rounded-xl animate-pulse"></div>
            <div className="h-48 bg-slate-700 rounded-xl animate-pulse"></div>
          </div>
          <div className="space-y-6">
            <div className="h-48 bg-slate-700 rounded-xl animate-pulse"></div>
            <div className="h-64 bg-slate-700 rounded-xl animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
        <h2 className="text-xl font-bold text-white mb-2">Zamówienie nie znalezione</h2>
        <p className="text-gray-400 mb-4">Zamówienie o podanym ID nie istnieje</p>
        <Link href="/orders" className="text-orange-400 hover:text-orange-300">
          Wróć do listy zamówień
        </Link>
      </div>
    );
  }

  const currentStatusIndex = statusFlow.indexOf(order.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/orders" 
            className="p-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{order.orderNumber}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[order.status]}`}>
                {statusLabels[order.status] || order.status}
              </span>
            </div>
            <p className="text-gray-400 text-sm">
              Utworzono: {formatDate(order.createdAt)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link
            href={`/orders/${id}/label`}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-700 transition-colors"
          >
            <Truck className="w-4 h-4" />
            Etykieta
          </Link>
          <Link
            href={`/orders/${id}/invoice`}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-300 hover:bg-slate-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Faktura
          </Link>
          <button
            onClick={() => setShowStatusModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 rounded-lg text-white hover:bg-orange-600 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Zmień status
          </button>
        </div>
      </div>

      {/* Status Progress */}
      {order.status !== 'CANCELLED' && order.status !== 'REFUNDED' && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <div className="flex items-center justify-between">
            {statusFlow.map((status, index) => (
              <div key={status} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    index <= currentStatusIndex 
                      ? 'bg-orange-500 border-orange-500 text-white' 
                      : 'bg-slate-700 border-slate-600 text-gray-500'
                  }`}>
                    {index < currentStatusIndex ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span className={`mt-2 text-xs font-medium ${
                    index <= currentStatusIndex ? 'text-orange-400' : 'text-gray-500'
                  }`}>
                    {statusLabels[status]}
                  </span>
                </div>
                {index < statusFlow.length - 1 && (
                  <div className={`w-20 h-1 mx-2 rounded ${
                    index < currentStatusIndex ? 'bg-orange-500' : 'bg-slate-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Products */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700/50">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-400" />
                Produkty ({order.items.length})
              </h2>
            </div>
            <div className="divide-y divide-slate-700/50">
              {order.items.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-700 rounded-lg flex items-center justify-center">
                    <Package className="w-8 h-8 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">{item.productName}</p>
                    <p className="text-sm text-gray-400">{item.variantName}</p>
                    <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400">{item.quantity} × {formatPrice(item.unitPrice)}</p>
                    <p className="font-medium text-white">{formatPrice(item.total)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 bg-slate-800/50 space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>Suma częściowa</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Dostawa</span>
                <span>{formatPrice(order.shipping)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>VAT (23%)</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Rabat</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-slate-700">
                <span>Razem</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Status History */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700/50">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-400" />
                Historia statusów
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {order.statusHistory.map((history, index) => (
                  <div key={history.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      {getStatusIcon(history.status)}
                      {index < order.statusHistory.length - 1 && (
                        <div className="w-0.5 h-full bg-slate-700 my-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[history.status]}`}>
                          {statusLabels[history.status] || history.status}
                        </span>
                        <span className="text-gray-500 text-sm">{formatDate(history.createdAt)}</span>
                      </div>
                      {history.note && (
                        <p className="text-gray-400 text-sm mt-1">{history.note}</p>
                      )}
                      {history.createdBy && (
                        <p className="text-gray-500 text-xs mt-1">Przez: {history.createdBy}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          {(order.customerNotes || order.internalNotes) && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
              <h2 className="font-semibold text-white mb-4">Uwagi</h2>
              {order.customerNotes && (
                <div className="mb-4">
                  <p className="text-sm text-gray-400 mb-1">Uwagi klienta:</p>
                  <p className="text-white bg-slate-700/50 p-3 rounded-lg">{order.customerNotes}</p>
                </div>
              )}
              {order.internalNotes && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Uwagi wewnętrzne:</p>
                  <p className="text-white bg-slate-700/50 p-3 rounded-lg">{order.internalNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-orange-400" />
              Klient
            </h2>
            {order.user ? (
              <div className="space-y-3">
                <p className="text-white font-medium">
                  {order.user.firstName} {order.user.lastName}
                </p>
                <p className="text-gray-400 text-sm">{order.user.email}</p>
                {order.user.phone && (
                  <p className="text-gray-400 text-sm">{order.user.phone}</p>
                )}
                <Link 
                  href={`/users/${order.user.id}`}
                  className="inline-flex items-center gap-1 text-orange-400 text-sm hover:text-orange-300"
                >
                  Zobacz profil <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <p className="text-gray-400">Zamówienie jako gość</p>
            )}
          </div>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-400" />
                Adres dostawy
              </h2>
              <div className="text-gray-300 space-y-1">
                <p>{order.shippingAddress.street}</p>
                <p>{order.shippingAddress.postalCode} {order.shippingAddress.city}</p>
                <p>{order.shippingAddress.country}</p>
                {order.shippingAddress.phone && (
                  <p className="text-gray-400 text-sm pt-2">Tel: {order.shippingAddress.phone}</p>
                )}
              </div>
            </div>
          )}

          {/* Shipping Method */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-orange-400" />
              Dostawa
            </h2>
            
            {/* Per-package shipping info */}
            {order.packageShipping && order.packageShipping.length > 0 ? (
              <div className="space-y-4">
                {order.packageShipping.map((pkg, index) => (
                  <div key={pkg.packageId} className="p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-orange-400">
                        Paczka {index + 1}
                      </span>
                      <span className="text-sm text-gray-400">
                        {pkg.price.toFixed(2)} zł
                      </span>
                    </div>
                    <p className="text-white text-sm mb-1">
                      {shippingMethods[pkg.method] || pkg.method}
                    </p>
                    {pkg.paczkomatCode && (
                      <p className="text-xs text-gray-400 mb-2">
                        Paczkomat: {pkg.paczkomatCode}
                        {pkg.paczkomatAddress && ` - ${pkg.paczkomatAddress}`}
                      </p>
                    )}
                    
                    {/* Items in package */}
                    {pkg.items && pkg.items.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-600/50">
                        <p className="text-xs text-gray-500 mb-1">Produkty:</p>
                        <ul className="text-xs text-gray-400 space-y-1">
                          {pkg.items.map((item, itemIndex) => (
                            <li key={itemIndex}>
                              {item.productName} {item.variantName !== 'Default' && `(${item.variantName})`} × {item.quantity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Custom address for package */}
                    {pkg.useCustomAddress && pkg.customAddress && (
                      <div className="mt-2 pt-2 border-t border-slate-600/50">
                        <p className="text-xs text-gray-500 mb-1">Inny adres dostawy:</p>
                        <div className="text-xs text-gray-300">
                          <p>{pkg.customAddress.firstName} {pkg.customAddress.lastName}</p>
                          <p>{pkg.customAddress.street}{pkg.customAddress.apartment && ` ${pkg.customAddress.apartment}`}</p>
                          <p>{pkg.customAddress.postalCode} {pkg.customAddress.city}</p>
                          {pkg.customAddress.phone && <p>Tel: {pkg.customAddress.phone}</p>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <>
                <p className="text-white">
                  {shippingMethods[order.shippingMethod] || order.shippingMethod}
                </p>
                {order.paczkomatCode && (
                  <p className="text-sm text-gray-400 mt-1">
                    Paczkomat: {order.paczkomatCode}
                    {order.paczkomatAddress && ` - ${order.paczkomatAddress}`}
                  </p>
                )}
              </>
            )}
            
            {order.trackingNumber && (
              <div className="mt-3 p-3 bg-slate-700/50 rounded-lg">
                <p className="text-sm text-gray-400">Numer przesyłki:</p>
                <p className="text-white font-mono">{order.trackingNumber}</p>
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-400" />
              Płatność
            </h2>
            <p className="text-white">
              {paymentMethods[order.paymentMethod] || order.paymentMethod}
            </p>
            <div className="mt-3">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                order.paymentStatus === 'PAID' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {order.paymentStatus === 'PAID' ? 'Opłacone' : 'Oczekuje na płatność'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
            <h2 className="font-semibold text-white mb-4">Akcje</h2>
            <div className="space-y-2">
              {order.status === 'CANCELLED' || order.status === 'REFUNDED' ? (
                <button 
                  onClick={handleRestoreOrder}
                  className="w-full px-4 py-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors"
                >
                  Przywróć zamówienie
                </button>
              ) : (
                <>
                  {(order.status === 'DELIVERED' || order.status === 'SHIPPED') && (
                    <button 
                      onClick={handleRefundOrder}
                      className="w-full px-4 py-2 bg-yellow-500/10 text-yellow-400 rounded-lg hover:bg-yellow-500/20 transition-colors"
                    >
                      Przetwórz zwrot
                    </button>
                  )}
                  <button 
                    onClick={handleCancelOrder}
                    className="w-full px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    Anuluj zamówienie
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Zmień status zamówienia</h3>
              <button 
                onClick={() => setShowStatusModal(false)}
                className="p-1 hover:bg-slate-700 rounded"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Nowy status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Notatka (opcjonalnie)</label>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="Dodaj komentarz do zmiany statusu..."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleStatusChange}
                disabled={saving || newStatus === order.status}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 rounded-lg text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Zapisywanie...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Zapisz
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
