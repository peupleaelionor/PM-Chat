import { z } from 'zod';

export const CreateLinkShareSchema = z.object({
  conversationId: z.string().min(1, 'Identifiant de conversation requis'),
  expiresInMinutes: z
    .number()
    .int()
    .positive()
    .max(1440, 'Maximum 24 heures')
    .default(60),
  maxViews: z.number().int().positive().max(100).default(1),
  pin: z
    .string()
    .min(4, 'Le PIN doit contenir au moins 4 caractères')
    .max(32)
    .optional(),
  oneTimeView: z.boolean().default(true),
  ipWhitelist: z.array(z.string().ip()).max(10).default([]),
});

export type CreateLinkShareInput = z.infer<typeof CreateLinkShareSchema>;

export const AccessLinkShareSchema = z.object({
  token: z.string().min(1, 'Jeton requis'),
  pin: z.string().optional(),
});

export type AccessLinkShareInput = z.infer<typeof AccessLinkShareSchema>;

export const VerifyPremiumSchema = z.object({
  featureId: z.string().min(1, 'Identifiant de fonctionnalité requis'),
});

export type VerifyPremiumInput = z.infer<typeof VerifyPremiumSchema>;
