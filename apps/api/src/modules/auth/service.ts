import {
  AuthLoginResponseSchema,
  AuthLogoutResponseSchema,
  AuthMeResponseSchema,
  AuthRefreshResponseSchema,
  AuthRegisterResponseSchema,
  type AuthLoginRequestDto,
  type AuthLogoutRequestDto,
  type AuthMeResponseDto,
  type AuthRefreshRequestDto,
  type AuthRegisterRequestDto
} from '@shorts/shared-types';

export const authService = {
  register: (_payload: AuthRegisterRequestDto) => AuthRegisterResponseSchema.parse({
    userId: 'stub-user-id',
    accessToken: 'stub-access-token',
    refreshToken: 'stub-refresh-token'
  }),
  login: (_payload: AuthLoginRequestDto) => AuthLoginResponseSchema.parse({
    userId: 'stub-user-id',
    accessToken: 'stub-access-token',
    refreshToken: 'stub-refresh-token'
  }),
  refresh: (_payload: AuthRefreshRequestDto) => AuthRefreshResponseSchema.parse({
    accessToken: 'stub-access-token',
    refreshToken: 'stub-refresh-token'
  }),
  logout: (_payload: AuthLogoutRequestDto) => AuthLogoutResponseSchema.parse({ success: true }),
  me: (): AuthMeResponseDto => AuthMeResponseSchema.parse({
    userId: 'stub-user-id',
    email: 'stub@example.com',
    role: 'user'
  })
};
