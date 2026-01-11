import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// Hasło komunikacji - ustaw w .env jako BASELINKER_XML_PASSWORD
const XML_PASSWORD = process.env.BASELINKER_XML_PASSWORD || 'wbtrade_bl_2024';

/**
 * BaseLinker XML Integration
 * 
 * Ten endpoint generuje plik XML w formacie wymaganym przez BaseLinker
 * dla integracji typu "Inny sklep" (plik wymiany danych)
 * 
 * URL do wpisania w BaseLinker: https://twoja-domena.pl/api/baselinker-xml
 */

// Middleware do weryfikacji hasła
function verifyPassword(req: Request, res: Response, next: Function) {
  const password = req.query.password || req.body.password;
  
  if (password !== XML_PASSWORD) {
    res.status(401).send('<?xml version="1.0" encoding="UTF-8"?><error>Unauthorized</error>');
    return;
  }
  next();
}

/**
 * GET /api/baselinker-xml
 * Główny endpoint - zwraca dane w zależności od akcji
 */
router.get('/', verifyPassword, async (req: Request, res: Response) => {
  const action = req.query.action as string;
  
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  
  try {
    switch (action) {
      case 'products':
        return res.send(await generateProductsXML());
      case 'orders':
        return res.send(await generateOrdersXML(req.query.from as string));
      case 'stock':
        return res.send(await generateStockXML());
      default:
        // Domyślnie zwróć info o sklepie
        return res.send(generateInfoXML());
    }
  } catch (error) {
    console.error('BaseLinker XML error:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Internal Server Error</error>');
  }
});

/**
 * POST /api/baselinker-xml
 * Endpoint do aktualizacji danych (stany magazynowe, statusy zamówień)
 */
router.post('/', verifyPassword, async (req: Request, res: Response) => {
  const action = req.body.action;
  
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  
  try {
    switch (action) {
      case 'update_stock':
        return res.send(await updateStock(req.body.products));
      case 'update_order_status':
        return res.send(await updateOrderStatus(req.body.order_id, req.body.status));
      default:
        return res.send('<?xml version="1.0" encoding="UTF-8"?><result>OK</result>');
    }
  } catch (error) {
    console.error('BaseLinker XML POST error:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Internal Server Error</error>');
  }
});

// =====================
// XML Generators
// =====================

function generateInfoXML(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<shop>
  <name>WBTrade</name>
  <version>1.0</version>
  <api_version>1.0</api_version>
  <supported_actions>
    <action>products</action>
    <action>orders</action>
    <action>stock</action>
    <action>update_stock</action>
    <action>update_order_status</action>
  </supported_actions>
</shop>`;
}

async function generateProductsXML(): Promise<string> {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: {
      category: true,
      variants: {
        include: {
          inventory: true,
        },
      },
      images: {
        orderBy: { order: 'asc' },
      },
    },
    take: 10000, // Limit
  });

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<products>`;

  for (const product of products) {
    for (const variant of product.variants) {
      const stock = variant.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      const mainImage = product.images[0]?.url || '';
      const specs = product.specifications as Record<string, unknown> || {};
      
      xml += `
  <product>
    <id>${variant.id}</id>
    <sku><![CDATA[${variant.sku}]]></sku>
    <ean>${variant.barcode || ''}</ean>
    <name><![CDATA[${product.name}${variant.name ? ' - ' + variant.name : ''}]]></name>
    <description><![CDATA[${product.description || ''}]]></description>
    <price>${variant.price.toNumber().toFixed(2)}</price>
    <price_wholesale>${variant.compareAtPrice?.toNumber().toFixed(2) || variant.price.toNumber().toFixed(2)}</price_wholesale>
    <tax_rate>23</tax_rate>
    <weight>${(specs.weight as number) || 0}</weight>
    <stock>${stock}</stock>
    <category><![CDATA[${product.category?.name || 'Inne'}]]></category>
    <manufacturer><![CDATA[${(specs.brand as string) || ''}]]></manufacturer>
    <image><![CDATA[${mainImage}]]></image>
    <images>${product.images.map(img => `<img><![CDATA[${img.url}]]></img>`).join('')}</images>
    <active>${product.status === 'ACTIVE' ? 1 : 0}</active>
  </product>`;
    }
  }

  xml += `
</products>`;

  return xml;
}

async function generateOrdersXML(fromDate?: string): Promise<string> {
  const where: any = {};
  
  if (fromDate) {
    where.createdAt = { gte: new Date(fromDate) };
  } else {
    // Domyślnie ostatnie 30 dni
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    where.createdAt = { gte: thirtyDaysAgo };
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: true,
      user: true,
      shippingAddress: true,
      billingAddress: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<orders>`;

  for (const order of orders) {
    const shipping = order.shippingAddress;
    const billing = order.billingAddress || shipping;
    
    xml += `
  <order>
    <order_id>${order.id}</order_id>
    <order_number><![CDATA[${order.orderNumber}]]></order_number>
    <date>${order.createdAt.toISOString()}</date>
    <status>${mapOrderStatus(order.status)}</status>
    <payment_status>${order.paymentStatus}</payment_status>
    <payment_method><![CDATA[${order.paymentMethod || ''}]]></payment_method>
    <shipping_method><![CDATA[${order.shippingMethod || ''}]]></shipping_method>
    <currency>PLN</currency>
    <total>${order.total.toNumber().toFixed(2)}</total>
    <subtotal>${order.subtotal.toNumber().toFixed(2)}</subtotal>
    <shipping_cost>${order.shipping.toNumber().toFixed(2)}</shipping_cost>
    <customer>
      <email><![CDATA[${order.user?.email || ''}]]></email>
      <phone><![CDATA[${shipping?.phone || ''}]]></phone>
      <name><![CDATA[${shipping?.firstName || ''} ${shipping?.lastName || ''}]]></name>
    </customer>
    <shipping_address>
      <name><![CDATA[${shipping?.firstName || ''} ${shipping?.lastName || ''}]]></name>
      <company><![CDATA[]]></company>
      <street><![CDATA[${shipping?.street || ''}]]></street>
      <city><![CDATA[${shipping?.city || ''}]]></city>
      <postcode><![CDATA[${shipping?.postalCode || ''}]]></postcode>
      <country><![CDATA[${shipping?.country || 'PL'}]]></country>
      <phone><![CDATA[${shipping?.phone || ''}]]></phone>
    </shipping_address>
    <billing_address>
      <name><![CDATA[${billing?.firstName || ''} ${billing?.lastName || ''}]]></name>
      <company><![CDATA[]]></company>
      <street><![CDATA[${billing?.street || ''}]]></street>
      <city><![CDATA[${billing?.city || ''}]]></city>
      <postcode><![CDATA[${billing?.postalCode || ''}]]></postcode>
      <country><![CDATA[${billing?.country || 'PL'}]]></country>
      <nip><![CDATA[]]></nip>
    </billing_address>
    <products>
      ${order.items.map(item => `
      <product>
        <id>${item.variantId}</id>
        <sku><![CDATA[${item.sku}]]></sku>
        <name><![CDATA[${item.productName}${item.variantName ? ' - ' + item.variantName : ''}]]></name>
        <quantity>${item.quantity}</quantity>
        <price>${item.unitPrice.toNumber().toFixed(2)}</price>
        <tax_rate>23</tax_rate>
      </product>`).join('')}
    </products>
    <notes><![CDATA[${order.customerNotes || ''}]]></notes>
  </order>`;
  }

  xml += `
</orders>`;

  return xml;
}

async function generateStockXML(): Promise<string> {
  const variants = await prisma.productVariant.findMany({
    where: {
      product: { status: 'ACTIVE' },
    },
    include: {
      inventory: true,
    },
    take: 50000,
  });

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<stocks>`;

  for (const variant of variants) {
    const stock = variant.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
    
    xml += `
  <product>
    <id>${variant.id}</id>
    <sku><![CDATA[${variant.sku}]]></sku>
    <ean>${variant.barcode || ''}</ean>
    <stock>${stock}</stock>
    <price>${variant.price.toNumber().toFixed(2)}</price>
  </product>`;
  }

  xml += `
</stocks>`;

  return xml;
}

// =====================
// Update Functions
// =====================

async function updateStock(products: Array<{ id: string; stock: number }>): Promise<string> {
  if (!products || !Array.isArray(products)) {
    return '<?xml version="1.0" encoding="UTF-8"?><result>ERROR</result>';
  }

  let updated = 0;
  
  for (const product of products) {
    try {
      // Znajdź domyślną lokalizację magazynową
      const defaultLocation = await prisma.location.findFirst({
        where: { type: 'WAREHOUSE' },
      });

      if (!defaultLocation) continue;

      // Aktualizuj lub utwórz rekord inventory
      await prisma.inventory.upsert({
        where: {
          variantId_locationId: {
            variantId: product.id,
            locationId: defaultLocation.id,
          },
        },
        update: { quantity: product.stock },
        create: {
          variantId: product.id,
          locationId: defaultLocation.id,
          quantity: product.stock,
        },
      });
      
      updated++;
    } catch (error) {
      console.error(`Error updating stock for ${product.id}:`, error);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<result>
  <status>OK</status>
  <updated>${updated}</updated>
</result>`;
}

async function updateOrderStatus(orderId: string, status: string): Promise<string> {
  if (!orderId || !status) {
    return '<?xml version="1.0" encoding="UTF-8"?><result>ERROR</result>';
  }

  try {
    const mappedStatus = mapBaseLinkerStatus(status);
    
    await prisma.order.update({
      where: { id: orderId },
      data: { status: mappedStatus },
    });

    // Dodaj wpis do historii
    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        status: mappedStatus,
        note: `Status zmieniony przez BaseLinker: ${status}`,
        createdBy: 'BaseLinker',
      },
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<result>
  <status>OK</status>
  <order_id>${orderId}</order_id>
  <new_status>${mappedStatus}</new_status>
</result>`;
  } catch (error) {
    console.error(`Error updating order status for ${orderId}:`, error);
    return '<?xml version="1.0" encoding="UTF-8"?><result>ERROR</result>';
  }
}

// =====================
// Helper Functions
// =====================

function mapOrderStatus(status: string): number {
  // Mapowanie statusów zamówień na kody BaseLinker
  const statusMap: Record<string, number> = {
    'PENDING': 1,
    'CONFIRMED': 2,
    'PROCESSING': 3,
    'SHIPPED': 4,
    'DELIVERED': 5,
    'CANCELLED': 6,
    'REFUNDED': 7,
  };
  return statusMap[status] || 0;
}

function mapBaseLinkerStatus(blStatus: string): any {
  // Mapowanie statusów BaseLinker na nasze statusy
  const statusMap: Record<string, string> = {
    '1': 'PENDING',
    '2': 'CONFIRMED',
    '3': 'PROCESSING',
    '4': 'SHIPPED',
    '5': 'DELIVERED',
    '6': 'CANCELLED',
    'new': 'PENDING',
    'confirmed': 'CONFIRMED',
    'processing': 'PROCESSING',
    'shipped': 'SHIPPED',
    'delivered': 'DELIVERED',
    'cancelled': 'CANCELLED',
  };
  return statusMap[blStatus] || 'PENDING';
}

export default router;
