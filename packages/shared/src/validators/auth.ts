import { z } from 'zod';

export const RegisterSchema = z.object({
  nickname: z
    .string()
    .min(2, 'Nickname must be at least 2 characters')
    .max(32, 'Nickname must be at most 32 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Nickname may only contain letters, numbers, underscores, and hyphens'),
  publicKey: z.string().min(1, 'Public key is required'),
  deviceFingerprint: z.string().optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
