import { z } from 'zod';

export const createOrderSchema = z.object({
  idempotencyKey: z
    .string({ required_error: 'Idempotency key is required' })
    .trim()
    .min(8, { message: 'Idempotency key must be at least 8 characters long' })
    .max(128, { message: 'Idempotency key must not exceed 128 characters' }),
  customer: z.object({
    name: z.string().trim().min(2, { message: 'Customer name must be at least 2 characters long' }),
    phone: z.string().trim().min(7, { message: 'Valid phone number is required' }),
  }),
  delivery: z.object({
    zoneId: z.string().trim().min(1, { message: 'Delivery zone ID is required' }),
    address: z.string().trim().min(5, { message: 'Complete delivery address is required' }),
    notes: z.string().trim().max(500).optional().nullable(),
  }),
  paymentMethod: z.enum(['COD', 'ADVANCE_ONLINE', 'CARD', 'JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER'], {
    errorMap: () => ({ message: 'Invalid payment method. Supported methods: COD, CARD, JAZZCASH, EASYPAISA, BANK_TRANSFER' }),
  }),
  paymentTxnRef: z.string().trim().max(128).optional().nullable(),
  walletNumber: z.string().trim().max(30).optional().nullable(),
  promoCode: z.string().trim().max(50).optional().nullable(),
  discountAmount: z.number().min(0).optional().nullable(),
  cardDetails: z.object({
    cardholderName: z.string().trim().optional(),
    cardLast4: z.string().trim().optional(),
    cardBrand: z.string().trim().optional(),
  }).optional().nullable(),
  items: z.array(
    z.object({
      vegetableId: z.string().trim().min(1, { message: 'vegetableId is required' }),
      weightInKg: z.number().positive({ message: 'weightInKg must be a positive number' }),
      weightDisplay: z.string().trim().optional(),
      quantity: z.number().int({ message: 'quantity must be an integer' }).min(1, { message: 'quantity must be at least 1' }),
      expectedPricePerKg: z.number().positive({ message: 'expectedPricePerKg must be a positive number' }).optional().nullable(),
    })
  ).min(1, { message: 'Cart must contain at least one item' }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
