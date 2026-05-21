import { z } from 'zod';

export const nameSchema = z.string().min(2, 'Name must be at least 2 characters');
export const emailSchema = z.string().email('Invalid email address');
export const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number');
export const otpSchema = z.string().length(6, 'OTP must be exactly 6 digits');
