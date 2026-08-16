import Elysia from 'elysia';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const authService = new AuthService();
const authController = new AuthController(authService);

export const authRoutes = new Elysia({
  prefix: '/auth',
})
  .post('/register', ({ body }) => authController.register(body))
  .post('/login', ({ body }) => authController.login(body));
