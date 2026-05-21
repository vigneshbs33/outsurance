import { z } from 'zod';
import { nameSchema, emailSchema } from './shared.validators';
import {
  BuyOccupation,
  BuyEducation,
  BuyNationality,
  BuyMedicalHistory,
  BuyPlanOption,
  BuyPayFor,
  BuyPaymentMode,
} from '../../enums/buy.enum';

export const buyDetailsSchema = z.object({
  username: nameSchema,
  email: emailSchema,
  income: z.number().positive('Annual Income must be a positive number'),
  occupation: z.nativeEnum(BuyOccupation),
  education: z.nativeEnum(BuyEducation),
  lifeCover: z.string().min(1, 'Life Cover is required'),
  CoverFor: z.string().min(1, 'Cover for is required'),
  payFor: z.nativeEnum(BuyPayFor),
  paymentMode: z.nativeEnum(BuyPaymentMode),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
  city: z.string().min(2, 'City must be at least 2 characters'),
  nationality: z.nativeEnum(BuyNationality),
  medicalhistory: z.nativeEnum(BuyMedicalHistory),
  planOptions: z.nativeEnum(BuyPlanOption),
});

export type BuyDetailsInput = z.infer<typeof buyDetailsSchema>;
