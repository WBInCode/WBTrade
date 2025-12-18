import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';

export const dashboardController = {
  /**
   * GET /api/admin/dashboard
   * Pobiera wszystkie dane dashboardu naraz
   */
  async getSummary(req: Request, res: Response) {
    try {
      const summary = await dashboardService.getDashboardSummary();
      res.json(summary);
    } catch (error) {
      console.error('Dashboard summary error:', error);
      res.status(500).json({ message: 'Blad pobierania danych dashboardu' });
    }
  },

  /**
   * GET /api/admin/dashboard/kpis
   * Pobiera KPI cards
   */
  async getKPIs(req: Request, res: Response) {
    try {
      const kpis = await dashboardService.getKPIs();
      res.json(kpis);
    } catch (error) {
      console.error('Dashboard KPIs error:', error);
      res.status(500).json({ message: 'Blad pobierania KPI' });
    }
  },

  /**
   * GET /api/admin/dashboard/sales-chart
   * Pobiera dane do wykresu sprzedazy
   */
  async getSalesChart(req: Request, res: Response) {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const salesChart = await dashboardService.getSalesChart(days);
      res.json(salesChart);
    } catch (error) {
      console.error('Dashboard sales chart error:', error);
      res.status(500).json({ message: 'Blad pobierania danych wykresu' });
    }
  },

  /**
   * GET /api/admin/dashboard/recent-orders
   * Pobiera ostatnie zamowienia
   */
  async getRecentOrders(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const orders = await dashboardService.getRecentOrders(limit);
      res.json(orders);
    } catch (error) {
      console.error('Dashboard recent orders error:', error);
      res.status(500).json({ message: 'Blad pobierania zamowien' });
    }
  },

  /**
   * GET /api/admin/dashboard/low-stock
   * Pobiera produkty z niskim stanem
   */
  async getLowStock(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const threshold = parseInt(req.query.threshold as string) || 10;
      const products = await dashboardService.getLowStockProducts(limit, threshold);
      res.json(products);
    } catch (error) {
      console.error('Dashboard low stock error:', error);
      res.status(500).json({ message: 'Blad pobierania produktow' });
    }
  },

  /**
   * GET /api/admin/dashboard/alerts
   * Pobiera alerty
   */
  async getAlerts(req: Request, res: Response) {
    try {
      const alerts = await dashboardService.getAlerts();
      res.json(alerts);
    } catch (error) {
      console.error('Dashboard alerts error:', error);
      res.status(500).json({ message: 'Blad pobierania alertow' });
    }
  }
};
