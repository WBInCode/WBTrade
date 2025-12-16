import { Request, Response } from 'express';
import { OrdersService } from '../services/orders.service';

const ordersService = new OrdersService();

/**
 * Create a new order
 */
export async function createOrder(req: Request, res: Response): Promise<void> {
  try {
    const orderData = req.body;
    const order = await ordersService.create(orderData);
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Error creating order', error });
  }
}

/**
 * Get order by ID
 */
export async function getOrder(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const order = await ordersService.getById(id);
    
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }
    
    res.status(200).json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Error fetching order', error });
  }
}

/**
 * Get user's orders
 */
export async function getUserOrders(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    const { page = '1', limit = '10' } = req.query;
    
    const result = await ordersService.getUserOrders(
      userId,
      parseInt(page as string, 10),
      parseInt(limit as string, 10)
    );
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Error fetching orders', error });
  }
}

/**
 * Update order status
 */
export async function updateOrder(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const order = await ordersService.updateStatus(id, updateData.status, updateData.note);
    
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }
    
    res.status(200).json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Error updating order', error });
  }
}

/**
 * Cancel order
 */
export async function deleteOrder(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const order = await ordersService.cancel(id);
    
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }
    
    res.status(200).json({ message: 'Order cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ message: 'Error cancelling order', error });
  }
}