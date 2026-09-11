import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { z } from 'zod';

import { PrismaClient } from '../generated/prisma/client';

const env = z
  .object({
    DATABASE_URL: z.string().url({ message: 'DATABASE_URL deve ser uma URL válida' }),
  })
  .parse(process.env);

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

export const prisma = new PrismaClient({
  adapter,
});
