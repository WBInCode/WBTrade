/**
 * Responso API Integration
 * Handles contact messages and ticket management
 * Documentation: https://docs.responso.pl
 */

import axios, { AxiosInstance } from 'axios';

interface ResponsoConfig {
  apiKey: string;
  projectId: string;
  contactEmail: string;
  enabled: boolean;
}

interface ContactMessage {
  name: string;
  email: string;
  subject: string;
  message: string;
  category?: string;
  phone?: string;
  orderId?: string;
  productId?: string;
  metadata?: Record<string, any>;
}

interface ResponsoTicket {
  id: string;
  status: string;
  subject: string;
  createdAt: string;
}

class ResponsoService {
  private client: AxiosInstance | null = null;
  private config: ResponsoConfig;

  constructor() {
    this.config = {
      apiKey: process.env.RESPONSO_API_KEY || '',
      projectId: process.env.RESPONSO_PROJECT_ID || '',
      contactEmail: process.env.RESPONSO_CONTACT_EMAIL || 'kontakt@wbtrade.pl',
      enabled: process.env.RESPONSO_ENABLED === 'true',
    };

    if (this.config.enabled && this.config.apiKey) {
      this.client = axios.create({
        baseURL: 'https://api.responso.pl/v1',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      console.log('✓ Responso service initialized');
    } else {
      console.log('⚠ Responso service disabled or not configured');
    }
  }

  /**
   * Check if Responso is enabled and configured
   */
  isEnabled(): boolean {
    return this.config.enabled && !!this.client;
  }

  /**
   * Send a contact message to Responso
   */
  async sendContactMessage(message: ContactMessage): Promise<ResponsoTicket | null> {
    if (!this.isEnabled()) {
      console.warn('[Responso] Service not enabled - message not sent');
      return null;
    }

    try {
      const payload = {
        project_id: this.config.projectId,
        contact: {
          email: message.email,
          name: message.name,
          phone: message.phone,
        },
        ticket: {
          subject: message.subject,
          message: this.formatMessage(message),
          category: message.category || 'general',
          priority: this.determinePriority(message),
          custom_fields: {
            order_id: message.orderId,
            product_id: message.productId,
            source: 'website',
            ...message.metadata,
          },
        },
      };

      const response = await this.client!.post('/tickets', payload);

      console.log('[Responso] Ticket created:', response.data.id);

      return {
        id: response.data.id,
        status: response.data.status,
        subject: response.data.subject,
        createdAt: response.data.created_at,
      };
    } catch (error: any) {
      console.error('[Responso] Error creating ticket:', error.message);
      if (error.response) {
        console.error('[Responso] Response:', error.response.data);
      }
      throw new Error('Failed to send message to Responso');
    }
  }

  /**
   * Send product inquiry
   */
  async sendProductInquiry(data: {
    name: string;
    email: string;
    phone?: string;
    productId: string;
    productName: string;
    message: string;
  }): Promise<ResponsoTicket | null> {
    return this.sendContactMessage({
      name: data.name,
      email: data.email,
      phone: data.phone,
      subject: `Zapytanie o produkt: ${data.productName}`,
      message: data.message,
      category: process.env.RESPONSO_CATEGORY_PRODUCT || 'product-inquiry',
      productId: data.productId,
      metadata: {
        product_name: data.productName,
        inquiry_type: 'product',
      },
    });
  }

  /**
   * Send order help request
   */
  async sendOrderHelp(data: {
    name: string;
    email: string;
    phone?: string;
    orderId: string;
    message: string;
    issueType: string;
  }): Promise<ResponsoTicket | null> {
    return this.sendContactMessage({
      name: data.name,
      email: data.email,
      phone: data.phone,
      subject: `Pomoc z zamówieniem #${data.orderId}`,
      message: data.message,
      category: process.env.RESPONSO_CATEGORY_ORDER || 'order-help',
      orderId: data.orderId,
      metadata: {
        issue_type: data.issueType,
        inquiry_type: 'order',
      },
    });
  }

  /**
   * Send general contact message
   */
  async sendGeneralContact(data: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }): Promise<ResponsoTicket | null> {
    return this.sendContactMessage({
      name: data.name,
      email: data.email,
      phone: data.phone,
      subject: data.subject,
      message: data.message,
      category: process.env.RESPONSO_CATEGORY_GENERAL || 'general',
      metadata: {
        inquiry_type: 'general',
      },
    });
  }

  /**
   * Send technical support request
   */
  async sendSupportRequest(data: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    browserInfo?: string;
    pageUrl?: string;
  }): Promise<ResponsoTicket | null> {
    return this.sendContactMessage({
      name: data.name,
      email: data.email,
      phone: data.phone,
      subject: `Wsparcie techniczne: ${data.subject}`,
      message: data.message,
      category: process.env.RESPONSO_CATEGORY_SUPPORT || 'technical-support',
      metadata: {
        inquiry_type: 'support',
        browser_info: data.browserInfo,
        page_url: data.pageUrl,
      },
    });
  }

  /**
   * Format message with additional context
   */
  private formatMessage(message: ContactMessage): string {
    let formatted = message.message;

    if (message.orderId) {
      formatted = `Zamówienie: #${message.orderId}\n\n${formatted}`;
    }

    if (message.productId) {
      formatted = `ID produktu: ${message.productId}\n\n${formatted}`;
    }

    if (message.phone) {
      formatted += `\n\n---\nTelefon kontaktowy: ${message.phone}`;
    }

    return formatted;
  }

  /**
   * Determine ticket priority based on message content
   */
  private determinePriority(message: ContactMessage): 'low' | 'normal' | 'high' | 'urgent' {
    const urgentKeywords = ['pilne', 'natychmiast', 'błąd płatności', 'nie otrzymałem'];
    const highKeywords = ['problem', 'błąd', 'nie działa', 'zwrot'];
    
    const messageText = `${message.subject} ${message.message}`.toLowerCase();

    if (urgentKeywords.some(keyword => messageText.includes(keyword))) {
      return 'urgent';
    }

    if (highKeywords.some(keyword => messageText.includes(keyword))) {
      return 'high';
    }

    if (message.orderId) {
      return 'normal';
    }

    return 'low';
  }

  /**
   * Get ticket status
   */
  async getTicketStatus(ticketId: string): Promise<any> {
    if (!this.isEnabled()) {
      throw new Error('Responso service not enabled');
    }

    try {
      const response = await this.client!.get(`/tickets/${ticketId}`);
      return response.data;
    } catch (error: any) {
      console.error('[Responso] Error fetching ticket:', error.message);
      throw new Error('Failed to fetch ticket status');
    }
  }

  /**
   * List user tickets
   */
  async listUserTickets(email: string, limit: number = 10): Promise<any[]> {
    if (!this.isEnabled()) {
      throw new Error('Responso service not enabled');
    }

    try {
      const response = await this.client!.get('/tickets', {
        params: {
          project_id: this.config.projectId,
          contact_email: email,
          limit,
        },
      });
      return response.data.tickets || [];
    } catch (error: any) {
      console.error('[Responso] Error listing tickets:', error.message);
      throw new Error('Failed to list tickets');
    }
  }
}

// Export singleton instance
export const responsoService = new ResponsoService();

// Export types
export type { ContactMessage, ResponsoTicket };
