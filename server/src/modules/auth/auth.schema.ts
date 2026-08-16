import z from 'zod';

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nome deve possuir pelo menos dois caracteres')
    .max(100, 'Nome deve possuir no máximo 100 caracteres'),

  email: z.string().trim().toLowerCase().email('E-mail inválido'),

  password: z
    .string()
    .min(8, 'Senha deve possuir pelo menos 8 caracteres')
    .max(128, 'Senha deve possuir no máximo 128 caracteres'),

  phone: z.string().trim().min(10, 'Telefone inválido').max(20, 'Telefone inválido').optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido'),

  password: z.string().min(1, 'Senha obrigatória').max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
