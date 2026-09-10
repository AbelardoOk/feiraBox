import openapi from '@elysia/openapi';
import { Elysia } from 'elysia';

import { authRoutes } from './modules/auth/auth.routes';
import { fairsRoutes } from './modules/fairs/fairs.routes';

const swaggerDocumentation = {
  info: {
    title: 'FeiraBox API',
    version: '1.0.50',
    description:
      'API da plataforma FeiraBox - marketplace de produtos de feira com caixas surpresa, assinaturas, pedidos, pagamentos e campanhas de tráfego pago. Autenticação via JWT (Bearer).',
  },
  tags: [
    { name: 'Auth', description: 'Autenticação e autorização (JWT)' },
    { name: 'Fairs', description: 'Feiras e mercados (RF11 - busca por proximidade)' },
    { name: 'Health', description: 'Verificação de saúde da API' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http' as const,
        scheme: 'bearer' as const,
        bearerFormat: 'JWT',
        description: 'Insira o token JWT como: Bearer <token>',
      },
    },
  },
};

export const app = new Elysia()
  .use(
    openapi({
      path: '/swagger',
      provider: 'swagger-ui',
      documentation: swaggerDocumentation,
      swagger: {
        version: '4.18.2',
        autoDarkMode: true,
      },
    }),
  )
  // Scalar como alternativa em /scalar e compatibilidade com /openapi (antigo padrão)
  .use(
    openapi({
      path: '/scalar',
      provider: 'scalar',
      documentation: swaggerDocumentation,
    }),
  )
  .use(
    openapi({
      path: '/openapi',
      provider: 'swagger-ui',
      documentation: swaggerDocumentation,
      swagger: {
        version: '4.18.2',
        autoDarkMode: true,
      },
    }),
  )
  .onError(({ error, set, code }) => {
    if (code === 'VALIDATION') {
      set.status = 400;
      return {
        success: false,
        message: 'Dados inválidos',
        details: error.message,
      };
    }

    const message = error instanceof Error ? error.message : 'Erro interno do servidor';

    // Mapeia erros conhecidos para status HTTP adequados
    if (message === 'E-mail já cadastrado') {
      set.status = 409;
      return { success: false, message };
    }
    if (message === 'E-mail ou senha inválidos') {
      set.status = 401;
      return { success: false, message };
    }
    if (message === 'Não autorizado. Token ausente, inválido ou expirado.') {
      set.status = 401;
      return { success: false, message };
    }

    // ZodError fallback
    if (error instanceof Error && error.name === 'ZodError') {
      set.status = 400;
      return {
        success: false,
        message: 'Dados inválidos',
        details: error.message,
      };
    }

    // Log para debugging em desenvolvimento
    console.error('[app] Unhandled error:', error);
  })
  .use(authRoutes)
  .use(fairsRoutes)
  .get(
    '/',
    () => ({
      success: true,
      message: 'FeiraBox API running',
    }),
    {
      detail: {
        tags: ['Health'],
        summary: 'Status raiz',
        description: 'Retorna mensagem de que a API está no ar.',
      },
    },
  )
  .get(
    '/health',
    () => ({
      success: true,
      status: 'ok',
    }),
    {
      detail: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Verifica saúde da API.',
      },
    },
  );
