import { z } from 'zod';

export const paymentCardSchema = z.object({
  cardNumber: z.string().regex(/^\d{16}$/, 'Card number must be exactly 16 digits'),
  cardName: z.string().min(2, 'Name on card must be at least 2 characters'),
  expiryMonth: z.string().min(1, 'Month is required'),
  expiryYear: z.string().min(1, 'Year is required'),
  cvv: z.string().regex(/^\d{3}$/, 'CVV must be exactly 3 digits'),
});

export type PaymentCardInput = z.infer<typeof paymentCardSchema>;
