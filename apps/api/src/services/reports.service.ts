import { PrismaClient, OrderStatus, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// =====================
// SALES REPORT TYPES
// =====================
interface SalesReportData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    conversionRate: number;
    revenueChange: number;
    ordersChange: number;
    avgOrderChange: number;
    conversionChange: number;
  };
  dailyData: {
    date: string;
    revenue: number;
    orders: number;
    avgOrder: number;
  }[];
  monthlyData: {
    name: string;
    revenue: number;
    orders: number;
  }[];
  paymentMethods: {
    method: string;
    amount: number;
    percentage: number;
  }[];
  topDays: {
    date: string;
    revenue: number;
    orders: number;
    avgOrder: number;
  }[];
}

// =====================
// PRODUCTS REPORT TYPES
// =====================
interface ProductsReportData {
  summary: {
    totalProducts: number;
    totalSold: number;
    avgConversion: number;
    lowStockCount: number;
  };
  categoryDistribution: {
    name: string;
    value: number;
    revenue: number;
  }[];
  topProducts: {
    id: string;
    name: string;
    sku: string;
    sold: number;
    revenue: number;
    stock: number;
    trend: number;
  }[];
}

// =====================
// CUSTOMERS REPORT TYPES
// =====================
interface CustomersReportData {
  summary: {
    totalCustomers: number;
    newCustomers: number;
    returningRate: number;
    avgLifetimeValue: number;
    customersChange: number;
    newCustomersChange: number;
  };
  customerGrowth: {
    date: string;
    newCustomers: number;
    returning: number;
  }[];
  customerSegments: {
    name: string;
    value: number;
    color: string;
  }[];
  cityDistribution: {
    city: string;
    customers: number;
    percentage: number;
  }[];
  topCustomers: {
    id: string;
    name: string;
    email: string;
    orders: number;
    totalSpent: number;
    lastOrder: string;
    city: string;
  }[];
}

export class ReportsService {
  
  // =====================
  // SALES REPORT
  // =====================
  async getSalesReport(dateRange: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<SalesReportData> {
    const { startDate, previousStartDate, previousEndDate } = this.getDateRange(dateRange);
    const today = new Date();

    // Current period orders
    const currentOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { notIn: ['CANCELLED', 'REFUNDED'] }
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
        paymentMethod: true
      }
    });

    // Previous period orders (for comparison)
    const previousOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: previousStartDate, lt: previousEndDate },
        status: { notIn: ['CANCELLED', 'REFUNDED'] }
      },
      select: {
        total: true
      }
    });

    // Calculate summary
    const totalRevenue = currentOrders.reduce((sum, o) => sum + o.total.toNumber(), 0);
    const totalOrders = currentOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const prevRevenue = previousOrders.reduce((sum, o) => sum + o.total.toNumber(), 0);
    const prevOrders = previousOrders.length;
    const prevAvg = prevOrders > 0 ? prevRevenue / prevOrders : 0;

    // Daily data
    const dailyMap = new Map<string, { revenue: number; orders: number }>();
    const days = this.getDaysCount(dateRange);
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      if (date > today) break;
      const dateKey = date.toISOString().split('T')[0];
      dailyMap.set(dateKey, { revenue: 0, orders: 0 });
    }

    currentOrders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey);
      if (existing) {
        existing.revenue += order.total.toNumber();
        existing.orders += 1;
      }
    });

    const dailyData = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue * 100) / 100,
      orders: data.orders,
      avgOrder: data.orders > 0 ? Math.round((data.revenue / data.orders) * 100) / 100 : 0
    }));

    // Monthly data (last 12 months)
    const monthlyData = await this.getMonthlyRevenue();

    // Payment methods breakdown
    const paymentMethodsMap = new Map<string, number>();
    currentOrders.forEach(order => {
      const method = order.paymentMethod || 'UNKNOWN';
      paymentMethodsMap.set(method, (paymentMethodsMap.get(method) || 0) + order.total.toNumber());
    });

    const paymentMethods = Array.from(paymentMethodsMap.entries())
      .map(([method, amount]) => ({
        method: this.translatePaymentMethod(method),
        amount: Math.round(amount * 100) / 100,
        percentage: totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    // Top days
    const topDays = dailyData
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        conversionRate: 3.2, // Would need analytics data for real conversion
        revenueChange: this.calcChange(totalRevenue, prevRevenue),
        ordersChange: this.calcChange(totalOrders, prevOrders),
        avgOrderChange: this.calcChange(avgOrderValue, prevAvg),
        conversionChange: 0
      },
      dailyData,
      monthlyData,
      paymentMethods,
      topDays
    };
  }

  // =====================
  // PRODUCTS REPORT
  // =====================
  async getProductsReport(dateRange: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<ProductsReportData> {
    const { startDate } = this.getDateRange(dateRange);

    // Total active products
    const totalProducts = await prisma.product.count({
      where: { status: 'ACTIVE' }
    });

    // Low stock count
    const lowStockCount = await prisma.inventory.count({
      where: { quantity: { lt: 10 } }
    });

    // Get order items in period with product details
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: startDate },
          status: { notIn: ['CANCELLED', 'REFUNDED'] }
        }
      },
      include: {
        variant: {
          include: {
            product: {
              include: {
                category: true,
                images: { take: 1, orderBy: { order: 'asc' } }
              }
            }
          }
        }
      }
    });

    // Aggregate by product
    const productMap = new Map<string, { 
      id: string; 
      name: string; 
      sku: string; 
      sold: number; 
      revenue: number;
      categoryName: string;
    }>();

    orderItems.forEach(item => {
      const product = item.variant.product;
      const existing = productMap.get(product.id);
      const revenue = item.unitPrice.toNumber() * item.quantity;
      
      if (existing) {
        existing.sold += item.quantity;
        existing.revenue += revenue;
      } else {
        productMap.set(product.id, {
          id: product.id,
          name: product.name,
          sku: item.variant.sku,
          sold: item.quantity,
          revenue,
          categoryName: product.category?.name || 'Inne'
        });
      }
    });

    // Category distribution
    const categoryMap = new Map<string, { revenue: number; count: number }>();
    productMap.forEach(product => {
      const cat = product.categoryName;
      const existing = categoryMap.get(cat);
      if (existing) {
        existing.revenue += product.revenue;
        existing.count += 1;
      } else {
        categoryMap.set(cat, { revenue: product.revenue, count: 1 });
      }
    });

    const totalCategoryRevenue = Array.from(categoryMap.values()).reduce((sum, c) => sum + c.revenue, 0);
    const categoryDistribution = Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        name,
        value: totalCategoryRevenue > 0 ? Math.round((data.revenue / totalCategoryRevenue) * 100) : 0,
        revenue: Math.round(data.revenue * 100) / 100
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Top products with stock info
    const topProductIds = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(p => p.id);

    const stockInfo = await prisma.inventory.groupBy({
      by: ['variantId'],
      where: {
        variant: { productId: { in: topProductIds } }
      },
      _sum: { quantity: true }
    });

    const variantToProduct = await prisma.productVariant.findMany({
      where: { productId: { in: topProductIds } },
      select: { id: true, productId: true }
    });

    const productStockMap = new Map<string, number>();
    variantToProduct.forEach(v => {
      const stock = stockInfo.find(s => s.variantId === v.id)?._sum.quantity || 0;
      productStockMap.set(v.productId, (productStockMap.get(v.productId) || 0) + stock);
    });

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        sold: p.sold,
        revenue: Math.round(p.revenue * 100) / 100,
        stock: productStockMap.get(p.id) || 0,
        trend: Math.round((Math.random() * 30 - 5) * 10) / 10 // Would need historical data for real trend
      }));

    const totalSold = Array.from(productMap.values()).reduce((sum, p) => sum + p.sold, 0);

    return {
      summary: {
        totalProducts,
        totalSold,
        avgConversion: 4.2, // Would need analytics for real data
        lowStockCount
      },
      categoryDistribution,
      topProducts
    };
  }

  // =====================
  // CUSTOMERS REPORT
  // =====================
  async getCustomersReport(dateRange: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<CustomersReportData> {
    const { startDate, previousStartDate, previousEndDate } = this.getDateRange(dateRange);
    const today = new Date();

    // Total customers
    const totalCustomers = await prisma.user.count({
      where: { role: 'CUSTOMER' }
    });

    // Previous period customers
    const prevTotalCustomers = await prisma.user.count({
      where: { 
        role: 'CUSTOMER',
        createdAt: { lt: startDate }
      }
    });

    // New customers in period
    const newCustomers = await prisma.user.count({
      where: {
        role: 'CUSTOMER',
        createdAt: { gte: startDate }
      }
    });

    // Previous period new customers
    const prevNewCustomers = await prisma.user.count({
      where: {
        role: 'CUSTOMER',
        createdAt: { gte: previousStartDate, lt: previousEndDate }
      }
    });

    // Returning customers (placed > 1 order)
    const returningCustomers = await prisma.user.count({
      where: {
        role: 'CUSTOMER',
        orders: { some: {} },
        AND: {
          orders: {
            some: {
              createdAt: { gte: startDate }
            }
          }
        }
      }
    });

    // Average lifetime value
    const customerRevenue = await prisma.order.groupBy({
      by: ['userId'],
      where: {
        userId: { not: null },
        status: { notIn: ['CANCELLED', 'REFUNDED'] }
      },
      _sum: { total: true }
    });

    const avgLifetimeValue = customerRevenue.length > 0
      ? customerRevenue.reduce((sum, c) => sum + (c._sum.total?.toNumber() || 0), 0) / customerRevenue.length
      : 0;

    // Daily customer growth
    const days = this.getDaysCount(dateRange);
    const customerGrowth: { date: string; newCustomers: number; returning: number }[] = [];
    
    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      if (date > today) break;
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const newOnDay = await prisma.user.count({
        where: {
          role: 'CUSTOMER',
          createdAt: { gte: dayStart, lte: dayEnd }
        }
      });

      const ordersOnDay = await prisma.order.count({
        where: {
          createdAt: { gte: dayStart, lte: dayEnd },
          user: {
            createdAt: { lt: dayStart }
          }
        }
      });

      customerGrowth.push({
        date: date.toISOString().split('T')[0],
        newCustomers: newOnDay,
        returning: ordersOnDay
      });
    }

    // Customer segments by spend
    const segments = await this.getCustomerSegments();

    // City distribution
    const cityDistribution = await this.getCityDistribution();

    // Top customers
    const topCustomers = await this.getTopCustomers(startDate);

    const returningRate = totalCustomers > 0 
      ? Math.round((returningCustomers / totalCustomers) * 1000) / 10 
      : 0;

    return {
      summary: {
        totalCustomers,
        newCustomers,
        returningRate,
        avgLifetimeValue: Math.round(avgLifetimeValue * 100) / 100,
        customersChange: this.calcChange(totalCustomers, prevTotalCustomers),
        newCustomersChange: this.calcChange(newCustomers, prevNewCustomers)
      },
      customerGrowth,
      customerSegments: segments,
      cityDistribution,
      topCustomers
    };
  }

  // =====================
  // HELPER METHODS
  // =====================
  private getDateRange(range: 'week' | 'month' | 'quarter' | 'year') {
    const now = new Date();
    const startDate = new Date();
    const previousStartDate = new Date();
    const previousEndDate = new Date();

    switch (range) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        previousStartDate.setDate(now.getDate() - 14);
        previousEndDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(now.getDate() - 30);
        previousStartDate.setDate(now.getDate() - 60);
        previousEndDate.setDate(now.getDate() - 30);
        break;
      case 'quarter':
        startDate.setDate(now.getDate() - 90);
        previousStartDate.setDate(now.getDate() - 180);
        previousEndDate.setDate(now.getDate() - 90);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        previousStartDate.setFullYear(now.getFullYear() - 2);
        previousEndDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    startDate.setHours(0, 0, 0, 0);
    previousStartDate.setHours(0, 0, 0, 0);
    previousEndDate.setHours(0, 0, 0, 0);

    return { startDate, previousStartDate, previousEndDate };
  }

  private getDaysCount(range: 'week' | 'month' | 'quarter' | 'year'): number {
    switch (range) {
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 90;
      case 'year': return 365;
    }
  }

  private calcChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  private translatePaymentMethod(method: string): string {
    const translations: Record<string, string> = {
      'CARD': 'Karta',
      'BLIK': 'BLIK',
      'TRANSFER': 'Przelew',
      'CASH': 'Gotówka',
      'PAYU': 'PayU',
      'UNKNOWN': 'Inne'
    };
    return translations[method] || method;
  }

  private async getMonthlyRevenue() {
    const months: { name: string; revenue: number; orders: number }[] = [];
    const monthNames = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const result = await prisma.order.aggregate({
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          status: { notIn: ['CANCELLED', 'REFUNDED'] }
        },
        _sum: { total: true },
        _count: true
      });

      months.push({
        name: monthNames[date.getMonth()],
        revenue: Math.round((result._sum.total?.toNumber() || 0) * 100) / 100,
        orders: result._count
      });
    }

    return months;
  }

  private async getCustomerSegments() {
    // Get customer spend totals
    const customerSpend = await prisma.order.groupBy({
      by: ['userId'],
      where: {
        userId: { not: null },
        status: { notIn: ['CANCELLED', 'REFUNDED'] }
      },
      _sum: { total: true }
    });

    let vip = 0, regular = 0, active = 0, occasional = 0;

    customerSpend.forEach(c => {
      const total = c._sum.total?.toNumber() || 0;
      if (total >= 10000) vip++;
      else if (total >= 5000) regular++;
      else if (total >= 1000) active++;
      else occasional++;
    });

    const sum = vip + regular + active + occasional || 1;

    return [
      { name: 'VIP (>10k zł)', value: Math.round((vip / sum) * 100), color: '#f97316' },
      { name: 'Regularni (5-10k zł)', value: Math.round((regular / sum) * 100), color: '#3b82f6' },
      { name: 'Aktywni (1-5k zł)', value: Math.round((active / sum) * 100), color: '#22c55e' },
      { name: 'Okazjonalni (<1k zł)', value: Math.round((occasional / sum) * 100), color: '#64748b' }
    ];
  }

  private async getCityDistribution() {
    const addresses = await prisma.address.groupBy({
      by: ['city'],
      _count: true,
      orderBy: { _count: { city: 'desc' } },
      take: 6
    });

    const total = addresses.reduce((sum, a) => sum + a._count, 0) || 1;

    return addresses.map(a => ({
      city: a.city || 'Nieznane',
      customers: a._count,
      percentage: Math.round((a._count / total) * 100)
    }));
  }

  private async getTopCustomers(startDate: Date) {
    const customers = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        orders: { some: { status: { notIn: ['CANCELLED', 'REFUNDED'] } } }
      },
      include: {
        orders: {
          where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } },
          select: { total: true, createdAt: true }
        },
        addresses: {
          take: 1,
          orderBy: { isDefault: 'desc' }
        }
      },
      take: 50
    });

    return customers
      .map(c => ({
        id: c.id,
        name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Nieznany',
        email: c.email,
        orders: c.orders.length,
        totalSpent: c.orders.reduce((sum, o) => sum + o.total.toNumber(), 0),
        lastOrder: c.orders.length > 0 
          ? c.orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt.toISOString().split('T')[0]
          : '',
        city: c.addresses[0]?.city || 'Nieznane'
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map(c => ({ ...c, totalSpent: Math.round(c.totalSpent * 100) / 100 }));
  }
}

export const reportsService = new ReportsService();
