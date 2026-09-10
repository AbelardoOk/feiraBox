# FeiraBox — API

## Objetivo

Este documento orienta a organização da API backend do FeiraBox.

A especificação define Elysia.js + Bun como tecnologia do backend, mas não define uma lista completa de endpoints.

Portanto, endpoints devem ser criados conforme as funcionalidades e documentados conforme forem implementados.

## Princípios

- API separada do aplicativo mobile.
- HTTPS em produção.
- Validação de entradas.
- Autenticação e autorização.
- Respostas consistentes.
- Tratamento adequado de erros.
- Não expor informações sensíveis.
- Não permitir acesso direto do mobile ao banco.

## Domínios funcionais

A API deverá contemplar, conforme os requisitos:

- autenticação;
- usuários;
- perfis de feirante;
- produtos;
- caixas surpresa;
- planos de assinatura;
- assinaturas;
- pedidos;
- pagamentos;
- comissão;
- Boost de Vendas;
- notificações;
- busca/curadoria.

## Autenticação

A implementação deve proteger endpoints que exigem usuário autenticado.

A especificação exige armazenamento seguro de senhas e comunicação HTTPS/TLS, mas não define formalmente o mecanismo de sessão/token.

Se JWT for adotado pelo projeto, sua implementação deve ser documentada como decisão técnica.

## Padrão de resposta

O formato definitivo de resposta da API ainda não foi especificado pela SRS.

Ao definir um padrão, documente-o aqui.

## Versionamento

O padrão de versionamento da API ainda não foi definido pela SRS.

Não introduzir versionamento arbitrário como requisito do projeto sem decisão técnica.

## Contratos

Quando um endpoint for implementado, documentar:

- método HTTP;
- rota;
- autenticação necessária;
- parâmetros;
- body;
- validações;
- resposta de sucesso;
- possíveis erros;
- regras de negócio relacionadas.
