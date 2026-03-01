import { Router } from 'express';

import {
  AuthLoginRequestSchema,
  AuthLogoutRequestSchema,
  AuthRefreshRequestSchema,
  AuthRegisterRequestSchema
} from '@shorts/shared-types';

import { requireAuth } from '../../middleware/auth';
import { validateBody } from '../../middleware/validation';
import * as controller from './controller';

export const authRouter = Router();

authRouter.post('/register', validateBody(AuthRegisterRequestSchema), controller.register);
authRouter.post('/login', validateBody(AuthLoginRequestSchema), controller.login);
authRouter.post('/refresh', validateBody(AuthRefreshRequestSchema), controller.refresh);
authRouter.post('/logout', validateBody(AuthLogoutRequestSchema), controller.logout);
authRouter.get('/me', requireAuth, controller.me);
