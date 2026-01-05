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
   * Raport sprzedaży
   */
  async getSalesReport(req: Request, res: Response): Promise<void> {
    try {
      const range = getDateRange(req);
      const report = await reportsService.getSalesReport(range);
      res.json(report);
    } catch (error) {
      console.error('Error getting sales report:', error);
      res.status(500).json({ message: 'Failed to get sales report', error });
    }
  },

  /**
   * GET /api/reports/products
   * Raport produktów
   */
  async getProductsReport(req: Request, res: Response): Promise<void> {
    try {
      const range = getDateRange(req);
      const report = await reportsService.getProductsReport(range);
      res.json(report);
    } catch (error) {
      console.error('Error getting products report:', error);
      res.status(500).json({ message: 'Failed to get products report', error });
    }
  },

  /**
   * GET /api/reports/customers
   * Raport klientów
   */
  async getCustomersReport(req: Request, res: Response): Promise<void> {
    try {
      const range = getDateRange(req);
      const report = await reportsService.getCustomersReport(range);
      res.json(report);
    } catch (error) {
      console.error('Error getting customers report:', error);
      res.status(500).json({ message: 'Failed to get customers report', error });
    }
  }
};
