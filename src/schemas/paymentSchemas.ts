
import { z } from "zod";

export const tokenDataSchema = z.object({
  token: z.string().min(5),
  lastFourDigits: z.string().length(4),
  expiryMonth: z.number().int().min(1).max(12),
  expiryYear: z.number().int().min(2023),
  cardholderName: z.string().optional(),
});

export const subscriptionPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().int().min(0),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  trialDays: z.number().int().min(0).optional(),
  billingCycle: z.enum(["monthly", "annual"]),
  currency: z.string().optional(),
});

export const paymentSessionSchema = z.object({
  sessionId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  planId: z.string().optional(),
  paymentDetails: z.any().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const cardcomChargeResponseSchema = z.object({
  IsApproved: z.union([z.literal("1"), z.literal("0")]),
  ReturnValue: z.number().optional(),
  Message: z.string().optional(),
  TokenApprovalNumber: z.string().optional(),
});

export const userSubscriptionSchema = z.object({
  user_id: z.string().uuid(),
  plan_id: z.string(),
  status: z.enum(["active", "suspended", "cancelled"]),
  renewed_at: z.string().datetime(),
  created_at: z.string().datetime(),
  fail_count: z.number().int().optional(),
  last_attempt_at: z.string().datetime().optional(),
});

export type TokenDataType = z.infer<typeof tokenDataSchema>;
export type SubscriptionPlanType = z.infer<typeof subscriptionPlanSchema>;
export type PaymentSessionType = z.infer<typeof paymentSessionSchema>;
export type CardcomChargeResponseType = z.infer<typeof cardcomChargeResponseSchema>;
export type UserSubscriptionType = z.infer<typeof userSubscriptionSchema>;
