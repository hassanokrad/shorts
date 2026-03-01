import type { Request } from 'express';

export type AuthContext = {
  userId: string;
  role: 'user' | 'admin';
};

export type AuthedRequest = Request & {
  auth?: AuthContext;
};
