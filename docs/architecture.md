# FeiraBox — Arquitetura

## Arquitetura geral

A especificação define um produto com arquitetura mobile-first e separação entre aplicativo mobile e backend.

### Camadas principais

```text
React Native Mobile
        |
        | HTTP/HTTPS
        v
Elysia.js + Bun API
        |
        +---- PostgreSQL
        |
        +---- Gateway de Pagamento
        |
        +---- Firebase Cloud Messaging
```

## Frontend Mobile

Tecnologia definida:

- React Native
- Android 8.0+
- iOS 14+

Responsabilidades:

- interface do usuário;
- navegação;
- apresentação de dados;
- interação com a API;
- captura de fotos;
- leitura de QR Codes quando aplicável;
- recebimento de notificações push.

O mobile não deve acessar diretamente o PostgreSQL.

## Backend

Tecnologia definida:

- Bun
- Elysia.js

Responsabilidades:

- API;
- autenticação e autorização;
- validação de entrada;
- regras de negócio;
- gerenciamento de usuários;
- produtos;
- caixas surpresa;
- assinaturas;
- pedidos;
- pagamentos;
- comissão;
- Boost;
- notificações;
- persistência.

## Banco de dados

Tecnologia:

- PostgreSQL

O backend é responsável pelo acesso ao banco.

## Integrações externas

### Gateway de pagamento — ASAAS v3

Implementado em `server/src/modules/gateway/` (interface `PaymentGateway` + `AsaasGateway`).

Responsável por:

- processamento de PIX (`POST /v3/payments` `billingType: PIX` → `invoiceUrl` + `pixQrCode`);
- processamento de cartão (`POST /v3/payments` `billingType: CREDIT_CARD` com `creditCard` + `creditCardHolderInfo` + `remoteIp` ou `creditCardToken`);
- cobrança recorrente (`POST /v3/subscriptions` `WEEKLY`/`MONTHLY`, `nextDueDate` — expansão futura);
- liquidação/pagamento e webhooks (`POST /webhooks/asaas`).

Gateway específico: **ASAAS v3** — `https://api-sandbox.asaas.com/v3` (sandbox) / `https://api.asaas.com/v3` (produção), auth `access_token` + `User-Agent: FeiraBox/1.0` (`server/src/config/asaas.ts:23`, `server/.env.example:8`). `MockGateway` usado em dev/test quando `ASAAS_API_KEY` ausente. Ver `docs/decisions.md:ADR-004`.

### Firebase Cloud Messaging

Utilizado para notificações push.

## Segurança

A especificação exige:

- hash seguro de senhas;
- HTTPS/TLS;
- backend com alta disponibilidade.

## Design

O aplicativo deve seguir o Design System "Mercado & Ofício".

## Modularidade

O backend deve ser organizado de forma modular e manutenível.

A SRS não define uma estrutura interna obrigatória de pastas. Portanto, detalhes como Clean Architecture, Hexagonal, Repository Pattern etc. devem ser tratados como decisões técnicas do projeto, e não como requisitos já definidos pela SRS.

## Integrações de hardware

O aplicativo pode utilizar:

- câmera para fotos de produtos;
- câmera/leitor para QR Codes na validação de entregas.
