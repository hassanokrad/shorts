import { z } from 'zod';

export const AuthRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1)
});

export const AuthLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const AuthRefreshSchema = z.object({
  refreshToken: z.string().min(1)
});

export const AuthTokensSchema = z.object({
  userId: z.string(),
  accessToken: z.string(),
  refreshToken: z.string()
});

export const AuthRefreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string()
});

export const AuthLogoutRequestSchema = z.object({ refreshToken: z.string().min(1).optional() });
export const AuthLogoutResponseSchema = z.object({ success: z.boolean() });
export const AuthMeResponseSchema = z.object({ userId: z.string(), email: z.string().email(), role: z.string() });

export type AuthRegisterDto = z.infer<typeof AuthRegisterSchema>;
export type AuthLoginDto = z.infer<typeof AuthLoginSchema>;
export type AuthRefreshDto = z.infer<typeof AuthRefreshSchema>;
export type AuthTokensDto = z.infer<typeof AuthTokensSchema>;
export type AuthRefreshResponseDto = z.infer<typeof AuthRefreshResponseSchema>;
export type AuthLogoutRequestDto = z.infer<typeof AuthLogoutRequestSchema>;
export type AuthLogoutResponseDto = z.infer<typeof AuthLogoutResponseSchema>;
export type AuthMeResponseDto = z.infer<typeof AuthMeResponseSchema>;
