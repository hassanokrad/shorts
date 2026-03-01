import { UsersMeResponseSchema } from '@shorts/shared-types';

export const usersService = {
  me: () => UsersMeResponseSchema.parse({ userId: 'stub-user-id', email: 'stub@example.com', name: 'Stub User' })
};
