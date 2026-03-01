import type { RequestHandler } from 'express';

import type {
  AuthLoginRequestDto,
  AuthLogoutRequestDto,
  AuthRefreshRequestDto,
  AuthRegisterRequestDto
} from '@shorts/shared-types';

import { authService } from './service';

export const register: RequestHandler = (req, res) => {
  const payload = req.body as AuthRegisterRequestDto;
  res.status(201).json(authService.register(payload));
};

export const login: RequestHandler = (req, res) => {
  const payload = req.body as AuthLoginRequestDto;
  res.json(authService.login(payload));
};

export const refresh: RequestHandler = (req, res) => {
  const payload = req.body as AuthRefreshRequestDto;
  res.json(authService.refresh(payload));
};

export const logout: RequestHandler = (req, res) => {
  const payload = req.body as AuthLogoutRequestDto;
  res.json(authService.logout(payload));
};

export const me: RequestHandler = (_req, res) => {
  res.json(authService.me());
};
