'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Package,
  ShoppingCart,
  Users,
  LogOut,
  ChevronDown,
  Box,
} from 'lucide-react';
import { useState } from 'react';

const menuItems = [
  {
    title: 'Produkty',
    href: '/products',
    icon: Package,
    submenu: [
      { title: 'Lista produktów', href: '/products' },
      { title: 'Kategorie', href: '/categories' },
    ],
  },
  {
    title: 'Zamówienia',
    href: '/orders',
    icon: ShoppingCart,
    submenu: [
      { title: 'Wszystkie', href: '/orders' },
      { title: 'Otwarte', href: '/orders?status=OPEN' },
      { title: 'Opłacone', href: '/orders?status=CONFIRMED' },
      { title: 'W realizacji', href: '/orders?status=PROCESSING' },
      { title: 'Wysłane', href: '/orders?status=SHIPPED' },
    ],
  },
  {
    title: 'Użytkownicy',
    href: '/users',
    icon: Users,
  },
  {
    title: 'Integracje',
    href: '/integrations',
    icon: Box,
    submenu: [
      { title: 'Baselinker', href: '/baselinker' },
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
          <Image 
            src="/images/logo.png" 
            alt="WB Trade Group" 
            width={120} 
            height={40} 
            className="h-8 w-auto object-contain"
          />
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
