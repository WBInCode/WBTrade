'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Warehouse,
  FolderTree,
  Settings,
  BarChart3,
  Truck,
  CreditCard,
  Bell,
  LogOut,
  ChevronDown,
  Box,
} from 'lucide-react';
import { useState } from 'react';

const menuItems = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Produkty',
    href: '/products',
    icon: Package,
    submenu: [
      { title: 'Lista produktów', href: '/products' },
      { title: 'Dodaj produkt', href: '/products/new' },
      { title: 'Kategorie', href: '/categories' },
    ],
  },
  {
    title: 'Zamówienia',
    href: '/orders',
    icon: ShoppingCart,
    submenu: [
      { title: 'Wszystkie', href: '/orders' },
      { title: 'Nowe', href: '/orders?status=new' },
      { title: 'W realizacji', href: '/orders?status=processing' },
      { title: 'Wysłane', href: '/orders?status=shipped' },
    ],
  },
  {
    title: 'Magazyn (WMS)',
    href: '/warehouse',
    icon: Warehouse,
    submenu: [
      { title: 'Stany magazynowe', href: '/warehouse' },
      { title: 'Przyjęcie (PZ)', href: '/warehouse/receive' },
      { title: 'Wydanie (WZ)', href: '/warehouse/ship' },
      { title: 'Przesunięcia', href: '/warehouse/transfer' },
      { title: 'Inwentaryzacja', href: '/warehouse/inventory-count' },
      { title: 'Historia ruchów', href: '/warehouse/movements' },
      { title: 'Lokalizacje', href: '/warehouse/locations' },
      { title: 'Alerty stanów', href: '/warehouse/alerts' },
    ],
  },
  {
    title: 'Użytkownicy',
    href: '/users',
    icon: Users,
  },
  {
    title: 'Raporty',
    href: '/reports',
    icon: BarChart3,
    submenu: [
      { title: 'Sprzedaż', href: '/reports/sales' },
      { title: 'Produkty', href: '/reports/products' },
      { title: 'Klienci', href: '/reports/customers' },
    ],
  },
  {
    title: 'Ustawienia',
    href: '/settings',
    icon: Settings,
    submenu: [
      { title: 'Dane firmy', href: '/settings/company' },
      { title: 'Dostawa', href: '/settings/shipping' },
      { title: 'Płatności', href: '/settings/payments' },
      { title: 'Podatki', href: '/settings/taxes' },
      { title: 'Integracje', href: '/settings/integrations' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<string[]>(['Produkty', 'Zamówienia']);

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-admin-sidebar border-r border-admin-border flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-admin-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
            <Box className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-white">WBTrade</span>
          <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">Admin</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.title}>
              {item.submenu ? (
                <div>
                  <button
                    onClick={() => toggleMenu(item.title)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? 'bg-slate-700/50 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      {item.title}
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        openMenus.includes(item.title) ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {openMenus.includes(item.title) && (
                    <ul className="mt-1 ml-8 space-y-1">
                      {item.submenu.map((sub) => (
                        <li key={sub.href}>
                          <Link
                            href={sub.href}
                            className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                              pathname === sub.href
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                            }`}
                          >
                            {sub.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-orange-500/20 text-orange-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.title}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-admin-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
            JK
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Jan Kowalski</p>
            <p className="text-xs text-slate-400">Administrator</p>
          </div>
          <button className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/30 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
