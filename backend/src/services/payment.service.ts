/**
 * Generic Payment Gateway Abstraction
 * 
 * Supports:
 * - Cash on Delivery (COD)
 * - Advance / Online Payment
 * - Debit/Credit Card
 * 
 * Never stores:
 * - CVV
 * - Card PIN
 * - OTP
 * - Full card number
 */

export type SupportedPaymentMethod = 'COD' | 'ADVANCE_ONLINE' | 'CARD';
export type PaymentTransactionStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'COD';

export interface PaymentIntentRequest {
  orderId: string;
  orderNumber: number;
  amount: number;
  currency: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  paymentMethod: SupportedPaymentMethod;
}

export interface PaymentIntentResponse {
  success: boolean;
  transactionRef: string;
  redirectUrl?: string;       // If gateway uses hosted checkout
  clientSecret?: string;      // If gateway uses client SDK
  status: PaymentTransactionStatus;
  message?: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  orderId?: string;
  transactionRef?: string;
  status?: PaymentTransactionStatus;
  rawPayload?: any;
}

export interface IPaymentGateway {
  name: string;
  createPaymentIntent(req: PaymentIntentRequest): Promise<PaymentIntentResponse>;
  verifyWebhook(headers: Record<string, string>, rawBody: string | Buffer): Promise<WebhookVerificationResult>;
}

/**
 * Standard Cash on Delivery Handler
 */
export class CashOnDeliveryGateway implements IPaymentGateway {
  name = 'Cash on Delivery';

  async createPaymentIntent(req: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    return {
      success: true,
      transactionRef: `COD-${req.orderNumber}-${Date.now().toString().slice(-6)}`,
      status: 'COD',
      message: 'Cash on Delivery order registered',
    };
  }

  async verifyWebhook(): Promise<WebhookVerificationResult> {
    return { isValid: false };
  }
}

/**
 * Generic Card / Advance Gateway Adapter Skeleton
 * Allows connecting PayFast, Safepay, JazzCash, Stripe or local bank API seamlessly
 */
export class GenericOnlinePaymentGateway implements IPaymentGateway {
  name: string;
  private apiKey: string;
  private merchantId: string;

  constructor(name: string = 'Generic Gateway', apiKey: string = '', merchantId: string = '') {
    this.name = name;
    this.apiKey = apiKey;
    this.merchantId = merchantId;
  }

  async createPaymentIntent(req: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    const txnRef = `TXN-${req.orderNumber}-${Date.now().toString().slice(-6)}`;
    return {
      success: true,
      transactionRef: txnRef,
      status: 'PENDING',
      redirectUrl: `/payment/gateway-mock?txn=${txnRef}&order=${req.orderNumber}&amount=${req.amount}`,
      message: 'Payment intent initialized securely',
    };
  }

  async verifyWebhook(headers: Record<string, string>, rawBody: string | Buffer): Promise<WebhookVerificationResult> {
    // Cryptographic signature check skeleton
    return {
      isValid: true,
      status: 'PAID',
    };
  }
}
