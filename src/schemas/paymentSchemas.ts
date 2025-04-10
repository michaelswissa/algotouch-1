
import { z } from "zod";

export const tokenDataSchema = z.object({
  token: z.string().min(5),
  cardLast4: z.string().length(4),
  expMonth: z.number().min(1).max(12),
  expYear: z.number().min(2024),
});

export const subscriptionPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().int().min(0),
  interval: z.enum(["monthly", "yearly"]),
  description: z.string().optional(),
  features: z.array(z.string()).optional(),
  trialDays: z.number().int().min(0).optional(),
});

export const paymentSessionSchema = z.object({
  userId: z.string(),
  planId: z.string(),
  tokenData: tokenDataSchema,
  amount: z.number().min(0),
  status: z.enum(["pending", "approved", "failed"]),
  createdAt: z.string(),
});

export const cardcomChargeResponseSchema = z.object({
  IsApproved: z.union([z.literal("1"), z.literal("0")]),
  ReturnValue: z.number(),
  Message: z.string(),
  TokenApprovalNumber: z.string().optional(),
});

export const userSubscriptionSchema = z.object({
  user_id: z.string(),
  plan_id: z.string(),
  status: z.enum(["active", "suspended", "cancelled"]),
  renewed_at: z.string(),
  created_at: z.string(),
  fail_count: z.number().optional(),
  last_attempt_at: z.string().optional(),
});

// Type definitions based on schemas
export type TokenDataType = z.infer<typeof tokenDataSchema>;
export type SubscriptionPlanType = z.infer<typeof subscriptionPlanSchema>;
export type PaymentSessionType = z.infer<typeof paymentSessionSchema>;
export type CardcomChargeResponseType = z.infer<typeof cardcomChargeResponseSchema>;
export type UserSubscriptionType = z.infer<typeof userSubscriptionSchema>;
