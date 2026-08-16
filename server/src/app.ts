import openapi from '@elysia/openapi';
import { Elysia } from 'elysia';

import { authRoutes } from './modules/auth/auth.routes';

export const app = new Elysia().use(openapi()).use(authRoutes);
