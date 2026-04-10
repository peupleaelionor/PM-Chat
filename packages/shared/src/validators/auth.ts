import { z } from 'zod';

export const RegisterSchema = z.object({
  nickname: z
    .string()
    .min(2, 'Le pseudo doit contenir au moins 2 caractères')
    .max(32, 'Le pseudo ne doit pas dépasser 32 caractères')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Le pseudo ne peut contenir que des lettres, des chiffres, des tirets bas et des tirets'),
  publicKey: z.string().min(1, 'La clé publique est requise'),
  deviceFingerprint: z.string().optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Le token de rafraîchissement est requis'),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
