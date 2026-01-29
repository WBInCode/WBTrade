import { Request, Response } from 'express';
import { reportsService } from '../services/reports.service';

type DateRange = 'week' | 'month' | 'quarter' | 'year';

function getDateRange(req: Request): DateRange {
  const range = req.query.range as string;
  if (['week', 'month', 'quarter', 'year'].includes(range)) {
    return range as DateRange;
  }
  return 'month';
}

export const reportsController = {
  /**
   * GET /api/reports/sales
   * Raport sprzeda≈ºy
   */
  async getSalesReport(req: Request, res: Response): Promise<void> {
    try {
      const range = getDateRange(req);
      const report = await reportsService.getSalesReport(range);
      res.json(report);
    } catch (error) {
      console.error('Error getting sales report:', error);
      res.status(500).json({ message: 'Nie udalo sie pobrac raportu sprzedazy', error });
    }
  },

  /**
   * GET /api/reports/products
   * Raport produkt√≥w
   */
  async getProductsReport(req: Request, res: Response): Promise<void> {
    try {
      const range = getDateRange(req);
      const report = await reportsService.getProductsReport(range);
      res.json(report);
    } catch (error) {
      console.error('Error getting products report:', error);
      res.status(500).json({ message: 'Nie udalo sie pobrac raportu produktÛw', error });
    }
  },

  /**
   * GET /api/reports/customers
   * Raport klient√≥w
   */
  async getCustomersReport(req: Request, res: Response): Promise<void> {
    try {
      const range = getDateRange(req);
      const report = await reportsService.getCustomersReport(range);
      res.json(report);
    } catch (error) {
      console.error('Error getting customers report:', error);
      res.status(500).json({ message: 'Nie udalo sie pobrac raportu klientÛw', error });
    }
  }
};
