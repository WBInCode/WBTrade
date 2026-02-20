import { PrismaClient, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

interface DashboardKPIs {
  ordersToday: number;
  ordersTodayChange: number;
  revenueToday: number;
  revenueTodayChange: number;
  newCustomersToday: number;
  newCustomersTodayChange: number;
  pendingOrders: number;
  lowStockProducts: number;
}

interface SalesChartData {
  date: string;
  revenue: number;
  orders: number;
  cancelledRevenue: number;
  cancelledOrders: number;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: OrderStatus;
  itemsCount: number;
  createdAt: Date;
}

interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  minStock: number;
  stockPercentage: number;
  image: string | null;
}

interface DashboardAlert {
  id: string;
  type: 'order' | 'stock' | 'payment' | 'return';
  severity: 'info' | 'warning' | 'error';
  title: string;
  description: string;
  link?: string;
  createdAt: Date;
}

export class DashboardService {
  /**
   * Pobiera KPI dla dashboardu
   */
  async getKPIs(): Promise<DashboardKPIs> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Zamówienia dziś (bez anulowanych/zwróconych)
    const ordersToday = await prisma.order.count({
      where: {
        createdAt: { gte: today },
        status: { notIn: ['CANCELLED', 'REFUNDED'] }
      }
    });

    // Zamówienia wczoraj (do porównania, bez anulowanych/zwróconych)
    const ordersYesterday = await prisma.order.count({
      where: {
        createdAt: {
          gte: yesterday,
          lt: today
        },
        status: { notIn: ['CANCELLED', 'REFUNDED'] }
      }
    });

    // Przychód dziś
    const revenueTodayResult = await prisma.order.aggregate({
      where: {
        createdAt: { gte: today },
        status: { notIn: ['CANCELLED', 'REFUNDED'] }
      },
      _sum: { total: true }
    });
    const revenueToday = revenueTodayResult._sum.total?.toNumber() || 0;

    // Przychód wczoraj
    const revenueYesterdayResult = await prisma.order.aggregate({
      where: {
        createdAt: {
          gte: yesterday,
          lt: today
        },
        status: { notIn: ['CANCELLED', 'REFUNDED'] }
      },
      _sum: { total: true }
    });
    const revenueYesterday = revenueYesterdayResult._sum.total?.toNumber() || 0;

    // Nowi klienci dziś
    const newCustomersToday = await prisma.user.count({
      where: {
        createdAt: { gte: today },
        role: 'CUSTOMER'
      }
    });

    // Nowi klienci wczoraj
    const newCustomersYesterday = await prisma.user.count({
      where: {
        createdAt: {
          gte: yesterday,
          lt: today
        },
        role: 'CUSTOMER'
      }
    });

    // Zamówienia oczekujące
    const pendingOrders = await prisma.order.count({
      where: {
        status: { in: ['PENDING', 'CONFIRMED', 'PROCESSING'] }
      }
    });

    // Produkty z niskim stanem (poniżej 10 sztuk)
    const lowStockProducts = await prisma.inventory.count({
      where: {
        quantity: { lt: 10 }
      }
    });

    // Oblicz zmiany procentowe
    const calcChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      ordersToday,
      ordersTodayChange: calcChange(ordersToday, ordersYesterday),
      revenueToday,
      revenueTodayChange: calcChange(revenueToday, revenueYesterday),
      newCustomersToday,
      newCustomersTodayChange: calcChange(newCustomersToday, newCustomersYesterday),
      pendingOrders,
      lowStockProducts
    };
  }

  /**
   * Pobiera dane do wykresu sprzedaży (ostatnie 30 dni)
   */
  async getSalesChart(days = 30): Promise<SalesChartData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Pobierz zamówienia z ostatnich X dni (bez anulowanych/zwróconych)
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { notIn: ['CANCELLED', 'REFUNDED'] }
      },
      select: {
        createdAt: true,
        total: true
      }
    });

    // Pobierz anulowane/zwrócone osobno
    const cancelledOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { in: ['CANCELLED', 'REFUNDED'] }
      },
      select: {
        createdAt: true,
        total: true
      }
    });

    // Grupuj po dniach
    const dailyData: Record<string, { revenue: number; orders: number; cancelledRevenue: number; cancelledOrders: number }> = {};

    // Inicjalizuj wszystkie dni
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = { revenue: 0, orders: 0, cancelledRevenue: 0, cancelledOrders: 0 };
    }

    // Wypełnij danymi (aktywne)
    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].revenue += order.total.toNumber();
        dailyData[dateKey].orders += 1;
      }
    }

    // Wypełnij danymi (anulowane)
    for (const order of cancelledOrders) {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].cancelledRevenue += order.total.toNumber();
        dailyData[dateKey].cancelledOrders += 1;
      }
    }

    // Konwertuj do tablicy
    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue * 100) / 100,
      orders: data.orders,
      cancelledRevenue: Math.round(data.cancelledRevenue * 100) / 100,
      cancelledOrders: data.cancelledOrders
    }));
  }

  /**
   * Pobiera ostatnie zamówienia
   */
  async getRecentOrders(limit = 10): Promise<RecentOrder[]> {
    const orders = await prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        items: true,
        shippingAddress: true
      }
    });

    return orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.user 
        ? `${order.user.firstName} ${order.user.lastName}`
        : order.shippingAddress ? `${order.shippingAddress.street}, ${order.shippingAddress.city}` : 'Gość',
      customerEmail: order.user?.email || 'brak',
      total: order.total.toNumber(),
      status: order.status,
      itemsCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      createdAt: order.createdAt
    }));
  }

  /**
   * Pobiera produkty z niskim stanem magazynowym
   */
  async getLowStockProducts(limit = 10, threshold = 10): Promise<LowStockProduct[]> {
    const inventory = await prisma.inventory.findMany({
      where: {
        quantity: { lt: threshold }
      },
      take: limit,
      orderBy: { quantity: 'asc' },
      include: {
        variant: {
          include: {
            product: {
              include: {
                images: {
                  take: 1,
                  orderBy: { order: 'asc' }
                }
              }
            }
          }
        }
      }
    });

    return inventory.map(inv => {
      const minStock = 10; // Domyślny próg
      const stockPercentage = Math.min(100, Math.round((inv.quantity / minStock) * 100));
      
      return {
        id: inv.variant.product.id,
        name: inv.variant.product.name,
        sku: inv.variant.sku,
        currentStock: inv.quantity,
        minStock,
        stockPercentage,
        image: inv.variant.product.images[0]?.url || null
      };
    });
  }

  /**
   * Pobiera alerty dla dashboardu
   */
  async getAlerts(): Promise<DashboardAlert[]> {
    const alerts: DashboardAlert[] = [];

    // Zamówienia do realizacji (oczekujące > 24h)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const oldPendingOrders = await prisma.order.count({
      where: {
        status: 'PENDING',
        createdAt: { lt: oneDayAgo }
      }
    });

    if (oldPendingOrders > 0) {
      alerts.push({
        id: 'pending-orders',
        type: 'order',
        severity: 'warning',
        title: `${oldPendingOrders} zamówień oczekuje > 24h`,
        description: 'Te zamówienia wymagają pilnej realizacji',
        link: '/orders?status=PENDING',
        createdAt: new Date()
      });
    }

    // Krytycznie niski stan (< 5 sztuk)
    const criticalStock = await prisma.inventory.count({
      where: {
        quantity: { lt: 5 }
      }
    });

    if (criticalStock > 0) {
      alerts.push({
        id: 'critical-stock',
        type: 'stock',
        severity: 'error',
        title: `${criticalStock} produktów z krytycznie niskim stanem`,
        description: 'Mniej niż 5 sztuk na magazynie',
        link: '/warehouse?lowStock=true',
        createdAt: new Date()
      });
    }

    // Produkty z niskim stanem (< 10 sztuk)
    const lowStock = await prisma.inventory.count({
      where: {
        quantity: { gte: 5, lt: 10 }
      }
    });

    if (lowStock > 0) {
      alerts.push({
        id: 'low-stock',
        type: 'stock',
        severity: 'warning',
        title: `${lowStock} produktów z niskim stanem`,
        description: 'Mniej niż 10 sztuk na magazynie',
        link: '/warehouse?lowStock=true',
        createdAt: new Date()
      });
    }

    // Zamówienia do wysłania (CONFIRMED lub PROCESSING)
    const ordersToShip = await prisma.order.count({
      where: {
        status: { in: ['CONFIRMED', 'PROCESSING'] }
      }
    });

    if (ordersToShip > 0) {
      alerts.push({
        id: 'orders-to-ship',
        type: 'order',
        severity: 'info',
        title: `${ordersToShip} zamówień do wysłania`,
        description: 'Potwierdzone zamówienia czekające na wysyłkę',
        link: '/orders?status=CONFIRMED,PROCESSING',
        createdAt: new Date()
      });
    }

    // Brak produktów (quantity = 0)
    const outOfStock = await prisma.inventory.count({
      where: {
        quantity: 0
      }
    });

    if (outOfStock > 0) {
      alerts.push({
        id: 'out-of-stock',
        type: 'stock',
        severity: 'error',
        title: `${outOfStock} produktów niedostępnych`,
        description: 'Produkty z zerowym stanem magazynowym',
        link: '/warehouse?outOfStock=true',
        createdAt: new Date()
      });
    }

    return alerts.sort((a, b) => {
      const severityOrder = { error: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Pobiera podsumowanie dla dashboardu (wszystkie dane naraz)
   */
  async getDashboardSummary() {
    const [kpis, salesChart, recentOrders, lowStockProducts, alerts] = await Promise.all([
      this.getKPIs(),
      this.getSalesChart(30),
      this.getRecentOrders(10),
      this.getLowStockProducts(10),
      this.getAlerts()
    ]);

    return {
      kpis,
      salesChart,
      recentOrders,
      lowStockProducts,
      alerts
    };
  }
}

export const dashboardService = new DashboardService();
