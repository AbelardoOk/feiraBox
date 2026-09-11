import openapi from '@elysia/openapi';
import { Elysia } from 'elysia';

import { authRoutes } from './modules/auth/auth.routes';
import { deliveriesRoutes } from './modules/deliveries/deliveries.routes';
import { fairsRoutes } from './modules/fairs/fairs.routes';
import { ordersRoutes } from './modules/orders/orders.routes';
import { productsRoutes } from './modules/products/products.routes';
import { subscriptionsRoutes } from './modules/subscriptions/subscriptions.routes';
import { surpriseBoxesRoutes } from './modules/surprise-boxes/surprise-boxes.routes';
import { vendorsRoutes } from './modules/vendors/vendors.routes';

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
    { name: 'Vendors', description: 'Feirantes e produtores (RF01)' },
    { name: 'Products', description: 'Produtos do feirante (RF02)' },
    { name: 'SurpriseBoxes', description: 'Caixas surpresa (RF02)' },
    { name: 'Subscriptions', description: 'Assinaturas recorrentes (RF03/RF09)' },
    { name: 'Orders', description: 'Pedidos e painel do feirante (RF05/RF06)' },
    { name: 'Deliveries', description: 'Entregas e QR Code' },
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

    // Prisma P2002 (unique violation) por condição de corrida → 409
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: unknown }).code === 'P2002'
    ) {
      set.status = 409;
      const targetArr = (error as { meta?: { target?: string[] } }).meta?.target ?? [];
      const target = targetArr.join(',');
      if (targetArr.includes('cpfCnpj') || target.includes('cpfCnpj'))
        return { success: false, message: 'CPF/CNPJ já cadastrado' };
      if (targetArr.includes('email') || target.includes('email'))
        return { success: false, message: 'E-mail já cadastrado' };
      if (targetArr.includes('userId'))
        return { success: false, message: 'Usuário já possui perfil de feirante' };
      if (targetArr.includes('surpriseBoxId') && targetArr.includes('productId'))
        return { success: false, message: 'Produto já está na caixa' };
      return { success: false, message: 'Recurso já existe' };
    }

    const message = error instanceof Error ? error.message : 'Erro interno do servidor';

    // Mapeia erros conhecidos para status HTTP adequados (mantém throw new Error)
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
    if (message === 'CPF/CNPJ já cadastrado') {
      set.status = 409;
      return { success: false, message };
    }
    if (message === 'Usuário já possui perfil de feirante') {
      set.status = 409;
      return { success: false, message };
    }
    if (message === 'Produto já está na caixa') {
      set.status = 409;
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

    if (process.env.NODE_ENV !== 'test') {
      console.error('[app] Unhandled error:', error);
    }
    set.status = 500;
    return { success: false, message: 'Erro interno do servidor' };
  })
  .use(authRoutes)
  .use(fairsRoutes)
  .use(vendorsRoutes)
  .use(productsRoutes)
  .use(surpriseBoxesRoutes)
  .use(subscriptionsRoutes)
  .use(ordersRoutes)
  .use(deliveriesRoutes)
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
