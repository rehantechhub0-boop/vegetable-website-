import { z } from 'zod';

export const createOrderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2, { message: 'Customer name must be at least 2 characters long' }),
    phone: z.string().trim().min(7, { message: 'Valid phone number is required' }),
  }),
  delivery: z.object({
    zoneId: z.string().trim().min(1, { message: 'Delivery zone ID is required' }),
    address: z.string().trim().min(5, { message: 'Complete delivery address is required' }),
    notes: z.string().trim().max(500).optional().nullable(),
  }),
  paymentMethod: z.enum(['COD', 'ADVANCE_ONLINE', 'CARD'], {
    errorMap: () => ({ message: 'Invalid payment method. Supported methods: COD, ADVANCE_ONLINE, CARD' }),
  }),
  items: z.array(
    z.object({
      vegetableId: z.string().trim().min(1, { message: 'vegetableId is required' }),
      weightInKg: z.number().positive({ message: 'weightInKg must be a positive number' }),
      weightDisplay: z.string().trim().optional(),
      quantity: z.number().int({ message: 'quantity must be an integer' }).min(1, { message: 'quantity must be at least 1' }),
    })
  ).min(1, { message: 'Cart must contain at least one item' }),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
