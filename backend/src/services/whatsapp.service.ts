/**
 * WhatsApp Notification Service Interface & Formatter
 * 
 * Generates structured, readable WhatsApp notifications for new vegetable orders:
 * 
 * NEW VEGETABLE ORDER
 * Order: #1024
 * Customer: Ali Ahmed
 * Phone: 03XXXXXXXXX
 * Items:
 * Tomatoes — 2kg — Rs.360
 * Potatoes — 5kg — Rs.600
 * Delivery: Muzaffargarh
 * Delivery Fee: Rs.100
 * Total: Rs.1,060
 * Payment: PAID (or COD / PENDING)
 * Status: NEW
 */

export interface OrderNotificationPayload {
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  deliveryArea: string;
  deliveryFee: number;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  items: Array<{
    name: string;
    weightDisplay: string;
    itemTotal: number;
  }>;
}

export function formatWhatsAppOrderMessage(order: OrderNotificationPayload): string {
  const itemLines = order.items
    .map((item) => `• ${item.name} — ${item.weightDisplay} — Rs.${item.itemTotal.toLocaleString()}`)
    .join('\n');

  return (
    `*NEW VEGETABLE ORDER*\n\n` +
    `*Order:* #${order.orderNumber}\n\n` +
    `*Customer:*\n${order.customerName}\n\n` +
    `*Phone:*\n${order.customerPhone}\n\n` +
    `*Items:*\n${itemLines}\n\n` +
    `*Delivery Area:*\n${order.deliveryArea}\n\n` +
    `*Delivery Fee:*\nRs.${order.deliveryFee.toLocaleString()}\n\n` +
    `*Total:*\nRs.${order.grandTotal.toLocaleString()}\n\n` +
    `*Payment:*\n${order.paymentMethod} (${order.paymentStatus})\n\n` +
    `*Status:*\n${order.orderStatus}`
  );
}

export interface IWhatsAppService {
  sendOrderNotification(businessPhone: string, order: OrderNotificationPayload): Promise<{ success: boolean; messageId?: string; error?: string }>;
  generateDirectWhatsAppLink(phone: string, order: OrderNotificationPayload): string;
}

export class WhatsAppService implements IWhatsAppService {
  async sendOrderNotification(businessPhone: string, order: OrderNotificationPayload) {
    const message = formatWhatsAppOrderMessage(order);
    // Configurable API hook (Meta Cloud API / Twilio)
    console.log(`[WhatsApp Dispatch to ${businessPhone}]:\n${message}`);
    return { success: true, messageId: `WA-${Date.now()}` };
  }

  generateDirectWhatsAppLink(phone: string, order: OrderNotificationPayload): string {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(formatWhatsAppOrderMessage(order));
    return `https://wa.me/${cleanPhone}?text=${message}`;
  }
}
