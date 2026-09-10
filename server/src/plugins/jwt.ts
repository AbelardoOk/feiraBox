import 'dotenv/config';
import { jwt } from '@elysiajs/jwt';
import Elysia from 'elysia';

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.warn(
    '[jwtPlugin] JWT_SECRET não definido. Usando fallback inseguro apenas para desenvolvimento.',
  );
}

export const jwtPlugin = new Elysia({ name: 'jwt' }).use(
  jwt({
    name: 'jwt',
    secret: jwtSecret ?? 'fallback-dev-secret-change-me',
    exp: process.env.JWT_EXPIRES_IN ?? '7d',
  }),
);
